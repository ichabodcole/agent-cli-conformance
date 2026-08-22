---
type: plan
generated: { by: claude-opus-5, at: 2026-08-21 }
status: draft
lifecycle: live
description:
  Coarse plan for the work coming out of the first outside first-contact trial (anthill, acc
  1.0.1). Splits the findings into five workstreams by kind of change, proposes a branch per
  workstream, names what must not regress, and lists the decisions that gate the detail. Revised
  after a gap analysis found six silent drops in the first draft.
tags: [adoption, report, evidence, docs, readme, trial]
---

# Work from the anthill trial

An outside agent ran `acc` 1.0.1 against a real TypeScript CLI for about ninety minutes, cold.
Their verdict was "worth it": one real defect fixed, one filed, one waived, one false positive.
The source is preserved verbatim at
[the trial report](../reports/2026-08-21-anthill-first-contact-trial.md).

**This plan is deliberately coarse.** Each workstream gets a shape, a branch and an exit
criterion; none gets a task list yet. The detail comes after the decisions in the last section.

> **Revised once already.** A gap analysis against the source found that the first draft had
> triaged every _complaint_ and dropped almost every _disagreement_ and every piece of _praise_ —
> including the two things the reporter said made them trust a `FAIL` enough to act on it. The
> §"What must not regress" section exists because of that, and it is the part of this plan most
> likely to be skipped.

## What already agrees with us

Two findings are things this repository had already written down, and an outsider hit both
without being told. That is confirmation, and it should move them up rather than be filed as new:

- **The installed package is never the thing under test.** `sable` nearly ran
  `acc check $(which anthill)` and would have measured the installed plugin cache instead of the
  working tree — every fix showing no effect. They avoided it by reading the launcher first.
  [The roadmap](../roadmap.md#the-installed-package-is-never-the-thing-under-test) names this
  section verbatim, and says it is blocked on nothing.
- **`Blocked 1 postinstall`.** Named in the same roadmap section, down to the cause: this
  repository's own `prepare: husky` shipped inside the consumer's artifact.

Neither needs re-deciding. They need doing.

## Triage

| finding                                                                       | kind of change      | workstream |
| ----------------------------------------------------------------------------- | ------------------- | ---------- |
| evidence ids resolve to nothing                                               | report schema       | **A**      |
| an evidence id "reads like there is a `--verbose` I failed to find"           | CLI surface         | **A**      |
| the target is identified only by the path we were handed                      | report schema       | **A**      |
| an interpreted target needs a wrapper, undocumented                           | docs                | **B**      |
| the A6 bun guard misses through a shell wrapper                               | checker defect      | **C**      |
| install prose is read-later material in read-now position                     | docs                | **B**      |
| eight verified self-contradictions in the README                              | docs                | **B**      |
| half the README restates the guides, and the best orientation is only in them | docs                | **B**      |
| no page says what to pass as the target for an interpreted CLI                | docs                | **B**      |
| `README` says pre-1.0 while `v1.0.1` is tagged                                | docs                | **B**      |
| the pinning example is one release stale                                      | docs                | **B**      |
| `--json` with `2>&1` corrupts the document                                    | docs                | **B**      |
| a checker's least interesting finding hides its most interesting              | catalogue behaviour | **D**      |
| a rule passing because a neighbouring rule fails                              | catalogue behaviour | **D**      |
| the verdict line under-delivers against the rule page                         | catalogue behaviour | **D**      |
| bare invocation returning a manifest is a _request_ (their D2)                | rule premise        | **E**      |
| committing `acc.config.json` for one waiver blocks CI adoption                | adoption            | **E**      |
| usage errors and internal faults share exit `1` (their C2)                    | theirs, not ours    | none       |

## What must not regress

Three things the reporter volunteered as valuable. Each is downstream of a workstream that could
break it, and none of them would show up as a failing test.

- **The `UNVR`/`N/A` rows and the "what the evidence does not cover" block.** Their words: _"the
  part I did not expect to value and did… more honest than most test suites are about themselves,
  and **it is the reason I trusted the FAILs enough to act on one within the hour**."_ At risk
  from **A**, which changes the report shape, and from **D**, where reporting every finding
  multiplies the lines competing with this block for attention.
- **The positive control.** `acc check $(which acc)` reports CONFORMANT, and they checked. _"That
  materially raised my trust when a checker disagreed with me, and it is why I spent time
  disproving A6 instead of dismissing it."_ At risk from **B**, if a README trim drops the
  self-check.
- **The waiver escape hatch behaving exactly as documented** — `conformant: true`,
  `fullyVerified: false`. At risk from **E**, which reopens waiver ergonomics.

**These are acceptance constraints, not commentary.** A cold reader of the rewritten README should
still be able to find the positive control, and a reader of the changed report should still meet
the coverage block before the findings list.

## A · An evidence id that resolves

**The defect in one line.** `src/acc/kit/types.ts` documents the `evidence` field as _"Observation
ids backing the verdict, so any finding can be traced to raw evidence"_, and the report ships the
ids with nothing that resolves them. We publish the pointer and the promise and not the thing.

**Scoping: this is not durable replay.** [Roadmap item 4](../roadmap.md#4-durable-observation-and-replay)
is a versioned, portable observation artifact with `record` / `check` / `replay`. This is not
that. The observations exist in memory for the whole run; the report simply does not serialize
them. The cheap version is a schema change and should not queue behind item 4.

**But item 4 has already decided part of decision 2, in the opposite direction.** Its "What
already exists" paragraph states that the SHA-256 digest _is_ the whole byte-level record, because
retaining bytes as well "would double the artifact for an equality question a 32-byte hash already
answers, and would hand the redaction and retention problems above an unbounded binary field."
Any proposal here that serializes raw stdout/stderr is re-opening a settled decision and has to
say so.

**And [item 2](../roadmap.md#2-version-the-contract-not-only-the-rules) governs report-shape
change.** A serialized observation shape shipped ahead of item 2 becomes the accidental
compatibility promise item 2 exists to prevent.

Also here, same surface: **put the target's own `--version` output in the report.** We already run
it for D1/F2. `Report.target` is a bare string; `History.target` carries a `TargetInfo` with
`argv0` that never reaches the report. This is what would have let their near-miss announce
itself.

Also here, smaller: they hunted the CLI for a `--verbose` that would resolve the ids. Whatever we
do to the schema, the CLI should not imply a flag that does not exist.

**Exit criterion.** A reader can reconstruct any finding's probe — argv, streams, exit status —
from the report alone, without opening the rule page and without guessing. Test it by handing the
report to someone who has not seen the run.

**Branch:** `feat/an-evidence-id-that-resolves`. Version type depends on decision 1: attaching is
additive and a minor; dropping the ids removes a published field and is breaking.

## B · The README as a front door

**Ask the Diátaxis question first.** The README is the first point of contact, so its job is:
what is this and is it for me; how do I install it; **what is the first thing I do**; where is
everything else. Orientation plus one pointer at the tutorial.

**Two fresh readers have now measured it.** A first-contact reader with a matching tool
(TypeScript, Bun, a dozen subcommands) and a catalogue reader looking for prose defects. Neither
was briefed. Their findings are the work list for this branch; both are summarised at
[the cold-read findings](../reports/2026-08-21-readme-cold-read.md).

**The measurement that decides the shape.** The first-contact reader skimmed roughly seventy
lines of install prose after the first two sentences, and the sentence that freed them — _"Drop it
if this is your first install"_ — arrives 35 lines after the code block it modifies. Their words:
_"it cost me seventy lines and a lot of alarm."_ By type that prose is a how-to for someone with a
broken install; it is the wrong quadrant for a front door.

**Things that are simply wrong, and are not matters of arrangement:**

- **The install block contradicts itself on direction.** Lines 61 and 74 call the stale bare clone
  and the stale extracted package "above"; they are documented at lines 92–104, below. Line 80
  then calls the same two "below". Within twenty lines, the same pair points both ways.
- **It contradicts itself on order.** Line 78 says "The cache clear is first"; the code block at
  line 54 runs `bun remove` first.
- **It contradicts itself on how many failures there are.** A reader is told at line 74 this is
  "the third distinct way", then meets "**Two ways this install goes wrong**" at line 92.
- **The sample verdict does not contain what the next line says it contains.** Line 137 ends
  `…13 core partially covered  /opt/homebrew/bin/git`; line 140 says "That line also ends with the
  kit's own version — `[acc 1.0.1]`".
- **A4's outcome is stated two ways.** Line 13 says `unverified` until `L1`; line 264 says
  `not applicable`; the tutorial shows `N/A`. The outlier is in the paragraph doing the most
  trust-setting.
- **The probe-level count is stated two ways.** Line 13: "`L0` is the only probe level there is."
  Line 238: "Probes come in three levels." Reconciled at line 259 — 246 lines after the reader
  hits the contradiction.
- **The copyable install line is the wrong one for its most likely reader.** The README offers
  `bun pm cache rm && bun add -d …`; `check-your-first-cli.md` offers bare `bun add -d …`, which
  is correct for a newcomer. The two documents disagree in effect.
- **`README.md:9` says "Status: pre-1.0"** while `package.json` reads `1.0.1` and `v1.0.1` is
  tagged. It also promises the schema may still change before 1.0 — a promise **A** may want to
  keep rather than delete.
- **`README.md:90` pins `#v1.0.0`**, one release stale, and the fix already exists fifty lines
  below: `README.md:140` carries `<!-- x-release-please-version -->`. The stale pin is a marker
  nobody applied.

**The duplication question, answered with evidence.** The first-contact reader read the README and
both guides back to back and found six restatements: the piped-JSON contract, the `0`/`9` gate,
the `defaultOutput` declaration, waiver-versus-debt, the L0 safety note, and the SSH rationale.
Their verdict — _"roughly half of the README's second half is a lower-resolution version of the
two guides it points at."_

**And the traffic runs the other way too.** The material they said made the project click is not
in the README at all: the tutorial's four-verdict table, and the how-to's _"will I delete this
line once the tool changes?"_ test. Moving prose out is only half of this branch.

**The unanswered question that blocked them**, and which no page answers: **what `./your-cli`
should actually be** for a TypeScript-under-Bun tool — the entry `.ts`, a bin shim, the
`package.json` bin name. This is `sable`'s wrapper problem arriving independently from a reader
who never saw their report, which makes it the best-evidenced gap we have.

**Exit criterion.** A third cold reader, given only the rewritten README, reaches
`check-your-first-cli.md` without first scrolling past install-failure prose, can say what to pass
as the target for an interpreted CLI, and can still find the positive control. Length is not the
measure.

**Branch:** `docs/the-readme-is-a-front-door`. Type `docs`, so it cuts no release. Not a
single-file branch: `docs/wiki/guides/check-your-first-cli.md` is on it.

## C · The wrapper is not the target — and the guard we already built does not reach

**This is no longer a wording change. It is a hole in a guard that exists and is correct.**

`double-dash-terminator.ts:80` already returns `unverified` when the launcher is bun, and its
comment states the stakes exactly: without the guard the verdict is _"not merely unreliable, it
was inverted."_ `check-your-first-cli.md:111` already documents the cause — _"bun swallows the
leading `--`"_. We knew, and we wrote it down twice.

**Why `sable` still got a `FAIL`.** The guard keys on `h.target.argv0[0] === "bun"`, and `argv0`
is built from the target's own shebang (`src/acc/commands/check.ts:45`, `:101-106`). Their target
was a two-line `exec` wrapper whose shebang is a shell. The guard misses by one indirection, bun
eats the terminator a level down, and A6 reports a failure measured against an argv the target
never received.

The comment directly above the guard names the class it was written to close: _"A Bun CLI
installed without a `.ts` extension used to slip past this and collect a FAIL measured against an
argv it never received."_ The shebang fix closed the direct case. **A wrapper reopens it — and a
wrapper is exactly what workstream B is about to tell interpreted-target users to write.**

**One correction to carry back to them:** A6 is `tier: diagnostic`, not core. They counted it among
four core failures; it never gated their exit code.

**Why this is a decision and not a task.** An opaque wrapper can `exec` anything, so detecting the
real launcher through it is undecidable in general. The options are not equivalent: document the
hazard; have A6 decline to report when it cannot establish the launcher; or corroborate with a
second probe that shows whether the terminator arrived at all. The third is the only one that
scales past bun, and it is the most expensive.

**Widen before fixing.** `argv0` is consulted in only one checker today, so the blast radius is
A6 alone — but the same reasoning ("we inferred the launcher from the target") is the shape the
`L0` boundary work already ruled out for machine mode. Check that this guard is observation and
not inference before extending it.

**Exit criterion.** A conforming Bun CLI behind a shell wrapper does not collect a false `FAIL` on
A6 — verified with a fixture of that exact shape, which we do not currently have.

**Branch:** `fix/the-wrapper-is-not-the-target`.

## D · Three questions about the catalogue

Not fixes. None is understood well enough to have a shape, and this project's characteristic
failure is fixing this class early.

- **A checker with several findings reports one, and it may report the least useful one.** Waiving
  D2 changed C2's message from `a usage error exited 0 (1,1,0)` to `usage errors are consistent at
exit 1, but not the declared 2, and no taxonomy was declared`. The second is the systemic fact,
  and the user has no way to know a better message sits behind an unrelated waiver.
  **This was the reporter's own third priority, stated as a recommendation rather than a
  question.** Routing it to investigation is a deliberate demotion of their confidence; if we keep
  the demotion, the report should say why it was not persuasive.
- **A rule can pass because a neighbouring rule is failing.** A6 passed before their A1 fix because
  the root parsed nothing at all, so there was no re-parse to catch. **This is probably not a new
  class**: [roadmap item 8](../roadmap.md#8-test-the-checker-as-a-measurement-instrument) already
  names property and metamorphic tests across equivalent invocations, and differential checks
  where independent observers should agree. The question is whether this is the first concrete
  instance that finally sizes item 8.
- **The verdict line under-delivers against the rule page.** Their counterweight, and arguably the
  report's headline: _"the rules are better than the checkers"_ — both findings they acted on came
  from opening the rule page, not from the verdict line, so _"the report should probably not be
  read without opening those pages."_ `ReportedFinding.rulePath` already ships, so the pointer
  exists; the claim is about what the line itself carries.

**Exit criterion.** A report that answers all three questions with a recommendation each — own it,
defer it, or decline it — and that says which are instances of roadmap item 8.

**No branch.** Output is `docs/reports/`.

## E · Where they disagreed with the spec, and what blocks CI

The only place the trial challenged the **design** rather than the implementation, plus the one
thing they named as stopping adoption. Both are about D2 and both are decisions, not tasks.

**The disagreement.** D2's rule page states its premise in frontmatter as _"Running the tool with
no arguments requested nothing and did nothing."_ Bare `anthill` on a pipe returns a valid JSON
manifest with `ok:true` — the whole command surface — and grouped help on a terminal. Their
argument: that is discovery, discovery is a request, and the premise does not hold. They waived
it deliberately rather than changing their CLI.

**The adoption blocker.** They would not put `acc` in CI on that repo, for one reason: the waiver
would have to be committed as `acc.config.json` in a repository that does not otherwise depend on
`acc` — _"dead config carrying a live opinion."_

**L1 is the other half of their answer** and this plan does not currently scope it. Asked what
would move them from "yes, once" to "yes, in CI", they named exactly two things: resolvable
evidence — workstream **A** — **and L1**. A plan that delivers A and stays silent on L1 delivers
half of a stated condition.

**Exit criterion.** A written disposition for D2's premise (accepted, rejected, or narrowed), and
an explicit in-or-out statement on L1 for this cycle.

**No branch yet.** A rule-premise change touches the page, the checker and the catalogue lint
together, and should not start before the disposition is written.

## Sequencing, and where the workstreams collide

**B first and mostly alone.** Independent, cuts no release, fixes a false claim on the first
screen, and its cold read takes wall-clock we can spend deciding the rest.

**A next**, because it is the one they say costs trust on every run, and because the scoping above
makes it smaller than it looked.

**C after A.** **D and E as reading, whenever.**

**Three couplings not to assert away:**

1. **A edits a document B just rewrote.** `README.md:136-141` prints an example verdict line; A
   adds the target's `--version` to the report. Whoever lands second updates that example.
2. **A contradicts a sentence B may delete.** `README.md:9` promises the schema may still change
   before 1.0. If B deletes it as stale and A then changes the schema, the deletion was wrong.
3. **B's wrapper warning lands in the wiki, not the README** — so B is not a single-file branch,
   and `docs/wiki/guides/check-your-first-cli.md` is on it.

Also live and unreconciled: `docs/plans/2026-08-20-second-adoption-release.md`.

## Decisions needed before any of this gets detailed

1. **Attach the observations, or drop the ids?** They offered both and said either beats today.
   Attaching is more useful and grows the report; dropping is honest, free, and **breaking**.
   This decides the shape _and the version type_ of **A**.
2. **If we attach: does the digest suffice, or do we serialize bytes?** Roadmap item 4 has already
   answered this once — digest, not bytes — so serializing raw streams means overturning a written
   decision, with the redaction and size arguments answered.
3. **Does `acc check` learn an argv prefix, or do we only document the wrapper?** Documenting is
   nearly free. Supporting it is a new CLI surface every future probe has to respect.
4. **Is D2's premise right for a CLI whose bare invocation returns a machine-readable manifest?**
   The only spec-level challenge the trial produced.
5. **Is L1 in scope for this cycle?** If out, say so — they named it as one of two conditions for
   the adoption outcome this project presumably wants.
