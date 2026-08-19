---
type: rule
title: Never block on input without a terminal
description:
  With no TTY a prompt either hangs forever or is silently answered by EOF — and the silent
  answer is the more dangerous of the two.
tags: [interactivity, silent-failure, safety, core]
related: [concept/error-envelope, rule/bare-invocation-is-a-usage-error]
status: stable
generated: { by: claude-opus-5, at: 2026-08-14 }
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
  - blocking is only detected when it outlasts the kit's deadline so a prompt that gives up sooner reads as terminating
coverage_established:
  - four inert invocations — bare and --help and an unknown flag and an unknown verb — all terminate inside the kit's deadline with stdin closed
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

## How to comply

Guard every prompt with an `isatty(stdin)` check, and make the non-TTY branch a structured
refusal rather than a default answer.

The tempting shortcut — "no TTY, so assume no" — is precisely the Docker failure. Declining is
a decision, and a decision the caller did not make must not be reported as success. If you
default at all, the exit code must still say that nothing happened.

Provide the bypass flag (`--yes`, `--confirm`) and name it in the error, so the remediation is
mechanical rather than a search through help.

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
<cli> --acc-probe-xyzzy-flag   < /dev/null
<cli> acc-probe-xyzzy-verb     < /dev/null
```

Every probe is sent with stdin closed, which is the condition the rule is about.

**Passes** when **all four** terminate within the probe deadline. Each is a distinct path into
the parser, and a CLI can block on one while returning cleanly from the others — the
unknown-verb path in particular, which is where a tool that offers to confirm a guessed
correction blocks.

**Fails** when any of the four was still running when the deadline expired, naming it.

E1 is the catalogue's backstop for hangs, and the third and fourth probes are what stop it being
narrower than it looks: nothing else in the catalogue reaches the unknown-verb path, and every
rule that does not own a hang on its own probe reports one as `unverified` — see
[which rules own a hang](../../concepts/probing.md#hangs-are-owned-by-four-rules-and-deferred-by-the-rest).

Passing means **these four inert paths** terminated, and nothing more. The checker deliberately
does **not** probe commands that legitimately prompt. Establishing that a real confirmation path
behaves correctly requires running it, which is `L2` work in a contained environment.

Enforcing the deadline has traps of its own, and they are the checker author's:
[write the check](../../guides/how-to-add-a-checker.md#3-write-the-check-as-a-pure-function).

## Current checker coverage

[`never-block.ts`](../../../../src/acc/kit/checkers/interactivity/never-block.ts) — `L0`,
`coverage: partial`. A pass means nothing under **Established** was violated; the **Gaps** are
the rest of this page, unexamined.

**Established**

- four inert invocations — bare and --help and an unknown flag and an unknown verb — all terminate
  inside the kit's deadline with stdin closed

**Gaps**

- only inert paths are probed so a real confirmation path is never reached
- the structured confirmation_required response and its exit 8 are not established
- treating EOF or closed stdin as an answer is not detectable from termination alone
- blocking is only detected when it outlasts the kit's deadline so a prompt that gives up sooner
  reads as terminating

## Evidence

The Docker prune behaviour is drawn from the case-study research, where it was tested directly.
**It was not re-verified here**: confirming a destructive-path claim by executing it risks
deleting the operator's containers if the claim is wrong in the other direction — exactly the
trade this catalogue tells implementers not to make. It is reported as sourced rather than
measured.

Contrast [`hf`](../../concepts/machine-mode.md), which fails destructive commands fast with
remediation (_"Use `--yes` to skip confirmation"_) and runs no interactive prompts in agent
mode.

Full survey: [`research/2026-08-13-case-studies.md`](../../../research/2026-08-13-case-studies.md).
