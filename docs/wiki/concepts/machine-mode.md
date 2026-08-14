---
type: concept
title: Machine mode
description:
  The output contract a CLI switches to when its caller is a program rather than a person —
  and why it must be selectable explicitly, never only inferred.
tags: [machine-mode, output, agent-facing, detection]
related: [concept/output-kind, rule/no-ansi-when-piped, rule/help-advertises-machine-mode]
status: current
updated: 2026-08-13
---

# Machine mode

## What it is

A conforming CLI has two output contracts for the same command. **Text mode** is formatted for
a person reading a terminal: aligned columns, colour, truncation, friendly phrasing. **Machine
mode** is structured for a program: parseable, complete, unstyled, and stable across releases.

Machine mode is a mode, not a flag on one command. Once selected it governs success output,
failure output, and every subcommand alike.

## Why it matters for agents

The temptation is to give agents the human output and let them read it — they are, after all,
good at reading. That fails for three reasons that have nothing to do with comprehension:

1. **Human output is deliberately lossy.** Tables truncate, ids get abbreviated, timestamps
   get humanised to "3 hours ago". The agent cannot recover what was dropped.
2. **Human output is not versioned.** Maintainers rewrite it freely, because it is presentation.
   Anything an agent extracted from it breaks silently on the next release — the same failure
   described in [exit codes](./exit-codes.md#why-it-matters-for-agents).
3. **ANSI escapes corrupt captured output.** A colour code inside a captured field is invisible
   in a terminal and very visible in a string comparison.

## The details

### How machine mode is selected

In precedence order:

1. **An explicit flag** (`--json`, or `--format json`). Always wins.
2. **An explicit environment variable**, for callers that cannot alter argv.
3. **Inference** — stdout is not a TTY, or an agent-harness variable such as `AI_AGENT` is set.

Inference is a convenience for the common case. It is never the only path.

### The detection hazard

Auto-detection is genuinely useful — `gh` identifies its caller and stamps it into the
User-Agent, honouring an `AI_AGENT` override validated against `^[a-zA-Z0-9_-]+$`. Verified
directly: `gh` running under Claude Code reports `Agent/claude-code_2-1-222_agent`, and
`AI_AGENT=my-tool` overrides it cleanly.

But detection is also a documented failure mode. Vercel's agent-mode envelope was discovered
_through a bug report_ caused by its own agent detection, which users worked around by faking
a PTY. When behaviour depends solely on inference about the caller, a caller that guesses
wrong has no recourse.

Hence the rule: **an explicit flag must always be able to override detection in both
directions.** A caller must be able to demand machine mode, and to demand human mode
(`gh` spells the latter `GH_FORCE_TTY=1`).

### What changes in machine mode

|               | Text mode                 | Machine mode                                         |
| ------------- | ------------------------- | ---------------------------------------------------- |
| Colour / ANSI | yes                       | **never**                                            |
| Truncation    | yes                       | **never** — full ids, full timestamps                |
| Values        | humanised (`3 hours ago`) | raw and typed (`2026-08-13T09:14:22Z`)               |
| Structure     | aligned for reading       | per the command's [output kind](./output-kind.md)    |
| Errors        | prose on stderr           | [structured envelope](./error-envelope.md) on stderr |
| Prompts       | permitted when a TTY      | **never**                                            |

The one thing that does _not_ change is which stream carries what: data on stdout,
diagnostics on stderr, in both modes.

### Carry the human rendering inside the payload

Where a machine payload also needs a human-readable form, put it _in_ the payload as a
dedicated field rather than emitting it separately. `cargo` does this — its JSON diagnostics
carry a `rendered` field holding the exact text a human would see.

One payload, two audiences, and the two renderings cannot drift apart because there is only
one of them.

## Related rules

- [No ANSI escapes when stdout is not a terminal](../rules/streams/no-ansi-when-piped.md)
- [Machine output must be parseable as declared](../rules/streams/machine-output-is-parseable.md)
- [Root help advertises the machine-readable path](../rules/discoverability/help-advertises-machine-mode.md)
