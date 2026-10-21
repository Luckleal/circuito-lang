#!/usr/bin/env python3
"""Syntactic analyzer (parser driver) for the Circuit language.

Usage: python src/syntactic.py path/to/file.circ

Runs the lexer first; on lexical errors it reports them and stops (no parsing,
to avoid cascading false errors). Otherwise it parses from the `program` rule
and prints the indented syntax tree.

Exit codes: 0 = no errors, 1 = lexical or syntax errors, 2 = usage error or unreadable file.
"""
import re
import sys
from dataclasses import dataclass, field

# Importing lexical also puts generated/ on sys.path, which the imports below need.
from lexical import read_source, token_name, tokenize

from antlr4 import CommonTokenStream, InputStream
from antlr4.error.ErrorListener import ErrorListener
from antlr4.tree.Tree import TerminalNode

from CircuitLexer import CircuitLexer
from CircuitParser import CircuitParser


@dataclass
class ParseResult:
    tree: object = None
    parser: object = None
    lexical_errors: list = field(default_factory=list)
    syntax_errors: list = field(default_factory=list)

    @property
    def ok(self):
        return not self.lexical_errors and not self.syntax_errors


class SyntaxErrorCollector(ErrorListener):
    def __init__(self, errors):
        super().__init__()
        self.errors = errors

    def syntaxError(self, recognizer, offendingSymbol, line, column, msg, e):
        self.errors.append(
            f"Syntax error at line {line}, column {column + 1}: {translate(msg)}"
        )


def translate(msg):
    """Rephrase an ANTLR error message in the project's wording."""
    msg = msg.replace("'<EOF>'", "end of file").replace("<EOF>", "end of file")
    m = re.match(r"mismatched input (.+) expecting (.+)$", msg)
    if m:
        return f"found {m.group(1)}, expected {m.group(2)}"
    m = re.match(r"extraneous input (.+) expecting (.+)$", msg)
    if m:
        return f"unexpected symbol {m.group(1)}, expected {m.group(2)}"
    m = re.match(r"missing (.+) at (.+)$", msg)
    if m:
        return f"missing {m.group(1)} before {m.group(2)}"
    m = re.match(r"no viable alternative at input (.+)$", msg)
    if m:
        return f"invalid construct near {m.group(1)}"
    return msg


def parse(text, rule="program"):
    """Parse a text from the given start rule (default `program`) and return a ParseResult."""
    _, lexical_errors = tokenize(text)
    if lexical_errors:
        return ParseResult(lexical_errors=lexical_errors)

    lexer = CircuitLexer(InputStream(text))
    lexer.removeErrorListeners()
    parser = CircuitParser(CommonTokenStream(lexer))
    syntax_errors = []
    parser.removeErrorListeners()
    parser.addErrorListener(SyntaxErrorCollector(syntax_errors))
    tree = getattr(parser, rule)()
    return ParseResult(tree=tree, parser=parser, syntax_errors=syntax_errors)


def parenthesize(expr):
    """Fully parenthesized form of an `expr` tree, e.g. '((NOT A) OR (B AND C))'.

    Makes the precedence and associativity chosen by the parser visible.
    """
    if expr.NOT():
        return f"(NOT {parenthesize(expr.expr(0))})"
    if expr.LPAREN():
        return parenthesize(expr.expr(0))
    if expr.signal():
        return expr.signal().getText()
    if expr.INT():
        return expr.INT().getText()
    return f"({parenthesize(expr.expr(0))} {expr.getChild(1).getText()} {parenthesize(expr.expr(1))})"


def format_tree(node, parser, level=0):
    """Return the syntax tree as indented lines (rules are inner nodes, tokens are leaves)."""
    indent = "  " * level
    if isinstance(node, TerminalNode):
        token = node.symbol
        if token.type == -1:
            return []
        return [f"{indent}{token_name(token)} '{token.text}'"]
    lines = [f"{indent}{parser.ruleNames[node.getRuleIndex()]}"]
    for child in node.getChildren():
        lines.extend(format_tree(child, parser, level + 1))
    return lines


def main(argv):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

    if len(argv) != 2:
        print("Usage: python src/syntactic.py path/to/file.circ", file=sys.stderr)
        return 2

    text = read_source(argv[1])
    if text is None:
        print(f"Error: could not open file '{argv[1]}'.", file=sys.stderr)
        return 2

    result = parse(text)

    if result.lexical_errors:
        for message in result.lexical_errors:
            print(message, file=sys.stderr)
        print(
            f"{len(result.lexical_errors)} lexical errors found (syntactic analysis not run)",
            file=sys.stderr,
        )
        return 1

    if result.syntax_errors:
        for message in result.syntax_errors:
            print(message, file=sys.stderr)
        print(f"{len(result.syntax_errors)} syntax errors found", file=sys.stderr)
        return 1

    print("\n".join(format_tree(result.tree, result.parser)))
    print("Syntactic analysis completed with no errors")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
