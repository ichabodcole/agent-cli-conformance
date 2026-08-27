---
type: concept
title: Conformance
description:
  What `acc check` means by `conformant` and `fullyVerified`, and why a target can be conformant
  without being fully verified.
tags: [conformance, verdict, evidence, agent-facing]
related:
  [
    concept/exit-codes,
    rule/unknown-flag-exits-nonzero,
    rule/machine-output-is-parseable,
    rule/usage-errors-are-distinguishable,
  ]
status: stable
generated: { by: claude-opus-5, at: 2026-08-15 }
---

# Conformance

## What it is

`acc check` reports two booleans, and they answer different questions.

**Conformant** — **no applicable core rule FAILED.** Violations only. Every core rule the kit
could apply at this probe level either passed, was excused under `knownFailures`, or was waived
in the project's `acc.config.json`. This is the headline verdict, and it is what the exit code
reflects: a non-conformant target exits `9`.

**Fully verified** — conformant, **and no applicable core rule classified `defect` was waived, and
every applicable core rule passed, and every applicable core checker declares `coverage:
complete`.** Every core rule that binds for this tool was actually established, not merely left
unfalsified. A waived `design-choice` does not block it — see
[below](#a-waiver-costs-the-evidence-claim-only-when-the-rule-is-a-defect).

The difference between those two lists is the whole design. `conformant` is a claim **inside a
declared frame**; `fullyVerified` is measured against the catalogue, whatever the frame says.
[Below](#the-frame-a-verdict-was-reached-in) is why that asymmetry exists.

Three verdicts feed those two claims, and the middle one is the whole point:

| Verdict      | Meaning                                     | Blocks conformance | Blocks full verification |
| ------------ | ------------------------------------------- | ------------------ | ------------------------ |
| `pass`       | the probe ran and the rule held             | no                 | only if `partial`        |
| `fail`       | the probe ran and the rule was broken       | **yes**            | **yes**                  |
| `unverified` | the probe could not establish either answer | no                 | **yes**                  |

A fourth state, **not applicable**, is not a verdict at all: the rule's `probe_level` exceeds
the level the run was made at, so it was never attempted. "Out of scope here" and "tried and
could not establish it" are different claims, and a report that collapses them cannot be acted
on.

A **waived** rule is not a fifth verdict either. Its checker still runs and still returns one of
the three above; the waiver changes only what that verdict is allowed to bind. See
[waivers](#waivers-a-rule-that-does-not-apply-to-this-tool).

**Full verification is scoped to the run's probe level, always.** "Fully verified at `L0`" is a
claim about the rules `L0` can reach, not about the catalogue — which is why the level is
printed beside the verdict rather than left implicit.

### A waiver costs the evidence claim only when the rule is a `defect`

Every rule page carries a [`deviation`](../SCHEMA.md#rule-pages-carry-extra-frontmatter):
`defect` where no defensible alternative exists, `design-choice` where a different design can be
right. `fullyVerified` reads it.

| waived rule is… | `conformant` | `fullyVerified` | why                                                                 |
| --------------- | ------------ | --------------- | ------------------------------------------------------------------- |
| `defect`        | unaffected   | **blocked**     | the project chose not to be measured against a real failure         |
| `design-choice` | unaffected   | **kept**        | the target is stating a design the catalogue does not require of it |

**The asymmetry is the point.** Waiving a `design-choice` is the nearest thing `L0` has to a
target declaring its own contract — "a bare invocation returns my command manifest" — and a claim
the target makes and the kit accepts is verification, not a gap in it. Waiving a `defect` is the
opposite: an evidence claim that survived it would be worth nothing.

This distinction only became expressible once every rule was classified. Before that both waivers
looked identical, and a tool with a deliberate design paid the same price as one suppressing a
known bug. `acc rules --deviation defect` lists the rules where a waiver still costs.

### Coverage: a pass can be narrower than its rule

The `pass` row above carries a qualifier the other two do not: it blocks `fullyVerified` only
when the checker declares `partial` coverage. A rule page states several normative clauses; a
checker establishes some subset of them. Every rule page declares which case it is in:

| `coverage` | What a `pass` from that checker means                                  |
| ---------- | ---------------------------------------------------------------------- |
| `complete` | the whole rule held                                                    |
| `partial`  | nothing the checker looked at was violated — the rest was not examined |

A `partial` page must list its `coverage_gaps`: one phrase per normative clause the checker
does not establish. The kit's own lint compares that list against the checker file in both
directions, so a gap cannot be closed in prose without being closed in code.

This was not a hypothetical. [C2](../rules/exit-codes/usage-errors-are-distinguishable.md)
returned `pass` with the detail `internal-fault contrast unverified at L0`;
[A2](../rules/parsing/unknown-command-exits-nonzero.md) returned `pass` with
`nested case not probed at L0`. Both admissions were true, and both were counted as ordinary
passes — so `fullyVerified` could be `true` over gaps the report itself had already printed. In
the text report a narrow pass is marked `PASS+`, and every gap blocking the claim is named in
full beneath the findings.

At `L0`, **every** core checker in the catalogue is `partial`, so `acc check` on `acc` itself
reports `conformant: true, fullyVerified: false`. That is the correct answer, not a defect to
paper over: closing those gaps is what the higher probe levels are for.

`core` versus `diagnostic` is the other axis. Only core rules bind: a diagnostic failure is
reported, counted, and never blocks either claim.

## Why it matters for agents

Splitting the two claims is a correctness fix, not a softening.

Conflating them — treating an unverified core rule as disqualifying — makes the verdict say
something false. `git` is the illustration, and it is a good one precisely because it is not a
clean sheet. One capture — taken with acc `0.1.0`, and kept as taken, because a capture whose
version stamp is refreshed without re-running it would claim a run that never happened; the
subject here is the shape of the two claims, not the line's current format — with the thirteen
passing rules elided:

```
NOT CONFORMANT (L0) — 2 core violated, 2 core unverified, 13 core partially covered  /opt/homebrew/bin/git  [acc 0.1.0]

  UNVR  A7  root help advertises no closed value set for any flag, so this target has made no declaration to falsify
  UNVR  B5  no machine mode was DECLARED, and a flag matched from help by spelling is a guess at one rather than evidence of one; add `defaultOutput` to acc.config.json to have this checked
  FAIL  C2  the same error class produced different codes (unknown-flag 129, unknown-verb 1, bare 1); this verdict assumes the first positional selects a subcommand, which nothing at L0 established
  FAIL  D2  bare invocation wrote 2290 bytes to stdout
  FAIL  D3  help names no machine-mode flag a caller could flip and no schema command: --json, --format and --output are looked for as bare switches, and one documented with a value slot is a flag that takes a value rather than one that selects a mode

  core 13/17 · violations 2 · unverified 2 (all tiers; 2 core) · partial coverage 13 core · diagnostics 1
```

_Re-captured 2026-08-26 from Homebrew's `git` 2.55.0 on macOS/arm64, against this catalogue at 23
rules._ The capture it replaces was taken on 2026-08-20 from the same `git` and had since drifted
from the tool in four places at once — `B3` had left the report, the unverified count and the core
denominator had both moved, and two findings had been reworded. **That is this project's own
defect class, in its own documentation**: the page nobody reopens after changing the code it
quotes. It was found because an adopter asked what `C2`'s exit codes referred to. Read it as one observation with coordinates, not as the result. Every number in it moves:
the totals with the catalogue, the byte count and the exit codes with the build — a different
2.55.0 build on the same machine reports a different `D2` size. What the example is for is the
_shape_ of the answer, and that has been stable while the numbers have not.

D3 is `diagnostic`, so it is reported and binds nothing. Of the two that do bind, both are real
violations and `git` is non-conformant for them, on their own merits:
[C2](../rules/exit-codes/usage-errors-are-distinguishable.md) because an unknown flag exits
`129` while an unknown verb exits `1`, so one error class answers with two codes; and
[D2](../rules/discoverability/bare-invocation-is-a-usage-error.md) because bare `git` writes
its usage text to stdout, where a consumer reads it as output, rather than to stderr.

B3's line is not a violation of anything. `git` advertises no machine-mode flag, so
[B3](../rules/streams/machine-output-is-parseable.md) had nothing to parse and said so — "could
not establish it", not "broke it". The same is true of the other two: `A7` found no advertised
value set to falsify, and `B5` no machine mode it could select. (The capture predates several of
these. B3 has since moved to `L1` and reports not-applicable for every target at `L0`, and `B5` now
answers only to a declaration — the reasoning is
[the `L0` admission test](./probing.md#what-l0-may-assume--the-admission-test). `D3`'s line has
moved too: it no longer promises that `B3` will be unverified as a result, because that knock-on
stopped being true once B3 became an `L1` rule reachable only through a declaration, and the
message now names the bare switches it looked for instead. The point the capture makes about
`unverified` is unchanged.) Counted as failures,
those three would have told git's maintainers they had broken five rules — three of which name
nothing they did wrong — mixed in with two they can act on today. The first thing a maintainer does with a gate that cannot tell
those apart is turn it off.

The opposite error is worse, and it is the one this whole catalogue exists to prevent: letting
`unverified` quietly count as a pass. A probe that could not run is not a probe that succeeded.
So `unverified` is never folded into the pass count, is always reported by name, and always
blocks `fullyVerified`. It just no longer masquerades as a violation.

The practical shape: **`conformant` is the gate; `fullyVerified` is the goal.** A project
adopts the kit by getting to conformant, then works the unverified list down — today by
DECLARING what the kit is not allowed to guess at (`defaultOutput` in `acc.config.json` is what
moves the machine-mode rules off `unverified`), and eventually by declaring the rest of it, once
there is a portable format to write it in. Advertising `--json` in help does not move them and
never should have: a flag's spelling is not its meaning, and
[`L0` may not infer one](./probing.md#what-l0-may-assume--the-admission-test). That is the direction the spec wants a tool to move; the second half of
it does not exist yet, and is
[roadmap step 6](../../roadmap.md#6-the-portable-declaration-ir).

`fullyVerified` is a goal for the kit as much as for the target. Half of it is the target's
work — nothing failing, nothing unverified. The other half is the kit's own, and no core
checker has earned complete coverage yet. Reporting the target's half as if it were both is the
failure mode this section exists to prevent.

### The frame a verdict was reached in

The second reason `conformant` and `fullyVerified` are separate booleans is that projects can
tune the rules.

**An unwaivable specification silently deforms what you are building.** Faced with a rule that
does not fit your use case and no way to decline it, the path of least resistance is to reshape
the CLI until it conforms — and the report then shows a clean bill of health for a tool that has
been bent toward the specification instead of toward its users. That is worse than a red check,
because it is invisible: nothing in the report distinguishes "designed well and passed" from
"redesigned badly in order to pass." The
[waiver mechanism](#waivers-a-rule-that-does-not-apply-to-this-tool) is not a concession to
adoption. It is what keeps the spec from becoming the target.

So the question a report answers stops being _did this tool pass_ and becomes **what frame did
it pass in.** `conformant: true` is a claim relative to a declared frame: spec version, probe
level, and the adopter's own waivers — the fourth coordinate, and the only one the adopter
authors themselves. The kit's job is to make that frame legible, not to pretend there is only
one. It is the same question [R4-2](../../roadmap.md#5-profiles-and-the-outcome-algebra)
asks when it says a report should answer "conforms to which spec version, profile and probe
level?"

That **strengthens** the `fullyVerified` ruling rather than softening it. Precisely because
`conformant` is frame-relative, the kit needs one claim that is not — measured against the full
catalogue, whatever the config says. A waived `defect` blocking `fullyVerified` is what stops the
frame from swallowing the whole verdict. A waived `design-choice` does not, because there the
frame is not swallowing anything: the catalogue never required that shape of the tool.

None of which makes a waiver safe. **A waiver is still a place a tool can be wrong**, and the
`reason` string is the only thing standing between a considered design decision and "this rule
was annoying". Nothing mechanical can tell those apart. The kit requires the reason, publishes
it in both output modes, and leaves the judging to a reader — which is the most a conformance
tool can honestly do.

## The details

`acc check` reads `acc.config.json` from the **current working directory** unless `--config-dir`
names another one — that directory only, and finding nothing there is the normal case. So two runs
of the same command against the same absolute target path can reach different verdicts from
different directories, and
[how to reach L0](../guides/how-to-reach-l0-in-your-project.md#4-write-accconfigjson) says what to
do about it.

Two mechanisms live in `acc.config.json` that make **different statements about rules**. Keeping
them apart is load-bearing: fold one into the other and the ratchet stops meaning anything.

| Key             | The statement                                                | Goes stale?         |
| --------------- | ------------------------------------------------------------ | ------------------- |
| `knownFailures` | **debt** — "this is broken, I know, I will fix it"           | yes, once it passes |
| `rules`         | **declaration** — "this binds differently for me, by design" | **never**           |

A third key says nothing about any rule. `defaultOutput: "json"` is a statement about **the
tool** — that structured output is what it emits unless asked for prose — and it is the first of
its kind here.

That difference is why it sits at the top level rather than inside `rules`. It excuses nothing and
suppresses no failure; what it changes is which probe the kit is able to send. The only other route
to machine mode is reading help for a flag that selects it, and a machine-first CLI has none to
find — there is no mode to switch into. Undeclared, such a target is **failed** by
[D3](../rules/discoverability/help-advertises-machine-mode.md) for advertising nothing — a
`diagnostic` verdict, so it is reported and gates nothing — and the rules that would check its
envelope report [`unverified`](#what-it-is) for want of a selector to send: probed, and
inconclusive, which also gates nothing. The cost is not a red build. It is that the contract those
rules exist to check went unexamined on the class of tool they matter most to.

**The declaration is falsifiable, and it is worth being exact about by which rule.**
[B5](../rules/streams/machine-mode-holds-on-parser-errors.md) is the falsifier: it provokes a
parser error, sends no selector, and requires one of the two streams to be exactly one JSON
document. Declare the default and answer in prose and B5 fails — the declaration was tested and
found false.

**D3 does not read the declaration at all**, and that is a correction rather than the original
design. The first version let a declaration satisfy D3, reasoning that a committed config key is a
durable answer. The adopter who asked for the declaration disposed of that across two rounds: they
had put an accurate statement in their help, D3 kept failing it, and a key in a file **no caller of
their CLI can read** made it pass. D3's subject is what a caller can find out, so answering it from
the kit's own config had the rule's name and its behaviour coming apart.

Help is what D3 reads, and a tool with no flag to name can only answer it with a sentence — which
the kit matches by pattern and cannot verify the meaning of. So the claim moves D3 from `fail` to
`unverified` and stops there.

That third value is doing real work. A pass would assert something guessed; a fail would call an
honest tool undiscoverable. And it makes the honest sentence the cheap choice rather than the
expensive one: deleting it takes a target from `unverified` to `fail`.

**Saying it in help does not unlock B5, though — the config key does.** The two are not
interchangeable, and the asymmetry is about what each answer costs when the kit reads it wrongly. A
sentence in help is matched by pattern, and a pattern that misreads one costs a `diagnostic` line;
the same misreading routed into a core probe costs a build. Three ordinary human-first CLIs were
failed on a core rule by one unrelated sentence of help before that coupling was removed.

So: help answers "can a caller find out", which is D3's question. `acc.config.json` unlocks the
probe, because unlocking a core check should be a deliberate and revocable act by the maintainer
rather than an inference from their prose.

That division is the same one [the roadmap](../../roadmap.md#6-the-portable-declaration-ir) argues
for at `L1`, arriving early and in miniature: something declares, something else tries to falsify
it, and a declaration nothing can falsify is a comment that lies.

It does not reach everything. [B3](../rules/streams/machine-output-is-parseable.md) reads the
output of a **data command**, and selecting one inertly needs to know it is side-effect-free,
which is `L1`'s job. So B3 stays `unverified` under the declaration and says so in those terms
rather than claiming nothing was advertised.

### The excuse ratchet

A project may name rules it currently cannot satisfy under `knownFailures` in
`acc.config.json`, borrowed from Web Platform Tests: the list lets a project adopt the kit today
without a wall of red, while keeping every outstanding gap named and visible. It only ever
shrinks, and nothing in the kit adds to it automatically.

An excuse covers both `fail` and `unverified`. Excusing only failures leaves a project blocked by
an unverified rule with nothing it can change to clear it. When an excused rule starts
passing, the run reports it as a **stale expectation** — that is the ratchet tightening, and
the line to delete.

**An excuse suppresses the conformance gate. It never suppresses the evidence claim.** Exactly
what it changes, and what it does not:

| Field                   | Effect of an excuse                                         |
| ----------------------- | ----------------------------------------------------------- |
| `conformant`            | an excused `fail` no longer blocks it                       |
| `counts.coreFailures`   | an excused `fail` is not counted                            |
| `fullyVerified`         | **unchanged** — an excused rule that did not pass blocks it |
| `counts.coreUnverified` | **unchanged** — the gap is still counted                    |
| `evidenceGaps`          | **unchanged** — the gap is still named                      |
| `staleExpectations`     | gains the rule id once it starts passing                    |

The reason for the split is that an excuse is a decision, not evidence. A project writing
itself a note about a rule nothing has established has changed who is accountable for the gap;
it has not made the gap go away, and a boolean called "fully verified" must not be purchasable
by writing a sentence in a JSON file.

### Waivers: a rule that does not apply to this tool

The other key, `rules`, sets a **severity** per rule and requires a reason:

```json
{
  "rules": {
    "D2": { "severity": "off", "reason": "human-first CLI; bare help is deliberate" },
    "A6": { "severity": "core", "reason": "we delegate to ffmpeg; -- is load-bearing" }
  },
  "knownFailures": {
    "B2": "colour leaks from the progress bar — tracked in #412"
  }
}
```

`severity` is `core`, `diagnostic` or `off`. The first two **move** a rule between the two tiers
in either direction — a project may raise a rule as well as lower one, and a project declaring
itself stricter than baseline is a signal worth having. `off` is the third thing and a different
kind of statement: a **waiver**.

[D2](../rules/discoverability/bare-invocation-is-a-usage-error.md) is the rule that forced this
to exist. A bare invocation must be a usage error; dogfooding against four real CLIs found three
of them printing help and exiting `0`, which many well-liked tools do deliberately. The
project's position — nothing was requested, nothing ran, and exiting `0` is how an unset shell
variable becomes a silent no-op reporting success — is a defensible **design position** rather
than a bug diagnosis. It is also the rule most likely to make the kit feel like a straitjacket,
and a conformance tool that cannot be tuned gets switched off entirely, after which none of its
other rules help either. That is the shallow argument; [the frame](#the-frame-a-verdict-was-reached-in)
is the real one.

**A waived rule still RUNS, and it may still cost a spawn.** Waiving changes how a finding is
reported; it does not remove the checker from the recorder, which collects every checker's probes
before any waiver is applied. Where the invocation is one another checker also asked for, sharing
makes it free — but a checker whose probe is its own sends it regardless.
[A6](../rules/parsing/double-dash-terminator.md) is the case to have in mind: nothing else
requests a `--` invocation, so a waived A6 still puts `-- --<sentinel>-value` in front of the
target, and A6's own page explains why that positional is not nothing for a free-form-input CLI.

What waiving buys is information rather than quiet: the report says what the verdict _would_ have
been. A waiver sitting at `pass` is one the project can delete; a
waiver sitting at `fail` is one still doing work. This is deliberately better than the ESLint
model it borrows from, where a disabled rule produces no information at all.

**A waiver can withdraw a premise another rule was resting on.** Rules share observations, and a
rule sometimes treats one as an instance of another rule's subject: C2 compares four invocations it
inherits as usage errors from A1, A2, A7 and D2. Waiving D2 declares the bare invocation a help
path, so C2 drops it from the contrast rather than reporting disagreement across a population the
project has just corrected — and says which shape it dropped, because the remaining comparison is a
narrower claim.

The shape is only dropped if it **behaved like the premise**: a waiver of D2 declares a help path,
and a help path exits `0`. A bare invocation exiting `64` where every other usage error exits `2`
stays in the comparison and is still reported. A waiver excuses a rule, it does not blind the kit
to what the target did.

Only the rules that inherited the premise are affected. E1 and G1 read the same observation for
reasons that have nothing to do with it being an error, and they keep it. A waiver is not a
deletion.

**What the config does and does not have to name.** It names a rule — `D2` — as it always has;
that much is unavoidable, since a waiver has to say what is being waived. What it never has to name
is the **relationship between rules**: nothing in the file says C2 reads D2's observation, and
nothing in it would need editing if that stopped being true. The table lives in C2's checker, so a
project's config stays a statement about its own CLI and does not become a model of this one's
wiring.

**A waiver never goes stale.** Passing was never the goal, so "this waiver would now pass" is
offered as information and never as a line to remove. `staleExpectations` is for debt; a
declaration has nothing to repay.

**A `reason` is required, and must be non-empty** — exactly as a `knownFailures` reason is. A
waiver without one is a silent opt-out; with one it is a declaration someone can review later.
Rule ids are validated against the registry, so a mistyped id is an error rather than a waiver
that quietly waives nothing.

**One id may not be both waived and a known failure.** "This rule does not apply to my tool" and
"this rule applies, I am failing it, I will fix it" cannot both be true, and picking a precedence
would silently delete whichever line lost. A severity _move_ alongside a known failure is a
different matter and is allowed: "I hold myself to core on A6, and I currently fail it" is the
aspirational half of the same ratchet.

### The asymmetry: a waiver buys the gate, and the evidence only when the rule is a `defect`

| Field                    | Effect of a waiver                                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `conformant`             | the rule is excluded, so a waived `fail` no longer blocks it                                                        |
| `counts.*` (core, tiers) | the rule is excluded from all of them, and counted under `waived`                                                   |
| `fullyVerified`          | **BLOCKED** by a waived core `defect` — even one that would have passed. A waived `design-choice` does not block it |
| `evidenceGaps`           | gains the rule only when it is a `defect`, naming the waiver and the verdict the probe reached                      |
| `staleExpectations`      | **never** — a declaration does not go stale                                                                         |
| `waivers`                | the full list, with reason, would-be verdict, tier and applicability, whatever the classification                   |

The third row is the ruling that matters. For a `defect` it is the same precedent set for excuses
one section above: **an excuse suppresses the conformance _gate_ but never the evidence _claim_**,
and a waiver is the stronger statement so it can buy no more. A `defect` the project chose not to
be measured against was not established, and config must never buy the strong claim.

**A `design-choice` is not that.** There "does not apply to my tool" is not config buying an
evidence claim — it is the target stating a design the catalogue never required, and the kit
accepting a statement it has no grounds to falsify. That is what verification is. The rule the
tool declined was never binding on it, so nothing about it went unestablished.

The `waivers` list carries both kinds either way, so a reader who disagrees with a project's
classification of its own waiver can see it and judge.

Waiving a `diagnostic` rule changes neither boolean, because a diagnostic rule was never binding
one. The asymmetry is about what the rule bound, not about the waiver.

Both mechanisms are visible in both output modes. The human headline carries the waiver count,
because it changes what every other number on that line means; a `WAIVED` block below the
evidence gaps carries each rule with its reason and would-be verdict; and the machine report
carries `waivers` and `severityOverrides` in full, so a consumer can apply its own policy rather
than trusting the producer's.

### A waiver, measured

`acc check` against a real CLI whose bare invocation prints a team overview and exits `0`, with
the twelve unaffected rules elided. Before any config:

```
NOT CONFORMANT (L0) — 4 core violated, 3 core unverified, 9 core partially covered

  FAIL  D2  bare invocation exited 0; bare invocation wrote 13827 bytes to stdout
```

...and with `D2` waived, the same run, same binary:

```
NOT CONFORMANT (L0) — 3 core violated, 3 core unverified, 9 core partially covered · 1 waiver

  WVD   D2  bare invocation exited 0; bare invocation wrote 13827 bytes to stdout (waived; would FAIL)

  WAIVED (1) — declared not applicable to this tool, by config:
    D2  human-first CLI; bare invocation prints the team overview on purpose  (would FAIL; design choice, costs nothing)
```

The violation count drops by one and the rest of the report is untouched — a waiver is targeted,
not a global mute. The finding keeps its detail and gains the verdict it would have carried, so
the reader can still see exactly what the probe found. `D2` is a `design-choice`, so the waiver
costs nothing beyond the gate — the rule stays out of `evidenceGaps` and `fullyVerified` survives
it, which is what `design choice, costs nothing` on the waiver line is telling the reader. Waiving
a `defect` does the opposite: that rule enters `evidenceGaps` as `waived by config: …` beside
`the probe ran anyway and returned fail: …`, and `fullyVerified` goes `false` and stays there.

### What the counts mean

The text verdict line states both claims at once, and names the scope of each number:

```
CONFORMANT (L0) — 0 core violated, 2 core unverified, 14 core partially covered
NOT CONFORMANT (L0) — 3 core violated, 1 core unverified, 12 core partially covered
CONFORMANT (L0) — 0 core violated, 2 core unverified, 13 core partially covered · 1 waiver
```

`core violated` is core, applicable and **unexcused** — it gates conformance.
`core unverified` and `core partially covered` are core and applicable but count excused rules
too, because they describe the evidence rather than the gate.

Every one of those numbers excludes **waived** rules, which is why the waiver count sits on the
same line rather than in a footnote: `0 core violated` over a config that waived the rule which
would have violated is true and unreadable on its own. The clause is omitted entirely when a run
has no waivers.

The summary line at the foot of the report counts `unverified` across **every** tier, so the
two lines can legitimately disagree — a target whose only gap is on a diagnostic rule shows `0`
above and `1` below. In the capture above they happen to agree, which is why both scopes are
named on the line rather than left to the reader to reconcile:

```
  core 13/18 · violations 2 · unverified 3 (all tiers; 3 core) · partial coverage 13 core · diagnostics 1
```

A rule counted under `partial coverage` is also a rule that **passed**, so it appears in
`core 13/18` as well. The two are not alternatives: the probe ran and found no violation, and
the scope of that probe was narrower than the page.

The level is named because it bounds the claim: at `L0`,
[A4](../rules/parsing/unexpected-positionals-rejected.md) is core but out of scope, so a bare
"CONFORMANT" would overstate what was checked.

### Why binary, not a score

Core rules pass or they do not. A percentage invites optimising the number instead of the
implementation — the Acid3 "Potemkin village" critique, where scoring well became its own goal.
There is no partial credit for rejecting most unknown flags.

## Related rules

Every rule page declares its own `tier`, which is what decides whether its failure binds — as
the **baseline**. A project may move a rule between tiers, or waive it, in its own
`acc.config.json`; the frontmatter is what the catalogue says, not the last word for any one
adopter.

- [A1 — Unknown flags must exit non-zero](../rules/parsing/unknown-flag-exits-nonzero.md) —
  core, and the catalogue's canonical violation.
- [A6 — Honour the `--` terminator](../rules/parsing/double-dash-terminator.md) — diagnostic,
  and also the rule most often `unverified`, because its probe cannot be delivered through
  every launcher.
- [B3 — Machine output parses as its declared kind](../rules/streams/machine-output-is-parseable.md)
  — core at `L1`, and reported not-applicable at `L0`, where nothing can safely select a data
  command to read.
- [C2 — Usage errors are distinguishable](../rules/exit-codes/usage-errors-are-distinguishable.md)
  — core, and `unverified` for a tool whose usage errors are consistent but not `2`.
