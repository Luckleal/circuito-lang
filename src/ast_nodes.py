"""Abstract syntax tree (AST) of the Circuit language.

The parse tree records how the parser derived the program (rules such as `expr`,
`statement`, parentheses, commas). The AST keeps only what the program means.
Every node carries the line and column (both 1-based) where it starts, which the
semantic analysis needs to report errors.
"""
from dataclasses import dataclass, field
from typing import List, Optional, Union


@dataclass
class Signal:
    """A signal name; `index` is the bus width in a declaration and the position in a use."""
    name: str
    index: Optional[int] = None
    line: int = 0
    column: int = 0

    def children(self):
        return []

    def text(self):
        return self.name + (f"[{self.index}]" if self.index is not None else "")

    def label(self):
        return f"Signal {self.text()}"

    def parenthesized(self):
        return self.text()


@dataclass
class Constant:
    value: int
    line: int = 0
    column: int = 0

    def children(self):
        return []

    def label(self):
        return f"Constant {self.value}"

    def parenthesized(self):
        return str(self.value)


@dataclass
class Not:
    operand: "Expr"
    line: int = 0
    column: int = 0

    def children(self):
        return [self.operand]

    def label(self):
        return "Not"

    def parenthesized(self):
        return f"(NOT {self.operand.parenthesized()})"


@dataclass
class BinaryOp:
    op: str
    left: "Expr"
    right: "Expr"
    line: int = 0
    column: int = 0

    def children(self):
        return [self.left, self.right]

    def label(self):
        return f"BinaryOp {self.op}"

    def parenthesized(self):
        return f"({self.left.parenthesized()} {self.op} {self.right.parenthesized()})"


Expr = Union[Signal, Constant, Not, BinaryOp]


@dataclass
class Declaration:
    kind: str  # 'input', 'output' or 'wire'
    signals: List[Signal] = field(default_factory=list)
    line: int = 0
    column: int = 0

    def children(self):
        return list(self.signals)

    def label(self):
        return f"Declaration {self.kind}"


@dataclass
class Assignment:
    target: Signal
    expr: Expr
    delay: Optional[float] = None
    line: int = 0
    column: int = 0

    def children(self):
        return [self.target, self.expr]

    def label(self):
        return "Assignment" + (f" @delay {self.delay}" if self.delay is not None else "")


@dataclass
class Program:
    name: str
    statements: list = field(default_factory=list)
    line: int = 0
    column: int = 0

    def children(self):
        return list(self.statements)

    def label(self):
        return f'Program "{self.name}"'


def walk(node):
    """Yield the node and all its descendants, depth first, in source order."""
    yield node
    for child in node.children():
        yield from walk(child)


def format_ast(node, level=0):
    """Return the AST as indented lines, one node per line."""
    lines = ["  " * level + node.label()]
    for child in node.children():
        lines.extend(format_ast(child, level + 1))
    return lines
