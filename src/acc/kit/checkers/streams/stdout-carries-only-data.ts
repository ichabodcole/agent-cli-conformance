import {
  crashedUnverified,
  findingFor,
  hungUnverified,
  truncatedUnverified,
} from "../../finding.ts";
import { SENTINEL } from "../../inert.ts";
import { machineErrorArgs, machineSelector } from "../../machine-mode.ts";
import type { Checker, Discovery, Finding, History, Invocation } from "../../types.ts";
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
  //
  // The third is what an empty stdout does NOT establish (review R6-5). The rule has two halves
  // and only one of them is an absence: "stdout MUST be empty on failure" is tested,
  // "diagnostics MUST go to stderr" is not, so a target that fails in total silence — nothing on
  // either stream — is scored identically to one that reported properly.
  //
  // MACHINE MODE IS NOW SELECTED, and that closure has a consequence worth stating where it is
  // implemented rather than leaving it to be discovered by a red gate. A tool that routes its
  // error envelope to STDOUT when machine mode is active — a real and reasonably common house
  // style, on the argument that the envelope IS the answer — commits this violation on a path
  // that previously had no probe, and now fails a CORE rule. The catalogue's position is the
  // rule's first sentence: stdout carries the result, and a failure has no result. The envelope's
  // SHAPE is B5's subject and passes there regardless; this rule owns the stream.
  coverage: "partial",
  coverageGaps: [
    "only usage-error failures are probed and never a runtime failure",
    "stdout on a SUCCESSFUL command is never inspected for diagnostics",
    "stderr is never required to carry the diagnostic so a failure that reports nothing at all passes",
  ],
  coverageEstablished: [
    "every one of an unknown root flag and an unknown root verb that exited non-zero left stdout empty",
    "for a target that advertises a machine-mode flag the same unknown flag sent with that flag also left stdout empty",
  ],

  probes: (d: Discovery): Invocation[] => {
    const selector = machineSelector(d);
    return [
      { args: [`--${SENTINEL}-flag`], inertness: "sentinel", purpose: "B1: failure via bad flag" },
      { args: [`${SENTINEL}-verb`], inertness: "sentinel", purpose: "B1: failure via bad verb" },
      // The path the old gap named: an error envelope written to stdout ONLY when machine mode is
      // active is invisible to the two probes above, because neither selects it.
      ...(selector
        ? [
            {
              args: machineErrorArgs(selector),
              inertness: "sentinel" as const,
              purpose: `B1: failure under ${selector}`,
            },
          ]
        : []),
    ];
  },

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
    // The `exitCode !== 0` filter below reads a crashed probe's null as "this invocation failed",
    // and then finds its stdout clean — because the target died before writing anything at all.
    // B1's subject is what a tool puts on stdout WHEN IT REPORTS A FAILURE; a target that never
    // got as far as reporting one is not a data point, whichever way its stdout looks.
    const crashed = crashedUnverified(finding, relevant);
    if (crashed) return crashed;

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
          `stdout empty across ${failures.length} failing usage-error invocation(s), machine mode included where reachable`,
          failures.map((o) => o.id),
        );
  },
};
