---
type: archetype
title: Delegator
description:
  A CLI whose job is to resolve and run another program — where the hardest problem is not
  confusing its own failures with the child's.
tags: [archetype, delegation, exit-codes, passthrough]
related: [concept/exit-codes, rule/double-dash-terminator, decision/exit-codes-below-125]
status: current
updated: 2026-08-13
---

# Delegator

## Shape

A thin CLI that resolves some other program and runs it, forwarding arguments and returning its
result. Three common variants:

- **Launcher** — puts a name on `PATH` and re-execs the real implementation elsewhere (this
  project's `anthill-cli` is one: a pointer, not a copy).
- **Wrapper** — adds behaviour around a third-party binary: auth, config resolution, a nicer
  default.
- **Runner** — executes arbitrary caller-supplied commands in some context (`kubectl exec`,
  `docker run`, `timeout`).

What unites them is that **the exit code a caller sees may have been produced by a program the
delegator did not write.**

## What makes it hard

**Exit-code collision.** If the delegator uses `5` for "not found" and the child also exits `5`
for its own unrelated reason, the caller cannot tell whose failure it is. This is the problem
that pushed Kubernetes' KEP-2551 into reserving `1`–`200` for exec'd commands and pushing
kubectl's own errors to `201`+.

**Argument ambiguity.** Every flag the delegator understands is a flag the child can no longer
receive transparently. `mytool --verbose child-cmd --verbose` is ambiguous unless a boundary is
declared.

**Stream fidelity.** A delegator that captures the child's output to reformat it will, sooner or
later, swallow something. If it buffers, it also destroys streaming.

**Honesty.** A caller reading `--help` should be able to tell what actually runs. A wrapper that
presents itself as the underlying tool makes every failure harder to diagnose, because the
error text names a program the caller did not know was involved.

## Rules that apply differently

### Exit codes: pass through verbatim

A delegator **MUST** return the child's exit code unmodified, and use `125` when the _wrapper
itself_ failed — the established shell convention (`125` wrapper failed, `126` not executable,
`127` not found, `128+n` signalled), which `timeout`, `env`, and `docker` already follow.

Because this project's own codes stop at `8`, collision is structurally impossible and no
remapping is needed. That is the whole reason for
[keeping codes below 125](../decisions/exit-codes-below-125.md), and it is strictly better than
KEP-2551's `255`-means-"child returned ≥201", which discards which code it actually was.

### `--` stops being optional

[Honouring `--`](../rules/parsing/double-dash-terminator.md) is `diagnostic` for CLIs generally.
For a delegator it is **required**: it is the only unambiguous way to say "everything after this
belongs to the child."

`gh`'s Copilot shim documents exactly this: _"To prevent `gh` from interpreting flags intended
for Copilot, use `--` before Copilot flags and args."_

### Unknown flags: the boundary must be declared

[Rejecting unknown flags](../rules/parsing/unknown-flag-exits-nonzero.md) appears to conflict
with forwarding arbitrary arguments to a child. It does not — but the resolution must be
explicit, and a delegator **MUST** declare which discipline it follows:

- **Bounded** — the delegator owns all flags before `--` and rejects unknown ones there;
  everything after `--` is forwarded unexamined. Preferred: the caller gets strict checking on
  the half the delegator is responsible for.
- **Transparent** — the delegator owns a small, fixed, documented set and forwards everything
  else. Necessary for runners, but it means a typo'd delegator flag reaches the child, which
  will usually reject it — acceptable only because the child then fails loudly.

What is not acceptable is an undeclared mixture, where whether a flag is consumed or forwarded
depends on whether it happens to collide.

### Streams: forward, don't reinterpret

Inherit the child's stdout and stderr directly rather than capturing and re-emitting. This
preserves interleaving, streaming, and TTY detection — a captured child sees a pipe and
disables its own colour, which is usually right, but a delegator that then re-emits to a
terminal has lost it irrecoverably.

Where the delegator must add its own diagnostics, they go on stderr, clearly attributed to the
wrapper rather than the child.

## Examples

- **`anthill-cli`** — a launcher that resolves an installed plugin's CLI and delegates to it. Its
  own description calls it "a pointer, not a copy", which is the right framing.
- **`gh copilot`** — a shim that downloads and executes a separate binary, forwarding any
  arguments `gh` does not recognise, and documenting the `--` boundary.
- **`timeout` / `env`** — the canonical minimal delegators, and the origin of the `125`–`127`
  convention this archetype adopts.

## Related rules

- [Honour the `--` end-of-options terminator](../rules/parsing/double-dash-terminator.md)
- [Unknown flags must exit non-zero](../rules/parsing/unknown-flag-exits-nonzero.md)
