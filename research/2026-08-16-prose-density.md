# Prose density in this wiki: a vocabulary for the thing that makes you reread

Date: 2026-08-16

Status: analysis and vocabulary. No guidance is enforced yet; this is the groundwork for a
writing guide and a review skill.

## The observation that started this

A reader of this wiki reported a recurring experience: sentences that require two or three passes
before they resolve. Not because the subject is hard — because of how the sentence is built. The
prose reads well line by line and taxes you cumulatively.

That reader could not name what they were sensing, which is the actual problem. **You cannot
write guidance against a quality you have no word for.** This document supplies the words.

Nothing here is about correctness. An external review of this wiki found the prose "precise" and
the claims "evidenced," and that assessment stands. Density is a separate axis from accuracy, and
a page can be maximally accurate and still cost more to read than it should.

## 1. The register has a name; the difficulty does not come from the name

The overall style is **aphoristic**, or **gnomic**: compressed general truths, stated as though
self-evident. Its pejorative form is **sententious** — the same move when unearned or moralising.

This wiki is full of it, by design and often to good effect:

> A probe that could not run is not a probe that succeeded.
>
> A declaration you cannot falsify is a comment that lies.
>
> A wrong answer wearing a right answer's shape.

Naming the register does not explain the cost, though. "Aphoristic" describes flavour. The reread
has mechanical causes, and those are separable, teachable and measurable.

### The real harm: compression that does not declare itself

This is the sharpest framing available, and it reframes the whole problem.

Both an acronym and an aphorism compress a long explanation into a short token. The difference is
what each one tells the reader about itself.

**An acronym announces its own compression.** Read `TDD` and you know instantly that something has
been folded up, that you are not expected to derive it, and that there is a definition to look up.
The reader's confusion is correctly attributed — to missing context, not to a failure of reading.

**An aphorism hides its compression.** _"A probe that could not run is not a probe that
succeeded"_ arrives dressed as ordinary English. Every word is common. The grammar is simple. So a
reader who does not already hold the lineage behind it — the vacuous-pass defect, the nine rules
that passed against a segfault, the distinction between an absent verdict and a negative one —
has no signal that anything was compressed at all. They reread. Then they doubt themselves.

**That misattribution is the harm.** Not the density itself: the fact that the reader cannot tell
whether they are missing context or simply reading badly. A confused reader facing `TDD` looks it
up. A confused reader facing an aphorism concludes they are slow.

Three consequences follow:

- **Memorable and comprehensible are different properties**, and optimising for the first can cost
  the second. "Do you remember it" and "do you know what it means" have different answers, and the
  writing that scores best on the first is often the writing that scores worst on the second.
- **A poem earns its rereads; technical prose does not.** In a poem, multiple passes and multiple
  simultaneous readings are the point — ambiguity is the medium. In a specification, exactly one
  reading is wanted, and a sentence that supports several is defective no matter how well made.
- **If a compressed line must be kept, it needs a definition, not just context.** Which is
  precisely what a glossary term is — and it is why the glossary work matters beyond navigation.
  A compressed phrase linked to a glossary entry becomes honest: it now declares itself the way an
  acronym does.

The practical test: **would this sentence be improved by being an acronym?** If yes, the phrase is
carrying a definition and should either be expanded in place or given a glossary entry to point
at. If no, it is genuinely just prose, and the ordinary density mechanisms below apply.

### The cost this actually imposes

Worth stating plainly, because it is the reason this document exists rather than an aesthetic
preference. Prose generated quickly and then studied slowly is not a finished deliverable — it is
a **deferred cost, disguised as a completed one.** The writing looks done. The understanding has
been postponed and moved onto the reader, and the apparent throughput gain is repaid with
interest the first time anyone has to act on the page.

## 2. The mechanisms

| Mechanism                     | What it is                                                                           | Why it costs                                                                      |
| ----------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| **Periodic structure**        | the main clause arrives last; everything before it is held in suspension             | working memory is loaded until the sentence resolves                              |
| **Center-embedding**          | material inserted between a subject and its verb                                     | the reader must keep the subject open across the interruption                     |
| **Nominal style**             | actions expressed as abstract nouns instead of verbs (_"the rejection of the flag"_) | the action must be reconstructed before the sentence means anything               |
| **Abstraction stacking**      | every noun in the sentence is abstract                                               | each one must be instantiated against a concrete referent first                   |
| **Antithesis / antimetabole** | _not X but Y_; words repeated in reverse order                                       | the second half is only parseable against the first, so neither can be read alone |

Two of these do most of the damage: **periodic structure** and **abstraction stacking**. Aphorism
feels heavy precisely because it nearly always combines them — a general claim (abstract) that
lands at the end (periodic).

The linguistic contrast underneath all of it is **hypotaxis** (subordinated, nested clauses)
against **parataxis** (short clauses set side by side). This wiki's default is hypotactic.

## 3. The specific tics, from this repository

Measured: the longest non-table prose sentences in `docs/wiki/` run to **63–65 words**. Three of
the top five are in `concepts/conformance.md`.

**Antithesis as a closing move.** A paragraph ends on _not A, but B_, which makes the point feel
concluded whether or not it was argued.

> It's not that the catalogue is wrong-headed; it's that it's aimed correctly and calibrated for
> what's safe to probe rather than for what actually breaks.

**`which is exactly the…` as a terminator.** A cadence that asserts a connection instead of
drawing one.

**The em-dash pivot.** A sentence states a claim, then an em-dash introduces the qualification
that is actually the point — so the reader must reread the first half in light of the second.

> …a report then shows a clean bill of health for a tool that has been bent toward the
> specification instead of toward its actual users.

**Definitional inversion.** _X is not Y, it is Z_, where X, Y and Z are all abstractions and none
has been made concrete yet.

## 4. Before and after

The rewrites below preserve the claim and remove the tax. None is more correct than its original;
each is cheaper to read.

**Periodic → loose.** State the point, then support it.

> **Before.** Because the runner reads piped stdio continuously, and because the defect only
> manifests against a consumer that does not drain, the kit cannot observe it at any probe level.
>
> **After.** The kit cannot observe this defect at any probe level. Its runner reads the pipe
> continuously, and the defect only appears when the consumer does not.

**Nominal → verbal.** Give the abstractions back their verbs.

> **Before.** Enforcement of the declared value set is not performed by the parser, so acceptance
> of an out-of-set value occurs silently.
>
> **After.** The parser never checks the declared value set, so it accepts a bad value and says
> nothing.

**Abstraction stacking → one concrete anchor.** Keep the aphorism, but pay for it immediately.

> **Before.** A declaration you cannot falsify is a comment that lies.
>
> **After.** A declaration you cannot falsify is a comment that lies. `acc check` runs the
> declared read-only command in a sandbox and diffs the filesystem; if the command wrote
> anything, the declaration was false.

**Antithesis → plain assertion.** When the contrast is not load-bearing, drop it.

> **Before.** This is not a gap in the catalogue; it is a gap in the instrument.
>
> **After.** The catalogue is fine here. The runner is what needs to change.

**Center-embedding → right-branching.** Move the interruption to the end.

> **Before.** The claim the reviewer, having checked it against the primary sources, made about
> exit code 125 was wrong.
>
> **After.** The reviewer's claim about exit code 125 was wrong, and they had checked it against
> the primary sources.

## 5. Where the register belongs, by Diátaxis type

Density is not a defect everywhere. It is a defect when it fights the reader's mode.

| Type            | Reader's mode                | Aphorism                                                                                                                       |
| --------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Explanation** | studying, reflecting         | **appropriate** — compression aids recall, and discussion is the form                                                          |
| **Decision**    | studying a settled argument  | appropriate in the ruling; costly in the rationale                                                                             |
| **Reference**   | consulting, mid-task         | acceptable in a definitional line only; the body must describe and only describe                                               |
| **Rule**        | arrived from a failure       | the normative sentence may compress; `## How to comply` must not                                                               |
| **How-to**      | working, attention elsewhere | **harmful**                                                                                                                    |
| **Tutorial**    | learning, low confidence     | **worst case** — Diátaxis already demands "ruthlessly minimise explanation," and an aphorism is explanation at maximum density |

The usable rule: **the further a page sits toward the application half of the Diátaxis map, the
looser, more verbal and more concrete its prose should be.**

This also predicts something checkable. The pages that read best today are concepts and
decisions — the explanation half, where the register fits. A tutorial written in the same voice
would fail, and the guides are not written yet.

## 6. Measurable proxies

For a future analysis tool, thresholded **per page type** rather than globally:

- **words before the main verb** — the best single proxy for periodic structure
- **clauses per sentence**
- **nominalisations per 100 words** (`-tion`, `-ment`, `-ance`, `-ity`)
- **abstract-noun ratio**
- **sentence-length long tail** — the 90th percentile, not the mean; the mean hides the 65-word
  outliers entirely

Deliberately excluded: **reading-grade scores** (Flesch–Kincaid, Gunning Fog, SMOG). They average
syllables per word with words per sentence, so domain vocabulary inflates them, and every
technical document lands at grade 12–16 regardless. Optimising the number means substituting
worse words. Report it if you like; never target it.

## 7. Why this must be a review step, not only a pre-writing guide

The hypothesis this document was commissioned to record, and the argument for it:

**Writing is generative; review is discriminative.** A style rule read once competes against a
model's entire prior for how documentation sounds, and it competes badly. Asking "does this
sentence carry fourteen words before its main verb" is a different and far easier task than
avoiding it while composing.

**The tic is only visible in aggregate.** One aphorism reads as a good line. Twelve read as a
mannerism. The signal is a _distribution_, invisible from inside any single sentence — and
therefore invisible at the moment of writing.

**It is this project's own thesis, applied to prose.** The three-layer model says guidance that
can only be documented gets ignored, and that a rule which cannot be mechanically checked does
not get to be a rule. A style guide read before writing is layer 3. A review pass against
measurable properties is layer 2. This repository exists because layer 3 loses.

### A third mechanism: output styles

Claude Code supports **output styles** — markdown documents, built-in or custom, that shape how
the agent writes. Nothing is configured in this repository today (no `output-styles/` directory
at either user or project scope, and no `outputStyle` setting).

This does not fit the three-layer model cleanly, and the misfit is the interesting part. It makes
nothing unrepresentable, so it is not layer 1. It is not a check, so it is not layer 2. It is
layer 3 **that applies itself** — documented guidance, injected rather than looked up.

That is a real upgrade, because layer 3's characteristic failure is not that the advice is wrong.
It is that nobody reads it at the moment of writing. An output style removes that failure without
becoming a check, which makes it the cheapest intervention available and the weakest guarantee.

It also targets the right thing. The behaviour under discussion is reflexive: absent instruction,
a model writes documentation the way its training says documentation sounds, and that prior is
aphoristic because good technical writing frequently is. A style read once loses to that prior. A
style present in every turn competes with it continuously.

The register to ask for is worth stating directly, because "be clearer" is not actionable:
**plain, spoken, and finished in one pass** — a sentence a competent colleague would say out loud,
not one built to be quoted. No line optimised for memorability at the cost of a second reading.

**None of this removes the review step.** Priming shifts a distribution; it does not verify one,
and the tic is only visible in aggregate. Expect an output style to reduce the rate and expect
review to catch what survives.

## 8. What comes next

1. The reader annotates real pages where they had to reread — raw signal, no analysis.
2. Each annotation is characterised against §2's mechanisms, which either fit or reveal a
   mechanism this document is missing.
3. The before/after catalogue in §4 grows from those real cases, because worked rewrites of
   sentences that actually cost someone something beat invented examples.
4. Only then: a writing guide (layer 3, for pre-writing) and a **review skill** (layer 2, where
   the leverage is), plus the §6 proxies as a report rather than a gate.

Building the guide before step 1 would produce advice about prose nobody struggled with.
