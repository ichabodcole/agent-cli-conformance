import { describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { VERB_DISPATCH_ASSUMED } from "../../inert.ts";
import { record } from "../../record.ts";
import type { TargetInfo } from "../../types.ts";
import { unknownCommandChecker } from "./unknown-command.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (rel: string): TargetInfo => {
  const p = join(HERE, "../../fixtures", rel);
  return { path: p, argv0: ["bun", p] };
};

describe("A2 — unknown commands must exit non-zero", () => {
  test("PASSES the conforming fixture", async () => {
    const h = await record(fixture("conforming.ts"), [unknownCommandChecker]);
    const f = unknownCommandChecker.check(h);
    expect(f.verdict).toBe("pass");
    expect(f.ruleId).toBe("A2");
  });

  // The negative control. A checker verified only against passing input has proved nothing
  // about its ability to detect anything.
  test("FAILS a CLI that accepts any verb and exits 0", async () => {
    const h = await record(fixture("broken/accepts-extra-positionals.ts"), [unknownCommandChecker]);
    const f = unknownCommandChecker.check(h);
    expect(f.verdict).toBe("fail");
    expect(f.detail).toContain("exited 0");
  });

  test("cites the observations backing its verdict", async () => {
    const h = await record(fixture("conforming.ts"), [unknownCommandChecker]);
    const f = unknownCommandChecker.check(h);
    expect(f.evidence.length).toBeGreaterThan(0);
    for (const id of f.evidence) expect(h.byId.has(id)).toBe(true);
  });
});

// THE PREMISE, MEASURED AGAINST A TARGET THAT DOES NOT HOLD IT. `first-positional-is-data.ts`
// searches for its first positional, the way `rg` does, so the probe is not an unknown verb at
// all: exit 1 is a documented no-match from a search that ran.
//
// This branch does NOT fix that. The pass below is still a false pass, still counted in
// `counts.corePassed`, still contributing to `conformant` — what it now carries is the
// assumption it rests on, so a reader of the green line meets the premise there rather than
// nowhere. Deleting the clause from the checker turns these red; correcting the verdict needs
// the target to declare its positional shape, which is L1.
describe("A2 — the verdict says what it assumed about the first positional", () => {
  test("still passes a target whose first positional is data, and discloses the assumption", async () => {
    const h = await record(fixture("first-positional-is-data.ts"), [unknownCommandChecker]);
    const f = unknownCommandChecker.check(h);
    expect({ verdict: f.verdict, discloses: f.detail.includes(VERB_DISPATCH_ASSUMED) }).toEqual({
      verdict: "pass",
      discloses: true,
    });
  });

  // Unconditional, not a special case for a shape the kit cannot detect: the conforming fixture
  // does dispatch verbs, and its pass carries the clause too, because nothing observed that.
  test("carries it on the conforming fixture as well", async () => {
    const h = await record(fixture("conforming.ts"), [unknownCommandChecker]);
    expect(unknownCommandChecker.check(h).detail).toContain(VERB_DISPATCH_ASSUMED);
  });

  // A fail rests on the same unestablished fact — a target that reads the positional as data can
  // print its result to stdout and exit 0, which is byte-for-byte the A2 violation.
  test("carries it on a fail too", async () => {
    const h = await record(fixture("broken/accepts-extra-positionals.ts"), [unknownCommandChecker]);
    const f = unknownCommandChecker.check(h);
    expect({ verdict: f.verdict, discloses: f.detail.includes(VERB_DISPATCH_ASSUMED) }).toEqual({
      verdict: "fail",
      discloses: true,
    });
  });

  // The durable half: the detail is per-run, the gap is on the rule page and in every report's
  // `evidenceGaps` whether or not anyone reads the detail line.
  test("names the assumption in its coverage gaps", () => {
    const named = unknownCommandChecker.coverageGaps.filter((g) =>
      g.includes("assumed to select a subcommand"),
    );
    expect(named.length).toBe(1);
  });
});
