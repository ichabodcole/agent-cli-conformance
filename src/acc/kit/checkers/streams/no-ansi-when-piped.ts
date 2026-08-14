import { findingFor, hungUnverified, truncatedUnverified } from "../../finding.ts";
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
  coverage: "partial",
  coverageGaps: [
    "only CSI escapes are detected and not OSC or single-character escape sequences",
    "carriage-return animation is not detected",
    "the NO_COLOR and --no-color and TERM=dumb overrides need a TTY and are never exercised",
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

    return finding(
      "pass",
      `no CSI escapes across ${relevant.length} non-TTY invocation(s)`,
      relevant.map((o) => o.id),
    );
  },
};
