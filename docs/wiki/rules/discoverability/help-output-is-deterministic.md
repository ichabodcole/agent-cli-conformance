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

Determinism is rarely a switch a framework gives you or takes away — it is a property of what you
put in the help string. Four mechanisms produce nearly all of the drift, and each has a fix at the
point the bytes are emitted. Fix it there rather than scrubbing the capture afterwards: every
redaction a consumer adds is a region where a real change can hide.

**If help wraps to the terminal, pin the width.** This is the one axis with a genuine library
switch, and unpinned width is the likeliest cause of help that is stable locally and unstable in
CI, where the terminal is a different size or absent. `clap` built with the `wrap_help` feature
wraps to the detected terminal width and falls back to 100 columns; `Command::term_width(N)` pins
it and `term_width(0)` turns wrapping off — clap's own help tests set it explicitly. Python's
`argparse` takes a `width` on `HelpFormatter`. Do not reach for `COLUMNS` as the control: it is a
shell variable, not exported by default, and it does not track resizes. A library-level width
setter or an explicit `--width` flag is the form that holds.

**If help embeds a build timestamp or a build hash, take it from the source, not the clock.**
`SOURCE_DATE_EPOCH` — an integer of seconds since the epoch, always UTC — is the
reproducible-builds convention for exactly this, and a build fed from it emits the same string on
every rebuild. Better still, put the build date in `--version`, where it is data, and keep it out
of help, where it is noise.

**If the flag or command list comes from a map, sort it, and sort it by bytes.** Insertion-ordered
maps make hash iteration look stable until a refactor changes the insertion order. Sorting through
the locale's collation moves the order with `LC_COLLATE`; byte-value ordering — what `LC_ALL=C`
gives you — is available everywhere and identical everywhere. Where two entries can compare equal,
add a tiebreaker key. An unstable sort is a bug in the ordering, not a value to redact.

**If an example contains a resolved path, print the unexpanded form.** `~/.config/mycli` or
`$XDG_CONFIG_HOME/mycli` is stable; the expansion is not, and it leaks the operator's username into
anything captured. The same goes for a temp directory. To catch one you have already shipped, copy
Go's `testscript`, which runs with `HOME=/no-home` and a `$WORK`-relative `TMPDIR` for precisely
this purpose: point `HOME` and `TMPDIR` somewhere hostile, run help, and diff against a normal run.

**If machine mode answers help with an envelope, check the envelope, not only the payload.** The
forbidden content need not be in the help text at all: a wrapper carrying `elapsed`, `duration` or
a request id puts a varying byte in help output while every line a human reads stays fixed. `acc`
shipped exactly that — its machine-mode help is its schema, wrapped in an envelope whose
`meta.durationMs` read `0` on a fast run and `1` on a slow one. It passed locally for months and
failed on a slower CI runner, because a duration only breaks byte-identity when two adjacent runs
straddle a millisecond. Timing belongs on commands that did work; a description of the tool has no
duration worth reporting.

**Colour is [its own rule](../streams/no-ansi-when-piped.md)**, but know what sits between your
command tree and stdout. `charmbracelet/fang` wraps `cobra` and restyles its help and errors
without changing the parser at all, so the bytes you are asserting on come from the styler rather
than from cobra's template.

**Then prove it, twice over.** D4 checks the weakest useful form — same argv, same environment,
adjacent runs. The stronger check is the reproducible-builds one: run the same help invocation
twice under a _different_ `HOME`, `TMPDIR`, cwd, `TZ` and width, and diff the two captures before
comparing either against a golden file. A difference found that way is a defect in the CLI, not a
rotted snapshot, and attributing it correctly is most of the value. Deterministic help is also what
makes the golden file possible in the first place: clap's help tests are `snapbox` inline
snapshots, and clap's v3 changelog asks downstream CLIs to add `trycmd` tests for `-h` and `--help`
at minimum.

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

**Reports `unverified`** when either capture was cut short by the output ceiling, or either run
died on a signal — but only after the comparison above. Two prefixes that agree as far as they
go are not two identical help outputs, and two crashes that wrote nothing are not either: `"" ===
""` is the same trap the byte comparison exists to avoid. Bytes that did differ before the target
fell over really did differ, so a `fail` established that way stands; see [probing](../../concepts/probing.md#a-probe-the-kit-killed-is-not-a-probe-the-target-failed).

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
