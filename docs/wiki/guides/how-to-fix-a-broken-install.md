---
type: guide
title: How to fix a broken install
description:
  Diagnose why the `acc` you installed is not the `acc` you asked for — three failures, each with
  a form that succeeds at exit `0` — and apply the remedy that matches the one your install line
  can actually hit.
tags: [guide, install, bun, troubleshooting]
related: [concept/conformance, tutorial/check-your-first-cli]
status: stable
generated: { by: claude-opus-5, at: 2026-08-28 }
---

# How to fix a broken install

## Goal

The `acc` you are running is the `acc` you asked for.

### Which failures you can hit depends on your install line

**This page assumes the documented install line**, the one in the README:

```sh
bun add -d 'git+https://github.com/ichabodcole/agent-cli-conformance.git#<tag>'
```

Measured on **bun 1.4.0** against this **public github.com** repository — both conditions are
load-bearing, and a bun release, a private fork or a non-GitHub host could change what follows.
For a public github.com repository bun normalises `git+https://github.com/…` to
`github:owner/repo`: one code path, one `@GH@<owner>-<repo>-<sha>@@@1` cache key, and **no bare
clone on disk**. A `git+https` install prints
`installed …@github:ichabodcole/agent-cli-conformance#1a76405` — the `github:` form is what bun
resolved, not a different thing you asked for.

`git+ssh://git@github.com/…` is the **other** path, and it is a named exception throughout this
page. That transport **does** write a bare clone (`<hash>.git`, with a HEAD) plus a `@G@<sha>`
cache key — which is the thing failure 2 below is made of.

| Failure                        | `git+https://` (documented) | `git+ssh://`    |
| ------------------------------ | --------------------------- | --------------- |
| 1. The duplicate key           | yes — every transport       | yes             |
| 2. The stale bare clone        | no bare clone exists        | yes             |
| 3. The stale extracted package | not established             | not established |

**A first install is not automatically safe.** Failure 1 needs a previous entry in your project's
`package.json`. Failure 2 lives in **bun's machine-global caches**, so on `git+ssh://` a fresh
install into a project that never had `acc` still hits it if this package was ever installed
anywhere on the machine. If this machine has never seen the package, run the command in the README
and come back only if something surprises you.

## Steps

### Confirm you have a problem

```sh
acc version --check
```

One network call, and it does the comparison for you: it reads the published tags with
`git ls-remote` over anonymous https, and tells you whether what you have installed is the newest
release. Three answers — up to date (exit `0`), a newer release exists (exit `10`), or **could not
check** (exit `0`, plainly stated: an unreachable remote is not a failure of your invocation).

**It asks the remote for tags rather than reading anything bun cached** — and that independence is
the point. `git ls-remote` speaks the git transport directly; your `git+https://` install does not
go that way at all, it resolves through the `github:` tarball path. So the check cannot be
answered by the same cache that produced your install, and a cache that lied cannot make the check
agree with it.

Offline, or want only the number:

```sh
acc --version
```

Compare it against the release you meant to install. **Each of the three failures below has a form
that succeeds at exit `0` while giving you the old kit**, so this is the only thing that
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
[how far the version check reaches](#how-far-the-version-check-reaches) below.

### The remedy, if you just want the command

This is the sequence `acc version --check` prints on exit `10`, and it is the whole remedy on the
documented install line:

```sh
bun remove agent-cli-conformance
bun add -d 'git+https://github.com/ichabodcole/agent-cli-conformance.git#<ref>'
acc version --check    # confirm you got what you asked for
```

`bun remove` goes **first**, or the `add` appends a duplicate key — see failure 1. It is a no-op
when there is nothing to remove, so it is safe to run either way. Use the dependency key **as it
appears in your `package.json`**, which is not necessarily the repository name.

**Installing over `git+ssh://` instead?** Add `bun pm cache rm` before the `add`: that transport
keeps a bare clone bun does not re-fetch, so a pinned add can fail with `no commit matching "…"`
(failure 2).

⚠ **`bun pm cache rm` clears bun's whole global cache** at `~/.bun/install/cache` — it takes no
package argument. Cheap on a laptop, expensive in CI, where it cold-caches every dependency of
every job sharing that runner. **Do not put it in a build step.** And on the `git+https://` line
above — bun 1.4.0, this public repository — there is no bare clone to clear, so running it there
wipes the cache to clear nothing.

### The three failures

They are genuinely distinct, and no single remedy covers all three. `bun remove` fixes the first,
on every transport. `bun pm cache rm` is the remedy for the second and third **on `git+ssh://`**;
on the documented `git+https://` line the second does not occur, so there is nothing there for it
to fix.

### 1. The duplicate key — silent, on every transport

`bun add` pointed at a **different ref does not replace the dependency.** It appends a second
entry under the same key and resolves the **first** one. You get the old kit at exit `0` with no
error.

**On bun 1.4.0 there is no warning at all**, and the success line states the opposite of what
happened: it names the sha you **asked** for while the other is what gets installed. Measured
2026-08-28 on bun 1.4.0 — the success line reads `installed …#1a76405`, the sha of the release
being asked for, while the lockfile holds `#0034789` and the binary reports the version from that
older one. An older record of this project's says bun prints `warn: Duplicate key`; on bun 1.4.0
it does not, and the only signal left is the version afterwards.

That second entry is written to `package.json`, so it is **committed, and your CI installs from
it**. Measured 2026-08-22, after re-pointing at a ref (this specimen is a `git+ssh://` project;
the failure it shows is not transport-specific and still reproduces):

```json
"agent-cli-conformance": "git+ssh://…/agent-cli-conformance.git",
"agent-cli-conformance": "git+ssh://…/agent-cli-conformance.git#4e740f7"
```

**Remedy:** `bun remove` before `bun add`. If your `package.json` already has two, fix the file
and the lockfile.

### 2. The stale bare clone — `git+ssh://` only

**This failure needs a bare clone, and the documented `git+https://` line does not create one.**
Measured 2026-08-28 on bun 1.4.0 against this public repository, both halves: a pinned upgrade from
one release tag to the next in a single warm cache exits `0` with no `no commit matching`, and an
unpinned install against a cache seeded at the previous release delivered the newest one. If your
install line is `git+https://`, skip to failure 3.

On `git+ssh://`, bun keeps a bare clone of the git dependency and does not re-fetch it, so
**anything pushed after the clone was made is invisible**. What that does to you depends on
whether your install line names a ref:

**Pinned, the failure is loud.** The install fails with `no commit matching "…" found (but
repository exists)`, which is indistinguishable from a tag that does not exist
([oven-sh/bun#18947](https://github.com/oven-sh/bun/issues/18947)). **On `git+ssh://`, an upgrade
always meets this one**, because a release tag is by definition pushed after the install you are
upgrading from.

**Unpinned, the same stale clone answers silently instead.** With no `#ref`, bun resolves from the
default-branch state the clone already holds and never asks the remote whether anything moved:
exit `0`, a resolved commit in the lockfile, and an older kit on disk. Same root as the loud form,
opposite symptom: name a ref the clone lacks and it refuses; name nothing and it quietly hands you
what it already had.

There is one measured silent unpinned install on record — the fourth adopter's first install,
where a fresh project that had never had `acc` received the previous release while reading the
current release's documents. **Which transport that adopter installed over was not established**,
so it is not evidence about `git+https://` either way. It is the reason to pin a tag regardless of
transport.

**Remedy (`git+ssh://`):** `bun pm cache rm` — and pin a tag, which keeps this failure loud for as
long as tags are never moved: a force-updated tag would resolve silently from a stale clone even
pinned. This project's tags do not move.

A `#semver:` range is a different matter — Bun does not support one
([oven-sh/bun#4978](https://github.com/oven-sh/bun/issues/4978)).

### 3. The stale extracted package — silent, and the worst of the three

The shape of it: an install succeeds at exit `0`, prints a commit SHA, and puts **different bytes
on disk** — because the extracted-package cache would be stale _independently_ of the bare clone,
so clearing one would not clear the other. Nothing in the output would say so.

**It did not reproduce under the test that was run.** That test was a **tamper**: a cached
extraction was edited, and the reinstall re-extracted the correct bytes. That measures
tamper-resistance, not staleness — the two are different questions, and the second one has not
been measured on bun 1.4.0. So this stays on the page as a shape to recognise rather than a
failure demonstrated on the documented line.

**Remedy, if you suspect it:** `bun pm cache rm`, then reinstall, then `acc version --check`.
This is the one remedy on this page that is not transport-conditional — the extracted-package
cache exists on both paths — but it carries the same cost as everywhere else on this page: it
clears bun's WHOLE cache, takes no package argument, and does not belong in CI or a build step.

## Verification

### How far the version check reaches

Catching staleness takes two things: **the number has to differ, and something has to have told
you what to expect.** The version only changes when a release is cut, so the number differs
**across** a release and never **within** one — and `acc version --check` is what supplies the
second half, reading the published tags so the expected value comes from somewhere rather than
from memory.

That pairing is also the limit. `--check` supplies the expectation and automates the comparison;
it does not extend the reach. Where the number cannot differ, no amount of knowing what to expect
helps — so **failure 3 above would stay invisible to it**, because a stale extracted package at
the same version but different bytes compares equal against the tag name.

- **Pin a tag** and the check is meaningful: the tag names the value the output must match.
- **Pin a branch, or nothing,** and the check reaches less than it looks like it reaches. Within
  a release, a stale copy reports the same version as a fresh one. Across a release the number
  does differ — measured, on the fourth adopter's first install, where a silently stale unpinned
  install reported the previous release's version accurately — and with no pinned tag nothing in
  the flow named the value to compare against, so an accurate old number read as a fine install.
  **That is the half `acc version --check` closes**: it names the expected value even where the
  pin does not. What it cannot close is the within-a-release case, where the number is identical
  and there is nothing to compare. On `git+ssh://`, `bun pm cache rm` before installing is the
  answer there, at the cost of a re-download; on `git+https://` there is no bare clone for it to
  clear, and pinning a tag is what you have.

**And the reason `--check` is the proof step rather than a convenience beside it:** the remedy
cannot demonstrate that it worked. `bun pm cache rm` reported `Cleared 0 cached 'bunx' packages`
on a machine that **was** poisoned, and the git-clone cache it actually needed to clear reports
nothing at all. Only the version after reinstalling settles it — so run `acc version --check`
**after** the remedy, not instead of it.

### Why this is on a page of its own

This is Bun's behaviour and not something this kit can fix. It is written down because a tool that
reports success while doing something else is the entire subject of this project, and this install
path does exactly that.

If a previous upgrade silently no-opped, **the conformance runs you made since then were the old
kit's verdicts.** Re-run before trusting them.
