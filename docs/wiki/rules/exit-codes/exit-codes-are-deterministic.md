---
type: rule
title: Identical invocations produce identical exit codes
description:
  A code that varies between runs makes every retry decision unsound, and turns a reproducible
  failure into an intermittent one.
tags: [exit-codes, determinism, core]
related: [concept/exit-codes, rule/help-output-is-deterministic]
status: stable
generated: { by: claude-opus-5, at: 2026-08-14 }
rule_id: C3
tier: core
deviation: defect
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

## How to comply

No framework has a setting for this, and none needs one: the status a parser emits on a usage
error is a constant it never varies — `1` in `commander`, `cac` and `clipanion`, `2` in `clap`,
`80` in `kong`, `252` in `@stricli/core`. Every mechanism below is in code you wrote, so the
remedies are structural rather than configuration.

**If a code can arrive from a crash, it is not a code you chose.** `kubectl` allocates exactly
one failure constant (`DefaultErrorExitCode = 1` in `pkg/cmd/util/helpers.go`), yet
`kubectl api-resources` against an unreachable cluster exits `2` through an unhandled Go panic —
so cluster reachability, not argv, picks the status. Catch panics and uncaught exceptions at the
top of `main` and map them onto your allocated internal code. Crashing on an inert invocation is
[G1](../lifecycle/inert-invocations-do-not-crash.md)'s violation as well as this one.

**If you execute work the caller supplied, reserve a band for your own failures.** `docker`
passes a container's status through verbatim (container `exit(42)` → `42`) and keeps `125` for
"docker itself failed", `126` for found-but-not-invokable, `127` for not-found. `cargo run` also
passes the child's code through verbatim but reserves nothing, which is why `cargo run` exiting
`101` is ambiguous between "cargo failed" and "your program panicked" — one code, two meanings,
selected by which side failed. `gh` passes extension exit codes through unchanged. Passthrough is
fine; passthrough into a range you also use is the second clause of this rule broken.

**If a signal can end the process, decide the status instead of inheriting it.** Everything above
`128` is where a signal death gets _reported_, not a code you allocated — `aws` documents `130`
precisely as `128 + SIGINT`. The case that bites without any caller involvement is a closed
downstream pipe: `gh` handles it and exits `0` when its pager pipe closes, on the reasoning that
piping to `head` is not a failure. Install a `SIGPIPE` disposition and pick the code deliberately.

**If the status is computed, stop computing it.** A count of failures, a hash of a message, the
first element of an unordered set, or whatever the last operation happened to return are all
statuses that vary with input volume or iteration order rather than with the outcome. Select the
code from the [taxonomy](../../concepts/exit-codes.md#the-taxonomy) by what the caller should do
next. A computed status also escapes the allocated range as soon as the count exceeds nine, and
past `125` it collides with the reserved band — see
[exit codes stay below 125](../../decisions/exit-codes-below-125.md).

**If a deadline is marginal, the status becomes a report on machine load.** The taxonomy reserves
`124` for a timeout following `timeout(1)`'s convention; a deadline short enough to be marginal
makes the same command return `0` on an idle machine and `124` on a loaded one, presenting a
performance problem as a correctness problem. The same applies to a cleanup path that races the
exit — do the cleanup before you choose the status, not after.

**If the failure is genuinely intermittent, allocate it a code and mark it `retryable: true`,**
as the taxonomy does for `7` (rate limited). The alternative is what `stripe` does — a single
`os.Exit(1)` in `pkg/cmd/root.go` for every failure path — where a caller cannot separate "you
typo'd" from "the card declined", so an intermittent cause is indistinguishable from a permanent
one and no retry policy is correct. `deno` collapses the same way: every non-zero status is `1`.

**Keep ambient config and TTY detection out of the exit path.** `gh` is the model: its
`NoResultsError` prints its explanation only when stdout is a TTY, but exits `0` either way — the
terminal changes the prose, never the code. `git`'s `help.autoCorrect` is the counter-example,
flipping an identical mistyped invocation between exit `1` and exit `0` depending on the
configured value; [A5](../parsing/no-fuzzy-auto-correction.md) covers why to pin it to `0`.

Not established by the research: no surveyed tool was measured exhibiting a nondeterministic exit
code, so the mechanisms above are named from their observable structure rather than from a
recorded flake, and their relative frequency is not claimed.

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

**The three runs are one invocation repeated, not three similar ones.** Nothing tells them apart
from the target's side: no distinguishing argument, no marker environment variable. The runner
deduplicates identical probes and separates the repetitions by a recorder-side index the target
never sees; see
[probing](../../concepts/probing.md#probes-are-shared-and-a-rule-may-declare-none).

**Passes** when all three runs return the same code.

Three runs is a cheap smoke test, not proof — it catches gross nondeterminism (an uninitialised
value, a race in startup, a random default) and will miss anything rarer. The checker reports
what it did: three runs, all agreeing. It does not claim determinism.

Deliberately excluded: any invocation that performs work. Repeating a real command three times
is the opposite of inert, and belongs to `L2` — where running twice is precisely how
[idempotence](../../concepts/output-kind.md) claims get falsified.

**Reports `unverified`** when fewer than three runs were recorded, when a capture was cut short
by the output ceiling, and when a run died on a signal. A process the kit killed, or one that
faulted, never chose the exit code this rule compares; see [probing](../../concepts/probing.md#a-probe-the-kit-killed-is-not-a-probe-the-target-failed).

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

## Evidence

No survey data — none of the five tools examined exhibited nondeterministic exit codes under
the probes run, which is the expected result for mature CLIs.

The rule is included because it is nearly free to check and because the failure it guards
against is expensive out of proportion to its rarity: an intermittent exit code degrades every
other guarantee in this catalogue, since every probe here assumes that running a command twice
tells you the same thing.
