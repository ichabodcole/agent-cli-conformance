import { findingFor, hungUnverified, truncatedUnverified } from "../../finding.ts";
import { SENTINEL } from "../../inert.ts";
import type { Checker, Finding, History, Invocation } from "../../types.ts";
import { findByPurpose } from "../../types.ts";

const RULE_ID = "B1";

const finding = findingFor(RULE_ID);

/** B1 — docs/wiki/rules/streams/stdout-carries-only-data.md */
export const stdoutCarriesOnlyDataChecker: Checker = {
  ruleId: RULE_ID,
  rulePath: "docs/wiki/rules/streams/stdout-carries-only-data.md",
  tier: "core",
  probeLevel: "L0",
  // Both probes are usage errors, which is the cheapest failure to provoke and the least like
  // the one that matters: a command that half-completes and then writes a placeholder result is
  // the defect this rule names, and reaching it means running a real verb (L1). The rule's
  // first sentence — stdout carries the RESULT and nothing else — is about the success path,
  // which this checker never inspects at all.
  coverage: "partial",
  coverageGaps: [
    "only usage-error failures are probed and never a runtime failure",
    "stdout on a SUCCESSFUL command is never inspected for diagnostics",
  ],

  probes: (): Invocation[] => [
    { args: [`--${SENTINEL}-flag`], inertness: "sentinel", purpose: "B1: failure via bad flag" },
    { args: [`${SENTINEL}-verb`], inertness: "sentinel", purpose: "B1: failure via bad verb" },
  ],

  check: (h: History): Finding => {
    // findByPurpose, not an `invocation.purpose` scan: these args are identical to A1's and
    // A3's probes, so dedup in record() merges all three checkers' requests into one recording
    // per args, and `invocation.purpose` only ever holds the FIRST requester's reason.
    const relevant = findByPurpose(h, "B1:");
    // Checked before the exitCode filter below, which would silently drop hung probes and then
    // report on whatever remained. Every other checker in the catalogue answers a hang the
    // same way; B1 doing it by side effect made its verdict depend on how many probes hung.
    const hung = hungUnverified(finding, relevant);
    if (hung) return hung;
    // B1's subject is stdout ON FAILURE, and failure here means a non-zero exit code. A probe
    // killed at the output limit has `exitCode: null`, which the filter below would read as
    // "failed" — so a target we cut off would be judged against a failure it never declared.
    const cut = truncatedUnverified(finding, relevant);
    if (cut) return cut;

    const failures = relevant.filter((o) => o.exitCode !== 0);
    if (failures.length === 0) {
      return finding(
        "unverified",
        "no failing invocation was produced, so stdout could not be checked on failure",
        // Cite what WAS observed. An `unverified` with empty evidence reads as "nothing was
        // recorded", which is a different claim from "these probes ran and none of them failed".
        relevant.map((o) => o.id),
      );
    }
    const polluted = failures.filter((o) => o.stdout !== "");
    return polluted.length
      ? finding(
          "fail",
          // The dangerous case: a consumer reading stdout receives an answer, not an error.
          `${polluted.length} failing invocation(s) wrote to stdout, e.g. ${JSON.stringify(polluted[0]?.stdout.slice(0, 40))}`,
          polluted.map((o) => o.id),
        )
      : finding(
          "pass",
          `stdout empty across ${failures.length} failing invocation(s)`,
          failures.map((o) => o.id),
        );
  },
};
