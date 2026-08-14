import type { Checker, Finding, Invocation, Verdict } from "../../types.ts";

const RULE_ID = "A4";

/** Every Finding this checker emits, so the rule id is written once rather than per branch. */
const finding = (verdict: Verdict, detail: string, evidence: string[]): Finding => ({
  ruleId: RULE_ID,
  verdict,
  detail,
  evidence,
});

/**
 * A4 — docs/wiki/rules/parsing/unexpected-positionals-rejected.md
 *
 * Declares no probes and always reports `unverified`. An earlier design probed
 * `[<real-subcommand>, <sentinel-extra>, <sentinel-extra>]`, but that carries a REAL verb — and
 * a CLI that ignores extra positionals (precisely the defect this rule exists to catch) will
 * run it for real. `inert.ts`'s "sentinel" class refuses this invocation for exactly that
 * reason: every non-flag token must itself contain the sentinel, and the subcommand doesn't.
 * Testing arity means actually invoking a subcommand, which is only safe once the kit knows
 * that command has no side effects — i.e. at L1 (after effect classification), not L0. This
 * rule moves to L1 accordingly (see the rule page); it is the sole checker with no pass/fail
 * case, because "cannot be probed at L0" is now its entire behaviour.
 */
export const unexpectedPositionalsChecker: Checker = {
  ruleId: RULE_ID,
  rulePath: "docs/wiki/rules/parsing/unexpected-positionals-rejected.md",
  tier: "core",

  probes: (): Invocation[] => [],
  check: (): Finding =>
    finding(
      "unverified",
      "arity cannot be probed at L0 — testing it requires running a real subcommand, which is only safe once the command has declared effects: read_only",
      [],
    ),
};
