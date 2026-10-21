#!/usr/bin/env python3
"""Lexical analyzer for the Circuit language.

Usage: python src/lexical.py path/to/file.circ

Exit codes: 0 = no errors, 1 = lexical errors, 2 = usage error or unreadable file.
"""
import os
import sys

# Resolve generated/ from this file's location, not the current directory,
# so the script works from anywhere.
SRC_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(SRC_DIR, "..", "generated"))

from antlr4 import InputStream, Token
from antlr4.error.ErrorListener import ErrorListener

from CircuitLexer import CircuitLexer


class InvalidCharacterListener(ErrorListener):
    """Replaces the default lexer listener: records invalid characters."""

    def __init__(self, errors):
        super().__init__()
        self.errors = errors

    def syntaxError(self, recognizer, offendingSymbol, line, column, msg, e):
        start, end = msg.find("'"), msg.rfind("'")
        char = msg[start + 1:end] if start != -1 and end > start else msg
        self.errors.append(
            f"Lexical error at line {line}, column {column + 1}: invalid character '{char}'"
        )


def tokenize(text):
    """Return (tokens, errors) for a program text.

    tokens: recognized tokens only (error tokens are excluded).
    errors: messages in order of appearance; columns are 1-based.
    """
    errors = []
    lexer = CircuitLexer(InputStream(text))
    lexer.removeErrorListeners()
    lexer.addErrorListener(InvalidCharacterListener(errors))

    tokens = []
    while True:
        token = lexer.nextToken()
        if token.type == Token.EOF:
            break
        if token.type == CircuitLexer.MALFORMED_REAL:
            errors.append(
                f"Lexical error at line {token.line}, column {token.column + 1}: "
                f"malformed real number '{token.text}' (missing digit after the decimal point)"
            )
        elif token.type == CircuitLexer.UNCLOSED_STRING:
            errors.append(
                f"Lexical error at line {token.line}, column {token.column + 1}: "
                f"unclosed string (missing closing quote)"
            )
        else:
            tokens.append(token)
    return tokens, errors


def token_name(token):
    return CircuitLexer.symbolicNames[token.type]


def format_token(token):
    return f"{token_name(token)} '{token.text}' line {token.line}"


def read_source(path):
    """Read a source file as UTF-8 text; return None if it cannot be opened."""
    try:
        with open(path, encoding="utf-8") as f:
            return f.read()
    except OSError:
        return None


def main(argv):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

    if len(argv) != 2:
        print("Usage: python src/lexical.py path/to/file.circ", file=sys.stderr)
        return 2

    text = read_source(argv[1])
    if text is None:
        print(f"Error: could not open file '{argv[1]}'.", file=sys.stderr)
        return 2

    tokens, errors = tokenize(text)
    for token in tokens:
        print(format_token(token))
    print(f"{len(tokens)} tokens recognized")

    for message in errors:
        print(message, file=sys.stderr)
    if errors:
        print(f"{len(errors)} lexical errors found", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
