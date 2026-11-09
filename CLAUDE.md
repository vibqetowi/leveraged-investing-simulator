# leveraged-investing-simulator: agent rules

How I work here is in `<root>/CLAUDE.md`, the copy of Claude-Code-Setup's
`CLAUDE-shared.md`, which loads with this file. This file holds only what is particular to leveraged-investing-simulator: its facts, its own
rules, and what to read when. A rule the user states about how I work in
every repo goes there instead (TRUTH-2).

@README.md
@docs/DEVELOPMENT.md

## Design docs are aspirational

`documentation/DataFlow.md` and the other design docs describe the design
being aimed at, which may be ahead of or behind the code; neither is assumed
to be the better one. Until the architecture review ([docs/plan.md](docs/plan.md),
commit B) settles each point, I don't rewrite a design doc to match the code
or the code to match a doc, and `/review` doesn't treat a gap between them as
a defect. This narrows TRUTH-1 and CRAFT-4 for design docs in this repo.
Operational docs (README, `docs/DEVELOPMENT.md`, `build/README.md`) stay true
to what the commands and files do.

## Never clean

The folders I never "clean up" (CONSENT-9), besides `temp/`:

- `build/`: generated, but committed on purpose: the tests, CI and GitHub
  Pages load the WASM from it ([build/README.md](build/README.md)).

## Known, not a risk

What this repo knows that would otherwise look like a risk (TRANSPARENCY-2):

- None yet.

## Read

Besides the shared table (TRUTH-3):

| Read | When |
| --- | --- |
| `documentation/DataFlow.md` | Before changing `scripts/`, `assembly/` or `config.js`: module contracts, the provider map, the stats buffer layout |
| `build/README.md` | Before changing `asconfig.json`, the `asbuild:*` scripts or what the worker loads |
