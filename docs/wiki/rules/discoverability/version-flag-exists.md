---
type: rule
title: A version is reportable without side effects
description:
  Version is the cheapest possible probe of whether a tool is installed, reachable, and which
  contract it implements.
tags: [discoverability, versioning, core]
related: [rule/help-exits-zero, concept/machine-mode]
status: current
updated: 2026-08-13
rule_id: D1
tier: core
probe_level: L0
checker: src/acc/kit/checkers/discoverability/version-flag.ts
checker_status: implemented
---

# A version is reportable without side effects

## The rule

A CLI **MUST** support `--version` (and **SHOULD** support `-V`), exiting `0` with the version
on stdout.

It **MUST** perform no work, require no configuration, no credentials, and no network access.

In [machine mode](../../concepts/machine-mode.md) the version **MUST** be a field in a
structured payload, not a bare string requiring a regex to extract.

## Why

`--version` is the one invocation a caller can make against a completely unknown tool with
total confidence that nothing will happen. That makes it the natural first probe, and it is
load-bearing in three places:

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

Passes when it exits `0` with non-empty stdout and empty stderr, promptly.

The checker additionally runs it with a deliberately unusable `HOME` and `XDG_CONFIG_HOME`, to
verify the no-configuration requirement — a `--version` that only works in a configured
environment fails this rule even though it passes the naive probe.

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
