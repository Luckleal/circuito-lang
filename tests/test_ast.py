"""Tests for the AST (src/ast_nodes.py) and the visitor that builds it (src/ast_builder.py)."""
import pytest

from ast_builder import AstBuilder, build_ast
from ast_nodes import (
    Assignment, BinaryOp, Constant, Declaration, Not, Program, Signal, format_ast, walk,
)
from CircuitVisitor import CircuitVisitor
from helpers import EXAMPLES, VALID_EXAMPLES, run_cli
from syntactic import parse


def ast_of(text, rule="program"):
    result = parse(text, rule=rule)
    assert result.ok, result.lexical_errors + result.syntax_errors
    return build_ast(result.tree)


def program_ast(body):
    return ast_of('circuit "t";\n' + body)


def expr_ast(text):
    return ast_of(text, rule="expression")


def count_parse_tree_nodes(node):
    return 1 + sum(count_parse_tree_nodes(node.getChild(i)) for i in range(node.getChildCount()))


# ---------- the visitor is wired to the generated base class ----------

@pytest.mark.parametrize("method", [
    "visitProgram", "visitStatement", "visitDeclaration", "visitAssignment", "visitSignal",
    "visitNotExpr", "visitAndExpr", "visitOrExpr", "visitParenExpr", "visitSignalExpr", "visitConstExpr",
])
def test_builder_overrides_the_generated_visitor_method(method):
    assert issubclass(AstBuilder, CircuitVisitor)
    assert getattr(AstBuilder, method) is not getattr(CircuitVisitor, method)


# ---------- program structure ----------

def test_half_adder_ast():
    program = ast_of((EXAMPLES / "half_adder.circ").read_text(encoding="utf-8"))
    assert isinstance(program, Program)
    assert program.name == "half adder"
    assert [type(s) for s in program.statements] == [Declaration, Declaration, Assignment, Assignment]
    assert [s.kind for s in program.statements[:2]] == ["input", "output"]
    assert [sig.name for sig in program.statements[0].signals] == ["A", "B"]
    assert [sig.name for sig in program.statements[1].signals] == ["sum", "carry"]


def test_header_only_program_has_no_statements():
    program = program_ast("")
    assert program.name == "t"
    assert program.statements == []


@pytest.mark.parametrize("keyword", ["input", "output", "wire"])
def test_declaration_kind(keyword):
    declaration = program_ast(f"{keyword} X, Y;").statements[0]
    assert declaration.kind == keyword
    assert [s.name for s in declaration.signals] == ["X", "Y"]


def test_bus_width_in_declaration():
    declaration = program_ast("input data[4];").statements[0]
    assert declaration.signals[0] == Signal("data", 4, line=2, column=7)


def test_assignment_without_delay():
    assignment = program_ast("output S;\nS = A;").statements[1]
    assert assignment.delay is None
    assert assignment.target.name == "S"
    assert assignment.expr.name == "A"


def test_assignment_with_delay_is_a_float():
    assignment = program_ast("output S;\nS = A AND B @delay 2.5;").statements[1]
    assert assignment.delay == 2.5
    assert isinstance(assignment.delay, float)


def test_assignment_to_a_bus_position():
    assignment = program_ast("output data[2];\ndata[0] = 1;").statements[1]
    assert assignment.target.name == "data"
    assert assignment.target.index == 0
    assert assignment.expr == Constant(1, line=3, column=11)


# ---------- expressions ----------

def test_signal_and_constant():
    assert isinstance(expr_ast("A"), Signal)
    assert expr_ast("data[3]").index == 3
    assert isinstance(expr_ast("1"), Constant)
    assert expr_ast("0").value == 0


def test_not_node():
    node = expr_ast("NOT A")
    assert isinstance(node, Not)
    assert node.operand.name == "A"


@pytest.mark.parametrize("op", ["AND", "NAND", "OR", "NOR", "XOR", "XNOR"])
def test_binary_operator_text_is_kept(op):
    node = expr_ast(f"A {op} B")
    assert isinstance(node, BinaryOp)
    assert node.op == op
    assert (node.left.name, node.right.name) == ("A", "B")


def test_parentheses_do_not_become_nodes():
    node = expr_ast("((A))")
    assert isinstance(node, Signal)
    assert (node.name, node.line, node.column) == ("A", 1, 3)
    assert [type(n).__name__ for n in walk(expr_ast("(A OR B)"))] == ["BinaryOp", "Signal", "Signal"]


def test_precedence_shapes_the_tree():
    node = expr_ast("NOT A OR B AND C")
    assert node.op == "OR"
    assert isinstance(node.left, Not)
    assert node.right.op == "AND"


def test_associativity_shapes_the_tree():
    node = expr_ast("A OR B OR C")
    assert node.op == "OR"
    assert node.left.op == "OR"
    assert node.right.name == "C"


def test_parentheses_change_the_tree():
    node = expr_ast("(A OR B) AND C")
    assert node.op == "AND"
    assert node.left.op == "OR"


@pytest.mark.parametrize("text, expected", [
    ("A", "A"),
    ("data[2]", "data[2]"),
    ("1", "1"),
    ("NOT A", "(NOT A)"),
    ("A XOR B", "(A XOR B)"),
    ("NOT A OR B AND C", "((NOT A) OR (B AND C))"),
])
def test_parenthesized_form(text, expected):
    assert expr_ast(text).parenthesized() == expected


# ---------- printing and walking ----------

def test_format_ast_of_an_expression():
    assert format_ast(expr_ast("NOT A OR B AND C")) == [
        "BinaryOp OR",
        "  Not",
        "    Signal A",
        "  BinaryOp AND",
        "    Signal B",
        "    Signal C",
    ]


def test_format_ast_of_a_program():
    lines = format_ast(program_ast("input data[4];\noutput S;\nS = data[0] @delay 3.0;"))
    assert lines == [
        'Program "t"',
        "  Declaration input",
        "    Signal data[4]",
        "  Declaration output",
        "    Signal S",
        "  Assignment @delay 3.0",
        "    Signal S",
        "    Signal data[0]",
    ]


def test_walk_visits_nodes_depth_first_in_source_order():
    node = expr_ast("NOT A OR B AND C")
    assert [n.label() for n in walk(node)] == [
        "BinaryOp OR", "Not", "Signal A", "BinaryOp AND", "Signal B", "Signal C",
    ]


def test_ast_is_much_smaller_than_the_parse_tree():
    result = parse("A OR B AND C", rule="expression")
    parse_nodes = count_parse_tree_nodes(result.tree)
    ast_nodes = len(list(walk(build_ast(result.tree))))
    assert ast_nodes == 5
    assert parse_nodes >= 3 * ast_nodes


# ---------- positions (1-based) ----------

def test_positions_point_to_where_each_node_starts():
    program = ast_of('circuit "t";\ninput A, B;\noutput S;\nS = A AND B;\n')
    assert (program.line, program.column) == (1, 1)
    assignment = program.statements[2]
    assert (assignment.line, assignment.column) == (4, 1)
    assert (assignment.target.line, assignment.target.column) == (4, 1)
    expr = assignment.expr
    assert (expr.line, expr.column) == (4, 5)
    assert (expr.left.line, expr.left.column) == (4, 5)
    assert (expr.right.line, expr.right.column) == (4, 11)


def test_not_node_starts_at_the_not_keyword():
    node = expr_ast("  NOT A")
    assert (node.line, node.column) == (1, 3)


@pytest.mark.parametrize("path", VALID_EXAMPLES, ids=[p.name for p in VALID_EXAMPLES])
def test_every_valid_example_builds_an_ast_with_positions(path):
    program = ast_of(path.read_text(encoding="utf-8"))
    assert isinstance(program, Program)
    nodes = list(walk(program))
    assert len(nodes) > 3
    assert all(n.line >= 1 and n.column >= 1 for n in nodes)


# ---------- command line ----------

def test_cli_ast_option_prints_the_ast():
    result = run_cli("syntactic.py", "--ast", EXAMPLES / "half_adder.circ")
    assert result.returncode == 0
    lines = result.stdout.splitlines()
    assert lines[0] == 'Program "half adder"'
    assert "  Declaration input" in lines
    assert lines[-1] == "Syntactic analysis completed with no errors"
    assert "program" not in lines


def test_cli_without_ast_option_still_prints_the_parse_tree():
    result = run_cli("syntactic.py", EXAMPLES / "half_adder.circ")
    assert result.stdout.splitlines()[0] == "program"


def test_cli_ast_option_accepts_the_flag_after_the_file():
    result = run_cli("syntactic.py", EXAMPLES / "half_adder.circ", "--ast")
    assert result.returncode == 0
    assert result.stdout.startswith('Program "half adder"')


def test_cli_ast_option_does_not_hide_errors():
    bad = EXAMPLES / "invalid_syntax" / "missing_semicolon.circ"
    result = run_cli("syntactic.py", "--ast", bad)
    assert result.returncode == 1
    assert "Syntax error" in result.stderr
    assert "Program" not in result.stdout


def test_cli_flag_alone_is_a_usage_error():
    result = run_cli("syntactic.py", "--ast")
    assert result.returncode == 2
    assert "Usage" in result.stderr


def test_interactive_mode_shows_the_ast():
    result = run_cli("interactive.py", "NOT A OR B AND C")
    assert result.returncode == 0
    assert "AST:" in result.stdout
    assert "  BinaryOp OR" in result.stdout
    assert "    Not" in result.stdout
    assert "Grouped: ((NOT A) OR (B AND C))" in result.stdout
