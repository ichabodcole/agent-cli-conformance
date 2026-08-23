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
deviation: defect
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

**No framework table here, because the survey did not produce one.** It covered argument parsers,
not colour libraries, so this page cannot tell you whether your ecosystem's colour package
auto-detects a pipe — verify that yourself with one piped run. What the research does establish is
a stream-level discipline, two measured framework traps, and where the overrides are convention
rather than measurement.

**Guard each stream separately, with the standard-library check.** `process.stdout.isTTY` /
`process.stderr.isTTY` in Node (both are `undefined`, not `false`, when redirected),
`sys.stdout.isatty()` / `sys.stderr.isatty()` in Python, `std::io::IsTerminal::is_terminal` on each
handle in Rust, `os.Stdout.Stat()` tested for `os.ModeCharDevice` in Go. One check reused for both
streams is the usual half-fixed state: colour stripped from the data, kept on the diagnostics that
get captured alongside it. The same guard has to cover spinners and progress bars, not only SGR
colour — the [agent-CLI convention is a `--quiet` that suppresses
spinners](../../../research/2026-08-13-frameworks-languages.md), on the stated grounds that the
animation "is noise that consumes context window tokens", and a flag the caller must remember is
weaker than a guard that fires on its own.

**If you use Typer, set `TYPER_USE_RICH=0`.** Typer's error output is Rich-formatted and emits
Unicode box-drawing **even when stderr is not a TTY** — measured at ~160 characters of box to carry
a 24-character message, on every error ([frameworks
§2.9b](../../../research/2026-08-13-frameworks-languages.md)). The switch is an environment
variable, not a TTY check: `typer/core.py:26` reads the `TYPER_USE_RICH` env var through
`parse_boolean_env_var`, defaulting to `True`. Turning it off also takes ~47 ms off every
`--help`. Two honest limits: box-drawing characters are not CSI escapes, so this particular defect passes this
rule's probe while still costing an agent its context window; and the survey did not record whether
that same path also emits colour, so the ANSI question for Typer is open. Plain Click does not do
this.

**If you wrap cobra in `charmbracelet/fang`, you have added ANSI styling to output agents parse.**
`fang.Execute` is a wrapper, not a parser — it changes nothing about argument handling and adds
styled help and errors ([frameworks
§2.5c](../../../research/2026-08-13-frameworks-languages.md)). The survey did not establish whether
fang suppresses that styling on a non-TTY, so treat it as unverified and check a piped run before
shipping.

**Do not route output through a pager.** `aws` v2 pipes everything through `less`/`more` by default
and needs one of `--no-cli-pager`, `AWS_PAGER=`, or `cli_pager=` to stop — the notorious CI trap
([case studies §2.4](../../../research/2026-08-13-case-studies.md)). `gh` is the shape to copy: its
own agent skill states that in non-TTY contexts it skips the pager, strips colour, and fails fast,
and tells callers they need not defensively set `GH_PAGER` ([case studies
§4.2](../../../research/2026-08-13-case-studies.md)). Correct by default beats an opt-out the caller
has to know about.

**Do not stop at `isatty`, for two reasons.** Agent harnesses commonly allocate a PTY, so an
inference-only tool hands an agent the human rendering; `gh` has `GH_FORCE_TTY` to force human mode
_on_ and nothing to force it off except not being a terminal ([case studies §2.1,
§3.9](../../../research/2026-08-13-case-studies.md)), which is why [machine
mode](../../concepts/machine-mode.md#how-machine-mode-is-selected) must be selectable explicitly.
And machine output should ignore colour _configuration_, not merely the TTY: git's porcelain
guarantee is stability across versions **or user configuration**, and porcelain explicitly ignores
`color.status` ([case studies §2.6](../../../research/2026-08-13-case-studies.md)).

**Implement the three suppression standards precisely — they are published specifications, not
folklore.** ([testing & enforcement §2.3](../../../research/2026-08-13-testing-enforcement.md))

- [`NO_COLOR`](https://no-color.org) is normative and its rule is easy to get backwards: suppress
  when the variable is **present and not an empty string, regardless of its value**. `NO_COLOR=0`
  therefore means colour **off**. Treating it as "colours on" is named as the common bug.
- `CLICOLOR=0` suppresses ANSI; `CLICOLOR_FORCE` set to anything non-zero emits colour **regardless
  of the TTY**, which is how you exercise the coloured path deterministically in a test.
- `TERM=dumb` is the third gate, and the one most libraries honour.

Their precedence relative to each other is **contested**, and getting it wrong is not hypothetical:
[cli/cli#13335](https://github.com/cli/cli/issues/13335) is a real bug in which `CLICOLOR=0` and
`NO_COLOR=1` were **both ignored** ([§2.2](../../../research/2026-08-13-testing-enforcement.md)) — in the same tool this page recommends copying for
its pager and TTY behaviour. Handle each independently rather than deriving one from another.

**Then assert it, on both streams, by looking for the escape byte.** The recipe the research uses is
`NO_COLOR=1`, `TERM=dumb`, no TTY, then a regex for `\x1b\[` over stdout **and** stderr expecting
zero matches ([§6](../../../research/2026-08-13-testing-enforcement.md)). Test for the byte rather than for "colour": real leak bugs exist where
**SGR reset sequences survived `NO_COLOR=1`** ([§4](../../../research/2026-08-13-testing-enforcement.md)) — the trailing `\x1b[0m` that nobody
thinks of as colour because it does not add any, and that corrupts a string comparison exactly as
much as one that does.

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

Inert (`L0`) — help and error paths only, which produce presentational output without
performing work.

```
<cli> --help                           # stdout captured to a pipe, i.e. not a TTY
<cli> --acc-probe-xyzzy-flag           # stderr captured likewise, on the error path
<cli> --acc-probe-xyzzy-flag --json    # where help advertises a machine-mode flag
```

**Passes** when neither capture contains `\x1b[`, the CSI introducer — and nothing else. OSC
(`ESC ]`, used for hyperlinks and window titles), the single-character escapes (`ESC c`,
`ESC 7`), and animation built from bare carriage returns all pass this probe.

**Fails** for a tool that colours unconditionally. Every capture goes to a pipe, so the CLI is by
definition not writing to a TTY, and a tool that checks `isatty` passes with no special handling.

**The third invocation is the machine-mode half of the rule.** It binds when output is not a
terminal _or_ when [machine mode](../../concepts/machine-mode.md) is active, and those are
separate switches in more than one framework — so a tool can strip colour for a pipe and keep it
for its own JSON, which is a violation no pipe-only probe can reach.

**Not established:** the `NO_COLOR`, `--no-color` and `TERM=dumb` clauses. They bind only when a
TTY **is** present, and every probe captures to a pipe, so they are unreachable rather than
unimplemented — a pass here says nothing about them.

**Reports `unverified`** when no probe was recorded, when a capture hit the output ceiling
without an escape appearing in the prefix, and when a probe died on a signal — output a target
never finished writing is not output shown to be escape-free; see [probing](../../concepts/probing.md#a-probe-the-kit-killed-is-not-a-probe-the-target-failed).

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
