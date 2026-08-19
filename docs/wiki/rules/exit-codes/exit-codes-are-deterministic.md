---
type: rule
title: Identical invocations produce identical exit codes
description:
  A code that varies between runs makes every retry decision unsound, and turns a reproducible
  failure into an intermittent one.
tags: [exit-codes, determinism, core]
related: [concept/exit-codes, rule/help-output-is-deterministic]
status: stable
generated: { by: unknown, at: 2026-08-14 }
rule_id: C3
tier: core
probe_level: L0
checker: src/acc/kit/checkers/exit-codes/deterministic.ts
checker_status: implemented
coverage: partial
coverage_gaps:
  - only one usage-error invocation shape is repeated and only three times
  - unchanged state is assumed rather than established
  - the retryable declaration for genuinely intermittent failures is not exercised
  - only a usage-error path is repeated so a success path or a real command is never compared
  - the three runs land within milliseconds of each other so variation that appears only over a longer interval is invisible
coverage_established:
  - one usage-error invocation repeated three times with byte-identical argv and environment returns the same exit code each time
---

# Identical invocations produce identical exit codes

## The rule

The same invocation, against unchanged state, **MUST** produce the same exit code every time.

Where an operation genuinely can fail intermittently — a network call, a lock contention — that
**MUST** be expressed as a distinct, declared code carrying `retryable: true`, not as the same
code sometimes meaning success.

## Why

Every retry policy a caller can write assumes the code means something stable. If `mycli
deploy` returns `0` on one run and `7` on the next with nothing changed, then no policy is
correct: retrying is right sometimes and wrong other times, and the caller cannot tell which
situation it is in.

The subtler damage is to diagnosis. An agent that hits a nondeterministic code will often
"resolve" it by retrying until it passes — which looks like success and hides a real defect
indefinitely. The failure is now intermittent, which is strictly worse than reproducible: it
survives investigation, because it does not reproduce when someone looks.

Note the rule permits intermittency; it requires it to be _declared_. `retryable: true` is a
promise that retrying is meaningful. What it forbids is an undeclared code that silently means
two different things.

## The probe

Inert (`L0`).

```
<cli> --<sentinel>-flag
<cli> --<sentinel>-flag
<cli> --<sentinel>-flag
```

One unknown-flag invocation, run three times. Byte-identical argv on every run, and an
environment identical to the other two — which is what the rule's first word requires.

Getting there needed a change in the recorder. The runner deduplicates invocations by an id
derived from args and environment, so three identical probes used to collapse into one recorded
run. The workaround was to send three textually distinct flags
(`--<sentinel>-repeat-1/-2/-3`), and it measured the wrong thing: agreement across three
_equivalent usage errors_ rather than repetition of one invocation. A parser that hashed the
offending token into its exit code would fail that probe deterministically, and a parser
genuinely nondeterministic on repeated identical input would pass it. `Invocation.repeat` now
carries a recorder-only index — it takes part in the invocation id, so the repetitions stay
distinct recordings, and it is never passed to the target as an argument or through the
environment. A test using an argv-echoing fixture asserts exactly that, because a `repeat` that
leaked into argv would silently restore the defect.

Passes when all three runs return the same code.

Three runs is a cheap smoke test, not proof — it catches gross nondeterminism (an uninitialised
value, a race in startup, a random default) and will miss anything rarer. The checker reports
what it did: three runs, all agreeing. It does not claim determinism.

Deliberately excluded: any invocation that performs work. Repeating a real command three times
is the opposite of inert, and belongs to `L2` — where running twice is precisely how
[idempotence](../../concepts/output-kind.md) claims get falsified.

## Current checker coverage

[`deterministic.ts`](../../../../src/acc/kit/checkers/exit-codes/deterministic.ts) — `L0`,
`coverage: partial`. A pass means nothing under **Established** was violated; the **Gaps** are
the rest of this page, unexamined.

**Established**

- one usage-error invocation repeated three times with byte-identical argv and environment returns
  the same exit code each time

**Gaps**

- only one usage-error invocation shape is repeated and only three times
- unchanged state is assumed rather than established
- the retryable declaration for genuinely intermittent failures is not exercised
- only a usage-error path is repeated so a success path or a real command is never compared
- the three runs land within milliseconds of each other so variation that appears only over a longer
  interval is invisible

## How to comply

Almost always satisfied for free. When it isn't, the usual causes are:

- exit status derived from a value that depends on iteration order over a hash map or a set
- a timeout or deadline short enough to be marginal on a loaded machine, so the same command
  sometimes completes and sometimes times out
- a cleanup path that races the exit and occasionally changes the status
- signal handling that lets the process exit with `128+n` under conditions the caller did not
  cause

The timeout case is the common one and the most misleading, because it makes a
performance problem present as a correctness problem.

## Evidence

No survey data — none of the five tools examined exhibited nondeterministic exit codes under
the probes run, which is the expected result for mature CLIs.

The rule is included because it is nearly free to check and because the failure it guards
against is expensive out of proportion to its rarity: an intermittent exit code degrades every
other guarantee in this catalogue, since every probe here assumes that running a command twice
tells you the same thing.
