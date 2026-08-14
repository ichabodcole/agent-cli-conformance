/** A single planned invocation of the target binary. Built only by probe helpers. */
export interface Invocation {
  /** Arguments after the binary path. */
  args: string[];
  /** Environment overrides layered onto the parent env. */
  env?: Record<string, string>;
  /**
   * Why this invocation is safe to run. The runner refuses anything unclassified.
   *
   * `bare` is its own class rather than a side effect of an empty `args` array satisfying
   * `help-path` or `no-verb` vacuously: it is the least dangerous possible invocation, and the
   * only way to probe D2/E1 (bare-invocation behaviour). A CLI that does real work on a bare
   * invocation is itself the finding the probe exists to catch; the runner's deadline catches a
   * wizard that blocks waiting for input.
   */
  inertness: "help-path" | "sentinel" | "no-verb" | "bare";
  /** Human-readable reason this probe exists; appears in findings as evidence. */
  purpose: string;
}

/** What actually happened. The unit the whole kit reasons over. */
export interface Observation {
  /** Stable id derived from args + env, so two checkers asking for the same probe share one. */
  id: string;
  invocation: Invocation;
  /**
   * Every purpose that requested this invocation. Deduplication merges requests from different
   * checkers into one recording, so this is a list — `invocation.purpose` is only the first
   * requester's reason, and indexing on it would silently lose the others.
   */
  purposes: string[];
  /**
   * The captured bytes, decoded as UTF-8 once over the whole capture.
   *
   * Byte-faithful within the capture limit: the runner collects Buffers and concatenates before
   * decoding, so a multi-byte character split across two of the target's writes survives intact.
   * Decoding per chunk turned `€` written in two writes into replacement characters, which can
   * fabricate a difference for D4 and corrupts the bytes any finding quotes as evidence.
   */
  stdout: string;
  stderr: string;
  /**
   * Bytes RETAINED on each stream — the byte length of the captured prefix, not of what the
   * target intended to write. When `truncated` is true the target was killed at the ceiling and
   * what it would have written next is unknowable, so these are a floor, never a total.
   */
  stdoutBytes: number;
  stderrBytes: number;
  /**
   * True when a capture ceiling (see MAX_STREAM_BYTES / MAX_OUTPUT_BYTES in runner.ts) stopped
   * the recording and the runner killed the target.
   *
   * Evidence with this set is a PREFIX. It can still prove a violation the prefix contains — an
   * ANSI escape that was emitted was emitted — but it can never establish an absence, and it
   * carries no exit code, because the target did not choose to stop. Checkers must run it
   * through `truncatedUnverified` (see finding.ts) exactly as they run a hang through
   * `hungUnverified`.
   */
  truncated: boolean;
  /** null when the deadline or the output ceiling killed it — a process we killed did not
   *  choose its status. */
  exitCode: number | null;
  timedOut: boolean;
  /**
   * True when the process could never be started (ENOENT, EACCES, a text file with no exec
   * bit). Distinct from `exitCode: 127`, which a target may legitimately CHOOSE to return:
   * without this flag "answered 127" and "never ran at all" are the same recording, and a
   * target that never ran collects a pass from every checker that asks only for a non-zero
   * exit and an empty stdout. `record()` refuses to build a history from one.
   */
  spawnFailed: boolean;
  durationMs: number;
  /** null when nothing was ever written. */
  timeToFirstByteMs: number | null;
}

/** What could be learned about the target's surface before probing it. */
export interface Discovery {
  /** Subcommand names parsed from root help. Empty when none could be found. */
  subcommands: string[];
  /** Long flags parsed from root help, including leading dashes. */
  flags: string[];
  /** A machine-mode flag if one was advertised (`--json`, `--format`). */
  machineModeFlag: string | null;
  /** True when root help was readable at all. Everything above is meaningless if false. */
  helpReadable: boolean;
}

export interface TargetInfo {
  /** Path as given by the caller. */
  path: string;
  /** Argv used to launch it, e.g. ["bun", "cli.ts"] or ["/usr/local/bin/gh"]. */
  argv0: string[];
}

export interface History {
  target: TargetInfo;
  discovery: Discovery;
  observations: Observation[];
  /** Lookup by Invocation id. */
  byId: Map<string, Observation>;
}

/**
 * Three outcomes, never two. `unverified` means the probe could not run — the target had no
 * subcommand to nest under, no machine-mode flag to test. A probe that could not run is not a
 * probe that succeeded.
 */
export type Verdict = "pass" | "fail" | "unverified";

export interface Finding {
  ruleId: string;
  verdict: Verdict;
  /** One line. What was observed, in terms a reader can act on. */
  detail: string;
  /** Observation ids backing the verdict, so any finding can be traced to raw evidence. */
  evidence: string[];
}

/**
 * A rule's executable half.
 *
 * `probes` declares what needs recording; `check` is PURE over the resulting history and must
 * never spawn. That separation is what lets two checkers share one recorded invocation, and
 * what lets a stored history be re-checked against new rules later.
 */
/**
 * How deeply the kit is allowed to probe. L0 is safety-classification-free: every probe must be
 * inert by construction (see `Invocation.inertness`). Higher levels unlock probes that require
 * knowledge only available after earlier phases run — e.g. L1 requires effect classification of
 * subcommands, which is what lets A4 safely invoke a real verb with a stray positional.
 */
export type ProbeLevel = "L0" | "L1" | "L2";

/**
 * How much of the rule page's normative text this checker's assertions actually establish.
 *
 * `complete` is the claim that a `pass` from this checker means the WHOLE rule held. `partial`
 * is the claim that it means "nothing this checker looked at was violated" — a weaker sentence
 * that several checkers were already saying in their pass detail (C2's "internal-fault contrast
 * unverified at L0", A2's "nested case not probed at L0") while `buildReport` counted them as
 * ordinary passes and let `fullyVerified` speak over the gap.
 */
export type Coverage = "complete" | "partial";

export interface Checker {
  ruleId: string;
  /** Wiki path, quoted in output so a failure points at the rule that explains it. */
  rulePath: string;
  tier: "core" | "diagnostic";
  /** The lowest probe level at which this rule can be checked. A run at a lower level reports
   *  it as not-applicable rather than unverified — "out of scope here" is a different claim
   *  from "tried and could not establish it", and a report that conflates them cannot be acted
   *  on. Must match the rule page's `probe_level` frontmatter. */
  probeLevel: ProbeLevel;
  /**
   * REQUIRED, with no default. A default would let the next checker inherit `complete` by
   * saying nothing, which is the drift this field exists to remove: every one of the nineteen
   * had `checker_status: implemented`, and a reader took that for "the rule is enforced".
   *
   * Must match the rule page's `coverage` frontmatter — `docs/wiki/lint.ts` compares them in
   * both directions, exactly as it does for `tier` and `probe_level`.
   */
  coverage: Coverage;
  /**
   * One short phrase per normative assertion on the rule page that this checker does NOT
   * establish at `probeLevel`. `complete` MUST carry none; `partial` MUST carry at least one —
   * enforced by registry.test.ts, so `partial` can never be a bare flag with no accounting.
   *
   * These are reproduced verbatim in the rule page's `coverage_gaps` frontmatter, which the
   * wiki lint round-trips through its own deliberately small YAML reader. That reader splits
   * list items on `,` and on ` - `, so a phrase containing either cannot survive the trip;
   * registry.test.ts rejects both rather than letting the lint fail somewhere unrelated.
   */
  coverageGaps: string[];
  probes: (d: Discovery) => Invocation[];
  check: (h: History) => Finding;
}

/**
 * Find a recorded observation by the exact args it was run with.
 *
 * Matches on `args` only — `env` is ignored. A checker that deliberately reuses identical args
 * under different env (D1's `--version` with a hostile `HOME`, D4's `--help` run twice, F2's
 * three timing runs) will have several observations collide on the same args, and this returns
 * whichever was recorded first, silently. Those checkers must use `findByPurpose` instead.
 */
export function findByArgs(h: History, args: string[]): Observation | undefined {
  const key = args.join("\0");
  return h.observations.find((o) => o.invocation.args.join("\0") === key);
}

/**
 * Every observation whose `purposes` includes one starting with `prefix`.
 *
 * Returns an array because deduplication can merge several requests into one recording, and
 * because a checker that declares three probes needs all three back. Prefer this over indexing
 * on `invocation.purpose` — that field is only the FIRST requester's reason, and a checker
 * reading it would silently miss observations another checker happened to request first.
 */
export function findByPurpose(h: History, prefix: string): Observation[] {
  return h.observations.filter((o) => o.purposes.some((p) => p.startsWith(prefix)));
}
