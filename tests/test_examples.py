"""Runs both analyzers over every file in examples/ and checks the outcome."""
import lexical
import pytest
import syntactic

from helpers import INVALID_LEXICAL_EXAMPLES, INVALID_SYNTAX_EXAMPLES, VALID_EXAMPLES

# file name -> (line, column, message fragment). Columns are 1-based.
EXPECTED_LEXICAL = {
    "invalid_character.circ": (4, 7, "invalid character '&'"),
    "malformed_number.circ": (4, 20, "malformed real number '2.'"),
    "unclosed_string.circ": (1, 9, "unclosed string"),
}
EXPECTED_SYNTAX = {
    "missing_semicolon.circ": (5, 1, "found end of file"),
    "unclosed_paren.circ": (4, 13, "missing ')' before ';'"),
    "missing_operand.circ": (4, 11, "found ';'"),
    "missing_header.circ": (1, 1, "found 'input', expected 'circuit'"),
    "extra_symbol.circ": (5, 1, "unexpected symbol ')'"),
}


def ids(paths):
    return [p.name for p in paths]


def text_of(path):
    return path.read_text(encoding="utf-8")


def test_example_folders_are_not_empty():
    assert len(VALID_EXAMPLES) >= 4
    assert len(INVALID_LEXICAL_EXAMPLES) >= 3
    assert len(INVALID_SYNTAX_EXAMPLES) >= 5


def test_every_invalid_example_has_an_expectation():
    assert {p.name for p in INVALID_LEXICAL_EXAMPLES} == set(EXPECTED_LEXICAL)
    assert {p.name for p in INVALID_SYNTAX_EXAMPLES} == set(EXPECTED_SYNTAX)


@pytest.mark.parametrize("path", VALID_EXAMPLES, ids=ids(VALID_EXAMPLES))
def test_valid_example_passes_both_analyzers(path, capsys):
    assert lexical.main(["lexical.py", str(path)]) == 0
    assert syntactic.main(["syntactic.py", str(path)]) == 0
    assert capsys.readouterr().err == ""


@pytest.mark.parametrize("path", INVALID_LEXICAL_EXAMPLES, ids=ids(INVALID_LEXICAL_EXAMPLES))
def test_lexical_error_example(path, capsys):
    line, column, fragment = EXPECTED_LEXICAL[path.name]
    assert lexical.main(["lexical.py", str(path)]) == 1
    err = capsys.readouterr().err
    assert f"Lexical error at line {line}, column {column}: " in err
    assert fragment in err
    assert syntactic.main(["syntactic.py", str(path)]) == 1


@pytest.mark.parametrize("path", INVALID_SYNTAX_EXAMPLES, ids=ids(INVALID_SYNTAX_EXAMPLES))
def test_syntax_error_example_is_lexically_valid_but_not_syntactically(path, capsys):
    line, column, fragment = EXPECTED_SYNTAX[path.name]
    assert lexical.main(["lexical.py", str(path)]) == 0
    capsys.readouterr()
    assert syntactic.main(["syntactic.py", str(path)]) == 1
    err = capsys.readouterr().err
    assert f"Syntax error at line {line}, column {column}: " in err
    assert fragment in err


def test_precedence_example_groups_and_before_or():
    result = syntactic.parse(text_of(next(p for p in VALID_EXAMPLES if p.name == "precedence.circ")))
    assert result.ok
    expr = result.tree.statement(2).assignment().expr()
    assert expr.OR() is not None
    assert expr.expr(0).NOT() is not None
    assert expr.expr(1).AND() is not None
