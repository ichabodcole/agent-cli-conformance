import {
  crashedUnverified,
  findingFor,
  hungUnverified,
  truncatedUnverified,
} from "../../finding.ts";
import type { Checker, Finding, History, Invocation } from "../../types.ts";
import { findByPurpose } from "../../types.ts";

const RULE_ID = "F2";

const finding = findingFor(RULE_ID);

const THRESHOLD_MS = 100;
const RUNS = [1, 2, 3];

/** F2 — docs/wiki/rules/safety/first-byte-is-prompt.md (diagnostic) */
export const firstBytePromptChecker: Checker = {
  ruleId: RULE_ID,
  rulePath: "docs/wiki/rules/safety/first-byte-is-prompt.md",
  tier: "diagnostic",
  deviation: "design-choice",
  probeLevel: "L0",
  // The rule names three no-I/O commands and this times one of them. The other two clauses are
  // about commands that do work: a `stream` command's first record and per-record flush, and
  // the progress signal a long command owes stderr. Neither is inert, so neither is reachable
  // at L0 — and the timing table on the rule page is comparative on one machine, which is a
  // caveat about the THRESHOLD rather than about coverage and stays on the page.
  //
  // NOT among these, and deliberately not added: "the three runs do not share an environment".
  // They now do (see the probes below), so there is nothing to declare. A validity risk that has
  // been removed at the source is not a gap to publish — publishing it would be the same overclaim
  // in the other direction, a checker taking credit for admitting to a problem it no longer has.
  //
  // The fourth is the STATISTIC (review R6-5). The verdict is best-of-three, which is the right
  // reduction for the question "can this tool answer quickly" and the wrong one for "does it" —
  // a target that answers in 8ms once and 400ms twice passes on the 8. That is a deliberate
  // choice (a slow run usually measures the machine) and it narrows what the pass means, so it
  // is declared rather than defended in a comment alone.
  coverage: "partial",
  coverageGaps: [
    "only --version is timed and never help or an argument-validation failure",
    "the stream first-record and per-record flush requirement is not exercised",
    "the progress signal a long-running command owes stderr is not exercised",
    "the verdict is the fastest of three runs so a target that is usually slower still passes",
  ],
  coverageEstablished: [
    "the fastest of three --version runs with identical argv and identical environment emitted its first byte within 100 ms",
  ],

  probes: (): Invocation[] =>
    RUNS.map((n) => ({
      args: ["--version"],
      // A RECORDER-ONLY index, and the last of the three checkers to get one. `record()` dedups
      // on args + env + repeat, so three genuinely identical probes collapse into one recording
      // without something to tell them apart — and this used to be `env: { ACC_PROBE_TIMING: n }`,
      // which the target can read. F2 measures TIME, so the objection is not the one C3 and D4
      // had (a rule about the SAME invocation comparing two that differed); it is that the
      // instrument was perturbing the quantity it was measuring. An environment-sensitive target
      // — one that re-reads config when an unfamiliar variable appears, or logs it — could make
      // individual runs faster or slower in response to the recorder's own dedup workaround, and
      // best-of-N would then report a number about the workaround.
      //
      // `repeat` reaches `invocationId` and nothing the child observes: not argv, not the
      // environment. The three runs are byte-identical from the target's side, which is what
      // `fixtures/echoes-argv.ts` witnesses in this checker's tests.
      repeat: n,
      inertness: "help-path" as const,
      purpose: `F2: timing run ${n}`,
    })),

  check: (h: History): Finding => {
    // findByPurpose, not findByArgs: all three runs share `args: ["--version"]` with each
    // other and with D1's own `--version` probes — findByArgs would return whichever of those
    // recorded first, silently. That trap got sharper when the runs stopped differing by env:
    // nothing in `args` distinguishes them now, which is the whole design of `repeat`.
    const runs = findByPurpose(h, "F2:");
    if (runs.length === 0) return finding("unverified", "probes were not recorded", []);
    // ALL the runs must complete, not just enough of them to compute a number.
    //
    // Excluding the killed runs and reporting on the survivors read as `pass` on a history where
    // two of three probes never terminated — "first byte in 4ms (runs: 4ms)", with nothing said
    // about the other two. A process we killed may well have written a byte quickly and then
    // blocked forever, and F2's claim is about the run as a whole, so the survivors cannot carry
    // it alone. F2 is not one of the four rules that own hangs (see finding.ts): it says it
    // could not establish anything, and E1 reports the hang itself.
    const hung = hungUnverified(finding, runs);
    if (hung) return hung;
    // The first byte of a flooding run is real, but F2's claim is about the RUN, and a run we
    // killed at the ceiling did not complete — the same reason the partial-hang case above is
    // not averaged over its survivors.
    const cut = truncatedUnverified(finding, runs);
    if (cut) return cut;
    // The third way a run fails to complete, and the one that would score BEST: a target that
    // segfaults instantly writes its crash output — or nothing — in a millisecond or two, and
    // best-of-N is a floor, so one fast death sets the number for all three. F2's claim is about
    // how quickly a completed `--version` reaches its first byte; a run that ended in a signal
    // did not complete, exactly as the partial-hang case above did not.
    const crashed = crashedUnverified(finding, runs);
    if (crashed) return crashed;

    const times = runs.map((o) => o.timeToFirstByteMs).filter((t): t is number => t !== null);
    if (times.length === 0) {
      return finding(
        "unverified",
        "no timing was captured",
        runs.map((o) => o.id),
      );
    }

    const evidence = runs.map((o) => o.id);
    // Best-of-N, not the mean: the interesting number is the floor, since a slow run usually
    // measures the machine rather than the tool. The spread is reported because high variance
    // is itself a finding.
    const best = Math.min(...times);
    const detail = `--version first byte in ${best}ms (runs: ${times.join(", ")}ms)`;

    return best <= THRESHOLD_MS
      ? finding("pass", detail, evidence)
      : finding("fail", `${detail} — above the ${THRESHOLD_MS}ms guideline`, evidence);
  },
};
