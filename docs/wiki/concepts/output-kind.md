---
type: concept
title: Output kind
description:
  Whether a command returns one document, a stream of records, or opaque bytes — declared, so
  a caller never has to guess how to read it.
tags: [output, streaming, schema, contract]
related: [concept/machine-mode, rule/machine-output-is-parseable]
status: current
updated: 2026-08-15
---

# Output kind

## What it is

A conforming CLI **declares** how each command's stdout is shaped in
[machine mode](./machine-mode.md). Nothing emits that declaration today, and the consequences of
its absence are [below](#why-it-matters-for-agents) — so read this table as the contract the
spec proposes, not as a field readable off a real tool:

| `output_kind` | stdout is                                                | Also declares   |
| ------------- | -------------------------------------------------------- | --------------- |
| `data`        | exactly one JSON document                                | `cardinality`   |
| `stream`      | one JSON object per line (NDJSON), flushed incrementally | `stream_format` |
| `opaque`      | raw bytes — an image, an archive, a signature            | `media_type`    |

`data` is the default and covers most commands. `stream` is for anything unbounded in time —
event tails, log follows, progress feeds. `opaque` is for content that is not JSON at all.

## Why it matters for agents

Because without a declaration, the caller has to guess — and the guess is not stable across
commands of the same tool.

Docker demonstrates the whole problem inside one binary. Under the same `--format json` flag:

```
docker version   →  a single JSON object
docker ps        →  NDJSON, one object per line, no enclosing array
docker inspect   →  a JSON array
```

An agent that learns one shape gets surprised by the next. Worse, this is now unfixable:
asked to make `docker ps` emit valid JSON, a maintainer replied that "for compatibility
reason, this can't be fixed" — users depend on the current behaviour. The inconsistency is
permanent because it was never declared, only observed.

Declaring `output_kind` is what would turn that mismatch into a **testable claim** rather than a
discovery — and the declaration is the part that does not exist yet.

**What is true today.** No third-party CLI declares an `output_kind`, there is no portable format
for one to declare it in, and the kit therefore has nothing to check the bytes against. What
[B3](../rules/streams/machine-output-is-parseable.md) does is narrower, and shaped by exactly
that absence: it asks a target's machine-mode help for output and requires the whole stdout
stream to parse as one JSON document. Stdout that parses as NDJSON comes back `unverified`
rather than `fail` — B3's own coverage gap records it — because failing a tool for a shape it
was never asked to state would be punishing it for the missing declaration rather than for its
output.

**Planned.** Reading a declaration and checking bytes against it needs somewhere for the target
to state one, which is the portable declaration IR at
[roadmap step 6](../../roadmap.md#6-r4-7--the-portable-declaration-ir). Everything below
describes the contract this spec proposes and what a conforming CLI would declare — not a
measurement the kit performs today.

## The details

### Why `data` cannot simply mean "valid JSON"

The strongest possible rule — _the entire stdout stream must parse as one JSON document_ — is
worth wanting, because it turns any stray `console.log` anywhere in the codebase into an
immediate hard failure rather than a lint warning. That is a complete, mechanical defence
against stdout pollution, and it needs no discipline to maintain.

But it cannot be universal, because a `stream` command emits indefinitely and there is no
"one document" for an unbounded stream. So the strong rule applies **per declared kind**:

- `data` → the whole stream parses as one document
- `stream` → every line parses as one object, and the first line arrives promptly
- `opaque` → no JSON is expected on stdout at all, but the
  [error envelope](./error-envelope.md) contract still binds on stderr

### Cardinality, and why unbounded output needs pagination

A `data` command additionally declares whether it returns:

- `single` — one record
- `bounded` — a caller-controlled or small closed set
- `unbounded` — an open-ended collection

`unbounded` therefore calls for pagination arguments, a field-selection argument, and an
in-band truncation signal. This is a context-window concern, not an aesthetic one: a command
that dumps ten thousand records into an agent's context has failed even though every byte was
valid.

**Design guidance, not a rule.** No rule page states that obligation and no checker measures it,
so a CLI that ignores this paragraph entirely is still conformant. It is also the clause with
the most work in front of it — pagination is meaningful only for the profiles that have
unbounded output, which the spec does not yet declare. See the
[roadmap](../../roadmap.md#design-guidance-that-is-not-yet-normative).

### Narrowing is not exemption

Declaring `opaque` excuses a command from emitting JSON on stdout. It does not excuse it from
exit codes, stream discipline, or structured errors. A narrower declaration buys a narrower
obligation, never a smaller contract.

## Related rules

- [Machine output must be parseable as declared](../rules/streams/machine-output-is-parseable.md)
- [Diagnostics never appear on stdout](../rules/streams/stdout-carries-only-data.md)
