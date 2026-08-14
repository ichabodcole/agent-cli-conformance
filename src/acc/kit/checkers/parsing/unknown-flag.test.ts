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

describe("A1 — unknown flags must exit non-zero", () => {
  test("PASSES the conforming fixture", async () => {
    const h = await record(fixture("conforming.ts"), [unknownFlagChecker]);
    const f = unknownFlagChecker.check(h);
    expect(f.verdict).toBe("pass");
  });

  // The negative control. A checker verified only against passing input has proved nothing
  // about its ability to detect anything.
  test("FAILS a CLI that accepts an unknown flag and exits 0", async () => {
    const h = await record(fixture("broken/exits-zero-on-unknown-flag.ts"), [unknownFlagChecker]);
    const f = unknownFlagChecker.check(h);
    expect(f.verdict).toBe("fail");
    expect(f.detail).toContain("exit");
  });

  test("cites the observations backing its verdict", async () => {
    const h = await record(fixture("conforming.ts"), [unknownFlagChecker]);
    const f = unknownFlagChecker.check(h);
    expect(f.evidence.length).toBeGreaterThan(0);
    for (const id of f.evidence) expect(h.byId.has(id)).toBe(true);
  });
});
