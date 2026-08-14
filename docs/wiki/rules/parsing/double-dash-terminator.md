---
type: rule
title: Honour the `--` end-of-options terminator
description:
  Without it, any value that begins with a hyphen is unpassable — including negative numbers
  and hyphen-leading filenames.
tags: [parsing, posix, diagnostic]
related: [rule/unexpected-positionals-rejected, archetype/delegator]
status: current
updated: 2026-08-13
rule_id: A6
tier: diagnostic
probe_level: L0
checker: src/acc/kit/checkers/parsing/double-dash-terminator.ts
checker_status: planned
---

# Honour the `--` end-of-options terminator

## The rule

A CLI **SHOULD** treat a bare `--` as end-of-options: every argument after it is a positional
value, even if it begins with `-`.

A CLI that [delegates to a child process](../../archetypes/delegator.md) **MUST** honour it,
and **MUST** pass everything after `--` to the child unmodified.

## Why

Some values legitimately start with a hyphen — a negative number, a filename like `-report.md`,
a search pattern such as `--verbose` being grepped for. Without a terminator these are
unpassable: the parser claims them as flags, and the caller has no way to say "this is data."

For agents the delegator case is the pressing one. A wrapper that does not honour `--` cannot
reliably forward arbitrary arguments, so the agent must know both the wrapper's flags and the
child's, and must avoid any collision between them. With `--`, the boundary is explicit and
the agent needs to know only where it falls.

This is `diagnostic` rather than `core` because a CLI whose values never begin with `-` is not
harmed by omitting it — the rule is conditionally rather than universally applicable, and Core
is reserved for what binds everywhere.

## The probe

Inert (`L0`).

```
<cli> <known-verb> -- --not-a-real-flag
```

Passes when the invocation does **not** fail with an unknown-flag error — i.e. `--not-a-real-flag`
was treated as a value. Reported as **unverified** when no suitable verb accepting a positional
can be discovered from help.

Note the inversion: for most parsing rules the probe asserts a rejection, here it asserts the
absence of one. That makes it the one parsing probe that is not obviously inert, which is why
the checker selects a read-only-looking verb where it can and otherwise declines to probe.

## How to comply

Free in most parsers — POSIX-conformant option parsing includes it, and `clap`, `commander`,
`click`, and `node:util parseArgs` all handle it by default.

Hand-rolled `argv` loops are where it goes missing. If you iterate arguments yourself, stop
flag interpretation at the first bare `--` and treat the remainder as values.

## Evidence

The convention is specified in the POSIX Utility Syntax Guidelines: applications calling
utilities with operands that begin with `-` should specify `--` to mark the end of options.
GNU's `getopt` implements it, with the additional permissive behaviour of allowing options to
appear among operands until `--` is seen.

It is one of the few genuinely universal CLI conventions — unlike exit codes, where
[no comparable standard exists](../../concepts/exit-codes.md#there-is-no-industry-standard).
