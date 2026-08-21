import {
  crashedUnverified,
  findingFor,
  hungUnverified,
  truncatedUnverified,
} from "../../finding.ts";
import {
  machineSelector,
  selectorCorroborationProbes,
  selectorObserved,
} from "../../machine-mode.ts";
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
    "a flag spelled like a machine-mode selector is only treated as one once some observation came back structured under it so a target whose advertised selector emits prose everywhere is reported unverified rather than failed",
    "the undeclared-output default of data is not enforced at L0 so NDJSON is reported unverified rather than failed",
    "only machine-mode help is parsed and never a data command",
    "shape stability across invocations and across commands is not compared",
    "the stream and opaque output kinds are never exercised because no declaration exists at L0 to select them",
  ],
  coverageEstablished: [
    "for a target whose root help advertises --json the entire stdout of machine-mode help parses as exactly one JSON document",
  ],

  probes: (d: Discovery): Invocation[] =>
    // `--format` is deliberately NOT treated as a format selector here (see inert.ts's
    // FORMAT_TOKENS): it takes a value, and a bare value token is indistinguishable from a
    // verb, so only the `--json` pairing with `--help` is L0-safe.
    d.machineModeFlag === "--json"
      ? [
          { args: ["--help", "--json"], inertness: "help-path", purpose: "B3: machine-mode help" },
          ...selectorCorroborationProbes(d, ["version"]),
        ]
      : [],

  check: (h: History): Finding => {
    // Declared machine-first, and still out of reach — for a reason worth stating precisely
    // rather than reporting as "no machine mode was advertised", which would be false.
    //
    // B3 is about the output of a DATA command, and `--help` is not one: a machine-first CLI may
    // legitimately answer help in prose while every data command emits JSON, which is exactly the
    // shape that prompted the declaration. Selecting a data command needs to know one is
    // side-effect-free, and nothing at L0 knows that. B5 does reach this target, because a parser
    // error can be provoked inertly.
    if (h.discovery.machineModeDefault && h.discovery.machineModeFlag === null) {
      return finding(
        "unverified",
        "machine mode is declared the default, but no data command can be selected inertly at L0 to read its output; the error path is covered by B5",
        [],
      );
    }
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
    // The crash equivalent of the wrong fail below: a target that dies mid-document leaves
    // stdout unparseable, and blaming it for a closing brace it was killed before writing is the
    // same error as blaming it for one we refused to read.
    const crashed = crashedUnverified(finding, [o]);
    if (crashed) return crashed;
    // The one place truncation would produce a confidently WRONG fail: a valid JSON document cut
    // at the ceiling does not parse, and "machine-mode stdout is neither one JSON document nor
    // NDJSON" would blame the target for a bracket we refused to read.
    const cut = truncatedUnverified(finding, [o]);
    if (cut) return cut;

    if (o.stdout.trim() === "") {
      return finding("unverified", "machine-mode probe produced no stdout", [o.id]);
    }
    if (parses(o.stdout)) {
      return finding("pass", "machine-mode help parses whole as one document", [o.id]);
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
    // A FLAG NAME IS NOT A SELECTOR. `--json` is matched from help by spelling, so a CLI whose
    // `--json` names an input format was being convicted of breaking a contract it never entered.
    // If nothing this target produced under the selector ever parsed, we never saw the flag select
    // anything, and the honest verdict is that nothing was established.
    if (!selectorObserved(h, ["version"])) {
      return finding(
        "unverified",
        `nothing this target produced under ${machineSelector(h.discovery)} parsed as a document, so that flag was not established as a machine-mode selector`,
        [o.id],
      );
    }
    return finding("fail", "machine-mode stdout is neither one JSON document nor NDJSON", [o.id]);
  },
};
