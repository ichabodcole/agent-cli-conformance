import { findingFor, truncatedUnverified } from "../../finding.ts";
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
  // The probe carries a valueless flag at the root, so two of the page's MUST NOTs are outside
  // what it can see. "Absorb its value as a positional" needs a flag WITH a value, and a
  // free-form-positional CLI would then receive that value as data — the shape inert.ts refuses
  // to guess at. Acting on a suggested correction is A5's probe, not this one's.
  coverage: "partial",
  coverageGaps: [
    "a flag carrying a value is never probed so absorbing that value as a positional is not established",
    "only the root is probed so a flag unknown to a subcommand is not",
    "the MUST NOT act on a suggested correction clause is not exercised here",
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
