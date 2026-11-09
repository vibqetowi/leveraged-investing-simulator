# Gap audit

What the docs don't cover yet, and where they disagree with the repo
(CLAUDE.md TRUTH-3, CRAFT-4). An entry goes when the gap is closed. Gaps
between the design docs and the code are not listed: they are the
architecture review's subject (CLAUDE.md, Design docs are aspirational).

| # | Gap | Where | Found |
| --- | --- | --- | --- |
| 1 | `index.protondoc` is tracked at the root, but nothing references it and no doc says what it is. | repo root | 2026-11-06, /review |
| 2 | `docs/directory-structure.md` holds no tree: the mapper (`python tools/directory_mapper.py`) hasn't been run. The agent can't run it until the profile allows it (plan, A.3). | `docs/directory-structure.md` | 2026-11-06, /review |
| 4 | Whether `main` has branch protection or required checks is unknown: `gh api` isn't on the agent's allowlist. | `docs/DEVELOPMENT.md`, CI | 2026-11-06, /review |
| 5 | Architecture docs live in `documentation/`, every other doc in `docs/`. | `documentation/` | 2026-11-06, /review |
