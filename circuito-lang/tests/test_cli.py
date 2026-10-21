"""End-to-end tests: the analyzers run as real command-line programs."""
import re

import pytest

from helpers import EXAMPLES, run_cli

HALF_ADDER = EXAMPLES / "half_adder.circ"
TOKEN_LINE = re.compile(r"^[A-Z_]+ '.*' line \d+$")


@pytest.fixture
def source(tmp_path):
    """Write a program to a temp file and return its path."""
    def write(text, name="prog.circ", newline=None):
        path = tmp_path / name
        with open(path, "w", encoding="utf-8", newline=newline) as f:
            f.write(text)
        return path
    return write


# ---------- lexical analyzer ----------

def test_lexical_valid_file_output_format():
    result = run_cli("lexical.py", HALF_ADDER)
    assert result.returncode == 0
    lines = result.stdout.splitlines()
    assert lines[0] == "CIRCUIT 'circuit' line 2"
    assert lines[1] == "STRING '\"half adder\"' line 2"
    assert lines[-1] == "25 tokens recognized"
    assert all(TOKEN_LINE.match(line) for line in lines[:-1])
    assert result.stderr == ""


def test_lexical_errors_go_to_stderr_with_exit_code_1():
    bad = EXAMPLES / "invalid_lexical" / "invalid_character.circ"
    result = run_cli("lexical.py", bad)
    assert result.returncode == 1
    assert "Lexical error at line 4, column 7: invalid character '&'" in result.stderr
    assert "1 lexical errors found" in result.stderr
    assert "Lexical error" not in result.stdout


def test_lexical_still_reports_recognized_count_when_there_are_errors():
    bad = EXAMPLES / "invalid_lexical" / "invalid_character.circ"
    result = run_cli("lexical.py", bad)
    assert result.stdout.splitlines()[-1] == "16 tokens recognized"


def test_lexical_reports_every_error_in_the_file(source):
    path = source('circuit "x;\ninput A & B;\noutput S;\nS = A @delay 2.;\n')
    result = run_cli("lexical.py", path)
    assert result.returncode == 1
    assert result.stderr.count("Lexical error") == 3
    assert "3 lexical errors found" in result.stderr


def test_lexical_missing_file_exits_2_without_traceback():
    result = run_cli("lexical.py", EXAMPLES / "does_not_exist.circ")
    assert result.returncode == 2
    assert "could not open file" in result.stderr
    assert "Traceback" not in result.stderr


@pytest.mark.parametrize("args", [[], ["a.circ", "b.circ"]])
def test_lexical_usage_error_exits_2(args):
    result = run_cli("lexical.py", *args)
    assert result.returncode == 2
    assert "Usage" in result.stderr
    assert "Traceback" not in result.stderr


def test_lexical_works_from_any_working_directory(tmp_path):
    result = run_cli("lexical.py", HALF_ADDER, cwd=tmp_path)
    assert result.returncode == 0
    assert result.stdout.splitlines()[-1] == "25 tokens recognized"


def test_lexical_handles_windows_line_endings(source):
    path = source("circuit \"x\";\r\ninput A;\r\noutput S;\r\nS = A # B;\r\n", newline="")
    result = run_cli("lexical.py", path)
    assert result.returncode == 1
    assert "line 4, column 7: invalid character '#'" in result.stderr


def test_lexical_non_ascii_characters_do_not_crash(source):
    path = source('circuit "café";\n// ação\ninput A é B;\n')
    result = run_cli("lexical.py", path)
    assert result.returncode == 1
    assert "invalid character 'é'" in result.stderr
    assert "Traceback" not in result.stderr


# ---------- syntactic analyzer ----------

def test_syntactic_valid_file_prints_the_tree():
    result = run_cli("syntactic.py", HALF_ADDER)
    assert result.returncode == 0
    lines = result.stdout.splitlines()
    assert lines[0] == "program"
    assert lines[-1] == "Syntactic analysis completed with no errors"
    assert result.stderr == ""


def test_syntactic_error_goes_to_stderr_with_exit_code_1():
    bad = EXAMPLES / "invalid_syntax" / "missing_semicolon.circ"
    result = run_cli("syntactic.py", bad)
    assert result.returncode == 1
    assert "Syntax error at line 5, column 1: found end of file" in result.stderr
    assert "1 syntax errors found" in result.stderr
    assert "completed" not in result.stdout


def test_syntactic_stops_at_lexical_errors():
    bad = EXAMPLES / "invalid_lexical" / "invalid_character.circ"
    result = run_cli("syntactic.py", bad)
    assert result.returncode == 1
    assert "Lexical error at line 4, column 7" in result.stderr
    assert "syntactic analysis not run" in result.stderr
    assert "Syntax error" not in result.stderr


def test_syntactic_missing_file_exits_2_without_traceback():
    result = run_cli("syntactic.py", EXAMPLES / "does_not_exist.circ")
    assert result.returncode == 2
    assert "could not open file" in result.stderr
    assert "Traceback" not in result.stderr


def test_syntactic_usage_error_exits_2():
    result = run_cli("syntactic.py")
    assert result.returncode == 2
    assert "Usage" in result.stderr


def test_syntactic_works_from_any_working_directory(tmp_path):
    result = run_cli("syntactic.py", HALF_ADDER, cwd=tmp_path)
    assert result.returncode == 0
