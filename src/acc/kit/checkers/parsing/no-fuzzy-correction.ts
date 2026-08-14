import { findingFor } from "../../finding.ts";
import type { Checker, Discovery, Finding, History, Invocation } from "../../types.ts";
import { findByPurpose } from "../../types.ts";

const RULE_ID = "A5";

const finding = findingFor(RULE_ID);

/** Drop one character — the edit a fuzzy matcher is most likely to "fix". */
function nearMiss(token: string): string {
  const body = token.replace(/^-+/, "");
  const dashes = token.slice(0, token.length - body.length);
  return `${dashes}${body.slice(0, 2)}${body.slice(3)}`;
}

/** A5 — docs/wiki/rules/parsing/no-fuzzy-auto-correction.md */
export const noFuzzyCorrectionChecker: Checker = {
  ruleId: RULE_ID,
  rulePath: "docs/wiki/rules/parsing/no-fuzzy-auto-correction.md",
  tier: "core",
  probeLevel: "L0",

  probes: (d: Discovery): Invocation[] => {
    // Only flags, and only at root with no verb: a near-miss VERB could be corrected into a
    // real command that does real work, which is not inert.
    const flag = d.flags.find((f) => f.length > 5 && f !== "--help" && f !== "--version");
    if (!flag) return [];
    const typo = nearMiss(flag);
    if (d.flags.includes(typo)) return []; // the "typo" is a real flag; not a probe
    return [{ args: [typo], inertness: "no-verb", purpose: `A5: near-miss of ${flag}` }];
  },

  check: (h: History): Finding => {
    // findByPurpose, not findByArgs: dedup can merge this probe's recording with another
    // checker's request for the identical args, which would leave `invocation.purpose` set to
    // whichever checker asked first — findByArgs can't be trusted to find THIS checker's probe.
    const [o] = findByPurpose(h, "A5:");
    if (!o) {
      return finding("unverified", "no suitable flag was discovered to build a near-miss from", []);
    }
    return o.exitCode === 0
      ? finding(
          "fail",
          `a near-miss flag was accepted at exit 0 (${o.invocation.args.join(" ")})`,
          [o.id],
        )
      : finding("pass", `near-miss rejected with exit ${o.exitCode}`, [o.id]);
  },
};
