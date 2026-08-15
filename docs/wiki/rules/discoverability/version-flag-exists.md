---
type: rule
title: A version is reportable without side effects
description:
  Version is the cheapest possible probe of whether a tool is installed, reachable, and which
  contract it implements.
tags: [discoverability, versioning, core]
related: [rule/help-exits-zero, concept/machine-mode]
status: current
updated: 2026-08-14
rule_id: D1
tier: core
probe_level: L0
checker: src/acc/kit/checkers/discoverability/version-flag.ts
checker_status: implemented
coverage: partial
coverage_gaps:
  - the structured machine-mode version payload is never inspected
  - no network and no credentials and no side effects cannot be observed at L0
  - the SHOULD to support -V is not probed
  - stdout is only required to be non-empty and is never checked to carry a version string
---

# A version is reportable without side effects

## The rule

A CLI **MUST** support `--version` (and **SHOULD** support `-V`), exiting `0` with the version
on stdout.

It **MUST** perform no work, require no configuration, no credentials, and no network access.

In [machine mode](../../concepts/machine-mode.md) the version **MUST** be a field in a
structured payload, not a bare string requiring a regex to extract.

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
```

Passes when it exits `0` with non-empty stdout.

The checker additionally runs it with a deliberately unusable `HOME` and `XDG_CONFIG_HOME`, to
verify the no-configuration requirement — a `--version` that only works in a configured
environment fails this rule even though it passes the naive probe.

The unusable-`HOME` probe establishes exactly one of the rule's four "no work" clauses — no
configuration. No network, no credentials and no side effects are invisible to a runner that
records argv, streams, exit status and timing, and the machine-mode clause is never asked for
at all; all three are named under [gaps](#current-checker-coverage) below.

Two further omissions are deliberate, and are **not** gaps, because another rule owns each:

- **stderr.** Chatter on stderr alongside a correct version on stdout is real-world common
  (deprecation notices, update nags) and does not stop a caller reading the version. Nothing
  in the checker reads the stream.
- **promptness.** How quickly the first byte arrives is
  [F2](../safety/first-byte-is-prompt.md)'s measurement, and F2 times `--version` specifically.
  D1 would only duplicate it, at a different threshold.

A hung probe is reported `unverified` rather than failed: D1 does not own hangs —
[E1](../interactivity/never-block-without-a-tty.md) does.

## Current checker coverage

[`version-flag.ts`](../../../../src/acc/kit/checkers/discoverability/version-flag.ts) — `L0`,
`coverage: partial`. A pass means nothing under **Established** was violated; the **Gaps** are
the rest of this page, unexamined.

**Established**

- `--version` exits `0` with non-empty stdout.
- it still does so with `HOME` and `XDG_CONFIG_HOME` pointed at a path that does not exist — the
  no-configuration clause, and the only one of the four "no work" clauses reachable here.

**Gaps**

- the structured machine-mode version payload is never inspected
- no network and no credentials and no side effects cannot be observed at L0
- the SHOULD to support -V is not probed
- stdout is only required to be non-empty and is never checked to carry a version string

## How to comply

Free in every framework surveyed. The two ways it goes wrong:

- **Version reads from a config or a network call.** Usually accidental — a global
  initialisation step runs before argument dispatch, so _every_ invocation requires config,
  including `--version`. Dispatch `--version` before initialising anything.
- **Machine mode still emits a bare string.** `--version --json` returning `1.4.2` rather than
  a payload forces the caller back to string handling for the one value most likely to be
  compared, sorted, or range-checked.

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
