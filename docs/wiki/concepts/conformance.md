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
status: current
updated: 2026-08-15
---

# Conformance

## What it is

`acc check` reports two booleans, and they answer different questions.

**Conformant** — **no applicable core rule FAILED.** Violations only. Every core rule the kit
could apply at this probe level either passed, was excused under `knownFailures`, or was waived
in the project's `acc.config.json`. This is the headline verdict, and it is what the exit code
reflects: a non-conformant target exits `9`.

**Fully verified** — conformant, **and no applicable core rule was waived, and every applicable
core rule passed, and every applicable core checker declares `coverage: complete`.** Every core
rule was actually established, not merely left unfalsified.

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
clean sheet. `acc check $(which git)`, against git 2.55.0, with the thirteen passing rules
elided:

```
NOT CONFORMANT (L0) — 2 core violated, 1 core unverified, 13 core partially covered

  UNVR  B3  no machine-mode flag was advertised in help, so there is nothing to parse
  FAIL  C2  the same error class produced different codes (129,1)
  FAIL  D2  bare invocation wrote 2290 bytes to stdout
  FAIL  D3  help names no machine-mode flag or schema command; B3 will be unverified as a result

  core 13/16 · violations 2 · unverified 1 (all tiers; 1 core) · partial coverage 13 core · diagnostics 1
```

D3 is `diagnostic`, so it is reported and binds nothing. Of the two that do bind, both are real
violations and `git` is non-conformant for them, on their own merits:
[C2](../rules/exit-codes/usage-errors-are-distinguishable.md) because an unknown flag exits
`129` while an unknown verb exits `1`, so one error class answers with two codes; and
[D2](../rules/discoverability/bare-invocation-is-a-usage-error.md) because bare `git` writes
its usage text to stdout, where a consumer reads it as output, rather than to stderr.

B3's line is not a violation of anything. `git` advertises no machine-mode flag, so
[B3](../rules/streams/machine-output-is-parseable.md) has nothing to parse and says so —
"could not establish it", not "broke it". Counted as a failure it would have told git's
maintainers they had broken three rules, one of which names nothing they did wrong, mixed in
with two they can act on today. The first thing a maintainer does with a gate that cannot tell
those apart is turn it off.

The opposite error is worse, and it is the one this whole catalogue exists to prevent: letting
`unverified` quietly count as a pass. A probe that could not run is not a probe that succeeded.
So `unverified` is never folded into the pass count, is always reported by name, and always
blocks `fullyVerified`. It just no longer masquerades as a violation.

The practical shape: **`conformant` is the gate; `fullyVerified` is the goal.** A project
adopts the kit by getting to conformant, then works the unverified list down — today by making
discoverable in help what the kit otherwise has to guess at (advertising `--json` is what moves
B3 off `unverified`), and eventually by declaring it outright, once there is a declaration
format to write it in. That is the direction the spec wants a tool to move; the second half of
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
catalogue, whatever the config says. A waived core rule blocking `fullyVerified` is what stops
the frame from swallowing the whole verdict.

None of which makes a waiver safe. **A waiver is still a place a tool can be wrong**, and the
`reason` string is the only thing standing between a considered design decision and "this rule
was annoying". Nothing mechanical can tell those apart. The kit requires the reason, publishes
it in both output modes, and leaves the judging to a reader — which is the most a conformance
tool can honestly do.

## The details

Two mechanisms live in `acc.config.json`, and they make **different statements**. Keeping them
apart is load-bearing: fold one into the other and the ratchet stops meaning anything.

| Key             | The statement                                                | Goes stale?         |
| --------------- | ------------------------------------------------------------ | ------------------- |
| `knownFailures` | **debt** — "this is broken, I know, I will fix it"           | yes, once it passes |
| `rules`         | **declaration** — "this binds differently for me, by design" | **never**           |

### The excuse ratchet

A project may name rules it currently cannot satisfy under `knownFailures` in
`acc.config.json`, borrowed from Web Platform Tests: the list lets a project adopt the kit today
without a wall of red, while keeping every outstanding gap named and visible. It only ever
shrinks, and nothing in the kit adds to it automatically.

An excuse covers both `fail` and `unverified`. Excusing only failures left a project blocked by
an unverified rule with nothing it could change to clear it. When an excused rule starts
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

**A waived rule still RUNS.** Probes are shared across checkers, so running a waived rule costs
no extra process, and the result is strictly more informative than skipping it: the report says
what the verdict _would_ have been. A waiver sitting at `pass` is one the project can delete; a
waiver sitting at `fail` is one still doing work. This is deliberately better than the ESLint
model it borrows from, where a disabled rule produces no information at all.

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

### The asymmetry: a waiver buys the gate, never the evidence

| Field                    | Effect of a waiver                                                    |
| ------------------------ | --------------------------------------------------------------------- |
| `conformant`             | the rule is excluded, so a waived `fail` no longer blocks it          |
| `counts.*` (core, tiers) | the rule is excluded from all of them, and counted under `waived`     |
| `fullyVerified`          | **BLOCKED** by any waived core rule — even one that would have passed |
| `evidenceGaps`           | gains the rule, naming the waiver and the verdict the probe reached   |
| `staleExpectations`      | **never** — a declaration does not go stale                           |
| `waivers`                | the full list, with reason, would-be verdict, tier and applicability  |

The third row is the ruling that matters, and it is the same precedent set for excuses one
section above: **an excuse suppresses the conformance _gate_ but never the evidence _claim_**. A
waiver is the stronger statement, so it can buy no more. A rule the project chose not to be
measured against was not established — "does not apply to my tool" is a claim about the tool's
design, not evidence about its behaviour. Config must never be able to buy the strong claim.

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
    D2  human-first CLI; bare invocation prints the team overview on purpose  (would FAIL)
```

The violation count drops by one and the rest of the report is untouched — a waiver is targeted,
not a global mute. The finding keeps its detail and gains the verdict it would have carried, so
the reader can still see exactly what the probe found. `D2` also enters `evidenceGaps` as
`waived by config: …` beside `the probe ran anyway and returned fail: …`, which is why
`fullyVerified` stays `false` however many rules are waived away.

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
two lines can legitimately disagree — a target with one diagnostic gap and no core one shows
`0` above and `1` below. Both scopes are named rather than left to the reader to reconcile:

```
  core 13/16 · violations 2 · unverified 1 (all tiers; 1 core) · partial coverage 13 core · diagnostics 1
```

A rule counted under `partial coverage` is also a rule that **passed**, so it appears in
`core 13/16` as well. The two are not alternatives: the probe ran and found no violation, and
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
  — core, and `unverified` for any tool that advertises no machine-mode path.
- [C2 — Usage errors are distinguishable](../rules/exit-codes/usage-errors-are-distinguishable.md)
  — core, and `unverified` for a tool whose usage errors are consistent but not `2`.
