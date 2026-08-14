import { findingFor } from "../../finding.ts";
import { SENTINEL } from "../../inert.ts";
import type { Checker, Finding, History, Invocation } from "../../types.ts";
import { findByPurpose } from "../../types.ts";

const RULE_ID = "C2";

const finding = findingFor(RULE_ID);

/** C2 — docs/wiki/rules/exit-codes/usage-errors-are-distinguishable.md */
export const usageDistinguishableChecker: Checker = {
  ruleId: RULE_ID,
  rulePath: "docs/wiki/rules/exit-codes/usage-errors-are-distinguishable.md",
  tier: "core",
  probeLevel: "L0",

  probes: (): Invocation[] => [
    { args: [`--${SENTINEL}-flag`], inertness: "sentinel", purpose: "C2: usage error via flag" },
    { args: [`${SENTINEL}-verb`], inertness: "sentinel", purpose: "C2: usage error via verb" },
  ],

  check: (h: History): Finding => {
    // findByPurpose, not an `invocation.purpose` scan: these probes are byte-identical to A1's,
    // A3's and B1's, so dedup in record() merges all four checkers' requests into one recording
    // per args, and `invocation.purpose` only ever holds the FIRST requester's reason.
    const recorded = findByPurpose(h, "C2:");
    if (recorded.length < 2) {
      return finding("unverified", "probes were not recorded", []);
    }

    // A hung probe WAS recorded — it just never returned a code to compare. Reporting that as
    // "not recorded" would conflate two different outcomes A1 and C1 both take care to keep
    // separate: missing evidence vs. evidence that says the target hung.
    const usage = recorded.filter((o) => !o.timedOut);
    if (usage.length < 2) {
      const timedOutCount = recorded.length - usage.length;
      return finding(
        "unverified",
        `${timedOutCount} of ${recorded.length} probes timed out instead of returning a usage error`,
        recorded.map((o) => o.id),
      );
    }

    const evidence = usage.map((o) => o.id);
    const codes = usage.map((o) => o.exitCode);

    if (codes.some((c) => c === 0)) {
      return finding("fail", `a usage error exited 0 (${codes.join(",")})`, evidence);
    }
    if (new Set(codes).size !== 1) {
      return finding(
        "fail",
        `the same error class produced different codes (${codes.join(",")})`,
        evidence,
      );
    }

    // Distinguishability from an INTERNAL fault cannot be established black-box: there is no
    // safe general way to provoke one in an arbitrary binary. Say so rather than implying the
    // full rule was checked — a `pass` that silently overclaims is the defect this project
    // exists to catch.
    return codes[0] === 2
      ? finding(
          "pass",
          "usage errors use exit 2 consistently; internal-fault contrast unverified at L0",
          evidence,
        )
      : finding(
          "unverified",
          `usage errors are consistent at exit ${codes[0]}, but not the declared 2, and no taxonomy was declared`,
          evidence,
        );
  },
};
