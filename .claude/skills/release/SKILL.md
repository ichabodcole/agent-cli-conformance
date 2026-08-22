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

**Scope: the release only.** Landing work on `develop` needs none of this. This skill starts when
`develop` is ready to promote.

**The policy lives in [`AGENTS.md`](../../../AGENTS.md) § Branches and releases**, including which
commit types cut a version. Follow it; do not restate it here.

**The agent does not merge to `main`.** That is the human's call, and merging is what publishes.

---

## 0 · Preconditions

```bash
git status --porcelain                       # must be EMPTY
git fetch origin
git checkout develop && git merge --ff-only origin/develop
bun run check > /tmp/gate.log 2>&1; echo $?  # must be 0
```

> **⚠ A pipe throws away the exit status, so keep every step above out of one.** `bun run check |
tail` reports **`tail`'s** status, not the gate's — `sh -c 'exit 7' | tail -5; echo $?` prints
> `0`. The same applies to `git checkout`, `git merge` and anything else whose success you go on to
> rely on: piped into `tail` or `head`, a failure exits `0`, and an `&&` after it runs anyway on a
> branch you never switched to. Redirect, then read `$?`.

Then look at what is actually going to `main`, because it decides whether there is a release at all:

```bash
git log main..develop --format='%h %s'
```

If nothing in that range is `feat`, `fix` or a breaking change, **merging produces no version and no
release PR** — which is correct, not broken. Say so before anyone waits for one.

## 1 · The release note — a FRESH agent, reading the tree

**Not the agent that did the work.** It knows what was _interesting_ — what surprised it, what it
falsified. It does not reliably know what was _delivered_, and it will write the retro instead of
the release note.

Dispatch a subagent with the commit range and nothing else: no session summary, no hand-off.
Reconstructing from `git log main..develop`, the diff and the docs is the point — it is what a
future reader will do. **If it cannot write a good note from the artifacts, that is a finding about
the artifacts.**

Ask it to return, kept separate from the prose:

1. what it could **not** determine from the tree;
2. where documents **contradicted** each other or the code;
3. anything that reads as shipped but is a **limitation**, or the reverse.

**The sourcing rail applies to release notes.** Do not publish a claim nothing measured. A note
saying a checker "now catches X" while that checker reports `unverified` for X is this project's own
defect class, shipped under its own name.

Build **one file**: subject on line 1, blank line, then body.

> **⚠ A `BREAKING CHANGE:` footer is a version instruction too.** release-please parses the body
> as well as the subject, so dropping the `!` while leaving the footer still cuts the larger bump.
> Grep the whole message before you trust the type you picked.

> **⚠ The subject is a version instruction before it is a description.** Its Conventional Commit
> type is parsed and it decides the released version. Pick the type from **what the range
> contains**, not from how the release feels — a promotion carrying only fixes is not a `feat`
> because it happens to be the first one anyone can install. When the range's own commits already
> carry the signal, `chore(release):` adds none and lets them decide. Check the type against §0's
> range before writing anything else.

> **⚠ Pick the TYPE, never the version number.** The type is yours. The number is created by
> release-please on the release PR in §5. Do not work it out from the current version and the
> config — write the note with no version in it, and fill the number in once that PR names one.

## 2 · Cold-read it

A second fresh agent, given **only the note text**, forbidden from looking anything up. If it wants
to go check something, that is the finding.

Ask for terms it could not confidently interpret — separating _"I don't know this word"_ from _"I
know it but it might mean something specific here"_ — and what it takes away in two sentences.

> **The second category is the dangerous one.** An unknown word sends a reader to look it up; a
> half-recognised one lets them carry on with the wrong reading.

Wrong facts are defects: **fix them in the tree and commit**, do not paper over them in the note.
Ambiguous terms get fixed in the note.

**Read it again whenever you have changed something a reader meets.** Cheap, and the failure it
prevents is shipping a confident wrong sentence. Do not count the reads — count what they return.

- **A read that returns defects** — a claim that is false, two sentences that disagree, something
  that would make a reader act wrongly — has earned the next one. Fix and go again.
- **A read that returns preferences** — wording, tone, a section someone would have ordered
  differently — is the signal to stop. Not because further reads are forbidden, but because the
  note is now being judged rather than checked, and the next reader will have different taste
  rather than better information.

Judge each finding by whether it names something **wrong**, not by whether it is new. A late read
often objects to a fix an earlier one asked for; that is two readers disagreeing about taste, and
resolving it costs a round trip and buys nothing.

**Watch for the note arguing with its own previous reader** — a term explained three times, a
paragraph defending against an objection this reader never raised. That is a hazard of reading it
more than once, and only a fresh pair of eyes will see it, because the person editing remembers
why every sentence is there.

## 3 · Open or update the PR

Push `develop` first — `gh` reads the **pushed** branch, so an unpushed commit is silently missing.

```bash
gh pr create --base main --head develop \
  --title "$(head -1 note.md)" --body-file <(tail -n +3 note.md)

gh pr edit <n> --title "$(head -1 note.md)" --body-file <(tail -n +3 note.md)   # if it exists
```

> **⚠ `gh` splits title and body; `git` does not.** `tail -n +3` assumes exactly one subject line and
> one blank line — check with `awk 'NR<=3'` first, or the body silently loses its first line.

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
> so the whole first paragraph becomes the subject — `subject: short This is the body paragraph and
it is long.`

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

**Check the release branch is current before trusting its verdict:**

```bash
git fetch origin
git merge-base --is-ancestor origin/main origin/<release-branch> && echo current || echo STALE
gh pr update-branch <n> --rebase    # the fix when it is stale
```

> **⚠ A change to `main` does not update an already-open release PR.** release-please refreshes it
> only when the proposed release changes, so a commit that cuts no version — a gate fix, tooling,
> anything typed `ci` or `chore` — leaves the PR sitting on a stale base. `main` goes green, the
> release PR stays red, and nothing on screen says why.

> **⚠ The release PR runs the repo's own gate over files the generator wrote.** A generated
> `CHANGELOG.md` is the usual collision: any formatter or linter asserting over authored Markdown
> asserts over that one too, and the two will disagree on style. **Exempt the generated artifact;
> do not format it.** Formatting fixes one release — the generator rewrites the file in its own
> style on the next one, and the release after that fails identically.

### If something has to land on `main` mid-release

It is a promotion like any other, but **skip §1 and §2** — the note ceremony is for the release,
not for an unblock. Give it a plain Conventional Commit subject, typed so it adds **no** version
signal, so the pending release keeps the version it already proposed. Then come back and rebase the
release PR, which will still be on the stale base.

## 6 · The published Release — the step that is easy to skip

The GitHub Release body is the changelog: a list of commit subjects. **Everything §1 and §2 produced
is absent from it**, and it is the one artifact a consumer actually reads.

So after the release PR merges, put the note there:

```bash
gh release view v<version>
gh release edit v<version> --title "<version> — <what a reader got>" --notes-file note.md
```

**Keep the generated changelog.** Put the note above it rather than replacing it: the changelog is
the complete list, the note is what it meant. Deleting the list to make room for prose loses the
half that is exhaustive.

## 7 · Back-merge, then verify

The release PR commits the version bump to `main`, so `develop` is now behind:

```bash
git checkout main && git pull && git checkout develop && git merge main && git push
```

Then confirm the release is what you wrote:

```bash
git log -1 --format='%s' main            # your subject, not "Merge pull request …"
git log -1 --format='%b' main | wc -c    # ~subject length means --body-file was dropped
gh release view v<version>
```

## 8 · Feedback

**Close the run by reporting on this file**, in a line or two: any step that misfired, was
ambiguous, did not apply, or was missing. Raise it with the human as a proposed change — do not work
around it silently, and do not edit this skill unprompted.

A step that failed is worth more than a step that passed. The failure is the only evidence this file
is wrong.
