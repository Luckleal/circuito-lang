import {t} from './i18n.js';
async function request(path, body) {
  let response;
  try { response = await fetch(path, body ? {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)} : undefined); }
  catch { throw new Error(t('result.unreachable')); }
  let data;
  try { data = await response.json(); } catch { throw new Error(t('result.invalid_response')); }
  if (!response.ok) throw new Error(data.error || t('result.http_error', {status:response.status}));
  return data;
}
export const examples = () => request('/api/examples');
export const analyze = code => request('/api/analyze', {code});
export const simulate = (code, inputs) => request('/api/simulate', {code, inputs});
export const table = (code, wires, max_inputs) => request('/api/table', {code, wires, max_inputs});
