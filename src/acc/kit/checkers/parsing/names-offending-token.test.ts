import { describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { record } from "../../record.ts";
import type { TargetInfo } from "../../types.ts";
import { namesOffendingTokenChecker } from "./names-offending-token.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (rel: string): TargetInfo => {
  const p = join(HERE, "../../fixtures", rel);
  return { path: p, argv0: ["bun", p] };
};

describe("A3 — errors must name the offending token", () => {
  test("PASSES the conforming fixture", async () => {
    const h = await record(fixture("conforming.ts"), [namesOffendingTokenChecker]);
    const f = namesOffendingTokenChecker.check(h);
    expect(f.verdict).toBe("pass");
    expect(f.ruleId).toBe("A3");
  });

  // The negative control: this fixture never errors at all on an unrecognised token — it
  // accepts anything and exits 0 — so stderr is empty and names nothing.
  test("FAILS a CLI whose rejections name nothing", async () => {
    const h = await record(fixture("broken/exits-zero-on-unknown-flag.ts"), [
      namesOffendingTokenChecker,
    ]);
    const f = namesOffendingTokenChecker.check(h);
    expect(f.verdict).toBe("fail");
    expect(f.detail).toContain("did not name");
  });

  test("cites the observations backing its verdict", async () => {
    const h = await record(fixture("conforming.ts"), [namesOffendingTokenChecker]);
    const f = namesOffendingTokenChecker.check(h);
    expect(f.evidence.length).toBeGreaterThan(0);
    for (const id of f.evidence) expect(h.byId.has(id)).toBe(true);
  });
});
