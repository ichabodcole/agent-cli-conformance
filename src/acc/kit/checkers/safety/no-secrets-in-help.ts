import { findingFor, hungUnverified } from "../../finding.ts";
import type { Checker, Finding, History, Invocation } from "../../types.ts";
import { findByPurpose } from "../../types.ts";

const RULE_ID = "F1";

const finding = findingFor(RULE_ID);

const PATTERNS: Array<[label: string, re: RegExp]> = [
  ["OpenAI-style key", /\bsk-[A-Za-z0-9]{16,}/],
  ["GitHub token", /\bghp_[A-Za-z0-9]{20,}/],
  ["Slack token", /\bxox[baprs]-[A-Za-z0-9-]{10,}/],
  ["AWS access key", /\bAKIA[0-9A-Z]{16}\b/],
  ["private key block", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["JWT", /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\./],
  ["password in a URL", /[a-z][a-z0-9+.-]*:\/\/[^\s:@/]+:[^\s@/]+@/i],
];

/** F1 — docs/wiki/rules/safety/no-secrets-in-help-or-schema.md */
export const noSecretsInHelpChecker: Checker = {
  ruleId: RULE_ID,
  rulePath: "docs/wiki/rules/safety/no-secrets-in-help-or-schema.md",
  tier: "core",
  probeLevel: "L0",

  probes: (): Invocation[] => [
    { args: ["--help"], inertness: "help-path", purpose: "F1: scan help" },
  ],

  check: (h: History): Finding => {
    // findByPurpose, not findByArgs: plain `--help` is also requested by C1, B2, D3, D4, and
    // E1, so findByArgs (which ignores which checker asked) could resolve to any of theirs.
    const runs = findByPurpose(h, "F1:");
    const o = runs[0];
    if (!o) {
      return finding("unverified", "probe was not recorded", []);
    }
    // Scanning the empty output of a killed process finds no credentials, which is true and
    // worthless. F1 is already careful not to overclaim from a clean scan; claiming one from
    // text that was never produced is the same error one step earlier.
    const hung = hungUnverified(finding, [o]);
    if (hung) return hung;

    const text = `${o.stdout}\n${o.stderr}`;
    const hits = PATTERNS.filter(([, re]) => re.test(text)).map(([label]) => label);

    return hits.length
      ? finding("fail", `credential pattern(s) in help: ${hits.join(", ")}`, [o.id])
      : finding(
          "pass",
          // Honest about scope: a scanner cannot see a bespoke token format with no telltale
          // prefix. "no secrets present" would be an overclaim this checker cannot back.
          "no KNOWN credential pattern found (absence of a known pattern, not proof)",
          [o.id],
        );
  },
};
