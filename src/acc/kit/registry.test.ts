// The registry's own invariants — the ones that must hold for every checker in it, present and
// future, and that no individual checker's test file is in a position to enforce.
//
// `coverage` is required with no default precisely so a new checker cannot inherit `complete` by
// saying nothing. That only works if `partial` is equally impossible to abuse: a bare `partial`
// with no `coverageGaps` would be a flag admitting a hole while naming none of it, which is the
// same information-free verdict the project criticises a CLI for emitting.

import { describe, expect, test } from "bun:test";
import { CHECKERS } from "./registry.ts";

describe("every checker declares its coverage, and accounts for it", () => {
  test("the walk found checkers to check", () => {
    // Guards the degenerate pass: an empty registry would make every case below vacuous.
    expect(CHECKERS.length).toBeGreaterThan(0);
  });

  test.each(CHECKERS.map((c) => [c.ruleId, c] as const))(
    "%s: partial coverage names at least one gap",
    (ruleId, checker) => {
      if (checker.coverage !== "partial") return;
      expect({ ruleId, gaps: checker.coverageGaps.length > 0 }).toEqual({ ruleId, gaps: true });
    },
  );

  test.each(CHECKERS.map((c) => [c.ruleId, c] as const))(
    "%s: complete coverage names no gap",
    (ruleId, checker) => {
      if (checker.coverage !== "complete") return;
      expect({ ruleId, gaps: checker.coverageGaps }).toEqual({ ruleId, gaps: [] });
    },
  );

  // Every gap is reproduced verbatim in its rule page's `coverage_gaps` frontmatter, and
  // docs/wiki/lint.ts compares the two lists element by element. That comparison runs the page
  // through `yamlList`, a deliberately small reader which splits items on `,` and on ` - ` —
  // so a phrase containing either arrives back as two items and the lint fails with a mismatch
  // that says nothing about the real cause. Rejected here, at the source, where the message can.
  test.each(CHECKERS.map((c) => [c.ruleId, c] as const))(
    "%s: no gap contains a separator the wiki frontmatter cannot round-trip",
    (ruleId, checker) => {
      const offenders = checker.coverageGaps.filter((g) => g.includes(",") || / - /.test(g));
      expect({ ruleId, offenders }).toEqual({ ruleId, offenders: [] });
    },
  );

  // A gap is a phrase a reader acts on, not a checkbox. An empty string satisfies the count
  // above while saying nothing.
  test.each(CHECKERS.map((c) => [c.ruleId, c] as const))(
    "%s: every gap is a non-empty phrase",
    (ruleId, checker) => {
      const empty = checker.coverageGaps.filter((g) => g.trim() === "");
      expect({ ruleId, empty }).toEqual({ ruleId, empty: [] });
    },
  );
});
