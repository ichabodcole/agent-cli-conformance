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
  - machine mode is selected explicitly so the piped-default resolution path that the same defect most often breaks is never exercised
  - only an unrecognised flag provokes the error so a missing value or a missing required argument or an out-of-set value is not
  - only the --json and --format=json selectors are probed so a machine mode advertised through --output is not
  - the answer is only required to parse and is never checked against a declared envelope shape
  - that the invocation failed to PARSE is inferred from a non-zero exit rather than observed
  - NDJSON is reported unverified rather than failed because no output kind is declared at L0
coverage_established:
  - for a target whose root help advertises --json or --format an unrecognised flag sent alongside an explicit machine-mode selector leaves at least one stream whose whole content parses as exactly one JSON document
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

Every token begins with `-`, so the invocation satisfies the inertness gate's `no-verb` class,
and the first carries the sentinel, so it satisfies its `sentinel` class as well — admissible
twice over under the gate exactly as it stands. `--format` is sent attached because it takes a
value, which is the spelling [`inert.ts`](../../../../src/acc/kit/inert.ts) already whitelists.
`--output` is refused as a selector: it names an output **file** at least as often as an output
format, and a probe whose meaning depends on which sense a target implements is not a probe.

The sentinel flag is sent **first**, deliberately. That is the order in which a caller's mistake
actually arrives, and a target that resolves its format only from tokens it managed to parse
before stopping is the defect this rule is named for.

Passes when at least one non-empty stream parses **whole** as exactly one JSON document. Fails
when the failure comes back as prose, or with nothing on either stream — silence is not a shape.
NDJSON is reported **unverified**, on the same terms as [B3](./machine-output-is-parseable.md):
nothing was declared, so a stream of valid records is a plausible design rather than a violation
of a contract nobody was asked to state.

**Where the invocation does not fail at all**, the checker reports **unverified**. A target that
exits `0` here accepted the unknown flag — [A1](../parsing/unknown-flag-exits-nonzero.md)'s
violation, on a path where this rule's subject never occurred. Convicting it here would report one
defect twice under a rule that was never reached.

**The selection gap is the one to read before trusting a pass**, and it is first on the list
below. This probe selects machine mode **explicitly**. The archaeology's own implementation note
records a fix that repaired exactly that row and left the **no-flag-piped** row broken — which is
the row that matters most, because piped output already defaults to machine mode and a tool's own
emitted commands pass no format flag at all. Reaching that row means comparing two invocations
that differ only in the flag, which this checker does not do.

## Current checker coverage

[`machine-mode-holds-on-parser-error.ts`](../../../../src/acc/kit/checkers/streams/machine-mode-holds-on-parser-error.ts)
— `L0`, `coverage: partial`. A pass means nothing under **Established** was violated; the **Gaps**
are the rest of this page, unexamined.

**Established**

- for a target whose root help advertises --json or --format an unrecognised flag sent alongside
  an explicit machine-mode selector leaves at least one stream whose whole content parses as
  exactly one JSON document

**Gaps**

- machine mode is selected explicitly so the piped-default resolution path that the same defect
  most often breaks is never exercised
- only an unrecognised flag provokes the error so a missing value or a missing required argument
  or an out-of-set value is not
- only the --json and --format=json selectors are probed so a machine mode advertised through
  --output is not
- the answer is only required to parse and is never checked against a declared envelope shape
- that the invocation failed to PARSE is inferred from a non-zero exit rather than observed
- NDJSON is reported unverified rather than failed because no output kind is declared at L0

## How to comply

Resolve the mode **before** the parser can fail, from the raw argv, and hand the resolved mode to
one emitter that every exit path goes through. The fix that only patches the parser's error
handler leaves the next parser error — a missing value, an out-of-set value, an arity violation —
to be found separately.

Do **not** resolve machine mode by matching the literal string `json` in the argv the parser
accepted. The archaeology's eight-cell matrix showed parser errors not participating in format
resolution **at all**, so a literal-match repair fixes the explicit-flag row and leaves the
piped-default row exactly as broken as before. `acc`'s own early-mode resolution reads the whole
argv plus the TTY state before any parsing happens, which is the shape that works.

A repeated `--format` must resolve **last wins**, or the same argv yields two verdicts depending
on which code path saw it.

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
