---
type: rule
title: Unexpected positional arguments are rejected
description:
  A stray positional is almost never intentional — it is usually the orphaned value of a flag
  that was silently misparsed.
tags: [parsing, silent-failure, core]
related: [rule/unknown-flag-exits-nonzero, rule/double-dash-terminator]
status: current
updated: 2026-08-13
rule_id: A4
tier: core
probe_level: L0
checker: src/acc/kit/checkers/parsing/unexpected-positionals.ts
checker_status: planned
---

# Unexpected positional arguments are rejected

## The rule

A command declaring _n_ positional arguments **MUST** reject an invocation supplying more than
_n_: exit `2`, name the unexpected value, leave stdout empty.

A command declaring none **MUST** reject any positional at all.

## Why

This rule exists because of what a stray positional usually _means_. It is rarely a caller
adding a spurious word; it is the wreckage of a flag that was misparsed a moment earlier.

The mechanism, from the [unknown-flag](./unknown-flag-exits-nonzero.md) evidence:

```
mycli --frmat json
   → parser treats --frmat as a boolean flag
   → "json" has nowhere to go, so it lands as a positional
```

A tool that rejects unknown flags catches this at the flag. A tool that doesn't gets one more
chance to catch it — at the orphaned positional. Accepting both means the invocation runs with
`format` unset and a phantom argument, and reports success.

So this is defence in depth rather than a separate concern: two independent checks on the same
class of mistake, and a caller has to defeat both to get a silent wrong answer.

## The probe

Inert (`L0`).

```
<cli> <known-verb> unexpected-value-xyz
<cli> <known-verb> --<known-flag> <value> extra-one extra-two
```

Passes when both exit non-zero with empty stdout and stderr naming the unexpected value.

The checker only probes verbs it can discover from help output and that appear to take no
positionals. Where arity cannot be determined, it reports **unverified** rather than guessing —
a command that legitimately takes variadic arguments must not be failed for accepting them.

## How to comply

Declare arity explicitly rather than reading `argv` remainder. Parsers that expose positionals
as an untyped array (`args._`, `ctx.args._`) invite this bug, because "extra" and "expected"
look identical to the handler.

`cobra` (Go) accepts extra positionals at exit `0` by default; it requires an explicit `Args`
validator such as `cobra.NoArgs` or `cobra.ExactArgs(n)`.

## Evidence

The `citty` measurement in
[unknown flags must exit non-zero](./unknown-flag-exits-nonzero.md#evidence) shows the
orphaning directly — `--frmat json` produced `{"_":["json"], "frmat":true}`, with `json`
sitting in the positionals array. Nothing in that invocation was rejected.
