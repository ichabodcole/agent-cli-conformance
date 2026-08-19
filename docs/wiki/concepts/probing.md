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
collected, which is why a new rule is a new reading of evidence already on disk rather than a new
thing done to the target.

**`probe_level` bounds what may be sent**, and it is the field that decides whether a rule is
applicable to a run at all:

| Level | What it permits                                                               |
| ----- | ----------------------------------------------------------------------------- |
| `L0`  | Risk-reduced: help paths, sentinel-bearing arguments, and the bare invocation |
| `L1`  | Invocations the target has **declared** read-only                             |
| `L2`  | Mutating invocations, inside a contained environment                          |

`L1` and `L2` are named in every rule page that needs them and neither exists yet — both wait on
a portable declaration format and a real sandbox
([roadmap](../../roadmap.md#6-the-portable-declaration-ir)). Everything the kit does today is
`L0`.

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

Every probe declares an **inertness class**, and the runner refuses to send one that does not
match its claim:

| Class       | What it is                                                  |
| ----------- | ----------------------------------------------------------- |
| `help-path` | every token is a help, version or format selector           |
| `sentinel`  | every non-flag token carries the sentinel `acc-probe-xyzzy` |
| `no-verb`   | every token looks like a flag, and there is at least one    |
| `bare`      | no arguments at all                                         |

The sentinel is guaranteed **invalid** — no real CLI declares a flag or verb by that name — which
is not the same as guaranteed **harmless**. A CLI whose root positional is free-form text reads
it as input rather than rejecting it, which is exactly the shape of `claude`, `llm` or `aider`.

This is also why a probe omits a verb wherever it can. Prefixing one — `<verb> -- <sentinel>` —
puts the same question in front of the probe that closed off A2's nested case and dropped A4 to
`L1`: discovery has no way to know a verb is side-effect-free, and a target that mishandles the
rest of the argv would run that verb for real. Leaving the verb out is what makes a probe inert
without needing to know anything about the target's command surface.

So the classes bound one invocation each; they do not bound the run. `acc check` **executes the
target**, and at `L0` the fresh temporary working directory redirects relative paths only —
nothing stops a write through `HOME`, an XDG path, an absolute path or a subprocess, the child
inherits the caller's environment including credentials, and nothing denies the network. The
accurate word for the run is **risk-reduced**, and no page in this wiki should call it safe
against an arbitrary binary.

### Probes are shared, and a rule may declare none

Checkers declare the invocations they need; the runner deduplicates them and sends each once. A
rule reading an invocation another rule requested is the normal case, not a shortcut.

A rule that needs the _same_ invocation twice — [D4](../rules/discoverability/help-output-is-deterministic.md)
comparing two help captures, [C3](../rules/exit-codes/exit-codes-are-deterministic.md) comparing
exit codes — meets that deduplication head-on. The repetitions are told apart by
`Invocation.repeat`, a **recorder-side index the target never sees**.

Deliberately not an environment variable. A marker like `ACC_PROBE_NONCE` would get the second
run past the dedup, and would also make the two invocations differ while the checker claimed to
measure determinism: a variable the target can read is part of the input to the measurement, so a
CLI that echoed its environment into help would fail D4 for a legitimate reason, indistinguishable
from a timestamp.

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
  know whether an operator, an outer deadline or an OOM killer did. Reported `unverified` and
  named.
- **The kit's own kill** — a hang past the deadline, or an output ceiling. The target was never
  allowed to choose a status, so nothing about it was established.

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
