---
type: concept
title: Error envelope
description:
  The structured failure payload — a stable machine code, a retry verdict, and executable
  remediation — that prose on stderr cannot provide.
tags: [errors, contract, agent-facing, remediation]
related: [concept/exit-codes, concept/machine-mode, rule/stdout-carries-only-data]
status: current
updated: 2026-08-13
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

### Three statuses, not two

The best artefact found in the survey is Vercel's agent-mode envelope, because it has a third
status beyond success and failure:

```
{ "status": "action_required",
  "reason": "project_not_linked",
  "message": "...",
  "choices": ["link-existing", "create-new"],
  "next": [{ "command": "vercel link --project <name>", "when": "link-existing" }] }
```

`action_required` says: _nothing went wrong, and nothing happened, and here is exactly what
would unblock it._ Without it, "I need a decision from you" has to masquerade as an error, and
an agent cannot tell a genuine failure from a solicitable one.

This is also how a non-interactive tool asks for confirmation — see
[exit code 8](./exit-codes.md#the-taxonomy). It never blocks on a prompt; it returns
`action_required` with the exact command to re-run.

### `choices` is just-in-time discovery

When a failure is caused by an invalid value, enumerate the valid ones **in the envelope**.
The agent then self-corrects immediately and never needs to consult the schema.

This makes good errors and schema introspection two views of one thing: **an error is a
just-in-time slice of the schema**, delivered exactly when the caller has demonstrated it
needs that slice, and paid for only on failure. Both are generated from the same declaration,
so the flags an error offers are by construction the flags the parser accepts.

Contrast a parser that accepts `--frmat` silently: there is no error, so there is no slice, so
there is nothing to correct.

### `next` carries executable remediation

Success responses may also carry `next` — command _templates with typed placeholders_,
pre-filled with the identifiers just used. This addresses a real and specific agent failure:
a command that starts something (a job, a daemon, a build) succeeds, and the agent never
performs the follow-up that makes the result observable, because nothing told it to.

`next` is advisory, never required. A caller that ignores it must still be able to reach the
same state by other means.

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
