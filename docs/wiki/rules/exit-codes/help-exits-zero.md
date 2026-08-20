---
type: rule
title: Help is a request, and it succeeds
description:
  Asking for help is not an error — `--help` exits zero and writes to stdout, unlike every
  other path that prints help.
tags: [exit-codes, discoverability, core]
related: [concept/exit-codes, rule/bare-invocation-is-a-usage-error]
status: stable
generated: { by: claude-opus-5, at: 2026-08-15 }
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
coverage_established:
  - root --help and root -h each exit 0 with non-empty stdout and neither hangs nor dies on a fault signal
---

# Help is a request, and it succeeds

## The rule

`--help` (and `-h`, and a `help` subcommand where present) **MUST** exit `0` and write the
help text to **stdout**.

This holds at every level: `<cli> --help`, `<cli> <group> --help`, `<cli> <group> <verb> --help`.

It **MUST** work regardless of what else is on the command line — a caller must be able to
append `--help` to any invocation and receive help rather than execution.

## How to comply

The exit-`0`-to-stdout half is near-universal — only Rust's `gumdrop` is recorded as putting
derived help on the wrong stream. What breaks is the other half: an error path routed through
the help printer, inheriting help's exit code, its stream, or both.

| Framework             | Split correct by default?        | What to do                                    |
| --------------------- | -------------------------------- | --------------------------------------------- |
| `cobra` (Go)          | **no** — see below               | `Args: cobra.NoArgs` on **every** node        |
| `gumdrop` (Rust)      | **no** — help goes to stderr     | unmaintained (RUSTSEC-2026-0214); migrate off |
| `clipanion` v4 (TS)   | **no** — usage errors to stdout  | no setting surveyed; emit errors yourself     |
| `node:util parseArgs` | n/a — no help generation, at all | you own both paths; write help yourself       |

If you use `cobra`: a group with subcommands and no `Run` returns `flag.ErrHelp` on a bad
argument, which cobra turns into `HelpFunc(); return cmd, nil` — a nil error, so a usage failure
exits `0` with help on stdout (measured on cobra 1.10.2: `nested_cli grp2 bogus`). There is no
global switch; set `Args: cobra.NoArgs` on the root, on every group, and on every leaf.

If you dispatch by hand, split the paths at the top: `--help`, `-h` and a `help` subcommand write
to stdout and exit `0`; every other path that prints usage writes to stderr and exits non-zero.
`docker` models that second path — one line naming the problem plus
`Run 'docker --help' for more information`, exit `1`, not kubectl's whole-help dump.

The survey records help stream and exit code only where a framework deviates, so verify your own
`<cli> <group> --help` — the nested case is the one hand-rolled dispatch misses.

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

**Passes** when each exits `0` with non-empty stdout.

**Fails** when either exits non-zero, writes nothing to stdout, or is still running at the probe
deadline. A hang is a failure here rather than `unverified`: help is a request, and a request that
never returns has definitively not succeeded — which makes C1 one of the
[four rules that own a hang](../../concepts/probing.md#hangs-are-owned-by-four-rules-and-deferred-by-the-rest).

**Reports `unverified`** when the help path was killed at the checker's **output limit**. That
target was writing, not failing to, and the exit code C1 turns on is one the checker prevented it
from choosing.

### A help path that died on a signal

Help that ends on a **signal the kit did not send** has no exit code to read either, and which of
the two answers above it gets depends on **which signal** — the same split
[G1](../lifecycle/inert-invocations-do-not-crash.md) makes, read from the
[same list](../../concepts/probing.md#a-probe-the-kit-killed-is-not-a-probe-the-target-failed).

- A **fault signal** (`SIGSEGV`, `SIGBUS`, `SIGILL`, `SIGFPE`, `SIGABRT`, `SIGSYS`, `SIGTRAP`) is
  a **failure**: help that segfaulted has definitively not succeeded, and the fault is the
  target's own.
- Any **other** signal — an operator's Ctrl-C, an outer deadline's `SIGTERM`, an OOM killer's
  `SIGKILL`, or any name the kit does not recognise — is `unverified`. C1 cannot attribute what
  G1 has just declined to attribute.

Not yet checked at `L0`: stderr emptiness on the help path, and the nested case
(`<cli> <group> --help`).

## Current checker coverage

[`help-exits-zero.ts`](../../../../src/acc/kit/checkers/exit-codes/help-exits-zero.ts) — `L0`,
`coverage: partial`. A pass means nothing under **Established** was violated; the **Gaps** are
the rest of this page, unexamined.

**Established**

- root --help and root -h each exit 0 with non-empty stdout and neither hangs nor dies on a fault
  signal

The gaps below are unchanged by the signal split above, and deliberately so: `coverage: partial`
qualifies a **pass**, and narrowing the crash exception moved nothing into the pass branch. Help
that ended on a signal still never passes here — it fails, or it reports the gap in the finding
itself.

**Gaps**

- nested help is not probed at L0
- a help subcommand is not probed
- appending --help to an otherwise complete invocation is not probed
- stdout is only required to be non-empty and is never checked to contain help text

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
