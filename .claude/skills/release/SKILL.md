---
name: release
description:
  Cut a release from develop to main — write the release note from the tree with a fresh agent,
  cold-read it, open or update the promotion PR, and carry the note through to the published
  GitHub Release. Use when develop is ready to promote, when opening or updating a develop→main
  pull request, when release-please has opened its release PR, or when someone says "cut a
  release", "ship it", "publish", or "let's do the release".
---

# release — develop → main → published

**Scope: the release only.** Landing work on `develop` needs none of this — commit it and move on.
This skill starts when `develop` is ready to promote.

**The policy lives in [`AGENTS.md`](../../../AGENTS.md) § Branches and releases**, including which
commit types cut a version. This skill follows it and does not restate it; two copies of a rule is
the drift this repo exists to catch.

**The agent does not merge to `main`.** That is the human's call, and merging is what publishes.

---

## 0 · Preconditions

```bash
git status --porcelain                       # must be EMPTY
git fetch origin
git checkout develop && git merge --ff-only origin/develop
bun run check > /tmp/gate.log 2>&1; echo $?  # must be 0
```

> **⚠ Run the gate UNPIPED.** `bun run check | tail` reports **`tail`'s** status, which is always
> `0`. **Measured here 2026-08-20, zsh:** `sh -c 'exit 7' | tail -5; echo $?` → `0`, against `7`
> when redirected. A false green on the release gate is the worst possible place for this.

Then look at what is actually going to `main`, because it decides whether there is a release at all:

```bash
git log main..develop --format='%h %s'
```

If nothing in that range is `feat`, `fix` or a breaking change, **merging produces no
version and no release PR** — which is correct, not broken. Say so before anyone waits for one.

## 1 · The release note — a FRESH agent, reading the tree

**Not the agent that did the work.** It knows what was _interesting_ — what surprised it, what it
falsified. It does not reliably know what was _delivered_, and it will write the retro instead of
the release note.

Dispatch a subagent with the range and nothing else: no session summary, no hand-off. Reconstructing
from `git log main..develop`, the diff and the docs is the point — it is what a future reader will
do. **If it cannot write a good note from the artifacts, that is a finding about the artifacts.**

Ask it to return, kept separate from the prose:

1. what it could **not** determine from the tree;
2. where documents **contradicted** each other or the code;
3. anything that reads as shipped but is a **limitation**, or the reverse.

**The sourcing rail applies to release notes.** This repo does not publish claims it has not
measured — a note saying a checker "now catches X" when the checker reports `unverified` for X is
the same defect the catalogue exists to report, shipped under the project's own name.

Build **one file**, subject on line 1, blank line, then body.

## 2 · Cold-read it

A second fresh agent, given **only the note text**, forbidden from looking anything up. If it wants
to go check something, that is the finding.

Ask for terms it could not confidently interpret — separating _"I don't know this word"_ from _"I
know it but it might mean something specific here"_ — and what it takes away in two sentences.

> **The second category is the dangerous one.** An unknown word sends a reader to look it up; a
> half-recognised one lets them carry on with the wrong reading.

Wrong facts are defects: **fix them in the tree and commit**, do not paper over them in the note.
Ambiguous terms get fixed in the note. Re-read only if the note's _structure_ changed — **one
re-read maximum**, past which you are polishing.

## 3 · Open or update the PR

Push `develop` first — `gh` reads the **pushed** branch, so an unpushed commit is silently missing.

```bash
gh pr create --base main --head develop \
  --title "$(head -1 note.md)" --body-file <(tail -n +3 note.md)

gh pr edit <n> --title "$(head -1 note.md)" --body-file <(tail -n +3 note.md)   # if it exists
```

> **⚠ `gh` splits title and body; `git` does not.** `tail -n +3` assumes exactly one subject line and
> one blank line — check with `awk 'NR<=3'` first or the body silently loses its first line.

## 4 · Hand the human the merge command — with BOTH flags

```bash
gh pr merge <n> --merge \
  --subject "$(head -1 note.md)" \
  --body-file <(tail -n +3 note.md)
```

**Merge or rebase, never squash.** A squash resolves its headline to the PR _title_, and a title
that is not a Conventional Commit leaves release-please with no version signal.

> **⛔ The body is the half that gets skipped, and it is the half that survives.** GitHub pre-fills
> the subject as `Merge pull request #NN from …` and the body as the PR's **title**. The PR's
> _description_ never enters git at all — it lives only in GitHub's database, so `git log`, a fresh
> clone, `git bisect` and anyone offline never see it.

> **⛔ NEVER `-m "subject" -F body` with `git merge`.** git concatenates them **with no blank line**,
> so the whole first paragraph becomes the subject. **Measured here 2026-08-20:** subject came back
> as `subject: short This is the body paragraph and it is long.`

## 5 · The release-please PR

Merging into `main` publishes nothing. release-please opens a **second** PR with the version bump
and the changelog entry; merging _that_ creates the tag and the GitHub Release.

```bash
gh run list --workflow=release-please.yml --limit 3
gh pr list --base main
```

**Read its diff before merging it** — the proposed version, and the `CHANGELOG.md` entry. That entry
is built from **commit subjects only**, which is why the next step exists.

**Do not hand-edit `package.json` or `.release-please-manifest.json`.** release-please owns both.

## 6 · The published Release — the step that is easy to skip

The GitHub Release body is the changelog: a list of conventional-commit subjects. **Everything §1
and §2 produced is absent from it**, and it is the one artifact a consumer actually reads.

So after the release PR merges, put the note there:

```bash
gh release view v<version>
gh release edit v<version> --title "<version> — <what a reader got>" --notes-file note.md
```

Tags here are plain `v<version>` — no component prefix
([`release-please-config.json`](../../../release-please-config.json) sets
`include-component-in-tag: false`).

**Keep the generated changelog.** Put the note above it rather than replacing it: the changelog is
the complete list, the note is what it meant. Deleting the list to make room for prose loses the
half that is exhaustive.

## 7 · Back-merge, then verify

The release PR commits the version bump to `main`, so `develop` is now behind:

```bash
git checkout main && git pull && git checkout develop && git merge main && git push
```

Then confirm the release is what you wrote, from a clean read:

```bash
git log -1 --format='%s' main       # your subject, not "Merge pull request …"
git log -1 --format='%b' main | wc -c   # ~subject length means --body-file was dropped
gh release view v<version>
```

## 8 · What is measured here, and what is borrowed

This skill is adapted from `spellbook`'s and `anthill`'s `land` skills. Their own guidance is that a
borrowed claim comes in three kinds, and only one of them ports:

| kind          | example                                           | treatment                         |
| ------------- | ------------------------------------------------- | --------------------------------- |
| **mechanism** | `-m` + `-F` concatenates with no blank line       | **ports** — it is git's behaviour |
| **topology**  | which `git log` view reads back as releases       | **re-measure here**               |
| **audience**  | whether the narrative belongs in git or in GitHub | **re-decide** — a human's call    |

Both mechanisms above were **re-run in this repo on 2026-08-20** rather than carried, and both
reproduced.

**The topology is unmeasured, because this repo has never cut a release.** As of 2026-08-20 `main`
sits at `4638293` with **no GitHub Release and no promotion merge** — its one merge commit,
`07221f5`, predates the branch model and arrived by fast-forward, so `--first-parent main` is still
154 of 157 commits rather than a list of releases. Nothing here yet says how that view reads once
promotions start, or whether a back-merge fast-forwards `develop` onto `main`'s spine and buries its
own history — true in spellbook, false in anthill, and exactly the kind of claim that stays silent
when it fails to port.

**At the first release, measure it and write the answer into §7.** Until then, treat §7's verify
step as the thing that establishes the topology rather than as a formality.

_A borrowed scar that never fires here is worse than no scar: it teaches a hazard this repo does not
have. If a step misfires, correct it in place and say what you measured._
