---
type: rule
title: First byte arrives promptly
description:
  Agents invoke CLIs in loops, so startup cost is paid per iteration — and a tool that looks
  hung gets killed and retried.
tags: [performance, streaming, diagnostic]
related: [concept/output-kind, rule/help-exits-zero]
status: current
updated: 2026-08-14
rule_id: F2
tier: diagnostic
probe_level: L0
checker: src/acc/kit/checkers/safety/first-byte-prompt.ts
checker_status: implemented
coverage: partial
coverage_gaps:
  - only --version is timed and never help or an argument-validation failure
  - the stream first-record and per-record flush requirement is not exercised
  - the progress signal a long-running command owes stderr is not exercised
  - the verdict is the fastest of three runs so a target that is usually slower still passes
coverage_established:
  - the fastest of three --version runs with identical argv and identical environment emitted its first byte within 100 ms
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
```

Runs that probe three times and reports the fastest time to first byte: `pass` at or under
100 ms, `fail` above it. `diagnostic` softens what the _rule_ demands (`SHOULD`, not `MUST`) —
it does not soften what a `fail` verdict means once the measurement is taken. A report that
weighs a diagnostic finding more lightly than a core one is a decision for whatever aggregates
findings across the whole run, not something this checker decides on its own by staying silent.

Best-of-three rather than mean, because the interesting number is the floor — a slow run
usually measures the machine, not the tool. The checker records all three so a wide spread is
visible, since high variance is itself a finding and can indicate work happening before
argument dispatch.

**The three runs are the same invocation** — same argv, same environment, three times. That is
worth stating because it was once not true. The runner deduplicates identical probes into a
single recording, so an earlier version of this checker gave each run a different
`ACC_PROBE_TIMING` environment variable purely to get three samples past the dedup. The
objection is not [D4](../discoverability/help-output-is-deterministic.md)'s — F2 does not compare
its runs, it times them — it is that a variable the target can read is part of the input to the
measurement. A tool that re-reads configuration when it meets an unfamiliar variable, or logs it,
would have been made faster or slower by the recorder's bookkeeping, and best-of-three would then
report a number about the bookkeeping. The repetitions are now told apart by a **recorder-only
index** the target never sees (`Invocation.repeat`, built for
[C3](../exit-codes/exit-codes-are-deterministic.md)).

Cold-start effects are not controlled for. The checker reports the numbers it observed and does
not claim they are the tool's inherent cost.

**All three runs must complete.** If any of them hits the probe deadline the rule reports
`unverified` and names how many, rather than measuring the survivors: a process the deadline
killed may have written its first byte quickly and then blocked forever, and F2's claim is
about the run as a whole. F2 is not one of the four rules that own hangs — the hang itself is
[E1](../interactivity/never-block-without-a-tty.md)'s finding to report.

A run killed at the checker's **output limit** is treated the same way, for the same reason. Its
first byte is real, but the run did not complete, and averaging over the ones that happened to
stay under the ceiling would be measuring the limit rather than the tool.

## Current checker coverage

[`first-byte-prompt.ts`](../../../../src/acc/kit/checkers/safety/first-byte-prompt.ts) — `L0`,
`coverage: partial`. A pass means nothing under **Established** was violated; the **Gaps** are
the rest of this page, unexamined.

**Established**

- the fastest of three --version runs with identical argv and identical environment emitted its
  first byte within 100 ms

**Gaps**

- only --version is timed and never help or an argument-validation failure
- the stream first-record and per-record flush requirement is not exercised
- the progress signal a long-running command owes stderr is not exercised
- the verdict is the fastest of three runs so a target that is usually slower still passes

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

Full analysis: [`research/02-frameworks-languages.md`](../../../research/02-frameworks-languages.md).
