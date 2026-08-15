import { crashedUnverified, findingFor, truncatedUnverified } from "../../finding.ts";
import type { Checker, Finding, History, Invocation } from "../../types.ts";
import { findByArgs } from "../../types.ts";

const RULE_ID = "D2";

const finding = findingFor(RULE_ID);

/** D2 — docs/wiki/rules/discoverability/bare-invocation-is-a-usage-error.md */
export const bareInvocationChecker: Checker = {
  ruleId: RULE_ID,
  rulePath: "docs/wiki/rules/discoverability/bare-invocation-is-a-usage-error.md",
  tier: "core",
  probeLevel: "L0",
  // Two clauses of the four are read here (not 0, stdout empty) and the hang clause is owned
  // outright. The two below are simply not asserted: the check tests `exitCode === 0` rather
  // than `!== 2`, so a bare invocation exiting 1 passes, and nothing ever looks at stderr — a
  // CLI that exits 2 in total silence satisfies this checker while failing the sentence that
  // says where the usage summary goes.
  coverage: "partial",
  coverageGaps: [
    "the exit code is only required to be non-zero here and not the declared 2",
    "stderr is never checked to carry the usage summary",
  ],

  probes: (): Invocation[] => [
    // `bare` is its own inertness class (see inert.ts), not `no-verb`: `no-verb` requires a
    // NON-EMPTY array of only-flag tokens, precisely so an empty array can't satisfy it
    // vacuously — and this probe's entire point IS the empty array. Claiming `no-verb` here
    // would make `classifyInertness` refuse it, `assertInert` would throw, and `record()` would
    // abort the whole run with no obvious cause.
    { args: [], inertness: "bare", purpose: "D2: bare invocation" },
  ],

  check: (h: History): Finding => {
    // findByArgs is safe here — unlike D1/D4/F2, D2 is the only checker in the kit that ever
    // requests `args: []`, and this probe carries no env, so there is no sibling recording
    // under the same args for it to collide with.
    const o = findByArgs(h, []);
    if (!o) {
      return finding("unverified", "probe was not recorded", []);
    }
    if (o.timedOut) {
      return finding("fail", "bare invocation hung", [o.id]);
    }
    // D2 owns hangs but not floods. Stdout the target already wrote on a bare invocation is a
    // violation a prefix establishes; "exited 0" is not, because we killed it.
    const cut = truncatedUnverified(finding, [o]);
    if (cut) {
      return o.stdout !== ""
        ? finding(
            "fail",
            `bare invocation wrote ${o.stdoutBytes}+ bytes to stdout before the output limit`,
            [o.id],
          )
        : cut;
    }
    // D2 owns hangs (a bare invocation that blocks is the wizard this rule exists to catch) and
    // does NOT own crashes. `bare invocation exited null with stdout empty` was one of the nine
    // false passes, and it is worth naming why the near-argument fails: a crash IS non-zero-ish,
    // and a bare invocation SHOULD be a usage error, so the two look like they line up. They do
    // not. This rule says the tool must TELL the caller it was invoked wrong; a target that dies
    // told them nothing, and `exitCode` is null rather than any code at all.
    const crashed = crashedUnverified(finding, [o]);
    if (crashed) return crashed;

    const problems: string[] = [];
    // The failure this catches: `mycli $UNSET_VAR` reports success for an operation that never
    // ran, and the help text on stdout looks like output.
    if (o.exitCode === 0) problems.push("bare invocation exited 0");
    if (o.stdout !== "") {
      problems.push(`bare invocation wrote ${o.stdout.length} bytes to stdout`);
    }

    return problems.length
      ? finding("fail", problems.join("; "), [o.id])
      : finding(
          "pass",
          `bare invocation exited ${o.exitCode} with stdout empty; stderr not inspected`,
          [o.id],
        );
  },
};
