import {t} from './i18n.js';

const diagnosticPatterns = [
  [/used before its declaration/i, 'before_declaration'],
  [/is not declared/i, 'undeclared'],
  [/already declared/i, 'duplicate'],
  [/cannot assign to input/i, 'input_assignment'],
  [/assigned more than once/i, 'multiple_drivers'],
  [/out of range for bus/i, 'bus_range'],
  [/cannot be used as a single bit/i, 'bus_index'],
  [/not a bus and cannot be indexed/i, 'scalar_index'],
  [/constant .* is not valid/i, 'constant'],
  [/output .* is never assigned/i, 'output_driver'],
  [/wire .* is read but never assigned/i, 'wire_driver'],
  [/combinational loop/i, 'loop'],
  [/bus width must be at least 1/i, 'bus_width'],
  [/input .* is never used/i, 'unused_input'],
  [/wire .* never used/i, 'unused_wire'],
];

function diagnosticKey(item) {
  if (item.stage === 'lexical') return 'lexical';
  if (item.stage === 'syntactic') return 'syntactic';
  return diagnosticPatterns.find(([pattern]) => pattern.test(item.message))?.[1] || 'general';
}

function sourceExcerpt(code, item) {
  const start = Math.max(0, Math.min(code.length, item.start ?? 0));
  const lineStart = code.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
  const lineEnd = code.indexOf('\n', start);
  const end = lineEnd < 0 ? code.length : lineEnd;
  const markedEnd = Math.max(start + 1, Math.min(end, (item.end ?? start) + 1));
  return {before:code.slice(lineStart, start), marked:code.slice(start, markedEnd), after:code.slice(markedEnd, end)};
}

function section(title, lines, kind = '') { return {title, lines, kind}; }
function countTree(node) { return node ? 1 + (node.children || []).reduce((count, child) => count + countTree(child), 0) : null; }
function countKinds(items) { return items.reduce((counts, kind) => ({...counts, [kind]:(counts[kind] || 0) + 1}), {}); }
function facts(a) {
  const nodes = a.circuit?.nodes || [], gates = nodes.filter(node => node.type === 'gate');
  return {tokens:a.tokens?.length || 0, token_kinds:countKinds((a.tokens || []).map(token => token.type)),
    cst_nodes:countTree(a.cst), ast_nodes:countTree(a.ast), gate_count:gates.length,
    gate_kinds:countKinds(gates.map(gate => gate.op)), inputs:a.inputs?.length || 0,
    outputs:a.outputs?.length || 0, wires:a.wires?.length || 0, ...a.summary};
}
function stageLines(a) {
  const s = facts(a), stages = a.stages || {}, lines = [];
  lines.push(t('analysis.lexical', {count:s.tokens ?? 0, kinds:Object.entries(s.token_kinds || {}).map(([kind, count]) => `${kind} × ${count}`).join(', ') || '—'}));
  if (stages.lexical === 'error') lines.push(t('analysis.failed', {stage:t('stage.lexical')}));
  if (stages.syntactic === 'ok') lines.push(t('analysis.syntax', {cst:s.cst_nodes, ast:s.ast_nodes}));
  else lines.push(t(stages.syntactic === 'blocked' ? 'analysis.blocked' : 'analysis.failed', {stage:t('stage.syntactic'), cause:t('stage.lexical')}));
  if (stages.semantic !== 'blocked') {
    const warnings = (a.diagnostics || []).filter(d => d.severity === 'warning').length;
    lines.push(t('analysis.semantic', {warnings}));
    if (stages.semantic === 'error') lines.push(t('analysis.failed', {stage:t('stage.semantic')}));
  }
  if (stages.semantic === 'ok') {
    lines.push(t('analysis.circuit', {count:s.gate_count, kinds:Object.entries(s.gate_kinds || {}).map(([kind, count]) => `${kind} × ${count}`).join(', ') || '—', depth:s.logic_depth ?? '—', inputs:s.inputs, outputs:s.outputs, wires:s.wires}));
  } else if (stages.semantic === 'blocked') lines.push(t('analysis.blocked', {stage:t('stage.semantic'), cause:t(`stage.${stages.lexical === 'error' ? 'lexical' : 'syntactic'}`)}));
  return lines;
}

function explainNode(node, depth = 0) {
  const children = node.children || [];
  const name = node.net || node.label || node.op || node.type;
  if (!children.length) return [`${'  '.repeat(depth)}${name} = ${node.value}${node.type === 'const' ? `. ${t('analysis.rule.CONST')}` : ''}`];
  const op = node.op || 'BUF';
  const args = children.map(child => `${child.net || child.label}=${child.value}`).join(', ');
  return [`${'  '.repeat(depth)}${name} = ${op}(${args}) = ${node.value}. ${t(`analysis.rule.${op}`)}`,
    ...children.flatMap(child => explainNode(child, depth + 1))];
}

function report(a, simulation, tableSummary) {
  const stages = a.stages || {}, name = a.name || a.ast?.label || t('analysis.name_unavailable');
  const failed = Object.entries(stages).find(([, state]) => state === 'error');
  const sections = [section(t('analysis.summary_title'), [failed
    ? t('analysis.verdict_failed', {name, stage:t(`stage.${failed[0]}`)})
    : t('analysis.verdict_valid', {name})]),
    section(t('analysis.stages_title'), stageLines(a))];
  if (a.diagnostics?.length) sections.push(section(t('analysis.diagnostics_title'), a.diagnostics.map(d => ({diagnostic:d, reason:t(`analysis.diagnostic.${diagnosticKey(d)}`)})), 'diagnostics'));
  if (a.summary?.equations?.length) {
    const lines = [...a.summary.equations];
    if (lines.some(eq => eq.includes('('))) lines.push(t('analysis.precedence'));
    sections.push(section(t('analysis.equations_title'), lines, 'equations'));
  }
  if (a.circuit) {
    const lines = simulation?.why
      ? Object.entries(simulation.why).flatMap(([bit, node]) => [`${bit} = ${node.value}`, ...explainNode(node, 1)])
      : [simulation ? t('analysis.why_unavailable') : t('analysis.await_simulation')];
    if (tableSummary) lines.push(`${t('analysis.table_summary')} ${tableSummary}`);
    sections.push(section(t('analysis.why_title'), lines, 'derivation'));
  }
  if (a.delays?.critical) {
    const path = a.delays.critical;
    sections.push(section(t('analysis.delays_title'), [t('analysis.critical', {path:path.path.join(' → '), time:path.time}), t('analysis.delay_note')]));
  }
  sections.push(section(t('analysis.limits_title'), [t('analysis.limits')]));
  return sections;
}

function appendText(parent, tag, value, className) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  el.textContent = value;
  parent.append(el);
  return el;
}

function exportText(sections, code, markdown = false) {
  return sections.map(({title, lines, kind}) => {
    const content = lines.map(line => {
      if (!line.diagnostic) return kind === 'equations' || kind === 'derivation' ? `    ${line}` : line;
      const d = line.diagnostic, excerpt = sourceExcerpt(code, d);
      return `${t('analysis.location', {line:d.line, column:d.column})}: ${line.reason}\n${d.message}\n${excerpt.before}${excerpt.marked}${excerpt.after}`;
    }).join('\n');
    return `${markdown ? '## ' : ''}${title}\n${content}`;
  }).join('\n\n') + '\n';
}

export function renderAnalysis(host, {analysis, simulation, code, selectSource, stale, tableSummary}) {
  const sections = report(analysis, simulation, tableSummary);
  host.classList.add('written-analysis');
  const actions = appendText(host, 'div', '', 'analysis-actions');
  const copy = appendText(actions, 'button', t('analysis.copy'));
  copy.type = 'button'; copy.disabled = stale;
  copy.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(exportText(sections, code)); copy.textContent = t('analysis.copied'); }
    catch { copy.textContent = t('analysis.copy_error'); }
  });
  const download = appendText(actions, 'button', t('analysis.download'));
  download.type = 'button'; download.disabled = stale;
  download.addEventListener('click', () => {
    const blob = new Blob([exportText(sections, code, true)], {type:'text/markdown;charset=utf-8'});
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = 'analise.md'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  for (const [index, part] of sections.entries()) {
    const block = document.createElement('section'); block.className = `analysis-section analysis-${part.kind || 'text'}`;
    appendText(block, 'span', String(index + 1).padStart(2, '0'), 'analysis-index');
    appendText(block, 'h3', part.title);
    if (part.kind === 'diagnostics') {
      for (const {diagnostic:d, reason} of part.lines) {
        const item = document.createElement('article'); item.className = 'analysis-diagnostic';
        appendText(item, 'strong', t('analysis.location', {line:d.line, column:d.column}));
        appendText(item, 'p', reason);
        appendText(item, 'p', d.message, 'analysis-compiler-message');
        const excerpt = sourceExcerpt(code, d), pre = document.createElement('pre');
        pre.append(document.createTextNode(excerpt.before));
        appendText(pre, 'mark', excerpt.marked || ' ', 'analysis-mark');
        pre.append(document.createTextNode(excerpt.after)); item.append(pre);
        const jump = appendText(item, 'button', t('analysis.goto'));
        jump.type = 'button'; jump.addEventListener('click', () => selectSource(d.start, d.end));
        block.append(item);
      }
    } else for (const line of part.lines) appendText(block, part.kind === 'equations' || part.kind === 'derivation' ? 'pre' : 'p', line);
    host.append(block);
  }
}
