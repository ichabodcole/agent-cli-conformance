---
type: plan
generated: { by: claude-opus-5, at: 2026-08-31 }
status: draft
lifecycle: live
description:
  Four documentation changes drawn from the outstanding consumer asks — two bounds three adopters
  asked to have written down, the evidence for two charter questions that was gathered after those
  questions were written, and one false sentence in a shipped report. Each item carries the ask,
  what is in the tree today, and the proposed change.
tags: [adoption, evidence, documentation, conformance]
---

# The bounds the consumers named

**Scope: documentation only.** Every item here is a sentence that a consumer asked for, or a
sentence in the tree that is false. Nothing in this plan changes a checker, a verdict, a report
shape, or a rule id.

Four items. Three land in [`CHARTER.md`](../../CHARTER.md) and share one cascade; the fourth is a
repair to a shipped report and is the deliberate test case for
[`repair-chain`](../../.claude/skills/repair-chain/SKILL.md).

## Why these four and not the rest

The outstanding-ask list has more on it. The items below were selected because each is **asked for
by a named consumer, unblocked, and answerable in prose**. What was considered and left out, with
the reason, is in [Out of scope](#out-of-scope) — that section is part of the plan, because a
scope document that lists only what it does cannot be checked for what it dropped.

---

## Item 1 · The kit verifies consistency, not correctness

**The ask.** `flint`, in
[what three adopters want](../reports/2026-08-26-what-three-adopters-want.md):

> The kit verifies **consistency** between artifacts. It cannot verify the **correctness** of
> either.

Had magpie's help and its parser agreed and both been wrong — a flag documented, accepted, and
inert — the census would have reported `0 disagreements` and been right to. They asked for it in
`CHARTER.md` _"as a stated bound rather than discovered by an adopter who assumed a green census
meant a correct tool"_, and added the part that makes it a bound rather than a defect: _"It is not
a weakness — it is what makes the kit language-agnostic — but it is load-bearing and I did not
find it written down."_

**What is in the tree today.** Nothing. Searched `CHARTER.md`, `README.md`, `STANDARD.md` and the
whole of `docs/wiki/` for the claim in any wording; no passage states it. The word "consistency"
appears in `CHARTER.md` only at line 95, in the unrelated sense that consistency is not
uniformity.

**Proposed change.** A new bound in `CHARTER.md`. It does not belong under **What is out of
scope** — that section is about populations the project declines to serve, and this is a limit on
what the instrument can establish about the population it does serve. Either a short subsection
under **What the project offers**, stating the ceiling beside the offer, or a new section for
stated limits that Item 2 also lands in. **The placement is the one open question in this item**
and should be settled before either sentence is written, because Items 1 and 2 are the same shape
and should not end up in two different places.

**What it must say, and must not.** It states what a green census does and does not license.
It must not read as a defect admission or a deferred feature — there is no roadmap entry behind
it, and inventing one would be the promise-shaped defect the ladder is already criticised for.

---

## Item 2 · The shipped instructions are the larger surface

**The ask.** `sable`, same report:

> On an agent-facing CLI **the shipped instructions are a larger attack surface than the CLI**, and
> your instrument is blind to all of it by construction. Not a gap to close. A boundary to state
> loudly, because an adopter who passes `L0` may reasonably believe their agent-facing contract is
> checked, and the half that most often lies is the half nothing looked at.

Their evidence is a fix the kit cannot see and never will: a `SKILL.md` that told every seat for
two weeks that an unknown positional to `comms read` is silently swallowed, when it had been
fixed twelve hours after the prose was written.

**What is in the tree today.** Nothing in `CHARTER.md` or the wiki. `STANDARD.md` uses the phrase
"shipped instructions" three times (lines 310, 314, 1245), but in the opposite direction — as
evidence the kit _reads_ to decide a flag's scope, not as a surface it cannot reach. That is worth
noting in the edit: the standard already treats shipped instructions as load-bearing for one
question while nothing tells a reader they are unchecked for every other.

**Proposed change.** A second bound, in whichever home Item 1 settles on. `sable` asked for it
"loudly", and the honest framing is theirs: not a gap to close.

---

## Item 3 · Attach the three-adopter evidence to the questions it answers

**The ask.** Not phrased as one — this is evidence the project asked for, received, and did not
file. All three adopters said delete the ladder, by three independent routes, and `trellis` gave
the resolution: **names for boundaries, yes; numbered rungs, no.** `flint` supplied measured harm
rather than an opinion — reading `N/A A4 — arity cannot be probed at L0 … only safe once the
command has declared effects: read_only`, they took it for a roadmap promise and **waited for the
level**. And a sequencing risk: `L0` appears in the verdict line, the most-copied string this kit
produces, so whatever replaces it should be decided before it propagates further.

Separately, `sable` on the rule count: _"`A4` and `B3` declare `probes: []` and return
`unverified` unconditionally — they are not checks, and counting them in '23 rules' costs you
credibility you have otherwise earned."_

**What is in the tree today.** `CHARTER.md` § **What this calls into question** already holds both
questions — "Whether the `L0`/`L1` split survives" and "Whether the 23 rules are the right rules" —
with their evidence attached. But that section was written **before** the 2026-08-26 survey, so
its evidence is internal: the owner's diagnosis, the decisions record, the archaeology mismatch.
The strongest external evidence either question has ever received is not in it.

**Proposed change.** Add the survey's findings to the two existing questions. Nothing is decided
and nothing is deleted — the section's own frame is _"named, not settled"_, and this is what that
frame is for.

Three things distinguish this from restating an opinion, and the edit should preserve all three:

- **the unanimity and the three independent routes**, because agreement reached three ways is
  different evidence from agreement;
- **`flint`'s measured harm**, because "a reader waited for a level that does not exist" is a
  falsifiable event and "the ladder is confusing" is not;
- **`trellis`'s resolution and the sequencing risk**, because the survey does not only say delete —
  it says what to keep, and it says the replacement propagates the moment it changes.

`sable`'s caution belongs with it and is the reason this is evidence rather than a mandate:
_"You are asking three people who are unusually invested, and we will all tell you to delete
things… Do not read our enthusiasm for pruning as license to cut the parts that are load-bearing
for readers who never speak to you."_

---

## Item 4 · The group-command report claims the standard recommends something it does not

**This is the repair-chain test case.** It is small, the defect is a false claim in shipped prose,
and it has a premise other things could be relying on — which is the shape the skill exists for.

**The defect.** [The group-command candidate](../reports/2026-08-26-the-group-command-candidate.md)
closes:

> The answer is that their reading was right, the shape is real, **the standard now recommends what
> they asked for**, and the id is deliberately still unspent.

`STANDARD.md` and `docs/wiki/` contain no group-node guidance. Searched for `group command`,
`group node`, `holds subcommands`, and `subcommands and no flags`; nothing. The recommendation
exists only inside that report, which the report's own **§Status** says plainly two paragraphs
earlier: _"The recommendation above can be revised at no cost **while it lives here**."_

So the document contradicts itself, and the half that is wrong is the half addressed to the
adopter who raised it. This is not a nitpick about wording: the anthill adopter was told a stronger
thing than is true, and a later reader checking whether the standard covers group nodes will not
find it.

**What must not happen.** The obvious repair — softening one sentence — may be the wrong shape.
Two other outcomes are live and the diagnosis has to choose between them before the edit:

1. the sentence is wrong and the report should say the recommendation lives here, unspent; or
2. the sentence describes what was _intended_, and the missing work is a `design-choice`
   recommendation actually landing in `STANDARD.md`.

Deciding that is Step 1 of `repair-chain`, and this item should not be edited until it is decided.
Note that (2) is not a documentation change of the kind this plan is scoped to; if the diagnosis
lands there, the item stops here and becomes a roadmap entry.

**Known cascade, before the inventory is run properly.** One inbound link, from
[the magpie trial](../reports/2026-08-26-the-magpie-trial.md) at line 190, which cites the candidate
in a way that may rely on its status. `flint` and the anthill adopter were both told about this
candidate on channel; a report changing what it claims does not reach them, and that is a limit to
record rather than an action this plan takes — updating the consumers is
[deliberately deferred](#out-of-scope).

---

## How the work is done

**Items 1–3 are one change to one file and share one cascade.** They are drafted, reviewed and
landed together, not as three commits — the placement question in Item 1 is settled first, because
Item 2 lands in whatever it settles on and Item 3's edit sits in the same document.

Run [`cascade-check`](../../.claude/skills/cascade-check/SKILL.md) once over the batch. The facts
to name are the two new bounds and the two amended questions, and the dependents to inspect are the
eleven files that link to `CHARTER.md` — `AGENTS.md`, `README.md`, `STANDARD.md`, one wiki decision
page, and six reports — plus anything stating what a green census establishes. The specific hazard
is a passage that **relies** on the ceiling being unstated: a page promising more than Item 1 now
concedes.

Run [`prose-cold-read`](../../.claude/skills/prose-cold-read/SKILL.md) on the result. `CHARTER.md`
is a document read cold by adopters, which is the reader that instrument simulates, and Items 1 and
2 exist because a reader believed something the page did not say.

**Item 4 runs `repair-chain` end to end**, in `implement` mode, as the first real exercise of the
skill. Its Step 1 finding card has to separate the observation (the standard contains no such
recommendation) from the diagnosis (which of the two outcomes above is true), and the run is
expected to produce a report on the skill itself under §8 of the release skill's convention — a
step that misfired or was ambiguous is worth more than one that passed.

## What "done" looks like

- Both bounds are in `CHARTER.md`, each stating a limit rather than a defect, neither implying
  scheduled work.
- Both open charter questions carry the survey evidence, still undecided, with `sable`'s caution
  attached.
- The group-command report either states its recommendation's real status, or the item is closed
  as a roadmap entry with the diagnosis recorded.
- `bun run check` passes.
- One repair record from the `repair-chain` run, and whatever it says about the skill.

## Out of scope

Named so a reader can see what was dropped and disagree.

- **Deleting the ladder.** Unanimous, and not a documentation change. The replacement for `L0` in
  the verdict line is undesigned, and `flint`'s sequencing risk says designing it is the gating
  step. Item 3 puts the evidence where that decision will be made; it does not make it.
- **The first screen** — census and deltas above the fold, `NOT FULLY VERIFIED` above the rule
  table. Asked for by `trellis` and `flint` from opposite ends, and still the shape of
  `src/acc/commands/check.ts`. It is a code change.
- **The report saying everything twice**, and **the ratchet that does not turn**. Both carried in
  [the roadmap](../roadmap.md); both blocked on report-shape versioning or the outcome algebra.
- **The R3-9 evidence audit.** Documentation work, unblocked, and genuinely valuable — excluded
  only because it is a sweep of every rule page's `## Evidence` section rather than a sentence, and
  batching it with four small edits would hide it.
- **Telling meridian that A6 shipped.** Owed, and deferred at the owner's direction while the
  consumer's own project is in heavy development. The A6 documentation debt itself is already
  discharged: `docs/wiki/rules/parsing/double-dash-terminator.md` carries the measured
  one-terminator-per-bun-layer account and the compensation.
- **`acc check ./a ./b ./c`**, the fleet-divergence ask, and **the install-as-an-adopter gate
  step.** Both unblocked, both code.
