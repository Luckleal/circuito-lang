"""Tests for the simulator (src/simulator.py): truth tables, single evaluation and timing."""
import itertools
import random

import pytest

import simulator
from helpers import EXAMPLES, INVALID_SEMANTIC_EXAMPLES, VALID_EXAMPLES, run_cli
from simulator import (
    analyze_timing, evaluate, format_single, format_time, format_timing, format_truth_table,
    load, parse_assignments, truth_table,
)

HEADER = 'circuit "t";\n'


def circuit_of(body):
    loaded = load(HEADER + body)
    assert loaded.errors == [], loaded.errors
    return loaded.circuit


def table(body):
    return list(truth_table(circuit_of(body)))


def outputs_of(body):
    return [outputs for _, outputs in table(body)]


def example(name):
    return load((EXAMPLES / name).read_text(encoding="utf-8")).circuit


# ---------- the gates ----------

@pytest.mark.parametrize("gate, expected", [
    ("AND", [0, 0, 0, 1]),
    ("NAND", [1, 1, 1, 0]),
    ("OR", [0, 1, 1, 1]),
    ("NOR", [1, 0, 0, 0]),
    ("XOR", [0, 1, 1, 0]),
    ("XNOR", [1, 0, 0, 1]),
])
def test_binary_gate_truth_tables(gate, expected):
    rows = table(f"input A, B;\noutput S;\nS = A {gate} B;")
    assert [inputs for inputs, _ in rows] == [(0, 0), (0, 1), (1, 0), (1, 1)]
    assert [outputs[0] for _, outputs in rows] == expected


def test_not_gate():
    assert outputs_of("input A;\noutput S;\nS = NOT A;") == [(1,), (0,)]


def test_double_negation():
    assert outputs_of("input A;\noutput S;\nS = NOT NOT A;") == [(0,), (1,)]


def test_constants():
    assert outputs_of("input A;\noutput S;\nS = A AND 1;") == [(0,), (1,)]
    assert outputs_of("input A;\noutput S;\nS = A OR 0;") == [(0,), (1,)]
    assert outputs_of("input A;\noutput S;\nS = A AND 0;") == [(0,), (0,)]


# ---------- shape of the table ----------

def test_rows_count_in_binary_with_the_first_input_as_the_most_significant_bit():
    rows = table("input A, B, C;\noutput S;\nS = A;")
    assert [inputs for inputs, _ in rows] == list(itertools.product((0, 1), repeat=3))
    assert [outputs[0] for _, outputs in rows] == [0, 0, 0, 0, 1, 1, 1, 1]


def test_inputs_are_listed_in_declaration_order_and_buses_bit_by_bit():
    circuit = circuit_of("input data[2], X;\noutput S;\nS = X;")
    assert circuit.inputs == [("data", 0), ("data", 1), ("X", None)]


def test_outputs_are_listed_in_declaration_order_with_bus_bits():
    circuit = circuit_of("input A;\noutput y[2], S;\ny[0] = A;\ny[1] = NOT A;\nS = 1;")
    assert circuit.outputs == [("y", 0), ("y", 1), ("S", None)]
    assert [o for _, o in truth_table(circuit)] == [(0, 1, 1), (1, 0, 1)]


def test_circuit_without_inputs_has_a_single_row():
    assert table("output S;\nS = 1;") == [((), (1,))]


def test_wires_are_not_columns_of_the_table():
    circuit = circuit_of("input A;\noutput S;\nwire t;\nt = NOT A;\nS = t;")
    assert len(format_truth_table(circuit)[0].split()) == 3  # A | S


def test_statements_may_be_in_any_order():
    body = "input A;\noutput S;\nwire t;\nS = t;\nt = NOT A;"
    assert outputs_of(body) == [(1,), (0,)]


def test_a_long_chain_of_wires():
    wires = ", ".join(f"w{i}" for i in range(30))
    chain = "\n".join(f"w{i} = NOT w{i - 1};" for i in range(1, 30))
    body = f"input A;\noutput S;\nwire {wires};\nw0 = A;\n{chain}\nS = w29;"
    assert outputs_of(body) == [(1,), (0,)]  # 29 negations: odd, so S = NOT A


# ---------- the example programs ----------

def test_half_adder():
    assert [(i, o) for i, o in truth_table(example("half_adder.circ"))] == [
        ((0, 0), (0, 0)), ((0, 1), (1, 0)), ((1, 0), (1, 0)), ((1, 1), (0, 1)),
    ]


def test_full_adder_adds_three_bits():
    for (a, b, cin), (total, carry) in truth_table(example("full_adder.circ")):
        assert a + b + cin == total + 2 * carry


def test_precedence_example():
    rows = truth_table(example("precedence.circ"))
    for (a, b, c), (s,) in rows:
        assert s == int((not a) or (b and c))


def test_detector_example():
    for (a, b, c), (s,) in truth_table(example("detector.circ")):
        assert s == int((a and b) or (not c))


def test_bus_example():
    circuit = example("bus.circ")
    assert len(circuit.inputs) == 4
    for (d0, d1, d2, d3), (active,) in truth_table(circuit):
        assert active == int((d0 or d1) and not d3)


@pytest.mark.parametrize("path", VALID_EXAMPLES, ids=[p.name for p in VALID_EXAMPLES])
def test_every_valid_example_simulates_to_zeros_and_ones(path):
    circuit = load(path.read_text(encoding="utf-8")).circuit
    assert circuit is not None
    rows = list(truth_table(circuit))
    assert len(rows) == 2 ** len(circuit.inputs)
    assert all(bit in (0, 1) for _, outputs in rows for bit in outputs)


# ---------- single evaluation ----------

def test_evaluate_returns_every_bit_of_the_circuit():
    circuit = example("full_adder.circ")
    values = evaluate(circuit, {("A", None): 1, ("B", None): 1, ("Cin", None): 0})
    assert values[("p", None)] == 0
    assert values[("g1", None)] == 1
    assert values[("sum", None)] == 0
    assert values[("carry", None)] == 1


def test_evaluate_does_not_depend_on_previous_calls():
    circuit = example("half_adder.circ")
    first = evaluate(circuit, {("A", None): 1, ("B", None): 1})
    second = evaluate(circuit, {("A", None): 0, ("B", None): 0})
    assert first[("carry", None)] == 1 and second[("carry", None)] == 0


# ---------- independent oracle ----------

PY_GATES = {
    "AND": lambda a, b: int(bool(a) and bool(b)),
    "NAND": lambda a, b: int(not (a and b)),
    "OR": lambda a, b: int(bool(a) or bool(b)),
    "NOR": lambda a, b: int(not (a or b)),
    "XOR": lambda a, b: int(a != b),
    "XNOR": lambda a, b: int(a == b),
}
NAMES = ["A", "B", "C", "D"]


def random_parenthesized(rng, depth):
    """Returns (source, python function of the environment), every operation parenthesized."""
    if depth == 0 or rng.random() < 0.25:
        if rng.random() < 0.15:
            value = rng.choice([0, 1])
            return str(value), lambda env, v=value: v
        name = rng.choice(NAMES)
        return name, lambda env, n=name: env[n]
    if rng.random() < 0.25:
        source, fn = random_parenthesized(rng, depth - 1)
        return f"(NOT {source})", lambda env: 1 - fn(env)
    op = rng.choice(sorted(PY_GATES))
    left_source, left = random_parenthesized(rng, depth - 1)
    right_source, right = random_parenthesized(rng, depth - 1)
    return f"({left_source} {op} {right_source})", lambda env: PY_GATES[op](left(env), right(env))


def test_simulator_agrees_with_an_independent_evaluator_on_random_expressions():
    rng = random.Random(7)
    for _ in range(150):
        source, oracle = random_parenthesized(rng, 4)
        rows = table(f"input A, B, C, D;\noutput S;\nS = {source};")
        for inputs, (result,) in rows:
            assert result == oracle(dict(zip(NAMES, inputs))), (source, inputs)


def oracle_with_precedence(tokens, env):
    """Evaluates a token list with NOT > AND/NAND > OR/NOR/XOR/XNOR, left to right."""
    position = 0

    def unary():
        nonlocal position
        if tokens[position] == "NOT":
            position += 1
            return 1 - unary()
        value = env[tokens[position]]
        position += 1
        return value

    def level(operators, next_level):
        nonlocal position
        value = next_level()
        while position < len(tokens) and tokens[position] in operators:
            op = tokens[position]
            position += 1
            value = PY_GATES[op](value, next_level())
        return value

    def and_level():
        return level(("AND", "NAND"), unary)

    return level(("OR", "NOR", "XOR", "XNOR"), and_level)


def test_precedence_without_parentheses_matches_an_independent_evaluator():
    rng = random.Random(11)
    for _ in range(150):
        tokens = []
        for position in range(rng.randint(1, 6)):
            if position:
                tokens.append(rng.choice(sorted(PY_GATES)))
            while rng.random() < 0.3:
                tokens.append("NOT")
            tokens.append(rng.choice(NAMES))
        rows = table(f"input A, B, C, D;\noutput S;\nS = {' '.join(tokens)};")
        for inputs, (result,) in rows:
            assert result == oracle_with_precedence(tokens, dict(zip(NAMES, inputs))), (tokens, inputs)


# ---------- timing ----------

def timing_of(body):
    circuit = circuit_of(body)
    return circuit, analyze_timing(circuit)


def test_no_delays_means_no_timing_report():
    assert circuit_of("input A;\noutput S;\nS = NOT A;").has_delays is False


def test_a_single_delay():
    circuit, timing = timing_of("input A;\noutput S;\nS = NOT A @delay 2.5;")
    assert circuit.has_delays
    assert timing.arrival[("S", None)] == 2.5
    assert timing.critical_path == [("A", None), ("S", None)]
    assert timing.critical_delay == 2.5


def test_delays_add_up_along_a_chain():
    _, timing = timing_of(
        "input A;\noutput S;\nwire x, y;\nx = NOT A @delay 1.0;\ny = NOT x @delay 2.0;\nS = NOT y @delay 0.5;"
    )
    assert timing.arrival[("S", None)] == 3.5
    assert [b[0] for b in timing.critical_path] == ["A", "x", "y", "S"]


def test_the_slowest_input_decides_the_arrival_time():
    _, timing = timing_of(
        "input A, B;\noutput S;\nwire slow, fast;\nslow = NOT A @delay 5.0;\nfast = NOT B @delay 1.0;\nS = slow AND fast @delay 1.0;"
    )
    assert timing.arrival[("S", None)] == 6.0
    assert [b[0] for b in timing.critical_path] == ["A", "slow", "S"]


def test_a_gate_without_delay_adds_nothing():
    _, timing = timing_of("input A;\noutput S;\nwire x;\nx = NOT A;\nS = NOT x @delay 1.5;")
    assert timing.arrival[("x", None)] == 0.0
    assert timing.arrival[("S", None)] == 1.5


def test_the_critical_output_is_the_slowest_one():
    circuit, timing = timing_of("input A;\noutput S, T;\nS = NOT A @delay 1.0;\nT = NOT A @delay 3.0;")
    assert timing.critical_output == ("T", None)
    assert timing.arrival[("S", None)] == 1.0


def test_on_a_tie_the_route_through_more_gates_wins():
    _, timing = timing_of("input A, C;\noutput S;\nwire t;\nt = NOT A;\nS = t OR C @delay 3.0;")
    assert [b[0] for b in timing.critical_path] == ["A", "t", "S"]


def test_reconvergent_paths_use_the_longest_one():
    _, timing = timing_of(
        "input A;\noutput S;\nwire x, y;\nx = NOT A @delay 1.0;\ny = NOT x @delay 1.0;\nS = x AND y @delay 1.0;"
    )
    assert timing.arrival[("S", None)] == 3.0


def test_delays_example():
    circuit = example("delays.circ")
    timing = analyze_timing(circuit)
    assert timing.arrival[("S", None)] == 4.0
    assert timing.arrival[("T", None)] == 1.0
    assert timing.critical_path == [("A", None), ("x", None), ("y", None), ("S", None)]


@pytest.mark.parametrize("value, text", [(4.0, "4.0"), (2.25, "2.25"), (0.1 + 0.2, "0.3"), (10, "10.0"), (0, "0.0")])
def test_format_time(value, text):
    assert format_time(value) == text


# ---------- reports ----------

def test_format_truth_table_of_the_half_adder():
    assert format_truth_table(example("half_adder.circ")) == [
        "A B | sum carry",
        "0 0 |  0    0",
        "0 1 |  1    0",
        "1 0 |  1    0",
        "1 1 |  0    1",
    ]


def test_format_truth_table_without_inputs():
    assert format_truth_table(circuit_of("output S;\nS = 1;")) == ["S", "1"]


def test_format_truth_table_columns_stay_aligned_for_buses():
    lines = format_truth_table(example("bus.circ"))
    assert lines[0] == "data[0] data[1] data[2] data[3] | active"
    assert len({line.index("|") for line in lines}) == 1


def test_format_single():
    circuit = example("full_adder.circ")
    values = evaluate(circuit, {("A", None): 1, ("B", None): 0, ("Cin", None): 1})
    assert format_single(circuit, values) == [
        "Inputs:", "  A = 1", "  B = 0", "  Cin = 1",
        "Wires:", "  p = 1", "  g1 = 0", "  g2 = 1",
        "Outputs:", "  sum = 0", "  carry = 1",
    ]


def test_format_timing():
    circuit = example("delays.circ")
    assert format_timing(circuit, analyze_timing(circuit)) == [
        "Timing (ns):", "  S  4.0", "  T  1.0", "Critical path: A -> x -> y -> S (4.0 ns)",
    ]


# ---------- loading a program ----------

def test_load_reports_lexical_errors():
    loaded = load('circuit "t";\ninput A;\noutput S;\nS = A & A;\n')
    assert loaded.circuit is None
    assert "Lexical error at line 4, column 7" in loaded.errors[0]


def test_load_reports_syntax_errors():
    loaded = load('circuit "t";\ninput A;\noutput S;\nS = A AND ;\n')
    assert loaded.circuit is None
    assert loaded.errors == ["Syntax error at line 4, column 11: expected an expression, found ';'"]


def test_load_reports_every_semantic_error():
    loaded = load('circuit "t";\ninput A;\noutput S, T;\nS = Z;\n')
    assert loaded.circuit is None
    assert len(loaded.errors) == 2  # Z is not declared, T is never assigned


def test_load_keeps_the_warnings_of_a_valid_program():
    loaded = load('circuit "t";\ninput A, B;\noutput S;\nS = A;\n')
    assert loaded.circuit is not None
    assert loaded.warnings == ["Semantic warning at line 2, column 10: input 'B' is never used"]


# ---------- values given on the command line ----------

def parse_values(tokens, name="full_adder.circ"):
    return parse_assignments(example(name), tokens)


def test_parse_assignments():
    values, problem = parse_values(["A=1", "B=0", "Cin=1"])
    assert problem is None
    assert values == {("A", None): 1, ("B", None): 0, ("Cin", None): 1}


def test_parse_assignments_for_bus_bits():
    values, problem = parse_values(["data[0]=1", "data[1]=0", "data[2]=0", "data[3]=1"], "bus.circ")
    assert problem is None
    assert values[("data", 3)] == 1


@pytest.mark.parametrize("tokens, message", [
    (["A=1", "B=1"], "missing a value for: Cin"),
    (["A=1"], "missing a value for: B, Cin"),
    (["A=2", "B=0", "Cin=0"], "the value of 'A' must be 0 or 1, not '2'"),
    (["A=", "B=0", "Cin=0"], "the value of 'A' must be 0 or 1, not ''"),
    (["X=1", "A=1", "B=1", "Cin=1"], "'X' is not an input bit of this circuit"),
    (["sum=1", "A=1", "B=1", "Cin=1"], "'sum' is not an input bit of this circuit"),
    (["A=1", "A=0", "B=0", "Cin=0"], "'A' is given more than once"),
    (["=1"], "'=1' is not a value"),
])
def test_parse_assignments_problems(tokens, message):
    values, problem = parse_values(tokens)
    assert values is None
    assert message in problem


def test_a_bus_must_be_given_bit_by_bit():
    values, problem = parse_values(["data=1"], "bus.circ")
    assert values is None
    assert "'data' is not an input bit of this circuit" in problem


# ---------- command line ----------

def test_cli_truth_table():
    result = run_cli("simulator.py", EXAMPLES / "half_adder.circ")
    assert result.returncode == 0
    assert result.stdout.splitlines() == [
        'Truth table of "half adder": 2 input bits, 4 rows',
        "A B | sum carry",
        "0 0 |  0    0",
        "0 1 |  1    0",
        "1 0 |  1    0",
        "1 1 |  0    1",
    ]
    assert result.stderr == ""


def test_cli_single_combination():
    result = run_cli("simulator.py", EXAMPLES / "full_adder.circ", "A=1", "B=1", "Cin=0")
    assert result.returncode == 0
    assert result.stdout.splitlines()[-3:] == ["Outputs:", "  sum = 0", "  carry = 1"]


def test_cli_values_may_come_before_the_file():
    result = run_cli("simulator.py", "A=1", "B=1", EXAMPLES / "half_adder.circ")
    assert result.returncode == 0
    assert "  carry = 1" in result.stdout


def test_cli_prints_timing_only_when_there_are_delays():
    without = run_cli("simulator.py", EXAMPLES / "half_adder.circ")
    with_delays = run_cli("simulator.py", EXAMPLES / "delays.circ")
    assert "Timing" not in without.stdout
    assert with_delays.stdout.splitlines()[-4:] == [
        "Timing (ns):", "  S  4.0", "  T  1.0", "Critical path: A -> x -> y -> S (4.0 ns)",
    ]


def test_cli_timing_also_appears_for_a_single_combination():
    result = run_cli("simulator.py", EXAMPLES / "delays.circ", "A=1", "B=1", "C=0")
    assert result.stdout.splitlines()[-1] == "Critical path: A -> x -> y -> S (4.0 ns)"


def test_cli_warnings_go_to_stderr_and_the_simulation_still_runs():
    result = run_cli("simulator.py", EXAMPLES / "semantic_warnings" / "unused_signals.circ")
    assert result.returncode == 0
    assert result.stderr.count("Semantic warning") == 3
    assert result.stdout.startswith('Truth table of "unused signals"')


def test_cli_a_program_with_errors_is_not_simulated():
    result = run_cli("simulator.py", EXAMPLES / "invalid_semantic" / "combinational_loop.circ")
    assert result.returncode == 1
    assert "combinational loop: x -> y -> x" in result.stderr
    assert "1 error found (simulation not run)" in result.stderr
    assert result.stdout == ""


@pytest.mark.parametrize("path", INVALID_SEMANTIC_EXAMPLES, ids=[p.name for p in INVALID_SEMANTIC_EXAMPLES])
def test_no_semantic_error_example_can_be_simulated(path, capsys):
    assert simulator.main(["simulator.py", str(path)]) == 1
    assert "simulation not run" in capsys.readouterr().err


@pytest.mark.parametrize("folder", ["invalid_lexical", "invalid_syntax"])
def test_programs_with_lexical_or_syntax_errors_are_not_simulated(folder, capsys):
    for path in sorted((EXAMPLES / folder).glob("*.circ")):
        assert simulator.main(["simulator.py", str(path)]) == 1, path.name
    assert "simulation not run" in capsys.readouterr().err


def test_cli_bad_value_exits_2():
    result = run_cli("simulator.py", EXAMPLES / "half_adder.circ", "A=2", "B=0")
    assert result.returncode == 2
    assert "Error: the value of 'A' must be 0 or 1, not '2'." in result.stderr
    assert "Traceback" not in result.stderr


def test_cli_missing_value_exits_2():
    result = run_cli("simulator.py", EXAMPLES / "half_adder.circ", "A=1")
    assert result.returncode == 2
    assert "missing a value for: B" in result.stderr


def test_cli_missing_file_exits_2_without_traceback():
    result = run_cli("simulator.py", EXAMPLES / "does_not_exist.circ")
    assert result.returncode == 2
    assert "could not open file" in result.stderr
    assert "Traceback" not in result.stderr


@pytest.mark.parametrize("args", [[], ["A=1"], ["a.circ", "b.circ"]])
def test_cli_usage_error_exits_2(args):
    result = run_cli("simulator.py", *args)
    assert result.returncode == 2
    assert "Usage" in result.stderr


def test_cli_works_from_any_working_directory(tmp_path):
    result = run_cli("simulator.py", EXAMPLES / "half_adder.circ", cwd=tmp_path)
    assert result.returncode == 0


# ---------- size limit ----------

def program_with_inputs(count):
    return f'circuit "big";\ninput data[{count}];\noutput S;\nS = data[0];\n'


def test_a_truth_table_of_too_many_inputs_is_refused(tmp_path):
    path = tmp_path / "big.circ"
    path.write_text(program_with_inputs(simulator.MAX_INPUT_BITS + 1), encoding="utf-8")
    result = run_cli("simulator.py", path)
    assert result.returncode == 2
    assert "17 input bits would have 131072 rows" in result.stderr
    assert "A=1 B=0" in result.stderr
    assert result.stdout == ""


def test_one_combination_is_still_possible_with_many_inputs(tmp_path):
    count = simulator.MAX_INPUT_BITS + 4
    path = tmp_path / "big.circ"
    path.write_text(program_with_inputs(count), encoding="utf-8")
    values = [f"data[{i}]={1 if i == 0 else 0}" for i in range(count)]
    result = run_cli("simulator.py", path, *values)
    assert result.returncode == 0
    assert result.stdout.splitlines()[-1] == "  S = 1"


def test_the_largest_allowed_table_works():
    circuit = load(program_with_inputs(simulator.MAX_INPUT_BITS)).circuit
    assert sum(1 for _ in truth_table(circuit)) == 2 ** simulator.MAX_INPUT_BITS
