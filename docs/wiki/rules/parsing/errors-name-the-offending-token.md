---
type: rule
title: Errors name the offending token
description:
  "Invalid arguments" tells a caller that something is wrong; naming the token tells it what to
  change.
tags: [parsing, errors, remediation, core]
related: [concept/error-envelope, rule/unknown-flag-exits-nonzero]
status: current
updated: 2026-08-13
rule_id: A3
tier: core
probe_level: L0
checker: src/acc/kit/checkers/parsing/names-offending-token.ts
checker_status: implemented
---

# Errors name the offending token

## The rule

When a CLI rejects an invocation because of a specific token — an unknown flag, an
unrecognised verb, an out-of-range value, a malformed identifier — the diagnostic **MUST**
contain that token verbatim.

In [machine mode](../../concepts/machine-mode.md) it **MUST** additionally appear as a field
in the [error envelope](../../concepts/error-envelope.md), not only inside the prose
`message`.

Where the valid alternatives form a closed set, the CLI **SHOULD** enumerate them in a
`choices` field.

## Why

A rejection the caller cannot act on is barely better than no rejection at all. `Error:
invalid arguments` is correct, non-zero, and useless: the agent knows it failed but not which
of five flags was wrong, so its only recourse is to vary them one at a time.

Naming the token converts a failure into a fix. Adding `choices` converts it into a _certain_
fix — the agent stops guessing entirely, because the valid set was handed to it. That is why
this rule matters disproportionately for flag hallucination: the correction arrives at exactly
the moment the caller has demonstrated it needs one, and costs nothing on the success path.

Putting it in a field rather than only in prose matters for the same reason exit codes matter.
Prose gets rewritten; a field is a contract.

## The probe

Inert (`L0`).

```
<cli> --totally-made-up-flag
<cli> nonsense-verb-xyz
```

Passes when stderr contains the literal offending token in each case, checked as a plain
substring match, mode-agnostic. The checker does not currently invoke the target in machine
mode or inspect the error envelope for the field "## The rule" above requires there — it
verifies only the prose-message half. That is unchecked coverage, not a passing result: a
target could satisfy this probe today and still violate the envelope half of the rule.

The checker deliberately uses a distinctive token unlikely to appear incidentally, so a match
is evidence the tool echoed it rather than coincidence.

## How to comply

Nearly free — most parsers already include the token in their default message. The work is
usually in _not losing it_: a handler that catches a parse error and re-raises its own
`invalid arguments` message discards exactly the information this rule requires.

If you wrap or rewrite parser errors, carry the token through.

## Evidence

All five CLIs surveyed (`git`, `docker`, `kubectl`, `gh`, `cargo`) name the offending flag on
stderr. This is the one aspect of failure handling the industry agrees on — which is why it is
Core rather than aspirational.

The `choices` half comes from Vercel's agent-mode envelope, which enumerates valid options so
the agent resolves the problem itself instead of retrying blind. See
[error envelope](../../concepts/error-envelope.md#choices-is-just-in-time-discovery).
