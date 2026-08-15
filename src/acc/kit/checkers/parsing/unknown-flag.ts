import { crashedUnverified, findingFor, truncatedUnverified } from "../../finding.ts";
import { SENTINEL } from "../../inert.ts";
import type { Checker, Finding, History, Invocation } from "../../types.ts";
import { findByArgs } from "../../types.ts";

const RULE_ID = "A1";
const PROBE_ARGS = [`--${SENTINEL}-flag`];

const finding = findingFor(RULE_ID);

/** A1 — docs/wiki/rules/parsing/unknown-flag-exits-nonzero.md */
export const unknownFlagChecker: Checker = {
  ruleId: RULE_ID,
  rulePath: "docs/wiki/rules/parsing/unknown-flag-exits-nonzero.md",
  tier: "core",
  probeLevel: "L0",
  // The probe carries ONE valueless long flag at the root, and the page's clauses divide three
  // ways against it (review R6-5).
  //
  // CLAUSES NEVER TESTED: "absorb its value as a positional" needs a flag WITH a value, and a
  // free-form-positional CLI would then receive that value as data — the shape inert.ts refuses
  // to guess at. Acting on a suggested correction is A5's probe, not this one's.
  //
  // DETECTOR LIMITS INSIDE THE SAMPLED PATH: the exit code is only read as non-zero, while the
  // page names `2`; and "proceed with the command" is read off that same status, so a target
  // that does its work and THEN reports the bad flag is indistinguishable from one that refused.
  //
  // PATHS NEVER SAMPLED: the rule governs any unrecognised flag anywhere, and one long root flag
  // is one shape of one. A short flag and a clustered short flag go through a different branch of
  // every parser worth the name, and a flag unknown only to a subcommand through a different
  // parser entirely.
  coverage: "partial",
  coverageGaps: [
    "a flag carrying a value is never probed so absorbing that value as a positional is not established",
    "only the root is probed so a flag unknown to a subcommand is not",
    "the MUST NOT act on a suggested correction clause is not exercised here",
    "the exit code is only required to be non-zero here and not the declared 2",
    "only a long valueless flag is probed so a short flag or a cluster of short flags is not",
    "that the command did not otherwise proceed is inferred from a non-zero exit rather than observed",
  ],
  coverageEstablished: [
    "one unknown long flag given at the root exits non-zero with stdout empty and the sentinel from that flag present on stderr",
  ],

  probes: (): Invocation[] => [
    {
      args: PROBE_ARGS,
      inertness: "sentinel",
      purpose: "A1: an unrecognised flag must be rejected",
    },
  ],

  check: (h: History): Finding => {
    const o = findByArgs(h, PROBE_ARGS);
    if (!o) return finding("unverified", "probe was not recorded", []);
    if (o.timedOut) {
      return finding("fail", "hung on an unknown flag instead of rejecting it", [o.id]);
    }
    // A1 owns hangs but not floods, and of its three clauses exactly one survives a prefix.
    // Bytes on stdout WERE written, and nothing the target had left to say could unwrite them —
    // so that violation stands. The other two cannot: `exitCode` is null because we killed it,
    // and "stderr did not name the flag" is an absence over a stream we cut off.
    const cut = truncatedUnverified(finding, [o]);
    if (cut) {
      return o.stdout !== ""
        ? finding(
            "fail",
            `stdout was not empty (${o.stdoutBytes}+ bytes) before the output limit`,
            [o.id],
          )
        : cut;
    }
    // A1 owns hangs; it does NOT own crashes. "Blocking is not rejecting" is a claim about a
    // tool that is still running and could still answer — a segfault is not a slower rejection,
    // it is the absence of one. The tempting reading is that a crash "is non-zero" and so
    // satisfies this rule; it is not, because `exitCode` is null, and null is what the target
    // gets when it never chose a status at all.
    const crashed = crashedUnverified(finding, [o]);
    if (crashed) return crashed;

    const problems: string[] = [];
    if (o.exitCode === 0) problems.push("exit code was 0");
    if (o.stdout !== "") problems.push(`stdout was not empty (${o.stdout.length} bytes)`);
    if (!o.stderr.includes(SENTINEL)) problems.push("stderr did not name the offending flag");

    return problems.length
      ? finding("fail", problems.join("; "), [o.id])
      : finding("pass", `root flag rejected with exit ${o.exitCode}, stdout empty, flag named`, [
          o.id,
        ]);
  },
};
