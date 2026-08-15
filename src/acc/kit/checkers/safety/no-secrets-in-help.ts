import { findingFor, hungUnverified, truncatedUnverified } from "../../finding.ts";
import type { Checker, Finding, History, Invocation } from "../../types.ts";
import { findByPurpose } from "../../types.ts";

const RULE_ID = "F1";

const finding = findingFor(RULE_ID);

/**
 * The seven known credential shapes F1 scans for.
 *
 * Exported because `src/acc/conformance.test.ts` builds its own dogfood canary on top of this
 * list rather than beside it. A second hand-written copy of these patterns is what produced the
 * `risk-reduced` false positive: the shadow list had `sk-` with neither a word boundary nor a
 * length floor, so it fired on ordinary English while the shipped list — anchored, with floors —
 * did not. One definition, extended where the canary is deliberately wider.
 *
 * Every alternative is anchored (`\b`, or a literal that cannot occur by accident) AND carries a
 * length floor. Both, not either: `\bsk-` alone still matches "risk-" nowhere but matches
 * "sk-tools" everywhere, and a floor alone matches inside a longer word.
 */
export const CREDENTIAL_PATTERNS: Array<[label: string, re: RegExp]> = [
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
  // The rule names three surfaces — help, schema output, error messages — and one probe reads
  // the first. `schema` is a verb this kit will not invoke blind at L0, and the error surface
  // would need a credential to echo back before it could echo one. The pattern list above is
  // seven known shapes, which is already scoped in the pass detail ("absence of a known
  // pattern, not proof"); a flag default is invisible for a different reason — help prints the
  // default only if the CLI chooses to.
  coverage: "partial",
  coverageGaps: [
    "only root help is scanned and never schema output or error messages",
    "only seven known credential shapes are matched so a bespoke token is invisible",
    "a secret carried as a flag default is only seen if help prints defaults",
  ],

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
    const hits = CREDENTIAL_PATTERNS.filter(([, re]) => re.test(text)).map(([label]) => label);

    // Scanned BEFORE the truncation guard: a credential printed in the captured prefix has
    // already leaked, whatever the bytes we refused would have said. The clean result is the one
    // a prefix cannot carry — this checker's pass is already scoped to "no KNOWN pattern", and
    // "in the part we read" is a second qualifier it must not swallow silently.
    if (hits.length) {
      return finding("fail", `credential pattern(s) in help: ${hits.join(", ")}`, [o.id]);
    }
    const cut = truncatedUnverified(finding, [o]);
    if (cut) return cut;

    return finding(
      "pass",
      // Honest about scope: a scanner cannot see a bespoke token format with no telltale
      // prefix. "no secrets present" would be an overclaim this checker cannot back.
      "no KNOWN credential pattern in root help (absence of a known pattern, not proof)",
      [o.id],
    );
  },
};
