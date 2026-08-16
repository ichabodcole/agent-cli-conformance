---
name: plainspoken-edit
description: Editorial pass over a draft for prose density. Use after a document is written, when the user asks to edit, review, tighten, or clarify prose, or says a page is hard to read, dense, or needs rereading. Finds compressed and hard-to-parse sentences, names the mechanism, and proposes rewrites that keep the claim exactly.
---

# Plainspoken edit

An editorial pass over prose someone has already written. It finds sentences that cost the reader
a second pass, names why, and proposes a rewrite.

**Do not use this to write a first draft.** It edits existing text.

## Read first. Measure second.

This order was tested and it is the reverse of what this skill first said. A reading pass over a
dense page, with no tooling, found twelve problems; nine were catchable from the sentence alone.
**Reading is the primary instrument.**

Read the document in order, judging each sentence on its own. Most of what you find is structural
and obvious once seen: a verb arriving too late, a modifier attached to the wrong host, two finite
verbs adjacent so the first parse takes the wrong one as the main clause.

Then measure:

```bash
bun .claude/skills/plainspoken-edit/measure.ts <file.md> [...]
```

It reports sentence-length distribution, regex-visible habits and nominalisation density. It
rewrites nothing, judges nothing, and **always exits zero** — it deliberately produces no pass/fail
signal, because a green one would read as "the prose is fine" and it cannot support that claim.

**Run it after reading, so the numbers do not anchor you — and treat it as a minimap.** It shows
the shape of a corpus, not the cost of a sentence. Over many files it says "look here first"; over
one file it says less than reading does. In the test, none of the twelve findings was a long
sentence, and the clearest sentence in the document was among the longest.

## The mechanisms

Name a mechanism for each finding. If none fits, say so and describe what you see.

**1. Long dependencies** — material between a subject and its verb, or between a verb and its
object. This is the best-evidenced cause of reading difficulty there is; in one measured study it
inhibited recall more than any other feature tested, for experienced readers. Fix by moving the
interruption to the end.

Two things you might list separately belong here. **Abstract nouns** ("rejection of the flag was
performed by the parser") hurt mostly by pushing the verb away — the mechanism is locality, not
nominality, and the direct evidence that nominalisation itself is harder to read is thin. **Long
sentences** are not the problem either: length correlates with distance but does not cause the
cost, and splitting a sentence to hit a word count drops the connective and makes the reader infer
the logic.

**2. The point arrives last** — the reader holds everything in suspension until the final clause.
Fix by stating the point first. Weaker evidence than (1), and contested: in some constructions
more preceding material makes the ending _easier_. Flag a run of these, not a single one.

**3. Undeclared compression** — a short phrase stands in for a long argument without saying so.
The one that matters most here, and it is not a new category. Aristotle's name for it is the
**maxim** (_gnome_): "the premises or conclusions of enthymemes **without the syllogism**" —
a conclusion with its reasoning removed.

He also explains why it works, which is the whole problem. A maxim pleases because the speaker
"hits upon the opinions which they specially hold" — it lands on a reader who **already holds the
argument**. For a reader who does not, the satisfying form arrives and the content does not, and
nothing in the sentence tells them which of the two happened to them.

## Undeclared compression, and how to spot it

An acronym announces itself. Read "TDD" and you know a definition exists to look up. A memorable
phrase hides the same compression behind ordinary words, so a confused reader cannot tell whether
they lack context or are reading badly. They reread, then assume the fault is theirs.

The test: **would this sentence be improved by being an acronym?** If yes, it is carrying a
definition — expand it where it appears, or point it at a glossary entry. A compressed line may
stay if it earns its place; pay for it immediately with a concrete instance in the next sentence.

## What only accumulation reveals

A third pass, after reading and measuring. These are habits, not defective sentences, and no
single sentence shows them:

- **A recurring gesture with a different referent each time** — one page divided things into
  "halves" four times, each a different division.
- **A term used in two senses** — the same page made `target` mean the CLI under test, then reused
  it for the ordinary sense.
- **A coinage used before it is defined**, where only repetition makes the forward reference
  visible.
- **Definite articles on antecedents not yet delivered** — "the ratchet" before the ratchet exists.
- **A cadence** — ending most subsections on a maxim trains the reader to hold every paragraph
  open expecting the point last.

Accumulation also changes diagnosis: one finding moved from "mildly abstract" to "undeclared
compression" once the pattern it belonged to was visible.

## What no measurement can see, and you must

Every mechanism above is sentence-level. These are not, no tool detects them, and on instructional
prose they usually cost more:

- **Context dragged in.** Material that belongs to another document, or to the history of how this
  one came to be written. A rule page carrying the story of a bug already fixed; a roadmap
  adjudicating against a review the reader cannot open. It reads as thoroughness and it is work
  handed to the reader.
- **Unnecessary explanation.** The reader is told why before they have any use for it, or told
  twice — once plainly and once more elegantly.
- **A promise the page does not keep.** The heading says what is missing; the section narrates what
  was done.
- **A scaffold taught and then abandoned.** Once a reader learns a section shape, every departure
  costs a re-derivation.

Ask of each section: **who is this for, and what do they do with it?** If the answer is "someone
who already knows the history", it belongs somewhere else.

## What not to change

**Do not change the claim.** A rewrite that alters what a sentence asserts has failed. Density is
a separate axis from accuracy.

**Keep domain terms, numbers, file paths and exact figures.** Replacing a precise word with a
vaguer one makes the document worse.

**Do not flag everything.** A pass that rewrites every sentence buries the sentences that cost
something. Aim for the worst ten in a long document.

**Leave quoted material alone.** The measurement script already excludes blockquotes.

## Density is appropriate in some places

Judge against the page's Diátaxis `type` where it has one.

| Type                  | Reader                       | Compression                                            |
| --------------------- | ---------------------------- | ------------------------------------------------------ |
| explanation, decision | studying                     | appropriate — it aids recall                           |
| reference, rule       | consulting mid-task          | definitional lines only                                |
| how-to                | working, attention elsewhere | remove it                                              |
| tutorial              | learning, low confidence     | remove it — a tutorial minimises explanation by design |

The further a page sits toward doing rather than studying, the looser and more concrete its prose
should be. And note that dense _content_ is a reason to write more plainly, not less: a reader
spending capacity on new facts has none left for a construction that must also be decoded.

## Output

Report findings. **Do not edit files unless asked to.** Lead with the register the document is in
and how that compares to what its type wants, then the findings worst first: the sentence quoted,
the mechanism named, the rewrite, and what the rewrite preserves if that is not obvious.

End with what you deliberately left alone. A page that reads densely on purpose is a finding too.

## What this skill has not shown

It has mostly been run on prose already believed to be dense, so its false-positive rate is barely
measured. It has now passed exactly one document unchanged — `bare-invocation-is-a-usage-error.md`,
read closely and found to need nothing. One is not calibration. Treat a long list of findings on a
document nobody complained about as a reason to check the skill, not the document.
