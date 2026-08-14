import { findingFor } from "../../finding.ts";
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
    // Every probe the runner makes captures to a pipe, so the target was never writing to a
    // TTY — that is exactly the condition this rule requires. No TTY emulation needed.
    const offenders = relevant.filter((o) => ANSI.test(o.stdout) || ANSI.test(o.stderr));
    return offenders.length
      ? finding(
          "fail",
          `${offenders.length} invocation(s) emitted ANSI escapes with no terminal attached`,
          offenders.map((o) => o.id),
        )
      : finding(
          "pass",
          `no escapes across ${relevant.length} invocation(s)`,
          relevant.map((o) => o.id),
        );
  },
};
