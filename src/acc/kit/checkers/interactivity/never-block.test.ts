import { describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { record } from "../../record.ts";
import type { History, TargetInfo } from "../../types.ts";
import { neverBlockChecker } from "./never-block.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (rel: string): TargetInfo => {
  const p = join(HERE, "../../fixtures", rel);
  return { path: p, argv0: ["bun", p] };
};

describe("E1 — never block on input without a TTY", () => {
  test("PASSES the conforming fixture", async () => {
    const h = await record(fixture("conforming.ts"), [neverBlockChecker]);
    const f = neverBlockChecker.check(h);
    expect(f.verdict).toBe("pass");
    expect(f.ruleId).toBe("E1");
  });

  // The negative control genuinely hangs — it awaits a promise that never resolves — because
  // that is the only way to prove the runner's deadline is actually enforced, not just assumed.
  // Two of E1's three probes (bare, bad-flag) trip the hang; only --help returns fast. Each
  // hung probe burns the full 10s DEFAULT_TIMEOUT_MS (see runner.ts), so this test genuinely
  // takes ~20s. That is expected, not broken — do not "fix" it by shortening the fixture's
  // hang, which would stop testing deadline enforcement at all. The explicit 60s test timeout
  // below is the margin for that.
  test("FAILS, rather than hanging forever, when the target blocks on stdin", async () => {
    const h = await record(fixture("broken/hangs-waiting-for-input.ts"), [neverBlockChecker]);
    const f = neverBlockChecker.check(h);
    expect(f.verdict).toBe("fail");
    expect(f.detail).toContain("never terminated");
    expect(f.ruleId).toBe("E1");
  }, 60_000);

  test("reports unverified when probes were not recorded", () => {
    const h: History = {
      target: { path: "x", argv0: ["x"] },
      discovery: { subcommands: [], flags: [], machineModeFlag: null, helpReadable: false },
      observations: [],
      byId: new Map(),
    };
    const f = neverBlockChecker.check(h);
    expect(f.verdict).toBe("unverified");
  });

  test("cites the observations backing its verdict", async () => {
    const h = await record(fixture("conforming.ts"), [neverBlockChecker]);
    const f = neverBlockChecker.check(h);
    expect(f.evidence.length).toBeGreaterThan(0);
    for (const id of f.evidence) expect(h.byId.has(id)).toBe(true);
  });
});
