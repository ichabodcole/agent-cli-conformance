/** A single planned invocation of the target binary. Built only by probe helpers. */
export interface Invocation {
  /** Arguments after the binary path. */
  args: string[];
  /** Environment overrides layered onto the parent env. */
  env?: Record<string, string>;
  /** Why this invocation is safe to run. The runner refuses anything unclassified. */
  inertness: "help-path" | "sentinel" | "no-verb";
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
  stdout: string;
  stderr: string;
  /** null when the deadline killed it — a process we killed did not choose its status. */
  exitCode: number | null;
  timedOut: boolean;
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
export interface Checker {
  ruleId: string;
  /** Wiki path, quoted in output so a failure points at the rule that explains it. */
  rulePath: string;
  tier: "core" | "diagnostic";
  probes: (d: Discovery) => Invocation[];
  check: (h: History) => Finding;
}
