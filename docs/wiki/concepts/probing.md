---
type: concept
title: Probing
generated: { by: claude-opus-5, at: 2026-08-19 }
status: stable
description:
  How the kit obtains the observations a verdict rests on — what it is allowed to send at each
  level, and why a probe that ran is not the same as a probe that established something.
tags: [conformance, probe-level, evidence, agent-facing]
related: [concept/conformance, rule/inert-invocations-do-not-crash, rule/never-block-without-a-tty]
---

# Probing

## What it is

The kit knows nothing about a target except what it learns by running it. A **probe** is one
invocation it sends — argv, environment, stdin — and an **observation** is what came back: both
streams, the exit code, the terminating signal if there was one, and the timing.

Checkers never spawn anything. They are pure functions over observations the runner already
collected, which is why a new rule is a new reading of evidence this run already gathered rather
than a new thing done to the target. _Already gathered, not already stored_ — the history lives in
memory and dies with the process, so re-checking an old run against a rule written later is a
property of the architecture and not yet a thing you can do
([roadmap](../../roadmap.md#4-durable-observation-and-replay)).

**`probe_level` bounds what may be sent**, and it is the field that decides whether a rule is
applicable to a run at all:

| Level | What it permits                                                               |
| ----- | ----------------------------------------------------------------------------- |
| `L0`  | Risk-reduced: help paths, sentinel-bearing arguments, and the bare invocation |
| `L1`  | Invocations the target has **declared** read-only                             |
| `L2`  | Mutating invocations, inside a contained environment                          |

Four rules stop at the same `L1` boundary, for the same reason — nothing at `L0` says what a
payload was supposed to contain, so each can check that an answer parses and not that it is the
right shape: [A3](../rules/parsing/errors-name-the-offending-token.md) (which envelope field must
name the token), [B3](../rules/streams/machine-output-is-parseable.md) (which output kind to
expect), [B5](../rules/streams/machine-mode-holds-on-parser-errors.md) (the envelope shape an
error must take) and [D1](../rules/discoverability/version-flag-exists.md) (which field carries
the version). Their `coverage_gaps` all say some version of "no declaration exists at `L0`".

`L1` and `L2` are named in every rule page that needs them and neither exists yet — both wait on
a portable declaration format and a real sandbox
([roadmap](../../roadmap.md#6-the-portable-declaration-ir)). Almost everything the kit does today
is `L0`.

### What `L0` may assume — the admission test

`probe_level` bounds what may be **sent**. This bounds what may be **concluded**, and it is the
harder of the two.

> **`L0` performs mechanical checks that require no inference about the target's domain language.
> If a rule has to work out what one of the target's own words MEANS, it is not an `L0` rule.**

That is the test for admitting a rule to `L0`, and it is written down because the boundary was
found the expensive way. `--json`, `--format` and `--output` were read out of `--help` and treated
as switches into a machine mode. Seven successive attempts to make that inference safe each failed
on a population nobody had enumerated, and the enumeration never closed, because the question —
what does this flag MEAN — has no answer from outside the program. Two CLIs, one whose `--json`
names an input file and one whose `--json` is meant to select JSON output and works nowhere, are
the same program from the outside.

What survives the test, and what does not:

| `L0` may                                                                                    | `L0` may not                                                 |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Check mechanics: exit codes, stream discipline, hangs, crashes, determinism, ANSI in a pipe | Decide what a flag named for a data format governs           |
| Treat `--help` and `--version` as requests for information about the tool                   | Read a value set out of help prose and hold the target to it |
| Use a spelling to choose which probe to SEND                                                | Use that spelling to reach a verdict                         |
| Falsify something the target **declared**                                                   | Falsify something the kit inferred on the target's behalf    |

The middle two rows carry the whole distinction. **Inference may select what to look at; only
observation may condemn** — being wrong about which probe to send costs a spawn, and being wrong
about what a word meant costs someone their build. And falsification needs an assertion: with none,
a kit supplies its own, tests its own supposition, and reports the result as though the target had
promised something.

`--help` and `--version` survive where `--json` does not, and the reason is structural rather than
a matter of how common they are. They name a **request for information about the tool**, which has
one meaning. A flag named for a **data format** does not say which side of the pipe it applies to —
input, output, or the subject matter — so `--json`, `--format`, `--output`, `--csv` and `--yaml`
are all ambiguous in the same way. That is also advice for CLI authors: a format-named flag has to
carry its direction in the help entry, because nothing else can.

**So the machine-mode rules wait for a declaration.** `machineMode` in
[`acc.config.json`](./conformance.md) is an assertion, and falsifying an assertion is sound at any
level; without it those rules report `unverified` and name the one line that turns them on. This is
what `L1` buys in general — you say what your interface does, and the kit tells you whether that is
true — and why a declaration is worth writing even before a test reads it: a CLI that states how its
own interface behaves is self-describing to a caller, to an agent, and to its next maintainer.

## Why it matters for agents

A verdict is only as strong as the invocations behind it, and the difference is not visible in
the word `pass`.

A rule reports [`unverified`](./conformance.md) when its probe ran and established neither
answer — most often because the target advertised nothing the probe could select, so there was
nothing to send. That is a statement about the evidence, not about the target, and it is the
reason `conformant` and `fullyVerified` are separate claims. An agent or a reader deciding what
to do about a report needs to know which of the two it is reading.

The level bounds the claim in the same way. "Fully verified at `L0`" means the rules `L0` can
reach were established — not that the catalogue was. That is why the level is printed beside the
verdict rather than left implicit.

## The details

### Inertness classifies an invocation; it does not make the run safe

Help is the path most probes reach for, because it is the one invocation guaranteed to produce
presentational output without performing work.

Every probe is sent with **stdin closed**, under a **deadline**, and in a fresh temporary
working directory. Each declares an **inertness class**, and the runner refuses to send one that
does not match its claim:

| Class       | What it is                                                  |
| ----------- | ----------------------------------------------------------- |
| `help-path` | every token is a help, version or format selector           |
| `sentinel`  | every non-flag token carries the sentinel `acc-probe-xyzzy` |
| `no-verb`   | every token looks like a flag, and there is at least one    |
| `bare`      | no arguments at all                                         |

The sentinel is guaranteed **invalid** — no real CLI declares a flag or verb by that name — and
distinctive enough that finding it in a target's output is evidence the target echoed it rather
than coincidence, which is what every checker matching on it rests on. Invalid is not the same as
guaranteed **harmless**, though. A CLI whose root positional is free-form text reads
it as input rather than rejecting it, which is exactly the shape of `claude`, `llm` or `aider`.

The same limit applies to a flag that takes a value: without knowing that flag's arity, the
runner cannot tell its value from a verb, so it cannot send one inertly. That is why a machine
mode advertised only as `--format json` goes unprobed where `--json` does not — which now bears
on probe SELECTION only, since no rule reaches a verdict from a spelling. It is also why a
probe whose meaning depends on which sense the target implements is not a probe.

This is also why a probe omits a verb wherever it can. Prefixing one — `<verb> -- <sentinel>` —
puts the same question in front of the probe that closed off A2's nested case and dropped A4 to
`L1`: discovery has no way to know a verb is side-effect-free, and a target that mishandles the
rest of the argv would run that verb for real. Leaving the verb out is what makes a probe inert
without needing to know anything about the target's command surface.

Even against an ordinary verb-dispatching CLI the guarantee is narrower than it looks: a
sentinel establishes that no _declared_ verb was named, not that nothing ran. A target that
ignores an unrecognised token and falls through to a default root action still does that action,
and anything the tool does during initialisation happens before dispatch is ever reached.

So the classes bound one invocation each; they do not bound the run. `acc check` **executes the
target**, and at `L0` the fresh temporary working directory redirects relative paths only —
nothing stops a write through `HOME`, an XDG path, an absolute path or a subprocess, the child
inherits the caller's environment including credentials, and nothing denies the network. The
accurate word for the run is **risk-reduced**, and no page in this wiki should call it safe
against an arbitrary binary.

### Probes are shared, and a rule may declare none

Checkers declare the invocations they need; the runner deduplicates them and sends each once. A
rule reading an invocation another rule requested is the normal case, not a shortcut.

A rule that CONTRASTS invocations depends on this in the other direction:
[C2](../rules/exit-codes/usage-errors-are-distinguishable.md) compares the codes of four
usage-error shapes it mostly did not send — the bare invocation comes from D2 and E1, the
malformed value from A7, whose probe it is byte-identical to. Two runs of the same argv would be
comparing codes the target chose on two separate occasions.

A rule that needs the _same_ invocation twice — [D4](../rules/discoverability/help-output-is-deterministic.md)
comparing two help captures, [C3](../rules/exit-codes/exit-codes-are-deterministic.md) comparing
exit codes — meets that deduplication head-on. The repetitions are told apart by
`Invocation.repeat`, a **recorder-side index the target never sees**.

Deliberately not distinct argv either. Sending three textually different flags
(`--<sentinel>-repeat-1`, `-2`, `-3`) also clears the dedup, and measures the wrong thing: agreement
across three _equivalent usage errors_ rather than repetition of one invocation. A parser that
hashed the offending token into its exit code would fail that deterministically, and a parser
genuinely nondeterministic on identical input would pass it.

Deliberately not an environment variable. A marker like `ACC_PROBE_NONCE` would get the second
run past the dedup, and would also make the two invocations differ while the checker claimed to
measure determinism: a variable the target can read is part of the input to the measurement, so a
CLI that echoed its environment into help would fail D4 for a legitimate reason, indistinguishable
from a timestamp. [F2](../rules/safety/first-byte-is-prompt.md) disqualifies it for a second
reason: it does not compare its runs, it times them, and a target that re-reads configuration on
meeting an unfamiliar variable would be made faster or slower by the recorder's own bookkeeping.
An earlier checker did exactly that, with an `ACC_PROBE_TIMING` variable per run.

Two rules declare an empty probe list, from opposite directions.
[A4](../rules/parsing/unexpected-positionals-rejected.md) has no probe it can safely send at
`L0`. [G1](../rules/lifecycle/inert-invocations-do-not-crash.md) has none it needs to send,
because every recording already carries whether the process died by a signal — spawning the
target again to learn a fact fourteen recordings already hold would be duplicate evidence, not
additional evidence.

### A probe the kit killed is not a probe the target failed

Three different endings all look like "a signal arrived", and they mean three different things:

- **A fault signal** — `SIGSEGV`, `SIGBUS`, `SIGILL`, `SIGFPE`, `SIGABRT`, `SIGSYS`, `SIGTRAP`.
  Nothing outside the process sends these in normal operation, so the attribution is not in
  doubt. [G1](../rules/lifecycle/inert-invocations-do-not-crash.md) owns them.
- **An externally ambiguous signal** — `SIGINT`, `SIGTERM`, `SIGHUP`, `SIGQUIT`, `SIGKILL`,
  `SIGPIPE`, and anything not in the fault list. The kit knows it did not send it; it cannot
  know whether an operator, an outer deadline or an OOM killer did — the recording an outer CI
  timeout produces is byte-for-byte the recording a perfectly conforming tool produces under that
  timeout. Reported `unverified` and named.
- **The kit's own kill** — a hang past the deadline, or an output ceiling. The target was never
  allowed to choose a status, so nothing about it was established.

Both lists live as `FAULT_SIGNALS` and `AMBIGUOUS_SIGNALS` in
[`signals.ts`](../../../src/acc/kit/signals.ts), which [`lint.ts`](../lint.ts) binds to G1's page
in both directions — so a rule cannot fail on a signal G1 has just declined to attribute, which
would put two contradictory lines in one report.

**A fault is decided first**, deliberately. A completed observation of a violation stays a
violation when some _other_ probe later hits the deadline — that process is gone and its streams
are closed. It is the same asymmetry that lets a truncated capture still prove a violation its
prefix contains.

**The tree bound is POSIX only.** Windows has no process group of this kind — terminating a tree
there needs `taskkill /T` or a job object, and the runner does neither today. The deadline still
bounds the probe, because the finalisation timer resolves it either way, but a descendant the
target spawned may outlive the run. Stated rather than implied: a deadline that quietly does less
than it claims on one platform is the same silent-failure shape this catalogue exists to report.

The distinction matters because a signal death is **not a low exit code — it is no exit code**.
The observation records `exitCode: null`, which satisfies every "it exited non-zero" clause in
the catalogue by accident. A fixture whose entire body was `kill -SEGV $$` once collected nine
passing rules it had done nothing to earn.

**Every rule but G1 reports `unverified` for all three classes**, and that asymmetry is
deliberate: G1 asks _whose fault the death was_, and every other rule asks _what the probe
established_ — for which the answer is "nothing", whoever sent the signal.

### Hangs are owned by four rules and deferred by the rest

Blocking forever is not the same as failing, so most rules report a hung probe as `unverified`.
Four own it instead, because on their probe a hang **is** the violation:
[A1](../rules/parsing/unknown-flag-exits-nonzero.md),
[C1](../rules/exit-codes/help-exits-zero.md),
[D2](../rules/discoverability/bare-invocation-is-a-usage-error.md) and
[E1](../rules/interactivity/never-block-without-a-tty.md), which is the catalogue's backstop for
the paths the other three do not reach.

## Related rules

- [G1 — Inert invocations must not crash the tool](../rules/lifecycle/inert-invocations-do-not-crash.md)
  — owns signal attribution, and is the rule this page's signal taxonomy belongs to.
- [E1 — Never block on input without a terminal](../rules/interactivity/never-block-without-a-tty.md)
  — owns hangs the other rules defer.
- [A4 — Unexpected positionals are rejected](../rules/parsing/unexpected-positionals-rejected.md)
  — the rule that cannot be probed at `L0` at all, and says so.
