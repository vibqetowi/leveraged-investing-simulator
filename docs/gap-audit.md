# Gap audit

What the docs don't cover yet, and where they disagree with the repo
(CLAUDE.md TRUTH-3, CRAFT-4). An entry goes when the gap is closed. Gaps
between the design docs and the code are not listed: they are the
architecture review's subject (CLAUDE.md, Design docs are aspirational).

| # | Gap | Where | Found |
| --- | --- | --- | --- |
| 1 | `index.protondoc` is tracked at the root, but nothing references it and no doc says what it is. | repo root | 2026-11-06, /review |
| 2 | `docs/directory-structure.md` holds no tree: the mapper (`python tools/directory_mapper.py`) hasn't been run. It stays the user's to run: the agent profile leaves it out (2026-11-09), since Python is needed for nothing else here. | `docs/directory-structure.md` | 2026-11-06, /review |
| 5 | Architecture docs live in `documentation/`, every other doc in `docs/`. | `documentation/` | 2026-11-06, /review |
