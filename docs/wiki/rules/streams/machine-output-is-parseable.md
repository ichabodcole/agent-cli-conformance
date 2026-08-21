---
type: rule
title: Machine output parses as its declared kind
description:
  Requiring the whole stdout stream to parse turns any stray debug print into a hard failure
  instead of a code-review question.
tags: [streams, machine-mode, output, core]
related: [concept/output-kind, concept/machine-mode, rule/stdout-carries-only-data]
status: stable
generated: { by: claude-opus-5, at: 2026-08-14 }
rule_id: B3
tier: core
probe_level: L1
checker: src/acc/kit/checkers/streams/machine-output-parseable.ts
checker_status: implemented
coverage: partial
coverage_gaps:
  - a machine mode is reached only through a declaration so a target with a real machine mode that never declares one is not checked for it at all
  - the undeclared-output default of data is not enforced at L0 so NDJSON is reported unverified rather than failed
  - shape stability across invocations and across commands is not compared
  - the stream and opaque output kinds are never exercised because no declaration exists at L0 to select them
coverage_established:
  - nothing at L0 — this rule is L1 and reports not-applicable until a declaration names a command whose output it may read
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

## How to comply

No surveyed framework serializes your payload for you, so there is no library switch that
delivers this rule. The one machine-output setting in the survey is `oclif`'s per-command
`enableJsonFlag`, serialized into the published `oclif.manifest.json` — and it declares only
that the command accepts `--json`, not what the command writes. The work is therefore in two
halves: stop everything that is not the payload from reaching stdout, and pin one shape per
command.

Route all stdout writes through one emitter (see
[stdout carries only data](./stdout-carries-only-data.md)) and give it the declared kind. Then
`data` commands physically cannot emit two documents, because there is one place that writes.
Below that, the contamination paths and shape hazards the survey actually measured.

**If you use `cobra`, set `Args` on every node — root, group and leaf.** `Args` defaults to
`nil`, which means "accept anything", and a non-runnable group with a nil `Args` answers a
mistyped subcommand by **printing help text to stdout and exiting 0**. `cobra.NoArgs` on each
node closes it; there is no global strict switch, so a node added later reopens the hole. Do
not enable `FParseErrWhitelist.UnknownFlags`, which additionally swallows the unknown flag's
value.

**If you use `clipanion` v4 or `plumbum.cli`, the parser writes usage errors to stdout.**
Both were measured doing it — `plumbum.cli` leaves stderr empty entirely. A usage error on
stdout is not a diagnostic a caller can ignore; it is a byte in the document the caller is
parsing. Intercept the parser's error path and re-emit on stderr before it reaches the caller,
or pick a different parser. (Neither was measured with a machine-output mode, so what they do
under one is unestablished.)

**Capture the stdout of anything you shell out to.** Cargo publishes the honest caveat here:
`--message-format=json` "only controls Cargo and Rustc's output. This cannot control the
output of other tools", and its suggested workaround pushes the repair onto the consumer —
"only interpret a line as JSON if it starts with `{`". Do not ship that burden. Pipe the
child's stdout, and re-emit it on stderr or as a field in your own payload.

**Gate machine mode on the mode flag, never on `isatty()`.** `gh` prints its "no results"
explanation only when stdout is a TTY, and agent harnesses commonly allocate a PTY — so the
TTY test selects the human branch for exactly the caller this rule protects. Terraform is the
shape to copy: `terraform plan -json` implies `-input=false`, so selecting machine output
switches off the interactive path rather than inferring it from the terminal.

**One command, one shape; one shape, one spelling.** Docker is the measured counter-example
twice over: `docker ps -a --format json` and `--format '{{json .}}'` return _different values_
for the same key, and `--format json` emits NDJSON for list commands but a single object for
scalar ones, so a caller needs different parsing rules per command. Every spelling of your
machine flag must reach one code path, and a command's kind must not depend on how many
results it found.

**For `stream`, flush per record and end with a terminal record.** A stream that buffers until
completion is indistinguishable from a slow `data` command, and defeats the purpose for a
caller that wanted incremental results. Cargo's `--message-format=json` closes with
`{"reason": "build-finished", "success": true|false}`, so a streaming consumer learns the
outcome from the stream and not only from the exit code. Terraform's `-json` gives each line
a fixed envelope — `@level`, `@message`, `@timestamp`, and a `type` discriminator for the
rest of the keys — which lets a consumer route a line before it understands the line.

**Carry the format version in the payload.** Terraform's `format_version`, and
`cargo metadata`'s `--format-version=1` echoed back as `"version": 1`, are the two surveyed
mechanisms; cargo additionally warns when the consumer has not pinned. Either way the version
is a field in the document this rule requires to parse whole, which is why it belongs here
rather than in release notes.

For `opaque`, the requirement is only that you declare `media_type` and write nothing else to
stdout — no surveyed tool declares a media type for its machine output, so there is no prior
art to copy.

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

**No probe.** This rule is `L1`: at `L0` it sends nothing and reports not-applicable.

```
<cli> --help --json          # or the tool's discovered machine-mode flag
```

**One probe.** `<cli> schema` would be the natural second one, but `schema` is a real verb and
[a probe omits a verb wherever it can](../../concepts/probing.md#inertness-classifies-an-invocation-it-does-not-make-the-run-safe).
`--format` is not treated as a machine-mode selector either, even where discovery finds it,
because it takes a value: only the `--json` pairing with `--help` is `L0`-safe, so a tool whose
only machine mode is `--format json` is not probed here.

**A flag spelled like a selector is not a selector, and `L0` no longer guesses.** Discovery reads
`--json` out of help, and the name does not carry the meaning: `--json <file>   Treat the input file
as JSON` is an ordinary help entry, and so are `--format` for a source-code formatter and `--output`
for a destination path. Seven successive attempts to infer a machine mode from that spelling each
failed on a population nobody had enumerated, and the enumeration never closed — the question is not
answerable from outside the program.

So this rule waits for an assertion, and at `L0` there is nothing for it to do even with one: it
reports **not-applicable**, because its subject is a data command's output and choosing one means
knowing it is side-effect-free. The rule is `L1`; a declaration that names a command it may read is
what makes it reachable, and that declaration does not exist yet.
See the [`L0` admission test](../../concepts/probing.md#what-l0-may-assume--the-admission-test) for
why the boundary sits here.

The cost is stated in the [gaps](#current-checker-coverage): a target with a real machine mode that
never says so is not checked for one. From outside it cannot be told apart from a target that has
none — inference may decide what to look at, only observation may condemn.

**Passes** when the captured stdout parses whole, as the declared kind.

**Reports `unverified`** for valid NDJSON, rather than failing it. Under `L0` nothing is declared,
and a stream of valid NDJSON is a plausible legitimate design — failing it without a declaration
would punish a tool for a choice it was never asked to state. Once the tool declares `output_kind`
the same probe becomes a hard `L1` check against the declaration, at
[the boundary](../../concepts/probing.md#what-it-is)
[A3](../parsing/errors-name-the-offending-token.md)'s envelope clause and
[D1](../discoverability/version-flag-exists.md)'s version field also stop at. The sentence above —
undeclared output defaults to `data` — is the normative rule, and this is the one place the `L0`
checker does not enforce it.

Neither verdict softens the rule. It stays **core**, a failure here still makes a target
non-conformant, and `unverified` blocks [full verification](../../concepts/conformance.md)
without blocking conformance.

## Current checker coverage

[`machine-output-parseable.ts`](../../../../src/acc/kit/checkers/streams/machine-output-parseable.ts) — `L0`,
`coverage: partial`. A pass means nothing under **Established** was violated; the **Gaps** are
the rest of this page, unexamined.

**Established**

- nothing at L0 — this rule is L1 and reports not-applicable until a declaration names a command whose output it may read

**Gaps**

- a machine mode is reached only through a declaration so a target with a real machine mode that
  never declares one is not checked for it at all
- the undeclared-output default of data is not enforced at L0 so NDJSON is reported unverified
  rather than failed
- shape stability across invocations and across commands is not compared
- the stream and opaque output kinds are never exercised because no declaration exists at L0 to
  select them

## Evidence

The Docker shape inconsistency and the maintainer's compatibility response were both recorded
during the case-study survey — see
[`research/2026-08-13-case-studies.md`](../../../research/2026-08-13-case-studies.md).

The whole-stream technique comes from the enforcement research, which classified it as a
distinct tier: not "impossible to express" and not merely "caught by a test you remembered to
write", but **self-detecting** — a defect that trips the existing check automatically, wherever
in the codebase it originates. See
[`research/2026-08-13-testing-enforcement.md`](../../../research/2026-08-13-testing-enforcement.md).
