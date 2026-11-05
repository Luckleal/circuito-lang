# Brief 2: i18n and polish of the web interface

Write ONLY inside `web/`. No commits. Plain HTML/CSS/ES modules, no libraries, no CDN.

## 1. Internationalization (required)
- Languages: pt-BR, en, es, fr, de, zh-CN, ja. Files `web/js/i18n/<code>.js` exporting a flat dictionary, plus `web/js/i18n.js` with `t(key, params)`, `setLanguage(code)`, `detectLanguage()`.
- First visit: choose from `navigator.languages` (match full code, then base language, fallback `en`). A visible language `<select>` in the header lets the user change it; the choice is saved in `localStorage` (try/catch) and wins over detection afterwards. Update `<html lang>`.
- Every UI string goes through `t()`, including aria-labels, tooltips, empty states, banners, animation explanations ("AND(1, 0) = 0" style text), and the table notices. Static HTML text uses `data-i18n` attributes translated on load and on language change without reloading the page or losing editor content/results.
- Compiler diagnostics from the API stay in English (they are the language's official messages); show a small note about that in the Diagnostics tab. Code, bit names and gate names are never translated.
- All dictionaries must have exactly the same keys (write a tiny check in the browser console warning on missing keys in dev only).

## 2. Visual polish (take the best from the references below, copy no brand, text or client data)
- Motion language: entrances with a long deceleration (ease-out, ~300-450ms), exits short (~120-160ms), no overshoot except tiny confirmations, animate only `transform`/`opacity`/`stroke-dashoffset`. Wires draw themselves with `stroke-dashoffset` when a circuit renders; signal pulses travel along wires during the animation; gates "settle" with a short scale+opacity when evaluated; values flip with a quick fade. Tab switches fade 160-200ms. `prefers-reduced-motion`: final static state, no travelling pulses.
- Quality bar: no generic "AI" look: no purple gradients, no glassmorphism blobs, no emoji icons, no oversized rounded cards stacked in grids, no meaningless badges. Real hierarchy through type size/weight/spacing, 1px borders, a restrained cyan accent, crisp inline SVG icons (hand-drawn, consistent 1.5px stroke). Tight, intentional spacing; aligned baselines; tabular numerals for values (`font-variant-numeric: tabular-nums`).
- Header: product name in a monospace wordmark, quiet toolbar. Editor feels like a real code editor (current line highlight, gutter, caret colour, selection colour). Tables: sticky header, zebra off, thin separators, current row marked with an accent bar plus bold text.
- Empty states are short and useful. Loading states are skeleton lines or a subtle progress bar, not spinners everywhere.
- Verify at 390x844, 820x1180 and 1440x900 using the running server; fix overflow, overlap and tiny tap targets.

## 3. Done when
Switching language changes every visible string; first load follows the browser language; all previous acceptance items of `orca/BRIEF-web.md` still hold. Report briefly what is done and what is not.

## 4. Defects found in review of round 1 (fix first)
- Default must be the DARK theme (black/graphite) even when the OS prefers light; light theme only via the manual toggle (the toggle may start from the OS preference only if the user never chose and you keep dark as the first-visit default). In the light theme the editor token colours are nearly invisible (pale text on light background): every token colour must reach contrast >= 4.5:1 in both themes.
- Browser console shows 1 error on load: find and fix it.
- Result tab bar overflows horizontally on 929px width (the last tab is clipped); make tabs wrap or scroll with visible affordance.
- Mobile layout must be tested; render the circuit for `full_adder` and `delays` examples and check readability and wire crossings.
