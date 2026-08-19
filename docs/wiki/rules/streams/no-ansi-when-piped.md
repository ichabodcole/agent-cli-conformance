---
type: rule
title: No ANSI escapes when output is not a terminal
description:
  Colour codes are invisible in a terminal and very visible in a string comparison.
tags: [streams, machine-mode, output, core]
related: [concept/machine-mode, rule/machine-output-is-parseable]
status: stable
generated: { by: claude-opus-5, at: 2026-08-16 }
rule_id: B2
tier: core
probe_level: L0
checker: src/acc/kit/checkers/streams/no-ansi-when-piped.ts
checker_status: implemented
coverage: partial
coverage_gaps:
  - only CSI escapes are detected and not OSC or single-character escape sequences
  - carriage-return animation is not detected
  - the NO_COLOR and --no-color and TERM=dumb overrides need a TTY and are never exercised
  - only root help and two usage errors are sampled so nested help and version output and successful command output and other diagnostics are never inspected
coverage_established:
  - no CSI introducer appears on stdout or stderr for root help or one usage error with both streams attached to pipes
  - for a target that advertises a machine-mode flag no CSI introducer appears on either stream for a usage error with that mode explicitly selected
---

# No ANSI escapes when output is not a terminal

## The rule

When stdout is not a TTY, or [machine mode](../../concepts/machine-mode.md) is active, output
**MUST NOT** contain ANSI escape sequences — colour, bold, cursor movement, spinners, or
progress animation.

This applies to stderr as well. Diagnostics get captured too.

A CLI **MUST** additionally honour `NO_COLOR` and a `--no-color` flag when a TTY _is_ present,
and **SHOULD** treat `TERM=dumb` the same way.

## How to comply

Nearly every colour library detects TTY automatically — the common failure is bypassing it with
a hand-written escape in one code path, typically an error message or a banner.

Two specifics:

- Check the stream you are writing to. `stdout.isTTY` says nothing about stderr, and a tool
  writing coloured diagnostics while stdout is piped is the usual half-fixed state.
- Suppress animation, not just colour. Spinners and progress bars need the same guard.

## Why

An escape sequence is invisible to the person the colour was for, and perfectly visible to
everything else. A captured field carrying `\x1b[32m` compares unequal to the value it
displays as, and the mismatch is undetectable by eye — the two strings look identical in every
rendering a human is likely to check.

For an agent this is worse than a formatting nuisance, because the corruption is _inside_ the
data rather than around it. A run that greps output, extracts an id, and passes it to the next
command fails at the third step with an error about an id that looks entirely correct in the
transcript.

Progress animation adds a second failure: a spinner emitted to a non-TTY writes thousands of
carriage returns into a captured log, producing enormous output that carries no information —
the "Christmas tree in CI logs" problem.

## The probe

Inert (`L0`). Help output is used because it is the one path guaranteed to produce
presentational output without performing work.

```
<cli> --help                           # stdout captured to a pipe, i.e. not a TTY
<cli> --totally-made-up-flag           # stderr captured likewise, on the error path
<cli> --totally-made-up-flag --json    # where help advertises a machine-mode flag
```

Passes when neither capture contains `\x1b[`, the CSI introducer — and nothing else. OSC
(`ESC ]`, used for hyperlinks and window titles), the single-character escapes (`ESC c`,
`ESC 7`), and animation built from bare carriage returns all pass this probe. The three
override clauses above are unreachable rather than unimplemented: they bind only when a TTY
**is** present, and every probe the runner makes captures to a pipe.

Because the runner always captures to a pipe, the CLI is by definition not writing to a TTY —
so this probe tests the detection path a CLI would use anyway. A tool that colours
unconditionally fails; a tool that checks `isatty` passes without special handling.

**The third probe exists because the rule's binding condition has two halves.** It binds when
output is not a terminal _or_ when [machine mode](../../concepts/machine-mode.md) is active, and
those are separate switches in more than one framework — so a tool can strip colour for a pipe and
keep it for its own JSON, which is a violation no pipe-only probe can reach.

## Current checker coverage

[`no-ansi-when-piped.ts`](../../../../src/acc/kit/checkers/streams/no-ansi-when-piped.ts) — `L0`,
`coverage: partial`. A pass means nothing under **Established** was violated; the **Gaps** are
the rest of this page, unexamined.

**Established**

- no CSI introducer appears on stdout or stderr for root help or one usage error with both streams
  attached to pipes
- for a target that advertises a machine-mode flag no CSI introducer appears on either stream for a
  usage error with that mode explicitly selected

**Gaps**

- only CSI escapes are detected and not OSC or single-character escape sequences
- carriage-return animation is not detected
- the NO_COLOR and --no-color and TERM=dumb overrides need a TTY and are never exercised
- only root help and two usage errors are sampled so nested help and version output and successful
  command output and other diagnostics are never inspected

## Evidence

`gh`'s own agent-facing skill documents this as already-handled behaviour: in non-TTY contexts
it skips the pager, strips colour, and fails fast — and explicitly tells agents they need not
defensively set a pager variable. That is the target: correct by default, with no special
handling required of the caller.

The inverse capability matters too. `gh` provides `GH_FORCE_TTY=1` so a caller inside an agent
harness can _demand_ the human rendering — an explicit override in the other direction, which
is why [machine mode](../../concepts/machine-mode.md#how-machine-mode-is-selected) requires the
flag to win over inference in both directions.
