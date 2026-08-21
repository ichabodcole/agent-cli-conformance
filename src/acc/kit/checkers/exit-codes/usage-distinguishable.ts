import { crashedUnverified, findingFor, truncatedUnverified } from "../../finding.ts";
import { SENTINEL } from "../../inert.ts";
import type { Checker, Discovery, Finding, History, Invocation, Observation } from "../../types.ts";
import { findByPurpose } from "../../types.ts";

const RULE_ID = "C2";

const finding = findingFor(RULE_ID);

/**
 * Which rule classifies each of this checker's shapes as a usage error.
 *
 * The table exists so a waiver can withdraw a shape. It is the one place the coupling between
 * these rules is written down, and it belongs in the kit rather than in a project's config.
 */
const OWNERS: readonly (readonly [string, string])[] = [
  ["C2: usage error via flag", "A1"],
  ["C2: usage error via verb", "A2"],
  ["C2: usage error via the bare invocation", "D2"],
  ["C2: usage error via a value outside", "A7"],
] as const;

const hasPurpose = (o: Observation, mark: string): boolean =>
  o.purposes.some((p) => p.startsWith(mark));

/** C2 — docs/wiki/rules/exit-codes/usage-errors-are-distinguishable.md */
export const usageDistinguishableChecker: Checker = {
  ruleId: RULE_ID,
  rulePath: "docs/wiki/rules/exit-codes/usage-errors-are-distinguishable.md",
  tier: "core",
  probeLevel: "L0",
  // The rule is a CONTRAST — 2 for the caller's mistake, 1 for ours — and only one side of it
  // is reachable here. The pass detail has always said so ("internal-fault contrast unverified
  // at L0"); this is that sentence in a field the report can count, which is the whole of
  // R1-4. The taxonomy clause is the same problem one step out: provoking a rate limit or a
  // permission fault in an arbitrary binary is not an inert act.
  //
  // The third is the population being contrasted (review R6-5). The page enumerates five things
  // that are usage errors — bad flag, unknown command, unexpected positional, bare invocation,
  // malformed value — and agreement used to be measured across two of them, so a CLI answering
  // `2` for an unknown flag and `1` for a bare invocation violated the rule on the axis this
  // checker is named for and passed it, because the pair it compared happened to agree.
  //
  // FOUR of the five are now compared. The bare invocation was always recorded (D2 and E1 both
  // send it) and simply was not read here; the malformed value arrives from A7, whose probe this
  // one is byte-identical to, so the recorder runs it once. What is left is the unexpected
  // positional, and it stays out of reach for the reason A4 does: a stray positional is only a
  // stray positional if there is a verb for it to be stray to, and sending a verb is L1.
  coverage: "partial",
  coverageGaps: [
    "the internal-fault contrast is not established at L0 because no internal fault can be provoked inertly",
    "the taxonomy codes for more specific failures are not exercised",
    "an unexpected positional is never compared because a stray positional needs a verb to be stray to and sending a verb is above L0",
  ],
  coverageEstablished: [
    "an unknown root flag and an unknown root verb and the bare invocation all exit with the same non-zero code",
    "for a target whose help advertises a closed value set a value outside it exits with that same code",
    "that code is 2 where the pass is reported and the verdict is unverified where it is any other single code",
  ],

  probes: (d: Discovery): Invocation[] => {
    const [set] = Object.entries(d.valueSets);
    return [
      { args: [`--${SENTINEL}-flag`], inertness: "sentinel", purpose: "C2: usage error via flag" },
      { args: [`${SENTINEL}-verb`], inertness: "sentinel", purpose: "C2: usage error via verb" },
      // Already recorded by D2 and E1; declared here so `findByPurpose` returns it and the
      // contrast is not silently narrower than the page claims.
      { args: [], inertness: "bare", purpose: "C2: usage error via the bare invocation" },
      // The malformed value, from A7's declaration. Byte-identical to A7's attached probe, so
      // dedup runs one process and the two rules read one observation — which matters here,
      // because a contrast built from a DIFFERENT run of the same argv would be comparing codes
      // the target chose on two occasions.
      ...(set
        ? [
            {
              args: [`${set[0]}=${SENTINEL}`],
              inertness: "sentinel" as const,
              purpose: `C2: usage error via a value outside ${set[0]}'s advertised set`,
            },
          ]
        : []),
    ];
  },

  check: (h: History): Finding => {
    // findByPurpose, not an `invocation.purpose` scan: these probes are byte-identical to A1's,
    // A3's and B1's, so dedup in record() merges all four checkers' requests into one recording
    // per args, and `invocation.purpose` only ever holds the FIRST requester's reason.
    const all = findByPurpose(h, "C2:");

    // A WAIVER WITHDRAWS A PREMISE, and three of these four shapes rest on one.
    //
    // This rule does not discover that these invocations are usage errors — it inherits that from
    // the rules that say so. Waive D2 and the project has declared that a bare invocation is a
    // help path for this tool, not an error; leaving it in the population means reporting
    // disagreement across a set whose membership the project has just corrected. That was the
    // first outside adopter's blocker: waiving D2 left C2 failing on the same byte, so no config
    // could express "bare help is deliberate" and reach a green gate, and the only route to exit
    // 0 was to record a permanent design decision as debt.
    //
    // The coupling is named HERE rather than in `acc.config.json`, deliberately. A project should
    // describe its own CLI, not our internals.
    // TWO CONDITIONS, not one. The waiver alone is not enough.
    //
    // A waiver of D2 declares the bare invocation a HELP PATH — and a help path exits 0. If it
    // exits non-zero it is still an error, and its code still has to agree with the other errors,
    // so the shape stays and the disagreement is reported. Excluding on the waiver alone made a
    // bare invocation exiting 64 vanish from the entire run: C2 passed over `(2,2)` while D2's
    // own waived verdict happened to fail on a different clause, so no line anywhere said the
    // target answers one error class with two codes. Found by an independent review.
    //
    // Also filtered to shapes actually RECORDED. A7's probe exists only for a target whose help
    // advertises a closed value set, so counting a waiver of A7 as an exclusion told the reader
    // config had dropped a shape that was never in the population.
    const excluded = OWNERS.filter(
      ([mark, rule]) =>
        h.waived.has(rule) && all.some((o) => hasPurpose(o, mark) && o.exitCode === 0),
    );
    const recorded = all.filter((o) => !excluded.some(([mark]) => hasPurpose(o, mark)));
    const excusedBy = excluded.map(([, rule]) => rule).join(", ");

    if (recorded.length < 2) {
      return finding(
        "unverified",
        excluded.length
          ? `fewer than two usage-error shapes remain to compare once ${excusedBy} ${excluded.length === 1 ? "is" : "are"} waived`
          : "probes were not recorded",
        recorded.map((o) => o.id),
      );
    }

    // Every verdict below compares exit codes, and a probe killed at the output limit has none
    // — `null` would collapse into "the same code twice" exactly as two hangs used to.
    const cut = truncatedUnverified(finding, recorded);
    if (cut) return cut;
    // ...and a crashed probe has none either, for the other reason. Two nulls collapse into "the
    // same code twice" and fall through to the `codes[0] === 2` test, which is how a segfaulting
    // target came back `usage errors are consistent at exit null` — a sentence describing a
    // consistency the target had no part in.
    const crashed = crashedUnverified(finding, recorded);
    if (crashed) return crashed;

    // A hung probe WAS recorded — it just never returned a code to compare. Reporting that as
    // "not recorded" would conflate two different outcomes A1 and C1 both take care to keep
    // separate: missing evidence vs. evidence that says the target hung.
    //
    // ANY hang voids the verdict, not just enough of them to leave fewer than two survivors. This
    // rule's subject is agreement across a POPULATION of usage errors, so dropping the killed
    // member and comparing the rest reports agreement over a contrast narrower than the page
    // claims — and says nothing about it. That was survivable while there were two probes and one
    // hang left one; with four, three survivors would have passed.
    const usage = recorded.filter((o) => !o.timedOut);
    if (usage.length < recorded.length) {
      const timedOutCount = recorded.length - usage.length;
      return finding(
        "unverified",
        `${timedOutCount} of ${recorded.length} probes timed out instead of returning a usage error`,
        recorded.map((o) => o.id),
      );
    }

    const evidence = usage.map((o) => o.id);
    const codes = usage.map((o) => o.exitCode);

    if (codes.some((c) => c === 0)) {
      return finding("fail", `a usage error exited 0 (${codes.join(",")})`, evidence);
    }
    if (new Set(codes).size !== 1) {
      return finding(
        "fail",
        `the same error class produced different codes (${codes.join(",")})`,
        evidence,
      );
    }

    // A narrowed pass is not the same claim as a full one, so it says what it left out. A report
    // that quietly compared three shapes where the page promises four would be a checker
    // overstating its own reach — which is the defect this catalogue exists to report.
    const narrowed = excluded.length
      ? `; the ${excusedBy} ${excluded.length === 1 ? "shape was" : "shapes were"} excluded, waived by config`
      : "";
    // Distinguishability from an INTERNAL fault cannot be established black-box: there is no
    // safe general way to provoke one in an arbitrary binary. Say so rather than implying the
    // full rule was checked — a `pass` that silently overclaims is the defect this project
    // exists to catch.
    return codes[0] === 2
      ? finding(
          "pass",
          `${codes.length} usage-error shapes all use exit 2; internal-fault contrast unverified at L0${narrowed}`,
          evidence,
        )
      : finding(
          "unverified",
          `usage errors are consistent at exit ${codes[0]}, but not the declared 2, and no taxonomy was declared${narrowed}`,
          evidence,
        );
  },
};
