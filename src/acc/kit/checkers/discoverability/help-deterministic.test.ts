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
    invocation: {
      args: ["--help"],
      repeat: 1,
      inertness: "help-path" as const,
      purpose: "D4: help run 1",
    },
    purposes: ["D4: help run 1"],
    stdout: "usage: fixture\n",
    stderr: "",
    stdoutBytes: "usage: fixture\n".length,
    stderrBytes: 0,
    truncated: false,
    exitCode: 0,
    timedOut: false,
    signal: null,
    crashed: false,
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
    // "index", not "byte": the offset is a JS string index (UTF-16 code units), which is only
    // a byte offset while the help text stays ASCII.
    expect(f.detail).toMatch(/first at index \d+/);
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

// The probe tests the rule its title names — falsified, not asserted. Same construction as C3's
// (see checkers/exit-codes/deterministic.test.ts), because D4 had the same defect: run B used to
// carry `ACC_PROBE_NONCE=1` purely to survive record()'s dedup, so a rule about two runs of the
// SAME invocation was comparing two invocations that differed, and said so in its own coverage
// gap. A CLI echoing its environment into help would have failed D4 for a legitimate reason.
//
// `Invocation.repeat` removes the difference, and the danger is that it could be undone
// invisibly — a repeat that leaked into argv or the environment would restore the old defect
// while every test above still passed. So the assertions below run against a fixture that
// reports what the CHILD actually received: the Observation stores the Invocation the KIT built,
// which would record a leak just as faithfully as anything else and prove nothing.
describe("D4's two probes are the SAME invocation, twice", () => {
  const ECHO = fixture("echoes-argv.ts");

  test("identical args, identical env, distinct ids", async () => {
    const h = await record(ECHO, [helpDeterministicChecker]);
    const runs = h.observations.filter((o) => o.purposes.some((p) => p.startsWith("D4:")));
    expect(runs).toHaveLength(2);

    // One args vector, byte for byte...
    expect([...new Set(runs.map((o) => JSON.stringify(o.invocation.args)))]).toHaveLength(1);
    // ...and NO environment override on either, which is the line the nonce used to occupy.
    for (const o of runs)
      expect({ id: o.id, env: o.invocation.env }).toEqual({ id: o.id, env: undefined });

    // Two recordings nonetheless, which is what `repeat` buys: dedup keys on args + env + repeat,
    // so without the index these two collapse into one sample and D4 has nothing to compare.
    expect(new Set(runs.map((o) => o.id)).size).toBe(2);
    expect(runs.map((o) => o.invocation.repeat).sort()).toEqual([1, 2]);
  }, 30_000);

  test("the target observed identical argv, and no probe identity in its environment", async () => {
    const h = await record(ECHO, [helpDeterministicChecker]);
    const runs = h.observations.filter((o) => o.purposes.some((p) => p.startsWith("D4:")));
    const seen = runs.map((o) => JSON.parse(o.stderr) as { argv: string[]; injected: object });

    expect(seen).toHaveLength(2);
    // The witness that matters. `echoes-argv.ts` reports every `ACC_*` variable it can see —
    // including `ACC_PROBE_NONCE` by name — so an empty `injected` is an assertion with a way to
    // fail, not a vacuous one.
    expect([...new Set(seen.map((s) => JSON.stringify(s.argv)))]).toHaveLength(1);
    expect(seen[0]?.argv).toEqual(["--help"]);
    for (const s of seen) expect(s.injected).toEqual({});
  }, 30_000);

  // ...and the consequence, stated as the fixture can actually witness it. Measured against the
  // old probe pair, the two recordings were:
  //
  //   A  {"argv":["--help"],"injected":{}}
  //   B  {"argv":["--help"],"injected":{"ACC_PROBE_NONCE":"1"}}
  //
  // This fixture writes to stderr and D4 compares stdout, so that difference did not by itself
  // flip a verdict — what it shows is the INPUT D4 handed any target that reads its environment.
  // A CLI echoing an environment summary into its help text (a `doctor`-style banner is the
  // realistic shape) would have differed on stdout for that reason and been reported as
  // nondeterministic. Both recordings are now byte-identical, which is the difference disappearing
  // at the source rather than being excused in a coverage gap.
  test("a target that reports its environment now sees the same environment twice", async () => {
    const h = await record(ECHO, [helpDeterministicChecker]);
    const runs = h.observations.filter((o) => o.purposes.some((p) => p.startsWith("D4:")));
    expect(runs[0]?.stderr).toBe(runs[1]?.stderr as string);
    expect(runs[0]?.stderr).toContain('"injected":{}');
  }, 30_000);
});
