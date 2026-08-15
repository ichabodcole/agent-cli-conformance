import { describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { record } from "../../record.ts";
import type { History, TargetInfo } from "../../types.ts";
import { usageDistinguishableChecker } from "./usage-distinguishable.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (rel: string): TargetInfo => {
  const p = join(HERE, "../../fixtures", rel);
  return { path: p, argv0: ["bun", p] };
};

// Both "C2:" probes recorded, but one hung. Built by hand: a fixture that actually blocks for
// the runner's ~10s deadline would make this file slow on every run.
function historyWithOneTimedOutProbe(): History {
  const observations = [
    {
      id: "fake-flag",
      invocation: {
        args: ["--acc-probe-xyzzy-flag"],
        inertness: "sentinel" as const,
        purpose: "C2: usage error via flag",
      },
      purposes: ["C2: usage error via flag"],
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
    },
    {
      id: "fake-verb",
      invocation: {
        args: ["acc-probe-xyzzy-verb"],
        inertness: "sentinel" as const,
        purpose: "C2: usage error via verb",
      },
      purposes: ["C2: usage error via verb"],
      stdout: "",
      stderr: "",
      stdoutBytes: 0,
      stderrBytes: 0,
      truncated: false,
      exitCode: 2,
      timedOut: false,
      signal: null,
      crashed: false,
      spawnFailed: false,
      durationMs: 5,
      timeToFirstByteMs: 1,
    },
  ];
  return {
    target: { path: "x", argv0: ["x"] },
    discovery: { subcommands: [], flags: [], machineModeFlag: null, helpReadable: false },
    observations,
    byId: new Map(observations.map((o) => [o.id, o])),
  };
}

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

  // A hung probe WAS recorded — it just returned no code to compare. The detail must say so
  // rather than "probes were not recorded", which would conflate two different outcomes A1 and
  // C1 both take care to keep separate: missing evidence vs. evidence that the target hung.
  test("distinguishes a timed-out probe from a probe that was never recorded", () => {
    const f = usageDistinguishableChecker.check(historyWithOneTimedOutProbe());
    expect(f.verdict).toBe("unverified");
    expect(f.detail).toContain("timed out");
    expect(f.detail).not.toContain("not recorded");
    expect(f.ruleId).toBe("C2");
  });
});
