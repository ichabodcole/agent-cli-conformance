import { describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { record } from "../../record.ts";
import type { TargetInfo } from "../../types.ts";
import { noAnsiWhenPipedChecker } from "./no-ansi-when-piped.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (rel: string): TargetInfo => {
  const p = join(HERE, "../../fixtures", rel);
  return { path: p, argv0: ["bun", p] };
};

describe("B2 — no ANSI escapes when piped", () => {
  test("PASSES the conforming fixture", async () => {
    const h = await record(fixture("conforming.ts"), [noAnsiWhenPipedChecker]);
    const f = noAnsiWhenPipedChecker.check(h);
    expect(f.verdict).toBe("pass");
    expect(f.ruleId).toBe("B2");
  });

  // The negative control: colours its error message unconditionally, even though every probe
  // the runner makes captures to a pipe rather than a TTY.
  test("FAILS a CLI that colours its stderr with no terminal attached", async () => {
    const h = await record(fixture("broken/writes-errors-to-stdout.ts"), [noAnsiWhenPipedChecker]);
    const f = noAnsiWhenPipedChecker.check(h);
    expect(f.verdict).toBe("fail");
    expect(f.detail).toContain("ANSI");
  });

  test("cites the observations backing its verdict", async () => {
    const h = await record(fixture("conforming.ts"), [noAnsiWhenPipedChecker]);
    const f = noAnsiWhenPipedChecker.check(h);
    expect(f.evidence.length).toBeGreaterThan(0);
    for (const id of f.evidence) expect(h.byId.has(id)).toBe(true);
  });

  test("reports unverified when no probe was recorded", () => {
    const empty = {
      target: { path: "x", argv0: ["x"] },
      discovery: {
        subcommands: [],
        flags: [],
        machineModeFlag: null,
        valueSets: {},
        helpReadable: false,
      },
      observations: [],
      byId: new Map(),
    };
    expect(noAnsiWhenPipedChecker.check(empty).verdict).toBe("unverified");
  });
});
