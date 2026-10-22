"""Shared paths and helpers for the test suite."""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
EXAMPLES = ROOT / "examples"

VALID_EXAMPLES = sorted(EXAMPLES.glob("*.circ"))
INVALID_LEXICAL_EXAMPLES = sorted((EXAMPLES / "invalid_lexical").glob("*.circ"))
INVALID_SYNTAX_EXAMPLES = sorted((EXAMPLES / "invalid_syntax").glob("*.circ"))


def run_cli(script, *args, cwd=None, stdin=None):
    """Run src/<script> as a real subprocess and return the CompletedProcess.

    stdin: text piped to the program's standard input (None = empty input).
    """
    return subprocess.run(
        [sys.executable, str(SRC / script), *map(str, args)],
        capture_output=True,
        text=True,
        encoding="utf-8",
        cwd=cwd or ROOT,
        input=stdin if stdin is not None else "",
    )
