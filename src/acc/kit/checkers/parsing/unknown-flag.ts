import { SENTINEL } from "../../inert.ts";
import type { Checker, Finding, History, Invocation, Verdict } from "../../types.ts";
import { findByArgs } from "../../types.ts";

const RULE_ID = "A1";
const PROBE_ARGS = [`--${SENTINEL}-flag`];

/** Every Finding this checker emits, so the rule id is written once rather than per branch. */
const finding = (verdict: Verdict, detail: string, evidence: string[]): Finding => ({
  ruleId: RULE_ID,
  verdict,
  detail,
  evidence,
});

/** A1 — docs/wiki/rules/parsing/unknown-flag-exits-nonzero.md */
export const unknownFlagChecker: Checker = {
  ruleId: RULE_ID,
  rulePath: "docs/wiki/rules/parsing/unknown-flag-exits-nonzero.md",
  tier: "core",

  probes: (): Invocation[] => [
    {
      args: PROBE_ARGS,
      inertness: "sentinel",
      purpose: "A1: an unrecognised flag must be rejected",
    },
  ],

  check: (h: History): Finding => {
    const o = findByArgs(h, PROBE_ARGS);
    if (!o) return finding("unverified", "probe was not recorded", []);
    if (o.timedOut) {
      return finding("fail", "hung on an unknown flag instead of rejecting it", [o.id]);
    }

    const problems: string[] = [];
    if (o.exitCode === 0) problems.push("exit code was 0");
    if (o.stdout !== "") problems.push(`stdout was not empty (${o.stdout.length} bytes)`);
    if (!o.stderr.includes(SENTINEL)) problems.push("stderr did not name the offending flag");

    return problems.length
      ? finding("fail", problems.join("; "), [o.id])
      : finding("pass", `rejected with exit ${o.exitCode}, stdout empty, flag named`, [o.id]);
  },
};
