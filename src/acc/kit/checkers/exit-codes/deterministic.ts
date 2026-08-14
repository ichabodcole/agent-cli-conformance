import { findingFor, truncatedUnverified } from "../../finding.ts";
import { SENTINEL } from "../../inert.ts";
import type { Checker, Finding, History, Invocation } from "../../types.ts";
import { findByPurpose } from "../../types.ts";

const RULE_ID = "C3";

const finding = findingFor(RULE_ID);

// Three textually distinct arg vectors, all semantically identical (unknown-flag usage errors),
// so the runner's dedup in record() does not collapse three "repeated" invocations into one
// recording — which would defeat the entire point of a determinism check.
const REPEATS = [1, 2, 3].map((n) => [`--${SENTINEL}-repeat-${n}`]);

/** C3 — docs/wiki/rules/exit-codes/exit-codes-are-deterministic.md */
export const deterministicChecker: Checker = {
  ruleId: RULE_ID,
  rulePath: "docs/wiki/rules/exit-codes/exit-codes-are-deterministic.md",
  tier: "core",
  probeLevel: "L0",

  probes: (): Invocation[] =>
    REPEATS.map((args, i) => ({
      args,
      inertness: "sentinel" as const,
      purpose: `C3: repeat ${i + 1}`,
    })),

  check: (h: History): Finding => {
    // findByPurpose, not findByArgs: each repeat's args are unique by construction, but staying
    // consistent with every other checker here avoids re-litigating which lookup is safe.
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
          // Three runs is a smoke test, not proof. Report what was done, not what it implies.
          `three equivalent invocations all exited ${codes[0]}`,
          evidence,
        )
      : finding("fail", `exit codes varied: ${codes.join(",")}`, evidence);
  },
};
