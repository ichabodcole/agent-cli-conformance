---
name: prose-cold-read
description:
  Read a document against the prose defect catalogue using a fresh subagent that has none of the
  writing context, and return findings with proposed fixes. Use after writing or substantially
  editing documentation, when asked to review or tighten prose, when a page is reported as hard to
  read, or before landing documentation changes.
---

# How to run a cold read

`references/CATALOGUE.md`, beside this file, holds the defect definitions with worked examples and
boundary cases. It is maintained by the `/prose-defect` command.

**The reader must be a fresh subagent, and it must not be briefed.** Most of these defects are
invisible to whoever wrote the text, for one reason: the writer holds something the reader does
not, and the sentence does not supply it. You cannot notice the absence of something you are
still carrying. Reading your own draft against this catalogue does not work, and neither does
reading someone else's after they have explained it to you.

## Steps

1. **Sweep first.** Run the greps in the catalogue's entries over the target and fix what they
   plainly catch, so the read has less to find. **A clean sweep is not a clean document.** The
   patterns are a pre-pass: they narrow where to look and cannot tell you when to stop.

2. **Spawn one subagent per document** with the Agent tool, using the brief below and nothing
   else. Give it the path.

   **Do not tell it what the document covers, what it argues, or where you suspect problems.**
   The missing context is the instrument.

3. **Read the report and judge it.** The cold reader is blind in the mirror image: it cannot tell
   a term the page coined from a term the domain already has, so expect false positives of
   exactly that kind. Findings from the reader, judgement from you.

4. **Apply what survives**, then capture any new category with `/prose-defect`.

## The brief

```
Read <path> closely, line by line.

First read .claude/skills/prose-cold-read/references/CATALOGUE.md. It defines a set of prose
defects, each with worked examples and a boundary case showing where the defect
looks present and is not.

Report every passage matching a catalogued defect. For each: quote it, name the
category, say what in the text produces it, and propose a rewrite that keeps the
claim exactly — same domain terms, numbers, file paths and figures.

Wherever you find one defect, read that sentence again before moving on.
Passages have carried two and three defects.

Report separately, under "Could not resolve": any term, reference, ordinal or
antecedent you could not resolve from this document alone. Do not judge whether
these are defects — you lack the context to know whether they are assumed
knowledge, and that is exactly why you are the one being asked.

Report anything that reads badly in a way the catalogue does not cover under
"Uncatalogued". Describe what you see rather than fitting it to a category.

Do not edit any file. Return the report as your final message.
```

## What comes back

Three lists: catalogued findings with proposed fixes, unresolved references, and uncatalogued
observations.

The third is the one that compounds. It is where the next catalogue entry comes from, and a run
that produces nothing there is a run worth being slightly suspicious of.
