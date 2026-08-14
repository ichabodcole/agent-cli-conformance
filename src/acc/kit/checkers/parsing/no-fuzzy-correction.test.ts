import { describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { record } from "../../record.ts";
import type { TargetInfo } from "../../types.ts";
import { noFuzzyCorrectionChecker } from "./no-fuzzy-correction.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (rel: string): TargetInfo => {
  const p = join(HERE, "../../fixtures", rel);
  return { path: p, argv0: ["bun", p] };
};

describe("A5 — never act on a guessed correction", () => {
  test("PASSES the conforming fixture", async () => {
    const h = await record(fixture("conforming.ts"), [noFuzzyCorrectionChecker]);
    const f = noFuzzyCorrectionChecker.check(h);
    expect(f.verdict).toBe("pass");
    expect(f.ruleId).toBe("A5");
  });

  // The negative control: this fixture accepts any flag-shaped token and exits 0, so the
  // near-miss built from its own advertised `--json` flag gets silently "corrected" and run.
  test("FAILS a CLI that accepts a near-miss flag and exits 0", async () => {
    const h = await record(fixture("broken/exits-zero-on-unknown-flag.ts"), [
      noFuzzyCorrectionChecker,
    ]);
    const f = noFuzzyCorrectionChecker.check(h);
    expect(f.verdict).toBe("fail");
    expect(f.detail).toContain("exit 0");
  });

  test("cites the observations backing its verdict", async () => {
    const h = await record(fixture("conforming.ts"), [noFuzzyCorrectionChecker]);
    const f = noFuzzyCorrectionChecker.check(h);
    expect(f.evidence.length).toBeGreaterThan(0);
    for (const id of f.evidence) expect(h.byId.has(id)).toBe(true);
  });
});
