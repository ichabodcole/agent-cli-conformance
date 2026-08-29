import { describe, expect, test } from "bun:test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DOCUMENTED_REPORT_FIELDS } from "../../src/acc/kit/report.ts";
import {
  definedNames,
  documentedReportFieldProblems,
  GUIDE_PATH,
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
