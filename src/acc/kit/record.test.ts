import { describe, expect, test } from "bun:test";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { record, TargetNotExecutableError } from "./record.ts";
import type { Checker, Finding, History, Invocation, TargetInfo } from "./types.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const CONFORMING: TargetInfo = {
  path: join(HERE, "fixtures/conforming.ts"),
  argv0: ["bun", join(HERE, "fixtures/conforming.ts")],
};

const helpProbe: Invocation = {
  args: ["--help"],
  inertness: "help-path",
  purpose: "shared help probe",
};

function stubChecker(ruleId: string, probes: Invocation[]): Checker {
  return {
    ruleId,
    rulePath: `docs/wiki/rules/stub/${ruleId}.md`,
    tier: "core",
    probeLevel: "L0",
    // Irrelevant to recording — this file is about dedup and history construction, and nothing
    // downstream of `record()` reads coverage. Declared `complete` so a stub can never be
    // mistaken for a statement about a real rule's gaps.
    coverage: "complete",
    coverageGaps: [],
    probes: () => probes,
    check: (h: History): Finding => ({
      ruleId,
      verdict: "pass",
      detail: `${h.observations.length} observations`,
      evidence: [],
    }),
  };
}

describe("record", () => {
  test("runs each distinct invocation exactly once, even across checkers", async () => {
    const h = await record(CONFORMING, [
      stubChecker("X1", [helpProbe]),
      stubChecker("X2", [helpProbe]), // same probe — must not run twice
    ]);
    const helpRuns = h.observations.filter((o) => o.invocation.args.join(" ") === "--help");
    expect(helpRuns).toHaveLength(1);
  });

  test("indexes observations by invocation id", async () => {
    const h = await record(CONFORMING, [stubChecker("X1", [helpProbe])]);
    for (const o of h.observations) expect(h.byId.get(o.id)).toBe(o);
  });

  test("passes discovery to each checker's probe builder", async () => {
    let seenSubcommands: string[] = [];
    const spy: Checker = {
      ...stubChecker("X1", []),
      probes: (d) => {
        seenSubcommands = d.subcommands;
        return [];
      },
    };
    await record(CONFORMING, [spy]);
    expect(seenSubcommands).toContain("list");
  });

  // The failure this closes: a text file containing `hello` used to record twelve ordinary
  // observations with exit 127 and empty streams, and eight core checkers passed it. A target
  // that cannot execute is a bad invocation, not a conformance question.
  test("a target that cannot be executed aborts the run instead of producing a history", async () => {
    const notABinary = join(HERE, "fixtures/conforming.ts"); // real file, but no exec bit
    await expect(
      record({ path: notABinary, argv0: [notABinary] }, [stubChecker("X1", [helpProbe])]),
    ).rejects.toBeInstanceOf(TargetNotExecutableError);
  });

  // The EXEC-BIT-SET half of the same failure, which the EACCES test above never reached: a file
  // the kernel agrees to try and then refuses (no shebang, or a wrong-architecture binary — the
  // case the not-executable hint tells the caller to check) fails with ENOEXEC, and `spawn()`
  // reports that by THROWING SYNCHRONOUSLY. `child.on("error")` never runs, so `spawnFailed` was
  // never set and this whole abort path was bypassed: the run surfaced as an `internal` error
  // instead of the not-executable one, for a whole family of unexecutable targets.
  test("a synchronous spawn failure (ENOEXEC) aborts the run like an async one", async () => {
    const dir = mkdtempSync(join(tmpdir(), "acc-noexec-"));
    const notABinary = join(dir, "hello");
    writeFileSync(notABinary, "hello\n");
    chmodSync(notABinary, 0o755);
    try {
      await expect(
        record({ path: notABinary, argv0: [notABinary] }, [stubChecker("X1", [helpProbe])]),
      ).rejects.toBeInstanceOf(TargetNotExecutableError);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("the abort names the target and the probe that could not be spawned", async () => {
    const notABinary = join(HERE, "fixtures/conforming.ts");
    await expect(
      record({ path: notABinary, argv0: [notABinary] }, [stubChecker("X1", [helpProbe])]),
    ).rejects.toThrow(/could not be executed/i);
  });

  test("a checker requesting a non-inert probe fails the RUN, not silently", async () => {
    const rogue = stubChecker("X9", [
      { args: ["list", "--help"], inertness: "help-path", purpose: "mislabelled" },
    ]);
    await expect(record(CONFORMING, [rogue])).rejects.toThrow(/not inert/i);
  });

  // The brief's dedup test above reuses one shared `helpProbe` object, so it would pass even if
  // the dedup logic kept only the FIRST invocation (and its single purpose) per id — it never
  // exercises two DIFFERENT purpose strings colliding on the same id. That collision is exactly
  // what happens in the real checker set: several rules independently request plain `--help`
  // with their own purpose text. If dedup silently drops all but the first requester's purpose,
  // every other checker looks for a purpose that isn't there and reports `unverified` forever.
  test("two checkers requesting the same invocation with different purposes both survive", async () => {
    const invA: Invocation = { args: ["--help"], inertness: "help-path", purpose: "C1: --help" };
    const invB: Invocation = {
      args: ["--help"],
      inertness: "help-path",
      purpose: "B2: help must be escape-free",
    };
    const h = await record(CONFORMING, [stubChecker("C1", [invA]), stubChecker("B2", [invB])]);
    const helpRuns = h.observations.filter((o) => o.invocation.args.join(" ") === "--help");
    expect(helpRuns).toHaveLength(1);
    expect(helpRuns[0]?.purposes).toContain("C1: --help");
    expect(helpRuns[0]?.purposes).toContain("B2: help must be escape-free");
  });
});
