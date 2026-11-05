# Circuit language specification

## 1. Purpose

The Circuit language describes combinational logic circuits: it declares inputs, outputs and the boolean equations that connect signals through logic gates. It serves to specify a circuit in a textual, verifiable form, as a basis for simulating it later.

## 2. Example program, line by line

```
// half adder: adds two bits
circuit "half adder";

input A, B;
output sum, carry;

sum = A XOR B;
carry = A AND B;
```

- `// half adder: adds two bits` — a line comment, discarded by the analyzer; documents the circuit's purpose.
- `circuit "half adder";` — names the circuit; the name is a string literal.
- (blank line, ignored)
- `input A, B;` — declares the external input signals `A` and `B`, each one a bit.
- `output sum, carry;` — declares the external output signals `sum` and `carry`.
- (blank line, ignored)
- `sum = A XOR B;` — connects `sum` to the output of an XOR gate between `A` and `B` (the sum without the carry).
- `carry = A AND B;` — connects `carry` to the output of an AND gate between `A` and `B` (the carry of the addition).

## 3. Data types

- `bit`: a logic value, 0 or 1.
- `bus`: a vector of bits, declared with its width in brackets (`data[4]`) and accessed by index (`data[0]`).
- Supporting literals: integer (bus width and index, constants 0 and 1), real (propagation delay in nanoseconds, in the `@delay` annotation) and string (the circuit name).

## 4. Commands

Every statement ends with `;`.

- `circuit "name";` names the circuit.
- `input a, b;` and `output s;` declare external signals.
- `wire t;` declares an internal signal.
- `signal = expression;` connects a signal to a gate expression.
- `@delay <real>` is an optional annotation, placed before the `;`.

## 5. Operators and precedence

From highest to lowest:

1. `NOT` (unary)
2. `AND`, `NAND`
3. `OR`, `NOR`, `XOR`, `XNOR`

Binary operators are left-associative, and parentheses change the order. `NAND` is the negated AND and `NOR` the negated OR. Other symbols: `=` (connection), `[ ]` (bus index), `@` (annotation), `,` (list separator), `;` (end of statement).

Note: precedence is a design decision, enforced by the parser: the order of the alternatives of the `expr` rule in `grammar/Circuit.g4` implements this table. For example, `NOT A OR B AND C` is read as `(NOT A) OR (B AND C)`.

## 6. Comments

Line comments, starting with `//` and running to the end of the line. They are discarded by the analyzer.

## 7. Three things the language deliberately does not do

- It does not describe sequential circuits: there is no memory, flip-flops, clock or state, only combinational logic.
- It does not allow gate names or keywords (`AND`, `OR`, `NOT`, `input`...) as signal names, because they are reserved.
- It has no loops, conditionals, subroutines or arithmetic. It describes a static circuit; it is not a general-purpose language.

## 8. Syntactic grammar

Parser rules in `grammar/Circuit.g4` (EBNF: `*` zero or more, `?` optional, `|` alternative):

```
program     : header statement* EOF
expression  : expr EOF                    (a lone expression, used by the interactive analyzer)
header      : 'circuit' STRING ';'
statement   : declaration | assignment
declaration : ('input' | 'output' | 'wire') signal (',' signal)* ';'
assignment  : signal '=' expr annotation? ';'
annotation  : '@' 'delay' REAL
signal      : IDENT ('[' INT ']')?
expr        : 'NOT' expr
            | expr ('AND' | 'NAND') expr
            | expr ('OR' | 'NOR' | 'XOR' | 'XNOR') expr
            | '(' expr ')'
            | signal
            | INT
```

Design decisions:

- Declarations and assignments may appear in any order after the header. The "declare before use" rule is checked in the semantic analysis stage, not by the parser.
- Constants in expressions are `INT`; the restriction to `0` and `1` is also left to the semantic analysis.
- `@delay` accepts only a real number (`3.0`, not `3`).
- The start rule ends with `EOF`, so no trailing text after the last statement is silently ignored.

## 9. Error reporting

All positions are 1-based (line and column). Messages go to the standard error stream.

| Stage | Error | Message |
| --- | --- | --- |
| Lexical | character outside the language | `Lexical error at line 4, column 7: invalid character '&'` |
| Lexical | real number without digits after the point | `Lexical error at line 4, column 20: malformed real number '2.' (missing digit after the decimal point)` |
| Lexical | string without the closing quote | `Lexical error at line 1, column 9: unclosed string (missing closing quote)` |
| Syntactic | tokens in the wrong order | `Syntax error at line 5, column 1: expected '@' or ';', found end of file` |

Every syntax error says where (line and column), what was expected and what was found, as `expected X, found Y`, using readable names (`an expression`, `identifier`, `';'`).

**Recovery.** After a syntax error the parser discards tokens up to a safe point and restarts from there, so one mistake gives one message and every real mistake in the file is reported. The safe points are `;`, the end of the file, and `input`, `output` or `wire` when an identifier follows (the start of a declaration). Tokens that appear in the middle of a statement (`AND`, `OR`, `,`, identifiers) are never safe points, and a `;` is never discarded as a stray token.

Exit codes of both analyzers: `0` no errors, `1` errors found, `2` usage error or unreadable file. If there are lexical errors, the syntactic analyzer reports them and does not parse.

## 10. Abstract syntax tree

The parser's result is turned into an abstract syntax tree (AST) by a visitor (`src/ast_builder.py`). The AST drops the grammar scaffolding (rule names such as `statement` and `expr`, parentheses, commas, semicolons) and keeps only what the program means. Every node records the line and column (1-based) where it starts.

| Node | Fields |
|---|---|
| `Program` | `name`, `statements` |
| `Declaration` | `kind` (`input`, `output` or `wire`), `signals` |
| `Assignment` | `target` (a `Signal`), `expr`, `delay` (a number or none) |
| `Signal` | `name`, `index` (the bus width in a declaration, the position in a use, or none) |
| `Constant` | `value` |
| `Not` | `operand` |
| `BinaryOp` | `op` (`AND`, `NAND`, `OR`, `NOR`, `XOR` or `XNOR`), `left`, `right` |

Each alternative of the `expr` rule has a label in the grammar (`NotExpr`, `AndExpr`, `OrExpr`, `ParenExpr`, `SignalExpr`, `ConstExpr`), so the generated visitor has one method per kind of expression. For example, `NOT A OR B AND C` becomes:

```
BinaryOp OR
  Not
    Signal A
  BinaryOp AND
    Signal B
    Signal C
```

`python src/syntactic.py --ast file.circ` prints the AST of a program. The semantic analysis stage walks this tree.

## 11. Semantic rules

The grammar only checks the shape of a program. The semantic analysis (`src/semantic.py`) walks the AST and checks the rules below. It reports every violation, in source order, as `Semantic error at line L, column C: ...`; a program with at least one error is rejected. It does not run if the lexer or the parser found an error.

**Symbol table.** Every declared signal has a role (`input`, `output` or `wire`) and a type: `bit`, or `bus[N]` with N bits. A signal is declared once, and before its first use.

**Types.** Every gate produces a bit, so the only type rule is that every operand and every assignment target is a bit. A bus is not a bit: it is used one position at a time (`data[0]`). Each bit of a bus is a separate signal for every rule below.

| # | Rule | Error |
|---|---|---|
| 1 | A signal is declared only once | `'A' is already declared` |
| 2 | A bus has at least 1 bit | `bus width must be at least 1` |
| 3 | A signal is declared before it is used | `'A' is used before its declaration` / `'A' is not declared` |
| 4 | An input is never assigned | `cannot assign to input 'A'` |
| 5 | A signal (or a bus bit) is assigned at most once | `'S' is assigned more than once` |
| 6 | A bus index is between 0 and width - 1 | `index 4 is out of range for bus 'data'` |
| 7 | Only a bus can be indexed | `'A' is not a bus and cannot be indexed` |
| 8 | A bus is never used as a whole where a bit is expected | `bus 'data' cannot be used as a single bit` |
| 9 | Constants are 0 or 1 | `constant 5 is not valid` |
| 10 | Every output is assigned | `output 'S' is never assigned` |
| 11 | A wire that is read is assigned | `wire 't' is read but never assigned` |
| 12 | No signal depends on itself (no combinational loop) | `combinational loop: x -> y -> x` |

**Warnings** do not reject the program: `input 'A' is never used`, `wire 't' is assigned but never used` and `wire 't' is declared but never used`. A bus is reported only if none of its bits is used.

**Report.** When the analysis succeeds it prints the symbol table and every equation fully parenthesized (`S = ((NOT A) OR (B AND C))`), which shows the precedence the parser chose. Exit codes: `0` no errors (warnings allowed), `1` errors found, `2` usage error or unreadable file.

## 12. Simulation

A program that passes the semantic analysis is a static combinational circuit, and `src/simulator.py` evaluates it. The simulation does not run if the lexer, the parser or the semantic analysis reported an error.

**Gates.** Every signal is a bit, 0 or 1.

| Gate | Result |
|---|---|
| `NOT a` | 1 if `a` is 0 |
| `a AND b` | 1 if both are 1 |
| `a NAND b` | the negation of `a AND b` |
| `a OR b` | 1 if at least one is 1 |
| `a NOR b` | the negation of `a OR b` |
| `a XOR b` | 1 if exactly one is 1 |
| `a XNOR b` | 1 if both are equal |

**Evaluation.** Each bit that is assigned is evaluated once, after the bits its expression reads, so the order of the statements in the source does not matter. A constant is its own value. The semantic analysis guarantees that this order exists (no loops) and that every output has a value.

**Truth table.** One row for every combination of the input bits. The inputs are the columns on the left and the outputs the columns on the right, in declaration order, with a bus listed bit by bit. The first input is the most significant bit, so the rows count in binary from all zeros. The number of rows is 2 to the power of the number of input bits, which is limited to 16 input bits. For more, a single combination is evaluated by giving a value to every input bit (`A=1`, and `data[2]=0` for a bus bit).

**Timing.** The `@delay` annotation is the propagation delay, in nanoseconds, of the gate in that statement; a statement without it has delay 0. The arrival time of an input is 0. The arrival time of a signal is the largest arrival time among the signals its expression reads, plus its own delay. The critical path is the chain of signals that ends at the output with the largest arrival time. When two chains tie, the one through more gates is reported. The timing is printed only when the program has at least one `@delay`.

Exit codes: `0` simulated, `1` the program has errors, `2` usage error, unreadable file, a value that is missing or is not 0 or 1, or too many inputs for a truth table.

## 13. Web interface

`src/server.py` serves a local interface (`web/`) and a JSON API (`src/api.py`). The API calls the same lexer, parser, AST builder, semantic analysis and simulator described above, and adds no language rules. Programs are only parsed and analyzed; nothing from a request is executed.

```bash
python src/server.py            # http://127.0.0.1:8765/
```

The interface presents the concrete syntax tree, the AST and the logic circuit as three different things. Diagnostics keep the line and column of the compiler and also carry character offsets so the editor can underline the offending text. The step-by-step animation shows the evaluation order of a combinational circuit and is not a timing simulation; the critical delay is the one computed by the simulator from `@delay`. The truth table (limited to 16 input bits, as in the simulator) is an aid for checking behaviour, not a proof of correctness.
