// The alignment and diffing, over hand-built reports.
//
// These are the mechanism's unit tests: what counts as one probe, what counts as a divergence,
// and what the two axes say about an observation whose exit code is null. The claim that the
// whole thing reproduces the divergences a human found by hand lives in
// src/acc/commands/compare.test.ts, which drives the real CLI end to end.

import { describe, expect, test } from "bun:test";
import {
  compareReports,
  endingOf,
  type LabelledReport,
  type Placement,
  placementOf,
} from "./compare.ts";
import type { Report, ReportedObservation } from "./report.ts";

/** An observation with everything at its quiet default, so each test states only what it means. */
function observation(id: string, o: Partial<ReportedObservation> = {}): ReportedObservation {
  return {
    id,
    args: [],
    inertness: "bare",
    purposes: ["a purpose"],
    exitCode: 0,
    signal: null,
    crashed: false,
    timedOut: false,
    spawnFailed: false,
    durationMs: 1,
    timeToFirstByteMs: 1,
    stdoutBytes: 0,
    stderrBytes: 0,
    stdoutDigest: "out",
    stderrDigest: "err",
    stdoutLossy: false,
    stderrLossy: false,
    truncated: false,
    ...o,
  };
}

/** A report carrying nothing but the fields a comparison reads. */
function report(label: string, observations: ReportedObservation[], kitVersion = "0.1.0") {
  const r = {
    target: `/tmp/${label}`,
    targetArgv0: ["bun", `/tmp/${label}`],
    kitVersion,
    configSource: { origin: "none" as const, path: null, dir: "/tmp" },
    observations,
  } as unknown as Report;
  return { label, report: r } satisfies LabelledReport;
}

/** The divergence in the report's §2(a), in miniature: exit 2 versus exit 1 on one argv. */
const EXIT_2 = report("seven", [
  observation("p1", { args: ["--acc-probe-xyzzy-flag"], exitCode: 2, stderrBytes: 48 }),
]);
const EXIT_1 = report("one", [
  observation("p1", { args: ["--acc-probe-xyzzy-flag"], exitCode: 1, stderrBytes: 91 }),
]);

describe("alignment", () => {
  test("observations with the same probe id are one comparable row", () => {
    const c = compareReports([EXIT_2, EXIT_1]);
    expect(c.counts).toMatchObject({ targets: 2, probes: 1, aligned: 1, divergent: 1 });
    expect(c.divergent[0]?.present).toEqual(["seven", "one"]);
    expect(c.divergent[0]?.args).toEqual(["--acc-probe-xyzzy-flag"]);
  });

  // The ids are `invocationId(args, env, repeat)` and carry nothing about the target, which is
  // the property the whole surface rests on. A test that built both sides from the same literal
  // would pass even if alignment secretly keyed on something target-specific.
  test("a probe only one report ran is NOT ALIGNED, and is not a divergence", () => {
    const c = compareReports([
      EXIT_2,
      report("one", [
        ...EXIT_1.report.observations,
        observation("p2", { args: ["--only-here"], exitCode: 0 }),
      ]),
    ]);
    expect(c.counts).toMatchObject({ probes: 2, aligned: 1, divergent: 1, unaligned: 1 });
    expect(c.unaligned[0]?.args).toEqual(["--only-here"]);
    expect(c.unaligned[0]?.present).toEqual(["one"]);
    expect(c.unaligned[0]?.absent).toEqual(["seven"]);
    // `axes` is empty rather than a single group of one: an axis over one target is not a
    // comparison, and publishing one would let a consumer read "they all agree" off it.
    expect(c.unaligned[0]?.axes).toEqual([]);
    expect(c.unaligned[0]?.divergent).toBe(false);
  });

  test("purposes are unioned across targets, so the row says what the question was", () => {
    const c = compareReports([
      report("a", [observation("p1", { purposes: ["A1: an unrecognised flag"] })]),
      report("b", [observation("p1", { purposes: ["C2: usage error via flag", "A1: dup"] })]),
    ]);
    expect(c.agreed[0]?.purposes).toEqual([
      "A1: an unrecognised flag",
      "A1: dup",
      "C2: usage error via flag",
    ]);
  });
});

describe("the two axes", () => {
  test("ending splits the population and names who sits where", () => {
    const c = compareReports([EXIT_2, EXIT_1]);
    expect(c.divergent[0]?.axes.find((a) => a.axis === "ending")?.groups).toEqual([
      { value: "exit 1", targets: ["one"] },
      { value: "exit 2", targets: ["seven"] },
    ]);
  });

  // The axis everyone agrees on is still published. Without it a reader cannot tell "both wrote
  // to stderr" from "nobody looked at which stream was written".
  test("an axis with one group is reported, and does not make the row divergent", () => {
    const c = compareReports([EXIT_2, EXIT_1]);
    expect(c.divergent[0]?.axes.find((a) => a.axis === "placement")?.groups).toEqual([
      { value: "stderr", targets: ["seven", "one"] },
    ]);
    const same = compareReports([EXIT_2, report("copy", EXIT_2.report.observations)]);
    expect(same.counts).toMatchObject({ divergent: 0, agreed: 1 });
  });

  // THE NEGATIVE CONTROL for the whole design. Byte counts differ between any two tools' help
  // screens, so a comparison keyed on them would mark every row divergent and mean nothing.
  test("differing byte counts and digests alone are NOT a divergence", () => {
    const c = compareReports([
      report("a", [observation("p1", { stdoutBytes: 1228, stdoutDigest: "aaa" })]),
      report("b", [observation("p1", { stdoutBytes: 2564, stdoutDigest: "bbb" })]),
    ]);
    expect(c.counts.divergent).toBe(0);
    // ...but they travel on the row, because reproducing the table in the report needs them.
    expect(c.agreed[0]?.outcomes.map((o) => o.stdoutBytes)).toEqual([1228, 2564]);
    expect(c.agreed[0]?.outcomes.map((o) => o.stdoutDigest)).toEqual(["aaa", "bbb"]);
  });
});

describe("how a probe ended", () => {
  // A null exit code has three causes and they are not the same event — see Observation's own
  // doc comments. Rendering all three as "no exit code" would compare a measurement the kit
  // imposed to a status the target chose.
  test.each([
    ["a chosen status", { exitCode: 2 }, "exit 2"],
    ["a deadline", { exitCode: null, timedOut: true }, "timed out"],
    ["the output ceiling", { exitCode: null, truncated: true }, "truncated at the output ceiling"],
    ["a fault", { exitCode: null, signal: "SIGSEGV", crashed: true }, "killed by SIGSEGV"],
    ["a spawn failure", { exitCode: null, spawnFailed: true }, "never started"],
    ["nothing legible", { exitCode: null }, "ended without an exit code"],
  ])("%s reads as %o", (_label, fields, expected) => {
    expect(endingOf(observation("p1", fields))).toBe(expected);
  });

  test("timing out outranks a truncation, and both outrank a bare null", () => {
    // Order matters because a run can set more than one flag: the ceiling kill also leaves no
    // exit code, and reporting the weaker cause would hide why the target never answered.
    expect(endingOf(observation("p1", { exitCode: null, timedOut: true, truncated: true }))).toBe(
      "timed out",
    );
  });
});

describe("where the bytes went", () => {
  const cases: Array<[Partial<ReportedObservation>, Placement]> = [
    [{ stdoutBytes: 10 }, "stdout"],
    [{ stderrBytes: 10 }, "stderr"],
    [{ stdoutBytes: 10, stderrBytes: 10 }, "both"],
    [{}, "neither"],
  ];
  test.each(cases)("%o is %s", (fields, expected) => {
    expect(placementOf(observation("p1", fields))).toBe(expected);
  });
});

describe("the document", () => {
  test("names every target, its argv0 and the config frame its run was reached in", () => {
    const c = compareReports([EXIT_2, EXIT_1]);
    expect(c.targets).toEqual([
      {
        label: "seven",
        target: "/tmp/seven",
        targetArgv0: ["bun", "/tmp/seven"],
        kitVersion: "0.1.0",
        configOrigin: "none",
      },
      {
        label: "one",
        target: "/tmp/one",
        targetArgv0: ["bun", "/tmp/one"],
        kitVersion: "0.1.0",
        configOrigin: "none",
      },
    ]);
  });

  // Two kit versions means two instruments as well as two tools, and nothing else in the
  // document would show it.
  test("collects the kit versions that produced the inputs", () => {
    const c = compareReports([EXIT_2, report("old", EXIT_1.report.observations, "0.0.9")]);
    expect(c.kitVersions).toEqual(["0.0.9", "0.1.0"]);
  });

  // The thing this surface must never grow. Stated as a test rather than as a comment because
  // the pressure to add one — a count, a percentage, a boolean — arrives with the first person
  // who wants to gate CI on it.
  test("carries no verdict of any kind", () => {
    const c = compareReports([EXIT_2, EXIT_1]);
    const keys = Object.keys(c).concat(Object.keys(c.counts));
    for (const forbidden of ["conformant", "fullyVerified", "verdict", "pass", "fail"]) {
      expect(keys).not.toContain(forbidden);
    }
  });
});
