import { explainStep, translate } from './gates.js';

const STRINGS = {
  'pt-BR': {
    'player.reset': 'Reiniciar (passo 0)',
    'player.prev': 'Passo anterior',
    'player.play': 'Reproduzir avaliação (Espaço)',
    'player.pause': 'Pausar avaliação (Espaço)',
    'player.next': 'Próximo passo',
    'player.show_result': 'Mostrar resultado',
    'player.show_result_title': 'Pular para o estado final avaliado',
    'player.speed': 'Velocidade',
    'player.scrubber': 'Progresso da avaliação passo a passo',
    'player.step_zero': 'Entradas definidas ({inputs}). Use Reproduzir, avance passo a passo ou clique em Mostrar resultado.',
    'player.no_steps': 'Aguardando simulação do circuito.',
    'player.note': 'Animação didática da ordem de avaliação, não simulação temporal',
    'player.step_badge': 'Passo {cur} / {total}',
  },
  'en': {
    'player.reset': 'Reset (step 0)',
    'player.prev': 'Step back',
    'player.play': 'Play evaluation (Space)',
    'player.pause': 'Pause evaluation (Space)',
    'player.next': 'Step forward',
    'player.show_result': 'Show result',
    'player.show_result_title': 'Jump to final evaluated state',
    'player.speed': 'Speed',
    'player.scrubber': 'Step-by-step evaluation progress',
    'player.step_zero': 'Inputs set ({inputs}). Press Play, step forward, or click Show result.',
    'player.no_steps': 'Waiting for circuit simulation.',
    'player.note': 'Didactic animation of evaluation order, not timing simulation',
    'player.step_badge': 'Step {cur} / {total}',
  },
  'es': {
    'player.reset': 'Reiniciar (paso 0)',
    'player.prev': 'Paso anterior',
    'player.play': 'Reproducir evaluación (Espacio)',
    'player.pause': 'Pausar evaluación (Espacio)',
    'player.next': 'Paso siguiente',
    'player.show_result': 'Mostrar resultado',
    'player.show_result_title': 'Saltar al resultado final',
    'player.speed': 'Velocidad',
    'player.scrubber': 'Progreso de evaluación paso a paso',
    'player.step_zero': 'Entradas definidas ({inputs}). Use Reproducir, avance paso a paso o pulse Mostrar resultado.',
    'player.no_steps': 'Esperando simulación del circuito.',
    'player.note': 'Animación didáctica del orden de evaluación, no simulación temporal',
    'player.step_badge': 'Paso {cur} / {total}',
  },
  'fr': {
    'player.reset': 'Réinitialiser (étape 0)',
    'player.prev': 'Étape précédente',
    'player.play': 'Lire l’évaluation (Espace)',
    'player.pause': 'Mettre en pause (Espace)',
    'player.next': 'Étape suivante',
    'player.show_result': 'Afficher le résultat',
    'player.show_result_title': 'Aller directement à l’état final',
    'player.speed': 'Vitesse',
    'player.scrubber': 'Progression de l’évaluation étape par étape',
    'player.step_zero': 'Entrées définies ({inputs}). Lancez la lecture, avancez pas à pas ou cliquez sur Afficher le résultat.',
    'player.no_steps': 'En attente de la simulation.',
    'player.note': 'Animation didactique de l’ordre d’évaluation, non une simulation temporelle',
    'player.step_badge': 'Étape {cur} / {total}',
  },
  'de': {
    'player.reset': 'Zurücksetzen (Schritt 0)',
    'player.prev': 'Schritt zurück',
    'player.play': 'Auswertung abspielen (Leertaste)',
    'player.pause': 'Auswertung pausieren (Leertaste)',
    'player.next': 'Schritt vor',
    'player.show_result': 'Ergebnis zeigen',
    'player.show_result_title': 'Zum ausgewerteten Endzustand springen',
    'player.speed': 'Tempo',
    'player.scrubber': 'Fortschritt der schrittweisen Auswertung',
    'player.step_zero': 'Eingänge gesetzt ({inputs}). Starten, schrittweise vorgehen oder Ergebnis zeigen wählen.',
    'player.no_steps': 'Warte auf Schaltungssimulation.',
    'player.note': 'Didaktische Animation der Auswertungsreihenfolge, keine Zeitsimulation',
    'player.step_badge': 'Schritt {cur} / {total}',
  },
  'zh-CN': {
    'player.reset': '重置（第 0 步）',
    'player.prev': '上一步',
    'player.play': '播放求值动画（空格）',
    'player.pause': '暂停求值动画（空格）',
    'player.next': '下一步',
    'player.show_result': '显示结果',
    'player.show_result_title': '直接跳至最终求值结果',
    'player.speed': '速度',
    'player.scrubber': '逐步求值进度',
    'player.step_zero': '输入已设定 ({inputs})。可播放、单步执行或点击“显示结果”。',
    'player.no_steps': '正在等待电路仿真。',
    'player.note': '求值顺序的教学演示动画，非时序仿真',
    'player.step_badge': '步骤 {cur} / {total}',
  },
  'ja': {
    'player.reset': 'リセット (ステップ 0)',
    'player.prev': '前のステップ',
    'player.play': '評価を再生 (Space)',
    'player.pause': '一時停止 (Space)',
    'player.next': '次のステップ',
    'player.show_result': '結果を表示',
    'player.show_result_title': '最終評価結果へジャンプ',
    'player.speed': '速度',
    'player.scrubber': 'ステップ評価の進捗',
    'player.step_zero': '入力設定済み ({inputs})。再生・ステップ実行、または「結果を表示」を選択してください。',
    'player.no_steps': 'シミュレーション待機中。',
    'player.note': '評価順序の教育的アニメーションであり、タイミングシミュレーションではありません',
    'player.step_badge': 'ステップ {cur} / {total}',
  },
};

const t = (key, params) => translate(STRINGS, key, params);

const SPEEDS = [0.25, 0.5, 1, 2, 4];
const BASE_STEP_MS = 720;

const ICONS = {
  reset: `<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="3.5" y1="3.5" x2="3.5" y2="12.5"/><polygon points="12.5,3.5 6,8 12.5,12.5"/></svg>`,
  prev: `<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="10.5,3.5 5.5,8 10.5,12.5"/></svg>`,
  play: `<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="4.5,3 12.5,8 4.5,13"/></svg>`,
  pause: `<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5.5" y1="3.5" x2="5.5" y2="12.5"/><line x1="10.5" y1="3.5" x2="10.5" y2="12.5"/></svg>`,
  next: `<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="5.5,3.5 10.5,8 5.5,12.5"/></svg>`,
  end: `<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="3.5,3.5 10,8 3.5,12.5"/><line x1="12.5" y1="3.5" x2="12.5" y2="12.5"/></svg>`,
  scrubber: `<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="2" y1="8" x2="14" y2="8"/><circle cx="5.5" cy="8" r="2" fill="currentColor"/><circle cx="11" cy="8" r="1.5"/></svg>`,
};

let scrubberExpanded = false;

export function createPlayerController(onChange) {
  let steps = [];
  let inputs = {};
  let stepIndex = 0;
  let playing = false;
  let speed = 1;
  let timer = null;
  let justStepped = false;

  function clearTimer() {
    if (timer != null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function notify(animated = false) {
    justStepped = animated;
    onChange?.(getState());
  }

  function scheduleNext() {
    clearTimer();
    if (!playing) return;
    const delay = Math.max(120, Math.round(BASE_STEP_MS / speed));
    timer = setTimeout(() => {
      if (stepIndex >= steps.length) {
        playing = false;
        clearTimer();
        notify(false);
        return;
      }
      stepIndex += 1;
      const done = stepIndex >= steps.length;
      if (done) {
        playing = false;
        clearTimer();
      }
      notify(true);
      if (playing) scheduleNext();
    }, delay);
  }

  function setSimulation(sim, { resetToZero = false, initialStep = null } = {}) {
    steps = sim?.steps || [];
    inputs = sim?.inputs || {};
    if (resetToZero) {
      playing = false;
      clearTimer();
      stepIndex = 0;
    } else if (initialStep != null) {
      stepIndex = Math.max(0, Math.min(steps.length, initialStep));
    } else {
      stepIndex = steps.length;
    }
  }

  function reset() {
    playing = false;
    clearTimer();
    stepIndex = 0;
    notify(false);
  }

  function stepBack() {
    playing = false;
    clearTimer();
    stepIndex = Math.max(0, stepIndex - 1);
    notify(false);
  }

  function stepForward() {
    playing = false;
    clearTimer();
    if (stepIndex < steps.length) {
      stepIndex += 1;
      notify(true);
    } else {
      notify(false);
    }
  }

  function showResult() {
    playing = false;
    clearTimer();
    stepIndex = steps.length;
    notify(false);
  }

  function togglePlay() {
    if (!steps.length) return;
    if (playing) {
      playing = false;
      clearTimer();
      notify(false);
      return;
    }
    if (stepIndex >= steps.length) {
      stepIndex = 0;
    }
    playing = true;
    notify(false);
    scheduleNext();
  }

  function seek(index) {
    playing = false;
    clearTimer();
    const next = Math.max(0, Math.min(steps.length, Number(index) || 0));
    const animated = next === stepIndex + 1;
    stepIndex = next;
    notify(animated);
  }

  function setSpeed(nextSpeed) {
    const val = Number(nextSpeed);
    if (SPEEDS.includes(val)) speed = val;
    else speed = 1;
    if (playing) scheduleNext();
    notify(false);
  }

  function stop() {
    if (playing || timer != null) {
      playing = false;
      clearTimer();
    }
  }

  function getState() {
    const total = steps.length;
    const clamped = Math.max(0, Math.min(total, stepIndex));
    const currentStep = clamped > 0 ? steps[clamped - 1] : null;
    return {
      steps,
      inputs,
      stepIndex: clamped,
      totalSteps: total,
      playing,
      speed,
      justStepped,
      currentStep,
      currentNodeId: currentStep ? currentStep.node : null,
      evaluatedNodeIds: new Set(steps.slice(0, clamped).map(s => s.node)),
    };
  }

  return {
    setSimulation,
    reset,
    stepBack,
    stepForward,
    showResult,
    togglePlay,
    seek,
    setSpeed,
    stop,
    getState,
  };
}

export function renderPlayerBar(host, controller) {
  const state = controller.getState();
  const { stepIndex, totalSteps, playing, speed, currentStep, inputs } = state;

  host.replaceChildren();
  host.className = `circuit-player ${scrubberExpanded ? 'is-scrubber-open' : ''}`;

  // Top slim control bar
  const bar = document.createElement('div');
  bar.className = 'circuit-player-bar';

  // Transport buttons group
  const transport = document.createElement('div');
  transport.className = 'player-transport';

  const btnReset = document.createElement('button');
  btnReset.type = 'button';
  btnReset.className = 'player-btn icon-btn';
  btnReset.disabled = totalSteps === 0 || (stepIndex === 0 && !playing);
  btnReset.title = t('player.reset');
  btnReset.setAttribute('aria-label', t('player.reset'));
  btnReset.innerHTML = ICONS.reset;
  btnReset.onclick = () => controller.reset();

  const btnPrev = document.createElement('button');
  btnPrev.type = 'button';
  btnPrev.className = 'player-btn icon-btn';
  btnPrev.disabled = totalSteps === 0 || stepIndex <= 0;
  btnPrev.title = t('player.prev');
  btnPrev.setAttribute('aria-label', t('player.prev'));
  btnPrev.innerHTML = ICONS.prev;
  btnPrev.onclick = () => controller.stepBack();

  const btnPlay = document.createElement('button');
  btnPlay.type = 'button';
  btnPlay.className = `player-btn play-toggle ${playing ? 'is-playing' : ''}`;
  btnPlay.disabled = totalSteps === 0;
  const playLabel = playing ? t('player.pause') : t('player.play');
  btnPlay.title = playLabel;
  btnPlay.setAttribute('aria-label', playLabel);
  btnPlay.innerHTML = playing ? ICONS.pause : ICONS.play;
  btnPlay.onclick = () => controller.togglePlay();

  const btnNext = document.createElement('button');
  btnNext.type = 'button';
  btnNext.className = 'player-btn icon-btn';
  btnNext.disabled = totalSteps === 0 || stepIndex >= totalSteps;
  btnNext.title = t('player.next');
  btnNext.setAttribute('aria-label', t('player.next'));
  btnNext.innerHTML = ICONS.next;
  btnNext.onclick = () => controller.stepForward();

  const btnEnd = document.createElement('button');
  btnEnd.type = 'button';
  btnEnd.className = `player-btn show-result-btn ${stepIndex < totalSteps ? 'is-highlighted' : ''}`;
  btnEnd.disabled = totalSteps === 0 || stepIndex >= totalSteps;
  btnEnd.title = t('player.show_result_title');
  btnEnd.setAttribute('aria-label', t('player.show_result'));
  btnEnd.innerHTML = `${ICONS.end}<span class="player-btn-label">${t('player.show_result')}</span>`;
  btnEnd.onclick = () => controller.showResult();

  transport.append(btnReset, btnPrev, btnPlay, btnNext, btnEnd);

  // Scrubber with one tick per step
  const scrubberWrap = document.createElement('div');
  scrubberWrap.className = 'player-scrubber-wrap';

  const scrubber = document.createElement('div');
  scrubber.className = 'player-scrubber';
  scrubber.tabIndex = totalSteps > 0 ? 0 : -1;
  scrubber.setAttribute('role', 'slider');
  scrubber.setAttribute('aria-label', t('player.scrubber'));
  scrubber.setAttribute('aria-valuemin', '0');
  scrubber.setAttribute('aria-valuemax', String(totalSteps));
  scrubber.setAttribute('aria-valuenow', String(stepIndex));

  const trackFill = document.createElement('div');
  trackFill.className = 'scrubber-fill';
  const pct = totalSteps > 0 ? (stepIndex / totalSteps) * 100 : 0;
  trackFill.style.width = `${pct}%`;
  scrubber.append(trackFill);

  const ticks = document.createElement('div');
  ticks.className = 'scrubber-ticks';
  for (let i = 0; i <= totalSteps; i++) {
    const tick = document.createElement('button');
    tick.type = 'button';
    tick.tabIndex = -1;
    tick.className = `scrubber-tick ${i <= stepIndex ? 'is-passed' : ''} ${i === stepIndex ? 'is-current' : ''}`;
    const tickPct = totalSteps > 0 ? (i / totalSteps) * 100 : 0;
    tick.style.left = `${tickPct}%`;
    tick.title = t('player.step_badge', { cur: i, total: totalSteps });
    tick.onclick = e => {
      e.stopPropagation();
      controller.seek(i);
    };
    ticks.append(tick);
  }
  scrubber.append(ticks);

  scrubber.onclick = e => {
    if (totalSteps <= 0) return;
    const rect = scrubber.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    controller.seek(Math.round(ratio * totalSteps));
  };
  scrubber.onkeydown = e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      controller.stepForward();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      controller.stepBack();
    } else if (e.key === 'Home') {
      e.preventDefault();
      controller.reset();
    } else if (e.key === 'End') {
      e.preventDefault();
      controller.showResult();
    }
  };
  scrubberWrap.append(scrubber);

  // Step counter "3 / 7" + Collapsible Scrubber Toggle + Speed (0.25x - 4x)
  const meta = document.createElement('div');
  meta.className = 'player-meta';

  const counter = document.createElement('span');
  counter.className = 'player-counter';
  counter.textContent = `${stepIndex} / ${totalSteps}`;

  const scrubberToggle = document.createElement('button');
  scrubberToggle.type = 'button';
  scrubberToggle.className = `player-btn icon-btn player-scrubber-toggle ${scrubberExpanded ? 'is-active' : ''}`;
  scrubberToggle.title = t('player.scrubber');
  scrubberToggle.setAttribute('aria-label', t('player.scrubber'));
  scrubberToggle.setAttribute('aria-expanded', String(scrubberExpanded));
  scrubberToggle.innerHTML = ICONS.scrubber;
  scrubberToggle.onclick = () => {
    scrubberExpanded = !scrubberExpanded;
    host.classList.toggle('is-scrubber-open', scrubberExpanded);
    scrubberToggle.classList.toggle('is-active', scrubberExpanded);
    scrubberToggle.setAttribute('aria-expanded', String(scrubberExpanded));
  };

  const speedLabel = document.createElement('label');
  speedLabel.className = 'player-speed';
  const speedSpan = document.createElement('span');
  speedSpan.className = 'sr-only';
  speedSpan.textContent = t('player.speed');
  const speedSelect = document.createElement('select');
  speedSelect.setAttribute('aria-label', t('player.speed'));
  for (const s of SPEEDS) {
    const opt = document.createElement('option');
    opt.value = String(s);
    opt.textContent = `${s}×`;
    if (s === speed) opt.selected = true;
    speedSelect.append(opt);
  }
  speedSelect.onchange = e => controller.setSpeed(Number(e.target.value));
  speedLabel.append(speedSpan, speedSelect);

  meta.append(counter, scrubberToggle, speedLabel);
  bar.append(transport, scrubberWrap, meta);

  // Explanation & didactic note row
  const footer = document.createElement('div');
  footer.className = 'circuit-player-footer';

  const exp = document.createElement('div');
  exp.className = 'player-explanation';
  if (totalSteps === 0) {
    exp.textContent = t('player.no_steps');
  } else if (stepIndex === 0) {
    const inSummary = Object.entries(inputs)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ');
    exp.textContent = t('player.step_zero', { inputs: inSummary || '0' });
  } else {
    const badge = document.createElement('span');
    badge.className = 'step-inline-badge';
    badge.textContent = `${stepIndex}/${totalSteps}`;
    const text = document.createElement('span');
    text.textContent = explainStep(currentStep);
    exp.append(badge, text);
  }

  const note = document.createElement('p');
  note.className = 'player-didactic-note';
  note.textContent = t('player.note');

  footer.append(exp, note);
  host.append(bar, footer);
}
