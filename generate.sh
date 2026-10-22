#!/usr/bin/env bash
# Regenerates the lexer and the parser from the grammar.
# -Xexact-output-dir keeps ANTLR from creating generated/grammar/... instead of generated/
# -visitor also generates CircuitVisitor.py (useful for the semantic analysis stage)
cd "$(dirname "${BASH_SOURCE[0]}")" || exit 1
rm -rf generated
antlr4 -v 4.13.2 -Dlanguage=Python3 -visitor -encoding UTF-8 -Xexact-output-dir -o generated grammar/Circuit.g4
