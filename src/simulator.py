#!/usr/bin/env python3
"""Simulation of a Circuit program.

Usage:
  python src/simulator.py file.circ                  truth table: every combination of the input bits
  python src/simulator.py file.circ A=1 B=0 d[2]=1   evaluate one combination (give every input bit)

Runs the lexer, the parser and the semantic analysis first and stops on any error. A
valid program is a static combinational circuit, so it can be evaluated gate by gate, in
dependency order. When the program has `@delay` annotations it also reports when each
output settles (its arrival time) and the critical path.

Exit codes: 0 = simulated, 1 = the program has errors (lexical, syntax or semantic),
2 = usage error, unreadable file, bad values or too many inputs for a truth table.
"""
import itertools
import re
import sys
from dataclasses import dataclass, field
from typing import Dict, List, Optional

from ast_builder import build_ast
from ast_nodes import Assignment, BinaryOp, Constant, Not, Signal
from lexical import plural, read_source
from semantic import analyze, bit_label
from syntactic import parse

MAX_INPUT_BITS = 16

GATES = {
    "AND": lambda a, b: a & b,
    "NAND": lambda a, b: 1 - (a & b),
    "OR": lambda a, b: a | b,
    "NOR": lambda a, b: 1 - (a | b),
    "XOR": lambda a, b: a ^ b,
    "XNOR": lambda a, b: 1 - (a ^ b),
}


@dataclass
class Circuit:
    """A checked program, ready to evaluate. A bit is a (name, index) pair; index is None for a single bit."""
    name: str
    inputs: List[tuple] = field(default_factory=list)
    outputs: List[tuple] = field(default_factory=list)
    wires: List[tuple] = field(default_factory=list)
    drivers: Dict[tuple, Assignment] = field(default_factory=dict)  # bit -> the assignment that drives it
    order: List[tuple] = field(default_factory=list)                # driven bits, dependencies first

    @property
    def has_delays(self):
        return any(a.delay is not None for a in self.drivers.values())


@dataclass
class LoadResult:
    circuit: Optional[Circuit] = None
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)


# ---------- building the circuit ----------

def signal_bit(signal):
    return (signal.name, signal.index)


def dependencies(expr):
    """The bits an expression reads, in order of appearance."""
    if isinstance(expr, Signal):
        return [signal_bit(expr)]
    if isinstance(expr, Not):
        return dependencies(expr.operand)
    if isinstance(expr, BinaryOp):
        return dependencies(expr.left) + dependencies(expr.right)
    return []


def build_circuit(program, symbols):
    circuit = Circuit(name=program.name)
    for symbol in symbols.values():
        target = {"input": circuit.inputs, "output": circuit.outputs, "wire": circuit.wires}[symbol.kind]
        target.extend(symbol.bits())
    for statement in program.statements:
        if isinstance(statement, Assignment):
            circuit.drivers[signal_bit(statement.target)] = statement

    # Dependency order. The semantic analysis already rejected combinational loops.
    done = set()

    def visit(bit):
        if bit in done or bit not in circuit.drivers:
            return
        done.add(bit)
        for dependency in dependencies(circuit.drivers[bit].expr):
            visit(dependency)
        circuit.order.append(bit)

    for bit in circuit.drivers:
        visit(bit)
    return circuit


def load(text):
    """Check a program and build its circuit. On any error, `errors` says why and `circuit` is None."""
    parsed = parse(text)
    if parsed.lexical_errors or parsed.syntax_errors:
        return LoadResult(errors=parsed.lexical_errors + parsed.syntax_errors)
    program = build_ast(parsed.tree)
    result = analyze(program)
    warnings = [str(d) for d in result.warnings]
    if result.errors:
        return LoadResult(errors=[str(d) for d in result.errors], warnings=warnings)
    return LoadResult(circuit=build_circuit(program, result.symbols), warnings=warnings)


# ---------- evaluation ----------

def evaluate_expression(expr, values):
    if isinstance(expr, Constant):
        return expr.value
    if isinstance(expr, Signal):
        return values[signal_bit(expr)]
    if isinstance(expr, Not):
        return 1 - evaluate_expression(expr.operand, values)
    return GATES[expr.op](evaluate_expression(expr.left, values), evaluate_expression(expr.right, values))


def evaluate(circuit, input_values):
    """Value of every bit of the circuit for one assignment of the inputs (a dict bit -> 0/1)."""
    values = dict(input_values)
    for bit in circuit.order:
        values[bit] = evaluate_expression(circuit.drivers[bit].expr, values)
    return values


def truth_table(circuit):
    """Every combination of the input bits, as (input values, output values) pairs.
    The first input is the most significant bit, so the rows count in binary."""
    for combination in itertools.product((0, 1), repeat=len(circuit.inputs)):
        values = evaluate(circuit, dict(zip(circuit.inputs, combination)))
        yield combination, tuple(values[bit] for bit in circuit.outputs)


# ---------- timing ----------

@dataclass
class Timing:
    arrival: Dict[tuple, float]          # when each driven bit settles; inputs are at 0
    critical_output: Optional[tuple]
    critical_path: List[tuple]           # from an input to the slowest output

    @property
    def critical_delay(self):
        return self.arrival.get(self.critical_output, 0.0)


def analyze_timing(circuit):
    """Arrival time of a bit = the latest arrival among the bits it reads, plus its own @delay.
    On a tie the route through more gates wins, then the first name, so the result is stable."""
    arrival, slowest_input, depth = {}, {}, {}
    for bit in circuit.order:
        assignment = circuit.drivers[bit]
        reads = sorted(set(dependencies(assignment.expr)), key=lambda b: (b[0], -1 if b[1] is None else b[1]))
        best_key, via = None, None
        for dependency in reads:
            key = (arrival.get(dependency, 0.0), depth.get(dependency, 0))
            if best_key is None or key > best_key:
                best_key, via = key, dependency
        latest, gates = best_key if best_key is not None else (0.0, 0)
        arrival[bit] = latest + (assignment.delay or 0.0)
        depth[bit] = gates + 1
        slowest_input[bit] = via

    critical = None
    for bit in circuit.outputs:
        if critical is None or arrival[bit] > arrival[critical]:
            critical = bit
    path = []
    bit = critical
    while bit is not None:
        path.append(bit)
        bit = slowest_input.get(bit)
    return Timing(arrival=arrival, critical_output=critical, critical_path=list(reversed(path)))


# ---------- reports ----------

def format_time(value):
    text = f"{value:.6g}"
    return text if ("." in text or "e" in text) else text + ".0"


def format_truth_table(circuit):
    headers = [bit_label(b) for b in circuit.inputs] + [bit_label(b) for b in circuit.outputs]
    widths = [len(h) for h in headers]
    split = len(circuit.inputs)

    def line(cells):
        padded = [str(c).center(w) for c, w in zip(cells, widths)]
        left, right = " ".join(padded[:split]), " ".join(padded[split:])
        return (f"{left} | {right}" if split else right).rstrip()

    lines = [line(headers)]
    for inputs, outputs in truth_table(circuit):
        lines.append(line(list(inputs) + list(outputs)))
    return lines


def format_single(circuit, values):
    lines = ["Inputs:"] + [f"  {bit_label(b)} = {values[b]}" for b in circuit.inputs]
    if circuit.wires:
        lines += ["Wires:"] + [f"  {bit_label(b)} = {values[b]}" for b in circuit.wires if b in values]
    lines += ["Outputs:"] + [f"  {bit_label(b)} = {values[b]}" for b in circuit.outputs]
    return lines


def format_timing(circuit, timing):
    width = max(len(bit_label(b)) for b in circuit.outputs)
    lines = ["Timing (ns):"]
    lines += [f"  {bit_label(b):<{width}}  {format_time(timing.arrival[b])}" for b in circuit.outputs]
    path = " -> ".join(bit_label(b) for b in timing.critical_path)
    lines.append(f"Critical path: {path} ({format_time(timing.critical_delay)} ns)")
    return lines


# ---------- command line ----------

ASSIGNMENT = re.compile(r"^([A-Za-z_][A-Za-z_0-9]*)(?:\[(\d+)\])?=(.*)$")


def parse_assignments(circuit, tokens):
    """Turn ['A=1', 'd[2]=0'] into {bit: value}; return (values, error message or None)."""
    values = {}
    valid = set(circuit.inputs)
    for token in tokens:
        match = ASSIGNMENT.match(token)
        if not match:
            return None, f"'{token}' is not a value; write NAME=0 or NAME=1 (for a bus bit, data[2]=1)"
        name, index, value = match.group(1), match.group(2), match.group(3)
        bit = (name, int(index) if index is not None else None)
        if bit not in valid:
            return None, f"'{bit_label(bit)}' is not an input bit of this circuit"
        if value not in ("0", "1"):
            return None, f"the value of '{bit_label(bit)}' must be 0 or 1, not '{value}'"
        if bit in values:
            return None, f"'{bit_label(bit)}' is given more than once"
        values[bit] = int(value)
    missing = [bit_label(b) for b in circuit.inputs if b not in values]
    if missing:
        return None, "missing a value for: " + ", ".join(missing)
    return values, None


def main(argv):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

    tokens = argv[1:]
    paths = [t for t in tokens if "=" not in t]
    assignments = [t for t in tokens if "=" in t]
    if len(paths) != 1:
        print("Usage: python src/simulator.py path/to/file.circ [NAME=0|1 ...]", file=sys.stderr)
        return 2

    text = read_source(paths[0])
    if text is None:
        print(f"Error: could not open file '{paths[0]}'.", file=sys.stderr)
        return 2

    loaded = load(text)
    if loaded.errors:
        for message in loaded.errors:
            print(message, file=sys.stderr)
        print(f"{plural(len(loaded.errors), 'error')} found (simulation not run)", file=sys.stderr)
        return 1
    for warning in loaded.warnings:
        print(warning, file=sys.stderr)
    circuit = loaded.circuit

    if assignments:
        values, problem = parse_assignments(circuit, assignments)
        if problem:
            print(f"Error: {problem}.", file=sys.stderr)
            return 2
        print("\n".join(format_single(circuit, evaluate(circuit, values))))
    else:
        if len(circuit.inputs) > MAX_INPUT_BITS:
            print(
                f"Error: the truth table of {plural(len(circuit.inputs), 'input bit')} would have "
                f"{2 ** len(circuit.inputs)} rows (the limit is {MAX_INPUT_BITS} input bits). "
                f"Give one value per input to evaluate a single combination, e.g. A=1 B=0.",
                file=sys.stderr,
            )
            return 2
        rows = 2 ** len(circuit.inputs)
        print(f'Truth table of "{circuit.name}": {plural(len(circuit.inputs), "input bit")}, {plural(rows, "row")}')
        print("\n".join(format_truth_table(circuit)))

    if circuit.has_delays:
        print("\n".join(format_timing(circuit, analyze_timing(circuit))))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
