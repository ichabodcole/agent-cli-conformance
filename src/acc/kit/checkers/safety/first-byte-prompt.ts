import { findingFor } from "../../finding.ts";
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
    const times = runs.map((o) => o.timeToFirstByteMs).filter((t): t is number => t !== null);
    if (times.length === 0) {
      return finding("unverified", "no timing was captured", []);
    }

    const evidence = runs.map((o) => o.id);
    // Best-of-N, not the mean: the interesting number is the floor, since a slow run usually
    // measures the machine rather than the tool. The spread is reported because high variance
    // is itself a finding.
    const best = Math.min(...times);
    const detail = `first byte in ${best}ms (runs: ${times.join(", ")}ms)`;

    return best <= THRESHOLD_MS
      ? finding("pass", detail, evidence)
      : finding("fail", `${detail} — above the ${THRESHOLD_MS}ms guideline`, evidence);
  },
};
