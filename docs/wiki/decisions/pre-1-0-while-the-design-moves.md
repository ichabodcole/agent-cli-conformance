---
type: decision
title: Stay pre-1.0 while the design is still moving
description:
  A version number is a claim about stability, and this project was making one it could not keep —
  so the 1.x line was withdrawn, the tags deleted, and the promised surface narrowed to what is
  actually settled.
tags: [release, versioning, semver, contract]
related: [concept/conformance, concept/probing]
status: stable
generated: { by: claude-opus-5, at: 2026-08-22 }
---

# Stay pre-1.0 while the design is still moving

## Context

A version number is a claim about stability, and this project was making one it could not keep.
Four releases went out in three days while the catalogue was still deciding what it was.

## Decision

The version line restarts at `0.1.0`. **The first release carries a `Release-As: 0.1.0` footer**,
because release-please treats the manifest as the _last released_ version and would otherwise bump
past it — measured, the pending features would have made the first tag `v0.1.1`, leaving a line
that starts at `0.1.1` with no `0.1.0` behind it. Tags `v0.1.0`, `v0.1.1`, `v0.2.0`, `v1.0.0` and `v1.0.1`
and their GitHub Releases are deleted. While the major stays at `0`, a breaking change bumps the
**minor** and a feature bumps the **patch** — `bump-minor-pre-major` and
`bump-patch-for-minor-pre-major` in `release-please-config.json`.

Alongside it, the **promised surface is narrowed** — see below. The two go together: the version
line says how settled the project is, and the contract says what the number is a promise _about_.

## Rationale

**The number was claiming a stability the project does not have.** Inside two days this catalogue
reclassified a rule, reversed that reclassification after a second review round, changed the
report shape twice, and found evidence that one probe level is leaking into the other. That is
design work. Shipping it as `1.0.0 → 1.0.1 → 2.0.0` tells a reader the opposite — that the shape
is settled and each change is a considered break in a stable contract.

**And the alternative was worse arithmetic.** Every honest `!` moved the major. Continuing would
have reached `v15` while the project was still deciding what `L1` is for, which reads as a long
maintenance history rather than an early one. The number would have been both wrong and
unflattering in the same stroke.

**The tags went too, rather than being left as history.** They are five tags nobody can install
and whose numbers contradict the ones that follow. Keeping them preserves a record that only
confuses — the git history still holds every commit, and the four release notes are kept verbatim
in [the withdrawn-line archive](../../reports/2026-08-22-release-notes-from-the-withdrawn-1x-line.md).
What is lost is only the illusion of a 1.x series.

### What is promised, and what is not

Semver promises about the surface a project **declares** public. This one declares a narrow surface
deliberately, because a wide promise made now would be broken within the week.

| **Stable — a change here is breaking**                                              | **Unstable — a change here is not**            |
| ----------------------------------------------------------------------------------- | ---------------------------------------------- |
| Rule ids (`A1`, `D2`, …) — append-only, never reused, never re-pointed              | The report's JSON shape, and every field in it |
| The exit-code taxonomy: `0` conformant, `9` non-conformant, `1`–`8` the kit failing | `fullyVerified` and what costs it              |
| `conformant` — what it means and when it is `true`                                  | `acc.config.json` keys and their vocabularies  |
|                                                                                     | CLI flags, and the text renderer's layout      |

**`conformant` and the exit code are on the stable side on purpose.** They are what a CI gate
binds to, and moving them silently would turn a green build red for reasons nobody could read out
of a changelog. Everything an adopter automates against is in the left column; everything the
project is still designing is in the right.

### The left column can still be broken, and this is the bar

The table above reads as a flat promise and is not one. **It is a default, not a wall**, and
stating it without saying so has already had a cost: it was read as making a decision unavailable
that was in fact available, and the reading slowed a call it should not have slowed.

**The default holds.** Do not break the left column for convenience, for tidiness, or because a
different shape would have been nicer to design. Those items are there because something outside
this repository binds to them, and today that is not hypothetical — an adopter's
`acc.config.json` carries `knownFailures` keyed by rule id, on disk, in another repository, and
re-pointing an id silently changes what that file means.

**The caveat is that this is not released to the public.** There is no large user base and the
design is still being worked out. So a break is available when it is the right long-term call, and
the bar is narrow:

- **A corner is being painted.** Keeping the promise would foreclose a design the evidence now
  supports.
- **The item is a mistake made on thin evidence.** It was decided before the consumer signal
  existed, and the signal has since arrived and disagrees.

Neither bar is _"the current shape is awkward."_

**And it is discussed before it is done, never decided at a terminal.** The point of the
conversation is to establish that the reason is real — that the break buys something, rather than
that living with the decision has become annoying. **Not having to live with a design mistake made
on insufficient evidence is a genuine advantage of this stage, and it expires.** The whole
programme of adoption trials exists to convert that advantage into evidence, so that fewer of
these decisions need revisiting at all.

**Append is not a break.** Minting a new rule id, adding an exit code, adding a report field —
these are what append-only exists to permit, and they need none of the above. What the left column
forbids is reusing an id, re-pointing one at different behaviour, or changing what `conformant`
means. That distinction was lost once already, so it is written here rather than assumed.

## Consequences

**A pinned tag stops resolving.** Anyone who pinned `#v1.0.1` gets
`no commit matching "v1.0.1" found (but repository exists)` — the failure
[the install guide](../guides/how-to-fix-a-broken-install.md) describes as looking like a missing
tag. Here it genuinely is one. Pin a commit SHA until the line settles.

**Version numbers went backwards.** `v1.0.1` shipped and the line restarts below it. Nothing
resolves by semver ordering here — Bun does not support `#semver:` ranges against a git
dependency — so what the reordering costs is legibility in the record, not resolution: the
archived notes and this page have to say why the numbers descend, because there is no tag list
left in which a reader could see it for themselves.

**A narrow contract can be a way to avoid admitting a break.** It is only honest if the right-hand
column is genuinely unsettled and says so where adopters read it, which is why the same split is
stated in the README rather than only here. When a surface settles, it moves left — and moving it
left is the commitment, not the version number.

## What would change our mind

**1.0 returns** when the report shape has survived a release without changing, `L1` exists and has
not forced `L0` to move, and the right-hand column above has emptied enough that an adopter can
automate against the kit without reading the changelog first. Not on a date, and not because the
number has been at `0` long enough to feel embarrassing.

**The reset was wrong** if the surface turns out to have been settled all along — if a year passes
with no breaking change to anything in the right-hand column, then the 1.x line was accurate and
this decision cost a coherent tag history for nothing.
