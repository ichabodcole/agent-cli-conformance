---
type: rule
title: Never act on a guessed correction
description:
  Suggesting "did you mean" is helpful; running it converts a caught error into an unlogged
  wrong action.
tags: [parsing, safety, core]
related: [rule/unknown-flag-exits-nonzero, concept/error-envelope]
status: current
updated: 2026-08-14
rule_id: A5
tier: core
probe_level: L0
checker: src/acc/kit/checkers/parsing/no-fuzzy-correction.ts
checker_status: implemented
coverage: partial
coverage_gaps:
  - only a near-miss FLAG is probed and never a near-miss verb
  - performing no work is inferred from a non-zero exit rather than observed
  - the MUST NOT prompt to confirm a guess clause is not exercised here
  - only a single deletion near-miss of one discovered flag is probed so a transposition or an insertion or a case change is not
  - the near-miss is sent at the root so a near-miss of a flag belonging to a subcommand is never built
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
<cli> --<one-character-typo-of-a-real-flag>
```

Only a FLAG near-miss is probed — never a verb, and only alone, with no verb present anywhere
in the invocation (the `no-verb` inertness class requires every argument to look like a flag).
A near-miss VERB is excluded entirely: correcting `dpelte` to `delete` and then running it is
exactly the failure this rule exists to catch, so testing that half would mean invoking a real
command, which is only safe once the kit knows that command has no side effects — the same
reason [unexpected positionals](./unexpected-positionals-rejected.md) moved off `L0`. The verb
half of this rule is unverified until that effect classification exists.

The typo is derived from a flag discovered in the CLI's own `--help` output (drop one
character — the edit a fuzzy matcher is most likely to "fix"), so it's genuinely one edit away
from something real. Where no suitable flag can be found, or the typo happens to collide with
a real flag, the checker declines to probe and reports **unverified**.

Passes when the invocation exits non-zero. Distinguishing "suggested" from "acted on" is done
by exit code alone — the checker does not additionally require empty stdout.

## Current checker coverage

[`no-fuzzy-correction.ts`](../../../../src/acc/kit/checkers/parsing/no-fuzzy-correction.ts) — `L0`,
`coverage: partial`. A pass means nothing under **Established** was violated; the **Gaps** are
the rest of this page, unexamined.

**Established**

- a one-character near-miss of a **flag** discovered in root help exits non-zero rather than being
  silently corrected.
- when no suitable flag can be discovered, the verdict is `unverified` rather than a pass.

**Gaps**

- only a near-miss FLAG is probed and never a near-miss verb
- performing no work is inferred from a non-zero exit rather than observed
- the MUST NOT prompt to confirm a guess clause is not exercised here
- only a single deletion near-miss of one discovered flag is probed so a transposition or an
  insertion or a case change is not
- the near-miss is sent at the root so a near-miss of a flag belonging to a subcommand is never
  built

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
