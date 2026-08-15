---
type: rule
title: Inert invocations must not crash the tool
description:
  Dying on a signal is not an answer — the caller gets no exit code to read, and every other
  rule reports a gap in the evidence rather than the defect.
tags: [lifecycle, crash, signals, silent-failure, core]
related: [rule/help-exits-zero, rule/never-block-without-a-tty, concept/exit-codes]
status: current
updated: 2026-08-15
rule_id: G1
tier: core
probe_level: L0
checker: src/acc/kit/checkers/lifecycle/does-not-crash.ts
checker_status: implemented
coverage: partial
coverage_gaps:
  - only the inert invocations other checkers already request are observed so an unprobed path such as nested help is never judged
  - no invocation that does real work is sent at L0 so a crash on the paths a caller actually uses is out of reach
  - a crash provoked by the probe's own sentinel token is not distinguished from one the target would suffer on any input
---

# Inert invocations must not crash the tool

## The rule

A CLI **MUST NOT** die of a **fault signal** on an inert invocation. Asked for help, asked for
its version, handed a deliberately-invalid flag or verb, or run with no arguments at all, it
**MUST** reach an exit of its own choosing — a status the caller can read — rather than faulting.

A fault signal is one the process raises on itself as a direct consequence of what it just
executed:

**Fault-like — G1 reports `fail`**

`SIGSEGV`, `SIGBUS`, `SIGILL`, `SIGFPE`, `SIGABRT`, `SIGSYS`, `SIGTRAP`

Nothing outside the process sends these in normal operation, so a tool that segfaults while
answering `--help` did that to itself and the attribution is not in doubt.

The scope is exactly the invocations the kit classifies as inert, and no more. This rule says
**nothing** about how a target behaves under real work: at `L0` the kit only ever sends help
paths, sentinel-bearing arguments, and the bare invocation, so a crash in the code that does the
job is a crash this rule never looks at.

It is also silent about signals arriving from **outside** the process — an operator's Ctrl-C, an
outer deadline's `SIGTERM`, an OOM kill:

**Externally ambiguous — G1 reports `unverified`**

`SIGINT`, `SIGTERM`, `SIGHUP`, `SIGQUIT`, `SIGKILL`, `SIGPIPE`, and any signal not named in the
fault list above

The kit records that the signal was not one it sent; it cannot record who did. Handling these
well is a lifecycle obligation too, and it belongs to rules that do not exist yet (see
[below](#the-first-of-a-family)) — `SIGPIPE` most explicitly of all, since a closed stdout is the
normal end of a pipeline rather than a fault.

**These two lists are quoted from the checker, not maintained beside it.** They are exported as
`FAULT_SIGNALS` and `AMBIGUOUS_SIGNALS` from
[`does-not-crash.ts`](../../../../src/acc/kit/checkers/lifecycle/does-not-crash.ts), and
[`docs/wiki/lint.ts`](../../lint.ts) fails the gate when this page and that file name different
signals — the same bidirectional discipline already applied to `tier`, `probe_level`, `coverage`
and `coverage_gaps`. A normative scope that quietly differs from its executable is the defect that
produced this split: the checker used to fail on **any** signal the kit did not send, while this
page already excluded the external ones, and the mismatch was filed as a coverage gap.
`coverage: partial` weakens a _pass_; it cannot soften a _fail_, so G1 could set
`conformant: false` and select exit `9` for an event its own rule text put out of scope.

## Why

**A signal death is not a low exit code. It is no exit code.**

When a process dies of a signal the operating system reports the signal; there is no status,
because the target never chose one. The kit records that as `exitCode: null` — and `null` is
precisely the value the kit's own deadline and output ceiling produce, because in those cases we
killed it and it never chose one either. That collision is what made a crash invisible:
`null !== 0` satisfies every "it exited non-zero" clause in the catalogue, and a process that
dies before writing satisfies every "stdout was empty" clause. A fixture whose entire body is
`kill -SEGV $$` once collected **nine passing rules** it had done nothing to earn.

Recording the signal fixed the evidence. Every checker now reports `unverified` on a crashed
probe — honest, and not enough:

```
CONFORMANT (L0) — 0 core violated, 11 core unverified, 4 core partially covered
```

That is a real report, from a real target: a script that answers `--help`, `-h` and `--version`
correctly and segfaults on every other path. `acc check` exited `0`. Nothing was violated,
because `conformant` counts violations and no rule owned this one.

**`unverified` cannot say which kind of gap it is, and there are two.** `git` advertises no
machine-mode flag, so [B3](../streams/machine-output-is-parseable.md) has nothing to parse —
that is a gap in the evidence and names nothing git did wrong. A target that falls over on
eleven of fifteen core rules is not incomplete; it is broken. Reporting both in the same word,
under a green headline, is the silent-failure shape this catalogue exists to report — appearing
in the report itself.

For the caller the consequence is immediate. A crashed tool returns nothing to branch on: no
code, no envelope, no output. An agent sees only that something is wrong, cannot tell a bad flag
from a fault, and has no remediation to attempt — the exact loss
[exit codes](../../concepts/exit-codes.md#why-it-matters-for-agents) exist to prevent.

### The first of a family

`G` is the **lifecycle** family, and G1 is its first member. Families A–F are taken (parsing,
streams, exit codes, discoverability, interactivity, safety) and a crash is none of those: it is
process lifecycle, which is its own subject.

That family is the one [`docs/roadmap.md` step 7](../../../roadmap.md#7-r4-5--the-lifecycle-rule-family)
describes — cancellation, bounded shutdown with descendant cleanup, `SIGPIPE` without stack
traces, resumability. G1 is a **down-payment on it, not a new axis**: later members take G2, G3
and so on as their checker designs arrive, and the discipline that gates them is the one that
gated this id. Rule ids are append-only and outlive any release, so one is minted when there is
a checker design to give it — G1 has one, which is the whole reason it exists now rather than
with the rest of the family.

## The probe

Inert (`L0`) — and G1 **declares no probes of its own**.

```
(none — G1 reads the invocations every other checker already recorded)
```

Every invocation the kit sends is already recorded, and every recording already carries whether
the process was ended by a signal the kit did not send. A probe of G1's own would spawn the
target again to learn a fact fourteen recordings already carry, and duplicate recordings are
not additional evidence. [A4](../parsing/unexpected-positionals-rejected.md) is the standing
precedent for a checker with an empty probe list; the two rules reach it from opposite
directions, since A4 has no probe it can safely send and G1 has none it needs to.

Fails when **any** observation was ended by one of the **fault signals** above, naming the signal
and the invocations that died. Reports `unverified` when there are no observations to read at all.

**A signal the kit cannot attribute is not a pass either.** An observation ended by an externally
ambiguous signal reports `unverified` and names it. The kit knows the signal was not its own; it
does not know whether an operator, an outer deadline, an OOM killer or the target itself sent it,
and a conformance gate that reports a violation it cannot substantiate is a gate someone
eventually switches off. An honest gap costs a reader one line.

**A probe the kit killed is not a crash, and is not a pass either.** A hang and an
output-ceiling kill both end in the runner's own `SIGKILL`, so "a signal arrived" is true of all
three cases and means three different things — the distinction `Observation.crashed` exists to
carry. Those targets did not fail to exit under their own control; they were never allowed to,
so G1 reports `unverified` for them and leaves the hang to
[E1](../interactivity/never-block-without-a-tty.md), which owns it.

The order matters and it is deliberate: a fault is decided **first**. A completed observation of
a violation stays a violation when a different probe hits the deadline — the process is gone and
the streams are closed. This is the same asymmetry that lets a truncated capture still prove a
violation the prefix contains.

**Every other rule still reports `unverified` for both classes**, and that asymmetry is the point.
G1 asks _whose fault the death was_, and the answer depends on the signal. Every other rule asks
_what the probe established_, and the answer is "nothing" whoever sent it — a target killed
halfway through writing help did not produce help. The evidence is void either way; only the blame
differs, and blame is G1's job alone. See `crashedUnverified` in
[`finding.ts`](../../../../src/acc/kit/finding.ts).

## Current checker coverage

[`does-not-crash.ts`](../../../../src/acc/kit/checkers/lifecycle/does-not-crash.ts) — `L0`,
`coverage: partial`. A pass means nothing under **Established** was violated; the **Gaps** are
the rest of this page, unexamined.

**Established**

- every inert invocation the run recorded — the union of every other checker's probes — reached
  an exit of the target's own choosing rather than being ended by a fault signal, an
  unattributable one, or the kit's own kill.

**Gaps**

- only the inert invocations other checkers already request are observed so an unprobed path such
  as nested help is never judged
- no invocation that does real work is sent at L0 so a crash on the paths a caller actually uses
  is out of reach
- a crash provoked by the probe's own sentinel token is not distinguished from one the target
  would suffer on any input

## How to comply

Mostly this rule is satisfied by not having the bug. The recurring ways to acquire one:

- **A null dereference or an out-of-bounds index in argument handling.** The parser is the code
  every invocation reaches, including the ones nobody tested, and an unknown flag or an empty
  argv is exactly the input a hand-rolled parser handles least.
- **Re-raising a signal to report it.** The idiom "restore the default handler and re-raise, so
  my exit status looks right to the shell" is correct for `SIGINT`; done on the inert paths it
  turns a clean answer into a signal death. G1 only fails the fault-signal spelling of that
  mistake — a re-raised `SIGABRT` is a violation, a re-raised `SIGINT` is `unverified` here
  because the kit cannot tell it from an operator's — but the caller loses its exit code either
  way, so both are worth not doing.
- **A native extension loaded at startup.** A crash in a linked library takes the process with
  it before `--version` gets a chance to answer, so the cheapest possible probe of "is this tool
  installed and working" is the one that falls over.
- **Aborting on an assertion instead of exiting.** `abort()` raises `SIGABRT`; a failed assertion
  is an internal fault and belongs at [exit `1`](../../concepts/exit-codes.md#the-taxonomy) with
  a message, which is a thing the caller can read.

If the tool genuinely cannot continue, exit — with a code and a diagnostic. An internal fault
reported as exit `1` is a bad day; the same fault delivered as `SIGSEGV` is a bad day the caller
cannot even classify.

## Evidence

Measured here, on this kit, three times.

The total case: a POSIX shell fixture whose entire body is `kill -SEGV $$`
(`src/acc/kit/fixtures/sh/dies-by-signal.sh`) scored nine passing rules before the runner
recorded the terminating signal, and zero afterwards.

The partial case, which is the one this rule exists for:
`src/acc/kit/fixtures/sh/crashes-except-help.sh` answers `--help`, `-h` and `--version`
correctly and crashes on everything else. Before G1 it reported `conformant: true` at exit `0`
with eleven core rules unverified; it is now a permanent negative control, asserted to report
`conformant: false` at exit `9`.

The scope case, added when the checker was narrowed to match this page:
`src/acc/kit/fixtures/sh/dies-by-sigterm.sh` is the same one-line fixture with `TERM` in place of
`SEGV` — byte-for-byte the recording an outer deadline or a passing operator would produce.
Measured through the full registry at `L0`:

```
G1 unverified  16 of 16 probe(s) ended on a signal the kit did not send and cannot attribute
C1 fail        --help died on SIGTERM instead of exiting; -h died on SIGTERM instead of exiting
```

`corePassed: 0`, `coreUnverified: 15`, and **no rule reports `pass`** — because the probes
established nothing, whoever sent the signal. The one violation is
[C1](../exit-codes/help-exits-zero.md)'s, and it is not an attribution claim: C1 asserts that a
help request _succeeds_, and help that ended on a signal did not, whichever process sent it. G1
says only what it can: something outside this kit ended these runs and it cannot say what.

The fixture is a control in both directions. Widen G1 back to every non-kit signal and its line
above turns into a violation nobody can substantiate; narrow `crashedUnverified` to the fault
signals — "G1 doesn't fail `SIGTERM`, so why should anyone else care" — and those fifteen
`unverified` lines start coming back as passes.

Both fixtures are POSIX shell rather than TypeScript on purpose: Bun installs its own `SIGSEGV`
handler and converts the signal into an ordinary exit with a crash report on stderr, which is a
chosen status and a non-empty stream — a different observation entirely, and one that would not
exercise this rule at all.

No third-party survey finding backs this page. Unlike most of the catalogue it is not a report
of what shipped tools do wrong; it is the rule that closes a hole in what the kit could
**report**, and the evidence is the kit's own behaviour against its own controls.
