# Circuit

## 1. What this language is

`Circuit` is a language for describing **combinational logic circuits**: a program declares inputs, outputs and internal wires, and writes boolean equations that connect those signals through logic gates (`AND`, `OR`, `NOT`, `XOR`, `NAND`, `NOR`, `XNOR`).

Example (`examples/half_adder.circ`):

```
// half adder: adds two bits
circuit "half adder";

input A, B;
output sum, carry;

sum = A XOR B;
carry = A AND B;
```

See the full specification in [docs/specification.md](docs/specification.md).

## 2. How to install and run

```bash
pip install -r requirements.txt
bash generate.sh
python src/lexical.py examples/half_adder.circ
python src/syntactic.py examples/half_adder.circ
```

`generate.sh` generates the lexer and the parser in `generated/` (not versioned) from `grammar/Circuit.g4`.

- `src/lexical.py` reads a `.circ` file, lists the recognized tokens and reports lexical errors with line and column.
- `src/syntactic.py` parses the file from the `program` rule, prints the syntax tree and reports syntax errors with line and column. If there are lexical errors, it reports them and does not parse.

Exit codes of both programs: `0` no errors, `1` errors found, `2` usage error or unreadable file.

### Interactive mode: type an expression and see the analysis

```bash
python src/interactive.py
```

It prompts with `circuit>`, you type a boolean expression, and it shows the tokens, the syntax tree and the fully parenthesized grouping (which makes the precedence visible), or the error with line and column:

```
circuit> NOT A OR B AND C
Tokens:
  NOT       'NOT'  (column 1)
  ...
Grouped: ((NOT A) OR (B AND C))

circuit> A OR
Syntax error at line 1, column 5: found end of file, expected {'NOT', INT, IDENT, '('}
```

Commands: `:help` and `:quit` (also `:q`, Ctrl+D or Ctrl+C). To analyze a single expression and exit (exit code 0 if valid, 1 if not):

```bash
python src/interactive.py "NOT A OR B AND C"
```

## 3. Project status

**Lexical analyzer and syntactic analyzer (parser).** There is no semantic analysis or simulation yet.

## 4. How to run the tests

```bash
python -m pytest
```

The test suite lives in `tests/` and needs `generated/` to exist (run `bash generate.sh` first):

| File | What it covers |
| --- | --- |
| `tests/test_lexer.py` | tokens, keywords vs identifiers, literals, comments, positions, the three lexical errors |
| `tests/test_parser.py` | valid programs, precedence and associativity, parentheses, syntax errors with line and column, message translation |
| `tests/test_cli.py` | both programs as real commands: output format, exit codes, stdout vs stderr, missing file, any working directory, CRLF and non-ASCII input |
| `tests/test_examples.py` | every file in `examples/`, with the expected result and error position |
| `tests/test_interactive.py` | the interactive analyzer: output, errors, one-shot mode and piped sessions |

Useful options: `python -m pytest -v` (one line per test), `python -m pytest tests/test_parser.py -k precedence` (a subset).

The `examples/` folder holds the programs the tests run on: valid programs at the top, `invalid_lexical/` (lexical errors) and `invalid_syntax/` (lexically correct, syntactically wrong).

## 5. ANTLR and runtime versions

- `antlr4-python3-runtime`: **4.13.2**
- ANTLR generator (`antlr4 -v 4.13.2 ...`, pinned in `generate.sh`): **4.13.2**

The two versions must always be the same.

## 6. Testing the grammar without generating code

`antlr4-parse` interprets the grammar directly. To see the tree of a whole file:

```bash
antlr4-parse grammar/Circuit.g4 program -tree examples/precedence.circ
```

The third argument can be any rule, which allows testing one rule at a time, for example `expr`:

```bash
echo "NOT A OR B AND C" | antlr4-parse grammar/Circuit.g4 expr -tree
```
