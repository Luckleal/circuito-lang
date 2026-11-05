# Brief: web interface for circuito-lang (task for the frontend worker)

Write ONLY inside `web/` (create it). Do not touch `src/`, `tests/`, `grammar/`, docs or git history. No commits.
No build step, no npm, no CDN, no external libraries: plain HTML + CSS + ES modules (`<script type="module">`), works offline.
UI text in Brazilian Portuguese. Compiler messages (diagnostics) stay as the server sends them (English).

## Backend (already implemented, read `src/api.py` and `src/server.py` first)
Server: `python src/server.py --port 8765` serves `web/` at `/` and the JSON API:
- `GET /api/examples` -> `[{name, group: valid|lexical|syntax|semantic, code}]`
- `POST /api/analyze {code}` -> stages, diagnostics (line/column 1-based, start/end 0-based inclusive offsets), tokens, cst, ast, circuit (nodes/edges/roots), inputs, outputs, wires, input_groups, delays, table_rows
- `POST /api/simulate {code, inputs:{bit:0|1}}` -> `{inputs, values:{nodeId:0|1}, bits:{bit:0|1}, steps:[{node,kind,op,net,inputs:[{from,value}],output}]}`
- `POST /api/table {code, wires, max_inputs}` -> `{inputs, outputs, rows:[[inVals,outVals]], formats:{text,md,csv}}`; 400 `{error}` if over the limit.
Never compute language semantics in JS (no own evaluator, no own parser rules): everything comes from the API. JS may only draw, lay out, and animate.

## Files
`web/index.html`, `web/styles.css`, `web/js/{main,api,editor,panzoom,tree,circuit,table,player,gates}.js` (names are a suggestion).

## Required behaviour
1. Layout: desktop = editor left, results right, draggable splitter (keyboard accessible). Mobile (<820px) = bottom/top tab bar switching Editor / Resultados, main actions always reachable, no horizontal page scroll, tables/technical areas scroll inside their own box.
2. Editor: textarea over a highlighted `<pre>` (overlay technique) with line numbers, highlighting driven by the `tokens` returned by `/api/analyze` (token types: keywords CIRCUIT/INPUT/OUTPUT/WIRE/DELAY, gates AND OR NOT XOR NAND NOR XNOR, REAL/INT, STRING, IDENT, symbols; comments are not tokens, so detect `//` ranges in the gaps). Re-tokenize after a short debounce by calling `/api/analyze`, but results panels only update on the explicit "Analisar" action (button + Ctrl/Cmd+Enter). Diagnostics underline the offending range (start..end) in the editor and clicking a diagnostic selects/scrolls to it. Example selector (from `/api/examples`, grouped), import `.circ` file, download `.circ`, code persisted in `localStorage` (try/catch). Starts with `half_adder`.
3. Staleness: after any edit following an analysis, show a visible "Resultados desatualizados" banner/badge and dim the result panels; never present old results as current.
4. Result tabs: Diagnósticos, Tokens, Árvore sintática (CST), AST, Circuito, Tabela-verdade, Execução e atrasos. Explain in one line what each is and clearly distinguish CST vs AST vs circuit. If a stage failed, show results of finished stages and say which stages were blocked (`stages` field: ok | error | blocked).
5. Trees (CST and AST): SVG, pan (drag) + zoom (wheel, pinch, buttons) + "ajustar à tela", collapsible branches (click the node's toggle), selecting a node highlights its source range in the editor (`start`/`end`). Shared `panzoom.js` used by trees and circuit.
6. Circuit (SVG, vector): layered left-to-right layout computed in JS from `circuit.nodes/edges` (layer = longest path from inputs; order nodes inside layers by barycenter to reduce crossings; route edges as smooth/orthogonal paths with small rounded corners). Recognizable gate symbols (AND, OR, NOT bubble, NAND, NOR, XOR, XNOR, buffer), input/output terminals labeled with bit names (`data[2]`), net names on wires (`node.net`), visible 0/1 on every signal, delays shown on nodes with `delay`. Click a gate or wire -> inspector with inputs/output values and operation, and highlights its source (`node.span`). Highlight the critical path (`delays.critical.nodes`) with a toggle. Zoom/pan/fit, touch friendly.
7. Inputs: a toggle per input bit (group buses visually using `input_groups`), calling `/api/simulate` on every change; values update circuit, truth table highlight, and explanation.
8. Animation player (didactic evaluation, NOT timing simulation; say so in the UI): play / pause / step / reset / speed slider, driven by `steps` from `/api/simulate`. Gates not yet evaluated show "?" and neutral colour; evaluated ones show value; the current gate is highlighted and its wires pulse from source to target; a text panel explains the current step ("AND(1, 0) = 0"). Respect `prefers-reduced-motion` (no pulses; steps still work by button). Delay numbers come from `delays` only and are independent of animation speed.
9. Truth table tab: button "Gerar tabela" -> `/api/table`; toggle "mostrar wires"; if `table_rows` > 4096 ask for confirmation before requesting (send `max_inputs` accordingly, never above 20); virtualized or paged rendering for large tables (render only visible rows); highlight the row equal to the current inputs; clicking a row applies its inputs to the circuit; export CSV and Markdown (use `formats` from the response, download via Blob), plus copy. State clearly that the table is a conference aid, not a proof of correctness.
10. Execução e atrasos tab: per-output delay (`delays.outputs`), critical path as a chain of bit names, short explanation that delay = sum of `@delay` along the slowest path (static, no glitches/hazards).
11. Empty/loading/error states with useful messages; API-unreachable state ("inicie com python src/server.py").

## Visual direction (identity of circuito-lang)
Mostly black and white with greys. Dark theme primary: soft black background (#0b0b0c), graphite surfaces (#141416, #1c1c1f), borders #2a2a2e, text #f2f2f3 / #a1a1a6 (contrast >= 4.5:1). One discreet accent (cyan #5ac8fa or similar) used consistently. State colours (success/warn/error) always paired with text or icon. Also provide a light theme via `prefers-color-scheme` and a manual toggle (stored in localStorage). Monospace font for editor and technical data (system stack `ui-monospace, "Cascadia Code", Consolas, monospace`); UI font system-ui. 8px spacing scale, subtle borders, smooth short animations (150-250ms), visible `:focus-visible` rings, hover/disabled/loading states, `prefers-reduced-motion` honoured. No neon, no glow, no cards-for-the-sake-of-cards. Header with the name "circuito-lang", buttons Analisar / (examples) / Importar / Baixar. Touch targets >= 40px on mobile.

## Accessibility
Semantic landmarks, tabs with ARIA roles and arrow-key navigation, labels on all controls, live region for analysis status, SVG nodes focusable with keyboard (Enter selects), information never conveyed by colour alone (values are text 0/1).

## Acceptance
Open `http://127.0.0.1:8765/` with the real server: examples load, analyze works, an invalid example shows underlined error + diagnostics, all tabs render, animation steps through `detector` and `bus`, table highlights current row, layout is usable at 390x844, 820x1180 and 1440x900. Report briefly what is done and what is not.
