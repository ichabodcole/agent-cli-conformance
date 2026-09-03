---
name: write-from-the-run
description:
  Produce the behaviour before writing the sentence about it. Use when writing or editing any prose
  that states how something behaves — a guide, a README, a doc comment, a skill, a commit message, a
  release note, a report, or a brief you hand another agent. Use whenever a sentence you are about
  to write contains a count, a threshold, a quoted output, a field or status name, or a word like
  every, only, never or "the three". The other prose skills run after the text exists; this one runs
  while it is being written.
---

# Write from the run

Every other prose instrument here reads something already written.
[`guidance-not-argument`](../guidance-not-argument/SKILL.md) compresses a document,
[`repair-chain`](../repair-chain/SKILL.md) repairs a defect,
[`prose-cold-read`](../prose-cold-read/SKILL.md) reads one cold. All of them are downstream of the
moment a false sentence gets written. **This is that moment.**

**The method is one line: produce the case, then write the sentence over its output.** Not the
reverse. A sentence composed first and illustrated afterwards is how two separately true halves
become one impossible whole.

## Why a rule is not enough, and this is a procedure instead

Knowing the hazard does not prevent it. In one change set the writers were told the rule explicitly,
in the brief, and produced ten false statements anyway — because compression is not carelessness, it
is the operation being asked for, and the truth of a system lives in the exceptions a summary exists
to omit.

What worked was requiring an artifact. When each quoted render had to arrive with the command that
produced it, roughly fifteen came back byte-exact under independent check. The failures in that same
wave were exactly the two claims the requirement did not reach: a count embedded in prose, and a
`because`. **The discipline held wherever it was applied and nowhere else**, which is why this is a
procedure and not advice.

## The procedure

1. **Write the claim you intend to make**, in a scratch line. One sentence.
2. **Produce the case.** Run the command, build the input, execute the function. If you cannot say
   what case would demonstrate the claim, that is the finding — stop and say so.
3. **Paste the real output into the draft**, above your sentence.
4. **Write the sentence over what is there**, reading the output as you write rather than from
   memory of what it should say.
5. **Keep the command.** In a report, state it. In a commit message, state it. In a document, keep it
   wherever the project keeps provenance. A claim whose command is lost is a claim nobody can
   re-check.
6. **Delete the pasted output** only if the finished text does not need it.

## What obliges a run

Any one of these in a sentence you are writing:

- a number, count, fraction, threshold, or version
- a quoted output, render, error message, field name, status value, or exit code
- **a quantifier** — `every`, `only`, `never`, `always`, `none`, `both`, `the three`, `the four`
- a definite article standing for a closed set: _the_ sentences, _the_ reasons, _the_ cases
- a claim that two things are the same string, the same shape, or the same behaviour
- a claim that something is the sole instance of anything

Quantifiers are the highest-yield trigger. Measured over one change set, nine of ten false
statements were claims spanning cases, and each sat on top of a threshold or an exclusion; sentences
about a single instantiated case were almost all true.

## Claims you cannot run

Some sentences have no case to produce. They need a different discipline, not an exemption:

- **A `because` is an inference, not an observation.** It can follow perfectly from the design and be
  false about the code. Cite the line that implements it, or delete the clause and keep the
  description.
- **Do not repair a false claim by negating it.** The negation of a false claim is a different false
  claim. State what is true instead, which is usually neither the claim nor its opposite.
- **Scope the claim to what the evidence establishes.** What a tool _said_ is not what is _true_ of
  the tool; what a run _showed_ is not what the code _guarantees_. The gap between those is where
  overclaims live.

## When the case cannot be produced

**Delete the sentence.** Do not hedge it, gesture at it, or write a weaker version that survives
scrutiny by saying less. A missing sentence is honest and a reader can tell it is missing. An
unverified one is indistinguishable from a verified one, which is the entire defect.

## What this does not catch

Say so rather than implying coverage:

- **A claim that is true now and goes stale later.** This makes a sentence true when written; nothing
  here keeps it true. That needs a gate.
- **A claim about what the code should do.** Producing the case tells you what it does.
- **A true sentence in the wrong place**, or one a reader cannot act on. Those are
  [`prose-cold-read`](../prose-cold-read/SKILL.md)'s.

## The shape of the failure, from the inside

The instructive instance is not a careless writer. It is a decision made from a good argument
without producing the case.

A reviewer showed that one key in a recognised set was ambiguous, and the controller ruled it should
be excluded — sound reasoning, correctly following the evidence given. The ruling defeated the
change's own purpose: the adopter artifact the whole change existed to fix used exactly that key,
and excluding it meant shipping a green suite over an unfixed defect. **One command against the
vendored fixture would have shown it.** The argument was good and the sentence was false, which is
the failure this skill exists to prevent.
