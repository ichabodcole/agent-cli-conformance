import { discover } from "./discovery.ts";
import { DEFAULT_TIMEOUT_MS, invocationId, runProbe } from "./runner.ts";
import type { Checker, History, Invocation, Observation, TargetInfo } from "./types.ts";

/**
 * The target could not be executed at all.
 *
 * Thrown rather than folded into the history, because a binary that never runs is not a
 * conformance question — it is a bad invocation, and the answer is "fix the path", not a
 * report. Left as an ordinary observation it is worse than useless: empty streams and a
 * non-zero code satisfy A2, B1, B2, C3, D2, D4, E1 and F1 by accident, so a text file
 * containing `hello` certifies as passing eight core rules.
 *
 * Carries the failing observation so the caller can name the probe in its own error envelope.
 */
export class TargetNotExecutableError extends Error {
  constructor(
    readonly target: TargetInfo,
    readonly observation: Observation,
  ) {
    super(
      `target could not be executed: ${target.argv0.join(" ")} (probe: ${
        observation.invocation.args.join(" ") || "(bare)"
      })`,
    );
    this.name = "TargetNotExecutableError";
  }
}

/**
 * Phase one: run every probe any checker asked for, exactly once.
 *
 * Checkers declare what they need and never spawn anything themselves. That buys three things:
 * shared probes are recorded once rather than per-checker; a history can be stored and
 * re-checked against rules written later; and `check` stays a pure function, which is the only
 * reason the checker tests can be fast and deterministic.
 */
export async function record(
  target: TargetInfo,
  checkers: Checker[],
  declaredMachineDefault = false,
  /** Rule ids waived in `acc.config.json`. See `History.waived` for the one thing it is for. */
  waived: ReadonlySet<string> = new Set(),
  /**
   * Per-probe deadline, in milliseconds. Defaults to `DEFAULT_TIMEOUT_MS`, which is what every
   * real run uses; nothing in the CLI passes this.
   *
   * It exists for the tests that record a fixture which HANGS FOREVER. Proving the deadline is
   * enforced needs a target that never terminates on its own, and the assertion — that the probe
   * was killed rather than awaited — is identical whether the deadline is ten seconds or one.
   * The only thing the ten seconds buys those tests is thirty seconds of wall clock. A caller
   * measuring a real, unknown binary must NOT set this: a short deadline there would record a
   * merely slow tool as one that never terminated.
   */
  probeTimeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<History> {
  const discovery = await discover(target, declaredMachineDefault, probeTimeoutMs);

  // Multiple checkers legitimately request the same invocation (e.g. plain `--help`) for
  // different reasons. Keeping only the first requester's `purpose` would make every other
  // checker search a history for a purpose that was silently dropped, turning it permanently
  // `unverified`. So dedup by id but union the purposes, not just the first invocation seen.
  const wanted = new Map<string, { inv: Invocation; purposes: Set<string> }>();
  for (const checker of checkers) {
    for (const inv of checker.probes(discovery)) {
      const id = invocationId(inv);
      const existing = wanted.get(id);
      if (existing) existing.purposes.add(inv.purpose);
      else wanted.set(id, { inv, purposes: new Set([inv.purpose]) });
    }
  }

  // Sequential, not parallel. Concurrent probes against an unknown binary can contend for the
  // same lock, port, or config file, and a flaky observation is worse than a slow one.
  const observations: Observation[] = [];
  for (const { inv, purposes } of wanted.values()) {
    const o = await runProbe(target, inv, probeTimeoutMs);
    // Abort the whole run on the FIRST spawn failure. In practice that is the first probe —
    // a target either executes or it does not — and continuing would spend a dozen more
    // spawns to build a history of nothing, then certify it. Discovery's own `--help` probe
    // runs before this loop and fails silently to `helpReadable: false`; the first checker
    // probe is what turns that into an error the caller can act on.
    if (o.spawnFailed) throw new TargetNotExecutableError(target, o);
    observations.push({ ...o, purposes: [...purposes] });
  }

  return {
    target,
    discovery,
    observations,
    waived,
    byId: new Map(observations.map((o) => [o.id, o])),
  };
}
