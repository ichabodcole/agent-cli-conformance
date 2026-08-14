---
type: rule
title: Honour the `--` end-of-options terminator
description:
  Without it, any value that begins with a hyphen is unpassable — including negative numbers
  and hyphen-leading filenames.
tags: [parsing, posix, diagnostic]
related: [rule/unexpected-positionals-rejected, archetype/delegator]
status: current
updated: 2026-08-14
rule_id: A6
tier: diagnostic
probe_level: L0
checker: src/acc/kit/checkers/parsing/double-dash-terminator.ts
checker_status: implemented
---

# Honour the `--` end-of-options terminator

## The rule

A CLI **SHOULD** treat a bare `--` as end-of-options: every argument after it is a positional
value, even if it begins with `-`.

A CLI that [delegates to a child process](../../archetypes/delegator.md) **MUST** honour it,
and **MUST** pass everything after `--` to the child unmodified.

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

Inert (`L0`).

```
<cli> -- --<sentinel>-value
```

No verb precedes the `--`. Prefixing one — `<known-verb> -- --<sentinel>-value` — would put the
same question in front of this probe that closed off A2's nested case and dropped A4 to `L1`:
`Discovery` has no way to know a verb is side-effect-free, and a target that does not honour
`--` would run that verb for real, with the sentinel landing as its argument. Leaving the verb
out entirely — and building the value after `--` from the sentinel — is what makes this probe
inert without needing to know anything about the target's command surface: nothing in it names
a valid command, whether or not `--` is honoured.

Passes when the invocation does **not** fail with an unknown-flag/-option error that names the
sentinel value — i.e. `--<sentinel>-value` was treated as a positional, not re-parsed as a
flag. The command may still exit non-zero for an unrelated reason (no verb was given), which is
why the check reads stderr for that specific rejection rather than the exit code.

Note the inversion: for most parsing rules the probe asserts a rejection; here it asserts the
absence of one naming a specific token. That inversion is what makes the probe non-obvious, not
a reason it's less inert.

### Where this probe cannot be delivered

**Any target launched through `bun` reports `unverified`.** `bun <script> -- --x` hands the
script `["--x"]`: Bun consumes exactly one bare `--` immediately after the script path, which
is exactly this probe's shape. The target never receives the terminator, so what gets measured
is [A1](./unknown-flag-exits-nonzero.md) wearing A6's name. No launcher form avoids it —
`bun run`, `bun --bun` and `bun -- <script>` all strip the same token. The checker refuses to
guess rather than reporting a verdict about an argv the target never saw.

The kit's `.ts` fixtures inherit this, so A6's own tests use POSIX shell fixtures instead.

### Where this probe is not inert

After a terminator the sentinel is **guaranteed** to arrive as a positional — that is what the
probe is testing. For a CLI whose root positional is a verb, nothing dispatches and nothing
happens. For a CLI whose root positional is **free-form data** — `claude "…"`, `llm "…"`,
`aider "…"` — the sentinel is a prompt, and running it spends money and may take actions.

The kit cannot detect that shape and does not try: a wrong guess is worse than a documented
limit. Probes run in a fresh temporary working directory, which bounds filesystem damage, but
nothing bounds a network call. Do not point `acc check` at a CLI of that shape.

## How to comply

Free in most parsers — POSIX-conformant option parsing includes it, and `clap`, `commander`,
`click`, and `node:util parseArgs` all handle it by default.

Hand-rolled `argv` loops are where it goes missing. If you iterate arguments yourself, stop
flag interpretation at the first bare `--` and treat the remainder as values.

## Evidence

The convention is specified in the POSIX Utility Syntax Guidelines: applications calling
utilities with operands that begin with `-` should specify `--` to mark the end of options.
GNU's `getopt` implements it, with the additional permissive behaviour of allowing options to
appear among operands until `--` is seen.

It is one of the few genuinely universal CLI conventions — unlike exit codes, where
[no comparable standard exists](../../concepts/exit-codes.md#there-is-no-industry-standard).
