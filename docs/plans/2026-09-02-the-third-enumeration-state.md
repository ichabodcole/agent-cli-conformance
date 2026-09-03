---
type: plan
generated: { by: claude-opus-5, at: 2026-09-02 }
status: draft
lifecycle: live
description:
  The implementation plan for the third enumeration state — teaching the kit to distinguish "the
  tool said it accepts nothing here" from "the tool named no set", which it currently reports as
  the negation of what the target said. Blocks the artifacts-alone trial, because an adopter who
  follows this project's own flag-scoping guidance produces exactly the shape the kit misreads.
  Carries the blast-radius analysis and the second-order effects. Scoped to the enumeration state
  alone: the ratified item's other halves are excluded and say why.
tags: [declaration, evidence, conformance, adoption, consumer-signal]
---

# The third enumeration state — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to
> implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a target answers an unknown-flag probe with an explicit empty set — `"choices": []`,
meaning _"I looked, I accept no flags at this path"_ — the kit records that it looked and found
none, rather than recording that the target named no set.

**Architecture:** A third member of `SurfaceStatus` alongside `not-enumerated` and `no-evidence`,
minted at the one site that mints non-`enumerated` statuses, threaded to the declaration diff so
the path is genuinely compared, and rendered through both homes of the status vocabulary. The
empty answer is a real enumeration of zero flags, so a flag the declaration names at that path
becomes a `declared-not-accepted` finding — the change **generates** findings where today it
suppresses them, which is why it needs a new state rather than the removal of a guard.

**Spec:** [the plan after the ladder](./2026-08-26-the-plan-after-the-ladder.md) § 3 item 3.
**Scope is the enumeration state alone** — Appendix A names what the ratified item carries that this
plan excludes, and why.

**Why now, rather than after the trial.** The artifacts-alone trial
([the trial protocol](./2026-08-26-the-trial-protocol-pinned-before-it-runs.md)) will include the
census. The adopter reaches the defect by following this project's own guidance: `STANDARD.md`
recommends per-verb flag scoping, which produces flagless verbs; rule `A3` says adding `choices`
converts a failure into a certain fix; and
[the registry guide](../wiki/guides/how-to-derive-your-surface-from-one-registry.md) says derive the
parser, the help and the rejection's `choices` from one registry. A registry-derived flagless verb
emits `choices: []`. The severity argument is the adopter's own, not ours:
_"The fraction moves the wrong way as the tool improves, which is the one direction a measurement
must never move"_ ([the magpie trial](../reports/2026-08-26-the-magpie-trial.md)).

---

## Global Constraints

- **The full gate is `bun run check`** — typecheck, Biome with `--error-on-warnings`, markdown
  format check, both doc linters, `docs:build`, and `bun test`. It must be green before every
  commit: this repository gates the whole tree, so one red draft blocks every other worker.
- **No `acc` version literal may appear in a document**; `docs/lint.ts` rejects unmarked ones.
- **Branch off `develop`**, never push `main`.
- **`flags` stays absent rather than empty on every non-`enumerated` status.** Two written
  invariants say so — `surface.ts` (_"Absent rather than empty … so a consumer reading `.flags`
  gets `undefined` and has to look at `status`"_) and `kit/compare.ts` (_"Present only for
  `enumerated`"_). The new state carries no `flags`. Emitting `flags: []` would also survive the
  truthiness spread in `kit/compare.ts` and reach a published artifact.
- **No rule verdict may change.** No file under `src/acc/kit/checkers/` imports `surface.ts`,
  `declaration.ts`, `report.ts` or `compare.ts`; `captureSurface` runs after every checker has
  returned. If a rule's pass/fail/unverified moves, something is wrong.
- **`conformant`, `fullyVerified` and the exit code may not move.** Declaration findings are a
  separate array and touch none of them, by the field's own stated contract. This is pinned by an
  existing test ("THE GUARD"); it must still pass untouched.

---

### Task 1: Split the overloaded fixture, before any behaviour changes

`src/acc/kit/fixtures/mentions-flags-without-enumerating.ts` carries **five distinct traps in one
document** — a `message` signpost, a `hint` marker-with-words, a `choices` list of verbs, echoed
`flags`, and `validFlags: []`. Three tests use it, each for a different trap. Changing the status
would silently reclassify all three, and the four traps that are not about emptiness would lose
their coverage with nothing failing to say so.

This task changes no behaviour. The gate must be green at the end and every existing assertion must
still hold, on whichever fixture now carries its trap.

**Files:**

- Create: `src/acc/kit/fixtures/enumerates-nothing-explicitly.ts` — a target whose root rejection
  carries `validFlags: []` and nothing else recognisable.
- Modify: `src/acc/kit/fixtures/mentions-flags-without-enumerating.ts` — remove the empty-key trap;
  keep the other four. Its header comment currently argues _for_ the present behaviour; leave the
  comment's claim about "enumerated zero flags" being the output to avoid, because that stays true.
- Modify: `src/acc/kit/surface.test.ts` — the end-to-end test and the `acc check` text test.

- [ ] **Step 1: Create the single-trap fixture**, modelled on the existing one's shape, emitting an
      unknown-flag rejection whose JSON body is exactly `{"error":{"validFlags":[]}}`.
- [ ] **Step 2: Point the empty-set assertions at the new fixture** and leave the other assertions
      on the original.
- [ ] **Step 3: Run `bun test`** — everything passes, because nothing has changed yet. If anything
      fails, a test was depending on trap adjacency and that is a finding worth recording before
      continuing.
- [ ] **Step 4: Run the full gate, then commit.**

---

### Task 2: Mint the third state, and make the renderer exhaustive

**The single mint site.** `surface.ts` produces every non-`enumerated` status from one ternary —
`probesRead > 0 ? "not-enumerated" : "no-evidence"`. A ternary has two outcomes, so the third state
has to be minted here or it can never be produced at all. The empty key must also reach this
function: `surfaceFrom` receives only `evidence` and raw `streams`, so the empty answer needs its
own channel, modelled on the existing second-pass reader that harvests non-flag candidates.

**Do not route the empty array into evidence.** `surfaceFrom` mints `enumerated` from any non-empty
evidence array without inspecting `flags`, and three guards are vacuous on `[]` — `[].every(...)`
is `true`, `[].some(...)` is `false`, and `![]` is `false`. An empty array threaded as evidence
sails through all three and lands as `enumerated` with `flags: []`, which is the exact fabrication
the type exists to prevent. Both `value.length > 0` guards in `keyedSets` stay.

**The renderer's fallthrough is the sharpest hazard in the change.** `surfaceSummary` ends with an
unconditional `return` that is the `no-evidence` sentence, reached by falling past two `if`s. A new
status with no clause silently prints _"nothing readable was recorded at the root, so nothing was
read"_ about a target that answered explicitly — the precise confusion this state exists to end,
with no compiler error, because `if`-chains are never checked for exhaustiveness.

**Files:** `src/acc/kit/surface.ts`, `src/acc/kit/surface.test.ts`

- [ ] **Step 1: Write the failing test** — the new fixture's root yields the new status, carries no
      `flags`, and its sentence says the target stated an empty set. Assert the sentence does **not**
      contain `nothing readable was recorded` or `NOT a tool with no flags`.
- [ ] **Step 2: Run it and watch it fail** for the right reason — it should currently report
      `not-enumerated`.
- [ ] **Step 3: Add the union member** with a doc comment that says what the other two say about
      themselves: what it asserts about the target, and what it does not.
- [ ] **Step 4: Add the empty-set channel** so the key reaches `surfaceFrom`, and mint the state at
      the ternary. Carry which key was empty, on the same conditional-spread pattern the sibling
      field uses.
- [ ] **Step 5: Convert `surfaceSummary` to an exhaustive `switch`** over `SurfaceStatus` with no
      default, so the compiler — not a reader — catches the next status added. Give `no-evidence`
      its own explicit case so no future state can inherit its sentence.
- [ ] **Step 6: Run the tests, then the full gate. Commit.**

---

### Task 3: Close the second home of the vocabulary

The status vocabulary has **two homes and no compiler link between them**. `surfaceSummary` holds
the sentences; a `VERDICT_WORD` map in `commands/check.ts` holds the nouns for the rollup, kept
separate deliberately — its own comment explains that slicing a noun out of a sentence would be the
text-matching predicate the rollup avoids. That separation is right and stays.

What is wrong is its type. It is a `Record<string, string>` read through `?? status`, so a missing
entry type-checks and degrades to the raw enum token mid-sentence — `3 enumerated-none` in the line
built specifically to give a group an English noun.

**Files:** `src/acc/commands/check.ts`, `src/acc/commands/check.test.ts` (or the nearest existing
rollup test)

- [ ] **Step 1: Write the failing test** — the rollup line for a target with the new status reads as
      English and does not contain the raw enum token.
- [ ] **Step 2: Re-type the map as `Record<SurfaceStatus, string>`** and add the fourth noun. This
      makes every future status a compile error here instead of a prose defect.
- [ ] **Step 3: Keep the `?? status` fallback or remove it deliberately** — with an exhaustive
      `Record` it is unreachable; say which you chose in the commit.
- [ ] **Step 4: Run the gate. Commit.**

---

### Task 4: Move the real gate — the declaration diff

**This is the task the change exists for, and the one that can be silently skipped.** The diff's
guard tests `status !== "enumerated" || !found.surface.flags`. The second half is already vacuous
for an empty array, so the guard hinges entirely on the status test — which means the new state is
absorbed into the not-compared branch **by luck**, and every `surfaceFrom` unit test stays green
while the census behaves exactly as it does today. Ship Tasks 1–3 alone and nothing has been fixed.

Once admitted, the comparison runs with an empty accepted set: every `valid` declared arg at that
path becomes `declared-not-accepted`; `refused-but-enumerated` cannot fire because nothing is in
the set; `accepted-not-declared` cannot fire because the surface names no flags. The path becomes
compared, contributing to the census counts.

**Two consequences to accept deliberately, not discover.** `DeclarationDiff.status` can flip
`not-checked` → `checked` for a run whose only evidence was empty enumerations, which deletes the
whole `THE DIFF DID NOT RUN` sentence and its remedy line from that report. And the headline gains
`· but see N declaration disagreement` on a target that printed a clean line before. Neither moves
the exit code.

**Files:** `src/acc/kit/declaration.ts`, `src/acc/kit/declaration.test.ts`

- [ ] **Step 1: Write the failing test** — a declaration naming `--nonsense` at a path whose surface
      is the new state produces a `declared-not-accepted` finding, the path counts as compared, and
      the report does **not** say the diff did not run.
- [ ] **Step 2: Run it and watch it fail** — today the path is dropped.
- [ ] **Step 3: Change the guard** so the new state is a real comparison. Keep the `!flags` half
      honest: assert in the test that the new state carries no `flags`, so the vacuity is pinned
      rather than relied upon.
- [ ] **Step 4: Update "THE HONESTY CASE"** — an existing test asserts `THE DIFF DID NOT RUN`, the
      sentence _"this is not agreement: nothing was compared"_, and that stdout does **not** contain
      `--nonsense`. All three invert for the split-out empty fixture. Move that test to whichever
      fixture still means "talks about flags without naming any", and write its inverse for the new
      one. **Do not simply flip the assertions** — the honesty case is still a real case and must
      keep a target that exercises it.
- [ ] **Step 5: Correct the stale analogy.** A doc comment describes `DeclarationDiff.status` as
      drawing _"the same distinction `SurfaceStatus` draws between `not-enumerated` and a tool with
      no flags"_ — using "a tool with no flags" as the case `SurfaceStatus` cannot express. After
      this task it can. Rewrite it.
- [ ] **Step 6: Run the gate. Commit.**

---

### Task 5: The compare path, and the near-miss regression

`acc compare` publishes the status column deliberately — its comment says flag sets differing is
not a divergence, but the status column is what a fleet owner wants. Today a tool that says
`choices: []` and a tool that is genuinely silent print identical rows; afterwards they differ.
**That is the desired outcome**: it cannot inflate a divergence count, cannot move a verdict, and
`compare` sets no exit code at all.

Two mechanical snags and one regression:

- `rowSurface` rebuilds a `Surface` from a five-field row and hardcodes empty evidence, so any
  state-specific field the sentence reads is dropped on the compare path — producing two different
  sentences for one status, which the vocabulary comment forbids.
- `kit/compare.ts` spreads `flags` on truthiness, and `[]` is truthy. Held by the Global Constraint
  that the new state carries no `flags`; assert it rather than assume it.
- **The near-miss regression:** `surfaceFrom` computes non-flag candidates **only** in the
  no-evidence branch, returning early when evidence exists. A path emitting both a verb-shaped
  `choices` list and an empty `validFlags` would stop naming the non-flag list it saw — partially
  undoing the repair that added that field. The original five-trap fixture was exactly this shape,
  which is why Task 1 splits it.

**Files:** `src/acc/commands/compare.ts`, `src/acc/kit/compare.ts`, `src/acc/kit/surface.ts`,
respective tests

- [ ] **Step 1: Write two failing tests** — one that the compare row for the new state renders the
      same sentence as `acc check` for the same target; one that a path with both an empty set and a
      non-flag candidate list still reports the near-miss.
- [ ] **Step 2: Fix `rowSurface`** to carry what the sentence needs, or make the sentence not depend
      on it — decide and say which in the commit.
- [ ] **Step 3: Assert `flags` is absent** for the new state at the compare boundary.
- [ ] **Step 4: Run the gate. Commit.**

---

### Task 6: Cross-version rendering, in both directions

The kit's stated rule is that a missing thing must render as _"not recorded by that kit"_, never as
an absent thing. **Every implementation of that rule keys on field absence, and this change does not
produce an absent field — it produces a present field holding a stale value.** So the mechanism is
blind to it, in both directions:

- **An old artifact, new kit.** The stored `surface.status` says `not-enumerated` for a target that
  in fact said `choices: []`. It re-renders as the negation, with no marker. It cannot be
  recomputed: the streams that carried the bytes are dropped at write time, by design.
- **A new artifact, old kit.** Falls past both `if`s to the fallthrough and prints _"nothing
  readable was recorded"_ — a confident, wrong "we did not look" for the one status that means "we
  looked and it said none". This direction is reachable today, because `compare` and `report` accept
  any report file.

The second direction is fixed by Task 2's exhaustive `switch` **only in kits that have it**; older
kits already shipped. That is not repairable from here and should be recorded rather than solved.

- [ ] **Step 1: Decide and record the policy** for an artifact predating this state. The options are
      to mark the status as unreliable when `kitVersion` precedes the change, or to state plainly in
      the JSON guide that the field's meaning changed and older artifacts cannot be reinterpreted.
      **Recommendation: the second.** A version comparison here would be the first of its kind in
      this code and would need its own contract; the honest limit is cheaper and matches how this
      project handles other things it cannot establish.
- [ ] **Step 2: Write it into the report guide**, not only into a comment.
- [ ] **Step 3: Record the old-kit direction as a known limit** with its reason: the fallthrough
      shipped before the state existed.
- [ ] **Step 4: Run the gate. Commit.**

---

### Task 7: The prose that states the vocabulary

Seven sites state the meaning of the status vocabulary in prose, and several are **two-way framings
that a third state makes false**, not merely stale:

- The module-level paragraph in `surface.ts` currently reads as forbidding the state being added —
  it warns that an empty array _"would read as a tool that accepts no flags at all"_. It must now
  distinguish **the kit inferring** zero flags from **the target asserting** zero flags.
- _"Distinguished from `not-enumerated` for the same reason `unverified` is distinguished from
  `pass`"_ — a two-way analogy that needs a third leg.
- _"Absent rather than empty on the other two"_ — the count is wrong.
- `identity.ts` says _"The same three-way split `SurfaceStatus` makes"_. `identity.ts` itself does
  not change; the sentence does.
- The `probesRead` denominator comment — the new state needs the same claim about what makes it a
  measurement rather than an assumption.
- `PROVENANCE.md` beside the vendored batch narrates the two-way distinction and carries the
  generate-vs-suppress argument this plan rests on. Update it to describe the state as shipped, and
  keep the argument.

**Write down the asymmetry rather than "fixing" it.** The verb reader keeps its own empty guard and
should: an empty verb set is not an assertion that a tool has no verbs, because the reader falls
through to another source. It will look like an oversight to whoever lands this.

- [ ] **Step 1: Run [`cascade-check`](../../.claude/skills/cascade-check/SKILL.md) on the sentence
      "the status vocabulary is three-valued"** to catch any site this list missed.
- [ ] **Step 2: Update each site**, one at a time, asserting after each that the old text is gone.
- [ ] **Step 3: Re-read each changed file whole**, not the diff — this is the step that finds the
      dangling antecedent a diff cannot show.
- [ ] **Step 4: Run the gate. Commit.**

---

### Task 8: Wire the vendored batch as the end-to-end regression

`src/acc/kit/fixtures/recorded-surfaces/magpie.empty-enumeration.json` is the deliberate before-case
and **no test consumes it**. It is a real adopter's real answer — two records, `sessions` and
`help`, each `exit 2` with `"choices": []` in a real envelope — which is not something that can be
fabricated honestly. It becomes this change's end-to-end proof.

- [ ] **Step 1: Write the test** — `acc check --recorded-surfaces` over that batch reports both
      paths as the new state, and the census counts them as compared rather than dropping them.
- [ ] **Step 2: Assert the census fraction moves the right way** — this is the adopter's actual
      complaint, so assert the number, not the sentence.
- [ ] **Step 3: Update `PROVENANCE.md`'s "nothing in this tree reads this file yet"** — it is now
      false for this batch, and it is stated in two places.
- [ ] **Step 4: Run the gate. Commit.**

---

### Task 9: Review

- [ ] **Step 1:** Run [`two-lens-review`](../../.claude/skills/two-lens-review/SKILL.md) — one
      reviewer on whether the empty set is now handled correctly, a second on what else the changed
      condition decides.
- [ ] **Step 2:** Confirm the Global Constraints held: no rule verdict moved, `conformant` and
      `fullyVerified` and the exit code unchanged, no `flags: []` anywhere in a published artifact.
- [ ] **Step 3:** Re-run the census figures pinned in existing tests and confirm the ones that
      should not move did not.

---

## Appendix A: what this plan deliberately excludes

**Item 2a is not in scope and is not scheduled.** The ratified plan pairs the enumeration fix with
the typed `unverified` reason and the `LEVEL_RANK` retirement, sized there as an afternoon. Measured
against the tree that sizing does not hold, and the work is gated behind a taxonomy decision that
has not been made — the detail, and the numbers behind it, are recorded at
[the ladder, and what replaces `L0` in the verdict line](../roadmap.md#the-ladder-and-what-replaces-l0-in-the-verdict-line).

Nothing in this plan waits on that decision, and nothing in it makes that decision cheaper or more
expensive. They were adjacent in the build order rather than dependent.

**The never-pass-on-partial lint** is the other half of the ratified item and is also excluded. It
is a separate guard over a different invariant; this plan neither implements nor blocks it.

## Appendix B: what the blast-radius analysis found

Three investigations, reading the tree at `a256933`.

**Sites.** 14 decide on the status, 13 pass it through, 7 state its meaning in prose, and 16 tests
assert current behaviour — 5 of which must change and 11 of which must hold.

**Hazards, ranked** — every one of these type-checks and passes the gate while reporting the old
thing:

1. `surfaceSummary`'s trailing unconditional `return` is the `no-evidence` sentence, reached by
   fallthrough past two `if`s. Fixed by Task 2's exhaustive `switch`.
2. The mint ternary has exactly two outcomes and is the only place a non-`enumerated` status is
   produced.
3. The declaration diff's guard is a negative test, so the new state lands in the right branch by
   luck while its reason inherits hazard 1 and prints a false sentence. **This is the one that makes
   the change look done when it is not.**
4. The rollup noun map is `Record<string, string>` read through `??`, degrading to the raw enum
   token rather than erroring.
5. `rowSurface` drops state-specific fields on the compare path, producing two sentences for one
   status.
6. `surfaceFrom` mints `enumerated` from any non-empty evidence without inspecting `flags`, and
   three separate guards are vacuous on `[]`.
7. The `enumerated` sentence has no guard against zero, so it would render "enumerated 0 flags" if
   hazard 6 fired.
8. One fixture carrying five traps means one behaviour change reclassifies three tests. Task 1.

**Verdict safety, established rather than assumed.** No checker imports the surface, declaration,
report or compare modules; `captureSurface` runs after every checker has returned. Declaration
findings touch neither `conformant` nor `fullyVerified` nor the exit code, by the field's own stated
contract and by an existing guard test. `acc` cannot produce the new state against itself, because
its envelope only emits `choices` when non-empty — so the dogfood suite is safe.

**Counts that move:** the compared-paths numerator, the undeclared-compared count, the
`checked`/`not-checked` status, the census sentence's `N of M`, the disagreement count, the headline
pointer, and the rollup's group buckets. **Counts that do not:** the rule count, the core
denominator, every `acc compare` count, and the resting census line.
