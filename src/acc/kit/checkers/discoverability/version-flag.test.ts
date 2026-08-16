import { describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { record } from "../../record.ts";
import type { History, TargetInfo } from "../../types.ts";
import { versionFlagChecker } from "./version-flag.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (rel: string): TargetInfo => {
  const p = join(HERE, "../../fixtures", rel);
  return { path: p, argv0: ["bun", p] };
};

// A History with no "D1:" observations at all, built by hand rather than recorded. Used below
// for the "probe was not recorded" `unverified` branch.
function emptyHistory(): History {
  return {
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
}

describe("D1 — a version is reportable without side effects", () => {
  test("PASSES the conforming fixture", async () => {
    const h = await record(fixture("conforming.ts"), [versionFlagChecker]);
    const f = versionFlagChecker.check(h);
    expect(f.verdict).toBe("pass");
    expect(f.ruleId).toBe("D1");
  });

  // The negative control: --version works normally (the plain probe passes) but reads HOME and
  // fails once HOME is unusable (the hostile probe fails) — a version that needs configuration
  // is useless as the safe first call against an unknown build.
  test("FAILS a CLI whose --version requires a usable HOME", async () => {
    const h = await record(fixture("broken/version-needs-config.ts"), [versionFlagChecker]);
    const f = versionFlagChecker.check(h);
    expect(f.verdict).toBe("fail");
    expect(f.detail).toContain("unusable HOME");
    expect(f.ruleId).toBe("D1");
  });

  test("reports unverified when the plain probe was not recorded", () => {
    const f = versionFlagChecker.check(emptyHistory());
    expect(f.verdict).toBe("unverified");
    expect(f.ruleId).toBe("D1");
  });

  test("cites the observations backing its verdict", async () => {
    const h = await record(fixture("conforming.ts"), [versionFlagChecker]);
    const f = versionFlagChecker.check(h);
    expect(f.evidence.length).toBeGreaterThan(0);
    for (const id of f.evidence) expect(h.byId.has(id)).toBe(true);
  });
});
