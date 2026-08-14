---
type: rule
title: Help output is byte-identical between runs
description:
  A timestamp or a hash-ordered list in help text makes every snapshot test rot and every
  cached reference wrong.
tags: [discoverability, determinism, testing, core]
related: [rule/exit-codes-are-deterministic, rule/help-exits-zero]
status: current
updated: 2026-08-13
rule_id: D4
tier: core
probe_level: L0
checker: src/acc/kit/checkers/discoverability/help-deterministic.ts
checker_status: implemented
---

# Help output is byte-identical between runs

## The rule

Two runs of the same help invocation, from the same binary, **MUST** produce byte-identical
output.

Help text **MUST NOT** contain the current time, a duration, a random value, an absolute path
that varies by environment, or a collection whose order depends on hash iteration.

Where a value genuinely varies (a resolved config path, a detected platform), it belongs in a
diagnostic command such as `doctor` or `info`, not in help.

## Why

Two consequences, one immediate and one structural.

**Immediate: it makes caching wrong.** The cheapest way for an agent to know a tool's surface
is a reference captured once and reused. If help varies between runs, a captured reference
disagrees with the live tool in ways that look like real differences — and the agent has no way
to tell an incidental timestamp from a genuine capability change.

**Structural: it is what makes the whole catalogue testable.** Every probe here assumes running
a command twice tells you the same thing. Golden-file testing of CLI output — the standard
technique for locking down an interface — depends entirely on determinism, and nondeterminism
is its best-known failure mode: the snapshot fails for a reason nobody cares about, someone
re-approves it without reading the diff, and the test stops detecting anything.

A test that is routinely re-approved without inspection is worse than no test, because it
reports safety it is not providing. This rule is what keeps that from happening.

## The probe

Inert (`L0`).

```
<cli> --help     ×2      # captured, byte-compared
```

Passes when the two captures are identical. The second run carries a distinct, allow-listed env
var (rather than repeating the first invocation verbatim) purely so the runner's dedup — which
merges identical probes into one recording — doesn't collapse the pair into a single sample.

When they differ, the checker reports the **diff**, not merely the fact — a one-line delta
containing a timestamp is a different problem from wholesale reordering, and the fix differs
accordingly.

Deliberately not attempted: distinguishing "nondeterministic" from "changed because the
environment changed". The probe runs both invocations in the same environment moments apart,
which is the case that matters and the only one it can honestly speak to. `--version` is
covered separately, by [D1](./version-flag-exists.md)'s own hostile-environment probe, rather
than duplicated here.

## How to comply

Usually satisfied by accident, and broken by accident too. The recurring causes:

- **A version banner with a build timestamp.** Put the build date in `--version`, where it is
  data, not in help, where it is noise.
- **Iterating a hash map to list commands or flags.** Sort explicitly. Insertion-ordered maps
  make this work by luck until a refactor changes it.
- **Absolute paths interpolated into examples.** `~/.config/mycli` is stable; a resolved home
  directory is not, and it also leaks the operator's username into anything captured.
- **Terminal-width-dependent wrapping.** Wrap to a fixed width when not a TTY. This one is
  invisible locally and appears only in CI, where the width differs.

## Evidence

No survey finding — all five tools examined produced identical help across runs, which is the
expected result.

The rule is included because it is the precondition for the rest of the kit rather than a
finding about existing tools. The enforcement research is explicit that nondeterminism is the
principal failure mode of snapshot testing, and that scrubbing unstable values is standard
practice precisely because output so often carries them.

Requiring determinism at the source is strictly better than scrubbing it afterwards: scrubbing
is a per-consumer workaround that each new caller must reinvent, and every scrubber is a place
a real change can be masked.

Full analysis: [`research/04-testing-enforcement.md`](../../../../research/04-testing-enforcement.md).
