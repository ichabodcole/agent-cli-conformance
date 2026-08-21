import { describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { record } from "../../record.ts";
import { digestOfText } from "../../runner.ts";
import type { History, Observation, TargetInfo } from "../../types.ts";
import { versionFlagChecker } from "../discoverability/version-flag.ts";
import { firstBytePromptChecker } from "./first-byte-prompt.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (rel: string): TargetInfo => {
  const p = join(HERE, "../../fixtures", rel);
  return { path: p, argv0: ["bun", p] };
};

describe("F2 — first byte arrives promptly", () => {
  // Deliberately NOT asserting `pass` here: the fixtures run via `bun <file>.ts`, whose process
  // startup time is environment-dependent (cold cache, loaded CI runner) and can exceed the
  // 100ms threshold even for a fully conforming tool. Asserting pass would make this suite
  // flaky, and a flaky test that gets re-run until green is worse than no test at all. What IS
  // stable, and what this asserts instead, is that the checker took a real measurement and
  // reached a real verdict rather than giving up.
  test("produces a real timing measurement against the conforming fixture", async () => {
    const h = await record(fixture("conforming.ts"), [firstBytePromptChecker]);
    const f = firstBytePromptChecker.check(h);
    expect(f.ruleId).toBe("F2");
    expect(["pass", "fail"]).toContain(f.verdict);
    expect(f.detail).toMatch(/\d+ms/);
  });

  // The negative control, for a verdict this suite CAN assert stably: sleeps ~300ms before
  // writing anything, comfortably above the 100ms threshold even on a slow machine.
  test("FAILS a CLI whose first byte arrives after the threshold", async () => {
    const h = await record(fixture("broken/slow-first-byte.ts"), [firstBytePromptChecker]);
    const f = firstBytePromptChecker.check(h);
    expect(f.verdict).toBe("fail");
    expect(f.detail).toMatch(/\d+ms/);
    expect(f.ruleId).toBe("F2");
  });

  test("reports unverified when no timing was captured", () => {
    const h: History = {
      target: { path: "x", argv0: ["x"] },
      discovery: {
        subcommands: [],
        flags: [],
        machineModeFlag: null,
        machineModeDefault: false,
        valueSets: {},
        helpReadable: false,
      },
      observations: [],
      waived: new Set<string>(),
      byId: new Map(),
    };
    const f = firstBytePromptChecker.check(h);
    expect(f.verdict).toBe("unverified");
  });

  // The last hole in the catalogue-wide timeout sweep. F2 used to drop the killed runs and
  // report on whatever survived, so one completed run beside two that never terminated read as
  // `pass — first byte in 4ms (runs: 4ms)`, saying nothing at all about the other two.
  test("reports unverified when only SOME of the timing runs completed", () => {
    const run = (n: number, timedOut: boolean): Observation => ({
      id: `f2-${n}`,
      invocation: {
        args: ["--version"],
        repeat: n,
        inertness: "help-path",
        purpose: `F2: timing run ${n}`,
      },
      purposes: [`F2: timing run ${n}`],
      stdout: timedOut ? "" : "1.0.0\n",
      stderr: "",
      stdoutBytes: timedOut ? 0 : "1.0.0\n".length,
      stderrBytes: 0,
      stdoutDigest: digestOfText(timedOut ? "" : "1.0.0\n"),
      stderrDigest: digestOfText(""),
      stdoutLossy: false,
      stderrLossy: false,
      truncated: false,
      exitCode: timedOut ? null : 0,
      timedOut,
      signal: null,
      crashed: false,
      spawnFailed: false,
      durationMs: timedOut ? 10_000 : 4,
      timeToFirstByteMs: timedOut ? null : 4,
    });
    const observations = [run(1, false), run(2, true), run(3, true)];
    const h: History = {
      target: { path: "x", argv0: ["x"] },
      discovery: {
        subcommands: [],
        flags: [],
        machineModeFlag: null,
        machineModeDefault: false,
        valueSets: {},
        helpReadable: false,
      },
      observations,
      waived: new Set<string>(),
      byId: new Map(observations.map((o) => [o.id, o])),
    };
    const f = firstBytePromptChecker.check(h);
    expect(f.verdict).toBe("unverified");
    expect(f.detail).toContain("2 of 3");
  });

  test("cites the observations backing its verdict", async () => {
    const h = await record(fixture("conforming.ts"), [firstBytePromptChecker]);
    const f = firstBytePromptChecker.check(h);
    expect(f.evidence.length).toBeGreaterThan(0);
    for (const id of f.evidence) expect(h.byId.has(id)).toBe(true);
  });
});

// The probe tests the rule its title names — falsified, not asserted. Same construction as C3's
// and D4's, because F2 had the same defect in a third spelling: the three runs used to carry
// `ACC_PROBE_TIMING=1|2|3`, purely to survive record()'s dedup, and the target can read that.
//
// The objection here is not D4's. F2 does not COMPARE its runs, it TIMES them, so an
// environment-sensitive target — one that re-reads configuration when an unfamiliar variable
// appears, or logs it — would have been made faster or slower by the recorder's own bookkeeping,
// and best-of-N would then report a number about the bookkeeping. The instrument was perturbing
// the quantity it measured.
//
// `Invocation.repeat` removes the difference, and the danger is that it could be undone
// invisibly. So the assertions below run against a fixture that reports what the CHILD actually
// received: the Observation stores the Invocation the KIT built, so a leak into argv or the
// environment would be recorded just as faithfully as anything else and prove nothing.
describe("F2's three probes are the SAME invocation, three times", () => {
  const ECHO = fixture("echoes-argv.ts");

  test("identical args, no env override, three distinct ids", async () => {
    const h = await record(ECHO, [firstBytePromptChecker]);
    const runs = h.observations.filter((o) => o.purposes.some((p) => p.startsWith("F2:")));
    expect(runs).toHaveLength(3);

    expect([...new Set(runs.map((o) => JSON.stringify(o.invocation.args)))]).toHaveLength(1);
    // The line `ACC_PROBE_TIMING` used to occupy.
    for (const o of runs)
      expect({ id: o.id, env: o.invocation.env }).toEqual({ id: o.id, env: undefined });

    // Three recordings nonetheless, which is what `repeat` buys: without the index these collapse
    // into one sample and best-of-3 becomes best-of-1.
    expect(new Set(runs.map((o) => o.id)).size).toBe(3);
    expect(runs.map((o) => o.invocation.repeat).sort()).toEqual([1, 2, 3]);
  }, 30_000);

  test("the target observed identical argv, and no probe identity in its environment", async () => {
    const h = await record(ECHO, [firstBytePromptChecker]);
    const runs = h.observations.filter((o) => o.purposes.some((p) => p.startsWith("F2:")));
    const seen = runs.map((o) => JSON.parse(o.stderr) as { argv: string[]; injected: object });

    expect(seen).toHaveLength(3);
    // The witness that matters. `echoes-argv.ts` reports every `ACC_*` variable it can see —
    // including `ACC_PROBE_TIMING` by name — so an empty `injected` is an assertion with a way to
    // fail, not a vacuous one.
    expect([...new Set(seen.map((s) => JSON.stringify(s.argv)))]).toHaveLength(1);
    expect(seen[0]?.argv).toEqual(["--version"]);
    for (const s of seen) expect(s.injected).toEqual({});
  }, 30_000);

  // ...and the consequence, as the fixture can actually witness it. Measured against the old
  // probe set, the three recordings were:
  //
  //   1  {"argv":["--version"],"injected":{"ACC_PROBE_TIMING":"1"}}
  //   2  {"argv":["--version"],"injected":{"ACC_PROBE_TIMING":"2"}}
  //   3  {"argv":["--version"],"injected":{"ACC_PROBE_TIMING":"3"}}
  //
  // Three different inputs, one reported number. All three are now byte-identical, so best-of-3
  // is three samples of one invocation rather than one sample each of three.
  test("a target that reports its environment sees the same environment all three times", async () => {
    const h = await record(ECHO, [firstBytePromptChecker]);
    const runs = h.observations.filter((o) => o.purposes.some((p) => p.startsWith("F2:")));
    expect([...new Set(runs.map((o) => o.stderr))]).toHaveLength(1);
    expect(runs[0]?.stderr).toContain('"injected":{}');
  }, 30_000);

  // The collision `repeat` walks into and `env` did not: F2's args are now identical to D1's
  // plain `--version` probe, and `findByArgs` ignores `repeat`. F2 uses `findByPurpose`, which is
  // what keeps the two apart — asserted here rather than left to the comment that says so.
  test("F2's runs stay distinct from D1's own --version probe", async () => {
    const h = await record(ECHO, [firstBytePromptChecker, versionFlagChecker]);
    const f2 = h.observations.filter((o) => o.purposes.some((p) => p.startsWith("F2:")));
    const d1 = h.observations.filter((o) => o.purposes.some((p) => p.startsWith("D1:")));
    expect(f2).toHaveLength(3);
    expect(d1).toHaveLength(2);
    // No recording is claimed by both, so neither checker is reading the other's evidence.
    const shared = f2.filter((o) => d1.includes(o));
    expect(shared).toEqual([]);
  }, 30_000);
});
