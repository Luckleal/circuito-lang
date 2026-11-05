"""Structured results of the real compiler pipeline, for tools such as the web interface.

This module adds no language rules. It calls the project's own stages
(lexical.py, syntactic.py, ast_builder.py, semantic.py, simulator.py) and turns their
results into JSON-friendly dicts, so the command line and the web interface share
exactly the same analysis and simulation code.

Result of `analyze_program(text)`:

  stages       {"lexical","syntactic","semantic"} -> "ok" | "error" | "blocked"
  diagnostics  [{stage, severity, line, column, start, end, message}]
               line/column are 1-based; start/end are 0-based inclusive character offsets
  tokens       [{type, text, line, column, start, end}]        recognized tokens
  cst          concrete syntax tree (ANTLR parse tree) or null
  ast          abstract syntax tree or null
  circuit      logic netlist (nodes, edges, ...) or null       needs all stages ok
  inputs / outputs / wires   bit names in truth-table order; input_groups groups buses
  delays       {"times", "outputs", "critical"} or null (null when no @delay is used)
  table_rows   2 ** number of inputs
  summary      facts for the written analysis: counts per stage, gate census, depth,
               equations (one per assignment, from semantic.format_equation) or null

Offsets are Python string indices (Unicode code points).
"""
import dataclasses
import itertools
import re

from antlr4.tree.Tree import TerminalNode

from ast_builder import build_ast
from ast_nodes import Constant, Not, Signal
from lexical import token_name, tokenize
from semantic import analyze, bit_label, format_equation
from simulator import GATES, analyze_timing, build_circuit, evaluate
from syntactic import parse

DEFAULT_MAX_INPUTS = 12     # web default; the simulator CLI allows up to 16
HARD_MAX_INPUTS = 16        # same limit as the simulator CLI (simulator.MAX_INPUT_BITS)

_POSITION = re.compile(r"at line (\d+), column (\d+): (.*)$", re.S)
_WORD = re.compile(r"\w+(?:\[\d+\])?|\"[^\"\r\n]*\"?|\S")


# ---------- source positions ----------

class Source:
    """Maps (line, column) to character offsets and finds the extent of a piece of text."""

    def __init__(self, text):
        self.text = text
        self.starts = [0]
        for line in text.split("\n"):
            self.starts.append(self.starts[-1] + len(line) + 1)

    def offset(self, line, column):
        if line - 1 >= len(self.starts):
            return len(self.text)
        return min(self.starts[line - 1] + column - 1, len(self.text))

    def word_end(self, start):
        """Inclusive end offset of the word/symbol that begins at `start`."""
        match = _WORD.match(self.text, start)
        return max(match.end() - 1, start) if match else start

    def close_parens(self, start, end):
        """Extend `end` over ')' tokens that close '(' opened inside [start, end]."""
        depth = self.text.count("(", start, end + 1) - self.text.count(")", start, end + 1)
        pos = end + 1
        while depth > 0:
            match = re.compile(r"\s*\)").match(self.text, pos)
            if not match:
                break
            pos, end, depth = match.end(), match.end() - 1, depth - 1
        return end

    def span_of(self, node):
        """(start, end) offsets of an AST node; composite nodes cover their operands."""
        start = self.offset(node.line, node.column)
        children = node.children() if not isinstance(node, Signal) else []
        if not children:
            end = self.word_end(start)
        else:
            end = max(self.span_of(child)[1] for child in children)
        return start, self.close_parens(start, end)


def _diagnostic(stage, severity, line, column, message, source):
    start = source.offset(line, column)
    end = source.word_end(start) if start < len(source.text) else start
    return {"stage": stage, "severity": severity, "line": line, "column": column,
            "start": start, "end": end, "message": message}


def _from_text(stage, text, source):
    """Lexical/syntax errors arrive as 'X error at line L, column C: message' strings."""
    match = _POSITION.search(text)
    if not match:
        return _diagnostic(stage, "error", 1, 1, text, source)
    return _diagnostic(stage, "error", int(match.group(1)), int(match.group(2)), match.group(3), source)


# ---------- syntax trees ----------

def _token_info(token):
    return {"type": token_name(token), "text": token.text, "line": token.line,
            "column": token.column + 1, "start": token.start, "end": token.stop}


def build_cst(node, parser):
    """Concrete syntax tree: every grammar rule and every token, as ANTLR derived it."""
    if isinstance(node, TerminalNode):
        token = node.symbol
        return None if token.type == -1 else {"kind": "token", **_token_info(token)}
    first, last = node.start, node.stop or node.start
    children = [c for c in (build_cst(child, parser) for child in node.getChildren()) if c]
    return {"kind": "rule", "rule": parser.ruleNames[node.getRuleIndex()],
            "line": first.line, "column": first.column + 1,
            "start": first.start, "end": last.stop, "children": children}


def ast_to_dict(node, source):
    """Abstract syntax tree: only what the program means (labels come from ast_nodes)."""
    start, end = source.span_of(node)
    return {"type": type(node).__name__, "label": node.label(), "line": node.line,
            "column": node.column, "start": start, "end": end,
            "children": [ast_to_dict(child, source) for child in node.children()]}


# ---------- circuit netlist ----------

def build_netlist(circuit, source):
    """Logic netlist of a checked circuit.

    nodes: {id, type, label, inputs: [node ids in port order], span, net, delay}
        type "input"   one input bit                 (bit)
             "const"   constant 0/1                  (value)
             "gate"    NOT/AND/OR/...                (op)
             "buffer"  a signal copied as it is
             "output"  terminal of an output bit     (bit)
      Nodes that drive a named bit carry `net` (the bit name) and `delay` (ns or null).
    edges: {id, from, to, port}. The order of `nodes` is a valid evaluation order.
    roots: driven bit name -> id of the node that produces it.
    """
    nodes, edges, roots = {}, [], {}
    counters = {"g": 0, "c": 0}

    for bit in circuit.inputs:
        label = bit_label(bit)
        nodes[f"in:{label}"] = {"id": f"in:{label}", "type": "input", "bit": label, "label": label,
                                "inputs": [], "span": None, "net": None, "delay": None}

    def source_of(bit):
        label = bit_label(bit)
        return f"in:{label}" if f"in:{label}" in nodes else roots[label]

    def build(expr, net=None, delay=None):
        if isinstance(expr, Signal) and net is None:
            return source_of((expr.name, expr.index))
        if isinstance(expr, Constant):
            counters["c"] += 1
            node = {"id": f"c{counters['c']}", "type": "const", "value": expr.value,
                    "label": str(expr.value), "inputs": []}
        elif isinstance(expr, Signal):
            node = {"id": f"b:{net}", "type": "buffer", "label": "BUF",
                    "inputs": [source_of((expr.name, expr.index))]}
        else:
            operands = [expr.operand] if isinstance(expr, Not) else [expr.left, expr.right]
            sources = [build(operand) for operand in operands]
            counters["g"] += 1
            op = "NOT" if isinstance(expr, Not) else expr.op
            node = {"id": f"g{counters['g']}", "type": "gate", "op": op, "label": op, "inputs": sources}
        node["span"] = list(source.span_of(expr))
        node["net"], node["delay"] = net, delay
        nodes[node["id"]] = node
        for port, origin in enumerate(node["inputs"]):
            edges.append({"id": f"e{len(edges)}", "from": origin, "to": node["id"], "port": port})
        return node["id"]

    for bit in circuit.order:
        assignment = circuit.drivers[bit]
        roots[bit_label(bit)] = build(assignment.expr, net=bit_label(bit), delay=assignment.delay)

    for bit in circuit.outputs:
        label = bit_label(bit)
        nodes[f"out:{label}"] = {"id": f"out:{label}", "type": "output", "bit": label, "label": label,
                                 "inputs": [roots[label]], "span": None, "net": label, "delay": None}
        edges.append({"id": f"e{len(edges)}", "from": roots[label], "to": f"out:{label}", "port": 0})

    return {"name": circuit.name, "nodes": list(nodes.values()), "edges": edges, "roots": roots}


def _delay_info(circuit, netlist):
    """Arrival times and critical paths, computed by simulator.analyze_timing."""
    if not circuit.has_delays:
        return None
    whole = analyze_timing(circuit)
    outputs = []
    for bit in circuit.outputs:
        timing = analyze_timing(dataclasses.replace(circuit, outputs=[bit]))
        path = [bit_label(b) for b in timing.critical_path]
        outputs.append({"bit": bit_label(bit), "time": timing.critical_delay, "path": path,
                        "nodes": [netlist["roots"][b] for b in path if b in netlist["roots"]]})
    critical = None
    if whole.critical_output is not None:
        label = bit_label(whole.critical_output)
        critical = next(o for o in outputs if o["bit"] == label)
    return {"times": {bit_label(b): t for b, t in whole.arrival.items()},
            "outputs": outputs, "critical": critical}



def _count(items):
    counts = {}
    for item in items:
        counts[item] = counts.get(item, 0) + 1
    return counts


def _count_nodes(tree):
    return 1 + sum(_count_nodes(child) for child in tree.get("children", []))


def _circuit_summary(circuit, netlist):
    """Facts about the checked circuit: gate census, logic depth, equations."""
    nodes = {n["id"]: n for n in netlist["nodes"]}
    depth = {}
    for node in netlist["nodes"]:
        depth[node["id"]] = 0 if node["type"] in ("input", "const") else             1 + max((depth[i] for i in node["inputs"]), default=0) - (1 if node["type"] in ("buffer", "output") else 0)
    gates = [n for n in netlist["nodes"] if n["type"] == "gate"]
    return {
        "gate_count": len(gates),
        "gate_kinds": _count(n["op"] for n in gates),
        "logic_depth": max((depth[n["id"]] for n in netlist["nodes"] if n["type"] == "output"), default=0),
        "inputs": len(circuit.inputs), "outputs": len(circuit.outputs), "wires": len(circuit.wires),
        "equations": [format_equation(circuit.drivers[bit]) for bit in circuit.order],
        "uses_delays": circuit.has_delays,
    }


def _why(netlist, values):
    """For each output bit, the derivation of its value: a tree of {label, op, value, children}."""
    nodes = {n["id"]: n for n in netlist["nodes"]}

    def build(node_id):
        node = nodes[node_id]
        entry = {"id": node_id, "type": node["type"], "label": node["label"], "op": node.get("op"),
                 "net": node.get("net"), "value": values[node_id], "span": node.get("span")}
        if node["type"] in ("gate", "buffer"):
            entry["children"] = [build(i) for i in node["inputs"]]
        return entry

    return {n["bit"]: build(n["inputs"][0]) for n in netlist["nodes"] if n["type"] == "output"}


# ---------- entry points ----------

def analyze_program(text):
    """Run the whole pipeline and return everything the interface needs (see module docstring)."""
    source = Source(text)
    tokens, _ = tokenize(text)
    result = {
        "stages": {"lexical": "ok", "syntactic": "blocked", "semantic": "blocked"},
        "diagnostics": [], "tokens": [_token_info(t) for t in tokens],
        "cst": None, "ast": None, "circuit": None, "name": None,
        "inputs": [], "outputs": [], "wires": [], "input_groups": [],
        "delays": None, "table_rows": None, "summary": None,
    }
    result["summary"] = {"tokens": len(tokens), "token_kinds": _count(token_name(t) for t in tokens)}
    diagnostics = result["diagnostics"]

    parsed = parse(text)
    if parsed.lexical_errors:
        result["stages"]["lexical"] = "error"
        diagnostics += [_from_text("lexical", m, source) for m in parsed.lexical_errors]
        return result
    if parsed.syntax_errors:
        result["stages"]["syntactic"] = "error"
        diagnostics += [_from_text("syntactic", m, source) for m in parsed.syntax_errors]
        return result

    program = build_ast(parsed.tree)
    result["stages"]["syntactic"] = "ok"
    result["name"] = program.name
    result["cst"] = build_cst(parsed.tree, parsed.parser)
    result["ast"] = ast_to_dict(program, source)
    result["summary"].update({"cst_nodes": _count_nodes(result["cst"]), "ast_nodes": _count_nodes(result["ast"]),
                              "statements": len(program.statements)})

    checked = analyze(program)
    for severity, items in (("error", checked.errors), ("warning", checked.warnings)):
        diagnostics += [_diagnostic("semantic", severity, d.line, d.column, d.message, source) for d in items]
    diagnostics.sort(key=lambda d: (d["line"], d["column"]))
    if not checked.ok:
        result["stages"]["semantic"] = "error"
        return result

    circuit = build_circuit(program, checked.symbols)
    netlist = build_netlist(circuit, source)
    result.update({
        "stages": {"lexical": "ok", "syntactic": "ok", "semantic": "ok"},
        "circuit": netlist, "name": circuit.name,
        "inputs": [bit_label(b) for b in circuit.inputs],
        "outputs": [bit_label(b) for b in circuit.outputs],
        "wires": [bit_label(b) for b in circuit.wires],
        "input_groups": [{"name": s.name, "width": s.width, "bits": [bit_label(b) for b in s.bits()]}
                         for s in checked.symbols.values() if s.kind == "input"],
        "delays": _delay_info(circuit, netlist),
        "table_rows": 2 ** len(circuit.inputs),
    })
    result["summary"].update(_circuit_summary(circuit, netlist))
    return result


def _checked_circuit(text):
    parsed = parse(text)
    if not parsed.ok:
        raise ValueError("the program has lexical or syntax errors")
    program = build_ast(parsed.tree)
    checked = analyze(program)
    if not checked.ok:
        raise ValueError("the program has semantic errors")
    return program, checked, build_circuit(program, checked.symbols)


def _bit_from_label(circuit, label):
    for bit in circuit.inputs:
        if bit_label(bit) == label:
            return bit
    return None


def simulate_program(text, inputs):
    """Evaluate the program for one input combination ({bit label: 0|1}; missing bits are 0).

    Returns {inputs, values: {node id: 0|1}, bits: {label: 0|1}, steps: [...], why: {...}}; `why`
    maps each output to the derivation tree of its value; `steps` lists,
    in dependency order, how each node got its value (the basis of the didactic animation).
    """
    source = Source(text)
    _, _, circuit = _checked_circuit(text)
    netlist = build_netlist(circuit, source)
    unknown = [label for label in inputs if _bit_from_label(circuit, label) is None]
    if unknown:
        raise ValueError(f"unknown input(s): {', '.join(sorted(unknown))}")
    given = {bit: 1 if inputs.get(bit_label(bit)) in (1, True, "1") else 0 for bit in circuit.inputs}

    bits = evaluate(circuit, given)                  # the reference evaluation
    values, steps = {}, []
    for node in netlist["nodes"]:
        kind = node["type"]
        if kind == "input":
            values[node["id"]] = given[_bit_from_label(circuit, node["bit"])]
            continue
        if kind == "const":
            values[node["id"]] = node["value"]
            continue
        args = [values[origin] for origin in node["inputs"]]
        if kind == "gate":
            result = 1 - args[0] if node["op"] == "NOT" else GATES[node["op"]](*args)
        else:
            result = args[0]
        values[node["id"]] = result
        steps.append({"node": node["id"], "kind": kind, "op": node.get("op"), "net": node.get("net"),
                      "inputs": [{"from": o, "value": v} for o, v in zip(node["inputs"], args)],
                      "output": result})
    return {"inputs": {bit_label(b): v for b, v in given.items()},
            "values": values, "bits": {bit_label(b): v for b, v in bits.items()}, "steps": steps,
            "why": _why(netlist, values)}


def _render(headers, rows, n_inputs):
    cells = [[str(v) for v in inputs + outputs] for inputs, outputs in rows]
    csv = "\n".join([",".join(headers)] + [",".join(row) for row in cells])
    md = "\n".join(["| " + " | ".join(headers) + " |", "|" + "|".join("---" for _ in headers) + "|"]
                   + ["| " + " | ".join(row) + " |" for row in cells])
    return {"csv": csv, "md": md}


def table_for_program(text, include_wires=False, max_inputs=DEFAULT_MAX_INPUTS):
    """Truth table rows (same order as simulator.truth_table, optionally with the wires) and exports."""
    _, _, circuit = _checked_circuit(text)
    n_inputs = len(circuit.inputs)
    limit = min(max_inputs, HARD_MAX_INPUTS)
    if n_inputs > limit:
        raise ValueError(f"the circuit has {n_inputs} input bits, which needs {2 ** n_inputs} rows "
                         f"(limit is {limit})")
    wires = circuit.wires if include_wires else []
    rows = []
    for combination in itertools.product((0, 1), repeat=n_inputs):
        values = evaluate(circuit, dict(zip(circuit.inputs, combination)))
        rows.append((combination, tuple(values[b] for b in circuit.outputs + wires)))
    headers = [bit_label(b) for b in circuit.inputs + circuit.outputs + wires]
    return {"inputs": [bit_label(b) for b in circuit.inputs],
            "outputs": [bit_label(b) for b in circuit.outputs + wires],
            "rows": [[list(i), list(o)] for i, o in rows],
            "formats": _render(headers, rows, n_inputs)}
