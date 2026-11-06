#!/usr/bin/env python3
"""Local web interface for the Circuit language.

Usage: python src/server.py [--port 8765] [--host 127.0.0.1]

Serves the static interface from web/ and a small JSON API backed by the real
compiler (api.py). Programs are only parsed and analyzed: nothing from the request is
ever executed, evaluated or passed to a shell.

Endpoints (all POST with a JSON body, except GET /api/examples):
  /api/expression {expression}                -> a complete program for `A OR B` (quick mode)
  /api/analyze   {code}                       -> analyze_program result
  /api/simulate  {code, inputs: {bit: 0|1}}   -> values per node + evaluation steps
  /api/table     {code, wires, max_inputs}    -> truth table (rows + text/md/csv)
  GET /api/examples                           -> [{name, code}] from examples/
"""
import argparse
import json
import mimetypes
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import api

ROOT = Path(__file__).resolve().parent.parent
WEB = ROOT / "web"
EXAMPLES = ROOT / "examples"
MAX_BODY = 512 * 1024


def list_examples():
    """Every example program: valid ones first, then each invalid_*/ or semantic_*/ folder."""
    items = []
    folders = [(EXAMPLES, "valid", "")] + [
        (path, path.name.split("_", 1)[1], path.name + "/")
        for path in sorted(EXAMPLES.iterdir()) if path.is_dir()
    ]
    for folder, group, prefix in folders:
        for path in sorted(folder.glob("*.circ")):
            items.append({"name": prefix + path.stem, "group": group,
                          "code": path.read_text(encoding="utf-8")})
    return items


def handle_api(path, body):
    if path == "/api/compare":
        first, second = body.get("first"), body.get("second")
        if not all(isinstance(v, str) and len(v) <= 2000 for v in (first, second)):
            raise ValueError("fields 'first' and 'second' must be strings of at most 2000 characters")
        return api.compare_expressions(first, second)
    if path == "/api/expression":
        expression = body.get("expression")
        if not isinstance(expression, str) or len(expression) > 2000:
            raise ValueError("field 'expression' must be a string of at most 2000 characters")
        return api.expression_to_program(expression)
    code = body.get("code")
    if not isinstance(code, str):
        raise ValueError("field 'code' must be a string")
    if path == "/api/analyze":
        return api.analyze_program(code)
    if path == "/api/simulate":
        inputs = body.get("inputs") or {}
        if not isinstance(inputs, dict):
            raise ValueError("field 'inputs' must be an object")
        return api.simulate_program(code, inputs)
    if path == "/api/table":
        max_inputs = body.get("max_inputs", api.DEFAULT_MAX_INPUTS)
        if not isinstance(max_inputs, int) or isinstance(max_inputs, bool):
            raise ValueError("field 'max_inputs' must be an integer")
        return api.table_for_program(code, bool(body.get("wires")), max_inputs)
    return None


class Handler(BaseHTTPRequestHandler):
    server_version = "CircuitWeb/1"

    def log_message(self, fmt, *args):
        if "--quiet" not in sys.argv:
            super().log_message(fmt, *args)

    def send_json(self, payload, status=200):
        data = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path == "/api/examples":
            return self.send_json(list_examples())
        if path == "/":
            path = "/index.html"
        target = (WEB / path.lstrip("/")).resolve()
        if WEB.resolve() not in target.parents or not target.is_file():
            return self.send_json({"error": "not found"}, 404)
        data = target.read_bytes()
        kind = mimetypes.guess_type(target.name)[0] or "application/octet-stream"
        self.send_response(200)
        self.send_header("Content-Type", kind + ("; charset=utf-8" if kind.startswith("text/") or "javascript" in kind else ""))
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self):
        path = self.path.split("?", 1)[0]
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length > MAX_BODY:
                return self.send_json({"error": "request too large"}, 413)
            body = json.loads(self.rfile.read(length) or b"{}")
            if not isinstance(body, dict):
                raise ValueError("body must be a JSON object")
            result = handle_api(path, body)
        except (ValueError, json.JSONDecodeError) as error:
            return self.send_json({"error": str(error)}, 400)
        if result is None:
            return self.send_json({"error": "not found"}, 404)
        self.send_json(result)


def main(argv):
    parser = argparse.ArgumentParser(prog="server.py", description="Circuit web interface (local).")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args(argv[1:])
    server = ThreadingHTTPServer((args.host, args.port), Handler)
    print(f"Circuit web interface at http://{args.host}:{args.port}/  (Ctrl+C to stop)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
