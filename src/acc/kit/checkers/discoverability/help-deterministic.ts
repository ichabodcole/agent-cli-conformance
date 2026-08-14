import { findingFor } from "../../finding.ts";
import type { Checker, Finding, History, Invocation } from "../../types.ts";
import { findByPurpose } from "../../types.ts";

const RULE_ID = "D4";

const finding = findingFor(RULE_ID);

/** D4 — docs/wiki/rules/discoverability/help-output-is-deterministic.md */
export const helpDeterministicChecker: Checker = {
  ruleId: RULE_ID,
  rulePath: "docs/wiki/rules/discoverability/help-output-is-deterministic.md",
  tier: "core",
  probeLevel: "L0",

  // Two runs of the SAME invocation would be deduplicated by the runner (see record.ts), so
  // determinism is probed through a distinct env that must not affect help output.
  probes: (): Invocation[] => [
    { args: ["--help"], inertness: "help-path", purpose: "D4: help run A" },
    {
      args: ["--help"],
      env: { ACC_PROBE_NONCE: "1" },
      inertness: "help-path",
      purpose: "D4: help run B",
    },
  ],

  check: (h: History): Finding => {
    // findByPurpose, not array position: plain `--help` is also requested by C1, B2, D3, and
    // F1, so where this checker's own two runs land in `h.observations` isn't ours to predict.
    // Select each explicitly by whether it carries the nonce env, and guard for either being
    // absent rather than destructuring blind.
    const runs = findByPurpose(h, "D4:");
    const a = runs.find((o) => !o.invocation.env);
    const b = runs.find((o) => o.invocation.env);
    if (!a || !b) {
      return finding(
        "unverified",
        "fewer than two runs recorded",
        runs.map((o) => o.id),
      );
    }

    const evidence = [a.id, b.id];
    if (a.stdout === b.stdout) {
      return finding("pass", "help output identical across runs", evidence);
    }

    // Compare up to the shorter length so a length mismatch (one output is a truncated or
    // extended prefix of the other) still reports a real offset instead of -1.
    const minLen = Math.min(a.stdout.length, b.stdout.length);
    let firstDiff = minLen;
    for (let i = 0; i < minLen; i++) {
      if (a.stdout[i] !== b.stdout[i]) {
        firstDiff = i;
        break;
      }
    }

    return finding(
      "fail",
      // Report the DIFF location, not just the fact: a one-line delta containing a timestamp is
      // a different problem from wholesale reordering, and the fix differs accordingly.
      `help output differed between runs, first at byte ${firstDiff}`,
      evidence,
    );
  },
};
