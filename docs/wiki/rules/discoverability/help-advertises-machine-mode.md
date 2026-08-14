---
type: rule
title: Help advertises the machine-readable path
description:
  An agent reading help should not have to guess whether structured output exists — the human
  surface is where it looks first.
tags: [discoverability, machine-mode, diagnostic]
related: [concept/machine-mode, rule/machine-output-is-parseable]
status: current
updated: 2026-08-13
rule_id: D3
tier: diagnostic
probe_level: L0
checker: scripts/checkers/discoverability/advertises-machine-mode.ts
---

# Help advertises the machine-readable path

## The rule

Root help **SHOULD** name the machine-mode flag (`--json`, `--format`) and the introspection
command (`schema`) where one exists.

A CLI **SHOULD** make its structured surface discoverable from the surface a caller reaches
first — which is `--help`, not documentation.

## Why

An agent encountering an unfamiliar tool runs `--help`. If structured output exists but is not
mentioned there, the agent has three options, all bad: parse the human table, guess flag names
until one works, or search the web for documentation that may not match the installed version.

The cost is asymmetric. Mentioning the flag costs one line of help text. Omitting it costs
every caller a discovery problem, permanently — and the most likely resolution is the worst
one, since parsing the human table produces output that appears to work and breaks silently on
the next release.

This is `diagnostic` rather than `core` because it is a discoverability affordance, not a
correctness property. A tool that omits it is harder to use; it is not _wrong_. Core is
reserved for behaviour whose absence produces incorrect results.

## The probe

Inert (`L0`).

```
<cli> --help
```

Passes when the captured help text mentions a machine-mode flag or an introspection command.
The checker looks for the conventional spellings and reports which it found.

A negative result is reported as a finding, not a failure — and it also disables other probes:
[machine output is parseable](../streams/machine-output-is-parseable.md) is reported
**unverified** when no machine-mode path can be discovered, since there is nothing to check.
That coupling is the practical argument for the rule: an undiscoverable feature is, to a
conformance kit, indistinguishable from an absent one.

## How to comply

One line in the root help. Two things worth doing beyond the minimum:

- **Make the flag teach its own vocabulary.** `gh` runs `--json` with _no_ field list and
  prints the full set of available fields. The caller who misuses the flag is handed exactly
  the information needed to use it correctly — discovery delivered at the moment of need,
  paid for only on the mistake. This is the same shape as
  [`choices` in an error](../../concepts/error-envelope.md#choices-is-just-in-time-discovery).
- **Point at the generated reference, not just the flag.** Where the tool ships an agent skill
  or compact reference derived from its schema, naming it in help routes callers to the cheap
  path rather than the expensive one.

## Evidence

`gh` mentions its structured surface in help and ships an agent-facing skill documenting
invocation patterns, which its own changelogs point users toward. `hf` documents `--json` and
`-q` for composition directly in help.

The underlying economics come from the CLI-versus-MCP research: a **known** command surface
substantially outperforms one discovered at runtime, and the cheapest arrangement is a compact
reference loaded once, with introspection as the fallback. Help text is the pointer that makes
the cheap path findable.

Full analysis: [`research/03-cli-vs-mcp.md`](../../../../research/03-cli-vs-mcp.md).
