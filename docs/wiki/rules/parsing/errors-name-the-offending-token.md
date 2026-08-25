---
type: rule
title: Errors name the offending token
description:
  "Invalid arguments" tells a caller that something is wrong; naming the token tells it what to
  change.
tags: [parsing, errors, remediation, core]
related: [concept/error-envelope, rule/unknown-flag-exits-nonzero]
status: stable
generated: { by: claude-opus-5, at: 2026-08-16 }
rule_id: A3
tier: core
deviation: defect
probe_level: L0
checker: src/acc/kit/checkers/parsing/names-offending-token.ts
checker_status: implemented
coverage: partial
coverage_gaps:
  - the machine-mode field is any string value anywhere in the document because no declaration exists at L0 to name the envelope field the rule requires
  - only an unknown flag and an unknown verb are probed
  - the SHOULD to enumerate a closed set as choices is not exercised
  - the assertion is that the sentinel substring reached stderr and not that the whole offending token appears verbatim
  - the verb probe assumes the first positional selects a subcommand so a target that reads it as free-form data is judged for not naming a token it never rejected
coverage_established:
  - the stderr of an unknown root flag rejection contains the probe's sentinel string
  - the stderr of an unknown root verb rejection contains the probe's sentinel string
  - for a target that advertises a machine-mode flag and answers a parser error with a parseable document some string value inside that document contains the sentinel
---

# Errors name the offending token

## The rule

When a CLI rejects an invocation because of a specific token — an unknown flag, an
unrecognised verb, an out-of-range value, a malformed identifier — the diagnostic **MUST**
contain that token verbatim.

In [machine mode](../../concepts/machine-mode.md) it **MUST** additionally appear as a field
in the [error envelope](../../concepts/error-envelope.md), not only inside the prose
`message`.

Where the valid alternatives form a closed set, the CLI **SHOULD** enumerate them in a
`choices` field.

## How to comply

Nearly free on the prose half — every framework surveyed that rejects a token names it in its
default message: `commander` (`error: unknown option '--nonexistent-flag'`), `clap`
(`unexpected argument '--bogus' found`), `cobra` (`unknown flag: --bogus`), `kong`
(`unknown flag --nonexistent`), `click` (`No such option '--bogus'.`), `argparse`
(`unrecognized arguments: --nonexistent`), Swift ArgumentParser (`Unknown option '--form'.
Did you mean '--format'?`). The work is in the three things the parser does not do for you.

**Print the framework's message, or interpolate the token into your own.** A handler that
catches a parse error and re-raises `invalid arguments` discards exactly what this rule
requires. Two measured near-misses: `cac` throws an uncaught `CACError` whose Bun-rendered
stack trace buries the token among library source lines, and `clipanion` v4 answers an unknown
option with `Unknown Syntax Error: Unsupported option name` — the captured message names no
token — written to **stdout**, which is not where this rule's probe reads. (`plumbum.cli`
writes usage errors to stdout too.)

**Declare closed sets to the parser and `choices` comes free.** `clap`'s `value_enum` prints
`[possible values: json, text]`; Swift ArgumentParser prints `Please provide one of 'json',
'text' or 'yaml'`; `kong`'s `enum` tag prints `--mode must be one of "fast","slow"`. If you
validate a set by hand — `commander`'s `.choices([...])`, `click.Choice`, or post-parse
checks over `node:util parseArgs` — write the enumeration into the message yourself. `gh` is
the case study to copy: `gh pr list --json` with no field list answers by listing every legal
field.

**The machine-mode field is yours in every framework.** No surveyed parser emits an error
envelope; `oclif`'s `toErrorJson` / `CLIError` is the closest, and it carries `code`,
`suggestions` and `ref` but no token field. Add one, and keep it a field rather than a
substring of `message`.

## Why

A rejection the caller cannot act on is barely better than no rejection at all. `Error:
invalid arguments` is correct, non-zero, and useless: the agent knows it failed but not which
of five flags was wrong, so its only recourse is to vary them one at a time.

Naming the token converts a failure into a fix. Adding `choices` converts it into a _certain_
fix — the agent stops guessing entirely, because the valid set was handed to it. That is why
this rule matters disproportionately for flag hallucination: the correction arrives at exactly
the moment the caller has demonstrated it needs one, and costs nothing on the success path.

Putting it in a field rather than only in prose matters for the same reason exit codes matter.
Prose gets rewritten; a field is a contract.

## The probe

Inert (`L0`).

```
<cli> --acc-probe-xyzzy-flag
<cli> acc-probe-xyzzy-verb
<cli> --acc-probe-xyzzy-flag --json      # where help advertises a machine-mode flag
```

**The first two pass** when stderr contains the offending token, checked as a plain substring
match, mode-agnostic. The token sent is the kit's
[sentinel](../../concepts/probing.md#inertness-classifies-an-invocation-it-does-not-make-the-run-safe),
distinctive enough that a match is evidence the tool echoed it rather than coincidence.

**The third probe is the envelope half** — the clause the rule's machine-mode sentence turns on.
It is byte-identical to [B5](../streams/machine-mode-holds-on-parser-errors.md)'s, so both rules
read [one observation](../../concepts/probing.md#probes-are-shared-and-a-rule-may-declare-none)
of a single answer rather than two runs that could disagree.

It is read by walking the **parsed** document for a string **value** containing the token, never
by searching the bytes — a token present in the raw output but in no value does not satisfy it.
Three outcomes, and the middle one matters:

- the document carries the token in a value → the clause holds
- the document parses and carries it nowhere → **fail**
- no parseable document was produced → **unverified**, and B5 reports that as its own violation.
  A target that answered a parse error with prose did not put the token in the wrong field; it
  published no fields at all.

**What the closure still does not reach**, and it is the first gap below. With nothing declared
at `L0` there is no envelope schema to name a field in, so the assertion is the weaker "some
string value somewhere in the document contains it". A target burying the token in a free-text
`detail` satisfies this and not the rule — the same
[`L1` boundary](../../concepts/probing.md#what-it-is)
[D1](../discoverability/version-flag-exists.md)'s version field and
[B3](../streams/machine-output-is-parseable.md)'s output kinds stop at.

## Current checker coverage

[`names-offending-token.ts`](../../../../src/acc/kit/checkers/parsing/names-offending-token.ts) — `L0`,
`coverage: partial`. A pass means nothing under **Established** was violated; the **Gaps** are
the rest of this page, unexamined.

**Established**

- the stderr of an unknown root flag rejection contains the probe's sentinel string
- the stderr of an unknown root verb rejection contains the probe's sentinel string
- for a target that advertises a machine-mode flag and answers a parser error with a parseable
  document some string value inside that document contains the sentinel

**Gaps**

- the machine-mode field is any string value anywhere in the document because no declaration
  exists at L0 to name the envelope field the rule requires
- only an unknown flag and an unknown verb are probed
- the SHOULD to enumerate a closed set as choices is not exercised
- the assertion is that the sentinel substring reached stderr and not that the whole offending token
  appears verbatim
- the verb probe assumes the first positional selects a subcommand so a target that reads it as free-form data is judged for not naming a token it never rejected

## Evidence

All five CLIs surveyed (`git`, `docker`, `kubectl`, `gh`, `cargo`) name the offending flag on
stderr. This is the one aspect of failure handling the industry agrees on — which is why it is
Core rather than aspirational.

The `choices` half comes from Vercel's agent-mode envelope, which enumerates valid options so
the agent resolves the problem itself instead of retrying blind. See
[error envelope](../../concepts/error-envelope.md#choices-is-just-in-time-discovery).
