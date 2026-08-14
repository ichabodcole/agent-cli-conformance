---
type: rule
title: Machine output parses as its declared kind
description:
  Requiring the whole stdout stream to parse turns any stray debug print into a hard failure
  instead of a code-review question.
tags: [streams, machine-mode, output, core]
related: [concept/output-kind, concept/machine-mode, rule/stdout-carries-only-data]
status: current
updated: 2026-08-14
rule_id: B3
tier: core
probe_level: L0
checker: src/acc/kit/checkers/streams/machine-output-parseable.ts
checker_status: implemented
coverage: partial
coverage_gaps:
  - the undeclared-output default of data is not enforced at L0 so NDJSON is reported unverified rather than failed
  - only machine-mode help is parsed and never a data command
  - shape stability across invocations and across commands is not compared
---

# Machine output parses as its declared kind

## The rule

In [machine mode](../../concepts/machine-mode.md), a command's **entire stdout stream** — not
a subset of its lines — **MUST** parse according to its declared
[output kind](../../concepts/output-kind.md):

| `output_kind` | Requirement                                                      |
| ------------- | ---------------------------------------------------------------- |
| `data`        | the whole stream parses as exactly one JSON document             |
| `stream`      | every line parses as one JSON object; the first arrives promptly |
| `opaque`      | no JSON is expected on stdout; `media_type` is declared          |

Where nothing is declared, `data` is assumed.

A command **MUST NOT** vary its output shape between invocations, and a tool **MUST NOT** vary
it between commands under the same flag.

## Why

Two distinct reasons, and the second is the one that earns the rule its strictness.

**Predictability across the tool.** Docker demonstrates the cost of omitting this, in one
binary, under one flag: `docker version` returns a single object, `docker ps` returns NDJSON,
`docker inspect` returns an array. An agent that learns one shape is wrong about the next two.
This is now permanent — asked to make `docker ps` emit valid JSON, a maintainer answered that
"for compatibility reason, this can't be fixed", because callers depend on the current shape.
An undeclared contract still becomes a contract; it just becomes one nobody chose.

**Whole-stream parsing is a total defence against stdout pollution.** If the requirement were
"the JSON payload must be valid", a stray `console.log` elsewhere in the process would sit
harmlessly beside it and the payload would still parse. Requiring the _entire_ stream to parse
means one stray print anywhere in the codebase — a leftover debug line, a library writing to
stdout, a warning emitted on the wrong stream — **breaks the parse and fails the test.**

That converts a whole class of bug from "caught by review, sometimes" to "caught by CI,
always", and it needs no vigilance to maintain. It is the cheapest tier-2 enforcement in the
catalog.

## The probe

Inert (`L0`) — help output in machine mode, where such a path exists.

```
<cli> --help --json          # or the tool's discovered machine-mode flag
```

One probe. A `<cli> schema` probe would be the natural second one, but it is not implemented
and is not safe to add at `L0`: `schema` is a real verb, and the inertness gate refuses any
invocation carrying a real verb precisely because a CLI that does not recognise it will run
whatever it does recognise. Establishing that a discovered verb has no effects is `L1` work.

Note also that `--format` is not treated as a machine-mode selector here even when discovery
finds it: it takes a value, and a bare value token is indistinguishable from a verb without
knowing the flag's arity. Only the `--json` pairing with `--help` is `L0`-safe.

Passes when the captured stdout parses whole, as the declared kind.

Under `L0` nothing is declared, so the checker reports valid NDJSON as **`unverified`** rather
than failing it: a stream of valid NDJSON is a plausible legitimate design, and failing it
without a declaration would punish a tool for a choice it was never asked to state. Once the
tool declares `output_kind`, the same probe becomes a hard `L1` check against the declaration.

Two things that is **not**. The rule stays **core** — nothing about the NDJSON case downgrades
the tier, and a failure here still makes a target non-conformant. And `unverified` is not a
diagnostic failure: it is the verdict for "the probe ran and established neither answer", so it
blocks [full verification](../../concepts/conformance.md) without blocking conformance. The
sentence above — undeclared output defaults to `data` — is the normative rule, and this is the
one place the `L0` checker does not enforce it.

Where no machine-mode flag can be discovered, the checker reports **unverified** and raises
[help advertises machine mode](../discoverability/help-advertises-machine-mode.md) instead.

## Current checker coverage

[`machine-output-parseable.ts`](../../../../src/acc/kit/checkers/streams/machine-output-parseable.ts) — `L0`,
`coverage: partial`. A pass means nothing under **Established** was violated; the **Gaps** are
the rest of this page, unexamined.

**Established**

- machine-mode help parses whole as exactly one JSON document, for a target whose help advertises
  `--json`.

**Gaps**

- the undeclared-output default of data is not enforced at L0 so NDJSON is reported unverified
  rather than failed
- only machine-mode help is parsed and never a data command
- shape stability across invocations and across commands is not compared

## How to comply

Route all stdout writes through one emitter (see
[stdout carries only data](./stdout-carries-only-data.md)) and give it the declared kind. Then
`data` commands physically cannot emit two documents, because there is one place that writes.

For `stream`, flush per record. A stream that buffers until completion is indistinguishable
from a slow `data` command, and defeats the purpose for a caller that wanted incremental
results.

## Evidence

The Docker shape inconsistency and the maintainer's compatibility response were both recorded
during the case-study survey — see
[`research/01-case-studies.md`](../../../../research/01-case-studies.md).

The whole-stream technique comes from the enforcement research, which classified it as a
distinct tier: not "impossible to express" and not merely "caught by a test you remembered to
write", but **self-detecting** — a defect that trips the existing check automatically, wherever
in the codebase it originates. See
[`research/04-testing-enforcement.md`](../../../../research/04-testing-enforcement.md).
