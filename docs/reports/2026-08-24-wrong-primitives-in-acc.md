---
type: report
generated: { by: claude-opus-5, at: 2026-08-24 }
status: stable
lifecycle: live
description:
  An ontology analysis of `acc`'s own vocabulary — nine places where one named thing is two, five
  where one concept is spread across several names, and a seven-primitive decomposition scored
  against the project's open questions.
tags: [conformance, probe-level, declaration, evidence, config, verdict]
subject: src/acc/** and docs/wiki/**, read as a vocabulary rather than as an implementation
examined: acc at 78b84b6 on `develop`, catalogue of 23 rules, 22 implemented checkers
---

# Wrong primitives in `acc`: the fusions, the splits, and a proposed decomposition

This project keeps producing questions of the form _"is this an X or a Y?"_ that get answered and
then reopen. The premise of this analysis is that a boundary question which will not stay answered
is a symptom, not a difficulty — it means the names are cutting the domain in the wrong place. So
the subject here is not the code's correctness but its **vocabulary**: which named things carry two
concepts, which concepts are scattered across several names, and what set of primitives would make
the recurring questions either unaskable or trivial.

**This is an analysis, not a plan.** Where a primitive implies a product change, it is named in a
sentence and left there. No sequencing is proposed and none should be read in.

Finding ids are prefixed `WP-` throughout. The unprefixed `F1`, `F2`, `A6`, `D1`, `B3` and so on
that appear inside the findings are **rule ids from the catalogue**, and they are a different
namespace — `WP-F2` is the finding about `deviation`; `F2` is `safety/first-byte-prompt`.

---

## Part 1 — Where one named thing is actually two

### WP-F1. `probe_level` fuses _hazard_ with _warrant_ (and leaks into _reach_)

**The claim in the docs.** `docs/wiki/concepts/probing.md:28` — "**`probe_level` bounds what may be
sent**, and it is the field that decides whether a rule is applicable to a run at all." Two jobs in
one sentence, and the table at `:31-35` describes a third thing entirely: L0 = "risk-reduced", L1 =
"invocations the target has **declared** read-only", L2 = "mutating, inside a contained
environment". L0→L1 is a _declaration_ step; L1→L2 is a _containment_ step. They are not "more of
the same."

**The wrong result.** Two rules sit at `L1`, for orthogonal reasons:

- `A4` — `src/acc/kit/checkers/parsing/unexpected-positionals.ts:26`, `probeLevel: "L1"`. Reason at
  `:12-18`: "Testing arity means actually invoking a subcommand, which is only safe once the kit
  knows that command has no side effects." **Pure hazard.**
- `B3` — `src/acc/kit/checkers/streams/machine-output-parseable.ts:28`, `probeLevel: "L1"`. Reason
  at `:63-64`: "no machine mode was DECLARED, and a flag matched from help by spelling is a guess
  at one rather than evidence of one; add `defaultOutput` to acc.config.json and this rule becomes
  reachable at L1." **Warrant**, with a hazard clause bolted on at `:52-55`.

**The unanswerable question this produces, live in the tree.** `probing.md:37-43` says "**Four rules
stop at the same `L1` boundary, for the same reason**" — A3, B3, B5, D1 — "Their `coverage_gaps` all
say some version of 'no declaration exists at `L0`'." But three of those four are declared
`probeLevel: "L0"` in code: `names-offending-token.ts` (A3), `machine-mode-holds-on-parser-error.ts`
(B5), `version-flag.ts` (D1). Only B3 is `L1`.

So one identical condition — _no declaration exists_ — is encoded as `probeLevel` for one rule and
as `coverage_gaps` for three, and `src/acc/kit/report.ts:523` branches on `probeLevel` alone:

```ts
applicable: !unchecked.has(f.ruleId) && LEVEL_RANK[probeLevel] <= LEVEL_RANK[level],
```

Result: B3 is reported `notApplicable` while A3/B5/D1 are reported `applicable` + `unverified` +
`partial`. Same fact, three different report treatments, and no principle in the tree tells you
which is correct. That is the boundary question that will not stay answered.

**B5 is the disproof of the level ladder.** B5 requires a declaration (`src/acc/kit/machine-mode.ts:75`,
`if (!d.machineModeDefault) return [];`) and is `probeLevel: "L0"`. So "needs a declaration" ≠ L1.
The ladder has no consistent rung.

---

### WP-F2. `deviation` does not cross `tier` — it very nearly _is_ `tier`, and both are really _warrant_

`docs/wiki/SCHEMA.md:117-118` asserts: "`deviation` answers a different question from `tier`, and
**the two cross rather than nest**. **`tier` decides whether a violation gates CI. `deviation`
decides what a violation means.**"

**The catalogue falsifies it.** Across all 22 implemented checkers (`src/acc/kit/checkers/**`), the
2×2 has one populated off-diagonal cell:

|              | `defect` | `design-choice`                                                                                                                                       |
| ------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `core`       | 18 rules | **1** — D2 (`discoverability/bare-invocation.ts:13-14`)                                                                                               |
| `diagnostic` | **0**    | 3 — D3 (`discoverability/advertises-machine-mode.ts:61-62`), A6 (`parsing/double-dash-terminator.ts:32-33`), F2 (`safety/first-byte-prompt.ts:21-22`) |

Every `diagnostic` rule is a `design-choice`. 21 of 22 rules are on the diagonal. A field that
discriminates one rule out of twenty-two is not an independent axis — it is `tier` with a second
name and a runtime side effect (`report.ts:577`,
`waivedCore = waived.filter(f => f.tier === "core" && f.deviation === "defect")`).

**And the report already found the real axis.**
`docs/reports/2026-08-22-design-choice-is-l1-leaking-into-l0.md:31-36` tabulates all four
`design-choice` rules against "the declaration that would settle it" and gets a clean 4-for-4;
`:44-45` — "on the current catalogue, `design-choice` and _'a declaration would resolve this'_ pick
out the same four rules." Its own diagnosis at `:57` is the right one: "**A `design-choice` rule at
`L0` supplies its own assertion.**"

So `deviation` is not "what a violation means." It is **whose assertion the rule rests on** — the
catalogue's own stipulation (`design-choice`) versus a claim no target can coherently deny
(`defect`). That is the same axis WP-F1 found inside `probe_level`. Two fields, three names, one
concept.

---

### WP-F3. `HELP_TOKENS` fuses a _hazard class_ with a _subject identification_

`src/acc/kit/inert.ts:13`:

```ts
const HELP_TOKENS = new Set(["--help", "-h", "help", "--version", "-V", "-v"]);
```

This one set drives two unrelated decisions:

1. **Safety.** `classifyInertness` at `inert.ts:118-123` certifies an argv as `help-path` — the
   class `inert.ts:24-25` calls the one whose "property makes the help-path class provably safe" —
   if every token is in `HELP_TOKENS ∪ FORMAT_TOKENS` and at least one is in `HELP_TOKENS`.
2. **Verdict.** C1 probes `["-h"]` (`checkers/exit-codes/help-exits-zero.ts:48`) and asserts exit 0
   with non-empty stdout (`:109-110`).

**The wrong result, reproduced.** `docs/reports/2026-08-23-triaging-the-argument-grammar-survey.md:57-104`
(`SURV-1`): against a fixture whose `--help` is correct and whose `-h` prints a disk table — the
GNU `df -h` / `du -h` / `ls -h` / `sort -h` sense, plus `redis-cli -h`=host, `psql -h`, `mysql -h`,
`samtools view -h`=header, `tabix -h`:

```
C1 pass | root --help and -h both exit 0 with non-empty stdout
→ CONFORMANT (L0), 0 core violations
```

"The tool did real work on the probe and was credited with answering a question it was never asked."

**Both halves are wrong at once, and the kit already knows the argument.** `triaging:96-100` puts it
exactly: `machine-mode.ts` declines `--output` as a selector because "it names an output FILE at
least as often as an output format," and calls a probe whose meaning depends on which sense a target
implements "not a probe" — "**`-h` is that sentence with a different letter.**" `probing.md:70-72`
states the governing rule in a table — "Use a spelling to choose which probe to SEND" is permitted;
"Use that spelling to reach a verdict" is forbidden — and the code violates it because _one list
serves both uses_. `-v` and `-V` are in the same set and not currently probed, so that exposure is
latent rather than live.

**The shape of the fix already exists in the codebase, for exactly one class.** `types.ts:10-14`
argues `bare` must be its own class rather than "a side effect of an empty `args` array satisfying
`help-path` or `no-verb` vacuously" — i.e. the hazard claim was deliberately separated from the
meaning claim once, and nowhere else.

---

### WP-F4. `defaultOutput` asserts _four_ things about _four different subjects_

`src/acc/kit/config.ts:113` — `defaultOutput?: "json"` — glossed at `:87` as "my tool emits JSON
with no flags at all." One boolean reaches `Discovery.machineModeDefault` (`types.ts:207`, wired at
`commands/check.ts:170`) and licenses four distinct claims:

| reader | claim it licenses                                           | citation                                                                                |
| ------ | ----------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| B5     | _every parser error_ is one JSON document                   | `machine-mode.ts:65-67`; `checkers/streams/machine-mode-holds-on-parser-error.ts:56-61` |
| B3     | a _data command's_ stdout is one JSON document              | `checkers/streams/machine-output-parseable.ts:62-63`                                    |
| D1     | plain **`--version`** stdout parses as a document           | `checkers/discoverability/version-flag.ts:151-158`                                      |
| A3     | the error document carries the offending token _in a field_ | `checkers/parsing/names-offending-token.ts:141-146`                                     |

**The wrong result.** `version-flag.ts:151-158` fails a core rule against any machine-first CLI that
prints `1.4.0` for `--version` — a near-universal and entirely defensible design:

```ts
if (h.discovery.machineModeDefault && !noVersionAtAll && plain.exitCode === 0) {
  if (!parsesAsDocument(plain.stdout)) {
    problems.push(`machine mode is declared the default, so --version must emit a document; …`);
```

The declaration the author wrote was "my data is JSON"; the kit reads it as "every byte I ever
write, on every path, is JSON." `machine-mode.ts:65-67` performs the widening explicitly: "it says
machine output is the DEFAULT. So every parser error this target produces must be a document,
whichever invocation provoked it."

**The concept it should have been is already written down, in another vocabulary.**
`docs/wiki/concepts/output-kind.md:22-26` declares output kind **per command** (`data` / `stream` /
`opaque`), with `cardinality`, `stream_format`, `media_type` beside it. `defaultOutput` is a
per-_tool_ flat boolean standing in for a per-_(command, surface)_ declaration — and B5 already
trips over the gap: `machine-mode-holds-on-parser-error.ts:138-140` returns `unverified` on NDJSON
because no `output_kind` was declared.

---

### WP-F5. `acc.config.json` fuses _policy_ (unfalsifiable) with _declaration_ (falsifiable)

`config.ts:192` — `TOP_LEVEL_KEYS = ["rules", "knownFailures", "defaultOutput"]`. Two are the
caller's _policy_; one is a _claim about the target_:

- `rules` — "this rule binds differently for my tool" (`config.ts:56-77`). Not truth-apt. Its own
  comment: "a waiver is not debt. It never goes stale, because passing was never the goal."
- `knownFailures` — "this rule is broken for my tool, I know, I will fix it" (`config.ts:79-85`). An
  intention.
- `defaultOutput` — falsifiable, and the file says so at `config.ts:103-107`: "a declaration can be
  FALSIFIED and an inference cannot… A target that declares this and answers in prose fails B5."

**The repeated argument this produces.**
`docs/wiki/decisions/not-in-the-config-not-inferred.md:104-116` spends a whole paragraph defending
why `tier`/`deviation` overrides do _not_ violate the page's own "no hidden values" principle — a
defence only needed because policy and declaration share one file and one schema. Then `:144-159`
rules that a _shape_ key (`helpFlags`) must **not** go into `acc.config.json` at all, because it
belongs to L1's declaration format. That boundary is drawn by hand, per key, with no primitive
underneath it: "settle enough of `L1`'s declaration shape to know where a shape key belongs, and
then add it, rather than adding it and reconciling later."

**The measured cost.** `2026-08-22-design-choice-is-l1-leaking-into-l0.md:91-93`: an adopter named
this as a reason not to put the kit in CI — committing an `acc.config.json` to a repository that
does not otherwise depend on `acc`, purely to record a design decision, is _"dead config carrying a
live opinion."_ That is precisely the complaint that policy and declaration are fused into one
artifact.

---

### WP-F6. `Checker` is a _rule_ and an _instrument_ in one interface — and `coverage` is the seam

`src/acc/kit/types.ts:298-371` puts normative rule facts (`tier`, `deviation`, `probeLevel`,
`rulePath`) in the same object as instrument facts (`probes`, `check`, `coverage`, `coverageGaps`,
`coverageEstablished`). The only standalone rule representation in the kit is `UncheckedRule`
(`types.ts:394-403`), which duplicates five of those fields and exists solely because B4 has no
checker (`registry.ts:67-75`). Its own comment concedes the duplication: "The fields mirror
`Checker`'s so `buildReport` can read either through one lookup."

**There is in fact a _third_ representation, and the two user-facing surfaces read from different
stores.** `acc rules` never touches the registry: `src/acc/commands/rules.ts:52-71` calls
`loadGraph()` and filters `p.type === "rule"`, projecting wiki frontmatter into a `RuleRow`
(`rules.ts:12-39`). `acc check` reads `CHECKERS` (`registry.ts:32-55`). They meet only in
`docs/wiki/lint.ts` and `registry.test.ts` — string comparison, never execution. And `graph.ts:20-45`
carries `ruleId`/`tier`/`probeLevel`/`coverage`/`deviation` as _optional untyped strings_ on a
generic `WikiPage`, and does not parse `checker_status` or `coverage_established` at all. That is
the structural reason B4 could be listed by `acc rules`, rendered by `acc show B4`, and absent from
every check report: the two surfaces have no shared object.

**The wrong result — stated by the roadmap itself.** `docs/roadmap.md:396-409`:

> "A false-positive risk and ordinary undercoverage push the headline in **opposite** directions,
> and they are filed in the same list. Undercoverage narrows a `pass`: 'only root help is scanned'
> means a green line covers less ground than the page. A false-positive risk widens a `fail`: it
> means the checker may report a violation the target did not commit. `coverage: partial` is defined
> as a qualifier on a pass, so it **cannot carry the second kind at all** — which is not a
> theoretical objection. G1 was the first instance: it carried 'a signal the kit did not send is
> attributed to the target' as a coverage gap while failing on operator interrupts and OOM kills its
> own rule text excluded, so a wrong `conformant: false` and exit `9` were reachable with the
> mismatch fully documented and fully inert."

`roadmap.md:411-430` names two surviving instances — B3 failing a tool whose help is not JSON, and
D3's verdict turning on the three literals in `MACHINE_FLAGS` so that `--porcelain` or `-o json`
gets "help names no machine-mode flag or schema command", "a reported violation of a rule it
satisfies." `:439-448` then recommends a **`falsePositiveRisks: string[]`** sibling field — the
rule/instrument split arriving as an ad-hoc schema patch, debated on instance-count, because the
ontology has no place for "the instrument's own error modes."

**`coverage` is currently a constant.** All 22 checkers declare `coverage: "partial"`.
`docs/wiki/concepts/conformance.md` says so outright: "At `L0`, **every** core checker in the
catalogue is `partial`, so `acc check` on `acc` itself reports `conformant: true, fullyVerified:
false`." `SCHEMA.md:169-172` says it again from the other side. A field with one value carries no
information; it is a rounding of a _reach_ description into a boolean.

**And `roadmap.md:378-386` names the deeper problem:** the lint compares three copies of a
_declaration_ — "A checker whose `coverageEstablished` reads 'root `--help` exits 0 with non-empty
stdout' while its `check` forgot the stdout half satisfies this lint on all three copies and is
wrong on all three. The lint compares strings to strings; nothing in it ever runs the checker." 32
mutation fixtures owed (`:388-394`). `SCHEMA.md:236-241` records the same limit.

---

### WP-F7. `unverified` carries at least four distinct meanings, distinguishable only in prose

`types.ts:256-261` defines the three-verdict vocabulary and gives `unverified` **one** gloss: "the
probe could not run — the target had no subcommand to nest under, no machine-mode flag to test." The
findings actually emitted carry four:

1. **Evidence void** — hung / truncated / crashed. `finding.ts:46-48`, `:77-79`, `:148-150`, called
   by all nineteen spawning checkers.
2. **Attempted, inconclusive** — `checkers/parsing/advertised-value-set.ts:155-157` ("neither
   refusal can be attributed"); `checkers/lifecycle/does-not-crash.ts:140-146` (an unattributable
   signal); `checkers/streams/stdout-carries-only-data.ts:96-100` ("no failing invocation was
   produced").
3. **No premise — nothing was declared** — `advertised-value-set.ts:98-100` ("this target has made
   no declaration to falsify"); `machine-mode-holds-on-parser-error.ts:67-69`;
   `machine-output-parseable.ts:63-64`; `checkers/exit-codes/usage-distinguishable.ts:194-196`.
4. **No instrument** — `report.ts:461-469`, synthesised for B4: "no checker exists for this rule yet,
   so this run establishes nothing about it."

**No machine-readable field distinguishes them.** `Finding` is exactly four fields
(`types.ts:262-269`: `ruleId`, `verdict`, `detail`, `evidence`); `Verdict` is a flat union
(`types.ts:261`); every field `ReportedFinding` adds (`report.ts:17-73`) is a property of the _rule_
or of _project config_, not of why the probe established nothing. `applicable` (`report.ts:66-72`)
draws a _different_ line and says so in its own comment: "'out of scope here', a different claim
from `unverified`'s 'tried and could not establish it'."

**Two pieces of code prove the field is missing.** `stdout-carries-only-data.ts:98-99` populates
`evidence[]` deliberately so a sense-2 finding is not misread as sense-4 — overloading the evidence
array to carry a meaning. And `primaryProblem` re-derives the distinction from raw `History`,
because the report cannot answer it:

```ts
// report.ts:414-420
const hung = h.observations.some((o) => o.timedOut);
const crashed = h.observations.some((o) => o.crashed);
return (
  (hung ? pick("fail", "E1") : undefined) ??
  (crashed ? pick("fail", "G1") : undefined) ?? …
```

Hard-coded rule ids, plus a reach back past the report into the raw observations. That is the
strongest available evidence that there is no field to read.

---

### WP-F8. The report is a _measurement_ and a _judgement_ — and it is welded to a population of one

`src/acc/spec.ts:211-213` —
`positionals: [{ name: "target", description: "Path to the binary or script to check.", required: true }]`.
One target, not variadic; no `targets` array anywhere in `src/`.
`checkCommand(targetPath: string, …)` at `commands/check.ts:109`. `Report.target: string` at
`report.ts:140`. Exit `9` is a per-target verdict (`check.ts:420-424`).

**The measurement that has no home.** The cross-CLI run in
[the eight-CLI report](./2026-08-24-eight-owner-clis.md) — **15 of 23 rules returning an identical
verdict on all eight targets** (`§1`: nine always `PASS+`, three always `UNVR`, three always `N/A`,
leaving eight that discriminate); the six Spellbook CLIs producing one verdict vector six times; the
real inconsistencies (exit `1` vs `2` for the same error class, `§2(a)`; `--help` to stdout / to
stderr / as JSON, `§2(b)`) reported by **no rule at all** (`§3`) — is unrepresentable in every layer:
the argv, the `Report` type, and the exit code. A cross-target inconsistency is not a property of any
target, so no per-target rule can ever state it.

**And it is not new.** `docs/research/2026-08-15-defect-archaeology.md:114-129`: "On **all four**
Spellbook CLIs tested, at every tree, the complete set of rules `acc` reports as failing is: D1, D2,
D3. Three failures, all D-family, unchanged across four CLIs and eight trees." The same paper's §1.1
gives the hit rate — 1 of 7 real defects caught — and §1.5 concludes "The bias the kit was suspected
of having is measurable and total on this corpus."

`roadmap.md:513-530` names the fix — `acc check ./a ./b ./c`, "reporting the **intersection**
separately from the per-target deltas… **the shared row is the finding**" — but files it _below_ the
`---` at line 488, outside the numbered dependency order. And `roadmap.md:205-206` shows the
population is fixed at 1 even in the unbuilt durable-artifact design: the only comparison notion in
the whole data model is "comparison across versions of the same tool."

**The justification for the multi-target item is already known-broken, and today's measurement is
its replacement.** `docs/wiki/decisions/require-a-config-never-raise-ownership.md:126-131`: the
roadmap "cites that line as a settled constraint… The argument for reporting an intersection across
several targets survives on its own evidence, but it is currently resting on a sentence that is
being withdrawn, so it needs rewriting to rest on the measurement instead."
[`2026-08-24-eight-owner-clis.md`](./2026-08-24-eight-owner-clis.md) _is_ that measurement, filed the
day after the sentence asking for it.

The unanswerable question the fusion generates: _is this tool conformant?_ has an answer; _are my
eight tools consistent with each other?_ has no expressible subject.

---

### WP-F9. Two fusions not on the candidate list

**WP-F9a. `inertness` fuses the argv classification with the safety claim.** `inert.ts:53-101`
spends fifty lines walking this back: "It classifies ARGV, and what it establishes is a NEGATIVE
about the tokens… It is NOT enough to say no work is performed, **and this comment used to say
exactly that one paragraph above the list that contradicts it**." The field is named for the
property it does not establish. `triaging:172-181` widens the population beyond the prompt-shaped
CLIs the file names: `ffmpeg` ("anything that cannot be interpreted as an option is considered to be
an output url"), `sqlite3` (first positional is a DB path, created if absent), `ogr2ogr`, `cdo` —
"the same hole with a different cost — **a file gets written** — and they are ordinary developer
tools nobody would think to guard against."

**WP-F9b. `Discovery` fuses what was _read off the target_ with what the _caller declared_.**
`types.ts:191` — "What could be learned about the target's surface before probing it" — then
`machineModeDefault` at `:207` is a config key, not a discovery, injected at `check.ts:170`. The
field's own comment (`types.ts:200-206`) has to explain why it is not folded into `machineModeFlag`.
Warrant is invisible at the point of use: `names-offending-token.ts:141` reads
`h.discovery.machineModeDefault` with no structural marker that this premise came from a person
rather than from help text.

---

## Part 2 — Where one concept is spread across several names

### WP-S1. A rule's metadata exists in three synchronised copies, per rule

`SCHEMA.md:252-255`: "`tier`, `probe_level`, `coverage`, `coverage_gaps` and `coverage_established`
must be identical on both sides" — page frontmatter and checker source — and `SCHEMA.md:216-223`
adds a third copy in the page's prose (`## Current checker coverage`, "verbatim and in order").
`SCHEMA.md:225`: "Three copies of each list is the price of the copy a reader sees being the checked
one." Changing one rule's tier is a three-file edit gated by a bidirectional lint.
`roadmap.md:378-386` concedes what that buys: "every copy is a copy of the DECLARATION."

### WP-S2. "Which spellings mean what" lives in five places

`HELP_TOKENS` (`inert.ts:13`), `FORMAT_TOKENS` (`inert.ts:27`), `MACHINE_FLAGS` (`discovery.ts:4`),
`machineSelector`'s narrower accept-list (`machine-mode.ts:24-28` — `--json` and `--format` only),
and D3's own recognition logic. `triaging:106-134` (`SURV-2`) is the cost: `discovery.ts:259-261`
applies the value-slot exclusion to `--json` only —

```ts
MACHINE_FLAGS.find((f) => flags.includes(f) && !(f === "--json" && takesRequiredValue(lines, f)))
```

— so `--output <file>` scores as a machine-mode advertisement. Reproduced:
`D3 pass | help advertises --output`. Fixing "what counts as machine mode" requires edits in three
files that no lint binds together, and `roadmap.md:425-430` files the same literal list as one of
the kit's two standing false-positive risks.

### WP-S3. "The evidence is void" has four names and one re-derivation

`hungUnverified` / `truncatedUnverified` / `crashedUnverified` (`finding.ts:41`, `:72`, `:141`), plus
`spawnFailed` handled elsewhere (`types.ts:177-184`), plus `primaryProblem` re-deriving all of it
from `History` (`report.ts:414-420`). Every checker must call the right subset in the right order and
document its exceptions in prose — C1's exception essay runs 25 lines (`help-exits-zero.ts:84-108`).
Adding a fifth void-mode is an edit in nineteen checkers.

### WP-S4. "Not established" is spread across seven report fields

`verdict: "unverified"`, `applicable`, `coverage`, `coverageGaps`, `evidenceGaps`, `notApplicable[]`,
`inertExpectations` (`report.ts:299-314`). `roadmap.md:532-545` measures the consequence: the first
outside adopter "measured roughly 40% duplication and reported that `jq` is mandatory to read
anything."

### WP-S5. The caller's frame is spread across six more

`rules`/`severity` → `waived` + `tier` + `severityOverrides`; `knownFailures` → `excused` +
`knownFailures[]` + `staleExpectations` + `inertExpectations`. `config.ts:341-358` must
hand-adjudicate which pairs contradict (waiver + knownFailure is rejected; severity-move +
knownFailure is allowed); `report.ts:528-535` then needs a defensive guard for a combination the
loader already rejects.

---

## Part 3 — The proposed primitives

Seven. Each independent of the others; composed, they express everything the current vocabulary
expresses.

### WP-P1 — **Hazard**: what an invocation may do to the world

The classification of an `Invocation` by blast radius, from argv and env alone. Today's `inertness`,
renamed to what it establishes, with the safety claim stated separately rather than implied by the
name. It never mentions meaning: `["-h"]` is `flags-only` because every token starts with a dash,
full stop.

> **Against it.** Hazard is not one axis — it is (writes-outside-cwd × spends-money × spawns-daemons
> × takes-network-action), and the classes we have are a lattice over argv _shape_, not over
> consequences. `inert.ts:69-89` already lists four ways each class leaks. The honest counter: hazard
> is _unknowable_ from outside, and what we actually have is `argv-class`, a proxy. If that is right,
> WP-P1 should be renamed accordingly and hazard becomes a _declared_ property (WP-P2) rather than a
> computed one — which would be cleaner, and would dissolve WP-F9a completely.

### WP-P2 — **Warrant**: whose assertion a claim rests on

A four-valued tag on every _premise_ a rule uses: `observed` (the kit measured it), `declared`
(someone asserted it in a config or IR — falsifiable, authorship immaterial per
`require-a-config-never-raise-ownership.md:87-91`), `stipulated` (the catalogue's own default, which
no target asserted), `absent` (nothing establishes it). This is the axis WP-F1, WP-F2 and the
design-choice report each found separately.

> **Against it.** `declared` and `stipulated` may be one thing seen from two sides —
> `design-choice-is-l1:62-65` argues precisely that a `design-choice` rule _is_ the kit supplying its
> own assertion, i.e. `stipulated` collapses into "a declaration with the wrong author." If so,
> warrant is three-valued, and the distinction that survives is only _who_ declared — which the same
> repo elsewhere rules non-material. I keep the fourth value because `absent` versus `stipulated` is
> the difference between "we did not judge" and "we judged against our own default," which produce
> different report lines. This is the primitive I hold least firmly.

### WP-P3 — **Subject**: which surface of the target a claim is about

A pair `(path, channel)` — _path_ ∈ {help, version, error, data-command, bare}, _channel_ ∈ {stdout,
stderr, exit-code, timing}. `output_kind` (`output-kind.md:22-26`) is a declaration _over subjects_;
`defaultOutput` is that declaration flattened to one bit.

> **Against it.** Subject may be a coordinate of the Observation rather than a primitive: every
> observation already has an argv and two streams, so subject looks derivable. The counter is WP-F4 —
> the _declaration_ must be indexed by subject before any observation exists, so it cannot be a
> projection of one.

### WP-P4 — **Reach**: which subjects the evidence actually touched

Replaces `coverage` / `coverageGaps` / `coverageEstablished` with a set-difference over WP-P3: the
rule names the subjects it binds on, the instrument records the subjects it sampled, the gap is
_computed_. This makes `roadmap.md:378-386`'s "every copy is a copy of the DECLARATION" structurally
impossible for reach — though not for predicate correctness, which is WP-P5's problem.

> **Against it.** Reach is only mechanisable if subjects are enumerable, and several real gaps are
> not subject-shaped. "stdout is only required to be non-empty and is never checked to contain help
> text" (`help-exits-zero.ts:40`) is about _predicate strength_, not about which path was sampled.
> WP-P4 covers perhaps two-thirds of today's `coverage_gaps`; the rest need WP-P5 or stay prose. A
> decomposition that silently drops a third of the data is worse than the fused field.

### WP-P5 — **Instrument**: the checker as a thing with its own error modes

A first-class object distinct from the rule, carrying the predicate, the probes it requests, its
reach (WP-P4), and — the field the fused design cannot hold — its **false-positive risks**:
conditions under which it reports a violation a conforming target did not commit. This is
`roadmap.md:439`'s recommendation, arriving as a consequence of the ontology rather than as a schema
patch argued over instance-count.

> **Against it.** Splitting rule from instrument doubles the objects for a catalogue where 22 of 23
> rules have exactly one instrument, and `UncheckedRule` already shows the duplication cost — five
> fields copied. If the mapping stays 1:1 forever, this is ceremony. The rebuttal: the mapping is
> _already_ not 1:1 in the direction that matters. `roadmap.md:411-430`'s two false-positive risks
> are properties of code that no rule page can hold; A6's Bun-launcher blindness
> (`probing.md:257-260`) is an instrument defect reported as a target verdict — "**loud, and wrong**
> — `FAIL` blaming the target for something it never received"; and WP-F6's `acc rules` / `acc check`
> store split means the two objects already exist, just not in the same place.

### WP-P6 — **Policy**: the caller's frame, not truth-apt

Everything that is a decision rather than a claim: gate weight (`tier` override), accepted debt
(`knownFailures`), non-applicability (`severity: "off"`). A separate artifact from declarations.
`conformant` is computed inside a policy; `fullyVerified` is computed outside one — which is what
`conformance.md` already says: "`conformant` is a claim **inside a declared frame**; `fullyVerified`
is measured against the catalogue, whatever the frame says."

> **Against it.** A waiver with a required `reason` is arguably a _declaration in prose_.
> `roadmap.md:262-271` builds an entire roadmap step on treating waiver reasons as "evidence about
> the SPEC" — "If many projects waive the same rule for the same stated reason, that rule needs an
> archetype rather than a waiver" — and `conformance.md` treats a waived `design-choice` as "the
> nearest thing `L0` has to a target declaring its own contract." If a waiver is a proto-declaration,
> WP-P6 and WP-P2's `declared` are not cleanly separable, and this split would have to be walked back
> for exactly the rules it most wants to fix.

### WP-P7 — **Population**: the set of targets a judgement is over

One or many. A report is over a population; a per-target report is the |P|=1 case. Cross-target
predicates — intersection, delta, consistency — are expressible only here.

> **Against it.** The weakest claim to primitivity: a population report looks derivable by running
> |P| single-target reports and joining them, which is what `roadmap.md:513-530` implies. The reason
> it is nonetheless primitive: the interesting predicates are _not_ per-target facts. "These eight
> CLIs exit `1` and `2` for the same error class" is true of no member of the set. Any predicate over
> a set that is not a conjunction of member predicates needs the set as a subject.

---

## Part 4 — Re-deriving the open questions

Test set: `docs/plans/2026-08-23-clear-the-runway-then-take-off.md:216-223` ("Open, and not decided
here"), plus the open lists in `blind-trial-ripgrep.md:176-183`, `design-choice-is-l1:111-121`,
`require-a-config-never-raise-ownership.md:157-208`, `not-in-the-config-not-inferred.md:127-140`, and
`roadmap.md`.

### Dissolve — the question stops being askable

1. **"Is 'the target's shape is undeclared' a coverage gap, a new inertness-style class, or simply
   the definition of what `L1` is for?"** (`clear-the-runway:218`, `blind-trial:180`). Under
   WP-P2/WP-P4 it is none of the three: it is `warrant: absent` on a premise. Not reach (WP-P4 is
   about what was sampled, not what was assumed), not hazard (WP-P1 never touches meaning), and not a
   level (there is no level under WP-P1–WP-P7). The three-way question exists only because
   `probe_level` and `coverage_gaps` are both candidates for holding it — WP-F1.

2. **"Does the `design-choice` correlation survive a fifth rule?"** (`design-choice-is-l1:113`).
   Under WP-P2 there is no correlation to test: `design-choice` _is_ `warrant: stipulated`, so a
   fifth rule cannot break the pattern any more than the fifth prime can be even. The interesting
   residue is a real question the current vocabulary cannot ask: _should the catalogue stipulate
   anything?_

3. **"Should `A2`/`A3`/`C2` **caveat** their verdicts against an undetermined-shape target, or
   **withhold** them?"** (`clear-the-runway:220`, `blind-trial:178`, `require-a-config:203-208`).
   Under WP-P2/WP-P4 there is no third option to weigh: a rule whose premise is `warrant: absent` has
   no verdict to caveat. `PASS+ A2` against `ripgrep` (`blind-trial:59` — "`rg` accepted the token
   and did work — a **false pass**") is not a pass needing a footnote; it is a claim with no premise.
   The word "caveat" became grammatical only because `coverage: partial` exists as a
   qualifier-on-a-pass.

4. **"Should `fullyVerified` distinguish a waived `defect` from a waived `design-choice`?"** —
   answered yes and shipped (`design-choice-is-l1:118-121`). Under WP-P2/WP-P6 it never arises:
   waiving a `stipulated` rule withdraws a premise the target never granted; waiving a `defect`
   withdraws a measurement. Different operations on different objects.

5. **"Trim `evidenceGaps` or `coverageGaps` — the report says everything twice"**
   (`roadmap.md:532-545`). Under WP-P4/WP-P5 `evidenceGaps` is a projection of reach-differences and
   verdicts, not a stored field. No duplication to trim because there is no second copy — and the
   versioning dependency the roadmap attaches to it (`:543-545`) evaporates with it.

### Answer trivially

6. **"Should `B4` appear as `N/A` with a stated reason, and does the reason generalise to any future
   rule without a checker?"** (`blind-trial:182`, `clear-the-runway:103`). Yes, and it generalises by
   construction: a rule with no instrument (WP-P5) has reach = ∅ and `warrant: absent`; the report
   prints that state for any rule in it. No `UncheckedRule` shadow type needed.

7. **"Should a distinct `falsePositiveRisks: string[]` be minted?"** (`roadmap.md:439-448`). It is
   not an addition — it is a field of the Instrument (WP-P5). The debate over whether two instances
   clear the bar for a schema change disappears, along with the argument at `:444-448` that the field
   would carry entries "whose intended lifetime is until step 6 lands."

8. **"Where does a shape key belong — `acc.config.json` or L1's IR?"**
   (`not-in-the-config:144-159`). Mechanical under WP-P3/WP-P6: `defaultOutput`'s replacement is
   indexed by `(path, channel)`, so it cannot be a flat top-level key in a file whose other two
   members are policy. The artifact split follows from the type rather than from a sequencing
   judgement, and the roadmap's narrower warning about _spelling_ (`roadmap.md:299-316`) becomes a
   consequence rather than a separate decision.

9. **"Should `-h` be probed as help?"** (implied by `SURV-1`). Under WP-P1/WP-P3: `-h` may be _sent_
   (WP-P1 — flags-only argv) and may not _identify_ subject `help` (WP-P3 — subject is declared or
   observed, never spelled). C1's `-h` probe survives; C1's `-h` verdict does not. Same answer covers
   `-v`/`-V` before they become live.

10. **"Is the report one thing or two?"** Two, and the second is |P| > 1. `acc check ./a ./b ./c` is
    the |P|=8 case; today's product is the |P|=1 special case; and `roadmap.md:528-530`'s worry that
    "a report about several targets is a different document shape" is answered — it is the same shape
    with a different population.

### Genuinely open — **my primitives do NOT resolve these**

11. **Whether a required config key may be answered `"unknown"`** (`not-in-the-config:127-140`).
    WP-P2 says `"unknown"` _is_ `warrant: absent`, and omission already expresses it — which leans
    against the key but does not settle it, because the real question is **gate design**: whether
    forcing an author to type a word they do not mean produces better or worse declarations than
    letting them omit it. The page says so itself at `:131-133` — "what would settle it is looking at
    the actual cases where somebody reaches for it, which nobody has yet collected." No ontology
    answers that.

12. **The exit code for a missing config — `2`, or a new one in the `1`–`8` band**
    (`require-a-config:157-168`). WP-P6 places a missing policy artifact as an invocation failure
    rather than a target verdict, so it sits below `9` — already decided on that page. Whether "you
    have not written the file" and "your file is broken" deserve _different_ codes is a
    taxonomy-allocation question with a real consumer tradeoff (`:167-168`: "an agent branching on
    the code may want to tell those apart"), and nothing in WP-P1–WP-P7 bears on it.

13. **Locale-dependence and the missing environment coordinates** (`SURV-3`, `triaging:136-147`;
    `SURV-7`, `:217-236`). The same target, kit and argv give `A6 pass` under `LC_ALL=de_DE` and
    `A6 fail` under `LC_ALL=C`, because `runner.ts` spawns with `{...process.env, ...inv.env}` and A6
    decides on `/unknown (option|flag)/i`. WP-P5 files this as an instrument false-positive risk — an
    improvement — but does not say whether the fix is pinning the environment, recording it as a
    report coordinate, or abandoning natural-language detection. I considered an eighth primitive for
    observation coordinates and rejected it: I could not distinguish it from "more fields on
    `Observation`," which `roadmap.md:222-224` already scopes as "a schema-and-persistence job over a
    data model that is substantially there."

14. **Exit-code bitmasks and delegator passthrough** (`SURV-8`, `SURV-9`, `triaging:238-277`). WP-P3
    lets you name _which_ exit code you are discussing; it does not tell you whether a bitmask is a
    taxonomy or its own kind, or how to judge a tool that does not own the code it returns. That is
    archetype/profile work (`roadmap.md:230-283`), and I am deliberately not proposing a Profile
    primitive — see Part 5.

15. **"Should `L0` shrink?"** (`design-choice-is-l1:105-107`). WP-P1–WP-P7 delete the level ladder,
    so the question becomes "which rules should the catalogue stipulate?" — reframed, not answered.
    The rule-by-rule judgement is unchanged, and `design-choice-is-l1:123-129` is right that the
    catalogue is more useful with the four than without.

16. **"One checker reports one finding, and the second one hides"** (`clear-the-runway:181-189`; C2
    reports the declared-taxonomy mismatch only once D2 is waived). WP-P5 makes an Instrument's
    output a _set_ of findings rather than a single `Finding`, which is a straightforward consequence
    — but whether `conformant` and the exit code are then computed over the set or over a primary is
    a design question my primitives leave untouched.

17. **Whether the third trial should be a blind agent against a wrapper-fronted CLI**
    (`clear-the-runway:222`). Not an ontology question. Listed so the test-set accounting is
    complete.

**Score: 5 dissolve, 5 answer trivially, 7 stay open.** The honest reading: these primitives are
aimed squarely at the _declaration / inference / scope_ cluster, where the boundary questions
concentrate. They do almost nothing for archetype-and-profile questions or for environment
reproducibility.

---

## Part 5 — Fusions I am deliberately keeping

- **`conformant` / `fullyVerified` as exactly two booleans.** They are already the decomposition
  (`conformance.md`: one inside a frame, one outside), and WP-P6 makes the split principled rather
  than adding to it. Do not add a third.
- **`core` / `diagnostic` as a single binary gate weight.** Tempting to split into (severity ×
  does-it-gate-CI). It is one thing: does a violation stop the build. `deviation` should be
  _absorbed_ into warrant (WP-F2), not multiplied further.
- **The three-verdict vocabulary.** `report.ts:456-458` is right that this is "a contract stored
  reports carry." Add a **typed reason** to `unverified` (WP-F7); do not add a fourth or fifth
  verdict. Four reasons on one verdict is one axis; five verdicts is a fused one.
- **`Observation` bundling streams, digests, exit code, signal and timing.** `types.ts:48-188` argues
  each field's necessity individually, and the bundle is the natural unit of one process's death.
  Splitting by channel would make every checker reassemble it.
- **The four `inertness` classes as one enum.** Do not decompose per-token. `types.ts:10-14`'s
  argument for keeping `bare` distinct is the right _granularity_; going finer produces a classifier
  nobody can hold in their head, and `inert.ts`'s fail-closed property depends on the class list
  being short enough to enumerate exhaustively.
- **No `Profile` / archetype primitive.** `roadmap.md:230-283` wants declared profiles and is
  probably right, but `:275-279` gives the sequencing argument I am honouring: "written from theory,
  a profile catalogue is a guess about which archetypes exist; written from accumulated waiver
  reasons, each profile starts from projects that already stated the incompatibility in their own
  words." A profile is a _bundle_ of WP-P2 declarations. Minting it now would be inventing the
  population.

---

## Part 6 — What I could not resolve

Beyond the seven open questions in Part 4:

- **Whether WP-P2's `stipulated` survives.** If the design-choice report's argument is followed to
  its end, the catalogue should not stipulate at all, and warrant becomes three-valued. I could not
  settle it from the tree; it depends on whether the catalogue's value to a _new_ CLI
  (`SCHEMA.md:145-151`: "A team starting a new tool can adopt the catalogue wholesale and get a
  coherent set of interface decisions") is worth the false verdicts it produces against mature ones.
- **Whether WP-P4 (reach) can absorb predicate-strength gaps.** Roughly a third of today's
  `coverage_gaps` entries are about how weakly a predicate is written, not about which subject was
  sampled. I have no mechanism for those, and I would rather say so than claim WP-P4 covers them.
- **The relationship between WP-P6 (policy) and WP-P2's `declared`.** The waiver-as-proto-declaration
  reading (`roadmap.md:262-271`, `conformance.md`'s asymmetry) is strong enough that I cannot rule
  out these being one primitive with two report projections.
- **Nothing here is a roadmap.** Where a primitive implies a product change — a per-subject
  declaration format, a typed `unverified` reason, a population-valued report, an Instrument object
  with false-positive risks — I have named it in a sentence and stopped, as briefed. The sequencing
  of any of it is not mine to propose.

---

**Correction carried:** the catalogue is **23 rules**, not 24 — `acc rules` lists 23, `registry.ts`
holds 22 implemented checkers plus one `UNCHECKED_RULES` entry (B4), and a report carries 23 findings
with three not-applicable. The measurement's ratio is therefore **15 of 23** returning an identical
verdict across all eight targets, not 16 of 24: the original's 16 was `24 − 8`, and the same
subtraction against the true total gives 15, the count of discriminating rules being unchanged at
eight because it was never derived from the total. The eight-CLI report re-derives all fifteen from a
fresh run and itemises the cohorts —
[`M8-0`](./2026-08-24-eight-owner-clis.md#m8-0--the-denominator-is-23-not-24). That is the number in
WP-F8 above.
