"""Syntax error messages and recovery for the Circuit parser.

Messages: every syntax error is reported as `expected X, found Y`, built from the
offending token and the set of tokens the parser could accept there (not from
ANTLR's own text), so it always says where, what was expected and what was found.

Recovery ("panic mode"): after an error the parser discards tokens until a safe point
and restarts from there, instead of trying to carry on in the middle of a half-read
statement. Without this, one real error produces several "ghost" errors. The safe
points are tokens that only appear at the end or at the start of a statement:

  - `;`                          ends a statement
  - `input`, `output`, `wire`    start a declaration (only counted when an identifier follows)
  - end of file

Never `AND`, `OR`, `,` and the like: they appear in the middle of statements.
"""
import generated_path  # noqa: F401  (puts generated/ on sys.path)

from antlr4 import Token
from antlr4.atn.ATNState import ATNState
from antlr4.error.ErrorStrategy import DefaultErrorStrategy
from antlr4.error.Errors import InputMismatchException

from CircuitParser import CircuitParser as P

FRIENDLY_NAMES = {
    P.IDENT: "identifier",
    P.INT: "integer",
    P.REAL: "real number",
    P.STRING: "string",
    Token.EOF: "end of file",
}
EXPRESSION_START = {P.NOT, P.INT, P.IDENT, P.LPAREN}
STATEMENT_START = {P.INPUT, P.OUTPUT, P.WIRE, P.IDENT}
OPERATORS = {P.AND, P.NAND, P.OR, P.NOR, P.XOR, P.XNOR}
DECLARATION_KEYWORDS = {P.INPUT, P.OUTPUT, P.WIRE}
MAX_LISTED = 6


def token_display(token_type):
    """Readable name of a token type: 'identifier', ';', 'input', ..."""
    if token_type in FRIENDLY_NAMES:
        return FRIENDLY_NAMES[token_type]
    literal = P.literalNames[token_type] if token_type < len(P.literalNames) else None
    if literal and literal != "<INVALID>":
        return literal
    return P.symbolicNames[token_type]


def describe_expected(expected):
    """Describe a set of acceptable token types: 'an expression', "';' or '@'", ..."""
    types = set(expected)
    parts = []
    for group, name in (
        (EXPRESSION_START, "an expression"),
        (STATEMENT_START, "a statement"),
        (OPERATORS, "an operator"),
    ):
        if group <= types:
            parts.append(name)
            types -= group
    parts.extend(token_display(t) for t in sorted(types))
    if len(parts) > MAX_LISTED:
        parts = parts[:MAX_LISTED] + ["..."]
    if len(parts) <= 1:
        return "".join(parts)
    return ", ".join(parts[:-1]) + " or " + parts[-1]


def describe_found(token):
    return "end of file" if token.type == Token.EOF else f"'{token.text}'"


def syntax_message(expected, token):
    """The message every syntax error uses: where is added by the listener."""
    wanted = describe_expected(expected)
    if not wanted:
        return f"unexpected {describe_found(token)}"
    return f"expected {wanted}, found {describe_found(token)}"


def at_sync_point(stream):
    """True when the next token is a safe place to restart parsing."""
    token_type = stream.LA(1)
    if token_type in (P.SEMI, Token.EOF):
        return True
    # `input ;` is not the start of a declaration, so only count the keyword
    # when an identifier follows it.
    return token_type in DECLARATION_KEYWORDS and stream.LA(2) == P.IDENT


def skip_to_sync_point(recognizer):
    stream = recognizer.getTokenStream()
    while not at_sync_point(stream):
        recognizer.consume()


class CircuitErrorStrategy(DefaultErrorStrategy):
    # ----- reporting: our own messages -----

    def _report(self, recognizer, expected, token):
        recognizer.notifyErrorListeners(syntax_message(expected, token), token, None)

    def reportNoViableAlternative(self, recognizer, e):
        self._report(recognizer, e.getExpectedTokens(), e.offendingToken)

    def reportInputMismatch(self, recognizer, e):
        self._report(recognizer, e.getExpectedTokens(), e.offendingToken)

    def reportUnwantedToken(self, recognizer):
        if self.inErrorRecoveryMode(recognizer):
            return
        self.beginErrorCondition(recognizer)
        self._report(recognizer, recognizer.getExpectedTokens(), recognizer.getCurrentToken())

    def reportMissingToken(self, recognizer):
        if self.inErrorRecoveryMode(recognizer):
            return
        self.beginErrorCondition(recognizer)
        self._report(recognizer, recognizer.getExpectedTokens(), recognizer.getCurrentToken())

    # ----- recovery: panic mode -----

    def singleTokenDeletion(self, recognizer):
        """The default strategy may delete one "extra" token when the next one looks fine.
        A `;` (or a declaration keyword) is never extra: deleting it would glue the next
        statement onto the broken one and hide its own errors."""
        if at_sync_point(recognizer.getTokenStream()):
            return None
        return super().singleTokenDeletion(recognizer)

    def recover(self, recognizer, e):
        # Failsafe from the default strategy: if the same error repeats at the same
        # token and state, nothing was consumed, so consume one token to guarantee progress.
        if (
            self.lastErrorIndex == recognizer.getInputStream().index
            and self.lastErrorStates is not None
            and recognizer.state in self.lastErrorStates
        ):
            recognizer.consume()

        self.lastErrorIndex = recognizer._input.index
        if self.lastErrorStates is None:
            self.lastErrorStates = []
        self.lastErrorStates.append(recognizer.state)

        # The `;` is left in place: the rule that was interrupted (or a caller) matches it.
        skip_to_sync_point(recognizer)

    def sync(self, recognizer):
        """Same checks as the default strategy, with two differences, both about ghost errors:
        at the start of a choice it does not try to delete a "stray" token (the default
        guesses that the next token is fine, which swallows half of a broken construct and
        errors again right after); and inside a loop it resynchronizes at a statement
        boundary (the default stops at any token that could start a statement, including
        identifiers)."""
        if self.inErrorRecoveryMode(recognizer):
            return

        state = recognizer._interp.atn.states[recognizer.state]
        la = recognizer.getTokenStream().LA(1)
        next_tokens = recognizer.atn.nextTokens(state)
        if la in next_tokens or Token.EPSILON in next_tokens:
            return

        if state.stateType in (
            ATNState.BLOCK_START, ATNState.STAR_BLOCK_START,
            ATNState.PLUS_BLOCK_START, ATNState.STAR_LOOP_ENTRY,
        ):
            raise InputMismatchException(recognizer)

        if state.stateType in (ATNState.PLUS_LOOP_BACK, ATNState.STAR_LOOP_BACK):
            self.reportUnwantedToken(recognizer)
            skip_to_sync_point(recognizer)
            # Between statements no rule is waiting for this `;`: it ends the broken statement.
            if recognizer.getTokenStream().LA(1) == P.SEMI:
                recognizer.consume()
