import { findingFor, hungUnverified } from "../../finding.ts";
import { SENTINEL } from "../../inert.ts";
import type { Checker, Finding, History, Invocation } from "../../types.ts";
import { findByArgs } from "../../types.ts";

const RULE_ID = "A6";
const ARGS = ["--", `--${SENTINEL}-value`];

const finding = findingFor(RULE_ID);

/**
 * A6 — docs/wiki/rules/parsing/double-dash-terminator.md (diagnostic)
 *
 * The probe leads with a bare `--` deliberately, rather than `[<verb>, "--", ...]`: a verb
 * here reopens the exact unsafe-real-verb problem the A2/A4 corrections closed — a target that
 * doesn't honour `--` would run that verb for real with the sentinel value as its argument.
 *
 * SAFETY LIMIT: after a terminator the sentinel is GUARANTEED to arrive as a positional. For a
 * CLI whose root positional is a verb that is harmless (nothing dispatches). For a CLI whose
 * root positional is free-form data — `claude "…"`, `llm "…"`, `aider "…"` — it is a prompt.
 * See inert.ts: the gate cannot detect that shape and does not claim to.
 */
export const doubleDashTerminatorChecker: Checker = {
  ruleId: RULE_ID,
  rulePath: "docs/wiki/rules/parsing/double-dash-terminator.md",
  tier: "diagnostic",
  probeLevel: "L0",

  probes: (): Invocation[] => [
    { args: ARGS, inertness: "sentinel", purpose: "A6: `--` must end option parsing" },
  ],

  check: (h: History): Finding => {
    // The probe is UNDELIVERABLE through a Bun launcher, so there is nothing to report.
    //
    // `bun <script> -- --x` hands the script `["--x"]`: Bun consumes exactly one bare `--`
    // immediately after the script path. That is precisely this probe's shape, so the target
    // never sees the terminator and what gets measured is A1 (does it reject an unknown flag),
    // dressed as A6. Against `acc` itself the two answers are opposite — given the `--`, acc
    // honours it — so the verdict was not merely unreliable, it was inverted.
    //
    // No launcher flag avoids it: `bun run`, `bun --bun`, and `bun -- <script>` all strip the
    // same token (verified directly). Prepending a placeholder `--` to argv0 would restore the
    // argv, but only for targets we already know are Bun scripts — and it would corrupt the
    // argv of every other target. A diagnostic rule that cannot be delivered says so.
    if (h.target.argv0[0] === "bun") {
      return finding(
        "unverified",
        "cannot be probed through a `bun` launcher: bun swallows the leading `--`, so the target never receives the terminator",
        [],
      );
    }

    const o = findByArgs(h, ARGS);
    if (!o) return finding("unverified", "probe was not recorded", []);
    // This checker's assertion is an ABSENCE (no unknown-option error naming the sentinel), so
    // a hung probe's empty stderr satisfies it trivially. Absence of evidence, read as
    // evidence of absence, is exactly the overclaim the kit exists to prevent.
    const hung = hungUnverified(finding, [o]);
    if (hung) return hung;

    // Inverted assertion: after `--`, the token is a VALUE, so it must not be reported as an
    // unknown option. The command may still fail for other reasons (no verb given), which is
    // why the check reads stderr rather than the exit code.
    const treatedAsFlag = /unknown (option|flag)/i.test(o.stderr) && o.stderr.includes(SENTINEL);
    return treatedAsFlag
      ? finding("fail", "a value after `--` was still parsed as an option", [o.id])
      : finding("pass", "`--` ended option parsing", [o.id]);
  },
};
