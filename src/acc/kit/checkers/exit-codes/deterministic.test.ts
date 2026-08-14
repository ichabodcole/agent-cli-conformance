import { describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { record } from "../../record.ts";
import type { History, TargetInfo } from "../../types.ts";
import { deterministicChecker } from "./deterministic.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (rel: string): TargetInfo => {
  const p = join(HERE, "../../fixtures", rel);
  return { path: p, argv0: ["bun", p] };
};

// A History with fewer than three "C3:" observations, built by hand rather than recorded. Used
// below for the "too few runs" `unverified` branch — see the timeout test for the other
// `unverified` branch, and its comment for why the THIRD branch (genuinely varying codes) has
// no fixture-based negative control at all.
function historyWithRuns(n: 0 | 1 | 2): History {
  const observations = Array.from({ length: n }, (_, i) => ({
    id: `fake-${i}`,
    invocation: {
      args: [`--acc-probe-xyzzy-repeat-${i + 1}`],
      inertness: "sentinel" as const,
      purpose: `C3: repeat ${i + 1}`,
    },
    purposes: [`C3: repeat ${i + 1}`],
    stdout: "",
    stderr: "",
    stdoutBytes: 0,
    stderrBytes: 0,
    truncated: false,
    exitCode: 2,
    timedOut: false,
    spawnFailed: false,
    durationMs: 1,
    timeToFirstByteMs: null,
  }));
  return {
    target: { path: "x", argv0: ["x"] },
    discovery: { subcommands: [], flags: [], machineModeFlag: null, helpReadable: false },
    observations,
    byId: new Map(observations.map((o) => [o.id, o])),
  };
}

// Three runs, all timed out — exitCode is null on each because the runner killed the process,
// not because the target chose that status. Built by hand: getting a real fixture to hang
// exactly three times against the runner's ~10s deadline would make this file slow.
function historyWithTimedOutRuns(): History {
  const observations = [1, 2, 3].map((n) => ({
    id: `fake-timeout-${n}`,
    invocation: {
      args: [`--acc-probe-xyzzy-repeat-${n}`],
      inertness: "sentinel" as const,
      purpose: `C3: repeat ${n}`,
    },
    purposes: [`C3: repeat ${n}`],
    stdout: "",
    stderr: "",
    stdoutBytes: 0,
    stderrBytes: 0,
    truncated: false,
    exitCode: null,
    timedOut: true,
    spawnFailed: false,
    durationMs: 10_000,
    timeToFirstByteMs: null,
  }));
  return {
    target: { path: "x", argv0: ["x"] },
    discovery: { subcommands: [], flags: [], machineModeFlag: null, helpReadable: false },
    observations,
    byId: new Map(observations.map((o) => [o.id, o])),
  };
}

describe("C3 — exit codes are deterministic", () => {
  test("PASSES the conforming fixture", async () => {
    const h = await record(fixture("conforming.ts"), [deterministicChecker]);
    const f = deterministicChecker.check(h);
    expect(f.verdict).toBe("pass");
    expect(f.ruleId).toBe("C3");
  });

  test("reports unverified when fewer than three runs were recorded", () => {
    const f = deterministicChecker.check(historyWithRuns(2));
    expect(f.verdict).toBe("unverified");
    expect(f.ruleId).toBe("C3");
  });

  // The negative control for a triple timeout. Before this test existed, a target that hung on
  // all three probes recorded `exitCode: null` three times, `new Set([null,null,null]).size`
  // is 1, and the checker reported a clean PASS — "all three runs agreed", which is not evidence
  // of determinism, it's evidence the tool hung on a deliberately-invalid flag. That hang is a
  // real defect, but it's E1's finding (it probes for exactly this), not C3's: C3 only answers
  // "does the exit code vary", and when it can't see a code it must say so instead of comparing
  // nulls. Deliberately NOT `fail`, for the same reason.
  test("reports unverified, not pass, when every run times out", () => {
    const f = deterministicChecker.check(historyWithTimedOutRuns());
    expect(f.verdict).toBe("unverified");
    expect(f.detail).toContain("timed out");
    expect(f.detail).toContain("3 of 3");
    expect(f.ruleId).toBe("C3");
  });

  // There is deliberately NO negative control for the remaining branch — an exit code that
  // genuinely varies between three back-to-back, otherwise-identical, non-timed-out
  // invocations. Writing a fixture that behaves nondeterministically on purpose is either not
  // really nondeterministic (e.g. it counts its own invocations, which is
  // deterministic-by-construction and proves nothing about detecting real nondeterminism) or is
  // genuinely racy and therefore flaky in CI. Neither is worth having. The `codes.size !== 1`
  // branch is exercised only by direct inspection of `deterministic.ts`.

  test("cites the observations backing its verdict", async () => {
    const h = await record(fixture("conforming.ts"), [deterministicChecker]);
    const f = deterministicChecker.check(h);
    expect(f.evidence.length).toBeGreaterThan(0);
    for (const id of f.evidence) expect(h.byId.has(id)).toBe(true);
  });
});
