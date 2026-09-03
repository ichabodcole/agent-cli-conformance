---
name: guidance-not-argument
description:
  Separate what a reader acts on from the story of how the project came to believe it, in a document
  that has accumulated both. Use on a long guidance page, standard, README or skill that has grown
  case studies, measurements, attributions and revision notes. Use whenever someone says a document
  is too long, dense, repetitive or hard to act on, or asks to "tighten this page", "cut the fluff",
  "make this more concise", "trim the evidence" or "clean up the docs" — and before publishing a
  long-lived guidance document anywhere new, since relocating a page is when its accumulated history
  becomes most visible.
---

# Separate the guidance from the argument for it

A document that is edited over months accumulates the record of its own editing: the trial that
produced a recommendation, the adopter who found the defect, the figure that settled an argument,
the sentence a previous draft got wrong. Each addition was correct when it landed. Together they
bury the thing the reader came for.

**The document is the declaration, not the argument for the declaration.** Its reader spends
attention on every line, and a line that does not change what they build cost them something for
nothing. The surveys, trials and adopter findings stay in the reports and research notes, linked for
anyone who wants them. They are the about page, not the product.

**Length is not the measure.** Report the counts because they are cheap to check, but a removal
earns its place by making the page clearer or truer. A replacement that runs as long as what it
replaced is fine when the reason needed the room. A pass optimising the counter starts cutting
reasons.

## The pass

Work in chunks a reader would recognise — one section, not a paragraph and not the whole document.

1. **Read the chunk whole** before proposing anything.
2. **Classify every passage** against the table below, and write the list down. The written list is
   what makes a review checkable by anyone else, and it is what makes you actually look: sections
   given a candidate list yield findings, sections given a sentence yield them later to whoever asks.
3. **Put the list in front of whoever owns the document** before editing. Disagreement is cheap here
   and expensive afterwards, and the owner will overrule some of it — that is the point.
4. **Apply the agreed removals one at a time**, asserting after each that the removed text is gone.
   A replacement helper that inserts without removing produces a duplicated paragraph, and no gate
   reports it.
5. **Read the whole chunk again**, not the diff. The diff shows what changed; only the chunk shows
   what stopped making sense.
6. **Verify**, using the list below.
7. **Record what came out**, verbatim.

## The test, and the four answers

For every passage: **would a reader who skipped this do anything differently?**

| classification    | what it means                                 | what to do                        |
| ----------------- | --------------------------------------------- | --------------------------------- |
| **scope**         | a definition of what the document covers      | keep; it needs no evidence at all |
| **reason stated** | the justification survives without the story  | keep the reason, cut the story    |
| **evidence only** | a measurement or case with no reason to state | compress to a citation            |
| **no reason**     | the narrative _was_ the justification         | record it; do not invent one      |

**Ask "scope" first.** A statement of what the document is about is not a claim about the world, and
no census makes it true or false.

**The fourth answer is the valuable one.** When the reason will not come out, either it exists and
has never been articulated, or what is there is a coincidence being treated as a reason. Say which.
Never write a sentence into the reason's slot to fill it — a required slot is not evidence.

## What earns its place

- **The recommendation.** What to do.
- **The mechanism.** Why it is right, stated so it holds for cases nobody has run. A mechanism
  covers every instance; a story covers the one it happened to.
- **One citation** for any measured claim — named and linked, not retold.
- **An example that teaches a term.** `Unknown option '--nope'. Valid flags: --format` shows what
  "names the valid set" means. That is part of the instruction. An example showing a claim held once
  is not.
- **Confidence and coverage marks**, and any sentence marking the document's own certainty down.
- **Honest limits** — what the thing cannot do, stated plainly.

## Shapes that recur

Each of these turned up repeatedly. Worked instances are in
[what came out of the standard](../../../docs/reports/2026-09-01-what-came-out-of-the-standard.md).

- **The attribution tell.** The sharpest sentence in a section is the one inside quotation marks.
  Where a page cites a source for its best line, check whether the line is actually the page's own
  position — and lift it if it is. Attribution is often a substitute for asserting.
- **A quotation that needs fencing.** When a passage is followed by qualifications of its own
  quotation, the qualifications are not the problem. Quoting commits you to defending someone's
  exact words including the parts you do not mean; state the position yourself and there is nothing
  to walk back.
- **Revision records.** _"until this revision"_, _"that objection won"_, _"an earlier version said"_.
  A document keeping a changelog in its body, addressed to a reader who never saw the draft.
- **A claim stated twice with material between the copies.** The material stops you noticing the
  copies. Removing it is what makes the duplication visible — so re-read the two paragraphs that
  were adjacent to anything you cut.
- **An inventory.** Decoration when it repeats a claim one case already makes; the argument when the
  claim is about a population — you cannot establish an absence with one example. Establishing a
  population takes a few members, not all of them.
- **A phrase reused as punctuation.** A vivid example that turns up wherever the document wants
  emphasis. Load-bearing once, decoration after.
- **The project narrating its own conduct** — why a section is placed here, that a case is recorded
  rather than hidden, that something is stated loudly.
- **Self-assessment inside guidance.** A claim about what this project can and cannot establish
  belongs where the project is argued for. The guidance says what to build.
- **A case with no rule.** Sometimes the general form does not exist anywhere in the passage, and
  the cut is an extraction rather than a compression. You cannot tell which until you try to write
  the rule.
- **A stated policy the document breaks.** Where a page states a rule about itself, check the page
  against it. A stated policy is a test the document already wrote and left unrun.
- **A trailing clause that calibrates instead of stating a consequence.** A clause saying what
  happens earns its place: the tree stays runnable, the commit goes missing, the step is a detector
  rather than a remedy. One saying how true, how frequent or how important the preceding claim is
  does not — that is a measurement, and it needs one. Watch for it where a bare instruction feels
  abrupt and the clause supplies cadence: it arrives feeling like finishing a sentence rather than
  adding a claim. **Test by promotion** — stand it alone as its own sentence and see whether it still
  says anything.

## Duplication

Not all of it is a defect. **Duplicate a reason** where two documents both need a reader to have it;
rewriting a strong sentence into a weaker paraphrase purely to avoid saying it twice is a bad trade.
**Do not duplicate evidence** — that is what a link is for, and it is where copies drift.

**If a passage earns duplication, duplicate it verbatim.** A recognisable copy is its own weak
signal: an editor changing one will notice the other exists. A paraphrase is the worst of both
worlds — a second copy that does not look like one, and the form in which copies silently diverge.

## What this method breaks

Compression is the operation that creates dangling references. Removing the sentence that introduced
something, while keeping the sentence that refers to it, is not carelessness — it is the default
outcome. Expect all of these, and note that **no linter, formatter or test suite sees any of them**:
a stale pointer resolves, a dangling antecedent parses, an orphaned pronoun reads as competent prose.

- **Antecedents.** A pronoun, a definite article, "the same X", "both", "that page".
- **References across sections and documents.** A figure cut in one section is cited in another; a
  term introduced once is used a hundred lines later. Two instances crossed Part boundaries.
- **Conventions.** Removing the passages that carried a marking convention can leave the convention
  declared and unused. A rule left standing with nothing obeying it is the same class as a stale
  pointer, inverted.
- **Cross-references describing a section's character.** A sentence saying what another section is
  goes stale when that section changes, and its bytes never move.
- **Links, broken badly enough to stop being links.** Text inserted between a label and its URL
  leaves neither, and a link checker looking for `](` no longer sees it at all.
- **Quantifiers the compression manufactures.** Everything above is something the method destroys.
  This is something it asserts. Turning a set of cases into one sentence produces a count or a scope
  — _the four sentences_, _which of three things_, _never_, _nowhere else_, _nothing else_ — that
  nobody enumerated, because enumerating means finding the exceptions and the exceptions are what
  the summary exists to omit. Measured across one change set: nine of ten false statements were
  spanning claims, and each sat exactly on top of a threshold or an exclusion. Sentences about a
  single instantiated case were almost all true.
- **Reasons, which are inferences and not observations.** A _because_ clause explains why the system
  does something, and it can follow perfectly from the design while being false about the code. One
  repair replaced a true sentence with a false one this way, reasoning that a serious violation must
  reject the whole input when it in fact drops one record.

## Verifying

**Read the whole section after editing it.** This is the only instrument that finds the failures
above. Searches confirm what you already know to name; they cannot report that a sentence no longer
makes sense. Every stale reference this method produced was invisible to a full repository gate, and
several were invisible to greps written specifically to catch them.

Then, in order of what has actually caught things:

1. **Before cutting on the grounds that a passage lives elsewhere, verify that it lives elsewhere.**
   "It belongs in X" is a rule about where things should live, not evidence about where this one is.
2. **Search the whole document for every term, figure or actor a cut removed.** Not the section —
   the document.
3. **Read each sentence against the thing it describes, not just the section it sits in.** These are
   two instruments and they catch different defects: reading the whole section finds the dangling
   antecedent and the stale count; only holding a sentence beside the code, output or data it is
   about finds the one that asserts more than its subject establishes. A document can survive the
   first and fail the second, and the failures are fluent.
4. **Treat every quantifier as a claim that has to be run.** A number, a threshold, a key name, an
   _only_, a _never_, an _always_, a definite article standing for a closed set. Produce the case
   first and write the sentence over it; composing the sentence and then an example to fit it is how
   two separately true halves become one impossible whole. Where the run cannot be made, delete the
   sentence rather than hedge it — a missing sentence is honest, an unverified one is the defect.
5. **Re-read what points at the section, and what it pointed to.** Including a document's own
   policies about itself.
6. **Check every id and label you write.** An id is a label, and labels are not checked by anything:
   a link to a real file with an invented finding id passes every gate.
7. **Look at over-long lines.** Where the formatter preserves author line breaks, a line running
   past the document's usual width marks a passage edited without being reread. It finds no defect
   by itself and it aims a read very well.
8. **Run the repository gate**, last, knowing it cannot see the interesting failures.

**Get a cold reader for anything substantial.** The person who made the edits is the worst reader of
them: they hold the context the sentence no longer supplies. See
[`prose-cold-read`](../prose-cold-read/SKILL.md).

## Record what came out

Keep one file holding every removed passage verbatim, with its original line numbers and its
classification. It makes the pass reversible by reading one document, lets the second pass judge the
whole set at once, and is the only way anyone can check what a section's review actually considered.

**Declaring a section clean without listing what was considered leaves no record anyone can check —
including you.** Sections given a written candidate list yielded findings on review; sections given
a sentence yielded more the moment somebody asked.

Some removals carry content that exists nowhere else — usually guidance for whoever maintains the
document rather than for its reader, such as when a notation may grow a new category. That belongs
in a decision page, not in the guidance and not lost.
