---
type: report
generated: { by: claude-fable-5, at: 2026-08-27 }
status: stable
lifecycle: live
description:
  A record of the cold-repair pipeline — six stages of cold writers and cold readers — run once,
  on 2026-08-27, to repair two documents that careful readers had misread. The stages as run,
  what each caught that the previous one could not, and the false positives, written so a second
  run is possible and comparable.
tags: [method, docs, review, testing]
subject: the cold-repair pipeline as run once, recorded so a second run can be compared to it
examined:
  the repair of docs/wiki/guides/how-to-reach-l0-in-your-project.md and
  docs/wiki/rules/streams/machine-mode-holds-on-parser-errors.md across acc-internal messages
  153-160, landed on develop as commits 5b7559a (first batch) and d5174eb (second batch)
---

# The cold-repair pipeline

This is a record of a method, not an endorsement of one. It was run once, on one day, over two
documents, and every count below has that sample size. "It caught three repair-introduced
regressions in one run" is a fact this page can state; "it reduces regressions" is a claim it
cannot, and does not. The reason to write it anyway comes from the project owner: if the same
work comes up again, someone should be able to run the same stages without having been here, and
afterwards we should be able to tell whether it worked twice.

## The occasion

Two documents — the guide `how-to-reach-l0-in-your-project.md` and the rule page for B5, machine
mode holds on parser errors — had accumulated defects reported by people who read carefully and
were misled anyway: two cold trial adopters
([the trials report](./2026-08-27-the-claims-from-two-trials.md)) and cold readers run on the
same pages earlier the same day. The defects were all defects of legibility: a notation met before its legend, ordinals
into a list that had been reordered, a waiver passage that read as a sanctioned route, a dropped
fact that turned two true passages into an apparent contradiction. The repairs ran in two
batches — one direct (`5b7559a`), one through the staged pipeline this page records
(`d5174eb`) — coordinated on the `acc-internal` channel, messages 153–160, which are the primary
record.

## The stages, as run

1. **The coordinator verified each reported defect against the tree before briefing anyone.** Of
   five reported for the second batch, one was at first dismissed as not reproducing — and the
   dismissal was itself wrong: the search used to check it could not see a phrase split across a
   line break, so it reported absence where there was presence, and the defect was reinstated.
   Both failures — the report that did not reproduce as stated, and the check that wrongly
   dismissed it — are part of the record, because "verify first" is only as good as the
   instrument, and a bounded search returning nothing is evidence about the search.
   (Coordinator's account, messages 157 and 160.)
2. **A cold writer**, given the problems as the readers experienced them and no proposed fixes,
   edited copies of the two files rather than the repository.
3. **A cold reader**, given before, after, and the original problems, asked two questions with
   the second weighted heavier: did each repair land, and _what else changed_.
4. **A second pass by the same writer** on the reader's findings, with explicit permission to
   fail: if a sentence could not be stated from the verified facts, say so and leave it.
5. **A fresh reader** on the same original problems, told nothing about what the second pass
   fixed — so a surviving regression had to be _found_, not confirmed.
6. **An agent landing the result** diffed the copies against the tree (after verifying the
   "before" copies were byte-identical to it — done independently twice), carried what the
   record approved, replaced what it rejected, settled the remaining reader claims against the
   sources they traced to, and ran a cascade-check on the restored fact — that the measured
   failures printed prose to stderr while stdout carried a success envelope — asking whether its
   degraded form had been carried anywhere else. It had not: a clean cascade, which is a result
   and not a skipped step.

## The blind spots, and who caught them

The observation worth keeping is not that more eyes are better. It is that in this run each
stage had a blind spot that only a later stage caught — the blindness was structural, not a
lapse:

- The **writer** could not see what a repair did to a neighbouring claim. Their added lead-in —
  "D3 still counts it, and its report spells out what it looked for" — was contradicted by the
  report text quoted four lines beneath it, which says a flag "documented with a value slot is a
  flag that takes a value rather than one that selects a mode."
- The **first reader** could not see that removing two of three sibling constructs left the
  third reading as authoritative when it no longer was.
- The **stage that restored a dropped fact** — the landing stage, in this run, after two writer
  passes had failed on the same sentence — could not see that the restoration made an adjacent
  clause false: once the page said stdout still carried a success envelope, its own tail — "not
  a degraded signal but no signal" — was wrong on the sentence's own terms, because `ok:true`
  _is_ a signal, a false one. The landing stage's own cold reader caught it.
- And one blind spot was every reader's at once: **no reader at any stage** could distinguish a
  real contradiction from two true mechanisms in two different repositories. That one was
  settled only by the landing stage going to the source
  (`docs/research/2026-08-15-defect-archaeology.md`), which named which tree produced
  `undefined` and which produced `ok:true`.

Three of the catches in this run were **regressions introduced by repairs**, not original
defects. That is the finding the run produced: on this material, the repairs were themselves the
largest source of new defects, so a repair pass with no reader stage behind it would have
carried them to the tree.

## What the readers got wrong

A method that reports only its hits cannot be evaluated, so: cold readers in this run produced
at least two claims that did not survive checking. A reader reported three stale ordinals into
one list; three existed, but not at the locations the report gave. The apparent contradiction
between the B5 page's Why and Evidence sections was two real mechanisms in two different
repositories, each correct under its condition. Both were settled by reading the source the
claims traced to. The one-run summary: readers were strong at _"something is wrong here"_ and
unreliable at _"and here is what"_ — which is why stage 1 verifies before briefing and stage 6
settles claims against the source: those stages exist to correct the readers' diagnoses, not to
repeat them.

## What a second run should count

For the next run to be comparable, record the same numbers this one produced:

| Count, this run                                        | n   |
| ------------------------------------------------------ | --- |
| defects briefed in                                     | 5   |
| repairs carried to the tree                            | 5   |
| regressions introduced by repairs, caught before merge | 3   |
| reader claims that did not survive source-checking     | ≥ 2 |
| coordinator dismissals that were themselves wrong      | 1   |
| facts found degraded elsewhere by the cascade-check    | 0   |

If a second run's numbers look like these — repairs landing, repair-regressions caught inside
the pipeline rather than by the next adopter, false positives settled by source — that is what
"it worked twice" would mean, and the owner's question about turning this into a skill becomes
answerable. One run cannot answer it.

## Provenance

Stages 2–5 are the coordinator's record (messages 157 and 160); the before/after copies lived in
a session-scoped scratch directory and will not survive, which is why their load-bearing content
is quoted above rather than pointed at. Stage 1's verification and stage 6's landing work are
first-hand in messages 153–159 and in the two commits named in the frontmatter. Where this page
says what a stage "could not see", that is the run's observed outcome stated once — not a claim
about what such a stage can never see.
