---
type: report
generated: { by: claude-opus-5, at: 2026-09-01 }
status: draft
lifecycle: live
description:
  Every passage removed from STANDARD.md while separating the standard from the argument for the
  standard, section by section. Each is kept verbatim with its original line numbers and classified
  by whether a reason survived the story, the passage needed no reason, or the story was the only
  justification there was.
tags: [documentation, method, evidence]
subject:
  the provenance narrative removed from STANDARD.md, and what of it is worth a permanent home
examined:
  STANDARD.md lines 11-173 at commit e96419a on branch docs/the-bounds-the-consumers-named
---

# What came out of the standard

**This file is a holding pen, not an argument.** It exists so a cut is reversible by reading one
document, and so the second pass — deciding what deserves a permanent home — can be done against
the whole set rather than passage by passage while editing.

## The principle

**The standard is the declaration, not the argument for the declaration.** Its reader — often an
agent that has just been handed the kit and wants to know what it is being asked to do — spends
attention on every line, and a line that does not change what they build is a line that cost them
something for nothing.

So the page states what to do and why, and the why is a **synthesis** — one or two sentences that
stand on their own — rather than the case that produced it. The surveys, trials, censuses and
adopter findings that led to a recommendation stay in the reports and research notes, linked for
anyone who wants them. They are the about page, not the product.

Two consequences worth stating, because both are deliberate:

- **The page becomes asserted where it used to argue.** Its contract still holds — every
  recommendation carries its reason — because the reason survives. What goes is the case for the
  reason.
- **Nothing is deleted from the project.** Every passage removed is verbatim below, and every
  artifact it retold is still in the tree and still linked from the page.

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

## Part 1 § 3 — Check it against the running tool

### R-12 · The whole case for the section's own recommendation — 62 lines to 12

The section opened _"This is the finding, and it is argued rather than asserted"_ and then argued
it: that nothing else probes a running tool and falsifies what it declares, that the one exception
had 10 stars and a 0-star reference implementation, what Azure's `azdev latest-index verify` does
and why it answers a different question, how the trial target was chosen to be the strongest form
of the bet, and eight findings across three classes with their `DT-` ids and worked detail.

**reason stated, and the reason was never empirical.** What the section tells a reader to do is
_check the declaration against the running tool_. The reason is **there is no test you can write
against a field your type does not have** — true by inspection, needing no trial to believe. Sixty
lines were not establishing it. They were demonstrating that the failure occurs in practice, which
is a report's job, and the report has it: `DT-1` through `DT-10` are all in the drift trial, and the
survey material appears seventeen times in the research note.

What survives is the recommendation, the reason, the one distinction a reader acts on — a
regenerate-and-compare gate answers whether the copy is current, never whether it was ever right —
and a single measured clause, kept deliberately against the rule because it answers the one
objection the reason invites: _how often does this actually bite?_ One stale, seven not.

Deliberately not kept, and all of it recoverable through the links that remain: the novelty claim,
which is positioning rather than a reason and which `CHARTER.md` already makes; the `azdev` and
`clispec` attributions; the trial's methodology; and the eight findings in detail — including the
best sentence in the section, that **the same binary publishes the flag and refuses it**.

**This is the section where the page argued hardest, so it is where the change of character is
most visible.** Nothing about the recommendation is weaker for it. The argument moved; it did not
end.

## Part 1 §§ 1-2 — Emit it at runtime, Generate it from what implements the behaviour

Both sections already had the right skeleton — **Recommendation**, then **Why** — and in both the
Why had grown a case study. 121 non-blank lines to 73.

### R-13 · The Fig post-mortem, and the survey blockquote behind it — §1

> Fig is the post-mortem worth reading in full […] 25,218 stars, 735 spec directories, and a CI
> pipeline that ran `build`, `lint`, `typecheck` — **type-checking the documents, and never probing
> a real binary.** The collection is a zombie now, `fig.io` returns 503, and the npm packages still
> serve tens of thousands of downloads a month against specs nobody has touched since May 2025.

**reason stated.** A description that lives beside the tool has nothing binding it to the tool, so
it drifts. That is structural and needs no corpse. The survey finding folded into the same
sentence; the post-mortem is a click away for anyone who wants the cautionary tale.

### R-14 · Four evidence blocks that supported requirements already stated — §1

The `oclif.manifest.json` staleness example, the three named implementations under **Practical
shape**, `clispec-cli` sanitising `HOME`, anthill's identification under **it must be listed in
itself**, and the nine-line eight-CLI measurement under **it must not be the only machine surface**.

**evidence only.** Every requirement and every reason survives. Two got better for losing their
example: "a caller holding the declaration and nothing else cannot rediscover the door it came
through" no longer needs a named tool, and "a document missing the fields the caller needs is worse
than prose, because it parses" is the general form of what the eight-CLI run measured once.

### R-15 · The grapevine flag-scope block — §2, and the largest single removal in either section

Twenty-six lines: that the first outside application of the page hit this as its opening design
question, the implementer's verbatim quote about `--as`/`--from`, and **24 flags moved per-verb,
identity stayed global, all 107 pre-existing tests passed unmodified** — marked _as reported and not
independently verified_.

**reason stated, and the measurement was answering a question the rule does not raise.** The rule is
one sentence and it was already bolded: a flag is global because the tool's own shipped instructions
to its callers make it global. The warning underneath is actionable and kept in one clause — moving
flags per-verb is a breaking change, because accepted-and-ignored flags become errors. The numbers
showed it went safely once on one tool, which is not why it is safe on yours.

### R-16 · The page citing itself as an authority — §2

> `acc` — this repository's own kit, and the reference implementation of the spec — states the rule
> in one line of its `schema.ts`, and it is the sentence to steal:

**reason stated, and the framing was the only thing removed.** The sentence is the best in the
section and is now the page's own: _a schema maintained separately from the parser is a document
that lies as soon as anyone edits the other._ Where it was first written is not a reason to believe
it. Same shape as R-4.

### R-17 · A forward reference the section 3 cut had falsified

> That is the next section, and it is a measurement rather than a worry.

**not a removal but a repair, recorded because it is the pattern this pass keeps producing.**
Section 3 presented its measurement in detail; after R-12 it carries one clause. A sentence
elsewhere describing that section by its old character had quietly stopped being true, and its bytes
had not moved. Found by re-reading the section this pass had just finished rather than by any check.

## Part 1 § 3's subsections — The cheapest version of "checked", The ceiling, stated honestly

63 non-blank lines to 48.

### R-18 · The spec-to-spec differ passage — the sixth instance of the duplication pattern

> **Note what a spec-to-spec differ is not.** `usage diff` is the closest existing thing to a CLI
> contract differ […] PowerShell's `OutputType` attribute is the one place in mainstream tooling
> where a command declares its output shape, and its own documentation […] _"the value might be
> inaccurate."_ PSScriptAnalyzer has a rule to catch that — statically, by reading source, never by
> running the command. And MCP's official conformance suite […] does **not** check that a tool
> annotated `readOnlyHint: true` is actually read-only.

**evidence only, for a claim the page had already made two subsections earlier.** The reason inside
it — comparing one document against another detects release-over-release regression, never a
declaration that was never right — is the same claim §3 now states in one line about a
regenerate-and-compare gate. Different mechanism, identical conclusion.

Four named tools were carrying one sentence, and the sentence was already written. What replaces
them keeps the generalisation, which is stronger than any of the instances: the gap reappears at
every level it is looked for.

### R-19 · The trial as the source of the census technique

> The trial's highest-yield probe is worth adopting directly. […] > **Make the tool enumerate its
> own surface.** anthill's unknown-flag error names the valid set […]

**reason stated.** The technique was quoted from a trial and attributed to one tool. It is now the
page's own instruction, and it applies to any strict parser. The example string
`Unknown option '--nope'. Valid flags: --format` is kept deliberately: it **defines** what "names
the valid set" means rather than evidencing that it works, which is a different job and one the
reader needs done.

### R-20 · The page's own revision history — "That objection won"

> This page used to say that passing it required the declaration to carry an effects claim and the
> tool to be trustworthy about it, while noting in the same clause that an effects claim nobody
> falsifies is exactly the kind of document the survey found drifting everywhere else. **That
> objection won.**

**no reason needed; this is R-5's class again.** A record of what an earlier draft of this page
said, addressed to a reader who never saw that draft. The position it settled on is the only part
that binds anyone, and it stands without the account of what it replaced: a subject's account of
itself is evidence to test, never a licence to execute it.

The `4 of 25` figure went with it — the paragraph immediately after already said the ceiling is
general rather than one tool's, so the count was an instance of a claim stated generally beside it.

## Part 2 — What the declaration carries, down to "Emit v0"

**64 non-blank lines to 61, and the small number is the result.** This chunk is a field table, two
rules about what a declaration may contain, and a legend explaining the `In v0` column. Reference
material and requirements do not accumulate provenance the way an argument does, so there was little
to take. Recorded because a pass that only reports where it cut a third is a pass nobody can
calibrate against.

### R-21 · Three small removals

- **A lead-in.** _"Three things about that table are worth stating outright."_ The three items are
  bolded and announce themselves.
- **A self-reference.** _"This is the repository's own [if it is not in the config, it is not
  inferred] applied one level down."_ Where a rule was first written is not a reason to follow it;
  the link stays, the framing goes.
- **`DT-4` as a worked case.** The rule now leads — a value list that does not say whether it binds
  is a label, and a checker that treats a label as a constraint manufactures a failure — and the
  mechanism follows it generically: two hint strings, identical declared shape, opposite behaviour,
  no field distinguishing them. No tool named, no counts. The trial link remains.

**Deliberately kept, against the pattern of the earlier sections:** the `ffmpeg` clause under
_"every default is absent"_. It names the specific convention a template would reach for — `--help`
on a tool documenting `-h` and `-help` — which teaches what "falls back to a convention" means
rather than evidencing that it once happened. Same judgement as the `Unknown option '--nope'` string
in R-19.

**Two errors in running this chunk, recorded because the pass should not report only its successes.**
The sizing given before the cut was `55 -> 46`; the real figures are `64 -> 61`, so both the
baseline and the available reduction were wrong. And a scripting slip passed an empty terminator to
the replacement helper, which inserted the new text without removing the old — the page carried a
duplicated paragraph, and the gate passed, because duplication is not a lint failure. Found by
reading the output rather than by any check.

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
