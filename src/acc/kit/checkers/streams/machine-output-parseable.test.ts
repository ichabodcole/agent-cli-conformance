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
  // The declared-default branch. B3 cannot reach a machine-first target at L0 — reading a DATA
  // command's output means choosing one to run, which needs to know it is side-effect-free — so
  // the verdict is unchanged. What changed is the reason: it used to say no machine mode was
  // advertised, which is untrue of a target that declared one. An independent review found this
  // branch had no test at all.
  test("says why it cannot reach a target that declared machine mode its default", async () => {
    const h = await record(fixture("machine-first.ts"), [machineOutputParseableChecker], true);
    const f = machineOutputParseableChecker.check(h);
    expect(f.verdict).toBe("unverified");
    expect(f.detail).toContain("declared the default");
    expect(f.detail).not.toContain("advertised");
  });

  test("PASSES the conforming fixture", async () => {
    const h = await record(fixture("conforming.ts"), [machineOutputParseableChecker]);
    const f = machineOutputParseableChecker.check(h);
    expect(f.verdict).toBe("pass");
    expect(f.ruleId).toBe("B3");
  });

  // The negative control: advertises --json in help (so a machine-mode flag is discovered),
  // but `--help --json` still returns the plain-text usage screen instead of a JSON document.
  // The fail control, and the selector has to be established before the fail is earned. This
  // target answers its parser error under --json with a document and its help under --json in
  // prose: the flag demonstrably governs output shape, and B3's path is one it does not reach.
  test("FAILS a CLI whose machine mode reaches the error path but not help", async () => {
    const h = await record(fixture("broken/machine-mode-only-on-the-error-path.ts"), [
      machineOutputParseableChecker,
    ]);
    const f = machineOutputParseableChecker.check(h);
    expect(f.verdict).toBe("fail");
    expect(f.detail).toContain("neither one JSON document nor NDJSON");
  });

  // The same shape WITHOUT that evidence. This fixture advertises `--json Machine-readable
  // output` and then answers identically with and without it, everywhere — which is exactly what
  // a CLI whose `--json` names an input file looks like from outside. Advertising a mode that
  // does nothing is a real defect and no L0 rule can reach it; reporting `fail` here is the false
  // positive that failed three correct human-first CLIs on core rules.
  test("reports unverified when the advertised flag changes nothing anywhere", async () => {
    const h = await record(fixture("broken/machine-mode-help-not-json.ts"), [
      machineOutputParseableChecker,
    ]);
    const f = machineOutputParseableChecker.check(h);
    expect(f.verdict).toBe("unverified");
    expect(f.detail).toContain("did not change what any probe came back with");
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
      machineModeDefault: false,
      valueSets: {},
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
