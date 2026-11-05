const STRINGS = {
  'pt-BR': {
    'gate.input': 'Entrada',
    'gate.output': 'Saída',
    'gate.const': 'Constante',
    'gate.buffer': 'Buffer',
    'gate.toggle_aria': 'Entrada {bit}: valor {val}. Pressione Espaço ou Enter para alternar',
    'gate.output_aria': 'Saída {bit}: valor {val}',
    'gate.node_aria': 'Porta {op} ({name}): saída {val}',
    'explain.AND.1': '{formula} — ambas as entradas são 1',
    'explain.AND.0': '{formula} — exige que todas as entradas sejam 1',
    'explain.OR.1': '{formula} — pelo menos uma entrada é 1',
    'explain.OR.0': '{formula} — todas as entradas são 0',
    'explain.NOT': '{formula} — inverte a entrada {in0} para {out}',
    'explain.XOR.1': '{formula} — as entradas são diferentes',
    'explain.XOR.0': '{formula} — as entradas são iguais',
    'explain.NAND.0': '{formula} — ambas as entradas são 1 (AND invertido)',
    'explain.NAND.1': '{formula} — pelo menos uma entrada é 0 (AND invertido)',
    'explain.NOR.1': '{formula} — todas as entradas são 0 (OR invertido)',
    'explain.NOR.0': '{formula} — pelo menos uma entrada é 1 (OR invertido)',
    'explain.XNOR.1': '{formula} — as entradas são iguais (XOR invertido)',
    'explain.XNOR.0': '{formula} — as entradas são diferentes (XOR invertido)',
    'explain.BUF': '{formula} — copia o sinal de entrada sem alteração',
    'explain.CONST': 'CONST = {out} — nível lógico constante {out}',
    'explain.OUTPUT': 'Saída {net} = {out} — terminal recebe o sinal final ({out})',
  },
  'en': {
    'gate.input': 'Input',
    'gate.output': 'Output',
    'gate.const': 'Constant',
    'gate.buffer': 'Buffer',
    'gate.toggle_aria': 'Input {bit}: value {val}. Press Space or Enter to toggle',
    'gate.output_aria': 'Output {bit}: value {val}',
    'gate.node_aria': 'Gate {op} ({name}): output {val}',
    'explain.AND.1': '{formula} because both inputs are 1',
    'explain.AND.0': '{formula} because both inputs must be 1',
    'explain.OR.1': '{formula} because at least one input is 1',
    'explain.OR.0': '{formula} because all inputs are 0',
    'explain.NOT': '{formula} because it inverts {in0} to {out}',
    'explain.XOR.1': '{formula} because the inputs differ',
    'explain.XOR.0': '{formula} because the inputs are equal',
    'explain.NAND.0': '{formula} because both inputs are 1 (inverted AND)',
    'explain.NAND.1': '{formula} because at least one input is 0 (inverted AND)',
    'explain.NOR.1': '{formula} because all inputs are 0 (inverted OR)',
    'explain.NOR.0': '{formula} because at least one input is 1 (inverted OR)',
    'explain.XNOR.1': '{formula} because the inputs are equal (inverted XOR)',
    'explain.XNOR.0': '{formula} because the inputs differ (inverted XOR)',
    'explain.BUF': '{formula} because buffer copies the input signal unchanged',
    'explain.CONST': 'CONST = {out} — constant logic level {out}',
    'explain.OUTPUT': 'Output {net} = {out} — terminal receives final signal ({out})',
  },
  'es': {
    'gate.input': 'Entrada',
    'gate.output': 'Salida',
    'gate.const': 'Constante',
    'gate.buffer': 'Buffer',
    'gate.toggle_aria': 'Entrada {bit}: valor {val}. Pulse Espacio o Enter para alternar',
    'gate.output_aria': 'Salida {bit}: valor {val}',
    'gate.node_aria': 'Puerta {op} ({name}): salida {val}',
    'explain.AND.1': '{formula} — ambas entradas son 1',
    'explain.AND.0': '{formula} — requiere que ambas entradas sean 1',
    'explain.OR.1': '{formula} — al menos una entrada es 1',
    'explain.OR.0': '{formula} — todas las entradas son 0',
    'explain.NOT': '{formula} — invierte la entrada {in0} a {out}',
    'explain.XOR.1': '{formula} — las entradas son diferentes',
    'explain.XOR.0': '{formula} — las entradas son iguales',
    'explain.NAND.0': '{formula} — ambas entradas son 1 (AND invertido)',
    'explain.NAND.1': '{formula} — al menos una entrada es 0 (AND invertido)',
    'explain.NOR.1': '{formula} — todas las entradas son 0 (OR invertido)',
    'explain.NOR.0': '{formula} — al menos una entrada es 1 (OR invertido)',
    'explain.XNOR.1': '{formula} — las entradas son iguales (XOR invertido)',
    'explain.XNOR.0': '{formula} — las entradas son diferentes (XOR invertido)',
    'explain.BUF': '{formula} — copia la señal de entrada sin cambios',
    'explain.CONST': 'CONST = {out} — nivel lógico constante {out}',
    'explain.OUTPUT': 'Salida {net} = {out} — el terminal recibe la señal ({out})',
  },
  'fr': {
    'gate.input': 'Entrée',
    'gate.output': 'Sortie',
    'gate.const': 'Constante',
    'gate.buffer': 'Tampon',
    'gate.toggle_aria': 'Entrée {bit} : valeur {val}. Espace ou Entrée pour basculer',
    'gate.output_aria': 'Sortie {bit} : valeur {val}',
    'gate.node_aria': 'Porte {op} ({name}) : sortie {val}',
    'explain.AND.1': '{formula} car les deux entrées valent 1',
    'explain.AND.0': '{formula} car les deux entrées doivent valoir 1',
    'explain.OR.1': '{formula} car au moins une entrée vaut 1',
    'explain.OR.0': '{formula} car toutes les entrées valent 0',
    'explain.NOT': '{formula} car elle inverse {in0} en {out}',
    'explain.XOR.1': '{formula} car les entrées sont différentes',
    'explain.XOR.0': '{formula} car les entrées sont identiques',
    'explain.NAND.0': '{formula} car les deux entrées valent 1 (AND inversé)',
    'explain.NAND.1': '{formula} car au moins une entrée vaut 0 (AND inversé)',
    'explain.NOR.1': '{formula} car toutes les entrées valent 0 (OR inversé)',
    'explain.NOR.0': '{formula} car au moins une entrée vaut 1 (OR inversé)',
    'explain.XNOR.1': '{formula} car les entrées sont identiques (XOR inversé)',
    'explain.XNOR.0': '{formula} car les entrées sont différentes (XOR inversé)',
    'explain.BUF': '{formula} car le tampon copie le signal sans modification',
    'explain.CONST': 'CONST = {out} — niveau logique constant {out}',
    'explain.OUTPUT': 'Sortie {net} = {out} — la borne reçoit le signal ({out})',
  },
  'de': {
    'gate.input': 'Eingang',
    'gate.output': 'Ausgang',
    'gate.const': 'Konstante',
    'gate.buffer': 'Puffer',
    'gate.toggle_aria': 'Eingang {bit}: Wert {val}. Leertaste oder Eingabe zum Umschalten',
    'gate.output_aria': 'Ausgang {bit}: Wert {val}',
    'gate.node_aria': 'Gatter {op} ({name}): Ausgang {val}',
    'explain.AND.1': '{formula} — beide Eingänge sind 1',
    'explain.AND.0': '{formula} — beide Eingänge müssen 1 sein',
    'explain.OR.1': '{formula} — mindestens ein Eingang ist 1',
    'explain.OR.0': '{formula} — alle Eingänge sind 0',
    'explain.NOT': '{formula} — invertiert Eingang {in0} zu {out}',
    'explain.XOR.1': '{formula} — die Eingänge sind unterschiedlich',
    'explain.XOR.0': '{formula} — die Eingänge sind gleich',
    'explain.NAND.0': '{formula} — beide Eingänge sind 1 (invertiertes AND)',
    'explain.NAND.1': '{formula} — mindestens ein Eingang ist 0 (invertiertes AND)',
    'explain.NOR.1': '{formula} — alle Eingänge sind 0 (invertiertes OR)',
    'explain.NOR.0': '{formula} — mindestens ein Eingang ist 1 (invertiertes OR)',
    'explain.XNOR.1': '{formula} — die Eingänge sind gleich (invertiertes XOR)',
    'explain.XNOR.0': '{formula} — die Eingänge sind unterschiedlich (invertiertes XOR)',
    'explain.BUF': '{formula} — kopiert das Eingangssignal unverändert',
    'explain.CONST': 'CONST = {out} — konstanter Logikpegel {out}',
    'explain.OUTPUT': 'Ausgang {net} = {out} — Anschluss erhält Signal ({out})',
  },
  'zh-CN': {
    'gate.input': '输入',
    'gate.output': '输出',
    'gate.const': '常量',
    'gate.buffer': '缓冲器',
    'gate.toggle_aria': '输入 {bit}：当前值 {val}。按空格或回车切换',
    'gate.output_aria': '输出 {bit}：当前值 {val}',
    'gate.node_aria': '逻辑门 {op} ({name})：输出 {val}',
    'explain.AND.1': '{formula} — 两个输入均为 1',
    'explain.AND.0': '{formula} — 需要所有输入均为 1',
    'explain.OR.1': '{formula} — 至少有一个输入为 1',
    'explain.OR.0': '{formula} — 所有输入均为 0',
    'explain.NOT': '{formula} — 将输入 {in0} 反相为 {out}',
    'explain.XOR.1': '{formula} — 两个输入不同',
    'explain.XOR.0': '{formula} — 两个输入相同',
    'explain.NAND.0': '{formula} — 两个输入均为 1（与非门反相）',
    'explain.NAND.1': '{formula} — 至少有一个输入为 0（与非门）',
    'explain.NOR.1': '{formula} — 所有输入均为 0（或非门）',
    'explain.NOR.0': '{formula} — 至少有一个输入为 1（或非门）',
    'explain.XNOR.1': '{formula} — 两个输入相同（同或门）',
    'explain.XNOR.0': '{formula} — 两个输入不同（同或门）',
    'explain.BUF': '{formula} — 缓冲器直接传递输入信号',
    'explain.CONST': 'CONST = {out} — 恒定逻辑电平 {out}',
    'explain.OUTPUT': '输出 {net} = {out} — 终端接收信号 ({out})',
  },
  'ja': {
    'gate.input': '入力',
    'gate.output': '出力',
    'gate.const': '定数',
    'gate.buffer': 'バッファ',
    'gate.toggle_aria': '入力 {bit}: 値 {val}。スペースまたはEnterで切り替え',
    'gate.output_aria': '出力 {bit}: 値 {val}',
    'gate.node_aria': 'ゲート {op} ({name}): 出力 {val}',
    'explain.AND.1': '{formula} — 両方の入力が 1 のため',
    'explain.AND.0': '{formula} — 両方の入力が 1 である必要があるため',
    'explain.OR.1': '{formula} — 少なくとも一方の入力が 1 のため',
    'explain.OR.0': '{formula} — すべての入力が 0 のため',
    'explain.NOT': '{formula} — 入力 {in0} を {out} に反転',
    'explain.XOR.1': '{formula} — 入力が互いに異なるため',
    'explain.XOR.0': '{formula} — 入力が互いに等しいため',
    'explain.NAND.0': '{formula} — 両方の入力が 1（NAND反転）',
    'explain.NAND.1': '{formula} — 少なくとも一方の入力が 0（NAND）',
    'explain.NOR.1': '{formula} — すべての入力が 0（NOR）',
    'explain.NOR.0': '{formula} — 少なくとも一方の入力が 1（NOR）',
    'explain.XNOR.1': '{formula} — 入力が等しいため（XNOR）',
    'explain.XNOR.0': '{formula} — 入力が異なるため（XNOR）',
    'explain.BUF': '{formula} — 入力信号をそのまま伝達',
    'explain.CONST': 'CONST = {out} — 定数論理値 {out}',
    'explain.OUTPUT': '出力 {net} = {out} — 出力端子が信号 ({out}) を受信',
  },
};

export const SVG_NS = 'http://www.w3.org/2000/svg';

let externalI18n = null;
import('./i18n.js').then(mod => { externalI18n = mod; }).catch(() => {});

export function getActiveLang() {
  const raw = (typeof document !== 'undefined' && document.documentElement.lang) ||
              (typeof navigator !== 'undefined' && navigator.language) || 'pt-BR';
  if (STRINGS[raw]) return raw;
  const lower = raw.toLowerCase();
  if (lower.startsWith('pt')) return 'pt-BR';
  if (lower.startsWith('zh')) return 'zh-CN';
  if (lower.startsWith('es')) return 'es';
  if (lower.startsWith('fr')) return 'fr';
  if (lower.startsWith('de')) return 'de';
  if (lower.startsWith('ja')) return 'ja';
  if (lower.startsWith('en')) return 'en';
  return 'pt-BR';
}

export function translate(dict, key, params = {}) {
  const extFn = externalI18n?.t || (typeof window !== 'undefined' && typeof window.t === 'function' ? window.t : null);
  if (extFn) {
    try {
      const res = extFn(key, params);
      if (res && res !== key) return res;
    } catch {}
  }
  const lang = getActiveLang();
  const table = dict[lang] || dict['pt-BR'] || dict.en || {};
  let template = table[key] ?? dict['pt-BR']?.[key] ?? dict.en?.[key] ?? key;
  for (const [k, v] of Object.entries(params)) {
    template = template.replaceAll(`{${k}}`, String(v));
  }
  return template;
}

const t = (key, params) => translate(STRINGS, key, params);

export function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v != null && v !== false) el.setAttribute(k, String(v));
  }
  return el;
}

export const GATE_METRICS = {
  input:  { width: 108, height: 42, outX: 60, inX: -54 },
  output: { width: 100, height: 42, outX: 50, inX: -56 },
  const:  { width: 76,  height: 38, outX: 46, inX: -38 },
  gate:   { width: 76,  height: 52, outX: 46, inX: -46, portSpread: 13 },
};

export function getNodePorts(node) {
  if (node.type === 'input') {
    return {
      width: GATE_METRICS.input.width,
      height: GATE_METRICS.input.height,
      inputs: [],
      output: { x: GATE_METRICS.input.outX, y: 0 },
    };
  }
  if (node.type === 'const') {
    return {
      width: GATE_METRICS.const.width,
      height: GATE_METRICS.const.height,
      inputs: [],
      output: { x: GATE_METRICS.const.outX, y: 0 },
    };
  }
  if (node.type === 'output') {
    return {
      width: GATE_METRICS.output.width,
      height: GATE_METRICS.output.height,
      inputs: [{ x: GATE_METRICS.output.inX, y: 0 }],
      output: null,
    };
  }
  const count = (node.inputs || []).length;
  const spread = GATE_METRICS.gate.portSpread;
  const inputs = count <= 1
    ? [{ x: GATE_METRICS.gate.inX, y: 0 }]
    : [{ x: GATE_METRICS.gate.inX, y: -spread }, { x: GATE_METRICS.gate.inX, y: spread }];
  return {
    width: GATE_METRICS.gate.width,
    height: GATE_METRICS.gate.height,
    inputs,
    output: { x: GATE_METRICS.gate.outX, y: 0 },
  };
}

export function nodeDisplayName(node) {
  if (!node) return '?';
  return node.net || node.bit || node.label || node.id || '?';
}

export function formatFormula(node, inputValues, outputValue) {
  if (!node) return '';
  const outStr = outputValue === '?' || outputValue == null ? '?' : String(outputValue);
  if (node.type === 'input') return `${node.bit} = ${outStr}`;
  if (node.type === 'const') return `CONST = ${node.value}`;
  if (node.type === 'output') return `${node.bit} = ${outStr}`;
  const op = node.type === 'buffer' ? 'BUF' : (node.op || 'GATE');
  const args = (inputValues || []).map(v => (v === '?' || v == null ? '?' : String(v))).join(', ');
  const prefix = node.net ? `${node.net} = ` : '';
  return `${prefix}${op}(${args}) = ${outStr}`;
}

export function explainStep(step) {
  if (!step) return '';
  const out = step.output;
  const args = (step.inputs || []).map(i => i.value);
  const op = step.kind === 'buffer' ? 'BUF' : step.kind === 'const' ? 'CONST' : step.kind === 'output' ? 'OUTPUT' : (step.op || 'GATE');
  const formula = `${step.net ? `${step.net}: ` : ''}${op}(${args.join(', ')}) = ${out}`;
  if (op === 'OUTPUT') {
    return t('explain.OUTPUT', { net: step.net || step.node, out });
  }
  if (op === 'CONST') {
    return t('explain.CONST', { out });
  }
  if (op === 'BUF') {
    return t('explain.BUF', { formula, in0: args[0], out });
  }
  if (op === 'NOT') {
    return t('explain.NOT', { formula, in0: args[0], out });
  }
  const key = `explain.${op}.${out}`;
  return t(key, { formula, out });
}

export function drawNodeShape(group, node, state = {}) {
  const val = state.value ?? '?';
  const isHigh = val === 1;
  const isPending = val === '?';

  if (node.type === 'input') {
    drawInputSwitch(group, node, val, isHigh);
    return;
  }
  if (node.type === 'output') {
    drawOutputLamp(group, node, val, isHigh, isPending);
    return;
  }
  if (node.type === 'const') {
    drawConstNode(group, node, val, isHigh);
    return;
  }
  drawLogicGate(group, node, val, isHigh, isPending, state.outputTargets);
}

function drawInputSwitch(group, node, val, isHigh) {
  const outX = GATE_METRICS.input.outX;
  // Output pin stub
  group.append(svgEl('line', {
    x1: 50, y1: 0, x2: outX, y2: 0,
    class: `pin-stub ${isHigh ? 'val-1' : 'val-0'}`,
  }));
  group.append(svgEl('circle', {
    cx: outX, cy: 0, r: 2.5,
    class: `pin-dot ${isHigh ? 'val-1' : 'val-0'}`,
  }));

  // Switch body housing
  group.append(svgEl('rect', {
    x: -54, y: -21, width: 104, height: 42, rx: 8,
    class: `terminal-body input-terminal ${isHigh ? 'is-high' : 'is-low'}`,
  }));

  // Signal name on left
  const labelText = node.bit || node.label || node.id;
  const label = svgEl('text', {
    x: -44, y: 4.5,
    class: 'terminal-label',
    'text-anchor': 'start',
  });
  label.textContent = labelText.length > 7 ? labelText : labelText;
  group.append(label);

  // Switch track (pill)
  group.append(svgEl('rect', {
    x: 0, y: -9, width: 28, height: 18, rx: 9,
    class: `switch-track ${isHigh ? 'is-on' : 'is-off'}`,
  }));

  // Switch thumb circle
  group.append(svgEl('circle', {
    cx: isHigh ? 19 : 9, cy: 0, r: 6,
    class: `switch-thumb ${isHigh ? 'is-on' : 'is-off'}`,
  }));

  // Tabular value 0/1 on right
  const valText = svgEl('text', {
    x: 39, y: 4.5,
    class: `terminal-value ${isHigh ? 'val-1' : 'val-0'}`,
    'text-anchor': 'middle',
  });
  valText.textContent = String(val === '?' ? 0 : val);
  group.append(valText);
}

function drawOutputLamp(group, node, val, isHigh, isPending) {
  const inX = GATE_METRICS.output.inX;
  const valClass = isPending ? 'val-pending' : isHigh ? 'val-1' : 'val-0';

  // Input pin stub
  group.append(svgEl('line', {
    x1: inX, y1: 0, x2: -46, y2: 0,
    class: `pin-stub ${valClass}`,
  }));
  group.append(svgEl('circle', {
    cx: inX, cy: 0, r: 2.5,
    class: `pin-dot ${valClass}`,
  }));

  // Lamp housing pill
  group.append(svgEl('rect', {
    x: -46, y: -21, width: 96, height: 42, rx: 21,
    class: `terminal-body output-terminal ${valClass}`,
  }));

  // Indicator lamp ring + fill
  group.append(svgEl('circle', {
    cx: -23, cy: 0, r: 12,
    class: `output-lamp ${valClass}`,
  }));

  // Value text inside lamp (0 / 1 / ?)
  const lampVal = svgEl('text', {
    x: -23, y: 4.5,
    class: `lamp-value ${valClass}`,
    'text-anchor': 'middle',
  });
  lampVal.textContent = String(val);
  group.append(lampVal);

  // Output signal name
  const name = svgEl('text', {
    x: -4, y: 4.5,
    class: 'terminal-label output-label',
    'text-anchor': 'start',
  });
  name.textContent = node.bit || node.label || node.id;
  group.append(name);
}

function drawConstNode(group, node, val, isHigh) {
  const outX = GATE_METRICS.const.outX;
  const valClass = isHigh ? 'val-1' : 'val-0';
  group.append(svgEl('line', {
    x1: 36, y1: 0, x2: outX, y2: 0,
    class: `pin-stub ${valClass}`,
  }));
  group.append(svgEl('rect', {
    x: -36, y: -19, width: 72, height: 38, rx: 6,
    class: `terminal-body const-terminal ${valClass}`,
  }));
  const tag = svgEl('text', {
    x: -26, y: 4,
    class: 'gate-op-label',
    'text-anchor': 'start',
  });
  tag.textContent = 'CONST';
  group.append(tag);
  const v = svgEl('text', {
    x: 22, y: 5,
    class: `terminal-value ${valClass}`,
    'text-anchor': 'middle',
  });
  v.textContent = String(node.value ?? val);
  group.append(v);
}

function drawLogicGate(group, node, val, isHigh, isPending, outputTargets = []) {
  const op = node.type === 'buffer' ? 'BUF' : (node.op || 'AND');
  const hasBubble = op === 'NOT' || op === 'NAND' || op === 'NOR' || op === 'XNOR';
  const base = op === 'NAND' ? 'AND'
             : op === 'NOR'  ? 'OR'
             : op === 'XNOR' ? 'XOR'
             : op === 'NOT'  ? 'BUF'
             : op;

  const ports = getNodePorts(node);
  const valClass = isPending ? 'val-pending' : isHigh ? 'val-1' : 'val-0';

  // Input pin stubs aligned to wires
  for (const p of ports.inputs) {
    let stubEnd = -34;
    if (base === 'OR') stubEnd = -29;
    else if (base === 'XOR') stubEnd = -26;
    else if (base === 'BUF') stubEnd = -32;
    group.append(svgEl('line', {
      x1: p.x, y1: p.y, x2: stubEnd, y2: p.y,
      class: 'pin-stub',
    }));
  }

  // Output pin stub aligned to output wire
  const tipX = hasBubble ? 26 : 34;
  const stubStartX = hasBubble ? 36 : 34;
  group.append(svgEl('line', {
    x1: stubStartX, y1: 0, x2: ports.output.x, y2: 0,
    class: `pin-stub ${valClass}`,
  }));

  // Distinct ANSI gate path (width ~68px, height 50px, 2px stroke)
  let bodyPath = '';
  if (base === 'AND') {
    const arcX = hasBubble ? 1 : 9;
    bodyPath = `M -34 -25 L ${arcX} -25 A 25 25 0 0 1 ${arcX} 25 L -34 25 Z`;
  } else if (base === 'OR') {
    bodyPath = `M -34 -25 C -12 -25, 14 -17, ${tipX} 0 C 14 17, -12 25, -34 25 Q -20 0 -34 -25 Z`;
  } else if (base === 'XOR') {
    bodyPath = `M -29 -25 C -9 -25, 15 -17, ${tipX} 0 C 15 17, -9 25, -29 25 Q -16 0 -29 -25 Z`;
    group.append(svgEl('path', {
      d: 'M -37 -25 Q -24 0 -37 25',
      class: 'gate-xor-arc',
    }));
  } else {
    // NOT / BUF triangle
    bodyPath = `M -32 -23 L ${tipX} 0 L -32 23 Z`;
  }

  group.append(svgEl('path', {
    d: bodyPath,
    class: `gate-body ${valClass}`,
  }));

  if (hasBubble) {
    group.append(svgEl('circle', {
      cx: 31, cy: 0, r: 4.5,
      class: `gate-bubble ${valClass}`,
    }));
  }

  // Quiet operation name inside the gate body
  const opX = base === 'BUF' ? -13 : base === 'XOR' ? -5 : -7;
  const opLabel = svgEl('text', {
    x: opX, y: 4,
    class: 'gate-op-label',
    'text-anchor': 'middle',
  });
  opLabel.textContent = op;
  group.append(opLabel);

  // @delay badge below the gate body when node has delay
  if (node.delay != null) {
    const delayText = `${Number.isInteger(node.delay) ? node.delay.toFixed(1) : node.delay} ns`;
    const bw = Math.max(46, delayText.length * 6.6 + 12);
    const badgeG = svgEl('g', { class: 'gate-delay-badge', transform: 'translate(0, 36)' });
    badgeG.append(svgEl('rect', {
      x: -bw / 2, y: -9, width: bw, height: 17, rx: 4,
      class: 'delay-pill-bg',
    }));
    const dt = svgEl('text', {
      x: 0, y: 3,
      class: 'delay-pill-text',
      'text-anchor': 'middle',
    });
    dt.textContent = delayText;
    badgeG.append(dt);
    group.append(badgeG);
  }

  // If this gate drives a named internal wire that has no outgoing edges (e.g. dead/unused wire),
  // show the net name above the gate so it isn't lost.
  if (node.net && (!outputTargets || outputTargets.length === 0)) {
    const netText = svgEl('text', {
      x: 0, y: -31,
      class: 'wire-trunk-label',
      'text-anchor': 'middle',
    });
    netText.textContent = node.net;
    group.append(netText);
  }
}
