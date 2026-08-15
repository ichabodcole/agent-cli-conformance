import {
  crashedUnverified,
  findingFor,
  hungUnverified,
  truncatedUnverified,
} from "../../finding.ts";
import { SENTINEL } from "../../inert.ts";
import type { Checker, Finding, History, Invocation } from "../../types.ts";
import { findByPurpose } from "../../types.ts";

// biome-ignore lint/suspicious/noControlCharactersInRegex: matching ESC is the assertion
const ANSI = /\x1b\[/;

const RULE_ID = "B2";

const finding = findingFor(RULE_ID);

/** B2 — docs/wiki/rules/streams/no-ansi-when-piped.md */
export const noAnsiWhenPipedChecker: Checker = {
  ruleId: RULE_ID,
  rulePath: "docs/wiki/rules/streams/no-ansi-when-piped.md",
  tier: "core",
  probeLevel: "L0",
  // The ANSI constant above is `ESC [` — the CSI introducer, and nothing else. That misses OSC
  // (`ESC ]`, used for hyperlinks and window titles), the single-character escapes (`ESC c`,
  // `ESC 7`), and animation built from bare carriage returns, which needs no escape byte at
  // all. The three override clauses are worse than unimplemented: they only bind when a TTY IS
  // present, and every probe the runner makes captures to a pipe, so no probe can reach them.
  //
  // THE LARGER BOUNDARY, and the one this list omitted while looking thorough (review R6-5).
  // Those three are all limits of the DETECTOR, and a reader who checks them off has been told
  // nothing about WHERE it ran. B2 binds on stdout and stderr whenever output is non-TTY or
  // machine mode is active — which is every byte the target ever writes under this kit — and two
  // invocations are sampled. Nested help, `--version`, the output of a command that succeeds,
  // machine-mode output and every diagnostic other than one usage error are unexamined, so a
  // tool that colours its results and not its help passes B2 outright. A page can scope a
  // universal clause down to whatever the probe happened to run without ever saying so; the last
  // two entries are that sentence said out loud.
  coverage: "partial",
  coverageGaps: [
    "only CSI escapes are detected and not OSC or single-character escape sequences",
    "carriage-return animation is not detected",
    "the NO_COLOR and --no-color and TERM=dumb overrides need a TTY and are never exercised",
    "only root help and one usage error are sampled so nested help and version output and successful command output and other diagnostics are never inspected",
    "machine mode is never selected although the rule binds whenever machine mode is active",
  ],

  probes: (): Invocation[] => [
    { args: ["--help"], inertness: "help-path", purpose: "B2: help must be escape-free" },
    {
      args: [`--${SENTINEL}-flag`],
      inertness: "sentinel",
      purpose: "B2: errors must be escape-free",
    },
  ],

  check: (h: History): Finding => {
    // findByPurpose, not an `invocation.purpose` scan: the sentinel-flag probe shares its args
    // with A1's and A3's, so dedup can leave `invocation.purpose` set to whichever of them
    // asked first — findByArgs/`.purpose` cannot be trusted to find THIS checker's probe.
    const relevant = findByPurpose(h, "B2:");
    if (relevant.length === 0) {
      return finding("unverified", "probes were not recorded", []);
    }
    // A killed probe emits nothing, and "nothing" contains no escapes — so a hung target used
    // to pass B2 for the same reason a target that prints nothing at all does.
    const hung = hungUnverified(finding, relevant);
    if (hung) return hung;

    // Every probe the runner makes captures to a pipe, so the target was never writing to a
    // TTY — that is exactly the condition this rule requires. No TTY emulation needed.
    const offenders = relevant.filter((o) => ANSI.test(o.stdout) || ANSI.test(o.stderr));
    // Detected BEFORE the truncation guard, deliberately: an escape in the captured prefix was
    // emitted, and no continuation of the output could un-emit it. The reverse does not hold —
    // "no escapes in the bytes we allowed" is not "no escapes" — so a clean scan over a
    // truncated capture must not become a pass.
    if (offenders.length) {
      return finding(
        "fail",
        `${offenders.length} invocation(s) emitted ANSI escapes with no terminal attached`,
        offenders.map((o) => o.id),
      );
    }
    const cut = truncatedUnverified(finding, relevant);
    if (cut) return cut;
    // Same side of the split as truncation, for the same reason: an escape the target emitted
    // before dying was emitted, so the FAIL above stands and is decided first. The pass cannot —
    // "no escapes in the output of a process that produced none" is the purest form of the
    // absence-as-evidence error, and it is what handed B2 to a segfaulting fixture.
    const crashed = crashedUnverified(finding, relevant);
    if (crashed) return crashed;

    return finding(
      "pass",
      `no CSI escapes across ${relevant.length} non-TTY invocation(s)`,
      relevant.map((o) => o.id),
    );
  },
};
