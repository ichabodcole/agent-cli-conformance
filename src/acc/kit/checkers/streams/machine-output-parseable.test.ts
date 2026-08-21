import { describe, expect, test } from "bun:test";
import { machineOutputParseableChecker } from "./machine-output-parseable.ts";

const DISCOVERY = {
  subcommands: ["list"],
  flags: ["--json", "--help"],
  machineModeFlag: "--json" as const,
  machineModeDefault: false,
  valueSets: {},
  helpReadable: true,
};

const emptyHistory = (machineModeDefault: boolean) => ({
  target: { path: "x", argv0: ["x"] },
  discovery: { ...DISCOVERY, machineModeDefault },
  observations: [],
  waived: new Set<string>(),
  byId: new Map(),
});

// B3 moved to `L1`, and that is a probe-level fact rather than a demotion. Its subject is the
// output of a DATA command; choosing one means knowing it is side-effect-free, and nothing at L0
// knows that. `--help <selector>` stood in for it on the strength of a flag matched from help by
// SPELLING — an inference this catalogue spent seven attempts failing to make safe, each one
// breaking on a population nobody had enumerated. The stand-in is gone; the rule waits for a
// declaration that names a command it may run.
describe("B3 — machine output parses as its declared kind", () => {
  // DEFENDS B3-E1 — this rule is L1 and reports not-applicable until a declaration names a command whose output it may read
  test("is an L1 rule and sends no probes", () => {
    expect(machineOutputParseableChecker.probeLevel).toBe("L1");
    expect(machineOutputParseableChecker.probes(DISCOVERY)).toEqual([]);
  });

  test("says a declaration does not by itself reach a data command", () => {
    const f = machineOutputParseableChecker.check(emptyHistory(true));
    expect(f.verdict).toBe("unverified");
    expect(f.ruleId).toBe("B3");
    expect(f.detail).toContain("side-effect-free");
  });

  // The message a caller of an undeclared target reads, and it names the remedy rather than
  // reporting an absence: advertising `--json` never established anything, and saying so is the
  // whole point of the boundary.
  test("points an undeclared target at the declaration", () => {
    const f = machineOutputParseableChecker.check(emptyHistory(false));
    expect(f.verdict).toBe("unverified");
    expect(f.detail).toContain("DECLARED");
    expect(f.detail).toContain("acc.config.json");
  });
});
