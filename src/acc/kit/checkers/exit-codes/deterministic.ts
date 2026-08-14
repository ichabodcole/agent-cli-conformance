import { findingFor } from "../../finding.ts";
import { SENTINEL } from "../../inert.ts";
import type { Checker, Finding, History, Invocation } from "../../types.ts";
import { findByPurpose } from "../../types.ts";

const RULE_ID = "C3";

const finding = findingFor(RULE_ID);

// Three textually distinct arg vectors, all semantically identical (unknown-flag usage errors),
// so the runner's dedup in record() does not collapse three "repeated" invocations into one
// recording — which would defeat the entire point of a determinism check.
const REPEATS = [1, 2, 3].map((n) => [`--${SENTINEL}-repeat-${n}`]);

/** C3 — docs/wiki/rules/exit-codes/exit-codes-are-deterministic.md */
export const deterministicChecker: Checker = {
  ruleId: RULE_ID,
  rulePath: "docs/wiki/rules/exit-codes/exit-codes-are-deterministic.md",
  tier: "core",

  probes: (): Invocation[] =>
    REPEATS.map((args, i) => ({
      args,
      inertness: "sentinel" as const,
      purpose: `C3: repeat ${i + 1}`,
    })),

  check: (h: History): Finding => {
    // findByPurpose, not findByArgs: each repeat's args are unique by construction, but staying
    // consistent with every other checker here avoids re-litigating which lookup is safe.
    const runs = findByPurpose(h, "C3:");
    if (runs.length < 3) {
      return finding("unverified", "fewer than three runs recorded", []);
    }

    const evidence = runs.map((o) => o.id);
    const codes = runs.map((o) => o.exitCode);
    return new Set(codes).size === 1
      ? finding(
          "pass",
          // Three runs is a smoke test, not proof. Report what was done, not what it implies.
          `three equivalent invocations all exited ${codes[0]}`,
          evidence,
        )
      : finding("fail", `exit codes varied: ${codes.join(",")}`, evidence);
  },
};
