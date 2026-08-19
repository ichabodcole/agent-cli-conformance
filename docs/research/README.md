# `docs/research/` — what convinced us

The evidence trail. Each file records an inquiry: what was asked, how it was answered, and how
well the answer is known. Reports are **dated and frozen** — a research report is never brought
up to date, because its claim is about a moment. Superseded findings are answered by a new
report, not by editing the old one.

`research` is a mass noun on purpose. This is a **corpus**, not a queue: files accumulate, and
nothing here is ever "done" and cleared. That is what separates it from
[`../reviews/`](../reviews/README.md) and [`../plans/`](../plans/README.md), whose contents
complete and expire.

The wiki is what we believe; this is what convinced us. See
[`../wiki/SCHEMA.md`](../wiki/SCHEMA.md).

## The bar

A file belongs here when all five hold. They are not aspirational — they are extracted from
what the existing reports already do.

1. **Dated.** It claims something about a moment, not about now.
2. **Method stated.** A stranger can tell how the claim was reached, and could challenge or
   reproduce it. Name versions, corpora, harnesses, and anything that would change the result.
3. **Scope bounded.** Say what you deliberately did not look at.
4. **Claims labelled by confidence.** Measured, read, and unverified are different things and
   must be distinguishable per claim. Declare your notation in the header —
   `01-case-studies.md` marks unverified claims **unconfirmed**, `02` uses ✅ / 📖 / ❓, `03`
   uses `[MEASURED]` / `[VENDOR]`.
5. **Written to be cited.** Addressed to a stranger who will depend on it, not to the person
   who asked the question.

Fail any of them and it is working material, not research.

## Where work goes before it gets here

Most inquiries should not produce a file at all. If the answer fits in a conversation, that is
where it belongs.

When output is genuinely too large to read inline, it goes in `.scratch/` at the repository
root, which is **untracked**. Nothing can depend on a file nobody else has, so nothing there
owes anyone a decision: delete it, or leave it forever, at no cost. A repository-wide `rg` skips
it, so stale analysis cannot resurface as if it were current.

Promotion is deliberate and looks like this:

```
git mv .scratch/cli-startup-costs.md docs/research/2026-08-19-cli-startup-costs.md
```

…followed by writing the header block above. That act is the bar. Default to leaving work in
`.scratch/` when unsure: promoting costs a move, while demoting costs a deletion and breaks
anything that started citing it.

## What does not belong here

- **A defect worklist against our own code** — that is [`../reviews/`](../reviews/README.md).
- **A statement of how the system is, or what we have decided** — that is
  [`../wiki/`](../wiki/SCHEMA.md), which cites this folder rather than absorbing it.
- **An answer nobody will depend on.** The bar exists so that this stays a corpus worth reading
  rather than a folder worth grepping.

## How these are cited

Rule pages link reports from their `## Evidence` section and decision pages from `## Sources`,
by relative path. Those links are checked: `bun run docs:lint` resolves every one, and the site
build renders this folder so the citations resolve for a reader too.
