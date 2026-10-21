"""Tests for the interactive expression analyzer (src/interactive.py)."""
import pytest

import interactive
from helpers import run_cli


# ---------- analyze(): in-process ----------

def test_valid_expression_shows_tokens_tree_and_grouping(capsys):
    assert interactive.analyze("NOT A OR B AND C") is True
    out = capsys.readouterr().out
    assert "Tokens:" in out
    assert "NOT       'NOT'  (column 1)" in out
    assert "OR        'OR'  (column 7)" in out
    assert "Syntax tree:" in out
    assert "  expression" in out
    assert "Grouped: ((NOT A) OR (B AND C))" in out


def test_token_columns_are_one_based(capsys):
    interactive.analyze("A  AND B")
    out = capsys.readouterr().out
    assert "IDENT     'A'  (column 1)" in out
    assert "AND       'AND'  (column 4)" in out
    assert "IDENT     'B'  (column 8)" in out


def test_syntax_error_is_reported_without_a_tree(capsys):
    assert interactive.analyze("A OR") is False
    captured = capsys.readouterr()
    assert "Syntax error at line 1, column 5: found end of file" in captured.err
    assert "Syntax tree:" not in captured.out
    assert "Grouped:" not in captured.out


def test_lexical_error_is_reported_without_a_tree(capsys):
    assert interactive.analyze("A & B") is False
    captured = capsys.readouterr()
    assert "Lexical error at line 1, column 3: invalid character '&'" in captured.err
    assert "Syntax tree:" not in captured.out


def test_trailing_text_is_not_silently_ignored(capsys):
    assert interactive.analyze("A OR B C") is False
    assert "unexpected symbol 'C'" in capsys.readouterr().err


# ---------- one-shot mode: real subprocess ----------

def test_one_shot_valid_expression_exits_0():
    result = run_cli("interactive.py", "A AND (B OR C)")
    assert result.returncode == 0
    assert "Grouped: (A AND (B OR C))" in result.stdout
    assert result.stderr == ""


def test_one_shot_invalid_expression_exits_1():
    result = run_cli("interactive.py", "A OR")
    assert result.returncode == 1
    assert "Syntax error" in result.stderr


def test_too_many_arguments_exit_2():
    result = run_cli("interactive.py", "A", "B")
    assert result.returncode == 2
    assert "Usage" in result.stderr


# ---------- interactive session: input piped to stdin ----------

def test_session_analyzes_each_line_and_quits():
    result = run_cli("interactive.py", stdin="NOT A\nA OR B\n:quit\n")
    assert result.returncode == 0
    assert "Grouped: (NOT A)" in result.stdout
    assert "Grouped: (A OR B)" in result.stdout
    assert result.stdout.count("circuit> ") == 3


def test_session_continues_after_an_error():
    result = run_cli("interactive.py", stdin="A &\n(A OR B\nA AND B\n:q\n")
    assert result.returncode == 0
    assert "invalid character '&'" in result.stderr
    assert "missing ')'" in result.stderr
    assert "Grouped: (A AND B)" in result.stdout


def test_session_ignores_blank_lines():
    result = run_cli("interactive.py", stdin="\n   \nA\n:quit\n")
    assert result.returncode == 0
    assert result.stdout.count("Tokens:") == 1


def test_session_help_command():
    result = run_cli("interactive.py", stdin=":help\n:quit\n")
    assert "Operators, strongest first" in result.stdout


def test_session_ends_cleanly_on_end_of_input():
    result = run_cli("interactive.py", stdin="A\n")
    assert result.returncode == 0
    assert "Traceback" not in result.stderr


def test_session_treats_a_plain_word_as_an_expression_not_a_command():
    result = run_cli("interactive.py", stdin="quit\n:quit\n")
    assert "Grouped: quit" in result.stdout
