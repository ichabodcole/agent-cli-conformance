import {
  crashedUnverified,
  findingFor,
  hungUnverified,
  truncatedUnverified,
} from "../../finding.ts";
import type { Checker, Finding, History, Invocation } from "../../types.ts";
import { findByPurpose } from "../../types.ts";

const RULE_ID = "F2";

const finding = findingFor(RULE_ID);

const THRESHOLD_MS = 100;
const RUNS = [1, 2, 3];

/** F2 — docs/wiki/rules/safety/first-byte-is-prompt.md (diagnostic) */
export const firstBytePromptChecker: Checker = {
  ruleId: RULE_ID,
  rulePath: "docs/wiki/rules/safety/first-byte-is-prompt.md",
  tier: "diagnostic",
  probeLevel: "L0",
  // The rule names three no-I/O commands and this times one of them. The other two clauses are
  // about commands that do work: a `stream` command's first record and per-record flush, and
  // the progress signal a long command owes stderr. Neither is inert, so neither is reachable
  // at L0 — and the timing table on the rule page is comparative on one machine, which is a
  // caveat about the THRESHOLD rather than about coverage and stays on the page.
  coverage: "partial",
  coverageGaps: [
    "only --version is timed and never help or an argument-validation failure",
    "the stream first-record and per-record flush requirement is not exercised",
    "the progress signal a long-running command owes stderr is not exercised",
  ],

  probes: (): Invocation[] =>
    RUNS.map((n) => ({
      args: ["--version"],
      // Distinct env per run, purely so record()'s dedup (keyed on args + env) can't collapse
      // three "repeated" invocations into one recording — same trick D4 uses with
      // ACC_PROBE_NONCE. The target never reads this; it exists only to make the id differ.
      env: { ACC_PROBE_TIMING: String(n) },
      inertness: "help-path" as const,
      purpose: `F2: timing run ${n}`,
    })),

  check: (h: History): Finding => {
    // findByPurpose, not findByArgs: all three runs share `args: ["--version"]` with each
    // other and with D1's own `--version` probes — findByArgs would return whichever of those
    // recorded first, silently.
    const runs = findByPurpose(h, "F2:");
    if (runs.length === 0) return finding("unverified", "probes were not recorded", []);
    // ALL the runs must complete, not just enough of them to compute a number.
    //
    // Excluding the killed runs and reporting on the survivors read as `pass` on a history where
    // two of three probes never terminated — "first byte in 4ms (runs: 4ms)", with nothing said
    // about the other two. A process we killed may well have written a byte quickly and then
    // blocked forever, and F2's claim is about the run as a whole, so the survivors cannot carry
    // it alone. F2 is not one of the four rules that own hangs (see finding.ts): it says it
    // could not establish anything, and E1 reports the hang itself.
    const hung = hungUnverified(finding, runs);
    if (hung) return hung;
    // The first byte of a flooding run is real, but F2's claim is about the RUN, and a run we
    // killed at the ceiling did not complete — the same reason the partial-hang case above is
    // not averaged over its survivors.
    const cut = truncatedUnverified(finding, runs);
    if (cut) return cut;
    // The third way a run fails to complete, and the one that would score BEST: a target that
    // segfaults instantly writes its crash output — or nothing — in a millisecond or two, and
    // best-of-N is a floor, so one fast death sets the number for all three. F2's claim is about
    // how quickly a completed `--version` reaches its first byte; a run that ended in a signal
    // did not complete, exactly as the partial-hang case above did not.
    const crashed = crashedUnverified(finding, runs);
    if (crashed) return crashed;

    const times = runs.map((o) => o.timeToFirstByteMs).filter((t): t is number => t !== null);
    if (times.length === 0) {
      return finding(
        "unverified",
        "no timing was captured",
        runs.map((o) => o.id),
      );
    }

    const evidence = runs.map((o) => o.id);
    // Best-of-N, not the mean: the interesting number is the floor, since a slow run usually
    // measures the machine rather than the tool. The spread is reported because high variance
    // is itself a finding.
    const best = Math.min(...times);
    const detail = `--version first byte in ${best}ms (runs: ${times.join(", ")}ms)`;

    return best <= THRESHOLD_MS
      ? finding("pass", detail, evidence)
      : finding("fail", `${detail} — above the ${THRESHOLD_MS}ms guideline`, evidence);
  },
};
