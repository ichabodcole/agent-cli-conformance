import { describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { record } from "../../record.ts";
import type { TargetInfo } from "../../types.ts";
import { doubleDashTerminatorChecker } from "./double-dash-terminator.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * A6's probe leads with a bare `--`, and Bun consumes exactly one such token immediately after
 * the script path before the script sees `process.argv` — confirmed by direct experiment, and
 * true of `bun <script>`, `bun run <script>`, `bun --bun <script>` and `bun -- <script>`
 * alike. That used to leave the checker with nothing honest to report against a `.ts` fixture:
 * either measure A1 dressed as A6 (the pre-regression bug) or refuse with `unverified`.
 *
 * The runner (`runner.ts`) now compensates at the spawn by prepending the `--` Bun eats, so the
 * target receives the same argv a native target receives and this checker needs no launcher
 * knowledge at all. The `sh` fixtures below stay as the non-bun control; `bunFixture` exercises
 * the launcher case directly.
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

  // A6 through a bun launcher was `unverified` for the whole bun population — permanently, for a
  // house whose every CLI is a bun script. The launch compensation (runner.ts) makes it
  // measurable: the runner now prepends the `--` bun eats, so this checker needs no launcher
  // knowledge at all and can return a real verdict.
  test("a bun-launched target gets a real A6 verdict", async () => {
    const target = bunFixture("conforming.ts");
    expect(target.argv0[0]).toBe("bun"); // the case that used to short-circuit

    const h = await record(target, [doubleDashTerminatorChecker]);
    const f = doubleDashTerminatorChecker.check(h);

    expect(f.verdict).not.toBe("unverified");
    expect(f.evidence.length).toBeGreaterThan(0);
  });

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
