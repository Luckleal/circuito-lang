"""Puts generated/ (the ANTLR output) on sys.path.

Resolved from this file's location, not from the current directory, so the
programs work from anywhere. Import this module before importing CircuitLexer,
CircuitParser or CircuitVisitor.
"""
import os
import sys

GENERATED_DIR = os.path.normpath(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "generated")
)

if GENERATED_DIR not in sys.path:
    sys.path.insert(0, GENERATED_DIR)
