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
  - a machine-first tool with no flag is recognised only by matching a claim in help prose which is a heuristic that misreads contrastive and scoped statements and cannot see a non-English one
  - help is only required to advertise either the machine-mode flag or a schema command and never both
  - the flag scan falls back to the whole help text when no options block is recognised so a flag named only in an example can satisfy it
  - a pass establishes only that help names the flag and never that the flag is accepted
coverage_established:
  - the human root help surface names one of the flags --json or --format or --output or carries a schema command row — a claim ABOUT the help text rather than a claim that the flag selects anything
---

# Help advertises the machine-readable path

## The rule

Root help **SHOULD** name the machine-mode flag (`--json`, `--format`) and the introspection
command (`schema`) where one exists.

A CLI **SHOULD** make its structured surface discoverable from the surface a caller reaches
first — which is `--help`, not documentation.

## How to comply

One row in the root help — `--json  Output JSON`, or a command row
`schema  Print this CLI's command schema as JSON`. What varies is why the row is missing.

**If your parser derives help from declarations, declaring the flag is the whole job.** Every
framework in the
[survey matrix](../../../research/2026-08-13-frameworks-languages.md#1-big-comparison-matrix)
derives help automatically except three — `node:util parseArgs` (no help generation at all),
`pico-args`/`lexopt` (hand-written), and Go's stdlib `flag` (minimal) — with `xflags` generating
it at build time. Declare the flag at the **root**, as a global or persistent option (cobra's
persistent flags, clap's global args, both of which the survey saw survive into schema dumps as a
global/local split), not on one leaf subcommand, or root help will not carry it. The survey
measured help _derivation_ and schema export, not each library's registration call — check your
parser's docs for its global-option spelling.

**`oclif` is the one surveyed framework with a switch for this.** `enableJsonFlag` on a command
registers the flag; the published `oclif.manifest.json` for `@oclif/plugin-plugins` carries it as
`"json": { "type": "boolean", "description": "Format output as json.", "helpGroup": "GLOBAL" }` —
described, grouped as global, and with no `hidden` marker (the same manifest marks its `jit` flag
`"hidden": true`). That manifest is what was read; the rendered help screen was not.

**If your machine path is a hidden command, help advertises nothing.** cobra's `__complete` is
hidden by construction, and it is exactly the endpoint kubectl's machine-readable introspection
rides on — real, useful, and invisible to this rule and to any reader of `--help`. Every schema
format surveyed carries a hidden bit (oclif's `hidden`, clap's dump, Click's `to_info_dict()`,
urfave's `json:` tags), so the check is mechanical: whatever declares your machine path, make sure
it is not marked hidden, or add a visible `schema` command alongside the hidden one.

**A curated root help drops whatever you did not curate.** `docker --help` lists 64 commands and
36 with `DOCKER_HIDE_LEGACY_COMMANDS` set — the hidden ones still run — and Docker 23.0
reorganised root help around a "Common Commands" shortlist. If your root help curates its command
list the same way, a `schema` command has to be put in the visible group on purpose; the options
block is the safer home, because no shortlist decides what appears there.

**Where nothing derives the help, write the row by hand** — and put it inside the `Options:` /
`Flags:` block. The probe scopes its flag scan to a recognised options block and falls back to the
whole help text only when it recognises none, so a `--json` that appears solely inside a piped
example can satisfy the checker while telling a reader nothing. The schema alternative is read as
a command-table row: an indented line whose first token is `schema`.

**Make the flag teach its own vocabulary.** `gh --json` with no field list exits 1 and prints the
full set of available fields — discovery delivered at the moment of need, paid for only on the
mistake, though it is reached through an error path rather than help. Same shape as
[`choices` in an error](../../concepts/error-envelope.md#choices-is-just-in-time-discovery). If
you also ship a generated reference or agent skill, name it in help: `cli/cli` ships one for `gh`
itself, and it is the cheap path a caller would otherwise have to find by searching.

**Not established here.** Whether Swift ArgumentParser's `--experimental-dump-help` shows up in
rendered help was not measured, and no surveyed CLI's root help _text_ was captured, so which of
`git`, `docker`, `kubectl` or `gh` names its machine-mode flag at the root is unknown from this
research. `--json` as the spelling to advertise is a published convention — clig.dev's "Display
output as formatted JSON if `--json` is passed" — not a measured library behaviour.

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
<cli> --help --format=text     # only where help advertises --format
```

**Passes** when the captured **human** help names a machine-mode flag — `--json`, `--format` or
`--output` — or carries a schema command row. The finding reports which of them it found.

**The human surface is what gets scanned, not whatever `--help` happened to print.** The runner
always gives the target a pipe for stdout, so a CLI that switches to machine mode when stdout is
not a terminal answers plain `--help` with its **schema** — which necessarily contains the
spelling of the machine-mode flag it declares. So plain `--help` is read when it is human text,
and the forced-text form only when it is not. That second form is sent only to a target whose
help advertises `--format`, since asking a CLI with no such flag to force text mode is an
invocation it can only reject, and it is written as one token to stay
[flag-only](../../concepts/probing.md#inertness-classifies-an-invocation-it-does-not-make-the-run-safe).

**Reports `unverified`** when help parses as a machine document and no forced-text form is
available. The surface the rule is about was never observed, so both a pass and a fail would be
claims about something unseen.

**A fail is a finding rather than a failure — and it disables other probes.** Both
[B3](../streams/machine-output-is-parseable.md) and
[B5](../streams/machine-mode-holds-on-parser-errors.md) report **unverified** when no
machine-mode path can be discovered here, because neither has anything to send. That coupling is
the practical argument for the rule: an undiscoverable feature is, to a conformance kit,
indistinguishable from an absent one.

### A tool with no flag says it in prose, and that claim downgrades rather than passes

The first clause exempts a tool with no machine-mode flag — "where one exists" — so what a
machine-first CLI owes is the second clause: make the structured surface discoverable from `--help`.
A sentence is how it does that, and the kit can see the sentence but cannot verify what it means.

So the claim earns [`unverified`](../../concepts/conformance.md), never a pass:
`Prints JSON when stdout is not a terminal` moves this rule off `fail` and no further, and the
verdict says it matched a claim rather than observed a token.

**Three things follow, and the third is the reason for the design.** A false match costs an
admission of ignorance instead of an assertion of fact. A false **pass** becomes impossible, since
prose cannot produce one. And **deleting an honest sentence makes a target's report worse** —
`unverified` becomes `fail` — so the kit never pays anyone to remove true documentation, which a
warning message alone could not achieve.

The scan is **a fallback**, reached only when no machine-mode flag and no `schema` command row were
found. A tool that advertises normally never touches it.

**The statement does not unlock [B5](../streams/machine-mode-holds-on-parser-errors.md)**, and it
briefly did. The argument for coupling them was that a promise made where callers can read it is
the stronger one and should earn scrutiny — sound for a claim actually made, and not survivable
against a matcher that read `Coverage is written to coverage.json by default` as a promise about
stdout. A reviewer built three ordinary human-first CLIs and turned each into a **core** violation
with one unrelated sentence of help. Unlocking a core check is a deliberate act: `machineMode` in
`acc.config.json`.

**`acc.config.json` does not satisfy this rule**, and an earlier version of the checker let it.
That file is the kit's; no caller of the target can read it. Answering "can a caller find out?" from
it had the rule's name and its behaviour coming apart — reported by an adopter who had put an
accurate statement in their help and was failed for it while a config key passed.

**This is prose matching, which the kit avoids everywhere else.** What makes it admissible is the
price of being wrong: this rule is `diagnostic`, so a false reading costs one printed line and
never a verdict. That is the whole of the argument, and it only holds while nothing else consumes
the result — which is why a help statement no longer reaches `machineModeDefault`.

The matcher refuses negations, claims about files, flag documentation, hedged claims, table rows,
and clauses about JSON arriving rather than leaving. Each guard is there because a string got
through: the corpus is in
[`machine-mode.test.ts`](../../../../src/acc/kit/machine-mode.test.ts), and it was built by three
reviewers in succession, each of whom found what the previous one had declared unbreakable.

## Current checker coverage

[`advertises-machine-mode.ts`](../../../../src/acc/kit/checkers/discoverability/advertises-machine-mode.ts) — `L0`,
`coverage: partial`. A pass means nothing under **Established** was violated; the **Gaps** are
the rest of this page, unexamined.

**Established**

- the human root help surface names one of the flags --json or --format or --output or carries a schema command row — a claim ABOUT the help text rather than a claim that the flag selects anything

Plain root help that answers with a machine document is not what gets scanned: the checker falls
back to a forced-text form, and reports `unverified` when the human surface cannot be observed at
all.

**Gaps**

- a machine-first tool with no flag is recognised only by matching a claim in help prose which is a heuristic that misreads contrastive and scoped statements and cannot see a non-English one
- help is only required to advertise either the machine-mode flag or a schema command and never both
- the flag scan falls back to the whole help text when no options block is recognised so a flag
  named only in an example can satisfy it
- a pass establishes only that help names the flag and never that the flag is accepted

## Evidence

**Measured across ten installed CLIs, and the result is worse than this page used to claim**
([2026-08-19](../../../research/2026-08-19-help-advertises-machine-mode.md)). Two of ten name a machine-readable path as a flag in root help: `rg`
(`--json`) and `jq`, where the tool _is_ the JSON path. **Not one of the ten names a query or
composition flag** — no `-q`, `--jq`, `--template` anywhere at the root. Seven do point at a
reference or docs surface, so the pointer is the common part and the flag is what goes
unadvertised.

This page previously cited `gh` and `hf` as tools that get it right. Neither claim survived
measurement. `gh`'s root help names a `formatting` help topic — "Formatting options for JSON data
exported from gh" — so it advertises that a structured surface _exists_, but its entire `FLAGS`
block is `--help` and `--version`, and `--json`, `-q`, `--jq` and `--template` appear nowhere.
**`gh` would fail this rule's own probe**, which scans a recognised options block. `hf` 0.35.3 is
a flatter refutation: no occurrence of `json` in any case, in 1,022 bytes of root help.

That `gh` is elsewhere the model for pager and TTY behaviour and still fails here is the useful
part — a tool can be exemplary on one axis and absent on another, which is why the rule is
measured rather than assumed from reputation.

The underlying economics come from the CLI-versus-MCP research: a **known** command surface
substantially outperforms one discovered at runtime, and the cheapest arrangement is a compact
reference loaded once, with introspection as the fallback. Help text is the pointer that makes
the cheap path findable.

Full analysis: [`research/2026-08-13-cli-vs-mcp.md`](../../../research/2026-08-13-cli-vs-mcp.md).
