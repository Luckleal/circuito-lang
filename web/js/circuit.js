import {
  SVG_NS,
  svgEl,
  GATE_METRICS,
  getNodePorts,
  nodeDisplayName,
  formatFormula,
  explainNodeRule,
  drawNodeShape,
  translate,
} from './gates.js';
import { createPlayerController, renderPlayerBar } from './player.js';

const STRINGS = {
  'pt-BR': {
    'circuit.empty': 'O circuito depende de uma análise sem erros léxicos, sintáticos ou semânticos.',
    'circuit.aria': 'Diagrama lógico interativo do circuito',
    'circuit.zoom_in': 'Aumentar zoom (+)',
    'circuit.zoom_out': 'Diminuir zoom (−)',
    'circuit.zoom_reset': 'Zoom 100% (0)',
    'circuit.fit': 'Ajustar',
    'circuit.fit_title': 'Ajustar circuito à tela (F ou duplo clique)',
    'circuit.critical_toggle': 'Caminho crítico',
    'circuit.critical_pill': 'caminho crítico {time} ns',
    'circuit.no_delays': 'sem @delay',
    'circuit.export_svg': 'SVG',
    'circuit.export_svg_title': 'Exportar circuito como SVG independente',
    'circuit.export_png': 'PNG',
    'circuit.export_png_title': 'Exportar circuito como imagem PNG',
    'circuit.inspector_title': 'Inspetor',
    'circuit.inspector_hint': 'Clique em uma porta ou fio para inspecionar operação, sinais e código.',
    'circuit.inspector_collapse': 'Recolher/expandir inspetor',
    'circuit.inspector_close': 'Fechar seleção (Esc)',
    'circuit.field_op': 'Operação',
    'circuit.field_inputs': 'Entradas',
    'circuit.field_output': 'Saída',
    'circuit.field_why': 'Por quê',
    'circuit.field_net': 'Rede (net)',
    'circuit.field_delay': 'Atraso',
    'circuit.show_code': 'Mostrar no código',
    'circuit.wire_aria': 'Fio {from} para {to}, valor {val}',
    'circuit.none': '—',
  },
  'en': {
    'circuit.empty': 'The circuit view requires an analysis without lexical, syntax, or semantic errors.',
    'circuit.aria': 'Interactive logic circuit diagram',
    'circuit.zoom_in': 'Zoom in (+)',
    'circuit.zoom_out': 'Zoom out (−)',
    'circuit.zoom_reset': 'Reset zoom 100% (0)',
    'circuit.fit': 'Fit',
    'circuit.fit_title': 'Fit circuit to panel (F or double-click)',
    'circuit.critical_toggle': 'Critical path',
    'circuit.critical_pill': 'critical path {time} ns',
    'circuit.no_delays': 'no @delay',
    'circuit.export_svg': 'SVG',
    'circuit.export_svg_title': 'Export standalone SVG diagram',
    'circuit.export_png': 'PNG',
    'circuit.export_png_title': 'Export PNG diagram',
    'circuit.inspector_title': 'Inspector',
    'circuit.inspector_hint': 'Click a gate or wire to inspect its operation, signals, and source.',
    'circuit.inspector_collapse': 'Collapse/expand inspector',
    'circuit.inspector_close': 'Clear selection (Esc)',
    'circuit.field_op': 'Operation',
    'circuit.field_inputs': 'Inputs',
    'circuit.field_output': 'Output',
    'circuit.field_why': 'Why',
    'circuit.field_net': 'Net name',
    'circuit.field_delay': 'Delay',
    'circuit.show_code': 'Show in code',
    'circuit.wire_aria': 'Wire {from} to {to}, value {val}',
    'circuit.none': '—',
  },
  'es': {
    'circuit.empty': 'El circuito requiere un análisis sin errores léxicos, sintácticos ni semánticos.',
    'circuit.aria': 'Diagrama lógico interactivo del circuito',
    'circuit.zoom_in': 'Acercar (+)',
    'circuit.zoom_out': 'Alejar (−)',
    'circuit.zoom_reset': 'Zoom 100% (0)',
    'circuit.fit': 'Ajustar',
    'circuit.fit_title': 'Ajustar circuito al panel (F o doble clic)',
    'circuit.critical_toggle': 'Camino crítico',
    'circuit.critical_pill': 'camino crítico {time} ns',
    'circuit.no_delays': 'sin @delay',
    'circuit.export_svg': 'SVG',
    'circuit.export_svg_title': 'Exportar circuito como SVG independiente',
    'circuit.export_png': 'PNG',
    'circuit.export_png_title': 'Exportar circuito como PNG',
    'circuit.inspector_title': 'Inspector',
    'circuit.inspector_hint': 'Haga clic en una puerta o cable para inspeccionar.',
    'circuit.inspector_collapse': 'Contraer/expandir inspector',
    'circuit.inspector_close': 'Cerrar selección (Esc)',
    'circuit.field_op': 'Operación',
    'circuit.field_inputs': 'Entradas',
    'circuit.field_output': 'Salida',
    'circuit.field_why': 'Por qué',
    'circuit.field_net': 'Red (net)',
    'circuit.field_delay': 'Retardo',
    'circuit.show_code': 'Mostrar en el código',
    'circuit.wire_aria': 'Cable {from} a {to}, valor {val}',
    'circuit.none': '—',
  },
  'fr': {
    'circuit.empty': 'Le circuit nécessite une analyse sans erreurs lexicales, syntaxiques ou sémantiques.',
    'circuit.aria': 'Schéma logique interactif du circuit',
    'circuit.zoom_in': 'Zoom avant (+)',
    'circuit.zoom_out': 'Zoom arrière (−)',
    'circuit.zoom_reset': 'Zoom 100% (0)',
    'circuit.fit': 'Ajuster',
    'circuit.fit_title': 'Ajuster à l’écran (F ou double-clic)',
    'circuit.critical_toggle': 'Chemin critique',
    'circuit.critical_pill': 'chemin critique {time} ns',
    'circuit.no_delays': 'sans @delay',
    'circuit.export_svg': 'SVG',
    'circuit.export_svg_title': 'Exporter le circuit en SVG autonome',
    'circuit.export_png': 'PNG',
    'circuit.export_png_title': 'Exporter le circuit en PNG',
    'circuit.inspector_title': 'Inspecteur',
    'circuit.inspector_hint': 'Cliquez sur une porte ou un fil pour l’inspecter.',
    'circuit.inspector_collapse': 'Réduire/développer l’inspecteur',
    'circuit.inspector_close': 'Effacer la sélection (Échap)',
    'circuit.field_op': 'Opération',
    'circuit.field_inputs': 'Entrées',
    'circuit.field_output': 'Sortie',
    'circuit.field_why': 'Pourquoi',
    'circuit.field_net': 'Fil (net)',
    'circuit.field_delay': 'Délai',
    'circuit.show_code': 'Afficher dans le code',
    'circuit.wire_aria': 'Fil {from} vers {to}, valeur {val}',
    'circuit.none': '—',
  },
  'de': {
    'circuit.empty': 'Die Schaltung erfordert eine fehlerfreie Analyse.',
    'circuit.aria': 'Interaktives Logikschaltbild',
    'circuit.zoom_in': 'Vergrößern (+)',
    'circuit.zoom_out': 'Verkleinern (−)',
    'circuit.zoom_reset': 'Zoom 100% (0)',
    'circuit.fit': 'Einpassen',
    'circuit.fit_title': 'Schaltung einpassen (F oder Doppelklick)',
    'circuit.critical_toggle': 'Kritischer Pfad',
    'circuit.critical_pill': 'kritischer Pfad {time} ns',
    'circuit.no_delays': 'kein @delay',
    'circuit.export_svg': 'SVG',
    'circuit.export_svg_title': 'Als eigenständiges SVG exportieren',
    'circuit.export_png': 'PNG',
    'circuit.export_png_title': 'Als PNG exportieren',
    'circuit.inspector_title': 'Inspektor',
    'circuit.inspector_hint': 'Klicken Sie auf ein Gatter oder eine Leitung zur Inspektion.',
    'circuit.inspector_collapse': 'Inspektor ein-/ausklappen',
    'circuit.inspector_close': 'Auswahl aufheben (Esc)',
    'circuit.field_op': 'Operation',
    'circuit.field_inputs': 'Eingänge',
    'circuit.field_output': 'Ausgang',
    'circuit.field_why': 'Warum',
    'circuit.field_net': 'Netz (net)',
    'circuit.field_delay': 'Verzögerung',
    'circuit.show_code': 'Im Code zeigen',
    'circuit.wire_aria': 'Leitung {from} nach {to}, Wert {val}',
    'circuit.none': '—',
  },
  'zh-CN': {
    'circuit.empty': '电路图需要在无词法、语法和语义错误后生成。',
    'circuit.aria': '交互式逻辑电路图',
    'circuit.zoom_in': '放大 (+)',
    'circuit.zoom_out': '缩小 (−)',
    'circuit.zoom_reset': '重置缩放 100% (0)',
    'circuit.fit': '适应屏幕',
    'circuit.fit_title': '适应画布大小（F 或双击）',
    'circuit.critical_toggle': '关键路径',
    'circuit.critical_pill': '关键路径 {time} ns',
    'circuit.no_delays': '无 @delay',
    'circuit.export_svg': 'SVG',
    'circuit.export_svg_title': '导出独立 SVG 文件',
    'circuit.export_png': 'PNG',
    'circuit.export_png_title': '导出 PNG 图像',
    'circuit.inspector_title': '检查器',
    'circuit.inspector_hint': '点击逻辑门或连线以查看运算、信号值及源码位置。',
    'circuit.inspector_collapse': '折叠/展开检查器',
    'circuit.inspector_close': '清除选择 (Esc)',
    'circuit.field_op': '运算',
    'circuit.field_inputs': '输入',
    'circuit.field_output': '输出',
    'circuit.field_why': '原因',
    'circuit.field_net': '信号网 (net)',
    'circuit.field_delay': '延迟',
    'circuit.show_code': '在代码中显示',
    'circuit.wire_aria': '从 {from} 到 {to} 的连线，值 {val}',
    'circuit.none': '—',
  },
  'ja': {
    'circuit.empty': '回路図を表示するには、エラーのない解析結果が必要です。',
    'circuit.aria': 'インタラクティブ論理回路図',
    'circuit.zoom_in': '拡大 (+)',
    'circuit.zoom_out': '縮小 (−)',
    'circuit.zoom_reset': '100% ズーム (0)',
    'circuit.fit': '全体表示',
    'circuit.fit_title': '画面に合わせる (F またはダブルクリック)',
    'circuit.critical_toggle': 'クリティカルパス',
    'circuit.critical_pill': 'クリティカルパス {time} ns',
    'circuit.no_delays': '@delay なし',
    'circuit.export_svg': 'SVG',
    'circuit.export_svg_title': 'スタンドアロン SVG をエクスポート',
    'circuit.export_png': 'PNG',
    'circuit.export_png_title': 'PNG 画像をエクスポート',
    'circuit.inspector_title': 'インスペクタ',
    'circuit.inspector_hint': 'ゲートや配線をクリックして詳細を表示します。',
    'circuit.inspector_collapse': 'インスペクタの折りたたみ',
    'circuit.inspector_close': '選択解除 (Esc)',
    'circuit.field_op': '演算',
    'circuit.field_inputs': '入力',
    'circuit.field_output': '出力',
    'circuit.field_why': '理由',
    'circuit.field_net': 'ネット名',
    'circuit.field_delay': '遅延',
    'circuit.show_code': 'コード内で表示',
    'circuit.wire_aria': '配線 {from} → {to}、値 {val}',
    'circuit.none': '—',
  },
};

const t = (key, params) => translate(STRINGS, key, params);

const CHIP_HIDE_ZOOM = 0.68;
const CORNER_RADIUS = 6;

// Persistent UI state across re-renders of the same circuit
const session = {
  signature: '',
  inputsSignature: '',
  transform: null,
  selectedId: null,       // node id or edge id
  selectedKind: null,     // 'node' | 'edge'
  inspectorCollapsed: false,
  criticalEnabled: false,
  pendingInputReset: false,
  lastRenderArgs: null,
  player: null,
};

function getCircuitSignature(circuit) {
  if (!circuit) return '';
  return `${circuit.name || ''}::${(circuit.nodes || []).map(n => `${n.id}:${n.op || n.type}:${n.delay ?? ''}`).join('|')}::${(circuit.edges || []).map(e => `${e.from}->${e.to}:${e.port}`).join('|')}`;
}

function getInputsSignature(simulation, fallbackInputs) {
  const obj = simulation?.inputs || fallbackInputs || {};
  return Object.keys(obj).sort().map(k => `${k}=${obj[k]}`).join('&');
}

// Compute critical path & total delay directly from circuit nodes/edges (matches simulator.analyze_timing)
function computeTimingInfo(circuit, externalCriticalNodes = []) {
  const nodes = circuit?.nodes || [];
  const byId = new Map(nodes.map(n => [n.id, n]));
  const hasAnyDelay = nodes.some(n => n.delay != null);
  if (!hasAnyDelay && (!externalCriticalNodes || !externalCriticalNodes.length)) {
    return { hasDelays: false, time: 0, criticalNodeIds: new Set(), criticalEdgeIds: new Set() };
  }

  const arrival = new Map();
  const depth = new Map();
  const slowestFrom = new Map();

  for (const n of nodes) {
    if (n.type === 'input' || n.type === 'const') {
      arrival.set(n.id, 0);
      depth.set(n.id, 0);
      continue;
    }
    if (n.type === 'output') {
      const src = (n.inputs || [])[0];
      arrival.set(n.id, arrival.get(src) ?? 0);
      depth.set(n.id, depth.get(src) ?? 0);
      slowestFrom.set(n.id, src);
      continue;
    }
    let bestKey = null;
    let bestSrc = null;
    for (const srcId of n.inputs || []) {
      const arr = arrival.get(srcId) ?? 0;
      const d = depth.get(srcId) ?? 0;
      if (!bestKey || arr > bestKey.arr || (arr === bestKey.arr && d > bestKey.d)) {
        bestKey = { arr, d };
        bestSrc = srcId;
      }
    }
    const baseArr = bestKey ? bestKey.arr : 0;
    const baseDepth = bestKey ? bestKey.d : 0;
    arrival.set(n.id, baseArr + (Number(n.delay) || 0));
    depth.set(n.id, baseDepth + 1);
    slowestFrom.set(n.id, bestSrc);
  }

  let critOut = null;
  for (const n of nodes) {
    if (n.type === 'output') {
      if (!critOut || (arrival.get(n.id) ?? 0) > (arrival.get(critOut.id) ?? 0)) {
        critOut = n;
      }
    }
  }

  const criticalNodeIds = new Set(externalCriticalNodes || []);
  let cur = critOut?.id;
  while (cur) {
    criticalNodeIds.add(cur);
    cur = slowestFrom.get(cur);
  }

  // Also ensure if externalCriticalNodes was passed, we connect its input & output terminal
  const criticalEdgeIds = new Set();
  for (const e of circuit.edges || []) {
    if (criticalNodeIds.has(e.from) && criticalNodeIds.has(e.to)) {
      criticalEdgeIds.add(e.id);
    }
  }

  const totalTime = critOut ? (arrival.get(critOut.id) ?? 0) : 0;
  return {
    hasDelays: true,
    time: totalTime,
    outputBit: critOut?.bit || null,
    criticalNodeIds,
    criticalEdgeIds,
  };
}

/**
 * Layered left-to-right layout with dummy passthrough corridors for long edges
 * and orthogonal channel routing with separate parallel vertical tracks.
 */
export function computeCircuitLayout(circuit) {
  const nodes = circuit.nodes || [];
  const edges = circuit.edges || [];
  const byId = new Map(nodes.map(n => [n.id, n]));

  // 1. Layer assignment: inputs & constants at layer 0; gates at longest path; outputs at rightmost layer
  const rawLayer = new Map();
  let maxGateLayer = 0;

  for (const n of nodes) {
    if (n.type === 'input' || n.type === 'const') {
      rawLayer.set(n.id, 0);
    }
  }
  // Propagate gate layers in topological order
  let changed = true;
  while (changed) {
    changed = false;
    for (const n of nodes) {
      if (n.type === 'input' || n.type === 'const' || n.type === 'output') continue;
      const pLayers = (n.inputs || []).map(id => rawLayer.get(id) ?? 0);
      const nextL = pLayers.length ? Math.max(...pLayers) + 1 : 1;
      if (rawLayer.get(n.id) !== nextL) {
        rawLayer.set(n.id, nextL);
        changed = true;
      }
      if (nextL > maxGateLayer) maxGateLayer = nextL;
    }
  }

  const outputLayer = Math.max(maxGateLayer + 1, 1);
  for (const n of nodes) {
    if (n.type === 'output') {
      rawLayer.set(n.id, outputLayer);
    }
  }

  const numLayers = outputLayer + 1;
  const layerItems = Array.from({ length: numLayers }, () => []);

  for (const n of nodes) {
    const l = rawLayer.get(n.id) ?? 0;
    layerItems[l].push({
      id: n.id,
      kind: 'real',
      node: n,
      layer: l,
      preds: [],
      succs: [],
    });
  }

  const itemById = new Map();
  for (const group of layerItems) {
    for (const it of group) itemById.set(it.id, it);
  }

  // 2. Split long edges across intermediate layers using one shared dummy corridor per (sourceNet, layer)
  // so wires of the same net share the trunk through intermediate layers and never cross through gate bodies.
  const dummyBySourceLayer = new Map();
  function getDummyItem(sourceId, layer) {
    const key = `${sourceId}@L${layer}`;
    if (dummyBySourceLayer.has(key)) return dummyBySourceLayer.get(key);
    const dummy = {
      id: `dummy:${key}`,
      kind: 'dummy',
      sourceId,
      layer,
      preds: [],
      succs: [],
    };
    dummyBySourceLayer.set(key, dummy);
    layerItems[layer].push(dummy);
    itemById.set(dummy.id, dummy);
    return dummy;
  }

  const edgeSegments = []; // per channel c: segments from layer c to layer c+1
  for (const edge of edges) {
    const uL = rawLayer.get(edge.from) ?? 0;
    const vL = rawLayer.get(edge.to) ?? outputLayer;
    let prevId = edge.from;
    for (let l = uL + 1; l <= vL; l++) {
      const isFinal = l === vL;
      const nextId = isFinal ? edge.to : getDummyItem(edge.from, l).id;
      const prevItem = itemById.get(prevId);
      const nextItem = itemById.get(nextId);
      const portOffset = isFinal
        ? ((byId.get(edge.to)?.inputs?.length || 1) > 1 ? (edge.port === 0 ? -0.18 : 0.18) : 0)
        : 0;
      if (prevItem && nextItem) {
        prevItem.succs.push({ id: nextId, offset: portOffset });
        nextItem.preds.push({ id: prevId, offset: portOffset });
      }
      edgeSegments.push({
        channel: l - 1,
        sourceId: edge.from,
        fromItemId: prevId,
        toItemId: nextId,
        edgeId: edge.id,
        port: isFinal ? edge.port : 0,
        isFinal,
      });
      prevId = nextId;
    }
  }

  // 3. Barycenter sweeps to minimize crossings while keeping Layer 0 (inputs) in declaration order
  const rankMap = new Map();
  const updateRanks = () => {
    for (const group of layerItems) {
      group.forEach((it, idx) => rankMap.set(it.id, idx));
    }
  };
  updateRanks();

  for (let sweep = 0; sweep < 6; sweep++) {
    // Forward sweep (layers 1 .. numLayers - 1)
    for (let l = 1; l < numLayers; l++) {
      // Keep outputs in declaration order if only 1-2 outputs, or sort internal layers + dummies
      if (l === outputLayer) continue;
      layerItems[l].sort((a, b) => {
        const bary = item => {
          if (!item.preds.length) return rankMap.get(item.id) ?? 0;
          const sum = item.preds.reduce((acc, p) => acc + ((rankMap.get(p.id) ?? 0) + p.offset), 0);
          return sum / item.preds.length;
        };
        return bary(a) - bary(b);
      });
      updateRanks();
    }
    // Backward sweep (layers numLayers - 2 .. 1)
    for (let l = numLayers - 2; l >= 1; l--) {
      layerItems[l].sort((a, b) => {
        const bary = item => {
          const pAvg = item.preds.length
            ? item.preds.reduce((acc, p) => acc + ((rankMap.get(p.id) ?? 0) + p.offset), 0) / item.preds.length
            : (rankMap.get(item.id) ?? 0);
          const sAvg = item.succs.length
            ? item.succs.reduce((acc, s) => acc + ((rankMap.get(s.id) ?? 0) - s.offset), 0) / item.succs.length
            : pAvg;
          return pAvg * 0.6 + sAvg * 0.4;
        };
        return bary(a) - bary(b);
      });
      updateRanks();
    }
  }

  // 4. Vertical coordinate assignment (y)
  const itemPos = new Map();
  const parseBus = bit => {
    const m = /^([^\[]+)\[(\d+)\]$/.exec(bit || '');
    return m ? { bus: m[1], idx: Number(m[2]) } : null;
  };

  // Initial vertical placement per layer
  let maxLayerHeight = 0;
  const layerHeights = layerItems.map((group, l) => {
    let y = 0;
    const ys = [];
    for (let i = 0; i < group.length; i++) {
      if (i > 0) {
        const prev = group[i - 1];
        const cur = group[i];
        if (l === 0 && prev.kind === 'real' && cur.kind === 'real') {
          const b1 = parseBus(prev.node.bit);
          const b2 = parseBus(cur.node.bit);
          y += b1 && b2 && b1.bus === b2.bus ? 66 : 88;
        } else if (prev.kind === 'dummy' && cur.kind === 'dummy') {
          y += 32;
        } else if (prev.kind === 'dummy' || cur.kind === 'dummy') {
          y += 58;
        } else {
          y += 94;
        }
      }
      ys.push(y);
    }
    const h = ys.length ? ys[ys.length - 1] : 0;
    if (h > maxLayerHeight) maxLayerHeight = h;
    return { ys, height: h };
  });

  const centerY = Math.max(150, maxLayerHeight / 2 + 65);
  layerItems.forEach((group, l) => {
    const { ys, height } = layerHeights[l];
    const offset = centerY - height / 2;
    group.forEach((it, i) => {
      itemPos.set(it.id, { x: 0, y: Math.round(ys[i] + offset) });
    });
  });

  // Vertical refinement pass for internal layers so gates & dummy corridors align cleanly with connected signals
  for (let iter = 0; iter < 4; iter++) {
    for (let l = 1; l < numLayers; l++) {
      const group = layerItems[l];
      for (const it of group) {
        const neighbors = [...it.preds.map(p => p.id), ...(l < outputLayer ? it.succs.map(s => s.id) : [])];
        if (!neighbors.length) continue;
        const targetY = neighbors.reduce((s, id) => s + (itemPos.get(id)?.y ?? centerY), 0) / neighbors.length;
        const curY = itemPos.get(it.id).y;
        itemPos.get(it.id).y = Math.round(curY * 0.35 + targetY * 0.65);
      }
      // Enforce minimum vertical separation within layer l
      for (let i = 1; i < group.length; i++) {
        const prev = group[i - 1];
        const cur = group[i];
        const minGap = prev.kind === 'dummy' && cur.kind === 'dummy' ? 28
                     : prev.kind === 'dummy' || cur.kind === 'dummy' ? 56
                     : 92;
        const py = itemPos.get(prev.id).y;
        const cy = itemPos.get(cur.id).y;
        if (cy - py < minGap) {
          itemPos.get(cur.id).y = py + minGap;
        }
      }
      // Re-center layer around centerY if it drifted
      if (group.length) {
        const firstY = itemPos.get(group[0].id).y;
        const lastY = itemPos.get(group[group.length - 1].id).y;
        const mid = (firstY + lastY) / 2;
        const shift = Math.round((centerY - mid) * 0.5);
        for (const it of group) itemPos.get(it.id).y += shift;
      }
    }
  }

  // 5. Horizontal layer positions (x) based on active channel tracks
  const channelNets = Array.from({ length: Math.max(1, numLayers - 1) }, () => new Map());
  for (const seg of edgeSegments) {
    const map = channelNets[seg.channel];
    if (!map.has(seg.sourceId)) {
      map.set(seg.sourceId, {
        sourceId: seg.sourceId,
        fromItemId: seg.fromItemId,
        targets: [],
      });
    }
    const entry = map.get(seg.sourceId);
    entry.targets.push(seg);
  }

  const layerX = [95];
  for (let c = 0; c < numLayers - 1; c++) {
    const netCount = channelNets[c].size;
    const extraTrackSpace = Math.max(0, netCount - 2) * 13;
    const gap = 154 + extraTrackSpace;
    layerX.push(layerX[c] + gap);
  }

  for (let l = 0; l < numLayers; l++) {
    for (const it of layerItems[l]) {
      itemPos.get(it.id).x = layerX[l];
    }
  }

  const pos = new Map();
  for (const n of nodes) {
    pos.set(n.id, itemPos.get(n.id));
  }

  // 6. Orthogonal channel routing with separate parallel vertical tracks & shared trunks
  const netRoutes = new Map(); // sourceId -> { trunkPaths: [], junctions: [{x,y}], labelPos: {x,y}, edgePaths: Map(edgeId -> {d, chipPos, from, to}) }
  for (const n of nodes) {
    netRoutes.set(n.id, {
      sourceId: n.id,
      trunkPaths: [],
      junctions: [],
      labelPos: null,
      edgePaths: new Map(),
    });
  }

  function getItemExitPoint(itemId) {
    const it = itemById.get(itemId);
    const p = itemPos.get(itemId);
    if (!it || !p) return { x: 0, y: 0 };
    if (it.kind === 'dummy') return { x: p.x + 12, y: p.y };
    const ports = getNodePorts(it.node);
    return { x: p.x + (ports.output?.x ?? 46), y: p.y + (ports.output?.y ?? 0) };
  }

  function getItemEntryPoint(itemId, port = 0) {
    const it = itemById.get(itemId);
    const p = itemPos.get(itemId);
    if (!it || !p) return { x: 0, y: 0 };
    if (it.kind === 'dummy') return { x: p.x - 12, y: p.y };
    const ports = getNodePorts(it.node);
    const pin = ports.inputs[port] || ports.inputs[0] || { x: -46, y: 0 };
    return { x: p.x + pin.x, y: p.y + pin.y };
  }

  // Also ensure dummy corridor horizontal continuation is drawn from x-12 to x+12
  for (const dummy of dummyBySourceLayer.values()) {
    const p = itemPos.get(dummy.id);
    const nr = netRoutes.get(dummy.sourceId);
    if (p && nr) {
      nr.trunkPaths.push(`M ${p.x - 12} ${p.y} L ${p.x + 12} ${p.y}`);
    }
  }

  for (let c = 0; c < numLayers - 1; c++) {
    const nets = [...channelNets[c].values()];
    if (!nets.length) continue;

    // Sort nets in this channel by start Y so tracks are assigned cleanly without unnecessary overlaps
    nets.forEach(net => {
      const startPt = getItemExitPoint(net.fromItemId);
      net.startPt = startPt;
      const targetPts = net.targets.map(seg => ({
        seg,
        pt: getItemEntryPoint(seg.toItemId, seg.port),
      }));
      // Deduplicate identical dummy targets in this channel
      const uniqueBranches = new Map();
      for (const tObj of targetPts) {
        const key = `${tObj.pt.x},${tObj.pt.y}`;
        if (!uniqueBranches.has(key)) uniqueBranches.set(key, { pt: tObj.pt, segs: [] });
        uniqueBranches.get(key).segs.push(tObj.seg);
      }
      net.branches = [...uniqueBranches.values()].sort((a, b) => a.pt.y - b.pt.y);
    });

    nets.sort((a, b) => a.startPt.y - b.startPt.y);

    const leftX = layerX[c] + 56;
    const rightX = layerX[c + 1] - 54;
    const channelSpan = Math.max(40, rightX - leftX);
    const trackStep = Math.min(18, Math.max(12, Math.floor(channelSpan / (nets.length + 1))));
    const totalTrackWidth = (nets.length - 1) * trackStep;
    const firstTrackX = Math.round((leftX + rightX) / 2 - totalTrackWidth / 2);

    nets.forEach((net, idx) => {
      const trackX = firstTrackX + idx * trackStep;
      const nr = netRoutes.get(net.sourceId);
      const sx = net.startPt.x;
      const sy = net.startPt.y;

      // Label position on the primary output trunk of the source gate/wire
      if (c === (rawLayer.get(net.sourceId) ?? 0) && !nr.labelPos) {
        nr.labelPos = { x: Math.round((sx + trackX) / 2), y: sy - 9 };
      }

      const branches = net.branches;
      if (branches.length === 1 && Math.abs(branches[0].pt.y - sy) < 1) {
        // Straight horizontal wire
        const ex = branches[0].pt.x;
        const d = `M ${sx} ${sy} L ${ex} ${sy}`;
        nr.trunkPaths.push(d);
        branches[0].branchD = d;
        return;
      }

      if (branches.length === 1) {
        // Single target with L-turn -> smooth rounded orthogonal path
        const ex = branches[0].pt.x;
        const ey = branches[0].pt.y;
        const d = buildRoundedOrthogonalPath(sx, sy, trackX, ey, ex);
        nr.trunkPaths.push(d);
        branches[0].branchD = d;
        return;
      }

      // Multi-branch fan-out in this channel: shared horizontal trunk to trackX, vertical spine, and horizontal branches
      const allYs = [sy, ...branches.map(b => b.pt.y)];
      const minY = Math.min(...allYs);
      const maxY = Math.max(...allYs);

      // Horizontal trunk from source exit to vertical spine
      nr.trunkPaths.push(`M ${sx} ${sy} L ${trackX} ${sy}`);
      // Vertical spine along trackX
      if (maxY > minY) {
        nr.trunkPaths.push(`M ${trackX} ${minY} L ${trackX} ${maxY}`);
      }

      // Determine which points on the vertical spine are 3+ way T-junctions
      const touchY = new Map();
      const addTouch = yVal => touchY.set(yVal, (touchY.get(yVal) || 0) + 1);
      addTouch(sy); // incoming trunk from left
      for (const b of branches) {
        addTouch(b.pt.y); // outgoing branch to right
        nr.trunkPaths.push(`M ${trackX} ${b.pt.y} L ${b.pt.x} ${b.pt.y}`);
        b.branchD = buildRoundedOrthogonalPath(sx, sy, trackX, b.pt.y, b.pt.x);
      }

      for (const [yVal, horizCount] of touchY.entries()) {
        const hasUp = yVal > minY;
        const hasDown = yVal < maxY;
        const degree = horizCount + (hasUp ? 1 : 0) + (hasDown ? 1 : 0);
        if (degree >= 3) {
          nr.junctions.push({ x: trackX, y: yVal });
        }
      }
    });
  }

  // Reconstruct full source-to-target path per edge (for pulses and individual wire selection)
  const segByEdgeChannel = new Map();
  for (const seg of edgeSegments) {
    segByEdgeChannel.set(`${seg.edgeId}@${seg.channel}`, seg);
  }

  for (const edge of edges) {
    const uL = rawLayer.get(edge.from) ?? 0;
    const vL = rawLayer.get(edge.to) ?? outputLayer;
    const parts = [];
    let endPt = null;
    for (let c = uL; c < vL; c++) {
      const net = channelNets[c].get(edge.from);
      const seg = segByEdgeChannel.get(`${edge.id}@${c}`);
      if (!net || !seg) continue;
      const targetPt = getItemEntryPoint(seg.toItemId, seg.port);
      const branch = net.branches.find(b => b.pt.x === targetPt.x && b.pt.y === targetPt.y);
      if (branch?.branchD) {
        parts.push(branch.branchD);
      }
      if (seg.isFinal) {
        endPt = targetPt;
      }
    }
    const fullD = joinSvgPathParts(parts);
    const toNode = byId.get(edge.to);
    const chipOffset = toNode?.type === 'output' ? 22 : 19;
    const chipPos = endPt ? { x: endPt.x - chipOffset, y: endPt.y } : null;
    netRoutes.get(edge.from)?.edgePaths.set(edge.id, {
      edge,
      d: fullD,
      chipPos,
    });
  }

  // 7. Identify bus groups in Layer 0 for bracket rendering
  const busGroups = [];
  const inputNodes = layerItems[0].filter(it => it.kind === 'real' && it.node.type === 'input').map(it => it.node);
  let curBus = null;
  for (const n of inputNodes) {
    const parsed = parseBus(n.bit);
    if (parsed) {
      if (!curBus || curBus.name !== parsed.bus) {
        curBus = { name: parsed.bus, nodes: [n], indices: [parsed.idx] };
        busGroups.push(curBus);
      } else {
        curBus.nodes.push(n);
        curBus.indices.push(parsed.idx);
      }
    } else {
      curBus = null;
    }
  }

  return {
    pos,
    byId,
    layerItems,
    netRoutes,
    busGroups: busGroups.filter(b => b.nodes.length >= 2),
  };
}

function buildRoundedOrthogonalPath(sx, sy, tx, ey, ex) {
  if (Math.abs(ey - sy) < 1) {
    return `M ${sx} ${sy} L ${ex} ${ey}`;
  }
  const dy = ey - sy;
  const signY = dy > 0 ? 1 : -1;
  const r = Math.min(CORNER_RADIUS, Math.abs(dy) / 2, Math.abs(tx - sx) / 2, Math.abs(ex - tx) / 2);
  if (r < 1.5) {
    return `M ${sx} ${sy} L ${tx} ${sy} L ${tx} ${ey} L ${ex} ${ey}`;
  }
  return [
    `M ${sx} ${sy}`,
    `L ${tx - r} ${sy}`,
    `Q ${tx} ${sy} ${tx} ${sy + signY * r}`,
    `L ${tx} ${ey - signY * r}`,
    `Q ${tx} ${ey} ${tx + r} ${ey}`,
    `L ${ex} ${ey}`,
  ].join(' ');
}

function joinSvgPathParts(parts) {
  // each part starts with its own `M`, so they are independent sub-paths of one <path>
  return parts.join(' ');
}

// Compute fan-in and fan-out sets for selection highlighting
function computeCone(circuit, selectedId, selectedKind) {
  const relNodes = new Set();
  const relEdges = new Set();
  if (!selectedId || !circuit) return { relNodes, relEdges };

  const edges = circuit.edges || [];
  const inEdges = new Map();
  const outEdges = new Map();
  for (const e of edges) {
    if (!inEdges.has(e.to)) inEdges.set(e.to, []);
    inEdges.get(e.to).push(e);
    if (!outEdges.has(e.from)) outEdges.set(e.from, []);
    outEdges.get(e.from).push(e);
  }

  const walkBack = nodeId => {
    if (relNodes.has(`back:${nodeId}`)) return;
    relNodes.add(`back:${nodeId}`);
    relNodes.add(nodeId);
    for (const e of inEdges.get(nodeId) || []) {
      relEdges.add(e.id);
      walkBack(e.from);
    }
  };

  const walkFwd = nodeId => {
    if (relNodes.has(`fwd:${nodeId}`)) return;
    relNodes.add(`fwd:${nodeId}`);
    relNodes.add(nodeId);
    for (const e of outEdges.get(nodeId) || []) {
      relEdges.add(e.id);
      walkFwd(e.to);
    }
  };

  if (selectedKind === 'edge') {
    const edge = edges.find(e => e.id === selectedId);
    if (edge) {
      relEdges.add(edge.id);
      walkBack(edge.from);
      walkFwd(edge.to);
    }
  } else {
    walkBack(selectedId);
    walkFwd(selectedId);
  }

  return { relNodes, relEdges };
}

function dispatchSourceSelection(span, onSelect) {
  if (!span || span.length < 2) return;
  const [start, end] = span;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('circuit:select-source', {
      detail: { start, end },
    }));
  }
  onSelect?.(start, end);
}

function triggerInputToggle(bit, nextVal, host, options) {
  session.pendingInputReset = true;
  if (typeof options?.onToggleInput === 'function') {
    options.onToggleInput(bit, nextVal);
    return;
  }
  if (typeof options?.applyInputs === 'function') {
    options.applyInputs({ [bit]: nextVal });
    return;
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('circuit:toggle-input', {
      detail: { bit, value: nextVal, inputs: { [bit]: nextVal } },
    }));
  }
  // Seamless fallback for existing main.js: click the matching .bit-toggle button in #panel-circuit
  const panel = host.closest('#panel-circuit') || document;
  const buttons = panel.querySelectorAll('.input-groups .bit-toggle');
  for (const btn of buttons) {
    const label = btn.getAttribute('aria-label') || btn.textContent || '';
    if (label.startsWith(`${bit}:`) || label.startsWith(`${bit} `)) {
      btn.click();
      return;
    }
  }
}

export function renderCircuit(host, circuit, simulation, options = {}) {
  if (!host) return;
  session.lastRenderArgs = { host, circuit, simulation, options };

  // Tag parent panel so circuit.css can hide legacy duplicate controls from main.js while keeping .bit-toggle in DOM
  const parentPanel = host.closest('#panel-circuit');
  if (parentPanel) parentPanel.classList.add('has-enhanced-circuit');

  host.replaceChildren();
  if (!circuit || !circuit.nodes || !circuit.nodes.length) {
    const emptyP = document.createElement('p');
    emptyP.className = 'empty';
    emptyP.textContent = t('circuit.empty');
    host.append(emptyP);
    return;
  }

  const sig = getCircuitSignature(circuit);
  const inSig = getInputsSignature(simulation, options.inputs);
  const isNewCircuit = sig !== session.signature;

  if (!session.player) {
    session.player = createPlayerController(() => {
      if (session.lastRenderArgs) {
        renderCircuit(
          session.lastRenderArgs.host,
          session.lastRenderArgs.circuit,
          session.lastRenderArgs.simulation,
          session.lastRenderArgs.options,
        );
      }
    });
  }

  if (isNewCircuit) {
    session.signature = sig;
    session.inputsSignature = inSig;
    session.transform = null;
    session.selectedId = null;
    session.selectedKind = null;
    session.pendingInputReset = false;
    session.player.setSimulation(simulation, { resetToZero: false });
  } else if (inSig !== session.inputsSignature) {
    const shouldReset = session.pendingInputReset;
    session.inputsSignature = inSig;
    session.pendingInputReset = false;
    session.player.setSimulation(simulation, { resetToZero: shouldReset });
  } else if (simulation && session.player.getState().totalSteps === 0 && (simulation.steps?.length || 0) > 0) {
    session.player.setSimulation(simulation, { resetToZero: false });
  }

  const playerState = session.player.getState();
  const timing = computeTimingInfo(circuit, options.critical);
  if (options.critical && options.critical.length > 0 && isNewCircuit) {
    session.criticalEnabled = true;
  }

  const layoutData = computeCircuitLayout(circuit);
  const { pos, byId, layerItems, netRoutes, busGroups } = layoutData;

  // Value resolution based on current player step
  const getValue = nodeId => {
    const n = byId.get(nodeId);
    if (!n) return '?';
    if (n.type === 'const') return n.value ?? 0;
    if (n.type === 'input') {
      if (simulation?.values && nodeId in simulation.values) return simulation.values[nodeId];
      if (simulation?.inputs && n.bit in simulation.inputs) return simulation.inputs[n.bit];
      // Fallback: check legacy .bit-toggle aria-pressed
      if (parentPanel) {
        const btns = parentPanel.querySelectorAll('.input-groups .bit-toggle');
        for (const b of btns) {
          if ((b.textContent || '').startsWith(`${n.bit} `)) {
            return b.getAttribute('aria-pressed') === 'true' ? 1 : 0;
          }
        }
      }
      return 0;
    }
    if (!simulation) return '?';
    if (playerState.evaluatedNodeIds.has(nodeId)) {
      return simulation.values?.[nodeId] ?? '?';
    }
    return '?';
  };

  // Build main circuit workspace container
  const shell = document.createElement('div');
  shell.className = 'circuit-workspace';

  // Top toolbar: Critical Path toggle + summary pill on left; Zoom / Fit / Export SVG / PNG on right
  const toolbar = document.createElement('div');
  toolbar.className = 'circuit-toolbar';

  const leftTools = document.createElement('div');
  leftTools.className = 'circuit-toolbar-group';

  const critBtn = document.createElement('button');
  critBtn.type = 'button';
  critBtn.className = `circuit-tool-btn critical-toggle-btn ${session.criticalEnabled && timing.hasDelays ? 'is-active' : ''}`;
  critBtn.disabled = !timing.hasDelays;
  critBtn.title = t('circuit.critical_toggle');
  critBtn.setAttribute('aria-label', t('circuit.critical_toggle'));
  critBtn.setAttribute('aria-pressed', String(Boolean(session.criticalEnabled && timing.hasDelays)));
  critBtn.innerHTML = `<span class="crit-dot" aria-hidden="true"></span><svg class="tool-icon" viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="1.5,9.5 4.8,9.5 6.8,3.8 9.4,12.2 11.4,8 14.5,8"/></svg><span class="btn-label">${t('circuit.critical_toggle')}</span>`;
  critBtn.onclick = () => {
    session.criticalEnabled = !session.criticalEnabled;
    renderCircuit(host, circuit, simulation, options);
  };
  leftTools.append(critBtn);

  if (timing.hasDelays) {
    const critPill = document.createElement('span');
    critPill.className = `circuit-crit-pill ${session.criticalEnabled ? 'is-active' : ''}`;
    const timeStr = Number.isInteger(timing.time) ? timing.time.toFixed(1) : String(timing.time);
    critPill.innerHTML = `<span class="crit-pill-full">${t('circuit.critical_pill', { time: timeStr })}</span><span class="crit-pill-short">${timeStr} ns</span>`;
    leftTools.append(critPill);
  } else {
    const noDelayPill = document.createElement('span');
    noDelayPill.className = 'circuit-crit-pill is-muted';
    noDelayPill.textContent = t('circuit.no_delays');
    leftTools.append(noDelayPill);
  }

  const rightTools = document.createElement('div');
  rightTools.className = 'circuit-toolbar-group';

  const btnZoomOut = document.createElement('button');
  btnZoomOut.type = 'button';
  btnZoomOut.className = 'circuit-tool-btn icon-only';
  btnZoomOut.title = t('circuit.zoom_out');
  btnZoomOut.setAttribute('aria-label', t('circuit.zoom_out'));
  btnZoomOut.textContent = '−';

  const btnZoomIn = document.createElement('button');
  btnZoomIn.type = 'button';
  btnZoomIn.className = 'circuit-tool-btn icon-only';
  btnZoomIn.title = t('circuit.zoom_in');
  btnZoomIn.setAttribute('aria-label', t('circuit.zoom_in'));
  btnZoomIn.textContent = '+';

  const btnFit = document.createElement('button');
  btnFit.type = 'button';
  btnFit.className = 'circuit-tool-btn fit-btn';
  btnFit.title = t('circuit.fit_title');
  btnFit.setAttribute('aria-label', t('circuit.fit_title'));
  btnFit.innerHTML = `<svg class="tool-icon" viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 6V3.5a1 1 0 0 1 1-1H6M10 2.5h2.5a1 1 0 0 1 1 1V6M13.5 10v2.5a1 1 0 0 1-1 1H10M6 13.5H3.5a1 1 0 0 1-1-1V10"/></svg><span class="btn-label">${t('circuit.fit')}</span>`;

  const btnSvg = document.createElement('button');
  btnSvg.type = 'button';
  btnSvg.className = 'circuit-tool-btn export-btn';
  btnSvg.title = t('circuit.export_svg_title');
  btnSvg.setAttribute('aria-label', t('circuit.export_svg_title'));
  btnSvg.innerHTML = `<svg class="tool-icon" viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 2.5v7.5M5 7.5L8 10.5 11 7.5M3 13h10"/></svg><span class="btn-label">${t('circuit.export_svg')}</span>`;

  const btnPng = document.createElement('button');
  btnPng.type = 'button';
  btnPng.className = 'circuit-tool-btn export-btn';
  btnPng.title = t('circuit.export_png_title');
  btnPng.setAttribute('aria-label', t('circuit.export_png_title'));
  btnPng.innerHTML = `<svg class="tool-icon" viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="2.5" width="11" height="11" rx="1.5"/><circle cx="6" cy="6" r="1"/><path d="M3 12l3.5-3.5L9 11l2-2 2.5 2.5"/></svg><span class="btn-label">${t('circuit.export_png')}</span>`;

  rightTools.append(btnZoomOut, btnZoomIn, btnFit, btnSvg, btnPng);
  toolbar.append(leftTools, rightTools);

  // Canvas stage (SVG + Corner Inspector)
  const stage = document.createElement('div');
  stage.className = 'circuit-stage';

  const { relNodes, relEdges } = computeCone(circuit, session.selectedId, session.selectedKind);
  const hasSelection = Boolean(session.selectedId);

  const svg = svgEl('svg', {
    class: `circuit-svg ${hasSelection ? 'has-selection' : ''}`,
    role: 'group',
    tabindex: '0',
    'aria-label': t('circuit.aria'),
  });

  const world = svgEl('g', { 'data-world': '' });
  const busLayer = svgEl('g', { class: 'layer-buses' });
  const wiresLayer = svgEl('g', { class: 'layer-wires' });
  const chipsLayer = svgEl('g', { class: 'layer-chips' });
  const nodesLayer = svgEl('g', { class: 'layer-nodes' });
  world.append(busLayer, wiresLayer, chipsLayer, nodesLayer);
  svg.append(world);

  // 1. Render Bus Brackets in Layer 0
  for (const bus of busGroups) {
    const firstP = pos.get(bus.nodes[0].id);
    const lastP = pos.get(bus.nodes[bus.nodes.length - 1].id);
    if (!firstP || !lastP) continue;
    const bx = firstP.x - 70;
    const topY = firstP.y - 18;
    const botY = lastP.y + 18;
    const midY = (topY + botY) / 2;
    const bg = svgEl('g', { class: 'bus-bracket-group' });
    bg.append(svgEl('path', {
      d: `M ${bx + 7} ${topY} L ${bx} ${topY} L ${bx} ${botY} L ${bx + 7} ${botY}`,
      class: 'bus-bracket-path',
    }));
    bg.append(svgEl('line', {
      x1: bx - 5, y1: midY, x2: bx, y2: midY,
      class: 'bus-bracket-path',
    }));
    const minIdx = Math.min(...bus.indices);
    const maxIdx = Math.max(...bus.indices);
    const busLabel = svgEl('text', {
      x: bx - 9, y: midY + 4,
      class: 'bus-bracket-label',
      'text-anchor': 'end',
    });
    busLabel.textContent = `${bus.name}[${maxIdx}:${minIdx}]`;
    bg.append(busLabel);
    busLayer.append(bg);
  }

  // Outgoing target map per node
  const outgoingMap = new Map();
  for (const e of circuit.edges || []) {
    if (!outgoingMap.has(e.from)) outgoingMap.set(e.from, []);
    outgoingMap.get(e.from).push(e.to);
  }

  const reducedMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const currentActiveNodeId = playerState.currentNodeId;
  const showActivePulse = playerState.justStepped && !reducedMotion && Boolean(currentActiveNodeId);

  // 2. Render Wires (Shared Trunks, Junction Dots, Hit Paths, Pulses, Trunk Net Labels, Target Value Chips)
  for (const [sourceId, route] of netRoutes.entries()) {
    const srcNode = byId.get(sourceId);
    if (!srcNode) continue;
    const val = getValue(sourceId);
    const valClass = val === '?' ? 'val-pending' : val === 1 ? 'val-1' : 'val-0';
    const isNetCrit = session.criticalEnabled && timing.hasDelays && timing.criticalNodeIds.has(sourceId);

    const netEdges = [...route.edgePaths.values()];
    const isNetRelated = netEdges.some(ep => relEdges.has(ep.edge.id));
    const isNetSelected = netEdges.some(ep => session.selectedKind === 'edge' && session.selectedId === ep.edge.id) ||
                          (session.selectedKind === 'node' && session.selectedId === sourceId);

    // Draw shared trunk visual paths
    for (const td of route.trunkPaths) {
      wiresLayer.append(svgEl('path', {
        d: td,
        class: [
          'wire-trunk',
          valClass,
          isNetCrit ? 'is-critical' : '',
          isNetRelated ? 'is-related' : '',
          isNetSelected ? 'is-selected' : '',
        ].filter(Boolean).join(' '),
      }));
    }

    // Draw fan-out junction dots on the shared trunk
    for (const j of route.junctions) {
      wiresLayer.append(svgEl('circle', {
        cx: j.x, cy: j.y, r: 3.5,
        class: `wire-junction ${valClass} ${isNetCrit ? 'is-critical' : ''} ${isNetRelated ? 'is-related' : ''}`,
      }));
    }

    // Net name label on the trunk for internal named wires (e.g. t1, p, g1, g2, x, y)
    const isOutputOnlyNet = (circuit.nodes || []).some(n => n.type === 'output' && n.bit === srcNode.net && route.edgePaths.size === 1);
    if (srcNode.net && route.labelPos && !isOutputOnlyNet) {
      const textStr = srcNode.net;
      const pillW = Math.max(22, textStr.length * 7.2 + 10);
      const lx = route.labelPos.x;
      const ly = route.labelPos.y - 4;
      const lblG = svgEl('g', { class: `wire-net-badge ${isNetRelated ? 'is-related' : ''}` });
      lblG.append(svgEl('rect', {
        x: lx - pillW / 2, y: ly - 9, width: pillW, height: 15, rx: 3,
        class: 'wire-net-bg',
      }));
      const txt = svgEl('text', {
        x: lx, y: ly + 2.5,
        class: 'wire-trunk-label',
        'text-anchor': 'middle',
      });
      txt.textContent = textStr;
      lblG.append(txt);
      chipsLayer.append(lblG);
    }

    // Per-edge hit target, critical overlay, pulse animation & target value chip
    for (const { edge, d, chipPos } of netEdges) {
      if (!d) continue;
      const isEdgeCrit = session.criticalEnabled && timing.hasDelays && timing.criticalEdgeIds.has(edge.id);
      const isEdgeRelated = relEdges.has(edge.id);
      const isEdgeSelected = session.selectedKind === 'edge' && session.selectedId === edge.id;
      const isFeedingCurrent = currentActiveNodeId === edge.to;

      if (isEdgeCrit || isEdgeSelected || isFeedingCurrent) {
        wiresLayer.append(svgEl('path', {
          d,
          class: [
            'wire-branch-highlight',
            valClass,
            isEdgeCrit ? 'is-critical' : '',
            isEdgeSelected ? 'is-selected' : '',
            isFeedingCurrent ? 'is-active-input' : '',
            showActivePulse && isFeedingCurrent ? 'is-pulsing' : '',
          ].filter(Boolean).join(' '),
        }));
      }

      // Travelling signal pulse circle during step evaluation (respects prefers-reduced-motion)
      if (showActivePulse && isFeedingCurrent) {
        const dot = svgEl('circle', {
          r: 4.5,
          class: `wire-pulse-dot ${valClass}`,
        });
        const anim = svgEl('animateMotion', {
          dur: `${Math.max(0.18, Math.min(0.45, 0.36 / playerState.speed))}s`,
          repeatCount: '1',
          fill: 'freeze',
          path: d,
        });
        dot.append(anim);
        wiresLayer.append(dot);
      }

      // Accessible interactive wire hit area
      const targetNode = byId.get(edge.to);
      const hit = svgEl('path', {
        d,
        class: 'wire-hit',
        tabindex: '-1',
        role: 'button',
        'data-action': 'wire',
        'data-edge-id': edge.id,
        'aria-label': t('circuit.wire_aria', {
          from: nodeDisplayName(srcNode),
          to: nodeDisplayName(targetNode),
          val: String(val),
        }),
      });
      const selectWire = e => {
        e.stopPropagation();
        session.selectedId = edge.id;
        session.selectedKind = 'edge';
        renderCircuit(host, circuit, simulation, options);
      };
      hit.addEventListener('click', selectWire);
      wiresLayer.append(hit);

      // Value chip (0 / 1 / ?) sitting on wire near the target pin
      if (chipPos) {
        const chipG = svgEl('g', {
          class: `wire-chip ${valClass} ${isEdgeRelated ? 'is-related' : ''}`,
          transform: `translate(${chipPos.x}, ${chipPos.y})`,
        });
        chipG.append(svgEl('rect', {
          x: -9, y: -7.5, width: 18, height: 15, rx: 3.5,
          class: `wire-chip-bg ${valClass}`,
        }));
        const chipTxt = svgEl('text', {
          x: 0, y: 3.8,
          class: `wire-chip-text ${valClass}`,
          'text-anchor': 'middle',
        });
        chipTxt.textContent = String(val);
        chipG.append(chipTxt);
        chipsLayer.append(chipG);
      }
    }
  }

  // 3. Render Nodes (Input toggle switches, ANSI gates, Output indicator lamps)
  for (const n of circuit.nodes) {
    const p = pos.get(n.id);
    if (!p) continue;
    const val = getValue(n.id);
    const isCrit = session.criticalEnabled && timing.hasDelays && timing.criticalNodeIds.has(n.id);
    const isSelected = session.selectedKind === 'node' && session.selectedId === n.id;
    const isRelated = relNodes.has(n.id);
    const isCurrentStep = currentActiveNodeId === n.id;
    const isSettling = isCurrentStep && playerState.justStepped && !reducedMotion;

    const outer = svgEl('g', {
      transform: `translate(${p.x}, ${p.y})`,
      class: [
        'circuit-node-pos',
        isCrit ? 'is-critical' : '',
        isSelected ? 'is-selected' : '',
        isRelated ? 'is-related' : '',
        isCurrentStep ? 'is-current-step' : '',
        val === '?' ? 'is-pending' : '',
      ].filter(Boolean).join(' '),
      tabindex: '0',
      'data-action': 'node',
      'data-node-id': n.id,
      role: n.type === 'input' ? 'switch' : 'button',
      ...(n.type === 'input'
        ? {
            'aria-checked': String(val === 1),
            'aria-label': `${n.bit}: ${val}`,
          }
        : {
            'aria-label': `${n.op || n.type} ${nodeDisplayName(n)}: ${val}`,
          }),
    });

    const inner = svgEl('g', {
      class: `circuit-node-body ${isSettling ? 'is-settling' : ''}`,
    });

    drawNodeShape(inner, n, {
      value: val,
      outputTargets: outgoingMap.get(n.id) || [],
    });
    outer.append(inner);

    outer.addEventListener('click', e => {
      e.stopPropagation();
      if (n.type === 'input') {
        const nextVal = val === 1 ? 0 : 1;
        triggerInputToggle(n.bit, nextVal, host, options);
        return;
      }
      session.selectedId = n.id;
      session.selectedKind = 'node';
      renderCircuit(host, circuit, simulation, options);
    });

    outer.addEventListener('keydown', e => {
      if (n.type === 'input' && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        e.stopPropagation();
        const nextVal = val === 1 ? 0 : 1;
        triggerInputToggle(n.bit, nextVal, host, options);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        session.selectedId = n.id;
        session.selectedKind = 'node';
        renderCircuit(host, circuit, simulation, options);
        return;
      }
      if (['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        navigateNetlistKeyboard(n.id, e.key, circuit, layerItems, host, simulation, options);
      }
    });

    nodesLayer.append(outer);
  }

  // Clear selection when clicking blank canvas
  svg.addEventListener('click', e => {
    if (e.target === svg && session.selectedId) {
      session.selectedId = null;
      session.selectedKind = null;
      renderCircuit(host, circuit, simulation, options);
    }
  });

  // 4. Corner Inspector Panel (collapsible)
  const inspector = renderInspectorPanel(circuit, byId, getValue, options);
  stage.append(svg, inspector);

  // 5. Didactic Animation Player bar below the canvas
  const playerHost = document.createElement('div');
  renderPlayerBar(playerHost, session.player);

  shell.append(toolbar, stage, playerHost);
  host.append(shell);

  // 6. Wire up Pan/Zoom/Fit + Keyboard shortcuts + Export SVG/PNG
  const pz = setupCircuitPanZoom(stage, svg, world, {
    initialTransform: session.transform,
    onTransformChange(nextT) {
      session.transform = nextT;
    },
  });

  btnZoomIn.onclick = () => pz.zoom(1.22);
  btnZoomOut.onclick = () => pz.zoom(1 / 1.22);
  btnFit.onclick = () => pz.fit();
  btnSvg.onclick = () => exportCircuitSvg(svg, world, circuit.name || 'circuito');
  btnPng.onclick = () => exportCircuitPng(svg, world, circuit.name || 'circuito');

  // Canvas-level keyboard shortcuts (+, -, 0, F, Space, Esc, Arrows)
  svg.addEventListener('keydown', e => {
    if (e.target !== svg) return;
    if (e.key === ' ') {
      e.preventDefault();
      session.player.togglePlay();
    } else if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      pz.zoom(1.22);
    } else if (e.key === '-' || e.key === '_') {
      e.preventDefault();
      pz.zoom(1 / 1.22);
    } else if (e.key === '0') {
      e.preventDefault();
      pz.resetOneToOne();
    } else if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      pz.fit();
    } else if (e.key === 'Escape' && session.selectedId) {
      e.preventDefault();
      session.selectedId = null;
      session.selectedKind = null;
      renderCircuit(host, circuit, simulation, options);
    } else if (['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      e.preventDefault();
      const startId = session.selectedKind === 'node' && session.selectedId
        ? session.selectedId
        : circuit.nodes[0]?.id;
      if (startId) {
        navigateNetlistKeyboard(startId, e.key, circuit, layerItems, host, simulation, options);
      }
    }
  });
}

function navigateNetlistKeyboard(currentNodeId, key, circuit, layerItems, host, simulation, options) {
  const byId = new Map((circuit.nodes || []).map(n => [n.id, n]));
  const current = byId.get(currentNodeId);
  if (!current) return;

  let nextId = null;
  if (key === 'ArrowLeft') {
    if (current.inputs && current.inputs.length > 0) {
      nextId = current.inputs[0];
    }
  } else if (key === 'ArrowRight') {
    const outEdge = (circuit.edges || []).find(e => e.from === currentNodeId);
    if (outEdge) nextId = outEdge.to;
  } else if (key === 'ArrowUp' || key === 'ArrowDown') {
    for (const group of layerItems) {
      const realNodes = group.filter(it => it.kind === 'real').map(it => it.id);
      const idx = realNodes.indexOf(currentNodeId);
      if (idx !== -1) {
        const delta = key === 'ArrowDown' ? 1 : -1;
        const targetIdx = (idx + delta + realNodes.length) % realNodes.length;
        nextId = realNodes[targetIdx];
        break;
      }
    }
  }

  if (nextId && byId.has(nextId)) {
    session.selectedId = nextId;
    session.selectedKind = 'node';
    renderCircuit(host, circuit, simulation, options);
    const el = host.querySelector(`[data-node-id="${CSS.escape(nextId)}"]`);
    el?.focus();
  }
}

function renderInspectorPanel(circuit, byId, getValue, options) {
  const panel = document.createElement('aside');
  panel.className = `circuit-inspector ${session.inspectorCollapsed ? 'is-collapsed' : ''} ${session.selectedId ? 'has-target' : 'is-idle'}`;

  let targetNode = null;
  let edgeInfo = null;

  if (session.selectedKind === 'node' && session.selectedId) {
    targetNode = byId.get(session.selectedId);
  } else if (session.selectedKind === 'edge' && session.selectedId) {
    edgeInfo = (circuit.edges || []).find(e => e.id === session.selectedId);
    if (edgeInfo) targetNode = byId.get(edgeInfo.from);
  }

  if (!targetNode) {
    const hint = document.createElement('p');
    hint.className = 'inspector-idle-text';
    hint.textContent = t('circuit.inspector_hint');
    panel.append(hint);
    return panel;
  }

  const head = document.createElement('div');
  head.className = 'inspector-header';

  const title = document.createElement('strong');
  title.className = 'inspector-title';
  const opStr = targetNode.type === 'gate' ? targetNode.op
              : targetNode.type === 'buffer' ? 'BUF'
              : targetNode.type.toUpperCase();
  title.textContent = `${t('circuit.inspector_title')} · ${nodeDisplayName(targetNode)}`;

  const actions = document.createElement('div');
  actions.className = 'inspector-header-actions';

  const collapseBtn = document.createElement('button');
  collapseBtn.type = 'button';
  collapseBtn.className = 'inspector-icon-btn';
  collapseBtn.title = t('circuit.inspector_collapse');
  collapseBtn.setAttribute('aria-label', t('circuit.inspector_collapse'));
  collapseBtn.textContent = session.inspectorCollapsed ? '▾' : '▴';
  collapseBtn.onclick = () => {
    session.inspectorCollapsed = !session.inspectorCollapsed;
    panel.classList.toggle('is-collapsed', session.inspectorCollapsed);
    collapseBtn.textContent = session.inspectorCollapsed ? '▾' : '▴';
  };

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'inspector-icon-btn';
  closeBtn.title = t('circuit.inspector_close');
  closeBtn.setAttribute('aria-label', t('circuit.inspector_close'));
  closeBtn.textContent = '×';
  closeBtn.onclick = () => {
    session.selectedId = null;
    session.selectedKind = null;
    if (session.lastRenderArgs) {
      renderCircuit(
        session.lastRenderArgs.host,
        session.lastRenderArgs.circuit,
        session.lastRenderArgs.simulation,
        session.lastRenderArgs.options,
      );
    }
  };

  actions.append(collapseBtn, closeBtn);
  head.append(title, actions);
  panel.append(head);

  const body = document.createElement('div');
  body.className = 'inspector-body';

  const inputPairs = (targetNode.inputs || []).map(id => {
    const src = byId.get(id);
    return { name: nodeDisplayName(src), val: getValue(id) };
  });
  const outVal = getValue(targetNode.id);

  // Formula banner
  const formulaEl = document.createElement('div');
  formulaEl.className = 'inspector-formula';
  formulaEl.textContent = formatFormula(targetNode, inputPairs.map(p => p.val), outVal);
  body.append(formulaEl);

  const grid = document.createElement('dl');
  grid.className = 'inspector-grid';

  const addRow = (label, value, rowClass = '') => {
    const dt = document.createElement('dt');
    if (rowClass) dt.className = `${rowClass}-dt`;
    dt.textContent = label;
    const dd = document.createElement('dd');
    if (rowClass) dd.className = `${rowClass}-dd`;
    dd.textContent = value;
    grid.append(dt, dd);
  };

  addRow(t('circuit.field_op'), opStr);
  addRow(
    t('circuit.field_inputs'),
    inputPairs.length ? inputPairs.map(p => `${p.name} = ${p.val}`).join(', ') : t('circuit.none'),
  );
  addRow(t('circuit.field_output'), String(outVal));
  addRow(
    t('circuit.field_why'),
    explainNodeRule(targetNode, inputPairs.map(p => p.val), outVal),
    'inspector-why',
  );
  addRow(t('circuit.field_net'), targetNode.net || targetNode.bit || t('circuit.none'));
  addRow(
    t('circuit.field_delay'),
    targetNode.delay != null ? `${Number.isInteger(targetNode.delay) ? targetNode.delay.toFixed(1) : targetNode.delay} ns` : t('circuit.none'),
  );
  body.append(grid);

  if (targetNode.span && targetNode.span.length >= 2) {
    const codeBtn = document.createElement('button');
    codeBtn.type = 'button';
    codeBtn.className = 'inspector-code-btn';
    codeBtn.textContent = t('circuit.show_code');
    codeBtn.onclick = () => dispatchSourceSelection(targetNode.span, options.onSelect);
    body.append(codeBtn);
  }

  panel.append(body);
  return panel;
}

function setupCircuitPanZoom(stage, svg, world, { initialTransform, onTransformChange } = {}) {
  const state = initialTransform ? { ...initialTransform } : { x: 0, y: 0, scale: 1 };
  const pointers = new Map();
  let dragStart = null;
  let lastPinchDist = 0;
  let userAdjusted = Boolean(initialTransform);
  let lastBoxKey = '';

  function apply() {
    world.setAttribute('transform', `translate(${state.x} ${state.y}) scale(${state.scale})`);
    svg.classList.toggle('zoom-low', state.scale < CHIP_HIDE_ZOOM);
    onTransformChange?.({ ...state });
  }

  function fit() {
    const bounds = world.getBBox();
    const box = svg.getBoundingClientRect();
    if (!bounds.width || !box.width || !box.height) return false;
    lastBoxKey = `${Math.round(box.width)}x${Math.round(box.height)}`;
    const padX = box.width < 520 ? 22 : 48;
    const padY = box.height < 420 ? 22 : 48;
    const scaleX = (box.width - padX) / bounds.width;
    const scaleY = (box.height - padY) / bounds.height;
    const fitBoth = Math.min(scaleX, scaleY);

    state.scale = Math.min(1.35, Math.max(0.2, fitBoth));
    state.x = Math.round((box.width - bounds.width * state.scale) / 2 - bounds.x * state.scale);
    state.y = Math.round((box.height - bounds.height * state.scale) / 2 - bounds.y * state.scale);
    apply();
    return true;
  }

  function resetOneToOne() {
    userAdjusted = true;
    const bounds = world.getBBox();
    const box = svg.getBoundingClientRect();
    state.scale = 1;
    if (bounds.width && box.width) {
      state.x = Math.round((box.width - bounds.width) / 2 - bounds.x);
      state.y = Math.round((box.height - bounds.height) / 2 - bounds.y);
    }
    apply();
  }

  function zoom(factor, cx = svg.clientWidth / 2, cy = svg.clientHeight / 2) {
    userAdjusted = true;
    const next = Math.min(3.2, Math.max(0.2, state.scale * factor));
    state.x = cx - (cx - state.x) * (next / state.scale);
    state.y = cy - (cy - state.y) * (next / state.scale);
    state.scale = next;
    apply();
  }

  svg.addEventListener('wheel', e => {
    e.preventDefault();
    const rect = svg.getBoundingClientRect();
    const factor = e.deltaY < 0 ? 1.13 : 1 / 1.13;
    zoom(factor, e.clientX - rect.left, e.clientY - rect.top);
  }, { passive: false });

  svg.addEventListener('dblclick', e => {
    if (e.target.closest('[data-action]')) return;
    e.preventDefault();
    userAdjusted = false;
    fit();
  });

  svg.addEventListener('pointerdown', e => {
    if (e.target.closest('[data-action]')) return;
    svg.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dragStart = { x: e.clientX, y: e.clientY };
  });

  svg.addEventListener('pointermove', e => {
    if (!pointers.has(e.pointerId)) return;
    const prev = pointers.get(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (lastPinchDist > 0) {
        const rect = svg.getBoundingClientRect();
        zoom(dist / lastPinchDist, (a.x + b.x) / 2 - rect.left, (a.y + b.y) / 2 - rect.top);
      }
      lastPinchDist = dist;
    } else if (dragStart) {
      userAdjusted = true;
      state.x += e.clientX - prev.x;
      state.y += e.clientY - prev.y;
      apply();
    }
  });

  const endPointer = e => {
    pointers.delete(e.pointerId);
    dragStart = null;
    lastPinchDist = 0;
  };
  svg.addEventListener('pointerup', endPointer);
  svg.addEventListener('pointercancel', endPointer);

  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => {
      if (!svg.isConnected) {
        ro.disconnect();
        return;
      }
      const box = svg.getBoundingClientRect();
      if (!box.width || !box.height) return;
      const key = `${Math.round(box.width)}x${Math.round(box.height)}`;
      if (key !== lastBoxKey && (!userAdjusted || !lastBoxKey)) {
        fit();
      }
    });
    ro.observe(svg);
  }

  if (initialTransform) {
    const box = svg.getBoundingClientRect();
    if (box.width && box.height) {
      lastBoxKey = `${Math.round(box.width)}x${Math.round(box.height)}`;
    }
    apply();
  } else {
    requestAnimationFrame(fit);
  }

  return {
    fit() {
      userAdjusted = false;
      fit();
    },
    zoom,
    resetOneToOne,
  };
}

// Standalone SVG & PNG export with embedded dark theme styles
const STANDALONE_EXPORT_CSS = `
  svg { font-family: ui-monospace, "Cascadia Code", Consolas, monospace; background: #0b0b0c; }
  .bus-bracket-path { fill: none; stroke: #56565e; stroke-width: 1.5; }
  .bus-bracket-label { fill: #a1a1a6; font-size: 11.5px; font-weight: 600; }
  .wire-trunk, .wire-branch-highlight { fill: none; stroke: #63636b; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
  .wire-trunk.val-1, .wire-branch-highlight.val-1 { stroke: #5ac8fa; }
  .wire-trunk.val-pending { stroke: #3e3e44; stroke-dasharray: 4 4; }
  .wire-trunk.is-critical, .wire-branch-highlight.is-critical { stroke: #5ac8fa; stroke-width: 2.75; stroke-dasharray: 8 5; }
  .wire-junction { fill: #63636b; }
  .wire-junction.val-1 { fill: #5ac8fa; }
  .wire-net-bg { fill: #141416; stroke: #303035; stroke-width: 1; }
  .wire-trunk-label { fill: #a1a1a6; font-size: 11px; }
  .wire-chip-bg { fill: #141416; stroke: #303035; stroke-width: 1; }
  .wire-chip-bg.val-1 { stroke: #5ac8fa; fill: #0d222e; }
  .wire-chip-text { fill: #a1a1a6; font-size: 11px; font-weight: 600; font-variant-numeric: tabular-nums; }
  .wire-chip-text.val-1 { fill: #5ac8fa; }
  .pin-stub { stroke: #63636b; stroke-width: 2; stroke-linecap: round; }
  .pin-stub.val-1 { stroke: #5ac8fa; }
  .pin-dot { fill: #63636b; }
  .pin-dot.val-1 { fill: #5ac8fa; }
  .terminal-body, .gate-body, .gate-bubble { fill: #1c1c1f; stroke: #3a3a40; stroke-width: 2; stroke-linejoin: round; }
  .gate-xor-arc { fill: none; stroke: #3a3a40; stroke-width: 2; stroke-linecap: round; }
  .terminal-body.is-high, .gate-body.val-1, .gate-bubble.val-1 { stroke: #5ac8fa; }
  .terminal-label { fill: #f2f2f3; font-size: 12.5px; font-weight: 600; }
  .terminal-value { fill: #a1a1a6; font-size: 13px; font-weight: 700; font-variant-numeric: tabular-nums; }
  .terminal-value.val-1 { fill: #5ac8fa; }
  .switch-track { fill: #101012; stroke: #3a3a40; stroke-width: 1.5; }
  .switch-track.is-on { fill: #0f2c3c; stroke: #5ac8fa; }
  .switch-thumb { fill: #8e8e96; }
  .switch-thumb.is-on { fill: #5ac8fa; }
  .output-lamp { fill: #101012; stroke: #3a3a40; stroke-width: 1.75; }
  .output-lamp.val-1 { fill: #5ac8fa; stroke: #5ac8fa; }
  .lamp-value { fill: #a1a1a6; font-size: 12px; font-weight: 700; font-variant-numeric: tabular-nums; }
  .lamp-value.val-1 { fill: #06131b; }
  .gate-op-label { fill: #a1a1a6; font-size: 10.5px; font-weight: 600; letter-spacing: 0.03em; }
  .delay-pill-bg { fill: #141416; stroke: #3a3a40; stroke-width: 1; }
  .delay-pill-text { fill: #a1a1a6; font-size: 10.5px; font-variant-numeric: tabular-nums; }
  .wire-hit { display: none; }
`;

function buildStandaloneSvgString(svg, world) {
  const bounds = world.getBBox();
  const pad = 32;
  const vx = Math.floor(bounds.x - pad);
  const vy = Math.floor(bounds.y - pad);
  const vw = Math.ceil(bounds.width + pad * 2) || 600;
  const vh = Math.ceil(bounds.height + pad * 2) || 400;

  const clone = svg.cloneNode(true);
  clone.setAttribute('xmlns', SVG_NS);
  clone.setAttribute('viewBox', `${vx} ${vy} ${vw} ${vh}`);
  clone.setAttribute('width', String(vw));
  clone.setAttribute('height', String(vh));
  clone.classList.remove('zoom-low', 'has-selection');

  const cloneWorld = clone.querySelector('[data-world]');
  if (cloneWorld) cloneWorld.removeAttribute('transform');

  const styleEl = document.createElementNS(SVG_NS, 'style');
  styleEl.textContent = STANDALONE_EXPORT_CSS;
  const bgRect = svgEl('rect', {
    x: vx, y: vy, width: vw, height: vh, fill: '#0b0b0c',
  });
  clone.insertBefore(bgRect, clone.firstChild);
  clone.insertBefore(styleEl, clone.firstChild);

  return {
    svgText: new XMLSerializer().serializeToString(clone),
    width: vw,
    height: vh,
  };
}

function triggerBlobDownload(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function exportCircuitSvg(svg, world, name) {
  const { svgText } = buildStandaloneSvgString(svg, world);
  const safeName = (name || 'circuito').replace(/[^a-z0-9_-]+/gi, '_');
  const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
  triggerBlobDownload(`${safeName}.svg`, blob);
}

function exportCircuitPng(svg, world, name) {
  const { svgText, width, height } = buildStandaloneSvgString(svg, world);
  const safeName = (name || 'circuito').replace(/[^a-z0-9_-]+/gi, '_');
  const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  const img = new Image();
  img.onload = () => {
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0b0b0c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    canvas.toBlob(pngBlob => {
      if (pngBlob) triggerBlobDownload(`${safeName}.png`, pngBlob);
    }, 'image/png');
  };
  img.onerror = () => URL.revokeObjectURL(url);
  img.src = url;
}

// Re-render automatically if <html lang> changes (i18n switch)
if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
  const langObserver = new MutationObserver(() => {
    if (session.lastRenderArgs && session.lastRenderArgs.host.isConnected) {
      renderCircuit(
        session.lastRenderArgs.host,
        session.lastRenderArgs.circuit,
        session.lastRenderArgs.simulation,
        session.lastRenderArgs.options,
      );
    }
  });
  langObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
}
