# circuito-lang: instructions for coding agents

Course project (Formal Languages and Compilers) by Lucas Leal and Jonas Gabriel. Python 3 + ANTLR **4.13.2**.

## Rules
- Do not change the language (`grammar/Circuit.g4`) or the compiler stages in `src/` (lexical, syntactic, ast_*, semantic, simulator, error_strategy) without the owners' agreement. The web layer (`src/api.py`, `src/server.py`, `web/`) only calls them.
- `generated/` is never versioned. Regenerate with `bash generate.sh` (needs `antlr4` on PATH; answer `y` if it offers to download Java).
- Technical documentation and the grammar are in English. Keep `README.md` and `README.pt-BR.md` in sync.
- `docs/DIARIO.md` belongs to the team: never write entries in it.
- Commits: small, in Portuguese, authored by the human owner; no AI co-author or "generated with" lines.
- No push, PR or deploy without the owner saying so. No paid services or APIs.
- Programs are only parsed and analyzed. Never `eval`/`exec` program text or pass it to a shell.

## Commands
- Tests: `python -m pytest`
- Web interface: `python src/server.py` then open http://127.0.0.1:8765/

## Working with several agents
One coordinator integrates and reviews. Delegate only independent tasks with an exclusive write scope (see `orca/BRIEF-web.md` for an example brief) and verify the delivered files before accepting them.
