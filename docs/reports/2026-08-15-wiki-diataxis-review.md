---
type: report
generated: { by: claude-opus-5, at: 2026-08-15 }
status: stable
lifecycle: discharged
description: The wiki read against the Diataxis framework; the application half of the map was empty and the rule page's proportions invert its own stated purpose.
tags: [documentation, guide]
subject: docs/wiki
examined: 4a50178
---

# Wiki review — Diátaxis conformance

Date: 2026-08-15

Status: eight findings; no pages were edited by the reviewer.

This report reviews `docs/wiki/` as instructional content, using [Diátaxis](https://diataxis.fr)
as the lens. Diátaxis classifies documentation on two axes — **acquisition** (study) versus
**application** (work), and **action** (doing) versus **cognition** (thinking) — yielding four
types with different purposes, tones and forms:

|               | Acquisition (study) | Application (work) |
| ------------- | ------------------- | ------------------ |
| **Action**    | Tutorial            | How-to guide       |
| **Cognition** | Explanation         | Reference          |

Its central claim is that mixing types degrades all of them, because a reader is only ever in
one mode at a time.

## Method

All 29 markdown pages were enumerated; 8 were read in full (`index.md`, `SCHEMA.md`,
`concepts/exit-codes.md`, `concepts/conformance.md`, `concepts/machine-mode.md`,
`archetypes/delegator.md`, `decisions/exit-codes-below-125.md`,
`rules/lifecycle/inert-invocations-do-not-crash.md`,
`rules/parsing/unknown-flag-exits-nonzero.md`, and the bulk of
`rules/interactivity/never-block-without-a-tty.md`). The remaining rule pages were measured
structurally rather than read: every `##` heading across the corpus was extracted, and the body
length of each section was tabulated per page type. `lint.ts` was inspected to establish which
parts of the SCHEMA contract are actually enforced.

The structural measurement is what most of the findings below rest on, and it is reproducible —
the per-section line counts are given in [DTX-2](#dtx-2--p1-the-rule-page-inverts-its-own-stated-priority).

## Summary

The pages are, individually, unusually good. The prose is precise, the claims are evidenced, and
several pages visibly correct their own earlier overstatements in the text. Nothing in this
report is about writing quality.

The finding is about **placement and proportion**. The wiki occupies one half of the Diátaxis
map — the study half — almost exclusively. Concepts, archetypes and decisions are explanation;
rule pages are reference with a large explanatory overlay. The work half is nearly empty: the
`guides/` directory named in SCHEMA and in `index.md` does not exist on disk, and the only
work-oriented content in the entire wiki is the `## How to comply` section of each rule page,
which is also the shortest section on every one of those pages.

The second finding is an audience split. Each rule page serves two readers at once — someone
making their CLI conform, and someone building or maintaining the kit — and by word count the
second reader is winning on a page whose stated purpose is to serve the first.

## Disposition, as of 2026-08-19

| Finding | State             | Where it landed                                                                                                                                                                                                                 |
| ------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DTX-1   | **actioned**      | `guides/check-your-first-cli.md` (tutorial), `guides/how-to-reach-l0-in-your-project.md`, `guides/how-to-add-a-checker.md`; `tutorial` added as a page type                                                                     |
| DTX-2   | **actioned**      | `How to comply` moved second on all 23 rule pages; section order now read from SCHEMA's table and linted                                                                                                                        |
| DTX-3   | **actioned**      | `concepts/probing.md` and the checker guide created; contributor material extracted from all 23 `## The probe` sections                                                                                                         |
| DTX-4   | **actioned**      | absorbed by DTX-3 and measured rather than assumed, against `57d18ad`: `###` subsections in probe sections 6 → 2, justification markers 22 → 8, verdict-labelled lines 4 → 47                                                   |
| DTX-5   | **part actioned** | the navigational half is done — the index's "Start here" table links the taxonomy and the envelope shape directly. A `type: reference` is deferred to [the roadmap](../roadmap.md#a-reference-shelf-the-page-types-do-not-have) |
| DTX-6   | **actioned**      | delegator states bindings as `acc.config.json` where a rule exists and as guidance where none does; `normativeLanguageChecks` keeps RFC 2119 keywords on rule pages                                                             |
| DTX-7   | **actioned**      | `index.md` opens with a "Start here" table routing by what the reader is doing                                                                                                                                                  |
| DTX-8   | **actioned**      | `coverage_established` prose is linted, and per-type section presence and order with it                                                                                                                                         |

Every finding is now actioned or promoted, so this report is **discharged**. What remains of
DTX-5 lives on the roadmap, where anyone looking for outstanding work will find it; nothing here
is waiting on a reader of this page.

## Priorities

| Priority | Finding                                                    | Recommended outcome                                        |
| -------- | ---------------------------------------------------------- | ---------------------------------------------------------- |
| P1       | DTX-1 — the application half of the map is empty           | Write the three planned guides; split them by type         |
| P1       | DTX-2 — the rule page inverts its own stated priority      | Rebalance toward the rule and its remedy                   |
| P1       | DTX-3 — two audiences interleaved on every rule page       | Separate kit-internal material from the target-facing spec |
| P2       | DTX-4 — `## The probe` has drifted from reference to essay | Restore it to austere description; relocate the argument   |
| P2       | DTX-5 — `## The details` absorbs three types               | Extract the exit-code taxonomy as consultable reference    |
| P2       | DTX-6 — normative language outside rule pages              | Resolve the boundary SCHEMA states but does not hold       |
| P3       | DTX-7 — `index.md` catalogues by structure, not by need    | Add a task-oriented entry alongside the type catalog       |
| P3       | DTX-8 — the per-type section contract is unenforced        | Lint the required sections and the `**Established**` list  |

---

## DTX-1 — P1: the application half of the map is empty

Location: `docs/wiki/` (no `guides/` directory); [`index.md`](../wiki/index.md) "Guides";
[`SCHEMA.md`](../wiki/SCHEMA.md) "Layout".

Both SCHEMA's layout block and `index.md` name a `guides/` directory. It does not exist:

```
$ ls docs/wiki/guides
ls: docs/wiki/guides: No such file or directory
```

`index.md` closes with `_Planned: adopting the spec, adding a checker, migrating an existing
CLI._` — three genuine work-mode needs, none of them served.

The consequence in Diátaxis terms is that the wiki serves **acquisition** and almost never
**application**. A reader who wants to understand exit codes, the conformance verdict, or why
`125` is reserved is served extremely well. A reader who wants to _make their CLI pass_ has no
entry point at all: they must infer a procedure by reading twenty rule pages and assembling the
`## How to comply` fragments themselves. That is exactly the work a how-to guide exists to have
already done.

There is no tutorial either — no page anywhere takes a reader through running `acc check` once
and seeing what comes back. For a project whose adoption story is "point the kit at your CLI",
the absence of a lesson that does precisely that is the largest single gap in the wiki.

Recommended outcome: write the three planned pages, but split them by type rather than filing
all three under one `guide` label. They are not the same kind of document:

- **Adopting the spec** is a _tutorial_ candidate: a first-run lesson, first-person plural, one
  concrete target (a fixture in `src/acc/kit/fixtures/`), a visible result early — the reader
  runs the kit and reads a real verdict. Ruthlessly minimal explanation, linking out to
  [`concepts/conformance.md`](../wiki/concepts/conformance.md) rather than restating it.
- **Migrating an existing CLI** is a _how-to_: goal-oriented, assumes competence, conditional
  imperatives ("if your parser is `yargs`, call `.strict()`"), and explicitly ordered — which
  violations to clear first, and what to put in `.acc-expectations.json` in the meantime.
- **Adding a checker** is a _how-to_ for a different audience entirely (see
  [DTX-3](#dtx-3--p1-two-audiences-are-interleaved-on-every-rule-page)), and is where much of
  the kit-internal material currently stranded in rule pages belongs.

Note that the `guide` type in SCHEMA's per-type table declares sections `Goal · Steps ·
Verification`, which is a how-to shape. A tutorial does not fit it. If a tutorial is written,
the table needs a fifth row rather than the tutorial being bent into the how-to mould.

## DTX-2 — P1: the rule page inverts its own stated priority

Location: all 20 pages under [`docs/wiki/rules/`](../wiki/rules/).

SCHEMA states what a rule page is for:

> **Conformance failures cite the page.** The kit emits the rule's path, so whoever hit the
> failure lands on one atomic page explaining the rule and how to fix it.

Measured against that purpose, the pages are proportioned backwards. Body lines per section
across all 20 rule pages:

| Section                       | n   | avg | max |
| ----------------------------- | --- | --- | --- |
| `## The probe`                | 20  | 31  | 69  |
| `## Why`                      | 20  | 22  | 48  |
| `## Current checker coverage` | 20  | 16  | 20  |
| `## Evidence`                 | 20  | 14  | 43  |
| `## The rule`                 | 20  | 12  | 44  |
| `## How to comply`            | 20  | 11  | 23  |

The reader who arrives from a conformance failure wants two things: what did I violate, and how
do I fix it. Those are `## The rule` and `## How to comply` — the two **shortest** sections on
the page, 23 lines between them on average. The three sections describing how the kit performs
its measurement (`The probe`, `Current checker coverage`, `Evidence`) total 61 lines, better
than a 2.5:1 majority of the page.

In Diátaxis terms the page's reference core (the normative rule) and its sole how-to fragment
(the remedy) are together outweighed by explanation of the measuring instrument. This is not a
claim that the probe material is unimportant — it is a claim that it is not what this reader
came for, and that its position and volume make it the page's dominant content.

The `## How to comply` sections also vary a great deal in usefulness.
[`unknown-flag-exits-nonzero.md`](../wiki/rules/parsing/unknown-flag-exits-nonzero.md) has the
best of them — a framework-by-framework table with the exact setting to change, which is
textbook how-to (conditional imperative, assumes competence, omits the unnecessary). Most others
are three short prose paragraphs. E1's is representative: correct advice, but it names no
framework and gives no call to make.

Recommended outcome: bring `## How to comply` up to the A1 standard across the catalogue —
name the frameworks, name the setting. Consider promoting it above `## The probe` in page order,
so the two sections the citing reader needs are adjacent and above the fold. Ordering is cheap
and changes nothing else.

## DTX-3 — P1: two audiences are interleaved on every rule page

Location: rule pages, `## The probe` in particular. Clearest instances:
[`never-block-without-a-tty.md`](../wiki/rules/interactivity/never-block-without-a-tty.md) lines
90–113, [`inert-invocations-do-not-crash.md`](../wiki/rules/lifecycle/inert-invocations-do-not-crash.md)
lines 105–160.

SCHEMA names two audiences — agents and humans — but that is a _rendering_ distinction (both
read plain markdown), not a _purpose_ one. The purpose split that actually exists is:

- **The target-CLI author**, who is in work mode, arrived from a failing check, and needs the
  norm and the remedy.
- **The kit contributor**, who is in study mode, and needs probe design rationale, signal
  taxonomies, coverage mechanics and the history of past mistakes.

Both are served in the same section of the same page. E1's `## The probe` contains:

> Two implementation notes for the checker, both learned the hard way:
>
> - **Do not shell out to `timeout`.** It is GNU coreutils and absent on stock macOS…
> - **Kill the process GROUP, not the process.** …A target that backgrounded a `sleep 30` on
>   stdout took 30 seconds against a 50 ms deadline…

That is a maintainer's engineering log, sitting inside a normative specification page. It is
valuable and should be kept — but it is addressed to whoever next edits `never-block.ts`, not to
someone whose CLI just failed E1. Similarly, G1's `## The probe` carries a `### The first of a
family` subsection about rule-id minting policy and the roadmap for G2/G3, and a paragraph
arguing why fault attribution is decided before deadline attribution.

Diátaxis's "the user's mode matters" rule is the governing one here: study and work are the
fundamental distinction, and a page cannot hold a reader in both.

Recommended outcome: give the kit contributor a home. The already-planned **adding a checker**
how-to (DTX-1) is the natural destination for the implementation notes; probe-design rationale
and the fault/ambiguous signal taxonomy would fit an explanation page — `concepts/probing.md`
or similar — that rule pages link to rather than restate. The rule page keeps a link, not the
prose. This is the single change that would most reduce rule-page length without losing a word
of content.

## DTX-4 — P2: `## The probe` has drifted from reference into essay

Location: rule pages, `## The probe`.

Reference in Diátaxis is austere: describe and only describe, neutral in tone, consulted rather
than read, with examples that illustrate rather than explain. The probe section starts that way
on most pages — an invocation in a fenced block, then the pass conditions — and then argues.

A1, after four lines of pass conditions:

> **One probe, exactly as written.** The near-miss variant — a one-character typo of a real
> flag, discovered from the CLI's own help — belongs to A5, which declares and runs it. A1 does
> not.

G1:

> The order matters and it is deliberate: a fault is decided **first**. A completed observation
> of a violation stays a violation when a different probe hits the deadline…

Both passages are correct and worth keeping. Neither is reference: they justify a design
decision, which is explanation's job, and they are why the section runs to 31 lines on average
against `## The rule`'s 12.

Recommended outcome: hold `## The probe` to the invocations and the pass/fail/unverified
conditions — the part a reader consults. Move the justification either up into `## Why` (which
is already the page's explanation section and is half the size) or out to the shared probing
explanation proposed in DTX-3. This is the same separation the wiki already applies successfully
between `rules/` and `decisions/`; it just has not been applied inside the rule page.

## DTX-5 — P2: `## The details` absorbs three types

Location: [`concepts/`](../wiki/concepts/), `## The details` (avg 85 body lines, max 136 — the
largest section in the wiki by a wide margin).

Diátaxis warns that explanation must stay closely bounded or it absorbs the other types.
`## The details` is where that has happened. In
[`concepts/exit-codes.md`](../wiki/concepts/exit-codes.md) the single heading contains:

- `### The taxonomy` — a code table. This is **reference**: it is consulted, not read, and it is
  plausibly the most-looked-up artifact in the entire wiki.
- `### Exit codes are append-only` — a policy statement. This is normative, or **decision**
  content; the adjacent `decisions/exit-codes-below-125.md` restates the same commitment.
- `### There is no industry standard` and `### How a caller learns what a code means` — genuine
  **explanation**, and excellent.

The cost is concrete: the canonical code table is reachable only by opening a concept page and
scrolling past 85 lines of prose to a third-level heading. `index.md` links to
`concepts/exit-codes.md` with a hook about truncation survival; nothing in the catalog tells a
reader that the authoritative code list is in there.

Recommended outcome: the cheapest fix is navigational — link the anchor
`concepts/exit-codes.md#the-taxonomy` directly from `index.md`. The more correct fix is a
`type: reference` page holding the taxonomy, the error-envelope shape and the output kinds as
consultable tables, with the concept pages explaining them and linking across. That is a larger
change and worth deferring until the guides exist, since guides will make the demand for
consultable tables obvious.

## DTX-6 — P2: normative language outside rule pages

Location: [`archetypes/delegator.md`](../wiki/archetypes/delegator.md) lines 52, 66, 83.

SCHEMA is categorical:

> Normative language in `rule` pages follows RFC 2119: **MUST**, **MUST NOT**, **SHOULD**,
> **MAY**. Nothing else is normative — if a `concept` page seems to state a requirement, the
> requirement lives in a rule and the concept should link to it.

`delegator.md` states three requirements in that spelling:

- "A delegator **MUST** return the child's exit code unmodified"
- "A delegator that needs the distinction **SHOULD** report the child's exit code as a field"
- "a delegator **MUST** declare which discipline it follows"

None carries a `rule_id`, none has a checker, and none can fail a run. So either they are
non-normative despite being spelled normatively — which is the confusion SCHEMA's paragraph
exists to prevent — or they are normative in a page type SCHEMA says cannot be. The archetype
page is arguably a gray zone the rule was not written for, since its whole purpose is to say how
existing rules bind differently. But as written the contract does not cover it.

Note that `concepts/machine-mode.md` handles the identical pressure well, and is the model: it
states design guidance and then explicitly disclaims it — _"**Design guidance, not a rule.**
Nothing in this section binds a conformance verdict"_ — naming which clauses are enforced by
which rule and pointing at the roadmap for the rest.

Recommended outcome: either apply machine-mode's disclaimer pattern to `delegator.md`, or extend
SCHEMA to say that archetype pages may restate obligations that trace to an existing rule id,
and require the trace. The second is probably right, since two of the three delegator clauses do
correspond to existing rules and the third does not.

## DTX-7 — P3: `index.md` catalogues by structure, not by need

Location: [`index.md`](../wiki/index.md).

The index is organised by page type — Concepts, Archetypes, Rules, Decisions, Guides — which
mirrors the directory layout and SCHEMA's own vocabulary. As a catalog it is well made: every
entry carries a one-line hook, and the coverage matrix is genuinely useful.

What it does not offer is any route in by what a reader wants to do. There is no "you are
adopting the kit — start here", no "your check just failed — find your rule id", no "you are
adding a checker". Diátaxis treats navigation as part of the documentation: a reader in work
mode should not have to know the project's internal taxonomy to find their path.

This finding is P3 because it is largely downstream of DTX-1 — the task-oriented entries have
nothing to point at until the guides exist. Add them in the same commit as the guides.

## DTX-8 — P3: the per-type section contract is unenforced

Location: [`lint.ts`](../wiki/lint.ts); [`SCHEMA.md`](../wiki/SCHEMA.md) "Per-type page shape".

SCHEMA's per-type table specifies required sections for all five types. `lint.ts` does not check
it. What the lint does enforce is real and valuable — frontmatter presence and vocabulary, link
and anchor resolution, orphan reachability, the bidirectional rule/checker cross-check, and the
prose `**Gaps**` list against `coverage_gaps` (`statedGaps`, line 318). But the section contract
itself is unchecked, and the `**Established**` list that SCHEMA requires beside the gaps appears
nowhere in the lint at all:

```
$ Established → 0 occurrences in lint.ts
$ Gaps        → 9 occurrences
```

So a rule page could ship with no `## How to comply` at all, or with an `## Established` list
describing a broader measurement than its checker performs, and the gate would pass. That second
case is precisely the failure SCHEMA describes having already happened once — _"Five pages
described a broader measurement than their checker performs while carrying correct frontmatter
two lines above"_ — and the fix applied was to require the prose list, half of which is now
verified.

The wiki's own thesis makes this worth closing: _"a declaration you cannot falsify is a comment
that lies."_ The per-type table is currently that comment.

Recommended outcome: add a section-presence check driven by a table in `lint.ts` mirroring
SCHEMA's. It is mechanical, it is a natural home for whatever page-shape changes come out of
DTX-2 and DTX-3, and it makes the ordering change proposed in DTX-2 enforceable rather than
conventional.

---

## What is working

Worth recording, because the findings above are all structural and could be misread as a verdict
on the writing:

- **Atomicity is right.** One page per rule, cited by path from the failure output, is a good
  design and the reason the reference layer works at all.
- **The lint's bidirectional rule/checker check is the strongest idea in the wiki**, and it is
  doing exactly what SCHEMA claims — the `coverage_gaps` mismatch check is real, tested, and has
  already caught drift.
- **`concepts/machine-mode.md` is the model page for the enforced/guidance boundary** (DTX-6),
  and `concepts/conformance.md` is the model for explaining a distinction the reader will
  otherwise collapse.
- **Pages correct themselves in the text.** `decisions/exit-codes-below-125.md` states plainly
  that an earlier version of the page made a false portability claim. That is rare and it should
  survive any refactor.

## A caveat on applying the framework

Diátaxis's "never mix types" is a strong prescription, and taken literally it would say to split
every rule page into four. That would be the wrong move here. A normative specification page
legitimately carries the norm and its rationale together — that is what specs are, and the
project's citation-from-failure design depends on one page per rule.

The useful reading of the framework for this wiki is therefore not "split the rule page" but the
three things it makes visible: the **application half of the map is empty** (DTX-1), the
**proportions inside the composite page are inverted** relative to its stated purpose (DTX-2),
and **two reader modes are being served in one place** (DTX-3). Those three are worth acting on.
The rest are refinements.

## Recommended sequence

1. **DTX-1** — write the guides. Largest gain, no refactoring risk, and it creates the
   destination that DTX-3 needs.
2. **DTX-3** — relocate kit-internal material into the new checker guide and a probing
   explanation page. This is what shrinks the rule pages.
3. **DTX-2** — rebalance and reorder what remains; bring `## How to comply` up to A1's standard.
4. **DTX-8** — lint the resulting section contract, so the new shape is falsifiable.
5. **DTX-6**, **DTX-5**, **DTX-7** — as convenient.
