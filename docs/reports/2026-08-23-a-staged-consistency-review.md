---
type: report
generated: { by: claude-opus-5, at: 2026-08-23 }
status: draft
lifecycle: live
description:
  A three-stage review for finding documentation that has drifted out of agreement with itself —
  index, review by topic, apply and re-read. Written during the run, including the step that
  misfired, because the corrected sequence is what a skill would encode and the honest one is what
  this report is for.
tags: [method, docs, review, agents, consistency]
subject: the documentation corpus of this repository, reviewed on 2026-08-23
examined: README.md, AGENTS.md, docs/wiki/, docs/roadmap.md, docs/plans/, docs/reports/, .claude/skills/, user-facing strings in src/acc/
---

# A staged consistency review

**What this is.** The method used to review this repository's documentation for internal and
cross-document consistency on 2026-08-23, what each design decision bought, and where it went
wrong. Recorded because the branch it ran against had already passed a code review, a two-lens
review over two rounds and three prose cold reads — and this still found a normative code comment
stating the opposite of the code beneath it.

**It is a record, not an instruction.** If a skill is built from it, the skill should encode the
corrected sequence; this keeps the one that was actually run.

## The problem this addresses

A body of documentation drifts out of agreement with itself when changes are made piecemeal over
many sessions. Three failure modes, and only the first is easy:

1. **A document contradicts itself** — a new paragraph added above an old one that says the
   opposite. Findable by reading one file.
2. **Two documents disagree** — the definition lives in one place and is restated, staler, in
   three others. Not findable by reading files one at a time.
3. **A document never mentioned the change at all** and therefore still reads as though the old
   behaviour holds. **Invisible to any review driven by the diff**, because the file does not
   appear in it.

The third is the expensive one, and it is what this method is built around.

## Why not just review the diff

A diff-scoped review answers "is this change correct". It cannot answer "is the corpus consistent
after this change", because the documents most likely to be stale are exactly the ones the diff
never touched. In this project a code review and a two-lens review had both passed on the same
branch before this run started.

---

## Stage 1 — round up the suspects

**One agent. Index, do not judge.** Explicitly forbidden from evaluating, recommending or editing.

The instruction to separate indexing from judging is load-bearing: an agent that starts finding
problems stops looking for documents, and the inventory ends up shaped like whatever it noticed
first.

Required per entry:

- path, purpose, and **who reads it** (adopter / contributor / agent / historical record)
- **lifecycle** — must this be current, or is it a dated record where superseded statements are
  correct as written?
- **recent churn**, with evidence
- **topics it makes claims about**, from a fixed list

Plus two summaries: a **priority ranking**, and an **explicit exclusion list**.

### The three design decisions that mattered

**A fixed topic vocabulary per document.** Without it, stage 2 reads files in directory order and
cross-document inconsistency is invisible. With it, a reviewer can pull every document that speaks
to waivers and read them against each other. This is what makes failure mode 2 findable.

**A lifecycle field.** Some folders are frozen by contract — research reports are never brought up
to date, discharged plans record what was intended. A reviewer without this generates a large
volume of confident false findings, and the human then spends the expensive stage rejecting them.

**An explicit exclusion list.** An inventory that only says what it found leaves the reader unable
to distinguish "checked and dismissed" from "never looked". The exclusions are also where the
reasoning is visible — fixtures were excluded because their strings are deliberately wrong, and
that is a judgement worth seeing.

### How it went

Worked. The single highest-value output was unplanned: asked for topics and churn separately, the
agent derived an **"unchanged but affected" set** — nine documents that speak to a changed premise
but saw no commit. That is failure mode 3, enumerated. Worth making an explicit required output
next time rather than hoping it emerges.

It also caught a contradiction outside the repo: a stored memory note describing a tag format the
config does not use.

---

## Stage 2 — review for consistency

**Several agents, split by TOPIC rather than by directory.** Directory splits cannot find
cross-document disagreement; topic splits are built for it.

Each agent gets: the topic, a ground-truth summary of what changed (with instructions to verify it
rather than trust it), the document list for that topic including the unchanged-but-affected ones,
and a shared **lifecycle rules file** naming what is frozen.

Required output per finding: **file:line, what it says, why it is wrong, what it contradicts, and
a proposed replacement.** Findings sorted into internal / cross-document / stale-but-unflagged, and
ordered by consequence rather than by file.

### The decisions that mattered

**A separate lifecycle-rules file, shared by every reviewer.** Written once, read by all. Keeps the
frozen-document rule identical across agents instead of paraphrased three ways.

**"Verify this yourself, do not trust my summary."** The orchestrator writing the ground truth is
the person most likely to restate their own intent rather than the shipped behaviour.

**One agent aimed at tool-emitted text.** Help text, error hints, verdict lines and report headings
are documentation that happens to compile. Nothing lints a doc's quotation of program output
against the program. This was a human suggestion during planning and would not have been in the
plan otherwise.

### How it went

**Worked.** Three agents, roughly thirty findings, twenty-seven accepted. All three explicitly
listed what they had checked and NOT flagged, which is what made the acceptance rate trustworthy
rather than just high.

Evidence each design decision paid:

- **The topic split found what a directory walk cannot.** `SCHEMA.md` framing a field as
  documentation while `types.ts` called it "consulted at runtime"; a roadmap link to a heading
  renamed out from under it. Neither is visible reading one file at a time.
- **The lifecycle file produced zero false findings.** Every agent named the frozen documents it
  had read for context and declined to flag. Without it these would have been a large, confident,
  wrong pile.
- **"Verify, do not trust my summary" caught a wrong instruction.** One agent found a quoted CLI
  message that did not reproduce, captured the real one, and said so — rather than editing the doc
  to match the string the orchestrator had asserted.

**One thing to fix.** Reviewers were told to work read-only and did. But the topic split put
_runtime output_ and _code comments_ in different agents, and the tool-text agent captured output
while another was mid-edit in `report.ts`. Harmless here — the concurrent edit was comment-only —
but the captures would have been stale on arrival if it had not been. **Any batch that captures
program output must run after every batch that can change the program.**

---

## Stage 3 — the human-side pass

**The orchestrator reviews the recommendations, does not write them.** Whoever wrote most of the
prose is the worst judge of whether it reads consistently — but is the best judge of whether a
proposed edit is right. Splitting it that way uses each party where it is strong.

Then: instruct agents to apply the approved edits, and **read every applied edit afterwards**.

### The known weakness

If the orchestrator approves a bad recommendation, nothing downstream catches it. The final read
is the only guard, so it has to be a real pass rather than a formality. Worth stating in any skill
built from this.

### How it went

**The spot-check earned its place.** Before approving, the orchestrator re-verified three
findings at random. All three held — and one convicted an earlier repair: a dangling tag reference
had been "fixed" by pointing it at a different deleted tag. Approving thirty findings on trust
would have carried that forward.

**The final read found one more.** Two dates for the same measurement, twelve lines apart, in a
file three agents had touched. Nobody was assigned "read the whole thing afterwards", which is
precisely why the stage exists.

**Where the orchestrator did NOT decide.** One finding was a genuine fork — the README predicted a
version the config would not produce, fixable in prose or in config depending on intent. Escalated
rather than resolved. A reviewer who resolves an intent question by picking the cheaper edit is
making a product decision in a formatting pass.

**Honest limit, unchanged from the design.** If the orchestrator approves a bad recommendation,
only the final read catches it, and the same person performs both. That is a real single point of
failure and no amount of staging removes it.

---

## Cost

Seven agents: one indexing, three reviewing, three applying. Plus the orchestrator's triage, spot
checks and final read.

Justified here. The branch had already passed a code review, a two-lens review in two rounds, and
three prose cold reads — and this run still found a normative code comment stating the opposite of
the code beneath it, a tutorial whose closing claim was false against a real run, and the one guide
whose entire subject had changed underneath it without a word being edited.

**When it would NOT be worth it:** a corpus that has not changed, or a change confined to one
document. The method earns its cost when several premises moved and the edits were made piecemeal
across sessions.

## Verdict on making this a skill

**Worth building**, with four things carried over as written rules rather than as things the
orchestrator happened to do:

1. **Stage 1 must output the "unchanged but affected" set explicitly.** It emerged here from asking
   for topics and churn as separate fields, and it was the single highest-value output. Do not
   leave it to emerge.
2. **A shared lifecycle-rules file, written once and given to every reviewer.** The alternative is
   the same rule paraphrased differently three times, and a pile of false findings about frozen
   records.
3. **Sequence the capture batch last.** Anything that runs the program to quote its output must
   come after anything that can change the program.
4. **Tool-emitted text is a first-class subject.** Help text, error hints, verdict lines and report
   headings are documentation that happens to compile, and no linter checks a document's quotation
   of program output against the program.

Plus one instruction to the orchestrator, in the skill's own voice: **spot-check before approving,
and escalate intent questions rather than resolving them cheaply.**
