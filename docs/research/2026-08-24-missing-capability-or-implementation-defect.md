---
type: research
generated: { by: claude-opus-5, at: 2026-08-24 }
status: stable
description: Whether the recurring CLI problems in two agent-facing repositories were implementation defects or capabilities that were never there, from a path-selected census of 298 commits read at message level.
tags: [conformance, evidence, history, agent-facing, silent-failure]
---

# Missing capability or implementation defect? A census of 298 CLI commits

**Research date:** 2026-08-24

**Method:** A **census, not a sample**. Every non-merge commit touching CLI source in two
repositories was selected **by path**, then read: `Spellbook` at
`plugins/spellbook/skills/{bounty,grapevine,glamour,imago,mind-mapper,magpie,astrolabe}/scripts/`
(151 unique commits) and `anthill` at `plugin/scripts/` (147) — **298 in total**. Five parallel
raters took one slice each (bounty 48, grapevine 37, the other five spells 70, anthill newest 74,
anthill oldest 73). Each read every commit's **full body plus `--stat`**, and the diff where the
message was thin: **298 of 298 read at message level**, a substantial minority at diff level.
Every slice is **single-rater**; no commit was independently double-classified. Both repositories
write unusually evidential commit bodies — measured before/after numbers, the mechanism, the
observable symptom — which is what makes message-level reading worth anything here. It is still
the author's account.

**Both repositories were read-only throughout.** `git log` / `show` / `diff` only, no checkout,
worktree, stash or write of any kind. `Spellbook` at `6c18e00`, `anthill` at `5e8c5bd`, both clean
at start and finish. Both have moved 2 commits since
[`2026-08-15-defect-archaeology.md`](./2026-08-15-defect-archaeology.md); the corpus is otherwise
identical.

**Confidence notation**, per claim:

- **[MEASURED]** — counted or derived directly from the repositories or the file tree, and
  re-verified by the reporting agent rather than taken from a rater's summary.
- **[READ]** — read off commit messages, backlog files or project documents. True as the author's
  account of what happened.
- **[JUDGED]** — a rater's classification or counterfactual. These carry the error bars, and the
  weakest of them are named in [§9](#9-confidence) and are not to be promoted.

**Scope bounded.** Deliberately not looked at: `acc` was **not** re-run, so the "what the kit
catches today" figure leans on the prior study's replay rather than a fresh measurement;
`SKILL.md` and skills-markdown changes were **not** classified, which for anthill genuinely _are_
part of the interface, so anthill's counts are a **lower bound** on interface churn; and the ~100
open backlog items across both repositories were not sampled as a population.

---

## 1. How this departs from the prior study, and why the number exists

The prior note, [`2026-08-15-defect-archaeology.md`](./2026-08-15-defect-archaeology.md),
`--grep`-selected on **defect vocabulary** and read **~5% of 1,392** commits. That method is
structurally blind to this question: **a capability that was never there lands as `feat(`, and a
`feat(` is invisible to a defect grep.** [MEASURED]

The prior note's own §8 anticipates exactly this blindness — _"a class fixed quietly, in a commit
titled as a refactor or a feature, is invisible to this method"_ — and names `9f77c39` (anthill
dropping `citty` for an in-house parser, the surface every later parsing defect lives on) as a
live example of how much lands under a non-defect subject. [READ]

Selecting by **path** instead of by **word** removes that bias, at the cost of pulling in
test/docs/release commits, which are counted and then excluded below. The proportion in §2 does
not exist under the prior method; it is a product of the departure.

---

## 2. The headline proportions

Of 298 commits, **19 ORIGINAL-BUILD** (greenfield scaffolds and numbered phases of an agreed
plan — building the thing, not iterating on it) and **78 NON-CLI** (test-only, docs-only, release
bumps) are excluded. The iteration population is **201**. [MEASURED]

| Category                             | Spellbook (111) | anthill (90) | **Both (201)** |
| ------------------------------------ | --------------- | ------------ | -------------- |
| **IMPL-DEFECT** — built wrongly      | 35 (32%)        | 49 (54%)     | **84 (42%)**   |
| **MISSING-CAPABILITY** — never there | 53 (48%)        | 24 (27%)     | **77 (38%)**   |
| **WRONG-CONTRACT** — wrong shape     | 17 (15%)        | 3 (3%)       | **20 (10%)**   |
| **NON-STANDARD** — normalised later  | 6 (5%)          | 9 (10%)      | **15 (7%)**    |
| **OTHER** (categories that broke)    | 0               | 5 (6%)       | **5 (2%)**     |

[JUDGED]

**The suspicion that these were mostly missing capabilities is substantially right, and it is
close to a coin flip rather than a landslide.**

- Read strictly: **38% missing capability** against **49% built wrongly** (IMPL + NON-STANDARD).
- Read as the owner framed it — where _wrong contract is explicitly "not a bug"_ — **"nothing was
  implemented incorrectly" is 48%** (38 + 10) against **49% built wrongly**. Dead even.

**Uncertainty: ±5 percentage points, and the location is known.** The anthill-newest rater flagged
five `fix(` commits inside the multi-team build (`5c55cc5`, `9c90367`, `e65c188`, `5237dbe`,
`d8597c8`) sitting exactly on the line between "last mile of a new feature" and "defect";
reassigning those five alone moves that slice from 45/32.5 to 33/45. Several commits carry two
categories (`82dc363` carries three unrelated cards; `b72240d`, `1b902f8`, `574bce3` each carry
two). anthill's older half contains two duplicate landings (`a2bd484`/`d0c1fa7`,
`01745cf`/`e03ec52`) that inflate its defect count by 2. [JUDGED]

### 2.1 Foreseeable, or only knowable downstream?

Of the 77 missing capabilities: **36 NOBODY-THOUGHT-OF-IT** against **41
ONLY-USAGE-COULD-REVEAL-IT** (~47/53). [JUDGED]

**This is the least reliable number in the note.** It is a pure counterfactual judgement and the
raters disagreed sharply: bounty came back 13 foreseeable / 3 unknowable, grapevine 7 / 10, the
other five spells 7 / 13. Do not quote the split without that caveat.

What _is_ robust is the **shape** of each half. The foreseeable ones cluster into a handful of
nameable families, listed exhaustively in [§4](#4-the-missing-capability-set-split-by-whether-guidance-could-ever-have-named-it).
The unknowable ones are almost all domain: addressed delivery, read staleness, session rotation,
per-seat presence, message disposition.

---

## 3. The reframe: general versus domain-specific, not defect versus missing capability

**The axis that decides what a conformance kit can catch is not defect-vs-missing-capability. It
is general-vs-domain-specific.** A kit can catch a **missing general affordance** — `--version`,
a machine-mode error envelope, an exit-code taxonomy. It can never catch a **missing domain
capability** — `reap`, `roll`, addressed delivery, session rotation — whether or not anything was
built wrongly. **34 of the 77 missing capabilities are general.** [JUDGED]

The corpus demonstrates this in the most direct way available: the last four commits across both
repositories are conformance-kit findings. `1e5c8ba` (grapevine `--version`, rule D1) and
`2695c5b` (anthill names the unknown flag, rules A1/A3) are landed fixes;
`docs/backlog/2026-08-21-grapevine-error-envelope-is-prose.md` (rule B5) and
`docs/backlog/2026-08-21-usage-errors-and-bugs-share-exit-1.md` (rule C2) are accepted, filed
findings. Three of the four are on the **general** half — including **`1e5c8ba`, which is a
missing capability that a rule actually caught.** [MEASURED]

This reframe outranks the four-way split, because the four-way split does not predict
catchability and this axis does.

---

## 4. The missing-capability set, split by whether guidance could ever have named it

**General to agent-facing CLIs — writable as guidance today (34 of 77).** Not speculative; every
one is a landed commit. [READ]

- **Daemon lifecycle** (the largest family): no `start`/`restart` when `stop` existed (`145660d`);
  no way to classify other daemons on the box (`7517be2`); no safe reap (`5574396`); no
  one-command redeploy (`f3e2f18`); no respawn-suppression window (`263b630`); no diagnostic log
  when a headless daemon died (`e10c994`); no verb to enumerate _running_ boards (`8e9a47f`); no
  recovery when a board came up empty over an intact snapshot (`4c412c8`); no `--port` the CLI
  could forward to the daemon it spawns (`cbcbe16`).
- **Identity and scope**: no way for a caller to _name_ the board it wants (`9f61575`); no pin
  binding a board to a directory (`b72240d`); no `--team` flag anywhere and no resolution ladder
  (`89119ed`, `1ea4b31`); no way to ask _which_ scope resolved and by which rung (`244c9ce`); no
  way to list or select scopes (`36f65bd`).
- **Discoverability**: no `--version` (`1e5c8ba`); `--version` unable to say _which binary_
  answered (`5bfd97f`).
- **Input paths**: no shell-free default body for `send` (`03ca9fb`); no `--stdin`/`-F` on
  `commit` when `send` had it (`a3707c3`).
- **Reporting an absence**: no field for "I tried and it broke" (`9713733`); no field for "I
  dropped everything you gave me" (`cb25146`); no way to say "live but uncountable" (`3e82b9a`);
  no way to say the scan had nothing to read (`792ba70`); no backup before a destructive automatic
  write (`bbeaad5`).
- **Collections**: a library that could only grow, with no delete (`a3fa833`).
- **Streams**: no bounded catch-up (`574bce3`, `c9e156f`); no cap on inline body size
  (`6a9c5b8`); no stream filtered to human-originated events (`50468f0`).
- **Human channel**: no verb for the agent to narrate to the person watching (`608e81e`).

**Domain-specific — only downstream of building (41 of 77).** Message disposition and triage
(`1d5e205`, `822a2a9`, `d02f9d1`), broadcast (`8db49c1`), channel reset that keeps history
(`9ffc502`), the human as a first-class participant (`2187404`), per-seat positions and gap
(`8d4569d`, `1fb02af`), send-time staleness (`fd0fe7d`), seat attribution on a shared tree
(`f5668cb`), team attribution on commits (`fb4879e`), session rotation (`81d3991`), the board
read-back at join (`f8a7bd8`), the lead's own stand-down (`9a4c666`), kanban tags/timestamps/WIP/
aging (`dd56377`, `59ec83e`, `6260deb`, `e24ed09`), mind-mapper's zones, job queue, subgraphs and
deletion lifecycle (`a0c6f2a`, `a7b1ad9`, `4e4571f`, `b5c99c8`), imago's layer system (`0735d30`,
`85b0fdb`, `efae276`). [READ]

### 4.1 The house-style observation

The general half is not hypothetical guidance: **the artifact already exists and already works
this way.** `Spellbook/grimoire/house-style.md` is a domain-level design guide for exactly this
class of tool. Its rule _"Drive a conjuration through a daemon + thin CLI"_ already names
`--stdin`, cursor-resume events, snapshot/restore, and home-scoped discovery pointers. It does
**not** name `start` / `restart` / `doctor` / `reap` / `roll` / `--version` / bounded-catch-up —
the exact set grapevine had to discover alone. [READ]

And it grew **9 commits against 151 CLI commits**, with every entry written _after_ the scar
(`9d2b66b`: _"the ownership rule was obeyed by four spells and failed anyway"_). The guidance
artifact is real, it works, it is downstream of building, and it **lags the surface it governs by
an order of magnitude.** [MEASURED]

---

## 5. The finding on a different axis: the same capability built three to five times

**This is the strongest evidence in the corpus, and it sits on a different axis from the
classification entirely.**

The seven Spellbook CLIs share **zero code** — **7,764 lines of `cli.ts` with no cross-spell
import**, and **all seven spawn detached daemons**. So each capability had to be discovered and
built seven times, or not at all. [MEASURED]

**Six capabilities rebuilt N times inside Spellbook** [READ]:

1. **"Return the id you minted, and name your outcome" — four spells in one day.** `5e6aacd`
   (imago), `34e8ab2` (glamour), `78563c6` (magpie), `3d863d5` (astrolabe), all 2026-08-08, all
   ported from bounty, which solved it first. `34e8ab2`'s body says it out loud: _"#87's defect in
   a third codebase (imago context.add was the second)."_
2. **The drained exit** — nine sites at once (`ec33378`), the `tail` variant at four more
   (`714af29`), then a regression (`62a5972`), after bounty gated it first (`c29aa4e`).
3. **Parser altitude** — six entry points across `a1e97a2` + `e7504cf`, plus `df91148` two months
   earlier in imago alone. Every spell hand-rolled its own argv parser; every one accepted unknown
   flags at exit 0. imago's `--flag=value` bug was fixed in isolation in June and the identical
   class was still live in glamour and magpie in August.
4. **"Did the daemon actually apply this?"** — `14bec41` fixed the same dropped verdict in three
   spells at once, having already been fixed in bounty.
5. **Lean agent projections** — invented three times: `65dcada` (glamour), `85b0fdb` (imago),
   `626fe17` (mind-mapper).
6. **A stream that announces what it bound to** — three times: `880ad2d` (imago), `50468f0`
   (mind-mapper), `5dfa9a8` (astrolabe).

**And once across repositories.** Bounded catch-up on a follow-stream was invented **four separate
times**: filed as bounty backlog `2026-06-15-bounty-tail-drain.md` (_"an episodic agent has no
clean primitive"_), shipped in grapevine as `--last` (`574bce3`, 2026-07-09), filed again as
grapevine `#75` (2026-08-05), and re-invented from zero in anthill as `read --last N` (`c9e156f`,
2026-08-01, whose body says _"finding a recent id previously meant reaching past the CLI to tail
the NDJSON"_). **Bounty's is still open.** [READ]

More sharply: **anthill rebuilt grapevine.** `63382c9` (2026-07-31) built a seat-aware message log
from scratch; `14cf678` (2026-08-05) then removed grapevine from anthill's lifecycle entirely.
anthill's new wire then re-discovered, one commit at a time, what grapevine already had —
presence (`8d4569d`), gap announcement (`1fb02af`), staleness (`fd0fe7d`), positions (`32a9d46`),
rotation (`81d3991`). And the _same_ gap remains open in both:
`docs/backlog/2026-08-01-comms-has-no-addressed-delivery.md` notes _"grapevine has no addressed
delivery either."_ [READ]

**The quantified version.** grapevine — the most-iterated CLI — accumulated a lifecycle layer none
of its six daemon-owning siblings has: [MEASURED]

| Verb                                                                              | grapevine | bounty | magpie | glamour | astrolabe | imago | mind-mapper |
| --------------------------------------------------------------------------------- | --------- | ------ | ------ | ------- | --------- | ----- | ----------- |
| `doctor`, `reap`, `roll`, `reset`, `restart`, `stop`, `prune`, `who`, `--version` | **all**   | none   | none   | none    | none      | none  | none        |

grapevine only got `--version` on **2026-08-20** (`1e5c8ba`) — the second-to-last commit in the
repository — _after the conformance kit pointed at it_. Its body: _"the value was already in
memory; only the question was missing."_ [READ]

---

## 6. What a conformance kit could ever catch

**In principle: ~28% of iteration (≈57 of 201 commits).** That is the count of commits whose rater
marked the counterfactual `CONFORMANCE-RULE` — a mechanical black-box check on argv, streams, exit
codes or help output. Per slice: bounty 8, grapevine 4, the other five spells 16, anthill-old 18,
anthill-new 11. [JUDGED]

**Today: far smaller.** The prior study's empirical replay measured **1 of 7** fixed defects
detectable pre/post. Since then A7, B4 and B5 were minted (23 rules now), adding the
closed-value-set class and the machine-mode-on-parser-error class — but **B4's own declared gap is
_"no checker exists so nothing about delivery is established"_**, and the highest-cost class in
the corpus (the drained exit, 10+ commits) is the one B4 was written for. Realistically the
catalogue reaches **under 10% of iteration today**, and the distance between 10% and 28% is almost
entirely the level ladder. [READ]

**The ceiling, stated plainly.** Even at 28%, **roughly three-quarters of this history is out of a
conformance kit's reach by construction.** 38% is capability that was never there. 10% is a design
that had to change. A large slice of the remaining defects are semantic — a `0` that is a lie, a
field whose absence is unreadable — which Spellbook already _proved_ unmechanisable: their
type-sentinel probe scored **0 true positives, 2 false positives, and 26 of 33 functions
undecidable.** [READ]

The kit is not zero — [§3](#3-the-reframe-general-versus-domain-specific-not-defect-versus-missing-capability)
records four findings at both repositories' HEADs. Both halves of that hold at once, and neither
cancels the other.

---

## 7. Where the taxonomy broke

Raters were told to name a category rather than force-fit. Five came back, four of them
repeatedly. **This section is evidence about the classification itself, not about the corpus.**

- **ORIGINAL-BUILD / PLANNED-BUILD (19 commits).** Greenfield scaffolds and numbered phases of an
  agreed plan (`c5bf232`, `c45308f`, `3eabdec` = bounty Phases B/C/D; 15 more across
  glamour/imago/mind-mapper/astrolabe/magpie; `63382c9` in anthill). The four-way scheme
  technically admits these under MISSING-CAPABILITY, and folding them in would report ~50% missing
  capability and mean nothing. **This is the single most load-bearing category in the report** —
  it is the difference between "building the thing" and "discovering a gap".
- **EMITTED-GUIDANCE-DEFECT (4 explicit + ~10 classified elsewhere, all anthill).** `a1b6017`,
  `91c5006`, `85988b1`, `3b82cef`. Nothing wrong in argv, streams, exit codes or data shape. What
  is wrong is the _instructional prose the CLI emits inside its own JSON payload_ — a route that
  does not terminate, an instruction an obedient reader cannot satisfy, a team-local statistic
  (13/27) shipped to every consuming project as a general fact, a factual claim that is false.
  **For an ordinary CLI this class is docs; here the emitted instruction is the product.** Its
  cheap half is mechanical (`bash -n` every emitted command string — `10bae00` returned exit 2 on
  the string every team was told to run verbatim); its expensive half is not, and `91c5006` says
  so: no assertion distinguishes prose that is _wrong_ from prose that is _unfollowable_.
- **UNADVERTISED-CAPABILITY (`8908e6a`).** `--as` existed, was validated, worked, and was tested.
  Not one skill, template or emitted manifest named it, so every seat ran the incantation the SOP
  named and attribution shipped dead. Not defective, not inconsistent, not missing, not the wrong
  shape. Related: three grapevine commits (`1023688`, `affe22d`, `a09a62d`) are pure `--help`
  catch-ups landing _after_ the verbs shipped — `reset` shipped 2026-06-23 and appeared in
  `--help` the next day. For an agent-facing CLI, a verb absent from `--help` does not exist.
- **SELF-HARM / NO-ISOLATION (5 bounty commits).** `4b55da0`, `d650c97`, `180a5e2`, `e5b8480`,
  `a5c322a` are counted NON-CLI because they touch only tests — but they exist because the tool's
  own test suite reached the _live team board_ through ambient env and a machine-global TMPDIR
  pointer, and **destroyed it twice in forty minutes**. Session discovery never goes through
  `BOUNTY_HOME`; 2,206 stale pointer files were measured on one machine. That is a shipped design
  property, and excluding it understates a real defect.
- **LATENT-DEFECT.** `cb345dc`, `b4b6e9a` fix things that are not yet wrong — they arm when a
  version constant moves. No slot exists for "correct today, wrong by construction tomorrow".

**And two cross-cutting axes that the four-way split actively hides.** The bounty and anthill-old
raters reached both independently.

- **Silent success.** Fifteen bounty commits are one finding — _exit 0 meaning nothing happened_
  (`82adf9a`, `8f4d92d`, `39b4310`, `14bec41`, `cb25146`, `9713733`, `05d2591`, `c29aa4e`,
  `2334ed2`, `2cc513d`, `4975243`, `82dc363`, `3e82b9a`, `a86df3b`, `b72240d`). The taxonomy
  splits them across three categories.
- **ABSENT ≠ NULL ≠ ZERO.** At least 6 in bounty, 14 in anthill-old, 3 in grapevine — the same
  expressiveness gap in different clothes. anthill eventually wrote the rule down (Contract 6(c),
  5(a)) _after paying for it about ten times_; Spellbook wrote it as `carry-frame-just-value`
  after four seats hit it in one morning. Counted as bugs they look like sloppiness; counted as
  one design guideline not stated in advance, they are the largest single cost in the corpus and
  **belong to none of the four categories.**

---

## 8. Do the two corpora differ? Yes, materially

|                                     | Spellbook    | anthill          |
| ----------------------------------- | ------------ | ---------------- |
| Missing capability                  | **48%**      | **27%**          |
| Built wrongly (IMPL + NON-STANDARD) | 37%          | 64%              |
| Wrong contract                      | 15%          | 3%               |
| NON-CLI share of all commits        | 15% (22/151) | **38% (56/147)** |

**Three causes, and they matter differently.**

1. **Maturity, not shape.** Bounty alone shows the effect inside one CLI: its June commits are
   overwhelmingly capability; of the 25 commits from July onward — once anthill and real agent
   teams drove it — **17 are defect/contract hardening**. Roughly **50/50 over its whole life,
   ~70% defect once the tool met real use.** Spellbook's 48% is partly an artefact of five spells
   still in build-out (mind-mapper is 12 of 17 missing-capability, because it is the only spell
   with a numbered dogfood-drive loop). [JUDGED]
2. **anthill spends 38% of its commits on tests and guards** — much of it guards discovering they
   had gone blind (`c9cfd74`, `4ddac8b`, `10ac02d`, `915571c`: a fix ships, a guard is written,
   the guard then passes with the defect restored; three consecutive rounds on one branch). Its
   own backlog names the result:
   `2026-08-10-nine-defects-were-green-under-the-gate.md`. [READ]
3. **anthill's defects concentrate into two shapes Spellbook barely has.** The anthill-old rater
   found **14 of 31 IMPL-DEFECTs are one defect** — _an absence reported as a fact_ (`[]` for
   "couldn't tell", `gap: 0` for never-followed, `none` from an empty directory, a dead pid as
   absence). And ~10 more are defects in **command strings the CLI emits for another agent to
   execute** (`10bae00`, `98ade49`, `315fa56`, `88bc62c`, `585acc0`, `3c46e9c`, `915571c`,
   `f12b132`, `9c24d93` — five rounds on one class). [JUDGED]

The mature single-domain CLI (anthill) has both the higher defect share and the higher
conformance-catchable share. The multi-CLI portfolio (Spellbook) has the lower defect share, but
it is where the rebuilt-N-times effect lives: six capabilities rebuilt three-to-five times each,
five of the six mechanically checkable from outside the process. A kit run across seven sibling
CLIs would have found the same three failures on all seven — which is the prior study's §1.5
result seen from the other side.

---

## 9. Confidence

**High.**

- The 298-commit population and its path derivation. [MEASURED]
- The 19 ORIGINAL-BUILD and 78 NON-CLI exclusions. [MEASURED]
- The rebuilt-N-times findings in [§5](#5-the-finding-on-a-different-axis-the-same-capability-built-three-to-five-times),
  verified directly against the commits and the file tree: zero cross-spell imports, 7,764 lines,
  all seven spawning detached daemons, and the verb table. [MEASURED]
- The house-style lag, 9 commits against 151. [MEASURED]
- The four conformance-kit-driven items at both repositories' HEADs. [MEASURED]

**Medium.**

- The headline proportions, ±5pp, with the reassignment risk named in [§2](#2-the-headline-proportions).
- The Spellbook/anthill divergence is larger than that error bar, so the difference itself is solid
  even if each figure moves.

**Low, and flagged — do not promote these.**

- **The NOBODY-THOUGHT-OF-IT vs ONLY-USAGE split (36/41).** The raters disagreed sharply and it is
  an **unfalsifiable counterfactual**. It stays low.
- **The ~28% conformance-catchable figure.** It aggregates five raters' independent judgements of
  what a rule "could" catch, and **none of them ran a checker**. It stays low.
- The general/domain split of the missing-capability set (34 / 41 / 2 mixed) is a reconciliation
  across five differently-formatted returns and is approximate.

**Not determined.**

- Whether the ~28% would survive contact with a real checker. The prior study's own warning
  applies: _"budget three revisions per rule; the first draft is wrong in a way that reads as
  authoritative."_
- Whether anthill's `SKILL.md` / skills-markdown churn, excluded here, would move its mix. It is
  where the EMITTED-GUIDANCE class lives, so probably yes, and toward more defect.
- The ~100 open backlog items across both repositories were not sampled as a population, though
  ~90 titles and a dozen full items were read. They lean far more heavily missing-capability and
  far more heavily domain-specific than the landed commits do, which suggests the gap set that
  remains unfixed is the half a conformance kit could never reach. [READ]
