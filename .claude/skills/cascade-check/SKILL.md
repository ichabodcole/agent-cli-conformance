---
name: cascade-check
description:
  Find the direct readers, derivations, assertions, and duplicate declarations affected by a
  proposed change to a shared value, rule, definition, error classification, link target, or term.
  Decide whether every dependent can satisfy the proposal. Also use when a reviewer reports a
  defect and the obvious repair may invalidate another relationship.
---

# Check what cascades before you change it

In this skill, a **fact** is the proposed behavior, rule, or falsifiable claim the edit would make
true. Other things may depend on that fact. Find those relationships before editing.

This is a bounded pre-edit inventory, not a repository-wide audit. Inspect the changed fact's direct
readers, derivations, assertions, and independent homes. Stop under
[The stopping condition](#the-stopping-condition), not after an effort estimate or fixed distance.

## When to run it

Run it when other code or pages read the fact you are changing:

- a value, guard, or predicate more than one caller consults
- how an error is classified, or what an exit code means
- what a field, flag, or term means
- a link, a heading, or a sentence another page points at
- anything duplicated on purpose, where a lint or a test compares two copies

Skip it for new code with no callers or readers, a typo, or a behavior-preserving local refactor
whose outputs and invariants do not change.

If you are unsure, run it.

## Steps

### 1. Say what you are changing

Name the fact, not the file. "A missing declaration file is a usage error" is a fact. "Line 204 of
`check.ts`" is not.

If you cannot write that sentence, you will search for the wrong thing and may find no dependents.

If the edit changes several facts, write one sentence for each and run the remaining steps for each
one. A broad edit is not one fact merely because it is one diff.

For prose, each new or materially reworded falsifiable claim is a fact. “Rewrite the guide” is a
scope label, not a fact sentence; it cannot expose which replacement explanation lacks a warrant.

### 2. Find what depends on it

Start with the symbol or declaration when one exists. Who calls this function, reads this field,
constructs or catches this error type, imports this module, or reads the value it returns?

Then search the fact through three other handles:

- **mechanism** — distinctive commands, predicates, nouns, and both the old and proposed wording
- **consequence** — what the fact causes a caller or reader to observe
- **structure** — tests, lints, examples, comments, reverse searches for inbound links, the target
  page's `related:` entries, generated output, and deliberately duplicated declarations

A prose fact may have no symbol. A literal search finds matching wording, not every semantic
dependent, so read each plausible hit.

In documentation, classify passages rather than whole files. A source for one claim can contain a
dependent assertion about another. Separate an instruction from its warrant: the action may remain
right after its stated reason becomes false. Check the artifact's lifecycle before changing it;
dated research and discharged reports may be historical evidence rather than stale guidance.

Tests, lints, published examples, and comments may state behavior explicitly. Inspect whether each
assertion is current, intended, obsolete, or hypothetical. Judge a test by the assertion it makes,
not by what its name says it checks.

For every proposed statement of behavior, count, classification, or cause, name the source passage
or derivation that warrants it. If none does, remove the claim from the proposed repair rather than
treating a template's required field as evidence.

### 3. Sort what you found

For each passage or declaration, record every role that applies:

- **Reads it** — takes the value and does something with it.
- **Derives from it** — computes something else from it, so a change moves that too.
- **Asserts it** — a test, a lint, a documented example, or sample output that states what it is
  today.
- **Relies on it** — uses the fact as the reason for another instruction or conclusion.
- **Duplicates it** — independently implements or declares the same rule.
- **Source only** — warrants the change but does not depend on it.
- **Sits near it** — mentions the subject but does not depend on this fact.

Read the **asserts it** group carefully before you change or update any of them. A test can assert
the behavior you are changing while its name says it checks something else.

Do not discard a whole file as `source only` or `sits near it`. Record the role at the passage or
declaration that earned it; another passage in the same file may have another role.

### 4. Decide — there are three decisions

Apply the first decision below that fits. `Wrong shape` means at least one dependent cannot satisfy
the proposed change; that decision takes precedence even when the rule also has several homes.

**The dependents cannot all satisfy the proposed change.** Record `wrong shape`, redesign the
proposal, then run steps 2 and 3 on the replacement. One pass is often insufficient: the first
establishes that at least one dependent cannot satisfy the proposal, and the second evaluates the
replacement.

**The fact holds across the inspected dependents but the rule has several homes.** Decide whether
the homes should share one executable premise. If their consumers can and should read the same
implementation, move the decision there.

Keep homes independent when a language or publication boundary requires separate declarations,
when their independence is part of a control, or when synchronizing the copies is itself an explicit
contract. Update each required home and run the mechanism that proves they agree. Update tests,
examples, and reader-facing explanations that intentionally restate the rule. Cite the measured
source supporting each explanation that requires evidence.

**The fact holds across the inspected dependents.** Make the change.

Two signs you are in the wrong-shape case:

- You are recognising a condition by matching text — an error message, a heading, a filename
  pattern. That works until someone rewords the text, and then it fails without saying so.
- The only way to make your fix work is for callers governed by the same contract to produce
  different answers. Different contracts may require different answers; name the distinction and
  the source that warrants it.

If the proposed change adds or alters a test, lint, gate, or verifier, name two control specimens
before editing: one with the defect restored that the instrument must reject, and one without the
defect that it must accept. Run both when verifying the repair. If you cannot name both before
editing, the proposed instrument is not yet specific enough to verify.

## The stopping condition

Repeat the inventory when a search reveals a new shared premise or the proposed repair changes
shape. Before stopping, classify every direct reader, derivation, assertion, reliance, independent
home, inbound link, copied explanation, and copied warrant found by the inventory. Then repeat the
targeted symbol, mechanism, consequence, and structural searches. Stop when that pass yields no new
required inventory entry or relationship.

Name anything the search could not inspect. A scope boundary can prevent an edit; it does not
remove the dependent from the record.

## Worked example

Suppose `acc probe-plan` classifies a missing `--paths` file as `not_found` but a missing
`--declaration` file as `usage`. Inspect `loadDeclaration` callers before changing either result. If
`acc check` classifies the same condition differently, changing only `probe-plan` preserves the
disagreement. Establish the shared classification from its source, encode it where each caller can
read it, update only assertions governed by that contract, and repeat the inventory because the
repair introduced a shared dependency.

## Reviewers do this too

If you are reviewing and find a defect, run the same inventory before recommending the obvious fix.
Then say whether the fix is safe and identify anything the obvious fix would break.

## Record what you found

Before editing, record one Cascade note with one entry per fact:

```text
fact        : one behavioral rule or materially changed falsifiable claim
dependents  : passage or declaration, with its role
decision    : wrong shape | several homes | holds across inspected dependents
evidence    : commands and source passages establishing the fact and relationships
warrants    : source passage or derivation for each proposed explanation; none when not applicable
controls    : defect-restored reject and non-defective accept specimens; none when not applicable
limits      : anything not inspected or not in editing scope
```

Include that note in the repair record, commit message, or pull request. The next person needs to
know the list was made, which of the three decisions it produced, and which dependents remain outside
the edit.

For a large change, run this first so you write the right fix, then run
[`two-lens-review`](../two-lens-review/SKILL.md) to review correctness and consequences after editing.
