import {
  crashedUnverified,
  findingFor,
  hungUnverified,
  truncatedUnverified,
} from "../../finding.ts";
import { SENTINEL } from "../../inert.ts";
import type { Checker, Discovery, Finding, History, Invocation } from "../../types.ts";
import { findByPurpose } from "../../types.ts";

const RULE_ID = "A7";

const finding = findingFor(RULE_ID);

/**
 * The flag whose declaration this rule falsifies: the first one whose help advertises a closed
 * set, in the order help presents them.
 *
 * FIRST, not all of them, and the order is load-bearing rather than arbitrary. Every help layout
 * surveyed presents a tool's global flags before any subcommand's, and the probe is sent at the
 * ROOT — so taking the first is taking the one most likely to be a flag the root actually
 * accepts. Probing every set would multiply the probes for a rule whose second instance tests
 * the same parser branch as its first.
 */
export function advertisedSet(d: Discovery): { flag: string; values: string[] } | null {
  const [entry] = Object.entries(d.valueSets);
  return entry ? { flag: entry[0], values: entry[1] } : null;
}

/** A7 — docs/wiki/rules/parsing/advertised-value-set-is-enforced.md */
export const advertisedValueSetChecker: Checker = {
  ruleId: RULE_ID,
  rulePath: "docs/wiki/rules/parsing/advertised-value-set-is-enforced.md",
  tier: "core",
  probeLevel: "L0",
  // BOTH SPELLINGS, and the second one is not symmetry for its own sake.
  //
  // The attached form alone has a hole that would have made this rule vacuous on the corpus it
  // was written for. `--format=acc-probe-xyzzy` is one token, so a parser with no support for
  // the attached spelling rejects it as an UNKNOWN OPTION — non-zero, stdout empty, the whole
  // token named — without the value validation ever running. Archaeology class 8 records
  // `--flag=value` going unparsed as a real shipped defect across five tools, so that parser is
  // the target population's MODAL shape rather than an exotic one. The detached form is the
  // spelling those parsers do understand, so between the two at least one reaches the value on
  // any parser that reads values at all.
  //
  // What survives is the residue, and it is the first gap below: a rejection naming the value
  // proves the target READ the token, never which of its checks refused it. The set validation,
  // an unparsable spelling and a stray positional all produce the same three observables.
  coverage: "partial",
  coverageGaps: [
    "a rejection naming the value is not shown to come from the set validation rather than from an unparsable spelling or the value being read as a positional",
    "only the first flag whose set help advertises is probed so a target declaring several sets is checked on one of them",
    "the value is sent at the root so a set advertised only for a subcommand flag is probed where that flag may be unknown",
    "the SHOULD to enumerate the valid set alongside the rejection is not exercised",
    "the exit code is only required to be non-zero here and not the declared 2",
    "that the flag's default did not silently apply is inferred from a non-zero exit rather than observed",
  ],
  coverageEstablished: [
    "for a target whose root help advertises a closed set for a flag neither the attached nor the detached spelling of one value outside that set exits 0 or writes to stdout",
    "at least one of those two spellings drew a rejection naming the offending value",
  ],

  probes: (d: Discovery): Invocation[] => {
    const set = advertisedSet(d);
    if (!set) return [];
    return [
      // ATTACHED. One token beginning with `-`, which satisfies the gate's `no-verb` class as
      // well as its `sentinel` class — admissible twice over, and the safer of the two because
      // no bare word enters argv.
      {
        args: [`${set.flag}=${SENTINEL}`],
        inertness: "sentinel",
        purpose: `A7 attached: ${set.flag} advertises ${set.values.join("|")} and must refuse anything else`,
      },
      // DETACHED. Two tokens, so it is admissible only under the `sentinel` class — which is
      // precisely what that class exists for: inert.ts says a probe needing a flag WITH a value
      // uses `sentinel`, because a sentinel token is provably invalid whatever the flag's arity.
      // The gate admits it exactly as it stands.
      //
      // SAFETY LIMIT, the same one A2's probe carries and no worse: a bare sentinel token is an
      // unknown verb on a verb-dispatching CLI and a PROMPT on a CLI whose root positional is
      // free-form. inert.ts documents that it cannot detect the second shape and does not claim
      // to; this probe inherits that limit rather than adding to it.
      {
        args: [set.flag, SENTINEL],
        inertness: "sentinel",
        purpose: `A7 detached: ${set.flag} advertises ${set.values.join("|")} and must refuse anything else`,
      },
    ];
  },

  check: (h: History): Finding => {
    const set = advertisedSet(h.discovery);
    if (!set) {
      return finding(
        "unverified",
        "root help advertises no closed value set for any flag, so this target has made no declaration to falsify",
        [],
      );
    }
    const runs = findByPurpose(h, "A7 ");
    if (runs.length === 0) return finding("unverified", "probes were not recorded", []);
    const evidence = runs.map((o) => o.id);
    // A7 does not own hangs (E1 does): a target still thinking about a bad value has neither
    // accepted nor refused it, and `exitCode: null` would read as "not 0", i.e. as a refusal.
    const hung = hungUnverified(finding, runs);
    if (hung) return hung;
    // Same split as A1. Bytes ON STDOUT were written and no continuation could unwrite them, so
    // that violation survives a prefix; the exit code and the stderr attribution do not, because
    // we killed the process before it chose one or finished the sentence.
    const cut = truncatedUnverified(finding, runs);
    if (cut) {
      const spilled = runs.filter((o) => o.stdout !== "");
      return spilled.length
        ? finding(
            "fail",
            `${spilled.length} spelling(s) of an out-of-set value produced output before the limit (${spilled[0]?.stdoutBytes}+ bytes)`,
            spilled.map((o) => o.id),
          )
        : cut;
    }
    // A target that fell over while being handed a bad value neither accepted nor refused it.
    const crashed = crashedUnverified(finding, runs);
    if (crashed) return crashed;

    // EITHER spelling accepting the value is the violation. The rule is about the set, and a set
    // enforced in one spelling and not the other is not enforced.
    const problems: string[] = [];
    for (const o of runs) {
      const spelling = o.invocation.args.length === 1 ? "attached" : "detached";
      if (o.exitCode === 0) {
        problems.push(
          `the ${spelling} spelling exited 0 so a value outside {${set.values.join(", ")}} was accepted or silently discarded`,
        );
      }
      if (o.stdout !== "") {
        problems.push(`the ${spelling} spelling wrote ${o.stdout.length} bytes to stdout`);
      }
    }
    if (problems.length) return finding("fail", problems.join("; "), evidence);

    // THE ATTRIBUTION TEST, and the reason this checker is not simply "exit non-zero".
    //
    // Neither probe names a verb, so a verb-dispatching CLI answers both on its missing-verb
    // path — a non-zero exit, an empty stdout, and not one byte of it caused by the value.
    // Reported as a pass that would be the vacuous-pass shape this project exists to catch: the
    // rule's subject never ran, and the report would say it held. The sentinel reaching the
    // diagnostic is the cheapest available evidence that the target read the token at all, and
    // one spelling suffices — a parser only has to understand one of them.
    const named = runs.filter((o) => o.stderr.includes(SENTINEL));
    if (named.length === 0) {
      return finding(
        "unverified",
        `both spellings exited non-zero without naming the offending value, so neither refusal can be attributed to the value rather than to the missing verb`,
        evidence,
      );
    }
    return finding(
      "pass",
      `${set.flag} refused a value outside {${set.values.join(", ")}} in both spellings with stdout empty; ${named.length} of ${runs.length} named the value`,
      evidence,
    );
  },
};
