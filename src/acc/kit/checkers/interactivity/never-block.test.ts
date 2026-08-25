import { describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { record } from "../../record.ts";
import type { History, TargetInfo } from "../../types.ts";
import { neverBlockChecker } from "./never-block.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (rel: string): TargetInfo => {
  const p = join(HERE, "../../fixtures", rel);
  return { path: p, argv0: ["bun", p] };
};

describe("E1 — never block on input without a TTY", () => {
  test("PASSES the conforming fixture", async () => {
    const h = await record(fixture("conforming.ts"), [neverBlockChecker]);
    const f = neverBlockChecker.check(h);
    expect(f.verdict).toBe("pass");
    expect(f.ruleId).toBe("E1");
  });

  // The negative control genuinely hangs — it awaits a promise that never resolves — because
  // that is the only way to prove the runner's deadline is actually enforced, not just assumed.
  // Three of E1's four probes (bare, bad flag, bad verb) trip the hang; only --help returns
  // fast. THE FIXTURE STILL HANGS FOREVER, and must: do not "fix" this by shortening the
  // fixture's hang or making it exit on its own, which would stop testing deadline enforcement
  // at all — a target that terminates by itself proves nothing about a deadline.
  //
  // What IS shortened is the DEADLINE, passed here as `record()`'s last argument. Against a
  // target that never terminates, "the runner killed it" is the same claim at one second as at
  // ten: only the runner can end this probe, so the assertion still fails if the deadline stops
  // being enforced. The default stays 10s for every real run (DEFAULT_TIMEOUT_MS in runner.ts)
  // — a real binary may legitimately be slow, and 1s there would report slowness as a hang.
  // Three hung probes at the default cost ~30s of wall clock; at 1s they cost ~3.
  //
  // The explicit test timeout below is the backstop, not the assertion. If the runner ever stops
  // killing on the deadline, nothing else can end these probes, so this test goes red by hitting
  // that timeout — which is the correct outcome and the reason it must stay well above 3x the
  // deadline (a margin for a loaded machine) but nowhere near forever.
  const HANG_DEADLINE_MS = 1_000;
  test("FAILS, rather than hanging forever, when the target blocks on stdin", async () => {
    const h = await record(
      fixture("broken/hangs-waiting-for-input.ts"),
      [neverBlockChecker],
      false,
      new Set<string>(),
      HANG_DEADLINE_MS,
    );
    const f = neverBlockChecker.check(h);
    expect(f.verdict).toBe("fail");
    expect(f.detail).toContain("never terminated");
    expect(f.ruleId).toBe("E1");
  }, 20_000);

  test("reports unverified when probes were not recorded", () => {
    const h: History = {
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
    const f = neverBlockChecker.check(h);
    expect(f.verdict).toBe("unverified");
  });

  test("cites the observations backing its verdict", async () => {
    const h = await record(fixture("conforming.ts"), [neverBlockChecker]);
    const f = neverBlockChecker.check(h);
    expect(f.evidence.length).toBeGreaterThan(0);
    for (const id of f.evidence) expect(h.byId.has(id)).toBe(true);
  });
});
