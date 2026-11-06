import {compare} from './api.js';
import {t} from './i18n.js';

const $ = selector => document.querySelector(selector);

export function createCompare() {
  const input = $('#compare-expression');
  const status = $('#compare-status');
  const diagnostics = $('#compare-diagnostics');
  const results = $('#compare-results');
  let first = '', validFirst = false, active = false, timer, sequence = 0, last = null;

  function clear() { diagnostics.replaceChildren(); results.replaceChildren(); status.className = 'compare-status'; }
  function showDiagnostic(item) {
    const source = input.value;
    const start = Math.max(0, Math.min(source.length, item.start ?? 0));
    const end = Math.max(start + 1, Math.min(source.length, (item.end ?? start) + 1));
    const card = document.createElement('div'); card.className = 'quick-error';
    const excerpt = document.createElement('div'); excerpt.className = 'quick-excerpt';
    excerpt.append(document.createTextNode(source.slice(0, start)));
    const mark = document.createElement('mark'); mark.textContent = source.slice(start, end) || ' ';
    excerpt.append(mark, document.createTextNode(source.slice(end)));
    const location = document.createElement('strong');
    location.textContent = t('compare.error_location', {line:item.line ?? 1, column:item.column ?? start + 1});
    const reason = document.createElement('p');
    reason.textContent = `${t('analysis.diagnostic.' + (item.stage === 'lexical' ? 'lexical' : 'syntactic'))} ${item.message}`;
    card.append(location, excerpt, reason);
    card.addEventListener('click', () => { input.focus(); input.setSelectionRange(start, end); });
    diagnostics.append(card);
  }
  function render() {
    clear();
    if (!active || !input.value.trim()) return;
    if (!validFirst) { status.textContent = t('compare.first_invalid'); return; }
    if (!last) { status.textContent = t('compare.checking'); return; }
    if (last.error) { status.textContent = t('compare.request_error', {error:last.error}); return; }
    if (!last.ok) {
      if (last.diagnostics?.first?.length) status.textContent = t('compare.first_invalid');
      else status.textContent = t('compare.second_invalid');
      for (const item of last.diagnostics?.second || []) showDiagnostic(item);
      return;
    }
    const verdict = document.createElement('p');
    verdict.className = 'compare-verdict';
    verdict.textContent = last.equivalent
      ? t('compare.equivalent', {rows:last.rows})
      : t('compare.different', {count:last.different_rows, rows:last.rows});
    status.classList.add(last.equivalent ? 'is-equivalent' : 'is-different');
    status.replaceChildren(verdict);
    if (last.equivalent) return;
    const box = document.createElement('div'); box.className = 'compare-table-scroll'; box.tabIndex = 0;
    box.setAttribute('role', 'region'); box.setAttribute('aria-label', t('compare.table_label'));
    const table = document.createElement('table'); table.className = 'compare-table';
    const head = document.createElement('thead'), headings = document.createElement('tr');
    for (const name of [...last.inputs, t('compare.first'), t('compare.second')]) {
      const cell = document.createElement('th'); cell.scope = 'col'; cell.textContent = name; headings.append(cell);
    }
    head.append(headings); table.append(head);
    const body = document.createElement('tbody');
    for (const difference of last.differences) {
      const row = document.createElement('tr');
      for (const value of [...difference.inputs, difference.first, difference.second]) {
        const cell = document.createElement('td'); cell.textContent = String(value); row.append(cell);
      }
      body.append(row);
    }
    table.append(body); box.append(table); results.append(box);
    if (last.different_rows > last.differences.length) {
      const more = document.createElement('p'); more.className = 'compare-more';
      more.textContent = t('compare.showing', {count:last.differences.length}); results.append(more);
    }
  }
  async function request() {
    const seq = ++sequence, currentFirst = first, currentSecond = input.value;
    if (!active || !validFirst || !currentSecond.trim()) return;
    try {
      const result = await compare(currentFirst, currentSecond);
      if (seq !== sequence || !active || first !== currentFirst || input.value !== currentSecond) return;
      last = result; render();
    } catch (error) {
      if (seq !== sequence || !active) return;
      last = {error:error.message}; render();
    }
  }
  function schedule() {
    clearTimeout(timer); ++sequence; last = null; render();
    if (active && validFirst && input.value.trim()) timer = setTimeout(request, 300);
  }
  input.addEventListener('input', () => {
    try { localStorage.setItem('circuito.compare', input.value); } catch {}
    schedule();
  });
  document.addEventListener('languagechange', render);
  try { input.value = localStorage.getItem('circuito.compare') || ''; } catch {}
  return {
    setFirst(value, valid) { first = value; validFirst = valid; schedule(); },
    setActive(value) { active = value; schedule(); }
  };
}
