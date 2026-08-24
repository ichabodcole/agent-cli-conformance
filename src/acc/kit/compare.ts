import type { Report, ReportedObservation } from "./report.ts";
import type { Surface, SurfaceStatus } from "./surface.ts";

/**
 * COMPARISON, not judgement.
 *
 * Every rule in this catalogue judges one tool alone, so no rule can express a relation between
 * two tools — and the owner's actual complaint is that his eight agent-facing CLIs answer the
 * same question five different ways. `docs/reports/2026-08-24-eight-owner-clis.md` §2 measured
 * those five divergences with a hand-written shell loop while the JSON reports sat in the same
 * directory holding the same numbers. This file is the read nobody had performed.
 *
 * WHY VERDICTS ARE NOT THE UNIT. The obvious design — intersect the verdict vectors — reports
 * AGREEMENT on the sharpest divergence in that table. Seven of the eight CLIs answer an unknown
 * flag with exit 2 and one answers with exit 1; A1 requires only "non-zero", so it returns
 * `PASS+` on both, and `PASS+ ∩ PASS+` is `PASS+`. A verdict is a rule's opinion collapsed to
 * three words, and the collapse is where the finding goes. Observations are what survive it: the
 * kit already records, per probe, the exit code, the byte counts, the digests and the flags, and
 * two reports of the same argv are directly comparable because `invocationId` (runner.ts) hashes
 * `args` + `env` + `repeat` and NOTHING about the target. Identical ids across two reports are
 * the same question asked of two tools.
 *
 * WHY THERE IS NO VERDICT AT THE END. Two tools differing is not a defect. The charter is
 * explicit that consistency is not uniformity, and the product here is VISIBILITY: a difference
 * that someone can see is a choice they made, and a difference nobody can see is an accident.
 * So nothing in this file returns a boolean about a population, `compareCommand` never sets a
 * non-zero exit code, and the vocabulary is deliberately `divergent`/`agreed` rather than
 * `fail`/`pass`.
 */

/** How a probe ENDED, as a single comparable token. */
export type Ending = string;

/**
 * Which stream carried bytes. The axis that separates "help printed on stdout" from "help
 * printed on stderr", which is divergence (b) in the report and a thing no rule can say.
 */
export type Placement = "stdout" | "stderr" | "both" | "neither";

/**
 * The two axes a probe is compared on, and the argument for stopping at two.
 *
 * `ending` and `placement` are ABSTRACTIONS over the raw record, chosen because they are the
 * axes on which two independently written CLIs can meaningfully agree. The raw byte counts are
 * not: any two tools have help screens of different lengths, so a comparison keyed on
 * `stdoutBytes` marks every row divergent and says nothing. The counts and digests still travel
 * on every row (see `TargetOutcome`) — they are what a reader needs to reproduce the table in
 * the report by hand — they are simply not what DECIDES divergence.
 */
export type Axis = "ending" | "placement";

/** What one target did with one probe. The row of the §2 table, per target. */
export interface TargetOutcome {
  label: string;
  ending: Ending;
  placement: Placement;
  exitCode: number | null;
  signal: string | null;
  stdoutBytes: number;
  stderrBytes: number;
  /**
   * Carried so a reader can tell "different lengths" from "different bytes" without either
   * report holding the streams themselves. Never an axis: two tools sharing a digest for a
   * non-empty stream would be remarkable, and two differing is the ordinary case.
   */
  stdoutDigest: string;
  stderrDigest: string;
  crashed: boolean;
  timedOut: boolean;
  truncated: boolean;
}

/** One axis, and who sits where on it. `groups.length > 1` IS the divergence. */
export interface AxisSplit {
  axis: Axis;
  /** Sorted by value, so two runs of the same comparison read identically. */
  groups: Array<{ value: string; targets: string[] }>;
}

export interface ProbeComparison {
  /** `invocationId` — equal ids across reports mean byte-identical argv, env and repetition. */
  id: string;
  /** The argv sent after the target's own `argv0`. Empty array is the bare invocation. */
  args: string[];
  env?: Record<string, string>;
  repeat?: number;
  /**
   * Every reason any target's run had for sending this probe, unioned and sorted.
   *
   * A probe id is not self-explanatory and `args` is often three tokens of sentinel; the
   * purposes are the only text in the record that says what the question WAS. They are unioned
   * because deduplication already merged several checkers' requests into one recording, and
   * because two targets can reach the same argv through different checkers.
   */
  purposes: string[];
  /** Targets whose report contains this probe. */
  present: string[];
  /**
   * Targets whose report does not.
   *
   * NOT a finding about those targets. Several probes are built from what discovery read off the
   * target's own help — a near-miss of a flag it advertises, its own machine-mode flag — so the
   * argv differs by construction and there is nothing to compare. A comparison that silently
   * dropped these rows would look like a smaller, cleaner comparison than it is.
   */
  absent: string[];
  /** True when at least two targets ran it, which is the minimum for the word "compare". */
  aligned: boolean;
  /** True when at least one axis splits the targets into more than one group. */
  divergent: boolean;
  axes: AxisSplit[];
  outcomes: TargetOutcome[];
}

export interface ComparedTarget {
  label: string;
  target: string;
  targetArgv0: string[];
  /**
   * The kit version that PRODUCED this report, republished here because a comparison across two
   * kit versions is comparing two instruments as well as two tools. `Comparison.kitVersions`
   * names the set so a reader can see at a glance whether that happened.
   */
  kitVersion: string;
  /** Where that run's `acc.config.json` came from — `none`, `flag` or `discovered`. A waiver
   *  cannot move an observation, but `defaultOutput` changes which probes discovery builds. */
  configOrigin: string;
}

/**
 * What one target says its own accepted flags are — carried across from that report's capture.
 *
 * DELIBERATELY NOT AN AXIS. Two tools accepting different flags is not a divergence, it is two
 * tools; a comparison that grouped targets by flag set would mark every row divergent and mean
 * nothing, which is the same mistake `Axis` rejects for byte counts. What IS worth seeing across a
 * fleet is the STATUS column — which of these tools will tell an agent what they accept when it
 * gets a flag wrong, and which will not — and that is a question no single report answers.
 */
export interface SurfaceRow {
  label: string;
  /** `not-recorded` when the report predates the capture, which is a fact about the file. */
  status: SurfaceStatus | "not-recorded";
  /** Present only for `enumerated`, on the same terms as `Surface.flags`. */
  flags?: string[];
  /** Carried across rather than assumed: see `Surface.consistent`. */
  consistent?: boolean;
  probesRead: number;
}

export interface Comparison {
  targets: ComparedTarget[];
  /** Distinct kit versions across the inputs, sorted. More than one is worth a reader's notice. */
  kitVersions: string[];
  counts: {
    targets: number;
    probes: number;
    aligned: number;
    divergent: number;
    agreed: number;
    unaligned: number;
  };
  /**
   * The answer to the question this surface exists for, first in the document.
   *
   * Split into three arrays rather than one list with flags, because the three call for
   * different reading: `divergent` is the finding, `agreed` is the evidence that the comparison
   * was doing work at all, and `unaligned` is the disclosure of what could not be compared. A
   * consumer wanting the whole record concatenates them; a consumer wanting the finding reads
   * `.data.divergent[]` and stops.
   */
  divergent: ProbeComparison[];
  agreed: ProbeComparison[];
  unaligned: ProbeComparison[];
  /** One row per input, in input order. See `SurfaceRow` for why it is not folded into `axes`. */
  surfaces: SurfaceRow[];
}

/**
 * How the process ended, as one token.
 *
 * The order matters and mirrors `Observation`'s own doc comments: a `null` exit code has three
 * causes and they are not the same event. A target the runner killed at its deadline chose
 * nothing, and rendering that as "no exit code" beside a target that chose 2 would compare a
 * measurement to a decision.
 */
export function endingOf(o: ReportedObservation): Ending {
  if (o.timedOut) return "timed out";
  if (o.truncated) return "truncated at the output ceiling";
  if (o.spawnFailed) return "never started";
  if (o.exitCode !== null) return `exit ${o.exitCode}`;
  // A signal death the kit did not cause. `signal` is quoted because which signal it was is the
  // whole content of the observation — there is no exit code to quote instead.
  return o.signal ? `killed by ${o.signal}` : "ended without an exit code";
}

/** Which stream carried bytes. Emptiness is a real answer here, not a missing one. */
export function placementOf(o: ReportedObservation): Placement {
  if (o.stdoutBytes > 0 && o.stderrBytes > 0) return "both";
  if (o.stdoutBytes > 0) return "stdout";
  if (o.stderrBytes > 0) return "stderr";
  return "neither";
}

function outcomeOf(label: string, o: ReportedObservation): TargetOutcome {
  return {
    label,
    ending: endingOf(o),
    placement: placementOf(o),
    exitCode: o.exitCode,
    signal: o.signal,
    stdoutBytes: o.stdoutBytes,
    stderrBytes: o.stderrBytes,
    stdoutDigest: o.stdoutDigest,
    stderrDigest: o.stderrDigest,
    crashed: o.crashed,
    timedOut: o.timedOut,
    truncated: o.truncated,
  };
}

/** One axis' groups, in value order — a stable document beats one that reorders with input. */
function split(axis: Axis, outcomes: TargetOutcome[]): AxisSplit {
  const groups = new Map<string, string[]>();
  for (const o of outcomes) {
    const value = axis === "ending" ? o.ending : o.placement;
    const members = groups.get(value);
    if (members) members.push(o.label);
    else groups.set(value, [o.label]);
  }
  return {
    axis,
    groups: [...groups.entries()]
      .map(([value, targets]) => ({ value, targets }))
      .sort((a, b) => a.value.localeCompare(b.value)),
  };
}

/** One report, with the label the reader will see beside it. */
export interface LabelledReport {
  label: string;
  report: Report;
}

/**
 * Align every report's observations by probe id and diff the outcome.
 *
 * PURE, and over reports rather than targets: nothing here spawns a process, so a comparison
 * adds no safety surface to a kit whose one dangerous act is executing a stranger's binary. See
 * `compareCommand` for why the input is stored reports.
 */
export function compareReports(inputs: LabelledReport[]): Comparison {
  const labels = inputs.map((i) => i.label);
  // Insertion-ordered by first appearance, so the probe list reads in the order the first
  // report ran them — which is the order a reader of that report already has in their head.
  const byProbe = new Map<string, Map<string, ReportedObservation>>();
  for (const { label, report } of inputs) {
    for (const o of report.observations) {
      const row = byProbe.get(o.id) ?? new Map<string, ReportedObservation>();
      row.set(label, o);
      byProbe.set(o.id, row);
    }
  }

  const probes: ProbeComparison[] = [];
  for (const [id, row] of byProbe) {
    // Any member carries the invocation's own identity: equal ids mean equal args, env and
    // repeat, so reading them off the first is not a choice between disagreeing sources.
    const first = [...row.values()][0] as ReportedObservation;
    const present = labels.filter((l) => row.has(l));
    const outcomes = present.map((l) => outcomeOf(l, row.get(l) as ReportedObservation));
    const aligned = present.length > 1;
    const axes: AxisSplit[] = aligned
      ? (["ending", "placement"] as const).map((axis) => split(axis, outcomes))
      : [];
    probes.push({
      id,
      args: first.args,
      ...(first.env ? { env: first.env } : {}),
      ...(first.repeat === undefined ? {} : { repeat: first.repeat }),
      purposes: [...new Set([...row.values()].flatMap((o) => o.purposes))].sort(),
      present,
      absent: labels.filter((l) => !row.has(l)),
      aligned,
      divergent: axes.some((a) => a.groups.length > 1),
      axes,
      outcomes,
    });
  }

  const divergent = probes.filter((p) => p.aligned && p.divergent);
  const agreed = probes.filter((p) => p.aligned && !p.divergent);
  const unaligned = probes.filter((p) => !p.aligned);

  return {
    targets: inputs.map(({ label, report }) => ({
      label,
      target: report.target,
      targetArgv0: report.targetArgv0,
      kitVersion: report.kitVersion,
      configOrigin: report.configSource.origin,
    })),
    kitVersions: [...new Set(inputs.map((i) => i.report.kitVersion))].sort(),
    counts: {
      targets: inputs.length,
      probes: probes.length,
      aligned: divergent.length + agreed.length,
      divergent: divergent.length,
      agreed: agreed.length,
      unaligned: unaligned.length,
    },
    divergent,
    agreed,
    unaligned,
    surfaces: inputs.map(({ label, report }) => surfaceRow(label, report.surface)),
  };
}

/** Tolerant of a report written before the capture existed: `surface` is absent, not empty. */
function surfaceRow(label: string, surface: Surface | undefined): SurfaceRow {
  if (!surface) return { label, status: "not-recorded", probesRead: 0 };
  return {
    label,
    status: surface.status,
    ...(surface.flags ? { flags: [...surface.flags] } : {}),
    ...(surface.consistent === undefined ? {} : { consistent: surface.consistent }),
    probesRead: surface.probesRead,
  };
}

/**
 * The invocation minus its repetition index — `--help`, or `(bare)` for the probe that sends
 * nothing.
 *
 * Separate from `argvLabel` because three checkers (C3, D4, F2) deliberately record the SAME
 * argv several times, and a repetition is a question about one target's determinism rather than
 * about the population. This is the key those repetitions share.
 */
export function argvFamily(p: ProbeComparison): string {
  const args = p.args.length ? p.args.join(" ") : "(bare)";
  // Names only. A probe's env override is `HOME=/nonexistent`-shaped and the VALUE is a detail
  // of the kit's own hostile-environment probe, not something two targets can disagree about.
  const env = p.env ? ` [env ${Object.keys(p.env).sort().join(",")}]` : "";
  return `${args}${env}`;
}

/** `argvFamily` plus the repetition index, when the probe carried one. */
export function argvLabel(p: ProbeComparison): string {
  return `${argvFamily(p)}${p.repeat === undefined ? "" : ` #${p.repeat}`}`;
}
