---
type: report
generated: { by: claude-fable-5, at: 2026-08-24 }
status: draft
lifecycle: live
description:
  A whole-project audit asking whether the thing being built serves the problem the project was
  started for. It concludes the question is already answered inside the tree — and that the churn
  the owner feels comes from a working loop that turns every question into a document and no
  document into a build.
tags: [conformance, adoption, evidence, l0]
subject: the whole project — charter, wiki, kit, reports, plans, roadmap — read against its own problem statement
examined: develop at 0d14cf5, 2026-08-24
---

# Project audit: the answer is in the tree

Commissioned question, in the owner's words: _"audit what exists, and answer whether the thing
we've been building is the right thing for the problem"_ — the problem being that one person
building many agent-facing CLIs keeps hitting the same defects across them, and wanted (a)
guidance for building a CLI right and (b) a toolkit that checks it.

Method: read [`CHARTER.md`](../../CHARTER.md), [`README.md`](../../README.md),
[`docs/roadmap.md`](../roadmap.md), every plan, the report trail from
[2026-08-14](./2026-08-14-implementation-review.md) through
[the eight-CLI run](./2026-08-24-eight-owner-clis.md) and
[the primitives analysis](./2026-08-24-wrong-primitives-in-acc.md), and the shape (not every line)
of `src/acc/`. Volume figures below are from `wc` and `git log` on this tree.

## What exists, as of 0d14cf5

- **A 23-rule catalogue** with 22 implemented checkers, all `L0`, all `coverage: partial`, plus
  the wiki's concept, decision, guide and archetype pages — cross-linked, linted, rendered.
- **`acc`**, a reference CLI that satisfies its own spec, with a genuinely unusual property: one
  declaration (`spec.ts`) produces the parser, the help and `acc schema` together, and CI runs
  the kit against it.
- **A documentation corpus larger than the product.** ~27,700 lines across wiki, reports, plans
  and research, against ~9,300 lines of source and ~8,700 of tests. Seventeen reports, five
  plans, eleven research documents, produced in twelve days (316 commits, 2026-08-13 to today).
- **A charter, written yesterday**, that reorients the project: guidance primary, checker in
  service of a declaration, fleet visibility named as the missing product surface.
- **No declaration format, no fleet comparison, no scaffold, no adoptable library.** The three
  artifacts the problem statement most directly asks for are the three that do not exist.

## The verdict on the commissioned question

**Was the thing being built the right thing?** No — and this audit does not need to establish
that, because the project already has, three separate ways, with better evidence than an audit
could gather in a day:

- [Defect archaeology](../research/2026-08-15-defect-archaeology.md) replayed seven real, fixed
  CLI-contract defects against the kit: **1 of 7 caught**. For six, the verdict vector is
  byte-identical before and after the fix.
- [The eight-CLI run](./2026-08-24-eight-owner-clis.md) pointed the kit at the owner's own fleet —
  the exact population the project exists for — and found **15 of 23 rules return an identical
  verdict on all eight targets**, six targets produce one verdict vector six times, and every one
  of the five ways the tools genuinely contradict each other (exit `1` vs `2`, three destinations
  for `--help`, `--version` in one of eight, two machine-mode designs, two `process.exit`
  policies) is **invisible to every rule by construction**, because each rule judges one tool
  alone.
- [The charter](../../CHARTER.md) draws the conclusion: the checker "is aimed at a surface that is
  not the one that breaks", the guidance is the product, and visibility across a fleet of
  declarations "is the surface the owner's problem actually asks for."

So the interesting question is not "is it the right thing" — the tree answers that. It is: **the
correct diagnosis has existed in this repository for at least nine days (the archaeology) and in
charter-grade form for one, and nothing about what gets built has changed yet.** The churn the
owner reports is the experience of a project that keeps re-deriving its own diagnosis at
increasing resolution instead of acting on it. The findings below are about that mechanism.

## Findings

### AUD-1 — The project's questions get answered with documents, and the documents defer the decision

The pattern, traced through the record:

- [What we are actually deciding](./2026-08-21-what-we-are-actually-deciding.md) narrates **five
  successive attempts** to make one inference (is `--json` a selector?) safe, ending in "ask tools
  to declare it" — a declaration.
- [Probing](../wiki/concepts/probing.md)'s admission test was written after **seven attempts** to
  make a spelling inference safe. Same ending.
- [Design-choice is L1 leaking into L0](./2026-08-22-design-choice-is-l1-leaking-into-l0.md) finds
  all four `design-choice` rules are resolved by — a declaration.
- [The grammar survey triage](./2026-08-23-triaging-the-argument-grammar-survey.md),
  [the ripgrep blind trial](./2026-08-23-blind-trial-ripgrep.md), and
  [wrong primitives](./2026-08-24-wrong-primitives-in-acc.md) each independently reach the same
  place: the kit is guessing what only the target can say.

Four independent investigations, one conclusion, reached at least four times — and **the
declaration format has never been started.** [Clear the runway](../plans/2026-08-23-clear-the-runway-then-take-off.md)
Part 2 names its first three fields and is unstarted; the charter marks the L0/L1 question "a
decision page, not an edit to this one"; the charter's own consequences section assigns every
follow-on to "someone else and its own review." Each document is locally right to defer — and the
sum of the deferrals is that the loop's exit has been identified repeatedly and never taken.

### AUD-2 — The repository's process norms are excellent instrumentation and also the churn engine

The norms — every claim cited, every report cold-read, provenance recorded, corrections carried,
a lint that fails on a dangling anchor — are why the diagnosis above is trustworthy at all. Both
external trials named the gap disclosures as the reason they trusted the tool. That is real and
worth keeping.

But the same norms make **producing analysis the cheapest kind of progress and shipping the most
expensive**. A new report satisfies the gate, reads as rigor, and generates findings that
generate further reports — [wrong primitives](./2026-08-24-wrong-primitives-in-acc.md) is a
report about the vocabulary of the reports and code before it. Meanwhile a product change must
survive the two-lens review, the fixture discipline, the wiki's three-copy sync and the
conformance gate. The ratio (three lines of documentation per line of source, seventeen reports
in twelve days) is not a defect in any one document; it is the equilibrium those relative costs
produce. Nothing in the process distinguishes "analysis that unblocks a build in flight" from
"analysis that is well-made" — and only the first kind moves the project.

### AUD-3 — None of the North Star's four signals has been achieved, and the fleet is untouched

The charter's success signals, checked against the record:

1. _The next CLI needs fewer fixes than the last._ No CLI has been built under the guidance.
2. _A defect class stops recurring._ No fix has been propagated; the eight-CLI table is the
   recurrence, measured today.
3. _Someone follows the guidance without the checker._ Has not happened; there is no artifact to
   follow other than 23 rule pages.
4. _Two of the owner's CLIs compared through declarations, and an unknown difference turns up._
   The difference turned up — five of them — but via a hand-run measurement agent, **not via the
   product**, because the product cannot represent a population
   (finding WP-F8 in [wrong primitives](./2026-08-24-wrong-primitives-in-acc.md)).

The one measured improvement to any real CLI in twelve days is anthill's A1/A3 fix from the
[first-contact trial](./2026-08-21-anthill-first-contact-trial.md) — real, validated by its
maintainer, and one tool. The seven Spellbook spells are exactly as they were: no `--version`,
same `2`-vs-`1` split against anthill, `bounty close --help` would still close the board. **The
project's own fleet is the cheapest available proof of value and it has not been touched.**

### AUD-4 — The highest-leverage artifact for this problem does not exist and is barely on the roadmap

The README's layer 1 — "**Impossible** — API shapes that make the violation unrepresentable" — is
empty. There is no scaffold, no template, no library encoding the recommended answers (usage
errors exit `2` and name the token, diagnostics to stderr, `--version` exists, one envelope
shape, `process.exitCode` not `process.exit`). Yet the population is one owner's tools, and
**six of the eight already share a scaffold**: one artifact fixed once moves six CLIs at once.
That is the propagation mechanism the problem statement literally describes ("a fix does not
propagate. A convention does not propagate") — and it is cheaper than any checker work, because
`acc` itself already contains the pattern to extract: `spec.ts` driving parser, help and schema
from one declaration is precisely the "impossible" layer, already written, already tested, and
locked inside the one CLI that needs it least.

The charter gestures at this ("adopt it wholesale and you get a coherent set of interface
decisions") but the roadmap has no item for it; adoption surfaces are item 9 of 9.

### AUD-5 — The central assumption is still untested, and the next tempting work item does not test it

The charter names the thesis-level risk: every hand-authored declaration format in the prior art
drifted and died; ours is supposed to differ because the checker falsifies the declaration
continuously; **"until that has happened once, this is the project's central untested
assumption, and it should be the first thing anyone tries to falsify."** Nothing is scheduled to
test it. Meanwhile the most recent report on the tree —
[wrong primitives](./2026-08-24-wrong-primitives-in-acc.md) — proposes a seven-primitive
re-founding of the kit's vocabulary. It is careful, it is probably largely right, and it says of
itself "this is an analysis, not a plan." Taken up next, it would be the next lap of the loop in
AUD-1: a deep internal restructuring, executed before any external fact (an adopter's declaration
drifting and being caught; two tools compared and one changed) has confirmed the product is worth
restructuring. The primitives are where to land after the fleet surface exists, not before.

## Recommendations

Ordered; each is small on purpose, and each produces an external fact rather than a document.

**R1 — Declare the analysis backlog closed until a build discharges it.** Not a cap on writing —
the reason: the tree currently holds more confirmed findings than the code has absorbed
(the charter's consequences, runway Part 2, the primitives, the roadmap's own items), so a new
analysis's marginal value is near zero while any of those stands unbuilt. The next thing merged
to `develop` after this report should change a product surface.

**R2 — Write declaration format v0 this week, sized to be hand-written in ten minutes.** The
fields are already chosen by the evidence: positional shape (runway item 7), usage exit code and
whether it names the token, `--help` destination, `--version` existence and shape, machine-mode
default and selector with `output_kind` per surface (WP-F4's fix), closed value sets. Resist
generality — [the declarations survey](../research/2026-08-22-machine-readable-cli-declarations.md)
says expressive formats die of drift; this one stays small enough that the checker can falsify
every field it has.

**R3 — Build the population report: `acc check ./a ./b ./c`.** Intersection and per-target delta,
the shared row as the finding, per the roadmap's own sketch and WP-P7. Acceptance test: run it on
the eight; it must report, from the product, the five divergences the hand-run found. That cashes
North-Star signal 4 and gives the owner the first thing the project has produced that answers
their original complaint.

**R4 — Spend one session making the fleet consistent, through the scaffold.** Add `--version`,
settle `1` vs `2`, settle where `--help` goes — once, in the shared scaffold, then regenerate.
Extract the `spec.ts` pattern into that scaffold while there. This is signal 1 and signal 2, and
it is the first delivery of the value the project was started for. If doing it is harder than the
guidance implies, that is the most important feedback the guidance can get.

**R5 — Run the drift experiment on anthill.** It already declares (`--format`, a manifest, a
closed set the kit currently cannot see). Bind a v0 declaration, deliberately drift the tool,
confirm the check catches it. One afternoon, and it converts the charter's central assumption
from untested to tested — in either direction.

**R6 — Settle L0/L1 by the shortest decision that unblocks R2, and defer the rest.** The charter
has already done the reasoning: every run starts from a declaration, so the level ladder as
written is dead. A one-page decision ("there are declarations and probes; levels are retired" or
"L0 is the no-declaration triage and nothing more") is enough. The seven-primitive refactor waits
for R3/R5 to prove the product they would restructure.

## What this report did not do

It did not re-verify the eight-CLI figures (that report re-derived them from a fresh run today),
did not review checker code line-by-line (the [staged consistency
review](./2026-08-23-a-staged-consistency-review.md) and the two-lens reviews cover it), and did
not evaluate the wiki's prose against its style standard. No finding here depends on those.
