---
type: rule
title: Help output is byte-identical between runs
description:
  A timestamp or a hash-ordered list in help text makes every snapshot test rot and every
  cached reference wrong.
tags: [discoverability, determinism, testing, core]
related: [rule/exit-codes-are-deterministic, rule/help-exits-zero]
status: stable
generated: { by: claude-opus-5, at: 2026-08-15 }
rule_id: D4
tier: core
probe_level: L0
checker: src/acc/kit/checkers/discoverability/help-deterministic.ts
checker_status: implemented
coverage: partial
coverage_gaps:
  - only root help is compared and never nested help
  - forbidden content such as a timestamp or a varying absolute path is only caught when it differs between two adjacent runs
  - only stdout is compared and never stderr
coverage_established:
  - two runs of root --help with identical argv and identical environment have the same SHA-256 digest over their raw stdout bytes
---

# Help output is byte-identical between runs

## The rule

Two runs of the same help invocation, from the same binary, **MUST** produce byte-identical
output.

Help text **MUST NOT** contain the current time, a duration, a random value, an absolute path
that varies by environment, or a collection whose order depends on hash iteration.

Where a value genuinely varies (a resolved config path, a detected platform), it belongs in a
diagnostic command such as `doctor` or `info`, not in help.

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
<cli> --help     ×2      # the SAME invocation twice, captured and byte-compared
```

**Passes** when the two captures have the same **SHA-256 digest**, taken over the raw stdout
bytes before they are decoded. The bytes themselves are not retained — a digest answers the
equality question this rule asks and nothing else, which keeps the [observation
artifact](../../../roadmap.md#4-durable-observation-and-replay) free of an unbounded blob.

**Both runs are the same invocation** — same argv, same environment, twice. Nothing tells them
apart from the target's side: no nonce argument, no marker environment variable, because a
variable the target can read is part of the input to the measurement. The runner deduplicates
identical probes and separates the repetitions by a recorder-side index the target never sees;
see [probing](../../concepts/probing.md#probes-are-shared-and-a-rule-may-declare-none).

**Fails**, when the captures differ, with the **index of the first differing character** — not a
diff. That is enough to tell a one-character timestamp delta from wholesale reordering, and it is
all the checker computes; a reader expecting a rendered delta will not find one. The index is an
offset into the **decoded string** — UTF-16 code units — which diverges from a byte offset as soon
as help contains a non-ASCII character, and the finding says so.

**Fails without an offset** when the digests differ but the decoded strings match. The difference
lives in bytes the decode collapsed, so the finding names the two byte counts and the two digests
and says where the answer is not: still a `fail`, because the rule was violated, with the location
withheld because the evidence does not carry it.

**Not attempted:** telling "nondeterministic" apart from "changed because the environment
changed". D4 never varies the environment, so it cannot see that difference either way. Help that
reacts to a hostile environment is [D1](./version-flag-exists.md)'s subject, where `--version` is
run with an unusable `HOME` and `XDG_CONFIG_HOME` on purpose.

## Current checker coverage

[`help-deterministic.ts`](../../../../src/acc/kit/checkers/discoverability/help-deterministic.ts) — `L0`,
`coverage: partial`. A pass means nothing under **Established** was violated; the **Gaps** are
the rest of this page, unexamined.

**Established**

- two runs of root --help with identical argv and identical environment have the same SHA-256 digest
  over their raw stdout bytes

**Gaps**

- only root help is compared and never nested help
- forbidden content such as a timestamp or a varying absolute path is only caught when it differs
  between two adjacent runs
- only stdout is compared and never stderr

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

Full analysis: [`research/2026-08-13-testing-enforcement.md`](../../../research/2026-08-13-testing-enforcement.md).
