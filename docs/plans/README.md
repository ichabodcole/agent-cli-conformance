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

## Discharge

A plan is spent when the work ships. Its durable residue has two homes, and neither is this one:
what remains to be done goes to [`../roadmap.md`](../roadmap.md), and what was learned goes to
the wiki — as a rule, a concept, or a decision page.

A discharged plan is kept as a record of intent while it costs nothing to keep. It is **not**
maintained: do not update a plan to match what was actually built, because a plan edited after
the fact stops being evidence of what was intended and becomes a worse version of the wiki.
