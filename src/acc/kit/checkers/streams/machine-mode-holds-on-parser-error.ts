import {
  crashedUnverified,
  findingFor,
  hungUnverified,
  truncatedUnverified,
} from "../../finding.ts";
import {
  machineErrorProbesFor,
  machineSelector,
  parsesAsNdjson,
  parsesWhole,
  selectorCorroborationProbes,
  selectorObserved,
} from "../../machine-mode.ts";
import type { Checker, Discovery, Finding, History, Invocation } from "../../types.ts";
import { findByPurpose } from "../../types.ts";

const RULE_ID = "B5";

const finding = findingFor(RULE_ID);

/** Every non-empty stream, labelled, so a verdict can say WHERE the answer arrived. */
function answers(stdout: string, stderr: string): Array<{ stream: string; text: string }> {
  return [
    { stream: "stderr", text: stderr },
    { stream: "stdout", text: stdout },
  ].filter((s) => s.text.trim() !== "");
}

/** B5 — docs/wiki/rules/streams/machine-mode-holds-on-parser-errors.md */
export const machineModeHoldsOnParserErrorChecker: Checker = {
  ruleId: RULE_ID,
  rulePath: "docs/wiki/rules/streams/machine-mode-holds-on-parser-errors.md",
  tier: "core",
  probeLevel: "L0",
  // One parser error, provoked one way, with machine mode selected one way.
  //
  // THE SELECTION GAP IS THE LOAD-BEARING ONE, and the archaeology names it: the fix that only
  // repaired the explicit-flag row left the NO-FLAG-PIPED row broken, which is the row that
  // matters most, because piped output already defaults to machine mode and a tool's own emitted
  // commands pass no format flag at all. This probe selects machine mode EXPLICITLY, so a target
  // whose parser errors bypass format resolution entirely is caught only if its explicit path is
  // broken too.
  //
  // The verdict is also stream-agnostic on purpose. This rule owns the SHAPE of the answer; B1
  // owns which stream may carry it. A target that answers with a valid envelope on stdout passes
  // here and fails B1, which is one defect reported once by each rule that governs half of it —
  // not the same rule twice.
  coverage: "partial",
  coverageGaps: [
    "a flag whose help shows a required value slot is not treated as a machine-mode selector but only the bracketed and attached spellings are read so a bare-word metavar such as `--json FILE` is still probed as though it were a mode switch",
    "a flag spelled like a machine-mode selector is only treated as one once it is seen to CHANGE an answer so a target whose advertised selector produces the same output with and without it on every pair this kit can compare is reported unverified rather than failed",
    "machine mode is selected explicitly unless the target declared it the default so for an undeclared target the piped-default resolution path that the same defect most often breaks is never exercised",
    "only an unrecognised flag provokes the error so a missing value or a missing required argument or an out-of-set value is not",
    "only the --json and --format=json selectors are probed so a machine mode advertised through --output is not",
    "the answer is only required to parse and is never checked against a declared envelope shape",
    "that the invocation failed to PARSE is inferred from a non-zero exit rather than observed",
    "NDJSON is reported unverified rather than failed because no output kind is declared at L0",
  ],
  coverageEstablished: [
    "for a target whose root help advertises --json or --format or which declares machine mode its default an unrecognised flag leaves at least one stream whose whole content parses as exactly one JSON document",
  ],

  probes: (d: Discovery): Invocation[] => [
    ...machineErrorProbesFor(d).map(({ args, how }) => ({
      args,
      inertness: "sentinel" as const,
      purpose: `B5 via ${how}: a parser error must still be a machine document`,
    })),
    ...selectorCorroborationProbes(d),
  ],

  check: (h: History): Finding => {
    const ways = machineErrorProbesFor(h.discovery);
    if (ways.length === 0) {
      return finding(
        "unverified",
        "no machine mode this probe can reach was advertised in help or declared, so there is no mode to hold",
        [],
      );
    }

    // EVERY way in is checked, and the worst answer decides.
    //
    // A target reachable both ways must hold in both. Taking the best of them would let a
    // declaration excuse the selector path it got wrong, which is a config buying a verdict.
    const results = ways.map(({ how }) => one(h, `B5 via ${how}:`, how));
    const failed = results.find((r) => r.verdict === "fail");
    if (failed) return failed;
    const unresolved = results.find((r) => r.verdict === "unverified");
    if (unresolved) return unresolved;
    return results[0] as Finding;
  },
};

/** One way in, evaluated on its own. `how` names it, so a report says which path answered. */
function one(h: History, purpose: string, how: string): Finding {
  {
    const [o] = findByPurpose(h, purpose);
    if (!o) return finding("unverified", `probe was not recorded (${how})`, []);
    // A target still thinking about the flag has emitted no outcome at all, in any shape.
    const hung = hungUnverified(finding, [o]);
    if (hung) return hung;
    // The one place truncation would produce a confidently WRONG fail, and it is the same trap
    // B3 documents: a valid document cut at the ceiling does not parse, and "the failure was
    // reported as prose" would blame the target for a closing brace we refused to read.
    const cut = truncatedUnverified(finding, [o]);
    if (cut) return cut;
    // A target that fell over reported no outcome, so it did not report one in the wrong shape.
    const crashed = crashedUnverified(finding, [o]);
    if (crashed) return crashed;

    // THE PRECONDITION. This rule governs how a FAILURE is reported, and a target that exited 0
    // did not report one — it accepted the unknown flag, which is A1's violation and not this
    // rule's. Reported as a fail here it would convict the target twice for one defect under a
    // rule whose subject never occurred.
    if (o.exitCode === 0) {
      return finding(
        "unverified",
        "the invocation exited 0 rather than failing to parse, so no parser-error path was observed; see A1",
        [o.id],
      );
    }

    // THE PRECONDITION FOR CONDEMNING UNDER THE SELECTOR, consulted on the two paths below that
    // do — and on neither the pass nor the unverified ones.
    //
    // This rule condemns a target for answering in prose WHILE IN machine mode, so the flag has to
    // have been shown to select one: `--json <file>   Treat the input file as JSON` is an ordinary
    // help entry and the CLI behind it is text-only, answering every probe in prose because prose
    // is all it emits.
    //
    // Placement is the whole of it, and it has been wrong in both directions. Too late — after the
    // empty-streams branch — and a target that rejects the sentinel silently is failed with the
    // words "machine mode via --json" on a selector the same run reports as unestablished. Too
    // early, at the top of this function, and a CLI whose machine mode is real only on the ERROR
    // path answers THIS probe with a JSON document and is told nothing came back under the flag: a
    // measured, correct pass thrown away. A guard belongs on the paths it is a precondition for.
    //
    // A DECLARED default is exempt. The premise there is a declaration rather than an inference
    // about a flag name, and a target that declares machine mode its default while advertising
    // `--json` has said the flag is a mode selector. Probing only the declared path would take its
    // word for the half it got right and never look at the half it got wrong.
    const condemnable =
      how === "the declared default" ||
      h.discovery.machineModeDefault ||
      h.discovery.machineModeFlag === null ||
      selectorObserved(h);
    const unestablished = (): Finding =>
      finding(
        "unverified",
        `${machineSelector(h.discovery)} did not change what any probe came back with — the same answers arrive with and without it — so it was not established as a machine-mode selector`,
        [o.id],
      );

    const streams = answers(o.stdout, o.stderr);
    if (streams.length === 0) {
      if (!condemnable) return unestablished();
      return finding(
        "fail",
        `machine mode via ${how} and the failure was reported with nothing on either stream (exit ${o.exitCode})`,
        [o.id],
      );
    }

    const document = streams.find((s) => parsesWhole(s.text));
    if (document) {
      return finding(
        "pass",
        `the parser error arrived on ${document.stream} as one JSON document (exit ${o.exitCode})`,
        [o.id],
      );
    }
    // Same softening as B3, for the same reason: nothing was DECLARED, so a stream of valid
    // NDJSON is a plausible legitimate design and failing it would punish a tool for a choice it
    // was never asked to state. The hard check arrives with the declaration, at L1.
    const ndjson = streams.find((s) => parsesAsNdjson(s.text));
    if (ndjson) {
      return finding(
        "unverified",
        `the parser error arrived on ${ndjson.stream} as NDJSON rather than one document; no output_kind declared to check against`,
        [o.id],
      );
    }
    if (!condemnable) return unestablished();
    return finding(
      "fail",
      // The consequence, not just the fact: an agent that branched on a field of the envelope it
      // was promised got `undefined`, and an agent that piped the stream got prose.
      `machine mode via ${how} and the parser error came back as prose on ${streams.map((s) => s.stream).join(" and ")} (exit ${o.exitCode}): ${JSON.stringify(streams[0]?.text.slice(0, 60))}`,
      [o.id],
    );
  }
}
