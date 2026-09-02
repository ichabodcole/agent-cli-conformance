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

**Length is not the measure.** Every entry below reports a line count because the counts are cheap
to record and easy to check, but a removal earns its place by making the page clearer or truer, not
shorter. Several replacements here run nearly as long as what they replaced — that is a fine
outcome when the reason being preserved needed the room. Where the two have coincided it is a happy
intersection and not the goal, and a pass that started optimising the counter would begin cutting
reasons.

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

## Part 2 § Emit v0, hold the rest

35 non-blank lines to 32. Small again, and for the same reason: most of the section is a
recommendation, the exact key list an implementer writes against, and an honest statement of what is
unbuilt.

### R-22 · The `effects` revision record — the third of its class

> **What that costs this project — and this passage was wrong once, which is the first thing it owes
> you.** It used to name `effects` as the blocker, twice over: the ceiling reached runtime for 4 of
> 25 commands, and Part 4 marked `[—]` on rows said to need a declared read-only claim. It then
> observed that _"probing below the root waits on an effects claim"_ was true but unreachable […]
> **That dependency was asserted on this page and has since been withdrawn.**

**no reason needed.** After R-5's wrong attribution and R-20's _"That objection won"_, this is the
third passage where the standard keeps a diary of its own corrections in its body. The position that
survives is the one that binds anyone: what gets you below the root is evidence, and evidence need
not come from the checker's own probe — an operator can run their own tool and hand back the
recordings, executing nothing on the checker's authority and reading no claim at all.

Two smaller removals of the same shape: _"the two limits that used to stand beside that one are
gone"_, where the tools existing is operative and their having once been limits is not; and two
clauses of the page narrating its own conduct — _"so it is stated here rather than discovered in a
rejection"_ and _"naming it exactly is the honest thing this page can do today"_.

### R-23 · Three stale cross-references, two of them created by this pass

**The pass is now the leading cause of the defect it is finding.** Each of these was a sentence
whose bytes never moved and which stopped being true when a neighbour changed:

1. This section cited _"the ceiling reached runtime for 4 of 25 commands"_ — a figure removed from
   `The ceiling, stated honestly` two commits earlier, by this pass.
2. The field table's `effects` row said **"and see the roadmap cost below"**, pointing at a passage
   that now says the cost is nothing. Also created by this pass, in the commit above.
3. A dangling antecedent: the replacement paragraph opened _"What v0's missing slot costs"_ with no
   nearby introduction of which slot, because the text that introduced it had just been removed.

All three were found by re-reading outward from the edit rather than by any check — the gate is
green on every one of them, because a stale pointer resolves and a dangling antecedent parses.

**The rule this adds, and it is the most important one so far:** after removing a passage, re-read
what points _at_ it and what it pointed _to_. A cut does not only shorten a section; it changes what
that section says about itself, and every sentence elsewhere describing it by its old character is
now suspect. R-17 was the first instance and it read as bad luck. Three more makes it the method's
main hazard.

## Part 2 § The two things a declaration must never carry

44 non-blank lines to 35.

### R-24 · The kit confessing its own weakness inside an instruction

> The hazard is not hypothetical in shape, though nobody here has yet produced the target that
> exhibits it: one checker in this repository decides a verdict by matching an English phrase on
> stderr, over a locale inherited from whoever invoked it […] ([SURV-3], which records that it could
> not find a tool localising its parser errors).

**reason stated.** The rule is _do not declare anything about the run rather than the tool_ and its
reason is complete in one sentence: a target declaring "my errors are English" is answering for the
caller's shell. What followed was this project disclosing a weakness in its own checker, hedged into
near-nothing by its own admission that no target exhibiting it has been found.

The failure mode is worth keeping and is now stated generally: a check matching an English phrase on
stderr can pass under one `LC_ALL` and fail under another with nothing in the report telling the two
runs apart. True of any such check, including somebody else's.

### R-25 · The `anthill`/`D2` case behind "a declined recommendation has no home"

> The noticing then had nowhere to live, and the first cold reader of this page found the gap. The
> case is anthill and `D2` […] **The waiver went in a local `acc.config.json` on the machine that ran
> the check, which they declined to commit** — _"dead config carrying a live opinion"_ — **and the
> durable copy of the reason ended up in a report in this repository.**

**reason stated.** The problem is two sentences: a waiver belongs to whoever runs the check and
travels in their config; a reason written down in somebody else's report belongs to them. A
maintainer who declines on the merits ends up with either a temporary file or a stranger owning the
record. Eleven lines were one tool's instance of that, plus an account of who noticed it.

The answer beneath it — the waiver stays caller policy, the reason is a **narrowing** statement and
belongs in the tool's own repository beside the code — is the guidance the section exists for and is
untouched.

**R-23's rule was applied before committing**, for the first time deliberately rather than after the
fact: the heading is an anchor cited from `How to read this` as _"the decision needs a home"_, and the
section still delivers that; its three outbound anchors all still resolve.

## Part 2 § Where the declaration lives, and who may say what

57 non-blank lines to 46.

### R-26 · The section's provenance opener, and the convergence framing that ran through it

> [Two independent design sketches] were written for this, from opposite starting points — one
> derived from what the checkers need, one from what a person can honestly say. They converged on
> more than they disagreed about […] this section is a reading of them and they are the source.

Plus two more instances of the same framing: _"They converged on the asymmetry […] Both reached it
independently, from different premises"_ and _"because agreement reached from two directions is worth
more than either argument alone"_.

**no reason needed, and the framing was costing the section its best rule.** That two sketches agreed
is an argument for the project trusting the rule. It is not a reason the rule is right, and the rule
states its own reason completely: a wrong "do not probe me" costs coverage, a wrong "you may probe
me" costs somebody a written file.

The side effect is the part worth noting. Because the asymmetry arrived as a **quotation from the
sketches**, the standard's most useful rule was presented as somebody else's finding. It is now the
page's own sentence. Third time this has happened — after R-4's adopter quotation and R-16's
`schema.ts` — and it is becoming a reliable tell: **where a page cites a source for its best line,
check whether the line is actually the page's own position.**

### R-27 · A fourth revision record, and two tool inventories

> An earlier version of this page told you to record it and let it gate nothing; **that advice is
> withdrawn**, and no field is coming for it.

After R-5, R-20 and R-22. The bullet's reason is untouched and is one of the strongest on the page:
an inert field lends its names apparent authority, invites a consumer to infer safety from them, and
fixes a meaning before any consumer exists to need one — with `read_only` already reading two ways.

Two inventories reduced to one example each, on the R-19 principle that an example teaching what a
term means is doing a different job from an example showing a claim held once:

- the file-writing population (`ffmpeg`, `sqlite3`, `ogr2ogr`, `cdo`) keeps `sqlite3`, because "a
  probe that writes a file" is theoretical until one tool makes it concrete;
- the bitmask population (`pylint`'s OR'd 1/2/4/8/16/32, `fsck`) keeps `fsck`'s own wording. The rule
  is general and complete: no declaration changes what `2` means in a taxonomy that assumes an
  enumeration.

**R-23 applied before committing:** five citations point at this section's anchor, the heading is
unchanged, and the narrowing-versus-widening asymmetry they reference is still stated. The chunk has
no outbound anchors.

## Part 2 § A caller may declare

54 non-blank lines to 30.

### R-28 · A quotation that was costing six lines to fence

> The conclusion is not this page's. It was drawn by the implementer in [the first outside
> application], and it belongs here in their words rather than in a paraphrase:
>
> > for the verb-first population […] a modelled declaration currently buys zero comparison. The
> > standard's "a caller may declare for a tool" is **true at the format layer and inert at the
> > census layer**.

Followed, six lines later, by the fence:

> The worked `0 of 4` above is this repository's own CLI, measured in this tree, **and it is not the
> run that produced that sentence**: that session modelled a declaration for a different tool, on a
> tree this checkout cannot reach […] The grammar in the sentence is also not the invariant — anthill
> is verb-first and does enumerate at the root — which is why the limit above is stated as the
> root-slot mismatch rather than as a fact about verb-first parsers.

**reason stated, and the structural finding is the interesting part.** The sharpest sentence in the
section — _true at the format layer and inert at the census layer_ — was again the one inside
quotation marks (fourth instance, after R-4, R-16 and R-26). Lifting it as the page's own claim did
not only remove the attribution: **the entire fencing paragraph had nothing left to do.**

Quoting somebody commits a page to defending their exact words, including the parts it does not
mean. Two of those six lines existed to disown a generalisation in the quote, and one to disown a
measurement the quote might be read as claiming. State the position yourself and you state only what
you mean, and there is nothing to walk back.

**The rule this adds:** when a passage is followed by qualifications of its own quotation, the
qualifications are not the problem. The quotation is.

### R-29 · The measurement block

Thirteen lines: `acc --nope` and its `0 of 4`; anthill `2.3.0` and its `0 of 25` with the root named
beside the fraction rather than inside it; then the build-versus-version caveat, where a published
launcher answers `No command specified.` so the figure is _"a property of the build rather than of
the version"_.

**evidence only.** The mechanism is complete without any of it: a verb-first tool's declaration is a
document about its verbs, so every path it declares is a path nothing probes, and the one path that
is probed is often the one it does not declare. One worked figure keeps it concrete; three plus a
build caveat is a trial report.

**A stale reference of this pass's own making, again:** removing the anthill figures left a later
paragraph saying _"the same anthill checkout"_ and _"rather than `0 of 25`"_, with neither antecedent
still present. Caught by re-reading the section after the cut. That is the fifth instance, and the
first where R-23 was applied and still missed one on the first pass — the rule says re-read what
points at the section and what it points to, and this pointer was _inside_ the section.

**Extension to R-23:** re-read the whole section after cutting, not only its seams. A paragraph can
reference a figure four paragraphs above it.

## Part 2 § Where they disagreed — and Part 2 closes

34 non-blank lines to 24.

### R-30 · Two open questions narrated as a debate

Both disagreements were presented the same way: one position, then the other, then a self-flagged
objection — in a section whose own conclusion is _"nothing here decides it."_

> One sketch makes it declarable by anyone — `own` against `delegating`, plus a reserved band of
> codes the tool keeps for itself — and names it, unprompted, as the largest unfalsifiable escape
> hatch in its own design […] The other makes it **promise-only** […] The second sketch flags the
> sharpest objection to its own position […]

**no reason needed; an open question is a scope statement.** A reader needs to know the question is
open, why it is hard, and what would close it. Who argued which side is deliberation, and the section
had already said it settles nothing.

What survives is stronger than the debate: the question stated directly, the reason it is hard — the
field switches off a whole family of checks — the honest split that `ssh(1)` documents ownership
plainly while `tar`, `xargs` and `bazel run` do not, and the experiment that would settle it. **Naming
a falsifiable experiment is worth more than the argument that produced the impasse.**

The same shape for where a declaration lives, where the recommendation was already written under the
deliberation and is untouched: a declaration and a policy are different speech acts with different
lifetimes, so choose two files.

### R-31 · The sixth stale reference, and the first to cross a section boundary

R-26 removed the passage introducing the two design sketches. Eighty lines downstream — in a section
this pass had not yet reached — three paragraphs went on saying _"One sketch…"_, _"The second
sketch…"_, _"One sketch…"_, with nothing left to introduce them. The only surviving mention was a
bare parenthetical citation.

**R-23 and R-29 were both too narrow.** One said re-read what points at the section and what it
points to; the other said re-read the whole section, not only its seams. Neither reaches a paragraph
in a _different_ section that depends on a noun the cut removed.

**Final form of the rule:** after removing a passage that introduces a term, a figure or an actor,
search the whole document for later uses of it. The gate cannot help — `One sketch` parses, resolves
to nothing, and reads as competent prose.

The repair and the cut were the same edit here, which is luck rather than method.

### One immediate instance of R-29, caught before committing

Merging the two exit-code paragraphs left _"switches off a whole family of checks"_ twice and a
dangling _"Both positions are defensible"_ whose antecedent the cut had just removed. Found by
re-reading the section after editing it, which is the rule working as intended for once.

## Part 3 § Machine mode

55 non-blank lines to 45. Estimated 35 beforehand — the third consecutive overestimate, and the
reason is consistent: where a removal preserves a reason, the replacement runs nearly as long as what
it replaced. Recorded rather than corrected, because the counts are not the measure.

### R-32 · A rule that was never stated, only instantiated

> **The place it breaks is the command you would least expect, and the case was found by a reader of
> this page rather than by anything here.** anthill answers every command with `{ok, data, meta}` […]
> except `help --json`, which returns the manifest as a bare document […] Nothing here caught it:
> every check that would have runs below the root.

**reason stated, and the rule had to be written for the first time.** This is the only entry so far
where the general form did not already exist somewhere in the passage: the section had a worked case
and no sentence naming what it was a case of. It does now — **the output whose whole job is to be
machine-readable is the one most likely to be exempted from the envelope, and it must not be** —
which is a rule an author can apply to their own tool without knowing anything about anybody else's.

The heading also carried its own provenance (_"found by a reader of this page rather than by anything
here"_), and the closing clause was a limitation already covered by the section's `[C?]` marks.

### R-33 · A fifth revision record, and checker internals inside a mark

> `B3` (machine output parses) — **listed as checked today until this revision, and it is not.** Its
> checker declares `probes: []`, every branch returns `unverified`, and its own `coverageEstablished`
> reads _"nothing at L0"_ […]

After R-5, R-20, R-22 and R-27. A checkability mark should say what is and is not established, not
narrate its own correction or quote the checker's source. What stands is the honest finding, which is
the strongest thing in the block: `B5` came back `unverified` on all eight targets of the owner-CLI
run, every one of them a machine-mode tool, **so the rule is unreachable on the population it was
proposed for**.

Two smaller removals of established classes: the Vercel bug-report narrative (R-13's shape — the
reason stands without the cautionary tale, and `gh`'s two spellings are kept because they teach what
"both directions" means), and a flag-spelling inventory reduced to two examples with the kit's
self-confession about its own false pass compressed to the conclusion it supports (R-24, R-27).

### R-34 · A grep is a flashlight; the section needs a lamp

**The owner found a defect this pass had just created, by reading.** After the machine-mode cuts, a
sentence still read _"That page also carries the full contract and the table of what changes between
the two modes"_ — and the link it referred to had been inside the Vercel citation the cut removed.
The concept page was no longer linked from the section at all.

**R-31's sweep could not have found it.** That rule says to search the document for later uses of a
removed term. `That page` contains no distinctive noun, so there is no term to search for. A removed
**link** leaves a **pronoun** dangling, and pronouns are invisible to the instrument.

Reading the section whole then found two more that no search would have named:

- _"a documented failure mode"_ — the document that made it documented was the citation removed;
- _"most likely to be exempted"_ — exempted from **what**? Its object left with the worked case, and
  the bolded lead sentence stopped standing alone.

It also cleared a false alarm: ragged line lengths in the edited paragraphs are not an artefact of
this pass. `proseWrap: "preserve"` is deliberate — hard-wrapping _"splits greppable phrases across
lines"_ — and untouched sections run to 188 characters.

**The rule, and it supersedes the sweep rather than adding to it:** after editing a section, read
the whole section. Searches confirm what you already know to name; they cannot report that a
sentence no longer makes sense. Every stale reference this pass has created was invisible to the
gate, and the three found here were invisible to the greps written specifically to catch them.

This is the same failure the standard itself is about: an instrument that reaches lexical carriers
and misses semantic ones. The pass has now demonstrated it on itself four times.

## Part 3 §§ Complete and untruncated output, Error envelopes

27 to 23, and 43 to 43. The second number is not a failure to cut — that section is the leanest in
Part 3 and is mostly recommendation-and-reason prose with no story in it. Its net change is a repair.

### R-35 · The self-criticism belonged to the charter, and the page's copy of a figure had drifted

> The [archaeology] has the fixture measured both ways: **65,536 bytes through the pipe before the
> fix, 114,101 after** […] The defective binary delivers 57% of its payload at exit `0` — and
> `acc check` scores it `conformant: true`, zero core failures. That is the kit's own headline
> verdict certifying a CLI that loses more than half its output, **and it is recorded here rather
> than hidden because** it is the clearest thing anyone has measured about the limits of black-box
> checking.

**evidence only, and duplicated across documents.** `CHARTER.md:161` already makes this argument —
_"one fixture that silently loses 57% of its output scores `conformant: true` with zero core
failures"_ — where it belongs, because it is a claim about the project's limits rather than guidance
for someone building a CLI. The closing clause is the page narrating its own honesty.

**The page's copy had already drifted from its source:** `STANDARD.md` said the fixture delivered
`114,101` bytes after the fix; the archaeology note says `Bun.spawn` pipe **`114,042`**. Not chased,
because the discrepancy is the argument — a second copy of a measurement is how a figure goes stale,
and the fix is to keep one and link it.

### R-36 · A cross-section duplication, the first of its kind

`Machine mode` and `Error envelopes` both disclosed that `B5` is gated on `defaultOutput` and that
none of the eight owner-CLI targets declared one — ninety lines apart, in two different `[C]` blocks,
in different words. `Machine mode`'s version carries the sharper conclusion and stays; this one now
points at it.

Every earlier instance of the duplication pattern was within a single section or between adjacent
subsections. This one crossed a section boundary, which means **the reading practice of R-34 will not
find them all**: reading one section whole cannot show you that another section says the same thing.

### R-37 · A birth defect, found by detective work rather than by reading

> **Why enumerate the alternatives in the envelope.** An error is a just-in-time slice of the schema
> […] **Both** are generated from the same declaration.

**Both what?** Nothing plural precedes it. An explorer traced the sentence to
`docs/wiki/concepts/error-envelope.md:126-129`, where it survives intact with the clause that
supplies the antecedent: _"This makes **good errors and schema introspection** two views of one
thing."_ `git log -S` confirms `STANDARD.md`'s version arrived whole in `50d05ca`, the commit that
created the page — so the antecedent was lost **when the passage was distilled from the wiki**, not
by any later edit. Verified against the source before acting, not taken on the agent's report.

**This is the finding that matters most for the playbook, because the defect is the pass's own
failure mode.** Whoever wrote `STANDARD.md` was doing exactly what this pass does — compressing a
longer passage into a shorter one — and dropped the clause that made the remainder coherent. This
pass has done the same thing five times in two days: _"That page"_, _"the same code path"_, _"v0's
missing slot"_, _"Both positions are defensible"_, _"most likely to be exempted"_.

**Compression is the operation that creates dangling antecedents.** It is not a hazard of careless
editing; it is what happens when you remove the sentence that introduced something and keep the
sentence that refers to it. R-34's read is the only instrument that finds them, and it found four of
the five.

## Part 3 § Exit codes

54 non-blank lines to 41.

### R-38 · The standard carrying the charter's self-assessment — second instance

Twenty lines on fleet divergence: a five-bullet inventory of one author's eight CLIs, then _"no rule
in the catalogue reports any of it"_ with its structural reasons, then **`15 of 23` rules returning
an identical verdict on all eight targets** and the six scaffold-sharing tools producing one verdict
vector **six times over**.

Both figures are already in `CHARTER.md:171-173`, in fuller form — with the `nine PASS+ / three UNVR
/ three N/A` breakdown this page omits. **Second cross-document duplication after the 57% fixture in
R-35, and the same shape both times: a claim about the kit's reach, sitting in the guidance.**

The division is now clear enough to state as a rule. **A claim about what this project can and
cannot establish belongs in the charter. The standard says what to build.** When the standard argues
the project's case, it is duplicating an argument made better elsewhere and spending the reader's
attention on a question they did not ask.

What survives is the guidance, and it is the argument for declaring at all: **the only instrument
that surfaces fleet divergence is putting the declarations side by side.**

### R-39 · Three tool inventories, one kept deliberately

- Delegators — `ssh`, `tar`, `timeout`/`xargs`/`env`, `jq`'s `halt_error` — cut to two. The rule and
  the actionable part both survive: verbatim passthrough makes the wrapper's own `125`/`126`/`127`
  indistinguishable from the child's, so carry the child's code as a field in your envelope.
- Non-zero-is-not-failure — `rg`, `expr 1 = 2`, `kubectl diff` — cut to `rg`, which is canonical.
- **`git` `129`, `docker` `125`, `kubectl`/`gh`/`cargo` `1` — kept in full**, against the R-27
  pattern. Here the inventory _is_ the reason: the claim is that no industry standard exists, and one
  example cannot establish an absence. Five tools disagreeing, and **none using `EX_USAGE`**, is the
  evidence for calling the taxonomy a house standard rather than a convention.

**The distinction R-39 adds:** an inventory is decoration when it repeats a claim one case already
makes, and it is the argument when the claim is about a population.

## Part 3 §§ Pagination, Non-interactivity

24 to 23, and 16 to 16. Both sections are near-identical in length and materially different in
content — which is the clearest demonstration yet that the counts are not the measure.

### R-40 · A section breaking Part 3's own stated rule, verbatim

Part 3's preamble says: _"Where the catalogue already has a rule, this section points at it and
stops."_ The bypass-flag paragraph did both at once — it restated the rule and then said _"That rule
page carries both."_ Measured against
[`never-block-without-a-tty.md:57-59`](../wiki/rules/interactivity/never-block-without-a-tty.md), the
two are near-verbatim: same bolded sentence, same two examples, same order.

**This is the duplication predicted before the pass began.** When the wiki-versus-standard question
was first asked, this exact paragraph was the one instance found of the standard restating a rule
page rather than pointing at it. It is now the only one repaired, and finding it took no instrument —
the section's own preamble names the rule it was breaking.

**The rule that generalises:** where a page states a policy about itself, check the page against it.
A stated policy is a test the document has already written and left unrun.

### R-41 · A fifth attribution tell, in a section that had already done the lifting

> clispec states the rule this page endorses — _"do not probe what the tool did not claim"_ […]:
> only a command declared with unbounded output owes you pagination

The page quotes the rule and then, one clause later, states it in its own words. After R-4, R-16,
R-26 and R-28, this is the first instance where the paraphrase was **already sitting beside the
quotation** — so the removal cost nothing at all and the section reads the same minus an attribution.

Two smaller removals: the Docker maintainer's _"for compatibility reason, this can't be fixed"_,
where the concept page carries the case and the page's own punchline is what matters — the
inconsistency is permanent **because it was never declared, only observed** — and a phrase pointing
at a mark that does not exist (_"and it is marked as such"_, with no mark anywhere).

**Kept deliberately:** the whole of _"this is the thinnest recommendation on the page"_. It tells a
reader how much weight to give a recommendation whose reasoning is sound and whose evidence is
absent, which is the evidentiary discipline `How to read this` promises and one of the few places
the page marks its own confidence down.

## Part 3 § Parsing

54 non-blank lines to 38, excluding the group-node subsection, which was written lean and is
untouched.

### R-42 · One incident, three copies

`bounty close --help` **closed the board** appeared at three separate points in the page. It is a
good line and it earns one appearance; two of the three are gone, and the third is in Part 4, still
to be reached.

**The shape is worth naming because it is not the usual duplication.** The earlier instances were a
_claim_ stated twice with material between the copies. This is a single vivid _example_ reused as
punctuation — it turned up wherever the page wanted emphasis, in three different arguments. A phrase
that good is load-bearing the first time and decoration afterwards.

### R-43 · Two inventories trimmed under R-39, not cut

The counter-examples paragraph (five tools) and the flag-spelling paragraph (eleven) are both
population claims — _"false by design for a real population"_ — so by R-39 the inventory is the
argument rather than decoration, and neither was removed.

**R-39 needed a second half, and this is it: establishing a population takes a few members, not all
of them.** Three tools show that order-dependent grammars are a real family; eleven show the same
thing at four times the length. Both were trimmed to three or four and both keep their operative
closer, which is the part a reader acts on: _if your grammar is order-dependent by design, say so in
the declaration; the clause is not for you._

### R-44 · Checker internals and fix history inside a checkability mark

> **[—]** `A4` […] its checker declares no probe and returns `unverified` unconditionally
> ([`unexpected-positionals.ts`]) […]
> **[C]** […] measured both `A6` and `A7` as `unverified` on all eight targets — `A6` because a `bun`
> launcher swallowed the leading `--` before the target saw it […] `A6`'s swallow **is now
> compensated at the spawn**, so it returns a real verdict on bun-launched targets

**R-33's class, and the removal had a side effect worth recording.** A mark should say what is and
is not established, and why in terms of the world — testing arity means sending extra positionals to
a real verb and running it — not quote the checker's source or narrate how a defect was fixed.

Removing the history removed a stale exception with it: `A6` was singled out because of a caveat that
the bun-launcher repair shipped days ago had already made obsolete. It is now simply inside the
`A1`–`A3`, `A5`–`A7` range, which is what it is. **A passage that narrates a fix goes stale the
moment the fix lands.**

## Part 4 — What is checkable, collected

142 non-blank lines to 122.

### R-45 · The eighth stale reference, and the one the sweep was proposed for

> Thirty-eight per cent of the 201 — **the 77 counted at the top of this page** — is capability that
> was never there.

`77` appeared nowhere else in the document. The census it pointed at was in `How to read this` and
was removed eight commits earlier, in the cut that established R-8 — a scope statement needs no
evidence. The reference survived in Part 4, a hundred sections away, reading as competent prose and
passing every gate.

**Second instance to cross a Part boundary, after R-31's design sketches.** Both were created by a
cut that was correct, and both were invisible until somebody read the far end of the document. This
is the case the closing re-read exists for.

### R-46 · Three more revision records, in one section

- _"This row read `[C?]` until this revision and the correction comes from this project's own
  corpus"_
- _"effects, which an earlier revision named here as a third route"_
- _"These two were one bullet until this revision, and they split because…"_
- _"The recommendation is unchanged; only the claim about who can verify it is."_

Sixth, seventh and eighth, plus a coda. Every one of the underlying rows is excellent and untouched —
_"there is no observation of acceptance that is not an execution"_ is among the sharpest lines on the
page. What went is the page telling a reader about a draft they never saw.

### R-47 · I nearly shipped a false cross-reference, and the read caught it

Cutting the `1 in 7` replay and the 28% ceiling, I wrote that the figures live in `CHARTER.md`. On
the full read, two things were wrong at once: the hit rate is under **What the project offers**, not
the anchor I linked, and the charter **does not carry the 28% ceiling or the under-10% reach at
all**. Deleting them on that reasoning would have removed two figures from the only page holding
them, and pointed the reader at a document that never had them.

They are in [the census](../research/2026-08-24-missing-capability-or-implementation-defect.md) —
`~28% of iteration (≈57 of 201 commits)`, `under 10% of iteration today`, and the three-quarters
framing — which is where the sentence now points.

**The rule, and it is one this pass stated on day one and then failed to apply:** before cutting a
passage on the grounds that it lives elsewhere, **verify that it lives elsewhere**. "Belongs in the
charter" was an inference from R-38, and R-38 is a rule about where such claims _should_ live, not
evidence about where this one _did_.

Recorded as a near-miss rather than a defect because it never reached a commit. It was caught by the
same practice that has now found something in every section it has been applied to.

### R-48 · The back half of Part 4, reviewed after being declared clean

**The previous round declared `Nothing outside can check it` and the four closing sections "keeping"
without presenting candidates, and the R-34 read covered only Part 4's head.** The owner asked
whether they had actually been reviewed. They had not. Three items came out of doing it properly,
and one of them was a straight inconsistency:

- **`Effects`** carried _"which is why the drift trial reached runtime for four commands in
  twenty-five"_ — the same `4 of 25` figure cut from `The ceiling, stated honestly` in R-20, on the
  grounds that the general statement beside it was complete. Leaving it in one place while cutting
  it from the other was inconsistent, not a judgement.
- **The lag evidence** named ten verbs, three the house-style document covers and seven it does not.
  Trimmed under R-43: the ratio is the punchline — nine commits against 151 — and two-and-two shows
  the shape.
- **The link text at line 64** still read _"what came out of 'How to read this'"_, the report's title
  before it was renamed. The URL had been updated; the words had not. Found by reading, invisible to
  the link checker, which resolves targets and never reads labels.

**Kept against the pattern**, and worth recording as a decision rather than an oversight: the
type-sentinel probe's failure figures under `Semantic honesty of a value` — zero true positives, two
false positives, 26 of 33 undecidable. Same shape as the `EX_USAGE` inventory in R-39: the claim is
an **impossibility**, and a recorded failed attempt forecloses _"could you not just…?"_ in a way an
assertion cannot.

**The lesson is about the pass rather than the page.** Declaring a section clean without listing
what was considered produces no record anyone can check — including the person who declared it. The
sections that got a written candidate list all yielded findings on review; the two that got a
sentence yielded three more when someone asked.

### R-49 · A paragraph the concept page already carried verbatim

> **Get this right when the CLI is born.** Kubernetes' KEP-2551 proposed normalising kubectl's exit
> codes and has sat alpha-gated behind an environment variable since 2022 — not because the design
> is bad, but because retrofitting exit codes onto a tool with existing consumers is close to
> impossible.

[`exit-codes.md:184`](../wiki/concepts/exit-codes.md) carries that sentence **word for word**, and
closes with _"Get this right when a CLI is born"_ — which the standard uses as its opening lead. The
same paragraph, reordered.

**Raised by the owner as a genuinely open question**, and the answer is a split rather than a cut.
The case for keeping it — _it is important enough that you would not want to hide it behind a link_
— is right about the **recommendation** and not about the evidence. And the placement proves it: the
urgency is the concept page's last line and the standard's first, so the standard is already doing
the thing that argues for keeping it, while the concept page buries it.

So the recommendation and its mechanism stay, and the retold KEP goes. _"Close to impossible"_ is
true on its face; _"alpha-gated since 2022"_ is the one fact that stings, and it survives as a clause
rather than a paragraph.

**The reason not to keep both copies is measured, not stylistic.** This pass has already caught one
figure that drifted between a page and the note it cited — `114,101` against `114,042` — and
verbatim duplication is the mechanism that produces it. A second copy is a second thing to keep
true.

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
