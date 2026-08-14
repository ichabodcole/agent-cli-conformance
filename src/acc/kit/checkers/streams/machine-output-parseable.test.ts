import { describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { record } from "../../record.ts";
import type { TargetInfo } from "../../types.ts";
import { machineOutputParseableChecker } from "./machine-output-parseable.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (rel: string): TargetInfo => {
  const p = join(HERE, "../../fixtures", rel);
  return { path: p, argv0: ["bun", p] };
};

describe("B3 — machine output parses as its declared kind", () => {
  test("PASSES the conforming fixture", async () => {
    const h = await record(fixture("conforming.ts"), [machineOutputParseableChecker]);
    const f = machineOutputParseableChecker.check(h);
    expect(f.verdict).toBe("pass");
    expect(f.ruleId).toBe("B3");
  });

  // The negative control: advertises --json in help (so a machine-mode flag is discovered),
  // but `--help --json` still returns the plain-text usage screen instead of a JSON document.
  test("FAILS a CLI whose machine-mode help is not JSON", async () => {
    const h = await record(fixture("broken/machine-mode-help-not-json.ts"), [
      machineOutputParseableChecker,
    ]);
    const f = machineOutputParseableChecker.check(h);
    expect(f.verdict).toBe("fail");
    expect(f.detail).toContain("neither one JSON document nor NDJSON");
  });

  // Correction (3): this fixture's help advertises no --json/--format/--output, so discovery
  // finds machineModeFlag: null and there is nothing for B3 to probe or parse.
  test("reports unverified when no machine-mode flag was discovered", async () => {
    const h = await record(fixture("no-machine-mode.ts"), [machineOutputParseableChecker]);
    const f = machineOutputParseableChecker.check(h);
    expect(f.verdict).toBe("unverified");
    expect(h.discovery.machineModeFlag).toBeNull();
  });

  test("declares no probes when no machine-mode flag was discovered", () => {
    const probes = machineOutputParseableChecker.probes({
      subcommands: ["list"],
      flags: ["--help"],
      machineModeFlag: null,
      helpReadable: true,
    });
    expect(probes).toEqual([]);
  });

  test("cites the observations backing its verdict", async () => {
    const h = await record(fixture("conforming.ts"), [machineOutputParseableChecker]);
    const f = machineOutputParseableChecker.check(h);
    expect(f.evidence.length).toBeGreaterThan(0);
    for (const id of f.evidence) expect(h.byId.has(id)).toBe(true);
  });
});
