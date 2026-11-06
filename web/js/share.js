import {t} from './i18n.js';

const button = document.querySelector('#share');
const label = document.querySelector('#share-label');
const fallback = document.querySelector('#share-fallback');
let feedbackTimer;

function utf8ToBase64Url(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function base64UrlToUtf8(value) {
  if (!value) return '';
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('invalid base64url');
  const binary = atob(value.replaceAll('-', '+').replaceAll('_', '/'));
  return new TextDecoder('utf-8', {fatal:true}).decode(Uint8Array.from(binary, char => char.charCodeAt(0)));
}

export function linkedContent() {
  const hash = location.hash.slice(1);
  try {
    if (hash.startsWith('e=')) return {mode:'quick', text:decodeURIComponent(hash.slice(2))};
    if (hash.startsWith('c=')) return {mode:'full', text:base64UrlToUtf8(hash.slice(2))};
  } catch { /* Ignore malformed links. */ }
  return null;
}

function feedback(key) {
  clearTimeout(feedbackTimer);
  label.textContent = t(key);
  button.setAttribute('aria-label', t(key));
  feedbackTimer = setTimeout(() => {
    label.textContent = t('extra.copy_link');
    button.setAttribute('aria-label', t('extra.copy_link'));
  }, 2400);
}

export function setupShare(getContent) {
  button.addEventListener('click', async () => {
    const {mode, text} = getContent();
    if (mode === 'full' && text.length > 6000) { feedback('extra.link_too_long'); return; }
    const url = new URL(location.href);
    url.hash = mode === 'quick' ? `e=${encodeURIComponent(text)}` : `c=${utf8ToBase64Url(text)}`;
    history.replaceState(history.state, '', url);
    fallback.hidden = true;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(url.href);
      feedback('extra.link_copied');
    } catch {
      fallback.value = url.href;
      fallback.hidden = false;
      fallback.focus();
      fallback.select();
      feedback('extra.select_link');
    }
  });
  document.addEventListener('languagechange', () => {
    clearTimeout(feedbackTimer);
    label.textContent = t('extra.copy_link');
    button.setAttribute('aria-label', t('extra.copy_link'));
  });
}
