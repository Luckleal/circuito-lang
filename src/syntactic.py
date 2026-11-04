#!/usr/bin/env python3
"""Syntactic analyzer (parser driver) for the Circuit language.

Usage: python src/syntactic.py [--ast] path/to/file.circ

Runs the lexer first; on lexical errors it reports them and stops (no parsing,
to avoid cascading false errors). Otherwise it parses from the `program` rule
and prints the indented syntax tree, or with --ast the abstract syntax tree.

Exit codes: 0 = no errors, 1 = lexical or syntax errors, 2 = usage error or unreadable file.
"""
import sys
from dataclasses import dataclass, field

# Importing lexical also puts generated/ on sys.path, which the imports below need.
from lexical import plural, read_source, token_name, tokenize

from antlr4 import CommonTokenStream, InputStream
from antlr4.error.ErrorListener import ErrorListener
from antlr4.tree.Tree import TerminalNode

from ast_builder import build_ast
from ast_nodes import format_ast
from error_strategy import CircuitErrorStrategy
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
    """Collects syntax errors; CircuitErrorStrategy already wrote the message."""

    def __init__(self, errors):
        super().__init__()
        self.errors = errors

    def syntaxError(self, recognizer, offendingSymbol, line, column, msg, e):
        self.errors.append(f"Syntax error at line {line}, column {column + 1}: {msg}")


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
    parser._errHandler = CircuitErrorStrategy()
    tree = getattr(parser, rule)()
    return ParseResult(tree=tree, parser=parser, syntax_errors=syntax_errors)


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

    args = argv[1:]
    show_ast = "--ast" in args
    paths = [a for a in args if a != "--ast"]
    if len(paths) != 1:
        print("Usage: python src/syntactic.py [--ast] path/to/file.circ", file=sys.stderr)
        return 2

    text = read_source(paths[0])
    if text is None:
        print(f"Error: could not open file '{paths[0]}'.", file=sys.stderr)
        return 2

    result = parse(text)

    if result.lexical_errors:
        for message in result.lexical_errors:
            print(message, file=sys.stderr)
        print(
            f"{plural(len(result.lexical_errors), 'lexical error')} found (syntactic analysis not run)",
            file=sys.stderr,
        )
        return 1

    if result.syntax_errors:
        for message in result.syntax_errors:
            print(message, file=sys.stderr)
        print(f"{plural(len(result.syntax_errors), 'syntax error')} found", file=sys.stderr)
        return 1

    if show_ast:
        print("\n".join(format_ast(build_ast(result.tree))))
    else:
        print("\n".join(format_tree(result.tree, result.parser)))
    print("Syntactic analysis completed with no errors")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
