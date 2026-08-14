import { describe, expect, test } from "bun:test";
import { buildReport, primaryProblem } from "./report.ts";
import type { Checker, Finding, History, Observation, ProbeLevel } from "./types.ts";

const H: History = {
  target: { path: "x", argv0: ["x"] },
  discovery: { subcommands: [], flags: [], machineModeFlag: null, helpReadable: true },
  observations: [],
  byId: new Map(),
};

const checker = (
  ruleId: string,
  tier: "core" | "diagnostic",
  probeLevel: ProbeLevel = "L0",
): Checker => ({
  ruleId,
  rulePath: `docs/wiki/rules/x/${ruleId}.md`,
  tier,
  probeLevel,
  probes: () => [],
  check: () => ({ ruleId, verdict: "pass", detail: "", evidence: [] }),
});

const finding = (ruleId: string, verdict: Finding["verdict"]): Finding => ({
  ruleId,
  verdict,
  detail: "d",
  evidence: [],
});

describe("buildReport", () => {
  test("core conformance is BINARY — one core failure fails the run", () => {
    const r = buildReport(
      H,
      [finding("A1", "pass"), finding("A2", "fail")],
      [checker("A1", "core"), checker("A2", "core")],
      { knownFailures: {} },
      "L0",
    );
    expect(r.conformant).toBe(false);
  });

  test("a diagnostic failure does NOT fail the run", () => {
    const r = buildReport(
      H,
      [finding("A1", "pass"), finding("F2", "fail")],
      [checker("A1", "core"), checker("F2", "diagnostic")],
      { knownFailures: {} },
      "L0",
    );
    expect(r.conformant).toBe(true);
    expect(r.counts.diagnosticFailures).toBe(1);
  });

  // The ruling this file's `conformant` semantics rest on — see
  // docs/wiki/concepts/conformance.md. `conformant` answers "did anything VIOLATE a core rule";
  // `fullyVerified` answers "and was every core rule actually established". `acc check
  // $(which git)` is the case that separates them: B3 comes back `unverified` because git
  // advertises no machine-mode flag — nothing git did wrong — in the same report as two things
  // it did do (C2, an unknown flag exiting 129 against an unknown verb exiting 1; D2, bare
  // `git` writing its usage to stdout). Conflating the claims made those three indistinguishable.
  describe("conformance is about VIOLATIONS; verification is a separate claim", () => {
    test("an UNVERIFIED core rule does not count as a pass", () => {
      const r = buildReport(
        H,
        [finding("A1", "unverified")],
        [checker("A1", "core")],
        {
          knownFailures: {},
        },
        "L0",
      );
      expect(r.counts.unverified).toBe(1);
      expect(r.counts.corePassed).toBe(0);
    });

    test("an UNVERIFIED core rule does not block conformance either", () => {
      const r = buildReport(
        H,
        [finding("A1", "unverified")],
        [checker("A1", "core")],
        {
          knownFailures: {},
        },
        "L0",
      );
      expect(r.conformant).toBe(true);
      expect(r.fullyVerified).toBe(false);
      expect(r.counts.coreUnverified).toBe(1);
    });

    test("a core FAILURE blocks both claims", () => {
      const r = buildReport(
        H,
        [finding("A1", "fail")],
        [checker("A1", "core")],
        { knownFailures: {} },
        "L0",
      );
      expect(r.conformant).toBe(false);
      expect(r.fullyVerified).toBe(false);
    });

    test("all core rules passing yields both claims", () => {
      const r = buildReport(
        H,
        [finding("A1", "pass"), finding("A2", "pass")],
        [checker("A1", "core"), checker("A2", "core")],
        { knownFailures: {} },
        "L0",
      );
      expect(r.conformant).toBe(true);
      expect(r.fullyVerified).toBe(true);
      expect(r.counts.coreUnverified).toBe(0);
    });

    test("an unverified DIAGNOSTIC rule gates neither claim", () => {
      const r = buildReport(
        H,
        [finding("A1", "pass"), finding("A6", "unverified")],
        [checker("A1", "core"), checker("A6", "diagnostic")],
        { knownFailures: {} },
        "L0",
      );
      expect(r.fullyVerified).toBe(true);
      expect(r.counts.coreUnverified).toBe(0);
      // Still counted and still reported — it is only `fullyVerified` that is core-scoped.
      expect(r.counts.unverified).toBe(1);
    });
  });

  test("a known failure is excused but still reported", () => {
    const r = buildReport(
      H,
      [finding("A1", "fail")],
      [checker("A1", "core")],
      { knownFailures: { A1: "legacy parser" } },
      "L0",
    );
    expect(r.conformant).toBe(true);
    expect(r.knownFailures).toEqual([{ ruleId: "A1", reason: "legacy parser" }]);
  });

  test("a known failure that now PASSES is reported as stale, so the ratchet tightens", () => {
    const r = buildReport(
      H,
      [finding("A1", "pass")],
      [checker("A1", "core")],
      { knownFailures: { A1: "legacy parser" } },
      "L0",
    );
    expect(r.staleExpectations).toEqual(["A1"]);
  });

  // The ratchet used to excuse `fail` only, which left a project blocked by an UNVERIFIED core
  // rule with no path to green: nothing it could change would clear the rule, and the
  // expectations file had no way to acknowledge that.
  describe("the ratchet excuses unverified, not only failures", () => {
    test("an excused unverified core rule does not gate fullyVerified", () => {
      const r = buildReport(
        H,
        [finding("B3", "unverified")],
        [checker("B3", "core")],
        { knownFailures: { B3: "no machine-mode path yet" } },
        "L0",
      );
      expect(r.findings[0]?.excused).toBe(true);
      expect(r.fullyVerified).toBe(true);
      expect(r.counts.coreUnverified).toBe(0);
    });

    test("an UNexcused unverified core rule still gates fullyVerified", () => {
      const r = buildReport(
        H,
        [finding("B3", "unverified")],
        [checker("B3", "core")],
        { knownFailures: {} },
        "L0",
      );
      expect(r.fullyVerified).toBe(false);
    });

    test("an excused rule that reaches PASS is stale whichever verdict it was excused for", () => {
      const r = buildReport(
        H,
        [finding("B3", "pass")],
        [checker("B3", "core")],
        { knownFailures: { B3: "no machine-mode path yet" } },
        "L0",
      );
      expect(r.staleExpectations).toEqual(["B3"]);
    });

    test("a passing rule is never marked excused, so the excuse cannot hide a pass", () => {
      const r = buildReport(
        H,
        [finding("B3", "pass")],
        [checker("B3", "core")],
        { knownFailures: { B3: "no machine-mode path yet" } },
        "L0",
      );
      expect(r.findings[0]?.excused).toBe(false);
    });
  });

  test("every finding carries the rule page path", () => {
    const r = buildReport(
      H,
      [finding("A1", "fail")],
      [checker("A1", "core")],
      { knownFailures: {} },
      "L0",
    );
    expect(r.findings[0]?.rulePath).toBe("docs/wiki/rules/x/A1.md");
  });

  // The brief, as written, makes A4 (core, but not probeable below L1) fail every run forever —
  // no target, including acc itself, could ever be conformant. `probeLevel` and its
  // applicable/not-applicable split exist to fix that without weakening what "core" means.
  describe("probe level: not-applicable is a different claim from unverified", () => {
    test("a core checker whose probeLevel exceeds the run level does NOT block conformance", () => {
      const r = buildReport(
        H,
        [finding("A4", "unverified")],
        [checker("A4", "core", "L1")],
        { knownFailures: {} },
        "L0",
      );
      expect(r.conformant).toBe(true);
      expect(r.counts.notApplicable).toBe(1);
      expect(r.counts.core).toBe(0);
      expect(r.counts.unverified).toBe(0);
      expect(r.notApplicable).toEqual(["A4"]);
      expect(r.findings[0]?.applicable).toBe(false);
    });

    // Both claims, on the same input, at the two levels. Not-applicable is out of scope and
    // gates nothing; unverified at the run's own level is a real gap in the evidence and gates
    // `fullyVerified` — the distinction the `applicable` flag exists to preserve.
    test("a core checker AT the run level returning unverified gates verification, not conformance", () => {
      const r = buildReport(
        H,
        [finding("A1", "unverified")],
        [checker("A1", "core", "L0")],
        { knownFailures: {} },
        "L0",
      );
      expect(r.conformant).toBe(true);
      expect(r.fullyVerified).toBe(false);
      expect(r.counts.unverified).toBe(1);
      expect(r.counts.coreUnverified).toBe(1);
      expect(r.counts.notApplicable).toBe(0);
    });

    test("a core checker ABOVE the run level gates neither claim", () => {
      const r = buildReport(
        H,
        [finding("A4", "unverified")],
        [checker("A4", "core", "L1")],
        { knownFailures: {} },
        "L0",
      );
      expect(r.conformant).toBe(true);
      expect(r.fullyVerified).toBe(true);
      expect(r.counts.coreUnverified).toBe(0);
    });

    test("a not-applicable rule's failure is excluded from core counts, not just excused", () => {
      const r = buildReport(
        H,
        [finding("A4", "fail")],
        [checker("A4", "core", "L1")],
        { knownFailures: {} },
        "L0",
      );
      expect(r.conformant).toBe(true);
      expect(r.counts.coreFailures).toBe(0);
      expect(r.counts.core).toBe(0);
      expect(r.notApplicable).toEqual(["A4"]);
    });

    test("running at L1 makes an L1 rule applicable again", () => {
      const r = buildReport(
        H,
        [finding("A4", "fail")],
        [checker("A4", "core", "L1")],
        { knownFailures: {} },
        "L1",
      );
      expect(r.conformant).toBe(false);
      expect(r.counts.notApplicable).toBe(0);
      expect(r.counts.coreFailures).toBe(1);
    });
  });
});

// Which rule `acc check` offers as the next thing to read. The report can carry several red
// lines at once, and only one of them gets the caller's attention.
describe("primaryProblem", () => {
  const hungHistory = (): History => {
    const o: Observation = {
      id: "hung",
      invocation: { args: [], inertness: "bare", purpose: "E1: bare" },
      purposes: ["E1: bare"],
      stdout: "",
      stderr: "",
      exitCode: null,
      timedOut: true,
      spawnFailed: false,
      durationMs: 10_000,
      timeToFirstByteMs: null,
    };
    return { ...H, observations: [o], byId: new Map([[o.id, o]]) };
  };

  const reportOf = (h: History, findings: Finding[], checkers: Checker[]) =>
    buildReport(h, findings, checkers, { knownFailures: {} }, "L0");

  test("prefers a violation over a gap, wherever each falls in registry order", () => {
    const r = reportOf(
      H,
      [finding("A1", "unverified"), finding("C2", "fail")],
      [checker("A1", "core"), checker("C2", "core")],
    );
    expect(primaryProblem(H, r)?.ruleId).toBe("C2");
  });

  test("ignores a diagnostic failure, which never blocks conformance", () => {
    const r = reportOf(
      H,
      [finding("A6", "fail"), finding("C2", "fail")],
      [checker("A6", "diagnostic"), checker("C2", "core")],
    );
    expect(primaryProblem(H, r)?.ruleId).toBe("C2");
  });

  // A target that blocks on stdin fails A1, C1, D2 and E1 at once. Registry order offered A1 —
  // a page about rejecting unknown flags, which explains none of the four failures on screen.
  test("points at E1, not registry order, when the history contains a hang", () => {
    const h = hungHistory();
    const r = reportOf(
      h,
      [finding("A1", "fail"), finding("C1", "fail"), finding("E1", "fail")],
      [checker("A1", "core"), checker("C1", "core"), checker("E1", "core")],
    );
    expect(primaryProblem(h, r)?.ruleId).toBe("E1");
  });

  // E1's precedence is about the rule that OWNS the failure mode, not about E1 as such: an
  // excused or passing E1 explains nothing, so the ranking falls back to registry order.
  test("falls back to registry order when E1 itself is excused", () => {
    const h = hungHistory();
    const r = buildReport(
      h,
      [finding("A1", "fail"), finding("E1", "fail")],
      [checker("A1", "core"), checker("E1", "core")],
      { knownFailures: { E1: "known to block on this platform" } },
      "L0",
    );
    expect(primaryProblem(h, r)?.ruleId).toBe("A1");
  });

  test("offers the first core gap when nothing was violated", () => {
    const r = reportOf(
      H,
      [finding("A1", "pass"), finding("B3", "unverified")],
      [checker("A1", "core"), checker("B3", "core")],
    );
    expect(primaryProblem(H, r)?.ruleId).toBe("B3");
  });

  test("offers nothing when every applicable core rule passed", () => {
    const r = reportOf(H, [finding("A1", "pass")], [checker("A1", "core")]);
    expect(primaryProblem(H, r)).toBeUndefined();
  });
});
