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
      machineModeDefault: false,
      machineModeSource: null,
      valueSets: {},
      helpReadable: false,
    },
    observations: [],
    waived: new Set<string>(),
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

  // THE REGRESSION. A target with no `--version` at all fails D1 for one reason, and the checker
  // used to report it as three — the third of which, "requires configuration", was an accusation
  // nothing in the evidence supported. Found by the first outside adopter, not by us.
  test("FAILS a CLI with no --version, and says NOTHING about configuration", async () => {
    const h = await record(fixture("broken/no-version-flag.ts"), [versionFlagChecker]);
    const f = versionFlagChecker.check(h);
    expect(f.verdict).toBe("fail");
    expect(f.detail).not.toContain("configuration");
    expect(f.detail).not.toContain("HOME");
    expect(f.ruleId).toBe("D1");
  });

  // ...and the same fact from the other side: one clause, not a restatement of one failure in
  // three voices. `exited 2` and `wrote nothing to stdout` are the same finding about a target
  // that has no version to report.
  test("collapses a missing --version into a single clause", async () => {
    const h = await record(fixture("broken/no-version-flag.ts"), [versionFlagChecker]);
    const f = versionFlagChecker.check(h);
    expect(f.detail.split(";").length).toBe(1);
    expect(f.detail).toContain("reported no version");
  });

  // The guard that let it through: `crashedUnverified()` only fires for a target that DIED, and
  // this one exits 2 under its own control. Proving the fixture's shape is what keeps the
  // regression honest — a fixture that crashed would pass the test for the wrong reason.
  test("the regression fixture fails cleanly rather than crashing", async () => {
    const h = await record(fixture("broken/no-version-flag.ts"), [versionFlagChecker]);
    const runs = h.observations.filter((o) => o.purposes.some((p) => p.startsWith("D1:")));
    expect(runs.length).toBe(2);
    for (const o of runs) {
      expect(o.exitCode).toBe(2);
      expect(o.signal).toBe(null);
    }
    // The two probes differ only by env, and this target ignores env — so they must be identical
    // on every axis the checker reads. This is the property the old predicate ignored.
    const [plain, hostile] = runs;
    expect(hostile?.exitCode).toBe(plain?.exitCode as number);
    expect(hostile?.stderr).toBe(plain?.stderr as string);
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
