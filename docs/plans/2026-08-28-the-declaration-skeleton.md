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

## THE QUESTION UPSTREAM OF ALL THREE OPTIONS

Found in the second review round, and it reorders the document:

> **Do you regenerate your path list from dispatch on every run, or write it once and commit it?**

Nobody here knows, and it decides more than the skeleton. `paths.json` is a hand-derivation
frozen the moment it is written; the recorded batch descends from it; a declaration built on it
descends from it too. So a verb added to dispatch after the list was frozen is in no document —
and **a path named in no document is in no iteration**. Measured on the census loop, which
iterates declared paths ∪ recorded paths:

    declaration stale, batch still covers the path  ->  CAUGHT — 15 disagreements, and the
                                                        undeclared paths named explicitly
    declaration AND batch both stale                ->  NOTHING. No finding, no NOT COMPARED,
                                                        no count.

The second is the adopter's own shape. **The drift the kit can detect is the one this workflow
cannot produce; the drift it cannot detect is the one the adopter found by hand.**

If the list is a build artifact, this dissolves for every option below. If it is a committed file,
every option below degrades — including the comparison, whose recorded paths descend from the same
frozen list.

## THE DIVISION OF LABOUR — the sentence the options were missing

The two sides of the comparison **do not age together**, and that asymmetry organises everything
below. The recorded path set descends from `paths.json` and freezes with it. The advertised verb
set does not: `surface.nonFlagCandidates` is captured from the root probe on **every check run** —
verified from a plain `acc check <target> --json` with no batch, no declaration and no path list
in the invocation. It is live evidence, not a document.

> **The comparison covers the ADVERTISED side freshly, because one of its sides is live evidence
> rather than a document; only the emitter — or regeneration, which is the same discipline applied
> to the path list — covers the DISPATCH side. Neither alone covers both halves of drift.**

So the pair is coherent rather than redundant, and this isolates the skeleton without needing to
settle whether it falls under trellis's never: **it adds a third document to the chain while
covering neither side.**

It also narrows what the upstream question decides. If the adopter regenerates, everything
sharpens. If they commit, the comparison still catches usage-side drift and batch staleness
forever, and what remains is dispatch-side blindness — which only regeneration or an emitter was
ever going to close.

## The three options, standing separately

Sorted by a criterion from the review rather than by preference: **a tool survives trellis's
never if its output is an ASSERTION; it fails if its output is an ARTEFACT THE ADOPTER COMMITS.**
A finding is recomputed from evidence every run and, if stale, is simply absent. A file in their
repository drifts by existing.

### A. The inspection technique, as guidance — no tool at all

Three read-only steps: enumerate paths from the dispatch you have, read your own usage line, diff.
**This already produced the finding** — the adopter performed it with no `acc` feature involved,
and it is the most valuable result of three trials. The counterfactual is not a guess.

The registry guide teaches the adjacent CONSTRUCTION act (write the table, make the parser read
it) and not this INSPECTION act. One adopter in three did it unprompted, which is the evidence
that it is not what any agent does anyway.

**What it does not do:** make the finding land in an artifact the kit reads — which is literally
what was asked. Guidance answers _"how would I find this again"_; the ask was _"how does what I
found become checkable"_. Both real, not the same want.

### B. The advertised-verbs comparison — a tool whose output is an assertion

`surface.nonFlagCandidates` already records the root's advertised verb set. Diff it against the
**batch's recorded path set** — no declaration, no `paths.json` at read time, no hand-authoring
anywhere — and state both directions: _advertised at the root but never recorded_, and _recorded
but never advertised_. That second one is the adopter's exact discovery, named by the kit, from
artifacts their workflow already produces.

**Unpriced**, and honestly so: it needs the full set rather than `surface.ts`'s four-member
sample, and a rule for when a non-flag list may be read as verbs — a `choices` list is not always
a verb list. It also inherits the staleness above, so its sharpness depends on the upstream
question.

### C. The emitter worked example — guidance that closes `args` by construction

The registry guide already argues that the remediation the census recommends is the same work
that makes a declaration emittable, so that _the expensive artifact stops being an artifact at
all_. It does not demonstrate it. A worked example — table to declaration, programmatically —
closes `args` by construction rather than by attestation, and repairs the guidance gap and the
tooling gap with one change.

### D. The skeleton, kept last and not recommended

Emits a file the adopter commits with a region only a human can fill. Both reviews found against
it, from different directions:

- It makes `provenance: "modelled"` the default path for the population **least in need of it** —
  anyone who can write `paths.json` has a dispatch table, and anyone with a dispatch table is a
  short walk from an emitter. It points them away from their best move.
- `paths.json` is itself a hand-derived parallel artifact, so the skeleton **does not create the
  disease — it durably commits an ephemeral case of it**.
- Measured: an empty skeleton produces 104 `accepted-not-declared` findings on one real 32-path
  tool, every one an artefact of the skeleton being empty.
- And the defence that rescues it — regenerate `paths.json` each run — **is the emitter**, which
  does not need the skeleton.

It survives only as a knowing third choice for an adopter who wants a modelled declaration and
accepts what that word means.

## Where the reviewers did NOT converge, kept open

On whether the skeleton falls under trellis's never: one holds it is not categorical, because a
declaration is the one parallel document this kit exists to diff against reality — with the
weakness that the check costs a recording session nobody spends. The other holds the categorical
defence has a measured hole in the adopter's own direction, per the blindness above. **Both
readings are on the table**, and the adopter's answer to the upstream question is what decides
between them.

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

---

# Appendix: costing option B

The adopter's answer was _"B first and alone is enough for us"_, so this prices it. Measured
against the tree, not estimated.

## Where it runs, and it already has a home

`buildReport` joins the two sides in one scope: the live root `surface`, and — when a batch was
supplied — `recorded.reading.surfaces`, each carrying a `path`. That is the join point, and it is
the same place the census and the recorded-surface rollup are already assembled. **No new command,
no new file, no new input.**

It runs only when a batch is supplied. With no batch there is no recorded path set and the
comparison has nothing to be a comparison of.

## The one real obstacle, and it is a guard doing its job

The advertised set reaches that scope **already truncated**. `captureSurface` holds the full list
locally and stores `sample: values.slice(0, SAMPLE)` with `SAMPLE = 4`, plus a true `count`. The
bound is deliberate and tested:

    surface.test.ts:497  "the sample is bounded — a pathological list cannot grow the
                          report without limit"

and its reason is stated in the field's own doc: _the members are the TARGET's bytes and the list
has no length limit of its own._ So B needs precisely what a tested guard exists to prevent.

**The resolution is that B does not need the full set in the PAYLOAD — it needs it in MEMORY.**
The comparison consumes the list where it is captured-and-joined and emits only the outcome. The
serialized `sample`/`count` shape can stay exactly as it is, and the existing guard keeps holding.

Cost: carry the full list on the in-memory surface without serializing it, or thread it to the
join point. Small, and the test that pins the payload bound is the thing that tells you if you got
it wrong.

## The finding needs its own bound, for the same reason

`recorded but never advertised` is bounded by the batch, which the caller controls. **`advertised
but never recorded` is target bytes and is not bounded by anything.** A target emitting a
thousand-member list produces a thousand-member finding unless the finding samples too.

So the finding carries a sample and a true count, exactly as the field it derives from does. That
is not an inconvenience — it is the same argument applied one layer out, and skipping it would
reintroduce the defect the guard was written for.

## The part no code costs: when may a list be read as verbs?

`nonFlagCandidates` records _a set of something else, not of flags_. Reading it as **verbs**
requires a rule this project does not have. The strong case is narrow and worth stating as the
whole of it:

- the list appears **at the root**, and
- it appears in the target's **rejection of an unknown verb** — the place a tool enumerates what it
  would have accepted.

Outside that, a `choices` list may be a set of formats, levels, or anything else. **The kit
currently records the key** (`choices`, and whatever else a target uses) **and nothing more**, so
the rule cannot be inferred from the data; it has to be decided and stated, and the finding must
carry both readings the way the census already hedges provenance.

This is the item to resolve before anyone writes code. It is a judgement, not a measurement, and
it is where B can quietly become wrong.

## What it costs in total

| piece                                                | size                                     |
| ---------------------------------------------------- | ---------------------------------------- |
| thread the full list to the join point               | small; existing bound test guards it     |
| the diff, both directions, at `buildReport`          | small; both inputs already in scope      |
| bound and sample the finding                         | small; mirrors the existing field        |
| a text line and a JSON field                         | small                                    |
| **the rule for reading a list as verbs**             | **the actual work, and it is judgement** |
| tests: both directions, the bound, the no-batch case | ordinary                                 |

## What it still cannot do, carried from the body of this document

The recorded side descends from the caller's path list. B covers the **advertised** side freshly,
because that side is captured live from the root probe on every run. **Only regeneration or an
emitter covers the dispatch side.** The adopter regenerates, so for them both halves are covered —
that is a property of their workflow, not of B, and the guidance in the registry guide is what
carries it to anyone else.

## Appendix B2: the adopter's answers, and the defect they caught

The costing above went to the adopter who asked for B. Four answers, and the first would have made
B miss the finding it exists to reproduce.

### The rule's LOCATION is right; its SHAPE was too narrow

Root plus unknown-verb rejection is where these tools enumerate. But **the advertised set has two
shapes in one fleet**, and the costing only saw one:

- **Retrofitted tools** answer an unknown verb with a JSON envelope whose `choices` array is the
  verb set. This is what `nonFlagCandidates` reads today.
- **Legacy tools** — including the one whose drift motivated this whole thread — advertise only as
  a pipe-delimited usage string on stderr: `usage: cli.ts <open|state|tail|…>`.

Measured on a two-line fixture emitting exactly that string:

    nonFlagCandidates: (absent)      status: not-enumerated

`nonFlagSetsIn` returns nothing unless the **whole stream** parses as JSON. So B, as costed, would
have reported an empty advertised set on exactly the un-retrofitted tools where the drift lives.
**The adopter's own words: it "would have missed the finding it exists to reproduce."**

So the parse widens to both forms at the same location. It does **not** chase `--help` bodies or
JSON manifests — _"a manifest-advertised set is what a declaration is for, and you already compare
those."_

### Both directions, but they are not the same kind of statement

- **`recorded but never advertised`** is the discovery and the defect-shaped one.
- **`advertised but never recorded`** is coverage information. For a deliberately partial batch it
  is the expected state, so **it must never read as an accusation** — phrase it _"not covered by
  this batch"_, never _"missing"_. Keep it anyway: it is the only line that can flag a usage string
  naming a verb that no longer exists, since nobody records a path they do not believe in.

### Sampling does not serve this finding

The costing proposed inheriting the four-member sample. The adopter rejected it, and the reason is
about what the reader does next: the action on a verb-set disagreement is _go add THESE to help_,
so four names and a count means re-running the diff by hand — **the tool saying what it did while
withholding what it found.**

Verb sets are small in practice — the finding that started this was three; a large tool is dozens,
never the pathological hundreds the flag bound guards against. So: **full list to a sane cap (32
covers every tool in that fleet), sample-plus-count past it, and the full list always in the JSON
even if the text line samples**, because the JSON is where a script picks up the work list.

### Evidence, not a rule — and not yet a rule id

A text line in the census block plus a JSON field, under this project's existing _evidence, not a
rule_ banner. The adopter's argument for it is stronger than ours: **the recorded side is
caller-attested, and nothing gate-failing should rest on bytes the kit did not observe itself.**

If a rule id is ever wanted, only `recorded but never advertised` could carry one, and only when
someone asks with a batch in hand. Their own plan is to gate it themselves by grepping the JSON
field in CI — _"the adopter opts into the gate, the kit stays evidence."_

### What this does to the cost

The judgement item is settled — the rule is location-based and shape-plural. In its place is a
small parse job with a real risk of its own: an angle-bracketed blob is not always a verb list, and
a second parser is a second place to be wrong. That risk did not exist in the costing above,
because the costing could not see the shape.

## Appendix B3: implementation risk, from two independent reviews

Briefed as implementation risk only — the adopter's four answers are settled and none of this
reopens one.

### We already refused this, in writing, in the function B would widen

`nonFlagSetsIn`'s own doc comment:

> Only JSON documents are read. A prose near-miss would need the same enumerating-phrase heuristic
> the prose path uses, and **guessing which prose list is "a set of something else" is exactly the
> inference this capture refuses to make.**

So widening the parse **reverses a documented decision** and has to beat the recorded reason rather
than tiptoe around it. A reader six months out finds the comment and the widening and cannot tell
which is current. Whatever ships must resolve that comment, not sit beside it.

And the defence that works for flags does not transfer: the prose path for flags carries a marker
**and** a member-shape test, and the shape test is what makes it safe, because `isFlag` is
unambiguous. **There is no `isVerb`** — `open` and `file` are the same lexical object. That is
precisely why the refusal exists, and no cleverer regex fixes it.

### The asymmetry that inverts the safe default

**A false negative in the parser becomes a false positive in the finding.** If the advertised set
reads as EMPTY, every recorded path becomes _recorded but never advertised_ — a wall of findings
about our reader, dressed as findings about the adopter's tool. That is the same 104 measured on
the empty declaration, in a new place.

So **"refuse when unsure" is the loud choice here, not the conservative one.** The design must
carry the distinction the census already draws:

    advertised set NOT READABLE   ≠   advertised set EMPTY

and it must **reuse** the existing honesty case rather than reimplement it — `declaration.ts`
already renders _"a target that did not enumerate has not agreed with anything; it has said
nothing, and the diff did not happen."_ No readable verb set means the comparison **did not run**,
and says so.

**Build this first.** It is the clause that turns a parser bug into a fleet-wide accusation if it
lands last.

### Discrimination comes from provenance, not from shape

Read the blob **only from the unknown-verb rejection's stream** — never from `--help`, never from
arbitrary prose. That makes the legacy reader the structural twin of the one we have, since
`nonFlagCandidates` reads `choices` out of a rejection too, and it inherits guards already written:
the echo guard, and the exclusion of timed-out, crashed and **truncated** captures — which matters
more here than for flags, because a usage line cut mid-blob yields a verb set short by an
unknowable number.

The narrowing stack, cheapest refusals first:

1. only a line matching `^usage[:\s]`;
2. only the **first** angle-bracket group after the program token, so
   `usage: cli <open|state> <file>` never contributes `file`;
3. at least two members — kills every singleton metavariable;
4. every member token-shaped — kills `<FILE>`, `<key=value>`;
5. what survives and still is not a verb list is the two-member type union (`<name|id>`), which no
   lexical rule can separate from a two-verb tool. **The last discriminator is evidence, not
   shape:** when a batch is present, require a majority of members to match recorded paths before
   asserting the blob. Otherwise render hedged.

**Boundary to hold in the code:** recorded paths **confirm** the blob, never **construct** it. The
members come from the usage line alone, so the freshness property survives.

### The ellipsis, found inside the adopter's own quoted string

`usage: cli.ts <open|state|tail|…>` — **the ellipsis is a member of the blob.** An ellipsis is the
usage line declaring its own set OPEN, and _recorded but never advertised_ cannot be asserted from
a list that says it is incomplete: the verb may live in the elided tail.

So `…`/`...` is a **marker, not a member** — dropped from the set, carried as an `open` flag, and
the finding renders _"not among the N verbs the usage line names (the line marks its list open with
…)"_ instead of a flat accusation.

Nobody had seen this. We built a fixture from the adopter's line, **dropped the ellipsis without
noticing**, measured a clean result, and would have shipped a parse reading `...` as a fifth verb.
Whether it is literal in their tool or shorthand in their message is asked and unanswered; the
answer decides whether open-set rendering is the main path or an edge.

### The home, and where a second one would appear

A **new** surface field, not a widening of `nonFlagCandidates` — whose contract is diagnostic
(rejected sets, sampled for a report line) where B needs the opposite: full list, an interpretation
(_this IS the advertised set_), a shape provenance (`envelope-choices` | `usage-line`), and the
open flag. Overloading one field with both contracts is how sample-vs-full and
diagnostic-vs-assertion end up disagreeing inside one structure.

⚠ **The second home already exists in outline.** `recorded.ts`'s `readings[].nonFlagKeys` carries
**keys only, no values**, and `report.ts` maps it from the surface. If B needs advertised values
per path, widening that is a second edit in a second file — the exact shape of the `surfaceFrom`
defect: one construction, two homes, six green unit tests, unchanged end-to-end output. **Derive
the advertised set once, in `surface.ts`, and have the census read it.** If B parses a stream
anywhere outside that one pass, the bug has arrived.

### The bound: the adopter is right, but not for their reason

Relaxing `SAMPLE = 4` to a 32-cap does not break the invariant the test names — a bound is a bound
and only the constant moved. The test should be rewritten to assert the surviving invariant (text
bounded, `count` always present) rather than the literal `4`.

What actually relaxes is **full list always in the JSON**, which removes the bound entirely — and
the guard's stated reason (_the members are the TARGET's bytes and the list has no length limit of
its own_) is untouched by "verb sets are small". Small is the typical case; the guard was for the
adversarial one.

It is still sound, by an existing mechanism rather than an assumption: streams are capped at
`MAX_STREAM_BYTES`, and `report.ts` **already documents leaning on exactly that** for `args`, in
the same words — _"bounded only by `MAX_STREAM_BYTES`… it is written down because 'argv is small'
is an assumption a reader would otherwise make."_ B is the second user of a documented reliance,
not a new exception, and the field's comment should say so.

### One state the costing missed

**A check with no batch at all.** The advertised side is captured live on every plain check, so the
field populates when there is nothing to compare against. Render that named — _"advertised set
captured (N verbs, usage-line shape); no recorded surfaces in this run, so no comparison was
made"_ — because omitting the field when there is no batch makes a missing thing render as an
absent thing, and this project has a defect class named after that.

### Build order

1. the honesty case (not-readable ≠ empty)
2. the provenance restriction (rejection stream only)
3. the narrowing stack, including the ellipsis marker
4. the bound, with the transitive-cap comment
