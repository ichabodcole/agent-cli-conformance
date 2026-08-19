---
type: rule
title: Errors name the offending token
description:
  "Invalid arguments" tells a caller that something is wrong; naming the token tells it what to
  change.
tags: [parsing, errors, remediation, core]
related: [concept/error-envelope, rule/unknown-flag-exits-nonzero]
status: stable
generated: { by: claude-opus-5, at: 2026-08-16 }
rule_id: A3
tier: core
probe_level: L0
checker: src/acc/kit/checkers/parsing/names-offending-token.ts
checker_status: implemented
coverage: partial
coverage_gaps:
  - the machine-mode field is any string value anywhere in the document because no declaration exists at L0 to name the envelope field the rule requires
  - only an unknown flag and an unknown verb are probed
  - the SHOULD to enumerate a closed set as choices is not exercised
  - the assertion is that the sentinel substring reached stderr and not that the whole offending token appears verbatim
coverage_established:
  - the stderr of an unknown root flag rejection contains the probe's sentinel string
  - the stderr of an unknown root verb rejection contains the probe's sentinel string
  - for a target that advertises a machine-mode flag and answers a parser error with a parseable document some string value inside that document contains the sentinel
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

## How to comply

Nearly free — most parsers already include the token in their default message. The work is
usually in _not losing it_: a handler that catches a parse error and re-raises its own
`invalid arguments` message discards exactly the information this rule requires.

If you wrap or rewrite parser errors, carry the token through.

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
<cli> --totally-made-up-flag --json      # where help advertises a machine-mode flag
```

The first two pass when stderr contains the literal offending token, checked as a plain substring
match, mode-agnostic. The checker deliberately uses a distinctive token unlikely to appear
incidentally, so a match is evidence the tool echoed it rather than coincidence.

**The third probe is the envelope half**, which was unchecked coverage until recently and is the
clause "## The rule" above actually turns on. It is byte-identical to
[B5](../streams/machine-mode-holds-on-parser-errors.md)'s probe, so the recorder runs one process
and both rules read one observation — which is the point, since they are two clauses about a
single answer and probing separately would let them disagree about what the target did.

That probe is read by walking the **parsed** document for a string **value** containing the
token, never by searching the bytes. Searching the bytes would answer the question the prose half
already answers; walking the structure is what makes the two halves different claims.

Three outcomes, and the middle one matters:

- the document carries the token in a value → the clause holds
- the document parses and carries it nowhere → **fail**
- no parseable document was produced → **unverified**, and B5 reports that as its own violation.
  A target that answered a parse error with prose did not put the token in the wrong field; it
  published no fields at all, so saying `pass` here would license "the token reaches a field" off
  a run in which no field existed.

**What the closure still does not reach**, and it is the first gap below. With nothing declared
at `L0` there is no envelope schema to name a field in, so the assertion is the weaker "some
string value somewhere in the document contains it". A target burying the token in a free-text
`detail` satisfies this and not the rule. That is the same `L1` boundary
[B3](../streams/machine-output-is-parseable.md) and B5 both stop at.

## Current checker coverage

[`names-offending-token.ts`](../../../../src/acc/kit/checkers/parsing/names-offending-token.ts) — `L0`,
`coverage: partial`. A pass means nothing under **Established** was violated; the **Gaps** are
the rest of this page, unexamined.

**Established**

- the stderr of an unknown root flag rejection contains the probe's sentinel string
- the stderr of an unknown root verb rejection contains the probe's sentinel string
- for a target that advertises a machine-mode flag and answers a parser error with a parseable
  document some string value inside that document contains the sentinel

**Gaps**

- the machine-mode field is any string value anywhere in the document because no declaration
  exists at L0 to name the envelope field the rule requires
- only an unknown flag and an unknown verb are probed
- the SHOULD to enumerate a closed set as choices is not exercised
- the assertion is that the sentinel substring reached stderr and not that the whole offending token
  appears verbatim

## Evidence

All five CLIs surveyed (`git`, `docker`, `kubectl`, `gh`, `cargo`) name the offending flag on
stderr. This is the one aspect of failure handling the industry agrees on — which is why it is
Core rather than aspirational.

The `choices` half comes from Vercel's agent-mode envelope, which enumerates valid options so
the agent resolves the problem itself instead of retrying blind. See
[error envelope](../../concepts/error-envelope.md#choices-is-just-in-time-discovery).
