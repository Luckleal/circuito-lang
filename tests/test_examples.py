"""Runs both analyzers over every file in examples/ and checks the outcome."""
import lexical
import pytest
import semantic
import syntactic
from ast_builder import build_ast

from helpers import (
    INVALID_LEXICAL_EXAMPLES,
    INVALID_SEMANTIC_EXAMPLES,
    INVALID_SYNTAX_EXAMPLES,
    VALID_EXAMPLES,
    WARNING_EXAMPLES,
)

# file name -> (line, column, message fragment). Columns are 1-based.
EXPECTED_LEXICAL = {
    "invalid_character.circ": (4, 7, "invalid character '&'"),
    "malformed_number.circ": (4, 20, "malformed real number '2.'"),
    "unclosed_string.circ": (1, 9, "unclosed string"),
}
EXPECTED_SYNTAX = {
    "missing_semicolon.circ": (5, 1, "expected '@' or ';', found end of file"),
    "unclosed_paren.circ": (4, 13, "expected ')', found ';'"),
    "missing_operand.circ": (4, 11, "expected an expression, found ';'"),
    "missing_header.circ": (1, 1, "expected 'circuit', found 'input'"),
    "extra_symbol.circ": (5, 1, "expected a statement or end of file, found ')'"),
}
EXPECTED_SEMANTIC = {
    "assign_to_input.circ": (4, 1, "cannot assign to input 'A'"),
    "assigned_twice.circ": (5, 1, "'S' is assigned more than once (first assigned at line 4)"),
    "bus_index_out_of_range.circ": (4, 5, "index 4 is out of range for bus 'data' (valid indices: 0 to 3)"),
    "bus_used_as_bit.circ": (4, 5, "bus 'data' cannot be used as a single bit; use data[0] to data[3]"),
    "combinational_loop.circ": (5, 1, "combinational loop: x -> y -> x"),
    "duplicate_declaration.circ": (3, 6, "'A' is already declared (first declared at line 2)"),
    "index_on_non_bus.circ": (4, 5, "'A' is not a bus and cannot be indexed"),
    "invalid_constant.circ": (4, 11, "constant 5 is not valid; only 0 and 1 are allowed"),
    "output_never_assigned.circ": (3, 11, "output 'T' is never assigned"),
    "undeclared_signal.circ": (4, 11, "'Z' is not declared"),
    "used_before_declaration.circ": (3, 5, "'A' is used before its declaration (declared at line 4)"),
    "wire_read_never_assigned.circ": (5, 11, "wire 't' is read but never assigned"),
    "zero_width_bus.circ": (2, 7, "bus width must be at least 1 (got 0)"),
}


def ids(paths):
    return [p.name for p in paths]


def text_of(path):
    return path.read_text(encoding="utf-8")


def test_example_folders_are_not_empty():
    assert len(VALID_EXAMPLES) >= 5
    assert len(INVALID_LEXICAL_EXAMPLES) >= 3
    assert len(INVALID_SYNTAX_EXAMPLES) >= 5
    assert len(INVALID_SEMANTIC_EXAMPLES) >= 13
    assert len(WARNING_EXAMPLES) >= 1


def test_every_invalid_example_has_an_expectation():
    assert {p.name for p in INVALID_LEXICAL_EXAMPLES} == set(EXPECTED_LEXICAL)
    assert {p.name for p in INVALID_SYNTAX_EXAMPLES} == set(EXPECTED_SYNTAX)
    assert {p.name for p in INVALID_SEMANTIC_EXAMPLES} == set(EXPECTED_SEMANTIC)


@pytest.mark.parametrize("path", VALID_EXAMPLES, ids=ids(VALID_EXAMPLES))
def test_valid_example_passes_all_three_analyzers(path, capsys):
    assert lexical.main(["lexical.py", str(path)]) == 0
    assert syntactic.main(["syntactic.py", str(path)]) == 0
    assert semantic.main(["semantic.py", str(path)]) == 0
    assert capsys.readouterr().err == ""


@pytest.mark.parametrize("path", INVALID_SEMANTIC_EXAMPLES, ids=ids(INVALID_SEMANTIC_EXAMPLES))
def test_semantic_error_example_is_valid_until_the_semantic_stage(path, capsys):
    line, column, fragment = EXPECTED_SEMANTIC[path.name]
    assert lexical.main(["lexical.py", str(path)]) == 0
    assert syntactic.main(["syntactic.py", str(path)]) == 0
    capsys.readouterr()
    assert semantic.main(["semantic.py", str(path)]) == 1
    err = capsys.readouterr().err
    assert f"Semantic error at line {line}, column {column}: {fragment}" in err
    assert "1 semantic error found (0 warnings)" in err


@pytest.mark.parametrize("path", WARNING_EXAMPLES, ids=ids(WARNING_EXAMPLES))
def test_warning_example_passes_but_reports_warnings(path, capsys):
    assert semantic.main(["semantic.py", str(path)]) == 0
    captured = capsys.readouterr()
    assert captured.err.count("Semantic warning") == 3
    assert "Semantic analysis completed with no errors (3 warnings)" in captured.out


@pytest.mark.parametrize("path", INVALID_LEXICAL_EXAMPLES, ids=ids(INVALID_LEXICAL_EXAMPLES))
def test_lexical_error_example(path, capsys):
    line, column, fragment = EXPECTED_LEXICAL[path.name]
    assert lexical.main(["lexical.py", str(path)]) == 1
    err = capsys.readouterr().err
    assert f"Lexical error at line {line}, column {column}: " in err
    assert fragment in err
    assert syntactic.main(["syntactic.py", str(path)]) == 1
    assert semantic.main(["semantic.py", str(path)]) == 1


@pytest.mark.parametrize("path", INVALID_SYNTAX_EXAMPLES, ids=ids(INVALID_SYNTAX_EXAMPLES))
def test_syntax_error_example_is_lexically_valid_but_not_syntactically(path, capsys):
    line, column, fragment = EXPECTED_SYNTAX[path.name]
    assert lexical.main(["lexical.py", str(path)]) == 0
    capsys.readouterr()
    assert syntactic.main(["syntactic.py", str(path)]) == 1
    err = capsys.readouterr().err
    assert f"Syntax error at line {line}, column {column}: " in err
    assert fragment in err
    assert semantic.main(["semantic.py", str(path)]) == 1


def test_precedence_example_groups_and_before_or():
    result = syntactic.parse(text_of(next(p for p in VALID_EXAMPLES if p.name == "precedence.circ")))
    assert result.ok
    expr = build_ast(result.tree).statements[2].expr
    assert expr.op == "OR"
    assert type(expr.left).__name__ == "Not"
    assert expr.right.op == "AND"
