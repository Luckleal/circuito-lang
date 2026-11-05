import { table as fetchTable } from './api.js';
import { translate } from './gates.js';

const STRINGS = {
  'pt-BR': {
    'table.empty': 'Analise um circuito válido para consultar a tabela-verdade.',
    'table.generate': 'Gerar tabela',
    'table.generating': 'Gerando…',
    'table.refresh': 'Atualizar',
    'table.show_wires': 'Mostrar wires',
    'table.filter_all': '{out}: todos',
    'table.filter_one': '{out} = 1',
    'table.filter_zero': '{out} = 0',
    'table.filter_aria': 'Filtrar linhas pela saída {out}',
    'table.copy': 'Copiar',
    'table.copied': 'Copiado',
    'table.copy_err': 'Falha ao copiar',
    'table.csv': 'CSV',
    'table.md': 'Markdown',
    'table.confirm_large': 'A tabela-verdade terá {rows} linhas. Deseja gerar mesmo assim?',
    'table.prompt_large': 'Circuito com {rows} combinações. Clique em “Gerar tabela” para calcular no servidor.',
    'table.summary_rows': '{rows} linhas',
    'table.summary_filtered': '{shown} de {rows} linhas',
    'table.summary_inputs': '{inputs} entradas',
    'table.summary_out_ones': '{out} = 1 em {count} linhas',
    'table.group_inputs': 'Entradas',
    'table.group_outputs': 'Saídas',
    'table.group_wires': 'Wires',
    'table.row_title': 'Clique ou pressione Enter para aplicar estas entradas ao circuito',
    'table.no_match': 'Nenhuma linha corresponde ao filtro selecionado.',
    'table.note': 'Ajuda a conferir, não é prova de correção.',
  },
  'en': {
    'table.empty': 'Analyze a valid circuit to view its truth table.',
    'table.generate': 'Generate table',
    'table.generating': 'Generating…',
    'table.refresh': 'Refresh',
    'table.show_wires': 'Show wires',
    'table.filter_all': '{out}: all',
    'table.filter_one': '{out} = 1',
    'table.filter_zero': '{out} = 0',
    'table.filter_aria': 'Filter rows by output {out}',
    'table.copy': 'Copy',
    'table.copied': 'Copied',
    'table.copy_err': 'Copy failed',
    'table.csv': 'CSV',
    'table.md': 'Markdown',
    'table.confirm_large': 'The truth table will have {rows} rows. Generate anyway?',
    'table.prompt_large': 'Circuit has {rows} combinations. Click “Generate table” to compute on the server.',
    'table.summary_rows': '{rows} rows',
    'table.summary_filtered': '{shown} of {rows} rows',
    'table.summary_inputs': '{inputs} inputs',
    'table.summary_out_ones': '{out} = 1 in {count} rows',
    'table.group_inputs': 'Inputs',
    'table.group_outputs': 'Outputs',
    'table.group_wires': 'Wires',
    'table.row_title': 'Click or press Enter to apply these inputs to the circuit',
    'table.no_match': 'No rows match the selected filter.',
    'table.note': 'Helps verify behavior, not a proof of correctness.',
  },
  'es': {
    'table.empty': 'Analice un circuito válido para ver la tabla de verdad.',
    'table.generate': 'Generar tabla',
    'table.generating': 'Generando…',
    'table.refresh': 'Actualizar',
    'table.show_wires': 'Mostrar wires',
    'table.filter_all': '{out}: todos',
    'table.filter_one': '{out} = 1',
    'table.filter_zero': '{out} = 0',
    'table.filter_aria': 'Filtrar filas por salida {out}',
    'table.copy': 'Copiar',
    'table.copied': 'Copiado',
    'table.copy_err': 'Error al copiar',
    'table.csv': 'CSV',
    'table.md': 'Markdown',
    'table.confirm_large': 'La tabla tendrá {rows} filas. ¿Generar de todos modos?',
    'table.prompt_large': 'El circuito tiene {rows} combinaciones. Pulse “Generar tabla” para calcular.',
    'table.summary_rows': '{rows} filas',
    'table.summary_filtered': '{shown} de {rows} filas',
    'table.summary_inputs': '{inputs} entradas',
    'table.summary_out_ones': '{out} = 1 en {count} filas',
    'table.group_inputs': 'Entradas',
    'table.group_outputs': 'Salidas',
    'table.group_wires': 'Wires',
    'table.row_title': 'Haga clic o pulse Enter para aplicar estas entradas al circuito',
    'table.no_match': 'Ninguna fila coincide con el filtro.',
    'table.note': 'Ayuda a comprobar, no es una prueba de corrección.',
  },
  'fr': {
    'table.empty': 'Analysez un circuit valide pour afficher la table de vérité.',
    'table.generate': 'Générer la table',
    'table.generating': 'Génération…',
    'table.refresh': 'Actualiser',
    'table.show_wires': 'Afficher wires',
    'table.filter_all': '{out} : tous',
    'table.filter_one': '{out} = 1',
    'table.filter_zero': '{out} = 0',
    'table.filter_aria': 'Filtrer les lignes par sortie {out}',
    'table.copy': 'Copier',
    'table.copied': 'Copié',
    'table.copy_err': 'Échec de copie',
    'table.csv': 'CSV',
    'table.md': 'Markdown',
    'table.confirm_large': 'La table comportera {rows} lignes. Générer quand même ?',
    'table.prompt_large': 'Ce circuit compte {rows} combinaisons. Cliquez sur « Générer la table ».',
    'table.summary_rows': '{rows} lignes',
    'table.summary_filtered': '{shown} sur {rows} lignes',
    'table.summary_inputs': '{inputs} entrées',
    'table.summary_out_ones': '{out} = 1 dans {count} lignes',
    'table.group_inputs': 'Entrées',
    'table.group_outputs': 'Sorties',
    'table.group_wires': 'Fils (wires)',
    'table.row_title': 'Cliquer ou appuyer sur Entrée pour appliquer ces entrées au circuit',
    'table.no_match': 'Aucune ligne ne correspond au filtre sélectionné.',
    'table.note': 'Aide à la vérification, ne constitue pas une preuve de correction.',
  },
  'de': {
    'table.empty': 'Analysieren Sie eine gültige Schaltung, um die Wahrheitstabelle anzuzeigen.',
    'table.generate': 'Tabelle erzeugen',
    'table.generating': 'Erzeuge…',
    'table.refresh': 'Aktualisieren',
    'table.show_wires': 'Wires anzeigen',
    'table.filter_all': '{out}: alle',
    'table.filter_one': '{out} = 1',
    'table.filter_zero': '{out} = 0',
    'table.filter_aria': 'Zeilen nach Ausgang {out} filtern',
    'table.copy': 'Kopieren',
    'table.copied': 'Kopiert',
    'table.copy_err': 'Fehler beim Kopieren',
    'table.csv': 'CSV',
    'table.md': 'Markdown',
    'table.confirm_large': 'Die Tabelle wird {rows} Zeilen umfassen. Trotzdem erzeugen?',
    'table.prompt_large': 'Schaltung mit {rows} Kombinationen. Klicken Sie auf „Tabelle erzeugen“.',
    'table.summary_rows': '{rows} Zeilen',
    'table.summary_filtered': '{shown} von {rows} Zeilen',
    'table.summary_inputs': '{inputs} Eingänge',
    'table.summary_out_ones': '{out} = 1 in {count} Zeilen',
    'table.group_inputs': 'Eingänge',
    'table.group_outputs': 'Ausgänge',
    'table.group_wires': 'Wires',
    'table.row_title': 'Klicken oder Eingabe drücken, um diese Eingänge anzuwenden',
    'table.no_match': 'Keine Zeilen entsprechen dem gewählten Filter.',
    'table.note': 'Hilft beim Prüfen, ist aber kein Korrektheitsbeweis.',
  },
  'zh-CN': {
    'table.empty': '请先分析有效的电路以查看真值表。',
    'table.generate': '生成真值表',
    'table.generating': '生成中…',
    'table.refresh': '刷新',
    'table.show_wires': '显示内部连线 (wires)',
    'table.filter_all': '{out}: 全部',
    'table.filter_one': '{out} = 1',
    'table.filter_zero': '{out} = 0',
    'table.filter_aria': '按输出 {out} 筛选行',
    'table.copy': '复制',
    'table.copied': '已复制',
    'table.copy_err': '复制失败',
    'table.csv': 'CSV',
    'table.md': 'Markdown',
    'table.confirm_large': '真值表将包含 {rows} 行。确认继续生成吗？',
    'table.prompt_large': '共有 {rows} 种输入组合。请点击“生成真值表”向服务器请求。',
    'table.summary_rows': '{rows} 行',
    'table.summary_filtered': '显示 {shown} / {rows} 行',
    'table.summary_inputs': '{inputs} 个输入',
    'table.summary_out_ones': '{out} = 1 共 {count} 行',
    'table.group_inputs': '输入',
    'table.group_outputs': '输出',
    'table.group_wires': '内部连线',
    'table.row_title': '点击或按回车将该行输入应用到电路',
    'table.no_match': '没有符合筛选条件的行。',
    'table.note': '仅供核对参考，不等同于正确性证明。',
  },
  'ja': {
    'table.empty': '有効な回路を解析すると真理値表を表示できます。',
    'table.generate': '真理値表を生成',
    'table.generating': '生成中…',
    'table.refresh': '更新',
    'table.show_wires': '内部配線 (wires) を表示',
    'table.filter_all': '{out}: すべて',
    'table.filter_one': '{out} = 1',
    'table.filter_zero': '{out} = 0',
    'table.filter_aria': '出力 {out} で行を絞り込む',
    'table.copy': 'コピー',
    'table.copied': 'コピー完了',
    'table.copy_err': '失敗',
    'table.csv': 'CSV',
    'table.md': 'Markdown',
    'table.confirm_large': '真理値表は {rows} 行になります。生成しますか？',
    'table.prompt_large': '{rows} 通りの組み合わせがあります。「真理値表を生成」をクリックしてください。',
    'table.summary_rows': '{rows} 行',
    'table.summary_filtered': '{shown} / {rows} 行',
    'table.summary_inputs': '{inputs} 入力',
    'table.summary_out_ones': '{out} = 1 は {count} 行',
    'table.group_inputs': '入力',
    'table.group_outputs': '出力',
    'table.group_wires': '内部配線',
    'table.row_title': 'クリックまたは Enter でこの入力を回路に適用',
    'table.no_match': '条件に一致する行がありません。',
    'table.note': '確認用の補助ツールであり、正当性の証明ではありません。',
  },
};

const t = (key, params) => translate(STRINGS, key, params);

const ROW_HEIGHT = 34;
const OVERSCAN = 8;
const CONFIRM_THRESHOLD = 4096;

export function createTable(host, getContext, applyInputs) {
  let data = null;
  let signature = '';
  let wires = false;
  let busy = false;
  let errorMsg = '';
  let filters = {}; // outputBitName -> '' | '1' | '0'
  let selectedVisibleIdx = -1;
  let lastInputsKey = '';
  let scrollTop = 0;

  function downloadBlob(name, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
  }

  async function generate({ interactive = true } = {}) {
    const ctx = getContext?.();
    if (!ctx?.analysis?.circuit || busy) return;
    const total = ctx.analysis.table_rows || 0;
    if (total > CONFIRM_THRESHOLD) {
      if (!interactive) return;
      const ok = confirm(t('table.confirm_large', { rows: total.toLocaleString() }));
      if (!ok) return;
    }
    busy = true;
    errorMsg = '';
    render();
    try {
      const maxIn = Math.min(20, Math.max(12, (ctx.analysis.inputs || []).length));
      const res = await fetchTable(ctx.code, wires, maxIn);
      data = res;
      signature = `${ctx.code}::wires=${wires}`;
      scrollTop = 0;
    } catch (err) {
      data = null;
      errorMsg = err?.message || String(err);
    } finally {
      busy = false;
      render();
    }
  }

  function render() {
    if (!host) return;
    const ctx = getContext?.();
    host.replaceChildren();

    const wrapper = document.createElement('div');
    wrapper.className = 'tt-container';

    if (!ctx?.analysis?.circuit) {
      const emptyP = document.createElement('p');
      emptyP.className = 'empty';
      emptyP.textContent = t('table.empty');
      const noteP = document.createElement('p');
      noteP.className = 'tt-conference-note';
      noteP.textContent = t('table.note');
      wrapper.append(emptyP, noteP);
      host.append(wrapper);
      return;
    }

    const expectedSig = `${ctx.code}::wires=${wires}`;
    const totalPossible = ctx.analysis.table_rows || (1 << (ctx.analysis.inputs?.length || 0));

    // Auto-fetch for circuits <= 4096 rows when not yet loaded for current code/wires setting
    if (!data && !busy && !errorMsg && signature !== expectedSig && totalPossible <= CONFIRM_THRESHOLD) {
      generate({ interactive: false });
      return;
    }

    const pureOutputs = ctx.analysis.outputs || [];
    const wireNames = wires ? (ctx.analysis.wires || []) : [];

    // Prune filters that don't belong to current outputs
    for (const k of Object.keys(filters)) {
      if (!pureOutputs.includes(k)) delete filters[k];
    }

    // 1. Toolbar: Generate/Refresh, Show wires, Output filters, Copy, CSV, Markdown
    const toolbar = document.createElement('div');
    toolbar.className = 'tt-toolbar';

    const leftGroup = document.createElement('div');
    leftGroup.className = 'tt-toolbar-group';

    const genBtn = document.createElement('button');
    genBtn.type = 'button';
    genBtn.className = data && signature === expectedSig ? 'tt-btn' : 'tt-btn primary';
    genBtn.disabled = busy;
    genBtn.setAttribute('data-generate', '');
    const genText = busy
      ? t('table.generating')
      : data && signature === expectedSig
        ? t('table.refresh')
        : t('table.generate');
    genBtn.title = genText;
    genBtn.setAttribute('aria-label', genText);
    genBtn.innerHTML = `<svg class="tt-icon" viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13.5 8a5.5 5.5 0 1 1-1.3-3.5M13.5 2.5v2.5H11"/></svg><span class="tt-btn-label">${genText}</span>`;
    genBtn.onclick = () => generate({ interactive: true });
    leftGroup.append(genBtn);

    if ((ctx.analysis.wires || []).length > 0) {
      const wireLabel = document.createElement('label');
      wireLabel.className = 'tt-checkbox';
      wireLabel.title = t('table.show_wires');
      const wireInput = document.createElement('input');
      wireInput.type = 'checkbox';
      wireInput.checked = wires;
      wireInput.setAttribute('data-wires', '');
      wireInput.onchange = e => {
        wires = e.target.checked;
        data = null;
        signature = '';
        render();
      };
      const wireFull = document.createElement('span');
      wireFull.className = 'tt-wire-full';
      wireFull.textContent = t('table.show_wires');
      const wireShort = document.createElement('span');
      wireShort.className = 'tt-wire-short';
      wireShort.textContent = t('table.group_wires');
      wireLabel.append(wireInput, wireFull, wireShort);
      leftGroup.append(wireLabel);
    }

    // Per-output row filter selects ("only rows where output X = 1")
    if (data && signature === expectedSig) {
      for (const outBit of pureOutputs) {
        const sel = document.createElement('select');
        sel.className = `tt-filter-select ${filters[outBit] ? 'is-active' : ''}`;
        sel.setAttribute('aria-label', t('table.filter_aria', { out: outBit }));
        const optAll = document.createElement('option');
        optAll.value = '';
        optAll.textContent = t('table.filter_all', { out: outBit });
        const optOne = document.createElement('option');
        optOne.value = '1';
        optOne.textContent = t('table.filter_one', { out: outBit });
        const optZero = document.createElement('option');
        optZero.value = '0';
        optZero.textContent = t('table.filter_zero', { out: outBit });
        sel.append(optAll, optOne, optZero);
        sel.value = filters[outBit] || '';
        sel.onchange = e => {
          filters[outBit] = e.target.value;
          scrollTop = 0;
          render();
        };
        leftGroup.append(sel);
      }
    }

    const rightGroup = document.createElement('div');
    rightGroup.className = 'tt-toolbar-group';

    if (data && signature === expectedSig) {
      const copyIcon = `<svg class="tt-icon" viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5.5" y="5.5" width="8" height="8" rx="1.2"/><path d="M3.5 10.5H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h6.5a1 1 0 0 1 1 1v.5"/></svg>`;
      const btnCopy = document.createElement('button');
      btnCopy.type = 'button';
      btnCopy.className = 'tt-btn';
      btnCopy.setAttribute('data-copy', '');
      btnCopy.title = t('table.copy');
      btnCopy.setAttribute('aria-label', t('table.copy'));
      btnCopy.innerHTML = `${copyIcon}<span class="tt-btn-label">${t('table.copy')}</span>`;
      btnCopy.onclick = async () => {
        const lbl = btnCopy.querySelector('.tt-btn-label');
        try {
          await navigator.clipboard.writeText(data.formats.md);
          if (lbl) lbl.textContent = t('table.copied');
          btnCopy.title = t('table.copied');
        } catch {
          if (lbl) lbl.textContent = t('table.copy_err');
          btnCopy.title = t('table.copy_err');
        }
      };

      const dlIcon = `<svg class="tt-icon" viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 2.5v7.5M5 7.5L8 10.5 11 7.5M3 13h10"/></svg>`;
      const btnCsv = document.createElement('button');
      btnCsv.type = 'button';
      btnCsv.className = 'tt-btn tt-export-btn';
      btnCsv.setAttribute('data-csv', '');
      btnCsv.title = t('table.csv');
      btnCsv.setAttribute('aria-label', t('table.csv'));
      btnCsv.innerHTML = `${dlIcon}<span>${t('table.csv')}</span>`;
      btnCsv.onclick = () => downloadBlob('tabela-verdade.csv', data.formats.csv, 'text/csv;charset=utf-8');

      const btnMd = document.createElement('button');
      btnMd.type = 'button';
      btnMd.className = 'tt-btn tt-export-btn';
      btnMd.setAttribute('data-md', '');
      btnMd.title = t('table.md');
      btnMd.setAttribute('aria-label', t('table.md'));
      btnMd.innerHTML = `${dlIcon}<span class="tt-md-full">${t('table.md')}</span><span class="tt-md-short">MD</span>`;
      btnMd.onclick = () => downloadBlob('tabela-verdade.md', data.formats.md, 'text/markdown;charset=utf-8');

      rightGroup.append(btnCopy, btnCsv, btnMd);
    }

    toolbar.append(leftGroup, rightGroup);
    wrapper.append(toolbar);

    if (errorMsg) {
      const errP = document.createElement('p');
      errP.className = 'error notice';
      errP.textContent = errorMsg;
      wrapper.append(errP);
    }

    if (!data || signature !== expectedSig) {
      const promptP = document.createElement('p');
      promptP.className = 'empty';
      promptP.textContent = t('table.prompt_large', { rows: totalPossible.toLocaleString() });
      const noteP = document.createElement('p');
      noteP.className = 'tt-conference-note';
      noteP.textContent = t('table.note');
      wrapper.append(promptP, noteP);
      host.append(wrapper);
      return;
    }

    // 2. Mini summary above the table: "8 linhas · 3 entradas · sum = 1 em 4 linhas"
    const allRows = data.rows || [];
    const outColIndices = pureOutputs.map(name => (data.outputs || []).indexOf(name));
    const onesCounts = pureOutputs.map((_, idx) => {
      const col = outColIndices[idx];
      if (col < 0) return 0;
      let count = 0;
      for (const [, outs] of allRows) {
        if (outs[col] === 1) count++;
      }
      return count;
    });

    const filteredRows = [];
    let matchingVisibleIdx = -1;
    const currentInputsObj = ctx.inputs || {};
    const curInputsSig = (data.inputs || []).map(b => `${b}=${Number(currentInputsObj[b] || 0)}`).join('&');

    for (let i = 0; i < allRows.length; i++) {
      const [ins, outs] = allRows[i];
      let pass = true;
      for (let k = 0; k < pureOutputs.length; k++) {
        const fVal = filters[pureOutputs[k]];
        if (fVal === '1' || fVal === '0') {
          const col = outColIndices[k];
          if (col >= 0 && String(outs[col]) !== fVal) {
            pass = false;
            break;
          }
        }
      }
      if (!pass) continue;
      const isCurrent = (data.inputs || []).every((bit, j) => Number(currentInputsObj[bit] || 0) === ins[j]);
      if (isCurrent) matchingVisibleIdx = filteredRows.length;
      filteredRows.push({ origIdx: i, ins, outs, isCurrent });
    }

    const summaryBar = document.createElement('div');
    summaryBar.className = 'tt-summary-bar';

    const summaryParts = [
      filteredRows.length === allRows.length
        ? t('table.summary_rows', { rows: allRows.length.toLocaleString() })
        : t('table.summary_filtered', { shown: filteredRows.length.toLocaleString(), rows: allRows.length.toLocaleString() }),
      t('table.summary_inputs', { inputs: (data.inputs || []).length }),
      ...pureOutputs.map((outName, idx) => t('table.summary_out_ones', { out: outName, count: onesCounts[idx] })),
    ];

    summaryBar.textContent = summaryParts.join(' · ');
    wrapper.append(summaryBar);

    // 3. Virtualized Table Viewport with Sticky Header & Grouped Columns: inputs | outputs | (wires, dimmed)
    const viewport = document.createElement('div');
    viewport.className = 'tt-viewport technical';
    viewport.tabIndex = 0;

    const table = document.createElement('table');
    table.className = 'tt-table data-table';

    const thead = document.createElement('thead');
    const groupRow = document.createElement('tr');
    groupRow.className = 'tt-group-row';

    const nIn = (data.inputs || []).length;
    const nOut = pureOutputs.length;
    const nWire = Math.max(0, (data.outputs || []).length - nOut);

    if (nIn > 0) {
      const thIn = document.createElement('th');
      thIn.colSpan = nIn;
      thIn.className = 'tt-group-th group-inputs';
      thIn.textContent = t('table.group_inputs');
      groupRow.append(thIn);
    }
    if (nOut > 0) {
      const thOut = document.createElement('th');
      thOut.colSpan = nOut;
      thOut.className = 'tt-group-th group-outputs';
      thOut.textContent = t('table.group_outputs');
      groupRow.append(thOut);
    }
    if (nWire > 0) {
      const thWire = document.createElement('th');
      thWire.colSpan = nWire;
      thWire.className = 'tt-group-th group-wires';
      thWire.textContent = t('table.group_wires');
      groupRow.append(thWire);
    }
    thead.append(groupRow);

    const colRow = document.createElement('tr');
    colRow.className = 'tt-col-row';
    (data.inputs || []).forEach((label, idx) => {
      const th = document.createElement('th');
      th.className = `col-input ${idx === nIn - 1 ? 'group-end' : ''}`;
      th.textContent = label;
      colRow.append(th);
    });
    (data.outputs || []).forEach((label, idx) => {
      const isWire = idx >= nOut;
      const th = document.createElement('th');
      th.className = `${isWire ? 'col-wire' : 'col-output'} ${idx === 0 ? 'group-start' : ''} ${idx === nOut - 1 && nWire > 0 ? 'group-end' : ''} ${idx === nOut && nWire > 0 ? 'group-start' : ''}`;
      th.textContent = label;
      colRow.append(th);
    });
    thead.append(colRow);
    table.append(thead);

    const tbody = document.createElement('tbody');
    table.append(tbody);
    viewport.append(table);
    wrapper.append(viewport);

    // Clear conference note at bottom
    const footerNote = document.createElement('p');
    footerNote.className = 'tt-conference-note';
    footerNote.textContent = t('table.note');
    wrapper.append(footerNote);

    host.append(wrapper);

    const totalCols = nIn + (data.outputs || []).length;

    // Auto-scroll to current row when inputs changed
    const inputsChanged = curInputsSig !== lastInputsKey;
    if (inputsChanged) {
      lastInputsKey = curInputsSig;
      if (matchingVisibleIdx >= 0) {
        selectedVisibleIdx = matchingVisibleIdx;
        const viewH = viewport.clientHeight || 340;
        const targetTop = matchingVisibleIdx * ROW_HEIGHT;
        if (targetTop < scrollTop || targetTop + ROW_HEIGHT > scrollTop + viewH - 58) {
          scrollTop = Math.max(0, targetTop - Math.floor(viewH / 2) + ROW_HEIGHT);
        }
      }
    }

    function applyRowAt(visIdx) {
      const item = filteredRows[visIdx];
      if (!item) return;
      selectedVisibleIdx = visIdx;
      const nextInputs = Object.fromEntries((data.inputs || []).map((bit, j) => [bit, item.ins[j]]));
      applyInputs?.(nextInputs);
    }

    function renderVisibleSlice() {
      tbody.replaceChildren();
      if (!filteredRows.length) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = Math.max(1, totalCols);
        td.className = 'tt-empty-cell';
        td.textContent = t('table.no_match');
        tr.append(td);
        tbody.append(tr);
        return;
      }

      const viewHeight = viewport.clientHeight || 360;
      const startIdx = Math.max(0, Math.floor(viewport.scrollTop / ROW_HEIGHT) - OVERSCAN);
      const visibleCount = Math.ceil(viewHeight / ROW_HEIGHT) + OVERSCAN * 2;
      const endIdx = Math.min(filteredRows.length, startIdx + visibleCount);

      const topPad = startIdx * ROW_HEIGHT;
      const bottomPad = Math.max(0, (filteredRows.length - endIdx) * ROW_HEIGHT);

      if (topPad > 0) {
        const topRow = document.createElement('tr');
        topRow.className = 'tt-spacer';
        topRow.setAttribute('aria-hidden', 'true');
        const td = document.createElement('td');
        td.colSpan = totalCols;
        td.style.height = `${topPad}px`;
        topRow.append(td);
        tbody.append(topRow);
      }

      for (let vIdx = startIdx; vIdx < endIdx; vIdx++) {
        const item = filteredRows[vIdx];
        const tr = document.createElement('tr');
        tr.className = [
          'tt-row',
          item.isCurrent ? 'current is-current' : '',
          vIdx === selectedVisibleIdx ? 'is-focused' : '',
        ].filter(Boolean).join(' ');
        tr.style.height = `${ROW_HEIGHT}px`;
        tr.title = t('table.row_title');
        tr.tabIndex = -1;

        item.ins.forEach((val, j) => {
          const td = document.createElement('td');
          td.className = `col-input ${val === 1 ? 'val-1' : 'val-0'} ${j === nIn - 1 ? 'group-end' : ''}`;
          td.textContent = String(val);
          tr.append(td);
        });

        item.outs.forEach((val, j) => {
          const isWire = j >= nOut;
          const td = document.createElement('td');
          td.className = [
            isWire ? 'col-wire' : 'col-output',
            val === 1 ? 'val-1' : 'val-0',
            j === 0 ? 'group-start' : '',
            j === nOut - 1 && nWire > 0 ? 'group-end' : '',
            j === nOut && nWire > 0 ? 'group-start' : '',
          ].filter(Boolean).join(' ');
          td.textContent = String(val);
          tr.append(td);
        });

        tr.onclick = () => applyRowAt(vIdx);
        tbody.append(tr);
      }

      if (bottomPad > 0) {
        const botRow = document.createElement('tr');
        botRow.className = 'tt-spacer';
        botRow.setAttribute('aria-hidden', 'true');
        const td = document.createElement('td');
        td.colSpan = totalCols;
        td.style.height = `${bottomPad}px`;
        botRow.append(td);
        tbody.append(botRow);
      }
    }

    viewport.scrollTop = scrollTop;
    renderVisibleSlice();

    viewport.addEventListener('scroll', () => {
      scrollTop = viewport.scrollTop;
      renderVisibleSlice();
    }, { passive: true });

    // Keyboard navigation: Up/Down, PageUp/PageDown, Home/End, Enter
    viewport.addEventListener('keydown', e => {
      if (!filteredRows.length) return;
      const pageRows = Math.max(1, Math.floor((viewport.clientHeight || 320) / ROW_HEIGHT) - 2);
      let nextIdx = selectedVisibleIdx >= 0 ? selectedVisibleIdx : (matchingVisibleIdx >= 0 ? matchingVisibleIdx : 0);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        nextIdx = Math.min(filteredRows.length - 1, nextIdx + 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        nextIdx = Math.max(0, nextIdx - 1);
      } else if (e.key === 'PageDown') {
        e.preventDefault();
        nextIdx = Math.min(filteredRows.length - 1, nextIdx + pageRows);
      } else if (e.key === 'PageUp') {
        e.preventDefault();
        nextIdx = Math.max(0, nextIdx - pageRows);
      } else if (e.key === 'Home') {
        e.preventDefault();
        nextIdx = 0;
      } else if (e.key === 'End') {
        e.preventDefault();
        nextIdx = filteredRows.length - 1;
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (nextIdx >= 0 && nextIdx < filteredRows.length) {
          applyRowAt(nextIdx);
        }
        return;
      } else {
        return;
      }

      selectedVisibleIdx = nextIdx;
      const rowTop = nextIdx * ROW_HEIGHT;
      const viewH = viewport.clientHeight || 320;
      if (rowTop < viewport.scrollTop) {
        viewport.scrollTop = rowTop;
      } else if (rowTop + ROW_HEIGHT > viewport.scrollTop + viewH - 58) {
        viewport.scrollTop = rowTop + ROW_HEIGHT - (viewH - 58);
      }
      scrollTop = viewport.scrollTop;
      renderVisibleSlice();
    });
  }

  // Re-render automatically on <html lang> change
  if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
    const obs = new MutationObserver(() => {
      if (host?.isConnected && !host.hidden) render();
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  }

  return {
    render,
    clear() {
      data = null;
      signature = '';
      errorMsg = '';
      scrollTop = 0;
      selectedVisibleIdx = -1;
      render();
    },
  };
}
