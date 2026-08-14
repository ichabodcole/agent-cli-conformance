import { describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { record } from "../../record.ts";
import type { TargetInfo } from "../../types.ts";
import { unknownFlagChecker } from "./unknown-flag.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (rel: string): TargetInfo => {
  const p = join(HERE, "../../fixtures", rel);
  return { path: p, argv0: ["bun", p] };
};

// The `timedOut` branch (a target that hangs on an unknown flag rather than rejecting it) is
// deliberately not covered here: exercising it needs a fixture that actually blocks for the
// runner's ~10s deadline, which would make this file slow on every run. Covered instead by
// inspection of `record.ts`/`runner.ts`, which guarantee `timedOut` is only ever set that way.
describe("A1 — unknown flags must exit non-zero", () => {
  test("PASSES the conforming fixture", async () => {
    const h = await record(fixture("conforming.ts"), [unknownFlagChecker]);
    const f = unknownFlagChecker.check(h);
    expect(f.verdict).toBe("pass");
    expect(f.ruleId).toBe("A1");
  });

  // The negative control. A checker verified only against passing input has proved nothing
  // about its ability to detect anything.
  test("FAILS a CLI that accepts an unknown flag and exits 0", async () => {
    const h = await record(fixture("broken/exits-zero-on-unknown-flag.ts"), [unknownFlagChecker]);
    const f = unknownFlagChecker.check(h);
    expect(f.verdict).toBe("fail");
    expect(f.detail).toContain("exit");
    expect(f.ruleId).toBe("A1");
  });

  test("cites the observations backing its verdict", async () => {
    const h = await record(fixture("conforming.ts"), [unknownFlagChecker]);
    const f = unknownFlagChecker.check(h);
    expect(f.evidence.length).toBeGreaterThan(0);
    for (const id of f.evidence) expect(h.byId.has(id)).toBe(true);
  });
});
