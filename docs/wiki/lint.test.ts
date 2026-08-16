// Tests for the wiki-specific half of the lint: `ruleChecks`.
//
// A rule page is the human-readable half of a conformance checker; this check is what stops
// the two drifting. It runs as `extraChecks` inside `runDocsLint` (the seam itself is covered
// in scripts/docs-lint/index.test.ts), so here it is exercised directly against synthesised
// `LintPage`s — no temp wikis needed, and no dependence on the real `docs/wiki/*.md`, which
// change constantly.
//
// That this file imports `../../docs/wiki/lint.ts` at all is itself the regression test for
// the `import.meta.main` guard: before it, importing ran the wiki lint and killed the runner.

import { expect, test } from "bun:test";
import { join } from "node:path";
import { type LintPage, yamlList } from "../../scripts/docs-lint/index.ts";
import { CHECKERS } from "../../src/acc/kit/registry.ts";
import { AMBIGUOUS_SIGNALS, FAULT_SIGNALS } from "../../src/acc/kit/signals.ts";
import {
  AMBIGUOUS_SIGNALS_MARKER,
  COVERAGE_HEADING,
  catalogEntries,
  coverageMatrix,
  ESTABLISHED_MARKER,
  FAULT_SIGNALS_MARKER,
  GAPS_MARKER,
  hookChecks,
  MATRIX_HEADING,
  matrixChecks,
  normalizeBlock,
  readPages,
  ruleChecks,
  sectionBody,
  signalScopeChecks,
  slugChecks,
  statedEstablished,
  statedGaps,
  statedSignals,
} from "./lint.ts";

/**
 * A `LintPage` carrying just the frontmatter under test.
 *
 * A `rule` page also gets the `## Current checker coverage` body it owes, generated from its own
 * `coverage_established` and `coverage_gaps` so the two prose-versus-frontmatter checks are
 * satisfied by construction. Without that every test in this file about some OTHER field would
 * also report a missing section.
 */
function pageOf(rel: string, fields: Record<string, string>): LintPage {
  const gaps = yamlList(fields.coverage_gaps);
  const established = yamlList(fields.coverage_established);
  return {
    path: join(import.meta.dir, rel),
    rel,
    fields: new Map(Object.entries(fields)),
    body:
      fields.type === "rule"
        ? [
            "## The probe",
            "",
            COVERAGE_HEADING,
            "",
            ESTABLISHED_MARKER,
            "",
            ...established.map((e) => `- ${e}`),
            "",
            GAPS_MARKER,
            "",
            ...gaps.map((g) => `- ${g}`),
            "",
            "## How to comply",
            "",
          ].join("\n")
        : "",
  };
}

// The live `A1` checker's declared lists. The baseline below carries them so that a test
// flipping `checker_status` to `implemented` — several do, to reach the tier and probe_level
// cross-checks — does not also trip the coverage cross-check it isn't about.
//
// READ FROM THE REGISTRY, not copied. Two hand-maintained copies of one list is the exact drift
// this wiki fails the gate on, and a copy here would go stale silently: the tests it feeds assert
// the LINT's behaviour, never these strings' content, so a mismatch shows up as fourteen
// unrelated failures rather than as anything a reader can act on. The one test that is about the
// content overrides them explicitly.
const A1 = CHECKERS.find((c) => c.ruleId === "A1") as (typeof CHECKERS)[number];
const A1_GAPS = A1.coverageGaps;
const A1_ESTABLISHED = A1.coverageEstablished;

/** Frontmatter of a rule page that satisfies every check. */
const OK_RULE: Record<string, string> = {
  type: "rule",
  rule_id: "A1",
  tier: "core",
  probe_level: "L0",
  checker: "scripts/checkers/parsing/unknown-flag.ts",
  checker_status: "planned",
  coverage: "partial",
  coverage_gaps: `[${A1_GAPS.join(", ")}]`,
  coverage_established: `[${A1_ESTABLISHED.join(", ")}]`,
};

const rule = (rel: string, over: Record<string, string> = {}): LintPage =>
  pageOf(rel, { ...OK_RULE, ...over });

/** Drop a key from the valid baseline. */
function without(key: string): Record<string, string> {
  const { [key]: _dropped, ...rest } = OK_RULE;
  return rest;
}

// `src/acc/kit/checkers/parsing/unknown-flag.ts` is now real, so the REVERSE direction (a
// checker file no page declares) fires against every test below unless its pages happen to
// declare that exact path — which is not what any of these tests are about. `forward` isolates
// the FORWARD direction (page → checker) they actually exercise; the reverse direction gets its
// own live tests further down.
function forward(pages: LintPage[]): string[] {
  return ruleChecks(pages).filter((p) => !p.startsWith("UNDOCUMENTED"));
}

test("a valid rule page produces no problems", () => {
  expect(forward([rule("rules/parsing/a1.md")])).toEqual([]);
});

test("no pages at all produces no problems", () => {
  expect(forward([])).toEqual([]);
});

test("non-rule pages are ignored entirely", () => {
  const pages = [
    pageOf("index.md", { type: "index" }),
    pageOf("concepts/exit-codes.md", { type: "concept", tier: "nonsense" }),
    pageOf("SCHEMA.md", {}),
  ];
  expect(forward(pages)).toEqual([]);
});

test("a missing rule_id is reported", () => {
  const problems = forward([pageOf("rules/parsing/a1.md", without("rule_id"))]);
  expect(problems).toHaveLength(1);
  expect(problems[0]).toMatch(/^MISSING rule_id rules\/parsing\/a1\.md\s+\(every rule page needs/);
});

test("an empty rule_id counts as missing", () => {
  const problems = forward([rule("rules/parsing/a1.md", { rule_id: "" })]);
  expect(problems).toEqual([expect.stringContaining("MISSING rule_id")]);
});

test("a duplicate rule_id is reported, naming the page that claimed it first", () => {
  const problems = forward([
    rule("rules/parsing/a1.md"),
    rule("rules/streams/also-a1.md", { checker: "scripts/checkers/streams/x.ts" }),
  ]);
  expect(problems).toHaveLength(1);
  expect(problems[0]).toBe(
    'DUPLICATE rule_id rules/streams/also-a1.md: "A1" already used by rules/parsing/a1.md',
  );
});

test("a third page with the same rule_id is reported too", () => {
  const problems = forward([rule("rules/a.md"), rule("rules/b.md"), rule("rules/c.md")]).filter(
    (p) => p.startsWith("DUPLICATE"),
  );
  expect(problems).toHaveLength(2);
});

test("rule_id uniqueness is scoped to rule pages", () => {
  const problems = forward([
    rule("rules/parsing/a1.md"),
    pageOf("concepts/exit-codes.md", { type: "concept", rule_id: "A1" }),
  ]);
  expect(problems).toEqual([]);
});

test("distinct rule_ids across many pages are fine", () => {
  const pages = ["A1", "A2", "B1"].map((id, i) =>
    rule(`rules/r${i}.md`, { rule_id: id, checker: `scripts/checkers/r${i}.ts` }),
  );
  expect(forward(pages)).toEqual([]);
});

test.each(["core", "diagnostic"])("tier %s is accepted", (tier) => {
  expect(forward([rule("rules/a.md", { tier })])).toEqual([]);
});

test.each(["", "Core", "CORE", "optional", "core ", "critical"])("tier %j is rejected", (tier) => {
  const problems = forward([rule("rules/a.md", { tier })]);
  expect(problems).toHaveLength(1);
  expect(problems[0]).toContain("BAD tier");
  expect(problems[0]).toContain("not in {core, diagnostic}");
});

test("a missing tier is reported as BAD tier with an empty value", () => {
  const problems = forward([pageOf("rules/a.md", without("tier"))]);
  expect(problems).toHaveLength(1);
  expect(problems[0]).toMatch(/^BAD tier\s+rules\/a\.md: "" not in \{core, diagnostic\}$/);
});

test.each(["L0", "L1", "L2"])("probe_level %s is accepted", (probe_level) => {
  expect(forward([rule("rules/a.md", { probe_level })])).toEqual([]);
});

test.each(["", "l0", "L3", "0", "L0 ", "level-0"])("probe_level %j is rejected", (probe_level) => {
  const problems = forward([rule("rules/a.md", { probe_level })]);
  expect(problems).toHaveLength(1);
  expect(problems[0]).toContain("BAD probe_level");
  expect(problems[0]).toContain("not in {L0, L1, L2}");
});

test("a missing probe_level is reported as BAD probe_level with an empty value", () => {
  const problems = forward([pageOf("rules/a.md", without("probe_level"))]);
  expect(problems).toHaveLength(1);
  expect(problems[0]).toMatch(/^BAD probe_level rules\/a\.md: "" not in \{L0, L1, L2\}$/);
});

test("a missing checker is reported", () => {
  const problems = forward([pageOf("rules/a.md", without("checker"))]);
  expect(problems).toHaveLength(1);
  expect(problems[0]).toMatch(/^MISSING checker rules\/a\.md\s+\(name the file that enforces/);
});

test.each(["planned", "implemented"])("checker_status %s is accepted", (checker_status) => {
  // "implemented" also demands the file exist (covered below) — point at one that does, so
  // this case is isolated to the enum check.
  const checker = checker_status === "implemented" ? "docs/wiki/lint.ts" : OK_RULE.checker;
  expect(forward([rule("rules/a.md", { checker_status, checker })])).toEqual([]);
});

test.each(["", "Planned", "PLANNED", "done", "planned ", "in-progress"])(
  "checker_status %j is rejected",
  (checker_status) => {
    const problems = forward([rule("rules/a.md", { checker_status })]);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("BAD checker_status");
    expect(problems[0]).toContain("not in {planned, implemented}");
  },
);

test("a missing checker_status is reported as BAD checker_status with an empty value", () => {
  const problems = forward([pageOf("rules/a.md", without("checker_status"))]);
  expect(problems).toHaveLength(1);
  expect(problems[0]).toMatch(
    /^BAD checker_status rules\/a\.md: "" not in \{planned, implemented\}$/,
  );
});

// The ratchet: a `planned` rule owes nothing on disk, no matter what path it names — that is
// what lets a rule declare its checker before the file exists.
test("a planned rule with a checker path that does not exist produces no problem", () => {
  const problems = forward([
    rule("rules/a.md", { checker_status: "planned", checker: "src/acc/kit/checkers/nope.ts" }),
  ]);
  expect(problems).toEqual([]);
});

test("an implemented rule whose checker file does not exist is reported as MISSING CHECKER", () => {
  const problems = forward([
    rule("rules/a.md", {
      checker_status: "implemented",
      checker: "src/acc/kit/checkers/nope.ts",
    }),
  ]);
  expect(problems).toEqual([
    'MISSING CHECKER rules/a.md: declares "src/acc/kit/checkers/nope.ts", which does not exist',
  ]);
});

test("an implemented rule whose checker file exists produces no problem", () => {
  const problems = forward([
    rule("rules/a.md", { checker_status: "implemented", checker: "docs/wiki/lint.ts" }),
  ]);
  expect(problems).toEqual([]);
});

// probe_level drift: `Checker.probeLevel` gates the conformance verdict (a checker above the
// run's level is reported not-applicable, not unverified), so a page's frontmatter silently
// disagreeing with the live checker would misdescribe what a run actually verified. `A1`'s real
// checker (src/acc/kit/checkers/parsing/unknown-flag.ts) declares probeLevel "L0" — the
// registry is ground truth here, not the frontmatter these tests write.
test("an implemented rule whose probe_level disagrees with the checker's declared probeLevel is reported as MISMATCH", () => {
  const problems = forward([
    rule("rules/a.md", {
      checker_status: "implemented",
      checker: "docs/wiki/lint.ts",
      probe_level: "L1",
    }),
  ]);
  expect(problems).toEqual([
    'MISMATCH probe_level rules/a.md: page declares "L1", checker declares "L0"',
  ]);
});

test("an implemented rule whose probe_level agrees with the checker's declared probeLevel produces no problem", () => {
  const problems = forward([
    rule("rules/a.md", {
      checker_status: "implemented",
      checker: "docs/wiki/lint.ts",
      probe_level: "L0",
    }),
  ]);
  expect(problems).toEqual([]);
});

test("a planned rule's probe_level is not checked against the registry, even if it disagrees", () => {
  // `planned` rules have no live checker to compare against yet — `status` gates this the same
  // way it gates the MISSING CHECKER file-existence check above.
  const problems = forward([rule("rules/a.md", { checker_status: "planned", probe_level: "L2" })]);
  expect(problems).toEqual([]);
});

// tier drift: `Checker.tier` decides whether a rule's failure BLOCKS conformance at all — the
// more consequential of the two cross-checks, since a page claiming `core` while its checker
// says `diagnostic` describes a gate that does not exist. `A1`'s real checker declares
// tier "core"; the registry is ground truth here, not the frontmatter these tests write.
test("an implemented rule whose tier disagrees with the checker's declared tier is reported as MISMATCH", () => {
  const problems = forward([
    rule("rules/a.md", {
      checker_status: "implemented",
      checker: "docs/wiki/lint.ts",
      tier: "diagnostic",
    }),
  ]);
  expect(problems).toEqual([
    'MISMATCH tier rules/a.md: page declares "diagnostic", checker declares "core"',
  ]);
});

test("an implemented rule whose tier agrees with the checker's declared tier produces no problem", () => {
  const problems = forward([
    rule("rules/a.md", {
      checker_status: "implemented",
      checker: "docs/wiki/lint.ts",
      tier: "core",
    }),
  ]);
  expect(problems).toEqual([]);
});

test("a planned rule's tier is not checked against the registry, even if it disagrees", () => {
  const problems = forward([rule("rules/a.md", { checker_status: "planned", tier: "diagnostic" })]);
  expect(problems).toEqual([]);
});

test("an already-invalid tier is reported once, not also as a MISMATCH", () => {
  // BAD tier and MISMATCH tier would both fire on the same field; reporting both would tell a
  // reader to fix a drift that is really a typo.
  const problems = forward([
    rule("rules/a.md", {
      checker_status: "implemented",
      checker: "docs/wiki/lint.ts",
      tier: "Core",
    }),
  ]);
  expect(problems).toHaveLength(1);
  expect(problems[0]).toContain("BAD tier");
});

test("a rule_id the registry does not know about is not checked against it", () => {
  // No real checker carries rule_id "Z9", so there is nothing to compare the frontmatter to —
  // this must not be misread as a match (nor crash on an undefined lookup).
  const problems = forward([
    rule("rules/a.md", {
      rule_id: "Z9",
      checker_status: "implemented",
      checker: "docs/wiki/lint.ts",
      probe_level: "L2",
    }),
  ]);
  expect(problems).toEqual([]);
});

test("every defect on one page is reported, in field order", () => {
  const problems = forward([
    pageOf("rules/broken.md", { type: "rule", tier: "wrong", probe_level: "L9" }),
  ]);
  expect(problems).toEqual([
    expect.stringContaining("MISSING rule_id"),
    expect.stringContaining("BAD tier"),
    expect.stringContaining("BAD probe_level"),
    expect.stringContaining("MISSING checker"),
  ]);
});

// `coverage` decides whether a `pass` from this rule's checker means the whole rule held or
// only the part the checker looked at, so a page and a checker disagreeing about it
// misdescribes what a run actually established — the same argument as `tier` and `probe_level`
// above, applied to the claim rather than to the gate.
const A1_LIVE = {
  checker: "src/acc/kit/checkers/parsing/unknown-flag.ts",
  checker_status: "implemented",
};

test("a missing coverage is reported as BAD coverage with an empty value", () => {
  const problems = forward([pageOf("rules/parsing/a1.md", without("coverage"))]);
  expect(problems).toEqual(['BAD coverage   rules/parsing/a1.md: "" not in {complete, partial}']);
});

test("a coverage outside the closed set is reported", () => {
  const problems = forward([rule("rules/parsing/a1.md", { coverage: "mostly" })]);
  expect(problems).toEqual([
    'BAD coverage   rules/parsing/a1.md: "mostly" not in {complete, partial}',
  ]);
});

// The invariant the whole field exists for. `partial` with no gaps is a page admitting a hole
// and describing none of it, which is exactly the information-free verdict the project
// criticises a CLI for emitting.
test("partial coverage naming no gaps is reported", () => {
  const problems = forward([
    pageOf("rules/parsing/a1.md", { ...without("coverage_gaps"), coverage: "partial" }),
  ]);
  expect(problems).toEqual([expect.stringContaining("MISSING coverage_gaps rules/parsing/a1.md")]);
});

test("complete coverage naming gaps is reported", () => {
  const problems = forward([rule("rules/parsing/a1.md", { coverage: "complete" })]);
  expect(problems).toEqual([expect.stringContaining("EXTRA coverage_gaps rules/parsing/a1.md")]);
});

test("complete coverage with no gaps produces no problem", () => {
  const problems = forward([
    pageOf("rules/parsing/a1.md", { ...without("coverage_gaps"), coverage: "complete" }),
  ]);
  expect(problems).toEqual([]);
});

test("an implemented rule whose coverage disagrees with the checker's is reported as MISMATCH", () => {
  const problems = forward([
    pageOf("rules/parsing/a1.md", {
      ...without("coverage_gaps"),
      ...A1_LIVE,
      coverage: "complete",
    }),
  ]);
  expect(problems).toEqual([
    'MISMATCH coverage rules/parsing/a1.md: page declares "complete", checker declares "partial"',
    // The gap list drifts with it, and is reported separately: a page can agree about
    // `complete`/`partial` and still describe the wrong holes, so one message cannot stand in
    // for the other.
    expect.stringContaining("MISMATCH coverage_gaps"),
  ]);
});

test("an implemented rule whose coverage_gaps disagree with the checker's is reported as MISMATCH", () => {
  const problems = forward([
    rule("rules/parsing/a1.md", {
      ...A1_LIVE,
      coverage_gaps: `[${A1_GAPS.slice(0, 2).join(", ")}]`,
    }),
  ]);
  expect(problems).toEqual([expect.stringContaining("MISMATCH coverage_gaps")]);
});

test("an implemented rule matching the checker's coverage and gaps produces no problem", () => {
  expect(forward([rule("rules/parsing/a1.md", A1_LIVE)])).toEqual([]);
});

// Same ratchet as `tier` and `probe_level`: a rule may declare honest coverage before its
// checker exists, and there is nothing to compare it against until then.
test("a planned rule's coverage is not checked against the registry, even if it disagrees", () => {
  const problems = forward([
    pageOf("rules/parsing/a1.md", { ...without("coverage_gaps"), coverage: "complete" }),
  ]);
  expect(problems).toEqual([]);
});

test("an already-invalid coverage is reported once, not also as a MISMATCH", () => {
  const problems = forward([rule("rules/parsing/a1.md", { ...A1_LIVE, coverage: "mostly" })]);
  expect(problems).toEqual([
    'BAD coverage   rules/parsing/a1.md: "mostly" not in {complete, partial}',
  ]);
});

test("problems from several pages accumulate", () => {
  const problems = forward([
    rule("rules/ok.md"),
    pageOf("rules/bad1.md", { type: "rule", rule_id: "B1", tier: "x", probe_level: "L1" }),
    pageOf("rules/bad2.md", { type: "rule", rule_id: "B2", tier: "core", probe_level: "L9" }),
  ]);
  expect(problems).toHaveLength(4); // bad1: tier + missing checker; bad2: probe_level + checker
  expect(problems.filter((p) => p.includes("bad1.md"))).toHaveLength(2);
  expect(problems.filter((p) => p.includes("bad2.md"))).toHaveLength(2);
});

// --- the stated gaps, in the page's own prose ---------------------------------------------
//
// `coverage_gaps` frontmatter is already bound to the checker, but frontmatter is not what a
// reader reads. Five rule pages described a broader measurement than their checker performs
// while carrying correct frontmatter two lines above (review R3-6), so the visible copy is
// gated too.

test("statedGaps folds Prettier's wrapping back into one bullet per gap", () => {
  const body = [
    COVERAGE_HEADING,
    "",
    GAPS_MARKER,
    "",
    "- a gap long enough that Prettier",
    "  wrapped it across two lines",
    "- a short one",
    "",
    "## How to comply",
  ].join("\n");
  expect(statedGaps(body)).toEqual([
    "a gap long enough that Prettier wrapped it across two lines",
    "a short one",
  ]);
});

test("statedGaps returns null when the section or the marker is missing", () => {
  expect(statedGaps("## The rule\n\ntext\n")).toBeNull();
  expect(statedGaps(`${COVERAGE_HEADING}\n\n**Established**\n\n- a thing\n`)).toBeNull();
});

test("a rule page with no coverage section is reported", () => {
  const page = rule("rules/parsing/a1.md");
  page.body = "## The rule\n\ntext\n";
  // BOTH lists, not one message standing in for the section. The section carries two independent
  // claims, and a page missing it is missing both of them.
  expect(forward([page])).toEqual([
    expect.stringContaining("MISSING COVERAGE"),
    expect.stringContaining("MISSING ESTABLISHED"),
  ]);
});

test("a rule page whose prose gaps disagree with its frontmatter is reported", () => {
  const page = rule("rules/parsing/a1.md");
  page.body = page.body.replace(A1_GAPS[1] as string, "something else entirely");
  expect(forward([page])).toEqual([expect.stringContaining("MISMATCH stated gaps")]);
});

test("prose gaps in a different order are reported — the list is compared in order", () => {
  const page = rule("rules/parsing/a1.md");
  page.body = pageOf("rules/parsing/a1.md", {
    ...OK_RULE,
    coverage_gaps: `[${[...A1_GAPS].reverse().join(", ")}]`,
  }).body;
  expect(forward([page])).toEqual([expect.stringContaining("MISMATCH stated gaps")]);
});

// --- the established list, in frontmatter and in the page's own prose ----------------------
//
// The half that used to be checked by nothing (review DTX-8). `coverage_gaps` was bound in both
// directions and to the prose on top of that, while the **Established** list beside it could
// claim a broader measurement than the checker performs and the gate stayed green — which is the
// exact failure SCHEMA.md records having already happened, to five pages.

test("a rule page naming no coverage_established is reported", () => {
  const problems = forward([pageOf("rules/parsing/a1.md", without("coverage_established"))]);
  // ONE message, not two. The fixture's prose list is generated from the same absent field, so
  // the marker is present with nothing under it and the prose AGREES with the frontmatter —
  // both empty. The `MISSING ESTABLISHED` message is for a page with no marker at all, which is
  // a different defect and has its own case above.
  expect(problems).toEqual([
    "MISSING coverage_established rules/parsing/a1.md: every rule page must name what a pass establishes",
  ]);
});

// Unlike `coverage_gaps`, this invariant does not branch on `coverage`: `complete` requires an
// EMPTY gap list and a NON-EMPTY established list, because a checker that establishes nothing is
// not a checker whatever its coverage.
test("complete coverage still owes a coverage_established entry", () => {
  const problems = forward([
    pageOf("rules/parsing/a1.md", {
      ...without("coverage_gaps"),
      coverage: "complete",
      coverage_established: `[${A1_ESTABLISHED.join(", ")}]`,
    }),
  ]);
  expect(problems).toEqual([]);
});

test("complete coverage naming no coverage_established is still reported", () => {
  const { coverage_established: _e, ...rest } = without("coverage_gaps");
  const problems = forward([pageOf("rules/parsing/a1.md", { ...rest, coverage: "complete" })]);
  expect(problems).toEqual([expect.stringContaining("MISSING coverage_established")]);
});

test("an implemented rule whose coverage_established disagrees with the checker's is reported as MISMATCH", () => {
  const problems = forward([
    rule("rules/parsing/a1.md", {
      ...A1_LIVE,
      coverage_established: "[the probe ran and something happened]",
    }),
  ]);
  expect(problems).toEqual([expect.stringContaining("MISMATCH coverage_established")]);
});

test("an implemented rule matching the checker's coverage_established produces no problem", () => {
  expect(forward([rule("rules/parsing/a1.md", A1_LIVE)])).toEqual([]);
});

test("statedEstablished reads the Established list and not the Gaps list beside it", () => {
  const body = [
    COVERAGE_HEADING,
    "",
    ESTABLISHED_MARKER,
    "",
    "- an established claim long enough that Prettier",
    "  wrapped it across two lines",
    "",
    GAPS_MARKER,
    "",
    "- a gap",
    "",
    "## How to comply",
  ].join("\n");
  expect(statedEstablished(body)).toEqual([
    "an established claim long enough that Prettier wrapped it across two lines",
  ]);
  expect(statedGaps(body)).toEqual(["a gap"]);
});

test("statedEstablished returns null when the section or the marker is missing", () => {
  expect(statedEstablished("## The rule\n\ntext\n")).toBeNull();
  expect(statedEstablished(`${COVERAGE_HEADING}\n\n${GAPS_MARKER}\n\n- a gap\n`)).toBeNull();
});

test("a rule page whose prose established list disagrees with its frontmatter is reported", () => {
  const page = rule("rules/parsing/a1.md");
  page.body = page.body.replace(A1_ESTABLISHED[0] as string, "the whole rule held");
  expect(forward([page])).toEqual([expect.stringContaining("MISMATCH stated established")]);
});

// The failure the field exists to catch, spelled out end to end: a page overstating what a pass
// means while its gaps stay correct. Both lists are reported on independently, so the gap list
// being right does not buy the established list any silence.
test("a page overstating what a pass establishes fails even with correct gaps", () => {
  const page = rule("rules/parsing/a1.md", A1_LIVE);
  page.body = page.body.replace(A1_ESTABLISHED[0] as string, "no unknown flag is ever accepted");
  expect(forward([page])).toEqual([expect.stringContaining("MISMATCH stated established")]);
});

// --- the generated coverage matrix ------------------------------------------------------
//
// The matrix answers "which rules are enforced, and how far" in one place. Hand-maintaining one
// row per rule page beside the page itself is the drift this wiki exists to fail on, so it is
// derived from the same frontmatter the cross-checks above bind to the registry, and the lint
// compares what is on the page against what the pages generate.

/** An index page whose matrix section holds `body`, followed by another heading. */
function indexWith(body: string): LintPage {
  const page = pageOf("index.md", { type: "index" });
  page.body = `# wiki\n\n## Rules\n\n${MATRIX_HEADING}\n\n${body}\n\n### Parsing\n\n- a link\n`;
  return page;
}

test("sectionBody returns the lines up to the next heading of any depth", () => {
  const md = "# t\n\n## A\n\nalpha\n\n### B\n\nbeta\n";
  expect(sectionBody(md, "## A")).toBe("alpha");
  expect(sectionBody(md, "### B")).toBe("beta");
});

test("sectionBody returns null for a heading the page does not have", () => {
  expect(sectionBody("# t\n\n## A\n\nalpha\n", "## Z")).toBeNull();
});

// Prettier owns the formatting of every .md in the repo, and it pads table cells and re-wraps
// prose. A generator that had to predict that would be re-implementing Prettier to keep a gate
// green, so the comparison normalises instead.
test("normalizeBlock ignores the cell padding and prose wrapping Prettier applies", () => {
  const generated = "one two\nthree\n\n| a | bb |\n| --- | --- |\n| 1 | 2 |";
  const prettified = "one two three\n\n| a   | bb  |\n| :-- | --: |\n| 1   | 2   |";
  expect(normalizeBlock(prettified)).toBe(normalizeBlock(generated));
});

test("normalizeBlock still separates a changed cell", () => {
  expect(normalizeBlock("| a | 1 |")).not.toBe(normalizeBlock("| a | 2 |"));
});

test("the matrix carries one row per rule page, sorted by rule id", () => {
  const pages = [
    rule("rules/streams/b1.md", { rule_id: "B1", tier: "core" }),
    rule("rules/parsing/a1.md", { rule_id: "A1" }),
    pageOf("concepts/x.md", { type: "concept" }),
  ];
  const rows = coverageMatrix(pages)
    .split("\n")
    .filter((l) => l.startsWith("| ["));
  // The count comes from `A1_GAPS.length`, not a literal: the baseline mirrors the LIVE A1
  // checker (see above), so a literal here asserts the size of a real gap list rather than the
  // property under test, and every honest addition to that list breaks a test about table
  // rendering. The equality is unchanged — this is still the exact rendered row.
  expect(rows).toEqual([
    `| [A1](./rules/parsing/a1.md) | core | L0 | planned | partial | ${A1_GAPS.length} |`,
    `| [B1](./rules/streams/b1.md) | core | L0 | planned | partial | ${A1_GAPS.length} |`,
  ]);
});

test("the matrix totals the gaps it lists", () => {
  const matrix = coverageMatrix([rule("rules/parsing/a1.md")]);
  expect(matrix).toContain(
    `1 rules · 0 \`complete\` · 1 \`partial\` · ${A1_GAPS.length} named gaps.`,
  );
});

test("an index whose matrix matches the rule pages produces no problem", () => {
  const pages = [rule("rules/parsing/a1.md")];
  expect(matrixChecks([...pages, indexWith(coverageMatrix(pages))])).toEqual([]);
});

test("an index whose matrix is out of date is reported as STALE", () => {
  const stale = coverageMatrix([rule("rules/parsing/a1.md", { tier: "diagnostic" })]);
  const problems = matrixChecks([rule("rules/parsing/a1.md"), indexWith(stale)]);
  expect(problems).toEqual([expect.stringContaining("STALE MATRIX")]);
});

test("an index with no matrix section at all is reported as MISSING", () => {
  const index = pageOf("index.md", { type: "index" });
  index.body = "# wiki\n\n## Rules\n\n### Parsing\n";
  expect(matrixChecks([rule("rules/parsing/a1.md"), index])).toEqual([
    expect.stringContaining("MISSING MATRIX"),
  ]);
});

// A missing catalog is already the core lint's NO CATALOG problem, and reporting it twice would
// send a maintainer to regenerate a file that does not exist.
test("no index page at all produces no matrix problem", () => {
  expect(matrixChecks([rule("rules/parsing/a1.md")])).toEqual([]);
});

// --- slug uniqueness -----------------------------------------------------------------------
//
// `acc show <handle>` resolves a slug through a Map of basenames, so two pages sharing one make
// the loser unreachable — by insertion order, with nothing able to report it.

test("two pages with the same basename in different folders are reported", () => {
  const problems = slugChecks([
    pageOf("concepts/overview.md", { type: "concept" }),
    pageOf("guides/overview.md", { type: "guide" }),
  ]);
  expect(problems).toEqual([
    'DUPLICATE slug guides/overview.md: "overview" already used by concepts/overview.md',
  ]);
});

// Stricter than the portable core's `type/slug` check on purpose: `bySlug` has no type half, so
// a concept and a guide sharing a basename collide in `acc show` even though `related:` is fine.
test("differing types do not rescue a duplicate slug", () => {
  expect(
    slugChecks([pageOf("a/x.md", { type: "concept" }), pageOf("b/x.md", { type: "rule" })]).length,
  ).toBe(1);
});

test("a third page with the same slug is reported too, against the first", () => {
  const problems = slugChecks([
    pageOf("a/x.md", { type: "concept" }),
    pageOf("b/x.md", { type: "concept" }),
    pageOf("c/x.md", { type: "concept" }),
  ]);
  expect(problems).toHaveLength(2);
  expect(problems.every((p) => p.includes("already used by a/x.md"))).toBe(true);
});

test("distinct basenames produce no problem", () => {
  expect(
    slugChecks([pageOf("a/x.md", { type: "concept" }), pageOf("b/y.md", { type: "concept" })]),
  ).toEqual([]);
});

// SCHEMA.md is the contract, not a page: `graph.ts` skips it, so it cannot collide with anything
// and must not be reported as if it could.
test("SCHEMA.md is exempt", () => {
  expect(slugChecks([pageOf("SCHEMA.md", {}), pageOf("nested/SCHEMA.md", {})])).toEqual([]);
});

// --- catalog hooks -------------------------------------------------------------------------
//
// SCHEMA.md has always said a page's `description` doubles as its catalog hook. Nothing
// enforced it, so the index kept advertising a "third status (`action_required`)" deleted when
// the envelope model was made canonical, and an exit-code rationale whose source page had been
// corrected. Both survived review of the page they described, because nobody re-reads the
// catalog.

/** An index whose catalog lists `entries` verbatim. */
function catalog(...entries: string[]): LintPage {
  const page = pageOf("index.md", { type: "index" });
  page.body = `# wiki\n\n## Concepts\n\n${entries.join("\n")}\n`;
  return page;
}

/** A target page carrying just a description. */
function described(rel: string, description: string): LintPage {
  return pageOf(rel, { type: "concept", description });
}

test("a hook equal to its target's description produces no problem", () => {
  const pages = [
    described("concepts/x.md", "One sentence about X."),
    catalog("- [X](./concepts/x.md) — One sentence about X."),
  ];
  expect(hookChecks(pages)).toEqual([]);
});

test("a hook that paraphrases its target's description is reported", () => {
  const pages = [
    described("concepts/x.md", "One sentence about X."),
    catalog("- [X](./concepts/x.md) — a sentence about X."),
  ];
  expect(hookChecks(pages)).toEqual([expect.stringContaining("STALE HOOK")]);
});

test("the diagnostic marker is navigation, not part of the hook", () => {
  const pages = [
    described("rules/a6.md", "Only sentence."),
    catalog("- [A6](./rules/a6.md) _(diagnostic)_ — Only sentence."),
  ];
  expect(hookChecks(pages)).toEqual([]);
});

// The hole this check had on its first run: Prettier is free to break a long link's TEXT across
// lines, and a matcher reading one physical line at a time skipped exactly those entries.
test("an entry whose link text Prettier wrapped is still checked", () => {
  const wrapped = [
    "- [C2 — Usage errors are distinguishable from internal",
    "  errors](./rules/c2.md) — Wrong sentence.",
  ].join("\n");
  const pages = [described("rules/c2.md", "Right sentence."), catalog(wrapped)];
  expect(catalogEntries(catalog(wrapped).body)).toEqual([
    { target: "rules/c2.md", hook: "Wrong sentence." },
  ]);
  expect(hookChecks(pages)).toEqual([expect.stringContaining("STALE HOOK")]);
});

test("a table row is not a catalog entry", () => {
  const page = pageOf("index.md", { type: "index" });
  page.body = "# wiki\n\n| [A1](./rules/a1.md) | core |\n";
  expect(catalogEntries(page.body)).toEqual([]);
});

test("no index page at all produces no hook problem", () => {
  expect(hookChecks([described("concepts/x.md", "One sentence about X.")])).toEqual([]);
});

// The forward direction (does a declared checker exist) is exercised live above — it no
// longer needs `src/acc/kit/checkers/` on disk, because `checker_status` governs it, not
// directory existence. The REVERSE direction needs the directory to be real, and now it is:
// `src/acc/kit/checkers/parsing/unknown-flag.ts` landed in Task 5, so these are live cases
// against the real file rather than the skipped placeholder that used to stand here.
const REAL_CHECKER = "src/acc/kit/checkers/parsing/unknown-flag.ts";

test("a real checker file with no rule page declaring it is reported as UNDOCUMENTED", () => {
  const problems = ruleChecks([
    rule("rules/a.md", { checker: "src/acc/kit/checkers/definitely/not/here.ts" }),
    rule("rules/b.md", { rule_id: "A2", checker: "not-even-a-plausible-path" }),
  ]);
  expect(problems).toContain(
    `UNDOCUMENTED   ${REAL_CHECKER}  (no rule page declares this checker)`,
  );
});

test("a real checker file IS documented once some page's checker field names it exactly", () => {
  const problems = ruleChecks([rule("rules/a.md", { checker: REAL_CHECKER })]);
  // NOT `toEqual([])` on the UNDOCUMENTED-filtered list: `ruleChecks` walks the REAL
  // `src/acc/kit/checkers/` directory regardless of what pages this test passes in, so as soon
  // as a second checker file lands on disk (Task 6+) it will be UNDOCUMENTED too — this test
  // isn't about that file, only about whether REAL_CHECKER itself got matched.
  expect(problems).not.toContain(
    `UNDOCUMENTED   ${REAL_CHECKER}  (no rule page declares this checker)`,
  );
});

// The narrowest instance of this wiki's whole thesis, and it exists because the general version
// of the check missed it. G1's rule page excluded an operator's Ctrl-C, an outer deadline's
// SIGTERM and an OOM kill; its checker failed on any signal the kit did not send. Prose on one
// side, a `filter` on the other, and nothing compared them (review R6-2).

/** A G1 page stating exactly these two lists, in this order, with the real markers. */
function g1PageWith(fault: readonly string[], ambiguous: readonly string[]): LintPage {
  const page = pageOf("rules/lifecycle/g1.md", { type: "rule", rule_id: "G1" });
  page.body = [
    "## The rule",
    "",
    FAULT_SIGNALS_MARKER,
    "",
    fault.map((s) => `\`${s}\``).join(", "),
    "",
    "Prose between the two lists, which the extractor must stop at.",
    "",
    AMBIGUOUS_SIGNALS_MARKER,
    "",
    `${ambiguous.map((s) => `\`${s}\``).join(", ")}, and anything unrecognised`,
    "",
  ].join("\n");
  return page;
}

test("the live G1 page and the live checker name the same signals", () => {
  // Against the REAL wiki, deliberately. Every other test in this file synthesises its pages, but
  // the whole point here is that the shipped page and the shipped arrays agree — a synthetic page
  // would only test the comparison, which is the half that was never in doubt.
  expect(signalScopeChecks(readPages())).toEqual([]);
});

test("a page that reorders the fault list is reported", () => {
  const page = g1PageWith([...FAULT_SIGNALS].reverse(), AMBIGUOUS_SIGNALS);
  expect(signalScopeChecks([page])).toEqual([expect.stringContaining("MISMATCH fault signals")]);
});

test("a page that drops a signal from the ambiguous list is reported", () => {
  const page = g1PageWith(FAULT_SIGNALS, AMBIGUOUS_SIGNALS.slice(1));
  expect(signalScopeChecks([page])).toEqual([
    expect.stringContaining("MISMATCH ambiguous signals"),
  ]);
});

// The direction that matters most: a signal MOVING from one class to the other is the drift that
// would silently change a verdict from `unverified` to `fail`, and it must be caught on both
// lists rather than netting out to zero.
test("a page that promotes SIGTERM to the fault list is reported twice", () => {
  const page = g1PageWith(
    [...FAULT_SIGNALS, "SIGTERM"],
    AMBIGUOUS_SIGNALS.filter((s) => s !== "SIGTERM"),
  );
  expect(signalScopeChecks([page])).toHaveLength(2);
});

test("a page missing a marker entirely is reported, not silently passed", () => {
  const page = g1PageWith(FAULT_SIGNALS, AMBIGUOUS_SIGNALS);
  page.body = page.body.replace(AMBIGUOUS_SIGNALS_MARKER, "**Some other heading**");
  expect(signalScopeChecks([page])).toEqual([expect.stringContaining("MISSING SIGNALS")]);
});

test("no G1 page at all is a problem, not an absence of problems", () => {
  expect(signalScopeChecks([pageOf("concepts/x.md", { type: "concept" })])).toEqual([
    expect.stringContaining("MISSING G1 PAGE"),
  ]);
});

// Prettier owns the line breaks inside a paragraph, so the extractor must not.
test("a signal list Prettier wrapped across lines is read as one paragraph", () => {
  const body = [FAULT_SIGNALS_MARKER, "", "`SIGSEGV`, `SIGBUS`,", "`SIGILL`", "", "next para"].join(
    "\n",
  );
  expect(statedSignals(body, FAULT_SIGNALS_MARKER)).toEqual(["SIGSEGV", "SIGBUS", "SIGILL"]);
});
