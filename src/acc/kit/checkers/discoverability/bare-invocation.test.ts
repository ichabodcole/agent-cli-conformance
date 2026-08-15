import { describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { record } from "../../record.ts";
import type { History, TargetInfo } from "../../types.ts";
import { bareInvocationChecker } from "./bare-invocation.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (rel: string): TargetInfo => {
  const p = join(HERE, "../../fixtures", rel);
  return { path: p, argv0: ["bun", p] };
};

// A hung bare invocation, built by hand rather than recorded — exercising the runner's ~10s
// deadline for real would make this file slow. `exitCode: null` here is honest: the runner
// killed the process, so it never chose a status.
function historyWithHang(): History {
  const o = {
    id: "fake-hang",
    invocation: {
      args: [] as string[],
      inertness: "bare" as const,
      purpose: "D2: bare invocation",
    },
    purposes: ["D2: bare invocation"],
    stdout: "",
    stderr: "",
    stdoutBytes: 0,
    stderrBytes: 0,
    truncated: false,
    exitCode: null,
    timedOut: true,
    signal: null,
    crashed: false,
    spawnFailed: false,
    durationMs: 10_000,
    timeToFirstByteMs: null,
  };
  return {
    target: { path: "x", argv0: ["x"] },
    discovery: { subcommands: [], flags: [], machineModeFlag: null, helpReadable: false },
    observations: [o],
    byId: new Map([[o.id, o]]),
  };
}

describe("D2 — bare invocation is a usage error", () => {
  test("PASSES the conforming fixture", async () => {
    const h = await record(fixture("conforming.ts"), [bareInvocationChecker]);
    const f = bareInvocationChecker.check(h);
    expect(f.verdict).toBe("pass");
    expect(f.ruleId).toBe("D2");
  });

  // The negative control: bare invocation exits 0 and writes usage text to stdout instead of
  // treating the empty argv as a usage error.
  test("FAILS a CLI that exits 0 with stdout on bare invocation", async () => {
    const h = await record(fixture("broken/exits-zero-on-unknown-flag.ts"), [
      bareInvocationChecker,
    ]);
    const f = bareInvocationChecker.check(h);
    expect(f.verdict).toBe("fail");
    expect(f.detail).toContain("exited 0");
    expect(f.ruleId).toBe("D2");
  });

  test("FAILS, rather than reporting a false pass, when bare invocation hangs", () => {
    const f = bareInvocationChecker.check(historyWithHang());
    expect(f.verdict).toBe("fail");
    expect(f.detail).toContain("hung");
  });

  test("reports unverified when the probe was not recorded", () => {
    const h: History = {
      target: { path: "x", argv0: ["x"] },
      discovery: { subcommands: [], flags: [], machineModeFlag: null, helpReadable: false },
      observations: [],
      byId: new Map(),
    };
    const f = bareInvocationChecker.check(h);
    expect(f.verdict).toBe("unverified");
  });

  test("cites the observations backing its verdict", async () => {
    const h = await record(fixture("conforming.ts"), [bareInvocationChecker]);
    const f = bareInvocationChecker.check(h);
    expect(f.evidence.length).toBeGreaterThan(0);
    for (const id of f.evidence) expect(h.byId.has(id)).toBe(true);
  });
});
