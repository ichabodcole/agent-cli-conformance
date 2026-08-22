import { describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { VERSION } from "../version.ts";
import { record } from "./record.ts";
import { CHECKERS } from "./registry.ts";
import { buildReport, primaryProblem, runCheckers, toReportedObservation } from "./report.ts";
import { digestOfText } from "./runner.ts";
import type { Checker, Coverage, Finding, History, Observation, ProbeLevel } from "./types.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

const H: History = {
  target: { path: "x", argv0: ["x"] },
  discovery: {
    subcommands: [],
    flags: [],
    machineModeFlag: null,
    machineModeDefault: false,
    valueSets: {},
    helpReadable: true,
  },
  observations: [],
  waived: new Set<string>(),
  byId: new Map(),
};

// `coverage` defaults to `complete` HERE and nowhere else. The Checker interface deliberately
// has no default, because a real checker inheriting `complete` in silence is the drift the
// field exists to remove; in this file most cases are about the verdict algebra and would be
// obscured by repeating a coverage argument on every line. The cases that ARE about coverage
// pass it explicitly.
const checker = (
  ruleId: string,
  tier: "core" | "diagnostic",
  probeLevel: ProbeLevel = "L0",
  coverage: Coverage = "complete",
): Checker => ({
  ruleId,
  rulePath: `docs/wiki/rules/x/${ruleId}.md`,
  tier,
  probeLevel,
  coverage,
  coverageGaps: coverage === "partial" ? [`${ruleId} does not probe the nested case`] : [],
  // Unconditional, unlike the gaps above: `coverageEstablished` is required non-empty whatever
  // the coverage, so a `complete` stub owes one too.
  coverageEstablished: [`${ruleId} probes the root case`],
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
      { rules: {}, knownFailures: {} },
      "L0",
      VERSION,
    );
    expect(r.conformant).toBe(false);
  });

  test("a diagnostic failure does NOT fail the run", () => {
    const r = buildReport(
      H,
      [finding("A1", "pass"), finding("F2", "fail")],
      [checker("A1", "core"), checker("F2", "diagnostic")],
      { rules: {}, knownFailures: {} },
      "L0",
      VERSION,
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
        { rules: {}, knownFailures: {} },
        "L0",
        VERSION,
      );
      expect(r.counts.unverified).toBe(1);
      expect(r.counts.corePassed).toBe(0);
    });

    test("an UNVERIFIED core rule does not block conformance either", () => {
      const r = buildReport(
        H,
        [finding("A1", "unverified")],
        [checker("A1", "core")],
        { rules: {}, knownFailures: {} },
        "L0",
        VERSION,
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
        { rules: {}, knownFailures: {} },
        "L0",
        VERSION,
      );
      expect(r.conformant).toBe(false);
      expect(r.fullyVerified).toBe(false);
    });

    test("all core rules passing yields both claims", () => {
      const r = buildReport(
        H,
        [finding("A1", "pass"), finding("A2", "pass")],
        [checker("A1", "core"), checker("A2", "core")],
        { rules: {}, knownFailures: {} },
        "L0",
        VERSION,
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
        { rules: {}, knownFailures: {} },
        "L0",
        VERSION,
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
      { rules: {}, knownFailures: { A1: "legacy parser" } },
      "L0",
      VERSION,
    );
    expect(r.conformant).toBe(true);
    expect(r.knownFailures).toEqual([{ ruleId: "A1", reason: "legacy parser" }]);
  });

  test("a known failure that now PASSES is reported as stale, so the ratchet tightens", () => {
    const r = buildReport(
      H,
      [finding("A1", "pass")],
      [checker("A1", "core")],
      { rules: {}, knownFailures: { A1: "legacy parser" } },
      "L0",
      VERSION,
    );
    expect(r.staleExpectations).toEqual(["A1"]);
  });

  // The ratchet used to excuse `fail` only, which left a project blocked by an UNVERIFIED core
  // rule with no path to green: nothing it could change would clear the rule, and the
  // config file had no way to acknowledge that.
  describe("the ratchet excuses unverified, not only failures", () => {
    // Review R3-4. The excuse used to be subtracted from `coreUnverified` as well, which let a
    // project write itself a note about a rule nothing had established and receive "fully
    // verified" over the hole. An excuse is an organisation deciding it can live with a defect;
    // it is not evidence, so it suppresses the CONFORMANCE gate and nothing else.
    test("an excused unverified core rule still gates fullyVerified, but not conformance", () => {
      const r = buildReport(
        H,
        [finding("B3", "unverified")],
        [checker("B3", "core")],
        { rules: {}, knownFailures: { B3: "no machine-mode path yet" } },
        "L0",
        VERSION,
      );
      expect(r.findings[0]?.excused).toBe(true);
      expect(r.conformant).toBe(true);
      expect(r.fullyVerified).toBe(false);
      // The gap is still counted, and still named.
      expect(r.counts.coreUnverified).toBe(1);
      expect(r.evidenceGaps).toEqual([{ ruleId: "B3", gaps: ["unverified: d"] }]);
    });

    // The other half of the same ruling: an excused core FAILURE does clear conformance, which
    // is the whole point of `knownFailures`, and it still cannot buy full verification.
    test("an excused core failure clears conformance and not the evidence claim", () => {
      const r = buildReport(
        H,
        [finding("A1", "fail")],
        [checker("A1", "core")],
        { rules: {}, knownFailures: { A1: "legacy parser" } },
        "L0",
        VERSION,
      );
      expect(r.conformant).toBe(true);
      expect(r.fullyVerified).toBe(false);
      expect(r.evidenceGaps).toEqual([{ ruleId: "A1", gaps: ["fail: d"] }]);
    });

    test("an UNexcused unverified core rule still gates fullyVerified", () => {
      const r = buildReport(
        H,
        [finding("B3", "unverified")],
        [checker("B3", "core")],
        { rules: {}, knownFailures: {} },
        "L0",
        VERSION,
      );
      expect(r.fullyVerified).toBe(false);
    });

    test("an excused rule that reaches PASS is stale whichever verdict it was excused for", () => {
      const r = buildReport(
        H,
        [finding("B3", "pass")],
        [checker("B3", "core")],
        { rules: {}, knownFailures: { B3: "no machine-mode path yet" } },
        "L0",
        VERSION,
      );
      expect(r.staleExpectations).toEqual(["B3"]);
    });

    test("a passing rule is never marked excused, so the excuse cannot hide a pass", () => {
      const r = buildReport(
        H,
        [finding("B3", "pass")],
        [checker("B3", "core")],
        { rules: {}, knownFailures: { B3: "no machine-mode path yet" } },
        "L0",
        VERSION,
      );
      expect(r.findings[0]?.excused).toBe(false);
    });
  });

  // Review R1-4. Several checkers pass while their own detail admits part of the rule was never
  // established — C2's "internal-fault contrast unverified at L0", A2's "nested case not probed
  // at L0". `buildReport` counted those as ordinary passes, so `fullyVerified` spoke over
  // acknowledged holes. `coverage` is that admission moved somewhere the report can count.
  describe("partial coverage: a pass that is narrower than the rule it is filed under", () => {
    test("a passing core rule with partial coverage blocks fullyVerified, not conformance", () => {
      const r = buildReport(
        H,
        [finding("C2", "pass")],
        [checker("C2", "core", "L0", "partial")],
        { rules: {}, knownFailures: {} },
        "L0",
        VERSION,
      );
      expect(r.conformant).toBe(true);
      expect(r.fullyVerified).toBe(false);
      // Still a pass, and still counted as one: the probe ran and found no violation. It is the
      // SCOPE that is smaller than the page, which is what the separate count is for.
      expect(r.counts.corePassed).toBe(1);
      expect(r.counts.corePartial).toBe(1);
      expect(r.counts.coreUnverified).toBe(0);
    });

    test("the report names the gaps, so `false` is never the whole answer", () => {
      const r = buildReport(
        H,
        [finding("C2", "pass")],
        [checker("C2", "core", "L0", "partial")],
        { rules: {}, knownFailures: {} },
        "L0",
        VERSION,
      );
      expect(r.evidenceGaps).toEqual([
        { ruleId: "C2", gaps: ["C2 does not probe the nested case"] },
      ]);
    });

    test("a rule that both failed to pass AND has gaps reports both reasons", () => {
      const r = buildReport(
        H,
        [finding("C2", "unverified")],
        [checker("C2", "core", "L0", "partial")],
        { rules: {}, knownFailures: {} },
        "L0",
        VERSION,
      );
      expect(r.evidenceGaps).toEqual([
        { ruleId: "C2", gaps: ["unverified: d", "C2 does not probe the nested case"] },
      ]);
    });

    test("partial coverage on a DIAGNOSTIC rule gates neither claim", () => {
      const r = buildReport(
        H,
        [finding("A1", "pass"), finding("F2", "pass")],
        [checker("A1", "core"), checker("F2", "diagnostic", "L0", "partial")],
        { rules: {}, knownFailures: {} },
        "L0",
        VERSION,
      );
      expect(r.fullyVerified).toBe(true);
      expect(r.counts.corePartial).toBe(0);
      expect(r.evidenceGaps).toEqual([]);
    });

    test("partial coverage ABOVE the run level gates neither claim", () => {
      const r = buildReport(
        H,
        [finding("A1", "pass"), finding("A4", "pass")],
        [checker("A1", "core"), checker("A4", "core", "L1", "partial")],
        { rules: {}, knownFailures: {} },
        "L0",
        VERSION,
      );
      expect(r.fullyVerified).toBe(true);
      expect(r.evidenceGaps).toEqual([]);
    });

    // Same fallback discipline as `probeLevel`: an unregistered checker is assumed core, L0 and
    // now `partial`, so a wiring bug shows up as a withheld claim rather than silently
    // upgrading a rule to "fully established".
    test("a finding with no matching checker is assumed partial, never complete", () => {
      const r = buildReport(
        H,
        [finding("A1", "pass")],
        [],
        { rules: {}, knownFailures: {} },
        "L0",
        VERSION,
      );
      expect(r.findings[0]?.coverage).toBe("partial");
      expect(r.fullyVerified).toBe(false);
      expect(r.evidenceGaps[0]?.ruleId).toBe("A1");
    });

    test("evidenceGaps is empty exactly when fullyVerified is true", () => {
      const complete = buildReport(
        H,
        [finding("A1", "pass")],
        [checker("A1", "core")],
        { rules: {}, knownFailures: {} },
        "L0",
        VERSION,
      );
      expect(complete.fullyVerified).toBe(true);
      expect(complete.evidenceGaps).toEqual([]);
    });
  });

  test("every finding carries the rule page path", () => {
    const r = buildReport(
      H,
      [finding("A1", "fail")],
      [checker("A1", "core")],
      { rules: {}, knownFailures: {} },
      "L0",
      VERSION,
    );
    expect(r.findings[0]?.rulePath).toBe("docs/wiki/rules/x/A1.md");
  });

  // The OTHER thing acc.config.json can say, and the one that must not collapse into the ratchet
  // above. `knownFailures` is DEBT — "broken, I know, I will fix it" — and goes stale when the
  // rule starts passing. `severity: "off"` is a DECLARATION — "does not apply to my tool, by
  // design" — and never goes stale, because passing was never the goal.
  //
  // D2 is the rule that forced it: a bare invocation must be a usage error, and three of four
  // real CLIs print help and exit 0 deliberately. The deeper reason is not adoption. An
  // unwaivable spec silently deforms the tool: with no way to decline a rule that does not fit,
  // the path of least resistance is to bend the CLI until it conforms, and the report then shows
  // a clean sheet for a tool bent toward the spec instead of toward its users.
  describe("waivers: a rule the project declared does not apply", () => {
    const waive = (ruleId: string, reason = "human-first CLI; bare help is deliberate") => ({
      rules: { [ruleId]: { severity: "off" as const, reason } },
      knownFailures: {},
    });

    test("a waived core FAILURE does not block conformance", () => {
      const r = buildReport(
        H,
        [finding("D2", "fail")],
        [checker("D2", "core")],
        waive("D2"),
        "L0",
        VERSION,
      );
      expect(r.conformant).toBe(true);
      expect(r.findings[0]?.waived).toBe(true);
    });

    // THE RULING THAT MATTERS. Waivers may buy `conformant: true`; they must never buy the
    // evidence claim. Same precedent as review R3-4 for excuses, and a waiver is the stronger
    // statement, so it can buy no more: a rule the project chose not to be measured against was
    // not established. Precisely because `conformant` is frame-relative, one boolean has to be
    // measured against the whole catalogue.
    test("a waived core rule ALWAYS blocks fullyVerified — even when it would have passed", () => {
      const r = buildReport(
        H,
        [finding("D2", "pass")],
        [checker("D2", "core")],
        waive("D2"),
        "L0",
        VERSION,
      );
      expect(r.conformant).toBe(true);
      expect(r.fullyVerified).toBe(false);
    });

    test("...and the report says why, rather than leaving `false` on its own", () => {
      const r = buildReport(
        H,
        [finding("D2", "fail")],
        [checker("D2", "core")],
        waive("D2"),
        "L0",
        VERSION,
      );
      expect(r.evidenceGaps).toEqual([
        {
          ruleId: "D2",
          gaps: [
            "waived by config: human-first CLI; bare help is deliberate",
            "the probe ran anyway and returned fail: d",
          ],
        },
      ]);
    });

    test("evidenceGaps stays empty exactly when fullyVerified is true, waivers included", () => {
      const r = buildReport(
        H,
        [finding("A1", "pass"), finding("D2", "pass")],
        [checker("A1", "core"), checker("D2", "core")],
        waive("D2"),
        "L0",
        VERSION,
      );
      expect(r.fullyVerified).toBe(false);
      expect(r.evidenceGaps.map((g) => g.ruleId)).toEqual(["D2"]);
    });

    // A DIAGNOSTIC rule never gated `fullyVerified` in the first place, so waiving one cannot
    // change it. The asymmetry is about what the rule was binding, not about the waiver.
    test("a waived DIAGNOSTIC rule blocks neither claim", () => {
      const r = buildReport(
        H,
        [finding("A1", "pass"), finding("A6", "fail")],
        [checker("A1", "core"), checker("A6", "diagnostic")],
        waive("A6"),
        "L0",
        VERSION,
      );
      expect(r.conformant).toBe(true);
      expect(r.fullyVerified).toBe(true);
      expect(r.evidenceGaps).toEqual([]);
    });

    test("a waived rule is excluded from every count, and counted as a waiver instead", () => {
      const r = buildReport(
        H,
        [finding("A1", "pass"), finding("D2", "fail"), finding("A6", "fail")],
        [checker("A1", "core"), checker("D2", "core"), checker("A6", "diagnostic")],
        {
          rules: {
            D2: { severity: "off", reason: "human-first" },
            A6: { severity: "off", reason: "not a delegator" },
          },
          knownFailures: {},
        },
        "L0",
        VERSION,
      );
      expect(r.counts.core).toBe(1);
      expect(r.counts.corePassed).toBe(1);
      expect(r.counts.coreFailures).toBe(0);
      expect(r.counts.diagnosticFailures).toBe(0);
      expect(r.counts.waived).toBe(2);
    });

    test("a waived unverified rule is excluded from the unverified counts too", () => {
      const r = buildReport(
        H,
        [finding("B3", "unverified")],
        [checker("B3", "core")],
        waive("B3", "no machine mode by design"),
        "L0",
        VERSION,
      );
      expect(r.counts.unverified).toBe(0);
      expect(r.counts.coreUnverified).toBe(0);
      expect(r.counts.waived).toBe(1);
    });

    // The checker STILL RUNS. Probes are shared, so a waived rule costs no extra process, and
    // the verdict beside the waiver is what makes it reviewable: one sitting at `pass` can be
    // deleted, one sitting at `fail` is still doing work. Skipping the checker would have thrown
    // that away for nothing.
    test("the machine output carries every waiver with its reason and the verdict it reached", () => {
      const r = buildReport(
        H,
        [finding("D2", "fail")],
        [checker("D2", "core")],
        waive("D2"),
        "L0",
        VERSION,
      );
      expect(r.waivers).toEqual([
        {
          ruleId: "D2",
          reason: "human-first CLI; bare help is deliberate",
          verdict: "fail",
          tier: "core",
          applicable: true,
        },
      ]);
    });

    test("a waiver whose rule now passes reports the pass, and is NOT called stale", () => {
      const r = buildReport(
        H,
        [finding("D2", "pass")],
        [checker("D2", "core")],
        waive("D2"),
        "L0",
        VERSION,
      );
      expect(r.waivers[0]?.verdict).toBe("pass");
      // The ratchet mechanism is for debt. A waiver is a declaration; there is nothing to repay.
      expect(r.staleExpectations).toEqual([]);
    });

    test("a waiver of a rule this level never reaches says so", () => {
      const r = buildReport(
        H,
        [finding("A4", "unverified")],
        [checker("A4", "core", "L1")],
        waive("A4", "we take no positionals"),
        "L0",
        VERSION,
      );
      expect(r.waivers[0]?.applicable).toBe(false);
      // Out of scope already, so the waiver suppressed nothing and withholds nothing.
      expect(r.fullyVerified).toBe(true);
      expect(r.counts.waived).toBe(0);
    });

    test("a waived rule is never ALSO marked excused, whatever a hand-built config says", () => {
      const r = buildReport(
        H,
        [finding("D2", "fail")],
        [checker("D2", "core")],
        {
          rules: { D2: { severity: "off", reason: "human-first" } },
          knownFailures: { D2: "tracked in #412" },
        },
        "L0",
        VERSION,
      );
      expect(r.findings[0]?.waived).toBe(true);
      expect(r.findings[0]?.excused).toBe(false);
    });

    test("a waived rule is never offered as the next thing to read", () => {
      const r = buildReport(
        H,
        [finding("D2", "fail")],
        [checker("D2", "core")],
        waive("D2"),
        "L0",
        VERSION,
      );
      expect(primaryProblem(H, r)).toBeUndefined();
    });
  });

  // Severity moves in BOTH directions. A config that could only subtract would read as an
  // opt-out list; a project declaring itself stricter than baseline is a signal worth having.
  describe("severity overrides: a rule moved between tiers", () => {
    test("a core rule LOWERED to diagnostic stops blocking conformance", () => {
      const r = buildReport(
        H,
        [finding("C2", "fail")],
        [checker("C2", "core")],
        {
          rules: { C2: { severity: "diagnostic", reason: "we ship one error class" } },
          knownFailures: {},
        },
        "L0",
        VERSION,
      );
      expect(r.conformant).toBe(true);
      expect(r.counts.diagnosticFailures).toBe(1);
      expect(r.counts.core).toBe(0);
    });

    test("a diagnostic rule RAISED to core starts blocking conformance", () => {
      const r = buildReport(
        H,
        [finding("A6", "fail")],
        [checker("A6", "diagnostic")],
        {
          rules: { A6: { severity: "core", reason: "we delegate to ffmpeg; -- is load-bearing" } },
          knownFailures: {},
        },
        "L0",
        VERSION,
      );
      expect(r.conformant).toBe(false);
      expect(r.counts.coreFailures).toBe(1);
      expect(r.findings[0]?.tier).toBe("core");
    });

    // A raise pulls the rule into `fullyVerified`'s scope as well, which is the honest reading of
    // "this binds for me": the project asked to be held to it, evidence included.
    test("a raised rule enters the evidence claim as well as the gate", () => {
      const r = buildReport(
        H,
        [finding("A6", "unverified")],
        [checker("A6", "diagnostic")],
        {
          rules: { A6: { severity: "core", reason: "we delegate; -- is load-bearing" } },
          knownFailures: {},
        },
        "L0",
        VERSION,
      );
      expect(r.fullyVerified).toBe(false);
      expect(r.counts.coreUnverified).toBe(1);
    });

    test("both directions are published, so the frame is legible rather than assumed", () => {
      const r = buildReport(
        H,
        [finding("C2", "pass"), finding("A6", "pass")],
        [checker("C2", "core"), checker("A6", "diagnostic")],
        {
          rules: {
            C2: { severity: "diagnostic", reason: "one error class" },
            A6: { severity: "core", reason: "we delegate" },
          },
          knownFailures: {},
        },
        "L0",
        VERSION,
      );
      expect(r.severityOverrides).toEqual([
        { ruleId: "C2", from: "core", to: "diagnostic", reason: "one error class" },
        { ruleId: "A6", from: "diagnostic", to: "core", reason: "we delegate" },
      ]);
    });

    test("a severity restated at its baseline value is not reported as a move", () => {
      const r = buildReport(
        H,
        [finding("A1", "pass")],
        [checker("A1", "core")],
        {
          rules: { A1: { severity: "core", reason: "affirming the baseline" } },
          knownFailures: {},
        },
        "L0",
        VERSION,
      );
      expect(r.severityOverrides).toEqual([]);
      expect(r.waivers).toEqual([]);
    });

    // A move is not a waiver, so the debt ratchet still applies to it — "I hold myself to core on
    // this rule, and I currently fail it" is the aspirational half of the same ratchet.
    test("a raised rule may still carry a known failure, and the excuse still works", () => {
      const r = buildReport(
        H,
        [finding("A6", "fail")],
        [checker("A6", "diagnostic")],
        {
          rules: { A6: { severity: "core", reason: "we delegate" } },
          knownFailures: { A6: "tracked in #412" },
        },
        "L0",
        VERSION,
      );
      expect(r.findings[0]?.excused).toBe(true);
      expect(r.conformant).toBe(true);
      expect(r.fullyVerified).toBe(false);
    });
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
        { rules: {}, knownFailures: {} },
        "L0",
        VERSION,
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
        { rules: {}, knownFailures: {} },
        "L0",
        VERSION,
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
        { rules: {}, knownFailures: {} },
        "L0",
        VERSION,
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
        { rules: {}, knownFailures: {} },
        "L0",
        VERSION,
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
        { rules: {}, knownFailures: {} },
        "L1",
        VERSION,
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
      stdoutBytes: 0,
      stderrBytes: 0,
      stdoutDigest: digestOfText(""),
      stderrDigest: digestOfText(""),
      stdoutLossy: false,
      stderrLossy: false,
      truncated: false,
      exitCode: null,
      timedOut: true,
      // A hang ends in the runner's own SIGKILL, so `signal` is set and `crashed` is not — the
      // distinction that keeps a target we killed apart from one that fell over.
      signal: "SIGKILL",
      crashed: false,
      spawnFailed: false,
      durationMs: 10_000,
      timeToFirstByteMs: null,
    };
    return { ...H, observations: [o], byId: new Map([[o.id, o]]) };
  };

  const reportOf = (h: History, findings: Finding[], checkers: Checker[]) =>
    buildReport(h, findings, checkers, { rules: {}, knownFailures: {} }, "L0", VERSION);

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
      { rules: {}, knownFailures: { E1: "known to block on this platform" } },
      "L0",
      VERSION,
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

// An excuse on a rule the run never evaluated suppresses nothing and never expires — reported by
// the adopter it happened to, whose `knownFailures` entry was genuine tracked debt. The two facts
// are kept apart because they call for OPPOSITE actions: a stale entry means you fixed it and can
// delete the line; an inert one means the kit stopped looking and the debt may be entirely intact.
describe("an excuse the run did not evaluate is reported as inert, not stale", () => {
  const excuse = { B3: "error envelope is prose; tracked in docs/backlog/412" };

  test("a not-applicable rule lands in inertExpectations, never in staleExpectations", async () => {
    const p = join(HERE, "fixtures/conforming.ts");
    const h = await record({ path: p, argv0: ["bun", p] }, CHECKERS);
    const r = buildReport(
      h,
      runCheckers(h, CHECKERS),
      CHECKERS,
      { rules: {}, knownFailures: excuse },
      "L0",
      VERSION,
    );
    expect(r.inertExpectations.map((e) => e.ruleId)).toEqual(["B3"]);
    expect(r.staleExpectations).not.toContain("B3");
    // The reason travels with it, so the report can point at the debt it no longer suppresses.
    expect(r.inertExpectations[0]?.reason).toContain("docs/backlog/412");
  }, 60_000);

  test("a rule that now PASSES is stale, and stays out of the inert list", async () => {
    const p = join(HERE, "fixtures/conforming.ts");
    const h = await record({ path: p, argv0: ["bun", p] }, CHECKERS);
    const r = buildReport(
      h,
      runCheckers(h, CHECKERS),
      CHECKERS,
      { rules: {}, knownFailures: { A1: "tracked" } },
      "L0",
      VERSION,
    );
    expect(r.staleExpectations).toContain("A1");
    expect(r.inertExpectations.map((e) => e.ruleId)).not.toContain("A1");
  }, 60_000);
});

// The promise `types.ts` makes about `Finding.evidence` — "any finding can be traced to raw
// evidence" — used to be untrue: the ids shipped and nothing resolved them. These tests bind the
// promise, so it cannot quietly become false again.
describe("evidence ids resolve", () => {
  const realRun = async () => {
    const p = join(HERE, "fixtures/conforming.ts");
    const h = await record({ path: p, argv0: ["bun", p] }, CHECKERS);
    return buildReport(
      h,
      runCheckers(h, CHECKERS),
      CHECKERS,
      { rules: {}, knownFailures: {} },
      "L0",
      VERSION,
    );
  };

  test("every id a finding cites resolves to a published observation", async () => {
    const r = await realRun();
    const published = new Set(r.observations.map((o) => o.id));
    // Guard the guard: a run whose findings cite nothing would pass the assertion below
    // vacuously, which is exactly how this promise went unnoticed in the first place.
    const cited = r.findings.flatMap((f) => f.evidence);
    expect(cited.length).toBeGreaterThan(0);
    const dangling = [...new Set(cited)].filter((id) => !published.has(id));
    expect(dangling).toEqual([]);
  }, 60_000);

  test("a published observation carries the argv that produced it", async () => {
    const r = await realRun();
    // `--help` is requested by several checkers, so it is the safest invocation to pin without
    // asserting over the whole probe set.
    const help = r.observations.find((o) => o.args.includes("--help"));
    expect(help).toBeDefined();
    expect(help?.purposes.length).toBeGreaterThan(0);
    expect(typeof help?.exitCode === "number" || help?.exitCode === null).toBe(true);
    expect(help?.stdoutDigest).toMatch(/^[0-9a-f]{8,}$/);
  }, 60_000);

  test("the target's launcher reaches the report, not just its path", async () => {
    const r = await realRun();
    expect(r.targetArgv0[0]).toBe("bun");
    expect(r.targetArgv0.length).toBe(2);
  }, 60_000);

  test("repeated invocations are distinguishable — the repetition IS the subject for C3, D4, F2", async () => {
    const r = await realRun();
    const key = (o: (typeof r.observations)[number]) =>
      JSON.stringify([o.args, o.env ?? null, o.inertness, o.repeat ?? null]);
    const seen = new Map<string, number>();
    for (const o of r.observations) seen.set(key(o), (seen.get(key(o)) ?? 0) + 1);
    // Dropping `repeat` left 11 of 21 observations in indistinguishable groups, which defeats the
    // point of resolving an id at all for the three rules that compare repetitions.
    expect([...seen.values()].filter((n) => n > 1)).toEqual([]);
  }, 60_000);

  // Driven through `toReportedObservation` directly, because the condition these assert cannot be
  // produced by any probe that exists: no checker asks for `env: {}`, and copy-versus-alias is
  // byte-identical in every output. An earlier version of these tests asserted over a real run
  // and passed with the bugs present, which is no test at all.
  const observationOf = (over: Partial<Observation> = {}): Observation => ({
    id: "obs-1",
    invocation: { args: ["--help"], inertness: "help-path", purpose: "p" },
    purposes: ["p"],
    stdout: "out",
    stderr: "",
    stdoutBytes: 3,
    stderrBytes: 0,
    stdoutDigest: digestOfText("out"),
    stderrDigest: digestOfText(""),
    stdoutLossy: false,
    stderrLossy: false,
    truncated: false,
    exitCode: 0,
    signal: null,
    crashed: false,
    timedOut: false,
    spawnFailed: false,
    durationMs: 1,
    timeToFirstByteMs: 1,
    ...over,
  });

  test("an EMPTY env is omitted — the field means the probe imposed one", () => {
    const o = observationOf({
      invocation: { args: [], inertness: "bare", purpose: "p", env: {} },
    });
    expect(Object.hasOwn(toReportedObservation(o), "env")).toBe(false);
  });

  test("a non-empty env is published, and copied rather than aliased", () => {
    const env = { HOME: "/nonexistent" };
    const o = observationOf({
      invocation: { args: ["--version"], inertness: "help-path", purpose: "p", env },
    });
    const projected = toReportedObservation(o);
    expect(projected.env).toEqual(env);
    expect(projected.env).not.toBe(env);
  });

  test("purposes is copied, not aliased — mutating a report must not rewrite the recording", () => {
    const o = observationOf({ purposes: ["a", "b"] });
    const projected = toReportedObservation(o);
    expect(projected.purposes).toEqual(["a", "b"]);
    expect(projected.purposes).not.toBe(o.purposes);
    projected.purposes.push("c");
    expect(o.purposes).toEqual(["a", "b"]);
  });

  test("the projection copies rather than aliases the recording", async () => {
    const p = join(HERE, "fixtures/conforming.ts");
    const h = await record({ path: p, argv0: ["bun", p] }, CHECKERS);
    const r = buildReport(
      h,
      runCheckers(h, CHECKERS),
      CHECKERS,
      { rules: {}, knownFailures: {} },
      "L0",
      VERSION,
    );
    const first = r.observations[0];
    expect(first).toBeDefined();
    const source = h.observations.find((o) => o.id === first?.id);
    expect(source).toBeDefined();
    expect(first?.args).not.toBe(source?.invocation.args);
    expect(r.targetArgv0).not.toBe(h.target.argv0);
  }, 60_000);

  test("the streams themselves are NOT published — the digest is the byte-level record", async () => {
    const r = await realRun();
    const withOutput = r.observations.find((o) => o.stdoutBytes > 0);
    expect(withOutput).toBeDefined();
    // Adding `stdout`/`stderr` to the projection would double the artifact and hand an unbounded
    // binary field the redaction problem the digest exists to avoid.
    for (const o of r.observations) {
      expect(Object.hasOwn(o, "stdout")).toBe(false);
      expect(Object.hasOwn(o, "stderr")).toBe(false);
    }
  }, 60_000);
});
