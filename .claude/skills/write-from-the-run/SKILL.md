---
name: write-from-the-run
description:
  Produce the behaviour before writing the sentence about it. Use while writing or editing any prose
  that states how something behaves — a guide, a README, a doc comment, a skill, a commit message, a
  release note, a report, or a brief handed to another agent. Use whenever a sentence about to be
  written carries a count, a threshold, a quoted output, a field or status name, or a word like
  every, only, never or "the three".
---

# Write from the run

**Produce the case, then write the sentence over its output.** Not the reverse: a sentence composed
first and illustrated afterwards can be assembled from parts that are each true and describe a whole
that cannot happen.

## The procedure

1. **Write the claim you intend to make**, in a scratch line. One sentence.
2. **Produce the case.** Run the command, build the input, execute the function. If you cannot say
   what case would demonstrate the claim, stop there — that is the finding.
3. **Paste the real output into the draft**, above your sentence.
4. **Write the sentence over what is there**, reading the output as you write rather than your memory
   of what it says.
5. **Keep the command** — in the report, the commit message, or wherever the project keeps
   provenance. A claim whose command is lost is one nobody can re-check.
6. **Delete the pasted output** if the finished text does not need it.

## What obliges a run

Any of these, in a sentence you are writing:

- a number, count, fraction, threshold, or version
- a quoted output, render, error message, field name, status value, or exit code
- a quantifier — `every`, `only`, `never`, `always`, `none`, `both`, `the three`, `the four`
- a definite article standing for a closed set: _the_ sentences, _the_ reasons, _the_ cases
- a claim that two things are the same string, the same shape, or the same behaviour
- a claim that something is the sole instance of anything

**Give quantifiers the most attention.** They assert over cases, and a claim over cases is only true
if someone enumerated them — including the exceptions, which are exactly what a summary leaves out.

## Claims you cannot run

Some sentences have no case to produce. They need a different discipline, not an exemption.

- **A `because` is an inference, not an observation.** It can follow perfectly from the design and
  still be false about the code. Cite the line that implements it, or drop the clause and keep the
  description.
- **Do not repair a false claim by negating it.** The negation of a false claim is a different false
  claim. State what is true, which is usually neither.
- **Scope the claim to what the evidence establishes.** What a tool _said_ is not what is _true_ of
  the tool; what one run _showed_ is not what the code _guarantees_.

## When the case cannot be produced

**Delete the sentence.** Do not hedge it or write a weaker version that survives by saying less. A
missing sentence is visibly missing. An unverified one reads exactly like a verified one, which is
the whole problem.

## What this does not catch

- **A claim that is true when written and goes stale later.** This makes a sentence true once;
  keeping it true needs a gate.
- **A claim about what the code should do.** Producing the case tells you what it does.
- **A true sentence that is in the wrong place or that a reader cannot act on** — see
  [`prose-cold-read`](../prose-cold-read/SKILL.md).
