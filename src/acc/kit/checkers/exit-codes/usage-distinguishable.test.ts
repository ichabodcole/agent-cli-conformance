import { describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { VERB_DISPATCH_ASSUMED } from "../../inert.ts";
import { record } from "../../record.ts";
import { digestOfText } from "../../runner.ts";
import type { History, TargetInfo } from "../../types.ts";
import { neverBlockChecker } from "../interactivity/never-block.ts";
import { doesNotCrashChecker } from "../lifecycle/does-not-crash.ts";
import { usageDistinguishableChecker } from "./usage-distinguishable.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (rel: string): TargetInfo => {
  const p = join(HERE, "../../fixtures", rel);
  return { path: p, argv0: ["bun", p] };
};

// Both "C2:" probes recorded, but one hung. Built by hand: a fixture that actually blocks for
// the runner's ~10s deadline would make this file slow on every run.
function historyWithOneTimedOutProbe(): History {
  const observations = [
    {
      id: "fake-flag",
      invocation: {
        args: ["--acc-probe-xyzzy-flag"],
        inertness: "sentinel" as const,
        purpose: "C2: usage error via flag",
      },
      purposes: ["C2: usage error via flag"],
      stdout: "",
      stderr: "",
      stdoutBytes: 0,
      stderrBytes: 0,
      stdoutDigest: digestOfText(""),
      stderrDigest: digestOfText(""),
      stdoutLossy: false,
      stderrLossy: false,
      truncated: false,
      exitCode: null,
      timedOut: true,
      signal: null,
      crashed: false,
      spawnFailed: false,
      durationMs: 10_000,
      timeToFirstByteMs: null,
    },
    {
      id: "fake-verb",
      invocation: {
        args: ["acc-probe-xyzzy-verb"],
        inertness: "sentinel" as const,
        purpose: "C2: usage error via verb",
      },
      purposes: ["C2: usage error via verb"],
      stdout: "",
      stderr: "",
      stdoutBytes: 0,
      stderrBytes: 0,
      stdoutDigest: digestOfText(""),
      stderrDigest: digestOfText(""),
      stdoutLossy: false,
      stderrLossy: false,
      truncated: false,
      exitCode: 2,
      timedOut: false,
      signal: null,
      crashed: false,
      spawnFailed: false,
      durationMs: 5,
      timeToFirstByteMs: 1,
    },
  ];
  return {
    target: { path: "x", argv0: ["x"] },
    discovery: {
      subcommands: [],
      flags: [],
      machineModeFlag: null,
      machineModeDefault: false,
      valueSets: {},
      helpReadable: false,
    },
    observations,
    waived: new Set<string>(),
    byId: new Map(observations.map((o) => [o.id, o])),
  };
}

describe("C2 — usage errors are distinguishable", () => {
  // THE ADOPTION BLOCKER. One design decision — a bare invocation prints help and exits 0 —
  // was reported as two core violations, because C2 reads the same observation D2 owns. Waiving
  // D2 left C2 failing on that byte, so no configuration expressed "bare help is deliberate" and
  // reached a green gate, and the only route to exit 0 was to record a permanent design decision
  // as debt in `knownFailures`. Reported by the first outside adopter, who correctly refused to
  // do that and could therefore not adopt at all.
  test("PASSES when the shape it fails on belongs to a waived rule", async () => {
    const h = await record(
      fixture("bare-help.ts"),
      [usageDistinguishableChecker],
      false,
      new Set(["D2"]),
    );
    const f = usageDistinguishableChecker.check(h);
    expect(f.verdict).toBe("pass");
    expect(f.ruleId).toBe("C2");
  });

  // ...and the same fixture with nothing waived still fails, or the pass above would be the
  // fixture's doing rather than the waiver's.
  test("FAILS the same target when nothing is waived", async () => {
    const h = await record(fixture("bare-help.ts"), [usageDistinguishableChecker]);
    expect(usageDistinguishableChecker.check(h).verdict).toBe("fail");
  });

  // A NARROWED PASS IS NOT THE SAME CLAIM. Three shapes compared where the page promises four is
  // a smaller result, and a report that did not say so would be a checker overstating its reach.
  test("says which shape it excluded and why", async () => {
    const h = await record(
      fixture("bare-help.ts"),
      [usageDistinguishableChecker],
      false,
      new Set(["D2"]),
    );
    const f = usageDistinguishableChecker.check(h);
    expect(f.detail).toContain("D2");
    expect(f.detail).toContain("waived");
    // The excluded observation is not cited as evidence for a verdict it took no part in.
    const bare = h.observations.find((o) => o.invocation.args.length === 0);
    expect(f.evidence).not.toContain(bare?.id);
  });

  // A WAIVER IS NOT A BLINDFOLD. Waiving D2 declares the bare invocation a help path, and a help
  // path exits 0. A bare invocation exiting 64 is still an error, its code still has to agree,
  // and excluding it on the waiver alone made it vanish from the entire run — C2 passed over
  // (2,2) while D2's own waived verdict failed on a different clause, so nothing anywhere said
  // the target answers one error class with two codes. Found by an independent review.
  test("keeps a waived shape that did NOT behave like the withdrawn premise", async () => {
    const h = await record(
      fixture("broken/bare-invocation-exits-64.ts"),
      [usageDistinguishableChecker],
      false,
      new Set(["D2"]),
    );
    const f = usageDistinguishableChecker.check(h);
    expect(f.verdict).toBe("fail");
    expect(f.detail).toContain("64");
  });

  // ...and it must not claim exclusions that never happened. A7's shape exists only for a target
  // whose help advertises a closed value set, so a waiver of A7 against a target without one is
  // not an exclusion — saying so told the reader config had dropped a shape never in the
  // population.
  test("names only the shapes a waiver actually removed", async () => {
    const h = await record(
      fixture("bare-help.ts"),
      [usageDistinguishableChecker],
      false,
      new Set(["D2", "A7"]),
    );
    const f = usageDistinguishableChecker.check(h);
    expect(f.detail).toContain("D2");
    expect(f.detail).not.toContain("A7");
  });

  // A waiver must not manufacture a pass out of a population of one.
  //
  // The target has to be one whose waived shapes actually exit 0, or they are not excluded at
  // all — which is the point of the two-condition rule above. `bare-help.ts` answers an unknown
  // flag and an unknown verb with 2, so waiving A1 and A2 against it correctly removes nothing.
  test("reports unverified when too few shapes survive the waivers", async () => {
    const h = await record(
      fixture("broken/exits-zero-on-unknown-flag.ts"),
      [usageDistinguishableChecker],
      false,
      new Set(["D2", "A1", "A2"]),
    );
    const f = usageDistinguishableChecker.check(h);
    expect(f.verdict).toBe("unverified");
    expect(f.detail).toContain("waived");
  });

  test("PASSES the conforming fixture", async () => {
    const h = await record(fixture("conforming.ts"), [usageDistinguishableChecker]);
    const f = usageDistinguishableChecker.check(h);
    expect(f.verdict).toBe("pass");
    expect(f.ruleId).toBe("C2");
    // The rule's honest half: even on a pass, distinguishability from an internal fault was
    // never checked, because there is no safe general way to provoke one black-box.
    expect(f.detail).toContain("unverified");
  });

  // The negative control: this fixture exits 0 on every invocation, including both usage-error
  // shapes (bad flag and bad verb) — the exact "usage error return 0, not 2" failure the rule
  // exists to catch.
  test("FAILS a CLI that exits 0 on usage errors", async () => {
    const h = await record(fixture("broken/exits-zero-on-unknown-flag.ts"), [
      usageDistinguishableChecker,
    ]);
    const f = usageDistinguishableChecker.check(h);
    expect(f.verdict).toBe("fail");
    expect(f.detail).toContain("exited 0");
    expect(f.ruleId).toBe("C2");
  });

  test("cites the observations backing its verdict", async () => {
    const h = await record(fixture("conforming.ts"), [usageDistinguishableChecker]);
    const f = usageDistinguishableChecker.check(h);
    expect(f.evidence.length).toBeGreaterThan(0);
    for (const id of f.evidence) expect(h.byId.has(id)).toBe(true);
  });

  // A hung probe WAS recorded — it just returned no code to compare. The detail must say so
  // rather than "probes were not recorded", which would conflate two different outcomes A1 and
  // C1 both take care to keep separate: missing evidence vs. evidence that the target hung.
  test("distinguishes a timed-out probe from a probe that was never recorded", () => {
    const f = usageDistinguishableChecker.check(historyWithOneTimedOutProbe());
    expect(f.verdict).toBe("unverified");
    expect(f.detail).toContain("timed out");
    expect(f.detail).not.toContain("not recorded");
    expect(f.ruleId).toBe("C2");
  });
});

// The half of the design that is easy to get wrong, and that the first attempt at this would have
// broken: a waiver withdraws a PREMISE, it does not strip an OBSERVATION.
//
// E1 and G1 read the same bare invocation C2 just dropped, for reasons that have nothing to do
// with it being an error — one asks whether the target blocked, the other whether it died by a
// fault. Removing the observation from the history would have silently taken evidence they are
// entitled to, and neither would have said so.
describe("a waiver does not take evidence from the rules that did not inherit the premise", () => {
  test("E1 and G1 still reach verdicts on the observation C2 excluded", async () => {
    const h = await record(
      fixture("bare-help.ts"),
      [usageDistinguishableChecker, neverBlockChecker, doesNotCrashChecker],
      false,
      new Set(["D2"]),
    );
    const bare = h.observations.find((o) => o.invocation.args.length === 0);
    expect(bare).toBeDefined();

    for (const [checker, expected] of [
      [neverBlockChecker, "E1"],
      [doesNotCrashChecker, "G1"],
    ] as const) {
      const f = checker.check(h);
      expect({ rule: f.ruleId, verdict: f.verdict }).toEqual({ rule: expected, verdict: "pass" });
      expect(f.evidence).toContain(bare?.id as string);
    }
  });
});

// THE SHAPE THAT IS ONLY A USAGE ERROR IF THE TARGET DISPATCHES VERBS. Against
// `first-positional-is-data.ts` the verb shape returns 1 — a no-match, not an error — so this
// checker collects (2,1,2) and reports a taxonomy as inconsistent when it is not. Unchanged
// here: what the verdict now carries is the premise that put the 1 in the population.
describe("C2 — the contrast says what it assumed about the first positional", () => {
  test("still fails a target whose first positional is data, and discloses the assumption", async () => {
    const h = await record(fixture("first-positional-is-data.ts"), [usageDistinguishableChecker]);
    const f = usageDistinguishableChecker.check(h);
    expect({ verdict: f.verdict, discloses: f.detail.includes(VERB_DISPATCH_ASSUMED) }).toEqual({
      verdict: "fail",
      discloses: true,
    });
    expect(f.detail).toContain("2,1,2");
  });

  test("carries it on the conforming fixture's pass", async () => {
    const h = await record(fixture("conforming.ts"), [usageDistinguishableChecker]);
    expect(usageDistinguishableChecker.check(h).detail).toContain(VERB_DISPATCH_ASSUMED);
  });

  // ...and drops it where the premise is no longer load-bearing, because a waiver of A2 has
  // already withdrawn the verb shape from the population being compared.
  test("omits it once a waiver has withdrawn the verb shape", async () => {
    const h = await record(
      fixture("broken/exits-zero-on-unknown-flag.ts"),
      [usageDistinguishableChecker],
      false,
      new Set(["A2"]),
    );
    expect(usageDistinguishableChecker.check(h).detail).not.toContain(VERB_DISPATCH_ASSUMED);
  });

  test("names the assumption in its coverage gaps", () => {
    const named = usageDistinguishableChecker.coverageGaps.filter((g) =>
      g.includes("the verb shape assumes"),
    );
    expect(named.length).toBe(1);
  });
});
