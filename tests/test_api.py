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
    status, _ = post(base_url, "/api/analyze", {"code": "x" * (server.MAX_BODY + 10)})
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
