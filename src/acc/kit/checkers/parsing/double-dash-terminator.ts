import { findingFor } from "../../finding.ts";
import { SENTINEL } from "../../inert.ts";
import type { Checker, Finding, History, Invocation } from "../../types.ts";
import { findByArgs } from "../../types.ts";

const RULE_ID = "A6";
const ARGS = ["--", `--${SENTINEL}-value`];

const finding = findingFor(RULE_ID);

/**
 * A6 — docs/wiki/rules/parsing/double-dash-terminator.md (diagnostic)
 *
 * The probe leads with a bare `--` deliberately, rather than `[<verb>, "--", ...]`: a verb
 * here reopens the exact unsafe-real-verb problem the A2/A4 corrections closed — a target that
 * doesn't honour `--` would run that verb for real with the sentinel value as its argument.
 * (This is orthogonal to, and does not fix, the fact that Bun itself swallows a leading bare
 * `--` when interpreting a `.ts`/`.js` file directly — see this rule's `.test.ts` for how that
 * is worked around for OUR OWN fixtures; it does not affect probing a real target binary.)
 */
export const doubleDashTerminatorChecker: Checker = {
  ruleId: RULE_ID,
  rulePath: "docs/wiki/rules/parsing/double-dash-terminator.md",
  tier: "diagnostic",

  probes: (): Invocation[] => [
    { args: ARGS, inertness: "sentinel", purpose: "A6: `--` must end option parsing" },
  ],

  check: (h: History): Finding => {
    const o = findByArgs(h, ARGS);
    if (!o) return finding("unverified", "probe was not recorded", []);

    // Inverted assertion: after `--`, the token is a VALUE, so it must not be reported as an
    // unknown option. The command may still fail for other reasons (no verb given), which is
    // why the check reads stderr rather than the exit code.
    const treatedAsFlag = /unknown (option|flag)/i.test(o.stderr) && o.stderr.includes(SENTINEL);
    return treatedAsFlag
      ? finding("fail", "a value after `--` was still parsed as an option", [o.id])
      : finding("pass", "`--` ended option parsing", [o.id]);
  },
};
