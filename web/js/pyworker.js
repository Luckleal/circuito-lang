// Runs the real Circuit compiler (the Python code of src/) inside the browser with Pyodide.
// Used when there is no local server (static hosting such as GitHub Pages).
const PYODIDE = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';
importScripts(PYODIDE + 'pyodide.js');

let ready = null;

async function init() {
  postMessage({type: 'status', state: 'loading', step: 'runtime'});
  const pyodide = await loadPyodide({indexURL: PYODIDE});
  postMessage({type: 'status', state: 'loading', step: 'compiler'});
  const bundle = await fetch(new URL('../bundle.zip', self.location.href));
  if (!bundle.ok) throw new Error('bundle.zip: HTTP ' + bundle.status);
  pyodide.unpackArchive(await bundle.arrayBuffer(), 'zip', {extractDir: '/app'});
  pyodide.runPython("import sys; sys.path[:0] = ['/app/src', '/app/lib']");
  const handle = pyodide.pyimport('web_entry').handle;
  postMessage({type: 'status', state: 'ready'});
  return handle;
}

onmessage = async ({data: {id, path, body}}) => {
  try {
    ready ||= init();
    const handle = await ready;
    postMessage({id, response: JSON.parse(handle(path, JSON.stringify(body || {})))});
  } catch (error) {
    ready = ready && null;   // allow a retry after a failed start
    postMessage({id, response: {error: String(error && error.message || error), status: 500}});
    postMessage({type: 'status', state: 'error'});
  }
};
