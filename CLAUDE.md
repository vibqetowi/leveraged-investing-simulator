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

The docs lead (the user, 2026-11-09): a feature is written first, in a plan
commit of its own, into the design docs and the copy the user sees (its
"marketing"). The next commit then makes the code true to them. This is the
one case where code is changed to match a doc before the review.

## Branches, issues and releases

How work lands is in [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md), Branches
and releases. For me, that means:

- Each commit of `docs/plan.md` has one GitHub issue. I open it under that
  commit's `/go` if it doesn't exist yet, the plan names it (`#n`) beside
  the letter, and that commit's message file (below) ends with `Closes #n`.
- Work lands on `dev`. The user commits it (CONSENT-7), and I never aim a
  change at `main`.
- Two agent sessions may work on different plan commits at the same time
  (the user, 2026-11-09). So each commit's message is in
  `temp/commit-message-<commit>.txt` (`-E`, `-C1` …), not the shared
  `temp/commit-message.txt` of PROCEDURE-4, and I give the user that
  commit's own `git add` with its paths named, never `git add -A`. A file
  two open commits both change can't be split this way, so the plan puts
  those commits one after the other. `docs/plan.md` goes in whichever
  commit is committed first.
- A release is the user's call. When they say one is due, I write its notes
  in `temp/` and open the pull request from `dev` to `main`; the merge and
  the tag are theirs.
- `dev` keeps a clean history: one commit per issue, each message able to
  stand alone. Before a release pull request, and whenever I'm back on
  `dev`, I check `git log` and, if it needs a rebase (a fixup, a commit
  that mixes two issues), I write the rebase for the user to run. The user
  asked me to run it myself (2026-11-09), but CONSENT-7 keeps git writes
  theirs and the hook refuses them; changing that is a change to the
  shared rules.

## Finance and modelling questions are mine to settle

The user isn't a finance specialist (2026-11-09). When a question has a
financially or statistically correct answer (which statistic to compare,
how a margin call or a loan works, what a model should compute), I settle
it by what is correct, say in a sentence or two of plain language why, and
build it: I don't ask the user to choose. A plan row for it says what I
decided, pre-ticked like a bug fix. I ask only when it's a product choice
(what the page offers, what the user wants to model), and then I explain
the finance the user needs to choose.

## Copy keeps the user's voice

The page's copy (`index.html`, `scripts/copywritingHelper.js`) and the
README's opening are written in the user's voice, by `temp/brandbook.md`,
from the leveraged-investing posts in `temp/associated-linkedin-posts.md`,
where the user adds each new post (both untracked by the user's choice,
2026-11-10: they stay out of this public repo). Editing the user's prose
in general is CLAUDE-shared.md's CRAFT-10. The design docs
(`documentation/`) stay technical.

## Never clean

The folders I never "clean up" (CONSENT-9), besides `temp/`:

- `build/`: generated, but committed on purpose: the tests, CI and GitHub
  Pages load the WASM from it ([build/README.md](build/README.md)).

## Known, not a risk

What this repo knows that would otherwise look like a risk (TRANSPARENCY-2):

- `main` has no branch protection or required checks, by the user's choice
  (2026-11-09): I don't propose them again.

## Read

Besides the shared table (TRUTH-3):

| Read | When |
| --- | --- |
| `documentation/DataFlow.md` | Before changing `scripts/`, `assembly/` or `config.js`: module contracts, the provider map, the stats buffer layout |
| `build/README.md` | Before changing `asconfig.json`, the `asbuild:*` scripts or what the worker loads |
