# `docs/plans/` — how we intend to build something

A plan is a scope of work written to be executed: the goal, the architecture it assumes, and the
steps in order. Its claim is **"this is how we mean to build X"** — an intention, addressed to
whoever does the work.

`plans` is a count noun. Each file is one plan, and a plan **completes**: once the work has
shipped, the document is a record of what was intended, which is not the same as a record of
what exists. `2026-08-13-conformance-kit.md` still says the catalogue holds 19 rules; it held 23
by the time you read this, and that is not a defect in the plan. It is what a discharged plan
looks like.

## What belongs here

- An implementation plan for a scope of work large enough to need one.
- A spec written to be handed to an implementer, human or agent.

Name the date and the goal at the top. If the plan is meant to be executed task-by-task, say so
and use checkboxes, as the existing one does.

## What does not belong here

- **What we intend overall** — that is [`../roadmap.md`](../roadmap.md), which is durable and
  maintained. A plan is one scope; the roadmap is the standing backlog.
- **What we decided and why** — that is a `decision` page in
  [`../wiki/`](../wiki/SCHEMA.md).
- **What we found out** — that is [`../research/`](../research/README.md).

Working material that is none of these goes in `.scratch/`, untracked — see
[`../research/README.md`](../research/README.md#where-work-goes-before-it-gets-here).

## Filenames

`YYYY-MM-DD-kebab-slug.md`, checked by the lint.

The date is when the document was **first published**, and it is deliberately not required to
equal `generated.at`. OKF defines that as the last meaningful change, so an amended document
moves it — and tying the filename to it would force a rename that breaks every link into the
file. The one relation enforced is ordering: a document cannot have been created after it was
last changed.

## Frontmatter

Every file here carries frontmatter, checked by `bun run docs:lint:artifacts`.

```yaml
---
type: plan
generated: { by: claude-opus-5, at: 2026-08-13 }
status: stable               # OKF: draft | stable | deprecated
lifecycle: discharged        # live | discharged
description: One sentence; what this plans to build.
tags: [conformance, testing]
---
```

**Required:** `type`, `generated`, `status`, `lifecycle`. **Optional:** `description`, `tags`.

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

A plan is spent when the work ships. Its durable residue has two homes, and neither is this one:
what remains to be done goes to [`../roadmap.md`](../roadmap.md), and what was learned goes to
the wiki — as a rule, a concept, or a decision page.

A discharged plan is kept as a record of intent while it costs nothing to keep. It is **not**
maintained: do not update a plan to match what was actually built, because a plan edited after
the fact stops being evidence of what was intended and becomes a worse version of the wiki.
