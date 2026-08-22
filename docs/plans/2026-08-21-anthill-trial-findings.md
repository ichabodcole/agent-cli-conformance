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

| finding                                                                       | kind of change        | workstream |
| ----------------------------------------------------------------------------- | --------------------- | ---------- |
| evidence ids resolve to nothing                                               | report schema         | **A**      |
| an evidence id "reads like there is a `--verbose` I failed to find"           | CLI surface           | **A**      |
| the target is identified only by the path we were handed                      | report schema         | **A**      |
| an interpreted target needs a wrapper, undocumented                           | docs                  | **B**      |
| the A6 bun guard misses through a shell wrapper                               | checker defect        | **C**      |
| install prose is read-later material in read-now position                     | docs                  | **B**      |
| eight verified self-contradictions in the README                              | docs                  | **B**      |
| half the README restates the guides, and the best orientation is only in them | docs                  | **B**      |
| no page says what to pass as the target for an interpreted CLI                | docs                  | **B**      |
| `README` says pre-1.0 while `v1.0.1` is tagged                                | docs                  | **B**      |
| the pinning example is one release stale                                      | docs                  | **B**      |
| `--json` with `2>&1` corrupts the document                                    | **did not reproduce** | none       |
| a checker's least interesting finding hides its most interesting              | catalogue behaviour   | **D**      |
| a rule passing because a neighbouring rule fails                              | catalogue behaviour   | **D**      |
| the verdict line under-delivers against the rule page                         | catalogue behaviour   | **D**      |
| bare invocation returning a manifest is a _request_ (their D2)                | rule premise          | **E**      |
| committing `acc.config.json` for one waiver blocks CI adoption                | adoption              | **E**      |
| usage errors and internal faults share exit `1` (their C2)                    | theirs, not ours      | none       |

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

## Did not reproduce — `--json` with `2>&1`

`sable` reported that `acc check target --json 2>&1` corrupted the document, conceding the tool was
right and that it was worth knowing it bites. **It does not reproduce.** Measured against
`v1.0.1`:

| path                                  | stdout          | stderr                           | `2>&1` |
| ------------------------------------- | --------------- | -------------------------------- | ------ |
| a successful check                    | the JSON report | **0 bytes**                      | parses |
| a failing invocation (missing target) | empty           | the 201-byte JSON error envelope | parses |

`acc` keeps the two streams disjoint on both paths — which is what [B1](../wiki/rules/streams/stdout-carries-only-data.md)
requires of everyone else — so folding them together still yields exactly one JSON document.

**So the corrupting bytes came from somewhere between `acc` and their shell**, most likely the
same interposed layer that produced the A6 false positive: their target ran behind a wrapper, and
a launcher that writes to stderr would land inside the folded stream. That is worth telling them,
because it is the second finding in their report that turns out to be about the wrapper rather
than about `acc`.

**Nothing to do here** unless it reproduces with a concrete invocation.

## B2 · The README's ordering — the follow-up

**B is done and verified; this is what B uncovered.** Removing the install prose that sat between
the reader and the first command exposed a second ordering problem, which the third cold read
found and which is larger than the one just fixed. Recorded here rather than folded into B,
because it needs its own read.

The findings are in
[the cold-read report](../reports/2026-08-21-readme-cold-read.md#the-third-read--verifying-the-rewrite-2026-08-22),
with the reader's own words. In short:

- **Four caveat blocks stand before the install line**, and three warnings before the first run —
  _"defensive before it is useful… A reader who has never run the tool cannot be disappointed by
  it yet."_ Two of those warnings were added by B.
- **`Where to go next` is an exit door above the best writing on the page.** The reader left at
  line 147; `The problem` — the fifteen-CLI survey, the `citty` finding, `docker inspect` printing
  `[]` — starts at line 177 and was never read.
- **No successful run is ever shown.** The only sample output is `NOT CONFORMANT`.
- **Not one concrete rule appears.** Rule ids are links, never a list, so a reader finishes
  knowing the shape of a verdict and nothing their CLI must actually do.
- **`how-to-reach-l0-in-your-project.md` is a strict superset** of the README's config material.
  The `acc.config.json` and `defaultOutput` sections are day-two material a reader cannot use
  before their first finding.
- **`Branches and releases`, `Layout` and `Commands`** are contributor reference, skipped by all
  three readers, sitting between the user's quickstart and the user's motivation.
- **The positive control is unreachable on a natural read** — an open item from
  §"What must not regress", still unverified after three reads.

**Exit criterion.** A reader reaches `The problem` before any exit door, meets a passing run, and
can name at least one concrete thing their CLI has to do. The contributor sections are reachable
but not in the newcomer's path.

**Branch:** `docs/the-readme-stops-arguing-before-it-helps`. Type `docs`.

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

**A6 is not the only rule a wrapper moves — and the other one moves quietly.** Reported by
`sable` on the confirmation run and reproduced here: a wrapper adds a consistent 2-3 ms to
[F2](../wiki/rules/safety/first-byte-is-prompt.md), because F2 measures wall-clock to first byte
and an `sh -c exec` is a real process.

| target                        | F2                          |
| ----------------------------- | --------------------------- |
| the `.ts` file directly       | `15ms (runs: 16, 15, 15ms)` |
| the same CLI behind a wrapper | `18ms (runs: 19, 18, 18ms)` |

`THRESHOLD_MS` is 100 and the verdict takes the fastest of three runs, so 3 ms is 3% of the
budget and noise at 15 ms. It is not noise for a target sitting near the threshold — and unlike
A6, **this one moves toward `fail` rather than toward `unverified`.** A6 at least announces
itself as undeliverable when the guard fires; F2 silently reports a slower tool than the one
under test. Their words: _"F2 is the second rule a wrapper can move, and that one moves quietly
in the direction of failing rather than of being unverifiable."_

That reframes the workstream: the subject is **any rule whose measurement an interposed layer
can distort**, not bun's `--` specifically. Enumerate those before designing a fix.

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

## Decisions — made 2026-08-22

1. **Evidence ids: attach.** _"Let's attach them, and just make sure they do and work as we say."_
   The second clause is the harder half: the field's own doc comment promises any finding can be
   traced to raw evidence, so the promise gets bound to a test, not just implemented.
2. **What an observation carries: argv, exit status, signal, timing and the digests — not the
   stream bytes.** Keeps [roadmap item 4](../roadmap.md#4-durable-observation-and-replay)'s written
   decision intact (the digest is the byte-level record) while answering the question that cost the
   adopter an hour: _what did you actually run?_
3. **Interposed launchers: document only, for now.** Revisit once a non-bun CLI has actually been
   put through the kit. Stated reason: the projects available to test with are bun-based, so the
   argv-prefix surface would be designed against one case and no evidence. It becomes urgent if
   this project goes public, where a non-bun CLI's first experience matters.
4. **D2: keep the default, soften the language.** Not a rule change and not a checker change —
   a **language** change, which is far smaller than this plan assumed. The rule stays: a bare
   invocation is an error by default, and the config can already override it. What changes is the
   register. Three things to carry:
   - Frame it as **our default and the reasoning for it**, not as a verdict on the reader's design.
   - **Give the why**, because a reader may not have met it: an unset shell variable expanding to
     nothing is indistinguishable from a deliberate bare call, and exiting `0` there is how a
     silent no-op ships.
   - **Say plainly that a different design can be right.** Returning a machine-readable manifest
     to inform an agent is a legitimate choice, and the page should not imply otherwise.
5. **L1: in scope, and it is the point.** _"L0 is foundational… but it's not really where the user
   is going to get value. L1 is really where you're going to get a lot more benefit — and you're
   going to get benefit more from the guidance and the thinking we've done around it than from the
   tooling."_ That last clause is the steer: L1's value is the declaration format and what it makes
   sayable, not the checker count.

   **A fair objection to the question as posed:** "this cycle" was never defined. Taken as _the
   work following the anthill trial_, L1 is in it and is the largest item.

6. **Sequencing: proceed on judgement.**

### What this changes about the plan above

- **E shrinks to a documentation task.** The D2 disposition is decided and needs no rule-premise
  change, no checker change and no catalogue-lint change. What remains in E is the committed-waiver
  CI blocker, which L1 may dissolve anyway.
- **C shrinks to documentation** for now, with the enumeration of distortable rules — A6 and F2 so
  far — kept as the record for when it is revisited.
- **A is the near-term build**, and it is also infrastructure L1 needs: falsifying a declaration
  means pointing at the observation that falsified it.
