---
type: rule
title: "\"You invoked me wrong\" is distinguishable from \"I broke\""
description:
  Both are failures, but one is fixed by changing the command and the other never is — an agent
  that cannot tell them apart retries forever or gives up wrongly.
tags: [exit-codes, errors, core]
related: [concept/exit-codes, decision/exit-codes-below-125]
status: current
updated: 2026-08-16
rule_id: C2
tier: core
probe_level: L0
checker: src/acc/kit/checkers/exit-codes/usage-distinguishable.ts
checker_status: implemented
coverage: partial
coverage_gaps:
  - the internal-fault contrast is not established at L0 because no internal fault can be provoked inertly
  - the taxonomy codes for more specific failures are not exercised
  - an unexpected positional is never compared because a stray positional needs a verb to be stray to and sending a verb is above L0
coverage_established:
  - an unknown root flag and an unknown root verb and the bare invocation all exit with the same non-zero code
  - for a target whose help advertises a closed value set a value outside it exits with that same code
  - that code is 2 where the pass is reported and the verdict is unverified where it is any other single code
---

# "You invoked me wrong" is distinguishable from "I broke"

## The rule

A CLI **MUST** use distinct exit codes for caller error and internal failure:

- **`2`** — usage: bad flag, unknown command, unexpected positional, bare invocation, malformed
  value. _The caller can fix this by changing the command._
- **`1`** — internal / unexpected: an unhandled condition, a bug, an unclassified fault. _The
  caller cannot fix this by changing the command._

More specific failures **MUST** use their own codes from the
[taxonomy](../../concepts/exit-codes.md#the-taxonomy) rather than collapsing into either.

`1` **MUST NOT** be the catch-all for everything non-zero.

## Why

The distinction determines what the caller does next, and the two correct behaviours are
opposites.

A usage error means the invocation was wrong: **re-reading the help and fixing the command is
productive; retrying unchanged is guaranteed to fail identically.** An internal error means the
invocation may well have been right: **retrying can succeed, and rewriting the command is
guesswork against a tool that is malfunctioning.**

An agent given `1` for both has no way to choose. In practice it does the more expensive wrong
thing — treating a genuine bug as its own mistake and rewriting a correct invocation repeatedly,
each attempt "failing" in a way that appears to confirm the command was wrong.

This is also the difference between a bug you can report and a bug you can't. `2` says the
caller is at fault, which is actionable by the caller. `1` says the tool is at fault, which is
actionable by its maintainer. Merging them loses the routing.

## The probe

Inert (`L0`), but **only partly verifiable without declarations** — and the checker says so
rather than implying more.

```
<cli> --totally-made-up-flag      # usage error: unknown flag
<cli> nonsense-verb-xyz           # usage error: unknown verb
<cli>                             # usage error: the bare invocation
<cli> --format=nonsense-xyz       # usage error: a value outside an advertised set
```

At `L0` the checker verifies:

- every one exits non-zero (**core**)
- every one yields the **same** code, since all of them are the same error class (**core**)
- the code is `2` (**diagnostic** — reported, not failed, because an undeclared tool never
  agreed to the taxonomy)

**Four of this page's five usage-error shapes are now contrasted.** The bare invocation was always
recorded — [D2](../discoverability/bare-invocation-is-a-usage-error.md) and
[E1](../interactivity/never-block-without-a-tty.md) both send it — and simply was not read here;
the malformed value arrives from [A7](../parsing/advertised-value-set-is-enforced.md), whose probe
this one is byte-identical to, so the recorder runs it once and both rules read the same
observation. That matters for a contrast: two runs of the same argv would be comparing codes the
target chose on two separate occasions.

The fifth, an unexpected positional, stays out of reach for the reason
[A4](../parsing/unexpected-positionals-rejected.md) does — a positional is only _stray_ if there is
a verb for it to be stray to, and sending a verb is `L1`.

Distinguishability from an internal error **cannot** be verified black-box: there is no
general, safe way to provoke an internal fault in an arbitrary binary. The checker reports that
half as **unverified** at `L0`. It becomes a hard check at `L1`, where the tool has declared its
error kinds and each one can be provoked and confirmed against its declared code.

Stating this openly matters more than it might seem. A conformance report that quietly implies
it checked something it could not check is the same defect as a CLI reporting success for work
it did not do.

## Current checker coverage

[`usage-distinguishable.ts`](../../../../src/acc/kit/checkers/exit-codes/usage-distinguishable.ts) — `L0`,
`coverage: partial`. A pass means nothing under **Established** was violated; the **Gaps** are
the rest of this page, unexamined.

**Established**

- an unknown root flag and an unknown root verb and the bare invocation all exit with the same
  non-zero code
- for a target whose help advertises a closed value set a value outside it exits with that same
  code
- that code is 2 where the pass is reported and the verdict is unverified where it is any other
  single code

**Gaps**

- the internal-fault contrast is not established at L0 because no internal fault can be provoked
  inertly
- the taxonomy codes for more specific failures are not exercised
- an unexpected positional is never compared because a stray positional needs a verb to be stray to
  and sending a verb is above L0

## How to comply

Define the taxonomy once as constants and give every described failure an explicit code —
`operator`'s approach, where each error class is a typed error carrying its own exit code, and
an escaping error of any other type is by definition `1`.

That last part is what makes it hold: the default is _internal_, so forgetting to classify a
failure produces `1`, which is the honest answer for an unclassified fault. The failure mode is
safe rather than misleading.

## Evidence

The surveyed tools disagree on the number, and two of them merge the classes entirely. On an
invalid flag: `git` exits `129`, `docker` `125`, and `kubectl`, `gh`, and `cargo` all exit `1` —
the same code they use for internal faults.

`sysexits.h` (BSD, 1987) defined `EX_USAGE=64` for precisely this purpose and none of the five
uses it. The absence of convergence is why this project fixes a house taxonomy and declares it
in the schema — see [exit codes stay below 125](../../decisions/exit-codes-below-125.md).
