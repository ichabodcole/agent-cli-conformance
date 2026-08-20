---
type: rule
title: "\"You invoked me wrong\" is distinguishable from \"I broke\""
description:
  Both are failures, but one is fixed by changing the command and the other never is — an agent
  that cannot tell them apart retries forever or gives up wrongly.
tags: [exit-codes, errors, core]
related: [concept/exit-codes, decision/exit-codes-below-125]
status: stable
generated: { by: claude-opus-5, at: 2026-08-16 }
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

## How to comply

The code a usage error returns is picked by the parser, not by you, and the surveyed parsers pick
four different numbers. Find out which one yours picks, then take it over.

**Already `2` — change nothing.** `clap` v4, `click`, `typer`, `tyro`, `pydantic-settings`,
`plumbum.cli` and Go's stdlib `flag` all reject an unknown flag at exit `2`, which is this
taxonomy's usage code. So does `argparse`. `clap`'s `try_parse_from` hands you the error instead
of exiting if you need a different code for a more specific failure; `argparse` exits by raising
`SystemExit`, which is the thing to catch if you want to renumber.

**Exits `1` — remap it, because `1` is the internal code.** `commander` ≥13, `cac`, `clipanion`
v4, `cobra`, `urfave/cli`, `argh`, `bpaf`, `cyclopts` and `node:util parseArgs` all reject at exit
`1`: usage error and unclassified fault arrive at the caller as the same number, which is exactly
what this rule forbids.

- If you use `commander`, call `exitOverride()`. The parse failure is thrown rather than exited
  on, carrying `e.code` (`commander.unknownOption`) and `e.exitCode` (`1`) — catch it and exit
  `2`. `configureOutput()` is the matching hook for the streams.
- If you use `node:util parseArgs`, the unknown-flag case throws `ERR_PARSE_ARGS_UNKNOWN_OPTION`.
  Branch on the error's `code` and exit `2`.
- If you use `cac`, you have to catch it anyway: the unknown flag throws a raw `CACError` that
  reaches the top level unhandled, so the exit code and the stack trace are the same fix.
- `cyclopts` rejects at `1` on both axes and the survey records no hook for changing it.

**Exits something else — same remap, different number.** `kong` exits `80` (`exit.go:10`,
`exitUsageError`) and `@stricli/core` exits `252`. Kong is the one surveyed framework that already
draws this rule's line for you — usage errors to `exitUsageError`, runtime errors to `1` — so only
the number is wrong, and `kong.Exit` is injectable, which maps `80` → `2` without disturbing the
split. Stricli's `process` object is injectable too; that is the seam, though no remapping of its
`252` was measured.

**Exits `0` — there is nothing here to distinguish yet.** `yargs`, `citty`, `gunshi` and
`pico-args`/`lexopt` accept an unknown flag and run the command; `cobra` exits `0` on an unknown
_nested_ subcommand and, with the default nil `Args`, on extra positionals; `urfave/cli` runs the
root action on an unknown subcommand. Fix that first —
[unknown flag](../parsing/unknown-flag-exits-nonzero.md),
[unknown command](../parsing/unknown-command-exits-nonzero.md),
[unexpected positionals](../parsing/unexpected-positionals-rejected.md) — because a failure that
exits `0` has no code to route on at all.

**For the rest of the [taxonomy](../../concepts/exit-codes.md#the-taxonomy), put the code on the
error.** `oclif`'s `CLIError` carries `exit` alongside `code`, `suggestions` and `ref`, and
`toErrorJson` puts that same error into the machine envelope — one typed error per failure class,
its exit code a field on it, is the closest framework-level prior art to what the taxonomy asks
for. Where your framework has no such type, write it: one error class per entry in the taxonomy,
each carrying its code, and one top-level handler that maps a caught error to its own code and
anything else to `1`.

That default is what makes the rule hold, and it must be `1` rather than `2`. Forgetting to
classify a failure then produces `1`, the honest answer for an unclassified fault, instead of
blaming a caller who did nothing wrong. Which numbers are available to allocate is settled in
[exit codes stay below 125](../../decisions/exit-codes-below-125.md).

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

Inert (`L0`), and only half of this rule is reachable there: the usage errors are compared
against each other, the internal-fault contrast is not reached at all.

```
<cli> --acc-probe-xyzzy-flag      # usage error: unknown flag
<cli> acc-probe-xyzzy-verb           # usage error: unknown verb
<cli>                             # usage error: the bare invocation
<cli> --format=acc-probe-xyzzy       # usage error: a value outside an advertised set
```

At `L0` the checker verifies:

- every one exits non-zero (**core**)
- every one yields the **same** code, since all of them are the same error class (**core**)
- the code is `2` (**diagnostic** — reported, not failed, because an undeclared tool never
  agreed to the taxonomy)

A mismatch is the violation: those four are one error class, so a target that answers them with
different codes has given the caller nothing to route on.

**Four of this page's five usage-error shapes are compared.** The last of them only applies to a
target whose help advertises a closed value set — it is
[A7](../parsing/advertised-value-set-is-enforced.md)'s probe, read a second time here rather than
sent again ([probes are shared](../../concepts/probing.md#probes-are-shared-and-a-rule-may-declare-none)).
The fifth shape, an unexpected positional, stays out of reach for the reason
[A4](../parsing/unexpected-positionals-rejected.md) does — a positional is only _stray_ if there is
a verb for it to be stray to, and sending a verb is `L1`.

Distinguishability from an internal error is reported **unverified** at `L0`: nothing
[`L0` may send](../../concepts/probing.md#what-it-is) provokes an internal fault in an arbitrary
binary. It becomes a hard check at `L1`, where the tool has declared its error kinds and each one
can be provoked and confirmed against its declared code.

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

## Evidence

The surveyed tools disagree on the number, and two of them merge the classes entirely. On an
invalid flag: `git` exits `129`, `docker` `125`, and `kubectl`, `gh`, and `cargo` all exit `1` —
the same code they use for internal faults.

`sysexits.h` (BSD, 1987) defined `EX_USAGE=64` for precisely this purpose and none of the five
uses it. The absence of convergence is why this project fixes a house taxonomy and declares it
in the schema — see [exit codes stay below 125](../../decisions/exit-codes-below-125.md).
