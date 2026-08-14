import { discover } from "./discovery.ts";
import { invocationId, runProbe } from "./runner.ts";
import type { Checker, History, Invocation, Observation, TargetInfo } from "./types.ts";

/**
 * Phase one: run every probe any checker asked for, exactly once.
 *
 * Checkers declare what they need and never spawn anything themselves. That buys three things:
 * shared probes are recorded once rather than per-checker; a history can be stored and
 * re-checked against rules written later; and `check` stays a pure function, which is the only
 * reason the checker tests can be fast and deterministic.
 */
export async function record(target: TargetInfo, checkers: Checker[]): Promise<History> {
  const discovery = await discover(target);

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
    const o = await runProbe(target, inv);
    observations.push({ ...o, purposes: [...purposes] });
  }

  return {
    target,
    discovery,
    observations,
    byId: new Map(observations.map((o) => [o.id, o])),
  };
}
