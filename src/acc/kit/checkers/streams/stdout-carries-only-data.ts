import { findingFor } from "../../finding.ts";
import { SENTINEL } from "../../inert.ts";
import type { Checker, Finding, History, Invocation } from "../../types.ts";
import { findByPurpose } from "../../types.ts";

const RULE_ID = "B1";

const finding = findingFor(RULE_ID);

/** B1 — docs/wiki/rules/streams/stdout-carries-only-data.md */
export const stdoutCarriesOnlyDataChecker: Checker = {
  ruleId: RULE_ID,
  rulePath: "docs/wiki/rules/streams/stdout-carries-only-data.md",
  tier: "core",

  probes: (): Invocation[] => [
    { args: [`--${SENTINEL}-flag`], inertness: "sentinel", purpose: "B1: failure via bad flag" },
    { args: [`${SENTINEL}-verb`], inertness: "sentinel", purpose: "B1: failure via bad verb" },
  ],

  check: (h: History): Finding => {
    // findByPurpose, not an `invocation.purpose` scan: these args are identical to A1's and
    // A3's probes, so dedup in record() merges all three checkers' requests into one recording
    // per args, and `invocation.purpose` only ever holds the FIRST requester's reason.
    const relevant = findByPurpose(h, "B1:");
    const failures = relevant.filter((o) => o.exitCode !== 0 && !o.timedOut);
    if (failures.length === 0) {
      return finding(
        "unverified",
        "no failing invocation was produced, so stdout could not be checked on failure",
        [],
      );
    }
    const polluted = failures.filter((o) => o.stdout !== "");
    return polluted.length
      ? finding(
          "fail",
          // The dangerous case: a consumer reading stdout receives an answer, not an error.
          `${polluted.length} failing invocation(s) wrote to stdout, e.g. ${JSON.stringify(polluted[0]?.stdout.slice(0, 40))}`,
          polluted.map((o) => o.id),
        )
      : finding(
          "pass",
          `stdout empty across ${failures.length} failing invocation(s)`,
          failures.map((o) => o.id),
        );
  },
};
