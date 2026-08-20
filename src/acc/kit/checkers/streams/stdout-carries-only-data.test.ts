import { describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { record } from "../../record.ts";
import type { TargetInfo } from "../../types.ts";
import { stdoutCarriesOnlyDataChecker } from "./stdout-carries-only-data.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (rel: string): TargetInfo => {
  const p = join(HERE, "../../fixtures", rel);
  return { path: p, argv0: ["bun", p] };
};

describe("B1 — stdout carries only data on failure", () => {
  test("PASSES the conforming fixture", async () => {
    const h = await record(fixture("conforming.ts"), [stdoutCarriesOnlyDataChecker]);
    const f = stdoutCarriesOnlyDataChecker.check(h);
    expect(f.verdict).toBe("pass");
    expect(f.ruleId).toBe("B1");
  });

  // The negative control: reproduces the `docker inspect <missing> --format json` shape — a
  // non-zero exit AND a plausible-looking empty result written to stdout alongside the error.
  test("FAILS a CLI that writes a plausible result to stdout on failure", async () => {
    const h = await record(fixture("broken/writes-errors-to-stdout.ts"), [
      stdoutCarriesOnlyDataChecker,
    ]);
    const f = stdoutCarriesOnlyDataChecker.check(h);
    expect(f.verdict).toBe("fail");
    expect(f.detail).toContain("wrote to stdout");
  });

  test("cites the observations backing its verdict", async () => {
    const h = await record(fixture("conforming.ts"), [stdoutCarriesOnlyDataChecker]);
    const f = stdoutCarriesOnlyDataChecker.check(h);
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
        machineModeDefault: false,
        valueSets: {},
        helpReadable: false,
      },
      observations: [],
      byId: new Map(),
    };
    expect(stdoutCarriesOnlyDataChecker.check(empty).verdict).toBe("unverified");
  });
});
