"""Builds the AST from the ANTLR parse tree using the generated visitor.

A visitor is the right pattern here because each method must return a value (the
node it built) to whoever called it: a parent node is made of its children's results.
"""
import generated_path  # noqa: F401  (puts generated/ on sys.path)

from CircuitVisitor import CircuitVisitor

from ast_nodes import (
    Assignment, BinaryOp, Constant, Declaration, Not, Program, Signal,
)


def _position(ctx):
    """Line and column (1-based) where a parse-tree node starts."""
    return ctx.start.line, ctx.start.column + 1


class AstBuilder(CircuitVisitor):
    # ----- program structure -----

    def visitProgram(self, ctx):
        line, column = _position(ctx)
        return Program(
            name=ctx.header().STRING().getText()[1:-1],
            statements=[self.visit(s) for s in ctx.statement()],
            line=line,
            column=column,
        )

    def visitExpression(self, ctx):
        return self.visit(ctx.expr())

    def visitStatement(self, ctx):
        child = ctx.declaration() if ctx.declaration() is not None else ctx.assignment()
        return self.visit(child)

    def visitDeclaration(self, ctx):
        line, column = _position(ctx)
        return Declaration(
            kind=ctx.start.text,
            signals=[self.visit(s) for s in ctx.signal()],
            line=line,
            column=column,
        )

    def visitAssignment(self, ctx):
        line, column = _position(ctx)
        delay = None
        if ctx.annotation() is not None:
            delay = float(ctx.annotation().REAL().getText())
        return Assignment(
            target=self.visit(ctx.signal()),
            expr=self.visit(ctx.expr()),
            delay=delay,
            line=line,
            column=column,
        )

    def visitSignal(self, ctx):
        line, column = _position(ctx)
        index = int(ctx.INT().getText()) if ctx.INT() is not None else None
        return Signal(name=ctx.IDENT().getText(), index=index, line=line, column=column)

    # ----- expressions (one method per labeled alternative) -----

    def visitNotExpr(self, ctx):
        line, column = _position(ctx)
        return Not(operand=self.visit(ctx.operand), line=line, column=column)

    def visitAndExpr(self, ctx):
        return self._binary(ctx)

    def visitOrExpr(self, ctx):
        return self._binary(ctx)

    def _binary(self, ctx):
        line, column = _position(ctx)
        return BinaryOp(
            op=ctx.op.text,
            left=self.visit(ctx.left),
            right=self.visit(ctx.right),
            line=line,
            column=column,
        )

    def visitParenExpr(self, ctx):
        # Parentheses only exist to group; the tree shape already says it.
        return self.visit(ctx.inner)

    def visitSignalExpr(self, ctx):
        return self.visit(ctx.signal())

    def visitConstExpr(self, ctx):
        line, column = _position(ctx)
        return Constant(value=int(ctx.INT().getText()), line=line, column=column)


def build_ast(tree):
    """Build the AST for a parse tree (a `program`, an `expression`, or any sub-tree)."""
    return AstBuilder().visit(tree)
