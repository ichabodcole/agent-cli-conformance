---
type: index
title: Agent CLI Conformance — wiki
description: The catalog. One line per page; update it in the same commit as the page.
tags: [index, catalog]
status: current
updated: 2026-08-14
---

# Agent CLI Conformance — wiki

Durable, curated knowledge for building command-line tools that LLM agents can drive without
falling into silent failures. The contract for maintaining these pages is
[SCHEMA.md](./SCHEMA.md); the evidence that produced them lives in `research/`, outside this
wiki.

> **Status: early.** The `L0` rule catalogue is complete; `L1` and `L2` rules arrive with the
> conformance kit. Sections marked _planned_ are scaffolded, not forgotten.

## Concepts

What each part of a CLI _is_.

- [Exit codes](./concepts/exit-codes.md) — the only part of a response a caller can read
  without parsing anything, and the only signal that survives truncation.
- [Machine mode](./concepts/machine-mode.md) — the output contract for a caller that is a
  program, and why it must be selectable explicitly rather than only inferred.
- [Output kind](./concepts/output-kind.md) — whether stdout is one document, a stream of
  records, or opaque bytes, declared so a caller never guesses.
- [Error envelope](./concepts/error-envelope.md) — the structured failure payload, including
  the third status (`action_required`) that prose on stderr cannot express.
- [Conformance](./concepts/conformance.md) — what the kit's verdict claims, and why "no core
  rule was violated" is a different claim from "every core rule was established".

## Archetypes

The shapes a CLI takes, and which rules bind differently for each.

- [Delegator](./archetypes/delegator.md) — a CLI that runs another program, where the hardest
  problem is not confusing its own failures with the child's.

_Planned: stateless-verb, service-client, daemon-session, streaming._

## Rules

The normative spec, one page per rule. **Core** rules gate the verdict: a core violation makes
a run non-conformant. **Diagnostic** rules are reported and never do. A core rule can also come
back [`unverified`](./concepts/conformance.md) — the probe ran and established neither answer,
which blocks full verification without failing the run.

### Coverage at a glance

Generated from rule frontmatter by `bun run docs:sync`; the lint fails when it drifts.
**Checker** is presence — a checker file exists and is registered. **Coverage** answers the
different question of how much of the page that checker actually establishes, and each rule
page names its own gaps. See [SCHEMA.md](./SCHEMA.md#rule-pages-carry-extra-frontmatter).

| Rule                                                              | Tier       | Level | Checker     | Coverage | Gaps |
| ----------------------------------------------------------------- | ---------- | ----- | ----------- | -------- | ---- |
| [A1](./rules/parsing/unknown-flag-exits-nonzero.md)               | core       | L0    | implemented | partial  | 3    |
| [A2](./rules/parsing/unknown-command-exits-nonzero.md)            | core       | L0    | implemented | partial  | 3    |
| [A3](./rules/parsing/errors-name-the-offending-token.md)          | core       | L0    | implemented | partial  | 3    |
| [A4](./rules/parsing/unexpected-positionals-rejected.md)          | core       | L1    | implemented | partial  | 1    |
| [A5](./rules/parsing/no-fuzzy-auto-correction.md)                 | core       | L0    | implemented | partial  | 3    |
| [A6](./rules/parsing/double-dash-terminator.md)                   | diagnostic | L0    | implemented | partial  | 2    |
| [B1](./rules/streams/stdout-carries-only-data.md)                 | core       | L0    | implemented | partial  | 2    |
| [B2](./rules/streams/no-ansi-when-piped.md)                       | core       | L0    | implemented | partial  | 3    |
| [B3](./rules/streams/machine-output-is-parseable.md)              | core       | L0    | implemented | partial  | 3    |
| [C1](./rules/exit-codes/help-exits-zero.md)                       | core       | L0    | implemented | partial  | 3    |
| [C2](./rules/exit-codes/usage-errors-are-distinguishable.md)      | core       | L0    | implemented | partial  | 2    |
| [C3](./rules/exit-codes/exit-codes-are-deterministic.md)          | core       | L0    | implemented | partial  | 3    |
| [D1](./rules/discoverability/version-flag-exists.md)              | core       | L0    | implemented | partial  | 3    |
| [D2](./rules/discoverability/bare-invocation-is-a-usage-error.md) | core       | L0    | implemented | partial  | 2    |
| [D3](./rules/discoverability/help-advertises-machine-mode.md)     | diagnostic | L0    | implemented | partial  | 1    |
| [D4](./rules/discoverability/help-output-is-deterministic.md)     | core       | L0    | implemented | partial  | 3    |
| [E1](./rules/interactivity/never-block-without-a-tty.md)          | core       | L0    | implemented | partial  | 3    |
| [F1](./rules/safety/no-secrets-in-help-or-schema.md)              | core       | L0    | implemented | partial  | 3    |
| [F2](./rules/safety/first-byte-is-prompt.md)                      | diagnostic | L0    | implemented | partial  | 3    |

19 rules · 0 `complete` · 19 `partial` · 49 named gaps.

### Parsing

- [A1 — Unknown flags must exit non-zero](./rules/parsing/unknown-flag-exits-nonzero.md) —
  accepting an unrecognised flag produces a wrong answer with a success exit code.
- [A2 — Unknown commands must exit non-zero](./rules/parsing/unknown-command-exits-nonzero.md) —
  including nested subcommands, which is where parsers actually let them through.
- [A3 — Errors name the offending token](./rules/parsing/errors-name-the-offending-token.md) —
  "invalid arguments" says something is wrong; naming the token says what to change.
- [A4 — Unexpected positionals are rejected](./rules/parsing/unexpected-positionals-rejected.md)
  — a stray positional is usually the orphaned value of a misparsed flag.
- [A5 — Never act on a guessed correction](./rules/parsing/no-fuzzy-auto-correction.md) —
  suggesting is helpful; running the guess is an unlogged wrong action.
- [A6 — Honour the `--` terminator](./rules/parsing/double-dash-terminator.md) _(diagnostic)_ —
  without it, any value beginning with a hyphen is unpassable.

### Streams

- [B1 — stdout carries only data](./rules/streams/stdout-carries-only-data.md) — on failure
  stdout must be empty, or a consumer receives a wrong answer instead of an error.
- [B2 — No ANSI when output is not a terminal](./rules/streams/no-ansi-when-piped.md) — escape
  codes are invisible to the eye and very visible to a string comparison.
- [B3 — Machine output parses as its declared kind](./rules/streams/machine-output-is-parseable.md)
  — whole-stream parsing turns any stray debug print into a hard failure.

### Exit codes

- [C1 — Help is a request, and it succeeds](./rules/exit-codes/help-exits-zero.md) — `--help`
  exits zero on stdout, the deliberate inverse of bare invocation.
- [C2 — Usage errors are distinguishable from internal errors](./rules/exit-codes/usage-errors-are-distinguishable.md)
  — one is fixed by changing the command; the other never is.
- [C3 — Identical invocations produce identical exit codes](./rules/exit-codes/exit-codes-are-deterministic.md)
  — a varying code makes every retry decision unsound.

### Discoverability

- [D1 — A version is reportable without side effects](./rules/discoverability/version-flag-exists.md)
  — the cheapest probe of whether a tool is installed and which contract it implements.
- [D2 — Bare invocation is a usage error](./rules/discoverability/bare-invocation-is-a-usage-error.md)
  — how an unset shell variable becomes a silent no-op that reports success.
- [D3 — Help advertises the machine-readable path](./rules/discoverability/help-advertises-machine-mode.md)
  _(diagnostic)_ — an undiscoverable feature is indistinguishable from an absent one.
- [D4 — Help output is byte-identical between runs](./rules/discoverability/help-output-is-deterministic.md)
  — the precondition that makes every other probe in this catalogue meaningful.

### Interactivity

- [E1 — Never block on input without a terminal](./rules/interactivity/never-block-without-a-tty.md)
  — a prompt with nobody to answer it either hangs or is silently answered by EOF.

### Safety

- [F1 — Help and schema never contain secrets](./rules/safety/no-secrets-in-help-or-schema.md) —
  flag defaults are copied verbatim into introspection output.
- [F2 — First byte arrives promptly](./rules/safety/first-byte-is-prompt.md) _(diagnostic)_ —
  agents invoke in loops, so startup cost is paid per iteration.

## Decisions

Why we chose what we chose, citing the research.

- [Exit codes stay below 125](./decisions/exit-codes-below-125.md) — reserving the shell's
  existing band gives delegating CLIs verbatim passthrough for free.

## Guides

How to actually do things.

_Planned: adopting the spec, adding a checker, migrating an existing CLI._
