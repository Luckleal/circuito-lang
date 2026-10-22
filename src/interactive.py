#!/usr/bin/env python3
"""Interactive expression analyzer for the Circuit language.

Usage:
  python src/interactive.py              prompt for expressions until you type :quit
  python src/interactive.py "NOT A OR B" analyze one expression and exit

For each expression it shows the tokens, then either the syntax tree and the fully
parenthesized grouping, or the lexical/syntax errors with line and column.

One-shot exit codes: 0 = valid expression, 1 = errors found, 2 = usage error.
"""
import sys

from lexical import token_name, tokenize
from syntactic import format_tree, parenthesize, parse

PROMPT = "circuit> "
BANNER = "Circuit expression analyzer. Type an expression (e.g. NOT A OR B AND C), :help for help, :quit to exit."
HELP = """\
Type a boolean expression and press Enter. Examples:
  NOT A OR B AND C
  (data[0] OR data[1]) AND NOT data[3]
  A XOR 1
Operators, strongest first: NOT, then AND/NAND, then OR/NOR/XOR/XNOR.
Commands:
  :help   show this help
  :quit   leave (also :q, Ctrl+D or Ctrl+C)"""


def analyze(text):
    """Analyze one expression, print the result, and return True if it is valid."""
    tokens, _ = tokenize(text)
    print("Tokens:")
    for token in tokens:
        print(f"  {token_name(token):<9} '{token.text}'  (column {token.column + 1})")

    result = parse(text, rule="expression")

    sys.stdout.flush()
    for message in result.lexical_errors + result.syntax_errors:
        print(message, file=sys.stderr)
    if not result.ok:
        return False

    print("Syntax tree:")
    for line in format_tree(result.tree, result.parser):
        print(f"  {line}")
    print(f"Grouped: {parenthesize(result.tree.expr())}")
    return True


def repl():
    print(BANNER)
    while True:
        try:
            line = input(PROMPT)
        except (EOFError, KeyboardInterrupt):
            print()
            return
        line = line.strip()
        if not line:
            continue
        if line in (":q", ":quit"):
            return
        if line == ":help":
            print(HELP)
            continue
        analyze(line)
        print()


def main(argv):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

    if len(argv) == 1:
        repl()
        return 0
    if len(argv) == 2:
        return 0 if analyze(argv[1]) else 1
    print('Usage: python src/interactive.py ["expression"]', file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
