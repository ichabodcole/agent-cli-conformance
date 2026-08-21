import {
  crashedUnverified,
  findingFor,
  hungUnverified,
  truncatedUnverified,
} from "../../finding.ts";
import { machineErrorProbesFor, parsesAsNdjson, parsesWhole } from "../../machine-mode.ts";
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
    "a machine mode is reached only through a declaration so a target whose machine mode is real but undeclared is not checked and only an unrecognised flag provokes the error a declared target is judged on",
    "only an unrecognised flag provokes the error so a missing value or a missing required argument or an out-of-set value is not",
    "the answer is only required to parse and is never checked against a declared envelope shape",
    "that the invocation failed to PARSE is inferred from a non-zero exit rather than observed",
    "NDJSON is reported unverified rather than failed because no output kind is declared at L0",
  ],
  coverageEstablished: [
    "for a target that DECLARES machine mode its default an unrecognised flag leaves at least one stream whose whole content parses as exactly one JSON document",
  ],

  probes: (d: Discovery): Invocation[] => [
    ...machineErrorProbesFor(d).map(({ args, how }) => ({
      args,
      inertness: "sentinel" as const,
      purpose: `B5 via ${how}: a parser error must still be a machine document`,
    })),
  ],

  check: (h: History): Finding => {
    const ways = machineErrorProbesFor(h.discovery);
    if (ways.length === 0) {
      return finding(
        "unverified",
        "no machine mode was DECLARED, and a flag matched from help by spelling is a guess at one rather than evidence of one; add `machineMode` to acc.config.json to have this checked",
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

    const streams = answers(o.stdout, o.stderr);
    if (streams.length === 0) {
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
    return finding(
      "fail",
      // The consequence, not just the fact: an agent that branched on a field of the envelope it
      // was promised got `undefined`, and an agent that piped the stream got prose.
      `machine mode via ${how} and the parser error came back as prose on ${streams.map((s) => s.stream).join(" and ")} (exit ${o.exitCode}): ${JSON.stringify(streams[0]?.text.slice(0, 60))}`,
      [o.id],
    );
  }
}
