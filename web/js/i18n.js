import en from './i18n/en.js';
import ptBR from './i18n/pt-BR.js';
import es from './i18n/es.js';
import fr from './i18n/fr.js';
import de from './i18n/de.js';
import zhCN from './i18n/zh-CN.js';
import ja from './i18n/ja.js';

const dictionaries = {'pt-BR':ptBR,en,es,fr,de,'zh-CN':zhCN,ja};
const storageKey = 'circuito.language';
let language = 'en';

function match(code) {
  if (!code) return null;
  const exact = Object.keys(dictionaries).find(key => key.toLowerCase() === code.toLowerCase());
  if (exact) return exact;
  const base = code.toLowerCase().split('-')[0];
  return Object.keys(dictionaries).find(key => key.toLowerCase().split('-')[0] === base) || null;
}

export function detectLanguage() {
  try { const saved = localStorage.getItem(storageKey); if (saved && dictionaries[saved]) return saved; } catch {}
  for (const code of navigator.languages || [navigator.language]) {
    const found = match(code); if (found) return found;
  }
  return 'en';
}

export function t(key, params = {}) {
  const template = dictionaries[language][key] ?? en[key] ?? key;
  return String(template).replace(/\{(\w+)\}/g, (whole, name) => params[name] == null ? whole : String(params[name]));
}

export function translateStatic() {
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
  document.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle); });
  document.title = t('app.title');
}

export function setLanguage(code, persist = true) {
  language = match(code) || 'en';
  document.documentElement.lang = language;
  if (persist) try { localStorage.setItem(storageKey, language); } catch {}
  translateStatic();
  document.dispatchEvent(new CustomEvent('languagechange', {detail:{language}}));
  return language;
}

export function getLanguage() { return language; }

if (['localhost','127.0.0.1'].includes(location.hostname)) {
  const expected = Object.keys(en).sort().join('\0');
  for (const [code, dictionary] of Object.entries(dictionaries)) {
    if (Object.keys(dictionary).sort().join('\0') !== expected) console.warn(`i18n: key mismatch for ${code}`);
  }
}
