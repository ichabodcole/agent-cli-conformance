import { describe, expect, test } from "bun:test";
import type { History, Observation } from "./types.ts";
import { findByArgs, findByPurpose } from "./types.ts";

function obs(args: string[], purposes: string[]): Observation {
  return {
    id: args.join(" ") || "(bare)",
    invocation: { args, inertness: "sentinel", purpose: purposes[0] ?? "test" },
    purposes,
    stdout: "",
    stderr: "",
    exitCode: 0,
    timedOut: false,
    spawnFailed: false,
    durationMs: 1,
    timeToFirstByteMs: null,
  };
}

function history(observations: Observation[]): History {
  return {
    target: { path: "/dev/null", argv0: ["bun", "/dev/null"] },
    discovery: { subcommands: [], flags: [], machineModeFlag: null, helpReadable: false },
    observations,
    byId: new Map(observations.map((o) => [o.id, o])),
  };
}

describe("findByArgs", () => {
  test("returns the observation matching the exact args", () => {
    const target = obs(["--acc-probe-xyzzy-flag"], ["A1: unrecognised flag"]);
    const other = obs(["--help"], ["B1: help path"]);
    const h = history([other, target]);
    expect(findByArgs(h, ["--acc-probe-xyzzy-flag"])).toBe(target);
  });

  test("returns undefined when no observation matches", () => {
    const h = history([obs(["--help"], ["B1: help path"])]);
    expect(findByArgs(h, ["--acc-probe-xyzzy-flag"])).toBeUndefined();
  });
});

describe("findByPurpose", () => {
  test("returns every observation carrying a purpose starting with the prefix", () => {
    const a = obs(["--help"], ["A1: probe one"]);
    const b = obs(["--version"], ["A1: probe two"]);
    const c = obs(["list"], ["B2: unrelated"]);
    const h = history([a, b, c]);
    const found = findByPurpose(h, "A1:");
    expect(found).toHaveLength(2);
    expect(found).toContain(a);
    expect(found).toContain(b);
  });

  // Dedup in `record` can merge several checkers' requests into one recording, so a single
  // observation may carry purposes from more than one rule. It must still be found by each.
  test("returns an observation whose purposes were merged from several requesters", () => {
    const merged = obs(["--help"], ["A1: an unrecognised flag must be rejected", "B2: help path"]);
    const h = history([merged]);
    expect(findByPurpose(h, "A1:")).toEqual([merged]);
    expect(findByPurpose(h, "B2:")).toEqual([merged]);
  });

  test("returns an empty array when nothing matches", () => {
    const h = history([obs(["--help"], ["B2: help path"])]);
    expect(findByPurpose(h, "A1:")).toEqual([]);
  });
});
