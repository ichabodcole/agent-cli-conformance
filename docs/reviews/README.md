# `docs/reviews/` — what was wrong, as of a known commit

Dated defect worklists. A review reads something that already exists — the implementation, the
wiki, a subsystem — against a standard, and records what it found. Its claim is narrow and
past-tense: **"these were the defects at this commit."** That claim never goes out of date,
because it was never about now.

`reviews` is a count noun: each file is one review, with its own lifecycle. Unlike
[`../research/`](../research/README.md), which accumulates, a review **completes**.

## What belongs here

- A code review of an implementation against its spec.
- A review of the documentation against a standard.
- Anything whose output is a list of findings someone is expected to act on.

Every review must name **what it reviewed and at which commit or date**, and give each finding a
stable id (`R6-1`, `DTX-3`). The ids are load-bearing: findings get cited from the code they
caused, so renumbering one invalidates a reference somewhere else.

## What does not belong here

This folder is named after an activity, which is what makes it prone to collecting anything an
agent was asked to produce. It is not a general destination for reports.

- **An inquiry into how something works, or what is possible** — that is an investigation, and
  its record belongs in [`../research/`](../research/README.md) if it clears that bar.
- **A framework evaluation or landscape analysis** — same: dated evidence, so `research/`.
- **A plan for work not yet done** — that is [`../plans/`](../plans/README.md).

The test: a review says _what is wrong with the thing we have_. Anything that instead says _what
is true about the world_ is research, however it was commissioned.

Work that fits none of these goes in `.scratch/`, untracked — see
[`../research/README.md`](../research/README.md#where-work-goes-before-it-gets-here).

## Discharge

A review is spent when every finding has been either

- **actioned** — fixed, with the durable reasoning written into the code comment, the rule page
  or the wiki that the fix touched; or
- **promoted** — carried into [`../roadmap.md`](../roadmap.md), which is the backlog for work
  that remains; or
- **declined** — explicitly, in the review itself.

A discharged review is kept rather than deleted while anything still cites its ids. The
alternative is a committed comment pointing at a finding nobody can retrieve, which is worse
than the folder being untidy.

## A note on citing findings from code

The habit of writing `(review R6-5)` beside a decision is useful and has a cost: it makes this
folder permanent. Prefer making the comment self-sufficient — state the reasoning, and let the
id be a pointer to depth rather than the only record of it.
