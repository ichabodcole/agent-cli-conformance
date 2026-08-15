// The registry's own invariants — the ones that must hold for every checker in it, present and
// future, and that no individual checker's test file is in a position to enforce.
//
// `coverage` is required with no default precisely so a new checker cannot inherit `complete` by
// saying nothing. That only works if `partial` is equally impossible to abuse: a bare `partial`
// with no `coverageGaps` would be a flag admitting a hole while naming none of it, which is the
// same information-free verdict the project criticises a CLI for emitting.
//
// `coverageEstablished` is held to the mirror-image invariant, and to it unconditionally: the
// gap list may be empty (when `complete`) and the established list may never be. What neither
// this file nor the wiki lint can check is whether an entry is TRUE of the checker's code —
// both bind the DECLARATION to its copies. Only a mutation fixture closes that, by breaking the
// property and watching the checker catch it. See docs/roadmap.md, R4-8.

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

  // THE OTHER HALF, and its invariant does not branch on `coverage` the way the two above do.
  // A checker that establishes nothing is not a checker, so every one owes at least one entry
  // whatever its coverage — `complete` included, where the gap list is required to be EMPTY and
  // this one is still required not to be. A4 is the case that tests the rule rather than the
  // exception to it: it declares no probes and returns a fixed `unverified`, and it says exactly
  // that in one entry rather than passing an empty array through a gate built to catch it.
  test.each(CHECKERS.map((c) => [c.ruleId, c] as const))(
    "%s: coverage established is not empty",
    (ruleId, checker) => {
      expect({ ruleId, established: checker.coverageEstablished.length > 0 }).toEqual({
        ruleId,
        established: true,
      });
    },
  );

  // Same round trip through the same deliberately small frontmatter reader as the gaps above,
  // so the same two separators are rejected at the source, where the message can name the cause.
  test.each(CHECKERS.map((c) => [c.ruleId, c] as const))(
    "%s: no established entry contains a separator the wiki frontmatter cannot round-trip",
    (ruleId, checker) => {
      const offenders = checker.coverageEstablished.filter((e) => e.includes(",") || / - /.test(e));
      expect({ ruleId, offenders }).toEqual({ ruleId, offenders: [] });
    },
  );

  test.each(CHECKERS.map((c) => [c.ruleId, c] as const))(
    "%s: every established entry is a non-empty phrase",
    (ruleId, checker) => {
      const empty = checker.coverageEstablished.filter((e) => e.trim() === "");
      expect({ ruleId, empty }).toEqual({ ruleId, empty: [] });
    },
  );
});
