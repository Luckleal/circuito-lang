# Brief 3: circuit view, animation and truth table (the centrepiece)

Owner of this task: ONLY `web/js/circuit.js`, `web/js/player.js` (new), `web/js/gates.js` (new), `web/js/table.js`, `web/css/circuit.css` (new, link it from `index.html` with one `<link>` line; do not touch other parts of index.html or other files). Another agent owns the rest of `web/`. If you need a hook in `main.js`, describe it in your final report instead of editing it. Read `src/api.py` (API contract) and the current files first. No libraries, no CDN, no build step, no commits. Server runs at http://127.0.0.1:8765/ (do not restart it). UI strings must go through the existing i18n `t()` if `web/js/i18n.js` exists, otherwise isolate them in one object at the top of each file.

## Goal
The current circuit is tiny, cramped and hard to read. Make it the best part of the product: something a student would stare at. Surprising quality, not a plain diagram.

## Circuit canvas
- Use the whole panel; on load auto-fit so gates are comfortably large (minimum gate body ~64x48 CSS px at fit; labels >= 12px). Never render microscopic text: if a big circuit needs more room, fit to width and let the user pan; provide "fit", zoom +/-, mouse-wheel zoom around the cursor, drag pan, pinch on touch, double-click to fit.
- Layout: left to right layered. Inputs in the leftmost column in declaration order (buses grouped with a bracket label), outputs rightmost. Orthogonal wire routing with rounded corners, separate parallel tracks per channel so wires never run on top of each other, minimal crossings (barycenter ordering with a few sweeps), small junction dots where a net fans out. Wires of the same net share the trunk.
- Gate symbols: proper ANSI/distinctive shapes, drawn as crisp SVG paths with consistent 2px stroke (AND flat back + round front, OR/XOR curved back, NOT triangle + bubble, NAND/NOR/XNOR with bubbles, buffer triangle). Pin stubs aligned to the wires. Gate op name small and quiet inside or under the symbol.
- Value language: wire colour by value (0 = muted grey, 1 = accent cyan, glow-free), value chips (`0`/`1`, tabular numerals) sitting on wires near the target pin, never overlapping each other or gates; chips hide below a zoom threshold and reappear when zoomed in. Terminals: inputs as real toggle switches drawn on the canvas (click or Space/Enter flips, ARIA role=switch) and outputs as indicator lamps (filled when 1, with the text 0/1 as well). Net names for wires (`t1`) as small labels on the trunk; `@delay` as a small badge `3.0 ns` on the gate.
- Selection: click a gate or wire -> highlight it and its fan-in/fan-out path, show an inspector (a compact panel anchored in the canvas corner, collapsible) with: operation, input values, output value, the formula "AND(1, 0) = 0", the net name, delay, and a button "show in code" (dispatch a `CustomEvent('circuit:select-source', {detail:{start,end}})` on `window`, using `node.span`; main.js listens or will be wired by the coordinator).
- Critical path toggle (`delays.critical.nodes`): trace in the accent colour with a moving dash; small summary pill "caminho crítico 3.0 ns".
- Keyboard: Tab through toggles and gates, arrow keys move selection along the netlist, `+`/`-`/`0` zoom, `F` fit.

## Animation player (didactic, NOT timing simulation)
- A slim bar under the canvas: reset, step back, play/pause, step forward, speed (0.25x-4x), progress scrubber with one tick per step, step counter "3 / 7". Space toggles play when the canvas is focused.
- Behaviour from `/api/simulate` `steps`: before the first step every non-input node is "pending" (dim, `?`); each step lights the gate, a pulse travels along each input wire (a small circle moving with `offset-path`/`stroke-dashoffset`, transform/opacity only), the gate "settles" (short scale + opacity), the output wire takes its colour, the explanation line updates ("AND(1, 0) = 0 because both inputs must be 1"). Explanations per operator (AND, OR, NOT, XOR, NAND, NOR, XNOR, buffer, constant) in the active language.
- Changing an input toggle re-simulates and restarts the animation at step 0 (paused), showing inputs only; a "show result" button jumps to the end.
- A visible note: "Animação didática da ordem de avaliação, não simulação temporal" (translated). Delay numbers come only from the API.
- `prefers-reduced-motion`: no travelling pulses or scale; steps still advance by button; final state static.
- Export circuit as SVG and PNG buttons (Blob download; embed computed styles so the file renders standalone, dark background).

## Truth table
- Sticky header, tabular numerals, thin separators, columns grouped: inputs | outputs | (wires, dimmed). Input columns coloured subtly by value (1 = accent text, 0 = muted); the row matching the current inputs has an accent bar + bold text and scrolls into view when inputs change; click or Enter on a row applies it to the circuit (toggles update).
- Virtualized rendering for large tables (only visible rows in the DOM) with a fixed row height; keyboard: up/down moves selection, PageUp/PageDown, Home/End.
- Toolbar: show wires, copy, download CSV, download Markdown, and a row filter ("only rows where output X = 1" via a tiny select per output). Confirm dialog before generating > 4096 rows. Clear note: "ajuda a conferir, não é prova de correção".
- Sort of mini summary above the table: "8 linhas · 3 entradas · sum = 1 em 4 linhas".

## Quality bar (read carefully)
No generic AI-looking UI: no purple/blue gradient washes, no glow, no glassmorphism, no emoji, no decorative cards. Monochrome + one cyan accent, 1px lines, precise alignment, real typographic hierarchy, hand-made SVG icons (1.5px stroke). Smooth: entrances 300-450ms ease-out, exits 120-160ms. Test with examples `half_adder`, `full_adder`, `detector`, `bus`, `delays`, `precedence` at 390x844, 820x1180, 1440x900. Fix every overlap, clipping and tiny target you find. Take screenshots and look at them critically before reporting; iterate until you would be proud of it.

## Report
Short: what is done, what is not, and any hook the coordinator must wire in `main.js`.
