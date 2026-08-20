---
type: rule
title: First byte arrives promptly
description:
  Agents invoke CLIs in loops, so startup cost is paid per iteration — and a tool that looks
  hung gets killed and retried.
tags: [performance, streaming, diagnostic]
related: [concept/output-kind, rule/help-exits-zero]
status: stable
generated: { by: claude-opus-5, at: 2026-08-14 }
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

## How to comply

Do nothing before dispatch. The usual cause of a slow `--help` is initialisation that runs
unconditionally — reading config, opening a database, resolving credentials, importing the
whole command tree — before the parser has looked at argv. Dispatch first, initialise inside
the handler. [`--version`](../discoverability/version-flag-exists.md) is the useful check: if it
needs config, work is running too early.

Everything after that is what you load. The figures below are from this project's framework
survey, measured with one harness on one machine in one sitting — comparable to each other, not
portable as absolutes.

**If you use Typer, set `TYPER_USE_RICH=0`.** Measured `--help`: **84.11 ms** with Rich against
**36.75 ms** without — ~47 ms per help call, on the command agents run most. Typer reads the
variable at `typer/core.py:26`; it is not an import check, and typer 0.27.1 loads Rich lazily, so
a normal command is unaffected (35.28 vs 35.42 ms, noise). It also replaces the Unicode
box-drawing with plain text, which is what
[no ANSI when piped](../streams/no-ansi-when-piped.md) wants regardless.

**If you are on Python, the import graph is the budget.** Interpreter floor 14.85 ms; `argparse`
19.19 ms; `click` 27.70 ms; `typer` 36.21 ms, of which `import typer` alone is 16.6 ms under
`-X importtime`; `pydantic-settings` `CliApp` 87.07 ms. Import the heavy modules inside the
handler that needs them rather than at module top level.

**If you are on a JS runtime, dependency weight dominates.** `yargs` at 33.24 ms against `cac` at
13.12 ms is a 20 ms spread — larger than the entire gap between Bun and a native Go binary's
floor — with installed sizes running cac 52 K, citty 52 K, commander 232 K, yargs 376 K,
clipanion 428 K. Do not expect `bun build --compile` to recover it: measured, it saved ~1.3 ms
(20.53 ms against 21.86 ms from source) for a 63 MB artifact. It buys distribution without a
runtime, not native startup.

**If you ship a native binary, do not swap parsers for speed.** An independent 250-run Go
measurement put a do-nothing baseline binary at 2.963 ms, `kong` at 2.958 ms and `cobra` at
3.360 ms — parser overhead ≤0.4 ms, inside the noise band. Choose the parser on enforcement and
schema fidelity instead, because it costs nothing here. Below ~2.5 ms what remains is fork/exec,
so the fix for a hot loop is a persistent process or batching, not a lighter parser.

**If you ship a native binary to macOS, warm it once after install.** First exec of a newly
created inode measured 137.4 ms for a 1.0 MB `clap` binary and 142.5 ms for a 423 KB binary with
no parser at all, against 1.78 ms for the already-signed `/bin/echo`; the second exec at the same
path was 2.6 ms. That is AMFI/Gatekeeper validating an ad-hoc linker signature, independent of
size and of parser. Notarising, or one warm-up exec, keeps it out of the agent loop. Linux does
not have this.

For a heavier tool in any language, lazy-load subcommand modules so that invoking one command
does not pay for importing all of them.

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

**Three runs of the same invocation** — same argv, same environment, three times. Nothing tells
them apart from the target's side: no marker argument, no marker environment variable, because a
variable the target can read is part of the input to the quantity being measured. The runner
deduplicates identical probes and separates the repetitions by a recorder-side index the target
never sees; see
[probing](../../concepts/probing.md#probes-are-shared-and-a-rule-may-declare-none).

**Passes** when the _fastest_ of the three emitted its first byte at or under 100 ms; **fails**
above it. All three times are recorded, so a wide spread is visible — high variance is itself a
finding, and can indicate work happening before argument dispatch.

Cold-start effects are not controlled for. The numbers are the ones observed on the machine the
run happened on, not a claim about the tool's inherent cost.

`diagnostic` softens what the _rule_ demands (`SHOULD`, not `MUST`); it does not soften what a
`fail` means once the measurement is taken.

**Reports `unverified` if any of the three did not complete** — a run the probe deadline killed,
or one killed at the checker's output limit — naming how many, rather than measuring the
survivors. A first byte from a run that then blocked forever is real, but F2's claim is about the
run as a whole. The hang itself is [E1](../interactivity/never-block-without-a-tty.md)'s finding
to report; F2 is not one of
[the rules that own a hang](../../concepts/probing.md#hangs-are-owned-by-four-rules-and-deferred-by-the-rest).

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

## Evidence

The latency table is from this project's framework survey, measured on one machine with one
harness — comparative within the table, not portable as absolutes.

The 100 ms threshold is clig.dev's, which advises printing something within 100 ms so a program
does not appear broken, and disabling animation when stdout is not a terminal.

Full analysis: [`research/2026-08-13-frameworks-languages.md`](../../../research/2026-08-13-frameworks-languages.md).
