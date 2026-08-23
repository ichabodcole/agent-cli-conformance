---
type: rule
title: Bare invocation is a usage error
description:
  Our default is that a bare invocation is a usage error, because an unset shell variable
  expanding to nothing is indistinguishable from a deliberate bare call. A tool that answers with
  a machine-readable manifest has made a different and defensible choice.
tags: [discoverability, exit-codes, silent-failure, core]
related: [rule/help-exits-zero, concept/exit-codes]
status: stable
generated: { by: claude-opus-5, at: 2026-08-14 }
rule_id: D2
tier: core
deviation: design-choice
probe_level: L0
checker: src/acc/kit/checkers/discoverability/bare-invocation.ts
checker_status: implemented
coverage: partial
coverage_gaps:
  - the exit code is only required to be non-zero here and not the declared 2
  - stderr is never checked to carry the usage summary
  - the bare invocation is only run against pipes so a wizard that starts only with a terminal attached is out of reach
  - only a genuinely empty argv is sent so an invocation carrying nothing but global flags requests nothing either and is never probed
coverage_established:
  - the bare invocation exits non-zero with stdout empty and terminates rather than waiting for input
---

# Bare invocation is a usage error

## The rule

Invoked with no arguments at all, a CLI **MUST** treat it as a usage error: exit `2`, write
help or a usage summary to **stderr**, and leave stdout empty.

It **MUST NOT** exit `0`, and **MUST NOT** wait for input — see
[never block without a TTY](../interactivity/never-block-without-a-tty.md).

This is the deliberate inverse of [`--help`](../exit-codes/help-exits-zero.md), which is a
request and therefore succeeds.

## When a different answer is right

**This is a default, not a judgement about your design.** The rule assumes a bare invocation
requested nothing — and for most CLIs that is true, which is why it is the default. It is not
true for every CLI.

A machine-first tool may answer a bare invocation with **a description of its own command
surface** — a JSON manifest of what it can do — precisely so that an agent can discover it in one
call. That is a request being answered, not a no-op being reported as success, and it is a
reasonable thing to build. An adopter argued exactly this case for their CLI and we think they
are right about their CLI.

**The reason the default runs the other way is worth reading even if you disagree with it**,
because it is a failure mode people meet without recognising it: an unset shell variable expands
to nothing, so `mytool $SUBCOMMAND` becomes a bare invocation, and a bare invocation that exits
`0` makes that indistinguishable from success. See [Why](#why) below for the worked case.

If you have made the other choice deliberately, **[waive the rule](#how-to-comply) and record
why** — that is what the waiver is for, and the report will show the verdict the probe reached
rather than pretending the rule was never tested.

## How to comply

Three things must change together: the code, the stream, and the handler. If your framework
routes bare invocation through the same handler as `--help`, split them first — they need
different streams and different codes.

What the survey measured, for the bare case specifically:

| Framework            | Bare invocation                                      | What to do                                                                                   |
| -------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `kong` (Go)          | errors already — `expected one of "sub","other"`     | nothing, except the code is **80**, not `2`                                                  |
| `cobra` (Go)         | **exit `0`, help on stdout** for a non-runnable node | set `Args: cobra.NoArgs` on **every** node — root, group and leaf; there is no global switch |
| `@stricli/core` (TS) | usage errors to stderr, exit **252**                 | remap the code via the injectable `process`                                                  |
| `clipanion` v4 (TS)  | usage errors to **stdout**                           | redirect via its custom-streams hook                                                         |
| `cac` (TS)           | throws a raw `CACError` stack trace                  | catch it; print your own usage, exit `2`                                                     |
| `commander` (TS)     | not measured bare                                    | `exitOverride()` picks the code, `configureOutput()` picks the stream                        |

`cobra` is the case to check first: the `0`-with-help-on-stdout path is a `nil` error returned
from `HelpFunc()`, so no amount of error handling catches it — only `NoArgs` does.

Not measured for the bare case: `clap`, Click/Typer, `node:util parseArgs`, `citty`, `yargs`,
`oclif`, Swift ArgumentParser. Verify yours rather than assuming from its unknown-flag strictness
— they are separate code paths.

**If answering a bare invocation is a deliberate product decision** — see [when a different answer is right](#when-a-different-answer-is-right) — waive the rule rather than change your tool to satisfy it:
in `acc.config.json`, `"D2": { "severity": "off", "reason": "..." }` — see
[waivers](../../concepts/conformance.md#waivers-a-rule-that-does-not-apply-to-this-tool) for what
that costs — and for this rule the answer is **nothing**: D2 is classified `design-choice`, so
waiving it leaves `fullyVerified` intact and keeps the rule out of `evidenceGaps`. The waiver is
still listed, with your reason, so the decision is visible rather than silent. See also
[the triage step](../../guides/how-to-reach-l0-in-your-project.md#3-triage-what-is-left-into-three-buckets)
for when a waiver is the right bucket.

## Why

The failure this prevents is mundane and common:

```
SUBCOMMAND=""          # the variable never got set
mycli $SUBCOMMAND      # expands to just: mycli
echo $?                # 0, in four of the five major CLIs
```

The caller asked for an operation. No operation ran. The exit code says success, and the help
text landed on stdout where — if captured — it looks like output. Nothing anywhere reports that
the request was not performed.

For an agent this is the [silent-failure](./../parsing/unknown-flag-exits-nonzero.md) shape
again, reached by a different route: an empty or malformed command string degrades into a
no-op that reports success, and the run continues on the assumption that the step completed.

The distinction from `--help` is entirely about what was asked:

| Invocation     | The caller asked           | Outcome                     |
| -------------- | -------------------------- | --------------------------- |
| `mycli --help` | "what can you do?"         | answered → `0`, stdout      |
| `mycli`        | "do ..." (nothing follows) | nothing to do → `2`, stderr |

Sending the text to stderr rather than stdout is what keeps this consistent with
[stdout carries only data](../streams/stdout-carries-only-data.md): this is a failure, so
stdout stays empty and a consumer reading it correctly receives nothing.

Humans lose nothing — the help still appears on their terminal.

## The probe

Inert (`L0`) by definition: no operation was requested.

```
<cli>                    # no arguments, stdin closed, streams captured to files
```

Passes when the exit code is non-zero, stdout is empty, and the process terminates rather than
waiting (a hang is reported as a failure, not a pass with missing evidence). The checker
requires only non-zero, not exactly `2` — an undeclared tool never agreed to the taxonomy — but
records the observed code in the finding either way.

**Reports `unverified`** when the probe was never recorded, and when it died on a signal. The
second is the asymmetry worth knowing: this rule owns hangs but **not** crashes. A crash is
non-zero-ish and a bare invocation should be a usage error, so the two look like they line up —
they do not. This rule asks whether the tool TOLD its caller the invocation was wrong, and a
target that died told them nothing; `exitCode` is `null` rather than any code at all. See
[probing](../../concepts/probing.md#a-probe-the-kit-killed-is-not-a-probe-the-target-failed). A capture cut short by the output ceiling is `unverified` only when stdout was
empty — bytes already on stdout prove the violation whatever happened next.

## Current checker coverage

[`bare-invocation.ts`](../../../../src/acc/kit/checkers/discoverability/bare-invocation.ts) — `L0`,
`coverage: partial`. A pass means nothing under **Established** was violated; the **Gaps** are
the rest of this page, unexamined.

**Established**

- the bare invocation exits non-zero with stdout empty and terminates rather than waiting for input

**Gaps**

- the exit code is only required to be non-zero here and not the declared 2
- stderr is never checked to carry the usage summary
- the bare invocation is only run against pipes so a wizard that starts only with a terminal
  attached is out of reach
- only a genuinely empty argv is sent so an invocation carrying nothing but global flags
  requests nothing either and is never probed

That last gap is not hypothetical, and `acc` is the tool it was found on. `acc --json` named no
command, so it requested nothing — and it answered exit `0` with both streams empty while this
rule's probe, which sends an empty argv only, reported `pass`. The defect and the blind spot
share one shape: an invocation is bare in the sense this rule cares about when it names no
command, not when it carries no tokens.

## Evidence

This is the one place the major CLIs genuinely disagree, which is why the rule needed a
[decision](../../decisions/exit-codes-below-125.md) rather than a survey. Measured:

| Tool      | exit  | stream     |
| --------- | ----- | ---------- |
| `git`     | **1** | stdout     |
| `docker`  | 0     | **stderr** |
| `kubectl` | 0     | stdout     |
| `gh`      | 0     | stdout     |
| `cargo`   | 0     | stdout     |

`git` is alone in treating it as a failure. `docker` is alone in using stderr — while still
exiting `0`, which is the least coherent combination of the five: it classifies the output as
diagnostic and the outcome as success simultaneously.

This rule takes `git`'s exit-code position and `docker`'s stream position, because together
they are the only pairing consistent with the rest of this catalogue.
