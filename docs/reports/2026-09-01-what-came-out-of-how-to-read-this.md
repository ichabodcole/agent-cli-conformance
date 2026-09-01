---
type: report
generated: { by: claude-opus-5, at: 2026-09-01 }
status: draft
lifecycle: live
description:
  Every passage removed from STANDARD.md's "How to read this" in the first pass of separating the
  standard from the story of how it was arrived at. Each is kept verbatim with its original line
  numbers, and classified by whether a reason survived the story or the story was the only
  justification there was.
tags: [documentation, method, evidence]
subject:
  the provenance narrative removed from STANDARD.md § How to read this, and what of it is worth a
  home
examined:
  STANDARD.md lines 11-173 at commit e96419a on branch docs/the-bounds-the-consumers-named
---

# What came out of "How to read this"

**This file is a holding pen, not an argument.** It exists so a cut is reversible by reading one
document, and so the second pass — deciding what deserves a permanent home — can be done against
the whole set rather than passage by passage while editing.

## Why the cut was made

`STANDARD.md` is the guidance, and its reader is someone deciding how their CLI should behave.
A recommendation, the reason it is right, and a citation for any measured claim all change what
that reader does. The story of how the project came to hold the reason does not. It reads as
validation and costs the page length, and the artifacts it retells already exist and are already
linked.

**The test applied to every passage:** would a reader who skipped this do anything differently?

**The classification applied to every removal**, because the point of the exercise is not to cut
but to find out whether a reason exists underneath:

- **reason stated** — the justification survives the story and is now one sentence on the page
- **evidence only** — a measurement or citation with no reason to state; compressed to a citation
- **no reason found** — the narrative was the justification. Recorded rather than papered over
- **scope statement** — a declaration of what the project is, not a claim about the world. Needs
  no evidence at all; a link is for whoever disputes where the line falls

## The removals

### R-1 · Why `v0` is defined where it is — L48-50

> The term is defined here rather than where Part 2 first uses it because the first cold reader of
> this page met it in the paragraph above, guessed, and happened to guess right — a wrong guess
> would have carried them through all of Part 1 with nothing to correct it.

**evidence only.** This justifies a placement decision to nobody who needs it. A reader meets the
definition where it is; whether it could have been elsewhere is not their question. Nothing
replaces it.

### R-2 · The glyph-versus-phrases decision record — L63-78

> **That it is phrases and not a glyph was decided rather than defaulted.** A prior round faced the
> same question on a different axis, declined a new mark, and named the concept _"Evidence, not a
> rule"_ instead — a named phrase is self-teaching where a glyph is one more thing to memorise —
> while recording the objection that a population of two was thin, and that the question reopened
> if the axis grew. It grew: the first cold reader of this page reached Part 4 tracking four
> evidentiary classes in prose and deciding per paragraph how much weight to give a number, and
> reported that this page has "a three-mark legend for checkability and nothing equivalent for
> evidentiary status, and the second is now carrying as much load as the first." The precedent
> followed is the one that same round cited in support: `In v0`. **When the three-mark axis does
> not cover something, this page has added an axis or a column and never a mark**, and the reason
> holds harder here than it did there. The marks attach at one predictable place, the end of a
> recommendation, one per section. An evidentiary status attaches to a figure, mid-sentence,
> wherever a figure appears — a glyph there is looked up, three words there are read. Three of the
> four phrases were already on the page verbatim before this legend existed, which is the strongest
> evidence available that they teach themselves. **What would reopen it:** a figure whose status is
> genuinely none of these four, or a section where the phrases have to be restated so often that
> they stop reading as prose.

**reason stated, and it needed no evidence at all.** Sixteen lines reduce to one sentence that is
true on its face: a glyph mid-sentence is looked up, three words are read. The page's own legend
already has the honest label for a claim of that kind — **a judgement, not a measurement** — so
stating it costs no sourcing rail and no trail.

**This is the passage with something worth keeping, and it is not the story.** Two things in it
serve the person who _extends_ this page rather than the person who reads it:

- **why phrases rather than a glyph** — the reasoning above, which stands alone;
- **when another axis may be added** — the sentence beginning _"What would reopen it"_, which is a
  writing rule and the only guidance anywhere on when this page may grow a new axis.

Both belong in a `decision` page. The wiki's `decision` type takes **Context · Decision · Rationale
· Consequences · What would change our mind**, and the reopening sentence is already written in
that idiom. Recommended for the second pass:
`docs/wiki/decisions/evidentiary-status-is-phrases-not-a-glyph.md`.

What does **not** need to survive the move: which prior round faced the question, what the
population of two was, that the axis grew, which cold reader reported it, and what they said.

### R-3 · How the two-reader distinction came to be drawn — L116-119

> The distinction was not drawn until a second adopter, briefed to reach L0 and routed here, worked
> through all three steps below before finding that none of them moved their verdict — because the
> census and the emitter are drift work and their brief was not. The quote below is the tell and it
> is three sentences in: its author had _"run the checker twice"_ before reading this page.

**no reason found, and the routing does not need one.** The two-reader routing immediately above it
is operative on its own: it tells a reader which of two states they are in and where to go. This
passage explains why somebody thought to write that routing, which is a fact about the project's
history. Nothing replaces it.

### R-4 · Who found the reading-order defect, and their quote — L122-131

> That is a defect a reader found and this section is the repair, in their ordering rather than in
> one invented for the fix. The adopter behind anthill — the CLI the drift trial below measured —
> read this page for the first time having run the checker twice, and reported:
>
> > I do not know what to do first… the v0 emitter, the census, the envelope work and the exit-code
> > mapping are argued at the same pitch and in reading order rather than in dependency order. A
> > retrofit reader wants a first move, a second, and a "not until X". The Fig post-mortem tells me
> > what happens if I do nothing; it does not tell me what to do on Monday.
>
> They then answered it against their own tool, and their reasons are the ones attached below.

**reason stated, and it was inside the quotation.** _"A retrofit reader wants a first move, a
second, and a 'not until X'"_ is the reason the ordering exists, and it is true whoever said it. It
is now on the page as the project's own sentence rather than as testimony, which is shorter and
asserts the same thing. The sentence that survives unchanged is the warning a reader acts on: the
rest of the page is in reading order, not dependency order.

### R-5 · The provenance of the census-first claim — L137-148

> Their reason for putting it first is a measurement of their own tool rather than an argument —
> the census caught a live defect in anthill that **two full `acc check` runs had missed, because
> both probed the root and the defect lives below it**. The two runs are theirs: [the first-contact
> trial], and their re-run against `v0.1.0`, which has no report of its own — it is message 8 of
> the `acc-trial-anthill` channel, recorded in [the runway plan]. Neither ran `--declaration`.
> **This attribution was wrong when first published — it named the eight-CLI run, which is not
> theirs and which they never ran — and was corrected by them**; the defect is [DT-2], eight flags
> the same binary publishes and refuses. The drift trial's own record of the kit's contribution
> says the same thing from the other side: it [found none of the eight findings and could not have].

**evidence only, and one clause of it was a correction record.** The load-bearing fact is that a
census reaches below the root where the kit's own checking did not, and one citation carries it.
Removed with nothing replacing them: which two runs, that one lives in a channel message rather
than a report, that neither ran `--declaration`, the second corroborating link, and — the clearest
case in the section — **the record of this page having published a wrong attribution and been
corrected.** That documents an error in an earlier draft of the page, to a reader who never saw it.

### R-6 · The provenance of the emitter figures — L153-161

> …because the only path that does compare is the root, which their manifest has no slot for
> ([DT-1]), and the summary names it on a clause of its own rather than counting it toward the 25.
> **That `0` is a figure about the kit's root-only probing, not a ceiling on the emitter**: […]
> The qualifier is theirs to ask for and the correction is theirs: they cited the bare number in
> the cold read this ordering came from, and it was adopted here on their say-so.

**evidence only.** The contingency argument is the reason and it survives untouched: an emitter
written before you have below-root evidence buys a report about what could not be compared. The
two figures are kept as a compressed citation because they are what makes the contingency concrete.
The attribution bookkeeping — who asked for the qualifier, that it was adopted on their say-so — is
removed.

### R-7 · The census scaffolding around the scope boundary — L89-101

> That boundary was found by reading a record rather than chosen from taste. […] Of the 201 of
> those commits that iterate on something already built, 77 were a capability that had never been
> there.

**evidence only.** The blockquote stating the general-versus-domain-specific distinction is the
reason and is kept verbatim, as are the three figures that make the boundary concrete. What went is
the framing that the boundary was "found by reading a record rather than chosen from taste" — a
claim about how the project reached a position, not about whether the position is right — and the
intermediate 201 that only exists to get from 298 to 77.

### R-8 · The evidence under the scope boundary — the 298-commit census

> The axis deciding what any external check can reach is **not** defect against missing feature —
> it is **general against domain-specific** ([research], whose own classifications are marked as
> judgements):
>
> > A kit can catch a **missing general affordance** — `--version`, a machine-mode error envelope,
> > an exit-code taxonomy. It can never catch a **missing domain capability** — `reap`, `roll`,
> > addressed delivery, session rotation — whether or not anything was built wrongly.
>
> Measured over a census of 298 CLI-source commits across two repositories: of the 77 capabilities
> that had never been there, **34 were general affordances** — the ones this page is about — and 41
> were domain capabilities, which are yours.

**scope statement, and this is the category the first pass missed.** "This page does not cover
domain design" is not a claim about the world that a census makes true or false. It is a statement
of what the project is, and it is settled by the project saying it. The first pass kept the figures
on the reasoning that they made the boundary concrete; the owner's correction is that the reader
does not need the boundary made concrete, they need to know where it is.

Removing the figures then exposed a second defect the figures had been hiding: **the blockquote
restates the paragraph above it.** `reap`, `roll`, addressed delivery and session rotation against
the opening paragraph's `reap` verb, delivery and resource model — the same distinction, in
somebody else's words. And "whose own classifications are marked as judgements" was a sourcing
qualifier attached to numbers that are no longer cited.

Fifteen lines became four. What stands is the scope statement, where the line falls, and one link
for anyone who wants to argue about the placement.

**The rule this adds for the rest of the pass:** before asking whether a passage's reason survives
its story, ask whether the passage needed a reason. A definition does not.

### R-9 · The section's lead preamble

> **Two readers arrive here and this section is written for the second one.**

**no reason needed.** A preamble to a two-item list, where the two items say which reader they are
for. Nothing replaces it.

### R-10 · The census anecdote — item 1

> It also reaches where the kit does not: a census caught a live defect that two full `acc check`
> runs had missed, because both probed the root and the defect lived below it ([DT-2], eight flags
> the same binary publishes and refuses).

**reason stated, and the evidence was decoration.** Why the census goes first is already carried by
three reasons in the sentence before it — cheap, needs nothing from this project, needs no
declaration. Reach is a fourth reason and it is structural rather than empirical: the kit probes
the root only and a census reads every command path, which is true of the tools and not of one
occasion. The anecdote was the most persuasive line in the section and it was still decoration.

**The rule this adds:** once the reason is established, further evidence is not more reason. It is
a cherry on top, and a page made of cherries is the thing this pass exists to remove.

### R-11 · Item 2's duplicated reason, and the figures between the copies

> Contingent, because an emitter **alone — with nothing recorded below the root** — is only checked
> where the kit can already reach. On one real tool that was `0 of 25` declared command paths
> compared; with the census's own captures handed back as a [recorded-surface batch], the same tool
> compares [`23 of 26`].

**evidence only, propping up a sentence that was already said.** The claim "an emitter is only
checked where the kit can reach" and the claim "an emitter written before you have below-root
evidence buys a report about what could not be compared" are the same claim. The second is better
prose and stands alone. The figures sat between the two copies.

**Third instance of the same structural finding**, after R-8's blockquote and the `usage diff`
survey in Part 1: narrative or evidence placed between two statements of one claim stops a reader —
and a writer — noticing they are the same claim. Removing the middle is what makes the duplication
visible.

## What the second pass has to decide

1. **Does `R-2` get a `decision` page?** It is the only removal carrying guidance for a maintainer,
   and the only one whose content exists nowhere else. Everything else here is retelling of
   artifacts that are still in the tree and still linked from the page.
2. **Is this file worth keeping once that is done?** If `R-2` graduates and the rest is judged to
   be duplicate, this document's remaining value is as a record that the cut happened and what it
   removed — which is what a report is for, and may be enough.

## What this pass did not do

- **It did not touch any other section.** `How to read this` is one of two large sections; the
  same pass over the rest is unstarted, and the ratio found here (roughly a third) should not be
  assumed to hold elsewhere.
- **It did not verify that every removed passage is fully carried by the artifact it cites.** The
  claim that the reports and research notes already hold these stories was checked for `R-5` and
  `R-7` and taken on the strength of the existing links for the others.
