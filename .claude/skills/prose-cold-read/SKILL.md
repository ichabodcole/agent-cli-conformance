---
name: prose-cold-read
description:
  Read a document against the prose defect catalogue using a fresh subagent that has none of the
  writing context, and return findings with proposed fixes. Use after writing or substantially
  editing documentation, when asked to review or tighten prose, when a page is reported as hard to
  read, or before landing documentation changes.
---

# How to run a cold read

`references/CATALOGUE.md`, beside this file, defines the defects with worked examples and boundary
cases.

**The reader must be a fresh subagent, and it must not be briefed.** Most of these defects are
invisible to whoever wrote the text, for one reason: the writer holds something the reader does
not, and the sentence does not supply it. You cannot notice the absence of something you are still
carrying. Reading your own draft against this catalogue does not work, and neither does reading
someone else's after they have explained it to you.

## Steps

1. **Sweep first.** Two entries carry search patterns — entry 1 and entry 3. Run them over the
   target file and fix what they plainly catch, so the read has less to find:

   ```bash
   grep -nE "is not [a-z]+ing\b" <path>
   grep -nE "\b(previously|used to|originally|became|was once|it once|an earlier version|at first|turned out)\b|\b(is|are|has|have) now\b|\bnow (told|uses|reports|does|has|is)\b" <path>
   ```

   Judge every hit by hand against that entry's boundary case; both patterns over-report by
   design. **A clean sweep is not a clean document** — the patterns narrow where to look and
   cannot tell you when to stop.

2. **Spawn one subagent per document** with the Agent tool, `subagent_type: general-purpose`.
   Give it the brief below and the path, and nothing else.

   **Do not tell it what the document covers, what it argues, or where you suspect problems.** The
   missing context is the instrument.

3. **Triage the three lists it returns.**

   - **Catalogued findings** — check each against the entry it cites, then accept or reject.
   - **Could not resolve** — for each, decide whether the term is genuinely assumed knowledge for
     this document's reader or is coined by the page. The reader cannot tell these apart and was
     told not to try. Coined ones are entry 2 defects; assumed ones you close with no change.
   - **Uncatalogued** — read these yourself. Anything real here is a new defect kind, and
     `/prose-defect` is how it gets worked up.

   Findings from the reader, judgement from the writer. Expect false positives on real domain
   vocabulary.

4. **Apply what survives.** Fix the document, then run `/prose-defect` on anything that turned out
   to be a new kind.

## The brief

```
Read <path> closely, line by line.

First read .claude/skills/prose-cold-read/references/CATALOGUE.md, resolving that
path from the repository root. It defines a set of prose defects, each with worked
examples and a boundary case showing where the defect looks present and is not.

Return exactly three sections, using these headings.

## Catalogued
Every passage matching a catalogued defect. For each: quote it, name the entry,
say what in the text produces it, and propose a rewrite that keeps the claim
exactly — same numbers, file paths and figures, and the same domain terms unless
a term is itself the defect.

Wherever you find one defect, strip that sentence to what it asserts and ask
whether anything is left before moving on. A passage can carry more than one
fault, and the first one found hides the rest.

## Could not resolve
Any term, reference, ordinal or antecedent you could not resolve from this
document alone. Do not judge whether these are defects — you lack the context to
know whether they are assumed knowledge, and that is exactly why you are the one
being asked.

## Uncatalogued
Anything that reads badly in a way the catalogue does not cover. Describe what
you see rather than fitting it to a category.

Do not edit any file. Return the report as your final message.
```

## What comes back

The three sections above. **Uncatalogued** is the one that compounds — it is where the next
catalogue entry comes from. When it is empty, check that the reader was not simply pattern-matching
against the entries rather than reading.
