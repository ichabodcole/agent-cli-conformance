import { describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { record } from "../../record.ts";
import { digestOfText } from "../../runner.ts";
import type { History, TargetInfo } from "../../types.ts";
import { advertisesMachineModeChecker } from "./advertises-machine-mode.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (rel: string): TargetInfo => {
  const p = join(HERE, "../../fixtures", rel);
  return { path: p, argv0: ["bun", p] };
};

/** One recorded probe. Built by hand rather than as fixtures: the question in this file is
 *  what shape of help TEXT counts, and six near-identical CLIs varying one line would bury it. */
function observation(id: string, args: string[], purpose: string, text: string, exitCode = 0) {
  return {
    id,
    invocation: { args, inertness: "help-path" as const, purpose },
    purposes: [purpose],
    stdout: text,
    stderr: "",
    stdoutBytes: Buffer.byteLength(text),
    stderrBytes: 0,
    // Derived from the text rather than pasted, so the digest cannot drift from the stream it
    // claims to cover; `lossy` is false because `text` is a TypeScript string literal and
    // therefore round-trips through UTF-8 by construction.
    stdoutDigest: digestOfText(text),
    stderrDigest: digestOfText(""),
    stdoutLossy: false,
    stderrLossy: false,
    truncated: false,
    exitCode,
    timedOut: false,
    signal: null,
    crashed: false,
    spawnFailed: false,
    durationMs: 1,
    timeToFirstByteMs: 1,
  };
}

/**
 * A History whose help text is exactly `text` and whose discovery found no machine-mode flag,
 * so the checker's fallback scan for a `schema` command is the only thing that can pass it.
 */
function historyWithHelp(text: string, subcommands: string[] = []): History {
  const o = observation("fake-help", ["--help"], "D3: help mentions machine mode", text);
  return {
    target: { path: "x", argv0: ["x"] },
    discovery: {
      subcommands,
      flags: [],
      machineModeFlag: null,
      machineModeDefault: false,
      valueSets: {},
      helpReadable: true,
    },
    observations: [o],
    waived: new Set<string>(),
    byId: new Map([[o.id, o]]),
  };
}

/**
 * The shape the rule was blind to: a CLI whose plain `--help` becomes MACHINE output because
 * stdout is a pipe, plus whatever it answers when text is forced back on.
 *
 * `discovery` is populated from the machine document on purpose — that is what `record` does,
 * and consulting it was the bug.
 */
function historyWithAutoMachineHelp(machineHelp: string, forcedHelp: string | null): History {
  const plain = observation(
    "fake-plain",
    ["--help"],
    "D3: help mentions machine mode",
    machineHelp,
  );
  const forced = observation(
    "fake-forced",
    ["--help", "--format=text"],
    "D3: human help, with machine mode forced off",
    forcedHelp ?? "",
    forcedHelp === null ? 2 : 0,
  );
  return {
    target: { path: "x", argv0: ["x"] },
    // Exactly what discovery derives from the machine document: it names `--json`, because a
    // schema that describes a machine-mode flag necessarily contains its spelling.
    discovery: {
      subcommands: ["schema"],
      flags: ["--json", "--format"],
      machineModeFlag: "--json",
      machineModeDefault: false,
      valueSets: {},
      helpReadable: true,
    },
    observations: [plain, forced],
    waived: new Set<string>(),
    byId: new Map([
      [plain.id, plain],
      [forced.id, forced],
    ]),
  };
}

describe("D3 — help advertises the machine-readable path", () => {
  // THE RULE'S SECOND CLAUSE: discoverable from `--help`, which is the surface a caller reaches.
  // A machine-first tool has no flag to name, so saying so in help is the whole of what it owes.
  test("PASSES when help states that structured output is the default", () => {
    for (const line of [
      "Data commands emit JSON on stdout by default; pass --human for prose.",
      "Output defaults to JSON when stdout is not a terminal.",
      "The default output format is json.",
    ]) {
      const f = advertisesMachineModeChecker.check(
        historyWithHelp(`fixture — a tool\n\nUsage:\n  fixture list\n\nOutput:\n  ${line}\n`),
      );
      expect({ line, verdict: f.verdict }).toEqual({ line, verdict: "pass" });
    }
  });

  // The near-misses the pattern exists to refuse. Each contains both a format word and the word
  // "default" while meaning the opposite, and each would be a false pass on the one rule whose
  // subject is whether a caller was told the truth.
  test("does NOT read a default-to-text tool as machine-first", () => {
    for (const line of [
      "  --outfmt json    Output format (default: text)",
      "  Emit JSON with --machine.  Text is the default.",
      "Pretty tables by default; ask for machine output explicitly.",
    ]) {
      const f = advertisesMachineModeChecker.check(
        historyWithHelp(`fixture — a tool\n\nUsage:\n  fixture list\n\n${line}\n`),
      );
      expect({ line, verdict: f.verdict }).toEqual({ line, verdict: "fail" });
    }
  });

  // A DECLARATION IS NOT DISCOVERY. `acc.config.json` is ours; no caller of the target can read
  // it, and this rule's subject is what a caller can find out. Declaring lets B5 probe the right
  // path — it does not answer D3's question, and it used to.
  test("does NOT pass on the declaration alone", () => {
    const h = historyWithHelp("fixture — a tool\n\nUsage:\n  fixture list\n");
    const declared: History = { ...h, discovery: { ...h.discovery, machineModeDefault: true } };
    const f = advertisesMachineModeChecker.check(declared);
    expect(f.verdict).toBe("fail");
  });

  test("PASSES the conforming fixture", async () => {
    const h = await record(fixture("conforming.ts"), [advertisesMachineModeChecker]);
    const f = advertisesMachineModeChecker.check(h);
    expect(f.verdict).toBe("pass");
    expect(f.ruleId).toBe("D3");
  });

  // The negative control: help never mentions --json, --format, --output, or "schema" anywhere.
  // A `fail` here also disables B3, and the detail must say so — an undiscoverable feature is,
  // to this kit, indistinguishable from an absent one.
  test("FAILS, and names the B3 knock-on, when help advertises no machine-mode path", async () => {
    const h = await record(fixture("no-machine-mode.ts"), [advertisesMachineModeChecker]);
    const f = advertisesMachineModeChecker.check(h);
    expect(f.verdict).toBe("fail");
    expect(f.detail).toContain("B3");
    expect(f.ruleId).toBe("D3");
  });

  test("reports unverified when help was not readable", () => {
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
    const f = advertisesMachineModeChecker.check(h);
    expect(f.verdict).toBe("unverified");
  });

  test("cites the observations backing its verdict", async () => {
    const h = await record(fixture("conforming.ts"), [advertisesMachineModeChecker]);
    const f = advertisesMachineModeChecker.check(h);
    expect(f.evidence.length).toBeGreaterThan(0);
    for (const id of f.evidence) expect(h.byId.has(id)).toBe(true);
  });

  // The old test was `/\bschema\b/` over the whole help text, which matches the word ANYWHERE
  // — including prose that mentions a schema while advertising no machine-readable path at all.
  // A pass handed out for the word "schema" appearing in a sentence is a pass for nothing.
  describe("a `schema` COMMAND, not the word `schema`", () => {
    test.each([
      "usage: t <command>\n\nValidate input against a schema before sending it.\n",
      "usage: t <command>\n\nThe schema changed in v2; see the migration guide.\n",
      "usage: t\n\nOptions:\n  --strict  Enforce the schema.\n",
    ])("FAILS when `schema` appears only in prose: %j", (help) => {
      expect(advertisesMachineModeChecker.check(historyWithHelp(help)).verdict).toBe("fail");
    });

    test.each([
      "usage: t <command>\n\nCommands:\n  schema   Emit the interface description.\n",
      "usage: t <command>\n\nCommands:\n  schema\n",
    ])("PASSES when `schema` is a command-table row: %j", (help) => {
      const f = advertisesMachineModeChecker.check(historyWithHelp(help));
      expect(f.verdict).toBe("pass");
      expect(f.detail).toContain("schema");
    });

    // Discovery's structured parse is consulted first, so a help layout whose Commands block
    // the text scan does not recognise still passes when discovery found the verb.
    test("PASSES when discovery found a `schema` subcommand, whatever the layout", () => {
      const h = historyWithHelp("SUBCOMMANDS\n\tschema\tEmit it.\n", ["schema"]);
      expect(advertisesMachineModeChecker.check(h).verdict).toBe("pass");
    });
  });

  // The rule names the HUMAN help surface. The probe used to be plain `--help`, which the
  // runner always runs with stdout on a pipe — so a CLI that switches to machine mode when
  // piped answered with its SCHEMA, and a schema necessarily spells `--json`. D3 was therefore
  // scanning its own machine output for a string that output could not fail to contain: it
  // passed every auto-switching tool for free, including `acc` itself, whose human root help
  // named neither `--format` nor `--json` at the time.
  describe("measures human help, not the machine document it gets on a pipe", () => {
    const SCHEMA_HELP = JSON.stringify({
      ok: true,
      data: { global_args: [{ name: "--json" }, { name: "--format" }] },
    });

    test("FAILS when the machine document names --json but the human help does not", () => {
      const humanHelp = "Usage: t [command]\n\nOptions:\n  -V, --version\n  -h, --help\n";
      const f = advertisesMachineModeChecker.check(
        historyWithAutoMachineHelp(SCHEMA_HELP, humanHelp),
      );
      expect(f.verdict).toBe("fail");
      // ...and it cites the human help it actually read, not the machine document it ignored.
      expect(f.evidence).toEqual(["fake-forced"]);
    });

    test("PASSES when the human help itself names the machine-mode flag", () => {
      const humanHelp = "Usage: t [command]\n\nOptions:\n  --json  Machine output.\n  -h, --help\n";
      const f = advertisesMachineModeChecker.check(
        historyWithAutoMachineHelp(SCHEMA_HELP, humanHelp),
      );
      expect(f.verdict).toBe("pass");
      expect(f.evidence).toEqual(["fake-forced"]);
    });

    // Neither a pass nor a fail is honest here: the surface the rule is about was never seen.
    // Passing on the machine document is the defect; failing would blame a target for help we
    // could not make it print.
    test("reports unverified when no human help can be obtained at all", () => {
      const f = advertisesMachineModeChecker.check(historyWithAutoMachineHelp(SCHEMA_HELP, null));
      expect(f.verdict).toBe("unverified");
      expect(f.detail).toContain("human help surface");
    });

    // The same claim end to end, against a real process rather than a hand-built history — so
    // the probe, the inertness gate, the recording and the check are all in the loop. This
    // fixture PASSED the previous checker, which is the whole point of keeping it.
    test("FAILS the fixture that hides its machine mode from human help", async () => {
      const h = await record(fixture("broken/machine-mode-hidden-in-human-help.ts"), [
        advertisesMachineModeChecker,
      ]);
      // Discovery still reports `--json`, because it reads the machine document. A checker
      // trusting that value cannot fail this target.
      expect(h.discovery.machineModeFlag).toBe("--json");
      const f = advertisesMachineModeChecker.check(h);
      expect(f.verdict).toBe("fail");
    }, 30_000);
  });
});
