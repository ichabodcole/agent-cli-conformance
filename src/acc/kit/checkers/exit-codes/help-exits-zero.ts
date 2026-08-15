import { crashedUnverified, findingFor, truncatedUnverified } from "../../finding.ts";
import { isFaultSignal } from "../../signals.ts";
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
  //
  // UNCHANGED by the signal split below, and the reason is the one G1's own list records: a gap
  // qualifies a PASS, and narrowing the crash exception did not move a single observation into
  // the pass branch. Help that ended on any signal, attributable or not, still never passes here
  // — it fails or it reports the gap. So there is no new hole in what a `pass` means, and none
  // of the three below closed.
  //
  // The fourth is a DETECTOR limit rather than a reach one (review R6-5), and it is the half of
  // the rule this file reads least carefully. "Write the help text to stdout" is asserted as
  // `stdout.trim() !== ""`, so a `--help` that exits 0 after printing a single character passes
  // the clause about help text. Recognising help as help needs a claim about what help looks
  // like that this kit does not have and would guess at badly.
  coverage: "partial",
  coverageGaps: [
    "nested help is not probed at L0",
    "a help subcommand is not probed",
    "appending --help to an otherwise complete invocation is not probed",
    "stdout is only required to be non-empty and is never checked to contain help text",
  ],
  coverageEstablished: [
    "root --help and root -h each exit 0 with non-empty stdout and neither hangs nor dies on a fault signal",
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

    // WHAT C1 OWNS, and what it does not, on the three ways a probe ends without an exit code.
    // HANGS: owned — a help path that never returns has not succeeded, and the deadline was
    // ours, imposed and observed. FAULT SIGNALS: owned, below — the fault is the target's own.
    // TRUNCATION: not owned — a target killed at the output limit was writing, not failing to,
    // and the exit code C1 turns on is one we prevented it from choosing. An AMBIGUOUS signal is
    // not owned either, for the truncation reason rather than the hang one: the event that ended
    // the probe is not the kit's to describe. See below.
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
      // THE EXCEPTION to `crashedUnverified` in the catalogue, and it is SCOPED to the signals
      // G1 is willing to attribute. A FAULT signal is the same sentence as the hang above
      // wearing a different ending: help that segfaulted has not succeeded, the fault is the
      // target's own, and that is a violation of the thing C1 asserts rather than a gap in the
      // evidence for it. An AMBIGUOUS one is not C1's to call — C1 cannot attribute what G1 has
      // just declined to attribute, and a `--help` an outer CI deadline killed is byte-for-byte
      // a `--help` a perfectly conforming tool would produce under that deadline.
      //
      // Failing on any signal is what this file used to do, and it is why the false positive
      // R6-2 identified survived the fix that was supposed to remove it: G1 stopped failing
      // SIGTERM and C1 carried on, so the report read "cannot attribute the signal" on one line
      // and "died on SIGTERM instead of exiting" on the next. Those cannot both stand.
      //
      // The exception stays one about SUCCESS — A1 and D2 assert that the tool REJECTED
      // something, and no signal is a rejection, so not even the fault half carries to them.
      //
      // Reported before the `exitCode !== 0` line rather than through it, because that line
      // would render as "exited null" — a status the target never chose, describing the wrong
      // event.
      if (o.crashed) {
        if (isFaultSignal(o.signal)) {
          problems.push(`${label} died on ${o.signal} instead of exiting`);
        }
        continue;
      }
      if (o.exitCode !== 0) problems.push(`${label} exited ${o.exitCode}`);
      if (o.stdout.trim() === "") problems.push(`${label} wrote nothing to stdout`);
    }

    // FAULT BEATS AMBIGUOUS, and the order carries the argument — the same precedence
    // `does-not-crash.ts` decides on one line earlier. An observed violation is a COMPLETED
    // observation of something the target did; a probe that ended on an unattributable signal is
    // a completed observation of something, with no way to say whose. The second does not undo
    // the first: help that exited 2 exited 2, whatever an outer deadline did to the other probe.
    if (problems.length) return finding("fail", problems.join("; "), evidence);

    // Reached only when nothing failed, so every crashed probe left here is an ambiguous one —
    // and this is deliberately the catalogue's own helper rather than a C1-shaped sentence. On
    // this class C1 has exactly the position the other eighteen rules have: the probe established
    // nothing. Called AFTER the loop rather than before it for the reason `truncatedUnverified`
    // is in the checkers that detect a violation first — an unverified probe cannot erase a
    // violation another probe already demonstrated.
    const crashed = crashedUnverified(finding, observed);
    if (crashed) return crashed;

    return finding("pass", "root --help and -h both exit 0 with non-empty stdout", evidence);
  },
};
