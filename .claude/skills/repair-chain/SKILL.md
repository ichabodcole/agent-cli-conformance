---
name: repair-chain
description:
  Repair an existing defect without reproducing it in dependent code or prose, an independent
  implementation of the same rule, the repaired artifact, or an edit based on an unverified
  diagnosis. Use for substantive fixes to behavior, prose, measurements, tests, lints, or prior
  repairs. For typo, formatting, and isolated new-code changes that alter no existing behavior or
  meaning, skip this workflow's substantive steps, but still use Two Lens Review to determine
  whether an existing premise changed.
---

# Break the repair chain

A finding can define the edit and the check used to close it. That makes a locally correct repair
look complete while something outside the finding remains wrong. This skill separates those two
questions: did the repair close the verified defect, and what else became false or moved?

It produces a **repair record** under [Report](#report). A green gate without that record is not a
run of this skill.

## Vocabulary

- **finding** — the observed defect, distinct from anyone's explanation of its cause
- **premise** — the fact, rule, predicate, meaning, or measurement the repair changes; not its file
  or line
- **consumer** — code, a test, a lint, prose, an example, or another decision that reads the premise
- **intended move** — a before → after outcome written down before the repaired output is observed
- **dependent** — a consumer whose truth or behavior relies on the premise
- **home** — a place that independently implements or asserts the premise
- **same-class defect** — a new instance of the defect the repair exists to remove
- **limit** — a consumer or population the run could not safely or reliably observe; named, never
  silently treated as covered

## 0 · Decide whether this skill applies

Do not run the substantive repair-chain steps when the change is only a typo, formatting, a
mechanical rename with complete tooling, or new isolated code nothing consumes yet. A completed fix
still runs the paired initial classification in [`two-lens-review`](../two-lens-review/SKILL.md),
which pins the subject before deciding whether a premise changed. If the change alters what existing
code or prose means, or if you are unsure, continue with this workflow.

This workflow has two preparation scopes. Both end with parallel Two Lens Review before a repair can
be `clear to land`:

- **Bounded preparation:** one agent may diagnose, edit, and gather the verification evidence when
  the premise has a discoverable consumer set and its outcomes are observable.
- **Expanded preparation:** add semantic checks, topology checks, or another reader when the repair
  crosses surfaces or its diagnosis depends on judgements the repairer supplied. The conditions are
  in [Choose the preparation scope](#6--choose-the-preparation-scope).

State the execution mode too:

- **Implement:** diagnose, edit, and verify a new repair.
- **Review:** evaluate an existing diff or commit as the repaired artifact. Its output is already
  observable, so distinguish an inferred historical intent from a contract written for any new
  follow-up repair.
- **Plan:** investigate read-only and propose a repair. Mark edit-dependent checks `not run` with
  the missing artifact or authority; do not invent their results. A plan cannot be `clear to land`.

The repair-chain record controls a composite run. The linked skills supply instruments, not a
second verdict vocabulary:

- `cascade-check` supplies the pre-edit dependent inventory. This workflow carries its Cascade note
  into the contract and reuses it during seam verification.
- `two-lens-review` supplies the independent correctness and consequence reviews. Its output is
  evidence for this record, and cannot clear a run whose required sweep did not run or whose limit
  could still contain a decision-changing result.
- `prose-cold-read` supplies a reader who has the document and defect catalogue but no repair
  rationale or intended conclusion. In review or plan mode, triage its findings without applying
  them.

## 1 · Pin and challenge the finding

Do this before editing. Record a **finding card**:

```text
subject     : exact revision, diff, or artifact version examined
comparison  : exact parent, baseline, or prior artifact; none when there is no comparison
observed    : what happened, without a cause
expected    : what should have happened, and its source
reproduce   : command and output, or source passages, that establish the difference
diagnosis   : proposed cause
challenge   : competing explanation tested, and the result that rejects or preserves it
limits      : anything the reproduction did not range over
```

Separate observation from diagnosis even when the report presents them as one sentence. Inspect the
pinned subject rather than trusting a line number or count quoted elsewhere. For a current repair,
inspect the current tree. For a historical review, inspect the commit object and its comparison;
do not silently substitute a descendant checkout whose behavior may already differ.

If the observation does not reproduce, report that result and stop treating the proposed edit as a
repair. If the defect is real but the cause is not established, restate the finding without the
cause and continue only when the expected behavior still determines a repair. Do not edit merely to
make the original report read as closed.

For negative results and counts, print the population the check actually ranged over. An empty
search is evidence about that search, not about places it could not see.

## 2 · Predict affected consumers

Read [`cascade-check`](../cascade-check/SKILL.md) and run it before writing the initial contract; in
implement mode this is also before the first edit. Carry its Cascade note into the repair contract.
Record every applicable role beside each entry because finding a path does not establish its
relationship to the premise:

- **reads** — directly consumes the premise
- **derives** — computes another result or claim from it
- **asserts** — states the premise in a test, comment, example, lint, or document
- **relies** — uses the premise as a reason for another instruction or conclusion
- **duplicates** — independently implements the same rule
- **source only** — material consulted for the repair but not known to depend on it
- **near only** — mentions the subject but does not depend on the premise

A file listed as `source only` does not count as a predicted dependent if the later review finds
that it relied on the change.

Search through different handles because no one handle reaches the whole population:

1. **Symbol or declaration** — callers, readers, constructors, error types, fields, links, and
   imports.
2. **Mechanism** — the fact the finding rejects or changes, using terms from the verified finding
   rather than only the repairer's proposed wording.
3. **Consequence** — what that mechanism caused a caller or reader to observe.
4. **Structure** — inbound links, related-page entries, tests, lints, examples, generated output,
   comments, and deliberately duplicated declarations.

Read each hit. Literal search finds lexical carriers, not every semantic home or dependent.

Decide before editing:

- If one premise can serve every consumer, repair it once there.
- If several homes should agree and can read one executable premise, centralising the rule is part
  of the repair. If a boundary or independent-control contract requires separate homes, record that
  relationship, update each home, and verify the mechanism that keeps them synchronized.
- If the proposed change cannot preserve the required behavior of every consumer, it does not
  repair a shared premise. Record `wrong shape`, redesign it, and repeat this step instead of
  patching the reported location.

## 3 · Write the repair contract

Write one **premise note** per premise after completing the Cascade inventory and before observing
any repaired output. The set of premise notes is the **repair contract**:

```text
cascade     : the complete Cascade note from section 2, unchanged
premise     : the fact being changed
intended    : populations and exact before → after outcomes meant to move
held        : outcomes that must remain unchanged
limits      : additional consumers or populations not yet observable
```

Embed the complete Cascade note, including its `fact`, `dependents`, `decision`, `evidence`,
`warrants`, `controls`, and `limits`. Write `not applicable` rather than silently omitting a field.
The `intended` and `held` entries are immutable for this repair round. If the proposed behavior
changes, begin a new round with a new contract. Never reclassify an observed move as intended after
seeing it. Otherwise, any regression can be retrospectively classified as intended.

In review mode, the supplied diff predates this run. Label any reconstructed intent **inferred**;
do not present it as a written-before-edit contract. That inference may explain the existing diff,
but it cannot pre-authorise a follow-up edit. Write a fresh immutable contract before making one.
A pinned issue, plan, or premise note written before the supplied diff may serve as its historical
contract. Without one, review mode may find defects but cannot return `clear to land`; use `evidence
incomplete` when no reproduced defect remains.

## 4 · Make the repair

Repair the premise, not the symptom string or the first place the defect was reported. Preserve the
contract's held outcomes.

For every new statement of behavior, count, classification, or cause, record the source that
warrants it. If the evidence does not support a replacement claim, omit it or report that the repair
cannot honestly supply one. A required document slot is not evidence for a sentence.

Keep unrelated defects out of the edit, but report them. A scope boundary may prevent editing a
dependent; it does not turn that dependent into a non-finding.

## 5 · Verify through independent questions

Run every applicable check below. They ask different questions and do not substitute for one
another.

In review or plan mode, retain every check in the repair record. Record `not applicable` only when
the question truly has no bearing on the premise, and `not run` when it would require an edit,
repaired artifact, execution authority, or fixture that the run does not have. Give the reason and
the evidence that remains; absence of an edit does not erase a check from the record.

### A. Target correctness

- Re-run the original reproduction against the repaired artifact.
- Attack the repaired predicate or statement at its boundaries and across every branch that can
  reach the changed outcome.
- For a regression test or lint, retain the new witness assertion, revert only the implementation
  premise in a disposable artifact, and prove the witness fails. A witness seen only with its fix
  present has not shown that it checks the fix.
- Exercise the real topology when the fixture changes a relevant condition such as working
  directory, launcher, pipe, symlink, cache, shell, or process lifetime.

### B. Before/after sweep

Build behavioral and semantic populations from the consumers and independent homes in the premise
note before adding existing fixtures; an existing fixture directory is not evidence that every
consumer is represented.

When behavior is observable, run the same population against the comparison and repaired artifacts
and compare stable output. For prose, comments, plans, and other assertions, evaluate each assertion
against the premise's comparison meaning and repaired meaning. An unchanged sentence that became
false is a moved semantic row even though its bytes did not move. Run every interface and output
form the consumer supports, such as command modes, machine-readable and human-readable output,
configuration paths, or public return values. Semantic reasoning does not replace an available
behavioral comparison.

For each moved row, report:

```text
input or assertion | before | after | explanation | intended or unintended
```

Normalise timestamps, absolute scratch paths, and other proven noise. Do not normalise wording,
ordering, or fields whose movement could be the regression. An explained move remains a defect
unless the repair contract marked it intended.

If behavior cannot be swept, state that as a limit and continue with the semantic and other
applicable checks. Do not invent a behavioral result from reading the diff.

### C. Same-class audit

Check whether the repair introduces another instance of the original defect:

- An overclaim repair: inspect every new quantifier, connective, definite description, and scope.
- A missing-home repair: repeat the home and dependent search from the new premise.
- A measurement repair: rerun each new or carried measurement under its stated coordinates.
- A classification repair: recompute membership in the named population, not only the count.
- A guard repair: enumerate what the guard now suppresses besides the target.
- A test or lint repair: use a defect-restored specimen the instrument must reject and a
  non-defective specimen it must accept.

Ask plainly: **would the rule that justified this work reject anything the repair just authored?**

### D. Near seam

For every diff hunk, read the smallest enclosing branch, function, paragraph, or comment that
establishes the hunk's meaning. Then inspect anything it cites and anything immediately citing it.
Ask of unchanged material: **is this still true now that the edit exists?**

### E. Far seam

Repeat the mechanism, consequence, and structural searches over the repaired tree. Inspect hits
outside the touched files as possible assertions or warrants. Compare the result with the pre-edit
inventory and label each discovered dependent `predicted` or `off-list` according to its recorded
role.

In review mode, build that inventory from the comparison artifact before inspecting the candidate
where possible. If this run had already inspected the candidate, call the inventory `inferred` and
label the far-seam result `listed` or `newly discovered`; do not backdate it into a prediction.

### F. Repository gate

Run `bun run check` after the semantic and behavioral checks. The gate is required and is not a
substitute for them.

## 6 · Choose the preparation scope

In implement mode, choose the preparation scope before editing. In review mode, choose it before
making any follow-up edit. This keeps the required work independent of whether the result looks
convincing. After the repair and its verification produce a candidate and completed sweep, pin the
review subject, record the sweep, and do not change either while reviewers work. In review mode, the
supplied diff is the candidate. In plan mode, pin the plan artifact and dispatch both reviewers
against it; give the semantic sweep rows only to Reviewer B. Record only behavioral and other
genuinely candidate-dependent checks as `not run`.

Bounded preparation is sufficient only while the work remains observable and mechanically
discriminable. Expand it with the relevant semantic, topology, or additional reader checks when any
of these conditions holds:

- the premise crosses code, tests, documentation, commands, or other independently maintained
  surfaces
- more than one home implements or asserts the rule
- the repair adds behavioral prose, a count, a causal account, or a general claim
- the diagnosis depends on an absence, inferred population, classification, or moving artifact
- the change adds or changes a test, lint, gate, verifier, or control specimen
- fixture topology differs materially from actual use
- the work repairs a previous repair or the same class has survived an earlier review
- the consumer set cannot be made complete by symbol and structural search
- a reviewer must supply the semantic judgement that decides whether the replacement is true

If none holds, one agent may complete the bounded preparation using the written-before-edit
contract, every applicable defect-restored and non-defective control, the sweep, the same-class
audit, and the seam checks. Record inapplicable and unrun checks as section 5 requires. Bounded
preparation does not waive the two independent lenses that decide whether the candidate is clear.

### Parallel two-lens review

Run [`two-lens-review`](../two-lens-review/SKILL.md) for every completed fix. Its paired initial
classification can return the reduced report for a proven no-premise change. For every repair that
changes or may change an existing premise, dispatch its correctness and consequence reviewers
together against the same immutable candidate or plan artifact so each holds one question. Give its
consequence reviewer (Reviewer B) the complete sweep rows, not a summary.

### Cold prose review

After substantial documentation repair, read and run
[`prose-cold-read`](../prose-cold-read/SKILL.md). Its reader receives the document and defect
catalogue only, without the finding, repair rationale, or intended conclusion. Missing context is
the instrument; a consequence reviewer already briefed on the repair is not cold.

If the required independent reviewer is unavailable, complete the checks that remain possible and
report `independent review not run` as a limit. Do not describe the result as independently clear.

## 7 · Reproduce and adjudicate each finding

Wait for all dispatched reviews before editing again so every reviewer examines the same unchanged
artifact. Reproduce each reviewer finding before repairing it; a reader can correctly locate a
suspicious passage and still misstate its cause or population.

Every accepted reviewer finding starts a new repair round:

1. Update the finding card with the reproduced observation.
2. Refresh the Cascade note for the proposed repair. Repeat its inventory for every new or changed
   premise or repair shape; carry forward unchanged entries with their evidence.
3. Write a new immutable repair contract from that note.
4. Make the repair, then materialise and identify a new immutable candidate.
5. Re-run the candidate side of the entire before/after sweep; the comparison output may be reused
   if the comparison artifact is unchanged.
6. Repeat the same-class and seam checks.
7. Re-run both review lenses and every other independent review whose question the new repair can
   affect.

Continue while reviews return reproducible defects. Preferences and alternative wordings that do
not identify a false claim or unintended behavior do not keep the round open.

If the same reproduced defect returns after its repair, or evidence shows that the premise has no
defined stable behavior, stop treating the work as another local edit. Report that the repair shape
or premise needs redesign and ask the user to decide when the alternatives materially change the
product. A different defect near an earlier repair begins another evidenced round; proximity alone
does not establish redesign.

## Report

Return one repair record:

```text
verdict
  clear to land | defects to repair | evidence incomplete | needs redesign | blocked

finding card
  subject, comparison, observed, expected, reproduction, diagnosis, challenge, limits

repair contract
  complete Cascade note: fact, dependents, decision, evidence, warrants, controls, limits
  premise, intended moves, held outcomes, additional limits

verification
  target reproduction and edge cases
  defect-restored reject and non-defective accept results
  before/after moved rows and dispositions
  same-class audit
  near-seam result
  far-seam result, including predicted/off-list dependents or review-mode listed/newly discovered
  repository gate

independent review
  execution mode and preparation scope
  Two Lens subject kind and authority
  Reviewer A result and evidence
  Reviewer B result and evidence
  independent reviewers or separated simulation
  lens findings, reproductions, dispositions, or named limits

remaining limits
  every consumer or population not established
```

Apply the first verdict whose condition fits:

1. Use `blocked` only when the repair cannot be meaningfully evaluated at all.
2. Use `needs redesign` when evidence shows that local repairs are iterating the design rather than
   converging on an already defined behavior.
3. Use `defects to repair` when the candidate still contains any other reproduced defect or accepted
   review finding. A plan that confirms a defect and proposes but does not implement its repair also
   uses this verdict; work remains, but the plan has not necessarily failed.
4. Use `evidence incomplete` when meaningful checks ran but a required observation, baseline, or
   independent review is unavailable and could change the decision.
5. Use `clear to land` only when the original finding is repaired, every observed move was
   predeclared as intended, no reproduced finding remains, required independent review completed,
   and limits are stated. A limit may remain only when evidence shows it cannot change the verdict.
