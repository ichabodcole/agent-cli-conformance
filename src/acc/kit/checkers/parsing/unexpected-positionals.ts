import { findingFor } from "../../finding.ts";
import type { Checker, Finding, Invocation } from "../../types.ts";

const RULE_ID = "A4";

const finding = findingFor(RULE_ID);

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
  probeLevel: "L1",
  // The whole rule is the gap, which is the honest reading of a checker that declares no probes
  // and returns one fixed `unverified`. `coverage` describes what a PASS from this file would
  // mean, and there is no pass to describe yet — `complete` here would be a promise about an
  // L1 implementation that does not exist.
  coverage: "partial",
  coverageGaps: ["no probe is declared so nothing about arity is established"],
  coverageEstablished: [
    "nothing because no probe is declared and the verdict is always unverified so there is no pass to license anything",
  ],

  probes: (): Invocation[] => [],
  check: (): Finding =>
    finding(
      "unverified",
      "arity cannot be probed at L0 — testing it requires running a real subcommand, which is only safe once the command has declared effects: read_only",
      [],
    ),
};
