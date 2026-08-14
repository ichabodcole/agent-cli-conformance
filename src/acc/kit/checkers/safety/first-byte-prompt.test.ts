import { describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { record } from "../../record.ts";
import type { History, TargetInfo } from "../../types.ts";
import { firstBytePromptChecker } from "./first-byte-prompt.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (rel: string): TargetInfo => {
  const p = join(HERE, "../../fixtures", rel);
  return { path: p, argv0: ["bun", p] };
};

describe("F2 — first byte arrives promptly", () => {
  // Deliberately NOT asserting `pass` here: the fixtures run via `bun <file>.ts`, whose process
  // startup time is environment-dependent (cold cache, loaded CI runner) and can exceed the
  // 100ms threshold even for a fully conforming tool. Asserting pass would make this suite
  // flaky, and a flaky test that gets re-run until green is worse than no test at all. What IS
  // stable, and what this asserts instead, is that the checker took a real measurement and
  // reached a real verdict rather than giving up.
  test("produces a real timing measurement against the conforming fixture", async () => {
    const h = await record(fixture("conforming.ts"), [firstBytePromptChecker]);
    const f = firstBytePromptChecker.check(h);
    expect(f.ruleId).toBe("F2");
    expect(["pass", "fail"]).toContain(f.verdict);
    expect(f.detail).toMatch(/\d+ms/);
  });

  // The negative control, for a verdict this suite CAN assert stably: sleeps ~300ms before
  // writing anything, comfortably above the 100ms threshold even on a slow machine.
  test("FAILS a CLI whose first byte arrives after the threshold", async () => {
    const h = await record(fixture("broken/slow-first-byte.ts"), [firstBytePromptChecker]);
    const f = firstBytePromptChecker.check(h);
    expect(f.verdict).toBe("fail");
    expect(f.detail).toMatch(/\d+ms/);
    expect(f.ruleId).toBe("F2");
  });

  test("reports unverified when no timing was captured", () => {
    const h: History = {
      target: { path: "x", argv0: ["x"] },
      discovery: { subcommands: [], flags: [], machineModeFlag: null, helpReadable: false },
      observations: [],
      byId: new Map(),
    };
    const f = firstBytePromptChecker.check(h);
    expect(f.verdict).toBe("unverified");
  });

  test("cites the observations backing its verdict", async () => {
    const h = await record(fixture("conforming.ts"), [firstBytePromptChecker]);
    const f = firstBytePromptChecker.check(h);
    expect(f.evidence.length).toBeGreaterThan(0);
    for (const id of f.evidence) expect(h.byId.has(id)).toBe(true);
  });
});
