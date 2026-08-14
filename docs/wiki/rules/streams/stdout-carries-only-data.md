---
type: rule
title: stdout carries only data
description:
  On failure stdout must be empty — otherwise a consumer reading it receives a wrong answer
  rather than an error.
tags: [streams, silent-failure, errors, core]
related: [concept/error-envelope, concept/output-kind, rule/machine-output-is-parseable]
status: current
updated: 2026-08-14
rule_id: B1
tier: core
probe_level: L0
checker: src/acc/kit/checkers/streams/stdout-carries-only-data.ts
checker_status: implemented
coverage: partial
coverage_gaps:
  - only usage-error failures are probed and never a runtime failure
  - stdout on a SUCCESSFUL command is never inspected for diagnostics
---

# stdout carries only data

## The rule

**stdout carries the command's result and nothing else.** Diagnostics, progress, warnings,
prompts, logs, and errors **MUST** go to stderr.

On any failure, stdout **MUST** be empty. A command that cannot produce its result **MUST NOT**
write a partial, empty, or placeholder result to stdout.

Help output is the one deliberate exception: `--help` is a request whose _result_ is the help
text, so it goes to stdout with exit `0`. See
[help exits zero](../exit-codes/help-exits-zero.md).

## Why

This is the rule that separates "the tool failed" from "the tool answered wrongly", and the
difference is not recoverable downstream.

The canonical violation, measured:

```
docker inspect <missing-container> --format json
   stdout: []
   stderr: Error: No such object: <missing-container>
   exit:   1
```

A consumer reading stdout — which is what stdout is _for_ — sees an empty result set. Not an
error: an answer. "There are no matching containers" is a coherent, plausible, entirely wrong
response to "describe this container."

The exit code was correct. The stderr message was correct. And a pipeline consuming stdout
still got a lie, because the failure was _also_ expressed on the success channel. Any consumer
that checks the exit code catches it; any consumer that does what stdout invites — read the
data — does not.

For agents this compounds badly, because the wrong answer is well-formed. An empty array
invites a reasonable next step ("nothing to do, continue"), and nothing later in the run looks
suspicious.

## The probe

Inert (`L0`).

```
<cli> --totally-made-up-flag
<cli> nonsense-verb-xyz
```

Passes when stdout is **byte-empty** on every failing invocation.

The runner captures the two streams to separate buffers rather than reading them through a
shared pipe — measuring stream separation through a merged stream cannot work, and an early
attempt at exactly that produced identical byte counts for both streams and nearly went
unnoticed.

## How to comply

Route every write through a single emitter that knows which stream it is addressing, rather
than calling `console.log` / `println!` ad hoc. Two benefits: the discipline holds by
construction, and it makes
[whole-stream JSON validation](./machine-output-is-parseable.md) possible — which turns a
stray debug print anywhere in the codebase into a hard test failure rather than a code-review
question.

The failure mode to watch for is a command that computes a default result, writes it, and only
then discovers the error. Validate first, emit second.

## Evidence

Docker's behaviour above was reproduced during the case-study survey. It is the single most
dangerous pattern found across the tools examined, precisely because every individual part of
it looks correct.

More broadly: in `gh`, `docker`, and `kubectl`, `--json` means "format my _success_ payload as
JSON" — failure falls back to prose. Of the tools surveyed, only `cargo`, `terraform`,
`oclif`/Salesforce, and Vercel's agent mode structure their errors at all. This is the largest
gap in the industry, and the reason the [error envelope](../../concepts/error-envelope.md) is
specified as tightly as it is.

Full survey: [`research/01-case-studies.md`](../../../../research/01-case-studies.md).
