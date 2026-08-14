---
type: rule
title: Unknown commands must exit non-zero
description:
  Rejecting an unrecognised verb at the root is not enough — nested subcommands are where
  parsers most often let one through.
tags: [parsing, silent-failure, core]
related: [rule/unknown-flag-exits-nonzero, concept/exit-codes]
status: current
updated: 2026-08-13
rule_id: A2
tier: core
probe_level: L0
checker: src/acc/kit/checkers/parsing/unknown-command.ts
checker_status: implemented
---

# Unknown commands must exit non-zero

## The rule

A conforming CLI **MUST** reject any command or subcommand it does not recognise: exit `2`,
name the offending verb on stderr, and leave stdout empty.

This **MUST** hold at every level of nesting, not only at the root. `mycli jobs nonsense` is
as much an unknown command as `mycli nonsense`.

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

Passes when the invocation exits non-zero with empty stdout and a stderr message naming the
unrecognised verb.

The nested case (`<cli> <known-group> nonsense-verb-xyz`) is not currently probed. Building it
requires prefixing the sentinel with a real, discovered subcommand — but a CLI that treats an
unrecognised nested token as an ordinary extra positional, rather than rejecting it as an
unknown command, runs that subcommand for real. `Discovery` has no way to tell a leaf command
from a command group, so the kit cannot build this probe safely at L0. The checker verifies the
root case only until effect classification (L1) makes the nested probe safe to run.

## How to comply

Most frameworks handle the root case. Verify the nested case explicitly; it is the one that
regresses.

`cobra` (Go) is the notable failure: its argument validation checks only the root command, so
an unknown nested subcommand exits `0`. One code path even exits `0` while printing help to
stdout — combining this violation with
[stdout carrying non-data](../streams/stdout-carries-only-data.md) in a single invocation.

## Evidence

All five CLIs surveyed reject unknown root verbs non-zero with empty stdout. The divergence is
entirely in the exit code chosen — `git` `129`, `docker` `125`, others `1` — which is what the
[taxonomy](../../concepts/exit-codes.md#the-taxonomy) settles.

Full survey: [`research/01-case-studies.md`](../../../../research/01-case-studies.md).
