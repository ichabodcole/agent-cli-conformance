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
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { LintPage } from "../../scripts/docs-lint/index.ts";
import { ruleChecks } from "./lint.ts";

const CHECKERS_DIR = join(import.meta.dir, "../../scripts/checkers");

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
};

const rule = (rel: string, over: Record<string, string> = {}): LintPage =>
  pageOf(rel, { ...OK_RULE, ...over });

/** Drop a key from the valid baseline. */
function without(key: string): Record<string, string> {
  const { [key]: _dropped, ...rest } = OK_RULE;
  return rest;
}

test("a valid rule page produces no problems", () => {
  expect(ruleChecks([rule("rules/parsing/a1.md")])).toEqual([]);
});

test("no pages at all produces no problems", () => {
  expect(ruleChecks([])).toEqual([]);
});

test("non-rule pages are ignored entirely", () => {
  const pages = [
    pageOf("index.md", { type: "index" }),
    pageOf("concepts/exit-codes.md", { type: "concept", tier: "nonsense" }),
    pageOf("SCHEMA.md", {}),
  ];
  expect(ruleChecks(pages)).toEqual([]);
});

test("a missing rule_id is reported", () => {
  const problems = ruleChecks([pageOf("rules/parsing/a1.md", without("rule_id"))]);
  expect(problems).toHaveLength(1);
  expect(problems[0]).toMatch(/^MISSING rule_id rules\/parsing\/a1\.md\s+\(every rule page needs/);
});

test("an empty rule_id counts as missing", () => {
  const problems = ruleChecks([rule("rules/parsing/a1.md", { rule_id: "" })]);
  expect(problems).toEqual([expect.stringContaining("MISSING rule_id")]);
});

test("a duplicate rule_id is reported, naming the page that claimed it first", () => {
  const problems = ruleChecks([
    rule("rules/parsing/a1.md"),
    rule("rules/streams/also-a1.md", { checker: "scripts/checkers/streams/x.ts" }),
  ]);
  expect(problems).toHaveLength(1);
  expect(problems[0]).toBe(
    'DUPLICATE rule_id rules/streams/also-a1.md: "A1" already used by rules/parsing/a1.md',
  );
});

test("a third page with the same rule_id is reported too", () => {
  const problems = ruleChecks([rule("rules/a.md"), rule("rules/b.md"), rule("rules/c.md")]).filter(
    (p) => p.startsWith("DUPLICATE"),
  );
  expect(problems).toHaveLength(2);
});

test("rule_id uniqueness is scoped to rule pages", () => {
  const problems = ruleChecks([
    rule("rules/parsing/a1.md"),
    pageOf("concepts/exit-codes.md", { type: "concept", rule_id: "A1" }),
  ]);
  expect(problems).toEqual([]);
});

test("distinct rule_ids across many pages are fine", () => {
  const pages = ["A1", "A2", "B1"].map((id, i) =>
    rule(`rules/r${i}.md`, { rule_id: id, checker: `scripts/checkers/r${i}.ts` }),
  );
  expect(ruleChecks(pages)).toEqual([]);
});

test.each(["core", "diagnostic"])("tier %s is accepted", (tier) => {
  expect(ruleChecks([rule("rules/a.md", { tier })])).toEqual([]);
});

test.each(["", "Core", "CORE", "optional", "core ", "critical"])("tier %j is rejected", (tier) => {
  const problems = ruleChecks([rule("rules/a.md", { tier })]);
  expect(problems).toHaveLength(1);
  expect(problems[0]).toContain("BAD tier");
  expect(problems[0]).toContain("not in {core, diagnostic}");
});

test("a missing tier is reported as BAD tier with an empty value", () => {
  const problems = ruleChecks([pageOf("rules/a.md", without("tier"))]);
  expect(problems).toHaveLength(1);
  expect(problems[0]).toMatch(/^BAD tier\s+rules\/a\.md: "" not in \{core, diagnostic\}$/);
});

test.each(["L0", "L1", "L2"])("probe_level %s is accepted", (probe_level) => {
  expect(ruleChecks([rule("rules/a.md", { probe_level })])).toEqual([]);
});

test.each(["", "l0", "L3", "0", "L0 ", "level-0"])("probe_level %j is rejected", (probe_level) => {
  const problems = ruleChecks([rule("rules/a.md", { probe_level })]);
  expect(problems).toHaveLength(1);
  expect(problems[0]).toContain("BAD probe_level");
  expect(problems[0]).toContain("not in {L0, L1, L2}");
});

test("a missing probe_level is reported as BAD probe_level with an empty value", () => {
  const problems = ruleChecks([pageOf("rules/a.md", without("probe_level"))]);
  expect(problems).toHaveLength(1);
  expect(problems[0]).toMatch(/^BAD probe_level rules\/a\.md: "" not in \{L0, L1, L2\}$/);
});

test("a missing checker is reported", () => {
  const problems = ruleChecks([pageOf("rules/a.md", without("checker"))]);
  expect(problems).toHaveLength(1);
  expect(problems[0]).toMatch(/^MISSING checker rules\/a\.md\s+\(name the file that enforces/);
});

test("every defect on one page is reported, in field order", () => {
  const problems = ruleChecks([
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
  const problems = ruleChecks([
    rule("rules/ok.md"),
    pageOf("rules/bad1.md", { type: "rule", rule_id: "B1", tier: "x", probe_level: "L1" }),
    pageOf("rules/bad2.md", { type: "rule", rule_id: "B2", tier: "core", probe_level: "L9" }),
  ]);
  expect(problems).toHaveLength(4); // bad1: tier + missing checker; bad2: probe_level + checker
  expect(problems.filter((p) => p.includes("bad1.md"))).toHaveLength(2);
  expect(problems.filter((p) => p.includes("bad2.md"))).toHaveLength(2);
});

// The checker-file half of the check is deliberately dormant until the conformance kit
// exists: a gate that fails on absent future work only teaches you to ignore the gate.
//
// WHEN `scripts/checkers/` IS ADDED, this test skips itself — replace it with the live cases:
// a declared-but-absent checker must be MISSING CHECKER, and a checker file no rule page
// declares must be UNDOCUMENTED. Those two need real files on disk, which is why they are not
// covered today (creating `scripts/checkers/` was out of scope for this change).
test.skipIf(existsSync(CHECKERS_DIR))(
  "checker-file existence checks stay dormant while scripts/checkers/ is absent",
  () => {
    const problems = ruleChecks([
      rule("rules/a.md", { checker: "scripts/checkers/definitely/not/here.ts" }),
      rule("rules/b.md", { rule_id: "A2", checker: "not-even-a-plausible-path" }),
    ]);
    expect(problems).toEqual([]);
  },
);
