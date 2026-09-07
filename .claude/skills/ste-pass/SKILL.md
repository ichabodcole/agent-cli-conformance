---
name: ste-pass
description:
  Edit a document so that it obeys the writing rules of ASD-STE100 Simplified Technical English. A
  script finds the defects that a pattern can find. Then a fresh subagent reads the document
  against the rules and returns rewrites that keep every fact. Use this skill when a reader reports
  that a document is dense, confusing, or hard to read. Use it when output from a model needs a
  cleanup before the output goes into documentation. Use it when someone says "simplify this",
  "make this plain", "STE pass", or "technical English".
---

# How to run an STE pass

`references/RULES.md`, beside this file, restates the writing rules. Each entry has examples and
the case where the text looks wrong and is not wrong. `scripts/sweep.sh` finds the defects that a
pattern can find.

**The reader must be a fresh subagent, and you must not brief the subagent on the content.** The
rules target the defects that a writer cannot see:

- a term that only the writer can resolve
- a pronoun that only the writer can bind
- a figure of speech that only the writer can decode.

A reader who holds the writer's context resolves these without effort and reports nothing. That
is the failure. The missing context is the instrument.

**A rewrite keeps the claim.** A rewrite keeps the same numbers, the same paths, the same
conditions, and the same domain terms. Style never removes a fact. When a rule and a fact conflict,
keep the fact.

## Steps

1. **Record the facts.** Save the list of code spans, numbers, and paths that the document
   contains. You will compare the list after every edit.

   ```bash
   bash .claude/skills/ste-pass/scripts/sweep.sh --facts <path> > /tmp/facts-before-$(basename <path>)
   ```

2. **Sweep.** Run the script. Then judge every hit (a line that matches a pattern) by hand against
   the entry in `RULES.md` that the script names. Fix the hits that are clearly defects. Every
   pattern over-reports on purpose. Thus these hits are not defects:

   - a `-ing` word that names a thing
   - a passive whose actor does not matter
   - a semicolon inside a code span.

   ```bash
   bash .claude/skills/ste-pass/scripts/sweep.sh <path>
   ```

   **A sweep that reports nothing does not show that the document has no defects.** The script
   cannot count the words in a noun cluster. The script cannot see a figure of speech. And the
   script cannot tell a technical name from a term that the document made.

3. **Spawn one subagent for each document** with the Agent tool, and pass
   `subagent_type: general-purpose`. Give the subagent the brief below and the path, and nothing
   else. Do not tell the subagent what the document covers or where you suspect problems.

4. **Triage the three lists that the subagent returns.**

   - **Rule findings.** Check each finding against the entry that the finding cites. Accept or
     reject each finding.
   - **Could not resolve.** For each term, decide whether the domain owns the term or the document
     made the term. The reader cannot distinguish these two cases, and the brief tells the reader
     not to try. A term that the document made is a rule 1.6 defect. A term that the domain owns
     needs no change.
   - **Outside the rules.** Read these yourself. A real defect here is a new kind of defect. Use
     `/prose-defect` to give the new kind an entry in the prose defect catalogue.

5. **Apply the findings that you accepted.** Then run the sweep again. Compare the facts.

   ```bash
   bash .claude/skills/ste-pass/scripts/sweep.sh --facts <path> | diff /tmp/facts-before-$(basename <path>) -
   ```

   A line that is present before the edits and absent after the edits is a fact that an edit
   removed. Restore that fact.

## The brief

```
Read <path> closely, line by line.

First read .claude/skills/ste-pass/references/RULES.md, from the repository
root. It restates the writing rules of ASD-STE100 Simplified Technical English.
Each entry gives the rule, a pair of examples, and the case where the text
looks wrong and is not wrong.

Return exactly three sections, with these headings.

## Rule findings
Every passage that breaks a rule. For each passage:
- quote the passage
- name the rule
- say what in the text breaks the rule
- give a rewrite.
The rewrite must keep the claim exactly: the same numbers, file paths,
conditions, and domain terms. Do not remove a fact to make a sentence shorter.

When you find one defect, read the sentence again for the next defect. A
passage can break more than one rule, and the first defect hides the rest.

## Could not resolve
Every term, pronoun, or reference that you could not resolve from this document
alone. Do not judge whether these are defects. You lack the context to know
whether the domain owns the term, and that is why you are the reader.

## Outside the rules
Anything that reads badly in a way that the rules do not cover. Describe what
you see. Do not fit it to a rule.

Do not edit any file. Return the report as your final message.
```

## What this pass is not

This pass is not the `prose-cold-read` pass. That pass reads against the prose defect catalogue,
which names the defects that this repository's wiki published. This pass reads against a public
standard with numbered rules. Run both passes on a document that matters. They find different
things.

This pass is not a length pass. A long document in short sentences is correct. Use
`guidance-not-argument` to remove material. Then use this pass to make the material that remains
plain.
