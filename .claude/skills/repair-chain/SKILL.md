---
name: repair-chain
description:
  Repair an existing defect without carrying it into a dependent, another home, the replacement,
  or a diagnosis-driven edit. Use for substantive fixes to behavior, prose, measurements, tests,
  lints, or prior repairs. Skip typo, formatting, and isolated new-code changes that alter no
  existing premise.
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

Skip it when the change is only a typo, formatting, a mechanical rename with complete tooling, or
new isolated code nothing consumes yet. If the change alters what existing code or prose means, or
if you are unsure, use it.

This workflow has two routes:

- **Bounded route:** one agent may complete the work when the premise has a discoverable consumer
  set, behavior is observable, and the repair adds no broad behavioral claim or enforcement
  instrument.
- **Independent route:** add a fresh reviewer when the change crosses surfaces, depends on semantic
  judgement, or has a history that makes the repairer's frame part of the risk. The conditions are
  in [Choose the review route](#6--choose-the-review-route).

State the execution mode too:

- **Implement:** diagnose, edit, and verify a new repair.
- **Review:** evaluate an existing diff or commit as the repaired artifact. Its output is already
  observable, so distinguish an inferred historical intent from a contract written for any new
  follow-up repair.
- **Plan:** investigate read-only and propose a repair. Mark edit-dependent checks `not run` with
  the missing artifact or authority; do not invent their results. A plan cannot be `clear to land`.

The repair-chain record controls a composite run. The linked skills supply instruments, not a
second verdict vocabulary:

- `cascade-check` supplies the pre-edit dependent inventory; the roles, search handles, and report
  requirements below extend it.
- `two-lens-review` supplies the independent correctness and consequence reviews. Its output is
  evidence for this record, and cannot clear a run whose required sweep did not run or whose limit
  could still contain a decision-changing result.
- `prose-cold-read` supplies a context-free reader. In review or plan mode, triage its findings
  without applying them.

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

## 2 · Write the repair contract

Before observing any repaired output, write one **premise note** per premise:

```text
premise     : the fact being changed
consumers   : who reads, derives from, asserts, relies on, or independently implements it
intended    : populations and exact before → after outcomes meant to move
held        : outcomes that must remain unchanged
limits      : consumers or populations not yet observable
```

The `intended` and `held` entries are immutable for this repair round. If the proposed behavior
changes, begin a new round with a new contract. Never reclassify an observed move as intended after
seeing it; that makes every regression pass by explanation.

In review mode, the supplied diff predates this run. Label any reconstructed intent **inferred**;
do not present it as a written-before-edit contract. That inference may explain the existing diff,
but it cannot pre-authorise a follow-up edit. Write a fresh immutable contract before making one.
A pinned issue, plan, or premise note written before the supplied diff may serve as its historical
contract. Without one, review mode may find defects but cannot return `clear to land`; use `evidence
incomplete` when no reproduced defect remains.

## 3 · Predict the blast radius

Read [`cascade-check`](../cascade-check/SKILL.md) and run it before the first edit. Extend its
inventory with roles so that finding a path does not masquerade as finding its relationship:

- **reads** — directly consumes the premise
- **derives** — computes another result or claim from it
- **asserts** — states the premise in a test, comment, example, lint, or document
- **relies** — uses the premise as a reason for another instruction or conclusion
- **duplicates** — independently implements the same rule
- **source only** — material consulted for the repair but not known to depend on it
- **near only** — mentions the subject but does not depend on the premise

Record the role beside every inventory entry. A file listed as `source only` does not count as a
predicted dependent if the later review finds that it relied on the change.

Search through different handles because no one handle reaches the whole population:

1. **Symbol or declaration** — callers, readers, constructors, error types, fields, links, and
   imports.
2. **Mechanism** — the fact the finding dethrones, using terms from the verified finding rather than
   only the writer's proposed wording.
3. **Consequence** — what that mechanism caused a caller or reader to observe.
4. **Structure** — inbound links, related-page entries, tests, lints, examples, generated output,
   comments, and deliberately duplicated declarations.

Read each hit. Literal search finds lexical carriers, not every semantic home or dependent.

Decide before editing:

- If one premise can serve every consumer, repair it once there.
- If several homes should agree but share no premise, centralising the rule is part of the repair.
- If the consumers cannot all satisfy the proposed change, the fix is the wrong shape. Redesign it
  and repeat this step instead of patching the reported location.

## 4 · Make the repair

Repair the premise, not the symptom string or the first place the defect was reported. Preserve the
contract's held outcomes.

For every new behavioral sentence, count, classification, or causal explanation, record the source
that warrants it. If the evidence does not support a replacement claim, omit it or report that the
repair cannot honestly supply one. A required document slot is not evidence for a sentence.

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
- For a regression test or lint, remove or disable the essential repair and prove the new instrument
  fails. A test seen only with its fix present has not shown that it checks the fix.
- Exercise the real topology when the fixture changes a relevant condition such as working
  directory, launcher, pipe, symlink, cache, shell, or process lifetime.

### B. Before/after sweep

When behavior is observable, run the same population against the base and repaired artifacts and
compare stable output. Build the population from the consumers in the premise note before adding
existing fixtures; an existing fixture directory is not evidence that every consumer is represented.

For each moved row, report:

```text
input/population | before | after | explanation | intended or unintended
```

Normalise timestamps, absolute scratch paths, and other proven noise. Do not normalise wording,
ordering, or fields whose movement could be the regression. An explained move remains a defect
unless the repair contract marked it intended.

If behavior cannot be swept, state that as a limit and compensate with the remaining checks. Do not
invent a behavioral result from reading the diff.

### C. Same-class audit

Turn the original defect around onto the repair:

- An overclaim repair: inspect every new quantifier, connective, definite description, and scope.
- A missing-home repair: repeat the home and dependent search from the new premise.
- A measurement repair: rerun each new or carried measurement under its stated coordinates.
- A classification repair: recompute membership in the named population, not only the count.
- A guard repair: enumerate what the guard now suppresses besides the target.
- A test or lint repair: use a positive control that carries the defect and a negative control that
  does not.

Ask plainly: **would the rule that justified this work reject anything the repair just authored?**

### D. Near seam

For every diff hunk, read one meaningful unit outward: the enclosing branch, function, paragraph,
or comment; anything the hunk cites; and anything immediately citing it. Ask of unchanged material:
**is this still true now that the edit exists?**

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

## 6 · Choose the review route

Choose the route before editing so the need for independence does not depend on whether the result
looks convincing. Dispatch diff-based reviewers after a candidate diff and its sweep exist. In
review mode, the supplied diff is the candidate; in plan mode, select and brief the future route but
record the review itself as `not run` unless an existing artifact can be evaluated.

The bounded route is sufficient only while the work remains observable and mechanically
discriminable. Use an independent route when any of these conditions holds:

- the premise crosses code, tests, documentation, commands, or other independently maintained
  surfaces
- more than one home implements or asserts the rule
- the repair adds behavioral prose, a count, a causal account, or a general claim
- the diagnosis depends on an absence, inferred population, classification, or moving artifact
- the change adds or changes a test, lint, gate, verifier, or positive control
- fixture topology differs materially from actual use
- the work repairs a previous repair or the same class has survived an earlier review
- the consumer set cannot be made complete by symbol and structural search
- a reviewer must supply the semantic judgement that decides whether the replacement is true

If none holds, one agent may finish the bounded route using the written-before-edit contract,
every applicable negative control and sweep, the same-class audit, and the seam checks. Record
inapplicable and unrun checks as section 5 requires. This is still a full run; “single agent” does
not mean “read the diff twice.”

### Independent consequence review

For a distributed but otherwise bounded repair, give one fresh reviewer the base, diff, finding
card, premise note, full moved rows, and limits. Brief it:

> Assume the reported defect is repaired. Ask only what became false, unsupported, or unexpectedly
> different because this premise changed. Account for every moved row against the repair contract,
> inspect near and far seams, and name populations the supplied checks did not cover. Do not revise
> the contract to make a move intended. Return findings with the command, output, or source passage
> that establishes each one. Do not edit.

### Parallel two-lens review

For changes that alter a shared premise, introduce an enforcement instrument, repair a repair, or
leave meaningful populations unobserved, read and run
[`two-lens-review`](../two-lens-review/SKILL.md). Dispatch its correctness and consequence reviewers
together so each holds one question. Give its Reviewer B the complete sweep rows, not a summary.

### Cold prose review

After substantial documentation repair, read and run
[`prose-cold-read`](../prose-cold-read/SKILL.md). Its reader receives the document and catalogue
brief only, without the finding, repair rationale, or intended conclusion. Missing context is the
instrument; a consequence reviewer already briefed on the repair is not cold.

If the required independent reviewer is unavailable, complete the checks that remain possible and
report `independent review not run` as a limit. Do not describe the result as independently clear.

## 7 · Adjudicate and repeat without inheriting the finding

Wait for all dispatched reviews before editing again so their base does not move underneath them.
Reproduce each reviewer finding before repairing it; a reader can correctly locate a suspicious
passage and still misstate its cause or population.

Every accepted repair starts a new round:

1. Update the finding card with the reproduced observation.
2. Write a new immutable repair contract.
3. Re-run the branch side of the entire before/after sweep; the base output may be reused if the base
   did not move.
4. Repeat the same-class and seam checks.
5. Re-run every independent review whose question the new repair can affect.

Continue while reviews return reproducible defects. Preferences and alternative wordings that do
not identify a false claim or unintended behavior do not keep the round open.

If a round finds a defect in something repaired during an earlier round, stop treating the work as
another local edit. Report that the repair shape or premise needs redesign and ask the user to decide
when the alternatives materially change the product.

## Report

Return one repair record:

```text
verdict
  clear to land | defects to repair | evidence incomplete | needs redesign | blocked

finding card
  subject, comparison, observed, expected, reproduction, diagnosis challenge, limits

repair contract
  premise, consumers and roles, intended moves, held outcomes, limits

verification
  target reproduction and edge cases
  negative-control result
  before/after moved rows and dispositions
  same-class audit
  near-seam result
  far-seam result, including predicted/off-list dependents or review-mode listed/newly discovered
  repository gate

independent review
  route used, findings, reproductions, dispositions, or named limit

remaining limits
  every consumer or population not established
```

Use `clear to land` only when the original finding is repaired, every observed move was predeclared
as intended, no reproduced finding remains, required independent review completed, and limits are
stated. A limit may remain only when evidence bounds it away from the decision. If the missing
population could still contain an unintended move or same-class defect that changes the verdict, use
`evidence incomplete`.

Use `defects to repair` when the candidate still contains a reproduced defect or an accepted review
finding. A plan that confirms a defect and proposes but does not implement its repair also uses
`defects to repair`; that verdict says work remains, not that the plan itself failed. Use `evidence
incomplete` instead when missing evidence prevents deciding whether the proposed or supplied repair
is sound.

Use `evidence incomplete` when meaningful checks ran but a required observation, baseline, or
independent review is unavailable. Use `blocked` only when the repair cannot be meaningfully
evaluated at all. Use `needs redesign` when evidence shows that local repairs are iterating the
design rather than converging on an already defined behavior.
