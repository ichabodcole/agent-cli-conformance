import { describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
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
