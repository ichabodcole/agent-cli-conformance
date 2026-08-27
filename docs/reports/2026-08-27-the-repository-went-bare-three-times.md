---
type: report
generated: { by: claude-opus-5, at: 2026-08-27 }
status: stable
lifecycle: discharged
description:
  A test fixture turned the working repository into a bare one, three times over two weeks, and
  three confident explanations of why were wrong — including two from the people who had already
  measured it. What separated the right answer from the wrong ones every time was running it in a
  clone somebody was willing to destroy.
tags: [tooling, evidence, testing, git]
subject:
  the pre-commit hook, the test suite's git fixtures, and src/acc/kit/git-fixture-env.ts +
  git-spawn-scan.ts
examined: develop at fca520a, and the three occurrences between 2026-08-13 and 2026-08-27
---

# The repository went bare three times

A fixture in this project's own test suite reconfigured the working checkout into a bare
repository — three times, on the owner's real clone. After each one, git answered nearly every
command with `fatal: this operation must be run in a work tree`.

Nothing was lost on any occasion. The reason this is written down is not the damage. It is that
**three people gave three confident explanations and all three were wrong**, and each was
corrected the same way.

## What "bare" means here, and why it looks like git breaking

A git repository is _bare_ when it has no working tree — no checked-out files, just the object
database. It is a normal thing for a server-side repository to be and a useless thing for the one
you are editing in. The setting is `core.bare` in the repository's config.

`git worktree` creates _linked worktrees_: additional checked-out directories backed by one
object store. **They share a single config file.** A write to `core.bare` from inside a linked
worktree therefore lands on the main checkout too, which is how a fixture in a temporary directory
took out a repository it never named.

## The mechanism

Established by reproduction, in a throwaway clone, in both directions:

1. A pre-commit hook run from a linked worktree exports `GIT_DIR` as an absolute path to that
   worktree's git-dir, and `GIT_INDEX_FILE` beside it. It does **not** export `GIT_WORK_TREE`.
   That omission is the whole hinge.
2. The hook runs the test suite. A fixture spawns `git init` in a temp directory **without
   clearing the environment**, so it inherits `GIT_DIR`.
3. `git init` therefore re-initialises the git-dir it was handed rather than creating a new one.
   With no `GIT_WORK_TREE` it cannot determine a working tree for that git-dir, so it records
   `core.bare = true`.
4. Shared config, so the main checkout is now bare.

Measured on 2026-08-27 in a disposable clone:

    unguarded `git init` (inherits GIT_*)   ->  clone core.bare: true
    guarded   `git init` (GIT_* stripped)   ->  clone core.bare: false, fixture gets its own .git

An earlier attempt to reproduce this by setting all three variables by hand could not fail —
supplying `GIT_WORK_TREE`, the one variable the real hook omits, is exactly what makes the
repository look non-bare. **The reproduction has to omit what the hook omits.**

## Three explanations that did not survive

Each was held confidently, by someone who had already looked. Two were held by people who had
measured other parts of this correctly the same day.

**1. "Discovery walks up the directory tree."** Offered after occurrence 1: something in the kit
was thought to be searching upward from the fixture directory and finding the real repository.
Killed by measurement. _(Reported by the maintainer who raised and retracted it; not
independently re-measured for this report.)_

**2. "The guards are not on `develop`."** Occurrence 3. The reporter had added the guards on an
earlier branch, hit the bug again, and searched the recent log for them:

    git log --oneline develop -8 | grep -iE "hook|GIT_|fixture|guard"

Eight subjects out of several hundred. Nothing matched, and that was read as absence. The two
commits sat at rows 35 and 36 — and their subjects would both have matched the pattern. **The
pattern was fine; the window was eight.** This was escalated as an urgent operational directive,
which is the worst carrier for a wrong claim.

    git merge-base --is-ancestor <guard> develop      -> yes
    git merge-base --is-ancestor <guard> <their base> -> yes

**A bounded search returning nothing is not evidence of absence. It is evidence about the
bounds.**

**3. "The guards are present and were insufficient."** The inversion of (2), reached within
twenty minutes of correcting it, and wrong in a more expensive way: it retired a root cause that
had never been falsified, and implied the repair needed redesigning. One grep would have settled
it. The guards were never _applied_ to the code that fired — a feature branch had added two new
`git init` sites that did not use them.

The author of (3) had written the sentence in (2)'s correction — _a bounded search returning
nothing is evidence about the bounds_ — and then reasoned from "guards present, still bricked" to
"guards insufficient" without checking whether the firing code was covered. **A rule you state
does not transfer to the reasoning you do twenty minutes later unless something makes it.**

**And one of mine, in the repair rather than the diagnosis.** Surveying how many places spawn git,
I searched only for `Bun.spawnSync`, found five sites, and designed against that number. The suite
mostly uses `node:child_process`; the real figure was twenty-five. Same error as (2), caught only
because the population was re-measured before the design was fixed rather than after.

## Why a green test run is not evidence here

This is the property that hid the bug three times and is worth carrying to other projects.

The damage requires `GIT_DIR` in the environment, and **only the hook supplies it**. Run by hand
there is no `GIT_DIR`, the fixtures build their own repositories in a temp directory, and an
unguarded suite is _honestly_ green — not flaky, not lucky. Correct, for the environment it ran
in.

On occurrence 3 the full gate was run by hand immediately before the commit whose hook bricked the
checkout. Same tree, same fixtures, same guards, opposite outcome. **The input that decides the
outcome is supplied only by the environment nobody runs locally.**

## The control nobody designed

The evidence that settled it had already been collected by someone who was not experimenting.

A second agent had made six commits that evening from two linked worktrees, through the same hook,
with the same absolute `core.hooksPath` firing the main checkout's hook, and nothing went bare.
The reporter of occurrence 3 made one commit in the same configuration and it did.

Same hook, same topology, opposite outcome — so the trigger was not the configuration. It was
something in one of the two trees:

    develop            git init sites: 1  (guarded)
    the survivor's     git init sites: 1  (guarded)
    the failing branch git init sites: 3  (two of them unguarded, both new that evening)

That was the whole discriminator, and it existed before anyone ran a reproduction. Six commits
made with no experimental intent turned out to be the control arm.

## What closed it, and what did not

**The weaker half** was defining the guard once, in `src/acc/kit/git-fixture-env.ts`, and
importing it. That fixed the two sites that were wrong. It does not stop the next fixture, because
using it requires the author to know it exists — and not knowing is precisely what happened.

**The durable half** is `src/acc/kit/git-spawn-scan.ts`: a check that fails a test which spawns
git without a stripped environment. It is **source-level rather than behavioural**, for the reason
in the section above — a behavioural test only fires in the environment nobody runs locally. It
reads the shape of the call, so it fails in a plain `bun test`, on any machine, with no hook.

It fails closed: a spawn it cannot classify, in a file that runs git, is a failure to look at
rather than a pass. That arm is load-bearing rather than cautious — **the shape that caused the
incident is caught by it and not by the literal-`git` arm**, because the offending spawn passed an
opaque variable and the word `git` appeared only at the caller.

### The check's first version went blind on the files that took the advice

Worth recording, because it nearly shipped and because it is the same defect one level up.

The first version decided whether a file was worth scanning by looking for a quoted `"git"`
literal in it. But a file that routes every git call through the shared helper **no longer
contains that literal** — adopting the fix removes the evidence the check was keyed to. Both
files that run git in this repository had adopted it. The check would have inspected neither.

It was found by reintroducing the real incident into the real tree and re-running: no failure. Not
by re-reading the code, which had been read four times. The predicate now treats importing the
guard as the strongest evidence a file runs git, rather than the weakest.

A second, smaller version of the same thing: written as TypeScript, the violating specimens used
to prove the check can fire were flagged as real violations of the file testing them. They live as
`.txt` fixtures now, so the check needs no exemption for itself.

## What it does not cover

- **Source text is what it binds to**, which is the same class of instrument as recognising an
  error by its message. It works until someone writes a spawn in a shape it does not recognise.
  That is why it fails closed and why its allowlist prints reasons.
- **The allowlist exempts a file, not a line.** Two entries today, each carrying a measurement
  rather than a name.
- **`git ls-remote` in `src/acc/release.ts` is allowlisted**, on a measurement: against an
  explicit URL it produced identical output and exit 0 with and without an inherited `GIT_DIR`,
  and neither repository's `core.bare` moved. It creates and initialises nothing.
- **Nothing here protects a fixture in another repository** that copies this suite's shape without
  the module.

## What transfers

1. **A bounded search returning nothing is evidence about the bounds, not about absence.** Twice
   in one evening, once shipped as an urgent directive.
2. **A green run is not evidence when the deciding input is absent from the run.** State what
   supplies it before reading the green.
3. **A rule with no home gets re-decided at every call site.** The guard, an over-sold sentence
   about recording, and an error classification split across three call sites were all this shape
   in the same week. The repair is the same each time: give the rule a home, then a check that
   fires without anyone remembering.
4. **Reproduce it in a clone you are willing to destroy.** Three occurrences, three confident
   explanations, and the only thing that moved this bug each time was somebody running it.
