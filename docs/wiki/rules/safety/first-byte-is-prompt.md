---
type: rule
title: First byte arrives promptly
description:
  Agents invoke CLIs in loops, so startup cost is paid per iteration — and a tool that looks
  hung gets killed and retried.
tags: [performance, streaming, diagnostic]
related: [concept/output-kind, rule/help-exits-zero]
status: current
updated: 2026-08-13
rule_id: F2
tier: diagnostic
probe_level: L0
checker: scripts/checkers/safety/first-byte-prompt.ts
---

# First byte arrives promptly

## The rule

A CLI **SHOULD** produce its first byte of output within 100 ms for any command that does no
I/O — `--help`, `--version`, and argument-validation failures.

A `stream` command **SHOULD** emit its first record promptly and flush per record rather than
buffering to completion.

Where work genuinely takes longer, the command **SHOULD** signal that it started — on stderr,
never polluting [stdout](../streams/stdout-carries-only-data.md), and without
[ANSI animation when not a terminal](../streams/no-ansi-when-piped.md).

## Why

Two separate costs, and the second is the one that changes design decisions.

**Perceived responsiveness.** Below roughly 100 ms a tool feels instant; beyond it, a human
starts wondering whether anything is happening. This is the conventional justification and it
is a human concern.

**Startup cost is paid per invocation, and agents invoke in loops.** This is the agent-specific
version and it dominates. A hundred-iteration loop pays startup a hundred times, so a 50 ms
startup is five seconds of pure overhead against work that may total less than that.

Measured, one harness, one machine:

| Runtime + parser  | startup |
| ----------------- | ------- |
| Rust / `clap`     | 2.31 ms |
| Go / `cobra`      | 2.57 ms |
| Bun + `cac`       | 13.1 ms |
| Bun + `commander` | 21.9 ms |
| Python / `click`  | 27.7 ms |
| Node + TypeScript | 57.8 ms |

Two things worth reading off that table. **Parser choice is irrelevant to latency** — `clap`'s
actual parsing takes 7–18 µs; essentially all of the number is process spawn. And Bun's floor
beats Node by ~6.5×, but loading one trivial `.ts` file costs ~6.6 ms, which puts Bun in
Python's league rather than native's.

This is `diagnostic` rather than `core` deliberately. Startup cost is a real constraint that
should inform language choice for a hot-loop tool, but a slow CLI is _slow_, not _wrong_ — and
Core is reserved for behaviour whose absence produces incorrect results. A tool that fails this
and passes everything else is still trustworthy, which is not true of any Core rule.

## The probe

Inert (`L0`).

```
<cli> --version          # time to first byte, best of 3
<cli> --help
```

Reports the measurement. Flags anything above 100 ms as a finding; never fails the run.

Best-of-three rather than mean, because the interesting number is the floor — a slow run
usually measures the machine, not the tool. The checker records all three so a wide spread is
visible, since high variance is itself a finding and can indicate work happening before
argument dispatch.

Cold-start effects are not controlled for. The checker reports the numbers it observed and does
not claim they are the tool's inherent cost.

## How to comply

Do nothing before dispatch. The usual cause of a slow `--help` is initialisation that runs
unconditionally — reading config, opening a database, resolving credentials, importing the
whole command tree — before the parser has looked at argv.

Dispatch first, initialise inside the handler. This also happens to be what
[`--version` requires](../discoverability/version-flag-exists.md), which is a useful check: if
`--version` needs config, work is running too early.

For a heavier tool, lazy-load subcommand modules so that invoking one command does not pay for
importing all of them.

## Evidence

The latency table is from this project's framework survey, measured on one machine with one
harness — comparative within the table, not portable as absolutes.

The 100 ms threshold is clig.dev's, which advises printing something within 100 ms so a program
does not appear broken, and disabling animation when stdout is not a terminal.

Full analysis: [`research/02-frameworks-languages.md`](../../../../research/02-frameworks-languages.md).
