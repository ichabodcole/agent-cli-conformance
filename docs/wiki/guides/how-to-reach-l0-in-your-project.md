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
version your gate runs is pinned in your lockfile like any other dev dependency — which means
**pinned to a release tag**, using the block in
[the `acc` skill's step 1](../../../skills/acc/SKILL.md), which derives the current tag and pins
it for you. An unpinned `bun add` resolves from whatever bare clone bun already holds and can
deliver an older kit at exit `0` with nothing visible, which is the opposite of the property this
step is for. Then:

```
bunx acc check ./your-cli --format text
```

`--format text` is worth the habit. Without it you get JSON whenever output is piped or redirected
— correct, and what CI wants — but the human report is the one with the aligned verdict table and
the per-rule list of what each check did **not** establish. Its first line also carries
`[acc <version>]` — the place a stale install is hardest to miss, though `acc --version` and the
JSON report's `kitVersion` say the same thing.

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
them with nothing to select, reporting `unverified`.

**Unless machine mode is what your tool already does.** Rather than inventing a flag to satisfy a
checker, declare it:

```json
{ "defaultOutput": "json" }
```

Two shapes qualify, and the second is the common one:

- **No machine-mode flag, because there was never a mode to switch into** — the tool emits
  structured output and `--human` is the opt-out.
- **The tool switches on the stream** — JSON when stdout is not a terminal, prose when it is.
  **Every probe runs against a pipe, never a terminal**, so if your tool would answer a script in
  JSON, this describes you.

B5 then probes your error path with no selector — the path your callers actually take.

**On a tool whose errors are prose, this key is not an unlock and does not belong in your
cheap-first pile.** Declaring `defaultOutput` is not a fix. It is the act of making a claim
checkable, and the claim covers your ERROR path as well as your data path. So if every data verb
emits JSON and your parser still answers `unknown option --nope` in prose on stderr — a very
common shape, and the one an early adopter of this guide had — then declaring moves B5 from
`unverified` to **fail**, and your report gets one violation longer for telling the truth.

That is the intended gradient, and here is the sequence it intends:

1. **Declare it anyway**, if it is true of your tool. `unverified` is the kit saying it knows
   nothing about your error path; `fail` is the kit telling you something true you can act on.
   The second is the more useful report even though it is the longer one.
2. **Hold the failure as debt**, with a reason: `"knownFailures": { "B5": "error path is still
prose; JSON error envelope is scheduled" }`. A reason is required. The gate goes green, the
   debt is visible, and it cannot grow without someone naming another rule and another reason.
3. **Then build the error envelope**, and delete the entry.

**Do not reach for `"rules": { "B5": { "severity": "off" } }` here.** That is a waiver, it means
_this rule does not apply to my design_, and it never goes stale. Using it for work you intend to
do records a temporary gap as a permanent decision. The config refuses to hold a waiver and a
known failure for the same rule, deliberately, so this is a choice you make once and out loud.

The alternative sequence — build the envelope FIRST, declare afterwards, never see a red B5 — is
also legitimate and costs nothing but time. Choose it if a red gate would block other people. What
is not legitimate is leaving the key undeclared **because** the report is shorter without it: that
buys a better-looking result by keeping the kit ignorant of the path your callers actually take.

**Say it in your help as well.** `acc.config.json` is the kit's file, and D3 asks what a caller of
_your_ CLI can find out — so the key does not answer it. A sentence in help does, as far as
anything can: D3 moves from `fail` to `unverified` and tells you it matched a claim rather than
observed a flag. It will not pass, because the kit cannot check what a sentence means.

They do different jobs and you want both. The sentence is the best D3 can be given; the key lets
B5 go and test your error path. Unlocking a core check stays deliberate, because a sentence read
wrongly should never cost anyone a build.

What B5 requires is concrete: provoke a parser error and **one of your two streams must be exactly
one JSON document**.

**Declaring it commits you to it.** Answer a parser error in prose and B5 fails you. Check before
you commit the key:

```
bunx acc check ./your-cli --config-dir .
```

If your help also names `--json`, **both paths are probed** and both must hold: the defect this
rule is named for is a format resolved only from the tokens your parser read before it stopped,
which shows up as a bare error that is fine and the same error under `--json` that is not.

B3 stays `unverified` for a target with no flag — it reads a data command's output, and choosing
one to run safely is above `L0` — but a target that advertises `--json` is probed by B3 as usual.

B5 refuses `--output` deliberately — it names an output _file_ at least as often as a format, and
a probe whose meaning depends on which sense your tool implements is not a probe. The report's D3
line spells out what is and is not counted as a selector:

```
FAIL  D3  help names no machine-mode flag a caller could flip and no schema command: --json,
          --format and --output are looked for as bare switches, and one documented with a value
          slot is a flag that takes a value rather than one that selects a mode
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

Re-run the check before triaging what is left; these three fixes tend to clear findings well
beyond the rules they name.

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
[D2](../rules/discoverability/bare-invocation-is-a-usage-error.md), for a tool that **chose**
help on a bare invocation as its interface — a defensible design position, and the majority
one: three of four real CLIs choose it. The same behaviour from a bare path nobody finished is
not that case — it is a plain D2 failure, fixed rather than waived.

**What a waiver costs depends on the rule's `deviation`.** Every rule is classified `defect` or
`design-choice`, and the two are not waived at the same price:

- **`design-choice` — the waiver costs nothing.** The rule leaves no `evidenceGaps` entry and
  `fullyVerified` is unaffected. You are stating a design the catalogue never required, not
  hiding a failure. D2 above is one of these — and it is a **core** rule: tier (does a `FAIL`
  gate the run) and deviation (what a waiver costs) are independent axes, and D2 crosses them.
- **`defect` — the waiver also costs `fullyVerified`,** and puts the rule in `evidenceGaps`, even
  where the probe would have passed. It still buys the gate: `conformant` excludes the rule
  either way. What it cannot buy is the evidence claim, because a rule you chose not to be
  measured against was not established.

`acc rules --deviation defect` lists the ones that cost. The report names the cost per waiver, so
you never have to look it up twice:

```
  WAIVED (1) — declared not applicable to this tool, by config:
    D2  bare invocation prints help by design  (would FAIL; design choice, costs nothing)
```

### 4. Write `acc.config.json`

Put it in the directory you will run `acc check` from. That is the only place it is read — the
**current working directory**, that directory only, with no search upward — and a missing file
there is the normal case rather than an error. Pass `--config-dir` when you run from somewhere
else.

**That makes the directory you run from part of the verdict.** From your project root the run sees
your waivers; the same command with the same absolute target path, run from a subdirectory, sees
none and can fail rules you waived. It goes the other way too — a stray `acc.config.json` in the
directory you happen to be in will excuse rules you did not mean to excuse. Each report names the
config it read, including when it read none — the text report on its `config:` line, `--json` in
its `configSource` field — so the two runs disagree in the open rather than silently, but somebody
still has to read both. Pass `--config-dir` wherever CI
and a developer need to reach the same verdict, rather than relying on someone noticing that they
did not.

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

### 6. Check what you just added is reachable below the root

**Reaching L0 can introduce drift one level down, and the checks on this page cannot see it.**

Every fix above adds a token at the ROOT — `--version` for D1, a machine-mode flag or a sentence
for D3 — and documents it in help. On a tool whose parser has a single global flag registry with
no per-path binding, that is a token help now names and the per-path parser does not accept.
Measured on an early adopter's tool, three hours after they reached L0:

```
mycli --version          -> exit 0   {"name":"mycli","version":"2.2.0"}
mycli <verb> --version   -> exit 2   Unknown option '--version'
```

Both correct in isolation. Together they are a documented flag that works at exactly one path.

**Whether that matters depends on what the token IS**, and the honest answer is that this is a
modelling question the declaration format does not currently settle. A `--version` dispatched
alongside `help`, in the verb switch and listed in help's verb block, is a root token that was
never a flag, and nothing disagrees. A `--version` sitting in your flag registry at the root only
is a flag with a path restriction nothing states. The two look identical from outside.

So, two minutes of checking rather than a rule:

1. Run your new token after a verb, not just at the root. `mycli <any-verb> --version`.
2. If it is refused there, decide **deliberately** whether it is a verb or a root-scoped flag, and
   write that down where your help says so.

**The census will not catch this for you** on a tool whose root does not enumerate. The token
lives at the root; the kit probes the root but reads no flag set from a root that names none, and
a [recorded-surface batch](./how-to-record-surfaces-below-the-root.md) refuses a root record by
construction. The report says so — the declared-path fraction falls short and a `NOT COMPARED:
(root)` line names why — so it is a reach limit rather than a silent failure. It is still a limit,
and it sits exactly where this page's advice lands.

## Verification

You are done when all of the following hold:

- `bunx acc check ./your-cli` exits `0`.
- The verdict line reads `CONFORMANT (L0)`.
- Every entry in `knownFailures` corresponds to a failure you intend to fix. An excused rule
  still runs, still reports its verdict, and is marked `(excused)` in the findings list — the
  failure is suppressed for the gate, never hidden:

  ```
  FAIL  D3  help names no machine-mode flag a caller could flip and no schema command: … (excused)
  ```

  The report also names no **stale expectations** — those are entries that now pass and should be
  deleted:

  ```
    STALE EXPECTATIONS (1) — these rules now pass; remove them from knownFailures:
      C1
  ```

  An entry for a rule the run never evaluated is reported separately, and the two call for
  opposite actions — a stale entry means you fixed it, an inert one means the kit stopped
  looking and the defect may be intact:

  ```
    NOT BEING EVALUATED (1) — these knownFailures entries suppress nothing:
      B3
      NOT evidence the defect is fixed — the kit stopped looking. Check it is still
      tracked before removing them.
  ```

- Every entry in `rules` carries a reason you would defend in review. Waived rules appear as
  `WVD` with the verdict they would have reached, so nothing is hidden:

  ```
  WVD   D2  bare invocation exited 0; bare invocation wrote 24 bytes to stdout (waived; would FAIL)
  ```

- Every rule whose `severity` you moved — in either direction — is echoed back with the tier it
  came from, the tier it now binds at, and your reason:

  ```
    SEVERITY MOVED (1) — this project binds differently:
      D3  diagnostic -> core  our agents depend on discovering machine mode from help
  ```

**Do not chase `fullyVerified` at L0.** Every core checker in the catalogue currently declares
`coverage: partial`, so a target with zero violations and zero unverified rules still reports
`fullyVerified: false`. That is the instrument's limit, not yours — see
[coverage](../concepts/conformance.md#coverage-a-pass-can-be-narrower-than-its-rule). The gate
is `conformant`.
