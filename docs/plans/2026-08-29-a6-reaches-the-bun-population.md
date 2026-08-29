---
type: plan
generated: { by: claude-opus-5, at: 2026-08-29 }
status: draft
lifecycle: live
description:
  The implementation plan for W2 — delivering the A6 probe to bun-launched targets by
  compensating for bun's terminator stripping at the spawn, which replaces a permanent
  `unverified` with a real verdict for an adopter fleet whose every CLI is a bun script.
  Carries the design, the review that corrected it five times, and the measurements it rests on.
tags: [parsing, launcher, probing, adoption]
---

# A6 reaches the bun population — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the A6 probe to bun-launched targets by compensating for bun's terminator
stripping at the launch boundary, replacing a permanent `unverified` with a real verdict.

**Architecture:** Bun strips one bare `--` per bun layer between the launcher and the script, so
A6 — whose probe leads with the terminator — has never been deliverable through a bun launcher.
The runner sends one extra `--` for bun targets; bun eats it; the target receives exactly what a
non-bun target receives. The compensation lives at the spawn call rather than in the probe's
`args`, so recorded args stay byte-identical across targets and `compare` can still align A6
across a mixed fleet.

**Tech Stack:** Bun, TypeScript (strict), Biome, `bun test`.

**Spec:** this document — Appendix A (the design and its review) and Appendix B (the
measurements). The plan argues from those; read them first.

## Global Constraints

- Every measurement in Appendix B was taken on `bun 1.4.0`, macOS (`darwin 25.6.0`). Any claim
  written into the tree must name that as its provenance rather than asserting a general
  property of bun.
- The full gate is `bun run check` (typecheck, Biome with `--error-on-warnings`, markdown format
  check, both doc linters, `bun test`). It must be green before every commit — this repository
  gates the whole tree, so one red draft blocks every other worker.
- No `acc` version literal may appear in a document; `docs/lint.ts` rejects unmarked ones. Bun
  version literals are fine and are used elsewhere in `docs/research/`.
- Branch is `fix/a6-reaches-the-bun-population`, off `develop`. Never push `main`.

---

### Task 1: `toTarget` is the guarantor, so assert its shape

The compensation is sound only because `toTarget` emits a **single-layer** `argv0`. That is a
property of our code, not of bun, and it is the one that can actually change — there are already
94 hand-built `argv0`s in the test suite, which is the door. This task closes it before the
compensation exists, so the guard cannot be forgotten afterwards.

**Files:**

- Modify: `src/acc/commands/check.test.ts`

**Interfaces:**

- Consumes: `toTarget(path: string): TargetInfo` from `src/acc/commands/check.ts:146`.
- Produces: nothing. A guard test only.

- [ ] **Step 1: Write the test**

Add to `src/acc/commands/check.test.ts`:

```ts
// THE GUARANTOR OF THE A6 LAUNCH COMPENSATION (see runner.ts).
//
// Bun strips one bare `--` PER BUN LAYER: `bun script.ts` strips one, `bun run <script>` strips
// two (measured, bun 1.4.0 — docs/plans/2026-08-29-a6-reaches-the-bun-population.md Appendix B).
// The runner compensates by exactly one, which is correct only while `argv0` names at most one
// layer. Widen `toTarget` to emit a launcher flag, a package script, or an adopter-supplied
// argv0, and the compensation is consumed whole and A6 silently returns to measuring A1 — with
// the `unverified` branch that used to make someone look now deleted.
//
// Bun's behaviour has not moved in that scenario, so no fixture watching bun can fire. This can.
test("toTarget emits a single-layer argv0", () => {
  const bunScript = toTarget(fixture("echoes-argv.ts"));
  expect(bunScript.argv0[0]).toBe("bun");
  expect(bunScript.argv0).toHaveLength(2);

  const native = toTarget("/bin/echo");
  expect(native.argv0).toHaveLength(1);
  expect(native.argv0[0]).not.toBe("bun");
});
```

If `check.test.ts` has no `fixture` helper in scope, use the same import the file's neighbours
use — `grep -n "fixture(" src/acc/commands/check.test.ts` and copy that import verbatim.

- [ ] **Step 2: Run it and watch it PASS**

Run: `bun test src/acc/commands/check.test.ts -t "single-layer"`

Expected: **PASS**. This is deliberate and is not a TDD violation — the assertion is true today
and the test exists to keep it true. Confirm it can fail by temporarily changing the expected
length to `3`, re-running to see a red, then restoring it.

- [ ] **Step 3: Commit**

```bash
git add src/acc/commands/check.test.ts
git commit -m "test(check): toTarget's single-layer argv0 is the A6 compensation's guarantor"
```

---

### Task 2: Compensate at the launch boundary

**Files:**

- Modify: `src/acc/kit/runner.ts:124` (after the `argv0` destructure) and `:226` (the `spawn`)
  and `:169` (the `Observation` literal)
- Modify: `src/acc/kit/types.ts` — `Observation` gains `launchAdjustment?: string`
- Modify: `src/acc/kit/runner.test.ts`

**Interfaces:**

- Consumes: `runProbe(target: TargetInfo, inv: Invocation, timeoutMs?: number)`.
- Produces: `Observation.launchAdjustment?: string` — present only when the wire argv differed
  from `invocation.args`. Task 4 renders it into the report.

- [ ] **Step 1: Write the failing witness test**

`fixtures/echoes-argv.ts` is the only witness that can answer this — it reports the argv the
child actually received, and its own header says so. It carries `#!/usr/bin/env bun`, so
`toTarget` gives it `["bun", abs]`.

Add to `src/acc/kit/runner.test.ts`:

```ts
// The A6 probe's shape, delivered through a bun launcher. Before the launch compensation the
// child received ["--x"] — bun ate the terminator — which is why A6 reported `unverified` for
// every bun target rather than measuring A1 while wearing A6's name.
test("a leading `--` survives the bun launcher", async () => {
  const target = toTarget(fixture("echoes-argv.ts"));
  const o = await runProbe(target, {
    args: ["--", "--acc-sentinel-value"],
    inertness: "sentinel",
    purpose: "witness: the terminator is delivered",
  });

  const seen = JSON.parse(o.stderr) as { argv: string[] };
  expect(seen.argv).toEqual(["--", "--acc-sentinel-value"]);
});

test("the compensation is recorded, and recorded args stay uncompensated", async () => {
  const target = toTarget(fixture("echoes-argv.ts"));
  const o = await runProbe(target, {
    args: ["--", "--acc-sentinel-value"],
    inertness: "sentinel",
    purpose: "witness: the adjustment is disclosed",
  });

  // The evidence id and `compare`'s alignment both key on the RECORDED args, which must not move.
  expect(o.invocation.args).toEqual(["--", "--acc-sentinel-value"]);
  expect(o.launchAdjustment).toContain("--");
});

test("a probe that does not lead with `--` is not compensated", async () => {
  const target = toTarget(fixture("echoes-argv.ts"));
  const o = await runProbe(target, {
    args: ["--acc-sentinel-value"],
    inertness: "sentinel",
    purpose: "witness: no compensation without a leading terminator",
  });

  const seen = JSON.parse(o.stderr) as { argv: string[] };
  expect(seen.argv).toEqual(["--acc-sentinel-value"]);
  expect(o.launchAdjustment).toBeUndefined();
});
```

Match the file's existing import style for `toTarget`, `fixture` and `runProbe` —
`grep -n "^import" src/acc/kit/runner.test.ts` and follow it.

- [ ] **Step 2: Run and verify they fail**

Run: `bun test src/acc/kit/runner.test.ts -t "bun launcher"`

Expected: FAIL — the child reports `["--acc-sentinel-value"]`, terminator missing. The second
test fails on `launchAdjustment` being undefined. The third should already pass.

- [ ] **Step 3: Add the field to `Observation`**

In `src/acc/kit/types.ts`, inside `interface Observation`, after `purposes`:

```ts
  /**
   * Present only when the WIRE argv differed from `invocation.args` — today, exclusively the
   * `--` prepended for a bun launcher and consumed before delivery.
   *
   * Written for whoever REPLAYS this record. Recorded `args` deliberately stay uncompensated so
   * the evidence id and `compare`'s alignment do not fork between bun and non-bun targets; the
   * cost is that re-running the recorded args by hand reproduces the ORIGINAL defect rather than
   * the kit's run. This field is what stops that reader concluding the kit is wrong, so it names
   * the wire form rather than merely announcing that an adjustment happened.
   */
  launchAdjustment?: string;
```

- [ ] **Step 4: Compensate at the spawn**

In `src/acc/kit/runner.ts`, immediately after
`if (!cmd) throw new Error("target has an empty argv0");`:

```ts
  // THE LAUNCH COMPENSATION. Bun strips one bare `--` per BUN LAYER between the launcher and the
  // script, so a probe whose argv leads with the terminator never delivers it and A6 measured A1
  // wearing A6's name. We send one extra; bun eats it; the target receives `inv.args` exactly as
  // a non-bun target does.
  //
  // Here rather than in the checker's `probes()` because `invocationId` hashes `{args, env,
  // repeat}` and `compare` keys `byProbe` on that id: compensating in `args` would fork the bun
  // population's A6 evidence id and file the rule as NOT ALIGNED on exactly the mixed fleet the
  // comparison exists to serve.
  //
  // THE GUARANTOR IS `toTarget`, NOT BUN. Stripping is one per layer, and this compensates by
  // one; that is correct only while `argv0` names at most one layer, which `toTarget`
  // (src/acc/commands/check.ts) is the sole producer of and check.test.ts asserts. A multi-layer
  // argv0 would have this consumed whole and silently restore the defect. Measured on bun 1.4.0
  // — see docs/plans/2026-08-29-a6-reaches-the-bun-population.md Appendix B.
  //
  // If a future bun stops stripping, the survivor is ITSELF a terminator: an honouring target
  // reads it as a positional after an honoured `--` and still passes, a non-honouring one still
  // meets the sentinel and still fails by name. The probe's shape degrades, not its verdict.
  const compensated = cmd === "bun" && inv.args[0] === "--";
  const wireArgs = compensated ? ["--", ...inv.args] : inv.args;
```

Change the spawn at `:226` from `[...base, ...inv.args]` to `[...base, ...wireArgs]`.

In the `resolve({...})` literal at `:169`, after `purposes: [inv.purpose],`:

```ts
        ...(compensated
          ? {
              launchAdjustment: `one \`--\` was prepended for the bun launcher and consumed before delivery; the wire argv was ${JSON.stringify([...base, ...wireArgs])}`,
            }
          : {}),
```

- [ ] **Step 5: Run the witness tests**

Run: `bun test src/acc/kit/runner.test.ts`

Expected: all three PASS.

- [ ] **Step 6: Run the full gate**

Run: `bun run check`

Expected: green. If any A6 checker test fails here, that is Task 3's subject — note it and
proceed; do not patch the checker from this task.

- [ ] **Step 7: Commit**

```bash
git add src/acc/kit/runner.ts src/acc/kit/types.ts src/acc/kit/runner.test.ts
git commit -m "fix(kit): the A6 terminator survives a bun launcher"
```

---

### Task 3: Delete A6's `unverified` branch and its stale warrant

**Files:**

- Modify: `src/acc/kit/checkers/parsing/double-dash-terminator.ts:64-87`
- Modify: `src/acc/kit/checkers/parsing/double-dash-terminator.test.ts`

**Interfaces:**

- Consumes: `Observation.launchAdjustment` (Task 2) — indirectly; the checker itself stays pure
  over `History` and does not read it.
- Produces: A6 returning `pass` / `fail` for bun targets instead of `unverified`.

- [ ] **Step 1: Write the failing test**

Add to `src/acc/kit/checkers/parsing/double-dash-terminator.test.ts`:

```ts
// A6 through a bun launcher was `unverified` for the whole bun population — permanently, for a
// house whose every CLI is a bun script. The launch compensation makes it measurable.
test("a bun-launched target gets a real A6 verdict", async () => {
  const target = toTarget(fixture("conforming.ts"));
  expect(target.argv0[0]).toBe("bun"); // the case that used to short-circuit

  const h = await historyFor(target, doubleDashTerminatorChecker);
  const f = doubleDashTerminatorChecker.check(h);

  expect(f.status).not.toBe("unverified");
  expect(f.evidence.length).toBeGreaterThan(0);
});
```

Use whatever history-building helper the file's neighbouring tests use —
`grep -n "historyFor\|buildHistory\|record(" src/acc/kit/checkers/parsing/double-dash-terminator.test.ts`
— and copy it exactly rather than inventing one.

- [ ] **Step 2: Run and verify it fails**

Run: `bun test src/acc/kit/checkers/parsing/double-dash-terminator.test.ts -t "real A6 verdict"`

Expected: FAIL — `status` is `"unverified"` and `evidence` is empty.

- [ ] **Step 3: Delete the branch and rewrite the warrant**

Remove the whole `if (h.target.argv0[0] === "bun") { ... }` block at `:81-87`.

Replace the comment block at `:64-80` (from `// The probe is UNDELIVERABLE through a Bun
launcher` through the `toTarget` paragraph) with:

```ts
    // Bun targets USED to short-circuit here. `bun <script> -- --x` hands the script `["--x"]`
    // — bun strips one bare `--` per bun layer — so the terminator never arrived and what got
    // measured was A1 wearing A6's name. Against `acc` itself the two answers are opposite, so
    // the verdict was not merely unreliable, it was inverted, and the rule reported `unverified`
    // rather than a measurement of an argv the target never received.
    //
    // The runner now compensates at the spawn (see `runner.ts`), so the target receives the same
    // argv a native target receives and this checker needs no launcher knowledge at all.
    //
    // The comment that stood here argued the fix was impossible because the compensation would
    // "corrupt the argv of every other target" — true only of an UNCONDITIONAL compensation, and
    // its own next paragraph recorded that `toTarget` had since learned to read the shebang, so
    // the knowledge whose absence it cited had already arrived. The mechanism died and the
    // conclusion kept asserting it.
    //
    // A compiled bun binary (`bun build --compile`) receives the terminator INTACT — measured,
    // bun 1.4.0 — and is excluded from the compensation by construction, since its argv0 is the
    // binary itself with no launcher token and no shebang to read.
```

- [ ] **Step 4: Run the checker's tests**

Run: `bun test src/acc/kit/checkers/parsing/double-dash-terminator.test.ts`

Expected: PASS, including any pre-existing test that asserted the `unverified` branch — if one
exists it must be **deleted, not adjusted**, and its deletion mentioned in the commit body. A
test asserting the old short-circuit is asserting the defect.

- [ ] **Step 5: Commit**

```bash
git add src/acc/kit/checkers/parsing/double-dash-terminator.ts src/acc/kit/checkers/parsing/double-dash-terminator.test.ts
git commit -m "fix(kit): A6 measures bun-launched targets instead of refusing them"
```

---

### Task 4: Close the seam — six false sentences and one ambiguous survivor

A grep for `bun` or for `--` reaches none of these. They were found by grepping the **claim**.
Every one of them is a sentence that cites a property this change removes.

**Files:**

- Modify: `src/acc/kit/report.ts:180`, `:134`, and the `ReportedObservation` serialiser
- Modify: `src/acc/kit/compare.ts:84` and `:82`
- Modify: `src/acc/commands/check.ts:120-126`

**Interfaces:**

- Consumes: `Observation.launchAdjustment` (Task 2).
- Produces: `ReportedObservation.launchAdjustment?: string` in the stored JSON.

- [ ] **Step 1: Carry the field into the report**

In `src/acc/kit/report.ts`, add to `interface ReportedObservation` after `args`:

```ts
  /** Present when the wire argv differed from `args`; see `Observation.launchAdjustment`. */
  launchAdjustment?: string;
```

Find where `ReportedObservation` values are built (`grep -n "args: \[\.\.\." src/acc/kit/report.ts`)
and carry the field through with the same conditional-spread shape used in `runner.ts`.

- [ ] **Step 2: Repair the four false sentences**

`report.ts:180` — replace:

```ts
  /** The argv this probe sent, after `target.argv0`. The answer to "what did you actually run?" */
```

with:

```ts
  /**
   * The argv this probe ASKED to send, after `target.argv0`. Identical across targets for the
   * same probe, which is what `invocationId` hashes and what `compare` aligns on.
   *
   * NOT always the wire argv: see `launchAdjustment`, which names the difference when there was
   * one. Replaying these args by hand against a bun target reproduces the original defect rather
   * than the kit's run.
   */
```

`report.ts:134` (`EvidenceProbe`) — replace `/** The argv this probe sent, after `target.argv0`.
Empty when `unresolved`. */` with:

```ts
  /**
   * The argv this probe ASKED to send, after `target.argv0`. Empty when `unresolved`. See
   * `ReportedObservation.args` — the wire argv can differ, and `launchAdjustment` names it.
   */
```

`compare.ts:84` — replace `/** The argv sent after the target's own `argv0`. Empty array is the
bare invocation. */` with:

```ts
  /**
   * The argv ASKED for after the target's own `argv0`. Empty array is the bare invocation. The
   * wire argv can differ — see `ReportedObservation.launchAdjustment`.
   */
```

`check.ts:123` — the sentence "that checker reports `unverified` whenever `argv0[0] === 'bun'`,
because Bun eats the bare `--` its probe leads with" now documents a deleted branch. Replace that
clause with:

```
 *    A6: the runner compensates for bun's terminator stripping at the spawn (see `runner.ts`),
 *    and it can only do that when `argv0` NAMES bun. A Bun CLI installed without a `.ts`
 *    extension used to miss the guard entirely and collect a FAIL derived from an argv it never
 *    received.
```

- [ ] **Step 3: Disambiguate the survivor**

`compare.ts:82` is the sentence that certifies alignment, and it is the one that would have been
left standing as proof the others were done. Under this change "argv" splits three ways —
recorded (identical), delivered (identical), wire (different). Replace:

```ts
  /** `invocationId` — equal ids across reports mean byte-identical argv, env and repetition. */
```

with:

```ts
  /** `invocationId` — equal ids mean byte-identical RECORDED args, env and repetition. */
```

- [ ] **Step 4: Run the gate**

Run: `bun run check`

Expected: green. `report.test.ts` and `compare.test.ts` may assert on schema shape — if a
snapshot needs updating, update it and say so in the commit body.

- [ ] **Step 5: Commit**

```bash
git add src/acc/kit/report.ts src/acc/kit/compare.ts src/acc/commands/check.ts
git commit -m "fix(kit): the record says which argv it means"
```

---

### Task 5: Repair the rule page

The page contradicts itself inside ten lines, and the half everyone would bet on is the wrong
half.

**Files:**

- Modify: `docs/wiki/rules/parsing/double-dash-terminator.md:93-100` and `:119-122`

- [ ] **Step 1: Replace the launcher paragraph**

At `:93-100`, the paragraph beginning "**Reports `unverified` for any target launched through
`bun`**" is now wholly false — replace it with:

```markdown
**Bun strips the terminator, and the kit compensates for it.** `bun <script> -- --x` hands the
script `["--x"]`: bun consumes one bare `--` per bun layer between the launcher and the script,
which is exactly this probe's shape. Left uncompensated the target never receives the terminator
and what gets measured is [A1](./unknown-flag-exits-nonzero.md) wearing A6's name — an inverted
verdict, not merely an unreliable one. The runner therefore sends one extra `--` for a target
whose `argv0` names bun; bun eats it, and the target receives the same argv a native target
receives. The stored record keeps the UNCOMPENSATED args, so an evidence id means the same thing
across a mixed fleet, and names the wire form in `launchAdjustment` for anyone replaying it.

No launcher form avoids the stripping on its own — not `bun run`, not a `#!/usr/bin/env bun`
shebang, and not a passthrough wrapper, which hands the terminator back to bun to be eaten again.
A compiled binary (`bun build --compile`) receives it intact and needs no compensation. All
measured on bun 1.4.0.
```

- [ ] **Step 2: Replace the coverage note**

At `:119-122`, replace the "Through a `bun` launcher the probe is undeliverable" sentence with:

```markdown
Through a bun launcher the probe is delivered by compensation rather than directly: one `--` is
prepended at the spawn and consumed by bun before the target sees it. The compensation assumes a
single bun layer, which is what `toTarget` emits and what `check.test.ts` asserts.
```

- [ ] **Step 3: Run the doc linters**

Run: `bun run docs:lint && bun run docs:lint:artifacts && bun run format:md:check`

Expected: green. If `format:md:check` complains, run `bun run format:md` and re-check.

- [ ] **Step 4: Full gate, then commit**

```bash
bun run check
git add docs/wiki/rules/parsing/double-dash-terminator.md
git commit -m "docs(rules): A6's page stops recommending a remedy that cannot work"
```

---

## Appendix A: the design, and the review that produced it

### What it replaces

A6 returned `unverified` for every bun-launched target. Two adopters raised it; the second
sharpened it into a population claim — "nearly every house CLI is a bun script, so that
unverified is permanent for us as-is" — and that framing was taken at face value by both parties.
The work was scoped as a documentation choice: suggest a wrapper, or acknowledge the permanence.

The measurement in Appendix B falsified the framing. Permanence was never the property;
unreachability through the forms everyone reaches for was. The adopter has since amended their
own claim, and the shipped rule page was wrong in the same direction.

### Five things the review changed

1. **The blocking comment was a stale warrant.** It rejected the fix for want of knowledge whose
   arrival its own next paragraph records. Not an argument against the design — an argument whose
   mechanism had already died.
2. **The launch boundary beats `probes()`, and the provenance objection was backwards.**
   `invocationId` hashes `{args, env, repeat}` (`runner.ts:19`) and `compare` keys `byProbe` on
   that id (`compare.ts:279`). Branching in `probes()` forks the bun population's A6 evidence id
   and files the rule as NOT ALIGNED on exactly the mixed fleet the feature serves. Compensating
   at the wire keeps delivered argv equal to recorded argv.
3. **No run-time calibration.** It was argued for against a silent inversion, then withdrawn once
   the failure was actually derived: if bun stops stripping, the survivor is itself a terminator,
   so an honouring target still passes and a non-honouring one still fails by name. The shape
   degrades, not the verdict. A per-check spawn defending a diagnostic verdict against a mild
   mis-shape is the over-engineering to refuse.
4. **The guarantor is `toTarget`, not bun.** "Bun consumes exactly one" is true of every row
   measured before the layered test and false in general. The residual must name the real
   guarantor, or it is a true instruction resting on a reason positioned to survive the change
   that breaks it — the same defect as item 1, one generation on.
5. **The disclosure is for the replayer, not the differ.** Recorded args match the rule page
   exactly, so nobody diffing finds an extra token. The exposed reader takes the recorded args,
   runs them by hand, gets a delivered argv the kit never got, and concludes the kit is wrong.

### The seam: seven homes, six repaired and one disambiguated

`compare.ts:82` — "equal ids mean byte-identical argv" — does not straightforwardly survive. It
becomes ambiguous exactly where this change introduces the ambiguity: true of recorded args, true
of delivered argv, false of the wire argv. It sits two lines above a comment this change makes
false, where the falseness is caused by that same word meaning "recorded" in one place and
"delivered" in another. The positive control had the disease it was meant to certify the absence
of, and it is the sentence that would have been left standing as proof the other six were done.

Three of the six are **the same sentence copied into three interfaces with no shared definition**,
which is why the reviewer who found one missed two. That is a finding about the schema comments
rather than about A6, and it is recorded here as one.

### Method note, recorded because it generalises

Every correction in this review came from a measurement or from a standpoint the author could not
occupy, and none from more careful reading:

- The adopter's population claim was falsified by a five-form table.
- The reviewer's sharpest claim — compiled binaries are getting inverted verdicts today — was
  falsified by compiling the fixture.
- The reviewer's calibration guard was withdrawn after deriving a failure mode they had priced
  without deriving. Volunteered, with the reason: "the same defect as defending an instrument
  from memory."
- The lead's provenance objection was inverted by three line numbers.
- "Exactly one `--`" was falsified by adding a second bun layer.

The question that produced all five was **"name the measurement you would not trust yet."** It
belongs in the proposal template rather than in one channel's habits.

A second instrument, from the same review: the far seam was found by grepping **the claim**, not
the mechanism and not the instruction. Those two are the pair currently recommended, and both
miss a sentence that names neither.

## Appendix B: the measurements

All on `bun 1.4.0`, macOS (`darwin 25.6.0`), fixture printing `process.argv.slice(2)`.

### Terminator delivery by launcher form

| form                                                      | delivered                 |
| --------------------------------------------------------- | ------------------------- |
| `bun argv.ts -- --x sentinel`                             | `["--x","sentinel"]`      |
| `bun run argv.ts -- --x sentinel`                         | `["--x","sentinel"]`      |
| `#!/usr/bin/env bun` shebang, `./argv.ts -- --x sentinel` | `["--x","sentinel"]`      |
| wrapper `exec bun argv.ts "$@"`                           | `["--x","sentinel"]`      |
| wrapper `exec bun argv.ts -- "$@"`                        | `["--","--x","sentinel"]` |

No launcher form forwards the terminator; a wrapper that INSERTS one does, and is transparent
when the caller passes none (`./wrap --x sentinel` → `["--x","sentinel"]`, nothing manufactured).

### Stripping is per bun layer

| layers                   | sent                    | delivered                 | eaten |
| ------------------------ | ----------------------- | ------------------------- | ----- |
| one — `bun argv.ts`      | `-- -- --x sentinel`    | `["--","--x","sentinel"]` | 1     |
| two — `bun run <script>` | `-- -- --x sentinel`    | `["--x","sentinel"]`      | 2     |
| two — `bun run <script>` | `-- -- -- --x sentinel` | `["--","--x","sentinel"]` | 2     |

### Compiled binaries do not strip

| form                                 | delivered                      |
| ------------------------------------ | ------------------------------ |
| `./argv-compiled -- --x sentinel`    | `["--","--x","sentinel"]`      |
| `./argv-compiled --x sentinel`       | `["--x","sentinel"]`           |
| `./argv-compiled -- -- --x sentinel` | `["--","--","--x","sentinel"]` |

Two consequences: compiled bun binaries are **not** receiving inverted A6 verdicts today, and the
compensation must never reach them — which it cannot, since their `argv0` carries no launcher
token and no shebang. The third row is also a working stand-in for a future bun that stops
stripping, which is how the degradation walk in Appendix A item 3 was checked rather than assumed.

### Not measured

- Any bun other than 1.4.0.
- Windows path semantics.
- A `bun build --compile` binary produced by a different bun than the one that ran it.
