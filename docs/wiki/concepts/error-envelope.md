---
type: concept
title: Error envelope
description:
  The structured failure payload — a stable machine code, a retry verdict, and the valid
  alternatives — that prose on stderr cannot provide.
tags: [errors, contract, agent-facing, remediation]
related: [concept/exit-codes, concept/machine-mode, rule/stdout-carries-only-data]
status: stable
generated: { by: claude-opus-5, at: 2026-08-15 }
---

# Error envelope

## What it is

When a command fails in [machine mode](./machine-mode.md), it writes a single JSON object to
stderr describing the failure in terms a program can branch on:

```
{
  "ok": false,
  "error": {
    "kind": "rate_limit",
    "exit_code": 7,
    "retryable": true,
    "message": "Rate limit exceeded for capability 'tts'",
    "hint": "Wait 30s, then retry",
    "details": { "resetAt": "2026-08-13T09:44:00Z" }
  },
  "meta": { "command": "jobs submit" }
}
```

`kind` is the contract. `message` is presentation.

## Why it matters for agents

**This is the largest gap in the industry, and the clearest place to take a side.**

In `gh`, `docker`, and `kubectl`, `--json` means _"format my success payload as JSON."_
Failures fall back to prose on stderr. Of the tools surveyed, only `cargo`, `terraform`,
`oclif`/Salesforce, and Vercel's agent mode structure their errors at all.

The consequence is not merely inconvenience. Consider:

```
docker inspect <missing-container> --format json
   stdout: []
   stderr: Error: No such object: <missing-container>
   exit:   1
```

A consumer reading stdout sees **an empty result set**, not a failure. The tool answered a
question it could not answer, in the shape of a successful answer. Anything that trusts stdout
— which is precisely what stdout is for — gets a wrong answer rather than an error.

That is why [stdout must be empty on failure](../rules/streams/stdout-carries-only-data.md) is
a Core rule, and why the envelope belongs on stderr.

## The details

### Two shapes, and `confirmation_required` is one of the errors

There are exactly **two** top-level shapes: `{ ok: true, data }` and `{ ok: false, error }`.
There is no third status and no `status` field. A discriminated union over `ok` is the whole
algebra a consumer has to handle.

**Design guidance, not a rule** — for this whole page. The envelope is what `acc` implements and
what the spec recommends, and no rule page requires it of anyone else. The rules nearby bind
adjacent things and stop short of the shape: [B3](../rules/streams/machine-output-is-parseable.md)
requires machine output to parse, [A3](../rules/parsing/errors-name-the-offending-token.md)
requires an error to name the offending token — and its own coverage gap records that "the
machine-mode error envelope field is never inspected" — and
[C2](../rules/exit-codes/usage-errors-are-distinguishable.md) requires usage and internal faults
to be distinguishable by code. None of them reaches `kind`, `retryable`, or the two-shape
discipline. Promoting those is
[roadmap work](../../roadmap.md#design-guidance-that-is-not-yet-normative).

"I need a decision from you" is therefore an ordinary error, with the kind
`confirmation_required` and [exit `8`](./exit-codes.md#the-taxonomy):

```
{
  "ok": false,
  "error": {
    "kind": "confirmation_required",
    "exit_code": 8,
    "retryable": false,
    "message": "Deleting 3 projects requires confirmation",
    "hint": "Re-run with --yes to proceed, or --dry-run to see the effect",
    "choices": ["--yes", "--dry-run"],
    "details": { "affected": ["alpha", "beta", "gamma"] }
  },
  "meta": { "command": "projects prune" }
}
```

Nothing above is optional decoration: `choices` names the flags that would supply the decision,
and `details` enumerates the blast radius — the machine-readable equivalent of reading the
prompt a TTY user would have seen.

**What exit `8` means.** The work was **not done** — that is why it is not a success, and why
`ok` is `false`. What separates it from every other error kind is that the caller can resolve
it: the invocation was incomplete rather than wrong, and supplying the decision it named turns
the same command into one that works. Compare `usage` (exit `2`), where retrying the invocation
unchanged fails identically, and `permission` (exit `4`), where no argument the caller can add
will help.

That distinction is the point, and it is what the survey's best artefact — Vercel's agent-mode
envelope — was reaching for with a third top-level status. This spec puts the same information
in the `kind` field instead of in a parallel `status` field. One discriminator, and
`confirmation_required` is as branchable as `rate_limit`. (An earlier draft of this page named
that state `action_required`, after Vercel's field. The name is gone; `confirmation_required`
is the only spelling, and it is the one the implementation and the schema publish.)

This is how a non-interactive tool asks for confirmation. It never blocks on a prompt — see
[never block without a TTY](../rules/interactivity/never-block-without-a-tty.md) — it exits `8`
and names the flag that would supply the answer.

### `choices` is just-in-time discovery

When a failure is caused by an invalid value, enumerate the valid ones **in the envelope**.
The agent then self-corrects immediately and never needs to consult the schema.

This makes good errors and schema introspection two views of one thing: **an error is a
just-in-time slice of the schema**, delivered exactly when the caller has demonstrated it
needs that slice, and paid for only on failure. Both are generated from the same declaration,
so the flags an error offers are by construction the flags the parser accepts.

Contrast a parser that accepts `--frmat` silently: there is no error, so there is no slice, so
there is nothing to correct.

### `next` carries remediation as an executable plus an argv array

**Success** responses may carry `next`. This addresses a real and specific agent failure: a
command that starts something (a job, a daemon, a build) succeeds, and the agent never performs
the follow-up that makes the result observable, because nothing told it to.

```
"next": [{ "exec": "acc", "args": ["show", "A1", "--body"], "when": "to read the full text" }]
```

The error envelope has no `next` field. A failure's remediation travels in `hint` (prose) and
`choices` (the valid alternatives) — including the `confirmation_required` case above, where
`choices` names the flags that would resolve it.

`exec` is the program; `args` is every argument after it, one element per argument, already
split. `when` is prose, for a human or for a model deciding whether to follow the offer.

The split is the point. A shell string loses the distinction between argv and shell syntax, so
interpolating a caller-controlled identifier — a slug, a path, a rule id — into one is a
command-injection boundary: a semicolon or a backtick is data or syntax depending entirely on
who executes the string. Split into `args`, that identifier is one argument containing a
semicolon, and cannot become a second command. A consumer that rejoins `exec` and `args` into a
string and hands it to a shell has put the boundary back; `spawn(exec, args)` is what the shape
is for.

What `next` still does not carry: declared placeholders, an effect classification, and
provenance. Nothing in the envelope says what running an offer would do, so it remains a
**proposal**, to be validated before it is run rather than trusted because it parsed. Those
three are what remains of the first
[roadmap item](../../roadmap.md#1-remediation-becomes-structured-data).

`next` is advisory, never required: a caller that ignores it should still be able to reach the
same state by other means. That is guidance too, and it is the clause most likely to change, so
anything given a rule id here would be minted against a shape that is still moving.

### The prose still matters — but it is labelled

`message` and `hint` are for humans, and should be good. The discipline is that they are
_marked as presentation_, so nothing parses them. `cargo` makes this explicit by carrying the
fully-rendered human text inside the payload as a `rendered` field.

### Errors are append-only, like the codes

New `kind` values may be added. Existing ones may never be repurposed, and the `kind` →
`exit_code` mapping may never change — both appear in stored reports and long-lived agent
instructions. See [exit codes are append-only](./exit-codes.md#exit-codes-are-append-only).

## Related rules

- [Diagnostics never appear on stdout](../rules/streams/stdout-carries-only-data.md)
- [Errors name the offending token](../rules/parsing/errors-name-the-offending-token.md)
