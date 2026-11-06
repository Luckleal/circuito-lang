import {createEditor} from './editor.js';
import {expression as requestExpression} from './api.js';
import {t} from './i18n.js';
import {createCompare} from './compare.js';

const $ = selector => document.querySelector(selector);
const expression = $('#quick-expression');
const generated = $('#quick-code');
const generatedEditor = createEditor(generated, $('#quick-highlight'), $('#quick-lines'), document.createElement('span'));
const operators = ['NOT', 'AND', 'OR', 'XOR', 'NAND', 'NOR', 'XNOR', '( )', '0', '1'];
const examples = ['A AND B', 'NOT A OR B AND C', '(A XOR B) AND C', 'd[0] OR d[1]'];
let timer, sequence = 0, latest = null, active = false, initialized = false, firstSuccess = true;
const comparison = createCompare();

function storage(key, value) {
  try { if (value === undefined) return localStorage.getItem(key); localStorage.setItem(key, value); }
  catch { return null; }
}

function message(key, params) { $('#quick-message').textContent = key ? t(key, params) : ''; }

function renderDiagnostics(result) {
  const host = $('#quick-diagnostics'); host.replaceChildren();
  if (!result || result.ok || !expression.value.trim()) return;
  const source = result.expression || expression.value;
  for (const item of result.diagnostics || []) {
    const card = document.createElement('div'); card.className = 'quick-error';
    const excerpt = document.createElement('div'); excerpt.className = 'quick-excerpt';
    const start = Math.max(0, Math.min(source.length, item.start ?? 0));
    const end = Math.max(start + 1, Math.min(source.length, (item.end ?? start) + 1));
    excerpt.append(document.createTextNode(source.slice(0, start)));
    const mark = document.createElement('mark'); mark.textContent = source.slice(start, end) || ' '; excerpt.append(mark);
    excerpt.append(document.createTextNode(source.slice(end)));
    const location = document.createElement('strong');
    location.textContent = t('quick.error_location', {line:item.line ?? 1, column:item.column ?? start + 1});
    const reason = document.createElement('p');
    reason.textContent = `${t('analysis.diagnostic.' + (item.stage === 'lexical' ? 'lexical' : 'syntactic'))} ${item.message}`;
    card.append(location, excerpt, reason);
    card.addEventListener('click', () => { expression.focus(); expression.setSelectionRange(start, end); });
    host.append(card);
  }
  if (!host.childElementCount) message('quick.invalid');
}

function insertOperator(value) {
  const start = expression.selectionStart, end = expression.selectionEnd;
  const selected = expression.value.slice(start, end);
  let text, caret;
  if (value === '( )') { text = `(${selected || ' '})`; caret = start + (selected ? text.length : 1); }
  else if (value === 'NOT') { text = `NOT ${selected}`; caret = start + text.length; }
  else if (value === '0' || value === '1') { text = value; caret = start + 1; }
  else { text = ` ${value} `; caret = start + text.length; }
  expression.setRangeText(text, start, end, 'end');
  expression.focus(); expression.setSelectionRange(caret, caret);
  expression.dispatchEvent(new Event('input', {bubbles:true}));
}

for (const value of operators) {
  const button = document.createElement('button'); button.type = 'button'; button.textContent = value;
  button.addEventListener('click', () => insertOperator(value)); $('#quick-operators').append(button);
}
for (const value of examples) {
  const button = document.createElement('button'); button.type = 'button'; button.textContent = value;
  button.addEventListener('click', () => { expression.value = value; expression.dispatchEvent(new Event('input', {bubbles:true})); expression.focus(); });
  $('#quick-examples').append(button);
}

export function createQuick({onPending, onSuccess, onModeChange}) {
  async function request() {
    const seq = ++sequence, value = expression.value;
    if (!value.trim()) { latest = null; comparison.setFirst(value, false); renderDiagnostics(null); message('quick.empty'); return; }
    message('quick.checking');
    try {
      const result = await requestExpression(value);
      if (seq !== sequence || !active || value !== expression.value) return;
      latest = result; comparison.setFirst(value, result.ok); renderDiagnostics(result);
      if (!result.ok) { message('quick.invalid'); return; }
      generated.value = result.code; generatedEditor.clear();
      $('#quick-generated').hidden = false;
      message('quick.output', {name:result.output});
      onSuccess(result, firstSuccess);
      firstSuccess = false;
    } catch (error) { if (seq === sequence && active) { comparison.setFirst(value, false); message('quick.request_error', {error:error.message}); } }
  }
  function schedule() {
    storage('circuito.expression', expression.value);
    clearTimeout(timer); ++sequence;
    latest = null;
    comparison.setFirst(expression.value, false);
    renderDiagnostics(null); message(expression.value.trim() ? 'quick.checking' : 'quick.empty');
    if (active) onPending();
    if (active) timer = setTimeout(request, 250);
  }
  expression.addEventListener('input', schedule);
  expression.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); clearTimeout(timer); request(); } });
  function setMode(mode, editGenerated = false) {
    const next = mode === 'quick';
    if (next === active && !editGenerated && initialized) return;
    initialized = true;
    clearTimeout(timer); ++sequence; active = next;
    comparison.setActive(next);
    $('#quick-pane').hidden = !next; $('#full-pane').hidden = next;
    document.body.dataset.mode = mode;
    $('#mode-quick').setAttribute('aria-pressed', String(next));
    $('#mode-full').setAttribute('aria-pressed', String(!next));
    storage('circuito.mode', mode);
    onModeChange(mode, editGenerated);
    if (next) { if (expression.value.trim()) schedule(); else message('quick.empty'); }
  }
  $('#mode-quick').addEventListener('click', () => setMode('quick'));
  $('#mode-full').addEventListener('click', () => setMode('full'));
  $('#quick-edit-full').addEventListener('click', () => setMode('full', true));
  document.addEventListener('languagechange', () => { if (active && latest?.ok) message('quick.output', {name:latest.output}); else if (active) renderDiagnostics(latest); });
  expression.value = storage('circuito.expression') || '';
  return {setMode, getMode:() => active ? 'quick' : 'full', setExpression(value) { expression.value = value; if (active) schedule(); }, retry() { if (active) { clearTimeout(timer); request(); } }, getExpression:() => expression.value, setTokens:tokens => generatedEditor.setTokens(tokens), getGenerated:() => generated.value, isFirstSuccess:() => firstSuccess};
}
