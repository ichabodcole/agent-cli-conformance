import { describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { record } from "../../record.ts";
import type { History, TargetInfo } from "../../types.ts";
import { helpDeterministicChecker } from "./help-deterministic.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (rel: string): TargetInfo => {
  const p = join(HERE, "../../fixtures", rel);
  return { path: p, argv0: ["bun", p] };
};

// A History with only one "D4:" observation, built by hand rather than recorded. Used below for
// the "fewer than two runs" `unverified` branch.
function historyWithOneRun(): History {
  const o = {
    id: "fake-a",
    invocation: { args: ["--help"], inertness: "help-path" as const, purpose: "D4: help run A" },
    purposes: ["D4: help run A"],
    stdout: "usage: fixture\n",
    stderr: "",
    exitCode: 0,
    timedOut: false,
    spawnFailed: false,
    durationMs: 1,
    timeToFirstByteMs: 1,
  };
  return {
    target: { path: "x", argv0: ["x"] },
    discovery: { subcommands: [], flags: [], machineModeFlag: null, helpReadable: true },
    observations: [o],
    byId: new Map([[o.id, o]]),
  };
}

describe("D4 — help output is byte-identical between runs", () => {
  test("PASSES the conforming fixture", async () => {
    const h = await record(fixture("conforming.ts"), [helpDeterministicChecker]);
    const f = helpDeterministicChecker.check(h);
    expect(f.verdict).toBe("pass");
    expect(f.ruleId).toBe("D4");
  });

  // The negative control: help embeds a fresh random session id every invocation, so the two
  // runs differ. The checker must report WHERE they diverge, not just that they did.
  test("FAILS, and reports the diff offset, when help embeds a random value", async () => {
    const h = await record(fixture("broken/nondeterministic-help.ts"), [helpDeterministicChecker]);
    const f = helpDeterministicChecker.check(h);
    expect(f.verdict).toBe("fail");
    expect(f.detail).toMatch(/first at byte \d+/);
    expect(f.ruleId).toBe("D4");
  });

  test("reports unverified when fewer than two runs were recorded", () => {
    const f = helpDeterministicChecker.check(historyWithOneRun());
    expect(f.verdict).toBe("unverified");
    expect(f.ruleId).toBe("D4");
  });

  test("cites the observations backing its verdict", async () => {
    const h = await record(fixture("conforming.ts"), [helpDeterministicChecker]);
    const f = helpDeterministicChecker.check(h);
    expect(f.evidence.length).toBeGreaterThan(0);
    for (const id of f.evidence) expect(h.byId.has(id)).toBe(true);
  });
});
