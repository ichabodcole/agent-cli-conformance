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
// below for the `unverified` branch — see that test for why the OTHER branch (varying codes)
// has no fixture-based negative control at all.
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
    exitCode: 2,
    timedOut: false,
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

describe("C3 — exit codes are deterministic", () => {
  test("PASSES the conforming fixture", async () => {
    const h = await record(fixture("conforming.ts"), [deterministicChecker]);
    const f = deterministicChecker.check(h);
    expect(f.verdict).toBe("pass");
    expect(f.ruleId).toBe("C3");
  });

  // The negative control for the `unverified` branch (fewer than three runs recorded), built by
  // hand rather than against a fixture. There is deliberately NO negative control here for the
  // OTHER failing branch — an exit code that genuinely varies between three back-to-back,
  // otherwise-identical invocations. Writing a fixture that behaves nondeterministically on
  // purpose is either not really nondeterministic (e.g. it counts its own invocations, which is
  // deterministic-by-construction and proves nothing about detecting real nondeterminism) or is
  // genuinely racy and therefore flaky in CI. Neither is worth having. The `codes.size !== 1`
  // branch is exercised only by direct inspection of `deterministic.ts`.
  test("reports unverified when fewer than three runs were recorded", () => {
    const f = deterministicChecker.check(historyWithRuns(2));
    expect(f.verdict).toBe("unverified");
    expect(f.ruleId).toBe("C3");
  });

  test("cites the observations backing its verdict", async () => {
    const h = await record(fixture("conforming.ts"), [deterministicChecker]);
    const f = deterministicChecker.check(h);
    expect(f.evidence.length).toBeGreaterThan(0);
    for (const id of f.evidence) expect(h.byId.has(id)).toBe(true);
  });
});
