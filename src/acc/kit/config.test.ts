import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CONFIG_FILE, ConfigError, loadConfig } from "./config.ts";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "acc-config-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

/** Write the config file with arbitrary — including invalid — content. */
function write(content: string): void {
  writeFileSync(join(dir, CONFIG_FILE), content);
}

const IDS = ["A1", "A2", "B1"];

/** The provenance a config read from an explicitly named directory carries. See `ConfigSource`. */
const namedByFlag = (d: string) => ({
  origin: "flag" as const,
  path: join(d, CONFIG_FILE),
  dir: d,
});

describe("loadConfig", () => {
  // The declaration a machine-first CLI makes about itself (EXT-4). Named for what is CHECKED:
  // the kit accepts JSON and only JSON — not YAML, CSV, TSV or XML — so a broader word would
  // invite a truthful declaration the kit then fails. There is no `"flag"` value; a flag-selected
  // machine mode is not declarable, and that gap is stated on the rules that need it.
  test("accepts defaultOutput: json", () => {
    write(JSON.stringify({ defaultOutput: "json" }));
    expect(loadConfig(dir, IDS).defaultOutput).toBe("json");
  });

  test("leaves defaultOutput undefined when it is not declared", () => {
    write(JSON.stringify({ rules: {} }));
    expect(loadConfig(dir, IDS).defaultOutput).toBeUndefined();
  });

  // A mistyped declaration must be an ERROR, not an ignored key — the same rule this file already
  // applies to a mistyped rule id. Silently doing nothing leaves a project believing it declared
  // something it did not, which is the silent no-op the whole catalogue exists to catch.
  // A near-miss key is the failure this guards: the declaration is what lets B5 reach a
  // machine-first target, so a typo silently switches off the check as well as the declaration.
  test("REJECTS an unknown top-level key rather than ignoring it", () => {
    for (const bad of [
      "defaultoutput",
      "default_output",
      "machineMode",
      "Rules",
      "knownfailures",
    ]) {
      write(`{ "${bad}": {} }`);
      expect(() => loadConfig(dir, IDS)).toThrow(/unknown key/);
    }
  });

  test("REJECTS any other defaultOutput value", () => {
    for (const bad of ['"flag"', '"yaml"', '"csv"', '"default"', "true", "1", "null", "{}"]) {
      write(`{ "defaultOutput": ${bad} }`);
      expect(() => loadConfig(dir, IDS)).toThrow(/defaultOutput must be "json"/);
    }
  });

  test("a present file is parsed", () => {
    write(JSON.stringify({ knownFailures: { A1: "legacy parser" } }));
    expect(loadConfig(dir, IDS)).toEqual({
      rules: {},
      knownFailures: { A1: "legacy parser" },
      source: namedByFlag(dir),
    });
  });

  test("a file missing knownFailures still yields an empty object rather than undefined", () => {
    write(JSON.stringify({}));
    expect(loadConfig(dir, IDS)).toEqual({
      rules: {},
      knownFailures: {},
      source: namedByFlag(dir),
    });
  });

  test("an empty knownRuleIds list disables the id check, for a partial corpus", () => {
    write(JSON.stringify({ knownFailures: { Z9: "not a rule here" } }));
    expect(loadConfig(dir, [])).toEqual({
      rules: {},
      knownFailures: { Z9: "not a rule here" },
      source: namedByFlag(dir),
    });
  });

  test("a file missing rules yields an empty object rather than undefined", () => {
    write(JSON.stringify({ knownFailures: { A1: "legacy parser" } }));
    expect(loadConfig(dir, IDS).rules).toEqual({});
  });
});

// The second concept in the file, and the one that must not collapse into the first. A waiver is
// a DECLARATION — "this rule does not apply to my tool, by design" — where a known failure is
// DEBT. D2 is the case that forced it: bare invocation must be a usage error, and three of four
// real CLIs print help and exit 0 on purpose.
describe("rules: per-project severity", () => {
  test("a waiver is parsed with its reason", () => {
    write(
      JSON.stringify({
        rules: { A1: { severity: "off", reason: "human-first CLI; bare help is deliberate" } },
      }),
    );
    expect(loadConfig(dir, IDS)).toEqual({
      rules: { A1: { severity: "off", reason: "human-first CLI; bare help is deliberate" } },
      knownFailures: {},
      source: namedByFlag(dir),
    });
  });

  // Severity may be RAISED, not only lowered. A project declaring itself stricter than baseline
  // is a signal worth supporting, and it is what makes the file read as tuning rather than as an
  // opt-out list.
  test.each(["core", "diagnostic", "off"])("severity %j is accepted", (severity) => {
    write(JSON.stringify({ rules: { A1: { severity, reason: "because" } } }));
    expect(loadConfig(dir, IDS).rules.A1).toEqual({ severity, reason: "because" });
  });

  test("both sections may be populated at once", () => {
    write(
      JSON.stringify({
        rules: { A1: { severity: "off", reason: "does not apply" } },
        knownFailures: { B1: "tracked in #412" },
      }),
    );
    expect(loadConfig(dir, IDS)).toEqual({
      rules: { A1: { severity: "off", reason: "does not apply" } },
      knownFailures: { B1: "tracked in #412" },
      source: namedByFlag(dir),
    });
  });
});

// This section can DISABLE a rule outright, not merely excuse one failure of it, so the
// "everything is validated" discipline applies here with more force than it does to
// knownFailures.
describe("rules: shape validation", () => {
  test.each([
    ["null", null],
    ["an array", []],
    ["a number", 3],
    ["a string", "A1"],
  ])("rules that is %s is rejected", (_label, value) => {
    write(JSON.stringify({ rules: value }));
    expect(() => loadConfig(dir, IDS)).toThrow(/rules must be an object/);
  });

  test.each([
    ["null", null],
    ["a string", "off"],
    ["an array", ["off"]],
    ["a number", 1],
  ])("a rule entry that is %s is rejected", (_label, value) => {
    write(JSON.stringify({ rules: { A1: value } }));
    expect(() => loadConfig(dir, IDS)).toThrow(/rules\.A1 must be an object/);
  });

  test("a missing severity is rejected", () => {
    write(JSON.stringify({ rules: { A1: { reason: "because" } } }));
    expect(() => loadConfig(dir, IDS)).toThrow(/rules\.A1\.severity must be one of/);
  });

  test.each(["OFF", "none", "warn", "error", "off "])(
    "the unknown severity %j is rejected, quoting the set",
    (severity) => {
      write(JSON.stringify({ rules: { A1: { severity, reason: "because" } } }));
      expect(() => loadConfig(dir, IDS)).toThrow(/must be one of core, diagnostic, off/);
    },
  );

  test.each([
    ["null", null],
    ["a number", 1],
    ["an array", []],
  ])("a severity that is %s is rejected", (_label, severity) => {
    write(JSON.stringify({ rules: { A1: { severity, reason: "because" } } }));
    expect(() => loadConfig(dir, IDS)).toThrow(/severity must be one of/);
  });

  // A waiver with no reason is a silent opt-out. With one it is a declaration someone can review
  // later — and, aggregated across projects, evidence about the spec rather than about the tool.
  test.each([
    ["missing", undefined],
    ["null", null],
    ["a number", 1],
    ["an array", ["because"]],
    ["an object", { why: "because" }],
    ["an empty string", ""],
    ["whitespace", "   "],
  ])("a rule reason that is %s is rejected", (_label, reason) => {
    write(JSON.stringify({ rules: { A1: { severity: "off", reason } } }));
    expect(() => loadConfig(dir, IDS)).toThrow(/rules\.A1\.reason must be a non-empty string/);
  });

  // `"severty": "off"` that quietly does nothing is the same silent no-op as a mistyped rule id,
  // and it leaves the project believing it declared something it did not.
  test("an unknown key in a rule entry is rejected, not ignored", () => {
    write(
      JSON.stringify({ rules: { A1: { severity: "off", reason: "r", severty: "diagnostic" } } }),
    );
    expect(() => loadConfig(dir, IDS)).toThrow(/rules\.A1 has an unknown key "severty"/);
  });

  test("an unknown rule id under rules is rejected, quoting the ids that exist", () => {
    write(JSON.stringify({ rules: { Z9: { severity: "off", reason: "r" } } }));
    expect(() => loadConfig(dir, IDS)).toThrow(
      /has an entry under "rules" for "Z9", which is not a rule this kit/,
    );
    expect(() => loadConfig(dir, IDS)).toThrow(/A1, A2, B1/);
  });

  test.each(["a1", "A1 ", " A1"])("the near-miss %j under rules is rejected", (id) => {
    write(JSON.stringify({ rules: { [id]: { severity: "off", reason: "typo" } } }));
    expect(() => loadConfig(dir, IDS)).toThrow(/is not a rule this kit checks/);
  });

  test("an empty knownRuleIds list disables the id check for rules too", () => {
    write(JSON.stringify({ rules: { Z9: { severity: "off", reason: "partial corpus" } } }));
    expect(loadConfig(dir, []).rules.Z9).toEqual({ severity: "off", reason: "partial corpus" });
  });
});

// The two sections make different statements, and only one PAIR of statements contradicts. See
// `requireNoContradiction` for the argument against picking a precedence instead.
describe("an id in both sections", () => {
  test("waived AND a known failure is an error naming the id and both keys", () => {
    write(
      JSON.stringify({
        rules: { A1: { severity: "off", reason: "does not apply" } },
        knownFailures: { A1: "tracked in #412" },
      }),
    );
    expect(() => loadConfig(dir, IDS)).toThrow(ConfigError);
    expect(() => loadConfig(dir, IDS)).toThrow(/A1 is waived in rules AND listed in knownFailures/);
  });

  // Not a contradiction: "I hold myself to core on this rule, and I currently fail it" is the
  // aspirational half of the same ratchet. Rejecting it would make raising a severity something
  // only an already-passing project could do.
  test.each(["core", "diagnostic"])(
    "severity %j alongside a known failure is allowed",
    (severity) => {
      write(
        JSON.stringify({
          rules: { A1: { severity, reason: "we hold ourselves to this" } },
          knownFailures: { A1: "tracked in #412" },
        }),
      );
      const config = loadConfig(dir, IDS);
      expect(config.rules.A1?.severity).toBe(severity);
      expect(config.knownFailures.A1).toBe("tracked in #412");
    },
  );

  test("a waiver on one rule does not object to a known failure on another", () => {
    write(
      JSON.stringify({
        rules: { A1: { severity: "off", reason: "does not apply" } },
        knownFailures: { A2: "tracked in #412" },
      }),
    );
    expect(() => loadConfig(dir, IDS)).not.toThrow();
  });
});

// "Nobody asked" and "you asked for this path" are different questions, and answering both with
// an empty config meant a `--config-dir` typo failed rules the project believed it
// had excused — the silent-failure shape the catalogue exists to catch (review R2-4).
describe("which missing file is an error", () => {
  test("no default file in the cwd is not an error", () => {
    expect(loadConfig(undefined, IDS)).toEqual({
      rules: {},
      knownFailures: {},
      source: { origin: "none", path: null, dir: process.cwd() },
    });
  });

  test("an explicitly requested directory that does not exist is an error naming it", () => {
    const missing = join(dir, "nope");
    expect(() => loadConfig(missing, IDS)).toThrow(ConfigError);
    expect(() => loadConfig(missing, IDS)).toThrow(/no such directory: /);
  });

  test("an explicitly requested directory with no config file is an error", () => {
    expect(() => loadConfig(dir, IDS)).toThrow(/does not exist/);
  });

  // Both of the above are read with the path glued to their front by the command layer, and
  // `no acc.config.json in the requested directory` rendered as
  // `/tmp/x/acc.config.json no acc.config.json in the requested directory` — a fragment, and the
  // third of its kind in this file. Asserted on the rendered string rather than on the message
  // alone, because the message alone is not where the defect was visible.
  test.each([
    ["the directory exists and is empty", (d: string) => d],
    ["the directory does not exist", (d: string) => join(d, "nope")],
  ])("the message reads as a sentence once the path is prefixed — %s", (_name, pick) => {
    try {
      loadConfig(pick(dir), IDS);
      throw new Error("expected a throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigError);
      const rendered = `${(err as ConfigError).path} ${(err as ConfigError).message}`;
      expect(rendered).toMatch(/^\/.*\/acc\.config\.json does not exist/);
      // The file is named once. Naming it twice is what made the old message unreadable.
      expect(rendered.match(/acc\.config\.json/g)).toHaveLength(1);
    }
  });

  test("the error carries the offending path as a field, not only in the message", () => {
    try {
      loadConfig(join(dir, "nope"), IDS);
      throw new Error("expected a throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigError);
      expect((err as ConfigError).path).toBe(join(dir, "nope", CONFIG_FILE));
    }
  });
});

// The parsed JSON used to be cast straight to `Partial<Expectations>` — a promise the type
// system cannot keep about a file on disk. Each case below is a value that promise admitted.
describe("shape validation", () => {
  test("malformed JSON is a configuration error, not an unclassified fault", () => {
    write("{ not json");
    expect(() => loadConfig(dir, IDS)).toThrow(ConfigError);
    expect(() => loadConfig(dir, IDS)).toThrow(/is not valid JSON/);
  });

  test.each([
    ["null", "null"],
    ["an array", "[]"],
    ["a number", "42"],
    ["a string", '"A1"'],
  ])("a root that is %s is rejected", (_label, json) => {
    write(json);
    expect(() => loadConfig(dir, IDS)).toThrow(/must contain a JSON object/);
  });

  // The specific defect the review names: `knownFailures: null` survived the cast and threw on a
  // later `in` operation, reporting a configuration mistake as an internal fault.
  test.each([
    ["null", null],
    ["an array", []],
    ["a number", 3],
    ["a string", "A1"],
  ])("knownFailures that is %s is rejected", (_label, value) => {
    write(JSON.stringify({ knownFailures: value }));
    expect(() => loadConfig(dir, IDS)).toThrow(/knownFailures must be an object/);
  });

  test.each([
    ["null", null],
    ["a number", 1],
    ["an array", ["because"]],
    ["an object", { why: "because" }],
    ["an empty string", ""],
    ["whitespace", "   "],
  ])("a reason that is %s is rejected", (_label, reason) => {
    write(JSON.stringify({ knownFailures: { A1: reason } }));
    expect(() => loadConfig(dir, IDS)).toThrow(/must be a non-empty string reason/);
  });

  test("the rejection names the rule whose reason is wrong", () => {
    write(JSON.stringify({ knownFailures: { A1: "fine", B1: 7 } }));
    expect(() => loadConfig(dir, IDS)).toThrow(/knownFailures\.B1/);
  });
});

// An id no checker answers to excuses nothing AND never becomes a stale expectation, so the
// ratchet cannot tighten past it: the entry sits in the file forever, doing nothing, looking
// like coverage.
describe("rule ids are checked against the active registry", () => {
  test("an unknown id is rejected, quoting the ids that exist", () => {
    write(JSON.stringify({ knownFailures: { Z9: "a rule that does not exist" } }));
    expect(() => loadConfig(dir, IDS)).toThrow(/"Z9", which is not a rule this kit checks/);
    // The message is glued to the file path by the command layer, so it has to read as a
    // sentence there too: `acc.config.json rules names "Z9"` was the garbled result.
    expect(() => loadConfig(dir, IDS)).toThrow(/has an entry under "knownFailures" for "Z9"/);
    expect(() => loadConfig(dir, IDS)).toThrow(/A1, A2, B1/);
  });

  test.each(["a1", "A1 ", " A1"])("the near-miss %j is rejected, not silently accepted", (id) => {
    write(JSON.stringify({ knownFailures: { [id]: "typo" } }));
    expect(() => loadConfig(dir, IDS)).toThrow(/is not a rule this kit checks/);
  });

  test("every valid id is accepted", () => {
    write(JSON.stringify({ knownFailures: { A1: "one", A2: "two", B1: "three" } }));
    expect(Object.keys(loadConfig(dir, IDS).knownFailures)).toEqual(["A1", "A2", "B1"]);
  });
});

// WHERE THE CONFIG CAME FROM, which the report publishes and which an adopter had to reconstruct
// from disk residue. The three origins are not interchangeable: one is on the caller's command
// line, one is in a directory nobody mentioned, and one is nothing at all.
describe("the provenance every load carries", () => {
  test("a directory named with --config-dir reports origin flag, with an absolute path", () => {
    write(JSON.stringify({}));
    const { source } = loadConfig(dir, IDS);
    expect(source).toEqual({ origin: "flag", path: join(dir, CONFIG_FILE), dir });
    expect(source?.path?.startsWith("/")).toBe(true);
  });

  // THE TRAP, reproduced: nothing named this file and it was loaded anyway. Two runs of one
  // command from two directories reached two verdicts for an adopter, with nothing on either
  // screen accounting for it, so this origin is the one the report must be able to shout about.
  test("a file found in the working directory reports origin discovered", () => {
    write(JSON.stringify({ knownFailures: { A1: "found without being asked for" } }));
    const cwd = process.cwd();
    try {
      process.chdir(dir);
      const config = loadConfig(undefined, IDS);
      // The declarations really did take effect — otherwise this test would pass over a config
      // that was reported and then ignored.
      expect(config.knownFailures).toEqual({ A1: "found without being asked for" });
      expect(config.source?.origin).toBe("discovered");
      expect(config.source?.path).toBe(join(process.cwd(), CONFIG_FILE));
    } finally {
      process.chdir(cwd);
    }
  });

  // "None" still answers WHERE, because "no config was loaded" is half an answer: a project whose
  // file sits one directory up needs to know which directory was searched to see why.
  test("no file at all reports origin none, and still names the directory searched", () => {
    const cwd = process.cwd();
    try {
      process.chdir(dir);
      const { source } = loadConfig(undefined, IDS);
      expect(source).toEqual({ origin: "none", path: null, dir: process.cwd() });
    } finally {
      process.chdir(cwd);
    }
  });
});

// Two malformed messages, both reachable from a real config file. A tool that emits broken
// English about a mistake is a tool the reader trusts less about the mistake.
describe("the shapes named in a rejection are named in English", () => {
  test("a missing key is reported as `undefined`, not `a undefined`", () => {
    write(JSON.stringify({ rules: { A1: { severity: "off" } } }));
    expect(() => loadConfig(dir, IDS)).toThrow(/found undefined/);
    expect(() => loadConfig(dir, IDS)).not.toThrow(/a undefined/);
  });

  test("an object is reported as `an object`, not `a object`", () => {
    write(JSON.stringify({ knownFailures: { A1: {} } }));
    expect(() => loadConfig(dir, IDS)).toThrow(/found an object/);
  });
});
