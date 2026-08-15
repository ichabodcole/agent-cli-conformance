---
type: rule
title: Unknown flags must exit non-zero
description:
  A CLI that accepts an unrecognised flag and continues cannot tell its caller that anything
  went wrong.
tags: [parsing, silent-failure, exit-codes, core]
related: [concept/exit-codes, decision/exit-codes-below-125]
status: current
updated: 2026-08-14
rule_id: A1
tier: core
probe_level: L0
checker: src/acc/kit/checkers/parsing/unknown-flag.ts
checker_status: implemented
coverage: partial
coverage_gaps:
  - a flag carrying a value is never probed so absorbing that value as a positional is not established
  - only the root is probed so a flag unknown to a subcommand is not
  - the MUST NOT act on a suggested correction clause is not exercised here
  - the exit code is only required to be non-zero here and not the declared 2
  - only a long valueless flag is probed so a short flag or a cluster of short flags is not
  - that the command did not otherwise proceed is inferred from a non-zero exit rather than observed
---

# Unknown flags must exit non-zero

## The rule

A conforming CLI **MUST** reject any flag it does not recognise: exit non-zero (`2`, per the
[exit-code taxonomy](../../concepts/exit-codes.md#the-taxonomy)), write a diagnostic naming
the offending flag to stderr, and leave stdout empty.

It **MUST NOT** silently ignore the flag, absorb its value as a positional argument, or
proceed with the command.

A CLI **MAY** suggest a correction (`did you mean --format?`). It **MUST NOT** act on that
guess.

## Why

This is the single highest-value rule in the catalog, because violating it produces a failure
that is invisible from the outside.

When an unknown flag is accepted, three things go wrong at once and none of them is
observable:

1. **The intended flag never takes effect.** Its default applies instead — so a caller asking
   for JSON silently receives human-formatted text.
2. **The flag's value is orphaned.** Parsers that treat `--frmat json` as a boolean flag plus
   a bare word leave `json` as a stray positional, which some commands then interpret.
3. **The exit code is `0`.** The harness reports success. The agent has no signal that
   anything is wrong, so there is nothing to correct — it proceeds on a wrong result.

Contrast the conforming behaviour: the agent gets a non-zero exit and a message naming the
bad flag, corrects itself, and moves on. A rejected flag costs one round trip; an accepted one
costs a wrong answer that may never be caught.

This is also the cheapest rule to comply with — in most frameworks it is a single
configuration value — and the most commonly violated.

## The probe

Inert (`L0`): the probe is a deliberately invalid invocation, so a conforming CLI performs no
work and a violating one was already broken.

```
<cli> --totally-made-up-flag
```

Passes when **all** of:

- exit code is non-zero
- stdout is empty
- stderr names the offending flag

**One probe, exactly as written.** The near-miss variant — a one-character typo of a real flag,
discovered from the CLI's own help — belongs to
[A5](./no-fuzzy-auto-correction.md), which declares and runs it. A1 does not.

A hung probe is reported as a **failure**, not as unverified: blocking forever is not
rejecting. That makes A1 one of four rules in the catalogue that own hangs rather than
deferring them to [E1](../interactivity/never-block-without-a-tty.md).

## Current checker coverage

[`unknown-flag.ts`](../../../../src/acc/kit/checkers/parsing/unknown-flag.ts) — `L0`,
`coverage: partial`. A pass means nothing under **Established** was violated; the **Gaps** are
the rest of this page, unexamined.

**Established**

- a valueless flag unknown at the **root** exits non-zero, leaves stdout empty, and is named
  verbatim on stderr.

**Gaps**

- a flag carrying a value is never probed so absorbing that value as a positional is not established
- only the root is probed so a flag unknown to a subcommand is not
- the MUST NOT act on a suggested correction clause is not exercised here
- the exit code is only required to be non-zero here and not the declared 2
- only a long valueless flag is probed so a short flag or a cluster of short flags is not
- that the command did not otherwise proceed is inferred from a non-zero exit rather than observed

## How to comply

Most parsers support this; many do not enable it by default.

| Framework              | Compliant by default? | How                        |
| ---------------------- | --------------------- | -------------------------- |
| `clap` (Rust, derive)  | yes                   | —                          |
| `commander` ≥13 (TS)   | yes                   | —                          |
| `@stricli/core` (TS)   | yes                   | —                          |
| `node:util parseArgs`  | **no**                | `{ strict: true }`         |
| `citty` (TS)           | **no**                | not supported; migrate off |
| `yargs` (TS)           | **no**                | `.strict()`                |
| `cobra` (Go)           | **no**                | see below                  |
| `click` / `typer` (Py) | yes                   | —                          |

`cobra` is the worst case surveyed: it exits `0` on unknown _nested subcommands_ and extra
positionals, and has a path that exits `0` while printing help to stdout.

If your parser cannot be made strict, it is the wrong parser for an agent-facing CLI. A
wrapper that post-validates argv is possible but re-introduces the two-sources-of-truth
problem this framework exists to remove.

## Evidence

`citty` was measured directly, using a command declaring a single `--format` flag:

```
$ node probe.mjs --format json      → args = {"_":[], "format":"json"}       exit=0
$ node probe.mjs --frmat json       → args = {"_":["json"], "frmat":true}    exit=0
```

The typo produced no error, exit `0`, `format` unset (so output silently fell back to
human-readable text), and the value `json` orphaned as a positional — all four failure modes
in one invocation.

Every major CLI surveyed already complies. Measured on the same probe:

| Tool      | exit | stdout | stderr         |
| --------- | ---- | ------ | -------------- |
| `git`     | 129  | empty  | names the flag |
| `docker`  | 125  | empty  | names the flag |
| `kubectl` | 1    | empty  | names the flag |
| `gh`      | 1    | empty  | names the flag |
| `cargo`   | 1    | empty  | names the flag |

They disagree on the number — which is what the
[exit-code taxonomy](../../concepts/exit-codes.md#the-taxonomy) exists to settle — but not on
non-zero, empty stdout, or naming the flag.

Full survey: [`research/01-case-studies.md`](../../../../research/01-case-studies.md) and
[`research/02-frameworks-languages.md`](../../../../research/02-frameworks-languages.md).
