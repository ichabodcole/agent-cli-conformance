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

const PURPOSE = "B5 via --json: a parser error must still be a machine document";

/** One recorded probe, with the three fields the verdict reads and nothing else varying. */
/**
 * One synthetic observation. `id` doubles as the recording key, so two of these can coexist.
 */
function observation(
  id: string,
  args: string[],
  purpose: string,
  exitCode: number | null,
  stdout: string,
  stderr: string,
) {
  return {
    id,
    invocation: { args, inertness: "sentinel" as const, purpose },
    purposes: [purpose],
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
  };
}

/**
 * A CORROBORATING recording, and every case below needs one.
 *
 * B5 condemns a target for answering in prose while in machine mode, so it first requires that
 * the flag was shown to select one — `--json` is matched out of help by spelling, and
 * `--json <file>   Treat the input file as JSON` is an ordinary help entry belonging to a
 * text-only CLI. Without this observation every case here would describe a target whose machine
 * mode was never established, and would correctly report that instead of whatever it is testing.
 */
const CORROBORATING = observation(
  "corroborate",
  ["--help", "--json"],
  "corroboration: does --json select a machine mode on the help path",
  0,
  '{"ok":true,"data":{"usage":"x"}}\n',
  "",
);

function historyWith(exitCode: number | null, stdout: string, stderr: string): History {
  const observations = [
    CORROBORATING,
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
    waived: new Set<string>(),
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

  // The before-picture: a target with no flag to select AND no statement in help gives this rule
  // nothing to reach, so nothing is established.
  //
  // NOT `machine-first.ts` any more. Its help says "emit JSON on stdout by default", and a
  // statement in help is now a declaration in its own right — it unlocks this probe exactly as the
  // config key does. That change is why this test had to move fixtures rather than be deleted:
  // the `unverified` branch still exists, it is just no longer reachable by a target that says so
  // out loud.
  test("reports unverified when nothing is declared and help states nothing", async () => {
    const h = await record(fixture("no-machine-mode.ts"), [machineModeHoldsOnParserErrorChecker]);
    const f = machineModeHoldsOnParserErrorChecker.check(h);
    expect(f.verdict).toBe("unverified");
  });

  // FALSIFIABILITY, which is the whole reason this is a declaration rather than an inference.
  // A target that claims machine mode by default and answers a parser error in prose must FAIL.
  // If this passed, the declaration would be a comment that lies — the exact thing the roadmap
  // argues L1 exists to prevent.
  // FALSIFIABILITY, pinned to the declared path and nothing else. The fixture advertises no
  // machine-mode flag at all, so the ONLY way the kit reaches its error path is the declaration —
  // delete the declared branch and this test cannot fail through some other route, which is what
  // an earlier version of it did.
  test("FAILS a target that declares the default and answers in prose", async () => {
    const h = await record(
      fixture("broken/declares-machine-mode-answers-prose.ts"),
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

  // A DECLARATION MUST NOT EXCUSE THE PATH IT DOES NOT COVER. A CLI that emits JSON to a pipe
  // very often also ships `--json`, and the defect B5 is named for is a format resolved only from
  // the tokens parsed before the parser stopped — bare error fine, `--json` error prose. Probing
  // only the declared path took the target's word for the half it got right.
  //
  // Found by an independent review, which built this target and watched a real FAIL become a
  // PASS on one line of config.
  test("FAILS when the declared path holds but the advertised flag does not", async () => {
    const h = await record(
      fixture("broken/machine-mode-drops-under-flag.ts"),
      [machineModeHoldsOnParserErrorChecker],
      true,
    );
    const f = machineModeHoldsOnParserErrorChecker.check(h);
    expect(f.verdict).toBe("fail");
    expect(f.detail).toContain("--json");
  });

  test("probes BOTH ways in when a target declares the default and advertises a flag", () => {
    const probes = machineModeHoldsOnParserErrorChecker.probes({
      subcommands: [],
      flags: ["--json"],
      machineModeFlag: "--json",
      machineModeDefault: true,
      valueSets: {},
      helpReadable: true,
    });
    expect(probes.map((p) => p.args)).toEqual([
      ["--acc-probe-xyzzy-flag"],
      ["--acc-probe-xyzzy-flag", "--json"],
      ["--help", "--json"],
      // The last two are corroboration. B5 condemns a target for answering a parser error in
      // prose WHILE IN machine mode, so it has to establish that `--json` puts it in one — a
      // flag whose help entry reads `--json <file>  Treat the input file as JSON` is spelled
      // like a selector and is not one. B5 asks for that evidence itself rather than reading it
      // out of another checker's recordings, which would hold here and invert under a
      // single-checker run. It takes BOTH routes because it judges neither of them; B3 and D1
      // each judge one, so each corroborates from the other.
      ["--version", "--json"],
    ]);
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
