import * as api from './api.js';
import {createEditor} from './editor.js';
import {renderTree} from './tree.js';
import {renderCircuit} from './circuit.js';
import {createTable} from './table.js';
import {t, detectLanguage, setLanguage, getLanguage, translateStatic} from './i18n.js';

const $ = selector => document.querySelector(selector);
const code = $('#code');
const editor = createEditor(code, $('#highlight'), $('#lines'), $('#cursor'), $('#current-line'));
const ids = ['diagnostics','tokens','cst','ast','circuit','table','delays'];
const panels = Object.fromEntries(ids.map(id => [id, $(`#panel-${id}`)]));
const tabs = [...document.querySelectorAll('[role="tab"]')];
let examples = [], analysis = null, simulation = null, analyzedCode = '';
let inputs = {}, activeTab = 'diagnostics', stale = false, busy = false;
let analysisSeq = 0, tokenSeq = 0, simulationSeq = 0, tokenTimer;
const table = createTable(panels.table, () => ({analysis, code:analyzedCode, inputs}), applyInputs);

function save(key, value) { try { localStorage.setItem(key, value); } catch {} }
function load(key) { try { return localStorage.getItem(key); } catch { return null; } }
function status(value) { $('#status').textContent = value; }
function intro(host, id) {
  host.replaceChildren();
  const el = document.createElement('p'); el.className = 'intro'; el.textContent = t(`desc.${id}`); host.append(el);
}
function empty(host, key) {
  const el = document.createElement('p'); el.className = 'empty'; el.textContent = t(key); host.append(el);
}
function setView(view) {
  $('#workspace').dataset.view = view;
  for (const button of document.querySelectorAll('.mobile-tabs button')) button.classList.toggle('active', button.dataset.view === view);
}
function selectSource(start, end) {
  if (start == null) return;
  if (matchMedia('(max-width:819px)').matches) setView('editor');
  editor.select(start, end ?? start);
}
function setStale(value) {
  stale = value;
  $('#stale').hidden = !value;
  $('#result-content').classList.toggle('stale-content', value);
  $('#editor-state').textContent = t(value ? 'app.edited' : analysis ? 'app.analyzed' : 'app.ready');
  if (value) status(t('app.stale_status'));
}
function updateSummary() {
  if (!analysis) return;
  const count = analysis.diagnostics.filter(d => d.severity === 'error').length;
  $('#analysis-summary').textContent = count ? t(count === 1 ? 'result.errors_one' : 'result.errors_many', {count}) : analysis.circuit ? t('result.summary', {name:analysis.name ?? '', nodes:analysis.circuit.nodes.length, inputs:analysis.inputs.length}) : t('result.available');
}
function updateAnalyzeButton() { $('#analyze').querySelector('[data-i18n]').textContent = t(busy ? 'app.analyzing' : 'app.analyze'); }
function useCode(text) { code.value = text; editor.clear(); code.dispatchEvent(new Event('input', {bubbles:true})); }
async function refreshTokens() {
  const seq = ++tokenSeq, text = code.value;
  try { const result = await api.analyze(text); if (seq === tokenSeq && text === code.value) editor.setTokens(result.tokens); } catch {}
}
function onEdit() {
  save('circuito.code', code.value);
  editor.clear();
  if (analysis) setStale(code.value !== analyzedCode);
  clearTimeout(tokenTimer);
  tokenTimer = setTimeout(refreshTokens, 280);
}
code.addEventListener('input', onEdit);
code.addEventListener('keydown', event => { if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); runAnalysis(); } });
$('#analyze').addEventListener('click', runAnalysis);
$('#import').addEventListener('click', () => $('#file').click());
$('#file').addEventListener('change', async event => {
  const file = event.target.files?.[0];
  if (file) { useCode(await file.text()); $('#examples').value = ''; }
  event.target.value = '';
});
$('#download').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([code.value], {type:'text/plain;charset=utf-8'}));
  const link = document.createElement('a'); link.href = url; link.download = 'circuito.circ'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
document.documentElement.dataset.theme = load('circuito.theme') === 'light' ? 'light' : 'dark';
$('#theme').addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next; save('circuito.theme', next);
});

setLanguage(detectLanguage(), false);
$('#language').value = getLanguage();
$('#language').addEventListener('change', event => setLanguage(event.target.value));
document.addEventListener('languagechange', () => {
  $('#language').value = getLanguage();
  editor.position();
  setStale(stale);
  updateAnalyzeButton();
  updateSummary();
  if (!analysis) $('#analysis-summary').textContent = t('app.awaiting');
  populateExamples();
  renderActive();
});
for (const button of document.querySelectorAll('.mobile-tabs button')) button.addEventListener('click', () => setView(button.dataset.view));

const splitter = $('#splitter'); let dragging = false;
function resize(value) {
  const pct = Math.max(25, Math.min(75, Math.round(value)));
  $('.editor-pane').style.width = `${pct}%`;
  splitter.setAttribute('aria-valuenow', String(pct));
}
splitter.addEventListener('pointerdown', event => { dragging = true; splitter.setPointerCapture(event.pointerId); });
splitter.addEventListener('pointermove', event => {
  if (!dragging) return;
  const box = $('#workspace').getBoundingClientRect(); resize((event.clientX - box.left) / box.width * 100);
});
splitter.addEventListener('pointerup', () => dragging = false);
splitter.addEventListener('pointercancel', () => dragging = false);
splitter.addEventListener('keydown', event => {
  if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
  event.preventDefault();
  const current = Number(splitter.getAttribute('aria-valuenow'));
  resize(event.key === 'Home' ? 25 : event.key === 'End' ? 75 : current + (event.key === 'ArrowRight' ? 2 : -2));
});
function setTab(id, focus = false) {
  activeTab = id;
  for (const button of tabs) {
    const selected = button.dataset.tab === id;
    button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1;
    panels[button.dataset.tab].hidden = !selected;
    if (selected && focus) button.focus();
  }
  renderActive();
}
for (const button of tabs) button.addEventListener('click', () => setTab(button.dataset.tab));
$('#tabs').addEventListener('keydown', event => {
  const index = tabs.findIndex(button => button.dataset.tab === activeTab);
  const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index - 1 + tabs.length) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
  if (next < 0) return;
  event.preventDefault(); setTab(tabs[next].dataset.tab, true); tabs[next].scrollIntoView({block:'nearest', inline:'nearest'});
});

async function runAnalysis() {
  const seq = ++analysisSeq, text = code.value;
  busy = true; $('#analyze').disabled = true; $('#results-pane').setAttribute('aria-busy','true'); $('#results-pane').classList.add('is-loading'); updateAnalyzeButton(); status(t('result.running'));
  try {
    const result = await api.analyze(text);
    if (seq !== analysisSeq) return;
    analysis = result; analyzedCode = text; simulation = null;
    inputs = Object.fromEntries((result.inputs || []).map(bit => [bit, 0]));
    editor.setTokens(result.tokens); editor.setDiagnostics(result.diagnostics);
    setStale(code.value !== text); table.clear(); updateSummary();
    const count = result.diagnostics.filter(d => d.severity === 'error').length;
    status(count ? t('result.done_errors', {count}) : t('result.done'));
    renderActive();
    if (result.circuit) await runSimulation();
  } catch (error) {
    if (seq !== analysisSeq) return;
    if (analysis) setStale(true);
    $('#analysis-summary').textContent = error.message;
    status(error.message);
    if (activeTab === 'diagnostics') { intro(panels.diagnostics, 'diagnostics'); const el = document.createElement('p'); el.className = 'empty'; el.textContent = error.message; panels.diagnostics.append(el); }
  } finally { if (seq === analysisSeq) { busy = false; $('#analyze').disabled = false; $('#results-pane').removeAttribute('aria-busy'); $('#results-pane').classList.remove('is-loading'); updateAnalyzeButton(); } }
}
async function runSimulation() {
  if (!analysis?.circuit || stale) return;
  const seq = ++simulationSeq;
  try { const result = await api.simulate(analyzedCode, inputs); if (seq === simulationSeq) { simulation = result; renderActive(); } }
  catch (error) { if (seq === simulationSeq) status(error.message); }
}
function applyInputs(next) { inputs = {...inputs, ...next}; runSimulation(); table.render(); }

function renderActive() {
  const host = panels[activeTab]; intro(host, activeTab);
  if (!analysis) { empty(host, 'result.empty'); return; }
  if (activeTab === 'diagnostics') return renderDiagnostics(host);
  if (activeTab === 'tokens') return renderTokens(host);
  if (activeTab === 'cst' || activeTab === 'ast') {
    const tree = analysis[activeTab];
    if (!tree) { empty(host, analysis.stages.syntactic === 'blocked' ? 'result.blocked_syntax' : 'result.no_tree'); return; }
    const area = document.createElement('div'); host.append(area); renderTree(area, tree, selectSource); return;
  }
  if (activeTab === 'circuit') return renderCircuitTab(host);
  if (activeTab === 'table') return table.render();
  if (activeTab === 'delays') return renderDelays(host);
}
function renderDiagnostics(host) {
  const note = document.createElement('p'); note.className = 'notice diagnostic-note'; note.textContent = t('result.diagnostic_note'); host.append(note);
  const stages = document.createElement('div'); stages.className = 'stage-list';
  for (const [key, state] of Object.entries(analysis.stages)) {
    const el = document.createElement('span'); el.className = 'stage'; el.dataset.status = state;
    el.textContent = `${t(`stage.${key}`)}: ${t(`state.${state}`)}`; stages.append(el);
  }
  host.append(stages);
  const list = document.createElement('div'); list.className = 'list diagnostics-list'; host.append(list);
  if (!analysis.diagnostics.length) { empty(list, 'result.no_diagnostics'); return; }
  for (const diagnostic of analysis.diagnostics) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'item item-button';
    const title = document.createElement('strong'); title.textContent = t('result.location', {stage:t(`stage.${diagnostic.stage}`), line:diagnostic.line, column:diagnostic.column});
    const detail = document.createElement('div'); detail.textContent = diagnostic.message;
    const hint = document.createElement('small'); hint.textContent = t('result.source_hint');
    button.append(title, detail, hint); button.addEventListener('click', () => selectSource(diagnostic.start, diagnostic.end)); list.append(button);
  }
}
function renderTokens(host) {
  if (!analysis.tokens.length) { empty(host, 'result.no_tokens'); return; }
  const box = document.createElement('div'); box.className = 'table-box technical';
  const tableEl = document.createElement('table'); tableEl.className = 'data-table';
  const head = document.createElement('thead'), headerRow = document.createElement('tr');
  for (const key of ['type','text','line','column']) { const th = document.createElement('th'); th.textContent = t(`result.token_${key}`); headerRow.append(th); }
  head.append(headerRow); tableEl.append(head);
  const body = document.createElement('tbody');
  for (const token of analysis.tokens) {
    const row = document.createElement('tr'); row.tabIndex = 0;
    for (const value of [token.type,token.text,token.line,token.column]) { const td = document.createElement('td'); td.textContent = String(value); row.append(td); }
    row.addEventListener('click', () => selectSource(token.start,token.end));
    row.addEventListener('keydown', event => { if (event.key === 'Enter') selectSource(token.start,token.end); }); body.append(row);
  }
  tableEl.append(body); box.append(tableEl); host.append(box);
}
function renderCircuitTab(host) {
  if (!analysis.circuit) { empty(host, analysis.stages.semantic === 'blocked' ? 'result.circuit_blocked' : 'result.circuit_error'); return; }
  const group = document.createElement('div'); group.className = 'input-groups';
  for (const spec of analysis.input_groups || []) {
    const box = document.createElement('div'); box.className = 'input-group';
    const name = document.createElement('strong'); name.textContent = spec.name; box.append(name);
    for (const bit of spec.bits) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'bit-toggle';
      button.setAttribute('aria-pressed', String(Boolean(inputs[bit])));
      button.setAttribute('aria-label', t('circuit.toggle', {bit,value:inputs[bit] || 0}));
      button.textContent = `${bit} ${inputs[bit] || 0}`;
      button.addEventListener('click', () => applyInputs({[bit]:inputs[bit] ? 0 : 1})); box.append(button);
    }
    group.append(box);
  }
  host.append(group);
  const drawing = document.createElement('div'); host.append(drawing);
  renderCircuit(drawing, analysis.circuit, simulation, {inputs, critical:analysis.delays?.critical?.nodes || [], onSelect:selectSource});
}
function renderDelays(host) {
  if (!analysis.delays) { empty(host, 'result.no_delays'); return; }
  const explanation = document.createElement('p'); explanation.className = 'intro'; explanation.textContent = t('result.delay_info'); host.append(explanation);
  const list = document.createElement('div'); list.className = 'list';
  for (const out of analysis.delays.outputs) {
    const item = document.createElement('div'); item.className = 'item';
    const title = document.createElement('h3'); title.textContent = out.bit;
    const time = document.createElement('div'); time.className = 'delay-number'; time.textContent = `${out.time} ns`;
    const chain = document.createElement('div'); chain.className = 'path-chain';
    for (const [index, bit] of out.path.entries()) {
      if (index) chain.append(document.createTextNode(' → '));
      const el = document.createElement('span'); el.textContent = bit; chain.append(el);
    }
    item.append(title,time,chain); list.append(item);
  }
  host.append(list);
  if (analysis.delays.critical) { const note = document.createElement('p'); note.className = 'notice'; note.textContent = t('result.critical', {bit:analysis.delays.critical.bit,time:analysis.delays.critical.time}); host.append(note); }
}
function populateExamples() {
  const select = $('#examples'), current = select.value;
  select.replaceChildren();
  if (!examples.length) { const option = document.createElement('option'); option.textContent = t('app.loading'); select.append(option); return; }
  for (const group of ['valid','lexical','syntax','semantic','warnings']) {
    const items = examples.filter(example => example.group === group);
    if (!items.length) continue;
    const optgroup = document.createElement('optgroup'); optgroup.label = t(`example.${group}`);
    for (const example of items) { const option = document.createElement('option'); option.value = example.name; option.textContent = example.name.split('/').at(-1).replaceAll('_',' '); optgroup.append(option); }
    select.append(optgroup);
  }
  select.value = current;
}
async function init() {
  code.value = load('circuito.code') || ''; editor.paint();
  try {
    examples = await api.examples(); populateExamples();
    const initial = examples.find(example => example.name === 'half_adder');
    if (!code.value && initial) code.value = initial.code;
    $('#examples').value = examples.find(example => example.code === code.value)?.name || '';
    $('#examples').addEventListener('change', () => { const example = examples.find(item => item.name === $('#examples').value); if (example) useCode(example.code); });
    editor.paint(); await runAnalysis();
  } catch (error) { status(error.message); $('#analysis-summary').textContent = error.message; intro(panels.diagnostics, 'diagnostics'); const p = document.createElement('p'); p.className = 'empty'; p.textContent = error.message; panels.diagnostics.append(p); }
}
translateStatic(); init();
