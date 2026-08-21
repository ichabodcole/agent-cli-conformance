import { describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { record } from "../../record.ts";
import type { TargetInfo } from "../../types.ts";
import { doubleDashTerminatorChecker } from "./double-dash-terminator.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * A6 is the one rule in the catalogue that cannot be exercised against a `.ts` fixture at all.
 *
 * Its probe leads with a bare `--`, and Bun consumes exactly one such token immediately after
 * the script path before the script sees `process.argv` — confirmed by direct experiment, and
 * true of `bun <script>`, `bun run <script>`, `bun --bun <script>` and `bun -- <script>`
 * alike. This test file used to work around it by appending a placeholder `--` to `argv0` so
 * Bun would eat that one instead. That kept the TEST honest while the PRODUCT measured A1
 * dressed as A6 for every `.ts` target — including `acc` itself, whose real answer is the
 * opposite of the one it reported.
 *
 * The checker now refuses to guess: any target launched through `bun` is `unverified`. So the
 * fixtures here are POSIX shell, which passes a script's arguments through untouched.
 */
const shFixture = (rel: string): TargetInfo => {
  const p = join(HERE, "../../fixtures/sh", rel);
  return { path: p, argv0: ["sh", p] };
};

const bunFixture = (rel: string): TargetInfo => {
  const p = join(HERE, "../../fixtures", rel);
  return { path: p, argv0: ["bun", p] };
};

describe("A6 — the `--` terminator", () => {
  test("PASSES a CLI that honours `--`", async () => {
    const h = await record(shFixture("honours-double-dash.sh"), [doubleDashTerminatorChecker]);
    const f = doubleDashTerminatorChecker.check(h);
    expect(f.verdict).toBe("pass");
    expect(f.ruleId).toBe("A6");
  });

  // The negative control: a CLI that never honours `--` at all keeps scanning tokens after it
  // for flag shapes, so `-- --<sentinel>-value` is rejected as an unknown option.
  test("FAILS a CLI that ignores `--`", async () => {
    const h = await record(shFixture("ignores-double-dash.sh"), [doubleDashTerminatorChecker]);
    const f = doubleDashTerminatorChecker.check(h);
    expect(f.verdict).toBe("fail");
    expect(f.detail).toContain("still parsed as an option");
  });

  // The regression this rule's rewrite exists for. Both fixtures below are `.ts`, and they
  // disagree about `--` — conforming.ts honours it, ignores-double-dash.ts does not — so a
  // checker that still believed the probe was delivered would return two different verdicts
  // here. Through Bun neither ever receives the terminator, so the only honest answer is the
  // same one for both.
  test.each(["conforming.ts", "broken/ignores-double-dash.ts"])(
    "reports unverified for %s, because bun swallows the probe's `--`",
    async (rel) => {
      const h = await record(bunFixture(rel), [doubleDashTerminatorChecker]);
      const f = doubleDashTerminatorChecker.check(h);
      expect(f.verdict).toBe("unverified");
      expect(f.detail).toContain("bun");
    },
  );

  test("cites the observations backing its verdict", async () => {
    const h = await record(shFixture("honours-double-dash.sh"), [doubleDashTerminatorChecker]);
    const f = doubleDashTerminatorChecker.check(h);
    expect(f.evidence.length).toBeGreaterThan(0);
    for (const id of f.evidence) expect(h.byId.has(id)).toBe(true);
  });

  test("reports unverified when no probe was recorded", () => {
    const empty = {
      target: { path: "x", argv0: ["x"] },
      discovery: {
        subcommands: [],
        flags: [],
        machineModeFlag: null,
        machineModeDefault: false,
        machineModeSource: null,
        valueSets: {},
        helpReadable: false,
      },
      observations: [],
      waived: new Set<string>(),
      byId: new Map(),
    };
    expect(doubleDashTerminatorChecker.check(empty).verdict).toBe("unverified");
  });
});
