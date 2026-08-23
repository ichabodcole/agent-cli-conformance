---
type: guide
title: How to fix a broken install
description:
  Diagnose the three ways installing `acc` from a private git ref delivers the wrong bytes — two
  of which succeed at exit 0 — and apply the remedy that matches the one you hit.
tags: [guide, install, bun, troubleshooting]
related: [concept/conformance, tutorial/check-your-first-cli]
status: stable
generated: { by: claude-opus-5, at: 2026-08-21 }
---

# How to fix a broken install

## Goal

The `acc` you are running is the `acc` you asked for.

**You do not need this page for a first install.** All three failures below need a previous
install of this package to already exist. If you have never installed it, run the command in the
README and come back only if something surprises you.

## Steps

### Confirm you have a problem

```sh
acc --version
```

Compare it against the release you meant to install. **Two of the three failures below succeed at
exit `0` while giving you the old kit**, so this is the only thing that distinguishes them from a
clean install.

If it matches what you asked for, your install is fine.

⚠ **Compare against the version you _expect_, never against the one you had.** The number can
legitimately go **down**: this project reset its version line, so the upgrade everyone is
currently being asked to make runs `1.0.1` → `0.1.0` — measured, by an adopter making exactly that
move. A "did it go up" check reads that successful upgrade as a failure, and reads the stale
`1.0.1` that a silent no-op leaves behind as the newer kit.

And it only distinguishes anything if you pinned a **tag**. The version changes when a release is
cut and not otherwise, so on a **branch** pin a stale copy and a fresh one answer identically —
see [how far the version check reaches](#how-far-the-version-check-reaches) below, and clear the
cache before installing rather than trusting the number.

### The remedy, if you just want the command

```sh
bun remove agent-cli-conformance
bun pm cache rm
bun add -d 'git+ssh://git@github.com/ichabodcole/agent-cli-conformance.git#<ref>'
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

### 2. The stale bare clone — loud

Bun keeps a bare clone of each git dependency and does not re-fetch it, so **a tag pushed after
your first install is invisible**. The install fails with `no commit matching "…" found (but
repository exists)`, which is indistinguishable from a tag that does not exist
([oven-sh/bun#18947](https://github.com/oven-sh/bun/issues/18947)).

**An upgrade always meets this one**, because a release tag is by definition pushed after the
install you are upgrading from.

**Remedy:** `bun pm cache rm`.

A `#semver:` range is a different matter — Bun does not support one
([oven-sh/bun#4978](https://github.com/oven-sh/bun/issues/4978)).

### 3. The stale extracted package — silent, and the worst of the three

The install can succeed at exit `0`, print a commit SHA, and put **different bytes on disk** —
because the extracted-package cache is stale _independently_ of the bare clone, so clearing one
does not clear the other. Nothing in the output says so.

**Remedy:** `bun pm cache rm`, then reinstall, then `acc --version`.

## Verification

### How far the version check reaches

`acc --version` catches staleness that **spans a release** and not staleness **within** one,
because the version only changes when a release is cut.

- **Pin a tag** and the check is meaningful.
- **Pin a branch, or nothing,** and a stale copy reports the same version as a fresh one. There,
  `bun pm cache rm` before installing is the only reliable answer, and it costs a re-download.

### Why this is on a page of its own

This is Bun's behaviour and not something this kit can fix. It is written down because a tool that
reports success while doing something else is the entire subject of this project, and this install
path does exactly that.

If a previous upgrade silently no-opped, **the conformance runs you made since then were the old
kit's verdicts.** Re-run before trusting them.
