---
type: rule
title: Help is a request, and it succeeds
description:
  Asking for help is not an error — `--help` exits zero and writes to stdout, unlike every
  other path that prints help.
tags: [exit-codes, discoverability, core]
related: [concept/exit-codes, rule/bare-invocation-is-a-usage-error]
status: current
updated: 2026-08-13
rule_id: C1
tier: core
probe_level: L0
checker: scripts/checkers/exit-codes/help-exits-zero.ts
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
<cli> <discovered-group> --help
```

Passes when each exits `0` with non-empty stdout and empty stderr.

Subcommand paths are discovered from the root help text; where none can be found, the nested
case is reported **unverified** rather than passed.

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
