import { findingFor } from "../../finding.ts";
import type { Checker, Finding, History, Invocation } from "../../types.ts";
import { findByPurpose } from "../../types.ts";

const RULE_ID = "D1";

const finding = findingFor(RULE_ID);

/** D1 — docs/wiki/rules/discoverability/version-flag-exists.md */
export const versionFlagChecker: Checker = {
  ruleId: RULE_ID,
  rulePath: "docs/wiki/rules/discoverability/version-flag-exists.md",
  tier: "core",

  probes: (): Invocation[] => [
    { args: ["--version"], inertness: "help-path", purpose: "D1: --version" },
    {
      args: ["--version"],
      // Same args, hostile env: verifies the no-configuration requirement. The runner's id
      // incorporates env, so this is a distinct recording, not a dedup collision with the plain
      // probe above.
      env: { HOME: "/nonexistent-acc-probe", XDG_CONFIG_HOME: "/nonexistent-acc-probe" },
      inertness: "help-path",
      purpose: "D1: --version with no usable HOME",
    },
  ],

  check: (h: History): Finding => {
    // findByPurpose, not findByArgs: both probes share args (["--version"]) and differ only by
    // env, which findByArgs ignores — it would return whichever recorded first, silently
    // collapsing the exact pair this checker exists to tell apart.
    const runs = findByPurpose(h, "D1:");
    const plain = runs.find((o) => !o.invocation.env);
    const hostile = runs.find((o) => o.invocation.env);
    if (!plain) {
      return finding("unverified", "probe was not recorded", []);
    }

    const evidence = runs.map((o) => o.id);
    const problems: string[] = [];
    if (plain.exitCode !== 0) problems.push(`--version exited ${plain.exitCode}`);
    if (plain.stdout.trim() === "") problems.push("--version wrote nothing to stdout");
    // Guarded: if the hostile probe wasn't recorded for some reason, the plain result still
    // stands on its own rather than silently failing open.
    if (hostile && hostile.exitCode !== 0) {
      problems.push("--version requires configuration (failed with an unusable HOME)");
    }

    return problems.length
      ? finding("fail", problems.join("; "), evidence)
      : finding("pass", "version reported with no configuration", evidence);
  },
};
