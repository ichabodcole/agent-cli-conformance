---
type: report
generated: { by: claude-opus-5, at: 2026-08-22 }
status: stable
lifecycle: live
description:
  The four release notes published before the version line was reset to a pre-1.0 series,
  preserved verbatim because deleting a GitHub Release destroys its body and these were the only
  copy. The tags and Releases they describe no longer exist.
tags: [release, history, archive]
subject: releases v0.1.1 through v1.0.1, published 2026-08-20 to 2026-08-22
examined: the GitHub Releases API for this repository, before deletion
---

# Release notes from the withdrawn 1.x line

**These tags and Releases have been deleted.** The project reset to a pre-1.0 version line on
2026-08-22, on the reasoning that it is still discovering its own design — see
[the versioning decision](../wiki/decisions/pre-1-0-while-the-design-moves.md). Nothing below is
installable any more; the version numbers are the ones that existed at the time.

The notes are kept because they are the only record of what each release changed, and because
some of the prose was worked hard and is still true about the tool.

---

## v0.1.1 — 0.1.1 — a conformance gate for agent-driven CLIs

_Published 2026-08-20._

`acc` — agent CLI conformance — is a spec and a checker for command-line tools that LLM agents
drive. It runs your CLI, records what came back, and reports which rules it broke.

**The repository is private, so this release is installable only with access to it.**

```bash
bunx acc check ./your-cli
```

Exit `0` if no core rule was violated, `9` if one was. That much is a one-line CI step. Getting a
real tool to green is triage rather than a single command — see the guides below.

The bug class it targets is **the tool that does the wrong thing and reports success**: an unknown
flag absorbed and the command run with defaults; an error written to stderr while stdout carries an
empty result the caller reads as "none"; a confirmation prompt that treats closed stdin as "no" and
exits `0` having done nothing.

## What it checks

23 rules, each a page of spec; 22 have a checker behind them. A sample, to make the level
concrete:

| Rule | The requirement                                                    |
| ---- | ------------------------------------------------------------------ |
| A1   | an unrecognised flag exits non-zero rather than being absorbed     |
| B1   | stdout carries only data — diagnostics go to stderr                |
| C2   | usage errors are distinguishable from internal faults by exit code |
| D4   | help output is byte-identical between runs                         |
| E1   | never block on input when there is no terminal                     |
| F1   | no credential-shaped strings in help or schema                     |
| G1   | the tool does not die by a fault signal on any probe the kit sends |

20 are `core` and gate the verdict; 3 are `diagnostic` — reported, never gating. Rule ids are
append-only: an id is never reused or renumbered, because it travels in stored reports.

**`L0` is the only probe level built**, and it bounds what may be sent: help paths, bare
invocations, and arguments carrying a fixed sentinel token — `acc-probe-xyzzy` — that no real CLI
declares. **21 of the 23 rules reach a verdict there.** The other two say so rather than passing:
`A4` can only be tested by running a real subcommand, which needs a level that does not exist yet,
so it reports `not applicable`; `B4` ships as a rule page with no checker written.

## What a pass actually means

Narrow, deliberately, and the report says so rather than leaving you to infer it.

- **Every checker declares `coverage: partial`.** No rule is established in full. Each one names
  what it did _not_ reach — 90 such gaps across the catalogue, listed per rule in the report rather
  than summarised into a score.
- **The verdict is two booleans, not one.** `conformant` means no core rule was _violated_.
  `fullyVerified` means every applicable core rule was actually _established_ — and because no
  core checker has complete coverage yet, **it is false for every target today, by construction**.
  It is a goal for the kit, not a bar your CLI can clear by improving. Do not plan work around
  reaching it.
- **`unverified` is not a pass.** A probe that ran and settled nothing is reported by name, and
  kept distinct from `not applicable`, which means out of scope at this level.
- **Per-project rules are declarations, not switches.** `acc.config.json` can waive a rule or move
  its severity, with a mandatory reason; `knownFailures` records debt. A waiver can win
  `conformant`. It can never win `fullyVerified` — a rule you declined to be measured against was
  not established. Waived rules are still probed, so the report shows the verdict the waiver
  suppressed.
- **A passing report is not a security certification**, does not establish domain correctness, and
  does not establish that the target is safe to run.

## It executes your binary

There is no sandbox in this release, and `L0` is **risk-reduced, not inert**. The probes are
narrow, but a CLI that does real work on a bare invocation will do that work; a fixed-verb CLI may
ignore the unknown flag and run its default action anyway; the child inherits your full
environment, credentials included; the temporary working directory catches relative paths only, not
writes through `HOME`, absolute paths or subprocesses; and nothing blocks the network.

**Point it at a binary you were already willing to run.** Sandboxing and credential stripping are
on the roadmap and are not here.

## Install

Not on npm, and — as above — the repository is private.

Requires [Bun](https://bun.sh) 1.4+ — to run `acc` itself. What it checks is runtime-agnostic by
construction: the kit touches only argv, streams and exit codes, and executes a target as itself, so
Go, Rust, Python and TypeScript CLIs are probed identically.

```bash
bun add -d git+ssh://git@github.com/ichabodcole/agent-cli-conformance.git
bunx acc check ./your-cli
```

macOS and Linux are tested. **Windows is not supported**: bounding a probe's deadline means killing
the target's process group, which is POSIX-only, so a descendant it spawned can outlive the run.

Start with **Check your first CLI** (`docs/wiki/guides/check-your-first-cli.md`) — ten minutes,
reading real verdicts against fixtures built to pass and to fail. Then **How to reach L0 in your
project** for triaging your own failures into a fix, a waiver, or named debt.

## Also here

- **The spec is browsable from the CLI**: `acc rules`, `acc show <id>`, `acc tags`, `acc schema`.
  Output switches to JSON automatically when stdout is not a terminal, which is the path an agent
  takes.
- **`acc` is the kit's own test subject.** It is built to satisfy the spec and checked against it
  in this project's own CI, so a checker that silently stops detecting shows up as a failing test
  rather than as a green tick. It earned its keep in this release: `acc`'s machine-mode help carried a duration
  field, which its own D4 rule forbids, and the gate caught it.
- **The spec and the checkers are cross-checked in both directions** by a linter, on tier, probe
  level, coverage and named gaps — so a rule page and its implementation cannot quietly disagree.

## Not in this release

`L1` and `L2` — the levels where a CLI declares what its commands do and the kit tries to falsify
those declarations — do not exist, and neither does filesystem hashing, snapshot diffing, or
sandboxing. Observations live in memory and are gone when the process exits, so re-running new
rules against old evidence is not yet possible. `docs/roadmap.md` has the full list, what each item
blocks, and the evidence that each gap is real. Nothing on it is scheduled.

Pre-1.0: rule ids are stable; the report and schema shapes may still change.

---

## [0.1.1](https://github.com/ichabodcole/agent-cli-conformance/compare/v0.1.0...v0.1.1) (2026-08-20)

### Bug Fixes

- **acc:** help must not carry a duration, and the reference implementation carried one ([9a22cc5](https://github.com/ichabodcole/agent-cli-conformance/commit/9a22cc58c2b2ed8b3a3521095933877d97dee989))
- close the review's three overclaims, and make the gate claim true ([8e29ec0](https://github.com/ichabodcole/agent-cli-conformance/commit/8e29ec0c8c1d64db2fe130767f3b9a7cf152ac40))

## v0.2.0 — 0.2.0 — the two rules you already have, reaching your CLI

_Published 2026-08-21._

Everything here came from the first adoption by someone who did not build this: an agent in
another repository was pointed at the URL with a short brief, picked its own targets, and wrote up
what happened. It called the trial "roughly break-even" — not for want of rules, but because the
rules that mattered never reached the CLI. This release is that gap, closed in four places.

**One breaking change, and it is the only thing here that can stop a working setup.** An
unrecognised **top-level** key in `acc.config.json` is now an error rather than an ignored line.
The whole vocabulary is `rules`, `knownFailures` and `machineMode`; anything else fails the run
with a usage error naming the key. The strictness ships with `machineMode` because the new key is
what makes a case-typo dangerous: `{"machinemode": "default"}` parses, declares nothing, and would
have taken the falsification below down with it — silently.

**No new rules.** Still 23, still 22 with a checker, still `L0` only, and `fullyVerified` is still
false for every target by construction.

**But two rules can change their verdicts on unchanged targets.** D1 moves only for a target that
reached the bad clause — no `--version`, or one that crashed; a CLI with a working `--version` sees
identical verdicts and only reworded detail. C2 moves only for a project already waiving D2. And
the key check above turns a previously-passing config into a hard error. If you gate
CI against a recorded baseline, upgrade on a branch and diff the two reports before letting this
version gate anything. "No new rules" is not "no rule behaves differently".

## D1 stops inventing a cause

A CLI with no `--version` at all was told it "requires configuration (failed with an unusable
HOME)". The hostile-HOME clause fired on a non-zero exit alone and never compared the two runs, so
a target that fails identically with and without a usable `HOME` was blamed for a dependency it
does not have. The clause now fires only when the plain run reported a version and the hostile one
did not — narrower than "the runs differ", because differing is not the claim. A target with no
`--version` cannot reach the clause at all.

The same target used to trip three clauses stating one fact. It now reports one:
`--version reported no version: exited 2, stdout empty`.

**Only D1 could produce a false finding of this kind**, and only the clause quoted above. If a
stored report has a D1 failure mentioning `unusable HOME` against a CLI that has no `--version`,
that finding was wrong; re-run. No other rule was affected.

## A machine-first CLI can say so

New top-level key in `acc.config.json`, beside `rules` rather than inside it, because it describes
your tool and not a rule:

```json
{ "machineMode": "default" }
```

It means your CLI writes JSON to a pipe. Two shapes qualify, and the second
is the common one: a tool with no `--json` because there was never a mode to switch into, and a
tool that emits JSON when stdout is not a terminal and prose when it is. Every probe runs against
a pipe, so if your tool would answer a script in JSON, this describes you.

Before, such a target was failed by D3 for advertising nothing (false — there is nothing to
advertise) and B5 had no selector to send, so the rule that checks your error envelope was skipped
on exactly the class of tool this kit is for. Now D3 passes on the declaration and B5 provokes a
parser error with **no selector** — the path your own callers take.

**Declaring it commits you to it.** B5 looks for **one** of stdout or stderr to be exactly one JSON
document on that path — either will do, and it says nothing about the other, which is B1's subject.
Answer in prose and B5 fails you.

**The deterrent bites on prose and not on shape**, and that is a real limit worth knowing before
you rely on it: answer in NDJSON and B5 reports `unverified` rather than failing, because nothing
at `L0` declared which output kind to expect. So a tool that is structured-but-not-one-document can
declare, collect the D3 pass, and pay nothing. Closing that needs a declared output kind, which is
`L1`'s job and is not here.

If your help also advertises `--json`,
**both** paths are probed and the worst answer decides — the classic defect is a format resolved
only from the tokens the parser read before it stopped, so the bare error is a document and the
same error under `--json` is prose.

**`unverified` does not fail your gate** — only a `core` rule actually **violated** does. So
declaring costs you nothing on the gate unless B5 catches a real defect, and it may well: the
classic one is above.

It does not reach everything, and the report says so rather than passing: **B3 stays `unverified`**
under the declaration. B3 reads a data command's output, `--help` is not one, and picking a data
verb that is safe to run needs knowledge `L0` does not have.

D3 takes the declaration on trust where B3 will not guess, and that is a tradeoff rather than a
principle: D3 asks whether machine output is discoverable, and a key in your kit config is a
promise to the kit rather than something a caller of your CLI could find. What is supposed to keep
it honest is B5 testing the same declaration on a path it can reach — with the limit named above.

Config is also loaded before the first spawn now, so a malformed `acc.config.json` is reported
before your target is executed eighteen times.

## Waiving D2 makes a green gate reachable

If your CLI prints help and exits `0` on a bare invocation by design, that one decision was
reported as two core violations: C2 reads the same observation D2 owns, so waiving D2 left C2
failing on the same byte and the gate red. No configuration expressed "bare help is deliberate",
and the only route to exit `0` was to record a permanent design decision as debt.

The config for it, which is a **waiver** and not debt — `knownFailures` is for things you intend
to fix, and this is not one:

```json
{ "rules": { "D2": { "severity": "off", "reason": "bare invocation prints help, by design" } } }
```

A waiver of D2 now withdraws the premise C2 was resting on — C2 does not discover that its
invocations are usage errors, it inherits that from A1, A2, A7 and D2 — so the bare shape drops
out of C2's comparison. Only rules that inherited the premise are affected: E1 and G1 still read
that same observation and still reach their verdicts on it.

Two guards, both worth knowing:

- The shape drops only if it **behaved like the premise**. A waiver of D2 declares a help path, and
  a help path exits `0`. A bare invocation exiting `64` where every other usage error exits `2`
  stays in the comparison and is still reported as a C2 failure.
- A narrowed pass says what it left out (`the D2 shape was excluded, waived by config`), and fewer
  than two surviving shapes is `unverified`, not a vacuous pass over a population of one.

Nothing in your config says C2 reads D2's observation, and nothing in it would need editing if that
stopped being true.

## Every report names the kit version it was produced by

`kitVersion` in the JSON report, `[acc <version>]` on the end of the text headline. The documented
install can succeed at exit `0`, print a commit SHA, and put **different bytes on disk** — Bun's
extracted-package cache goes stale independently of the bare clone — and until now `acc --version`
was the only place that showed.

**Be exact about how far this reaches.** The version only moves when a release is cut, so it
catches staleness that spans a release and not staleness within one. Pin a tag and the check is
meaningful. Pin a branch or nothing and a stale copy reports the same version as a fresh one — for
that case `bun pm cache rm` before installing is still the only reliable answer, at the cost of a
re-download. The README now documents both arms of the install failure, the loud and the silent.

## Docs

`acc` writes JSON when its output is piped and the human report when it is not — and `AI_AGENT`
selects JSON even at a terminal. That is the contract this kit asks of everyone else, so it applies
to itself, and no document said so. The tutorial, the getting-started path and the adoption guide
now do, and `--format text` — called the best artifact the tool makes by the one outsider who found
it — appears in the first code block.

New: `docs/techniques.md`, eleven techniques that each caught a real defect in this repository,
with what they caught kept attached. Three of them caught defects in the changes above, during this
release: a declaration that suppressed a real B5 failure, a waiver exclusion that made a real C2
failure vanish, and a falsifiability test that stayed green with its entire feature deleted.

## Not in this release

Multi-target runs (`acc check ./a ./b ./c`) and the JSON report's ~40% duplication between
`coverageGaps` and `evidenceGaps` are both real, both reported from outside, and both on the
roadmap rather than here — the second is blocked on versioning the report shape first.

These changes were scoped by the first adoption trial. The second one — which is what will say
whether any of it worked — has not been run yet.

---

## [0.2.0](https://github.com/ichabodcole/agent-cli-conformance/compare/v0.1.1...v0.2.0) (2026-08-21)

### Features

- **kit:** a CLI can declare machine mode is its default ([1bf0993](https://github.com/ichabodcole/agent-cli-conformance/commit/1bf0993cce3d0916b5c3b9ce5fee122058b905ae))
- **kit:** every report names the kit that produced it, and the docs name the pipe ([51ac40f](https://github.com/ichabodcole/agent-cli-conformance/commit/51ac40f3b6704d205851f8a7f65091989eb63802))

### Bug Fixes

- **kit:** a declaration must not excuse the path it does not cover ([ad62e9b](https://github.com/ichabodcole/agent-cli-conformance/commit/ad62e9b6c883f0de7532d0573fe0b31975b91b9f))
- **kit:** a waiver excuses a rule, it does not blind the kit to what the target did ([408edc2](https://github.com/ichabodcole/agent-cli-conformance/commit/408edc24944f7b35f5dcf2b3172d6eca5ff9dd92))
- **kit:** a waiver withdraws a premise, so C2 stops failing on a waived shape ([56b07a7](https://github.com/ichabodcole/agent-cli-conformance/commit/56b07a784e1e0c908691b3941faf954ced309cc8))
- **kit:** D1 must not accuse a target of a dependency it does not have ([a24b2eb](https://github.com/ichabodcole/agent-cli-conformance/commit/a24b2eb9ffd6b21277e3d3dcbf4d57d3b3f715fa))

## v1.0.0 — 1.0.0 — a machine mode is declared, never inferred

_Published 2026-08-21._

## Before anything: check the upgrade actually happened

`bun add` pointed at a **different ref does not replace the dependency.** It appends a second entry
under the same key, prints a `warn: Duplicate key` line in output nobody reads, and resolves the
**first** one. You get the old version, at exit 0, with no error — and every claim below will look
false to you because you are still running v0.2.0. An adopter measured v0.2.0 against itself for
half a round before catching it.

```sh
bun remove agent-cli-conformance && bun pm cache rm && \
  bun add -d 'git+ssh://git@github.com/ichabodcole/agent-cli-conformance.git#v1.0.0'
```

**You need all three, in that order.** `bun remove` fixes the duplicate key described below.
`bun pm cache rm` fixes a _different_ trap the README already documented — a stale bare clone —
and an upgrade always needs it, because **a release tag is by definition pushed after your first
install**, so the tag you are asking for is the one your cache cannot see. Skip it and you get
`no commit matching "v1.0.0" found (but repository exists)`, which reads like a missing tag.

`bun pm cache rm` — the remedy for the two stale-clone traps already in the README — does nothing
here; the cache was never the problem. Confirm with `acc --version` before trusting any diff.

**This trap is `bun`-specific and unverified elsewhere.** If you install with npm, pnpm or yarn,
the duplicate-key behaviour above may not apply — but check what you actually resolved before
believing any claim in this note, because measuring the old version against itself is the failure
mode, whatever the package manager.

## Does your build break?

**Three ways it can, and only the first is automatic.** (`core` rules gate: one reporting `fail`
exits `9`. `diagnostic` rules are printed and never affect the exit code. `L0` is the probe level
everything runs at today.)

1. **You assert on the score.** The denominator moved — see below. Automatic; affects everyone.
2. **Your config still says `machineMode`.** The key was renamed and the old spelling is a hard
   error, not an ignored key: `acc.config.json has an unknown key "machineMode" (known: rules,
knownFailures, defaultOutput)`, exit `2`. The whole run aborts before your target is executed.
3. **You add the new declaration, correctly.** Declaring subjects two clauses to judgement **for
   the first time**, and they may well fail you. This is the one to plan for; it has its own
   warning below.

Nothing changes verdicts by itself: with your config untouched and no score assertion, every
verdict moves _away_ from failure and your exit code is unchanged.

But **the denominator moved**, because B3 left the level. Measured on the kit's own conforming
fixture:

```
CONFORMANT (L0) — 0 core violated, 1 core unverified, 16 core partially covered
  core 16/17 · violations 0 · unverified 2 (all tiers; 1 core) · partial coverage 16 core · diagnostics 0
```

The `core 16/17` on the second line is the one to look at: the denominator is `counts.core`, and
`counts.notApplicable` now lists `["A4", "B3"]` where it listed only `["A4"]`.

B3 was applicable under v0.2.0, so whatever `counts.core` read for your target then, it is one
lower now.

`unverified` and not-applicable **do not affect the exit code** — measured: a target with unverified
rules exits `0`, a target with a core failure exits `9`. So if your CI asserts on `counts.core`, a
rule count, or a substring of the headline, update it. If your CI checks the exit code, nothing
changes.

## Breaking: the machine-mode rules no longer fire unless you declare machine mode

Until now the kit read `--json`, `--format` or `--output` out of your `--help` and treated the match
as proof that your tool had a machine mode — a mode in which it emits structured output (JSON)
rather than prose. It is not proof. `--json <file>  Treat the input file as JSON` is an ordinary
help entry on a human-first CLI, and against a target of that shape v0.2.0 reported **three core
violations**, all for answering in prose a contract the tool never entered:

```
NOT CONFORMANT (L0) — 3 core violated
  FAIL  B3  machine-mode stdout is neither one JSON document nor NDJSON
  FAIL  B5  machine mode via --json and the parser error came back as prose on stderr (exit 2)
  FAIL  D1  --version in machine mode did not emit a JSON document ("1.0.0")
```

Nothing is inferred now: machine mode is **declared** or it is not established.

**Who loses coverage.** Anyone whose target has a real machine mode and who was relying on the
inference to exercise it. These rules go quiet rather than passing — quiet meaning they still print
a line, but no longer reach a judgement:

- **B3** (machine output parses as the kind it declares) reports **not-applicable**, and this one
  is not about the declaration at all: its subject is a data command's output, and nothing at this
  probe level can pick one safely, so it sends no probe. **Declaring does not bring B3 back** —
  measured, it reports not-applicable with the declaration in place.
- **B5** (a broken invocation must still answer as a document while in machine mode) reports
  **`unverified`**, with the remedy in the message.
- **D1** (`--version` works with no configuration, and answers as a document in machine mode) still
  **passes** — its other clauses were measured directly. Only the machine-mode payload clause is
  skipped, and the pass says so.
- **A3** (errors name the offending token) still **passes** on its prose clause; only its
  machine-mode clause is gated on the declaration. So on a typical target `coreUnverified` rises
  by one (B5), not two.

### The remedy, and who it is for

**Add this only if your tool emits JSON with no flags at all** — that is what the key asserts, and
the kit will try to falsify it:

```json
{ "defaultOutput": "json" }
```

as a top-level key in `acc.config.json`, alongside `rules` and `knownFailures`.

**The key was `machineMode: "default"` in v0.2.0 and has been renamed.** The old spelling is now
rejected as an unknown key — deliberately, so a stale config errors instead of quietly declaring
nothing. The new name says what is actually checked: the kit accepts **JSON only** (object, array
or NDJSON), not YAML, CSV, TSV or XML. `"machineMode"` read as "standard settings" to more than
one reader, and a broader word like "structured" or "machine-readable" would have invited a
truthful declaration from a CSV- or table-emitting tool that the kit would then fail.

⚠ **Declaring turns on clauses that have never run against your tool. Try it locally before you
commit it:**

```sh
acc check ./your-cli --config-dir . --format text ; echo "exit=$?"
```

This is not a warning for dishonest declarers. It is for honest ones. A tool that genuinely emits
JSON for every data command, and prints a plain version string for `--version` like nearly every
CLI does, is now judged on that — measured:

```
NOT CONFORMANT (L0) — 1 core violated
  PASS+ B5  the parser error arrived on stderr as one JSON document (exit 2)
  FAIL  D1  machine mode is declared the default, so --version must emit a document;
            it emitted "1.0.0"
exit 9
```

That is a true finding — an agent driving that tool gets JSON everywhere except the version — but
it is a finding you acquire the moment you declare, not one you had yesterday. Budget for it.

⚠ **If your JSON is behind a flag, do not add this at all.** The declaration says your output is
JSON with no flags. Declare it when it is not and the kit sends a bare parser
error, gets prose, and fails you on B5 and D1 — two core failures you do not have today. There is
currently **no declaration for a flag-selected machine mode**; for that shape these rules stay
quiet, and that gap is now written on each rule page rather than implied.

The declaration is not new — it shipped in v0.2.0 under the old name — but it was one of two routes
and is now the only one.

## An excused rule the run never evaluated is now reported as inert

A `knownFailures` entry for a rule the run does not evaluate suppresses nothing and never expires.
With B3 becoming not-applicable in this release, an existing entry for it becomes exactly that — so
you could go on believing a defect was tracked and gate-suppressed when it was neither.

The report now carries `inertExpectations: Array<{ ruleId, reason }>` alongside `staleExpectations`,
printed as its own message, because the two call for opposite actions:

```
  stale expectations (now passing, remove them): A1
  not being evaluated (B3) — these entries suppress nothing. NOT evidence the defect is fixed;
         the kit stopped looking, so check the defect is still tracked before removing them
```

**The safe action for an inert entry is to leave it.** It costs nothing — like `staleExpectations`
this gates nothing — and deleting it loses the only record that the defect was ever tracked.
Additive: `staleExpectations` keeps its shape, and a consumer ignoring the new field is unchanged.

## D3 (help advertises the machine-readable path) — diagnostic, gates nothing

- **A flag documented with a required value slot (`--json <file>`) no longer counts** as a
  machine-mode flag, so a tool whose only `--json`-shaped flag takes a value moves from `PASS` to
  `FAIL` here. **Do nothing about this.** D3 is diagnostic, your exit code is unaffected, and
  rewriting an accurate help entry to satisfy it would be changing your public interface for a
  line of output.
- **`acc.config.json` does not satisfy D3, and the message now says so.** A declaring target used to
  get a message about prose matching that named no remedy; it now names the two rules that do read
  the key and points out that a caller of your CLI reads your help, not the kit's config file.
- **A flagless machine-first tool cannot reach a `D3` pass by any route** — now written on the page
  as a gap. Saying so in your help moves the verdict from `fail` to `unverified` and no further, so
  **do not edit your help text expecting a pass here.** Prose cannot buy one.

## Further reading

`docs/wiki/concepts/probing.md` states what this probe level may and may not assume, which is the
rule new checkers are now measured against. `docs/reports/2026-08-21-what-we-are-actually-deciding.md`
explains the problem from scratch for a reader who does not know the rule identifiers.

---

## [1.0.0](https://github.com/ichabodcole/agent-cli-conformance/compare/v0.2.0...v1.0.0) (2026-08-21)

### ⚠ BREAKING CHANGES

- **kit:** a machine mode is declared, never inferred from a flag's spelling
- **kit:** the declaration is defaultOutput: "json", named for what is checked
- **kit:** a machine mode is declared, never inferred from a flag's spelling
- **kit:** targets that never declared lose the machine-mode verdicts at L0, and gain a line naming the one-line config that restores them. A target that declared is unaffected.

### Features

- **kit:** a machine mode is declared, never inferred from a flag's spelling ([d1d2d8f](https://github.com/ichabodcole/agent-cli-conformance/commit/d1d2d8f809170c0ee14e2137937454104a0478c3))
- **kit:** a machine mode is declared, never inferred from a flag's spelling ([637c47a](https://github.com/ichabodcole/agent-cli-conformance/commit/637c47ae2d2ee9f28dcbe88c1fa6e4aa8eb162d7))
- **kit:** a machine mode is DECLARED, never inferred from a flag's spelling ([3bb9462](https://github.com/ichabodcole/agent-cli-conformance/commit/3bb94628557464f6d723954f23837d6a82c25de2))
- **kit:** an excuse the run never evaluated is inert, not stale ([c7183aa](https://github.com/ichabodcole/agent-cli-conformance/commit/c7183aa45d73b45e46dd6ed404c54e4297a98881))
- **kit:** the declaration is defaultOutput: "json", named for what is checked ([530359c](https://github.com/ichabodcole/agent-cli-conformance/commit/530359c301038d389b6cca09e6c5ba13e417dd9e))

### Bug Fixes

- **d3:** a claim matched in prose downgrades a failure, it does not buy a pass ([8ed80db](https://github.com/ichabodcole/agent-cli-conformance/commit/8ed80db263fc4c59b89c7b41ecb3b4aa83c7f9f1))
- **kit:** a declaration is not a licence to skip the half the target got wrong ([1bab1c3](https://github.com/ichabodcole/agent-cli-conformance/commit/1bab1c3027e62c27cc3dcfb8c80c82705f8f0b3e))
- **kit:** a flag named --json is not proof that --json selects anything ([40c080e](https://github.com/ichabodcole/agent-cli-conformance/commit/40c080e031386ae978c49123a270933b6c4245f2))
- **kit:** a flag that requires a value is not a mode switch ([0bc739a](https://github.com/ichabodcole/agent-cli-conformance/commit/0bc739af5f1728893acbf8ecfceaeb1acd108eef))
- **kit:** a promise made in help is the one worth testing ([4dd177d](https://github.com/ichabodcole/agent-cli-conformance/commit/4dd177de16f1f939ac82c78853be9818f712a2a5))
- **kit:** a selector is established by a CONTRAST, not by a document appearing ([0e36d8b](https://github.com/ichabodcole/agent-cli-conformance/commit/0e36d8b60118a69efdccc42ef2f93d104d9aa87a))
- **kit:** a sentence in help must not be able to fail your build ([fdbb5b5](https://github.com/ichabodcole/agent-cli-conformance/commit/fdbb5b53ee0caaa8a23a213d18c8e1397024e544))
- **kit:** corroboration may decide whether a rule can condemn, never a rule that already answered ([ef1ca57](https://github.com/ichabodcole/agent-cli-conformance/commit/ef1ca57e5ad6382734ea78237187a43203f9a8f2))
- **kit:** D3 reads help, not our config ([a676736](https://github.com/ichabodcole/agent-cli-conformance/commit/a676736f55837aec6f84ecfa4c9c2ed833ac00b1))
- **kit:** tell a declaring target that its declaration was seen ([913896d](https://github.com/ichabodcole/agent-cli-conformance/commit/913896d61eaf4edd5676d6501188efe94f142b8c))
- **kit:** the corroboration guard was wrong in four places an outside review measured ([d7102f7](https://github.com/ichabodcole/agent-cli-conformance/commit/d7102f7c4a639b4ffe6f8565c3d621b7345cdf45))
- **kit:** the pipe-conditional patterns could not tell stdin from stdout ([ba1311e](https://github.com/ichabodcole/agent-cli-conformance/commit/ba1311e444093966b826bb250cfa82edb6fde964))

## v1.0.1 — 1.0.1 — the documented upgrade command, corrected

_Published 2026-08-22._

If you installed the previous release, read the first item before you upgrade. The upgrade command
the README documented does not complete **when your bun cache predates the tag you are asking
for** — which it does for anyone who installed before this release was cut — and the way it fails
looks like a missing tag.

**The upgrade command needs all three steps.**

```sh
bun remove agent-cli-conformance
bun pm cache rm
bun add -d 'git+ssh://git@github.com/ichabodcole/agent-cli-conformance.git#v1.0.1'
acc --version    # confirm you got what you asked for
```

The README previously documented `bun remove && bun add`. That fixes one failure and leaves the
other in place.

- **`bun remove`** is for the duplicate key. `bun add` with a new ref does not replace the
  dependency — it appends a second entry under the same key and resolves the first, so you get the
  old kit at exit `0`. Use the key **as it appears in your `package.json`**, which is not
  necessarily the repo name.
- **`bun pm cache rm`** is for bun's cached bare clone of the repo. An upgrade always needs it: a
  release tag is pushed after your first install, so the tag you are asking for is the one your
  cache cannot see. Skip it and bun says `no commit matching "<tag>" found (but repository
exists)`, which reads like a missing tag rather than a stale cache.
  ⚠ **This clears bun's whole global cache** at `~/.bun/install/cache`, not this package's entry —
  it takes no package argument. Cheap on a laptop, expensive in CI, where it cold-caches every
  dependency of every job sharing that runner. Do not put it in a build step.
- **`acc --version`** is not optional politeness. Both failures above succeed at exit `0` while
  giving you the old kit, so the only way to know the upgrade landed is to ask.

**Check your committed files, not just your machine.** The duplicate entry is written to
`package.json`, so it is committed and your CI installs from it. Measured — a `package.json` after
re-pointing at a ref:

```
"agent-cli-conformance": "git+ssh://…/agent-cli-conformance.git",
"agent-cli-conformance": "git+ssh://…/agent-cli-conformance.git#v1.0.0"
```

If yours has two, fix the file and the lockfile. And if a previous upgrade silently no-opped, your
conformance runs since then were the old kit's verdicts — worth re-running before trusting them.

**Two findings about your `acc.config.json` are now sections, not legend lines.**

In `--format text`, the report used to append these to the bottom of the symbol legend, indented
like glossary entries. They now render as their own titled sections above it, with counts:

```
  STALE EXPECTATIONS (1) — these rules now pass; remove them from knownFailures:
    C1

  NOT BEING EVALUATED (1) — these knownFailures entries suppress nothing:
    B3
    NOT evidence the defect is fixed — the kit stopped looking. Check it is still
    tracked before removing them.
```

They are separate because they call for opposite actions. A **stale expectation** is a
`knownFailures` entry for a rule that now passes — delete it. An entry that is **not being
evaluated** is one the run never reached a verdict on, so the defect may be entirely intact —
check it is still tracked in your issue tracker before deleting it. Both exit `0`; neither gates.

⚠ **If anything of yours greps `--format text`, this will stop matching.** The lines moved above
the legend and gained `(n)` counts, and the failure is silent: a check that used to catch stale
entries goes quiet and reads as "no findings." `--format json` is unchanged, including the
`staleExpectations` and `inertExpectations` fields, and is the stable surface for scripts.

Also in this release: the README's tag-pinning example now names the current release rather than
one three releases back. Everything else in the range is internal writing guidance and project
notes with no effect on the tool.

---

## [1.0.1](https://github.com/ichabodcole/agent-cli-conformance/compare/v1.0.0...v1.0.1) (2026-08-22)

### Bug Fixes

- **cli:** a finding about the reader's config is a section, not a legend entry ([12f22ca](https://github.com/ichabodcole/agent-cli-conformance/commit/12f22ca7b2f970ee51023a5d8fad1e51cd167794))
- **cli:** correct the documented upgrade command, and lift config findings out of the legend ([195a722](https://github.com/ichabodcole/agent-cli-conformance/commit/195a7222a51a4450d47cb9eb7f6574f18536dd0c))
- **cli:** test the rendered report, and correct the specimens that drifted from it ([bbcfe50](https://github.com/ichabodcole/agent-cli-conformance/commit/bbcfe50821cf2e05ef57a6cda8512fe975936c18))
