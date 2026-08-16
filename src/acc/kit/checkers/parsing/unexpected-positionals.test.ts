import { describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { record } from "../../record.ts";
import type { TargetInfo } from "../../types.ts";
import { unexpectedPositionalsChecker } from "./unexpected-positionals.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (rel: string): TargetInfo => {
  const p = join(HERE, "../../fixtures", rel);
  return { path: p, argv0: ["bun", p] };
};

// A4 declares no probes: testing arity means invoking a real subcommand, which the safety gate
// refuses at L0 (see the checker's header comment). Both fixtures below get the identical
// `unverified` verdict — that IS its whole behaviour now, so there is no pass/fail case to
// write.
describe("A4 — arity cannot be probed at L0", () => {
  test("reports unverified against the conforming fixture", async () => {
    const h = await record(fixture("conforming.ts"), [unexpectedPositionalsChecker]);
    const f = unexpectedPositionalsChecker.check(h);
    expect(f.verdict).toBe("unverified");
    expect(f.ruleId).toBe("A4");
  });

  test("reports unverified against a fixture that accepts any positionals", async () => {
    const h = await record(fixture("broken/accepts-extra-positionals.ts"), [
      unexpectedPositionalsChecker,
    ]);
    const f = unexpectedPositionalsChecker.check(h);
    expect(f.verdict).toBe("unverified");
  });

  test("declares no probes, regardless of discovery", () => {
    const probes = unexpectedPositionalsChecker.probes({
      subcommands: ["list"],
      flags: ["--json"],
      machineModeFlag: "--json",
      valueSets: {},
      helpReadable: true,
    });
    expect(probes).toEqual([]);
  });
});
