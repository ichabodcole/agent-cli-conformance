import {
  crashedUnverified,
  findingFor,
  hungUnverified,
  truncatedUnverified,
} from "../../finding.ts";
import { SENTINEL } from "../../inert.ts";
import {
  machineErrorArgs,
  machineSelector,
  parsesWhole,
  stringValuesOf,
} from "../../machine-mode.ts";
import type { Checker, Discovery, Finding, History, Invocation, Observation } from "../../types.ts";
import { findByArgs, findByPurpose } from "../../types.ts";

const RULE_ID = "A3";
const FLAG = [`--${SENTINEL}-flag`];
const VERB = [`${SENTINEL}-verb`];
const MACHINE = "A3 machine:";

const finding = findingFor(RULE_ID);

/**
 * The offending token, found in a FIELD of the machine-mode answer rather than in its bytes.
 *
 * Returns null when there is no document to look inside — which is B5's finding, not this one:
 * a target that answered a parse error with prose did not put the token in the wrong field, it
 * published no fields at all.
 */
function tokenInAField(o: Observation): boolean | null {
  for (const text of [o.stderr, o.stdout]) {
    if (text.trim() === "" || !parsesWhole(text)) continue;
    if (stringValuesOf(JSON.parse(text)).some((v) => v.includes(SENTINEL))) return true;
    return false;
  }
  return null;
}

/** A3 — docs/wiki/rules/parsing/errors-name-the-offending-token.md */
export const namesOffendingTokenChecker: Checker = {
  ruleId: RULE_ID,
  rulePath: "docs/wiki/rules/parsing/errors-name-the-offending-token.md",
  tier: "core",
  probeLevel: "L0",
  // The rule has three clauses and this checker now reads two: the token appears verbatim in the
  // prose diagnostic, and — for a target that advertises a machine-mode flag — it appears inside
  // a FIELD of the document that mode produces, which is a different claim from "the bytes
  // contain it" and is why the machine half walks the PARSED structure rather than the text.
  //
  // WHAT THAT CLOSURE STILL DOES NOT REACH, and it is the first gap below. The rule says the
  // token must appear "as a field in the error envelope"; with nothing declared at L0 there is no
  // envelope schema to name a field in, so the assertion is the weaker "some string value
  // somewhere in the document contains it". A target burying the token in a free-text `detail`
  // satisfies this and not the rule. That is the same L1 boundary B3 and B5 both stop at.
  //
  // The others are unchanged. The two token classes probed are the two that are inert, so the
  // malformed-identifier and out-of-range-value cases the page also names go unexercised — A7
  // sends an out-of-set value but its rejection is not required to name it, because a verbless
  // probe can be answered on the missing-verb path and a hard requirement here would convict a
  // target for that. And `includes(SENTINEL)` asks for the sentinel SUBSTRING while the page says
  // VERBATIM: a target printing `acc-probe-xyzzy` where the argv said `--acc-probe-xyzzy-flag`
  // satisfies this check and not the rule.
  coverage: "partial",
  coverageGaps: [
    "the machine-mode field is any string value anywhere in the document because no declaration exists at L0 to name the envelope field the rule requires",
    "only an unknown flag and an unknown verb are probed",
    "the SHOULD to enumerate a closed set as choices is not exercised",
    "the assertion is that the sentinel substring reached stderr and not that the whole offending token appears verbatim",
  ],
  coverageEstablished: [
    "the stderr of an unknown root flag rejection contains the probe's sentinel string",
    "the stderr of an unknown root verb rejection contains the probe's sentinel string",
    "for a target that advertises a machine-mode flag and answers a parser error with a parseable document some string value inside that document contains the sentinel",
  ],

  probes: (d: Discovery): Invocation[] => {
    const selector = machineSelector(d);
    return [
      { args: FLAG, inertness: "sentinel", purpose: "A3: the rejection must name the flag" },
      { args: VERB, inertness: "sentinel", purpose: "A3: the rejection must name the verb" },
      // The machine half. Byte-identical to B5's probe, so `record()`'s dedup runs it once and
      // both rules read the same observation — which is the point: they are two clauses about one
      // answer, and probing separately would let them disagree about what the target did.
      ...(selector
        ? [
            {
              args: machineErrorArgs(selector),
              inertness: "sentinel" as const,
              purpose: `${MACHINE} the rejection must name the token in a field under ${selector}`,
            },
          ]
        : []),
    ];
  },

  check: (h: History): Finding => {
    const flag = findByArgs(h, FLAG);
    const verb = findByArgs(h, VERB);
    if (!flag || !verb) return finding("unverified", "probes were not recorded", []);
    const [machine] = findByPurpose(h, MACHINE);
    const runs = [flag, verb, ...(machine ? [machine] : [])];
    // A killed probe has empty stderr, which would read here as "did not name the token" — a
    // FAIL derived from a process that never got to write anything. Wrong in the other
    // direction from a false pass, but wrong on the same evidence.
    const hung = hungUnverified(finding, runs);
    if (hung) return hung;
    // Both of this rule's clauses are ABSENCES in stderr, so a stderr we cut off mid-sentence
    // establishes neither: the token may well have been named in the bytes we refused.
    const cut = truncatedUnverified(finding, runs);
    if (cut) return cut;
    // Same asymmetry as the hang, one line up: a crashed probe's stderr reads as "did not name
    // the token", producing a FAIL against a target that never reached its diagnostic. A3 is one
    // of the two rules where the crash bug pointed the wrong way — it under-reported instead of
    // over-reporting — and both directions are the same fabrication.
    const crashed = crashedUnverified(finding, runs);
    if (crashed) return crashed;

    const evidence = runs.map((o) => o.id);
    const problems: string[] = [];
    // The sentinel is distinctive enough that a match is evidence the tool echoed it, not
    // coincidence.
    if (!flag.stderr.includes(SENTINEL)) problems.push("flag rejection did not name the flag");
    if (!verb.stderr.includes(SENTINEL)) problems.push("verb rejection did not name the verb");
    // The machine clause fails only when there IS a document and the token is not in it. Its
    // absence is decided below, because "no document" is a different finding with a different
    // owner.
    const inAField = machine && machine.exitCode !== 0 ? tokenInAField(machine) : null;
    if (inAField === false) {
      problems.push("the machine-mode document carried the token in no field");
    }
    if (problems.length) return finding("fail", problems.join("; "), evidence);

    // NO DOCUMENT TO INSPECT is a gap, not a pass. The prose half held, and the rule's other
    // half asks about a field in an envelope that was never emitted — which B5 reports as its own
    // violation. Saying `pass` here would license "the token reaches a field" off a run in which
    // no field existed, and that is the vacuous pass this project exists to catch.
    if (machine && inAField === null) {
      return finding(
        "unverified",
        "the rejections named the token in prose, but machine mode produced no parseable document to inspect for the field; see B5",
        evidence,
      );
    }
    return finding(
      "pass",
      machine
        ? "the unknown-flag and unknown-verb rejections both named the offending token, and the machine-mode document carries it in a field"
        : "the unknown-flag and unknown-verb rejections both named the offending token; no machine mode was advertised so the envelope clause was not reached",
      evidence,
    );
  },
};
