import {
  crashedUnverified,
  findingFor,
  hungUnverified,
  truncatedUnverified,
} from "../../finding.ts";
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
 * CLI whose root positional is a verb, the token names no declared command, so the probe reaches
 * no declared code path — risk-reduced, not harmless. For a CLI whose root positional is
 * free-form data — `claude "…"`, `llm "…"`, `aider "…"` — it is a prompt.
 * See inert.ts: the gate cannot detect that shape and does not claim to.
 */
export const doubleDashTerminatorChecker: Checker = {
  ruleId: RULE_ID,
  rulePath: "docs/wiki/rules/parsing/double-dash-terminator.md",
  tier: "diagnostic",
  deviation: "design-choice",
  probeLevel: "L0",
  // The assertion is an ABSENCE — no unknown-option error naming the sentinel — which rules out
  // "parsed as a flag" without ruling in "received as a positional": a CLI that silently drops
  // everything after `--` passes exactly as one that honours it. The delegator half of the rule
  // is the stronger MUST and needs a child process to observe, which L0 has no way to reach.
  //
  // The third is the DETECTOR (review R6-5), and it is the sharpest limit in this file: the
  // absence being tested is the absence of `/unknown (option|flag)/i` in English. A parser that
  // says "unrecognized argument", "invalid switch", or anything at all in another language
  // rejected the value exactly as loudly and is scored as a pass. The fourth is the single
  // POSITION probed — one terminator at the root with one token behind it, so a `--` after a
  // verb, or several values after it, is a shape this rule never sees.
  //
  // The fifth is the LAUNCHER, and it is what survives the bun fix above: the runner's
  // compensation keys on `argv0[0] === "bun"`, which is what `toTarget` names when bun IS the
  // launcher. A wrapper script that itself invokes bun internally — `argv0 = [abs-path-to-
  // wrapper]` — hides that fact from the runner entirely, so the terminator is still eaten one
  // layer down and this check reports a verdict against an argv the wrapped target never
  // received. Not something this checker can close by itself: it has no visibility into what a
  // script it was handed does inside its own body.
  coverage: "partial",
  coverageGaps: [
    "the value after the terminator is only shown not to be rejected as a flag and never shown to arrive as a positional",
    "the delegator passthrough requirement is not exercised",
    "a rejection is recognised only from an English unknown-option or unknown-flag phrase so a differently worded rejection reads as a pass",
    "only a bare terminator at the root followed by a single value is probed",
    "a bun layer hidden inside a wrapper script is invisible here so its terminator is still eaten and the probe measures an argv the target never received",
  ],
  coverageEstablished: [
    "a hyphen-leading value after a bare terminator at the root draws no English unknown-option rejection naming it on stderr",
  ],

  probes: (): Invocation[] => [
    { args: ARGS, inertness: "sentinel", purpose: "A6: `--` must end option parsing" },
  ],

  check: (h: History): Finding => {
    // Bun targets USED to short-circuit here. `bun <script> -- --x` hands the script `["--x"]`
    // — bun strips one bare `--` per bun layer — so the terminator never arrived and what got
    // measured was A1 wearing A6's name. Against `acc` itself the two answers are opposite, so
    // the verdict was not merely unreliable, it was inverted, and the rule reported `unverified`
    // rather than a measurement of an argv the target never received.
    //
    // The runner now compensates at the spawn (see `runner.ts`), so the target receives the same
    // argv a native target receives and this checker needs no launcher knowledge at all.
    //
    // The comment that stood here argued the fix was impossible because the compensation would
    // "corrupt the argv of every other target" — true only of an UNCONDITIONAL compensation, and
    // its own next paragraph recorded that `toTarget` had since learned to read the shebang, so
    // the knowledge whose absence it cited had already arrived. The mechanism died and the
    // conclusion kept asserting it.
    //
    // A compiled bun binary (`bun build --compile`) receives the terminator INTACT — measured,
    // bun 1.4.0 — and is excluded from the compensation by construction, since its argv0 is the
    // binary itself with no launcher token and no shebang to read.

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
    if (treatedAsFlag) {
      // A rejection already printed in the prefix is the violation; the rest of the stream
      // cannot retract it. The PASS is the absence, and an absence over a cut-off stderr is
      // precisely the overclaim the hang guard above exists to prevent.
      return finding("fail", "a value after `--` was still parsed as an option", [o.id]);
    }
    const cut = truncatedUnverified(finding, [o]);
    if (cut) return cut;
    // Placed after the violation test for the same reason truncation is: an unknown-option error
    // the target managed to print before dying was still printed. The PASS is the absence, and
    // an absence over the stderr of a process that fell over before parsing anything is the
    // emptiest kind of evidence there is.
    const crashed = crashedUnverified(finding, [o]);
    if (crashed) return crashed;

    return finding(
      "pass",
      "the value after `--` was not re-parsed as an option; its arrival as a positional is not observed",
      [o.id],
    );
  },
};
