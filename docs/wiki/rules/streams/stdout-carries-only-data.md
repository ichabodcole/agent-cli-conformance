---
type: rule
title: stdout carries only data
description:
  On failure stdout must be empty — otherwise a consumer reading it receives a wrong answer
  rather than an error.
tags: [streams, silent-failure, errors, core]
related: [concept/error-envelope, concept/output-kind, rule/machine-output-is-parseable]
status: stable
generated: { by: claude-opus-5, at: 2026-08-16 }
rule_id: B1
tier: core
probe_level: L0
checker: src/acc/kit/checkers/streams/stdout-carries-only-data.ts
checker_status: implemented
coverage: partial
coverage_gaps:
  - only usage-error failures are probed and never a runtime failure
  - stdout on a SUCCESSFUL command is never inspected for diagnostics
  - stderr is never required to carry the diagnostic so a failure that reports nothing at all passes
coverage_established:
  - every one of an unknown root flag and an unknown root verb that exited non-zero left stdout empty
  - for a target that advertises a machine-mode flag the same unknown flag sent with that flag also left stdout empty
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

## How to comply

**First, check where your parser writes usage errors — do not assume stderr.** The survey's
finding is that stream discipline is not standardized, and two entries fail this rule before you
write a line: `clipanion` v4 answers an unknown option (`Unknown Syntax Error: Unsupported option
name`) and an extraneous positional **on stdout**, and `plumbum.cli` writes usage errors to
**stdout**, leaving stderr empty — the research disqualifies it on exactly that ground. A third,
`cac` 7, never routes the diagnostic at all: it throws an uncaught `CACError`, so the caller
receives a Bun-rendered stack trace carrying library source lines instead of a message you placed
on a stream deliberately. If you build on any of these, catching the parse error yourself and
writing the message to stderr — `process.stderr.write` in TS, `sys.stderr` in Python — is the
whole fix, and it is not optional.

**If you use `commander`, take both streams with `configureOutput({ writeOut, writeErr })`; in
`cobra` the equivalent is `SetOut` / `SetErr` on the root command.** Both are verified working.
That single chokepoint is what lets a test assert that nothing diagnostic ever reached `writeOut`,
rather than leaving it to code review.

**If you use `cobra`, set `Args` on every command node — including groups you never run.** This is
the worst case found anywhere in the survey, and it is this rule's exact failure mode: a
non-runnable nested group invoked with an unknown subcommand (`./cli grp2 bogus`) returns
`flag.ErrHelp`, which cobra converts into "print help, return `nil`" (`command.go:1152–1155`) —
**exit 0, with a wall of help text on stdout.** A consumer piping that into a parser gets garbage
where it asked for data. Cobra's `Args` defaults to nil, which is also why it accepts an unknown
subcommand at exit 0 at all; a non-nil `Args` on every node is what turns the invocation back into
an error.

**No framework empties stdout for you on a late failure — that half is yours in every language.**
Route every write through a single emitter that knows which stream it is addressing, rather than
calling `console.log` / `println!` ad hoc. Two benefits: the discipline holds by construction, and
it makes [whole-stream JSON validation](./machine-output-is-parseable.md) possible — which turns a
stray debug print anywhere in the codebase into a hard test failure rather than a code-review
question.

The failure mode to watch for is a command that computes a default result, writes it, and only
then discovers the error. Validate first, emit second.

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
<cli> --acc-probe-xyzzy-flag
<cli> acc-probe-xyzzy-verb
<cli> --acc-probe-xyzzy-flag --json      # or --format=json, where help advertises one
```

**Passes** when stdout is **byte-empty** on every one of those invocations that exited non-zero.

**The third probe selects machine mode, and it convicts a real house style.** A tool that routes
its [error envelope](../../concepts/error-envelope.md) to **stdout** when machine mode is active —
on the argument that in machine mode the envelope _is_ the answer — fails this rule. The
catalogue's position is this page's first sentence: stdout carries the command's **result**, and a
failure has no result. A consumer that reads stdout and gets a document receives something shaped
like an answer.

The **shape** of that document is not this rule's business:
[B5](./machine-mode-holds-on-parser-errors.md) requires the failure to be emitted in the declared
machine shape and is satisfied by a valid envelope wherever it lands. A tool with the stdout house
style therefore passes B5 and fails B1 — one defect reported once by each rule that governs half
of it, rather than the same rule twice.

**Reports `unverified`** when no probe exited non-zero, so no failure was observed to judge, and
when a probe hung, was cut at the output ceiling, or
[ended on a signal](../../concepts/probing.md#a-probe-the-kit-killed-is-not-a-probe-the-target-failed):
a target that never got as far as reporting a failure is not a data point, whichever way its
stdout looks.

## Current checker coverage

[`stdout-carries-only-data.ts`](../../../../src/acc/kit/checkers/streams/stdout-carries-only-data.ts) — `L0`,
`coverage: partial`. A pass means nothing under **Established** was violated; the **Gaps** are
the rest of this page, unexamined.

**Established**

- every one of an unknown root flag and an unknown root verb that exited non-zero left stdout empty
- for a target that advertises a machine-mode flag the same unknown flag sent with that flag also
  left stdout empty

**Gaps**

- only usage-error failures are probed and never a runtime failure
- stdout on a SUCCESSFUL command is never inspected for diagnostics
- stderr is never required to carry the diagnostic so a failure that reports nothing at all passes

## Evidence

Docker's behaviour above was reproduced during the case-study survey. It is the single most
dangerous pattern found across the tools examined, precisely because every individual part of
it looks correct.

More broadly: in `gh`, `docker`, and `kubectl`, `--json` means "format my _success_ payload as
JSON" — failure falls back to prose. Of the tools surveyed, only `cargo`, `terraform`,
`oclif`/Salesforce, and Vercel's agent mode structure their errors at all. This is the largest
gap in the industry, and the reason the [error envelope](../../concepts/error-envelope.md) is
specified as tightly as it is.

Full survey: [`research/2026-08-13-case-studies.md`](../../../research/2026-08-13-case-studies.md).
