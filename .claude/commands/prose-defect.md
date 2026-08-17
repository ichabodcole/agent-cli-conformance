---
description:
  Capture one prose defect — a passage that read badly — into the defect catalogue, with the
  category agreed with the user before it is written.
argument-hint: "[pasted passage, or file:line, or nothing]"
---

# How to capture a prose defect

The catalogue is `docs/reviews/2026-08-16-prose-defect-catalogue.md`. It holds the defect
definitions, the worked examples, and the evidence behind every instruction below. Read it at
step 3.

One passage per run. **This captures a defect. It does not sweep a document against the
catalogue** — that is a separate job and does not exist yet.

Passage, `file:line`, or nothing: $ARGUMENTS

## Steps

1. **Open the file and read around the passage**, even when it was pasted in full. Ask which
   passage if none was named.

2. **Ask what happened when they read it, and quote the answer verbatim.** The entry uses their
   words. If they cannot name it: did you read it twice? did you finish and not know what it
   claimed? could you tell whether you were missing background?

   Do not offer a diagnosis first — it becomes their description of their own reading.

3. **Read the catalogue's entries, then say whether this is one of them or new.** Most are
   existing.

4. **Look at the sentence again once you have named the first defect.** Strip it to what it
   asserts and ask whether anything is left. Passages here have carried two and three.

5. **State the category and why it is that one. Wait for the user to agree it.** Diagnoses get
   corrected at this step. A wrong category written down confidently is worse than no entry,
   because the next reader applies it.

6. **Propose a rewrite that keeps the claim exactly** — domain terms, numbers, file paths and
   figures unchanged. Say what the rewrite costs when it costs something.

   Some fixes cannot be a swap: "this checker used to compare X" does not become "this checker
   compares X", which would be false. It becomes the counterfactual it always was.

7. **Commit the page fix on its own**, naming the defect in the message. Stage explicit paths;
   never `git add -A`.

8. **Update the catalogue, and do not stage it.** It is untracked.

## The entry

```markdown
## N. <the pattern, not the page>

**Seen in** `path:line`. Fixed in `<sha>`.

> **Before** — …

> **After** — …

**The reader's report.** <verbatim>

**What goes wrong.** <the mechanism, specific to this text>

**Where it looks like this but is not.** <the boundary>

**How to spot it.** <what a reader or a grep can key on>
```

Extend an existing entry rather than adding a near-duplicate. If you renumber, check every
`entry N` cross-reference in the file.

**Every entry needs its boundary case** — where this looks like the defect and is fine. Without
one the rule gets over-applied, and the boundary is where the next reader will misapply it.

**Record wrong diagnoses.** They stop the same wrong turn being taken twice.

## If you write a grep

Optional, and never a clearance. Run it, count its false positives, and write both numbers into
the entry alongside what a later extension catches. Entry 3's record of three successive
under-reports is why the read still happens afterwards.
