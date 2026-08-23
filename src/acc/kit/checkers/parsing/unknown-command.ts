import {
  crashedUnverified,
  findingFor,
  hungUnverified,
  truncatedUnverified,
} from "../../finding.ts";
import { SENTINEL } from "../../inert.ts";
import type { Checker, Finding, History, Invocation } from "../../types.ts";
import { findByArgs } from "../../types.ts";

const RULE_ID = "A2";
const ROOT = [`${SENTINEL}-verb`];

const finding = findingFor(RULE_ID);

/**
 * A2 — docs/wiki/rules/parsing/unknown-command-exits-nonzero.md
 *
 * Root verb only. An earlier design also nested a probe under the first discovered subcommand
 * (`[sub, "<sentinel>-verb"]`) to catch parsers — cobra among them — that validate only the
 * root. That probe is NOT L0-safe: `inert.ts`'s "sentinel" class requires every non-flag token
 * to itself contain the sentinel, and `sub` is a real, executable verb discovered from help.
 * A CLI that treats an unrecognised nested token as an ordinary extra positional — rather than
 * rejecting it as an unknown command — runs `sub` for real. That is exactly the A4 danger (a
 * real verb riding alongside extras that a lenient parser ignores) one level down, and
 * `Discovery` carries no way to tell a leaf command from a command group, so there is no way to
 * build the nested probe safely from what's known at L0. `classifyInertness` correctly refuses
 * it and `assertInert` throws, so the nested case is dropped rather than run unsafely.
 */
export const unknownCommandChecker: Checker = {
  ruleId: RULE_ID,
  rulePath: "docs/wiki/rules/parsing/unknown-command-exits-nonzero.md",
  tier: "core",
  deviation: "defect",
  probeLevel: "L0",
  // The nested gap is the one the class comment above spends its length on; the next two are
  // clauses the page states flatly and this checker never reads. It asserts `exitCode !== 0`,
  // not the declared `2`, and it never looks at stderr at all — A3 happens to assert the
  // verb-naming clause over the byte-identical recording, but that is A3's evidence, not this
  // rule's, and a report that borrowed it would be citing a finding it did not make.
  //
  // The fourth is a PATH rather than a clause (review R6-5), and it is the one a reader would
  // otherwise assume covered: "any command it does not recognise" includes a token one edit away
  // from a real verb, which is precisely the token a fuzzy matcher resolves and runs. A5 refuses
  // to send one because a corrected verb executes; A2 never sends one either, so nothing in the
  // catalogue observes an unrecognised verb that a parser is tempted to recognise.
  coverage: "partial",
  coverageGaps: [
    "nested subcommands are not probed at L0",
    "the exit code is only required to be non-zero here and not the declared 2",
    "naming the offending verb on stderr is not asserted",
    "only a sentinel-shaped token is probed so a verb that near-misses a real command is never offered",
  ],
  coverageEstablished: [
    "one unknown verb given at the root exits non-zero and leaves stdout empty",
  ],

  probes: (): Invocation[] => [
    { args: ROOT, inertness: "sentinel", purpose: "A2: unknown root verb" },
  ],

  check: (h: History): Finding => {
    const o = findByArgs(h, ROOT);
    if (!o) return finding("unverified", "probe was not recorded", []);
    // A killed probe reports exitCode null and an empty stdout, which satisfies both tests
    // below — this checker used to pass a CLI that blocked forever on an unknown verb, with
    // the detail "root verb rejected with exit null".
    const hung = hungUnverified(finding, [o]);
    if (hung) return hung;
    // Same split as A1: stdout bytes in the prefix were written and stand as a violation, while
    // "exited 0" cannot be read off a status the target never chose.
    const cut = truncatedUnverified(finding, [o]);
    if (cut) {
      return o.stdout !== ""
        ? finding(
            "fail",
            `unknown root verb wrote ${o.stdoutBytes}+ bytes to stdout before the output limit`,
            [o.id],
          )
        : cut;
    }
    // The headline case of the nine-passes reproduction: this checker reported `pass — root verb
    // rejected with exit null` for a target that segfaulted the moment it was handed the verb.
    // Both tests below were satisfied by absence (no status, no output), exactly as they were
    // for the hang above.
    const crashed = crashedUnverified(finding, [o]);
    if (crashed) return crashed;

    const problems: string[] = [];
    if (o.exitCode === 0) problems.push("unknown root verb exited 0");
    if (o.stdout !== "") problems.push("unknown root verb wrote to stdout");

    // Scoped explicitly rather than a bare "rejected": this checker only ever probes the root,
    // so the pass detail must say so — the rule itself requires rejection at every level of
    // nesting, and a reader of the Finding alone (not this file) has no other way to know the
    // nested case was never exercised.
    return problems.length
      ? finding("fail", problems.join("; "), [o.id])
      : finding(
          "pass",
          `root verb rejected with exit ${o.exitCode}; nested case not probed at L0`,
          [o.id],
        );
  },
};
