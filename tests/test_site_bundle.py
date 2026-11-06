"""The static site: bundle.zip must contain a working compiler without anything else installed."""
import json
import os
import subprocess
import sys
import zipfile

import pytest

sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent.parent / "scripts"))
import build_site  # noqa: E402
import web_entry  # noqa: E402


@pytest.fixture(scope="module")
def site(tmp_path_factory):
    return build_site.build(tmp_path_factory.mktemp("site"))


def test_site_contains_the_interface_and_the_bundle(site):
    assert (site / "index.html").is_file() and (site / "js" / "main.js").is_file()
    assert (site / ".nojekyll").is_file() and not (site / ".npm-cache").exists()
    names = zipfile.ZipFile(site / "bundle.zip").namelist()
    for needed in ("src/api.py", "src/web_entry.py", "src/semantic.py", "src/simulator.py",
                   "generated/CircuitParser.py", "lib/antlr4/__init__.py", "examples/half_adder.circ"):
        assert needed in names
    assert not any("__pycache__" in n for n in names)


def test_index_uses_relative_urls_for_project_pages(site):
    html = (site / "index.html").read_text(encoding="utf-8")
    assert 'href="/' not in html and 'src="/' not in html


def test_bundle_runs_without_site_packages(site, tmp_path):
    """Simulates the browser: only the unpacked bundle on the path, no installed antlr4."""
    zipfile.ZipFile(site / "bundle.zip").extractall(tmp_path)
    script = (
        "import json, web_entry;"
        "r = json.loads(web_entry.handle('/api/expression', json.dumps({'expression': 'A OR B'})));"
        "a = json.loads(web_entry.handle('/api/analyze', json.dumps({'code': r['code']})));"
        "t = json.loads(web_entry.handle('/api/table', json.dumps({'code': r['code']})));"
        "e = json.loads(web_entry.handle('/api/examples'));"
        "print(json.dumps([a['stages']['semantic'], t['rows'], len(e) > 5]))"
    )
    env = {**os.environ, "PYTHONPATH": os.pathsep.join([str(tmp_path / "src"), str(tmp_path / "lib")])}
    run = subprocess.run([sys.executable, "-S", "-c", script], capture_output=True, text=True,
                         encoding="utf-8", env=env, cwd=tmp_path)
    assert run.returncode == 0, run.stderr
    assert json.loads(run.stdout) == ["ok", [[[0, 0], [0]], [[0, 1], [1]], [[1, 0], [1]], [[1, 1], [1]]], True]


def test_handle_matches_the_http_api():
    code = 'circuit "t";\ninput A;\noutput S;\nS = NOT A;\n'
    import api
    assert json.loads(web_entry.handle("/api/analyze", json.dumps({"code": code}))) == \
        json.loads(json.dumps(api.analyze_program(code)))


def test_handle_errors():
    assert json.loads(web_entry.handle("/api/nope", "{}"))["status"] == 404
    assert json.loads(web_entry.handle("/api/analyze", "{}"))["status"] == 400
    assert json.loads(web_entry.handle("/api/analyze", "not json"))["status"] == 400
    assert json.loads(web_entry.handle("/api/analyze", "[1]"))["status"] == 400


def test_zip_has_the_site_at_the_root(tmp_path):
    site = build_site.build(tmp_path / "site")
    names = set(zipfile.ZipFile(build_site.make_zip(site)).namelist())
    assert {"index.html", "bundle.zip", "js/main.js", "js/backend.js", "js/pyworker.js"} <= names
    assert not any(n.startswith("site/") for n in names)
