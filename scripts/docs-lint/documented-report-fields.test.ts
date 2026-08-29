import { describe, expect, test } from "bun:test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DOCUMENTED_REPORT_FIELDS, UNDOCUMENTED_REPORT_FIELDS } from "../../src/acc/kit/report.ts";
import {
  definedNames,
  documentedReportFieldProblems,
  GUIDE_PATH,
  reportFieldCounts,
  reportFieldCountsLine,
  scanGuide,
  stripFences,
} from "./documented-report-fields.ts";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const SPEC = { Report: { conformant: "field", sweep: "field" } };

describe("definedNames", () => {
  test("a bullet term defines its names", () => {
    expect([...definedNames("- **`conformant`** — the gate.\n")]).toEqual(["conformant"]);
  });

  test("a term wrapped onto a continuation line still defines its last name", () => {
    const names = definedNames(
      "- **`waivers`, `knownFailures`,\n  `inertExpectations`** — yours.\n",
    );
    expect(names.has("inertExpectations")).toBe(true);
  });

  test("a name after the em dash is used, not defined", () => {
    const names = definedNames(
      "- **`probes`** — one entry each; `env` appears where it differs.\n",
    );
    expect(names.has("probes")).toBe(true);
    expect(names.has("env")).toBe(false);
  });

  // THE SILENT-WIDENING GUARD. A colon-form bullet has no em dash to cut the term at; without the
  // bold-run fallback the whole body counts as term and every name in the explanation is silently
  // accepted, which weakens the gate instead of reddening it.
  test("a colon-form bullet defines only its bold run, not the names in its explanation", () => {
    const names = definedNames("- **`probes`**: one entry each; `env` appears where it differs.\n");
    expect(names.has("probes")).toBe(true);
    expect(names.has("env")).toBe(false);
  });

  test("a bullet with neither an em dash nor a bold run defines nothing", () => {
    expect([...definedNames("- see `env` and `repeat` for the rest\n")]).toEqual([]);
  });

  // The fallback is ANCHORED to the item's opening. Unanchored, it would take the first bold run
  // anywhere in the item, so a sentence that defines nothing would define its emphasised name —
  // the same silent widening one step smaller.
  test("a bold run mid-sentence is not a term, even with no em dash to cut at", () => {
    expect([...definedNames("- see the **`env`** field for the rest\n")]).toEqual([]);
  });

  test("a nested bullet is its own definition, not its parent's explanation", () => {
    const names = definedNames("- **`probes`** — five fields:\n  - **`id`** — the id.\n");
    expect(names.has("id")).toBe(true);
  });

  test("a table row defines the names in its first cell only", () => {
    const names = definedNames("| `sweep` | see `capturedAt` |\n");
    expect(names.has("sweep")).toBe(true);
    expect(names.has("capturedAt")).toBe(false);
  });

  test("a heading defines its names", () => {
    expect(definedNames("### The `counts` block\n").has("counts")).toBe(true);
  });

  test("prose is not a definition, however emphatic", () => {
    expect([...definedNames("`conformant` is the gate: no core rule violated.\n")]).toEqual([]);
  });
});

describe("stripFences", () => {
  // Measured: without the strip, backtick pairing runs across fence boundaries and manufactures
  // eight "missing" fields that are artefacts of the scan rather than facts about the page.
  test("a name that appears only inside a fence is a specimen, not a definition", () => {
    const text = "```json\n- **`sweep`** — not really a bullet\n```\n- **`conformant`** — gate\n";
    expect(definedNames(text).has("sweep")).toBe(false);
    expect(definedNames(text).has("conformant")).toBe(true);
  });

  test("an unterminated fence swallows the rest of the file rather than inventing definitions", () => {
    expect(stripFences("```\n- **`sweep`** — x\n").includes("sweep")).toBe(false);
  });

  // KNOWN AND PINNED: the toggle is marker-agnostic, so `~~~` closes a ``` block. Harmless here —
  // it can only ever end a fence early, and the guide mixes no markers — but left unpinned a
  // future change to the toggle could flip this into swallowing live prose.
  test("the fence toggle is marker-agnostic: `~~~` closes a ``` block", () => {
    const names = definedNames("```\n- **`sweep`** — in fence\n~~~\n- **`conformant`** — out\n");
    expect(names.has("sweep")).toBe(false);
    expect(names.has("conformant")).toBe(true);
  });
});

describe("scanGuide", () => {
  test("a field defined in a bullet term passes", () => {
    expect(scanGuide("- **`conformant`** — a\n- **`sweep`** — b\n", SPEC)).toEqual([]);
  });

  test("an absent field produces exactly one problem naming it, the guide and the limit", () => {
    const problems = scanGuide("- **`conformant`** — a\n", SPEC);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("Report.sweep");
    expect(problems[0]).toContain(GUIDE_PATH);
    // The limit is named where someone hitting the gate will read it.
    expect(problems[0]).toContain("top-level keys only");
  });

  test("a drive-by mention in prose does not satisfy the gate", () => {
    const problems = scanGuide("`conformant` and `sweep` are both real fields.\n", SPEC);
    expect(problems).toHaveLength(2);
  });

  // The interim seam that keeps the LIST OF TYPES from being silent while the spec is flat.
  test("a key naming a type absent from the spec fails, even when the guide defines the key", () => {
    const problems = scanGuide("- **`findings`** — a\n", {
      Report: { findings: { type: "ReportedFinding" } },
    });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("UNSPECIFIED TYPE");
    expect(problems[0]).toContain("ReportedFinding");
  });

  test("a key naming a type the spec does hold raises nothing on that account", () => {
    const problems = scanGuide("- **`findings`** — a\n- **`ruleId`** — b\n", {
      Report: { findings: { type: "ReportedFinding" } },
      ReportedFinding: { ruleId: "field" },
    });
    expect(problems).toEqual([]);
  });
});

// THE VALVE: two grounds, either sufficient — documented on the page, or declared undocumented by
// name. Either one passes; having NEITHER still fails. See limit 5 in the module.
describe("scanGuide, the undocumented declaration", () => {
  test("a field declared undocumented passes without a guide entry", () => {
    expect(scanGuide("- **`conformant`** — a\n", SPEC, new Set(["sweep"]))).toEqual([]);
  });

  test("a field in neither the guide nor the declaration still fails", () => {
    const problems = scanGuide("- **`conformant`** — a\n", SPEC, new Set());
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("Report.sweep");
  });

  // The message is where the author meets the second path; if it only ever names the first, the
  // valve exists and nobody hitting the gate is told about it.
  test("the failure names both ways out, not just the bullet", () => {
    const problems = scanGuide("- **`conformant`** — a\n", SPEC, new Set());
    expect(problems[0]).toContain("UNDOCUMENTED_REPORT_FIELDS");
    expect(problems[0]).toContain("the term of a bullet");
  });

  // The declaration is a valve on the guide requirement and nothing else: it must not smuggle a
  // key past the LIST OF TYPES check, which is about the shape of the spec rather than the page.
  test("declaring a field undocumented does not silence the UNSPECIFIED TYPE check", () => {
    const problems = scanGuide(
      "",
      { Report: { findings: { type: "ReportedFinding" } } },
      new Set(["findings"]),
    );
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("UNSPECIFIED TYPE");
  });

  test("the real declaration set is empty — every listed field is documented at this revision", () => {
    expect([...UNDOCUMENTED_REPORT_FIELDS]).toEqual([]);
  });
});

describe("reportFieldCounts", () => {
  test("listed is the total over every type, and undocumented is the declaration's size", () => {
    expect(
      reportFieldCounts(
        { Report: { conformant: "field", sweep: "field" }, EvidenceProbe: { id: "field" } },
        new Set(["sweep"]),
      ),
    ).toEqual({ listed: 3, undocumented: 1 });
  });

  // Both numbers, never one: the declared size falls for three unlike reasons and only the
  // denominator separates "a field left the type" from the other two.
  test("the line carries both counters", () => {
    expect(
      reportFieldCountsLine({ Report: { conformant: "field" } }, new Set(["conformant"])),
    ).toBe("report fields: 1 listed, 1 declared undocumented");
  });

  test("the real counts are the live spec's, and are reported even when nothing is wrong", () => {
    const { listed, undocumented } = reportFieldCounts();
    expect(listed).toBe(
      Object.values(DOCUMENTED_REPORT_FIELDS).reduce((n, k) => n + Object.keys(k).length, 0),
    );
    expect(undocumented).toBe(UNDOCUMENTED_REPORT_FIELDS.size);
    expect(reportFieldCountsLine()).toBe(
      `report fields: ${listed} listed, ${undocumented} declared undocumented`,
    );
  });
});

describe("documentedReportFieldProblems", () => {
  test("the real guide defines every top-level field of every published report type", () => {
    expect(documentedReportFieldProblems(REPO_ROOT)).toEqual([]);
  });

  // The forward direction is only worth anything if there is something to check: a silently
  // emptied or renamed spec would make the assertion above pass vacuously.
  test("the spec covers all four published types and every type carries keys", () => {
    expect(Object.keys(DOCUMENTED_REPORT_FIELDS).sort()).toEqual([
      "EvidenceProbe",
      "Report",
      "ReportedFinding",
      "ReportedObservation",
    ]);
    for (const keys of Object.values(DOCUMENTED_REPORT_FIELDS))
      expect(Object.keys(keys).length).toBeGreaterThan(0);
  });
});
