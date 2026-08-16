---
name: plainspoken-edit
description: Editorial pass over a draft for prose density. Use after a document is written, when the user asks to edit, review, tighten, or clarify prose, or says a page is hard to read, dense, or needs rereading. Finds compressed and periodic sentences, names the mechanism, and proposes rewrites that keep the claim exactly.
---

# Plainspoken edit

An editorial pass over prose someone has already written. It finds sentences that cost the reader
a second pass, names why, and proposes a rewrite.

This is the review half of a pair. The `Plainspoken` output style shapes prose while it is being
written; this skill catches what survives. Priming shifts a distribution and does not verify one,
so both are needed.

**Do not use this to write a first draft.** It edits existing text.

## Read first. Measure second.

This order was tested, and it is the reverse of what the skill originally said.

A reading pass over a dense page, with no measurement and no tooling, found twelve problems. Nine
were catchable from the sentence alone. **Reading is the primary instrument**; do not skip it and
do not run anything before it.

Read the whole document in order, judging each sentence on its own. Most of what you find will be
structural and obvious once seen: a verb that arrives too late, a modifier attached to the wrong
host, two finite verbs adjacent so the first parse takes the wrong one as the main clause.

Then measure, for the things reading alone misses:

```bash
bun .claude/skills/plainspoken-edit/measure.ts <file.md> [...]
```

It reports the sentence-length distribution, regex-visible habits, nominalisation density, and
every sentence over 30 words. It rewrites nothing and judges nothing. It exits non-zero when p90
is over 28.

**Measure after reading, not before, so the numbers do not anchor you.** Length is a weak proxy:
in the test, none of the twelve findings was flagged by length, and the clearest sentence in the
document was also one of the longest.

## What only accumulation reveals

A third pass, after reading and measuring. These are **habits** rather than defective sentences,
and no single sentence shows them:

- **A recurring gesture with a different referent each time.** One page divided things into
  "halves" four times, each a different division, so "the second half of…" had become a general
  wave at two-part structure rather than a pointer to one.
- **A term used in two senses.** The same page made `target` a technical term meaning the CLI
  under test, then reused it for the ordinary sense. Each sentence was fine; the collision was not.
- **A coined word used before it is defined**, where the gap is wide enough that only repetition
  makes the forward reference visible.
- **Definite articles on antecedents not yet delivered** — "the ratchet" before the ratchet exists.
- **A cadence.** Ending most subsections on a maxim trains the reader to hold every paragraph open
  expecting the point last, which makes genuinely periodic sentences inside those paragraphs cost
  more than they would alone.

Accumulation also changes **diagnosis**, not only detection: in the test, one finding moved from
"mildly abstract" to "undeclared compression" once the reader had seen the pattern it belonged to.

## The five mechanisms

Each flagged sentence gets a named diagnosis. Guessing is not allowed; if none of these fits, say
so and describe what you see instead.

| Mechanism                  | What it is                                                                 | The fix                                   |
| -------------------------- | -------------------------------------------------------------------------- | ----------------------------------------- |
| **Periodic structure**     | the main clause arrives last, so the reader holds everything in suspension | state the point first, then the support   |
| **Center-embedding**       | material sits between a subject and its verb                               | move the interruption to the end          |
| **Nominal style**          | actions written as abstract nouns                                          | give the action back its verb             |
| **Abstraction stacking**   | every noun is abstract, so nothing can be pictured                         | anchor one concrete thing early           |
| **Undeclared compression** | a short phrase stands in for a long argument, without saying so            | expand it, or link it to a glossary entry |

The first four are visible in the sentence. The fifth is not, and it is the one that matters most.

## Undeclared compression, and how to spot it

An acronym announces itself. Read "TDD" and you know a definition exists to look up. A memorable
phrase hides the same compression behind ordinary words, so a confused reader cannot tell whether
they lack context or are reading badly. They reread, then assume the fault is theirs.

The test: **would this sentence be improved by being an acronym?**

If yes, it is carrying a definition. Expand it where it appears, or point it at a glossary entry.
If no, it is ordinary prose and the other four mechanisms apply.

A compressed line is allowed to stay when it earns its place. Keep it, then pay for it
immediately with a concrete instance in the next sentence.

## What not to change

**Do not change the claim.** A rewrite that alters what a sentence asserts is a failed rewrite,
not an improved one. Density is a separate axis from accuracy, and a page can be exactly right and
still cost too much to read.

**Keep domain terms, numbers, file paths and exact figures.** Technical vocabulary is not the
problem. Replacing a precise word with a vaguer one makes the document worse.

**Do not flag everything.** A pass that rewrites every sentence is noise, and it buries the
sentences that actually cost something. Aim for the worst ten in a long document.

**Leave quoted material alone.** Blockquotes carry other people's words, or specimens shown to be
criticised. The measurement script already excludes them.

## Density is appropriate in some places

Judge against the page's Diátaxis type, which is in the frontmatter as `type` where the document
has one.

| Type                  | Reader                       | Aphorism                                                                                        |
| --------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------- |
| explanation, decision | studying                     | appropriate — compression aids recall                                                           |
| reference, rule       | consulting mid-task          | definitional lines only; the body describes and only describes                                  |
| how-to                | working, attention elsewhere | remove it                                                                                       |
| tutorial              | learning, low confidence     | remove it — a tutorial minimises explanation, and an aphorism is explanation at maximum density |

The rule of thumb: the further a page sits toward doing rather than studying, the looser and more
concrete its prose should be.

## Output

Report findings. **Do not edit files unless asked to.**

Lead with the aggregate — what register is this document in, and how does it compare to what its
type wants. Then the individual findings, worst first:

- the sentence, quoted
- the mechanism, named
- the rewrite
- one line on what the rewrite preserves, if that is not obvious

End with what you deliberately left alone and why. A page that reads densely on purpose is a
finding too, and saying so is more useful than silence.
