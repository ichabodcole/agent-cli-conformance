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

| term            | means                                                                                                                                                                            |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **premise**     | the thing the change altered that something else consults — a guard, predicate, default, applicability test, invariant. In a plan, an assumption the plan relies on. Not a file. |
| **consumer**    | any code path, test, or document that reads the premise                                                                                                                          |
| **population**  | a set of inputs that reach a consumer the same way, so one member stands for the rest                                                                                            |
| **lens**        | one of the two questions above, and the reviewer assigned to it                                                                                                                  |
| **the sweep**   | the before/after output comparison built in §2                                                                                                                                   |
| **round**       | one dispatch of a reviewer and the findings it returns                                                                                                                           |
| **moved**       | an input whose observed output differs between the two trees                                                                                                                     |
| **explained**   | you can say why it moved                                                                                                                                                         |
| **intended**    | the change was _meant_ to move it, per §1(3)                                                                                                                                     |
| **outstanding** | anything not yet resolved: a moved output that was not intended, a consumer nobody could analyse, a consumer the corpus could not reach, or a finding not yet repaired           |

> **⚠ Explaining a row does not clear it.** A moved output you can account for and did not intend is
> the regression this whole method exists to find — the worked example in §2 is exactly that case.
> `explained` is how you learn whether a move was `intended`; only `intended` clears it.

**The three verdicts.** They describe the state at the end of the run, not its history — a run that
found defects and repaired them all ends `clear to land`:

| verdict             | means                                                                         |
| ------------------- | ----------------------------------------------------------------------------- |
| `clear to land`     | every moved output was intended, and nothing is outstanding                   |
| `defects to repair` | something is outstanding                                                      |
| `blocked`           | the review could not be performed **at all**. Not a synonym for "do not land" |

---

## 0 · Before you start

**If the change alters no premise** — a rename, formatting, a pure refactor — this skill does not
apply. Say so and stop. If you are unsure whether something counts, it counts.

Otherwise you need three things:

- **The change, and what it is compared against.** Normally a branch and its merge base. If the work
  is uncommitted, commit it to a scratch branch first — the sweep runs two trees at once and cannot
  do that from a dirty tree. Note the branch and worktrees you create; §5 has you clean them up.
- **A way to observe what the system does per input.** ⚠ **This is the one that can end the review
  before it starts.** Usually exit codes and stdout; it may instead be a rendered view, a stored
  record, a written file, or the return value of a public entry point. Report `blocked` only if
  **no** consumer can be observed — if some can and some cannot, sweep the ones you can and record
  the rest as uncovered consumers, which are outstanding. Reviewing a **plan** is the one exception
  to needing a runnable system; that means an artifact that proposes work not yet built, and
  reframing an unobservable system as "effectively a plan" is how a `blocked` run gets a verdict it
  did not earn.
- **Reviewers who did not design the change.** Someone who shaped it can still test it, but cannot be
  the last word on whether it is sound — by the time a design has been through a round or two, the
  best-informed reviewer and the most invested one are the same person. Fresh subagents satisfy
  this. If you wrote the change yourself, say so in the report: you are the orchestrator here, not a
  third reviewer.

## 1 · Write the premise note

Reviewers given "review this diff" review the diff, and the second lens then has nothing to range
over. Write the note first; both reviewers get it verbatim.

For each premise the change alters, one sentence each:

1. **What changed** — the guard, predicate, default, applicability test or invariant. Not the file.
2. **Who reads it** — grep the symbol, not the symptom. Every consumer, tests included.
3. **What it decides** — for each consumer, the outcomes it can produce, and which of those this
   change is meant to move. This is what `intended` means later; everything else that moves is a
   finding.

**If the change alters several premises**, write one note per premise and put them all in front of
the same two reviewers. The notes scale; the reviewers do not.

**If a premise has no consumers**, that is a finding — dead code, or a grep that missed — not a clean
pass.

**If you cannot answer §1(3) for some consumer**, that consumer is outstanding: record it, tell both
reviewers it is unanalysed, and carry on. Report `blocked` only if you cannot answer §1(3) for _any_
consumer, because then nobody knows what the change decides at all and two reviews of an unknown are
two opinions.

## 2 · Build the sweep, yourself

Build it **before** dispatching, and build it yourself. A reviewer marking an instrument it also
built is marking its own work, and two reviewers building it concurrently pay twice for the expensive
step. Reviewer B receives the output, not the job.

**Run the system's observable output over a corpus of inputs, on both trees, and diff it. Every input
whose result moved needs an explanation, and every explanation has to end in `intended` or it is
outstanding.**

### How to run it

- **The driver is whatever reaches the consumer most directly.** A CLI: invoke the binary per input.
  A library: a throwaway script importing the public entry point and printing a result line per
  input. A service: start it, drive the endpoint, capture responses. A migration or a UI: capture the
  resulting state or rendered output. The output only has to be stable, per-input, and comparable —
  it does not have to be what a user sees.
- **⚠ You are about to execute real code paths over real inputs, twice.** If any consumer writes
  files, mutates a database, sends mail or calls a paid API, sandbox it — a scratch data directory,
  a disposable container, stubbed network — or restrict the corpus to inputs that cannot reach the
  destructive path, and say in the report which consumers you could not safely sweep. They are
  uncovered.
- **If the merge-base tree will not build or needs different dependencies**, install them in that
  worktree; the two trees are independent checkouts. If it genuinely cannot be built, that is
  `blocked` — there is no baseline.

### How to build the corpus

Build it from §1(2) rather than from what is lying around:

1. For each consumer, split its inputs into populations — two inputs are the same population only if
   you can say what makes them take the same path through that consumer. If you cannot say, they are
   different populations.
2. Name at least one input per population.
3. If you cannot name one for some population, record that consumer as **uncovered**, and say which
   population is missing. It goes in the report, and it is outstanding.
4. Only then add whatever existing fixtures also happen to serve that list.

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

**Normalise before diffing** — timestamps, absolute paths, durations. Unnormalised output moves every
row and buries the ones that moved for a reason. **Normalise no further than that**: sorting output
to remove "nondeterministic ordering" erases a real move whenever the ordering _is_ the regression,
and rewriting messages erases the wording changes B is there to account for. A clean sweep bought by
normalisation is the quietest way to pass.

### Worked example

Premise: a validator gained a guard so it stops rejecting inputs whose encoding it cannot confirm.

```
§1  changed  : reject() gated on encodingConfirmed()
    consumers: validate() [3 branches], importFile(), 2 test files
    decides  : reject|accept|defer — INTENDED: reject→defer, for unconfirmed encoding only
§2  populations: validate/confirmed, validate/unconfirmed, validate/oversize,
                 importFile/confirmed, importFile/unconfirmed  → 22 inputs
    uncovered  : importFile/unconfirmed — no input reaches it; writes to disk, not sandboxed
    output     : exit code + verdict line per input
    moved      : 7 of 22
             5  reject→defer   intended
             1  reject→accept  explained, NOT intended — the guard sits above the size check
             1  accept→accept  explained, NOT intended — message wording changed
verdict: defects to repair (1 unintended move, 1 wording move, 1 uncovered population)
```

The `reject→accept` row is the finding, and note that it is **explained** — "the guard sits above
the size check" is a complete account of why it moved. Explaining it is how you discover it was
never intended. It is invisible in the diff and invisible to a passing test suite.

## 3 · Dispatch both reviewers together

In a single dispatch, so neither waits on the other. Give both the premise note from §1, the branch
and base, and these standing constraints:

- **Do your work in a worktree of your own.** Reverting the change to test it is expected and belongs
  there. Do not edit, commit or push to the shared working tree — the other reviewer is running
  against it.
- **Return findings with the command and output that produced them.** A finding nobody ran is a
  hypothesis.

**Reviewer A — is the fix correct?**

> Does it hold on the inputs it targets? Attack the predicate on its edges rather than reading its
> name. Attack every branch that can reach the changed outcome, not only the branch where the symptom
> was reported. Confirm the new tests fail when the fix is reverted — in a worktree of your own, and
> by running them rather than by reasoning about them.

**A does not get the sweep.** Handed a list of rows that already moved, A anchors on them and audits
B's evidence instead of attacking the predicate — and the branch nothing in the corpus reached is
precisely the one A exists to find.

**Reviewer B — what else moved?** Give B the sweep's **rows**, not a summary of them: summarising is
you deciding in advance which rows matter, which is B's job and the reason B exists. Brief B in these
words, because its default failure is drifting into A's job and buying you two reviews of one
question:

> **Do not evaluate whether the fix is correct. Assume it is.** Your question is only: what did this
> premise previously decide that it no longer decides? Here is the sweep output from §2. Account for
> every input whose result moved, say for each whether the premise note marks it intended, and name
> any input shape the sweep does not cover.

**If A and B contradict each other**, neither wins by seniority. Reproduce both claims yourself, and
report what you ran.

## 4 · Triage what comes back

**Wait for both rounds before repairing.** A repair mutates the tree a reviewer may still be running
against, and silently invalidates whatever it reports afterwards. If you must move early, repair in a
worktree of your own and leave the shared tree alone.

- **Reproduce before repairing.** Run the reporting reviewer's own command first. Reviewers are
  confidently wrong often enough that repairing an unreproduced finding wastes a round in both
  directions.
- **Repair at the premise.** Change the premise once so every consumer inherits it — not the same
  edit applied at each grep hit, which multiplies the thing you are trying to centralise. If a
  consumer needs its own handling, that is a second finding, not a second copy.
- **Re-run the whole sweep after every repair**, not the rows you judge related — the repair is a
  change like any other and gets the same treatment, and judging which rows it could have touched is
  the reading the sweep exists to replace. This is the largest cost in the method: one full sweep per
  round, not one per run. Report how many inputs you re-ran.
- **Send the result back to the reviewer who raised it**, telling them to assume the repair introduced
  something new rather than only that it fixed something old.

**Keep going while rounds return defects. Stop when they return preferences** — and note that you
wrote the repair, which makes you the worst-placed judge of which is which. When a finding could be
either, treat it as a defect and send it back. A round that returns alternatives you could adopt or
decline, rather than failures someone can show you, is the signal that the defects have run out.
Report the number of rounds.

**If a round returns a defect in something you repaired in an earlier round, stop and tell the
human.** The design is being iterated through review, and review cannot converge on that.

## 5 · Report

The deliverable, and what the human uses to decide whether this lands. It is the message that ends
the run — write it there unless someone asked for a file. Remove the worktrees and any scratch branch
first, and restore the working tree you found.

- **Verdict** — `clear to land`, `defects to repair`, or `blocked`.
- **The premise note** from §1.
- **The sweep** — the counts, the number of rounds, and every moved input with its explanation and
  whether it was intended. Unintended and unexplained ones first.
- **Uncovered** — consumers the corpus could not reach, populations with no input, and consumers you
  could not safely or observably sweep. Each is outstanding.
- **Findings**, each with the command and output that confirmed it, and what was done about it.
- **This skill** — any step that misfired, was ambiguous, did not apply, or was missing. Propose the
  change; do not work around it silently and do not edit this file unprompted. A step that failed is
  worth more than a step that passed, and it is the only evidence that this file is wrong. "No issues
  encountered" at the end of a long run is usually fatigue rather than a finding.

## Reviewing a plan instead of a diff

Same two lenses, no code, and the one case exempt from §0's requirement that the system be
observable. The sweep cannot run: say so in the report and give a verdict anyway, rather than forcing
a substitute.

Reviewer B's question becomes: **what does this premise currently decide, that the plan would change
without saying so?** The answer comes from §1(2)–(3) alone, which is why the premise note is worth
writing before anything is built.

A plan that names the behaviour it intends to change and is silent on the rest is not scoped yet.
That is far cheaper to find here than after the diff exists.
