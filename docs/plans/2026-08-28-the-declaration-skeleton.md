---
type: plan
generated: { by: claude-opus-5, at: 2026-08-28 }
status: draft
lifecycle: live
description:
  A design proposal for `acc declare --paths`, which turns a command-path list into a declaration
  skeleton so that drift an adopter finds by hand becomes a finding the kit can read. Written to
  be vetted — first for whether it is sound and not over-built, then by the adopter who asked, for
  whether it answers what they actually wanted.
tags: [adoption, declaration, tooling, proposal]
---

# The declaration skeleton — a design proposal

**This is a proposal, not a plan of record.** Nothing here is decided. It exists to be argued
with on two separate questions, in this order: is the design sound and no bigger than the ask
(internal), and does it answer what was actually asked (the adopter). Either review can send it
back.

## The ask, in the adopter's words

Round 3's central finding (N3). They derived a command-path list from their tool's own dispatch
table, and it surfaced three verbs — `changes`, `delete-batch`, `message` — that their usage line
does not advertise. That is the drift this kit exists to detect, found by an adopter in their own
tool for the first time. Then:

> "I had no declaration, so the most valuable finding of the whole trial lives in my prose, not in
> any artifact the kit reads. A 'declaration skeleton from a path list' generator would have
> caught it structurally."

And the bridge complaint attached to it: step 6's registry guide argues the why, "but the jump
from 'one table' to a formatVersion-0 declaration file is unbridged in what I read".

The adjacent ask, N6, from the same session: "there's no tool-side cross-check; I wanted one while
writing paths.json".

## ⚠ The premise this was written on is FALSE. Measured in review.

The first draft said: "the census that would have turned the adopter's prose into a machine
finding **already exists**". It does not, and the review found it by running the kit rather than
reading it.

`declaration.ts:679-700` is the whole diff the census performs: `declared.args` against
`surface.flags`, **per path**. Nothing anywhere compares the declared PATH SET against the verbs
a tool advertises. So a declaration naming the adopter's three verbs does not turn their finding
into a violation. Measured, with those verbs added to a skeleton for a real 32-path tool:

    32 of 34 declared command paths compared; 104 disagreements
    NOT COMPARED: changes, delete-batch — the caller supplied recorded surfaces and
                  recorded nothing at this path

A reach-limit line, which the report frames as neither violation nor pass. And in the adopter's
real workflow it is worse: their path list DOES contain the three verbs, so the harness records
them, so the census compares them like any other path and reports flag-level agreement there. The
thing that made their discovery interesting — **that the usage line does not advertise them** —
is never asserted by anything.

**The skeleton as proposed is pointed slightly past the ask.** That is the review's phrase and it
is right.

## And the wall of noise is worse than this document estimated

Measured on a fixture already in the repo, an empty skeleton against a real recorded batch:

    empty root against an enumerating fixture        ->    5 accepted-not-declared
    empty args, 32 paths, real recorded batch        ->  104 accepted-not-declared

Every one an artefact of the skeleton being empty. Omitting the root removes the noise only while
there is no evidence below the root — which is to say, only while the skeleton is useless.

## The refusal mechanism has no home in this format

Both reviewers found this independently, and it is a defect in the first draft rather than in the
idea. "Attested fields set to values the reader refuses" was imported from the RECORDED-BATCH
format, which has such a field. `Declaration` has four keys — `formatVersion`, `provenance`,
`selfDescription`, `commands` — and no `completeness`. Measured:

- a marker key is refused as an **unknown key**, deliberately, so the message misdirects;
- a bad `provenance` is refused but complains about provenance, not about unfinished work;
- `selfDescription: null` is **accepted**, and is a positive claim that the tool emits no
  manifest — made on the adopter's behalf, which is the worst of the three.

A new required field is not a cheap fix either: the document reader refuses unknown keys, so
adding one breaks every existing reader and invalidates the output of the only in-the-wild
emitter — the adopter's own.

**The smallest honest mechanism, using only what exists: refuse by omission.** Emit the skeleton
with `provenance` and `selfDescription` ABSENT. Both are required with no default, and the
existing refusal message was already written for this decision — _"Which one decides what a
disagreement means, so there is no default."_ An unedited skeleton then fails loudly, the failure
names the concept the human owes, and no format change happens.

Its stated limit, carried rather than hidden: omission cannot protect `args`. v0 cannot say
"paths known, surface unattested", so once the human fills in `provenance`, an unfilled `args` is
a declaration that lies and census noise is the only detector.

## The smaller thing the review found, which may be the better answer

The advertised verb set is **already recorded**. `acc check <target> --json` carries
`data.surface.nonFlagCandidates` — for `acc` itself:

    [{"key":"choices","sample":["rules","show","path","tags"],"count":10}]

The kit captures the set, labels it not-flag-shaped, and **nothing consumes it**. Comparing that
set against a declared path set IS the adopter's finding — a verb the tool has that the root does
not advertise — and it needs no new verb, no new file and no format change. It would need the
full set rather than the four-member sample (`surface.ts:189`, `SAMPLE = 4`, sized for a report
line rather than for a comparison).

This is not costed and may be wrong. It is here because if the goal is the adopter's finding, the
material is one field away from where it needs to be, and a new verb is not obviously the cheapest
route. **Both options go to the adopter.**

## The proposal

One new read-only verb:

```
acc declare --paths ./paths.json > declaration.json
```

It reads a path list and emits a `formatVersion: "0"` declaration containing exactly those
command paths, with `args` and `positionals` **empty**, and the attested fields set to values the
reader REFUSES.

That is all it does. It runs nothing, reads nothing but the file it is given, and writes to
stdout like everything else here.

### Why paths-only, and no attempt at `args`

`probe-plan` already refuses to guess paths from `--help`, on the argument that a guess produces
records at paths that do not exist. The same argument forbids guessing `args`: a skeleton that
invents flags produces a declaration whose census findings are about the generator rather than
about the tool. The adopter asked for the bridge from a path list they had already derived — not
for the kit to infer their surface.

### Why it must not look finished

Prior art from the probe-plan plan, which settled this for the harness and applies unchanged:

> **The attested fields must refuse to default.** If the skeleton ships with
> `"completeness": "complete"` pre-filled, every adopter attests it without deciding, and the one
> field the guide says only they can answer becomes the one field nobody answered. Emit an
> explicit value that the reader **rejects**, so an unedited harness fails loudly rather than
> lying quietly.

A skeleton that reads as complete is worse than no skeleton: it converts "I have not declared my
surface" into "I have declared it empty", and an empty declaration makes every accepted flag an
`accepted-not-declared` finding — a wall of noise that reads as the tool being wrong.

So an unedited skeleton must **refuse to run**, and the refusal must say which fields the human
owes.

### `provenance` says where the paths came from, and does not overclaim

`provenance` is required. A skeleton's honest value is "these paths were supplied by the caller
from a list they built" — weaker than "derived from the parser", and it should say so rather than
borrow the stronger claim. If the census later disagrees with the declaration, the reader needs to
know the paths were asserted rather than extracted.

## N6, the reality check — deliberately NOT in this proposal

N6 asked for a cross-check while writing `paths.json`. The report guesses it and N3 are
"plausibly one mechanism". **They are not**, and the difference decides the cost:

|                         | N3, the skeleton | N6, the reality check      |
| ----------------------- | ---------------- | -------------------------- |
| input                   | a path list      | a path list                |
| output                  | a declaration    | which paths the target has |
| **executes the target** | **no**           | **yes**                    |

N3 is a pure transform. N6 inherits every safety question `acc check` already carries about
running someone's CLI, plus a new one: a path list is written BEFORE anyone has established the
target is safe to probe.

There is a cheaper form worth considering separately: check the path list against a **recorded
batch** the adopter already has, which executes nothing. Whether that answers N6 or only part of
it is a question for the adopter, not for us.

**This proposal takes N3 only.** N6 is named here so the split is deliberate and visible, not so
it is forgotten.

## What this does not do

- It does not infer, guess, or probe anything.
- It does not make a declaration correct — it makes one **startable**. The adopter still fills in
  args and positionals, which is the work only they can do.
- It does not close N6.
- It does not bridge the registry guide's "one table to a declaration file" gap in PROSE. If the
  verb lands, that guide should point at it — but a document change is not a substitute for the
  bridge, and if the reviewers think the guide alone would have served the adopter, that is a
  finding against this whole proposal and I want to hear it.

## The open questions, as the reviews settled them

Five were left open. Measurement closed four; one is now blocked on a prior decision.

1. **Separate verb, not a flag on `probe-plan`.** Grounded in the spec's own effects axes rather
   than taste: `probe-plan` declares `idempotent`, a skeleton emitter is `read_only`, and a flag
   that swaps a command's entire output artifact makes one command's declared effects cover two
   different acts. Reuse `loadPathList` by exporting it — one home — rather than copying it.
   ⚠ One reviewer would not settle this until the premise question below is settled, because what
   the thing emits may change.
2. **Include the root, `path: []`.** Grounded in the consumer's own emitter, which declares root
   interceptors explicitly and says why: _a generator walking the commands walks past them._ DT-6
   is the measured 25-paths-no-root manifest. A path list will not name the root and the skeleton
   should add it — at the cost measured above, which is that the root is where the noise starts.
3. **The refusal message** is the reader's existing one, under refuse-by-omission. What the
   EMITTER says about the work still owed is a separate hint, and unwritten.
4. **`--out`, not stdout — decided on a measurement, not on preference.** Machine-mode detection
   means `acc declare --paths p > declaration.json` writes an ENVELOPE, and `loadDeclaration`
   does not unwrap envelopes. Measured: a bare declaration is accepted at exit `0`; the same
   document enveloped is refused at exit `2` with _"formatVersion is required and must be a
   string"_ — a misdirection, because the document has one, a level down. Stdout-only would hand
   the obvious first workflow a wrong error on its second command. **And the rule behind it, which is stronger than the
   convention:** this kit reads back exactly two artifacts, already split on this axis —
   `report.json` is written to stdout ENVELOPED and unwrapped by `loadReport`, produced by the
   kit and consumed by the kit with no human in between; a recorded batch is written to a FILE
   and is BARE (`formatVersion`, `records`, `identity` — verified in the fixture). A declaration
   is the third, and every property it has puts it with the batch: bare on disk, produced by
   third-party emitters the kit never runs, edited by a human, committed to their repo, and piped
   in bare by the ecosystem's own idiom (`--declaration <(grapevine schema)`), which would break
   the moment the kit expected an envelope. So: **an artifact the kit reads back and a human
   edits is written to a file, bare; only kit-to-kit artifacts ride the envelope.** That also
   disposes of the unwrap alternative — teaching `loadDeclaration` to unwrap would make the kit
   accept a shape none of its emitters produce, which is a rule with two homes before the first
   has shipped.
5. **Emit `DECLARATION_FORMAT_MAJOR`, never the literal `"0"`.** A generated document carrying a
   version literal is a literal with two homes, and this repo's own lint refuses those in live
   documents — it caught a reviewer writing one the day before.

## ⚠ An unmet prerequisite, recorded because it was skipped

The owner ruled that grapevine's in-house declaration-v0 emitter is **read before this is
designed**. This document was designed without it. Partial mitigation exists — the registry guide
quotes that emitter's load-bearing decisions, and two findings above (the root, the bare-document
idiom) come from those quotes — but a quote in a guide is not the source. The full read folds
naturally into the adopter step, since the adopter owns the emitter.

## Where this stands

Both internal reviews are done and they were independent. They converge: **not bigger than the
ask**, the N3/N6 split is right, and two blocking findings — the refusal mechanism had no home in
the format, and the premise does not hold.

One reviewer conceded the premise half of their own review once the other measured it: _"I
answered 'would prose have served' by accepting the proposal's premise… sextant ran it and the
premise fails."_ What survives is the weakened form both now hold — prose and tool answer
different halves, and **neither mechanizes the adopter's finding**.

Both say this goes back to the author's desk before the adopter sees it, because as first written
it promises something it does not do, and the adopter is the one person guaranteed to notice.

## What goes to the adopter, when it does

Two options, not one, and the measurement that distinguishes them:

- **The skeleton**, as amended — which bridges "a path list" to "a declaration the census reads",
  and does NOT make their verb finding structural.
- **The verb-set comparison**, which is one field away from existing and would assert exactly
  their finding.

And the question the trial protocol's discipline requires: not "is this good", but whether either
answers what they meant. A _"this is bigger than what I wanted"_ remains the most useful answer
this document can get.
