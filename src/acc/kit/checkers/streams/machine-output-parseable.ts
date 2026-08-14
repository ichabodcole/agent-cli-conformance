import { findingFor, hungUnverified, truncatedUnverified } from "../../finding.ts";
import type { Checker, Discovery, Finding, History, Invocation } from "../../types.ts";
import { findByPurpose } from "../../types.ts";

const RULE_ID = "B3";

const finding = findingFor(RULE_ID);

const parses = (s: string): boolean => {
  try {
    JSON.parse(s);
    return true;
  } catch {
    return false;
  }
};

const parsesAsNdjson = (s: string): boolean => {
  const lines = s.trim().split("\n").filter(Boolean);
  return lines.length > 0 && lines.every(parses);
};

/** B3 — docs/wiki/rules/streams/machine-output-is-parseable.md */
export const machineOutputParseableChecker: Checker = {
  ruleId: RULE_ID,
  rulePath: "docs/wiki/rules/streams/machine-output-is-parseable.md",
  tier: "core",
  probeLevel: "L0",

  probes: (d: Discovery): Invocation[] =>
    // `--format` is deliberately NOT treated as a format selector here (see inert.ts's
    // FORMAT_TOKENS): it takes a value, and a bare value token is indistinguishable from a
    // verb, so only the `--json` pairing with `--help` is L0-safe.
    d.machineModeFlag === "--json"
      ? [{ args: ["--help", "--json"], inertness: "help-path", purpose: "B3: machine-mode help" }]
      : [],

  check: (h: History): Finding => {
    if (h.discovery.machineModeFlag === null) {
      return finding(
        "unverified",
        "no machine-mode flag was advertised in help, so there is nothing to parse",
        [],
      );
    }
    // findByPurpose, not findByArgs: the args `["--help", "--json"]` belong solely to this
    // checker today, but findByArgs matches on args while ignoring env, so it is the wrong
    // default to reach for on a probe result — see types.ts's doc comment on findByArgs.
    const [o] = findByPurpose(h, "B3:");
    if (!o) {
      return finding("unverified", "probe was not recorded", []);
    }
    // Already unverified below via the empty-stdout branch, but that detail would blame the
    // target for producing no output when in fact we killed it. Say which happened.
    const hung = hungUnverified(finding, [o]);
    if (hung) return hung;
    // The one place truncation would produce a confidently WRONG fail: a valid JSON document cut
    // at the ceiling does not parse, and "machine-mode stdout is neither one JSON document nor
    // NDJSON" would blame the target for a bracket we refused to read.
    const cut = truncatedUnverified(finding, [o]);
    if (cut) return cut;

    if (o.stdout.trim() === "") {
      return finding("unverified", "machine-mode probe produced no stdout", [o.id]);
    }
    if (parses(o.stdout)) {
      return finding("pass", "whole stdout parses as one document", [o.id]);
    }
    // Nothing was DECLARED, so NDJSON is a plausible legitimate design. Failing it here would
    // punish a tool for a choice it was never asked to state. Hard check arrives at L1.
    if (parsesAsNdjson(o.stdout)) {
      return finding(
        "unverified",
        "stdout is NDJSON, not one document; no output_kind declared to check against",
        [o.id],
      );
    }
    return finding("fail", "machine-mode stdout is neither one JSON document nor NDJSON", [o.id]);
  },
};
