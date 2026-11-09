# Long-term plan

What the user is considering but hasn't scheduled, or has put out of scope
(CLAUDE.md TRUTH-3). When a project is picked up, its items move to
`docs/plan.md` and are deleted here. A parked project is never raised.

| # | Project | Depends on | State |
| --- | --- | --- | --- |
| 1 | Generated files under `temp/`: Vitest `cacheDir`, a `vite.config.js` with `cacheDir`, the benchmark report to `temp/test-results/` (and the upload path in `test.yml`), delete the committed `vitest-report.json` and `vitest-summary.json`, and a test that guards it. What each tool writes today is in `docs/DEVELOPMENT.md`, Generated files. | the leverage engine (plan, commit C) | Not scheduled: off the critical path (2026-11-06). |
| 2 | Dead code and deploy contents: delete the unused `scripts/simulationWorkerNode.js` (the tests use `tests/helpers/`'s, which has diverged); drop `asbuild:math` and `build/math.*`, which nothing loads; fix the comment at `scripts/simulationOrchestrator.js:240` (the benchmark is in `tests/perf/`); exclude `docs/`, `tools/`, `tests/`, `CLAUDE.md` and the test configs from the Pages site in `_config.yml`. | the architecture review (plan, commit B), which may reshape these files | Not scheduled (2026-11-06). |
| 3 | Move `documentation/DataFlow.md` into `docs/` (gap-audit 5). | the architecture review | Not scheduled (2026-11-06). |
