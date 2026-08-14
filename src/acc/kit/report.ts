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
  /** Binary. Core rules pass or they do not — a percentage invites gaming the number rather
   *  than fixing the implementation (the Acid3 "Potemkin village" critique). */
  conformant: boolean;
  counts: {
    core: number;
    corePassed: number;
    coreFailures: number;
    diagnosticFailures: number;
    unverified: number;
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
      excused: f.verdict === "fail" && f.ruleId in expectations.knownFailures,
    };
  });

  const applicable = reported.filter((f) => f.applicable);
  const notApplicable = reported.filter((f) => !f.applicable);

  const core = applicable.filter((f) => f.tier === "core");
  const coreFailures = core.filter((f) => f.verdict === "fail" && !f.excused);
  // An unverified core rule is NOT a pass. Counting it as one is exactly the overclaim this
  // project exists to prevent. Only applicable findings count here — a rule out of scope at
  // this level is a different claim from "tried and could not establish it".
  const unverified = applicable.filter((f) => f.verdict === "unverified");
  const unverifiedCore = core.filter((f) => f.verdict === "unverified");

  return {
    target: h.target.path,
    level,
    conformant: coreFailures.length === 0 && unverifiedCore.length === 0,
    counts: {
      core: core.length,
      corePassed: core.filter((f) => f.verdict === "pass").length,
      coreFailures: coreFailures.length,
      diagnosticFailures: applicable.filter((f) => f.tier === "diagnostic" && f.verdict === "fail")
        .length,
      unverified: unverified.length,
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
