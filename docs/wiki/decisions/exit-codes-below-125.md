---
type: decision
title: Exit codes stay below 125
description:
  Reserving the shell's existing 125–255 band, rather than inventing a new one, gives
  delegating CLIs verbatim passthrough for free.
tags: [exit-codes, delegation, contract]
related: [concept/exit-codes, rule/unknown-flag-exits-nonzero]
status: current
updated: 2026-08-13
---

# Exit codes stay below 125

## Context

A CLI that runs another program has a collision problem. If `mytool` uses `5` to mean "not
found", and it execs a child that also exits `5` for its own unrelated reason, the caller
cannot tell which one failed. This is not hypothetical — it is the
[thin-delegator archetype](../concepts/exit-codes.md#the-taxonomy), and it applies to any
wrapper, launcher, or tool that shells out.

Three models were considered.

**A fixed small taxonomy.** Allocate a handful of low codes by meaning. Simple and memorable;
says nothing about delegation.

**Kubernetes KEP-2551.** Reserve `1–200` for exec'd commands, put the tool's own errors at
`201–217`, and map any child code `≥201` to `255`.

**Declare per tool.** Each CLI publishes its own mapping in its schema and no numbers are
shared. Maximally flexible; gives an agent nothing transferable between tools.

## Decision

Our codes occupy **`0`–`8`**. Everything from **`125` upward is reserved and never
allocated**, following the existing shell convention:

```
125    the wrapper itself failed
126    command found but not executable
127    command not found
128+n  killed by signal n
```

A delegating CLI **passes the child's exit code through verbatim** and uses `125` when the
wrapper itself failed before or around the child.

The mapping is additionally **declared in the schema**, so it is machine-discoverable and the
conformance kit can verify each declared error kind produces its declared code.

The three models are not alternatives: "declare per tool" is a _delivery_ mechanism, while
the other two are _allocation_ policies. We adopt a fixed taxonomy, a reserved band, and
schema declaration together.

## Rationale

**The reservation already exists.** `125`–`128+n` are understood by every shell, CI runner and
process supervisor today. Verified locally: `exit 42` propagates as `42`, a missing binary
yields `127`, and SIGTERM yields `143`. Docker already uses `125` for exactly this meaning.
KEP-2551's `201+` band is a new convention that nothing else recognises; ours is one every
caller already implements.

**Verbatim passthrough beats remapping.** KEP-2551 collapses any child code `≥201` to `255`,
discarding which code it actually was. Keeping our own codes below `125` makes collision
structurally impossible, so no remapping is needed and no information is lost.

**Nine codes, not seventeen.** KEP-2551 mirrors HTTP statuses roughly 1:1, but most collapse
to the same caller behaviour — `not found` and `entity too large` both mean "do not retry, fix
the request". Grouping by _what the caller should do_ is what lets nine codes cover the same
ground.

**One objection does not hold.** Signal deaths were checked against the `201+` band and do not
reach it — this system defines 31 signals, so signal exits occupy `129`–`159`. KEP-2551 has no
collision problem; it is simply a novel convention where an established one exists.

**KEP-2551's own history is the strongest evidence.** It has been alpha-gated behind
`KUBECTL_ERROR_CODES` since 2022. Not because the design is unsound, but because retrofitting
exit codes onto a tool with existing consumers is nearly impossible. This decision is cheap
now and unaffordable later, which is why it belongs in the scaffold rather than a migration
guide.

## Consequences

- We have **116 unallocated codes** (`9`–`124`) for future error kinds. Ample.
- Delegating CLIs need no code-translation layer, and their conformance check is simply
  "child's code, verbatim".
- We are **committed**: `rule_id` values and exit codes are both append-only. A code's meaning
  may never change once published — see
  [exit codes are append-only](../concepts/exit-codes.md#exit-codes-are-append-only).
- Tools that need to distinguish more than nine failure classes express that through the
  error envelope's `kind` field, which is unbounded, rather than by allocating more codes.

## What would change our mind

- **An actual standard emerges.** If a widely-adopted spec fixes different numbers, matching
  it beats being locally coherent — an agent that knows one convention everywhere is worth
  more than one that knows ours.
- **Nine codes prove insufficient in practice.** If real tools routinely need a tenth and
  tenth-plus class, and the envelope's `kind` field is not carrying that weight, revisit the
  grouping — not the band.
- **A delegating tool needs to distinguish its own failure from a child's beyond `125`.** If
  "the wrapper failed" turns out to need sub-classification, we would need a second signal,
  probably in the envelope rather than the code.

## Sources

- [`research/01-case-studies.md`](../../../research/01-case-studies.md) — measured exit-code
  behaviour across `git`, `docker`, `kubectl`, `gh`, `cargo`
- [KEP-2551](https://github.com/kubernetes/enhancements/tree/master/keps/sig-cli/2551-return-code-normalization)
- `sysexits.h` — the 1987 BSD attempt, `EX_USAGE=64` … `EX_CONFIG=78`
