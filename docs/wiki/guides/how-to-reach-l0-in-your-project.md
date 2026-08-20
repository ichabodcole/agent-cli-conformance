---
type: guide
title: How to reach L0 in your project
description:
  Take a CLI from its first failing check to a green gate — triaging each failure into a fix, a
  declared waiver, or named debt.
tags: [guide, adoption, conformance, acc-config, l0]
related: [concept/conformance, rule/help-advertises-machine-mode, rule/unknown-flag-exits-nonzero]
status: stable
generated: { by: claude-opus-5, at: 2026-08-17 }
---

# How to reach L0 in your project

## Goal

`bunx acc check <your-cli>` exits `0` in CI, with every rule you do not satisfy either fixed,
waived by design, or named as debt.

This assumes you can already read a report. If you cannot, run
[Check your first CLI](./check-your-first-cli.md) first — it takes ten minutes.

**Everything L0 asks for is reachable by changing behaviour**: parser strictness, which stream
you write to, what help advertises. Nothing on this page requires you to restructure your tool
or publish a declaration. That is what makes L0 the level to adopt first — see
[what L1 needs](../../roadmap.md#6-the-portable-declaration-ir) if you want to know where the
ceiling is.

## Steps

### 1. Install it and get a baseline

`acc` is not on npm. Install it from the repository into the project you are checking, so the
version your gate runs is pinned in your lockfile like any other dev dependency:

```
bun add -d git+ssh://git@github.com/ichabodcole/agent-cli-conformance.git
bunx acc check ./your-cli
```

The repository is private today, which is why that is an SSH URL rather than
`github:ichabodcole/agent-cli-conformance` — see [the README](../../../README.md#getting-started).

Record the verdict line. Everything below is triage of what follows it.

If your CLI does real work on a bare invocation, read the safety note in `bunx acc check --help`
before running this again — the probes execute your target.

### 2. Fix the failures that unblock other failures first

Three findings are worth clearing before the rest, because each one closes others:

**Advertise machine mode in help ([D3](../rules/discoverability/help-advertises-machine-mode.md)).**
D3 is only `diagnostic`, so it never blocks the gate — fix it first anyway. The kit discovers
machine mode by reading your help text, and what help names decides what two other rules can
probe at all. The three do not accept the same spellings:

| Rule                                                           | Satisfied by                                          |
| -------------------------------------------------------------- | ----------------------------------------------------- |
| [D3](../rules/discoverability/help-advertises-machine-mode.md) | `--json`, `--format`, `--output`, or a schema command |
| [B5](../rules/streams/machine-mode-holds-on-parser-errors.md)  | `--json` or `--format` — never `--output`             |
| [B3](../rules/streams/machine-output-is-parseable.md)          | `--json` only                                         |

So **`--json` is the one spelling that moves all three**; anything else leaves at least one of
them with nothing to select, reporting `unverified`. `--output` is refused deliberately — it
names an output _file_ at least as often as a format, and a probe whose meaning depends on which
sense your tool implements is not a probe. The report says so out loud:

```
FAIL  D3  help names no machine-mode flag or schema command; B3 will be unverified as a result
```

One line in help moves three findings.

**Make your parser strict ([A1](../rules/parsing/unknown-flag-exits-nonzero.md),
[A2](../rules/parsing/unknown-command-exits-nonzero.md),
[A5](../rules/parsing/no-fuzzy-auto-correction.md)).** These usually share one cause and one fix.
If you use `yargs`, call `.strict()`; `node:util parseArgs`, pass `{ strict: true }`; `cobra`,
see A1's table. If your parser cannot be made strict, it is the wrong parser for an agent-facing
CLI.

**Send diagnostics to stderr ([B1](../rules/streams/stdout-carries-only-data.md),
[D2](../rules/discoverability/bare-invocation-is-a-usage-error.md)).** Usage text on stdout is
the single most common finding on real tools, and it is usually one stream argument.

Re-run the check before triaging what is left; these three fixes tend to clear findings well beyond the rules they name.

### 3. Triage what is left into three buckets

For each remaining failure, ask **"will I delete this line once the tool changes?"**

| Answer                               | Bucket     | Where it goes                |
| ------------------------------------ | ---------- | ---------------------------- |
| Yes — it is a defect, just not today | **Debt**   | `knownFailures`              |
| No — passing was never the goal here | **Waiver** | `rules: { severity: "off" }` |
| I am fixing it now                   | —          | fix it                       |

The distinction is the whole design of the config file, and getting it wrong is the one mistake
that matters. Debt is a promise, and the kit reports it as **stale** the moment the rule starts
passing, so the line gets deleted. A waiver is a **decision**, never goes stale, and is never
reported as something to repay.

Do not reach for a waiver because a rule is inconvenient. Reach for it when the rule genuinely
does not bind your tool — the canonical case is
[D2](../rules/discoverability/bare-invocation-is-a-usage-error.md), where printing help on a
bare invocation is a defensible design position that dogfooding found in three of four real CLIs.

### 4. Write `acc.config.json`

Put it at your project root. `acc check` reads it from the working directory automatically; pass
`--config-dir` only when running from somewhere else.

```json
{
  "rules": {
    "D2": { "severity": "off", "reason": "bare invocation prints help by design" }
  },
  "knownFailures": {
    "A1": "parser migration to stricli pending, tracked in #412"
  }
}
```

A `reason` is required on both. A waiver without one is a silent opt-out; with one it is a
decision someone can review later.

The file is validated strictly, because its whole job is to suppress a gate. A misspelled key or
an unknown rule id is a usage error naming the problem, not a line that quietly does nothing:

```
acc.config.json rules.D2 has an unknown key "severty" (known: severity, reason)
```

`severity` also moves in the other direction — set `"core"` on a diagnostic rule to hold
yourself to it.

### 5. Confirm the gate is green, then wire it in

```
bunx acc check ./your-cli
echo $?
```

`0` is the gate. Add the same command to CI; it needs no flags, and `9` is the only exit code
that means "not conformant" (anything else is `acc` itself failing — see
[outcomes are not errors](../concepts/exit-codes.md#outcomes-are-not-errors)).

## Verification

You are done when all of the following hold:

- `bunx acc check ./your-cli` exits `0`.
- The verdict line reads `CONFORMANT (L0)`.
- Every entry in `knownFailures` corresponds to a failure you intend to fix, and the report
  names no **stale expectations** — those are entries that now pass and should be deleted:

  ```
  stale expectations (now passing, remove them): C1
  ```

- Every entry in `rules` carries a reason you would defend in review. Waived rules appear as
  `WVD` with the verdict they would have reached, so nothing is hidden:

  ```
  WVD   D2  bare invocation exited 0; bare invocation wrote 24 bytes to stdout (waived; would FAIL)
  ```

**Do not chase `fullyVerified` at L0.** Every core checker in the catalogue currently declares
`coverage: partial`, so a target with zero violations and zero unverified rules still reports
`fullyVerified: false`. That is the instrument's limit, not yours — see
[coverage](../concepts/conformance.md#coverage-a-pass-can-be-narrower-than-its-rule). The gate
is `conformant`.
