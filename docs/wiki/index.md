---
type: index
title: Agent CLI Conformance — wiki
description: The catalog. One line per page; update it in the same commit as the page.
tags: [index, catalog]
status: stable
generated: { by: claude-opus-5, at: 2026-08-15 }
---

# Agent CLI Conformance — wiki

Durable, curated knowledge for building command-line tools that LLM agents can drive without
falling into silent failures. The contract for maintaining these pages is
[SCHEMA.md](./SCHEMA.md); the evidence that produced them lives in `docs/research/`, outside this
wiki.

> **Status: early.** Every rule below is checked at `L0` today, except two that declare `L1`:
> [A4](./rules/parsing/unexpected-positionals-rejected.md), whose checker exists and returns a
> fixed `unverified`, and [B4](./rules/streams/output-is-delivered-whole.md), which has no checker
> at all — its blocker is the runner rather than the probe level, and its page says so. The
> catalogue is not closed — [the roadmap](../roadmap.md) names the families still missing.
> Sections marked _planned_ are scaffolded, not forgotten.

## Start here

The catalogue below is organised by what a page **is**. This is the same wiki organised by what
you are **doing**, which is usually the faster way in.

| If you are…                              | Start at                                                                                                                                 |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| an install that gave you the wrong bytes | [How to fix a broken install](./guides/how-to-fix-a-broken-install.md) — three failures, two of them silent at exit `0`                  |
| meeting the kit for the first time       | [Check your first CLI](./guides/check-your-first-cli.md) — run it against a target, read a real verdict                                  |
| making your own CLI pass                 | [How to reach L0 in your project](./guides/how-to-reach-l0-in-your-project.md) — triage each failure into a fix, a waiver, or named debt |
| holding a failing rule id                | `acc show <id>`, or find it in [the rules table](#coverage-at-a-glance) below                                                            |
| wondering what a verdict means           | [Conformance](./concepts/conformance.md) for `pass`/`fail`/`unverified`, [probing](./concepts/probing.md) for what produced it           |
| looking up an exit code                  | [the taxonomy](./concepts/exit-codes.md#the-taxonomy)                                                                                    |
| looking up an error shape                | [the error envelope](./concepts/error-envelope.md#two-shapes-and-confirmation_required-is-one-of-the-errors)                             |
| writing a checker                        | [How to add a checker](./guides/how-to-add-a-checker.md)                                                                                 |
| editing these pages                      | [SCHEMA.md](./SCHEMA.md) for the contract, [STYLE.md](./STYLE.md) for how they are written                                               |

## Concepts

What each part of a CLI _is_.

- [Exit codes](./concepts/exit-codes.md) — The one part of a CLI's response a caller can read
  without parsing anything — and the only signal that survives truncation.
- [Machine mode](./concepts/machine-mode.md) — The output contract a CLI switches to when its
  caller is a program rather than a person — and why it must be selectable explicitly, never only
  inferred.
- [Output kind](./concepts/output-kind.md) — Whether a command returns one document, a stream of
  records, or opaque bytes — declared, so a caller never has to guess how to read it.
- [Error envelope](./concepts/error-envelope.md) — The structured failure payload — a stable
  machine code, a retry verdict, and the valid alternatives — that prose on stderr cannot provide.
- [Conformance](./concepts/conformance.md) — What `acc check` means by `conformant` and
  `fullyVerified`, and why a target can be conformant without being fully verified.
- [Probing](./concepts/probing.md) — How the kit obtains the observations a verdict rests on —
  what it is allowed to send at each level, and why a probe that ran is not the same as a probe
  that established something.

## Archetypes

The shapes a CLI takes, and which rules bind differently for each.

- [Delegator](./archetypes/delegator.md) — A CLI whose job is to resolve and run another program —
  where the hardest problem is reporting failures so a caller can tell the delegator's from the
  child's.

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
page names its own gaps. **Deviation** says what a violation MEANS — `defect` if there is no
defensible alternative, `design-choice` if a different design can be right and a waiver records
a decision rather than hiding a failure — and it decides what a waiver costs: waiving a
`design-choice` keeps `fullyVerified`, waiving a `defect` does not. See
[SCHEMA.md](./SCHEMA.md#rule-pages-carry-extra-frontmatter).

| Rule                                                              | Tier       | Deviation     | Level | Checker     | Coverage | Gaps |
| ----------------------------------------------------------------- | ---------- | ------------- | ----- | ----------- | -------- | ---- |
| [A1](./rules/parsing/unknown-flag-exits-nonzero.md)               | core       | defect        | L0    | implemented | partial  | 5    |
| [A2](./rules/parsing/unknown-command-exits-nonzero.md)            | core       | defect        | L0    | implemented | partial  | 4    |
| [A3](./rules/parsing/errors-name-the-offending-token.md)          | core       | defect        | L0    | implemented | partial  | 4    |
| [A4](./rules/parsing/unexpected-positionals-rejected.md)          | core       | defect        | L1    | implemented | partial  | 1    |
| [A5](./rules/parsing/no-fuzzy-auto-correction.md)                 | core       | defect        | L0    | implemented | partial  | 5    |
| [A6](./rules/parsing/double-dash-terminator.md)                   | diagnostic | design-choice | L0    | implemented | partial  | 4    |
| [A7](./rules/parsing/advertised-value-set-is-enforced.md)         | core       | defect        | L0    | implemented | partial  | 6    |
| [B1](./rules/streams/stdout-carries-only-data.md)                 | core       | defect        | L0    | implemented | partial  | 3    |
| [B2](./rules/streams/no-ansi-when-piped.md)                       | core       | defect        | L0    | implemented | partial  | 4    |
| [B3](./rules/streams/machine-output-is-parseable.md)              | core       | defect        | L1    | implemented | partial  | 4    |
| [B4](./rules/streams/output-is-delivered-whole.md)                | core       | defect        | L1    | planned     | partial  | 2    |
| [B5](./rules/streams/machine-mode-holds-on-parser-errors.md)      | core       | defect        | L0    | implemented | partial  | 5    |
| [C1](./rules/exit-codes/help-exits-zero.md)                       | core       | defect        | L0    | implemented | partial  | 4    |
| [C2](./rules/exit-codes/usage-errors-are-distinguishable.md)      | core       | defect        | L0    | implemented | partial  | 3    |
| [C3](./rules/exit-codes/exit-codes-are-deterministic.md)          | core       | defect        | L0    | implemented | partial  | 5    |
| [D1](./rules/discoverability/version-flag-exists.md)              | core       | defect        | L0    | implemented | partial  | 5    |
| [D2](./rules/discoverability/bare-invocation-is-a-usage-error.md) | core       | design-choice | L0    | implemented | partial  | 4    |
| [D3](./rules/discoverability/help-advertises-machine-mode.md)     | diagnostic | design-choice | L0    | implemented | partial  | 5    |
| [D4](./rules/discoverability/help-output-is-deterministic.md)     | core       | defect        | L0    | implemented | partial  | 3    |
| [E1](./rules/interactivity/never-block-without-a-tty.md)          | core       | defect        | L0    | implemented | partial  | 4    |
| [F1](./rules/safety/no-secrets-in-help-or-schema.md)              | core       | defect        | L0    | implemented | partial  | 4    |
| [F2](./rules/safety/first-byte-is-prompt.md)                      | diagnostic | design-choice | L0    | implemented | partial  | 4    |
| [G1](./rules/lifecycle/inert-invocations-do-not-crash.md)         | core       | defect        | L0    | implemented | partial  | 4    |

23 rules · 0 `complete` · 23 `partial` · 92 named gaps.

### Parsing

- [A1 — Unknown flags must exit non-zero](./rules/parsing/unknown-flag-exits-nonzero.md) — A CLI
  that accepts an unrecognised flag and continues cannot tell its caller that anything went wrong.
- [A2 — Unknown commands must exit non-zero](./rules/parsing/unknown-command-exits-nonzero.md) —
  Rejecting an unrecognised verb at the root is not enough — nested subcommands are where parsers
  most often let one through.
- [A3 — Errors name the offending token](./rules/parsing/errors-name-the-offending-token.md) —
  "Invalid arguments" tells a caller that something is wrong; naming the token tells it what to
  change.
- [A4 — Unexpected positionals are rejected](./rules/parsing/unexpected-positionals-rejected.md) —
  A stray positional is almost never intentional — it is usually the orphaned value of a flag that
  was silently misparsed.
- [A5 — Never act on a guessed correction](./rules/parsing/no-fuzzy-auto-correction.md) —
  Suggesting "did you mean" is helpful; running it converts a caught error into an unlogged wrong
  action.
- [A6 — Honour the `--` terminator](./rules/parsing/double-dash-terminator.md) _(diagnostic)_ —
  Without it, any value that begins with a hyphen is unpassable — including negative numbers and
  hyphen-leading filenames.
- [A7 — An advertised value set is enforced](./rules/parsing/advertised-value-set-is-enforced.md) —
  A flag that publishes a closed set of values and then accepts anything has told its caller a lie
  the caller cannot detect — the answer arrives in the default shape, at exit 0.

### Streams

- [B1 — stdout carries only data](./rules/streams/stdout-carries-only-data.md) — On failure stdout
  must be empty — otherwise a consumer reading it receives a wrong answer rather than an error.
- [B2 — No ANSI when output is not a terminal](./rules/streams/no-ansi-when-piped.md) — Colour
  codes are invisible in a terminal and very visible in a string comparison.
- [B3 — Machine output parses as its declared kind](./rules/streams/machine-output-is-parseable.md)
  — Requiring the whole stdout stream to parse turns any stray debug print into a hard failure
  instead of a code-review question.
- [B4 — A command delivers every byte it wrote](./rules/streams/output-is-delivered-whole.md) — A
  payload that stops at the pipe buffer still exits 0 — the caller receives two thirds of an answer
  with nothing anywhere to say a third is missing.
- [B5 — Machine mode holds on the parser-error path](./rules/streams/machine-mode-holds-on-parser-errors.md)
  — Machine mode that survives every failure except the parser's fails on the one an agent hits
  most — a wrong flag is the commonest way an agent gets a command wrong.

### Exit codes

- [C1 — Help is a request, and it succeeds](./rules/exit-codes/help-exits-zero.md) — Asking for
  help is not an error — `--help` exits zero and writes to stdout, unlike every other path that
  prints help.
- [C2 — Usage errors are distinguishable from internal errors](./rules/exit-codes/usage-errors-are-distinguishable.md)
  — Both are failures, but one is fixed by changing the command and the other never is — an agent
  that cannot tell them apart retries forever or gives up wrongly.
- [C3 — Identical invocations produce identical exit codes](./rules/exit-codes/exit-codes-are-deterministic.md)
  — A code that varies between runs makes every retry decision unsound, and turns a reproducible
  failure into an intermittent one.

### Discoverability

- [D1 — A version is reportable without side effects](./rules/discoverability/version-flag-exists.md)
  — Version is the cheapest possible probe of whether a tool is installed, reachable, and which
  contract it implements.
- [D2 — Bare invocation is a usage error](./rules/discoverability/bare-invocation-is-a-usage-error.md)
  — Our default is that a bare invocation is a usage error, because an unset shell variable
  expanding to nothing is indistinguishable from a deliberate bare call. A tool that answers with
  a machine-readable manifest has made a different and defensible choice.
- [D3 — Help advertises the machine-readable path](./rules/discoverability/help-advertises-machine-mode.md)
  _(diagnostic)_ — An agent reading help should not have to guess whether structured output exists
  — the human surface is where it looks first.
- [D4 — Help output is byte-identical between runs](./rules/discoverability/help-output-is-deterministic.md)
  — A timestamp or a hash-ordered list in help text makes every snapshot test rot and every cached
  reference wrong.

### Interactivity

- [E1 — Never block on input without a terminal](./rules/interactivity/never-block-without-a-tty.md)
  — With no TTY a prompt either hangs forever or is silently answered by EOF — and the silent
  answer is the more dangerous of the two.

### Safety

- [F1 — Help and schema never contain secrets](./rules/safety/no-secrets-in-help-or-schema.md) —
  Flag defaults are copied verbatim into introspection output — so a defaulted credential is
  published to anything that asks.
- [F2 — First byte arrives promptly](./rules/safety/first-byte-is-prompt.md) _(diagnostic)_ —
  Agents invoke CLIs in loops, so startup cost is paid per iteration — and a tool that looks hung
  gets killed and retried.

### Lifecycle

The process itself: how it ends, and what a caller can conclude from that. `G1` is the family's
first member and the rest is [planned](../roadmap.md#7-the-lifecycle-rule-family) —
cancellation, bounded shutdown, `SIGPIPE`, resumability.

- [G1 — Inert invocations must not crash the tool](./rules/lifecycle/inert-invocations-do-not-crash.md)
  — Dying on a signal is not an answer — the caller gets no exit code to read, and every other
  rule reports a gap in the evidence rather than the defect.

## Decisions

Why we chose what we chose, citing the research.

- [Stay pre-1.0 while the design is still moving](./decisions/pre-1-0-while-the-design-moves.md) — A version number is a claim about stability, and this project was making one it could not keep — so the 1.x line was withdrawn, the tags deleted, and the promised surface narrowed to what is actually settled.
- [Require a config, and never raise who owns the target](./decisions/require-a-config-never-raise-ownership.md) — Where a rule needs a declaration, requiring the caller to write one is the answer — and who owns the target is not a distinction this documentation makes, because both branches cost a second explanation for a use nobody has.
- [Exit codes stay below 125](./decisions/exit-codes-below-125.md) — Reserving the band POSIX and
  the delegators already use, rather than inventing a new one, keeps our domain codes clear of the
  shell's — on POSIX, and not without residue.

## Guides

How to actually do things.

- [Check your first CLI](./guides/check-your-first-cli.md) — A first run of the conformance kit
  against a tool that passes, one that fails, and one you did not write — learning to read the
  report rather than to fix anything.

- [How to reach L0 in your project](./guides/how-to-reach-l0-in-your-project.md) — Take a CLI
  from its first failing check to a green gate — triaging each failure into a fix, a declared
  waiver, or named debt.

- [How to add a checker](./guides/how-to-add-a-checker.md) — Take a rule from a page with no
  enforcement to one the gate holds — declaring probes, writing the check, wiring the registry,
  and declaring honestly what a pass now means.
