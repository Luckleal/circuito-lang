#!/usr/bin/env python3
"""Semantic analysis for the Circuit language.

Usage: python src/semantic.py path/to/file.circ

Runs the lexer and the parser first (stopping on any lexical or syntax error),
builds the AST and then checks the rules the grammar cannot express: declarations,
types, drivers and combinational loops. Every problem found is reported, in source
order, with line and column. Warnings do not make the analysis fail.

Exit codes: 0 = no semantic errors, 1 = errors found (lexical, syntax or semantic),
2 = usage error or unreadable file.
"""
import sys
from dataclasses import dataclass, field
from typing import Dict, List, Optional

from ast_builder import build_ast
from ast_nodes import Assignment, BinaryOp, Constant, Declaration, Not, Signal
from lexical import read_source
from syntactic import parse


@dataclass(frozen=True)
class Diagnostic:
    severity: str  # "error" or "warning"
    line: int
    column: int
    message: str

    def __str__(self):
        return f"Semantic {self.severity} at line {self.line}, column {self.column}: {self.message}"


@dataclass
class Symbol:
    name: str
    kind: str  # "input", "output" or "wire"
    width: Optional[int]  # None for a single bit, the number of bits for a bus
    line: int
    column: int

    @property
    def is_bus(self):
        return self.width is not None

    @property
    def type_name(self):
        return f"bus[{self.width}]" if self.is_bus else "bit"

    def bits(self):
        """The addressable bits: (name, index) for a bus, (name, None) for a single bit."""
        if self.is_bus:
            return [(self.name, i) for i in range(self.width)]
        return [(self.name, None)]


@dataclass
class SemanticResult:
    symbols: Dict[str, Symbol] = field(default_factory=dict)
    errors: List[Diagnostic] = field(default_factory=list)
    warnings: List[Diagnostic] = field(default_factory=list)

    @property
    def ok(self):
        return not self.errors


def bit_label(bit):
    name, index = bit
    return name if index is None else f"{name}[{index}]"


class Analyzer:
    """Walks the AST once for declarations, uses and assignments, then checks the whole circuit."""

    def __init__(self, program):
        self.program = program
        self.symbols = {}
        self.errors = []
        self.warnings = []
        self.invalid_names = set()      # declared with an error: later uses are not reported again
        self.first_declaration = {}     # name -> (line, column) of its first declaration, anywhere
        self.assigned_at = {}           # bit -> (line, column) of the assignment that drives it
        self.read_at = {}               # bit -> (line, column) of its first read
        self.read_names = set()         # names used in an expression, even if the use had an error
        self.depends_on = {}            # driven bit -> bits read by its expression

    # ---------- entry point ----------

    def run(self):
        for statement in self.program.statements:
            if isinstance(statement, Declaration):
                for signal in statement.signals:
                    self.first_declaration.setdefault(signal.name, (signal.line, signal.column))

        for statement in self.program.statements:
            if isinstance(statement, Declaration):
                self._declaration(statement)
            else:
                self._assignment(statement)

        self._check_drivers()
        self._check_loops()
        self._check_usage()

        key = lambda d: (d.line, d.column)
        return SemanticResult(
            symbols=self.symbols,
            errors=sorted(self.errors, key=key),
            warnings=sorted(self.warnings, key=key),
        )

    def _error(self, node, message):
        self.errors.append(Diagnostic("error", node.line, node.column, message))

    def _warning(self, node, message):
        self.warnings.append(Diagnostic("warning", node.line, node.column, message))

    # ---------- declarations ----------

    def _declaration(self, declaration):
        for signal in declaration.signals:
            if signal.index is not None and signal.index < 1:
                self._error(signal, f"bus width must be at least 1 (got {signal.index})")
                self.invalid_names.add(signal.name)
                continue
            if signal.name in self.symbols:
                first = self.symbols[signal.name]
                self._error(signal, f"'{signal.name}' is already declared (first declared at line {first.line})")
                continue
            self.symbols[signal.name] = Symbol(
                signal.name, declaration.kind, signal.index, signal.line, signal.column
            )

    # ---------- uses ----------

    def _resolve(self, signal):
        """Check one use of a signal and return the bit it refers to, or None after reporting."""
        name = signal.name
        symbol = self.symbols.get(name)
        if symbol is None:
            if name in self.invalid_names:
                return None
            if name in self.first_declaration:
                line = self.first_declaration[name][0]
                self._error(signal, f"'{name}' is used before its declaration (declared at line {line})")
            else:
                self._error(signal, f"'{name}' is not declared")
            return None

        if symbol.is_bus:
            last = symbol.width - 1
            if signal.index is None:
                self._error(
                    signal,
                    f"bus '{name}' cannot be used as a single bit; use {name}[0]"
                    + (f" to {name}[{last}]" if last > 0 else ""),
                )
                return None
            if not 0 <= signal.index <= last:
                self._error(
                    signal,
                    f"index {signal.index} is out of range for bus '{name}' "
                    f"(valid indices: 0 to {last})",
                )
                return None
            return (name, signal.index)

        if signal.index is not None:
            self._error(signal, f"'{name}' is not a bus and cannot be indexed")
            return None
        return (name, None)

    def _assignment(self, assignment):
        target = self._resolve(assignment.target)
        driven = None
        if target is not None:
            symbol = self.symbols[assignment.target.name]
            label = bit_label(target)
            if symbol.kind == "input":
                self._error(
                    assignment.target,
                    f"cannot assign to input '{label}' (inputs are driven from outside the circuit)",
                )
            elif target in self.assigned_at:
                self._error(
                    assignment.target,
                    f"'{label}' is assigned more than once "
                    f"(first assigned at line {self.assigned_at[target][0]})",
                )
            else:
                self.assigned_at[target] = (assignment.target.line, assignment.target.column)
                driven = target

        dependencies = set()
        self._expression(assignment.expr, dependencies)
        if driven is not None:
            self.depends_on[driven] = dependencies

    def _expression(self, expr, dependencies):
        """Check an expression. Every gate produces a bit, so the only type rule is that
        each operand is a bit: a whole bus, or an out-of-range index, is rejected at its leaf."""
        if isinstance(expr, Signal):
            self.read_names.add(expr.name)
            bit = self._resolve(expr)
            if bit is not None:
                self.read_at.setdefault(bit, (expr.line, expr.column))
                dependencies.add(bit)
        elif isinstance(expr, Constant):
            if expr.value not in (0, 1):
                self._error(expr, f"constant {expr.value} is not valid; only 0 and 1 are allowed")
        elif isinstance(expr, Not):
            self._expression(expr.operand, dependencies)
        elif isinstance(expr, BinaryOp):
            self._expression(expr.left, dependencies)
            self._expression(expr.right, dependencies)

    # ---------- whole-circuit checks ----------

    def _check_drivers(self):
        """Every output bit, and every wire bit that is read, must be assigned."""
        for symbol in self.symbols.values():
            if symbol.kind == "input":
                continue
            for bit in symbol.bits():
                if bit in self.assigned_at:
                    continue
                if symbol.kind == "output":
                    self._error(symbol, f"output '{bit_label(bit)}' is never assigned")
                elif bit in self.read_at:
                    line, column = self.read_at[bit]
                    self.errors.append(Diagnostic(
                        "error", line, column,
                        f"wire '{bit_label(bit)}' is read but never assigned",
                    ))

    def _check_loops(self):
        """A combinational circuit must not feed a signal back into itself."""
        WHITE, GRAY, BLACK = 0, 1, 2
        color = {bit: WHITE for bit in self.depends_on}
        reported = set()

        def visit(bit, path):
            color[bit] = GRAY
            path.append(bit)
            for dependency in sorted(self.depends_on[bit], key=lambda b: self.assigned_at.get(b, (0, 0))):
                if dependency not in self.depends_on:
                    continue
                if color[dependency] == GRAY:
                    cycle = path[path.index(dependency):]
                    if frozenset(cycle) not in reported:
                        reported.add(frozenset(cycle))
                        self._report_loop(cycle)
                elif color[dependency] == WHITE:
                    visit(dependency, path)
            path.pop()
            color[bit] = BLACK

        for bit in sorted(self.depends_on, key=lambda b: self.assigned_at[b]):
            if color[bit] == WHITE:
                visit(bit, [])

    def _report_loop(self, cycle):
        start = min(range(len(cycle)), key=lambda i: self.assigned_at[cycle[i]])
        ordered = cycle[start:] + cycle[:start]
        line, column = self.assigned_at[ordered[0]]
        route = " -> ".join(bit_label(b) for b in ordered + [ordered[0]])
        self.errors.append(Diagnostic("error", line, column, f"combinational loop: {route}"))

    def _check_usage(self):
        """Warnings: signals that exist but do nothing."""
        for symbol in self.symbols.values():
            if symbol.kind == "output":
                continue
            bits = symbol.bits()
            if symbol.name in self.read_names:
                continue
            if symbol.kind == "input":
                self._warning(symbol, f"input '{symbol.name}' is never used")
            elif any(bit in self.assigned_at for bit in bits):
                self._warning(symbol, f"wire '{symbol.name}' is assigned but never used")
            else:
                self._warning(symbol, f"wire '{symbol.name}' is declared but never used")


def analyze(program):
    """Run the semantic analysis over an AST (a `Program`) and return a SemanticResult."""
    return Analyzer(program).run()


# ---------- reports ----------

def format_equation(assignment):
    """One assignment with every operation parenthesized: 'S = ((NOT A) OR (B AND C))'."""
    line = f"{assignment.target.text()} = {assignment.expr.parenthesized()}"
    if assignment.delay is not None:
        line += f"  @delay {assignment.delay}"
    return line


def format_symbol_table(symbols):
    rows = [(s.name, s.kind, s.type_name) for s in symbols.values()]
    name_width = max((len(r[0]) for r in rows), default=0)
    kind_width = max((len(r[1]) for r in rows), default=0)
    return [f"  {n:<{name_width}}  {k:<{kind_width}}  {t}" for n, k, t in rows]


def main(argv):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

    if len(argv) != 2:
        print("Usage: python src/semantic.py path/to/file.circ", file=sys.stderr)
        return 2

    text = read_source(argv[1])
    if text is None:
        print(f"Error: could not open file '{argv[1]}'.", file=sys.stderr)
        return 2

    parsed = parse(text)
    if parsed.lexical_errors or parsed.syntax_errors:
        kind = "lexical" if parsed.lexical_errors else "syntax"
        messages = parsed.lexical_errors or parsed.syntax_errors
        for message in messages:
            print(message, file=sys.stderr)
        print(f"{len(messages)} {kind} errors found (semantic analysis not run)", file=sys.stderr)
        return 1

    program = build_ast(parsed.tree)
    result = analyze(program)

    diagnostics = sorted(result.errors + result.warnings, key=lambda d: (d.line, d.column))
    for diagnostic in diagnostics:
        print(diagnostic, file=sys.stderr)

    if result.errors:
        print(
            f"{len(result.errors)} semantic errors found ({len(result.warnings)} warnings)",
            file=sys.stderr,
        )
        return 1

    print("Symbol table:")
    print("\n".join(format_symbol_table(result.symbols)))
    print("Equations:")
    for statement in program.statements:
        if isinstance(statement, Assignment):
            print(f"  {format_equation(statement)}")
    summary = "Semantic analysis completed with no errors"
    if result.warnings:
        summary += f" ({len(result.warnings)} warnings)"
    print(summary)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
