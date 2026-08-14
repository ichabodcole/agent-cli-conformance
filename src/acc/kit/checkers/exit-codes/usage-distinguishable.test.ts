import { describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { record } from "../../record.ts";
import type { TargetInfo } from "../../types.ts";
import { usageDistinguishableChecker } from "./usage-distinguishable.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (rel: string): TargetInfo => {
  const p = join(HERE, "../../fixtures", rel);
  return { path: p, argv0: ["bun", p] };
};

describe("C2 — usage errors are distinguishable", () => {
  test("PASSES the conforming fixture", async () => {
    const h = await record(fixture("conforming.ts"), [usageDistinguishableChecker]);
    const f = usageDistinguishableChecker.check(h);
    expect(f.verdict).toBe("pass");
    expect(f.ruleId).toBe("C2");
    // The rule's honest half: even on a pass, distinguishability from an internal fault was
    // never checked, because there is no safe general way to provoke one black-box.
    expect(f.detail).toContain("unverified");
  });

  // The negative control: this fixture exits 0 on every invocation, including both usage-error
  // shapes (bad flag and bad verb) — the exact "usage error return 0, not 2" failure the rule
  // exists to catch.
  test("FAILS a CLI that exits 0 on usage errors", async () => {
    const h = await record(fixture("broken/exits-zero-on-unknown-flag.ts"), [
      usageDistinguishableChecker,
    ]);
    const f = usageDistinguishableChecker.check(h);
    expect(f.verdict).toBe("fail");
    expect(f.detail).toContain("exited 0");
    expect(f.ruleId).toBe("C2");
  });

  test("cites the observations backing its verdict", async () => {
    const h = await record(fixture("conforming.ts"), [usageDistinguishableChecker]);
    const f = usageDistinguishableChecker.check(h);
    expect(f.evidence.length).toBeGreaterThan(0);
    for (const id of f.evidence) expect(h.byId.has(id)).toBe(true);
  });
});
