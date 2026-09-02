---
type: report
generated: { by: claude-opus-5, at: 2026-08-31 }
status: stable
lifecycle: live
description:
  Whether STANDARD.md's content belongs in docs/wiki/. Asked twice and answered differently each
  time — under the tree as organised most of it should not move, and under a from-zero framing the
  barrier turns out to be a missing page type rather than a real boundary. Keeps both answers.
tags: [documentation, diataxis, guidance, declaration, separation-of-concerns, tooling]
subject: STANDARD.md read against docs/wiki/ — its SCHEMA, its STYLE, its page inventory, and the lints that reach each
examined: 393ea8c on `docs/the-bounds-the-consumers-named`, tree clean; STANDARD.md at 1,343 lines
---

# `STANDARD.md` against the wiki

**The question.** Does the content of `STANDARD.md`, or part of it, belong in `docs/wiki/`?

**It was asked twice, under two framings, and the answer is not the same under both.** That is the
report's most useful output and [the next section](#two-framings-and-why-the-answer-moved) is about
the difference rather than about either answer. In short:

- **Framed against the tree as organised** — most of the page should not move, and `SW-1` carried
  that. Its load-bearing premise was that the split is deliberate and stated.
- **Framed from zero** — assume a wiki and no prior decision, and ask where the guidance goes. The
  premise `SW-1` rested on is a status-quo appeal and does not survive the question. What replaces
  it is `SW-9`: the wiki and the standard hold **different licences to state an obligation**, and
  the thing keeping them apart is a page type the wiki does not have rather than a boundary.

**Neither framing is the correct one and this report does not pick.** Under the wiki's current page
vocabulary the merge is wrong; under a vocabulary nobody has written yet it is right. Which is true
is a decision, not a finding.

Four things are worth acting on regardless, and none of them is "move the page":

- Two pieces of load-bearing reasoning have no wiki home while their weaker siblings do (`SW-3`,
  `SW-4`).
- `STANDARD.md`'s own links are held by nothing, while every link _into_ it is gated — the seam is
  one-directional, and in the direction that helps least (`SW-6`).
- So is discoverability: 22 links out to the wiki, one link back, and zero mentions in
  `index.md`, `SCHEMA.md` or `STYLE.md` (`SW-7`).
- Nothing states a prose contract for the page at all (`SW-8`).

**Method.** `STANDARD.md` read in full; [`SCHEMA.md`](../wiki/SCHEMA.md),
[`STYLE.md`](../wiki/STYLE.md) and the `docs/wiki/` page inventory read against it;
[`AGENTS.md`](../../AGENTS.md) and [`README.md`](../../README.md) read for the stated division of
labour. Link and anchor resolution measured by running the repo's own `headingSlugsOf` and `slug`
from [`scripts/docs-lint/index.ts`](../../scripts/docs-lint/index.ts) over the page — not a
hand-rolled slugifier, which produced fourteen false positives on the first attempt before being
replaced. Lint reach established by reading
[`docs/lint.ts`](../lint.ts), [`docs/wiki/lint.ts`](../wiki/lint.ts) and
[`scripts/docs-lint/version-literals.ts`](../../scripts/docs-lint/version-literals.ts). Counts by
`grep` in this tree. **No lint was run against a mutated tree**; the reach claims are read from
the source rather than provoked.

A second pass, after the reframing described below, read
[`normativeLanguageChecks`](../wiki/lint.ts) and the page-type vocabulary at `docs/wiki/lint.ts:761`,
and counted the standard's obligations and recommendation blocks. Findings from that pass are
`SW-9` and the retirement of `SW-1`.

---

## Two framings, and why the answer moved

**The first framing was "does this content belong in `docs/wiki/`, as the tree is organised?"** The
answer was mostly no, and `SW-1` carried it on three legs: `AGENTS.md` states the split, Part 3
already demonstrates the guidance-to-spec relationship working, and Diátaxis binds explanation
pages to being closely bounded.

**The second framing removed the first leg deliberately.** The owner's restatement: _"if there
wasn't an `AGENTS.md` making that split, so that was not determined previously, would that change
your mind?… if we were starting basically from zero, and we're designing this from scratch, and
we're saying, okay, we're going to have a wiki."_

**Two of the three legs did not survive it, and for different reasons.**

- **The `AGENTS.md` premise was a status-quo appeal.** It is evidence that somebody decided, not
  evidence the decision was right, and the from-zero question is precisely the one it cannot
  answer.
- **The Diátaxis and Part 3 legs answered an adjacent question.** Both argue against **fragmenting**
  the standard into a dozen bounded pages. Neither touches **relocating it whole**, which is the
  proposal actually on the table. That conflation was the report's error rather than the framing's.

**The instruction outlived its warrant, which is the pattern worth naming.** "Keep them apart"
partly survives, but not on any reason `SW-1` gave — it survives on a licence-to-oblige distinction
that had to be gone looking for, and that is `SW-9`. The two have to be checked separately: killing
the reason does not settle the advice, and finding the advice still stands does not restore the
reason.

**What the reframing did not do is settle it the other way.** The honest position after both passes
is that this is a live design choice with a stated condition attached, not a barrier that turned out
to be imaginary. `SW-9` names the condition. Until somebody writes it, the first framing's answer is
the operative one, and it is operative because of `SW-9`'s argument rather than `SW-1`'s.

---

## SW-1 — [Retired] The bulk should not move, because the split is deliberate and stated

**Retired as stated. It survives only as the case against _fragmenting_ the standard, which is a
different proposal.** Kept rather than deleted because the report's conclusion moved and the
movement is the finding; the replacement argument is `SW-9`.

**What it claimed.** That the division is already stated — [`AGENTS.md`](../../AGENTS.md) puts
`docs/wiki/` down as "the spec" and `STANDARD.md` as "the guidance itself — the primary product,
and what an adopter reads", with `CHARTER.md` arguing the same order — and that this is two
audiences rather than a filing convention: the wiki is consulted, the standard is read.

**Why that leg fails.** It is an appeal to the state of the tree. A from-zero question asks whether
the decision was right, and a record that it was made cannot answer it. `AGENTS.md` is downstream of
the split, not a reason for it.

**Two arguments from the original finding are still correct, and both are narrower than they
looked:**

- **Part 3 demonstrates the relationship, not the container.** Machine mode, complete output, error
  envelopes, exit codes, non-interactivity and parsing each carry a recommendation, its reason, its
  evidence, and then a pointer — and then stop. Machine mode says it outright: _"That page also
  carries the full contract and the table of what changes between the two modes; read it rather
  than a summary here."_ That shows guidance and spec can be cleanly related without duplication.
  It does not show they need separate directories, and under a merge the same discipline would hold
  between two pages of one product.
- **Diátaxis argues against fragmentation.** [`STYLE.md`](../wiki/STYLE.md) binds explanation pages
  to being _"closely bounded: use a 'why' question to fix the scope"_, and prescribes _"one
  improvement at a time… Do not restructure the wiki in a pass."_ Cutting the standard into a dozen
  concept pages would produce pages each failing the rule that motivated the cut. Moving one page
  whole trips neither clause.

**And the two-homes hazard is about copying, not location.** Nothing compares `STANDARD.md` against
a wiki page — the lint compares a rule page against its checker verbatim in both directions, and
there is no equivalent across this seam. That is an argument for moving rather than duplicating,
whichever container wins, and it is unchanged by the framing.

**Where the live argument went.** `SW-9`.

---

## SW-2 — Part 4 in the wiki would be the versioned-measurement defect, at scale

**Declined.**

[`AGENTS.md`](../../AGENTS.md) names the failure mode precisely: _"a wiki page lifting a versioned
measurement into an unversioned claim,"_ with `B4` asserting "exactly 65,536 bytes" until Bun 1.4
delivered 131,072 through the same code path.

Part 4 — [What is checkable, collected](../../STANDARD.md#part-4--what-is-checkable-collected) — is
almost entirely versioned measurement: a 1-in-7 replay hit rate, a ~28% ceiling over 201 commits,
`0 of 25` declared paths compared, eight rules discriminating across eight targets. Every one of
those numbers is true of a tree at a moment. Carried into a wiki page they would become properties
of the kit, and the page would rot exactly the way `B4`'s number did.

**It is satellite genre.** [`STYLE.md`](../wiki/STYLE.md) already has the category — `roadmap.md`
and `docs/research/` are "not wiki pages and carry no `type`" — and Part 4 sits in it. See `SW-8`
for the wrinkle that `STANDARD.md` is not actually named there.

**A stronger form of the same point, found on the second pass: Part 4 hand-maintains what the tree
already generates.** [The catalogue's coverage matrix](../wiki/index.md#coverage-at-a-glance) is
derived from rule frontmatter by `bun run docs:sync` and the lint fails when it drifts; it reads
`23 rules · 0 complete · 23 partial · 96 named gaps`. Part 4 states the same base facts in prose —
_"Twenty-three rules — twenty-two of them with a checker"_, _"more than 90 named gaps"_ — with no
generator and no drift check behind them. The approximation is honest and it is still a second copy
of a generated number, which is the defect class this project is named after. **Under any merge
Part 4 should be generated or dropped, not relocated.** Its derived analysis — nineteen rules that
can return a verdict, eight that discriminated across eight targets — is real work and belongs
wherever the argument lives; the counts underneath it do not need a second author.

The same reasoning covers the page-local apparatus: the `[C] / [C?] / [—]` legend, the four
evidentiary phrases, [How to read this](../../STANDARD.md#how-to-read-this) and
[Where to start, if you already have a CLI](../../STANDARD.md#where-to-start-if-you-already-have-a-cli).
All four are scaffolding for reading _this document_, and none of them means anything detached
from it.

---

## SW-3 — The narrowing/widening asymmetry has no wiki home, and its weaker sibling has one

**Recommend a `decision` page.** This is the strongest single finding in the report.

The rule, from
[Where the declaration lives](../../STANDARD.md#where-the-declaration-lives-and-who-may-say-what):

> **A statement that narrows the probe surface may be accepted on anyone's word. A statement that
> widens it must come from the tool.**

It qualifies on every test `SCHEMA.md` sets for a decision page. Two independent design sketches
converged on it from opposite premises
([research](../research/2026-08-24-two-declaration-format-sketches.md)). It cites the evidence — the
file-writing population under `SURV-4`, where a wrong widening claim authorises a probe that writes
a file and a wrong narrowing claim only loses a verdict. It governs what the kit will accept. And
it is cited from elsewhere: four documents in `docs/reports/` and `docs/plans/` deep-link the
`STANDARD.md` anchor to reach it.

**It appears nowhere in `docs/wiki/`.** Measured: every occurrence of "narrow" across the wiki is
an unrelated sense — a narrowed promised surface, a narrow pass, a narrower audience.

**The asymmetry that makes this worth acting on** is that the _weaker_ principle already has a page.
`STANDARD.md` says its "every default is absent, never a value" rule is
_"the repository's own [if it is not in the config, it is not inferred] applied one level down"_ —
and [that one](../wiki/decisions/not-in-the-config-not-inferred.md) is a decision page with a
`related` graph and a place in the catalogue. The parent has a home; the rule the parent is derived
from does not.

**Second candidate, same genre, weaker:** _"say nothing about effects — and do not record it as a
placeholder"_. It carries an argued rationale, a withdrawn prior position, and a stated reopening
condition (_"The field earns its place when a concrete consumer and a testable contract for it
exist"_). That is decision-page shape exactly, and it currently lives as a bullet inside a bulleted
list.

**Not a copy.** If either lands in the wiki, `STANDARD.md` reduces to the statement plus a pointer,
the way Part 3 already treats machine mode.

---

## SW-4 — There is no `concepts/declaration.md`, and the declaration is what the project bets on

**Recommend a `concept` page.**

The wiki has a concept page for exit codes, machine mode, output kind, the error envelope,
conformance and probing — every part of the CLI surface **except the declaration**. Measured:
`formatVersion` and the v0 shape appear in two guides and in no concept page.

So the answer to "what does a v0 document carry, and what happens if I add a key it does not
define" is a twenty-row table plus
[Emit v0, hold the rest](../../STANDARD.md#emit-v0-hold-the-rest), sitting near the middle of a
1,343-line document whose surrounding prose is argument.

**By the wiki's own Diátaxis table that material is reference**, and `STYLE.md` is specific about
what reference is for: it is _"consulted while working, which is why a rule page is read by someone
mid-task whose attention is elsewhere."_ A reader mid-emitter-write is exactly that reader, and the
neighbourhood they land in is the wrong mode for them.

**The constraint, which decides the page's shape.** `STANDARD.md` already says
[`declaration.ts`](../../src/acc/kit/declaration.ts) is the authority and the table is not — _"it is
the authority, not this table"_. A wiki page must not become a third copy of the key list. What it
should carry is what a concept page carries elsewhere: what a declaration **is**, the refuse-unknown-keys
semantics and why they are not negotiable, the two speech acts (declaration versus caller policy)
and their different lifetimes, and a pointer to the file for the keys. That is the same relationship
[output kind](../wiki/concepts/output-kind.md) has to the report shape today.

---

## SW-5 — The group-node recommendation reads like a rule page minus an id; leave it, and note why

**Declined for now, recorded because the tension is real and recent.**

[A group node that refuses a flag should name its subcommands](../../STANDARD.md#a-group-node-that-refuses-a-flag-should-name-its-subcommands)
has the full apparatus of a rule page: a five-vendor survey with counts, a `design-choice`
versus `defect` classification, a named `[C?]` blocker, and a stated third answer that is not a
design choice at all. It landed on 2026-08-31 in `bc01da4`, and the reason is on the record —
_"a recommendation costs no id, no denominator and no checker"_ — with minting explicitly banked
behind the probe-level vocabulary question in
[the plan after the ladder](../plans/2026-08-26-the-plan-after-the-ladder.md).

That reasoning holds and this report does not reopen it. **The cost it accepts should be legible,
because it is invisible from inside the page:** a reader who enters through
[the wiki catalogue](../wiki/index.md) never meets the recommendation, and the sentence
_"No rule id has been minted for any of this and none should be cited"_ is visible only to
`STANDARD.md`'s reader — which is not the population most likely to go looking for an id.

If anything about this moves, it is a **decision** page recording _why no id was minted_, which is
decision genre exactly. It is not a rule page, and minting an id to solve a discoverability problem
would be the wrong repair.

---

## SW-6 — `STANDARD.md`'s own links are gated by nothing, and the links into it are gated

**Action.** The seam is one-directional, and in the direction that helps least.

Measured in this tree:

| Direction                                     | Count | Held by                                                               |
| --------------------------------------------- | ----- | --------------------------------------------------------------------- |
| Into `STANDARD.md` anchors from reports/plans | 14    | `docs/lint.ts` — `checkLinks` resolves targets outside its own corpus |
| Into `STANDARD.md` from `docs/wiki/`          | 1     | `docs/wiki/lint.ts`                                                   |
| Out of `STANDARD.md` to other files           | 92    | **nothing**                                                           |
| `STANDARD.md`'s same-file anchors             | 21    | **nothing**                                                           |

`docs/lint.ts` walks `docs/reports`, `docs/plans` and `docs/research`. `docs/wiki/lint.ts` walks
`docs/wiki`. Neither walks the repository root, so `STANDARD.md` is a link **target** the gate
protects and a link **source** it never reads.

**All 113 internal links resolve today** — checked with the repo's own `headingSlugsOf`, and the
first pass's fourteen failures were my slugifier collapsing `\s+` where the repo replaces `\s`
singly, which is what makes an em-dash heading produce a double hyphen.

**The 21 same-file anchors are the live hazard, not the 92.** `STANDARD.md` has been edited in
twelve commits recently, several of them structural — `393ea8c` repairs eleven defects, `ed13111`
restructures "in the reader's ordering", `762e158` removes a passage a heading pointed at. A
heading rename in that page silently breaks its own cross-references, and CI is green either way.
Meanwhile a heading rename would be caught if — and only if — one of the fifteen inbound citations
happened to point at it.

**Two repairs, and the first is much cheaper.**

1. **Extend the artifact lint's link check to root-level markdown** — `STANDARD.md`, `README.md`,
   `CHARTER.md`, `AGENTS.md`. `checkLinks` already handles targets outside its corpus, so this is a
   walk-root change and not new machinery. It does not require deciding anything about frontmatter,
   `type`, or orphan reachability, none of which these files should carry.
2. **Move a piece into the wiki**, which gets it the full lint. This is a consequence of `SW-3` and
   `SW-4` rather than an argument for them — the gate is a reason to prefer the wiki for material
   that qualifies on its own merits, and not a reason to move material that does not.

---

## SW-7 — Discoverability is one-directional too

**Action, and it is the same shape as `SW-6`.**

Measured: `STANDARD.md` contains **22** links to `docs/wiki/`. `docs/wiki/` contains **one** link
back, in [how to record surfaces below the root](../wiki/guides/how-to-record-surfaces-below-the-root.md).
`index.md`, `SCHEMA.md` and `STYLE.md` mention `STANDARD.md` **zero** times.

`README.md` routes correctly — _"Start with `STANDARD.md` if you are building a CLI"_ on line 9 —
so a reader arriving at the repository is fine. A reader arriving at
[the wiki catalogue](../wiki/index.md), which is where a failing rule id or a search result lands
them, is not: the catalogue's "Start here" table has ten rows and none of them names the document
`AGENTS.md` calls the primary product.

**The repair is one row in that table**, on the same pattern as the existing ones — an
"If you are… / Start at…" entry for the reader who is building or retrofitting a CLI rather than
running the kit against one. That is cheaper than any content move and it addresses the reason
someone would ask for a move in the first place.

---

## SW-8 — `STANDARD.md` is governed by no prose contract

**Recorded; the repair is one sentence.**

[`SCHEMA.md`](../wiki/SCHEMA.md) governs the wiki. The folder `README`s govern reports, plans and
research. [`STYLE.md`](../wiki/STYLE.md)'s "Satellites" section extends the density rules — though
not the type-specific language rules — to `docs/roadmap.md` and `docs/research/` by name.

`STANDARD.md` is named in none of them; `STYLE.md` mentions it zero times. What actually reaches it
is Prettier's `--check` and the repo-wide version-literal sweep, which walks everything outside
`node_modules`, `.git` and `.scratch` and carries an explicit `STANDARD.md` allowlist entry for
`0.1.0`. Neither is a prose contract.

In practice the page is held to a higher bar than any contract would set — its own
[How to read this](../../STANDARD.md#how-to-read-this) declares four evidentiary phrases, a
three-mark checkability legend and a sourcing requirement, and the
[`prose-cold-read`](../../.claude/skills/prose-cold-read/SKILL.md) pass is run against it. So this
is not a live defect. It is an undocumented one: the discipline lives in the page and in a skill,
and a contributor reading `STYLE.md` to find out what governs `STANDARD.md` finds nothing.

**Adding it to the Satellites list** — density rules bind, type-specific language rules do not,
because it is not one Diátaxis mode — states what is already true.

---

## SW-9 — The barrier is a missing page type, not a boundary

**Open, and it is a design decision rather than a defect.** This finding replaces `SW-1` as the
report's answer to "should they be one product."

**The wiki rests on an invariant: an obligation requires a rule id and a checker behind it.**
`SCHEMA.md` has said _"Nothing else is normative"_ since the wiki began, and for a long time nothing
enforced it — so [`archetypes/delegator.md`](../wiki/archetypes/delegator.md) accumulated three
**MUST**s and a **SHOULD** that no `rule_id` backed and no checker could fail, found in review
`DTX-6`. The response was to install a lint, and the comment on it is the project's own voice:

> An obligation nothing can measure is the shape this project exists to report, and it is worse on
> a page a reader takes for spec.

**The standard rests on the opposite licence: evidence, not enforceability.** It says so where a
reader meets it — _"No new rule ids are minted here"_, and for the group node, _"a recommendation
costs no id, no denominator and no checker."_

**Measured in this tree.** Eight `**Recommendation.**` blocks plus the group-node section. **Every
one is broader than the rules that partially cover it**, and two have no rule at all: the group node
(_"none should be cited"_) and pagination, which describes itself as _"the thinnest recommendation
on the page"_ with no supporting defect in either archaeology corpus. Zero bold RFC 2119 keywords,
so the page would pass `normativeLanguageChecks` by the letter, against 15 `must`, 7 `must not` and
14 `should` in ordinary prose — it clears the regex and not the reason behind it.

**So the two documents hold different licences to tell somebody what to do.** That is the barrier,
and unlike `SW-1`'s premise it does not depend on the tree's history: it was found by a review and
is enforced in code. Merge the containers as they stand and one licence has to give — either the
wiki stops requiring an id behind an obligation, or the standard stops making unbacked
recommendations, which is most of what it is for.

**The third option is a page type the wiki does not have.** Call it `recommendation`: states
obligations, carries its evidence, carries a checkability mark, mints no id, and is exempt from the
normative lint **because** it declares its own unenforceability inline. That is a fourth normative
status beside `core`, `diagnostic` and absent, and it answers the exact objection `DTX-6` raised —
the hazard there was an unbacked obligation on _a page a reader takes for spec_, and a page type
whose contract is "these are not enforced" is not that page.

**The vocabulary already exists.** The standard's `[C] / [C?] / [—]` legend was invented precisely
because the page needed a way to say "this is an obligation nothing checks." That legend is most of
the missing contract, already written and already read by adopters.

**What it costs.** One line at `docs/wiki/lint.ts:761`, where the type vocabulary is a literal
array. The real work is the contract: a `SCHEMA.md` section saying what a `recommendation` page must
carry, a row in `STYLE.md`'s language-by-type table, and a catalogue section. Call it a page of
contract text, not a refactor.

**What it would pull with it.** Part 3 largely dissolves — it exists in part to bridge a directory
gap, and inside one product a curated reading order over the rules is a shorter thing. Part 2's
field table becomes `SW-4`'s concept page. Part 4 is `SW-2`.

**What would settle it, and it is not an argument.** Write the contract, publish one
`recommendation` page, and put it in front of a reader who has not been briefed. If they take it for
spec — cite it as a rule, ask which id it is, treat a decline as a failure — the licences do not
coexist on one shelf and the split was load-bearing after all. If they read the mark and understand
that declining costs them nothing, the barrier was the missing type.

**Until then, do not merge.** Not because the split is right, but because the merge without the
contract silently converts recommendations into apparent spec, and the standard's own counter-example
population — `ffmpeg`, `find`, `dd`, `jq`, `ssh`, `psql` — exists to say that declining is
legitimate.

---

## Findings and disposition

| Id     | Finding                                                                                                      | Disposition                                                                                           |
| ------ | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `SW-1` | The bulk should not move, because the split is deliberate and stated                                         | **Retired** — status-quo premise; survives only as the case against _fragmenting_. Replaced by `SW-9` |
| `SW-2` | Part 4 lifts versioned measurement into claims, and hand-copies a generated table                            | **Declined for relocation** — generate it or drop it, do not move it                                  |
| `SW-3` | The narrowing/widening asymmetry has no wiki home; its weaker sibling has one                                | **Open** — write a `decision` page, reduce page to a pointer                                          |
| `SW-4` | No `concepts/declaration.md`; every other part of the surface has a concept page                             | **Open** — write a `concept` page carrying shape and semantics, not keys                              |
| `SW-5` | The group-node recommendation reads like a rule page minus an id                                             | **Declined for now** — reasoning is on the record and recent; cost noted                              |
| `SW-6` | 92 outbound links and 21 self-anchors held by nothing; 15 inbound links held                                 | **Open** — extend the artifact lint's link check to root-level markdown                               |
| `SW-7` | 22 links out to the wiki, 1 back, 0 from `index.md` / `SCHEMA.md` / `STYLE.md`                               | **Open** — add a "Start here" row to the wiki catalogue                                               |
| `SW-8` | No prose contract names `STANDARD.md`                                                                        | **Open** — name it in `STYLE.md`'s Satellites section                                                 |
| `SW-9` | The wiki and the standard hold different licences to state an obligation; the barrier is a missing page type | **Open** — a design decision. Write the `recommendation` contract, or do not merge                    |

**Cheapest first, and note that the cheap ones are independent of the merge question.** `SW-6`,
`SW-7` and `SW-8` are all "the fence is in the wrong place" rather than "the content is" — they get
most of the benefit a merge would buy, at no risk and in whichever direction `SW-9` eventually
settles. `SW-7` and `SW-8` are one line each; `SW-6` is a walk-root change to a check that already
resolves targets outside its corpus.

`SW-3` and `SW-4` are real writing and should be taken one at a time, which is what `STYLE.md`
prescribes anyway. **`SW-9` is the only one that is a decision rather than a task**, and nothing
else in this list waits on it.

## What this report did not examine

- **Whether the two proposed pages would pass their own cold read.** Recommending a page is not
  drafting one, and `SW-3` and `SW-4` are arguments that a gap exists rather than evidence that the
  page filling it would be good.
- **Whether any adopter has been hurt by `SW-7`.** The discoverability finding is a structural
  observation about link direction. Nobody in the trial record reports failing to find
  `STANDARD.md`, and no such report was looked for.
- **The wiki's own Diátaxis conformance.** `STYLE.md` is applied here as the standard
  `STANDARD.md` is measured against, and the wiki's pages were not audited against it.
- **Whether a `recommendation` page type would hold in practice.** `SW-9` argues the contract is
  writable and that the `[C] / [C?] / [—]` legend is most of it. Nobody has drafted it, and no
  reader has been put in front of one — which is the test `SW-9` names and this report did not run.
- **Whether a third framing exists.** Two were tried, and the second was supplied rather than
  found. A report that changed its answer once under reframing should not be read as having
  exhausted the frames.
