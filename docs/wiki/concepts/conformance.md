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
updated: 2026-08-15
---

# Conformance

## What it is

`acc check` reports two booleans, and they answer different questions.

**Conformant** — **no applicable core rule FAILED.** Violations only. Every core rule the kit
could apply at this probe level either passed, or was excused in the project's expectations
file. This is the headline verdict, and it is what the exit code reflects: a non-conformant
target exits `9`.

**Fully verified** — conformant, **and every applicable core rule passed, and every applicable
core checker declares `coverage: complete`.** Every core rule was actually established, not
merely left unfalsified.

Three verdicts feed those two claims, and the middle one is the whole point:

| Verdict      | Meaning                                     | Blocks conformance | Blocks full verification |
| ------------ | ------------------------------------------- | ------------------ | ------------------------ |
| `pass`       | the probe ran and the rule held             | no                 | only if `partial`        |
| `fail`       | the probe ran and the rule was broken       | **yes**            | **yes**                  |
| `unverified` | the probe could not establish either answer | no                 | **yes**                  |

A fourth state, **not applicable**, is not a verdict at all: the rule's `probe_level` exceeds
the level the run was made at, so it was never attempted. "Out of scope here" and "tried and
could not establish it" are different claims, and a report that collapses them cannot be acted
on.

**Full verification is scoped to the run's probe level, always.** "Fully verified at `L0`" is a
claim about the rules `L0` can reach, not about the catalogue — which is why the level is
printed beside the verdict rather than left implicit.

### Coverage: a pass can be narrower than its rule

The `pass` row above carries a qualifier the other two do not, and it is the second half of
what `fullyVerified` had to be taught. A rule page states several normative clauses; a checker
establishes some subset of them. Every rule page declares which case it is in:

| `coverage` | What a `pass` from that checker means                                  |
| ---------- | ---------------------------------------------------------------------- |
| `complete` | the whole rule held                                                    |
| `partial`  | nothing the checker looked at was violated — the rest was not examined |

A `partial` page must list its `coverage_gaps`: one phrase per normative clause the checker
does not establish. The kit's own lint compares that list against the checker file in both
directions, so a gap cannot be closed in prose without being closed in code.

This was not a hypothetical. [C2](../rules/exit-codes/usage-errors-are-distinguishable.md)
returned `pass` with the detail `internal-fault contrast unverified at L0`;
[A2](../rules/parsing/unknown-command-exits-nonzero.md) returned `pass` with
`nested case not probed at L0`. Both admissions were true, and both were counted as ordinary
passes — so `fullyVerified` could be `true` over gaps the report itself had already printed. In
the text report a narrow pass is marked `PASS+`, and every gap blocking the claim is named in
full beneath the findings.

At `L0`, **every** core checker in the catalogue is `partial`, so `acc check` on `acc` itself
reports `conformant: true, fullyVerified: false`. That is the correct answer, not a defect to
paper over: closing those gaps is what the higher probe levels are for.

`core` versus `diagnostic` is the other axis. Only core rules bind: a diagnostic failure is
reported, counted, and never blocks either claim.

## Why it matters for agents

Splitting the two claims is a correctness fix, not a softening.

Conflating them — treating an unverified core rule as disqualifying — makes the verdict say
something false. `git` is the illustration, and it is a good one precisely because it is not a
clean sheet. `acc check $(which git)`, against git 2.55.0, with the thirteen passing rules
elided:

```
NOT CONFORMANT (L0) — 2 core violated, 1 core unverified, 13 core partially covered

  UNVR  B3  no machine-mode flag was advertised in help, so there is nothing to parse
  FAIL  C2  the same error class produced different codes (129,1)
  FAIL  D2  bare invocation wrote 2290 bytes to stdout
  FAIL  D3  help names no machine-mode flag or schema command; B3 will be unverified as a result

  core 13/16 · violations 2 · unverified 1 (all tiers; 1 core) · partial coverage 13 core · diagnostics 1
```

D3 is `diagnostic`, so it is reported and binds nothing. Of the two that do bind, both are real
violations and `git` is non-conformant for them, on their own merits:
[C2](../rules/exit-codes/usage-errors-are-distinguishable.md) because an unknown flag exits
`129` while an unknown verb exits `1`, so one error class answers with two codes; and
[D2](../rules/discoverability/bare-invocation-is-a-usage-error.md) because bare `git` writes
its usage text to stdout, where a consumer reads it as output, rather than to stderr.

The third line is not a violation of anything. `git` advertises no machine-mode flag, so
[B3](../rules/streams/machine-output-is-parseable.md) has nothing to parse and says so —
"could not establish it", not "broke it". Counted as a failure it would have told git's
maintainers they had broken three rules, one of which names nothing they did wrong, mixed in
with two they can act on today. The first thing a maintainer does with a gate that cannot tell
those apart is turn it off.

The opposite error is worse, and it is the one this whole catalogue exists to prevent: letting
`unverified` quietly count as a pass. A probe that could not run is not a probe that succeeded.
So `unverified` is never folded into the pass count, is always reported by name, and always
blocks `fullyVerified`. It just no longer masquerades as a violation.

The practical shape: **`conformant` is the gate; `fullyVerified` is the goal.** A project
adopts the kit by getting to conformant, then works the unverified list down — today by making
discoverable in help what the kit otherwise has to guess at (advertising `--json` is what moves
B3 off `unverified`), and eventually by declaring it outright, once there is a declaration
format to write it in. That is the direction the spec wants a tool to move; the second half of
it does not exist yet, and is
[roadmap step 6](../../roadmap.md#6-r4-7--the-portable-declaration-ir).

`fullyVerified` is a goal for the kit as much as for the target. Half of it is the target's
work — nothing failing, nothing unverified. The other half is the kit's own, and no core
checker has earned complete coverage yet. Reporting the target's half as if it were both is the
failure mode this section exists to prevent.

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

**An excuse suppresses the conformance gate. It never suppresses the evidence claim.** Exactly
what it changes, and what it does not:

| Field                   | Effect of an excuse                                         |
| ----------------------- | ----------------------------------------------------------- |
| `conformant`            | an excused `fail` no longer blocks it                       |
| `counts.coreFailures`   | an excused `fail` is not counted                            |
| `fullyVerified`         | **unchanged** — an excused rule that did not pass blocks it |
| `counts.coreUnverified` | **unchanged** — the gap is still counted                    |
| `evidenceGaps`          | **unchanged** — the gap is still named                      |
| `staleExpectations`     | gains the rule id once it starts passing                    |

The reason for the split is that an excuse is a decision, not evidence. A project writing
itself a note about a rule nothing has established has changed who is accountable for the gap;
it has not made the gap go away, and a boolean called "fully verified" must not be purchasable
by writing a sentence in a JSON file.

### What the counts mean

The text verdict line states both claims at once, and names the scope of each number:

```
CONFORMANT (L0) — 0 core violated, 2 core unverified, 14 core partially covered
NOT CONFORMANT (L0) — 3 core violated, 1 core unverified, 12 core partially covered
```

`core violated` is core, applicable and **unexcused** — it gates conformance.
`core unverified` and `core partially covered` are core and applicable but count excused rules
too, because they describe the evidence rather than the gate.

The summary line at the foot of the report counts `unverified` across **every** tier, so the
two lines can legitimately disagree — a target with one diagnostic gap and no core one shows
`0` above and `1` below. Both scopes are named rather than left to the reader to reconcile:

```
  core 13/16 · violations 2 · unverified 1 (all tiers; 1 core) · partial coverage 13 core · diagnostics 1
```

A rule counted under `partial coverage` is also a rule that **passed**, so it appears in
`core 13/16` as well. The two are not alternatives: the probe ran and found no violation, and
the scope of that probe was narrower than the page.

The level is named because it bounds the claim: at `L0`,
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
