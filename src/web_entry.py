"""Entry point for running the web API without an HTTP server (browser, Pyodide).

The static site (any static host) loads the compiler into the browser with Pyodide and calls
`handle(path, body_json)`, which dispatches to exactly the same functions the local
server (server.py) uses. No language rule lives here.
"""
import json

import api  # noqa: F401  (imported first so a broken bundle fails at load time)
import server


ROUTES = ("/api/compare", "/api/expression", "/api/analyze", "/api/simulate", "/api/table")


def handle(path, body_json="{}"):
    """Answer one API call. Returns a JSON string: the result, or {"error", "status"}."""
    if path != "/api/examples" and path not in ROUTES:
        return json.dumps({"error": "not found", "status": 404})
    try:
        if path == "/api/examples":
            return json.dumps(server.list_examples())
        body = json.loads(body_json or "{}")
        if not isinstance(body, dict):
            raise ValueError("body must be a JSON object")
        result = server.handle_api(path, body)
    except (ValueError, json.JSONDecodeError) as error:
        return json.dumps({"error": str(error), "status": 400})
    if result is None:
        return json.dumps({"error": "not found", "status": 404})
    return json.dumps(result)
