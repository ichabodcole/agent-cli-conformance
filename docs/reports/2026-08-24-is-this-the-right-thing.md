---
type: report
generated: { by: ox-alpha, at: 2026-08-24 }
status: draft
lifecycle: live
description:
  An audit of whether the project is building the right thing for the problem that started it:
  the answer was already measured and written down, the build order has not caught up to it,
  and the churn the owner feels is the gap between the two.
tags: [conformance, evidence, adoption]
subject: the project as a whole — CHARTER.md, docs/roadmap.md, docs/reports/**, docs/plans/**, src/acc/**
examined: develop at 0d14cf5, project history 2026-08-13 through 2026-08-24
---

# Is this the right thing?

The owner commissioned this audit with a plain statement: the project was started because the
same CLI defects kept coming back across the many agent-facing CLIs they build, and they wanted
standardized guidance plus a toolkit to enforce and check it. Eleven days in, they feel
themselves churning — rehashing similar questions, not delivering the value they hoped for.
The question put to this audit is: **is the thing we have been building the right thing for the
problem?**

This report examines the whole project as it stands: the charter, the roadmap, the report and
plan corpora, the wiki's shape, the implementation under `src/acc/`, and the eleven-day commit
history. It answers the question, locates the churn precisely enough that it can be acted on
rather than felt, and closes with six recommendations.

## The short answer

**The components are right. The order is wrong, and the order is the product.**

The project's own measurements — most of them taken in the last four days — establish that the
per-tool conformance checker, which has received the majority of the effort, cannot deliver the
value the project was started for, while the piece that can (comparing the owner's own tools
against each other through declarations) is specified, measured as necessary, and unbuilt. The
charter already says all of this, in stronger terms than this report would have chosen. **So the
actionable finding is not "change direction." It is that the change of direction is documented,
evidenced, and has not yet moved any code.**

The churn is not indecision about the answer. It is the cost of producing answers faster than
they are converted into motion.

## What the record shows

Four facts, each measurable in the tree.

### RT-1 — the founding question was answered, the day before this audit

[The charter](../../CHARTER.md), written 2026-08-23, contains the measurement this audit would
otherwise have had to produce:

- The defect archaeology replayed seven real fixed defects against `acc check` and found a hit
  rate of **1 in 7** — for six of seven, the entire verdict vector is byte-identical before and
  after the fix. A fixture that silently loses 57% of its output scores `conformant: true`.
- The [eight-CLI run](./2026-08-24-eight-owner-clis.md) found five real divergences across the
  owner's own tools — exit `1` versus `2` for the same error class, three destinations for
  `--help`, `--version` existing in exactly one of eight — and **every one of them is invisible
  to every rule in the catalogue, by construction**: each checker requires only "non-zero", and
  each run judges one tool alone.
- Fifteen of twenty-three rules return an identical verdict on all eight targets. On a corpus
  picked to expose difference, three quarters of the output is duplicate.

The charter's conclusion is the correct one: the original complaint — _my tools diverge and
nothing carries between them_ — is a question about relations between tools, and the catalogue
has no sentence in it that can express a relation. That is not a gap in the rules. It is a
different product surface.

### RT-2 — the answer has not changed what gets built

If the guidance and the declaration are primary, as the charter rules, the build order should
have re-sorted around them. It has not:

- [`docs/roadmap.md`](../roadmap.md) still opens its numbered order with structured remediation,
  contract versioning, environment control — all checker-infrastructure items — and places the
  nearest thing to the visibility surface (`acc check ./a ./b ./c`) **below the fold**, outside
  the numbered sequence, blocked on steps it does not actually need for a first version.
- Nothing in `src/` compares two targets. `spec.ts:211` fixes the population at exactly one; the
  word `diff` appears nowhere in the commands.
- The charter's own list of consequences — replace the README audience line, reconcile the
  roadmap's ordering premise, settle the L0/L1 question — is recorded as owed, not done.
- The two working days since the charter produced: the charter itself, the eight-CLI report, and
  [a 700-line ontology analysis](./2026-08-24-wrong-primitives-in-acc.md). All three are
  excellent. None changes what runs.

The charter names the drift signal explicitly — _"progress being reported in rules written and
checkers implemented, against CLIs that were never going to change"_ — and says that is the shape
the project was in when it was commissioned. The record since the charter is a finer-grained
version of the same shape: progress reported in documents written, against decisions that were
never going to execute themselves.

### RT-3 — the churn is measurable, and it has a shape

Over twelve days: roughly 300 commits, of which **130 carry the `docs` type** — more than every
code-touching conventional type combined (`feat` 40, `fix` 69, `ci` 7, `test` 3, `refactor`
1, `style` 1 = 121). The `docs/` tree is 29,426 lines against 17,981 in `src/`. Nineteen reports
were filed in eleven days, the large majority examining the project itself rather than any CLI.

None of this is a complaint about quality. The documentation discipline here — dated evidence,
dischargeable findings, claims traced to measurements, a positive control that can fail — is
exceptional, and it is the reason the diagnosis in RT-1 exists at all. The observation is about
the **loop's closure**: analyses here reliably produce further analyses. A boundary question is
found, a decision page settles it, a trial reopens it, a report triages it, a plan absorbs the
triage, and the code waits. [The wrong-primitives report](./2026-08-24-wrong-primitives-in-acc.md)
names the mechanism precisely: questions of the form "is this an X or a Y?" that will not stay
answered mean the names are cutting the domain wrongly — and each recurrence is currently paid
for in another document rather than paid once in a rebuild.

A project that writes this well can make writing feel like progress. That is the specific trap
this repository is standing in.

### RT-4 — the central assumption is untested, and testing it is an afternoon's work

The whole thesis — guidance asks adopters to declare their interface and bind it to code; the
checker keeps the declaration honest — rests on something that has never happened once: **a
declaration bound to a real tool, drifting from it, and being caught.** The charter says this
itself: _"Until that has happened once, this is the project's central untested assumption, and it
should be the first thing anyone tries to falsify."_

It has not been tried. Meanwhile every prior art failed at exactly this — Fig accumulated 735
hand-written specs and died because nothing ever probed a binary to ask whether the specs were
still true. The project's candidate answer to "what makes us different from the ones that died"
is the falsification loop. That loop has zero iterations on it.

## What is right, and should not be touched

An audit that only finds fault would mislead. Three things here are genuinely strong:

- **The epistemic standard.** Claims trace to measurements; measurements carry coordinates;
  findings get ids that survive. The eight-CLI report re-derived its own predecessor's numbers and
  published the corrections. This culture is the asset.
- **The guidance content.** Twenty-three rules with reasons attached, waiver semantics that
  separate debt from design choice, an exit-code taxonomy argued from prior-art failure modes.
  As a set of interface decisions a new CLI can adopt wholesale, this is the most valuable
  artifact in the repository — and it is already usable today, with no further machinery.
- **The checker's future role.** The charter's argument that a fleet of unfalsified declarations
  becomes a fleet of documents that quietly stopped being true is sound. The checker stays. It is
  the thing that makes declarations expensive to lie with. It is being built first and refined
  hardest when it should be second.

## Recommendations

Ordered. Each names what it produces, because a recommendation without a deliverable is how this
repository digests advice into more documents.

### R1 — build the smallest visibility slice, this week

A throwaway-quality `acc diff <a> <b>` that puts two of the owner's own CLIs side by side —
anthill and one Spellbook spell are the obvious pair, since the eight-CLI run already measured
their divergences by hand — and prints where they answer the same question differently: exit codes
for the same error class, help destination, machine-mode reachability, version support. It does
not need the declaration IR, report versioning, profiles, or a schema. It needs a comparison and
five rows.

This single artifact cashes the fourth success signal in the charter — _"two of the owner's CLIs
are compared through their declarations, and a difference nobody knew about turns up"_ — which is
the one signal none of the existing rules can produce. The roadmap's blockers for multi-target
runs are real for the durable, versioned, stored-report design; they do not apply to a prototype
whose purpose is to find out whether the output is worth designing durably.

### R2 — run the falsification experiment

Bind a declaration to one real CLI, change the CLI, confirm the drift check catches it. If the
loop works, the thesis survives its first contact with the world and R1 has a foundation. If it
does not work, that is the most important finding available right now, and it is better learned
this week than after the declaration IR ships. Either outcome unblocks more than any document
written since the project began.

### R3 — freeze the refinement workstream, with a stated lifting condition

Mutation fixtures, the primitive refactor, the L0/L1 settlement, coverage-lint deepening, the
report-shape trims — all correctly argued, all deferred. Not deleted: **deferred until the
visibility surface exists and has produced one finding somebody acted on.** That is the condition,
not a count of weeks: the freeze lifts when the thing only R1 can produce has arrived, because
that event, not elapsed time, is what tells you the checker refinements are serving a product
rather than substituting for one. Until then each refinement hour is spent on the component the
measurements say delivers the least of the founding value.

### R4 — reconcile the roadmap with the charter, on paper, briefly

They currently contradict each other silently: the charter demotes the checker-first ordering and
promotes the guidance; the roadmap's dependency argument still assumes checker-first and files the
fleet comparison below its numbered sequence. One page does not cite the other. This does not
need a new analysis — it needs an edit pass that either re-orders the roadmap around the charter
or records the disagreement and lets the owner adjudicate. Until then, an implementer reading the
roadmap will rebuild the old order.

### R5 — gate new analysis documents on a named code consequence

The pattern to interrupt is not writing — it is writing that terminates in writing. The house
rule the owner prefers applies here in its own terms: state the condition, not a quota. **A new
report, decision page or plan earns its place by naming the code change it unblocks or the open
question it retires; if it does neither, it is a comment somewhere cheaper.** Reports that audit
work already done remain exempt — that is this folder's actual contract. The rule bites on
documents whose subject is what the project should be, which is the genre that has been
reproducing.

This report is subject to its own rule: R1, R2, R4 and R5 above are the code and process changes
it unblocks, and its discharge condition is their action or explicit decline.

### R6 — measure the next CLI against the archaeology baseline

The charter defines success operationally: the next CLI built under the guidance needs fewer of
these fixes than the last one did. The archaeology supplies the baseline counts. When the owner
builds their next tool — as they will, since building CLIs is the activity that started this —
running the same defect-mining method over it converts the project's founding sentiment into its
first longitudinal data point. Nothing else in this list tells you whether the project is working;
this one does.

## The answer, stated once more without hedges

Is the thing being built the right thing for the problem? The **guidance** is the right thing and
is undervalued. The **declaration-and-compare surface** is the right thing and is unbuilt. The
**checker** is a necessary thing aimed, at its current probe level, at a surface measurably
short of where the defects live — right destination, wrong first-class status. The project does
not need a pivot. It needs one week in which the documented conclusion is allowed to become code,
and a standing rule that keeps the next conclusion from living three weeks in prose before it
touches anything.
