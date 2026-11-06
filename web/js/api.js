import {t} from './i18n.js';
import {call} from './backend.js';

async function request(path, body) {
  try { return await call(path, body); }
  catch (error) {
    if (error.status) throw new Error(error.message || t('result.http_error', {status: error.status}));
    throw new Error(t('result.unreachable'));
  }
}
export const examples = () => request('/api/examples');
export const analyze = code => request('/api/analyze', {code});
export const simulate = (code, inputs) => request('/api/simulate', {code, inputs});
export const table = (code, wires, max_inputs) => request('/api/table', {code, wires, max_inputs});
export const expression = value => request('/api/expression', {expression: value});
export const compare = (first, second) => request('/api/compare', {first, second});
