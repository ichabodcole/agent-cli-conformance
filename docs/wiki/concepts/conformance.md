---
type: concept
title: Conformance
description:
  What the kit's headline verdict claims, and the separate claim it deliberately does not
  make — no core rule was violated, versus every core rule was established.
tags: [conformance, verdict, evidence, agent-facing]
related:
  [
    concept/exit-codes,
    rule/unknown-flag-exits-nonzero,
    rule/machine-output-is-parseable,
    rule/usage-errors-are-distinguishable,
  ]
status: current
updated: 2026-08-14
---

# Conformance

## What it is

`acc check` reports two booleans, and they answer different questions.

**Conformant** — **no applicable core rule FAILED.** Violations only. Every core rule the kit
could apply at this probe level either passed, or was excused in the project's expectations
file. This is the headline verdict, and it is what the exit code reflects: a non-conformant
target exits `9`.

**Fully verified** — conformant, **and no applicable core rule is `unverified`.** Every core
rule was actually established, not merely left unfalsified.

Three verdicts feed those two claims, and the middle one is the whole point:

| Verdict      | Meaning                                     | Blocks conformance | Blocks full verification |
| ------------ | ------------------------------------------- | ------------------ | ------------------------ |
| `pass`       | the probe ran and the rule held             | no                 | no                       |
| `fail`       | the probe ran and the rule was broken       | **yes**            | **yes**                  |
| `unverified` | the probe could not establish either answer | no                 | **yes**                  |

A fourth state, **not applicable**, is not a verdict at all: the rule's `probe_level` exceeds
the level the run was made at, so it was never attempted. "Out of scope here" and "tried and
could not establish it" are different claims, and a report that collapses them cannot be acted
on.

`core` versus `diagnostic` is the other axis. Only core rules bind: a diagnostic failure is
reported, counted, and never blocks either claim.

## Why it matters for agents

Splitting the two claims is a correctness fix, not a softening.

Conflating them — treating an unverified core rule as disqualifying — makes the verdict say
something false. `git`, `gh` and `kubectl` all come back non-conformant with **zero
violations**: `git` because it advertises no machine-mode flag, so
[B3](../rules/streams/machine-output-is-parseable.md) has nothing to parse, and because it
exits `129` rather than the declared `2`, which
[C2](../rules/exit-codes/usage-errors-are-distinguishable.md) reports as unverified rather than
guessing. Neither is a violation of anything. A verdict that calls them failures is a verdict
nobody can act on, and the first thing a maintainer does with an unactionable gate is turn it
off.

The opposite error is worse, and it is the one this whole catalogue exists to prevent: letting
`unverified` quietly count as a pass. A probe that could not run is not a probe that succeeded.
So `unverified` is never folded into the pass count, is always reported by name, and always
blocks `fullyVerified`. It just no longer masquerades as a violation.

The practical shape: **`conformant` is the gate; `fullyVerified` is the goal.** A project
adopts the kit by getting to conformant, then works the unverified list down — usually by
declaring something the kit currently has to guess at, which is exactly the direction the spec
wants a tool to move.

## The details

### The excuse ratchet

A project may name rules it currently cannot satisfy in `.acc-expectations.json`, borrowed from
Web Platform Tests: the file lets a project adopt the kit today without a wall of red, while
keeping every outstanding gap named and visible. It only ever shrinks, and nothing in the kit
adds to it automatically.

An excuse covers both `fail` and `unverified`. Excusing only failures left a project blocked by
an unverified rule with nothing it could change to clear it. When an excused rule starts
passing, the run reports it as a **stale expectation** — that is the ratchet tightening, and
the line to delete.

### What the counts mean

The text verdict line states both claims at once:

```
CONFORMANT (L0) — 0 violated, 2 unverified
NOT CONFORMANT (L0) — 3 violated, 1 unverified
```

Both numbers are core and unexcused. The level is named because it bounds the claim: at `L0`,
[A4](../rules/parsing/unexpected-positionals-rejected.md) is core but out of scope, so a bare
"CONFORMANT" would overstate what was checked.

### Why binary, not a score

Core rules pass or they do not. A percentage invites optimising the number instead of the
implementation — the Acid3 "Potemkin village" critique, where scoring well became its own goal.
There is no partial credit for rejecting most unknown flags.

## Related rules

Every rule page declares its own `tier`, which is what decides whether its failure binds:

- [A1 — Unknown flags must exit non-zero](../rules/parsing/unknown-flag-exits-nonzero.md) —
  core, and the catalogue's canonical violation.
- [A6 — Honour the `--` terminator](../rules/parsing/double-dash-terminator.md) — diagnostic,
  and also the rule most often `unverified`, because its probe cannot be delivered through
  every launcher.
- [B3 — Machine output parses as its declared kind](../rules/streams/machine-output-is-parseable.md)
  — core, and `unverified` for any tool that advertises no machine-mode path.
- [C2 — Usage errors are distinguishable](../rules/exit-codes/usage-errors-are-distinguishable.md)
  — core, and `unverified` for a tool whose usage errors are consistent but not `2`.
