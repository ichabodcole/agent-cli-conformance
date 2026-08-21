---
type: rule
title: Machine mode holds on the parser-error path
description:
  Machine mode that survives every failure except the parser's fails on the one an agent hits
  most — a wrong flag is the commonest way an agent gets a command wrong.
tags: [streams, machine-mode, errors, core]
related: [concept/machine-mode, concept/error-envelope, rule/machine-output-is-parseable]
status: stable
generated: { by: claude-opus-5, at: 2026-08-16 }
rule_id: B5
tier: core
probe_level: L0
checker: src/acc/kit/checkers/streams/machine-mode-holds-on-parser-error.ts
checker_status: implemented
coverage: partial
coverage_gaps:
  - a flag spelled like a machine-mode selector is only treated as one once a document came back under it somewhere so a target whose advertised selector emits prose on every path this kit reaches is reported unverified rather than failed
  - machine mode is selected explicitly unless the target declared it the default so for an undeclared target the piped-default resolution path that the same defect most often breaks is never exercised
  - only an unrecognised flag provokes the error so a missing value or a missing required argument or an out-of-set value is not
  - only the --json and --format=json selectors are probed so a machine mode advertised through --output is not
  - the answer is only required to parse and is never checked against a declared envelope shape
  - that the invocation failed to PARSE is inferred from a non-zero exit rather than observed
  - NDJSON is reported unverified rather than failed because no output kind is declared at L0
coverage_established:
  - for a target whose root help advertises --json or --format or which declares machine mode its default an unrecognised flag leaves at least one stream whose whole content parses as exactly one JSON document
---

# Machine mode holds on the parser-error path

## The rule

When [machine mode](../../concepts/machine-mode.md) is selected, **every outcome MUST** be
emitted in the declared machine shape — including a failure raised by the **argument parser**,
before any command has been dispatched.

A CLI **MUST NOT** answer a parse failure with a usage screen, a raw stack trace, or any other
prose when a machine-readable mode is active. What arrives **MUST** be a parseable document.

Machine mode **MUST** be resolved from the whole invocation, not from the tokens the parser
happened to accept before it stopped. A tool whose parse errors bypass format resolution
altogether satisfies nothing here — it merely fails in a way that is harder to see.

This rule governs the **shape** of the answer. Which stream may carry it is
[B1](./stdout-carries-only-data.md)'s subject, and the two are deliberately separate: a target
answering with a valid envelope on stdout satisfies this rule and violates that one, which is one
defect reported once by each rule that governs half of it.

## How to comply

The defect is one of **ordering**: the parser fails before the output layer is configured, so
there is nothing to emit into. Resolve the mode from the **raw argv** before the parser runs, and
hand it to one emitter that every exit path goes through. A fix that only patches the parser's
error handler leaves the next parser error — a missing value, an out-of-set value, an arity
violation — to be found separately.

**If you use `commander`, the hooks are `exitOverride()` and `configureOutput()`** — the pair the
survey verified as its in-process error path
([§2.2](../../../research/2026-08-13-frameworks-languages.md)). `exitOverride()` makes a parse
failure **throw** a `CommanderError` carrying `code` (`commander.unknownOption`) and `exitCode`
rather than exiting the process; `configureOutput({ writeErr })` **captures** the diagnostic
commander would otherwise have printed (`error: unknown option '--bogus'`), so it becomes the
envelope's `message` instead of prose beside it. [`acc` uses exactly this
pair](../../../../src/acc/cli.ts) — with one trap worth copying: `exitOverride()` also throws for
`--help` and `--version`, which are requests that **succeeded**, so classify
`commander.helpDisplayed` and `commander.version` before treating a throw as failure.

**Same shape, other hooks.** `clap`: `try_parse_from` returns a `Result` instead of printing and
exiting, so you render the `Error` yourself. `kong`: inject a `kong.Exit` function. `node:util
parseArgs`: it throws a raw `TypeError` (`ERR_PARSE_ARGS_UNKNOWN_OPTION`) and does no exit
handling at all, so the whole error path is already yours.

**No surveyed framework emits an error envelope**, and `--json` in `gh`, `docker` and `kubectl`
formats only the _success_ payload — only `cargo`, `terraform`, `oclif`/`sf` and `vercel`
structure errors at all
([case studies §3.4](../../../research/2026-08-13-case-studies.md)). Whichever parser you use,
the emitter is yours to write; the work is routing the parser's own errors through it.

Do **not** resolve machine mode by matching the literal string `json` in the argv the parser
accepted. The archaeology's eight-cell matrix showed parser errors not participating in format
resolution **at all**, so a literal-match repair fixes the explicit-flag row and leaves the
piped-default row exactly as broken as before. `acc`'s `earlyMode` reads the whole argv — both
`--format=json` and `--format json`, since matching only the separated spelling silently dropped
a format the caller had stated — then falls through to the env var and the TTY, all before
commander sees a token.

A repeated `--format` must resolve **last wins**, or the same argv yields two verdicts depending
on which code path saw it.

## Why

`--format json` is a promise about **every** outcome, and the outcome an agent reaches most often
is the one it gets wrong. A wrong flag is the commonest way an agent mis-invokes a command, so the
parser-error path is the highest-traffic failure surface in any CLI an agent drives — and it is
the path most likely to be written before the emitter exists, because it lives in the parser
rather than in a command.

The failure mode is worse than a missing feature. An agent that pipes a tool and branches on
`.ok` does not get a degraded signal on this path, it gets `undefined` — and a caller that wraps
the invocation in `JSON.parse` gets an exception whose message is about a syntax error at position
0, which names nothing about what actually went wrong. The archaeology's sharpest instance is a
whole team consuming non-envelopes on the **most-executed command in the product** without anyone
noticing, because every consumer's error handling was reached through a path that never ran.

That it is easy to miss is the argument for a rule rather than a review note: the same repository
fixed this class **twice independently**, four days apart, on two branches, with
differently-named helpers, and both landed. Two people each found it alone because nothing was
watching.

## The probe

Inert (`L0`) — an unrecognised flag alongside the machine-mode flag the target advertises.

```
<cli> --acc-probe-xyzzy-flag --json          # or --format=json
```

The sentinel flag is sent **first**, deliberately: that is the order in which a caller's mistake
actually arrives, and a target that resolves its format only from the tokens it managed to parse
before stopping is the defect this rule is named for. Every token begins with `-` and the first
carries the sentinel, so the invocation is admissible twice over under the
[inertness gate](../../concepts/probing.md#inertness-classifies-an-invocation-it-does-not-make-the-run-safe).

`--output` is not accepted as a selector. It names an output **file** at least as often as an
output format, so a target advertising machine mode only that way is never probed here — the third
[gap](#current-checker-coverage) below.

**A target that is machine-first sends no selector at all**, and that path is the more important
one. A CLI whose data commands emit JSON unless asked for prose declares
`"machineMode": "default"` in [`acc.config.json`](../../concepts/conformance.md), and the probe
becomes the bare unrecognised flag:

```
<cli> --acc-probe-xyzzy-flag                 # machine mode declared the default
```

That is the same invocation [A1](../parsing/unknown-flag-exits-nonzero.md) already sends, so the
recorder deduplicates them and the declaration costs no extra spawn.

It also closes this rule's first gap rather than widening the rule. Selecting machine mode
explicitly never exercises the **piped-default resolution path** — the row where a tool's own
emitted commands pass no format flag at all, and the row the archaeology says the same defect most
often breaks. A declared default _is_ that row.

The declaration is falsifiable, which is why it is a declaration and not an inference: a target
that claims machine mode by default and answers a parser error in prose fails here. That is the
rule working, not a mis-declaration being punished.

**A flag spelled like a selector is not yet a selector.** Discovery finds `--json` by reading it
out of help, and the name does not tell it the meaning: `--json <file>   Treat the input file as
JSON` is a real and common help entry, and so are `--format` for a source-code formatter and
`--output` for a destination path. A CLI shaped that way is text-only, answers every probe in
prose, and has broken nothing — so before this rule may condemn anything under a selector, a
**document** has to have come back under it. Not merely something that parses: `JSON.parse`
accepts bare scalars, so a plain-text `--version` printing `1.4` would otherwise corroborate its
own selector.

This checker DECLARES both `<cli> --help <selector>` and `<cli> --version <selector>` so its
evidence is complete on its own, and consults the question only on the two paths that CONDEMN —
never on the pass. Placement is the whole of it and has been wrong in both directions: too late,
and a target that rejects the sentinel silently is failed with the words "machine mode via
`--json`" on a selector the same run reports as unestablished; too early, and a CLI whose machine
mode is real only on the error path answers this rule's own probe with a document and is told
nothing came back under the flag.

**A declared default is exempt**, and only the flag route is gated. The premise there is a
declaration rather than an inference about a flag name, and a target that declares machine mode its
default while advertising `--json` has said the flag is a mode selector.

This rule judges neither of those, so it takes both routes. Uncorroborated, the **selector**
route reports `unverified`; a declared default is untouched, because a declaration is not an
inference and there is no flag to have misread. The check runs before any other verdict on the
selector route, so a target that rejects the sentinel silently is not failed with the words
"machine mode via `--json`" on a selector the same run reports as unestablished.

The cost is stated in the [gaps](#current-checker-coverage): a genuinely broken CLI whose
`--json` is meant as a selector but emits prose on every path is no longer condemned here,
because from outside it is indistinguishable from the innocent one. That is the trade this kit
takes everywhere — inference may decide what to look at, only observation may condemn.

**Passes** when at least one non-empty stream parses **whole** as exactly one JSON document.
**Fails** when the failure comes back as prose, or with nothing on either stream — silence is not
a shape.

**Reports `unverified`** for NDJSON, on the same terms as
[B3](./machine-output-is-parseable.md): nothing was declared, so a stream of valid records is a
plausible design rather than a violation of a contract nobody was asked to state.

**Reports `unverified` where the invocation does not fail at all.** A target that exits `0` here
accepted the unknown flag — [A1](../parsing/unknown-flag-exits-nonzero.md)'s violation, on a path
where this rule's subject never occurred. Convicting it here would report one defect twice under a
rule that was never reached.

**The selection gap is the one to read before trusting a pass**, and it is first on the list
below. This probe selects machine mode **explicitly**, and the row that matters most is the other
one: piped output already defaults to machine mode and a tool's own emitted commands pass no
format flag at all, so the piped-default resolution path is where this defect most often survives
a fix. Reaching it means contrasting two invocations that differ only in the flag, which this
checker does not do.

## Current checker coverage

[`machine-mode-holds-on-parser-error.ts`](../../../../src/acc/kit/checkers/streams/machine-mode-holds-on-parser-error.ts)
— `L0`, `coverage: partial`. A pass means nothing under **Established** was violated; the **Gaps**
are the rest of this page, unexamined.

**Established**

- for a target whose root help advertises --json or --format or which declares machine mode its default an unrecognised flag leaves at least one stream whose whole content parses as exactly one JSON document

**Gaps**

- a flag spelled like a machine-mode selector is only treated as one once a document came back
  under it somewhere so a target whose advertised selector emits prose on every path this kit
  reaches is reported unverified rather than failed
- machine mode is selected explicitly unless the target declared it the default so for an undeclared target the piped-default resolution path that the same defect most often breaks is never exercised
- only an unrecognised flag provokes the error so a missing value or a missing required argument
  or an out-of-set value is not
- only the --json and --format=json selectors are probed so a machine mode advertised through
  --output is not
- the answer is only required to parse and is never checked against a declared envelope shape
- that the invocation failed to PARSE is inferred from a non-zero exit rather than observed
- NDJSON is reported unverified rather than failed because no output kind is declared at L0

## Evidence

Measured against this repository's own CLI:

```
$ acc --acc-probe-xyzzy-flag --json
exit=2   stdout empty
stderr   {"ok":false,"error":{"kind":"usage","exit_code":2,"message":"unknown option '--acc-probe-xyzzy-flag'","choices":[...]}}
```

The defect population — five commits in one repository, two independent fixes, and the class in
its absolute form across a second — is catalogued as class 4 in
[`research/2026-08-15-defect-archaeology.md`](../../../research/2026-08-15-defect-archaeology.md),
alongside the measurement that gives the rule its urgency: `ok:true` counted **112 times and
`ok:false` zero** across one tree, with every failure printing prose. A piping agent receives
`ok:true` and exit 0 — not a degraded signal but no signal, and a positively reassuring one.
