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
import type { LintPage } from "../../scripts/docs-lint/index.ts";
import { ruleChecks } from "./lint.ts";

/** A `LintPage` carrying just the frontmatter under test. */
function pageOf(rel: string, fields: Record<string, string>): LintPage {
  return {
    path: join(import.meta.dir, rel),
    rel,
    fields: new Map(Object.entries(fields)),
    body: "",
  };
}

/** Frontmatter of a rule page that satisfies every check. */
const OK_RULE: Record<string, string> = {
  type: "rule",
  rule_id: "A1",
  tier: "core",
  probe_level: "L0",
  checker: "scripts/checkers/parsing/unknown-flag.ts",
  checker_status: "planned",
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
