---
type: rule
title: "\"You invoked me wrong\" is distinguishable from \"I broke\""
description:
  Both are failures, but one is fixed by changing the command and the other never is — an agent
  that cannot tell them apart retries forever or gives up wrongly.
tags: [exit-codes, errors, core]
related: [concept/exit-codes, decision/exit-codes-below-125]
status: current
updated: 2026-08-14
rule_id: C2
tier: core
probe_level: L0
checker: src/acc/kit/checkers/exit-codes/usage-distinguishable.ts
checker_status: implemented
coverage: partial
coverage_gaps:
  - the internal-fault contrast is not established at L0 because no internal fault can be provoked inertly
  - the taxonomy codes for more specific failures are not exercised
  - only an unknown flag and an unknown verb are contrasted so an unexpected positional and a malformed value and the bare invocation are never compared
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
<cli> --totally-made-up-flag      # usage error
<cli> nonsense-verb-xyz           # usage error
```

At `L0` the checker verifies:

- both exit non-zero (**core**)
- both yield the **same** code, since both are the same error class (**core**)
- the code is `2` (**diagnostic** — reported, not failed, because an undeclared tool never
  agreed to the taxonomy)

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

- two different usage errors — an unknown flag and an unknown verb — produce the same non-zero
  exit code, and that code is `2`.

**Gaps**

- the internal-fault contrast is not established at L0 because no internal fault can be provoked
  inertly
- the taxonomy codes for more specific failures are not exercised
- only an unknown flag and an unknown verb are contrasted so an unexpected positional and a
  malformed value and the bare invocation are never compared

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
