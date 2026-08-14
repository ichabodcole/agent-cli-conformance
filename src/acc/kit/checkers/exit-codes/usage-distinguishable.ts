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

  probes: (): Invocation[] => [
    { args: [`--${SENTINEL}-flag`], inertness: "sentinel", purpose: "C2: usage error via flag" },
    { args: [`${SENTINEL}-verb`], inertness: "sentinel", purpose: "C2: usage error via verb" },
  ],

  check: (h: History): Finding => {
    // findByPurpose, not an `invocation.purpose` scan: these probes are byte-identical to A1's,
    // A3's and B1's, so dedup in record() merges all four checkers' requests into one recording
    // per args, and `invocation.purpose` only ever holds the FIRST requester's reason.
    const usage = findByPurpose(h, "C2:").filter((o) => !o.timedOut);
    if (usage.length < 2) {
      return finding("unverified", "probes were not recorded", []);
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
