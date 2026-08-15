import { findingFor, truncatedUnverified } from "../../finding.ts";
import type { Checker, Finding, History, Invocation } from "../../types.ts";
import { findByPurpose } from "../../types.ts";

const RULE_ID = "C1";

const finding = findingFor(RULE_ID);

/** C1 — docs/wiki/rules/exit-codes/help-exits-zero.md */
export const helpExitsZeroChecker: Checker = {
  ruleId: RULE_ID,
  rulePath: "docs/wiki/rules/exit-codes/help-exits-zero.md",
  tier: "core",
  probeLevel: "L0",
  // Two of the rule's three sentences are about reach, and both need a real verb in the argv.
  // "At every level" means `<cli> <group> --help`, and "regardless of what else is on the
  // command line" means appending `--help` to an otherwise complete invocation — a CLI that
  // ignores the flag then runs that invocation for real, which is the L1 boundary A2 and A4
  // ran into first. A bare `help` subcommand is the same problem: `Discovery` cannot tell a
  // help verb from any other verb before running it.
  coverage: "partial",
  coverageGaps: [
    "nested help is not probed at L0",
    "a help subcommand is not probed",
    "appending --help to an otherwise complete invocation is not probed",
  ],

  probes: (): Invocation[] => [
    { args: ["--help"], inertness: "help-path", purpose: "C1: --help" },
    { args: ["-h"], inertness: "help-path", purpose: "C1: -h" },
  ],

  check: (h: History): Finding => {
    // findByPurpose, not findByArgs: plain `--help` is also requested by B2, D3, F1, and (from
    // Task 9) D4 — which asks for it twice, under different env. findByArgs matches on args
    // alone, ignores env, and returns whichever recording happened to land first, so it can't
    // be trusted to find THIS checker's own probes among all the others sharing the same args.
    const observed = findByPurpose(h, "C1:");
    if (observed.length < 2) {
      return finding("unverified", "probes were not recorded", []);
    }

    // C1 owns HANGS (a help path that never returns has not succeeded) but not truncation: a
    // target killed at the output limit was writing, not failing to, and the exit code C1 turns
    // on is one we prevented it from choosing.
    const cut = truncatedUnverified(finding, observed);
    if (cut) return cut;

    const evidence = observed.map((o) => o.id);
    const problems: string[] = [];
    for (const o of observed) {
      const label = o.invocation.args.join(" ");
      // One of the four deliberate exceptions to `hungUnverified` (see finding.ts). C1's rule
      // is "help is a request, and it SUCCEEDS" — a help path that never returns has
      // definitively not succeeded, so this is a violation, not an inconclusive probe. The
      // catalogue-wide invariant is only that a timeout never yields a PASS; it does not
      // require every rule to go silent on one.
      if (o.timedOut) {
        problems.push(`${label} hung instead of exiting`);
        continue;
      }
      // THE ONE EXCEPTION to `crashedUnverified` in the catalogue, and it is the same sentence
      // as the hang above wearing a different ending: help that dies on a signal has not
      // succeeded. That is a violation of the thing C1 asserts, not a gap in the evidence for
      // it, so this reports `fail` where the other eighteen report `unverified`. It stays an
      // exception about SUCCESS — A1 and D2 assert that the tool REJECTED something, and a
      // crash is not a rejection, so the same reasoning does not carry to them.
      //
      // Reported before the `exitCode !== 0` line rather than through it, because that line
      // would render as "exited null" — a status the target never chose, describing the wrong
      // event.
      if (o.crashed) {
        problems.push(`${label} died on ${o.signal} instead of exiting`);
        continue;
      }
      if (o.exitCode !== 0) problems.push(`${label} exited ${o.exitCode}`);
      if (o.stdout.trim() === "") problems.push(`${label} wrote nothing to stdout`);
    }

    return problems.length
      ? finding("fail", problems.join("; "), evidence)
      : finding("pass", "root --help and -h both exit 0 with non-empty stdout", evidence);
  },
};
