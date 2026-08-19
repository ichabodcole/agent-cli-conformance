# `docs/reports/` — analysis of something that already exists

A report examines material we already have — the implementation, the documentation, a plan, a
subsystem, the whole project — and says what it found. Its claim is past-tense and anchored:
**"this is what was there, as of this commit or date."** That claim never goes out of date,
because it was never about now.

A code review is one kind of report, not the category. So is an audit of the docs, an assessment
of a plan before it is executed, or a read of the project as a whole. What unites them is that
the subject already exists and someone went and looked at it.

`reports` is a count noun: each file is one report, with its own lifecycle. Unlike
[`../research/`](../research/README.md), which accumulates, a report **completes**.

## What belongs here

- A code review of an implementation against its spec.
- An audit of the documentation against a standard.
- An assessment of a plan, proposal or design before the work starts.
- Any analysis of our own material whose output is findings someone is expected to act on.

Every report must name **what it examined and at which commit or date**, and give each finding a
stable id (`R6-1`, `DTX-3`). The ids are load-bearing: findings get cited from the code they
caused, so renumbering one invalidates a reference somewhere else.

## The line against `research/`

Both look at something and write down what was found, so the boundary needs two tests. They
agree in most cases; where they disagree, the second one wins, because it decides the lifecycle.

1. **Whose material is the subject?** A report examines **ours**. Research examines **the
   world** — how other tools behave, what the literature says, what is possible.
2. **What is the output?** A report produces **findings to discharge**. Research produces
   **evidence to cite**, which is never discharged because nothing about it completes.

So a survey of how five CLIs handle unknown flags is research even though someone went and
looked, and a Diátaxis audit of our own wiki is a report even though it applies an external
framework.

## What does not belong here

- **An inquiry into how something works, or what is possible** — that is
  [`../research/`](../research/README.md) if it clears that bar.
- **A plan for work not yet done** — that is [`../plans/`](../plans/README.md).

Work that fits none of these goes in `.scratch/`, untracked — see
[`../research/README.md`](../research/README.md#where-work-goes-before-it-gets-here).

## Filenames

`YYYY-MM-DD-kebab-slug.md`, checked by the lint — as are the links: every relative link in
this folder, README included, must resolve, and any `#anchor` must be a real heading in the
target.

The date is when the document was **first published**, and it is deliberately not required to
equal `generated.at`. OKF defines that as the last meaningful change, so an amended document
moves it — and tying the filename to it would force a rename that breaks every link into the
file. The one relation enforced is ordering: a document cannot have been created after it was
last changed.

## Frontmatter

Every file here carries frontmatter, checked by `bun run docs:lint:artifacts`.

```yaml
---
type: report
generated: { by: claude-opus-5, at: 2026-08-15 }
status: stable               # OKF: draft | stable | deprecated
lifecycle: live              # live | discharged
description: One sentence; what this examined and what it concluded.
tags: [conformance, remediation]
subject: src/acc             # what was examined
examined: 90ea2a8..6adc9de   # the state it describes: commit range, version or date
---
```

**Required:** `type`, `generated`, `status`, `lifecycle`, `subject`, `examined`. **Optional:** `description`, `tags`.

`status` is **OKF 0.2 §5.4** and uses the spec's vocabulary, not a house one: `draft` (not yet
reviewed), `stable` (ready for consumption, and the default when absent), `deprecated` (kept for
links and history; no longer current).

The discharge state these documents actually need is a different question, so it lives in
`lifecycle`, an extension. OKF permits additional keys outright, and adding a field is a weaker
deviation than redefining one the spec already defines — a consumer reading `status: discharged`
would be reading a value the spec says cannot occur.

`generated` follows **OKF 0.2 §13.1**, which supersedes `timestamp` with `generated: { by, at }`.
`at` is when the content was produced and is never bumped; `by` is the actor that produced it,
which for this corpus is usually a model. That is a fact `git blame` cannot record — it names
whoever committed the file, not what wrote it. `unknown` is a legal actor and is the honest entry
for a document whose producer was never captured; a plausible-looking model name would be
fabricated provenance.

These documents are frozen, so `updated` and `date` are **rejected** rather than merely unused.
The wiki's `updated` means "when the content last changed", which is right for a page kept true
and wrong for a record of a moment — carried here it invites a bump that destroys what the
document is for.

`tags` are kebab-case and should be drawn from the vocabulary the wiki already uses
(`bun run acc tags`) so that one query reaches the concept, the evidence behind it and the
report that audited it. A shared vocabulary is not enforced outright — research legitimately
opens subjects the wiki has no page for — but near-duplicate spellings are rejected, since
`exit-code` beside `exit-codes` splits the answer in half.

## Discharge

A report is spent when every finding has been either

- **actioned** — fixed, with the durable reasoning written into the code comment, the rule page
  or the wiki that the fix touched; or
- **promoted** — carried into [`../roadmap.md`](../roadmap.md), which is the backlog for work
  that remains; or
- **declined** — explicitly, in the report itself.

A discharged report is kept rather than deleted while anything still cites its ids. The
alternative is a committed comment pointing at a finding nobody can retrieve, which is worse
than the folder being untidy.

## A note on citing findings from code

The habit of writing `(review R6-5)` beside a decision is useful and has a cost: it makes this
folder permanent. Prefer making the comment self-sufficient — state the reasoning, and let the
id be a pointer to depth rather than the only record of it.
