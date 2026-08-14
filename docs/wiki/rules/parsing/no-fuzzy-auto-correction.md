---
type: rule
title: Never act on a guessed correction
description:
  Suggesting "did you mean" is helpful; running it converts a caught error into an unlogged
  wrong action.
tags: [parsing, safety, core]
related: [rule/unknown-flag-exits-nonzero, concept/error-envelope]
status: current
updated: 2026-08-13
rule_id: A5
tier: core
probe_level: L0
checker: src/acc/kit/checkers/parsing/no-fuzzy-correction.ts
checker_status: implemented
---

# Never act on a guessed correction

## The rule

A CLI **MAY** suggest a correction for an unrecognised flag or command
(`did you mean --format?`).

It **MUST NOT** execute the guess. A near-miss token **MUST** still exit non-zero and perform
no work — whether or not a suggestion was printed.

A CLI **MUST NOT** prompt interactively to confirm a guess. See
[never block on input without a TTY](../interactivity/never-block-without-a-tty.md).

## Why

The instinct behind auto-correction is sound for humans: a typo is obvious, the fix is
obvious, so why make the person retype it? A person also _sees_ the correction happen and can
object.

An agent cannot object, because from its side the two outcomes are indistinguishable:

```
mycli --frmat json     →  exit 0, ran with format=json     (guessed and corrected)
mycli --format json    →  exit 0, ran with format=json     (asked for exactly this)
```

Nothing in the result records that a guess was made. The agent's model of what it invoked is
now wrong in a way it cannot detect, and if the guess was mistaken — `--force` for `--fore`,
`delete` for `deploy` — the tool performed an action the caller never requested and reported
success.

The asymmetry decides it. **Rejecting a near-miss costs one round trip.** Acting on a wrong
guess costs an unintended operation with no trace. And the round trip is nearly free anyway,
because a conforming rejection carries the correction in its
[`choices` field](../../concepts/error-envelope.md#choices-is-just-in-time-discovery) — the
agent gets the same information, and stays the one who decides.

This is also why a suggestion is genuinely worth printing. The rule is not "don't help." It is
"help, and let the caller act."

## The probe

Inert (`L0`), since a near-miss must not run.

```
<cli> --<one-character-typo-of-a-real-flag> <value>
<cli> <one-character-typo-of-a-real-verb>
```

Passes when both exit non-zero. The checker derives the near-miss from a flag or verb found in
the CLI's own help output, so the typo is genuinely one edit away from something real — the
case a fuzzy matcher is most likely to "fix".

Distinguishing "suggested" from "acted on" is done by exit code and stdout: a suggestion
accompanies a non-zero exit and empty stdout; an action produces the command's normal output.

## How to comply

Turn off fuzzy execution; keep fuzzy suggestion.

Most parsers separate these already. The risk is in hand-written dispatch code that reaches
for a nearest-match helper to be forgiving, and in shells or wrappers that add
correct-and-retry behaviour around a compliant binary.

## Evidence

This is one of the few points where agent-focused guidance is explicit and unanimous. Arcjet's
CLI design notes state it directly: unknown commands and flags are hard failures — _the
command either exists or it does not_ — and fuzzy recovery is listed as an anti-pattern,
because ambiguity can be misread as confirmation of success.

None of the five CLIs surveyed auto-executes a correction. `git` suggests and, in its default
configuration, does not run the suggestion.

Full survey: [`research/01-case-studies.md`](../../../../research/01-case-studies.md).
