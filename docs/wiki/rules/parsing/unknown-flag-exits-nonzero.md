---
type: rule
title: Unknown flags must exit non-zero
description:
  A CLI that accepts an unrecognised flag and continues cannot tell its caller that anything
  went wrong.
tags: [parsing, silent-failure, exit-codes, core]
related: [concept/exit-codes, decision/exit-codes-below-125]
status: stable
generated: { by: claude-opus-5, at: 2026-08-16 }
rule_id: A1
tier: core
probe_level: L0
checker: src/acc/kit/checkers/parsing/unknown-flag.ts
checker_status: implemented
coverage: partial
coverage_gaps:
  - only the root is probed so a flag unknown to a subcommand is not
  - the MUST NOT act on a suggested correction clause is not exercised here
  - the exit code is only required to be non-zero here and not the declared 2
  - only long flags are probed so a short flag or a cluster of short flags is not
  - that the command did not otherwise proceed and that the value was not absorbed are both inferred from a non-zero exit rather than observed
coverage_established:
  - one unknown long flag given at the root exits non-zero with stdout empty and the sentinel from that flag present on stderr
  - the same flag carrying a value does likewise rather than accepting the flag and orphaning the value
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

Inert (`L0`): both probes are deliberately invalid invocations.

```
<cli> --acc-probe-xyzzy-flag
<cli> --acc-probe-xyzzy-flag acc-probe-xyzzy-value
```

**The second shape is the value-carrying one**, sent for the clause about absorbing a value as a
positional — the [orphaned value](#why) above, and the most expensive failure in the family.

**Passes** when **all** of the following hold for **both**:

- exit code is non-zero
- stdout is empty
- stderr names the offending flag

**Fails** when either shape is still running at the probe deadline. Blocking forever is not
rejecting, which makes A1 one of the
[four rules that own a hang](../../concepts/probing.md#hangs-are-owned-by-four-rules-and-deferred-by-the-rest)
rather than deferring it to [E1](../interactivity/never-block-without-a-tty.md).

**Reports `unverified`** when a probe died on a signal. A crash is not a slower rejection: the
target never chose a status at all, so nothing here was established — see
[the signal taxonomy](../../concepts/probing.md#a-probe-the-kit-killed-is-not-a-probe-the-target-failed).

**Two probes, exactly as written.** The near-miss variant — a one-character typo of a real flag,
discovered from the CLI's own help — belongs to
[A5](./no-fuzzy-auto-correction.md), which declares and runs it. A1 does not. The attached
spelling of a flag that _is_ recognised, carrying a value outside its advertised set, belongs to
[A7](./advertised-value-set-is-enforced.md).

The value token carries the sentinel, so a parser that does not consume it leaves a bare sentinel
token — which a CLI whose root positional is free-form text reads as input rather than rejecting,
the same limit [A2](./unknown-command-exits-nonzero.md)'s probe carries. An `L0` run is
[risk-reduced rather than safe](../../concepts/probing.md#inertness-classifies-an-invocation-it-does-not-make-the-run-safe).

## Current checker coverage

[`unknown-flag.ts`](../../../../src/acc/kit/checkers/parsing/unknown-flag.ts) — `L0`,
`coverage: partial`. A pass means nothing under **Established** was violated; the **Gaps** are
the rest of this page, unexamined.

**Established**

- one unknown long flag given at the root exits non-zero with stdout empty and the sentinel from
  that flag present on stderr
- the same flag carrying a value does likewise rather than accepting the flag and orphaning the
  value

**Gaps**

- only the root is probed so a flag unknown to a subcommand is not
- the MUST NOT act on a suggested correction clause is not exercised here
- the exit code is only required to be non-zero here and not the declared 2
- only long flags are probed so a short flag or a cluster of short flags is not
- that the command did not otherwise proceed and that the value was not absorbed are both inferred
  from a non-zero exit rather than observed

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

Full survey: [`research/2026-08-13-case-studies.md`](../../../research/2026-08-13-case-studies.md) and
[`research/2026-08-13-frameworks-languages.md`](../../../research/2026-08-13-frameworks-languages.md).
