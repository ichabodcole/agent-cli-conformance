import { findingFor } from "../../finding.ts";
import type { Checker, Finding, History, Invocation } from "../../types.ts";
import { findByPurpose } from "../../types.ts";

const RULE_ID = "C1";

const finding = findingFor(RULE_ID);

/** C1 — docs/wiki/rules/exit-codes/help-exits-zero.md */
export const helpExitsZeroChecker: Checker = {
  ruleId: RULE_ID,
  rulePath: "docs/wiki/rules/exit-codes/help-exits-zero.md",
  tier: "core",
  probeLevel: "L0",

  probes: (): Invocation[] => [
    { args: ["--help"], inertness: "help-path", purpose: "C1: --help" },
    { args: ["-h"], inertness: "help-path", purpose: "C1: -h" },
  ],

  check: (h: History): Finding => {
    // findByPurpose, not findByArgs: plain `--help` is also requested by B2, D3, F1, and (from
    // Task 9) D4 — which asks for it twice, under different env. findByArgs matches on args
    // alone, ignores env, and returns whichever recording happened to land first, so it can't
    // be trusted to find THIS checker's own probes among all the others sharing the same args.
    const observed = findByPurpose(h, "C1:");
    if (observed.length < 2) {
      return finding("unverified", "probes were not recorded", []);
    }

    const evidence = observed.map((o) => o.id);
    const problems: string[] = [];
    for (const o of observed) {
      const label = o.invocation.args.join(" ");
      if (o.timedOut) {
        problems.push(`${label} hung instead of exiting`);
        continue;
      }
      if (o.exitCode !== 0) problems.push(`${label} exited ${o.exitCode}`);
      if (o.stdout.trim() === "") problems.push(`${label} wrote nothing to stdout`);
    }

    return problems.length
      ? finding("fail", problems.join("; "), evidence)
      : finding("pass", "--help and -h both exit 0 with non-empty stdout", evidence);
  },
};
