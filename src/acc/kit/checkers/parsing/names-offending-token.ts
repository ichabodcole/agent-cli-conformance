import { findingFor, hungUnverified, truncatedUnverified } from "../../finding.ts";
import { SENTINEL } from "../../inert.ts";
import type { Checker, Finding, History, Invocation } from "../../types.ts";
import { findByArgs } from "../../types.ts";

const RULE_ID = "A3";
const FLAG = [`--${SENTINEL}-flag`];
const VERB = [`${SENTINEL}-verb`];

const finding = findingFor(RULE_ID);

/** A3 — docs/wiki/rules/parsing/errors-name-the-offending-token.md */
export const namesOffendingTokenChecker: Checker = {
  ruleId: RULE_ID,
  rulePath: "docs/wiki/rules/parsing/errors-name-the-offending-token.md",
  tier: "core",
  probeLevel: "L0",
  // The rule has three clauses and this checker reads one: the token appears verbatim in the
  // prose diagnostic. The machine-envelope clause is the one the review named — nothing here
  // ever runs the target in machine mode, let alone parses its error envelope for the field —
  // and the two token classes probed are the two that are inert, so the malformed-identifier
  // and out-of-range-value cases the page also names go unexercised.
  coverage: "partial",
  coverageGaps: [
    "the machine-mode error envelope field is never inspected",
    "only an unknown flag and an unknown verb are probed",
    "the SHOULD to enumerate a closed set as choices is not exercised",
  ],

  probes: (): Invocation[] => [
    { args: FLAG, inertness: "sentinel", purpose: "A3: the rejection must name the flag" },
    { args: VERB, inertness: "sentinel", purpose: "A3: the rejection must name the verb" },
  ],

  check: (h: History): Finding => {
    const flag = findByArgs(h, FLAG);
    const verb = findByArgs(h, VERB);
    if (!flag || !verb) return finding("unverified", "probes were not recorded", []);
    // A killed probe has empty stderr, which would read here as "did not name the token" — a
    // FAIL derived from a process that never got to write anything. Wrong in the other
    // direction from a false pass, but wrong on the same evidence.
    const hung = hungUnverified(finding, [flag, verb]);
    if (hung) return hung;
    // Both of this rule's clauses are ABSENCES in stderr, so a stderr we cut off mid-sentence
    // establishes neither: the token may well have been named in the bytes we refused.
    const cut = truncatedUnverified(finding, [flag, verb]);
    if (cut) return cut;

    const evidence = [flag.id, verb.id];
    const problems: string[] = [];
    // The sentinel is distinctive enough that a match is evidence the tool echoed it, not
    // coincidence.
    if (!flag.stderr.includes(SENTINEL)) problems.push("flag rejection did not name the flag");
    if (!verb.stderr.includes(SENTINEL)) problems.push("verb rejection did not name the verb");

    return problems.length
      ? finding("fail", problems.join("; "), evidence)
      : finding("pass", "both rejections named the offending token", evidence);
  },
};
