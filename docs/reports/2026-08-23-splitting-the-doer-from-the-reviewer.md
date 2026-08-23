---
type: report
generated: { by: claude-opus-5, at: 2026-08-23 }
status: draft
lifecycle: live
description:
  A first run at separating the roles — manager, implementers, an independent reviewer, a repairer
  — over one concrete scope of work. Written during the run, then corrected by a cold read that
  found it counting the defect the method caused among the defects the method found. Four genuine
  defects, one manufactured, and a cost the first draft did not measure.
tags: [method, agents, review, orchestration, separation-of-concerns]
subject: Part 1 of the runway plan, implemented on 2026-08-23 by four agents in four roles
examined:
  the six disclosure items of docs/plans/2026-08-23-clear-the-runway-then-take-off.md, and the
  briefs, diffs and reports of the agents that executed them
---

# Splitting the doer from the reviewer

> **This report was corrected by its own reader.** The first draft was written by the manager whose
> orchestration it assesses, and a cold read found it counting the defect the method caused among
> the defects the method found, crediting role separation for wins that came from the briefs, and
> arguing a cost/benefit from quantities it never measured. Those are fixed below. The pattern is
> worth keeping in view: a self-assessment written by the agent being assessed reached for the
> flattering reading in three separate places, and none of them were deliberate.

## Why this run was different

Every previous change in this project was made the same way: one agent held the plan, wrote the
code, and judged the result. That agent marks its own homework, and the failure it cannot see is
the one where its own repair breaks something it was not looking at. **That failure occurred three
separate times in the twenty-four hours before this run** — a release note whose fix introduced a
false alarm, an install command that silently switched a reader's transport, a "one more cold read"
that turned out to need four.

So this run assigned the roles to different agents. The rule, stated to each of them in their own
brief: **the person who does the work is never the one who says it is done.**

## The scope

[Part 1 of the runway plan](../plans/2026-08-23-clear-the-runway-then-take-off.md) — six items,
all the same shape: the kit knows something and does not say it. The cwd is consulted for
`acc.config.json`; rule `B4` has no checker and is silently absent from every report; evidence ids
exist but are unreachable; a blocked `husky` postinstall is expected and inert; two malformed error
strings.

Chosen deliberately as an easy scope for a first run of the method. Every item is small, and none
of them needed a design decision that the plan had not already made.

## The roles, as actually run

| role            | who                          | told to                                                   |
| --------------- | ---------------------------- | --------------------------------------------------------- |
| **manager**     | the session agent            | brief, read, sequence, decide — and write no code         |
| **implementer** | two agents, in parallel      | make the change; you are not the reviewer; do not commit  |
| **reviewer**    | one agent, after both landed | find defects; **fix nothing**; work in your own worktree  |
| **repairer**    | a third implementer          | fix what review found; the same reviewer will re-read you |
| **re-review**   | the original reviewer        | assume a repair broke something and go looking            |

The two implementers were split by **file ownership** — one owned `src/**`, the other owned
`README.md`, `docs/wiki/**` and `package.json` — so they could run at the same time without
colliding. That decision is the source of this run's one self-inflicted defect; see below.

## What went into a brief

Each implementer brief carried, in this order: the grounding docs to read first, **why the work
exists** rather than only what to change, the specific items with the evidence behind them, an
explicit statement of what the agent did **not** own, and how to work (match the surrounding code,
tests expected, gate must pass, do not pipe the gate, do not commit).

Two lines did more work than their length suggests:

- **"You are NOT the reviewer — someone else will review this, so do the work honestly and report
  what you are unsure about rather than defending it."** Every implementer came back with a
  self-flagged uncertainty section. One of them named a contradiction risk it could not check, and
  that risk had materialised.
- **A judgement handed over rather than an instruction.** Where the manager did not know the answer
  — whether `acc show <id>` could resolve an observation at all — the brief said so, asked for a
  decision with reasoning, and got a better answer than the one it would have imposed.

## What review caught, and what it does not prove

The reviewer returned **five defects. One of them the method itself created** — see below — so the
honest count of things review saved us from is **four**:

1. The config **error** path was left behind by the disclosure: a malformed config discovered in
   the cwd named the file without its directory and advised dropping a flag the caller never typed
   — the loudest instance of the exact case the item existed to disclose. In `src/`, which the
   `src` implementer owned.
2. A **third malformed error string** of the same class as the two the same implementer had just
   repaired, one branch away from its own edit.
3. `docs/roadmap.md` still documented the `husky` postinstall block as an open gap after the change
   closed it. The reviewer measured both commits from a cold cache to establish that.
4. A new ⚠ in the install guide **stacked directly under a stale ⚠ telling the reader the
   opposite** — "this check distinguishes nothing" above "here is how to do the check". In
   `docs/wiki/`, which the docs implementer owned.

**Note what that list does and does not support.** Three of the four sat inside the partition of the
implementer who wrote the neighbouring lines; the fourth, `docs/roadmap.md`, sat in **no** partition
at all, because the briefs named `README.md`, `docs/wiki/**` and `package.json` and nobody owned the
roadmap. So this is not evidence that splitting the work by area reveals things — it is the older,
duller finding that **someone who did not write the change sees things its author does not**, plus
one file nobody was assigned.

The reviewer also **cleared** the change the manager was most worried about: `B4`'s new
not-applicable finding moves `conformant`, `fullyVerified`, every count, every `evidenceGaps` id and
the text headline **not at all** — established by running base against patched over three fixtures.
Any single agent could have run those fixtures. What the separation bought was that somebody
actually did, on work they had no stake in.

And it falsified three tests the implementer had **not** claimed to have falsified, then checked the
two weakest-looking assertions against the baseline to confirm they were not passing vacuously.

## What the implementers found that the manager had got wrong

**The plan contained a false premise.** It said "the text report says, once, how to resolve the ids
it prints" — but the text report prints no evidence ids at all. They appear only in JSON. The
manager had written that from a trial report's phrase "every finding cites opaque hashes" without
noticing it was quoting a JSON payload. The implementer checked, found no such code path, said so,
and built the disclosure to say where the ids **are** instead.

**Do not over-read this.** The catch came from an implementer checking the plan against the code
while implementing, which is what any competent single agent does. What made it _reach the manager_
rather than being silently worked around was a line in the brief asking for uncertainties. That is a
prompting improvement, and it would work just as well without any role separation at all.

**Two judgement calls were handed over rather than dictated, and both came back with reasoning the
brief did not contain.** Whether they are _better_ than what the manager would have imposed is not
knowable — the imposed version was never written, so this is a comparison with one entrant. `acc show <observation-id>` deliberately
does not resolve — observations die with the process, so real resolution means a report file, a new
flag and a staleness question, in exchange for a lookup `jq` already does; the affordance became
the error message instead. And `B4`'s not-applicable is forced **regardless of probe level**,
because a rule with no checker is out of scope at `L1` too — otherwise `B4` silently flips to
`UNVR` ("we looked and could not tell") the day `L1` ships, which would be a lie the report tells
by itself.

## What the split itself caused

**Defect 1 was created by the orchestration, not by either implementer.** Two agents wrote about
one behaviour at the same time. Each was correct when written; the combination was false, because
the docs described the world as it was while the code changed it.

The briefs partitioned **files**. The defect was in a **subject** that spanned both partitions.

The implementer that could not check it pre-registered the risk in its report: _"if their flag
string says anything about searching upward, mine is the one that matches the code."_ Useful — but
it does not redeem the split, and the first draft of this report used it to do exactly that. **The
defect was seen by an implementer before review ever ran.** It was not invisible; it was
unverifiable from inside one partition. Those are different claims, and the first draft leaned on
the stronger one.

The full ledger for the parallel split: one defect created, one review finding consumed, one repair
round, one re-review, in exchange for about eight minutes of saved wall clock.

## Rules this run earns

1. **Partition subjects, not files** — and notice where that leads. A claim about one behaviour
   gets one owner even when it spans `src/` and `docs/`. The fallback, landing the code first so
   the docs describe what exists, **serialises the implementers and dissolves the parallelism the
   two-agent split existed to buy**. Followed honestly, this rule mostly argues for one implementer
   per subject, which is what the repair round used, and the repair round produced no
   contradiction.
2. **The reviewer must not fix.** Stated in the brief and obeyed — but **untested here**, because
   the reviewer never tried to. The rationale ("a reviewer that repairs starts defending its
   repairs") is a design preference, not something this run established.
3. **The repairer is not the implementer, and the re-reviewer is the original reviewer.** Also
   untested: no repair was rejected, so the relationship was never stressed. What happens when the
   reviewer is wrong, or the repairer disagrees, has no procedure yet.
4. **Ask for uncertainty explicitly.** Every agent returned something useful under it, and one of
   those entries was a live defect.
5. **Hand over judgements the manager cannot make.** Two of the better decisions in this diff came
   from an implementer being asked to decide rather than told what to do.
6. **The manager reads, but is not the gate.** Reading the diff was still worth it — it is where
   the false-premise finding got confirmed — but the verdict came from an agent that had written
   none of it.

## Cost

| agent              | tokens | wall clock | tool calls |
| ------------------ | ------ | ---------- | ---------- |
| implementer (docs) | ~97k   | 7m 30s     | 37         |
| implementer (src)  | ~225k  | 18m 12s    | 90         |
| reviewer           | ~120k  | 8m 15s     | 50         |
| repairer           | ~130k  | 10m 56s    | 64         |

Roughly 570k subagent tokens for six small disclosure items. **This is an undercount, and not the
run's total**: it excludes the manager's own tokens, the re-review, and the cold read that corrected
this report. Only the two implementers ran in parallel; review → repair → re-review are serial and
dominate the end-to-end time, which was not recorded.

**What the parallel split itself cost.** It saved perhaps eight minutes of wall clock and produced
one defect that then consumed a review finding, a repair round and a re-review. On this run's
evidence the split was a straightforward loss.

**Is that worth it?** Not answerable from this run, and the first draft of this report answered it
anyway. What can be said: four defects were found before the commit rather than by the next adopter,
each inside the area of whoever wrote it. What cannot be said is what finding them later would have
cost — no field-discovery cost has ever been measured here, so any comparison between that and a
token count is a conversion between units nobody has defined.

The three prior failures cited at the top of this report motivated the run; they are **not**
independent evidence that the method pays for itself. That is one observation spent twice, on a base
rate of three, all selected by the same author who chose the method.

The scope was also chosen for being easy — small items, no design decisions. Nothing here shows how
the method behaves on the expensive-to-be-wrong changes it would most plausibly be for.

## What the final gate returned

The re-review — the stage designed to catch precisely the failure named in the opening paragraph —
was still running when this report was drafted, so the first draft graded the method **before its
own final gate reported**. It has since returned, and it earned its place:

**Every one of the five repairs held under re-running, and the round produced exactly one new
defect — in a repair.** Both rewritten passages said the config disclosure appears "on its
`config:` line", which is true of the text report and false of `--json`, inside a sentence whose
scenario is _"CI runs from the repo root"_ — and a CI run is the one most likely to be JSON. A
literally-untrue clause had replaced a literally-untrue clause in the same sentence.

That is the fourth time in two days that a repair introduced a defect, and the first time a stage
existed whose job was to catch it. It was fixed and the fix verified in both formats before the
commit.

The re-review also **overturned one of the repairer's own least-confident calls in its favour**
(the roadmap strikethrough, matched verbatim against the file's existing precedent) and declined to
back another (the two-paragraph ⚠, which it would cut for duplicating a section one screen below —
a preference, and recorded as one).

## Open questions for the next run

- **Should there be a separate planner?** The manager wrote the plan and briefed against it, and
  the plan's one false premise survived until an implementer checked it. A planner who did not
  brief might have been checked earlier — or might have added a hand-off where context is lost.
- **Should the reviewer see the implementers' self-reported uncertainties?** This run gave it one
  of them, as a pointed question. Giving it all of them risks anchoring it on what the implementers
  already suspected, at the cost of what nobody suspected.
- **When is one implementer better than two?** The parallel split cost a defect and saved perhaps
  eight minutes of wall clock. The repair round used a single implementer over the whole tree
  precisely because the items were cross-cutting, and produced no contradiction.
- **Who checks off the plan?** The repairer explicitly declined to, on the grounds that nobody asked
  and it was mid-repair. Correct instinct, unassigned job — and the process as run therefore has no
  defined completion, which an adopter would inherit.
- **The reviewer is the least specified role and it carries the method.** This report says what the
  reviewer was told not to do far more precisely than what it was given, what counts as a defect, or
  how it knows when to stop. An adopter can copy the org chart and not reproduce the thing that
  actually produced the findings. Writing the reviewer's brief down verbatim is the single most
  useful next artifact.
