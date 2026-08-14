import { describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { record } from "../../record.ts";
import type { TargetInfo } from "../../types.ts";
import { helpExitsZeroChecker } from "./help-exits-zero.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (rel: string): TargetInfo => {
  const p = join(HERE, "../../fixtures", rel);
  return { path: p, argv0: ["bun", p] };
};

describe("C1 — help exits zero", () => {
  test("PASSES the conforming fixture", async () => {
    const h = await record(fixture("conforming.ts"), [helpExitsZeroChecker]);
    const f = helpExitsZeroChecker.check(h);
    expect(f.verdict).toBe("pass");
    expect(f.ruleId).toBe("C1");
  });

  // The negative control. `broken/accepts-extra-positionals.ts` treats `-h` as an unrecognised
  // flag (only the literal `--help` is special-cased) and exits 2 instead of 0 — a real C1
  // violation, unlike `broken/exits-zero-on-unknown-flag.ts`, which exits 0 on every invocation
  // including `-h` and so would pass this checker despite being broken in other respects.
  test("FAILS a CLI whose -h is not recognised as help", async () => {
    const h = await record(fixture("broken/accepts-extra-positionals.ts"), [helpExitsZeroChecker]);
    const f = helpExitsZeroChecker.check(h);
    expect(f.verdict).toBe("fail");
    expect(f.detail).toContain("-h");
    expect(f.ruleId).toBe("C1");
  });

  test("cites the observations backing its verdict", async () => {
    const h = await record(fixture("conforming.ts"), [helpExitsZeroChecker]);
    const f = helpExitsZeroChecker.check(h);
    expect(f.evidence.length).toBeGreaterThan(0);
    for (const id of f.evidence) expect(h.byId.has(id)).toBe(true);
  });
});
