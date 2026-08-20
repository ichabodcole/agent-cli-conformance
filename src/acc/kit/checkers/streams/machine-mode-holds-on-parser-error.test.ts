import { describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { record } from "../../record.ts";
import { digestOfText } from "../../runner.ts";
import type { History, TargetInfo } from "../../types.ts";
import { machineModeHoldsOnParserErrorChecker } from "./machine-mode-holds-on-parser-error.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (rel: string): TargetInfo => {
  const p = join(HERE, "../../fixtures", rel);
  return { path: p, argv0: ["bun", p] };
};

const PURPOSE = "B5: a parser error under --json must still be a machine document";

/** One recorded probe, with the three fields the verdict reads and nothing else varying. */
function historyWith(exitCode: number | null, stdout: string, stderr: string): History {
  const observations = [
    {
      id: "probe",
      invocation: {
        args: ["--acc-probe-xyzzy-flag", "--json"],
        inertness: "sentinel" as const,
        purpose: PURPOSE,
      },
      purposes: [PURPOSE],
      stdout,
      stderr,
      stdoutBytes: stdout.length,
      stderrBytes: stderr.length,
      stdoutDigest: digestOfText(stdout),
      stderrDigest: digestOfText(stderr),
      stdoutLossy: false,
      stderrLossy: false,
      truncated: false,
      exitCode,
      signal: null,
      crashed: false,
      timedOut: false,
      spawnFailed: false,
      durationMs: 5,
      timeToFirstByteMs: 1,
    },
  ];
  return {
    target: { path: "x", argv0: ["x"] },
    discovery: {
      subcommands: [],
      flags: ["--json"],
      machineModeFlag: "--json",
      machineModeDefault: false,
      valueSets: {},
      helpReadable: true,
    },
    observations,
    byId: new Map(observations.map((o) => [o.id, o])),
  };
}

describe("B5 — machine mode holds on the parser-error path", () => {
  test("PASSES the conforming fixture", async () => {
    const h = await record(fixture("conforming.ts"), [machineModeHoldsOnParserErrorChecker]);
    const f = machineModeHoldsOnParserErrorChecker.check(h);
    expect(f.verdict).toBe("pass");
    expect(f.ruleId).toBe("B5");
  });

  // The negative control: machine mode is real on every path except this one. `--help --json`
  // returns a document, so the mode is not missing — it simply does not survive the parser.
  test("FAILS a CLI whose parser error is a usage block under --json", async () => {
    const h = await record(fixture("broken/machine-mode-drops-on-parser-error.ts"), [
      machineModeHoldsOnParserErrorChecker,
    ]);
    const f = machineModeHoldsOnParserErrorChecker.check(h);
    expect(f.verdict).toBe("fail");
    expect(f.detail).toContain("prose");
    expect(f.ruleId).toBe("B5");
  });

  test("reports unverified when help advertises no machine-mode flag", async () => {
    const h = await record(fixture("no-machine-mode.ts"), [machineModeHoldsOnParserErrorChecker]);
    const f = machineModeHoldsOnParserErrorChecker.check(h);
    expect(f.verdict).toBe("unverified");
    expect(f.detail).toContain("no machine mode this probe can reach");
  });

  // THE DECLARED-DEFAULT PATH. A machine-first CLI has no selector to send, and until it could
  // be declared this rule reported `unverified` on exactly the targets whose envelope matters
  // most. Reported by the first outside adopter (EXT-4).
  test("PASSES a machine-first fixture when machine mode is declared the default", async () => {
    const h = await record(
      fixture("machine-first.ts"),
      [machineModeHoldsOnParserErrorChecker],
      true,
    );
    const f = machineModeHoldsOnParserErrorChecker.check(h);
    expect(f.verdict).toBe("pass");
    expect(f.ruleId).toBe("B5");
  });

  // ...and the same fixture WITHOUT the declaration is the before-picture: nothing to select, so
  // nothing established. This is the pair that shows the declaration is what changed the verdict,
  // not the fixture.
  test("reports unverified on the same fixture when nothing is declared", async () => {
    const h = await record(fixture("machine-first.ts"), [machineModeHoldsOnParserErrorChecker]);
    const f = machineModeHoldsOnParserErrorChecker.check(h);
    expect(f.verdict).toBe("unverified");
  });

  // FALSIFIABILITY, which is the whole reason this is a declaration rather than an inference.
  // A target that claims machine mode by default and answers a parser error in prose must FAIL.
  // If this passed, the declaration would be a comment that lies — the exact thing the roadmap
  // argues L1 exists to prevent.
  //
  // `no-machine-mode.ts` is NOT the fixture for this, and finding that out was worth the detour:
  // it has no machine-mode FLAG but its errors are already JSON envelopes, so under a declared
  // default it passes — correctly. `broken/no-version-flag.ts` answers in prose, which is the
  // shape a false declaration actually has.
  test("FAILS a target that declares the default and answers in prose", async () => {
    const h = await record(
      fixture("broken/no-version-flag.ts"),
      [machineModeHoldsOnParserErrorChecker],
      true,
    );
    const f = machineModeHoldsOnParserErrorChecker.check(h);
    expect(f.verdict).toBe("fail");
  });

  // The declared probe is byte-identical to A1's unknown-flag probe, so the recorder dedups them
  // and the declaration costs no extra spawn. If this drifts, a machine-first target pays for a
  // second execution to learn what one observation already held.
  test("the declared-default probe sends no selector", () => {
    const [probe] = machineModeHoldsOnParserErrorChecker.probes({
      subcommands: [],
      flags: [],
      machineModeFlag: null,
      machineModeDefault: true,
      valueSets: {},
      helpReadable: true,
    });
    expect(probe?.args).toEqual(["--acc-probe-xyzzy-flag"]);
  });

  test("declares no probe when no selectable machine mode was discovered", () => {
    for (const machineModeFlag of [null, "--output"]) {
      expect(
        machineModeHoldsOnParserErrorChecker.probes({
          subcommands: ["list"],
          flags: ["--output"],
          machineModeFlag,
          machineModeDefault: false,
          valueSets: {},
          helpReadable: true,
        }),
      ).toEqual([]);
    }
  });

  // `--format` takes a value, so it is sent attached — the spelling inert.ts already whitelists.
  test("selects --format=json when --format is the advertised machine-mode flag", () => {
    const [probe] = machineModeHoldsOnParserErrorChecker.probes({
      subcommands: [],
      flags: ["--format"],
      machineModeFlag: "--format",
      machineModeDefault: false,
      valueSets: {},
      helpReadable: true,
    });
    expect(probe?.args).toEqual(["--acc-probe-xyzzy-flag", "--format=json"]);
  });

  // THE PRECONDITION. This rule governs how a FAILURE is reported; a target that exited 0
  // accepted the unknown flag and reported no failure at all. Convicting it here would report
  // A1's defect a second time under a rule whose subject never occurred.
  test("reports unverified when the invocation did not fail at all", () => {
    const f = machineModeHoldsOnParserErrorChecker.check(historyWith(0, "did the thing\n", ""));
    expect(f.verdict).toBe("unverified");
    expect(f.detail).toContain("exited 0");
  });

  // Stream-agnostic on purpose: this rule owns the SHAPE of the answer and B1 owns which stream
  // may carry it. A target answering with a valid envelope on stdout passes here and fails B1 —
  // one defect reported once by each rule that governs half of it.
  test("PASSES an envelope that arrives on stdout, leaving the stream question to B1", () => {
    const f = machineModeHoldsOnParserErrorChecker.check(
      historyWith(2, `${JSON.stringify({ ok: false, error: { message: "x" } })}\n`, ""),
    );
    expect(f.verdict).toBe("pass");
    expect(f.detail).toContain("stdout");
  });

  test("FAILS when the failure is reported with nothing on either stream", () => {
    const f = machineModeHoldsOnParserErrorChecker.check(historyWith(2, "", ""));
    expect(f.verdict).toBe("fail");
    expect(f.detail).toContain("nothing on either stream");
  });

  // Same softening as B3, and for the same reason: nothing was declared, so NDJSON is a
  // plausible design rather than a violation of a contract nobody was asked to state.
  test("reports unverified when the answer is NDJSON rather than one document", () => {
    const f = machineModeHoldsOnParserErrorChecker.check(
      historyWith(2, "", '{"ok":false}\n{"hint":"try --help"}\n'),
    );
    expect(f.verdict).toBe("unverified");
    expect(f.detail).toContain("NDJSON");
  });

  test("cites the observations backing its verdict", async () => {
    const h = await record(fixture("conforming.ts"), [machineModeHoldsOnParserErrorChecker]);
    const f = machineModeHoldsOnParserErrorChecker.check(h);
    expect(f.evidence.length).toBeGreaterThan(0);
    for (const id of f.evidence) expect(h.byId.has(id)).toBe(true);
  });
});
