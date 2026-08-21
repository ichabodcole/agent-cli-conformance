import { findingFor } from "../../finding.ts";
import type { Checker, Finding, History, Invocation } from "../../types.ts";

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

const _parsesAsNdjson = (s: string): boolean => {
  const lines = s.trim().split("\n").filter(Boolean);
  return lines.length > 0 && lines.every(parses);
};

/** B3 — docs/wiki/rules/streams/machine-output-is-parseable.md */
export const machineOutputParseableChecker: Checker = {
  ruleId: RULE_ID,
  rulePath: "docs/wiki/rules/streams/machine-output-is-parseable.md",
  tier: "core",
  probeLevel: "L1",
  // The page says an undeclared `output_kind` defaults to `data`, which makes NDJSON a
  // violation; the NDJSON branch below returns `unverified` instead, because nothing was
  // DECLARED and punishing a tool for a choice it was never asked to state is the wrong error.
  // That is a deliberate softening of the rule, so it belongs here rather than only in a
  // comment. The other two: the only probe is machine-mode HELP, and the two MUST NOTs about
  // shape stability need at least two invocations to compare, which this checker never makes.
  //
  // The fourth is the rest of the page's own table (review R6-5). Three output kinds are
  // normative and exactly one of them is ever tested: a `pass` here says "the whole stream is
  // one JSON document", which is the `data` row. `stream` (every line one object, first record
  // prompt) and `opaque` (no JSON expected, `media_type` declared) have no probe at all, and
  // cannot get one until a declaration exists to select them — the same L1 boundary the first
  // entry names, reached from the other side.
  coverage: "partial",
  coverageGaps: [
    "a machine mode is reached only through a declaration so a target with a real machine mode that never declares one is not checked for it at all",
    "the undeclared-output default of data is not enforced at L0 so NDJSON is reported unverified rather than failed",
    "shape stability across invocations and across commands is not compared",
    "the stream and opaque output kinds are never exercised because no declaration exists at L0 to select them",
  ],
  coverageEstablished: [
    "nothing at L0 — this rule is L1 and reports not-applicable until a declaration names a command whose output it may read",
  ],

  // NOT REACHABLE AT L0 AT ALL, which is a probe-level fact rather than an exception. This rule's subject is the output of a DATA command, and choosing one means
  // knowing it is side-effect-free, which nothing at L0 knows. `--help <selector>` stood in for it
  // on the strength of a flag matched from help by SPELLING — a guess that a machine mode exists,
  // and the guess this catalogue spent seven attempts failing to make safe.
  probes: (): Invocation[] => [],

  check: (h: History): Finding =>
    finding(
      "unverified",
      h.discovery.machineModeDefault
        ? "machine mode is declared the default, and this rule's subject is a DATA command's output — selecting one needs to know it is side-effect-free, which nothing at L0 knows; see B5, which reaches the declared default inertly"
        : "no machine mode was DECLARED, and a flag matched from help by spelling is a guess at one rather than evidence of one; add `machineMode` to acc.config.json and this rule becomes reachable at L1",
      [],
    ),
};
