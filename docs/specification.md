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
| Syntactic | tokens in the wrong order | `Syntax error at line 5, column 1: found end of file, expected {'@', ';'}` |

Exit codes of both analyzers: `0` no errors, `1` errors found, `2` usage error or unreadable file. If there are lexical errors, the syntactic analyzer reports them and does not parse.
