---
type: concept
title: Exit codes
description:
  The one part of a CLI's response a caller can read without parsing anything — and the only
  signal that survives truncation.
tags: [exit-codes, errors, contract, agent-facing]
related: [rule/unknown-flag-exits-nonzero, decision/exit-codes-below-125]
status: current
updated: 2026-08-14
---

# Exit codes

## What it is

Every process returns an integer between 0 and 255 when it exits. `0` means success; anything
else means failure. Shells expose it as `$?`; agent harnesses surface it alongside stdout and
stderr.

It is the **only** part of a CLI's response a caller can act on without parsing anything — no
JSON, no prose, no encoding assumptions.

## Why it matters for agents

An agent runs a command and gets a failure. Whether it should retry depends entirely on _why_:

| Cause              | Correct response                                   |
| ------------------ | -------------------------------------------------- |
| auth expired       | re-authenticate, then retry — retrying alone loops |
| rate limited       | wait, then retry — retrying now makes it worse     |
| resource not found | **never** retry; it will never succeed             |
| bad flag           | **never** retry; fix the invocation                |
| transient network  | retry immediately                                  |

Five different correct behaviours. If every failure returns `1`, the agent's only remaining
discriminator is the human-readable message — and prose is not a contract. When a tool
rewrites `rate limit exceeded` to `too many requests (429)`, nothing crashes: the agent simply
stops matching, falls through to a default branch, and behaves confidently and wrongly. No
test fails, because the matching logic lives somewhere else entirely. The maintainer improved
an error message, which is normally a welcome, non-breaking change.

A stable code survives every rewrite, translation, and tone change.

The most load-bearing property is cruder than any of this, though: **non-zero-ness is what
makes failure visible at all.** Even if nothing ever distinguishes `7` from `5`, a non-zero
exit is what causes a harness to flag the command as failed and the agent to notice. A tool
that fails while exiting `0` is not merely hard to diagnose — it is invisible. See
[unknown flags must exit non-zero](../rules/parsing/unknown-flag-exits-nonzero.md).

## The details

### There is no industry standard

Exit codes look like HTTP status codes but do not behave like them. HTTP has RFC 9110, a
registry, and universal client support: `404` means the same thing against any server.

Exit codes have almost none of that. Genuinely universal:

- `0` = success, non-zero = failure
- `126` = found but not executable, `127` = command not found, `128+n` = killed by signal `n`

`sysexits.h` (BSD, circa 1987) defined `EX_USAGE=64` through `EX_CONFIG=78` and is the only
real attempt at more. Adoption is spotty. Measured against the same probe — an unrecognised
flag — `git` returns `129`, `docker` returns `125`, and `kubectl`, `gh` and `cargo` all return
`1`. None uses `EX_USAGE`.

So the taxonomy below is a **house standard**, not an industry one. Its value is consistency
across the tools that adopt it: an agent learns it once and it holds everywhere. That is
exactly why it must also be declared in the schema — a local convention that isn't
machine-discoverable is tribal knowledge.

### The taxonomy

```
0   success
1   internal / unexpected
2   usage — bad flags, unknown commands, bare invocation
3   auth — no credential, expired, revoked
4   permission — authenticated but not allowed
5   not found
6   conflict / precondition failed
7   rate limited                     (retryable: true)
8   confirmation required
--- reserved; never allocate ---
125 the wrapper itself failed
126 command found but not executable
127 command not found
128+n killed by signal n
```

Codes are grouped by **what the caller should do**, not by which HTTP status a server
happened to return. That is why nine suffice where a status-mirroring scheme needs seventeen.

`5` deliberately conflates "does not exist" with "exists outside your scope". Distinguishing
them lets a caller probe for the existence of resources it cannot see.

`8` is an **error, not a success**: the work was not done, `ok` is `false`, and the kind is
`confirmation_required`. What distinguishes it from the other seven is that the caller can
resolve it — the invocation was incomplete rather than wrong, so supplying the decision it
named makes the same command work. `2` cannot be resolved that way (retrying unchanged fails
identically) and neither can `4` (no argument the caller adds will help). There is no third
top-level status; see [the error envelope](./error-envelope.md#two-shapes-and-confirmation_required-is-one-of-the-errors).

The reserved band is why our codes stop at 8 — see
[exit codes stay below 125](../decisions/exit-codes-below-125.md).

### Outcomes are not errors

The taxonomy above answers "why did the invocation fail?" — every code in it implies something
went wrong with the request itself: a bad flag, no credential, a missing resource. Each one
carries an error envelope on stderr, a `kind`, and a `retryable` flag.

Some commands need to report something different: the invocation **succeeded**, and the
question it was asked has a **negative answer**. `acc check <target>` is one — a target that
does not conform is not a bug in `acc`, and the report describing why is accurate, well-formed
data on stdout with `ok: true`, not a failure. Reusing a usage or internal error code for this
would misclassify it — a caller that branches on `kind` would treat "the target isn't
conformant" as "you asked me wrong," which isn't true and sends the caller looking for the
wrong fix. Exiting `0` is worse: it is precisely the silent-failure shape [unknown flags must
exit non-zero](../rules/parsing/unknown-flag-exits-nonzero.md) exists to catch every OTHER CLI
doing, so `acc` cannot do it either.

The fix is a third category, distinct from both:

```
0     success
1-8   ERRORS      — why the INVOCATION failed. Structured envelope, `kind`, `retryable`.
9-124 OUTCOMES    — what the SUBJECT turned out to be. Still `ok: true`; no envelope, no `kind`,
                    no `retryable` — there is nothing to retry, because nothing failed.
125+  reserved    — what a CHILD PROCESS did.
```

```
9   acc check ran successfully; the target does not conform
```

An outcome code is still governed by every rule an error code is: append-only, never renumbered,
declared once and never duplicated across the codebase — see
[exit codes stay below 125](../decisions/exit-codes-below-125.md) for why the whole
non-reserved range, errors and outcomes alike, stays under 125. The only thing that changes is
what a non-zero value _means_ here — not "something broke," but "here is the answer, and it's a
no."

### Exit codes are append-only

Codes are a published contract. Changing what `4` means breaks every script and agent that
branches on it, silently, with no version negotiation available. **Add, never renumber.**

Kubernetes' [KEP-2551](https://github.com/kubernetes/enhancements/tree/master/keps/sig-cli/2551-return-code-normalization)
proposed normalising kubectl's exit codes and has sat alpha-gated behind an environment
variable since 2022 — not because the design is bad, but because retrofitting exit codes onto
a tool with existing consumers is close to impossible. Get this right when a CLI is born.

### How a caller learns what a code means

In practice, rarely by looking it up:

1. **The error says so.** A conforming failure carries a structured envelope on stderr with a
   stable `kind`, `retryable`, and a `hint`. The code is a compressed summary of information
   the payload already states in full. This is the dominant path.
2. **The generated reference.** A compact skill file, generated from the schema, carries the
   table. Loaded once per session, so the agent knows before it runs anything.
3. **The schema.** `<cli> schema` includes every error kind with its code and `retryable`
   flag. The authoritative fallback.
4. **Convention.** Because conforming tools share one table, an agent that has used one knows
   the others.

Both the code and the envelope's `kind` are generated from the same declaration, so they
cannot disagree — and the conformance kit verifies exactly that by provoking each declared
error and confirming the code matches what the schema promised.

## Related rules

- [Unknown flags must exit non-zero](../rules/parsing/unknown-flag-exits-nonzero.md) — the
  rule that depends most directly on this concept.
