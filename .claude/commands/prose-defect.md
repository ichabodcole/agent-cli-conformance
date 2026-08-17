---
description:
  Capture one prose defect — a passage that read badly — into the defect catalogue, with the
  category named and agreed with the user first.
argument-hint: "[pasted passage, or file:line, or nothing]"
---

# Capture a prose defect

Someone hit a sentence that read badly. Work out what kind of defect it is, **agree the category
with them**, fix the passage, and add it to the catalogue.

Catalogue: `docs/reviews/2026-08-16-prose-defect-catalogue.md`

**One passage per run. This captures; it does not sweep a document.** Reading a whole document
against these categories is a different job and does not exist yet.

The passage, a `file:line`, or nothing: $ARGUMENTS

## 1. Read it in context

Open the file and read around the passage, **even when it was pasted in full**. Context has
changed the diagnosis repeatedly — a description turned out to be leaning on a term defined 22
lines below it, and an ordinal turned out to have no antecedent anywhere on the page. Neither is
visible in the quoted sentence.

If the passage was not identified, ask which one.

## 2. Get the reader's report, in their words

Ask what happened when they read it, and quote the answer verbatim into the entry. A tidied
paraphrase throws away the part that was hard to say.

If they cannot name it, three prompts that have worked: did you read it twice? did you finish it
and not know what it claimed? could you tell whether you were missing background, or whether you
were just reading badly?

**Do not offer a diagnosis first.** A mechanism named up front becomes the reader's description of
their own experience, and the entry then records your theory rather than their reading.

## 3. Diagnose, then look again

Read the catalogue's existing entries and say whether this is one of them or something new. Most
have turned out to be existing.

Then **look at the same sentence a second time**. Two passages so far carried more than one
defect, and in both cases the extra ones surfaced only after the first was named. The move that
found them: strip the sentence to what it asserts, and ask whether anything is left.

## 4. Agree the category before writing anything

Say what you think the category is and why. Let the user push back. This is the step that matters
most, and it has changed the answer every time it was skipped:

- "it has no main verb" — wrong; the counter-example was one page away
- "past tense is the signal" — wrong; the signal is past tense that **contrasts with a present
  state**, which is a small closed set of adverbs, not verb morphology
- "decision pages are exempt from the history rule" — wrong; the test is _whose_ history

A wrong category written down confidently is worse than no entry, because the next reader applies
it.

## 5. Propose the rewrite

**Do not change the claim.** Keep domain terms, numbers, file paths and exact figures. Say what
the rewrite costs when it costs something, and say when a fix is partial.

Watch for fixes that cannot be a swap. "This checker used to compare X" does not become "this
checker compares X" — that would be false. It becomes the counterfactual it always was.

## 6. Fix the page, then update the catalogue

Commit the page fix on its own, explaining the defect in the message. The catalogue is currently
untracked, so update it separately and do not stage it.

Never `git add -A`. Stage explicit paths.

## 7. Write the entry

Match the existing entries:

```markdown
## N. <name of the pattern, not of the page>

**Seen in** `path:line`. Fixed in `<sha>`.

> **Before** — …

> **After** — …

**The reader's report.** <verbatim>

**What goes wrong.** <the mechanism, specific to this text>

**Where it looks like this but is not.** <the boundary — see below>

**How to spot it.** <what a reader or a grep can key on>
```

Extend an existing entry rather than adding a near-duplicate.

**Every entry needs its boundary case.** Where does this look like the defect and is fine? A
catalogue of only positive cases teaches an over-eager rule, and the boundary is where the next
reader will misapply it. Third-party release history is reference material; ours is provenance.
`no longer` is usually logical, not historical.

**Record wrong diagnoses too.** Two are in the catalogue and both are load-bearing — they stop the
same wrong turn being taken again.

If you renumber entries, check every `entry N` cross-reference in the file. That broke once.

## If you write a grep, run it and record what it missed

Every pattern written for this catalogue has been wrong on first attempt. One returned three
candidates and zero defects. Another under-reported three times running — four instances, then
nineteen, then twenty-three — and each round's silence had read as absence.

So a pattern is a pre-pass that clears obvious cases before the read, never a clearance. Run it,
count the false positives, count what a later extension catches, and **write both numbers into
the entry**. A pattern finding nothing is not evidence a document is clean.
