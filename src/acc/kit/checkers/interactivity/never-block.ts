import { findingFor } from "../../finding.ts";
import { SENTINEL } from "../../inert.ts";
import type { Checker, Finding, History, Invocation } from "../../types.ts";
import { findByPurpose } from "../../types.ts";

const RULE_ID = "E1";

const finding = findingFor(RULE_ID);

/**
 * E1 — docs/wiki/rules/interactivity/never-block-without-a-tty.md
 *
 * The bare probe MUST claim `bare`, not `no-verb`: `no-verb` (see inert.ts) requires a
 * NON-EMPTY array of flag-only tokens, precisely so an empty array can't satisfy it vacuously —
 * and this probe's `args` IS the empty array. Claiming `no-verb` here would make
 * `classifyInertness` refuse the probe, `assertInert` throw, and `record()` abort the entire
 * run before any checker got to report anything. `bare` is the class built for exactly this.
 */
export const neverBlockChecker: Checker = {
  ruleId: RULE_ID,
  rulePath: "docs/wiki/rules/interactivity/never-block-without-a-tty.md",
  tier: "core",

  probes: (): Invocation[] => [
    { args: [], inertness: "bare", purpose: "E1: bare" },
    { args: ["--help"], inertness: "help-path", purpose: "E1: help" },
    { args: [`--${SENTINEL}-flag`], inertness: "sentinel", purpose: "E1: bad flag" },
  ],

  check: (h: History): Finding => {
    // findByPurpose, not findByArgs: the bare probe's args ([]) are also requested by D2, and
    // plain `--help` is requested by half the other checkers in the kit — findByArgs ignores
    // which checker asked and would return whichever recording landed first, silently.
    const runs = findByPurpose(h, "E1:");
    if (runs.length < 3) {
      return finding("unverified", "probes were not recorded", []);
    }

    const hung = runs.filter((o) => o.timedOut);
    return hung.length
      ? finding(
          "fail",
          `${hung.length} of ${runs.length} invocation(s) never terminated with stdin closed`,
          hung.map((o) => o.id),
        )
      : finding(
          "pass",
          `all ${runs.length} invocation(s) terminated`,
          runs.map((o) => o.id),
        );
  },
};
