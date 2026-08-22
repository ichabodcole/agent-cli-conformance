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

The version line restarts at `0.1.0`. Tags `v0.1.0`, `v0.1.1`, `v0.2.0`, `v1.0.0` and `v1.0.1`
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

## Consequences

**A pinned tag stops resolving.** Anyone who pinned `#v1.0.1` gets
`no commit matching "v1.0.1" found (but repository exists)` — the failure
[the install guide](../guides/how-to-fix-a-broken-install.md) describes as looking like a missing
tag. Here it genuinely is one. Pin a commit SHA until the line settles.

**Version numbers went backwards.** `v1.0.1` existed and `v0.1.0` follows it. Nothing resolves by
semver ordering here — Bun does not support `#semver:` ranges against a git dependency — so this
is a cosmetic oddity in the tag list rather than a functional one.

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
