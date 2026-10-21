import pytest

from helpers import ROOT


def pytest_sessionstart(session):
    if not (ROOT / "generated" / "CircuitLexer.py").exists():
        pytest.exit(
            "generated/ not found: run `bash generate.sh` before running the tests.",
            returncode=2,
        )
