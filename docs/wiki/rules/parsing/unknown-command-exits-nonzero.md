---
type: rule
title: Unknown commands must exit non-zero
description:
  Rejecting an unrecognised verb at the root is not enough — nested subcommands are where
  parsers most often let one through.
tags: [parsing, silent-failure, core]
related: [rule/unknown-flag-exits-nonzero, concept/exit-codes]
status: stable
generated: { by: claude-opus-5, at: 2026-08-14 }
rule_id: A2
tier: core
probe_level: L0
checker: src/acc/kit/checkers/parsing/unknown-command.ts
checker_status: implemented
coverage: partial
coverage_gaps:
  - nested subcommands are not probed at L0
  - the exit code is only required to be non-zero here and not the declared 2
  - naming the offending verb on stderr is not asserted
  - only a sentinel-shaped token is probed so a verb that near-misses a real command is never offered
coverage_established:
  - one unknown verb given at the root exits non-zero and leaves stdout empty
---

# Unknown commands must exit non-zero

## The rule

A conforming CLI **MUST** reject any command or subcommand it does not recognise: exit `2`,
name the offending verb on stderr, and leave stdout empty.

This **MUST** hold at every level of nesting, not only at the root. `mycli jobs nonsense` is
as much an unknown command as `mycli nonsense`.

## How to comply

Most frameworks handle the root case. Verify the nested case explicitly; it is the one that
regresses.

`cobra` (Go) is the notable failure: its argument validation checks only the root command, so
an unknown nested subcommand exits `0`. One code path even exits `0` while printing help to
stdout — combining this violation with
[stdout carrying non-data](../streams/stdout-carries-only-data.md) in a single invocation.

## Why

An unknown verb is the agent's most likely mistake, because verbs are what it invents when
extrapolating from a pattern. Having seen `jobs list` and `jobs submit`, it will confidently
try `jobs cancel` whether or not that exists.

That guess is fine — cheap to make, cheap to correct — **provided the tool says no.** When it
doesn't, the agent records a success for an operation that never happened, and every
subsequent step reasons from a false premise.

The nesting requirement is not pedantry. It is where the failure actually occurs: a parser
that validates the first argument against a command table and then hands the remainder to a
subcommand handler will catch `mycli nonsense` and miss `mycli jobs nonsense`, because nothing
validated the second token.

## The probe

Inert (`L0`) — an unknown verb should perform no work by definition.

```
<cli> nonsense-verb-xyz
```

Passes when the invocation exits non-zero and leaves stdout empty. The checker does **not**
read stderr: whether the message names the offending verb is
[A3](./errors-name-the-offending-token.md)'s question, and A3 probes this same invocation for
exactly that. A2 is only about the exit code and the stream.

The sentinel names no declared command, so against a **verb-dispatching** CLI the probe reaches
no declared code path. Against a CLI whose root positional is **free-form data** — `claude "…"`,
`llm "…"`, `aider "…"` — it is not an unknown verb but a **prompt**, and running it spends money
and can take actions. The kit cannot detect that shape and does not guess, so do not point
`acc check` at a CLI of that kind: an `L0` run is
[risk-reduced rather than safe](../../concepts/probing.md#inertness-classifies-an-invocation-it-does-not-make-the-run-safe).

The nested case (`<cli> <known-group> nonsense-verb-xyz`) is **not probed**, so a pass here
establishes nothing about it. Building that probe means putting a real subcommand in front of the
sentinel, which is [the shape `L0` cannot send](../../concepts/probing.md#inertness-classifies-an-invocation-it-does-not-make-the-run-safe);
the checker verifies the root case only until `L1` makes the nested probe safe to run.

## Current checker coverage

[`unknown-command.ts`](../../../../src/acc/kit/checkers/parsing/unknown-command.ts) — `L0`,
`coverage: partial`. A pass means nothing under **Established** was violated; the **Gaps** are
the rest of this page, unexamined.

**Established**

- one unknown verb given at the root exits non-zero and leaves stdout empty

**Gaps**

- nested subcommands are not probed at L0
- the exit code is only required to be non-zero here and not the declared 2
- naming the offending verb on stderr is not asserted
- only a sentinel-shaped token is probed so a verb that near-misses a real command is never offered

## Evidence

All five CLIs surveyed reject unknown root verbs non-zero with empty stdout. The divergence is
entirely in the exit code chosen — `git` `129`, `docker` `125`, others `1` — which is what the
[taxonomy](../../concepts/exit-codes.md#the-taxonomy) settles.

Full survey: [`research/2026-08-13-case-studies.md`](../../../research/2026-08-13-case-studies.md).
