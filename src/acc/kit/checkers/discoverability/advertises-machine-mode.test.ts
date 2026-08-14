import { describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { record } from "../../record.ts";
import type { History, TargetInfo } from "../../types.ts";
import { advertisesMachineModeChecker } from "./advertises-machine-mode.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (rel: string): TargetInfo => {
  const p = join(HERE, "../../fixtures", rel);
  return { path: p, argv0: ["bun", p] };
};

describe("D3 — help advertises the machine-readable path", () => {
  test("PASSES the conforming fixture", async () => {
    const h = await record(fixture("conforming.ts"), [advertisesMachineModeChecker]);
    const f = advertisesMachineModeChecker.check(h);
    expect(f.verdict).toBe("pass");
    expect(f.ruleId).toBe("D3");
  });

  // The negative control: help never mentions --json, --format, --output, or "schema" anywhere.
  // A `fail` here also disables B3, and the detail must say so — an undiscoverable feature is,
  // to this kit, indistinguishable from an absent one.
  test("FAILS, and names the B3 knock-on, when help advertises no machine-mode path", async () => {
    const h = await record(fixture("no-machine-mode.ts"), [advertisesMachineModeChecker]);
    const f = advertisesMachineModeChecker.check(h);
    expect(f.verdict).toBe("fail");
    expect(f.detail).toContain("B3");
    expect(f.ruleId).toBe("D3");
  });

  test("reports unverified when help was not readable", () => {
    const h: History = {
      target: { path: "x", argv0: ["x"] },
      discovery: { subcommands: [], flags: [], machineModeFlag: null, helpReadable: false },
      observations: [],
      byId: new Map(),
    };
    const f = advertisesMachineModeChecker.check(h);
    expect(f.verdict).toBe("unverified");
  });

  test("cites the observations backing its verdict", async () => {
    const h = await record(fixture("conforming.ts"), [advertisesMachineModeChecker]);
    const f = advertisesMachineModeChecker.check(h);
    expect(f.evidence.length).toBeGreaterThan(0);
    for (const id of f.evidence) expect(h.byId.has(id)).toBe(true);
  });
});
