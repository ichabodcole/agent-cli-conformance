---
type: rule
title: Never block on input without a terminal
description:
  With no TTY a prompt either hangs forever or is silently answered by EOF — and the silent
  answer is the more dangerous of the two.
tags: [interactivity, silent-failure, safety, core]
related: [concept/error-envelope, rule/bare-invocation-is-a-usage-error]
status: current
updated: 2026-08-14
rule_id: E1
tier: core
probe_level: L0
checker: src/acc/kit/checkers/interactivity/never-block.ts
checker_status: implemented
coverage: partial
coverage_gaps:
  - only inert paths are probed so a real confirmation path is never reached
  - the structured confirmation_required response and its exit 8 are not established
  - treating EOF or closed stdin as an answer is not detectable from termination alone
---

# Never block on input without a terminal

## The rule

When stdin is not a TTY, a CLI **MUST NOT** wait for input. No prompts, no confirmations, no
"press any key".

Where an operation genuinely requires a decision, it **MUST** fail fast with a structured
[`confirmation_required`](../../concepts/error-envelope.md#two-shapes-and-confirmation_required-is-one-of-the-errors)
error and exit `8`, naming the flag that would supply the answer.

It **MUST NOT** treat EOF, an empty line, or closed stdin as an answer — neither as consent nor
as refusal.

## Why

A prompt with nobody to answer it has two possible outcomes, and both are bad in ways that are
hard to see.

**It hangs.** The command never returns. In an agent harness this consumes the whole timeout
budget and produces no output to diagnose from.

**It is answered by EOF — and this is the worse case,** because it looks like it worked.
Reportedly, `docker container prune` treats empty input, EOF, and closed stdin alike as a
decline, and **exits `0`** with nothing on stderr. An agent invoking it non-interactively gets
a success code, no error, and no work done. Nothing anywhere records that the operation was
declined rather than performed.

That is a destructive-operation guard producing a false success — the
[silent-failure](../parsing/unknown-flag-exits-nonzero.md) shape applied to the safety
mechanism itself. The behaviour has also shifted across releases (earlier versions additionally
printed a reclaimed-space line, later ones do not), so even output-sniffing is not a stable
workaround.

Failing fast with `confirmation_required` fixes both: the caller learns immediately that a
decision is needed, learns exactly which flag supplies it, and never receives a success code
for work that did not happen. Exit `8` is an error rather than a success precisely because the
work was not done — see [what exit 8 means](../../concepts/exit-codes.md#the-taxonomy).

## The probe

Inert (`L0`) — help paths and invalid invocations only, never a command that would prompt for
something real.

```
<cli>                       < /dev/null   # bare invocation
<cli> --help                < /dev/null
<cli> --nonsense-flag-xyz   < /dev/null
<cli> nonsense-verb-xyz     < /dev/null
```

Passes when **all four** terminate within the probe deadline. Each is a distinct path into the
parser, and a CLI can block on one while returning cleanly from the others — the unknown-verb
path in particular, which is where a tool that offers to confirm a guessed correction blocks.

That third and fourth probe are what stop E1 being narrower than it looks. E1 is the
catalogue's backstop for hangs, and the backstop is needed because coverage elsewhere is
partial: three rules call a hang on their own probe a failure —
[A1](../parsing/unknown-flag-exits-nonzero.md) (unknown flag),
[C1](../exit-codes/help-exits-zero.md) (`--help`) and
[D2](../discoverability/bare-invocation-is-a-usage-error.md) (bare) — and every other rule
reports one as `unverified`, which is honest but is not a finding anyone can act on. Nothing
but E1 covers the unknown-VERB path at all, which is precisely where a tool that offers to
confirm a guessed correction blocks.

Passing means **these four inert paths** terminated, and nothing more.

Two implementation notes for the checker, both learned the hard way:

- **Do not shell out to `timeout`.** It is GNU coreutils and absent on stock macOS; invoking it
  yields `127` (command not found) and the probe silently measures nothing. Enforce the
  deadline in-process and kill the child directly.
- **A killed process must be reported as a timeout, not a failure.** `128+n` from the
  checker's own kill signal is not the CLI's exit code, and recording it as one would
  fabricate evidence.
- **Kill the process GROUP, not the process.** Signalling only the direct child leaves any
  descendant holding the stdout/stderr pipe it inherited, and the runtime's process-close event
  waits for the streams as well as the process. A target that backgrounded a `sleep 30` on
  stdout took 30 seconds against a 50 ms deadline — the deadline was a signal, not a bound. The
  checker launches targets in their own process group and kills the group, then resolves on a
  bounded finalisation timer regardless, so a descendant that escaped the group still cannot
  hold the probe open.

### Platform scope of the deadline

The tree bound is **POSIX only**. Windows has no process group of this kind: terminating a tree
there requires `taskkill /T` or a job object, and the checker does neither today. On Windows the
deadline still bounds the PROBE — the finalisation timer resolves it either way — but a
descendant the target spawned may outlive the run. That limit is stated rather than implied,
because a deadline that quietly does less than it claims on one platform is the same
silent-failure shape the rest of this catalogue exists to report.

The checker deliberately does **not** probe commands that legitimately prompt. Establishing
that a real confirmation path behaves correctly requires running it, which is `L2` work in a
contained environment.

## Current checker coverage

[`never-block.ts`](../../../../src/acc/kit/checkers/interactivity/never-block.ts) — `L0`,
`coverage: partial`. A pass means nothing under **Established** was violated; the **Gaps** are
the rest of this page, unexamined.

**Established**

- four inert invocations — bare, `--help`, an unknown flag, an unknown verb — all terminate with
  stdin closed.

**Gaps**

- only inert paths are probed so a real confirmation path is never reached
- the structured confirmation_required response and its exit 8 are not established
- treating EOF or closed stdin as an answer is not detectable from termination alone

## How to comply

Guard every prompt with an `isatty(stdin)` check, and make the non-TTY branch a structured
refusal rather than a default answer.

The tempting shortcut — "no TTY, so assume no" — is precisely the Docker failure. Declining is
a decision, and a decision the caller did not make must not be reported as success. If you
default at all, the exit code must still say that nothing happened.

Provide the bypass flag (`--yes`, `--confirm`) and name it in the error, so the remediation is
mechanical rather than a search through help.

## Evidence

The Docker prune behaviour is drawn from the case-study research, where it was tested directly.
**It was not re-verified here**: confirming a destructive-path claim by executing it risks
deleting the operator's containers if the claim is wrong in the other direction — exactly the
trade this catalogue tells implementers not to make. It is reported as sourced rather than
measured.

Contrast [`hf`](../../concepts/machine-mode.md), which fails destructive commands fast with
remediation (_"Use `--yes` to skip confirmation"_) and runs no interactive prompts in agent
mode.

Full survey: [`research/01-case-studies.md`](../../../../research/01-case-studies.md).
