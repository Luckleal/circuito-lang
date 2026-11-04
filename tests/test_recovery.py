"""Panic-mode recovery: one mistake must produce one message, not a trail of ghost errors,
and every real mistake in a file must still be reported."""
import random
import re

import pytest

from error_strategy import at_sync_point
from helpers import VALID_EXAMPLES
from lexical import tokenize
from syntactic import parse

HEADER = 'circuit "t";\n'


def syntax_errors(body, header=HEADER):
    result = parse(header + body)
    assert result.lexical_errors == []
    return result.syntax_errors


# (description, number of real mistakes, program body, exact messages expected)
SCENARIOS = [
    ("stray ')' in the middle of an expression", 1,
     "input A, B;\noutput S;\nS = A AND ) OR ( AND B ) OR A;\nS = A OR B;\n",
     ["Syntax error at line 4, column 11: expected an expression, found ')'"]),
    ("three broken statements in a row", 3,
     "input A, B;\noutput S, T;\nS = A AND ;\nT = ( A OR B;\nS = A B;\n",
     ["Syntax error at line 4, column 11: expected an expression, found ';'",
      "Syntax error at line 5, column 13: expected ')', found ';'",
      "Syntax error at line 6, column 7: expected '@' or ';', found 'B'"]),
    ("double comma in a declaration", 1,
     "input A,, B;\noutput S;\nS = A OR B;\n",
     ["Syntax error at line 2, column 9: expected identifier, found ','"]),
    ("missing ';' before another assignment", 1,
     "input A, B;\noutput S, T;\nS = A\nT = B;\n",
     ["Syntax error at line 5, column 1: expected '@' or ';', found 'T'"]),
    ("missing ';' before a declaration", 1,
     "input A, B\noutput S;\nS = A;\n",
     ["Syntax error at line 3, column 1: expected ',' or ';', found 'output'"]),
    ("stray ')' between statements", 1,
     "input A;\noutput S;\n)\nS = A;\n",
     ["Syntax error at line 4, column 1: expected a statement or end of file, found ')'"]),
    ("stray ';' between statements", 1,
     "input A;\noutput S;\n;\nS = A;\n",
     ["Syntax error at line 4, column 1: expected a statement or end of file, found ';'"]),
    ("keyword used as a signal name", 1,
     "input A;\noutput S;\nS = input;\nS2 = A;\n",
     ["Syntax error at line 4, column 5: expected an expression, found 'input'"]),
    ("unclosed parenthesis, valid statement after it", 1,
     "input A;\noutput S, T;\nS = (A OR A;\nT = A;\n",
     ["Syntax error at line 4, column 12: expected ')', found ';'"]),
    ("two operators in a row", 1,
     "input A, B;\noutput S;\nS = A AND OR B;\n",
     ["Syntax error at line 4, column 11: expected an expression, found 'OR'"]),
    ("three mistakes with good statements between them", 3,
     "input A, B;\noutput S, T, U, V;\nS = A AND ;\nT = A;\nU = ( B;\nV = B;\nS = ;\n",
     ["Syntax error at line 4, column 11: expected an expression, found ';'",
      "Syntax error at line 6, column 8: expected ')', found ';'",
      "Syntax error at line 8, column 5: expected an expression, found ';'"]),
    ("garbage until the end of the file", 1,
     "input A;\noutput S;\nS = A OR OR OR OR\n",
     ["Syntax error at line 4, column 10: expected an expression, found 'OR'"]),
    ("three empty declarations", 3,
     "input ;\noutput ;\nwire ;\n",
     ["Syntax error at line 2, column 7: expected identifier, found ';'",
      "Syntax error at line 3, column 8: expected identifier, found ';'",
      "Syntax error at line 4, column 6: expected identifier, found ';'"]),
    ("assignment without a target", 1,
     "input A;\noutput S;\n= A;\nS = A;\n",
     ["Syntax error at line 4, column 1: expected a statement or end of file, found '='"]),
    ("assignment without '='", 1,
     "input A;\noutput S;\nS A;\nS = A;\n",
     ["Syntax error at line 4, column 3: expected '=', found 'A'"]),
    ("two broken statements on the same line", 2,
     "input A;\noutput S;\nS = ; S = ;\n",
     ["Syntax error at line 4, column 5: expected an expression, found ';'",
      "Syntax error at line 4, column 11: expected an expression, found ';'"]),
    ("@delay without a number", 1,
     "input A;\noutput S;\nS = A @delay ;\n",
     ["Syntax error at line 4, column 14: expected real number, found ';'"]),
    ("@delay with an integer", 1,
     "input A;\noutput S;\nS = A @delay 3;\nS = A;\n",
     ["Syntax error at line 4, column 14: expected real number, found '3'"]),
    ("unfinished bus declaration", 1,
     "input data[;\noutput S;\nS = 1;\n",
     ["Syntax error at line 2, column 12: expected integer, found ';'"]),
]


@pytest.mark.parametrize(
    "body, messages", [(s[2], s[3]) for s in SCENARIOS], ids=[s[0] for s in SCENARIOS]
)
def test_each_mistake_gets_exactly_one_message(body, messages):
    assert syntax_errors(body) == messages


@pytest.mark.parametrize("real, messages", [(s[1], s[3]) for s in SCENARIOS], ids=[s[0] for s in SCENARIOS])
def test_scenario_table_is_consistent(real, messages):
    assert len(messages) == real


def test_missing_semicolon_in_the_header_is_one_message():
    result = parse('circuit "t"\ninput A;\n')
    assert result.syntax_errors == ["Syntax error at line 2, column 1: expected ';', found 'input'"]


def test_missing_header_is_one_message():
    result = parse("input A;\noutput S;\nS = A;\n")
    assert result.syntax_errors == ["Syntax error at line 1, column 1: expected 'circuit', found 'input'"]


# ---------- what must NOT happen ----------

def test_a_broken_statement_does_not_hide_the_next_one():
    """The classic ghost: recovery must not glue the next statement onto the broken one."""
    messages = syntax_errors("input A;\noutput S, T;\nS = A AND ;\nT = ( A OR A;\n")
    assert len(messages) == 2
    assert "line 4" in messages[0] and "line 5" in messages[1]


def test_the_rest_of_the_file_is_still_parsed_after_an_error():
    result = parse(HEADER + "input A;\noutput S;\nS = ;\nS = A;\n")
    assert len(result.syntax_errors) == 1
    assert len(result.tree.statement()) == 4  # the broken one is kept, and so is the good one after it


def test_a_semicolon_is_never_treated_as_a_stray_token():
    """ANTLR would delete the ';' in 'S = A AND ;' because the next token looks like an operand."""
    messages = syntax_errors("input A;\noutput S, T;\nS = A AND ;\nT = A;\n")
    assert len(messages) == 1


def test_errors_are_reported_in_source_order():
    messages = syntax_errors("input ;\noutput S;\nS = ;\n)\n")
    positions = [tuple(map(int, re.findall(r"\d+", m.split(":")[0]))) for m in messages]
    assert len(positions) == 3
    assert positions == sorted(positions)


# ---------- the safe points ----------

@pytest.mark.parametrize("text, expected", [
    (";", True),
    ("input A", True),
    ("output S", True),
    ("wire t", True),
    ("input ;", False),  # `input` only counts as a declaration start when an identifier follows
    ("input", False),
    ("", True),  # end of file
    ("AND", False),
    ("OR", False),
    (",", False),
    ("A", False),
    ("(", False),
])
def test_at_sync_point(text, expected):
    from antlr4 import CommonTokenStream, InputStream
    from CircuitLexer import CircuitLexer

    lexer = CircuitLexer(InputStream(text))
    stream = CommonTokenStream(lexer)
    stream.fill()
    assert at_sync_point(stream) is expected


# ---------- properties over many programs ----------

def mutate(tokens, index, kind):
    sequence = list(tokens)
    if kind == "delete":
        del sequence[index]
    elif kind == "duplicate":
        sequence.insert(index, sequence[index])
    return " ".join(sequence)


@pytest.mark.parametrize("path", VALID_EXAMPLES, ids=[p.name for p in VALID_EXAMPLES])
@pytest.mark.parametrize("kind", ["delete", "duplicate"])
def test_one_damaged_token_never_produces_more_than_one_message(path, kind):
    tokens = [t.text for t in tokenize(path.read_text(encoding="utf-8"))[0]]
    for index in range(len(tokens)):
        result = parse(mutate(tokens, index, kind))
        if result.lexical_errors:
            continue
        assert len(result.syntax_errors) <= 1, (kind, index, tokens[index], result.syntax_errors)


@pytest.mark.parametrize("path", VALID_EXAMPLES, ids=[p.name for p in VALID_EXAMPLES])
def test_damage_is_usually_detected(path):
    """Guards against a recovery that 'succeeds' by reporting nothing."""
    tokens = [t.text for t in tokenize(path.read_text(encoding="utf-8"))[0]]
    detected = sum(
        1 for i in range(len(tokens))
        if parse(mutate(tokens, i, "delete")).syntax_errors
    )
    assert detected >= len(tokens) * 0.9


def test_random_token_soup_always_terminates_with_well_formed_messages():
    vocabulary = [
        "circuit", '"t"', "input", "output", "wire", "delay", "A", "B", "data", "0", "1", "2.5",
        "AND", "OR", "NOT", "XOR", "NAND", "=", "@", "(", ")", "[", "]", ",", ";",
    ]
    rng = random.Random(2024)
    for _ in range(300):
        text = " ".join(rng.choice(vocabulary) for _ in range(rng.randint(1, 40)))
        result = parse(text)
        for message in result.syntax_errors:
            assert message.startswith("Syntax error at line ")
            assert ", column " in message and ": " in message
        assert len(result.syntax_errors) <= len(text.split()) + 1
