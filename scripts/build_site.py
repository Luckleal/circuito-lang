#!/usr/bin/env python3
"""Builds the static site (for GitHub Pages or any static host) into site/.

Usage: python scripts/build_site.py [output_dir] [--zip]   (run `bash generate.sh` first)

--zip also writes <output_dir>.zip with the site at the root of the archive, ready to upload to
any static host (upload the contents to the public folder, e.g. public_html).

The site is web/ plus `bundle.zip`: the compiler sources, the ANTLR output (generated/),
the ANTLR Python runtime and the examples. In the browser, Pyodide unpacks the bundle
and runs the same Python code as the command line and the local server.
"""
import shutil
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def add_tree(archive, source, prefix, pattern):
    for path in sorted(source.rglob(pattern)):
        if "__pycache__" not in path.parts:
            archive.write(path, f"{prefix}/{path.relative_to(source).as_posix()}")


def build(output):
    generated = ROOT / "generated"
    if not (generated / "CircuitLexer.py").exists():
        raise SystemExit("generated/ not found: run `bash generate.sh` first.")
    try:
        import antlr4
    except ImportError:
        raise SystemExit("antlr4-python3-runtime is not installed: run `pip install -r requirements.txt`.")
    runtime = Path(antlr4.__file__).resolve().parent

    output = Path(output)
    if output.exists():
        shutil.rmtree(output)
    shutil.copytree(ROOT / "web", output, ignore=shutil.ignore_patterns(".npm-cache"))
    (output / ".nojekyll").write_text("", encoding="utf-8")

    with zipfile.ZipFile(output / "bundle.zip", "w", zipfile.ZIP_DEFLATED) as archive:
        add_tree(archive, ROOT / "src", "src", "*.py")
        add_tree(archive, generated, "generated", "*.py")
        add_tree(archive, runtime, "lib/antlr4", "*.py")
        add_tree(archive, ROOT / "examples", "examples", "*.circ")
    return output


def make_zip(site):
    """Zip the site with its files at the root of the archive."""
    target = site.with_suffix(".zip")
    with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(site.rglob("*")):
            if path.is_file():
                archive.write(path, path.relative_to(site).as_posix())
    return target


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if a != "--zip"]
    target = build(args[0] if args else ROOT / "site")
    size = (target / "bundle.zip").stat().st_size / 1024
    print(f"Site built in {target} (bundle.zip {size:.0f} KiB)")
    if "--zip" in sys.argv:
        print(f"Archive: {make_zip(target)}")
