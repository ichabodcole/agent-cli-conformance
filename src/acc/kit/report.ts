import type { Expectations } from "./expectations.ts";
import type { Checker, Finding, History, ProbeLevel } from "./types.ts";

/** Numeric order for comparing probe levels — L0 < L1 < L2. */
const LEVEL_RANK: Record<ProbeLevel, number> = { L0: 0, L1: 1, L2: 2 };

export interface ReportedFinding extends Finding {
  tier: "core" | "diagnostic";
  /** Where to read about the rule. A failure that does not point at its explanation is a chore. */
  rulePath: string;
  /** True when this failure is listed in the project's expectations file. */
  excused: boolean;
  /** The rule's minimum probe level, carried through so a mislabelled level is visible on the
   *  finding itself rather than only inferable from `applicable`. */
  probeLevel: ProbeLevel;
  /**
   * False when `probeLevel` exceeds the level this report was run at. This is "out of scope
   * here", a different claim from `unverified`'s "tried and could not establish it" — conflating
   * them would make a report unable to say whether a rule was skipped or actually attempted.
   * Not-applicable findings are excluded from `conformant` and from `counts.core`.
   */
  applicable: boolean;
}

export interface Report {
  target: string;
  /** The probe level this report was built at. Determines which findings are `applicable`. */
  level: ProbeLevel;
  /**
   * NO APPLICABLE CORE RULE FAILED. Violations only — see
   * docs/wiki/concepts/conformance.md, which is the normative definition.
   *
   * Binary, not a percentage: core rules pass or they do not, and a score invites gaming the
   * number rather than fixing the implementation (the Acid3 "Potemkin village" critique).
   *
   * Deliberately NOT "everything was verified". An unverified core rule is a gap in the
   * EVIDENCE, not a defect in the target, and `git` is the case that settles the difference:
   * B3 reports `unverified` because git advertises no machine-mode flag, which is nothing git
   * did wrong — in the same report as two things it did (C2: an unknown flag exits 129 while
   * an unknown verb exits 1; D2: bare `git` writes its usage to stdout). Conflating the two
   * claims made all three lines look alike. `fullyVerified` carries that second claim.
   */
  conformant: boolean;
  /** `conformant` AND no applicable core rule is `unverified`. The stronger claim: every core
   *  rule was actually established, not merely left unfalsified. */
  fullyVerified: boolean;
  counts: {
    core: number;
    corePassed: number;
    coreFailures: number;
    diagnosticFailures: number;
    unverified: number;
    /** Unexcused applicable CORE findings that are `unverified` — the set that gates
     *  `fullyVerified`, as distinct from `unverified`, which counts every tier. */
    coreUnverified: number;
    /** Findings whose rule is out of scope at this run's level — see `ReportedFinding.applicable`. */
    notApplicable: number;
  };
  findings: ReportedFinding[];
  /** Rule ids excluded from this run because their `probeLevel` exceeds `level`. Surfaced by
   *  name, not just by count, so a rule mislabelled with too high a `probeLevel` is visible
   *  rather than silently missing from the conformance verdict. */
  notApplicable: string[];
  knownFailures: Array<{ ruleId: string; reason: string }>;
  /** Excused rules that now pass. The ratchet: remove these from the expectations file. */
  staleExpectations: string[];
}

/**
 * The one rule to point a caller at when a report is not fully verified.
 *
 * Filtered to `applicable`, unexcused CORE findings: with no filter, an early DIAGNOSTIC fail
 * (which never blocks conformance) could shadow the real, later CORE fail that does, pointing
 * the caller at a rule that isn't why the check is red. A `fail` outranks an `unverified`
 * regardless of position, because only a fail is a violation.
 *
 * Beyond that it is registry order — EXCEPT for a hang, which is the one failure mode with an
 * identifiable owner. A target that blocks on stdin fails A1, C1, D2 and E1 at once, and
 * registry order offers A1: a page about rejecting unknown flags, which explains none of the
 * four failures the caller is looking at. E1 is the rule that owns hangs (see finding.ts), and
 * its page is the one that explains all of them. Ownership beats position.
 */
export function primaryProblem(h: History, report: Report): ReportedFinding | undefined {
  const pick = (verdict: "fail" | "unverified", ruleId?: string) =>
    report.findings.find(
      (f) =>
        f.applicable &&
        f.tier === "core" &&
        !f.excused &&
        f.verdict === verdict &&
        (ruleId === undefined || f.ruleId === ruleId),
    );
  const hung = h.observations.some((o) => o.timedOut);
  return (hung ? pick("fail", "E1") : undefined) ?? pick("fail") ?? pick("unverified");
}

/** Phase two: pure functions over recorded history. Nothing here spawns a process. */
export function runCheckers(h: History, checkers: Checker[]): Finding[] {
  return checkers.map((c) => c.check(h));
}

export function buildReport(
  h: History,
  findings: Finding[],
  checkers: Checker[],
  expectations: Expectations,
  level: ProbeLevel,
): Report {
  const byId = new Map(checkers.map((c) => [c.ruleId, c]));

  const reported: ReportedFinding[] = findings.map((f) => {
    const c = byId.get(f.ruleId);
    // A checker not found in `checkers` (shouldn't happen outside tests) defaults to core/L0 —
    // the least forgiving assumption, so a wiring bug shows up as a conformance blocker rather
    // than silently vanishing.
    const probeLevel = c?.probeLevel ?? "L0";
    return {
      ...f,
      tier: c?.tier ?? "core",
      rulePath: c?.rulePath ?? "",
      probeLevel,
      applicable: LEVEL_RANK[probeLevel] <= LEVEL_RANK[level],
      // `unverified` is excusable too, not just `fail`. Excusing only failures left a project
      // blocked by an unverified core rule with no path to green: nothing it could change
      // would clear the rule, and the ratchet had no way to acknowledge that.
      excused:
        (f.verdict === "fail" || f.verdict === "unverified") &&
        f.ruleId in expectations.knownFailures,
    };
  });

  const applicable = reported.filter((f) => f.applicable);
  const notApplicable = reported.filter((f) => !f.applicable);

  const core = applicable.filter((f) => f.tier === "core");
  const coreFailures = core.filter((f) => f.verdict === "fail" && !f.excused);
  // An unverified core rule is NOT a pass — counting it as one is exactly the overclaim this
  // project exists to prevent. It is not a VIOLATION either, which is what the split below is
  // for. Only applicable findings count: a rule out of scope at this level is a different
  // claim again from "tried and could not establish it".
  const unverified = applicable.filter((f) => f.verdict === "unverified");
  const unverifiedCore = core.filter((f) => f.verdict === "unverified" && !f.excused);

  const conformant = coreFailures.length === 0;

  return {
    target: h.target.path,
    level,
    conformant,
    fullyVerified: conformant && unverifiedCore.length === 0,
    counts: {
      core: core.length,
      corePassed: core.filter((f) => f.verdict === "pass").length,
      coreFailures: coreFailures.length,
      diagnosticFailures: applicable.filter((f) => f.tier === "diagnostic" && f.verdict === "fail")
        .length,
      unverified: unverified.length,
      coreUnverified: unverifiedCore.length,
      notApplicable: notApplicable.length,
    },
    findings: reported,
    notApplicable: notApplicable.map((f) => f.ruleId),
    knownFailures: Object.entries(expectations.knownFailures).map(([ruleId, reason]) => ({
      ruleId,
      reason,
    })),
    staleExpectations: Object.keys(expectations.knownFailures).filter(
      (id) => applicable.find((f) => f.ruleId === id)?.verdict === "pass",
    ),
  };
}
