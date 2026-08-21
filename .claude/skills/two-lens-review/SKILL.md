---
name: two-lens-review
description:
  Review a change through two independent lenses at once — one reviewer on whether the fix is
  correct, a second on what else the change decides — so a repair does not quietly remove
  something load-bearing. Use before landing a fix, when reviewing a plan or proposal, when a
  change touches a premise other code reads, or when someone says "review this change", "is this
  fix safe", or "what might this break".
---

# Two-lens review

A fix is judged by two different questions, and one reviewer cannot hold both.

- **The tree.** Does this do what it claims, on the population it targets?
- **The forest.** What else did the thing you changed used to decide?

The second is the one that gets skipped, because the first is about the bug and the second is about
everything else. A post standing in the middle of a path is worth removing right up until it turns
out to be holding the roof up.

**Both lenses, dispatched together.** Serially is how the systemic defect gets found in round two,
after the narrow one has already shipped.

---

## 0 · Name the premise before dispatching

A reviewer given "review this diff" reviews the diff. Give them the premise instead, or the forest
lens has nothing to range over.

Write down, in a sentence each:

1. **What premise changed.** The guard, predicate, default, applicability test, or invariant — not
   the file.
2. **Who reads it.** Grep the symbol rather than the symptom. Every consumer, tests included.
3. **What it decides.** For each consumer, which outcomes it can produce, and which of those the
   change is meant to move.

If (3) is hard to answer, that is the finding, and it arrives before any reviewer is spawned.

> **⚠ A guard suppresses.** Whatever it suppresses that is not the target of the fix is a
> regression shipping with the repair. Placement is the whole of it: too late and it fires after
> the damage, too early and it intercepts outcomes that were already correct.

## 1 · Two reviewers, neither of whom designed the change

Dispatch them in one message so they run concurrently, each with the §0 premise note.

**Reviewer A — the fix.** Does it hold on the population it targets? Attack the predicate on its
edges rather than reading its name. Attack every branch that can reach the changed outcome, not
only the branch where the symptom was reported. Confirm the tests fail without the fix.

**Reviewer B — the blast radius.** Brief this one carefully, because the default failure is that it
drifts into A's job and you pay for two reviews of the same question:

> **Do not evaluate whether the fix is correct. Assume it is.** Your question is only: what did
> this premise previously decide that it no longer decides? Find behaviour that moved on inputs
> unrelated to the bug, and require an explanation for each one.

A reviewer who has helped shape the change can still test it, but cannot be the last word on
whether it is sound — by the time a design has been through a round or two, the best-informed
reviewer and the most invested one are the same person.

## 2 · The instrument for the forest lens

Opinion does not scale here; a diff does. Reviewer B's question has a mechanical form:

**Run the system's observable output over a corpus of inputs, before and after, and diff it. Every
cell that moved needs an explanation. A cell nobody can explain is a support beam.**

Build it from whatever the system already emits — verdicts, exit codes, rendered output, a report.
Restrict the corpus to inputs that touch the changed premise, so the sweep finishes; the enumeration
in §0 tells you which those are. Compare against the merge base in a worktree rather than stashing,
so both trees stay runnable.

> **⚠ The diff is silent about populations the corpus does not cover, and that silence reads
> exactly like a clean result.** Before trusting it, ask which shapes of input have no case at all.
> A defect that survives a green sweep is usually living in a population nothing exercises — and
> the missing case is itself the finding, ahead of whatever it was hiding.

## 3 · Triage

Reproduce before repairing. A reported defect you have not run is a hypothesis, and reviewers are
confidently wrong often enough that acting on an unreproduced one wastes a round in both
directions.

Then fix the premise rather than the branch: the repair belongs at every site §0 listed, not only
where the symptom surfaced.

**Send the result back to the same reviewer.** They hold the only baseline, so they are the only
reader who can say whether it moved — and tell them to assume the repair introduced something new
rather than only that it fixed something old. Keep going while the passes return defects; stop when
they start returning preferences.

## 4 · Reviewing a plan

The same two lenses, before any code exists. The forest reviewer's question becomes: **what does
this premise currently decide, that the plan would change without saying so?** A plan that names
the behaviour it intends to change and is silent on the rest is not scoped yet — and that is far
cheaper to find here than after the diff exists.

## 5 · Feedback

**Close the run by reporting on this file**, in a line or two: any step that misfired, was
ambiguous, did not apply, or was missing. Raise it with the human as a proposed change — do not work
around it silently, and do not edit this skill unprompted.

A step that failed is worth more than a step that passed. The failure is the only evidence this file
is wrong.
