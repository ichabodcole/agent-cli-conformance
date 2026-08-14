# The wiki's maintainer contract

You are (probably) an agent about to add or update a wiki page. This file is the whole
contract — read it once, then work. Humans: this file governs structure; the content lives in
the pages.

## What this wiki is

The durable, curated knowledge for the **Agent CLI Conformance** project: what each part of a CLI
_is_ (concepts), what shapes CLIs take (archetypes), the normative rules a conforming CLI must
satisfy (rules), why we chose what we chose (decisions), and how to actually do things
(guides).

It is **not** the evidence trail. Research reports live in `research/` outside this wiki —
dated, unmaintained, cited by `decision` pages. The wiki is what we believe; `research/` is
what convinced us.

Two audiences, one source of truth:

- **Agents** read these files raw. That is why everything below insists on plain markdown.
- **Humans** read them on GitHub or in an editor. There is no render host, so every link must
  work as a plain relative path.

## Layout

```
docs/wiki/
  SCHEMA.md      ← this contract (never a page; exempt from frontmatter + orphan checks)
  index.md       ← the catalog: ONE line per page (link + hook). Update it with every page.
  lint.ts        ← link/anchor/frontmatter/rule lint; `--json` emits the knowledge graph
  concepts/      ← the vocabulary: what each part of a CLI IS
  archetypes/    ← the shapes a CLI takes (stateless-verb, daemon-session, delegator…)
  rules/         ← ONE PAGE PER NORMATIVE RULE, grouped by category folder
  decisions/     ← why we chose X over Y, citing research/
  guides/        ← how to adopt the spec, add a checker, migrate a CLI
```

`concepts` / `archetypes` / `rules` are **topical** — they describe the contract itself, so
folders organise them. `decisions` / `guides` are **atomic and cross-cutting** — `tags` and
`related` carry their graph, and folder depth stays flat.

## Hard rules

0. **Read the neighbours first.** Before writing, read [index.md](./index.md) and ONE existing
   sibling page of the same `type`. That sibling is the live example for anything this
   contract doesn't spell out, and it's how you find real anchor names.
1. **Plain markdown only.** No HTML beyond what GitHub renders. Every page starts with an
   `# H1` matching its frontmatter `title`.
2. **Relative `.md` links** between pages (`../concepts/exit-codes.md#the-taxonomy`). They must
   work on GitHub and in a bare editor — never absolute URLs for internal pages. Anchors are
   GitHub-style slugs of the target heading (lowercase, spaces → `-`, punctuation dropped:
   `## Why it fails (silently)` → `#why-it-fails-silently`). **Link only anchors you have
   verified exist** in the target file. `lint.ts` fails on any break.
3. **Filenames** are kebab-case slugs of the title (`exit-codes.md`,
   `unknown-flag-exits-nonzero.md`).
4. **Frontmatter on every page.** We follow **OKF (Open Knowledge Format)** — a directory of
   markdown files plus YAML frontmatter, one concept per file. OKF requires exactly one field,
   `type`; `tags` is its optional convention we've adopted; `updated`, `related`, `status` and
   the rule fields are our extensions (OKF permits extras). We skip OKF's `resource` — our
   pages _are_ the knowledge, not pointers to one.

   ```yaml
   ---
   type: concept | archetype | rule | decision | guide # OKF's one REQUIRED field
   title: Exit codes # the H1 and the nav name
   description: One sentence; doubles as the catalog hook in index.md.
   tags: [exit-codes, errors] # OKF convention; primary relation for atomic pages
   related: [rule/unknown-flag-exits-nonzero] # `type/slug` — NOT a folder path
   status: current # draft | current | superseded
   updated: 2026-08-13 # when the CONTENT last changed
   ---
   ```

   `related` keys are `type/slug`, where slug is the **basename** — so a page can move
   between folders without rewriting every `related:` that points at it.

5. **No page is an orphan.** Every page must be reachable from `index.md`, transitively. Add
   the catalog line in the same commit as the page.
6. **Backlinks are computed, never authored.** `bun docs/wiki/lint.ts --json` derives inbound
   links, tag adjacency, hubs and orphans. Don't hand-maintain any of it.

## Rule pages carry extra frontmatter

A `rule` page is not prose — it is the human-readable half of a conformance checker. Its
frontmatter is machine-read, and `lint.ts` cross-checks it against `src/acc/kit/checkers/`:

```yaml
rule_id: A1 # stable, unique; cited verbatim in conformance output
tier: core # core (binary pass/fail) | diagnostic (reported, non-fatal)
probe_level: L0 # L0 inert | L1 declared read-only | L2 contained mutating
checker: src/acc/kit/checkers/parsing/unknown-flag.ts
checker_status: planned # planned | implemented
coverage: partial # complete | partial — how much of THIS page the checker establishes
coverage_gaps: # one phrase per normative clause the checker does not establish
  - only the root is probed so a flag unknown to a subcommand is not
```

`checker_status` is the ratchet. A rule may declare its `checker` path before the file exists;
the lint only requires the file once the status is `implemented`. The count of `planned` rules
is the remaining work, and it only ever goes down.

`coverage` is a different axis, and the two are routinely confused: `checker_status` says a
file exists, `coverage` says how much of this page's normative text that file establishes. A
rule stating five **MUST**s whose checker tests two is `partial`, however finished the checker
is. `complete` **MUST** carry an empty `coverage_gaps`; `partial` **MUST** carry at least one
entry, so it can never be a bare flag admitting a hole while naming none of it. The gaps are
what [`fullyVerified`](./concepts/conformance.md#coverage-a-pass-can-be-narrower-than-its-rule)
withholds itself over, and what `acc check` prints when it does.

A gap phrase is read back by a deliberately small frontmatter parser that splits list items on
a comma and on a space-hyphen-space sequence, so it must contain neither. The kit's own
registry test rejects both at the source rather than letting the lint fail with a mismatch that
explains nothing.

Two properties this buys, and the reason rules are pages rather than sections:

- **Conformance failures cite the page.** The kit emits the rule's path, so whoever hit the
  failure lands on one atomic page explaining the rule and how to fix it.
- **The lint is bidirectional.** Every `rule_id` must have its declared checker file, and
  every checker must have a rule page. `tier`, `probe_level`, `coverage` and `coverage_gaps`
  must be identical on both sides. Documentation drift fails the gate.

`rule_id` values are **append-only**. They appear in conformance reports that outlive any
given release — renumbering one silently invalidates every stored report. Same discipline as
the exit codes the spec itself mandates.

## Per-type page shape

| `type`      | Required sections                                                          |
| ----------- | -------------------------------------------------------------------------- |
| `concept`   | What it is · Why it matters for agents · The details · Related rules       |
| `archetype` | Shape · What makes it hard · Rules that apply differently · Examples       |
| `rule`      | The rule (normative) · Why · The probe · How to comply · Evidence          |
| `decision`  | Context · Decision · Rationale · Consequences · What would change our mind |
| `guide`     | Goal · Steps · Verification                                                |

Normative language in `rule` pages follows RFC 2119: **MUST**, **MUST NOT**, **SHOULD**,
**MAY**. Nothing else is normative — if a `concept` page seems to state a requirement, the
requirement lives in a rule and the concept should link to it.

## How we'll know this worked

This wiki format is an experiment, adopted because the LLM-wiki pattern looks promising for
agentic work — not because it's proven here. The project's own thesis is that a declaration
you cannot falsify is a comment that lies, so these are the signals we watch:

1. **Did the lint ever block a commit that would have shipped a broken link or a drifted
   rule?** Aggregate fire-count is noise; the question is whether it caught something real
   that review would have missed.
2. **Do wiki commits accompany code commits?** A change that alters behaviour updates its page
   in the same commit, at the same bar as tests. If wiki edits cluster into separate catch-up
   batches, the pages are rotting.
3. **Does one page answer a question, or do you need five?** Deep traversal to answer a simple
   question means the atomisation is too fine — the same failure mode as deep progressive
   disclosure in a CLI, which measured worse than a flat surface.

If all three come back negative after this project's first real cycle, say so in a `decision`
page and change the format. That is the point of writing them down.
