import { describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { record } from "../../record.ts";
import type { TargetInfo } from "../../types.ts";
import { doubleDashTerminatorChecker } from "./double-dash-terminator.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * A6's probe leads with a bare `--` (see `double-dash-terminator.ts`), which is correct for a
 * real target binary — the OS delivers argv to a spawned process unmodified.
 *
 * Our own fixtures are `.ts` files interpreted BY Bun, though, and Bun's own CLI silently
 * consumes exactly one leading `--` immediately after the script path before the script ever
 * sees `process.argv` — confirmed by direct experiment (`bun script.ts -- --x` delivers
 * `process.argv.slice(2)` as `["--x"]`, not `["--", "--x"]`; true with a shebang, with
 * `bun run`, and independent of any other flags). That is a property of how Bun launches
 * scripts, not a bug in the checker or in `runProbe`/`record` — it would equally strip the
 * leading `--` from a real Bun-authored CLI probed the same way, but never applies to the
 * compiled or non-Bun-interpreted binaries this kit is built to target.
 *
 * The fix stays local to this test file: append one extra placeholder `--` to `argv0`. Bun
 * consumes THAT one (it is what's immediately after the script path), which leaves the
 * checker's own `--` intact for the fixture to see — restoring the exact argv the checker
 * declared, without touching the checker itself or the plain `fixture()` shape every other
 * checker's test uses (their probes don't start with `--`, so they never hit this).
 */
const fixture = (rel: string): TargetInfo => {
  const p = join(HERE, "../../fixtures", rel);
  return { path: p, argv0: ["bun", p, "--"] };
};

describe("A6 — the `--` terminator", () => {
  test("PASSES the conforming fixture", async () => {
    const h = await record(fixture("conforming.ts"), [doubleDashTerminatorChecker]);
    const f = doubleDashTerminatorChecker.check(h);
    expect(f.verdict).toBe("pass");
    expect(f.ruleId).toBe("A6");
  });

  // The negative control: a CLI that never honours `--` at all keeps scanning tokens after it
  // for flag shapes, so `-- --<sentinel>-value` is rejected as an unknown option.
  test("FAILS a CLI that ignores `--`", async () => {
    const h = await record(fixture("broken/ignores-double-dash.ts"), [doubleDashTerminatorChecker]);
    const f = doubleDashTerminatorChecker.check(h);
    expect(f.verdict).toBe("fail");
    expect(f.detail).toContain("still parsed as an option");
  });

  test("cites the observations backing its verdict", async () => {
    const h = await record(fixture("conforming.ts"), [doubleDashTerminatorChecker]);
    const f = doubleDashTerminatorChecker.check(h);
    expect(f.evidence.length).toBeGreaterThan(0);
    for (const id of f.evidence) expect(h.byId.has(id)).toBe(true);
  });

  test("reports unverified when no probe was recorded", () => {
    const empty = {
      target: { path: "x", argv0: ["x"] },
      discovery: { subcommands: [], flags: [], machineModeFlag: null, helpReadable: false },
      observations: [],
      byId: new Map(),
    };
    expect(doubleDashTerminatorChecker.check(empty).verdict).toBe("unverified");
  });
});
