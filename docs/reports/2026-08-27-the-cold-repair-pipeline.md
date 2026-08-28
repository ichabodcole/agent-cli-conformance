---
type: report
generated: { by: claude-fable-5, at: 2026-08-27 }
status: stable
lifecycle: live
description:
  A record of the cold-repair pipeline — cold writers and cold readers — run twice, on 2026-08-27
  and 2026-08-28. The stages as run, what each caught that the previous one could not, the false
  positives, both runs' counts side by side, and the one stage added afterwards with a prediction
  pinned before it is first used.
tags: [method, docs, review, testing]
subject:
  the cold-repair pipeline as run twice, with the counts that make a third run comparable and a
  pre-registered prediction for the stage added after run 2
examined:
  run 1 — the repair of docs/wiki/guides/how-to-reach-l0-in-your-project.md and
  docs/wiki/rules/streams/machine-mode-holds-on-parser-errors.md across acc-internal messages
  153-160, landed on develop as commits 5b7559a and d5174eb; run 2 — the repair of
  skills/acc/SKILL.md section 1, landed as 7ff689d with a cascade fix to
  docs/wiki/guides/how-to-reach-l0-in-your-project.md
---

# The cold-repair pipeline

This is a record of a method, not an endorsement of one. It has now been run twice, on
consecutive days, over three documents. "It caught repair-introduced regressions in both runs,
nine in total, none of which reached the tree" is a fact this page can state; "it reduces
regressions" is a claim it cannot, and does not — nothing here measures what would have happened
without it. The reason to write it comes from the project owner: if the same work comes up again,
someone should be able to run the same stages without having been here, and afterwards we should
be able to tell whether it worked again.

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

## The stages, as run in both runs

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

## The counts, both runs

Run 2 (2026-08-28) followed the six stages above unchanged, on one document:
`skills/acc/SKILL.md` section 1, repairing an adopter's report that step 1 was written for a
fresh install and walked an existing installation into a duplicate dependency key.

| Count                                                  | run 1 | run 2 |
| ------------------------------------------------------ | ----- | ----- |
| defects briefed in                                     | 5     | 4     |
| repairs carried to the tree                            | 5     | 5     |
| regressions introduced by repairs, caught before merge | 3     | 6     |
| reader claims that did not survive source-checking     | ≥ 2   | 0     |
| coordinator dismissals that were themselves wrong      | 1     | 0     |
| facts found degraded elsewhere by the cascade-check    | 0     | 1     |
| writer refusals — "I cannot state this" — used         | —     | 5     |

Run 2's brief was smaller, so the raw regression count understates the change. Per defect
briefed in, repair-introduced regressions went from **0.6 to 1.5**.

**It worked twice, on the only question this page can answer.** Both runs landed their repairs
and both caught every repair-introduced regression inside the pipeline rather than in front of
the next adopter. What neither run establishes is the counterfactual: nothing here measures what
would have shipped without the stages, and two runs on three documents cannot.

Three differences from run 1 are worth carrying rather than averaging away:

- **Readers were reliable this time.** Run 1's summary was that readers were strong at
  _"something is wrong here"_ and unreliable at _"and here is what"_. In run 2 every reader claim
  reproduced when the coordinator re-ran it — including the two that overturned a repair. One run
  each way; the run-1 sentence stands as that run's finding, not as a property of cold readers.
- **The repairs were the whole problem.** Six of run 2's defects were introduced by its own
  repairs, and two were severe: the first repair reintroduced the exact defect it was commissioned
  to remove, and the second made a copy-pasteable block destructive on an existing install. Both
  were invisible to the writer and to the first reader, and both were found by a reader given the
  original problem and told nothing about what had changed.
- **A verified claim was falsified by a later edit, twice.** A sentence reading
  "`package.json` untouched, measured" stayed in the text across a structural edit that made it
  false. The measurement had been real when taken. Nothing in the six stages asks whether an
  edit invalidates a measurement already in the document.

That last one is what the next section changes.

## The two stages added after run 2 — NEITHER YET RUN

Everything above is a record of what happened. This section is not: it is two changes to the
method, adopted on 2026-08-28, which **no run has used**. It is written
here, before its first use, so that run 3 can falsify it rather than confirm whatever anyone
believes by then. Do not read the stages above as including it.

**The change.** Stage 2's brief gains two requirements, in order, before the writer edits
anything:

1. **Read the passage and the document it sits in**, not only the passage. A writer given a
   paragraph edits a paragraph.
2. **Name what depends on what you are about to change** — which sentences in this document rest
   on the thing being edited, which measurements in it were taken under the current wording, and
   what else would have to move. Write that list down BEFORE writing the repair. Afterwards, check
   each entry and report which ones moved.

Requirement 2 is the one with teeth, and it is a premise note in the sense
[the two-lens review skill](../../.claude/skills/two-lens-review/SKILL.md) already uses for code:
the premise, its consumers, and what it decides. Nothing in this project applied that to prose
before now.

**Why this and not "read more carefully".** The evidence is run 2's six regressions. Its writer
DID read the file and DID flag three problems outside its brief unprompted — so "read the
context" was already happening, and it did not prevent a single one of the six. What the writer
never did was predict the consequences of its own edit: that carving out a reader who skips the
install makes "the second line is part of the install" false; that a block growing from three
lines to six detaches "before the third line" from the command it was guarding; that moving
`bun remove` above the add falsifies a measured sentence sitting four lines below it. Each is a
dependency the writer could have listed before editing and checked afterwards.

**What it is NOT allowed to do.** It does not shrink the reader stages. A writer predicting its
own blast radius is still the author, and author blindness is a different failure from the one
this addresses — the writer that missed all six had already read the document. Stages 3 and 5
stay exactly as they are, and if a future run cites this stage as a reason to drop one, that is
the misreading this paragraph exists to prevent.

**The cost, stated in advance so it is not discovered as a surprise:** a longer brief, a slower
first pass, and a writer that may report a widened scope back instead of returning a repair. Run
2 suggests the last of those is a feature — its writer's unprompted out-of-brief findings became
two thirds of the final scope — but it does mean the coordinator makes more decisions mid-run.

### The second change: two seam instruments at stage 6

Stage 6 gains **two** instruments, named separately so neither absorbs the other. Shipping only
the first would repair the visible half of a two-home defect, which is the class being
instrumented for, one level up.

**NEAR SEAM — diff-local.** Diff the merged result, and for each hunk read one unit outward: the
enclosing paragraph or comment, anything the hunk cites, and anything that cites the hunk. Ask of
each sentence only _"is this still true now that the edit exists?"_ The diff defines the seam, so
the check lands on it without depending on vigilance, and "one unit outward" is a stopping rule
rather than an invitation to re-read the document.

**FAR SEAM — the mechanism noun.** When a measurement changes what a MECHANISM is, grep that
mechanism's noun across the live surfaces and check each hit for whether it is a **warrant**.
Grepping the instruction does not surface these, because the instruction did not change.

**Where the far-seam terms come from, which decides whose blindness the instrument inherits.**
They come from the measurement's own statement of what is no longer true — never from the
writer's dependency list. A noun absent from that list is ungreppable by construction, so
sourcing from the list would import the exact blindness this instrument exists to cover.
Sourcing from the finding keeps it checkable by anyone holding only the finding. The writer's
list may add terms; it may not be the source.

**The distinction the instruments are built on**, and the sharpest statement of this defect class
anyone reached: **an edit's scope is the set of sentences that ASSERT the changed claim; its
blast radius is the set that CITE it as a reason.** Those are different sets, they are worded
differently, and the second survives every review that greps for the instruction — because the
instruction did not change. Only its warrant did.

**The evidence, which is stronger than it first looked.** The coordinator recorded two instances
and a hunch. It is neither two nor a hunch: a scoped edit that falsifies a sentence just outside
the scope is the same defect class as a rule repaired in one of its two homes, and that week
produced four more — a git guard, the version literals, the evidence pointers, and a twelve-line
construction with two copies, each repaired in one home while the other went on asserting the old
world. **Six instances across three writers in one week.**

**And one specimen survived a purpose-built pass, which is why both instruments exist.** A commit
titled "close the two seams the transport repair left across file boundaries" left a falsified
sentence as the LAST TRAILING CONTEXT LINE OF ITS OWN HUNK — on screen, unchanged, directly below
the edit, during a pass whose entire purpose was finding sentences that edit had falsified. Of
the four instances then on the table, two crossed a file boundary and two did not, and the one
missed hardest was adjacent. The reading: _"my scope ends at this file"_ is a vivid boundary, and
holding it makes the far seam salient and the near one invisible. The commit went looking across
the boundary it had just declined to cross and walked past the paragraph it was standing next
to.

**How it relates to the first change.** The writer's dependency list is a **prediction**, made
before the edit by the person making it. The seam check is a **verification** of the same set,
made after the merge, against the merged text, by someone who did not make the edit. Neither
substitutes for the other, and the pairing is the reason the prohibition above holds: flagging and
predicting are different acts, and a stage that does one cannot absorb a stage that does the
other.

### The prediction, pinned before run 3

Recorded now so it cannot be adjusted to fit the result, the way
[the trial protocol](../plans/2026-08-26-the-trial-protocol-pinned-before-it-runs.md) pins its
failure classes before the adopter starts:

> **Run 3 will show repair-introduced regressions per defect briefed in FALL BELOW run 2's 1.5,
> and the writer's own dependency list will name at least one consequence that a reader stage
> would otherwise have caught.**

**The discriminator, one field per finding.** Classify every reader finding as **ON-LIST** — the
writer named the dependent and mishandled it — or **OFF-LIST** — the writer never named it.

**On-list means named AS A DEPENDENT, and every list entry carries its role.** This is not
pedantry; run 3 produced the case that breaks the coarse coding. A writer's entry read
_"skills/acc/SKILL.md:45-47 — the hedged wording I am adopting verbatim. VERIFY before quoting"_ —
the right file, the right line range, the exact sentence — and the defect found there was still
**off-list**, because the entry named it as a SOURCE TO QUOTE and not as a dependent. Coding by
file would have scored it on-list; coding by sentence would too. Only the role separates them.
So the writer marks each entry's role when writing the list, which is before the edit exists and
therefore at the moment fudging is impossible, and a source-to-quote entry that turns out to hold
a dependent scores off-list — the honest score, because the writer never predicted it. The
two hypotheses then separate cleanly, and this is what makes the prohibition above mechanical
rather than asserted:

- If the list is **absorbing reader work**, on-list findings fall toward zero AND off-list
  findings fall too.
- If the list does what is claimed for it, on-list findings fall toward zero while **off-list
  findings hold near the old rate** — the list fixes what the writer could see and moves nothing
  in the dimension the reader exists for.

A far-seam hit is off-list almost by definition, which is a quiet second confirmation that the
list and the readers measure different dimensions.

**What would falsify it.** A run-3 rate at or above 1.5 on a brief of comparable shape, or a
dependency list that names only consequences the writer was already going to avoid. Either means
the stage costs a longer brief and buys nothing, and it should be removed rather than explained.

**The confound, named now — and there are two.** First, run 2's rate is one number from one run
on one document, and the runs differ in material, in brief size, and in how much of the scope was
discovered mid-run rather than briefed. Second: **three instruments were adopted at once** — the dependency
list, the near-seam check and the far-seam grep — so a run 3 whose overall rate falls cannot say
which of them moved it.

**That second confound has a cheap answer, and it is adopted.** Each instrument's catch-condition
is a property of the DEFECT rather than of the process that found it: near-seam catches a
sentence sitting inside a hunk's context window; far-seam catches a sentence carrying the
measurement's dethroned noun outside the touched files; the dependency list catches what the
writer named. Whether a given defect satisfies each condition is checkable by anyone holding the
defect, the diff and the finding — **after the fact, regardless of which stage actually surfaced
it.** So tag every defect with the set of conditions it satisfies and read per-class rates. A
fall concentrated in diff-context defects credits the near-seam rule; a fall in dethroned-noun
defects credits the grep; a fall in neither, with the overall rate down anyway, is the honest
signal that something else moved and none of the three earned it.

**And the baseline can be recovered rather than waited for.** Runs 1 and 2's defects are recorded,
their diffs are in history, and the measurement that dethroned "bare clone" names its own noun —
so the per-class baseline exists already, from evidence nobody has to regenerate.

Two limits, kept beside the weakness rather than replacing it. A defect can satisfy more than one
condition; the tagging makes that ambiguity visible rather than resolving it, and an ambiguous
defect credits no single instrument. And **the run-shape confound survives for the overall rate**
— this isolates the instruments from each other, not from the shape of the work. It is the same
trade as the on-list/off-list field one level up: it does not remove a confound, it makes the
confound legible per finding. That is a real weakness in this
design, accepted deliberately because both changes answer measured failures and delaying one to
isolate the other would ship a known defect for the sake of a cleaner experiment. It does mean
the honest reading of a good run 3 is "the pair helped", never "the dependency list helped". A single run 3 cannot settle this; it can only fail to support it.
If run 3's rate falls, the honest claim remains "twice out of three runs the regressions were
caught inside the pipeline, and the rate fell once after the stage was added" — not "the stage
works."

## A second class, kept separate from the seams

Two instances in one day, from different writers, of the same thing — and it is **not** the seam
class, so it is recorded here rather than added to that count:

- A writer repairing a document full of stale version literals wrote its own working notes into
  the worktree, and `docs:lint` refused them for an unmarked `#v0.1.5`.
- The coordinator, three hours earlier, put a `#v0.1.5` into new README prose and was refused by
  the same rule.

**Both were the author of a repair breaking, inside that repair, the exact rule the repair was
enforcing.** Neither was caught by a reader, a dependency list or a seam check — both were caught
by a mechanical guard this project had already built for the defect, which is the argument for
building such guards rather than for reading harder.

The relationship to the seam class is worth stating precisely, because it is tempting to merge
them: a seam defect is a sentence OUTSIDE the edit that the edit falsified, and this is a
violation INSIDE the edit of the rule the edit exists to apply. What they share is the mechanism —
holding a rule in mind while applying it is what makes your own instance of it invisible — and
what separates them is that only one of the two has a cheap automated check. Do not fold this
into the six.

## Provenance

Run 1: stages 2–5 are the coordinator's record (messages 157 and 160); the before/after copies
lived in a session-scoped scratch directory and will not survive, which is why their
load-bearing content is quoted above rather than pointed at. Stage 1's verification and stage
6's landing work are first-hand in messages 153–159 and in commits 5b7559a and d5174eb.

Run 2: the coordinator ran every stage in one session and re-ran every reader claim before
acting on it, so its counts are first-hand rather than reported. The repair landed as 7ff689d
with the cascade fix in the same commit. Its before/after copies were likewise scratch-scoped
and are gone; the two severe regressions are quoted in the commit message, which was written
while they were still reproducible. The measurements that settled them — a bare `#` ref
delivering an older kit at exit 0, and a paste leaving an existing install deleted — were run by
the coordinator, not accepted from a reader. Where this page
says what a stage "could not see", that is the run's observed outcome stated once — not a claim
about what such a stage can never see.
