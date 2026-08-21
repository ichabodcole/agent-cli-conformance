---
name: two-lens-review
description:
  Review a change through two independent lenses at once — one reviewer on whether the fix is
  correct, a second on what else the change decides — so a repair does not quietly remove
  something load-bearing. Use before landing a fix, when reviewing a plan or proposal, when a
  change touches a premise other code reads, or when someone says "review this change", "is this
  fix safe", or "what might this break".
---

# How to review a change through two lenses

A change is judged by two questions, and one reviewer cannot hold both:

- **Is the fix correct?** — on the inputs it targets.
- **What else did the thing it changed use to decide?**

The second gets skipped, because the first is about the bug and the second is about everything else.
A post in the way of a path is worth removing right up until it turns out to be holding the roof up:
what a guard suppresses that is _not_ the target of the fix ships as a regression alongside the
repair. Run both lenses **at the same time** — running them one after the other is how the second
kind of defect surfaces only after the first fix has already landed.

Produces a **review report** (§5). A run that ends without that artifact is not a run of this skill.

**Vocabulary**, used precisely throughout:

| term           | means                                                                                                                                                                            |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **premise**    | the thing the change altered that something else consults — a guard, predicate, default, applicability test, invariant. In a plan, an assumption the plan relies on. Not a file. |
| **consumer**   | any code path, test, or document that reads the premise                                                                                                                          |
| **population** | a set of inputs that reach a consumer the same way, so one member stands for the rest                                                                                            |
| **lens**       | one of the two questions above, and the reviewer assigned to it                                                                                                                  |
| **the sweep**  | the before/after output comparison built in §2                                                                                                                                   |
| **round**      | one dispatch of a reviewer and the findings it returns                                                                                                                           |

**The three verdicts.** They describe the state at the end of the run, not its history — a run that
found defects and repaired them all ends `clear to land`:

| verdict             | means                                                                     |
| ------------------- | ------------------------------------------------------------------------- |
| `clear to land`     | every moved output explained, nothing outstanding                         |
| `defects to repair` | something is outstanding — including any moved output nobody can explain  |
| `blocked`           | the review could not be performed at all. Not a synonym for "do not land" |

---

## 0 · Before you start

**If the change alters no premise** — a rename, formatting, a pure refactor — this skill does not
apply. Say so and stop.

Otherwise you need three things:

- **The change, and what it is compared against.** Normally a branch and its merge base. If the work
  is uncommitted, commit it to a scratch branch first — the sweep runs two trees at once and cannot
  do that from a dirty tree.
- **A way to observe what the system does per input.** ⚠ **This is the one that can end the review
  before it starts.** Usually exit codes and stdout; it may instead be a rendered view, a stored
  record, a written file, or the return value of a public entry point. If you genuinely cannot
  observe per-input behaviour, report `blocked` — the sweep is the step this method rests on, and
  there is no honest version of the review without it. Reviewing a **plan** is the one exception;
  see the last section.
- **Reviewers who did not design the change.** Someone who shaped it can still test it, but cannot be
  the last word on whether it is sound — by the time a design has been through a round or two, the
  best-informed reviewer and the most invested one are the same person. If you wrote the change
  yourself, say so in the report: you are the orchestrator here, not a third reviewer.

## 1 · Write the premise note

Reviewers given "review this diff" review the diff, and the second lens then has nothing to range
over. Write the note first; both reviewers get it verbatim.

For each premise the change alters, one sentence each:

1. **What changed** — the guard, predicate, default, applicability test or invariant. Not the file.
2. **Who reads it** — grep the symbol, not the symptom. Every consumer, tests included.
3. **What it decides** — for each consumer, the outcomes it can produce, and which of those this
   change is meant to move.

**If the change alters several premises**, write one note per premise and put them all in front of
the same two reviewers. The notes scale; the reviewers do not.

**If a premise has no consumers**, that is a finding — dead code, or a grep that missed — not a clean
pass.

**If you cannot answer §1(3) for some consumer, stop and report `blocked`.** Do not dispatch. Nobody
knows what the change decides, and two reviews of an unknown are two opinions.

## 2 · Build the sweep, yourself

Build it **before** dispatching, and build it yourself. A reviewer marking an instrument it also
built is marking its own work, and two reviewers building it concurrently pay twice for the expensive
step. Reviewer B receives the output, not the job.

**Run the system's observable output over a corpus of inputs, on both trees, and diff it. Every input
whose result moved needs an explanation. An unexplained one is presumed to be holding something up,
and makes the verdict `defects to repair`.**

Build the corpus from §1(2) rather than from what is lying around:

1. For each consumer, name at least one input per population that reaches it.
2. If you cannot name one for some consumer, record that consumer as **uncovered**. It goes in the
   report, and it is a finding.
3. Only then add whatever existing fixtures also happen to serve that list.

> **⚠ Pointing at an existing fixtures directory and calling it the corpus is the most likely way
> this review fails.** It satisfies the word "corpus" without satisfying the requirement, produces a
> confident `3 of 40 moved`, and is silent about exactly the consumers nobody thought to write a
> fixture for. Build the list from the consumers, then see which fixtures serve it.

> **⚠ Run both trees. Do not read the diff and derive what the base would have produced.** Deriving
> is reasoning, and the point of a sweep is an answer that does not depend on your reading of the
> code — which is the reading that produced the change. Use `git worktree` at the merge base rather
> than stashing, so both trees stay runnable while reviewers work.

> **⚠ Running the test suite on both trees is not a sweep.** The suite asserts what someone already
> thought to assert; the sweep asks what actually changed. A green suite on both sides is compatible
> with a silently altered result on every input nobody wrote a test for — which is the defect class
> this method exists to catch. If building the sweep looks expensive, that cost is the step, not an
> obstacle to it.

**Normalise before diffing** — timestamps, absolute paths, durations, nondeterministic ordering.
Unnormalised output moves every row and buries the ones that moved for a reason.

### Worked example

Premise: a validator gained a guard so it stops rejecting inputs whose encoding it cannot confirm.

```
§1  changed  : reject() gated on encodingConfirmed()
    consumers: validate() [3 branches], importFile(), 2 test files
    decides  : reject|accept|defer — the change is meant to move only reject→defer
§2  corpus   : 22 inputs — at least one per population reaching each consumer above
    output   : exit code + verdict line per input
    moved    : 7 of 22
             5  reject→defer    intended
             1  reject→accept   NOT intended — the guard sits above the size check too
             1  accept→accept   message wording only, explained
```

The `reject→accept` row is the finding. It is invisible in the diff and invisible to a passing test
suite.

## 3 · Dispatch both reviewers together

In a single dispatch, so neither waits on the other. Give both the premise note from §1, the branch
and base, and these standing constraints:

- **Do not touch the shared working tree.** No edits, commits or pushes to it — the other reviewer is
  running against it. Reverting the change in order to test it is expected, and belongs in a
  worktree of your own.
- **Return findings with the command and output that produced them.** A finding nobody ran is a
  hypothesis.

**Reviewer A — is the fix correct?** A does not get the sweep; its question is the fix itself.

> Does it hold on the inputs it targets? Attack the predicate on its edges rather than reading its
> name. Attack every branch that can reach the changed outcome, not only the branch where the symptom
> was reported. Confirm the new tests fail when the fix is reverted — in a worktree of your own, and
> by running them rather than by reasoning about them.

**Reviewer B — what else moved?** Brief B in these words, because its default failure is drifting
into A's job and buying you two reviews of one question:

> **Do not evaluate whether the fix is correct. Assume it is.** Your question is only: what did this
> premise previously decide that it no longer decides? Here is the sweep output from §2. Account for
> every input whose result moved, and name any input shape the sweep does not cover.

**If A and B contradict each other**, neither wins by seniority. Reproduce both claims yourself, and
report what you ran.

## 4 · Triage what comes back

- **Reproduce before repairing.** Run the reporting reviewer's own command first. Reviewers are
  confidently wrong often enough that repairing an unreproduced finding wastes a round in both
  directions.
- **Repair at the premise.** Change the premise once so every consumer inherits it — not the same
  edit applied at each grep hit, which multiplies the thing you are trying to centralise. If a
  consumer needs its own handling, that is a second finding, not a second copy.
- **Re-run the sweep after every repair.** The repair moves outputs too, and it is the sweep nobody
  thinks to run.
- **Send the result back to the reviewer who raised it**, telling them to assume the repair introduced
  something new rather than only that it fixed something old.

**Keep going while rounds return defects. Stop when they return preferences** — and note that you
wrote the repair, which makes you the worst-placed judge of which is which. When a finding could be
either, treat it as a defect and send it back.

**If a round returns a defect in something you repaired in an earlier round, stop and tell the
human.** The design is being iterated through review, and review cannot converge on that.

## 5 · Report

The deliverable, and what the human uses to decide whether this lands. It is the message that ends
the run — write it there unless someone asked for a file.

- **Verdict** — `clear to land`, `defects to repair`, or `blocked`.
- **The premise note** from §1.
- **The sweep** — the counts, and every moved input with its explanation. Unexplained ones first.
- **Consumers the corpus could not cover**, plus any input shape B flagged as uncovered.
- **Findings**, each with the command and output that confirmed it, and what was done about it.
- **This skill** — any step that misfired, was ambiguous, did not apply, or was missing. Propose the
  change; do not work around it silently and do not edit this file unprompted. A step that failed is
  worth more than a step that passed, and it is the only evidence that this file is wrong.

## Reviewing a plan instead of a diff

Same two lenses, no code, and the one case exempt from §0's requirement that the system be
observable. The sweep cannot run: say so in the report and give a verdict anyway, rather than forcing
a substitute.

Reviewer B's question becomes: **what does this premise currently decide, that the plan would change
without saying so?** The answer comes from §1(2)–(3) alone, which is why the premise note is worth
writing before anything is built.

A plan that names the behaviour it intends to change and is silent on the rest is not scoped yet.
That is far cheaper to find here than after the diff exists.
