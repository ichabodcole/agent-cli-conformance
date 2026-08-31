---
name: two-lens-review
description:
  Assign one reviewer to test whether a fix works on its targeted inputs and another to identify
  every other outcome affected by the condition it changes. Use before landing any fix, for a plan
  that would change existing behavior or meaning, or when asked whether a fix is safe or what it
  might break. If a fix changes no existing behavior or meaning, reviewers only verify that the
  change is mechanical, behavior-preserving, and corrects its intended target.
---

# How to review a change through two lenses

Assign these questions to different reviewers:

- **Is the fix correct?** — on the inputs it targets.
- **What else did the thing it changed use to decide?**

The second gets skipped because the first is about the bug and the second is about everything else.
A changed guard can suppress outcomes beyond the target of the fix; those changes ship as
regressions unless the second lens ranges over them. Run both lenses **at the same time** — running
them one after the other is how the second kind of defect surfaces only after the first fix has
already landed.

Every run of this skill must end with a **review report** (§5).

**Vocabulary**, used precisely throughout:

| term            | means                                                                                                                                                                                        |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **premise**     | the thing the change altered that something else consults — a guard, predicate, default, applicability test, invariant, or meaning. In a plan, an assumption the plan relies on. Not a file. |
| **consumer**    | any code path, test, comment, example, plan, or document that reads the premise                                                                                                              |
| **home**        | a declaration, implementation, or assertion that independently carries the premise without reading the changed one                                                                           |
| **population**  | inputs that reach a consumer through the same branch, or assertions and homes governed by the same clause, so one observation can represent the set                                          |
| **lens**        | one of the two questions above, and the reviewer assigned to it                                                                                                                              |
| **the sweep**   | the before/after behavioral comparison and semantic assertion check built in §2                                                                                                              |
| **round**       | one immutable review subject, its premise note and sweep, and the paired A/B dispatch and findings                                                                                           |
| **witness**     | a test, lint assertion, or other instrument kept in place while the implementation premise is reverted to prove that it detects the defect                                                   |
| **moved**       | an input whose output, or an assertion whose truth, differs between the two artifacts                                                                                                        |
| **explained**   | you can say why it moved                                                                                                                                                                     |
| **intended**    | the change was _meant_ to move it, per §1(3)                                                                                                                                                 |
| **outstanding** | a reproduced defect, unintended move, or other resolvable finding not yet repaired                                                                                                           |
| **limit**       | something the review could not look at — a consumer the corpus could not reach, a population with no input, a path too destructive to sweep. Reported, never silently dropped                |

> **⚠ Explaining a row does not clear it.** This method looks for regressions: moved outputs or
> meanings that you can account for but did not intend. The worked example in §2 is exactly that
> case. `explained` is how you learn whether a move was `intended`; only `intended` clears it.
> And §1(3) is written BEFORE the sweep and never revised after it — deciding a move was intended
> once you have seen it clears every row you are willing to argue for, which is no test at all.

**The verdicts.** They describe the state at the end of the run, not its history — a run that found
defects and repaired them all can end `clear to land`:

| verdict               | means                                                                                                                       |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `clear to land`       | both independent lenses ran; every behavioral and semantic move was intended; no decision-critical limit or finding remains |
| `defects to repair`   | a candidate contains a reproduced defect or outstanding finding, or a plan with sound behavior remains unimplemented        |
| `evidence incomplete` | meaningful checks ran, but a missing baseline, population, sweep, or independent lens could still change the decision       |
| `needs redesign`      | evidence shows the premise or repair shape is being chosen through review rather than checked against defined behavior      |
| `blocked`             | the review could not be meaningfully performed **at all**; not a synonym for "do not land"                                  |

Apply the first verdict whose condition fits: `blocked` when no meaningful evaluation ran; `needs
redesign` when recurrence or undefined stable behavior meets its table definition; `defects to
repair` for any other reproduced defect or outstanding finding; then `evidence incomplete` when
missing evidence could change an otherwise undecided result. Use `clear to land` only when its
positive conditions in the table all hold.

---

## 0 · Before you start

Every run begins by recording three things: **subject kind, comparison, and authority**. Subject
kind is `current candidate`, `historical candidate`, or `plan`; authority is `implementation` or
`read-only`. Subject kind and authority are the two classification axes. Record the comparison
separately. A plan has no executable candidate output. A historical candidate pins two commit
objects.

Pin the subject before deciding whether a premise changed, and keep it immutable until adjudication
ends. If current work is already committed, pin the candidate commit and merge base. For an
uncommitted candidate, snapshot both the candidate and the repository state read by its checks. For
an uncommitted plan, snapshot the plan and the current artifacts its semantic sweep reads.
Materialise that exact state in a disposable directory or worktree without committing or changing
the user's working tree. Make the snapshot read-only, or record a content-manifest digest
immediately before review and verify the same digest before returning the verdict. Give reviewers
that snapshot rather than the mutable tree. If no safe snapshot is available but other evidence
remains usable, the review is `evidence incomplete`; use `blocked` only when no meaningful
evaluation remains possible. Any temporary checkout must have an explicit path, contain no sole
copy of user work, and remain in place until the verdict is decided.

Authority decides what checks the run may add. Implementation authority may create disposable
drivers, install dependencies, and perform witness reverts. Prepare dependencies before pinning the
subject; if generated dependency directories are excluded from a content manifest, name those
exclusions. Read-only authority may inspect and run existing artifacts and may write their runtime
output outside the pinned subject, but it authors no driver, dependency, or implementation change.
Report a build that needs such a write as a limit.

**If the pinned change appears to alter no premise** — a typo, formatting, mechanical rename with
complete tooling, or a pure refactor — dispatch both reviewers together for a reduced
classification. A checks that the change is mechanical and behavior-preserving. B searches for any
changed outcome, assertion, or consumer relationship without reading A's result. A also verifies the
intended correction itself: the typo is corrected to the sourced spelling, formatting matches its
named rule, or the mechanical transformation reached the intended target. Give `clear to land` only
when both independently report no changed premise, A establishes the target correction, their
evidence covers the candidate, and no decision-critical limit remains. The reduced report contains
the subject, comparison, authority, both classification results and evidence, target-correction
evidence, and limits; mark only the premise note and sweep `not applicable`. Verify the subject's
identity before returning. If either reviewer finds or cannot exclude a changed premise, continue
with the full workflow below. If you are unsure before dispatch whether something counts, it counts.

A premise-changing review also needs two things:

- **Ways to observe each consumer.** For behavior this is usually exit codes and stdout; it may be a
  rendered view, stored record, written file, or public return value. For prose, comments, and plans,
  it is whether each assertion remains true under the changed premise. If some consumers cannot be
  observed, inspect the rest and record them as limits. A missing observation is
  `evidence incomplete` when it could change the decision; use `blocked` only when nothing can be
  meaningfully evaluated.
- **Reviewers who did not design the change.** Someone who shaped it can still test it, but cannot be
  the last word on whether it is sound — by the time a design has been through a round or two, the
  best-informed reviewer and the most invested one are the same person. Fresh subagents satisfy
  this. If you wrote the change yourself, say so in the report: you are the orchestrator here, not a
  third reviewer.

Only a current or historical candidate with both independent lenses and every decision-relevant
population observed or bounded can be `clear to land`. A plan cannot receive that verdict. A
read-only run may clear an immutable candidate only when its required evidence already exists and
can be inspected without writes.

## 1 · Write the premise note

Reviewers told only to "review this diff" inspect the diff, so the second reviewer does not
investigate consumers outside it. Write the note first; both reviewers get it verbatim.

For each premise the change alters, record one entry for each field:

1. **What changed** — the guard, predicate, default, applicability test, invariant, or meaning. Not
   the file.
2. **Who reads or independently carries it** — search the symbol or declaration first, then the
   mechanism it embodies, the consequence it causes, and structural carriers such as tests, lints,
   examples, comments, links, and duplicated declarations. Record each as a consumer or home at the
   passage or declaration level rather than classifying whole files.
3. **What it decides** — for each consumer and home, the outcomes or assertions it can produce, and
   which of those this change is meant to move. This is what `intended` means later; everything else
   that moves is a finding.

**If the change alters several premises**, write one note per premise and put them all in front of
the same two reviewers.

**If a premise has no internal consumers or homes**, decide which claim the evidence supports: dead
code, an external/public consumer outside the repository, or an incomplete search. The second and
third are limits, not clean passes. Do not turn an empty search into a dead-code finding without
establishing the population it ranged over.

**If you cannot answer §1(3) for some consumer**, record it, tell both reviewers it is unanalysed,
and carry on. Treat it as a limit until it is analysed. Use `evidence incomplete` when it could
change the decision. Report `blocked` only if you cannot answer §1(3) for _any_ consumer, because
then nobody knows what the change decides at all and two reviews of an unknown are two opinions.

For any already-written candidate, a pinned issue, plan, or premise note written before the change
may supply intended moves. Otherwise label reconstructed intent **inferred**. It can explain the
diff but cannot satisfy the written-before-sweep condition for `clear to land`.

## 2 · Build the sweep, yourself

Build it **before** dispatching, and build it yourself. Otherwise a reviewer must evaluate an
instrument it created, and having both reviewers build it duplicates the same work. Reviewer B
receives the output, not the job. In read-only mode, use an existing instrument or record the
unavailable part as `not run`; do not derive its result from the diff.

The sweep has two forms, selected per consumer:

- **Behavioral:** run observable output over a consumer-derived corpus on both artifacts and diff
  it. Every moved input needs an explanation, and every explanation ends in `intended` or remains
  outstanding.
- **Semantic:** for prose, comments, plans, and other assertions, list each consumer and independent
  home and evaluate its assertion against both meanings. An unchanged sentence that became false is
  a moved meaning even though its bytes did not move.

Use one row shape for both:

```text
input or assertion | before | after | explanation | intended or unintended
```

Do not replace an unavailable behavioral sweep with semantic reasoning. Run every form the consumer
supports and name what remains unobserved.

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
  limits.
- **If the comparison tree will not build or needs different dependencies**, install them in that
  worktree; the two trees are independent checkouts. If it genuinely cannot be built there is no
  behavioral baseline — but Reviewer A and semantic consumers may still be observable, so run what
  remains. The missing sweep makes the verdict `evidence incomplete` when it could contain a
  decision-changing move. `blocked` is only for a change nothing can meaningfully evaluate.

### How to build the corpus

Build it from §1(2) rather than from what is lying around:

1. For each consumer, split its inputs into populations — two inputs are the same population only if
   you can name the branch, guard or clause that makes them take the same path through that
   consumer. A shared shape is not a path: "both are files" does not put two inputs in one
   population. If you cannot name it, they are different populations. The split is what decides how
   much the sweep actually looks at, and a coarse one produces a confident, near-empty result — one
   population per consumer means the sweep tests the consumer, not the premise inside it.
2. Name at least one input per population.
3. If you cannot name one for some population, record that consumer as a **limit**, naming the
   population that is missing. A limit is not automatically a defect. Decide whether evidence bounds
   it away from the landing decision: if it could still contain an unintended move, the verdict is
   `evidence incomplete`; if it cannot, state why and retain it as a non-blocking limit. What it must
   never be is unrecorded.
4. Only then add whatever existing fixtures also happen to serve that list.

> **⚠ This review is most likely to fail when you call an existing fixtures directory the corpus.**
> It satisfies the word "corpus" without satisfying the requirement, produces a
> confident `3 of 40 moved`, and is silent about exactly the consumers nobody thought to write a
> fixture for. Build the list from the consumers, then see which fixtures serve it.

> **⚠ Run both trees. Do not read the diff and derive what the base would have produced.** Deriving
> is reasoning, and the point of a sweep is an answer that does not depend on your reading of the
> code — which is the reading that produced the change. Use `git worktree` at the merge base rather
> than stashing, so both trees stay runnable while reviewers work.

> **⚠ Running the test suite on both trees is not a sweep.** The suite asserts what someone already
> thought to assert; the sweep asks what actually changed. A green suite on both sides is compatible
> with a silently altered result on every input nobody wrote a test for — which is the defect class
> this method exists to catch. Do not omit or narrow the sweep because building it is expensive.

**Normalise before diffing** — timestamps, absolute paths, durations. Unnormalised output moves every
row, making changes caused by the premise difficult to distinguish from incidental differences.
**Normalise no further than that**: sorting output to remove "nondeterministic ordering" erases a
real move whenever the ordering _is_ the regression, and rewriting messages erases the wording
changes B is there to account for.

### Worked example

Premise: a validator gained a guard so it stops rejecting inputs whose encoding it cannot confirm.

```
§1  changed  : reject() gated on encodingConfirmed()
    consumers: validate() [3 branches], importFile(), 2 test files
    decides  : reject|accept|defer — INTENDED: reject→defer, for unconfirmed encoding only
§2  populations: validate/confirmed, validate/unconfirmed, validate/oversize,
                 importFile/confirmed, importFile/unconfirmed  → 22 inputs
    limits     : importFile/unconfirmed — no input reaches it; writes to disk, not sandboxed
    output     : exit code + verdict line per input
    moved      : 7 of 22
             5  reject→defer   intended
             1  reject→accept  explained, NOT intended — the guard sits above the size check
             1  accept→accept  explained, NOT intended — message wording changed
verdict: defects to repair (2 unintended moves; also record the decision-critical unsandboxed limit)
```

The `reject→accept` and `accept→accept` rows are the findings. The first is **explained** — "the
guard sits above the size check" is a complete account of why it moved — but was never intended.
The second changes wording without changing status and was not intended either. Both are invisible
in the diff and to a passing test suite.

## 3 · Dispatch both reviewers together

In a single dispatch, so neither waits on the other. Give both the premise note from §1, the subject
and comparison, and these standing constraints:

- **Use the pinned artifacts without mutating the review subject or shared working tree.** With
  implementation authority, give each reviewer a separate disposable worktree when its check
  requires edits; an editable witness artifact is never the immutable reviewed snapshot. With
  read-only authority, prohibit edits and require unavailable revert or driver checks to be
  reported as limits.
- **Return findings with the command and output that produced or confirmed them.** A claim that no
  command, check, or source passage supports is a hypothesis.

**Reviewer A — is the fix correct?**

> Does it hold on the inputs it targets? Test boundary inputs for the predicate instead of inferring
> behavior from its name. Exercise every branch that can reach the changed outcome, not only the
> branch where the symptom was reported. When the change adds or alters a witness assertion, leave that assertion in place,
> revert only the implementation premise in a disposable worktree, and confirm the witness fails. If
> no witness exists or read-only mode prevents the revert, report that exact limit rather than
> reasoning about the result.

**A does not get the sweep.** If A receives the moved rows, it may limit its investigation to those
rows and review B's evidence instead of testing the predicate independently. Withhold the sweep so A
still searches for branches the corpus did not reach.

**Reviewer B — what else moved?** Give B the sweep's **rows**, not a summary of them: summarising is
you deciding in advance which rows matter, which is B's job and the reason B exists. Brief B in these
words because otherwise B may answer A's question, leaving both reviewers to assess correctness and
nobody to assess what else moved:

> **Do not evaluate whether the fix is correct. Assume it is.** Your question is only: what did this
> premise previously decide that it no longer decides? Here is the sweep output from §2. Account for
> every behavioral or semantic row that moved, say for each whether the premise note marks it
> intended, inspect unchanged assertions that may have become false, and name any population the
> sweep does not cover. Do not revise the premise note to make a move intended.

If two independent reviewers are unavailable, use one fresh reviewer in two isolated invocations.
Do not give the consequence invocation the correctness result or its conversation context. Label
that a **separated simulation**. It can produce findings, but the lost independence is
decision-critical and the run cannot return `clear to land`.

**If A and B contradict each other**, neither wins by seniority. Reproduce both claims yourself, and
report what you ran.

## 4 · Triage what comes back

**Wait for both lens reports before repairing.** A repair mutates the tree a reviewer may still be running
against, and silently invalidates whatever it reports afterwards. If you must move early, repair in a
worktree of your own and leave the shared tree alone.

- **Reproduce before repairing.** Run the reporting reviewer's own command first. Reviewers are
  confidently wrong often enough that repairing an unreproduced finding wastes a round in both
  directions.
- **Begin a new round before every accepted repair.** Write a new premise note with the reproduced
  finding, the exact outcomes this repair intends to move, the outcomes it must hold, and its limits.
  Do not add intent to the note from the round that discovered the move.
- **Repair at the premise.** Centralise only the executable decision consumers are meant to share;
  do not paste it at each search hit. A consumer with a different contract requires a different
  premise: record that boundary and verify each premise separately.
- **Re-run the whole sweep after every repair**, not the rows you judge related — the repair is a
  change like any other and gets the same treatment, and judging which rows it could have touched is
  the reading the sweep exists to replace. This is the largest cost in the method: one full sweep per
  repair, not one per run. The comparison artifact is unchanged, so its outputs can be reused;
  re-run the candidate. Report how many inputs you re-ran.
- **Re-dispatch both reviewers, not only the one who raised it.** The repair changed the tree and
  invalidated the previous sweep. Materialise and identify the new immutable candidate, then send
  both reviewers the new round's premise note. B is the only lens that reads sweep rows; sending back
  to A alone leaves the new rows unread. Tell both to assume the repair introduced something new
  rather than only that it fixed something old.

**Keep going while rounds return reproducible defects. Stop when reviewers propose only
preferences** — alternatives for which they can demonstrate no false claim, unintended move, or
failed requirement.
When the distinction is unclear, ask the reviewer for the command, output, or source passage that
would make the claim falsifiable before changing the candidate. Report the rounds and their evidence.

**Use `needs redesign` and tell the human if the same reproduced defect returns after its repair, or
if findings show that the premise itself has no defined stable behavior.** Reproduce and classify a
new defect merely near an earlier repair; proximity alone does not prove the design is being iterated
through review.

## 5 · Report

Return the report in the message that ends the run unless the user requested a file. This is the
deliverable the human uses to decide whether the candidate lands. Remove only disposable worktrees
this run created, after resolving their exact paths and confirming they contain no user work. Never
clean up the candidate or the user's working tree as review housekeeping.

- **Subject, comparison, authority, and verdict** — current candidate, historical candidate, or
  plan; the exact comparison identifier or path; implementation or read-only; then `clear to land`,
  `defects to repair`, `evidence incomplete`, `needs redesign`, or `blocked`.
- **The premise note** from §1.
- **The lens results** — Reviewer A's result and evidence, Reviewer B's result and evidence, and
  whether they were independent reviewers or a separated simulation.
- **The sweep** — behavioral and semantic populations, the number of rounds, and every moved input
  or assertion with its explanation and whether it was intended. Unintended and unexplained ones
  first. Name each part that did not run and why.
- **Limits** — every limit encountered, including unanalysed or unreachable consumers, populations
  with no input, unsafe or unobservable sweeps, unavailable baselines or instruments, witness
  reverts that could not run, and a missing independent lens. For each, say whether evidence shows
  it cannot change the decision or whether it makes the verdict `evidence incomplete`.
- **Findings**, each with the command and output that confirmed it, and what was done about it.
- **This skill** — any step that misfired, was ambiguous, did not apply, or was missing. Propose the
  change; do not work around it silently and do not edit this file unprompted. These observations can
  reveal defects in the skill itself.

## Reviewing a plan instead of a diff

Same two lenses, no code, and the one case exempt from §0's requirement that the system be
observable. The behavioral sweep cannot run: say so rather than forcing a substitute. Build the
semantic assertion sweep from the plan and its current consumers.

Reviewer B's question becomes: **what does this premise currently decide, that the plan would change
without saying so?** The answer comes from §1(2)–(3) alone, which is why the premise note is worth
writing before anything is built.

A plan that names the behavior it intends to change and is silent on the rest is not scoped yet.

A plan cannot be `clear to land`: there is no candidate to land. Use `defects to repair` when the
planned behavior satisfies the known consumers but remains to be implemented, `needs redesign` when
its premises cannot satisfy their consumers, and `evidence incomplete` when missing current-state
evidence prevents either decision.
