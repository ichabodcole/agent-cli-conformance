---
type: rule
title: Bare invocation is a usage error
description:
  Running the tool with no arguments requested nothing and did nothing — reporting success for
  that is how an unset shell variable becomes a silent no-op.
tags: [discoverability, exit-codes, silent-failure, core]
related: [rule/help-exits-zero, concept/exit-codes]
status: current
updated: 2026-08-14
rule_id: D2
tier: core
probe_level: L0
checker: src/acc/kit/checkers/discoverability/bare-invocation.ts
checker_status: implemented
coverage: partial
coverage_gaps:
  - the exit code is only required to be non-zero here and not the declared 2
  - stderr is never checked to carry the usage summary
  - the bare invocation is only run against pipes so a wizard that starts only with a terminal attached is out of reach
  - only a genuinely empty argv is sent so an invocation carrying nothing but global flags requests nothing either and is never probed
coverage_established:
  - the bare invocation exits non-zero with stdout empty and terminates rather than waiting for input
---

# Bare invocation is a usage error

## The rule

Invoked with no arguments at all, a CLI **MUST** treat it as a usage error: exit `2`, write
help or a usage summary to **stderr**, and leave stdout empty.

It **MUST NOT** exit `0`, and **MUST NOT** wait for input — see
[never block without a TTY](../interactivity/never-block-without-a-tty.md).

This is the deliberate inverse of [`--help`](../exit-codes/help-exits-zero.md), which is a
request and therefore succeeds.

## Why

The failure this prevents is mundane and common:

```
SUBCOMMAND=""          # the variable never got set
mycli $SUBCOMMAND      # expands to just: mycli
echo $?                # 0, in four of the five major CLIs
```

The caller asked for an operation. No operation ran. The exit code says success, and the help
text landed on stdout where — if captured — it looks like output. Nothing anywhere reports that
the request was not performed.

For an agent this is the [silent-failure](./../parsing/unknown-flag-exits-nonzero.md) shape
again, reached by a different route: an empty or malformed command string degrades into a
no-op that reports success, and the run continues on the assumption that the step completed.

The distinction from `--help` is entirely about what was asked:

| Invocation     | The caller asked           | Outcome                     |
| -------------- | -------------------------- | --------------------------- |
| `mycli --help` | "what can you do?"         | answered → `0`, stdout      |
| `mycli`        | "do ..." (nothing follows) | nothing to do → `2`, stderr |

Sending the text to stderr rather than stdout is what keeps this consistent with
[stdout carries only data](../streams/stdout-carries-only-data.md): this is a failure, so
stdout stays empty and a consumer reading it correctly receives nothing.

Humans lose nothing — the help still appears on their terminal.

## The probe

Inert (`L0`) by definition: no operation was requested.

```
<cli>                    # no arguments, stdin closed, streams captured to files
```

Passes when the exit code is non-zero, stdout is empty, and the process terminates rather than
waiting (a hang is reported as a failure, not a pass with missing evidence). The checker
requires only non-zero, not exactly `2` — an undeclared tool never agreed to the taxonomy — but
records the observed code in the finding either way.

## Current checker coverage

[`bare-invocation.ts`](../../../../src/acc/kit/checkers/discoverability/bare-invocation.ts) — `L0`,
`coverage: partial`. A pass means nothing under **Established** was violated; the **Gaps** are
the rest of this page, unexamined.

**Established**

- the bare invocation exits non-zero with stdout empty and terminates rather than waiting for input

**Gaps**

- the exit code is only required to be non-zero here and not the declared 2
- stderr is never checked to carry the usage summary
- the bare invocation is only run against pipes so a wizard that starts only with a terminal
  attached is out of reach
- only a genuinely empty argv is sent so an invocation carrying nothing but global flags
  requests nothing either and is never probed

That last gap is not hypothetical, and `acc` is the tool it was found on. `acc --json` named no
command, so it requested nothing — and it answered exit `0` with both streams empty while this
rule's probe, which sends an empty argv only, reported `pass`. The defect and the blind spot
share one shape: an invocation is bare in the sense this rule cares about when it names no
command, not when it carries no tokens.

## How to comply

Two lines in most frameworks: on no arguments, print usage to stderr and exit `2`. The trap is
that many parsers default to printing help to stdout and exiting `0`, so this usually requires
overriding a default rather than adding behaviour.

If your framework routes bare invocation through the same handler as `--help`, split them —
they need different streams and different codes.

## Evidence

This is the one place the major CLIs genuinely disagree, which is why the rule needed a
[decision](../../decisions/exit-codes-below-125.md) rather than a survey. Measured:

| Tool      | exit  | stream     |
| --------- | ----- | ---------- |
| `git`     | **1** | stdout     |
| `docker`  | 0     | **stderr** |
| `kubectl` | 0     | stdout     |
| `gh`      | 0     | stdout     |
| `cargo`   | 0     | stdout     |

`git` is alone in treating it as a failure. `docker` is alone in using stderr — while still
exiting `0`, which is the least coherent combination of the five: it classifies the output as
diagnostic and the outcome as success simultaneously.

This rule takes `git`'s exit-code position and `docker`'s stream position, because together
they are the only pairing consistent with the rest of this catalogue.
