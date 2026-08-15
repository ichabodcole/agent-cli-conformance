import {
  crashedUnverified,
  findingFor,
  hungUnverified,
  truncatedUnverified,
} from "../../finding.ts";
import type { Checker, Finding, History, Invocation } from "../../types.ts";
import { findByPurpose } from "../../types.ts";

const RULE_ID = "D4";

const finding = findingFor(RULE_ID);

// ONE arg vector, run twice. The rule is "two runs of the SAME help invocation produce
// byte-identical output", so the probe has to actually repeat an invocation.
//
// Run B used to carry `ACC_PROBE_NONCE=1`, purely to survive record()'s dedup — which meant D4
// compared two invocations that were not the same one, and said so in its own coverage gap. That
// is the defect C3 had, in the other spelling: a checker asserting determinism while comparing
// two things that differ. A CLI echoing its environment into help would FAIL D4 for a legitimate
// reason, and the checker had no way to tell that apart from a timestamp.
//
// `Invocation.repeat` is the fix already built for C3: a recorder-only index that reaches the
// invocation id and nothing the child observes — not argv, not the environment. Nothing is lost
// with the nonce, because it never established anything. It was never an env-sensitivity probe;
// the rule page called it a liability, and hostile-environment behaviour is D1's subject, where
// `--version` runs with an unusable HOME and XDG_CONFIG_HOME on purpose.
const ARGS = ["--help"];
const REPEATS = [1, 2];

/** D4 — docs/wiki/rules/discoverability/help-output-is-deterministic.md */
export const helpDeterministicChecker: Checker = {
  ruleId: RULE_ID,
  rulePath: "docs/wiki/rules/discoverability/help-output-is-deterministic.md",
  tier: "core",
  probeLevel: "L0",
  // "The two runs are not identical invocations" is no longer among these: they are now the same
  // argv and the same environment, twice. What remains is the same nesting boundary C1 hits, and
  // the rule's list of forbidden CONTENT, which byte comparison can only catch when it happens
  // to vary between two runs a few milliseconds apart — a build timestamp with second resolution
  // is stable across a pair of runs and rots a cached reference all the same.
  coverage: "partial",
  coverageGaps: [
    "only root help is compared and never nested help",
    "forbidden content such as a timestamp or a varying absolute path is only caught when it differs between two adjacent runs",
  ],

  probes: (): Invocation[] =>
    REPEATS.map((n) => ({
      args: ARGS,
      repeat: n,
      inertness: "help-path" as const,
      purpose: `D4: help run ${n}`,
    })),

  check: (h: History): Finding => {
    // findByPurpose, not array position or findByArgs: plain `--help` is also requested by C1,
    // B2, D3 and F1, and findByArgs matches on args while ignoring `repeat` — it would hand back
    // one recording where two are needed, silently. Ordered by the repeat index rather than by
    // position so "run 1" and "run 2" mean what they say whatever order record() emitted them in.
    const runs = findByPurpose(h, "D4:");
    const a = runs.find((o) => o.invocation.repeat === REPEATS[0]);
    const b = runs.find((o) => o.invocation.repeat === REPEATS[1]);
    if (!a || !b) {
      return finding(
        "unverified",
        "fewer than two runs recorded",
        runs.map((o) => o.id),
      );
    }

    // Two hung runs both yield "", and "" === "" — so this checker used to report "help output
    // identical across runs" for a CLI that produced no help at all, twice.
    const hung = hungUnverified(finding, [a, b]);
    if (hung) return hung;

    const evidence = [a.id, b.id];

    // Compare up to the shorter length so a length mismatch (one output is a truncated or
    // extended prefix of the other) still reports a real offset instead of -1.
    const minLen = Math.min(a.stdout.length, b.stdout.length);
    let firstDiff = minLen;
    for (let i = 0; i < minLen; i++) {
      if (a.stdout[i] !== b.stdout[i]) {
        firstDiff = i;
        break;
      }
    }

    // A difference found INSIDE the region both runs actually produced is a real difference,
    // whether or not either capture was cut short afterwards — so it is decided before the
    // truncation guard. A mismatch only in LENGTH is not: at the output ceiling that is our cut
    // showing through, not the target's nondeterminism. Hence `firstDiff < minLen`, not
    // `a.stdout !== b.stdout`, as the condition that survives truncation.
    if (firstDiff < minLen) {
      return finding(
        "fail",
        // Report the DIFF location, not just the fact: a one-line delta containing a timestamp
        // is a different problem from wholesale reordering, and the fix differs accordingly.
        // "index", not "byte": these are JS string offsets, i.e. UTF-16 code units, which
        // diverge from byte offsets the moment help contains a non-ASCII character.
        `help output differed between runs, first at index ${firstDiff}`,
        evidence,
      );
    }

    // Two prefixes that agree as far as they go are not two identical help outputs.
    const cut = truncatedUnverified(finding, [a, b]);
    if (cut) return cut;
    // And two crashes that wrote nothing are not two identical help outputs either — `"" === ""`
    // is the same trap the hang guard above closed, reached by a target that dies reliably
    // rather than one that blocks reliably. Placed after the diff check for the same reason
    // truncation is: bytes that DID differ before the target fell over really did differ.
    const crashed = crashedUnverified(finding, [a, b]);
    if (crashed) return crashed;

    return a.stdout === b.stdout
      ? finding(
          "pass",
          // IDENTICAL, and say so: "differing only by a probe nonce in the environment" is what
          // this line used to have to admit, and the admission was the finding's whole caveat.
          "help identical across two runs of the same invocation",
          evidence,
        )
      : finding("fail", `help output differed between runs, first at index ${firstDiff}`, evidence);
  },
};
