import { findingFor, truncatedUnverified } from "../../finding.ts";
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

    const problems: string[] = [];
    // The failure this catches: `mycli $UNSET_VAR` reports success for an operation that never
    // ran, and the help text on stdout looks like output.
    if (o.exitCode === 0) problems.push("bare invocation exited 0");
    if (o.stdout !== "") {
      problems.push(`bare invocation wrote ${o.stdout.length} bytes to stdout`);
    }

    return problems.length
      ? finding("fail", problems.join("; "), [o.id])
      : finding("pass", `usage error, exit ${o.exitCode}, stdout empty`, [o.id]);
  },
};
