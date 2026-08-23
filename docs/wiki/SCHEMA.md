# The wiki's maintainer contract

You are (probably) an agent about to add or update a wiki page. This file is the whole
contract — read it once, then work. Humans: this file governs structure; the content lives in
the pages.

## What this wiki is

The durable, curated knowledge for the **Agent CLI Conformance** project: what each part of a CLI
_is_ (concepts), what shapes CLIs take (archetypes), the normative rules a conforming CLI must
satisfy (rules), why we chose what we chose (decisions), and how to actually do things
(guides).

It is **not** the evidence trail. Research reports live in `docs/research/` outside this wiki —
dated, unmaintained, cited by `decision` pages. The wiki is what we believe; `docs/research/` is
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
  decisions/     ← why we chose X over Y, citing docs/research/
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
4. **Frontmatter on every page.** We follow **OKF (Open Knowledge Format) 0.2** — a directory
   of markdown files plus YAML frontmatter, one concept per file. `type` is OKF's only required
   field; `title`, `description`, `tags` and `status` are its recommended ones; `generated` is
   its trust family. `related` and the rule fields are our extensions, which OKF permits
   outright ("Producers MAY include any additional keys"). We skip OKF's `resource` — our pages
   _are_ the knowledge, not pointers to one.

   **We take the spec's vocabularies rather than inventing parallel ones.** `status` is
   OKF's `draft | stable | deprecated`, not a house set: a consumer reading `status: superseded`
   would be reading a value the spec says cannot occur, and the cost of discovering that after a
   release is higher than the cost of matching it now. Where our domain needs a distinction OKF
   has no field for, we add a field rather than widen one of theirs — see `lifecycle` in
   [`../reports/README.md`](../reports/README.md#frontmatter).

   ```yaml
   ---
   type: concept | archetype | rule | decision | guide | tutorial # OKF's one REQUIRED field
   title: Exit codes # the H1 and the nav name
   description: One sentence; doubles as the catalog hook in index.md.
   tags: [exit-codes, errors] # OKF convention; primary relation for atomic pages
   related: [rule/unknown-flag-exits-nonzero] # `type/slug` — NOT a folder path
   status: stable # OKF 0.2: draft | stable | deprecated (absent means stable)
   generated: { by: claude-opus-5, at: 2026-08-13 } # OKF 0.2 §5.2; supersedes v0.1's `timestamp`
   ---
   ```

   `related` keys are `type/slug`, where slug is the **basename** — so a page can move
   between folders without rewriting every `related:` that points at it.

   `generated.at` is when the content last meaningfully changed — the field that used to be
   `updated`, renamed to the spec's. `generated.by` is the actor that produced it, which OKF
   requires inside the mapping. Every page currently records `claude-opus-5`, attested by the
   maintainer as the model these were drafted with rather than captured per page at the time.
   `unknown` is also a legal actor, and is the right entry when a producer genuinely was not
   recorded — a plausible guess is worse than an admitted gap, on the same reasoning that makes
   a rule report `unverified` rather than pass.

5. **No page is an orphan.** Every page must be reachable from `index.md`, transitively. Add
   the catalog line in the same commit as the page.
6. **Backlinks are computed, never authored.** `bun docs/wiki/lint.ts --json` derives inbound
   links, tag adjacency, hubs and orphans. Don't hand-maintain any of it.

## Rule pages carry extra frontmatter

A `rule` page is not prose — it is the human-readable half of a conformance checker. Its
frontmatter is machine-read, and `lint.ts` cross-checks it against `src/acc/kit/checkers/`:

```yaml
rule_id: A1 # stable, unique; cited verbatim in conformance output
tier: core # core (binary pass/fail) | diagnostic (reported, non-fatal) — the BASELINE
deviation: defect # defect | design-choice — what NOT satisfying this rule MEANS
probe_level: L0 # L0 risk-reduced | L1 declared read-only | L2 contained mutating
checker: src/acc/kit/checkers/parsing/unknown-flag.ts
checker_status: planned # planned | implemented
coverage: partial # complete | partial — how much of THIS page the checker establishes
coverage_gaps: # one phrase per normative clause the checker does not establish
  - only the root is probed so a flag unknown to a subcommand is not
coverage_established: # one phrase per thing a PASS licenses, scoped to the paths sampled
  - one unknown long flag given at the root exits non-zero with stdout empty
```

`deviation` answers a different question from `tier`, and the two cross rather than nest. **`tier`
decides whether a violation gates CI. `deviation` decides what a violation means.**

- **`defect`** — there is no defensible alternative. A CLI that exits `0` on an unknown flag is
  broken for an agent whatever its author intended. Waiving one of these suppresses a real
  failure; it does not record a preference, and the page should not imply otherwise.
- **`design-choice`** — a different design can be right. A machine-first tool answering a bare
  invocation with a manifest of its own command surface has made a choice, not a mistake. Here a
  waiver records a decision, and the page owes the reader the reasoning behind the default rather
  than a verdict on their design.

**And it is read at runtime, not only by a reader.** Waiving a `defect` blocks `fullyVerified` and
keeps the rule in `evidenceGaps`; waiving a `design-choice` does neither, because a design the
target declares is something the kit accepts rather than a hole in what was established — see
[the asymmetry](./concepts/conformance.md#the-asymmetry-a-waiver-buys-the-gate-and-the-evidence-only-when-the-rule-is-a-defect).
So this field is cross-checked against the checker in both directions, exactly as `tier` is: a page
declaring `design-choice` over a checker that says `defect` would offer a waiver that costs more
than the page promises, and the reverse would quietly spend an evidence claim the reader was told
they could keep.

**A default is not a verdict.** `L0` is mostly error-checking — a tool that exits `0` on an unknown
flag is broken for an agent and the catalogue should say so. But some rules encode a **design
preference** rather than a defect, and there the catalogue's job changes: state the default, give
the reasoning, and treat an override as a legitimate outcome rather than a failure to be argued
out of. A reader who disagrees with a `design-choice` rule is not being non-conformant at us; they
are doing what the field exists to permit.

**This is most of the value for a CLI that does not exist yet.** A team starting a new tool can
adopt the catalogue wholesale and get a coherent set of interface decisions without having to make
each one — which is a better reason to read a spec than "you will be marked down otherwise". The
`design-choice` rules are exactly the places where a mature project may already have decided
differently, on purpose, and the page should meet them as a peer rather than as a defect report.

**What follows for how these pages are written.** A `design-choice` page owes the reader three
things: what our default is, why it is the default in terms they can evaluate, and what a
different design would have to get right instead. It does not owe them a verdict, and it should
not imply their interface is wrong for diverging.

Most of the catalogue is `defect`, which is what a conformance spec should look like. The
classification exists so the handful that are not cannot be mistaken for it — and so a reader
meeting a rule they disagree with can tell immediately whether the catalogue expects that
disagreement or considers it a bug.

`tier` is what the **catalogue** says, not the last word for any one adopter. A project may move
a rule between the two tiers — in either direction — or waive it outright, in its own
`acc.config.json`; the report then speaks in the tier that actually gated the run and publishes
the override beside it. Write this field for the catalogue and let adopters declare their own
frame: see
[conformance](./concepts/conformance.md#waivers-a-rule-that-does-not-apply-to-this-tool).

### Two fields, two questions

`checker_status` and `coverage` are routinely confused, and the confusion runs one way: a
reader takes `implemented` for "the rule is enforced". Every rule in the catalogue that has a
checker is `partial`, so that reading is wrong for all of them — and one rule
([B4](./rules/streams/output-is-delivered-whole.md)) is `planned`, with no checker at all.

| Field            | The question it answers                                         |
| ---------------- | --------------------------------------------------------------- |
| `checker_status` | **Is there a checker at all?**                                  |
| `coverage`       | **How much of this page does that checker actually establish?** |

`checker_status: implemented` means exactly this: the file named by `checker` exists on disk
and is registered in `src/acc/kit/registry.ts`, so `acc check` runs it. It is a statement about
**implementation presence** and nothing else — not about scope, not about strength, not about
whether a `pass` from it means the page held.

It is the ratchet. A rule may declare its `checker` path before the file exists; the lint only
requires the file once the status is `implemented`. The count of `planned` rules is the
remaining work, and it only ever goes down.

`coverage` says how much of this page's normative text that file establishes. A rule stating
five **MUST**s whose checker tests two is `partial`, however finished the checker is. `complete`
**MUST** carry an empty `coverage_gaps`; `partial` **MUST** carry at least one entry, so it can
never be a bare flag admitting a hole while naming none of it. The gaps are what
[`fullyVerified`](./concepts/conformance.md#coverage-a-pass-can-be-narrower-than-its-rule)
withholds itself over, and what `acc check` prints when it does.

`coverage_established` is the other half of the same accounting, and its invariant does **not**
branch on `coverage`: every rule page **MUST** name at least one entry whatever its coverage,
`complete` included — where the gap list is required to be empty and this one is still required
not to be. A checker that establishes nothing is not a checker. `complete` is held to nothing
further here, because "the established list covers the page" is a claim no string comparison can
make, and a gate that only looks like one is worse than none.

Each entry says what a **pass** licenses the reader to believe, scoped to the paths actually
sampled. `no CSI introducer on stdout or stderr for root help or one usage error with both
streams attached to pipes` is the standard; `no ANSI escapes` is the overclaim to avoid — that is
what B2's rule says, not what B2's checker looked at, and the distance between those two sentences
is why the field exists.

There is one page whose honest entry is that there is nothing to license:
[A4](./rules/parsing/unexpected-positionals-rejected.md) declares no probe and returns a fixed
`unverified`. It says so, in words, rather than passing an empty list through a gate built to
catch exactly that.

Both fields for every rule are tabulated in [index.md](./index.md#coverage-at-a-glance), which
is generated from this frontmatter by `bun run docs:sync` and fails the lint when it drifts.

### `## Current checker coverage` is required on every rule page

Frontmatter is not what a reader reads. Every rule page **MUST** carry a
`## Current checker coverage` section holding an **Established** list whose bullets are the
`coverage_established` above and a `**Gaps**` list whose bullets are the `coverage_gaps`, both
**verbatim and in order**. The lint compares them, so closing a gap in prose without closing it
in code fails the gate, exactly as it does for the frontmatter — and so does widening the
**Established** list without widening the checker.

Three copies of each list is the price of the copy a reader sees being the checked one. Five
pages described a broader measurement than their checker performs while carrying correct
frontmatter two lines above, which is what that buys.

**Established** was the unchecked half until recently, which is worth recording because the
failure above is exactly the one it invites: `coverage_gaps` was bound to the checker in both
directions and to the prose on top of that, while the list of what a `pass` MEANS sat six lines
away, gated by nothing at all (review DTX-8). The two lists are now enforced identically, and
each is reported on independently — a page can state its holes correctly and still overstate what
a pass means, so one message never stands in for the other.

**What that enforcement does not establish, stated here so the field is not read as proof.** It
binds the page to the checker's **declaration**. It cannot bind the declaration to the checker's
**code**: a checker whose `coverageEstablished` claims more than its assertions perform passes
this lint on every copy. Only a mutation fixture closes that — break the property, watch the
checker catch it — and that work is scoped at
[`docs/roadmap.md`, R4-8](../roadmap.md#8-test-the-checker-as-a-measurement-instrument).

A gap or established phrase is read back by a deliberately small frontmatter parser that splits
list items on a comma and on a space-hyphen-space sequence, so it must contain neither. The kit's
own registry test rejects both at the source rather than letting the lint fail with a mismatch
that explains nothing.

Two properties this buys, and the reason rules are pages rather than sections:

- **Conformance failures cite the page.** The kit emits the rule's path, so whoever hit the
  failure lands on one atomic page explaining the rule and how to fix it.
- **The lint is bidirectional.** Every `checker_status: implemented` rule must have its declared
  checker file, and every checker must have a rule page. A `planned` rule may name the path its
  checker will take without the file existing — that is what `planned` is for. `tier`, `probe_level`, `coverage`, `coverage_gaps` and
  `coverage_established` must be identical on both sides. Documentation drift fails the gate.

`rule_id` values are **append-only**. They appear in conformance reports that outlive any
given release — renumbering one silently invalidates every stored report. Same discipline as
the exit codes the spec itself mandates.

## Per-type page shape

| `type`      | Required sections                                                                |
| ----------- | -------------------------------------------------------------------------------- |
| `concept`   | What it is · Why it matters for agents · The details · Related rules             |
| `archetype` | Shape · What makes it hard · Rules that apply differently · Examples             |
| `rule`      | The rule · How to comply · Why · The probe · Current checker coverage · Evidence |
| `decision`  | Context · Decision · Rationale · Consequences · What would change our mind       |
| `guide`     | Goal · Steps · Verification                                                      |
| `tutorial`  | What we will do · What we learned · Where to go next                             |

These are the sections a page **must** carry, in this order; a page may add others between them
(an `archetype` ends with `Related rules`, a `decision` with `Sources`, a `tutorial` with as many
`Step n` headings as the lesson needs). `lint.ts` reads this table and checks both, so the shape
is enforced rather than described — the numbered steps are dropped from the `tutorial` row for
that reason, since they are not a fixed heading anyone could check for.

**`rule` puts the remedy second, directly under the norm.** The page exists because a conformance
failure cites it, so its reader arrives knowing only a rule id and wanting two things: what they
violated, and how to fix it. Those used to be the first and fifth sections, with `How to comply`
starting around 84% of the way down every page and the three sections describing the kit's own
measurement in between (review DTX-2). The measurement material still belongs on the page; it is
not what that reader came for.

`guide` and `tutorial` are both work-shaped and they are not interchangeable. A `guide` serves
someone with a goal they already have — it assumes competence and may branch. A `tutorial`
serves someone acquiring a skill: one path, no alternatives, a visible result at every step, and
a learning goal rather than a task. Explanation belongs in neither; both link out to `concept`
pages instead of restating them.

Normative language in `rule` pages follows RFC 2119: **MUST**, **MUST NOT**, **SHOULD**,
**MAY**, and `lint.ts` rejects those keywords anywhere else — this file and STYLE.md excepted,
being contracts about the wiki rather than about a CLI. Nothing else is normative — if a `concept` page seems to state a requirement, the
requirement lives in a rule and the concept should link to it.

An `archetype` is the page type most tempted to break this, since its subject IS how obligations
differ by shape. It has two honest moves. Where the catalogue already has a rule, say how that
rule binds for the shape and express the binding as the `acc.config.json` a project of that shape
adopts — `severity: core` on a rule the catalogue calls `diagnostic` is a claim that gates a real
build, which prose never does. Where the catalogue has no rule, it is guidance, and says so, until
[profiles](../roadmap.md#5-profiles-and-the-outcome-algebra) mint the ids.

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
