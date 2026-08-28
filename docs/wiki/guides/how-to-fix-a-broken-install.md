---
type: guide
title: How to fix a broken install
description:
  Diagnose the three ways installing `acc` from a git ref delivers the wrong bytes —
  each of which has a form that succeeds at exit 0 — and apply the remedy that matches the one
  you hit.
tags: [guide, install, bun, troubleshooting]
related: [concept/conformance, tutorial/check-your-first-cli]
status: stable
generated: { by: claude-opus-5, at: 2026-08-21 }
---

# How to fix a broken install

## Goal

The `acc` you are running is the `acc` you asked for.

**A first install is not automatically safe.** Failure 1 needs a previous entry in your
project's `package.json`; failures 2 and 3 live in **bun's machine-global caches**, so a fresh
install into a project that never had `acc` still hits them if this package was ever installed
anywhere on the machine — measured, on the fourth adopter's first install, where an unpinned add
silently delivered the previous release. If this machine has never seen the package, run the
command in the README and come back only if something surprises you.

## Steps

### Confirm you have a problem

```sh
acc version --check
```

One network call, and it does the comparison for you: it reads the published tags with
`git ls-remote` over the same anonymous https the install line already uses, and tells you whether
what you have installed is the newest release. Three answers — up to date (exit `0`), a newer
release exists (exit `10`), or **could not check** (exit `0`, plainly stated: an unreachable
remote is not a failure of your invocation).

**It goes to the remote directly rather than through bun's clone cache**, which matters here: the
cache is the thing that lied in the incident this page exists for, so a check that consulted it
would agree with it and prove nothing.

Offline, or want only the number:

```sh
acc --version
```

Compare it against the release you meant to install. **Each of the three failures below has a
form that succeeds at exit `0` while giving you the old kit**, so this is the only thing that
distinguishes them from a clean install.

If it matches what you asked for, your install is fine.

⚠ **Compare against the version you _expect_, never against the one you had.** The number can
legitimately go **down**: this project reset its version line, so the upgrade everyone is
currently being asked to make runs `1.0.1` → `0.1.0` — measured, by an adopter making exactly that
move. A "did it go up" check reads that successful upgrade as a failure, and reads the stale
`1.0.1` that a silent no-op leaves behind as the newer kit.

And the check only settles anything if you pinned a **tag**, because a tag names the value to
compare against. The version changes when a release is cut and not otherwise, so on a **branch**
pin or no pin a stale copy answers identically to a fresh one **within** a release — and when
the staleness spans a release the number does change, but nothing has told you what it should
be, so an accurate `acc --version` reads as fine — see
[how far the version check reaches](#how-far-the-version-check-reaches) below, and clear the
cache before installing rather than trusting the number.

### The remedy, if you just want the command

```sh
bun remove agent-cli-conformance
bun pm cache rm
bun add -d 'git+https://github.com/ichabodcole/agent-cli-conformance.git#<ref>'
acc --version    # confirm you got what you asked for
```

Use the dependency key **as it appears in your `package.json`**, which is not necessarily the
repository name.

⚠ **`bun pm cache rm` clears bun's whole global cache** at `~/.bun/install/cache` — it takes no
package argument. Cheap on a laptop, expensive in CI, where it cold-caches every dependency of
every job sharing that runner. **Do not put it in a build step.**

### The three failures

They are genuinely distinct, and no single remedy covers all three. `bun remove` fixes the first;
`bun pm cache rm` fixes the second and third.

### 1. The duplicate key — silent

`bun add` pointed at a **different ref does not replace the dependency.** It appends a second
entry under the same key, prints `warn: Duplicate key` in output nobody reads, and resolves the
**first** one. You get the old kit at exit `0` with no error.

That second entry is written to `package.json`, so it is **committed, and your CI installs from
it**. Measured, after re-pointing at a ref:

```json
"agent-cli-conformance": "git+ssh://…/agent-cli-conformance.git",
"agent-cli-conformance": "git+ssh://…/agent-cli-conformance.git#4e740f7"
```

**Remedy:** `bun remove` before `bun add`. If your `package.json` already has two, fix the file
and the lockfile.

### 2. The stale bare clone — loud when pinned, silent when not

Bun keeps a bare clone of each git dependency and does not re-fetch it, so **anything pushed
after the clone was made is invisible**. What that does to you depends on whether your install
line names a ref:

**Pinned, the failure is loud.** The install fails with `no commit matching "…" found (but
repository exists)`, which is indistinguishable from a tag that does not exist
([oven-sh/bun#18947](https://github.com/oven-sh/bun/issues/18947)). **An upgrade always meets
this one**, because a release tag is by definition pushed after the install you are upgrading
from.

**Unpinned, the same stale clone answers silently instead.** With no `#ref`, bun resolves from
the default-branch state the clone already holds and never asks the remote whether anything
moved: exit `0`, a resolved commit in the lockfile, and an older kit on disk. Measured, on the
fourth adopter's first install — a fresh project that had never had `acc` received the previous
release while reading the current release's documents, because the machine's cache held a
resolution from before the release was cut. Same root as the loud form, opposite symptom: name a
ref the clone lacks and it refuses; name nothing and it quietly hands you what it already had.

**Remedy:** `bun pm cache rm` — and pin a tag, which keeps this failure loud for as long as tags
are never moved: a force-updated tag would resolve silently from a stale clone even pinned. This
project's tags do not move.

A `#semver:` range is a different matter — Bun does not support one
([oven-sh/bun#4978](https://github.com/oven-sh/bun/issues/4978)).

### 3. The stale extracted package — silent, and the worst of the three

The install can succeed at exit `0`, print a commit SHA, and put **different bytes on disk** —
because the extracted-package cache is stale _independently_ of the bare clone, so clearing one
does not clear the other. Nothing in the output says so.

**Remedy:** `bun pm cache rm`, then reinstall, then `acc --version`.

## Verification

### How far the version check reaches

Catching staleness takes two things: **the number has to differ, and something has to have told
you what to expect.** The version only changes when a release is cut, so the number differs
**across** a release and never **within** one — and `acc version --check` is what supplies the
second half, reading the published tags so the expected value comes from somewhere rather than
from memory.

That pairing is also the limit. `--check` supplies the expectation and automates the comparison;
it does not extend the reach. Where the number cannot differ, no amount of knowing what to expect
helps — so **failure 3 above stays invisible to it**, because a stale extracted package at the
same version but different bytes compares equal against the tag name.

- **Pin a tag** and the check is meaningful: the tag names the value the output must match.
- **Pin a branch, or nothing,** and the check reaches less than it looks like it reaches. Within
  a release, a stale copy reports the same version as a fresh one. Across a release the number
  does differ — measured, on the fourth adopter's first install, where a silently stale unpinned
  install reported the previous release's version accurately — and with no pinned tag nothing in
  the flow named the value to compare against, so an accurate old number read as a fine install.
  **That is the half `acc version --check` closes**: it names the expected value even where the
  pin does not. What it cannot close is the within-a-release case, where the number is identical
  and there is nothing to compare. There, `bun pm cache rm` before installing is still the only
  reliable answer, and it costs a re-download.

**And the reason `--check` is the proof step rather than a convenience beside it:** the remedy
below cannot demonstrate that it worked. `bun pm cache rm` reported
`Cleared 0 cached 'bunx' packages` on a machine that **was** poisoned, and the git-clone cache it
actually needed to clear reports nothing at all. Only the version after reinstalling settles it —
so run `acc version --check` **after** the remedy, not instead of it.

### Why this is on a page of its own

This is Bun's behaviour and not something this kit can fix. It is written down because a tool that
reports success while doing something else is the entire subject of this project, and this install
path does exactly that.

If a previous upgrade silently no-opped, **the conformance runs you made since then were the old
kit's verdicts.** Re-run before trusting them.
