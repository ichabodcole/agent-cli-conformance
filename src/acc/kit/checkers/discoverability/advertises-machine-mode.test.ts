import { describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { record } from "../../record.ts";
import type { History, TargetInfo } from "../../types.ts";
import { advertisesMachineModeChecker } from "./advertises-machine-mode.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (rel: string): TargetInfo => {
  const p = join(HERE, "../../fixtures", rel);
  return { path: p, argv0: ["bun", p] };
};

/**
 * A History whose help text is exactly `text` and whose discovery found no machine-mode flag,
 * so the checker's fallback scan for a `schema` command is the only thing that can pass it.
 * Built by hand rather than as fixtures: the whole question here is what shape of help TEXT
 * counts, and writing six near-identical CLIs to vary one line would obscure that.
 */
function historyWithHelp(text: string, subcommands: string[] = []): History {
  const o = {
    id: "fake-help",
    invocation: {
      args: ["--help"],
      inertness: "help-path" as const,
      purpose: "D3: help mentions machine mode",
    },
    purposes: ["D3: help mentions machine mode"],
    stdout: text,
    stderr: "",
    exitCode: 0,
    timedOut: false,
    spawnFailed: false,
    durationMs: 1,
    timeToFirstByteMs: 1,
  };
  return {
    target: { path: "x", argv0: ["x"] },
    discovery: { subcommands, flags: [], machineModeFlag: null, helpReadable: true },
    observations: [o],
    byId: new Map([[o.id, o]]),
  };
}

describe("D3 — help advertises the machine-readable path", () => {
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
      discovery: { subcommands: [], flags: [], machineModeFlag: null, helpReadable: false },
      observations: [],
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
});
