import { crashedUnverified, findingFor, truncatedUnverified } from "../../finding.ts";
import { SENTINEL } from "../../inert.ts";
import type { Checker, Finding, History, Invocation } from "../../types.ts";
import { findByPurpose } from "../../types.ts";

const RULE_ID = "A1";
const PROBE_ARGS = [`--${SENTINEL}-flag`];
/** The same unknown flag, carrying a value — the shape whose value gets orphaned. */
const VALUE_ARGS = [`--${SENTINEL}-flag`, `${SENTINEL}-value`];

const finding = findingFor(RULE_ID);

/** A1 — docs/wiki/rules/parsing/unknown-flag-exits-nonzero.md */
export const unknownFlagChecker: Checker = {
  ruleId: RULE_ID,
  rulePath: "docs/wiki/rules/parsing/unknown-flag-exits-nonzero.md",
  tier: "core",
  deviation: "defect",
  probeLevel: "L0",
  // Two long flags at the root — one valueless, one carrying a value — and the page's clauses
  // divide three ways against them (review R6-5).
  //
  // THE VALUE-CARRYING PROBE closes what was the first gap here. "Absorb its value as a
  // positional" is the clause behind archaeology class 8, where `--owner=alice` lost its value,
  // the read filter then matched nothing, and the tool returned THE WHOLE BOARD — a wrong answer
  // wearing a right answer's shape, across five shipped tools. The value is itself sentinel-
  // bearing, so the invocation is admissible under the gate's `sentinel` class exactly as it
  // stands: inert.ts says a probe needing a flag WITH a value uses that class, because a sentinel
  // token is provably invalid whatever the flag's arity. It carries the same limit A2's probe
  // does and no more — a bare sentinel token is a PROMPT on a CLI whose root positional is
  // free-form, which inert.ts documents and does not claim to detect.
  //
  // CLAUSES STILL NEVER TESTED: acting on a suggested correction is A5's probe, not this one's.
  //
  // DETECTOR LIMITS INSIDE THE SAMPLED PATH: the exit code is only read as non-zero, while the
  // page names `2`; and "proceed with the command" is read off that same status, so a target
  // that does its work and THEN reports the bad flag is indistinguishable from one that refused.
  // The same status is all that stands behind "the value was not absorbed": a target that
  // swallowed the value and then refused the flag is scored as having refused both.
  //
  // PATHS NEVER SAMPLED: the rule governs any unrecognised flag anywhere. A short flag and a
  // clustered short flag go through a different branch of every parser worth the name, and a flag
  // unknown only to a subcommand through a different parser entirely.
  coverage: "partial",
  coverageGaps: [
    "only the root is probed so a flag unknown to a subcommand is not",
    "the MUST NOT act on a suggested correction clause is not exercised here",
    "the exit code is only required to be non-zero here and not the declared 2",
    "only long flags are probed so a short flag or a cluster of short flags is not",
    "that the command did not otherwise proceed and that the value was not absorbed are both inferred from a non-zero exit rather than observed",
  ],
  coverageEstablished: [
    "one unknown long flag given at the root exits non-zero with stdout empty and the sentinel from that flag present on stderr",
    "the same flag carrying a value does likewise rather than accepting the flag and orphaning the value",
  ],

  probes: (): Invocation[] => [
    {
      args: PROBE_ARGS,
      inertness: "sentinel",
      purpose: "A1: an unrecognised flag must be rejected",
    },
    {
      args: VALUE_ARGS,
      inertness: "sentinel",
      purpose: "A1: an unrecognised flag carrying a value must be rejected too",
    },
  ],

  check: (h: History): Finding => {
    // findByPurpose, not findByArgs: the valueless probe's args are byte-identical to A3's, B1's,
    // B2's and C2's, so dedup merges every requester into one recording and `invocation.purpose`
    // holds only whichever asked first.
    const runs = findByPurpose(h, "A1:");
    if (runs.length < 2) return finding("unverified", "probes were not recorded", []);
    const evidence = runs.map((o) => o.id);
    const hung = runs.filter((o) => o.timedOut);
    if (hung.length) {
      return finding(
        "fail",
        "hung on an unknown flag instead of rejecting it",
        hung.map((o) => o.id),
      );
    }
    // A1 owns hangs but not floods, and of its three clauses exactly one survives a prefix.
    // Bytes on stdout WERE written, and nothing the target had left to say could unwrite them —
    // so that violation stands. The other two cannot: `exitCode` is null because we killed it,
    // and "stderr did not name the flag" is an absence over a stream we cut off.
    const cut = truncatedUnverified(finding, runs);
    if (cut) {
      const spilled = runs.filter((o) => o.stdout !== "");
      return spilled.length
        ? finding(
            "fail",
            `stdout was not empty (${spilled[0]?.stdoutBytes}+ bytes) before the output limit`,
            spilled.map((o) => o.id),
          )
        : cut;
    }
    // A1 owns hangs; it does NOT own crashes. "Blocking is not rejecting" is a claim about a
    // tool that is still running and could still answer — a segfault is not a slower rejection,
    // it is the absence of one. The tempting reading is that a crash "is non-zero" and so
    // satisfies this rule; it is not, because `exitCode` is null, and null is what the target
    // gets when it never chose a status at all.
    const crashed = crashedUnverified(finding, runs);
    if (crashed) return crashed;

    const problems: string[] = [];
    for (const o of runs) {
      const shape = o.invocation.args.length === 1 ? "valueless" : "value-carrying";
      if (o.exitCode === 0) problems.push(`the ${shape} flag exited 0`);
      if (o.stdout !== "")
        problems.push(`the ${shape} flag left ${o.stdout.length} bytes on stdout`);
      if (!o.stderr.includes(SENTINEL))
        problems.push(`the ${shape} rejection did not name the offending flag`);
    }

    return problems.length
      ? finding("fail", problems.join("; "), evidence)
      : finding(
          "pass",
          `root flag rejected with exit ${runs[0]?.exitCode}, stdout empty, flag named; the same flag carrying a value likewise`,
          evidence,
        );
  },
};
