import {t} from './i18n.js';

const host = document.querySelector('#compiler-status');
const line = document.querySelector('#compiler-status-text');
const progress = document.querySelector('#compiler-progress');
const retry = document.querySelector('#compiler-retry');
let current = null;

function render() {
  host.hidden = !current || current.state === 'ready';
  if (host.hidden) return;
  const failed = current.state === 'error';
  line.textContent = failed ? t('extra.compiler_error') : `${t('extra.compiler_loading')} · ${t(current.step === 'compiler' ? 'extra.compiler_step_compiler' : 'extra.compiler_step_runtime')}`;
  progress.hidden = failed;
  retry.hidden = !failed;
}

export function setupCompilerStatus(onRetry) {
  window.addEventListener('backend:status', event => {
    if (event.detail?.engine !== 'wasm') return;
    current = event.detail;
    render();
  });
  retry.addEventListener('click', () => {
    current = {engine:'wasm', state:'loading', step:'runtime'};
    render();
    onRetry();
  });
  document.addEventListener('languagechange', render);
}
