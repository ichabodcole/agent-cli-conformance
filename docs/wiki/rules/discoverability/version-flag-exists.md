---
type: rule
title: A version is reportable without side effects
description:
  Version is the cheapest possible probe of whether a tool is installed, reachable, and which
  contract it implements.
tags: [discoverability, versioning, core]
related: [rule/help-exits-zero, concept/machine-mode]
status: stable
generated: { by: claude-opus-5, at: 2026-08-16 }
rule_id: D1
tier: core
probe_level: L0
checker: src/acc/kit/checkers/discoverability/version-flag.ts
checker_status: implemented
coverage: partial
coverage_gaps:
  - a flag spelled like a machine-mode selector is only treated as one once some observation came back structured under it so a target whose advertised selector emits prose everywhere is reported unverified rather than failed
  - the machine-mode payload is only required to be a structured document because no declaration exists at L0 to name the field the version belongs in
  - no network and no credentials and no side effects cannot be observed at L0
  - the SHOULD to support -V is not probed
  - stdout is never checked to carry a version string in either mode
coverage_established:
  - --version exits 0 with non-empty stdout
  - --version still does so with HOME and XDG_CONFIG_HOME pointed at a path that does not exist
  - for a target that advertises a machine-mode flag --version in that mode exits 0 and its whole stdout parses as one JSON object rather than a bare string
---

# A version is reportable without side effects

## The rule

A CLI **MUST** support `--version` (and **SHOULD** support `-V`), exiting `0` with the version
on stdout.

It **MUST** perform no work, require no configuration, no credentials, and no network access.

In [machine mode](../../concepts/machine-mode.md) the version **MUST** be a field in a
structured payload, not a bare string requiring a regex to extract.

## How to comply

Free in every framework surveyed. What is not free is _where the framework's own `--version`
answers_ relative to your output layer.

**Assume the built-in short-circuits.** `clap` v4 injects `version` alongside `help` as an
argument you did not declare — visible once `Command::build()` runs, where the auto-injected pair
"must be filtered" ([frameworks §2.6a](../../../research/2026-08-13-frameworks-languages.md)) —
and `charmbracelet/fang` adds an auto `--version` to any cobra root it wraps ([§2.5c](../../../research/2026-08-13-frameworks-languages.md)).
A handler injected by the parser cannot know your machine mode exists, so it prints a bare string
and exits before your envelope is constructed. This is the `acc` regression: commander's built-in
wrote `0.0.0` at exit `0` under `--version --json`, `--json --version` and `--format json
--version` alike, for months (fixed in `cf759ed`; see
[how to add a checker](../../guides/how-to-add-a-checker.md)).

**If you emit a machine mode, take `--version` before the parser does.** `acc` reads `--version`
and `-V` off `argv` ahead of `new Command()` and routes them through the same success envelope as
every other command, so the version leaves as a field. Disabling the built-in works equally well
where the parser allows it; in `commander`, `exitOverride()` and `configureOutput()` are the hooks
that take back the exit and the stream ([§2.2, §1](../../../research/2026-08-13-frameworks-languages.md)).

**Keep the bare string in text mode.** A shell comparing `acc --version` should not start
receiving JSON because this rule was fixed. Structured is the machine-mode obligation only.

**Give machine mode exactly one spelling.** Docker is the cautionary case: `--format json` and
`--format '{{json .}}'` disagree on both values and key names — hence the standing rule that
machine output must not vary by invocation spelling
([case studies §5.2](../../../research/2026-08-13-case-studies.md)).

**Treat a config or credential requirement as an ordering bug, not a `--version` bug.** A global
initialisation step that runs before dispatch makes _every_ invocation need config. Move it into
the command body so `--version` never reaches it.

## Why

`--version` is the invocation with the strongest convention behind it for doing nothing, which
makes it the natural first probe. Note the direction: this rule is what turns that convention
into a requirement. It is not a property a caller can verify from outside — a tool that
initialises globally before dispatching does its work first and prints a version afterwards,
and `acc check` cannot see the difference (see [how to comply](#how-to-comply)).

It is load-bearing in three places:

- **Presence.** Distinguishing "the command is not installed" (`127`) from "the command failed"
  requires running something harmless first.
- **Contract identification.** Behaviour differs across releases. An agent that knows the
  version can consult the right reference rather than inferring capabilities by trial —
  particularly for a tool whose machine-mode output shape changed between majors.
- **Bug reports.** Any defect an agent surfaces is close to unusable without the version, and
  asking a person to go get it defeats the automation.

The "no configuration, no credentials, no network" requirement is what keeps it usable as a
probe. A `--version` that fails because a config file is missing has answered a question nobody
asked, and cannot serve as the safe first call.

## The probe

Inert (`L0`).

```
<cli> --version
<cli> --version             # again, with HOME and XDG_CONFIG_HOME unusable
<cli> --version --json      # where help advertises a machine-mode flag
```

**Passes** when `--version` exits `0` with non-empty stdout, and still does so when the kit
re-sends it with `HOME` and `XDG_CONFIG_HOME` pointed at a path that does not exist. A
`--version` that only works in a configured environment fails this rule even though it passes the
naive probe.

That second invocation establishes exactly one of the rule's four "no work" clauses — no
configuration. A pass says nothing about no network, no credentials or no side effects, none of
which are observable at `L0`; they are named under [gaps](#current-checker-coverage) below.

**A flag spelled like a selector is not yet a selector.** Discovery finds `--json` by reading it
out of help, and the name does not tell it the meaning: `--json <file>   Treat the input file as
JSON` is a real and common help entry, and so are `--format` for a source-code formatter and
`--output` for a destination path. A CLI shaped that way is text-only, answers every probe in
prose, and has broken nothing — so before this rule may condemn anything under a selector, some
observation has to have come back **structured** under it. `<cli> --version <selector>` is the
corroborating probe, declared by this checker rather than borrowed from another so the rule holds
identically under a single-checker run, and deduplicated against the other checkers that send it.

Uncorroborated, the verdict is `unverified` with that reason, never `pass` and never `fail`. The
cost is stated in the [gaps](#current-checker-coverage): a genuinely broken CLI whose `--json` is
meant as a selector but emits prose on every path is no longer failed here, because from outside
it is indistinguishable from the innocent one. That is the trade this kit takes everywhere —
inference may decide what to look at, only observation may condemn.

On this rule the corroborating invocation and the judged one are the same invocation, which
needs care: `--version --json` answering `1.4.2` is both the classic defect and, on its own, no
evidence the flag selects anything. It is still **failed** when some other observation — the
machine-mode help [B3](../streams/machine-output-is-parseable.md) sends — came back structured
under the same selector, because then the selector is established and this answer is the wrong
shape. It is `unverified` only when nothing anywhere parsed under the flag.

**Fails in machine mode** when the whole of stdout does not parse as one JSON **object**. The
common shape is a bare string — `--version --json` printing `1.4.2` — and an array is refused for
the same reason, because the version is a value inside a document rather than the document itself.
The probe cannot ask for more: with nothing declared at `L0` there is no schema naming the field
the version belongs in, so `{"ok":true,"data":"1.0.0"}` and `{"version":"1.0.0"}` both pass.

**Not checked: stderr.** Chatter alongside a correct version on stdout — deprecation notices,
update nags — does not stop a caller reading the version, and nothing in the checker reads the
stream.

**Not checked: promptness.** How quickly the first byte arrives is
[F2](../safety/first-byte-is-prompt.md)'s measurement, and F2 times `--version` specifically.

**Reports `unverified`** for a hung probe. D1 does not own hangs —
[E1](../interactivity/never-block-without-a-tty.md)
[does](../../concepts/probing.md#hangs-are-owned-by-four-rules-and-deferred-by-the-rest).

## Current checker coverage

[`version-flag.ts`](../../../../src/acc/kit/checkers/discoverability/version-flag.ts) — `L0`,
`coverage: partial`. A pass means nothing under **Established** was violated; the **Gaps** are
the rest of this page, unexamined.

**Established**

- --version exits 0 with non-empty stdout
- --version still does so with HOME and XDG_CONFIG_HOME pointed at a path that does not exist
- for a target that advertises a machine-mode flag --version in that mode exits 0 and its whole
  stdout parses as one JSON object rather than a bare string

**Gaps**

- a flag spelled like a machine-mode selector is only treated as one once some observation came
  back structured under it so a target whose advertised selector emits prose everywhere is
  reported unverified rather than failed
- the machine-mode payload is only required to be a structured document because no declaration
  exists at L0 to name the field the version belongs in
- no network and no credentials and no side effects cannot be observed at L0
- the SHOULD to support -V is not probed
- stdout is never checked to carry a version string in either mode

## Evidence

The GNU Coding Standards require both `--version` and `--help` of all programs, which is as
close to a settled convention as command-line interfaces have — see
[there is no industry standard](../../concepts/exit-codes.md#there-is-no-industry-standard) for
how unusual that agreement is.

All five surveyed CLIs implement it. The machine-mode half is weaker in practice: Docker's
`docker version --format json` was outright broken until v23.0.5, printing the literal string
`json`, and a later release renamed a field within that payload (`ApiVersion` → `APIVersion`),
which a maintainer confirmed was an unintended breaking change. Version output is a contract
like any other.
