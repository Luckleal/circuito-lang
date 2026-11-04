"""Unit tests for the syntactic analyzer (src/syntactic.py), called in-process."""
import pytest

from helpers import EXAMPLES
from ast_builder import build_ast
from CircuitParser import CircuitParser
from error_strategy import describe_expected, describe_found, syntax_message
from lexical import tokenize
from syntactic import format_tree, parse


def sexpr(expr_ctx):
    """Fully parenthesized form of an expression (built from its AST), to check precedence."""
    return build_ast(expr_ctx).parenthesized()

HEADER = 'circuit "t";\n'


def program(body):
    return HEADER + body


def parse_expr(text):
    result = parse(program(f"input A, B, C, D;\noutput S;\nS = {text};\n"))
    assert result.ok, result.syntax_errors + result.lexical_errors
    return sexpr(result.tree.statement(2).assignment().expr())


# ---------- valid programs ----------

@pytest.mark.parametrize("body", [
    "",
    "input A;",
    "input A, B, C;",
    "output S;",
    "wire t1, t2;",
    "input data[4];",
    "input A;\noutput S;\nS = A;",
    "input A, B;\noutput S;\nS = A AND B @delay 3.0;",
    "input data[4];\noutput S;\nS = data[0];",
    "output data[2];\ndata[0] = 1;",
    "output S;\nS = 0;",
    "S = A;\ninput A;\noutput S;",
    "output S;\ninput A;\nS = NOT (A OR NOT A);",
], ids=lambda b: b.replace("\n", " | ") or "header-only")
def test_valid_programs_parse_without_errors(body):
    result = parse(program(body))
    assert result.ok, result.syntax_errors + result.lexical_errors
    assert result.tree is not None


def test_declarations_and_assignments_may_come_in_any_order():
    first = parse(program("input A;\noutput S;\nS = A;"))
    last = parse(program("S = A;\noutput S;\ninput A;"))
    assert first.ok and last.ok


def test_program_structure():
    result = parse(program("input A, B;\noutput S;\nS = A AND B;"))
    program_ctx = result.tree
    assert program_ctx.header().STRING().getText() == '"t"'
    assert len(program_ctx.statement()) == 3
    declaration = program_ctx.statement(0).declaration()
    assert declaration.INPUT() is not None
    assert [s.getText() for s in declaration.signal()] == ["A", "B"]
    assignment = program_ctx.statement(2).assignment()
    assert assignment.signal().getText() == "S"
    assert assignment.annotation() is None


def test_annotation_is_captured():
    result = parse(program("output S;\nS = 1 @delay 2.5;"))
    annotation = result.tree.statement(1).assignment().annotation()
    assert annotation.REAL().getText() == "2.5"


def test_half_adder_tree_shape():
    text = (EXAMPLES / "half_adder.circ").read_text(encoding="utf-8")
    result = parse(text)
    lines = format_tree(result.tree, result.parser)
    assert lines[0] == "program"
    assert lines[1] == "  header"
    assert "    CIRCUIT 'circuit'" in lines
    assert any(line.strip() == "XOR 'XOR'" for line in lines)
    assert not any("<EOF>" in l for l in lines)


# ---------- precedence and associativity ----------

@pytest.mark.parametrize("text, expected", [
    ("NOT A OR B AND C", "((NOT A) OR (B AND C))"),
    ("NOT A AND B", "((NOT A) AND B)"),
    ("A OR B AND C", "(A OR (B AND C))"),
    ("A AND B OR C", "((A AND B) OR C)"),
    ("A NAND B OR C", "((A NAND B) OR C)"),
    ("A OR B NAND C", "(A OR (B NAND C))"),
    ("A NOR B AND C", "(A NOR (B AND C))"),
    ("A XOR B AND C", "(A XOR (B AND C))"),
    ("A XNOR B AND C", "(A XNOR (B AND C))"),
    ("NOT NOT A", "(NOT (NOT A))"),
    ("A OR 1", "(A OR 1)"),
])
def test_precedence(text, expected):
    assert parse_expr(text) == expected


@pytest.mark.parametrize("text, expected", [
    ("A OR B OR C", "((A OR B) OR C)"),
    ("A AND B AND C", "((A AND B) AND C)"),
    ("A OR B XOR C", "((A OR B) XOR C)"),
    ("A XOR B OR C", "((A XOR B) OR C)"),
    ("A NOR B XNOR C", "((A NOR B) XNOR C)"),
    ("A AND B NAND C", "((A AND B) NAND C)"),
    ("A OR B OR C OR D", "(((A OR B) OR C) OR D)"),
])
def test_binary_operators_are_left_associative(text, expected):
    assert parse_expr(text) == expected


@pytest.mark.parametrize("text, expected", [
    ("(A OR B) AND C", "((A OR B) AND C)"),
    ("A AND (B OR C)", "(A AND (B OR C))"),
    ("NOT (A OR B)", "(NOT (A OR B))"),
    ("((A))", "A"),
    ("(A OR (B AND (C OR D)))", "(A OR (B AND (C OR D)))"),
])
def test_parentheses_override_precedence(text, expected):
    assert parse_expr(text) == expected


def test_bus_elements_in_expressions():
    result = parse(program("input data[4];\noutput S;\nS = data[0] OR NOT data[3];"))
    assert result.ok
    expr = result.tree.statement(2).assignment().expr()
    assert sexpr(expr) == "(data[0] OR (NOT data[3]))"


# ---------- syntax errors ----------

@pytest.mark.parametrize("source, line, column, message", [
    ("input A;", 1, 1, "expected 'circuit', found 'input'"),
    ('circuit "t"\ninput A;', 2, 1, "expected ';', found 'input'"),
    ('circuit "t";\ninput ;', 2, 7, "expected identifier, found ';'"),
    ('circuit "t";\ninput A, ;', 2, 10, "expected identifier, found ';'"),
    ('circuit "t";\ninput AND;', 2, 7, "expected identifier, found 'AND'"),
    ('circuit "t";\ninput input;', 2, 7, "expected identifier, found 'input'"),
    ('circuit "t";\ninput data[A];', 2, 12, "expected integer, found 'A'"),
    ('circuit "t";\ninput A', 2, 8, "expected ',' or ';', found end of file"),
    ('circuit "t";\noutput S;\nS = ;', 3, 5, "expected an expression, found ';'"),
    ('circuit "t";\noutput S;\nS = A AND ;', 3, 11, "expected an expression, found ';'"),
    ('circuit "t";\noutput S;\nS = (A AND B;', 3, 13, "expected ')', found ';'"),
    ('circuit "t";\noutput S;\nS = A AND B @delay 3;', 3, 20, "expected real number, found '3'"),
    ('circuit "t";\noutput S;\nS = A AND B @ 3.0;', 3, 15, "expected 'delay', found '3.0'"),
    ('circuit "t";\noutput S;\nS A;', 3, 3, "expected '=', found 'A'"),
    ('circuit "t";\noutput S;\nS = A OR B C;', 3, 12, "expected '@' or ';', found 'C'"),
    ('circuit "t";\noutput S;\nS = A;\n)', 4, 1, "expected a statement or end of file, found ')'"),
    ('circuit "t";\ncircuit "u";', 2, 1, "expected a statement or end of file, found 'circuit'"),
])
def test_syntax_errors_say_where_what_was_expected_and_what_was_found(source, line, column, message):
    result = parse(source)
    assert result.lexical_errors == []
    assert result.syntax_errors[0] == f"Syntax error at line {line}, column {column}: {message}"


def test_end_of_file_is_required_after_the_last_statement():
    result = parse(program("output S;\nS = 1;\n) extra"))
    assert result.syntax_errors


def test_header_is_mandatory():
    assert parse("").syntax_errors


def test_lexical_errors_stop_the_syntactic_analysis():
    result = parse(program("output S;\nS = A & B;"))
    assert len(result.lexical_errors) == 1
    assert result.syntax_errors == []
    assert result.tree is None
    assert not result.ok


# ---------- how the expected set and the found token are described ----------

@pytest.mark.parametrize("names, expected", [
    (["SEMI"], "';'"),
    (["IDENT"], "identifier"),
    (["INT"], "integer"),
    (["REAL"], "real number"),
    (["STRING"], "string"),
    (["SEMI", "AT"], "'@' or ';'"),
    (["COMMA", "SEMI", "LBRACKET"], "'[', ',' or ';'"),
    (["NOT", "INT", "IDENT", "LPAREN"], "an expression"),
    (["INPUT", "OUTPUT", "WIRE", "IDENT", "EOF"], "a statement or end of file"),
    (["AND", "NAND", "OR", "NOR", "XOR", "XNOR", "SEMI"], "an operator or ';'"),
    (["NOT", "INT", "IDENT", "LPAREN", "SEMI"], "an expression or ';'"),
    (["EOF"], "end of file"),
    ([], ""),
])
def test_describe_expected(names, expected):
    assert describe_expected({getattr(CircuitParser, n) if n != "EOF" else -1 for n in names}) == expected


def test_describe_expected_caps_long_lists():
    many = {CircuitParser.INPUT, CircuitParser.OUTPUT, CircuitParser.WIRE, CircuitParser.CIRCUIT,
            CircuitParser.DELAY, CircuitParser.ASSIGN, CircuitParser.AT, CircuitParser.COMMA}
    assert describe_expected(many).count(",") <= 6
    assert "..." in describe_expected(many)


def test_describe_found_token():
    tokens, _ = tokenize("A")
    assert describe_found(tokens[0]) == "'A'"


def test_syntax_message_without_an_expected_set():
    tokens, _ = tokenize(")")
    assert syntax_message(set(), tokens[0]) == "unexpected ')'"


# ---------- the `expression` start rule (a lone expression) ----------

@pytest.mark.parametrize("text, expected", [
    ("A", "A"),
    ("NOT A OR B AND C", "((NOT A) OR (B AND C))"),
    ("(data[0] OR data[1]) AND NOT data[3]", "((data[0] OR data[1]) AND (NOT data[3]))"),
    ("A XOR 1", "(A XOR 1)"),
])
def test_expression_rule_accepts_a_lone_expression(text, expected):
    result = parse(text, rule="expression")
    assert result.ok
    assert sexpr(result.tree.expr()) == expected


@pytest.mark.parametrize("text, column, message", [
    ("", 1, "expected an expression, found end of file"),
    ("A OR", 5, "expected an expression, found end of file"),
    ("A B", 3, "expected end of file, found 'B'"),
    ("A OR B)", 7, "expected end of file, found ')'"),
    ("(A OR B", 8, "expected ')', found end of file"),
    ("A AND ;", 7, "expected an expression, found ';'"),
])
def test_expression_rule_rejects_incomplete_or_extra_input(text, column, message):
    result = parse(text, rule="expression")
    assert result.syntax_errors == [f"Syntax error at line 1, column {column}: {message}"]


def test_expression_rule_reports_lexical_errors_first():
    result = parse("A & B", rule="expression")
    assert len(result.lexical_errors) == 1
    assert result.tree is None
