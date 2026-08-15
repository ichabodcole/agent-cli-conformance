---
type: rule
title: Help is a request, and it succeeds
description:
  Asking for help is not an error — `--help` exits zero and writes to stdout, unlike every
  other path that prints help.
tags: [exit-codes, discoverability, core]
related: [concept/exit-codes, rule/bare-invocation-is-a-usage-error]
status: current
updated: 2026-08-15
rule_id: C1
tier: core
probe_level: L0
checker: src/acc/kit/checkers/exit-codes/help-exits-zero.ts
checker_status: implemented
coverage: partial
coverage_gaps:
  - nested help is not probed at L0
  - a help subcommand is not probed
  - appending --help to an otherwise complete invocation is not probed
  - stdout is only required to be non-empty and is never checked to contain help text
---

# Help is a request, and it succeeds

## The rule

`--help` (and `-h`, and a `help` subcommand where present) **MUST** exit `0` and write the
help text to **stdout**.

This holds at every level: `<cli> --help`, `<cli> <group> --help`, `<cli> <group> <verb> --help`.

It **MUST** work regardless of what else is on the command line — a caller must be able to
append `--help` to any invocation and receive help rather than execution.

## Why

Help is the one case where printing usage means the command _succeeded_. The caller asked a
question — "what can you do?" — and got the answer. Exit `0`, result on stdout, exactly as the
[stream discipline](../streams/stdout-carries-only-data.md) prescribes.

This is worth stating explicitly because it is the precise inverse of the neighbouring rule.
[Bare invocation](../discoverability/bare-invocation-is-a-usage-error.md) also prints help —
and is a _failure_, because no operation was requested. Same text, opposite meaning, and the
distinction is entirely in what the caller asked for:

| Invocation     | Meaning                       | Exit | Stream |
| -------------- | ----------------------------- | ---- | ------ |
| `mycli --help` | "what can you do?" — answered | `0`  | stdout |
| `mycli`        | "do..." — nothing specified   | `2`  | stderr |

Getting this backwards in either direction breaks something. Help exiting non-zero makes
`mycli --help` look like a failure to any script and aborts under `set -e`. Bare invocation
exiting `0` makes an unspecified command look like a completed one.

The "regardless of what else is present" requirement matters for agents specifically: an agent
that is unsure whether a flag exists should be able to append `--help` to the invocation it was
about to run and get documentation instead of a side effect.

## The probe

Inert (`L0`).

```
<cli> --help
<cli> -h
```

Passes when each exits `0` with non-empty stdout.

A help path that hits the probe deadline is reported as a **failure**, not `unverified`: help
is a request, and a request that never returns has definitively not succeeded. That makes C1
one of four rules in the catalogue that own hangs — with
[A1](../parsing/unknown-flag-exits-nonzero.md),
[D2](../discoverability/bare-invocation-is-a-usage-error.md) and
[E1](../interactivity/never-block-without-a-tty.md) — rather than deferring them to E1.

A help path killed at the checker's **output limit** is the opposite case and reports
`unverified`: that target was writing, not failing to, and the exit code C1 turns on is one the
checker prevented it from choosing. The two ways a probe can be cut short are recorded
separately for exactly this reason.

### A help path that died on a signal

Help that ends on a **signal the kit did not send** has no exit code to read either, and which
of the two answers above it gets depends on **who sent the signal** — the same split
[G1](../lifecycle/inert-invocations-do-not-crash.md) makes, read from the same list.

- A **fault signal** (`SIGSEGV`, `SIGBUS`, `SIGILL`, `SIGFPE`, `SIGABRT`, `SIGSYS`, `SIGTRAP`) is
  a **failure**. The process raised it on itself as a direct consequence of what it just
  executed; help that segfaulted has definitively not succeeded, and the fault is the target's
  own. This is the hang sentence with a different ending.
- Any **other** signal — an operator's Ctrl-C, an outer deadline's `SIGTERM`, an OOM killer's
  `SIGKILL`, or any name the kit does not recognise — is `unverified`. C1 cannot attribute what
  G1 has just declined to attribute. The recording an outer CI timeout produces is byte-for-byte
  the recording a perfectly conforming tool produces under that timeout, and a gate that reports
  a violation it cannot substantiate is a gate someone eventually switches off.

When one run contains both, the **fault wins**: an observed violation stays a violation when a
different probe was killed by something unattributable. Same for an ordinary violation — help
that exited `2` exited `2`, whatever ended the other probe.

The two lists are `FAULT_SIGNALS` and `AMBIGUOUS_SIGNALS` in
[`signals.ts`](../../../../src/acc/kit/signals.ts), which G1's page quotes in full and
[`docs/wiki/lint.ts`](../../lint.ts) binds to the code in both directions. C1 reads the taxonomy
rather than restating it, because a rule that failed on a signal G1 had just declined to
attribute would put two contradictory lines in one report — which is what it did, until the
narrowing.

Not yet checked at `L0`: stderr emptiness on the help path, and the nested case (`<cli>
<group> --help`). The nested case needs the discovered group to also be a leaf-or-group
distinction `Discovery` does not currently carry — see `unknown-command.ts`'s checker for the
same limitation — so it is left for a later probe level rather than guessed at.

## Current checker coverage

[`help-exits-zero.ts`](../../../../src/acc/kit/checkers/exit-codes/help-exits-zero.ts) — `L0`,
`coverage: partial`. A pass means nothing under **Established** was violated; the **Gaps** are
the rest of this page, unexamined.

**Established**

- root `--help` and root `-h` each exit `0` with non-empty stdout, and neither hangs nor ends on
  a signal of any kind.

The gaps below are unchanged by the signal split above, and deliberately so: `coverage: partial`
qualifies a **pass**, and narrowing the crash exception moved nothing into the pass branch. Help
that ended on a signal still never passes here — it fails, or it reports the gap in the finding
itself.

**Gaps**

- nested help is not probed at L0
- a help subcommand is not probed
- appending --help to an otherwise complete invocation is not probed
- stdout is only required to be non-empty and is never checked to contain help text

## How to comply

Universal across parsers — this is the single most consistently implemented behaviour in the
survey. The failures are in hand-rolled dispatch, where `help` is sometimes routed through the
same "unknown command" path that exits non-zero.

Verify the _nested_ case explicitly; `<cli> <group> --help` is the one that gets missed when
groups are dispatched manually.

## Evidence

Unanimous across all five CLIs surveyed. `git`, `docker`, `kubectl`, `gh`, and `cargo` all exit
`0` with help on stdout and stderr empty:

| Tool      | `--help` exit | stdout | stderr |
| --------- | ------------- | ------ | ------ |
| `git`     | 0             | 2290 B | 0 B    |
| `docker`  | 0             | 4551 B | 0 B    |
| `kubectl` | 0             | 3235 B | 0 B    |
| `gh`      | 0             | 2716 B | 0 B    |
| `cargo`   | 0             | 2127 B | 0 B    |

That unanimity is why this is Core and uncontroversial — unlike bare invocation, where the same
five tools disagree.
