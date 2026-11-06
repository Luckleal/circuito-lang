// One way to talk to the compiler, wherever it runs:
//  - "http": the local server (python src/server.py) answers /api/*
//  - "wasm": no server (static hosting): the same Python code runs in the browser (pyworker.js)
// The engine is detected once; `?engine=wasm` forces the browser one (useful to test).
let engine = null;
let worker = null;
let nextId = 1;
const pending = new Map();

function announce(detail) {
  window.dispatchEvent(new CustomEvent('backend:status', {detail}));
}

async function detect() {
  if (new URLSearchParams(location.search).get('engine') === 'wasm') return 'wasm';
  try {
    const response = await fetch('api/examples', {cache: 'no-store'});
    if (response.ok && (response.headers.get('content-type') || '').includes('json')) return 'http';
  } catch { /* fall through */ }
  return 'wasm';
}

function startWorker() {
  worker = new Worker(new URL('./pyworker.js', import.meta.url));
  worker.onmessage = ({data}) => {
    if (data.type === 'status') return announce({engine: 'wasm', ...data});
    const waiting = pending.get(data.id);
    if (!waiting) return;
    pending.delete(data.id);
    waiting(data.response);
  };
  worker.onerror = () => announce({engine: 'wasm', state: 'error'});
}

function viaWorker(path, body) {
  if (!worker) startWorker();
  return new Promise(resolve => {
    const id = nextId++;
    pending.set(id, resolve);
    worker.postMessage({id, path, body});
  });
}

async function viaHttp(path, body) {
  const response = await fetch(path.replace(/^\//, ''), body === undefined ? undefined :
    {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});
  let data;
  try { data = await response.json(); } catch { return {error: 'invalid response', status: response.status}; }
  return response.ok ? data : {...data, status: response.status};
}

/** Calls an API route. Resolves with the data; rejects with an Error carrying `.status`. */
export async function call(path, body) {
  engine ||= detect();
  const kind = await engine;
  const result = kind === 'wasm' ? await viaWorker(path, body) : await viaHttp(path, body);
  if (result && result.error && result.status) {
    const error = new Error(result.error);
    error.status = result.status;
    throw error;
  }
  return result;
}

export async function engineKind() {
  engine ||= detect();
  return engine;
}
