import type { AccConfig, ConfigSource } from "./config.ts";
import {
  type Declaration,
  type DeclarationDiff,
  diffDeclaration,
  type PathSurface,
} from "./declaration.ts";
import { captureIdentity, type TargetIdentity } from "./identity.ts";
import {
  type RecordedReading,
  type RecordedSurfacesReport,
  recordedPathSummary,
} from "./recorded.ts";
import { captureSurface, type Surface } from "./surface.ts";
import type {
  Checker,
  Coverage,
  Finding,
  History,
  Invocation,
  Observation,
  ProbeLevel,
  UncheckedRule,
  Verdict,
} from "./types.ts";

/** Numeric order for comparing probe levels — L0 < L1 < L2. */
const LEVEL_RANK: Record<ProbeLevel, number> = { L0: 0, L1: 1, L2: 2 };

export interface ReportedFinding extends Finding {
  /**
   * The tier this rule binds at FOR THIS TARGET: the catalogue's, unless `acc.config.json` moved
   * it. A project may lower a rule to `diagnostic` or RAISE one to `core`, and the report has to
   * speak in the tier that actually gates, or the counts and the verdict disagree with the file
   * the project wrote. `Report.severityOverrides` names every rule this is not the baseline for.
   *
   * A WAIVED rule keeps the tier it would have bound at, because `off` is not a tier — see
   * `waived`, which is what excludes it.
   */
  tier: "core" | "diagnostic";
  /**
   * `defect` | `design-choice`, carried through from the checker.
   *
   * Published because it decides what a WAIVER costs: waiving a `design-choice` keeps
   * `fullyVerified`, waiving a `defect` does not. A consumer looking at a waived rule and asking
   * why the evidence claim did or did not survive needs this in the same document.
   */
  deviation: "defect" | "design-choice";
  /** Where to read about the rule. A failure that does not point at its explanation is a chore. */
  rulePath: string;
  /** True when this failure is listed under `knownFailures` in the project's config. */
  excused: boolean;
  /**
   * True when the project declared `severity: "off"` for this rule — "does not apply to my tool,
   * by design". A DECLARATION, not a debt, and the two are kept apart everywhere: `excused` is a
   * project saying it will fix something, `waived` is a project saying there is nothing here to
   * fix. A waiver is excluded from the counts and from `conformant`, and never goes stale.
   *
   * The checker still RAN. Probes are shared across checkers, so running a waived rule costs
   * nothing extra, and the result is strictly more informative than skipping it: the verdict
   * beside the waiver says what would have happened. A waiver that would now pass is one you can
   * delete; a waiver still doing work is one worth keeping. That is deliberately better than the
   * ESLint model this borrows from, where a disabled rule produces no information at all.
   */
  waived: boolean;
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
   * False when `probeLevel` exceeds the level this report was run at, and false for a rule no
   * checker answers to at any level. This is "out of scope here", a different claim from
   * `unverified`'s "tried and could not establish it" — conflating them would make a report
   * unable to say whether a rule was skipped or actually attempted. Not-applicable findings are
   * excluded from `conformant` and from `counts.core`.
   */
  applicable: boolean;
}

/**
 * One observation, as the report publishes it — what the kit RAN, not what it read back.
 *
 * `Finding.evidence` has always carried observation ids, and `types.ts` has always documented them
 * as the way "any finding can be traced to raw evidence". Nothing resolved them: the ids shipped
 * and the observations did not, so the report cited proof it could not produce. An outside adopter
 * reported it as the single highest-value fix on their list, having spent an hour reconstructing a
 * probe by hand that a resolvable id would have handed them.
 *
 * **The streams are deliberately absent.** `stdoutDigest` and `stderrDigest` are the whole
 * byte-level record here, for the reason the durable-artifact work already settled: retaining the
 * bytes as well doubles the artifact for an equality question a 32-byte hash already answers, and
 * hands an unbounded binary field the redaction and retention problems that come with it. What a
 * reader needs to reconstruct a verdict is the ARGV, and that carries nothing the target did not
 * already receive from us.
 *
 * **`purposes` is the exception, and it is deliberate.** A7 builds its purpose string from the
 * value set it read out of the target's own `--help`, so this field can contain target-derived
 * text. That is the point — a purpose that named no specifics would not tell a reader why the
 * probe was sent — but it means the projection is not strictly "only what we sent".
 *
 * **`args` is not bounded independently.** Several checkers build a probe from a flag discovered
 * in the target's own `--help`, and that scan has no length limit of its own — so a pathological
 * help screen produces a pathological argv, bounded only by `MAX_STREAM_BYTES` in `runner.ts`.
 * The bytes are the target's own and F1 requires help to hold no secrets, so this is a size
 * question rather than a disclosure one; it is written down because "argv is small" is an
 * assumption a reader would otherwise make.
 */
export interface ReportedObservation {
  /** Matches the ids in `ReportedFinding.evidence`. */
  id: string;
  /** The argv this probe sent, after `target.argv0`. The answer to "what did you actually run?" */
  args: string[];
  /** Environment overrides the probe imposed, when it imposed any. */
  env?: Record<string, string>;
  inertness: Invocation["inertness"];
  /** Every checker that asked for this invocation — one observation can back several rules. */
  purposes: string[];
  /**
   * Which repetition this was, when the probe asked for several.
   *
   * Without it, the repeated invocations C3, D4 and F2 exist to compare project identically —
   * four rows with the same argv and no way to say which run each verdict read. For those three
   * rules the repetition IS the subject, so an evidence id that cannot name it does not answer
   * the question the id was published to answer.
   */
  repeat?: number;
  exitCode: number | null;
  signal: string | null;
  crashed: boolean;
  timedOut: boolean;
  spawnFailed: boolean;
  durationMs: number;
  timeToFirstByteMs: number | null;
  stdoutBytes: number;
  stderrBytes: number;
  stdoutDigest: string;
  stderrDigest: string;
  /** The decode threw information away, so a digest is the only faithful record of that stream. */
  stdoutLossy: boolean;
  stderrLossy: boolean;
  truncated: boolean;
}

export interface Report {
  target: string;
  /**
   * How the target was actually launched, including any interpreter the kit resolved from its
   * shebang. `target` alone is the least informative thing available about what was measured: a
   * path says nothing about whether a `.ts` file ran under Bun or as itself, and that distinction
   * decides several verdicts.
   */
  targetArgv0: string[];
  /**
   * WHAT THE TARGET SAID ABOUT ITSELF, quoted from the `--version` probe `D1` already runs.
   *
   * The companion to `targetArgv0`, and the two are different kinds of fact. `targetArgv0` is OUR
   * bookkeeping — the argv the kit assembled, including any interpreter it resolved. This is the
   * TOOL'S OWN WORDS, read back off its own stdout. Both belong, because the case that forced this
   * field is exactly where they diverge: two builds of anthill, same declared `2.3.0`, two argv0s,
   * two behaviours (`docs/reports/2026-08-24-first-drift-trial-anthill-manifest.md` § `DT-10`).
   * Until this existed, `Report.kitVersion` was the only version coordinate a stored report
   * carried, and it is ours.
   *
   * EVIDENCE, exactly as `surface` is: no rule reads it, no count moves on it, and it touches
   * neither `conformant` nor `fullyVerified`. Read `status` before `said`, and read `identity.ts`
   * before quoting it anywhere — a present identity establishes that a binary answering this way
   * existed at capture time, and nothing further. It is NOT a verification that the target
   * reported a version, and its absence is NOT `D1`'s verdict.
   */
  targetIdentity: TargetIdentity;
  /**
   * The version of the kit that produced this report.
   *
   * Here because a stale kit is otherwise invisible. The documented install can put an older
   * commit on disk and report success — bun prints a SHA it did not install, and the extracted
   * package cache goes stale independently of the bare clone — and the only place that showed was
   * `acc --version`, which nobody thinks to check. The first outside adopter did not detect it;
   * they happened to be holding a second version to compare against because they had cloned the
   * repo to read the README before installing. Putting it in every report makes the comparison
   * available to someone who has not accidentally armed themselves.
   *
   * It is also the first version coordinate a stored report carries, which roadmap step 2 wants
   * five more of. This one is not that design — it is the cheapest half of it, and the half whose
   * absence was measured.
   */
  kitVersion: string;
  /**
   * WHICH `acc.config.json` WAS LOADED, AND WHERE FROM — including when none was.
   *
   * The config decides waivers, severities and `defaultOutput`, so it can move the verdict; and
   * one of the three ways it arrives is invisible in the command that produced the report. An
   * adopter ran the identical command against the identical absolute path from two directories
   * and got two verdicts, with nothing on either screen to explain the difference — they only
   * worked it out because residue from an earlier run happened to be on disk. This field is that
   * explanation, published rather than left to be reconstructed. See `ConfigSource`.
   */
  configSource: ConfigSource;
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
   *
   * FRAME-RELATIVE, and increasingly so. This boolean is a claim within a declared frame — spec
   * version, probe level, and now the adopter's own waivers, the one coordinate the adopter
   * authors themselves. `waivers` and `severityOverrides` below are how that frame is published
   * rather than assumed, so a consumer can apply its own policy instead of trusting the
   * producer's.
   */
  conformant: boolean;
  /**
   * EVERY APPLICABLE CORE RULE WAS ACTUALLY ESTABLISHED, at this run's probe level. Four
   * conditions, all required:
   *
   * 0. NO APPLICABLE CORE RULE CLASSIFIED `defect` WAS WAIVED. A `defect` waiver is what the
   *    config frame must not be able to buy, and the rule is the mirror of condition 2 below: an
   *    excuse suppresses the conformance GATE but never the evidence CLAIM (review R3-4), and a
   *    project that waived a real failure was not measured against it — "does not apply to my
   *    tool" is a claim about the tool's design, not evidence about its behaviour. Precisely
   *    BECAUSE `conformant` is frame-relative, one boolean has to be measured against the whole
   *    catalogue, or the frame swallows the verdict entirely. A waived `design-choice` is the
   *    deliberate exception: waiving one is the nearest thing L0 has to the target declaring its
   *    own design, and a design the target declares and the kit accepts is verification, not a
   *    hole in it;
   * 1. `conformant` — nothing core was violated;
   * 2. every applicable core finding has verdict `pass` — INCLUDING excused ones. An excuse is
   *    an organisation deciding it can live with a defect; it is not evidence. Filtering
   *    `!excused` here let a `knownFailures` entry delete an unverified core rule from the
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
     * subtracted: this number answers "what was left unestablished", and a `knownFailures` entry
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
    /**
     * Applicable findings the project WAIVED, and therefore the size of the hole every other
     * count in this block is computed around. Every one of these rules was still probed; none of
     * them is in `core`, `corePassed`, `coreFailures`, `coreUnverified`, `corePartial` or
     * `diagnosticFailures`. A headline that omitted this number would read as a clean sheet over
     * a frame the reader could not see.
     */
    waived: number;
  };
  /**
   * Why `fullyVerified` is false, per rule, in terms a reader can act on. One entry for every
   * applicable core rule that blocks the claim, carrying the checker's declared `coverageGaps`
   * and — for a rule that did not pass — the verdict and detail that stopped it.
   *
   * A waived core rule classified `defect` appears here too, because it blocks the claim: the gap
   * it names is the waiver itself, beside the verdict the probe reached anyway. That is a
   * statement of what the evidence does not cover, not a request to go and fix the rule. A waived
   * `design-choice` does NOT appear: it costs the evidence claim nothing, because the target
   * declaring its own design is something the kit accepts rather than a hole in what was
   * established.
   *
   * Empty exactly when `fullyVerified` is true. A bare `false` would be the same
   * information-free verdict this project criticises a CLI for emitting: the caller learns that
   * something is missing and nothing about what.
   */
  evidenceGaps: Array<{ ruleId: string; gaps: string[] }>;
  findings: ReportedFinding[];
  /**
   * Every observation any finding cites, resolvable by the ids in `ReportedFinding.evidence`.
   *
   * Observations no finding cites are included too: a probe that ran and backed nothing is itself
   * information about the run, and omitting them would make the list look like the whole record
   * when it was a filtered one.
   */
  observations: ReportedObservation[];
  /**
   * Rule ids excluded from this run: their `probeLevel` exceeds `level`, or no checker exists
   * for them at all (see `UncheckedRule`). Surfaced by name, not just by count, so a rule
   * mislabelled with too high a `probeLevel` — or one the kit has never been able to check — is
   * visible rather than silently missing from the conformance verdict.
   *
   * The two reasons are told apart on the finding, not here: an unchecked rule's `detail` says
   * so in words, and its `coverageGaps` say so again. A reader scanning the ids is asking which
   * rules this run did not judge, and that answer is the same for both.
   */
  notApplicable: string[];
  /**
   * WHAT THE TARGET SAID ITS OWN ACCEPTED FLAGS ARE — evidence, and the only field in this report
   * that no rule reads and no verdict depends on.
   *
   * It rides on the report rather than behind its own command because the probes it reads already
   * ran (see `surface.ts`), and because `toReportedObservation` drops the streams: an enumeration
   * not extracted before that projection is unrecoverable from the stored artifact. Published here
   * it reaches `acc compare` at no cost.
   *
   * Read `status` before `flags`. A target that did not enumerate has no `flags` field at all,
   * deliberately — see `SurfaceStatus`.
   */
  surface: Surface;
  /**
   * WHERE THE TARGET'S DECLARATION AND THE TARGET DISAGREE — present only when the caller
   * supplied one, absent otherwise.
   *
   * The other half of `surface`: that field is what the tool said it accepts, this is what a
   * document said it accepts, and the difference is the check `STANDARD.md` Part 1 says to build
   * before anything else on the page. Like `surface` it is EVIDENCE — no rule reads it, and it
   * touches neither `conformant` nor `fullyVerified`, because the kit cannot tell which side of a
   * disagreement is wrong. See `declaration.ts`.
   *
   * Read `status` before `findings`. An empty finding list on a target that never enumerated
   * means the diff did not happen, not that everything agreed.
   */
  declaration?: DeclarationDiff;
  /**
   * THE BATCH OF SURFACES THE CALLER RECORDED — present only when they supplied one.
   *
   * Evidence, exactly as `surface` and `declaration` are: no rule reads it, it moves no count, and
   * a fabricated batch buys a sentence rather than a pass. What it changes is the SCOPE of the
   * census — paths below the root the kit cannot probe — and what it therefore owes is the label
   * saying who observed each of them, which lives on `declaration.paths[].surfaceProvenance`.
   */
  recordedSurfaces?: RecordedSurfacesReport;
  knownFailures: Array<{ ruleId: string; reason: string }>;
  /** Excused rules that now pass. The ratchet: remove these from `knownFailures`. */
  staleExpectations: string[];
  /**
   * Excused rules the run did not EVALUATE — not applicable at this level, or `unverified`.
   *
   * Deliberately NOT folded into `staleExpectations`, because the two facts demand opposite
   * actions and one message would teach a reader to take the wrong one:
   *
   * - **stale** — the rule now PASSES. You fixed it. Delete the line.
   * - **inert** — the kit stopped LOOKING. The debt may be entirely intact. Do not delete the
   *   line; go and find out.
   *
   * Reported by the adopter this happened to. They had filed a `knownFailures` entry as genuine
   * tracked debt, and a rule moving to `L1` in this release turned an entry like it into one that
   * suppresses nothing, never expires, and says nothing — leaving them believing a real defect was
   * tracked and gate-suppressed when it was neither. Config hygiene rather than a property of the
   * target, so like `staleExpectations` it gates nothing.
   */
  inertExpectations: Array<{ ruleId: string; reason: string }>;
  /**
   * Every rule the project declared `severity: "off"` for — the frame `conformant` was reached
   * inside, published in full so a consumer can apply its own policy rather than trusting the
   * producer's. Four fields, and each is load-bearing:
   *
   * - `reason` is the only thing standing between a considered design decision and "this rule
   *   was annoying". It is required by the loader for exactly that reason, and a consumer that
   *   disagrees with a reason can reject the report on it;
   * - `verdict` is what the checker returned ANYWAY, because a waived rule still runs. A waiver
   *   sitting at `pass` is one the project can delete; one sitting at `fail` is still doing work;
   * - `tier` is the tier the rule would have bound at, which is what says whether this waiver
   *   blocked `fullyVerified`;
   * - `applicable` distinguishes a waiver of a rule that was in scope from one of a rule this
   *   level never reaches — the same distinction the findings keep, for the same reason.
   *
   * NOT a stale-expectation mechanism, and deliberately not folded into one. A waiver never goes
   * stale, because passing was never its goal; `verdict` is offered as information and nothing
   * in the report asks for it back.
   */
  waivers: Array<{
    ruleId: string;
    reason: string;
    verdict: Verdict;
    tier: "core" | "diagnostic";
    /**
     * What this waiver COST, which is the question a reader of the waiver list is actually
     * asking. A `defect` waiver also blocked `fullyVerified` and put the rule in `evidenceGaps`;
     * a `design-choice` waiver did neither. Without it the list shows two entries that look
     * identical and are not.
     */
    deviation: "defect" | "design-choice";
    applicable: boolean;
  }>;
  /**
   * Rules the project MOVED between tiers, in either direction. The other half of the frame:
   * `from` is what the catalogue declares and `to` is what actually gated this run, so a raise —
   * a project holding itself to a rule the catalogue only reports — is as visible as a lowering.
   */
  severityOverrides: Array<{
    ruleId: string;
    from: "core" | "diagnostic";
    to: "core" | "diagnostic";
    reason: string;
  }>;
}

/**
 * The one rule to point a caller at when a report is not fully verified.
 *
 * Filtered to `applicable`, unexcused, UNWAIVED core findings: with no filter, an early DIAGNOSTIC fail
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
 *
 * OWNERSHIP SURVIVES THE VERDICT, which is the last clause and the one the signal split forced.
 * Once G1 and C1 stopped failing on signals they cannot attribute, a target an outer deadline
 * killed produces a report with NO core failure at all — and `pick("unverified")` sent that
 * caller back to A1 by registry order, the exact page the two clauses above exist to get away
 * from. G1 still owns the event; it is now reporting a gap rather than a violation, and its page
 * is still the only one that explains why every other line came back with nothing. A real
 * violation elsewhere is offered ahead of it, because a violation outranks a gap.
 *
 * A WAIVED rule is never offered, for the same reason an excused one is not: this field answers
 * "what should I read next", and a project that declared a rule inapplicable is not looking for
 * its page. The waiver is still printed, with its reason and the verdict it reached — the
 * difference is that nothing points the reader at it as work.
 */
export function primaryProblem(h: History, report: Report): ReportedFinding | undefined {
  const pick = (verdict: "fail" | "unverified", ruleId?: string) =>
    report.findings.find(
      (f) =>
        f.applicable &&
        !f.waived &&
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
    (crashed ? pick("unverified", "G1") : undefined) ??
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
  config: AccConfig,
  level: ProbeLevel,
  /**
   * Passed in rather than imported, so `kit/` stays free of the CLI wrapped around it. `level`
   * and `config` arrive the same way and for the same reason.
   */
  kitVersion: string,
  /**
   * Rules the catalogue declares and no checker answers to. Optional, and empty by default, for
   * the reason `level` is a parameter: a caller checking a partial corpus — a test, a consumer
   * running three checkers of its own — has no unchecked rules to report, and would otherwise
   * have to pass a list saying so.
   */
  uncheckedRules: readonly UncheckedRule[] = [],
  /**
   * The declaration to diff against, when the caller named one. Optional for the same reason
   * `uncheckedRules` is: a run without one is the normal case and produces a full report, with
   * `Report.declaration` absent rather than an empty diff claiming a comparison happened.
   */
  declaration?: Declaration | null,
  /**
   * Surfaces the caller recorded and handed in, already parsed and read. Optional for the reason
   * `declaration` is: a run without a batch is the normal case, and the report says so by having
   * no `recordedSurfaces` field rather than by carrying an empty one.
   */
  recorded?: { source: string; reading: RecordedReading } | null,
): Report {
  const byId = new Map<string, Checker | UncheckedRule>(checkers.map((c) => [c.ruleId, c]));
  // A REAL CHECKER WINS over a declaration for the same id. The declaration is the kit's copy of
  // the rule pages and can go stale by one commit — the commit that lands the checker — and a
  // stale entry must not turn a live verdict into "nothing looked at this".
  const unchecked = new Set(uncheckedRules.map((u) => u.ruleId).filter((id) => !byId.has(id)));
  // A rule with no checker produces no finding, so one is synthesised here — the alternative is
  // the rule disappearing from the report altogether, which is what used to happen. `unverified`
  // rather than a fourth verdict: the three-verdict vocabulary is a contract stored reports
  // carry, and `applicable: false` below is what separates "nothing looked" from "looked and
  // could not tell". A reader sees `N/A` with the reason on the same line.
  for (const u of uncheckedRules) if (!byId.has(u.ruleId)) byId.set(u.ruleId, u);
  const synthesised: Finding[] = uncheckedRules
    .filter((u) => unchecked.has(u.ruleId) && !findings.some((f) => f.ruleId === u.ruleId))
    .map((u) => ({
      ruleId: u.ruleId,
      verdict: "unverified" as const,
      // Stated in terms of the KIT rather than of this rule, because the sentence has to be
      // true of the next rule to arrive here as well as of the one that prompted it.
      detail: "no checker exists for this rule yet, so this run establishes nothing about it",
      evidence: [],
    }));
  // Merged in rule-id order rather than appended, so the findings list reads as one sequence.
  // Insertion rather than a sort of the whole list: `findings` arrives in the caller's order and
  // a sort would silently rewrite it.
  const merged = [...findings];
  for (const f of synthesised) {
    const at = merged.findIndex((existing) => existing.ruleId > f.ruleId);
    merged.splice(at === -1 ? merged.length : at, 0, f);
  }

  const reported: ReportedFinding[] = merged.map((f) => {
    const c = byId.get(f.ruleId);
    // A checker not found in `checkers` (shouldn't happen outside tests) defaults to core/L0 —
    // the least forgiving assumption, so a wiring bug shows up as a conformance blocker rather
    // than silently vanishing. `coverage` follows the same discipline for the same reason: an
    // unknown checker is assumed `partial`, because the alternative is a missing registration
    // silently upgrading a rule to "fully established".
    const probeLevel = c?.probeLevel ?? "L0";
    const declaredTier = c?.tier ?? "core";
    // `defect` is the unforgiving default, for the same reason `core` is: an unregistered checker
    // must not hand a waiver the cheaper treatment by accident.
    const deviation = c?.deviation ?? "defect";
    // NOTE that nothing here decides whether to RUN a checker: every checker in the registry has
    // already run by the time `findings` reaches this function, waived rules included. That is
    // deliberate and it is free — probes are shared across checkers, so a waived rule costs no
    // extra process — and the result is strictly more informative than the ESLint model it
    // borrows from: the report can say what the verdict WOULD have been. What a waiver changes
    // is the accounting below, never the measurement.
    const declaration = config.rules[f.ruleId];
    const waived = declaration?.severity === "off";
    return {
      ...f,
      evidence: [...f.evidence],
      // `off` is not a tier, so a waived rule keeps the one it would have bound at — which is
      // exactly what `fullyVerified` needs to know about it below.
      tier: declaration && declaration.severity !== "off" ? declaration.severity : declaredTier,
      deviation,
      rulePath: c?.rulePath ?? "",
      probeLevel,
      // An unchecked rule has no coverage of its own to declare, so it takes the unforgiving
      // default with everything else that is unknown here.
      coverage: (c && "coverage" in c ? c.coverage : undefined) ?? "partial",
      // COPIED, not aliased. `c` is an entry in the module-level `CHECKERS` registry, which
      // lives for the whole process — a consumer mutating a finding would otherwise rewrite the
      // checker definition every later run reads.
      coverageGaps: [
        ...(c && "coverageGaps" in c
          ? c.coverageGaps
          : ["no checker exists for this rule so nothing about it is established"]),
      ],
      // A rule with no checker is out of scope at EVERY level, not just below its declared one:
      // there is nothing that would run at `L1` either until the checker is written. Deciding it
      // on `probeLevel` alone would put the rule back in scope the day `L1` ships and report it
      // `unverified` — "we looked and could not tell" — over a probe that does not exist.
      applicable: !unchecked.has(f.ruleId) && LEVEL_RANK[probeLevel] <= LEVEL_RANK[level],
      // `unverified` is excusable too, not just `fail`. Excusing only failures left a project
      // blocked by an unverified core rule with no path to green: nothing it could change
      // would clear the rule, and the ratchet had no way to acknowledge that.
      //
      // Never both `waived` and `excused`. `loadConfig` rejects that combination outright, so
      // this guard only matters to a caller assembling an `AccConfig` by hand — but the two
      // flags mean opposite things, and a finding carrying both would make the report say a
      // project has debt on a rule it declared it does not have.
      excused:
        !waived &&
        (f.verdict === "fail" || f.verdict === "unverified") &&
        f.ruleId in config.knownFailures,
      waived,
    };
  });

  const applicable = reported.filter((f) => f.applicable);
  const notApplicable = reported.filter((f) => !f.applicable);

  // BINDING = applicable and not waived. Every count and both booleans are computed over this,
  // and the waived rules are reported separately rather than folded in: a waiver excludes a rule
  // from the gate, so counting it would make the numbers describe a frame nobody declared.
  const binding = applicable.filter((f) => !f.waived);
  const waived = applicable.filter((f) => f.waived);

  const core = binding.filter((f) => f.tier === "core");
  const coreFailures = core.filter((f) => f.verdict === "fail" && !f.excused);
  // An unverified core rule is NOT a pass — counting it as one is exactly the overclaim this
  // project exists to prevent. It is not a VIOLATION either, which is what the split below is
  // for. Only applicable findings count: a rule out of scope at this level is a different
  // claim again from "tried and could not establish it".
  const unverified = binding.filter((f) => f.verdict === "unverified");
  // NOT filtered on `!excused` — see counts.coreUnverified. An excuse suppresses the
  // conformance gate above; it must not also delete the gap from the evidence count, or a
  // project can make an unestablished core rule disappear by writing itself a note about it.
  const unverifiedCore = core.filter((f) => f.verdict === "unverified");

  const conformant = coreFailures.length === 0;

  // The three things that block full verification, kept as predicates rather than as a count of
  // `evidenceGaps` rows: the boolean must not be able to come out true because a `partial`
  // checker happened to list no gaps.
  const coreNotPassed = core.filter((f) => f.verdict !== "pass");
  const coreIncomplete = core.filter((f) => f.coverage === "partial");
  // A waived rule that WOULD have been core. Excluded from `core` above, and so from every
  // predicate built on it — which is why the evidence claim has to name it separately or the
  // config could buy `fullyVerified` outright. See the `fullyVerified` doc comment.
  // A waived `design-choice` does NOT block `fullyVerified`. Waiving one is the nearest thing
  // `L0` has to the target declaring its own design — "a bare invocation returns my manifest" —
  // and a claim the target makes and the kit accepts is verification, not a hole in it. Waiving a
  // `defect` still blocks: there the project chose not to be measured against a real failure, and
  // an evidence claim that stayed true through that would be worthless. The distinction is only
  // expressible because the catalogue classifies every rule; before that, both looked the same.
  const waivedCore = waived.filter((f) => f.tier === "core" && f.deviation === "defect");

  // ...and the same predicates, rendered as the reason. A rule can appear for more than one: a
  // non-pass verdict contributes what the checker said it could not establish, partial coverage
  // contributes the clauses it never looks at, a waiver contributes itself. Built here, from the
  // same filters, so the boolean and its explanation cannot drift apart — and iterated over
  // `applicable` so the rows stay in registry order whichever reason put them there.
  const evidenceGaps = applicable
    .filter((f) =>
      f.waived
        ? f.tier === "core" && f.deviation === "defect"
        : f.tier === "core" && (f.verdict !== "pass" || f.coverage === "partial"),
    )
    .map((f) => ({
      ruleId: f.ruleId,
      gaps: f.waived
        ? [
            `waived by config: ${config.rules[f.ruleId]?.reason ?? ""}`,
            // The probe ran regardless, so the report can say what it found. Stated as an
            // observation, never as work: a waiver is not a debt and nothing here asks for it back.
            `the probe ran anyway and returned ${f.verdict}: ${f.detail}`,
          ]
        : [
            ...(f.verdict === "pass" ? [] : [`${f.verdict}: ${f.detail}`]),
            ...(f.coverage === "partial" ? f.coverageGaps : []),
          ],
    }));

  // Captured once and read twice — the report publishes it, and the declaration diff compares
  // against it. Two calls would be two captures of the same observations, and a reader comparing
  // the two blocks would have no guarantee they came from one read.
  const surface = captureSurface(h.observations);
  // Read from the same history and for the same reason: `toReportedObservation` below drops the
  // streams, so bytes not extracted before that projection are unrecoverable from the artifact.
  // No probe is added — `D1` already ran this argv on every target.
  const targetIdentity = captureIdentity(h.observations);

  return {
    target: h.target.path,
    kitVersion,
    // A config assembled in memory rather than read from a file reports `none`, which is what
    // `AccConfig.source` being optional means — see the field, where the boundary is argued.
    configSource: config.source ?? { origin: "none", path: null, dir: process.cwd() },
    level,
    conformant,
    fullyVerified:
      conformant &&
      coreNotPassed.length === 0 &&
      coreIncomplete.length === 0 &&
      waivedCore.length === 0,
    counts: {
      core: core.length,
      corePassed: core.filter((f) => f.verdict === "pass").length,
      coreFailures: coreFailures.length,
      diagnosticFailures: binding.filter((f) => f.tier === "diagnostic" && f.verdict === "fail")
        .length,
      unverified: unverified.length,
      coreUnverified: unverifiedCore.length,
      corePartial: core.filter((f) => f.verdict === "pass" && f.coverage === "partial").length,
      notApplicable: notApplicable.length,
      waived: waived.length,
    },
    targetArgv0: [...h.target.argv0],
    targetIdentity,
    evidenceGaps,
    findings: reported,
    observations: h.observations.map(toReportedObservation),
    notApplicable: notApplicable.map((f) => f.ruleId),
    // Captured from the history, because the projection below is about to discard the streams it
    // is read from. Nothing about it feeds `conformant`, `fullyVerified` or any count.
    surface,
    // THE ROOT IS ALWAYS THE KIT'S, and it is the only path the kit probes — `captureSurface`
    // reads root-level rejections only. Everything below it comes from a batch the caller
    // recorded, if they supplied one, and each entry carries who observed it. A declared path
    // neither reached nor recorded comes back `checked: false` with the reason saying which of
    // those it was: a diff over 1 of 25 paths must not be reported as a diff over 25.
    ...(declaration
      ? {
          declaration: diffDeclaration(
            declaration,
            pathSurfaces(surface, recorded?.reading),
            recorded != null,
          ),
        }
      : {}),
    ...(recorded
      ? {
          recordedSurfaces: {
            source: recorded.source,
            records: recorded.reading.records,
            readings: recorded.reading.surfaces.map((p) => ({
              path: p.path,
              summary: recordedPathSummary(p),
            })),
            recordedBy: recorded.reading.recordedBy,
            identity: recorded.reading.identity,
          },
        }
      : {}),
    knownFailures: Object.entries(config.knownFailures).map(([ruleId, reason]) => ({
      ruleId,
      reason,
    })),
    staleExpectations: Object.keys(config.knownFailures).filter(
      (id) => applicable.find((f) => f.ruleId === id)?.verdict === "pass",
    ),
    // Not applicable at this level, or applicable and `unverified`. Either way the run reached no
    // judgement, so the excuse suppressed nothing — excuses only ever reduce `coreFailures`.
    inertExpectations: Object.keys(config.knownFailures)
      .filter((id) => {
        const found = reported.find((f) => f.ruleId === id);
        return found !== undefined && (!found.applicable || found.verdict === "unverified");
      })
      .map((ruleId) => ({ ruleId, reason: config.knownFailures[ruleId] ?? "" })),
    // Both halves of the declared frame, echoed from the config and joined to what actually
    // happened. Built from `reported` rather than from `config.rules` alone so `verdict` and
    // `applicable` are the run's, not the file's — a waiver whose rule the run never reached
    // says so, instead of appearing to have suppressed something.
    waivers: reported
      .filter((f) => f.waived)
      .map((f) => ({
        ruleId: f.ruleId,
        reason: config.rules[f.ruleId]?.reason ?? "",
        verdict: f.verdict,
        tier: f.tier,
        deviation: f.deviation,
        applicable: f.applicable,
      })),
    severityOverrides: reported
      .filter((f) => {
        const declared = byId.get(f.ruleId)?.tier ?? "core";
        return !f.waived && config.rules[f.ruleId] !== undefined && f.tier !== declared;
      })
      .map((f) => ({
        ruleId: f.ruleId,
        from: byId.get(f.ruleId)?.tier ?? "core",
        to: f.tier,
        reason: config.rules[f.ruleId]?.reason ?? "",
      })),
  };
}

/**
 * Project an `Observation` onto what the report publishes.
 *
 * Written as an explicit field list rather than a spread-and-delete, so adding a field to
 * `Observation` cannot silently publish it. The two that must never appear here are `stdout` and
 * `stderr`: they are the target's own output, unbounded, and already represented by their digests.
 */
export function toReportedObservation(o: Observation): ReportedObservation {
  return {
    id: o.id,
    args: [...o.invocation.args],
    ...(Object.keys(o.invocation.env ?? {}).length > 0 ? { env: { ...o.invocation.env } } : {}),
    inertness: o.invocation.inertness,
    ...(o.invocation.repeat === undefined ? {} : { repeat: o.invocation.repeat }),
    purposes: [...o.purposes],
    exitCode: o.exitCode,
    signal: o.signal,
    crashed: o.crashed,
    timedOut: o.timedOut,
    spawnFailed: o.spawnFailed,
    durationMs: o.durationMs,
    timeToFirstByteMs: o.timeToFirstByteMs,
    stdoutBytes: o.stdoutBytes,
    stderrBytes: o.stderrBytes,
    stdoutDigest: o.stdoutDigest,
    stderrDigest: o.stderrDigest,
    stdoutLossy: o.stdoutLossy,
    stderrLossy: o.stderrLossy,
    truncated: o.truncated,
  };
}

/**
 * Every path the differ has evidence for: the kit's own root capture, then whatever the caller
 * recorded below it.
 *
 * A RECORDED ROOT CANNOT ARRIVE HERE — the batch reader refuses a `path: []` record outright — so
 * there is no path with two provenances to reconcile, which is the property that lets every census
 * line name exactly one observer.
 */
function pathSurfaces(root: Surface, reading?: RecordedReading): PathSurface[] {
  return [
    { path: [], surface: root, surfaceProvenance: "probed-by-kit" },
    ...(reading?.surfaces ?? []),
  ];
}
