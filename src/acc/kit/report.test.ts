import { describe, expect, test } from "bun:test";
import { buildReport } from "./report.ts";
import type { Checker, Finding, History, ProbeLevel } from "./types.ts";

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
    expect(r.conformant).toBe(false);
    expect(r.counts.unverified).toBe(1);
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

    test("a core checker AT the run level returning unverified still blocks conformance", () => {
      const r = buildReport(
        H,
        [finding("A1", "unverified")],
        [checker("A1", "core", "L0")],
        { knownFailures: {} },
        "L0",
      );
      expect(r.conformant).toBe(false);
      expect(r.counts.unverified).toBe(1);
      expect(r.counts.notApplicable).toBe(0);
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
