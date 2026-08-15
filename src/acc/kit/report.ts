import type { Expectations } from "./expectations.ts";
import type { Checker, Coverage, Finding, History, ProbeLevel } from "./types.ts";

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
   * How much of the rule the checker that produced this finding actually establishes — carried
   * onto the finding so a `pass` can never be read without the scope it was made in. A
   * `partial` pass means "nothing this checker looked at was violated", which is a strictly
   * weaker sentence than the one a reader hears when they see PASS.
   */
  coverage: Coverage;
  /** The assertions `coverage: "partial"` is referring to. Empty when coverage is complete. */
  coverageGaps: string[];
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
  /**
   * EVERY APPLICABLE CORE RULE WAS ACTUALLY ESTABLISHED, at this run's probe level. Three
   * conditions, all required:
   *
   * 1. `conformant` — nothing core was violated;
   * 2. every applicable core finding has verdict `pass` — INCLUDING excused ones. An excuse is
   *    an organisation deciding it can live with a defect; it is not evidence. Filtering
   *    `!excused` here let an expectations entry delete an unverified core rule from the
   *    EVIDENCE claim as well as from the conformance gate, so a project could write itself a
   *    note and receive "fully verified" over a rule nothing had established (review R3-4);
   * 3. every applicable core checker declares `coverage: "complete"`. A checker whose own pass
   *    detail says "internal-fault contrast unverified at L0" is reporting a gap, and counting
   *    that as a full pass is how `fullyVerified` came to speak over acknowledged holes
   *    (review R1-4).
   *
   * Bounded by `level`, and only meaningful alongside it: "fully verified at L0" is a claim
   * about the rules L0 can reach, not about the catalogue. A4 is core and excluded here because
   * it is not applicable below L1 — see `ReportedFinding.applicable`.
   */
  fullyVerified: boolean;
  counts: {
    core: number;
    corePassed: number;
    coreFailures: number;
    diagnosticFailures: number;
    unverified: number;
    /**
     * Applicable CORE findings that are `unverified`, EXCUSED ONES INCLUDED — the evidence
     * gap, as distinct from `unverified`, which counts every tier. Excuses are deliberately not
     * subtracted: this number answers "what was left unestablished", and an expectations entry
     * changes who is accountable for a gap, never whether the gap exists. `coreFailures` is the
     * count that excuses do reduce, because that one gates conformance.
     */
    coreUnverified: number;
    /** Applicable core findings that PASSED but whose checker declares `coverage: "partial"` —
     *  passes that are narrower than the rule they are filed under. Counted separately from
     *  `corePassed` rather than deducted from it: the probe did run and did not find a
     *  violation, which is a real result; it is only the SCOPE that is smaller than the page. */
    corePartial: number;
    /** Findings whose rule is out of scope at this run's level — see `ReportedFinding.applicable`. */
    notApplicable: number;
  };
  /**
   * Why `fullyVerified` is false, per rule, in terms a reader can act on. One entry for every
   * applicable core rule that blocks the claim, carrying the checker's declared `coverageGaps`
   * and — for a rule that did not pass — the verdict and detail that stopped it.
   *
   * Empty exactly when `fullyVerified` is true. A bare `false` would be the same
   * information-free verdict this project criticises a CLI for emitting: the caller learns that
   * something is missing and nothing about what.
   */
  evidenceGaps: Array<{ ruleId: string; gaps: string[] }>;
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
 * Beyond that it is registry order — EXCEPT for the two failure modes with an identifiable
 * owner. A target that blocks on stdin fails A1, C1, D2 and E1 at once, and registry order
 * offers A1: a page about rejecting unknown flags, which explains none of the four failures the
 * caller is looking at. E1 is the rule that owns hangs (see finding.ts), and its page is the one
 * that explains all of them. Ownership beats position.
 *
 * A CRASH has the identical shape and now has an owner too. The partial crasher — help and
 * version answered correctly, every other path a segfault — fails C1 and G1 while every other
 * rule reports `unverified`, and registry order sent that caller to A1 as well: a rule the
 * target never got far enough to break. G1 is the page that explains why eleven other rules
 * came back with nothing.
 *
 * WHEN A RUN CONTAINS BOTH, the hang wins, and the argument is reach rather than severity. A
 * hang makes four rules FAIL, so E1's page explains four of the lines on screen; a crash makes
 * exactly one other rule fail (C1) and turns the rest into gaps, so G1's page explains one
 * failure and a column of `unverified`. Offering G1 first would leave the four hang-driven
 * failures pointing at nothing, while offering E1 first leaves G1 one line further down a report
 * that already names it. Neither is hypothetical enough to have been measured; the tie is broken
 * on which page accounts for more of what the caller is looking at, which is the same principle
 * that put ownership ahead of position in the first place.
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
  const crashed = h.observations.some((o) => o.crashed);
  return (
    (hung ? pick("fail", "E1") : undefined) ??
    (crashed ? pick("fail", "G1") : undefined) ??
    pick("fail") ??
    pick("unverified")
  );
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
    // than silently vanishing. `coverage` follows the same discipline for the same reason: an
    // unknown checker is assumed `partial`, because the alternative is a missing registration
    // silently upgrading a rule to "fully established".
    const probeLevel = c?.probeLevel ?? "L0";
    return {
      ...f,
      tier: c?.tier ?? "core",
      rulePath: c?.rulePath ?? "",
      probeLevel,
      coverage: c?.coverage ?? "partial",
      coverageGaps: c?.coverageGaps ?? ["no checker was found for this rule id"],
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
  // NOT filtered on `!excused` — see counts.coreUnverified. An excuse suppresses the
  // conformance gate above; it must not also delete the gap from the evidence count, or a
  // project can make an unestablished core rule disappear by writing itself a note about it.
  const unverifiedCore = core.filter((f) => f.verdict === "unverified");

  const conformant = coreFailures.length === 0;

  // The two things that block full verification, kept as predicates rather than as a count of
  // `evidenceGaps` rows: the boolean must not be able to come out true because a `partial`
  // checker happened to list no gaps.
  const coreNotPassed = core.filter((f) => f.verdict !== "pass");
  const coreIncomplete = core.filter((f) => f.coverage === "partial");

  // ...and the same two predicates, rendered as the reason. A rule can appear for either or
  // both: a non-pass verdict contributes what the checker said it could not establish, partial
  // coverage contributes the clauses it never looks at. Built here, from the same filters, so
  // the boolean and its explanation cannot drift apart.
  const evidenceGaps = core
    .filter((f) => f.verdict !== "pass" || f.coverage === "partial")
    .map((f) => ({
      ruleId: f.ruleId,
      gaps: [
        ...(f.verdict === "pass" ? [] : [`${f.verdict}: ${f.detail}`]),
        ...(f.coverage === "partial" ? f.coverageGaps : []),
      ],
    }));

  return {
    target: h.target.path,
    level,
    conformant,
    fullyVerified: conformant && coreNotPassed.length === 0 && coreIncomplete.length === 0,
    counts: {
      core: core.length,
      corePassed: core.filter((f) => f.verdict === "pass").length,
      coreFailures: coreFailures.length,
      diagnosticFailures: applicable.filter((f) => f.tier === "diagnostic" && f.verdict === "fail")
        .length,
      unverified: unverified.length,
      coreUnverified: unverifiedCore.length,
      corePartial: core.filter((f) => f.verdict === "pass" && f.coverage === "partial").length,
      notApplicable: notApplicable.length,
    },
    evidenceGaps,
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
