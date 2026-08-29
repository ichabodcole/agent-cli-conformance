---
type: rule
title: Honour the `--` end-of-options terminator
description:
  Without it, any value that begins with a hyphen is unpassable — including negative numbers
  and hyphen-leading filenames.
tags: [parsing, posix, diagnostic]
related: [rule/unexpected-positionals-rejected, archetype/delegator]
status: stable
generated: { by: claude-opus-5, at: 2026-08-14 }
rule_id: A6
tier: diagnostic
deviation: design-choice
probe_level: L0
checker: src/acc/kit/checkers/parsing/double-dash-terminator.ts
checker_status: implemented
coverage: partial
coverage_gaps:
  - the value after the terminator is only shown not to be rejected as a flag and never shown to arrive as a positional
  - the delegator passthrough requirement is not exercised
  - a rejection is recognised only from an English unknown-option or unknown-flag phrase so a differently worded rejection reads as a pass
  - only a bare terminator at the root followed by a single value is probed
  - a bun layer hidden inside a wrapper script is invisible here so its terminator is still eaten and the probe measures an argv the target never received
coverage_established:
  - a hyphen-leading value after a bare terminator at the root draws no English unknown-option rejection naming it on stderr
---

# Honour the `--` end-of-options terminator

## The rule

A CLI **SHOULD** treat a bare `--` as end-of-options: every argument after it is a positional
value, even if it begins with `-`.

A CLI that [delegates to a child process](../../archetypes/delegator.md) **MUST** honour it,
and **MUST** pass everything after `--` to the child unmodified.

> **A different design can be right here** (`deviation: design-choice`). A CLI may deliberately
> adopt a position-independent grammar — every `-`-leading token is an option wherever it appears,
> and values arrive only as `--key=value`. Such a tool has no positionals for `--` to introduce, so
> it rejects a post-terminator value as an unknown option and fails this rule. That is a coherent
> choice about the shape of an interface, not a parser bug, and the waiver is how it gets recorded.
>
> Note which clause you are being judged on. The checkable half of this rule is the **SHOULD**; the
> **MUST** — a delegator passing everything after `--` to its child unmodified — is not exercised
> at `L0` and is named in this rule's own coverage gaps. If your CLI wraps another program, the
> clause that admits no alternative is the one nothing here has tested.

> **If you checked this rule through a wrapper, distrust the verdict.** Bun strips a bare `--`
> immediately after the script path, one per bun layer between the launcher and the script
> (measured on bun 1.4.0), so the terminator never reaches the target unless the kit compensates.
> The kit does that when it can see the launcher — but a wrapper script hides a bun layer
> inside it, the compensation misses, and this rule reports a verdict against an argv your tool
> never received. See
> [what an interposed layer can distort](../../concepts/probing.md#what-an-interposed-layer-can-distort).

## How to comply

Free in most parsers — POSIX-conformant option parsing includes it, and `clap`, `commander`,
`click`, and `node:util parseArgs` all handle it by default.

Hand-rolled `argv` loops are where it goes missing. If you iterate arguments yourself, stop
flag interpretation at the first bare `--` and treat the remainder as values.

## Why

Some values legitimately start with a hyphen — a negative number, a filename like `-report.md`,
a search pattern such as `--verbose` being grepped for. Without a terminator these are
unpassable: the parser claims them as flags, and the caller has no way to say "this is data."

For agents the delegator case is the pressing one. A wrapper that does not honour `--` cannot
reliably forward arbitrary arguments, so the agent must know both the wrapper's flags and the
child's, and must avoid any collision between them. With `--`, the boundary is explicit and
the agent needs to know only where it falls.

This is `diagnostic` rather than `core` because a CLI whose values never begin with `-` is not
harmed by omitting it — the rule is conditionally rather than universally applicable, and Core
is reserved for what binds everywhere.

## The probe

Inert (`L0`). No verb precedes the terminator, and the value after it is built from the sentinel,
so nothing in the invocation names a command the target could run.

```
<cli> -- --<sentinel>-value
```

**Passes** when the invocation does **not** fail with an unknown-flag/-option error naming the
sentinel value — i.e. `--<sentinel>-value` was treated as a positional rather than re-parsed as a
flag. Note the inversion: most parsing rules assert that a rejection arrives, and this one asserts
that a particular rejection does not. The command may still exit non-zero for an unrelated reason
(no verb was given), which is why the check reads stderr for that specific rejection rather than
the exit code.

**Compensates for a `bun` launcher at the spawn.** `bun <script> -- --x` hands the script
`["--x"]`: bun strips one bare `--` per bun layer between the launcher and the script (measured
on bun 1.4.0), which is exactly this probe's shape, so
without help the target would never receive the terminator and what got measured would be
[A1](./unknown-flag-exits-nonzero.md) wearing A6's name. The kit sends exactly one extra `--`
because `toTarget` never names more than a single bun layer — `["bun", abs]` or `[abs]` — so one
compensating `--` is always the right amount for what the runner can see; the real guarantor is
that single-layer `argv0` shape, not a property of bun itself. The runner sends its extra `--`
when it knows bun is the launcher — including a target whose shebang names `bun` — so the target
receives the same argv a native target receives and this rule reports a real verdict. A bun layer
hidden inside a wrapper script is outside what the runner can see and is still
undercompensated; see the coverage gaps below.

After a terminator the sentinel is **guaranteed** to arrive as a positional — that is what the
probe is testing. For a CLI whose root positional is a verb it names no declared command, so the
probe reaches no declared code path. For a CLI whose root positional is **free-form data** —
`claude "…"`, `llm "…"`, `aider "…"` — the sentinel is a prompt, and running it spends money and
may take actions. The kit cannot detect that shape and does not try, so do not point `acc check`
at a CLI of that kind: an `L0` run is
[risk-reduced rather than safe](../../concepts/probing.md#inertness-classifies-an-invocation-it-does-not-make-the-run-safe).

## Current checker coverage

[`double-dash-terminator.ts`](../../../../src/acc/kit/checkers/parsing/double-dash-terminator.ts) — `L0`,
`coverage: partial`. A pass means nothing under **Established** was violated; the **Gaps** are
the rest of this page, unexamined.

**Established**

- a hyphen-leading value after a bare terminator at the root draws no English unknown-option
  rejection naming it on stderr

Through a `bun` launcher the runner compensates at the spawn — bun strips one bare `--` per bun
layer (measured on bun 1.4.0), and `toTarget` never names more than a single layer, so the
runner sends exactly one extra `--` — and the verdict is a real measurement of the target's own
argv.

**Gaps**

- the value after the terminator is only shown not to be rejected as a flag and never shown to
  arrive as a positional
- the delegator passthrough requirement is not exercised
- a rejection is recognised only from an English unknown-option or unknown-flag phrase so a
  differently worded rejection reads as a pass
- only a bare terminator at the root followed by a single value is probed
- a bun layer hidden inside a wrapper script is invisible here so its terminator is still eaten
  and the probe measures an argv the target never received

## Evidence

The convention is specified in the POSIX Utility Syntax Guidelines: applications calling
utilities with operands that begin with `-` should specify `--` to mark the end of options.
GNU's `getopt` implements it, with the additional permissive behaviour of allowing options to
appear among operands until `--` is seen.

It is one of the few genuinely universal CLI conventions — unlike exit codes, where
[no comparable standard exists](../../concepts/exit-codes.md#there-is-no-industry-standard).
