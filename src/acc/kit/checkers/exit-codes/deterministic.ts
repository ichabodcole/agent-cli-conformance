import { crashedUnverified, findingFor, truncatedUnverified } from "../../finding.ts";
import { SENTINEL } from "../../inert.ts";
import type { Checker, Finding, History, Invocation } from "../../types.ts";
import { findByPurpose } from "../../types.ts";

const RULE_ID = "C3";

const finding = findingFor(RULE_ID);

// ONE arg vector, run three times. The rule is "the SAME invocation, against unchanged state,
// produces the same exit code", so the probe has to actually repeat an invocation.
//
// It used to be three textually DIFFERENT flags (`--<sentinel>-repeat-1/-2/-3`), because
// record()'s dedup is keyed on the invocation id and three identical probes collapsed into one
// recording. That measured agreement across three equivalent usage errors, which is a different
// claim in both directions: a parser that hashed the offending token into its exit code would
// fail it deterministically, and a parser genuinely nondeterministic on repeated identical
// input would pass it (review R3-5). `Invocation.repeat` is the fix — a recorder-only index
// that distinguishes the ids without reaching the target's argv or environment.
const ARGS = [`--${SENTINEL}-flag`];
const REPEATS = [1, 2, 3];

/** C3 — docs/wiki/rules/exit-codes/exit-codes-are-deterministic.md */
export const deterministicChecker: Checker = {
  ruleId: RULE_ID,
  rulePath: "docs/wiki/rules/exit-codes/exit-codes-are-deterministic.md",
  tier: "core",
  probeLevel: "L0",
  // The probe now repeats one invocation, so "three distinct flags are compared" is no longer
  // a gap. What remains is scope: one inert invocation shape, three times, which is a smoke
  // test rather than proof — and the rule's second sentence, about declaring an intermittent
  // failure as its own `retryable` code, needs a declaration the target has no way to make at
  // L0.
  //
  // The last two are where the repetition HAPPENS (review R6-5). "The same invocation" is
  // universal over invocations, and the one repeated here is a usage error — so a target whose
  // SUCCESS path returns 0 or 1 depending on a cache, a clock or a resolved config is
  // deterministic as far as C3 can see. And the three runs land within milliseconds of each
  // other in one process's lifetime, which is the interval least likely to expose the drift the
  // rule is about: a code that changes at a date boundary or after a first-run initialisation is
  // stable across three adjacent runs by construction.
  coverage: "partial",
  coverageGaps: [
    "only one usage-error invocation shape is repeated and only three times",
    "unchanged state is assumed rather than established",
    "the retryable declaration for genuinely intermittent failures is not exercised",
    "only a usage-error path is repeated so a success path or a real command is never compared",
    "the three runs land within milliseconds of each other so variation that appears only over a longer interval is invisible",
  ],

  probes: (): Invocation[] =>
    REPEATS.map((n) => ({
      args: ARGS,
      repeat: n,
      inertness: "sentinel" as const,
      purpose: `C3: repeat ${n}`,
    })),

  check: (h: History): Finding => {
    // findByPurpose is now REQUIRED, not a stylistic preference: all three repeats share one
    // args vector with each other (and with A1's, A3's, B1's and C2's probes), and findByArgs
    // matches on args while ignoring both env and repeat — it would return exactly one
    // recording where three are needed. See types.ts's doc comment on findByArgs.
    const runs = findByPurpose(h, "C3:");
    if (runs.length < 3) {
      return finding("unverified", "fewer than three runs recorded", []);
    }

    const evidence = runs.map((o) => o.id);

    // Same shape as the timeout below, same reason: a run killed at the output limit reports
    // `exitCode: null`, and three nulls agree with each other perfectly while establishing
    // nothing about determinism.
    const cut = truncatedUnverified(finding, runs);
    if (cut) return cut;
    // And the third way to get three agreeing nulls: three runs that each died on a signal. This
    // one is the most persuasive-looking of the three, because a target that crashes reliably IS
    // deterministic — just not in the exit code, which is the only thing C3 is entitled to talk
    // about. `three identical invocations all exited null` was one of the nine false passes.
    const crashed = crashedUnverified(finding, runs);
    if (crashed) return crashed;

    // A timed-out run has no exit code to compare — `exitCode` is null because we killed it, not
    // because the target chose that status. Comparing nulls would let three timeouts read as
    // "all agreed", which is not evidence of determinism; it's evidence the tool hung on a
    // deliberately-invalid flag. That hang IS a real defect, but it's E1's finding, not C3's —
    // E1 probes for exactly this. C3's job is narrower: does the exit code vary. When it can't
    // see one, it says so rather than fabricating agreement out of absence.
    const timedOut = runs.filter((o) => o.timedOut);
    if (timedOut.length > 0) {
      return finding(
        "unverified",
        `could not compare exit codes: ${timedOut.length} of ${runs.length} runs timed out`,
        evidence,
      );
    }

    const codes = runs.map((o) => o.exitCode);
    return new Set(codes).size === 1
      ? finding(
          "pass",
          // Three runs is a smoke test, not proof. Report what was done, not what it implies —
          // and say IDENTICAL, because "equivalent" is what this probe used to measure and the
          // two words name different claims.
          `three identical invocations all exited ${codes[0]}`,
          evidence,
        )
      : finding("fail", `exit codes varied: ${codes.join(",")}`, evidence);
  },
};
