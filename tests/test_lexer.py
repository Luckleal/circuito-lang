"""Unit tests for the lexical analyzer (src/lexical.py), called in-process."""
import pytest

from helpers import EXAMPLES
from lexical import format_token, token_name, tokenize


def names(text):
    tokens, errors = tokenize(text)
    assert errors == []
    return [token_name(t) for t in tokens]


# ---------- recognized tokens ----------

@pytest.mark.parametrize("word, expected", [
    ("circuit", "CIRCUIT"),
    ("input", "INPUT"),
    ("output", "OUTPUT"),
    ("wire", "WIRE"),
    ("delay", "DELAY"),
])
def test_keywords(word, expected):
    assert names(word) == [expected]


@pytest.mark.parametrize("gate", ["AND", "OR", "NOT", "XOR", "XNOR", "NAND", "NOR"])
def test_logic_gates(gate):
    assert names(gate) == [gate]


@pytest.mark.parametrize("text", ["and", "or", "not", "Input", "CIRCUIT", "Wire"])
def test_keywords_and_gates_are_case_sensitive(text):
    assert names(text) == ["IDENT"]


@pytest.mark.parametrize("text", ["inputs", "wired", "outputX", "ORx", "NOTE", "AND2", "circuit_1"])
def test_keyword_prefix_is_still_an_identifier(text):
    assert names(text) == ["IDENT"]


@pytest.mark.parametrize("text", ["a", "A", "_x", "data2", "dataBus_1", "t1"])
def test_identifiers(text):
    assert names(text) == ["IDENT"]


@pytest.mark.parametrize("text, expected", [
    ("0", "INT"),
    ("42", "INT"),
    ("2.5", "REAL"),
    ("0.0", "REAL"),
    ("10.25", "REAL"),
    ('"half adder"', "STRING"),
    ('""', "STRING"),
])
def test_literals(text, expected):
    tokens, errors = tokenize(text)
    assert errors == []
    assert [token_name(t) for t in tokens] == [expected]
    assert tokens[0].text == text


@pytest.mark.parametrize("symbol, expected", [
    ("=", "ASSIGN"),
    ("@", "AT"),
    ("(", "LPAREN"),
    (")", "RPAREN"),
    ("[", "LBRACKET"),
    ("]", "RBRACKET"),
    (",", "COMMA"),
    (";", "SEMI"),
])
def test_symbols(symbol, expected):
    assert names(symbol) == [expected]


def test_longest_match_prefers_real_over_int():
    assert names("2.5") == ["REAL"]
    assert names("25") == ["INT"]


def test_bus_access_tokens():
    assert names("data[3]") == ["IDENT", "LBRACKET", "INT", "RBRACKET"]


def test_annotation_tokens():
    assert names("@delay 2.5") == ["AT", "DELAY", "REAL"]


def test_empty_input_has_no_tokens():
    assert tokenize("") == ([], [])


# ---------- discarded input ----------

def test_whitespace_is_discarded():
    assert names("  A \t\n\r\n B  ") == ["IDENT", "IDENT"]


def test_line_comment_is_discarded():
    assert names("A // this is ignored ; = @\nB") == ["IDENT", "IDENT"]


def test_comment_only_file_has_no_tokens():
    assert names("// nothing here\n// still nothing") == []


def test_comment_does_not_swallow_next_line():
    tokens, _ = tokenize("// c\nA")
    assert [(token_name(t), t.line) for t in tokens] == [("IDENT", 2)]


# ---------- positions and formatting ----------

def test_token_lines_are_one_based():
    tokens, _ = tokenize("A\n\nB ;\nC")
    assert [t.line for t in tokens] == [1, 3, 3, 4]


def test_format_token():
    tokens, _ = tokenize('\ncircuit "x";')
    assert [format_token(t) for t in tokens] == [
        "CIRCUIT 'circuit' line 2",
        "STRING '\"x\"' line 2",
        "SEMI ';' line 2",
    ]


def test_half_adder_has_25_tokens():
    text = (EXAMPLES / "half_adder.circ").read_text(encoding="utf-8")
    tokens, errors = tokenize(text)
    assert errors == []
    assert len(tokens) == 25


# ---------- lexical errors ----------

def test_invalid_character():
    tokens, errors = tokenize("A & B")
    assert errors == ["Lexical error at line 1, column 3: invalid character '&'"]
    assert [token_name(t) for t in tokens] == ["IDENT", "IDENT"]


@pytest.mark.parametrize("char", ["&", "#", "$", "%", "!", "?", "~", "{", "}", "+", "-", "*", "é"])
def test_characters_outside_the_language_are_invalid(char):
    _, errors = tokenize(f"A {char} B")
    assert len(errors) == 1
    assert f"invalid character '{char}'" in errors[0]


def test_invalid_character_column_is_one_based_on_later_lines():
    _, errors = tokenize("A;\nB;\n  C #")
    assert errors == ["Lexical error at line 3, column 5: invalid character '#'"]


def test_malformed_real_number():
    tokens, errors = tokenize("@delay 2.;")
    assert errors == [
        "Lexical error at line 1, column 8: "
        "malformed real number '2.' (missing digit after the decimal point)"
    ]
    assert [token_name(t) for t in tokens] == ["AT", "DELAY", "SEMI"]


def test_valid_real_is_not_reported_as_malformed():
    assert tokenize("2.5")[1] == []


def test_unclosed_string():
    tokens, errors = tokenize('circuit "half adder;')
    assert errors == ["Lexical error at line 1, column 9: unclosed string (missing closing quote)"]
    assert [token_name(t) for t in tokens] == ["CIRCUIT"]


def test_unclosed_string_stops_at_end_of_line():
    tokens, errors = tokenize('"abc\nA')
    assert len(errors) == 1
    assert [(token_name(t), t.line) for t in tokens] == [("IDENT", 2)]


def test_closed_string_is_not_an_error():
    assert tokenize('"abc"')[1] == []


def test_error_tokens_are_not_counted_as_recognized():
    tokens, errors = tokenize('A 2. "x')
    assert [token_name(t) for t in tokens] == ["IDENT"]
    assert len(errors) == 2


def test_all_errors_are_reported_in_order_of_appearance():
    _, errors = tokenize('A & B\n2. C\n"open')
    assert len(errors) == 3
    assert "invalid character '&'" in errors[0]
    assert "line 2" in errors[1] and "malformed real number" in errors[1]
    assert "line 3" in errors[2] and "unclosed string" in errors[2]


def test_analysis_continues_after_an_error():
    tokens, errors = tokenize("A & B & C")
    assert len(errors) == 2
    assert [token_name(t) for t in tokens] == ["IDENT", "IDENT", "IDENT"]
