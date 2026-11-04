"""Tests for the semantic analysis (src/semantic.py)."""
import pytest

from ast_builder import build_ast
from helpers import EXAMPLES, run_cli
from semantic import Diagnostic, analyze, format_equation, format_symbol_table
from syntactic import parse

HEADER = 'circuit "t";\n'  # line 1; the first line of a body is line 2


def check(body):
    parsed = parse(HEADER + body)
    assert parsed.ok, parsed.lexical_errors + parsed.syntax_errors
    return analyze(build_ast(parsed.tree))


def errors(body):
    return [str(d) for d in check(body).errors]


def warnings(body):
    return [str(d) for d in check(body).warnings]


def assert_error(body, line, column, fragment):
    expected = f"Semantic error at line {line}, column {column}: {fragment}"
    found = errors(body)
    assert any(expected in message for message in found), f"{expected!r} not in {found}"


# ---------- valid circuits ----------

@pytest.mark.parametrize("body", [
    "input A, B;\noutput S;\nS = A AND B;",
    "input A;\noutput S;\nS = NOT A;",
    "output S;\nS = 1;",
    "input A;\noutput S;\nS = A @delay 1.5;",
    "input data[4];\noutput S;\nS = data[0] OR data[3];",
    "input A;\noutput y[2];\ny[0] = A;\ny[1] = NOT A;",
    "input A;\noutput S;\nwire t;\nt = NOT A;\nS = t;",
    "input A;\noutput S;\nS = A;",
    "input A;\noutput S;\nwire w[2];\nw[0] = A;\nw[1] = w[0];\nS = w[1];",
    "input A;\noutput S;\nwire w[2];\nw[0] = w[1];\nw[1] = A;\nS = w[0];",
    "input A;\noutput S;\nwire p, q;\np = A;\nq = A AND p;\nS = p OR q;",
    "input A;\noutput S;\nS = (A);",
], ids=lambda b: b.replace("\n", " | "))
def test_valid_circuits_have_no_diagnostics(body):
    result = check(body)
    assert result.errors == []
    assert result.warnings == []
    assert result.ok


# ---------- declarations ----------

def test_duplicate_in_the_same_declaration():
    assert_error("input A, A;\noutput S;\nS = A;", 2, 10, "'A' is already declared (first declared at line 2)")


def test_duplicate_across_kinds():
    assert_error("input A;\nwire A;\noutput S;\nS = A;", 3, 6, "'A' is already declared (first declared at line 2)")


def test_zero_width_bus():
    assert_error("input data[0];\noutput S;\nS = 1;", 2, 7, "bus width must be at least 1 (got 0)")


def test_failed_declarations_do_not_cascade():
    assert len(errors("input data[0];\noutput S;\nS = data[0];")) == 1
    assert len(errors("input A;\ninput A;\noutput S;\nS = A;")) == 1


# ---------- declare before use ----------

def test_undeclared_signal_in_an_expression():
    assert_error("output S;\nS = Z;", 3, 5, "'Z' is not declared")


def test_undeclared_signal_as_a_target():
    assert_error("input A;\nQ = A;", 3, 1, "'Q' is not declared")


def test_every_undeclared_use_is_reported():
    assert len(errors("output S;\nS = Z AND Z;")) == 2


def test_use_before_declaration_in_an_expression():
    assert_error("output S;\nS = A;\ninput A;", 3, 5, "'A' is used before its declaration (declared at line 4)")


def test_use_before_declaration_as_a_target():
    assert_error("Q = 1;\noutput Q;", 2, 1, "'Q' is used before its declaration (declared at line 3)")


# ---------- assignments ----------

def test_assignment_to_an_input():
    assert_error("input A, B;\noutput S;\nA = B;\nS = A;", 4, 1, "cannot assign to input 'A'")


def test_assignment_to_a_bus_input_bit():
    assert_error("input data[2];\noutput S;\ndata[0] = 1;\nS = data[1];", 4, 1, "cannot assign to input 'data[0]'")


def test_signal_assigned_twice():
    assert_error("input A, B;\noutput S;\nS = A;\nS = B;", 5, 1, "'S' is assigned more than once (first assigned at line 4)")


def test_bus_bit_assigned_twice():
    assert_error(
        "output y[2];\ny[0] = 1;\ny[0] = 0;\ny[1] = 1;",
        4, 1, "'y[0]' is assigned more than once (first assigned at line 3)",
    )


def test_different_bus_bits_may_be_assigned_once_each():
    assert errors("output y[2];\ny[0] = 1;\ny[1] = 0;") == []


# ---------- types: bit versus bus ----------

def test_index_out_of_range_in_an_expression():
    assert_error(
        "input data[4];\noutput S;\nS = data[4];",
        4, 5, "index 4 is out of range for bus 'data' (valid indices: 0 to 3)",
    )


def test_index_out_of_range_as_a_target():
    assert_error(
        "output y[2];\ny[2] = 1;\ny[0] = 1;\ny[1] = 0;",
        3, 1, "index 2 is out of range for bus 'y' (valid indices: 0 to 1)",
    )


def test_last_valid_index_is_accepted():
    assert errors("input data[4];\noutput S;\nS = data[3];") == []


def test_bus_used_as_a_bit_in_an_expression():
    assert_error(
        "input data[4];\noutput S;\nS = data;",
        4, 5, "bus 'data' cannot be used as a single bit; use data[0] to data[3]",
    )


def test_one_bit_wide_bus_message_has_no_range():
    assert_error("input d[1];\noutput S;\nS = d;", 4, 5, "bus 'd' cannot be used as a single bit; use d[0]")
    assert "to d[" not in " ".join(errors("input d[1];\noutput S;\nS = d;"))


def test_bus_used_as_a_bit_as_a_target():
    assert_error("output y[2];\ny = 1;", 3, 1, "bus 'y' cannot be used as a single bit")


def test_index_on_a_single_bit_in_an_expression():
    assert_error("input A;\noutput S;\nS = A[0];", 4, 5, "'A' is not a bus and cannot be indexed")


def test_index_on_a_single_bit_as_a_target():
    assert_error("output S;\nS[0] = 1;", 3, 1, "'S' is not a bus and cannot be indexed")


# ---------- constants ----------

@pytest.mark.parametrize("body, line, column, value", [
    ("output S;\nS = 2;", 3, 5, 2),
    ("input A;\noutput S;\nS = A OR 10;", 4, 10, 10),
])
def test_constants_other_than_0_and_1(body, line, column, value):
    assert_error(body, line, column, f"constant {value} is not valid; only 0 and 1 are allowed")


@pytest.mark.parametrize("value", [0, 1])
def test_constants_0_and_1_are_valid(value):
    assert errors(f"output S;\nS = {value};") == []


# ---------- drivers ----------

def test_output_that_is_never_assigned():
    assert_error("input A;\noutput S, T;\nS = A;", 3, 11, "output 'T' is never assigned")


def test_output_with_no_statements_at_all():
    assert_error("output S;", 2, 8, "output 'S' is never assigned")


def test_bus_output_partially_assigned():
    assert_error("input A;\noutput y[2];\ny[0] = A;", 3, 8, "output 'y[1]' is never assigned")


def test_wire_that_is_read_but_never_assigned():
    assert_error("input A;\noutput S;\nwire t;\nS = A AND t;", 5, 11, "wire 't' is read but never assigned")


def test_unused_unassigned_wire_is_only_a_warning():
    result = check("input A;\noutput S;\nwire t;\nS = A;")
    assert result.errors == []
    assert len(result.warnings) == 1


# ---------- combinational loops ----------

def test_self_loop():
    assert_error("input A;\noutput S;\nwire x;\nx = x AND A;\nS = x;", 5, 1, "combinational loop: x -> x")


def test_two_signal_loop_is_reported_once():
    body = "input A;\noutput S;\nwire x, y;\nx = y AND A;\ny = x OR A;\nS = y;"
    assert_error(body, 5, 1, "combinational loop: x -> y -> x")
    assert sum("combinational loop" in m for m in errors(body)) == 1


def test_three_signal_loop():
    body = "input A;\noutput S;\nwire x, y, z;\nx = z;\ny = NOT x;\nz = y AND A;\nS = z;"
    assert_error(body, 5, 1, "combinational loop: x -> z -> y -> x")


def test_output_feeding_itself():
    assert_error("input A;\noutput S;\nS = NOT S;", 4, 1, "combinational loop: S -> S")


def test_loop_between_bus_bits():
    assert_error("output y[2];\ny[0] = y[1];\ny[1] = y[0];", 3, 1, "combinational loop: y[0] -> y[1] -> y[0]")


def test_independent_loops_are_each_reported():
    body = "input A;\noutput S;\nwire a, b, c, d;\na = b;\nb = a;\nc = d;\nd = c;\nS = A;"
    assert sum("combinational loop" in m for m in errors(body)) == 2


# ---------- reporting ----------

def test_all_errors_are_reported_in_source_order():
    body = "input A, A;\noutput S, T;\nwire w;\nS = Z OR A[1];\nT = 7;\nA = 1;\nw = w;"
    found = check(body).errors
    assert [(d.line, d.column) for d in found] == [(2, 10), (5, 5), (5, 10), (6, 5), (7, 1), (8, 1)]
    assert [d.message.split(" ")[0] for d in found][:2] == ["'A'", "'Z'"]


def test_diagnostic_string_format():
    assert str(Diagnostic("error", 4, 7, "boom")) == "Semantic error at line 4, column 7: boom"
    assert str(Diagnostic("warning", 1, 2, "hmm")) == "Semantic warning at line 1, column 2: hmm"


# ---------- warnings ----------

def test_unused_input_warning():
    assert warnings("input A, B;\noutput S;\nS = A;") == [
        "Semantic warning at line 2, column 10: input 'B' is never used"
    ]


def test_partially_used_bus_is_not_reported():
    assert warnings("input data[4];\noutput S;\nS = data[2];") == []


def test_wire_assigned_but_never_used_warning():
    assert warnings("input A;\noutput S;\nwire t;\nt = A;\nS = A;") == [
        "Semantic warning at line 4, column 6: wire 't' is assigned but never used"
    ]


def test_wire_declared_but_never_used_warning():
    assert warnings("input A;\noutput S;\nwire t;\nS = A;") == [
        "Semantic warning at line 4, column 6: wire 't' is declared but never used"
    ]


def test_warnings_do_not_make_the_analysis_fail():
    result = check("input A, B;\noutput S;\nS = A;")
    assert result.warnings
    assert result.ok


def test_a_failed_use_does_not_trigger_a_never_used_warning():
    result = check("input data[4];\noutput S;\nS = data[9];")
    assert len(result.errors) == 1
    assert result.warnings == []


# ---------- symbol table and reports ----------

def test_symbol_table_contents():
    result = check("input A, data[2];\noutput S;\nwire w;\nw = A;\nS = w AND data[0] AND data[1];")
    table = result.symbols
    assert list(table) == ["A", "data", "S", "w"]
    assert [(s.kind, s.type_name) for s in table.values()] == [
        ("input", "bit"), ("input", "bus[2]"), ("output", "bit"), ("wire", "bit"),
    ]
    assert (table["data"].line, table["data"].column) == (2, 10)
    assert table["data"].is_bus and table["data"].width == 2
    assert not table["A"].is_bus


def test_symbol_bits():
    table = check("input A, data[3];\noutput S;\nS = A AND data[0] AND data[1] AND data[2];").symbols
    assert table["A"].bits() == [("A", None)]
    assert table["data"].bits() == [("data", 0), ("data", 1), ("data", 2)]


def test_format_symbol_table_is_aligned():
    table = check("input A, data[2];\noutput carry;\ncarry = A AND data[0] AND data[1];").symbols
    assert format_symbol_table(table) == [
        "  A      input   bit",
        "  data   input   bus[2]",
        "  carry  output  bit",
    ]


@pytest.mark.parametrize("source, expected", [
    ("output S;\nS = A;", "S = A"),
    ("output S;\nS = NOT A OR B AND C @delay 2.5;", "S = ((NOT A) OR (B AND C))  @delay 2.5"),
    ("output data[2];\ndata[0] = 1;", "data[0] = 1"),
    ("output S;\nS = (A OR B) AND C;", "S = ((A OR B) AND C)"),
])
def test_equations_are_printed_fully_parenthesized(source, expected):
    program = build_ast(parse(HEADER + source).tree)
    assignment = program.statements[-1]
    assert format_equation(assignment) == expected


# ---------- command line ----------

def test_cli_valid_program_report():
    result = run_cli("semantic.py", EXAMPLES / "full_adder.circ")
    assert result.returncode == 0
    lines = result.stdout.splitlines()
    assert lines[0] == "Symbol table:"
    assert "  A      input   bit" in lines
    assert "Equations:" in lines
    assert "  sum = (p XOR Cin)" in lines
    assert lines[-1] == "Semantic analysis completed with no errors"
    assert result.stderr == ""


def test_cli_prints_equations_with_explicit_parentheses():
    result = run_cli("semantic.py", EXAMPLES / "precedence.circ")
    assert "  S = ((NOT A) OR (B AND C))" in result.stdout.splitlines()


def test_cli_warnings_go_to_stderr_and_exit_code_is_still_0():
    result = run_cli("semantic.py", EXAMPLES / "semantic_warnings" / "unused_signals.circ")
    assert result.returncode == 0
    assert result.stderr.count("Semantic warning") == 3
    assert result.stdout.splitlines()[-1] == "Semantic analysis completed with no errors (3 warnings)"


def test_cli_semantic_error_exits_1_with_position():
    result = run_cli("semantic.py", EXAMPLES / "invalid_semantic" / "undeclared_signal.circ")
    assert result.returncode == 1
    assert "Semantic error at line 4, column 11: 'Z' is not declared" in result.stderr
    assert "1 semantic error found (0 warnings)" in result.stderr
    assert "Symbol table" not in result.stdout


def test_cli_stops_at_syntax_errors():
    result = run_cli("semantic.py", EXAMPLES / "invalid_syntax" / "missing_semicolon.circ")
    assert result.returncode == 1
    assert "Syntax error at line 5, column 1" in result.stderr
    assert "semantic analysis not run" in result.stderr
    assert "Semantic error" not in result.stderr


def test_cli_stops_at_lexical_errors():
    result = run_cli("semantic.py", EXAMPLES / "invalid_lexical" / "invalid_character.circ")
    assert result.returncode == 1
    assert "Lexical error at line 4, column 7" in result.stderr
    assert "semantic analysis not run" in result.stderr


def test_cli_missing_file_exits_2_without_traceback():
    result = run_cli("semantic.py", EXAMPLES / "does_not_exist.circ")
    assert result.returncode == 2
    assert "could not open file" in result.stderr
    assert "Traceback" not in result.stderr


@pytest.mark.parametrize("args", [[], ["a.circ", "b.circ"]])
def test_cli_usage_error_exits_2(args):
    result = run_cli("semantic.py", *args)
    assert result.returncode == 2
    assert "Usage" in result.stderr


def test_cli_works_from_any_working_directory(tmp_path):
    result = run_cli("semantic.py", EXAMPLES / "full_adder.circ", cwd=tmp_path)
    assert result.returncode == 0
