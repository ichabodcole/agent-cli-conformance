import { SENTINEL } from "../../inert.ts";
import type { Checker, Finding, History, Invocation } from "../../types.ts";
import { findByArgs } from "../../types.ts";

const PROBE_ARGS = [`--${SENTINEL}-flag`];

/** A1 — docs/wiki/rules/parsing/unknown-flag-exits-nonzero.md */
export const unknownFlagChecker: Checker = {
  ruleId: "A1",
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
    if (!o) {
      return {
        ruleId: "A1",
        verdict: "unverified",
        detail: "probe was not recorded",
        evidence: [],
      };
    }
    if (o.timedOut) {
      return {
        ruleId: "A1",
        verdict: "fail",
        detail: "hung on an unknown flag instead of rejecting it",
        evidence: [o.id],
      };
    }

    const problems: string[] = [];
    if (o.exitCode === 0) problems.push("exit code was 0");
    if (o.stdout !== "") problems.push(`stdout was not empty (${o.stdout.length} bytes)`);
    if (!o.stderr.includes(SENTINEL)) problems.push("stderr did not name the offending flag");

    return problems.length
      ? { ruleId: "A1", verdict: "fail", detail: problems.join("; "), evidence: [o.id] }
      : {
          ruleId: "A1",
          verdict: "pass",
          detail: `rejected with exit ${o.exitCode}, stdout empty, flag named`,
          evidence: [o.id],
        };
  },
};
