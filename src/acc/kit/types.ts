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
  /**
   * RECORDER-ONLY repetition index. Participates in `invocationId` so `record()`'s dedup keeps
   * repetitions distinct, and is NEVER passed to the target — not as an argument, not through
   * the environment. The target sees byte-identical argv across every repeat.
   *
   * This exists because C3's rule is "the SAME invocation produces the same exit code", and
   * dedup made that unaskable: three identical probes collapsed into one recording. C3 worked
   * around it with three textually distinct flags, which tests a different claim — a parser
   * that hashed the token into its exit code would fail that deterministically, and one that is
   * genuinely nondeterministic on repeated identical input would pass it (review R3-5). D4 had
   * the same defect in the other spelling — a second `--help` carrying `ACC_PROBE_NONCE`, so a
   * rule about the SAME invocation compared two that differed — and now uses this instead. F2 is
   * the last holdout and still perturbs `env`, which is visible to the target.
   */
  repeat?: number;
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
   * The captured bytes, decoded as UTF-8 once over the whole capture. A RENDERING of the stream,
   * for a human to read and for a checker to search — not the stream itself.
   *
   * Faithful across CHUNK BOUNDARIES: the runner collects Buffers and concatenates before
   * decoding, so a multi-byte character split across two of the target's writes survives intact.
   * Decoding per chunk turned `€` written in two writes into replacement characters, which can
   * fabricate a difference for D4 and corrupts the bytes any finding quotes as evidence.
   *
   * NOT faithful to bytes that are not valid UTF-8 — those collapse, irreversibly and many-to-one,
   * which is what `stdoutDigest` and `stdoutLossy` below exist to say out loud.
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
   * SHA-256 over the RAW captured bytes of each stream, taken BEFORE the decode above.
   *
   * THE FIELD THAT MAKES `stdout` STOP BEING THE EVIDENCE. UTF-8 decoding is not injective:
   * bytes `0x80`, `0x81` and `0xC8` are each invalid on their own and each decodes to the single
   * replacement character `U+FFFD`, which re-encodes to `EF BF BD`. So two targets writing one
   * different byte apiece produce observations that are equal in `stdout` AND equal in
   * `stdoutBytes` — byte-identical evidence for two byte-different streams (review R6-1). D4
   * compared those decoded strings while claiming byte identity, so it could certify different
   * raw output as identical. Every byte-identity comparison in the catalogue compares THESE.
   *
   * THE RAW BYTES ARE DELIBERATELY NOT RETAINED, and that is a choice rather than an oversight.
   * They are already bounded (MAX_STREAM_BYTES / MAX_OUTPUT_BYTES in runner.ts), so keeping them
   * would be affordable — but it would double every observation's footprint to buy nothing a
   * 32-byte digest does not already buy for an equality question, and it would put an unbounded
   * binary blob into the serialisable observation artifact that `docs/roadmap.md` step 4
   * specifies, which then needs an encoding, a redaction story and a retention story of its own.
   * A digest answers "are these the same bytes?" and refuses to answer "what were they?", which
   * is exactly the split this kit wants: the display string renders, the digest adjudicates.
   */
  stdoutDigest: string;
  stderrDigest: string;
  /**
   * True when re-encoding the decoded string does NOT reproduce the captured bytes — i.e. the
   * decode lost information and the display string above is a rendering, not the evidence.
   *
   * Set by invalid UTF-8 (every ill-formed sequence collapses to `U+FFFD`) and by a `truncated`
   * capture whose cut landed mid-code-point. It is the honest companion to the digest: the digest
   * says two streams differ, and this says WHY a reader looking at `stdout` cannot see it. A
   * checker that must point at an offset has to check this first — there is no offset to give
   * when the difference lives in bytes the decode collapsed.
   */
  stdoutLossy: boolean;
  stderrLossy: boolean;
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
  /**
   * The status the target CHOSE, or null when it never chose one.
   *
   * Null has two causes and they are not the same event: the deadline or the output ceiling
   * killed it (see `timedOut`, `truncated`), or a signal did (see `crashed`). Reading this field
   * alone cannot tell them apart, and for a long time nothing else could either — which is how a
   * segfaulting target came to satisfy every "exited non-zero" test in the catalogue. Whichever
   * cause it is, `null` is never "the target rejected something": no code is not a low code.
   *
   * A signal death is left null rather than synthesised as 128+n. That number is a shell
   * convention; POSIX guarantees only "greater than 128", and the target never chose either —
   * see docs/wiki/decisions/exit-codes-below-125.md.
   */
  exitCode: number | null;
  /**
   * The terminating signal as the OS reported it (`"SIGSEGV"`, `"SIGKILL"`), null when the
   * process exited under its own control.
   *
   * Recorded for EVERY signal termination, the kit's own `killTree` SIGKILL included, so it is
   * a faithful record and NOT the flag to branch on — `crashed` is. Kept as the raw string
   * because which signal it was is the whole content of the observation: G1 quotes it in the
   * finding, since a target that died has no exit code to quote instead. Which signals a target
   * must HANDLE (SIGINT, SIGTERM, SIGPIPE) is the rest of the lifecycle family, at
   * docs/roadmap.md step 7.
   */
  signal: string | null;
  /**
   * True when a signal THE KIT DID NOT SEND ended the process — the target crashed, or something
   * outside this runner killed it.
   *
   * The distinction `signal` cannot make on its own. A hang and an output-ceiling kill both end
   * in SIGKILL from `killTree`, so "a signal arrived" is true of all three cases and means three
   * different things; `timedOut` and `truncated` are set before the kill, so what remains is a
   * death the kit did not cause.
   *
   * Same defect class as `spawnFailed`, one step later in the lifecycle. That flag exists
   * because a target that cannot START collects passes from every checker satisfied by an empty
   * stream and a non-zero exit; a target that starts and then dies walked back through the same
   * hole, because `exitCode` is null and null is not 0. A fixture whose entire body is
   * `kill -SEGV $$` scored nine passing rules. Checkers must run this through
   * `crashedUnverified` (see finding.ts) exactly as they run a hang through `hungUnverified` —
   * except G1, which reads this field as its whole subject matter and reports the violation.
   */
  crashed: boolean;
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
 * Matches on `args` only — `env` AND `repeat` are ignored, and both are ways to produce the
 * collision. A checker that deliberately reuses identical args under different env (D1's
 * `--version` with a hostile `HOME`, F2's three timing runs) or under a different `repeat`
 * (C3's three identical runs, D4's two help runs) will have several observations collide on
 * the same args, and this returns whichever was recorded first, silently. `repeat` is the
 * sharper trap of the two: its whole design is that nothing in `args` distinguishes the
 * repetitions, so a checker reaching for this function gets exactly one of the N runs it asked
 * for. Those checkers must use `findByPurpose` instead.
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
