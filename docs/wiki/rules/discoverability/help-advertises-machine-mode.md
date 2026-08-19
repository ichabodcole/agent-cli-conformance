---
type: rule
title: Help advertises the machine-readable path
description:
  An agent reading help should not have to guess whether structured output exists — the human
  surface is where it looks first.
tags: [discoverability, machine-mode, diagnostic]
related: [concept/machine-mode, rule/machine-output-is-parseable]
status: stable
generated: { by: claude-opus-5, at: 2026-08-14 }
rule_id: D3
tier: diagnostic
probe_level: L0
checker: src/acc/kit/checkers/discoverability/advertises-machine-mode.ts
checker_status: implemented
coverage: partial
coverage_gaps:
  - help is only required to advertise either the machine-mode flag or a schema command and never both
  - the flag scan falls back to the whole help text when no options block is recognised so a flag named only in an example can satisfy it
  - a pass establishes only that help names the flag and never that the flag is accepted
coverage_established:
  - the human root help surface names one of the flags --json or --format or --output or carries a schema command row
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
<cli> --help --format=text
```

Passes when the captured **human** help mentions a machine-mode flag or an introspection
command. The checker looks for the conventional spellings and reports which it found.

The second probe is what makes the first sentence true. The runner always gives the target a
pipe for stdout, so a CLI that switches to machine mode when stdout is not a terminal answers
plain `--help` with its **schema** — and a schema necessarily contains the spelling of the
machine-mode flag it declares. Scanning that would make this rule test its own machine output
rather than the human surface it is named after, and hand a free pass to every auto-switching
tool. `acc` was one: its human root help listed only `--version` and `--help` while this
checker reported a pass.

So plain `--help` is used when it is human text, and the forced-text form only when it is not.
When help parses as a machine document and no forced-text form is available, the verdict is
`unverified` — the surface the rule is about was never observed, and both a pass and a fail
would be claims about something unseen.

The second probe runs only against a target whose help advertises `--format` — asking a CLI
with no such flag to force text mode is an invocation it can only reject. `--format=text` is
written as one token so the probe stays flag-only; see the safety argument in
[`src/acc/kit/inert.ts`](../../../../src/acc/kit/inert.ts).

A negative result is reported as a finding, not a failure — and it also disables other probes:
[machine output is parseable](../streams/machine-output-is-parseable.md) is reported
**unverified** when no machine-mode path can be discovered, since there is nothing to check.
That coupling is the practical argument for the rule: an undiscoverable feature is, to a
conformance kit, indistinguishable from an absent one.

## Current checker coverage

[`advertises-machine-mode.ts`](../../../../src/acc/kit/checkers/discoverability/advertises-machine-mode.ts) — `L0`,
`coverage: partial`. A pass means nothing under **Established** was violated; the **Gaps** are
the rest of this page, unexamined.

**Established**

- the human root help surface names one of the flags --json or --format or --output or carries a
  schema command row

Plain root help that answers with a machine document is not what gets scanned: the checker falls
back to a forced-text form, and reports `unverified` when the human surface cannot be observed at
all.

**Gaps**

- help is only required to advertise either the machine-mode flag or a schema command and never both
- the flag scan falls back to the whole help text when no options block is recognised so a flag
  named only in an example can satisfy it
- a pass establishes only that help names the flag and never that the flag is accepted

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

Full analysis: [`research/2026-08-13-cli-vs-mcp.md`](../../../research/2026-08-13-cli-vs-mcp.md).
