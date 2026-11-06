# Brief 5: quick mode ("Modo rápido")

Goal: someone who does not know the language types just `A OR B` and gets everything (circuit, animation, truth table, written analysis), while the full compiler mode stays. Quick mode is a thin layer over the real language: the backend turns the expression into a complete Circuit program (`POST /api/expression {expression}` -> `{ok, code, expression, output, inputs, diagnostics}`; read `expression_to_program` in `src/api.py`). That program then goes through the same `/api/analyze`, `/api/simulate`, `/api/table` as any program. Never evaluate or parse the expression in JS.

Write scope: `web/index.html`, `web/js/main.js`, new `web/js/quick.js`, new `web/css/quick.css` (one `<link>`), `web/styles.css` (only what is needed), all 7 i18n dictionaries (same keys in all). Do NOT edit `circuit.js`, `player.js`, `gates.js`, `table.js`, `analysis.js`, `web/css/circuit.css`, `web/css/analysis.css`. No browser tool: use `node --check` and curl against http://127.0.0.1:8765/ (do not restart the server). No commits.

## Behaviour
- A clear mode switch in the header (segmented control, keyboard accessible, ARIA): **Rápido** | **Programa completo**. Default for a first visit: Rápido. Remember the choice and the last expression in `localStorage` (try/catch).
- Rápido layout: the left pane shows a large single-line input (monospace, placeholder `A OR B`, label "Digite uma expressão lógica"), operator chips that insert text at the caret (NOT, AND, OR, XOR, NAND, NOR, XNOR, `( )`, `0`, `1`), example chips (`A AND B`, `NOT A OR B AND C`, `(A XOR B) AND C`, `d[0] OR d[1]`), and a collapsible block "Programa gerado" with the generated `.circ` shown with the same highlighting (read-only) plus a button "Editar como programa completo" that switches to full mode keeping that code.
- Live: debounce ~250 ms on input -> `/api/expression`; if `ok`, put `code` in the editor state and run the normal analysis automatically (no button needed), open the Circuit tab on first success. If not ok, show the expression diagnostics inline under the input (line/column are relative to the expression; underline the range with `start`/`end`), keep the previous results but mark them stale, and explain in plain language (reuse the Análise error explanations when possible).
- Results pane identical to full mode (all tabs). In Quick mode the Análise tab also states: "Sua expressão virou este programa: ..." with the generated code, and which part is the output name.
- Output name is shown (`S` or `S2`): "resultado: S".
- In Full mode nothing changes. Switching modes must not lose code or results.
- Responsive: on mobile the quick input sits above the results (no separate Editor tab needed; keep the mobile tabs but Quick mode may use a single stacked view), tap targets >= 40px.
- i18n: all new strings in 7 languages. Visual quality bar as in briefs 2-4 (no generic AI look; precise typography; accent only on primary actions).
Report briefly.
