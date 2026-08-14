import { findingFor, truncatedUnverified } from "../../finding.ts";
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
  probeLevel: "L0",
  // Every probe below is inert BY CONSTRUCTION, and an operation that genuinely requires a
  // decision is by definition not inert — so the paths where a CLI would actually prompt are
  // exactly the paths this checker is forbidden to reach at L0. Its pass detail already scopes
  // itself to "inert invocations" for that reason. The exit-8 clause needs one of those paths
  // to reach at all, and the EOF clause is invisible to a runner that only sees termination: a
  // CLI reading closed stdin as "yes" terminates just as promptly as one that refuses.
  coverage: "partial",
  coverageGaps: [
    "only inert paths are probed so a real confirmation path is never reached",
    "the structured confirmation_required response and its exit 8 are not established",
    "treating EOF or closed stdin as an answer is not detectable from termination alone",
  ],

  // The unknown-VERB probe is not decoration. E1 is the catalogue's backstop for hangs, and
  // the verb path is where an agent-facing CLI is most likely to block: a tool that "corrects"
  // an unrecognised verb and prompts to confirm blocks forever on exactly this shape and on no
  // other probe in this list. Its args are byte-identical to A2's and A3's, so record()'s
  // dedup merges them into one recording — the coverage is free, it is only the purpose that
  // is new. (The rule page has always listed this probe; the checker did not run it.)
  probes: (): Invocation[] => [
    { args: [], inertness: "bare", purpose: "E1: bare" },
    { args: ["--help"], inertness: "help-path", purpose: "E1: help" },
    { args: [`--${SENTINEL}-flag`], inertness: "sentinel", purpose: "E1: bad flag" },
    { args: [`${SENTINEL}-verb`], inertness: "sentinel", purpose: "E1: bad verb" },
  ],

  check: (h: History): Finding => {
    // findByPurpose, not findByArgs: the bare probe's args ([]) are also requested by D2, and
    // plain `--help` is requested by half the other checkers in the kit — findByArgs ignores
    // which checker asked and would return whichever recording landed first, silently.
    const runs = findByPurpose(h, "E1:");
    if (runs.length < 4) {
      return finding("unverified", "probes were not recorded", []);
    }

    // E1 owns hangs outright — see finding.ts's hungUnverified, which exists because the other
    // fifteen checkers must NOT read a hang as compliance. Here the hang is the finding.
    const hung = runs.filter((o) => o.timedOut);
    if (hung.length) {
      return finding(
        "fail",
        `${hung.length} of ${runs.length} invocation(s) never terminated with stdin closed`,
        hung.map((o) => o.id),
      );
    }
    // Checked after the hang and before the pass. A probe killed at the output limit did not
    // block — it was writing — so it is not E1's violation; but neither did it TERMINATE, which
    // is exactly what E1's pass claims. The honest answer is that we ended it before it answered.
    const cut = truncatedUnverified(finding, runs);
    if (cut) return cut;

    return finding(
      "pass",
      // Named, not counted: E1 only ever probes inert paths, so "all 4 terminated" must not
      // be read as a claim about commands that legitimately prompt (that is L2 work).
      `all ${runs.length} inert invocation(s) terminated (bare, --help, unknown flag, unknown verb)`,
      runs.map((o) => o.id),
    );
  },
};
