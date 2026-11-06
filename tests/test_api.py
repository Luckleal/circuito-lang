"""Structured API and local web server: same core as the CLI, correct positions, no execution."""
import json
import threading
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer

import api
import pytest
import server

from helpers import EXAMPLES, VALID_EXAMPLES, INVALID_SEMANTIC_EXAMPLES, run_cli

HALF = 'circuit "h";\ninput A, B;\noutput sum, carry;\nsum = A XOR B;\ncarry = A AND B;\n'


def read(path):
    return path.read_text(encoding="utf-8")


# ---------- analysis ----------

def test_valid_program_has_every_artifact():
    r = api.analyze_program(HALF)
    assert r["stages"] == {"lexical": "ok", "syntactic": "ok", "semantic": "ok"}
    assert r["diagnostics"] == []
    assert r["inputs"] == ["A", "B"] and r["outputs"] == ["sum", "carry"]
    assert r["cst"]["rule"] == "program" and r["ast"]["type"] == "Program"
    assert r["tokens"][0]["type"] == "CIRCUIT"
    assert r["table_rows"] == 4
    json.dumps(r)   # serializable


def test_lexical_error_blocks_later_stages():
    r = api.analyze_program('circuit "t";\ninput A;\noutput S;\nS = A & A;\n')
    assert r["stages"] == {"lexical": "error", "syntactic": "blocked", "semantic": "blocked"}
    d = r["diagnostics"][0]
    assert (d["stage"], d["line"], d["column"]) == ("lexical", 4, 7)
    assert r["cst"] is None and r["circuit"] is None


def test_syntax_error_blocks_semantics_and_keeps_tokens():
    r = api.analyze_program('circuit "t";\ninput A\n')
    assert r["stages"]["syntactic"] == "error" and r["stages"]["semantic"] == "blocked"
    assert r["tokens"] and r["diagnostics"][0]["stage"] == "syntactic"


def test_semantic_error_keeps_trees_but_no_circuit():
    src = 'circuit "t";\ninput A;\noutput S;\nS = A AND B;\n'
    r = api.analyze_program(src)
    assert r["stages"]["semantic"] == "error"
    assert r["cst"] and r["ast"] and r["circuit"] is None
    d = r["diagnostics"][0]
    assert (d["line"], d["column"]) == (4, 11)
    assert src[d["start"]:d["end"] + 1] == "B"


@pytest.mark.parametrize("path", INVALID_SEMANTIC_EXAMPLES, ids=lambda p: p.name)
def test_diagnostic_ranges_are_inside_the_text(path):
    text = read(path)
    for d in api.analyze_program(text)["diagnostics"]:
        assert 0 <= d["start"] <= d["end"] <= len(text)


def test_diagnostic_offsets_match_line_and_column():
    text = read(EXAMPLES / "invalid_semantic" / "undeclared_signal.circ")
    d = api.analyze_program(text)["diagnostics"][0]
    line_start = sum(len(l) + 1 for l in text.split("\n")[: d["line"] - 1])
    assert d["start"] == line_start + d["column"] - 1


def test_ast_drops_parentheses_and_keeps_precedence():
    src = 'circuit "t";\ninput A, B, C;\noutput S;\nS = NOT A OR (B AND C);\n'
    assignment = api.analyze_program(src)["ast"]["children"][-1]
    expr = assignment["children"][1]
    assert expr["label"] == "BinaryOp OR"
    assert expr["children"][0]["label"] == "Not" and expr["children"][1]["label"] == "BinaryOp AND"
    assert src[expr["start"]:expr["end"] + 1] == "NOT A OR (B AND C)"


def test_cst_is_distinct_from_ast():
    r = api.analyze_program(HALF)
    assert r["cst"]["children"][0]["rule"] == "header"       # concrete: tokens and punctuation
    assert r["ast"]["children"][0]["type"] == "Declaration"  # abstract: no punctuation


# ---------- circuit and simulation ----------

def test_netlist_shape():
    c = api.analyze_program(HALF)["circuit"]
    kinds = [n["type"] for n in c["nodes"]]
    assert kinds.count("input") == 2 and kinds.count("gate") == 2 and kinds.count("output") == 2
    ids = {n["id"] for n in c["nodes"]}
    assert all(e["from"] in ids and e["to"] in ids for e in c["edges"])


def test_nodes_are_in_dependency_order():
    for path in VALID_EXAMPLES:
        seen = set()
        for node in api.analyze_program(read(path))["circuit"]["nodes"]:
            assert all(s in seen for s in node["inputs"])
            seen.add(node["id"])


@pytest.mark.parametrize("path", VALID_EXAMPLES, ids=lambda p: p.name)
def test_simulation_matches_truth_table_for_every_row(path):
    text = read(path)
    table = api.table_for_program(text, include_wires=True)
    for ins, outs in table["rows"]:
        sim = api.simulate_program(text, dict(zip(table["inputs"], ins)))
        for bit, value in zip(table["outputs"], outs):
            assert sim["bits"][bit] == value
        # the animation steps end with the same values as the reference evaluation
        assert all(v in (0, 1) for v in sim["values"].values())


def test_steps_follow_dependencies():
    sim = api.simulate_program(read(EXAMPLES / "detector.circ"), {"A": 1, "B": 1, "C": 0})
    done = {n for n in sim["values"] if n.startswith("in:")}
    for step in sim["steps"]:
        assert all(i["from"] in done for i in step["inputs"])
        done.add(step["node"])


def test_bus_and_constant_nodes():
    text = 'circuit "t";\ninput d[2];\noutput S, T;\nS = d[0] AND NOT d[1];\nT = 1;\n'
    r = api.analyze_program(text)
    assert r["inputs"] == ["d[0]", "d[1]"]
    sim = api.simulate_program(text, {"d[0]": 1, "d[1]": 0})
    assert sim["bits"]["S"] == 1 and sim["bits"]["T"] == 1


def test_wire_net_and_delay_on_nodes():
    r = api.analyze_program(read(EXAMPLES / "detector.circ"))
    by_net = {n["net"]: n for n in r["circuit"]["nodes"] if n.get("net") and n["type"] != "output"}
    assert by_net["S"]["delay"] == 3.0 and by_net["t1"]["delay"] is None


def test_critical_path_maps_to_nodes():
    r = api.analyze_program(read(EXAMPLES / "detector.circ"))
    crit = r["delays"]["critical"]
    assert crit["time"] == 3.0 and crit["path"] == ["A", "t1", "S"]
    assert len(crit["nodes"]) == 2


def test_simulate_rejects_unknown_inputs_and_broken_programs():
    with pytest.raises(ValueError):
        api.simulate_program(HALF, {"Z": 1})
    with pytest.raises(ValueError):
        api.simulate_program('circuit "t";\ninput A\n', {})


# ---------- consistency with the CLI ----------

def test_table_matches_simulator_cli():
    path = EXAMPLES / "detector.circ"
    table = api.table_for_program(read(path))
    for ins, outs in table["rows"]:
        args = [f"{name}={v}" for name, v in zip(table["inputs"], ins)]
        cli = run_cli("simulator.py", path, *args).stdout
        for name, v in zip(table["outputs"], outs):
            assert f"{name} = {v}" in cli


def test_table_exports():
    table = api.table_for_program(read(EXAMPLES / "half_adder.circ"))
    assert table["formats"]["csv"].splitlines()[:2] == ["A,B,sum,carry", "0,0,0,0"]
    assert table["formats"]["md"].splitlines()[1] == "|---|---|---|---|"


def test_table_limit():
    text = 'circuit "t";\ninput d[6];\noutput S;\nS = d[0];\n'
    with pytest.raises(ValueError):
        api.table_for_program(text, max_inputs=5)
    assert len(api.table_for_program(text, max_inputs=6)["rows"]) == 64
    with pytest.raises(ValueError):   # the hard cap applies whatever the caller asks
        api.table_for_program('circuit "t";\ninput d[21];\noutput S;\nS = d[0];\n', max_inputs=99)


# ---------- HTTP server ----------

@pytest.fixture(scope="module")
def base_url():
    httpd = ThreadingHTTPServer(("127.0.0.1", 0), server.Handler)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    yield f"http://127.0.0.1:{httpd.server_address[1]}"
    httpd.shutdown()


def post(base, path, payload, raw=None):
    data = raw if raw is not None else json.dumps(payload).encode()
    req = urllib.request.Request(base + path, data=data, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())


def test_http_analyze_equals_direct_call(base_url):
    status, body = post(base_url, "/api/analyze", {"code": HALF})
    assert status == 200 and body == json.loads(json.dumps(api.analyze_program(HALF)))


def test_http_simulate_and_table(base_url):
    status, sim = post(base_url, "/api/simulate", {"code": HALF, "inputs": {"A": 1, "B": 1}})
    assert status == 200 and sim["bits"]["carry"] == 1
    status, table = post(base_url, "/api/table", {"code": HALF, "wires": True})
    assert status == 200 and len(table["rows"]) == 4


def test_http_errors(base_url):
    assert post(base_url, "/api/analyze", {})[0] == 400
    assert post(base_url, "/api/analyze", None, raw=b"not json")[0] == 400
    assert post(base_url, "/api/nope", {"code": ""})[0] == 404
    status, body = post(base_url, "/api/table", {"code": 'circuit "t";\ninput d[8];\noutput S;\nS = d[0];\n', "max_inputs": 4})
    assert status == 400 and "limit" in body["error"]


def test_http_rejects_oversized_body(base_url):
    # The server answers 413 without reading the body, so on some systems the client sees the
    # connection reset while it is still sending. Both outcomes mean the request was refused.
    try:
        status, _ = post(base_url, "/api/analyze", {"code": "x" * (server.MAX_BODY + 10)})
    except (urllib.error.URLError, ConnectionError):
        return
    assert status == 413


def test_http_examples_and_static(base_url):
    with urllib.request.urlopen(base_url + "/api/examples") as r:
        examples = json.loads(r.read())
    names = {e["name"] for e in examples}
    assert "half_adder" in names and "invalid_semantic/combinational_loop" in names
    with urllib.request.urlopen(base_url + "/") as r:
        assert b"circuito-lang" in r.read()


def test_http_blocks_path_traversal(base_url):
    for path in ("/../src/api.py", "/%2e%2e/src/api.py", "/..%5csrc%5capi.py"):
        try:
            urllib.request.urlopen(base_url + path)
            raise AssertionError("should not be served")
        except urllib.error.HTTPError as e:
            assert e.code == 404


# ---------- facts for the written analysis ----------

def test_summary_counts_come_from_the_real_stages():
    r = api.analyze_program(read(EXAMPLES / "full_adder.circ"))
    s = r["summary"]
    assert s["gate_count"] == 5 and s["gate_kinds"] == {"XOR": 2, "AND": 2, "OR": 1}
    assert (s["inputs"], s["outputs"], s["wires"]) == (3, 2, 3)
    assert s["logic_depth"] == 3 and s["uses_delays"] is False
    assert "sum = (p XOR Cin)" in s["equations"]
    assert s["tokens"] == len(r["tokens"]) and s["ast_nodes"] < s["cst_nodes"]


def test_summary_exists_even_when_later_stages_fail():
    r = api.analyze_program('circuit "t";\ninput A\n')
    assert r["summary"]["tokens"] > 0 and "gate_count" not in r["summary"]


def test_why_explains_every_output_with_values():
    sim = api.simulate_program(read(EXAMPLES / "full_adder.circ"), {"A": 1, "B": 1, "Cin": 0})
    carry = sim["why"]["carry"]
    assert carry["op"] == "OR" and carry["value"] == sim["bits"]["carry"] == 1
    assert [c["value"] for c in carry["children"]] == [1, 0]     # g1 = A AND B, g2 = p AND Cin

    def leaves(node):
        return [node] if not node.get("children") else [x for c in node["children"] for x in leaves(c)]
    assert {l["label"] for l in leaves(carry)} <= {"A", "B", "Cin"}
    assert set(sim["why"]) == {"sum", "carry"}


def test_name_is_known_as_soon_as_the_ast_exists():
    r = api.analyze_program('circuit "named";\ninput A;\noutput S;\nS = B;\n')
    assert r["stages"]["semantic"] == "error" and r["name"] == "named"


# ---------- quick mode ----------

def test_quick_expression_becomes_a_real_program():
    r = api.expression_to_program("A OR B")
    assert r["ok"] and r["output"] == "S" and r["inputs"] == ["A", "B"]
    assert r["code"] == 'circuit "expression";\ninput A, B;\noutput S;\n\nS = A OR B;\n'
    full = api.analyze_program(r["code"])
    assert full["stages"]["semantic"] == "ok" and full["inputs"] == ["A", "B"]
    sim = api.simulate_program(r["code"], {"A": 1, "B": 0})
    assert sim["bits"]["S"] == 1


def test_quick_mode_keeps_precedence_and_parentheses():
    r = api.expression_to_program("NOT A OR B AND C")
    table = api.table_for_program(r["code"])
    for (a, b, c), (s,) in table["rows"]:
        assert s == ((1 - a) | (b & c))


def test_quick_mode_buses_and_constants():
    r = api.expression_to_program("(d[0] OR d[2]) AND 1")
    assert "input d[3];" in r["code"] and r["inputs"] == ["d"]
    assert api.analyze_program(r["code"])["stages"]["semantic"] == "ok"
    assert "input" not in api.expression_to_program("1 AND 0")["code"].split("output")[0].replace('circuit "expression";', "")


def test_quick_mode_avoids_output_name_clash():
    r = api.expression_to_program("S AND T")
    assert r["output"] == "S2" and "S2 = S AND T;" in r["code"]
    assert api.analyze_program(r["code"])["stages"]["semantic"] == "ok"


def test_quick_mode_reports_errors_against_the_expression():
    r = api.expression_to_program("A OR")
    assert not r["ok"] and r["diagnostics"][0]["stage"] == "syntactic"
    r = api.expression_to_program("A & B")
    assert r["diagnostics"][0]["stage"] == "lexical" and r["diagnostics"][0]["column"] == 3
    assert not api.expression_to_program("A // B")["ok"]
    assert api.expression_to_program("   ")["code"] is None


def test_quick_mode_cannot_inject_statements():
    # the expression rule accepts one expression only, so extra statements are syntax errors
    r = api.expression_to_program('A; input X')
    assert not r["ok"]
    r = api.expression_to_program("A\nOR\nB")          # newlines collapse into one line
    assert r["ok"] and "S = A OR B;" in r["code"]


def test_http_quick_expression(base_url):
    status, body = post(base_url, "/api/expression", {"expression": "A XOR B"})
    assert status == 200 and body["ok"] and "S = A XOR B;" in body["code"]
    assert post(base_url, "/api/expression", {"expression": 5})[0] == 400


# ---------- comparing two expressions ----------

def test_equivalent_expressions():
    r = api.compare_expressions("NOT (A AND B)", "NOT A OR NOT B")
    assert r["ok"] and r["equivalent"] and r["differences"] == [] and r["rows"] == 4


def test_different_expressions_list_the_rows_that_differ():
    r = api.compare_expressions("A AND B", "A OR B")
    assert r["ok"] and not r["equivalent"] and r["different_rows"] == 2
    assert r["differences"][0] == {"inputs": [0, 1], "first": 0, "second": 1}


def test_comparison_uses_the_union_of_inputs():
    r = api.compare_expressions("A", "A OR (B AND 0)")
    assert r["inputs"] == ["A", "B"] and r["equivalent"]
    assert not api.compare_expressions("A", "B")["equivalent"]


def test_comparison_of_buses_and_precedence():
    assert api.compare_expressions("d[0] OR d[1]", "d[1] OR d[0]")["equivalent"]
    assert api.compare_expressions("NOT A OR B AND C", "(NOT A) OR (B AND C)")["equivalent"]
    assert not api.compare_expressions("NOT A OR B AND C", "NOT (A OR B) AND C")["equivalent"]


def test_comparison_reports_which_side_is_invalid():
    r = api.compare_expressions("A OR", "A OR B")
    assert not r["ok"] and r["diagnostics"]["first"] and not r["diagnostics"]["second"]


def test_http_compare(base_url):
    status, body = post(base_url, "/api/compare", {"first": "A XOR B", "second": "(A OR B) AND NOT (A AND B)"})
    assert status == 200 and body["equivalent"]
    assert post(base_url, "/api/compare", {"first": "A"})[0] == 400
