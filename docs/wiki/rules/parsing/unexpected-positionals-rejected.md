---
type: rule
title: Unexpected positional arguments are rejected
description:
  A stray positional is almost never intentional — it is usually the orphaned value of a flag
  that was silently misparsed.
tags: [parsing, silent-failure, core]
related: [rule/unknown-flag-exits-nonzero, rule/double-dash-terminator]
status: stable
generated: { by: claude-opus-5, at: 2026-08-14 }
rule_id: A4
tier: core
probe_level: L1
checker: src/acc/kit/checkers/parsing/unexpected-positionals.ts
checker_status: implemented
coverage: partial
coverage_gaps:
  - no probe is declared so nothing about arity is established
coverage_established:
  - nothing because no probe is declared and the verdict is always unverified so there is no pass to license anything
---

# Unexpected positional arguments are rejected

## The rule

A command declaring _n_ positional arguments **MUST** reject an invocation supplying more than
_n_: exit `2`, name the unexpected value, leave stdout empty.

A command declaring none **MUST** reject any positional at all.

## How to comply

Declare arity explicitly rather than reading `argv` remainder. Parsers that expose positionals
as an untyped array (`args._`, `ctx.args._`) invite this bug, because "extra" and "expected"
look identical to the handler.

`cobra` (Go) accepts extra positionals at exit `0` by default; it requires an explicit `Args`
validator such as `cobra.NoArgs` or `cobra.ExactArgs(n)`.

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

`L1` — and A4 **declares no probes**, so it is not applicable to a `L0` run.

```
(none — every invocation that would test arity has to run a real verb)
```

**Always reports `unverified` today.** Everything the kit does now is `L0`, so this rule
establishes nothing about your tool either way: no pass to earn and no failure to fix, and its
line in a report is a gap in the evidence rather than a judgement.

Testing arity means putting extra values behind a real verb, and a CLI with this defect runs
that verb for real — which is why the safety gate refuses to build the probe. That limit is
[probing's subject](../../concepts/probing.md#inertness-classifies-an-invocation-it-does-not-make-the-run-safe),
and A4 is one of the two rules that
[declare an empty probe list](../../concepts/probing.md#probes-are-shared-and-a-rule-may-declare-none).

**What changes at `L1`**: once the target declares which verbs are read-only, the probe becomes
sendable against those verbs, and this rule starts returning verdicts.

```
<cli> <known-verb> unexpected-value-xyz
<cli> <known-verb> --<known-flag> <value> extra-one extra-two
```

## Current checker coverage

[`unexpected-positionals.ts`](../../../../src/acc/kit/checkers/parsing/unexpected-positionals.ts) — `L1`,
`coverage: partial`. A pass means nothing under **Established** was violated; the **Gaps** are
the rest of this page, unexamined.

**Established**

- nothing because no probe is declared and the verdict is always unverified so there is no pass to
  license anything

There is no pass to describe rather than a pass with a narrow scope: `check` returns one fixed
`unverified`, and [the probe](#the-probe) says why arity cannot be tested inertly.

**Gaps**

- no probe is declared so nothing about arity is established

## Evidence

The `citty` measurement in
[unknown flags must exit non-zero](./unknown-flag-exits-nonzero.md#evidence) shows the
orphaning directly — `--frmat json` produced `{"_":["json"], "frmat":true}`, with `json`
sitting in the positionals array. Nothing in that invocation was rejected.
