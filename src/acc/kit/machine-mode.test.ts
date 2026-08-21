import { describe, expect, test } from "bun:test";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { helpStatesMachineDefault, parsesAsDocument, selectorObserved } from "./machine-mode.ts";
import { record } from "./record.ts";
import { CHECKERS } from "./registry.ts";
import type { TargetInfo } from "./types.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

// The corpus an outside adopter built to attack this, plus the family it missed.
//
// They could not produce a false pass in eight attempts; every miss was a false FAIL, and those
// were systematic — the entire pipe-conditional family, which this project's own docs call the
// common shape. Including the sentence this project uses to describe ITSELF.
//
// Why the suite could not have found it: `acc` advertises `--json`, so D3 answers on its flag
// clause and never reaches the prose branch. The positive control has a structural blind spot
// here, and no amount of care in `conformance.test.ts` would have closed it. These fixtures are
// the closure.
describe("a help statement that structured output is the default", () => {
  // Output claims that a clause-wide input scan wrongly REFUSED. A false fail costs a diagnostic
  // line, but each of these is a tool telling the truth and being marked down for it.
  const RECOGNISED = [
    "Output defaults to JSON for easy parsing",
    "Emits JSON by default so downstream tools can read it",
    "Prints JSON by default, accepted by jq",
    "The output is JSON unless stdout is a terminal",
    // default-shaped
    "Data commands emit JSON on stdout by DEFAULT; pass --human for prose.",
    "Output defaults to JSON when stdout is not a terminal.",
    "The default output format is json.",
    // pipe-conditional — the family that was missed entirely
    "Prints JSON when stdout is not a terminal, and a table when it is.",
    "Output is JSON when piped, human-readable at a terminal.",
    "When stdout is not a TTY, output is JSON.",
    "JSON when piped; text at a terminal.",
    // this project's own sentence about itself, which used to fail
    "acc writes JSON when its output is piped and the human report when it is not.",
  ];

  // Each of these carries a format word, most carry "default" or "piped" too, and every one of
  // them describes a tool whose OUTPUT is text. A pass on any is a false claim about the one rule
  // whose subject is whether a caller was told the truth.
  // THE DIRECTION BUG. The pipe-conditional patterns shipped without the discrimination the
  // default-shaped ones already had: they tested proximity of a format word to a pipe word and
  // stopped, so a tool that reads JSON IN and writes text OUT read as machine-first.
  //
  // The expensive direction, and the adopter said why: a statement recognised as a declaration
  // also unlocks B5, so a JSON-CONSUMING tool would have its error path measured against a
  // promise it never made — and could be failed on a CORE rule for it. A false fail costs a
  // diagnostic line; a false pass costs a build.
  const READS_IN_WRITES_OUT = [
    "JSON input is accepted when piped to stdin.",
    "Reads JSON when input is piped. Prints a table.",
    "Accepts JSON on stdin when piped; writes a CSV report.",
    "When piped, the JSON config is validated and a summary is printed.",
  ];

  // The corpus a reviewer with NO STAKE in the design produced, after two invested reviewers had
  // each declared the patterns unbreakable. Every string below returned the wrong answer at some
  // point on this branch. They are grouped by the guard that now handles them, because each group
  // is a different way for prose to look like a promise.
  const NEGATED = [
    "JSON output is disabled by default",
    "JSON is never emitted by default",
    "Do not emit JSON by default",
    "JSON output is suppressed when stdout is not a terminal",
  ];
  const WRITES_A_FILE = [
    // The clause split used to cut `coverage.json` into `coverage` + `json by default`, so ANY
    // sentence naming a `*.json` output file matched. This one turned a correct human-first CLI
    // into a core violation.
    "Coverage is written to coverage.json by default",
    "Report is saved to report.json by default",
    "Audit events are written to the log file as JSON by default",
    "Generated config files are JSON by default",
    "The lockfile is JSON by default",
    "Cache entries are stored as JSON by default under ~/.cache",
  ];
  const DOCUMENTS_A_FLAG = [
    "--json is recommended when output is piped to another program",
    "Colour is disabled when stdout is not a terminal, so pass --json for machine output",
    "--format FMT  Output format. Defaults to text; use json when piped",
    "If you want JSON by default, set MYAPP_FORMAT=json",
  ];
  const READS_IT_IN = [
    "Takes JSON when piped from another tool",
    "Expects NDJSON when piped",
    "Decodes JSON when piped",
    "Loads JSON by default",
    "The manifest it opens is JSON by default",
  ];
  const NOT_A_SENTENCE = [
    "| json | by default |",
    "Some subcommands print JSON by default; most print a table",
  ];

  const REFUSED = [
    ...NEGATED,
    ...WRITES_A_FILE,
    ...DOCUMENTS_A_FLAG,
    ...READS_IT_IN,
    ...NOT_A_SENTENCE,
    ...READS_IN_WRITES_OUT,
    // Controls: a pipe word with no output claim at all must not fire either.
    "When piped, colour is disabled and progress bars are suppressed.",
    "Pipe the JSON log to jq to filter it.",
    "When stdout is not a terminal, output is buffered.",
    "Reads JSON from stdin and prints a human-readable table.", // JSON as input
    "JSON is the default input format. Results print as a table.", // "default" + input
    "Converts JSON to CSV. Output is CSV.", // JSON as subject
    "This tool parses JSON configuration files. Output: a summary table.",
    "Validates that a file is well-formed JSON. Prints OK or the first error.",
    "Logs are written as JSON to ~/.app/log. Console output is plain text.",
    "Default: JSON output is disabled. Run with --machine to enable it.", // adjacent, opposite
    "Output format is text by default. JSON output is planned.",
    "  --format json    Output format (default: text)", // both words, opposite meaning
    "  --json           Emit JSON.  Text is the default.",
    "Pretty tables by default; use --json for machine output",
    "Prints a JSON schema. Colour is off when piped.", // must not span two sentences
  ];

  for (const help of RECOGNISED) {
    test(`recognises: ${help.slice(0, 52)}`, () => {
      expect({ help, machineFirst: helpStatesMachineDefault(help) }).toEqual({
        help,
        machineFirst: true,
      });
    });
  }

  for (const help of REFUSED) {
    test(`refuses: ${help.trim().slice(0, 52)}`, () => {
      expect({ help, machineFirst: helpStatesMachineDefault(help) }).toEqual({
        help,
        machineFirst: false,
      });
    });
  }
});

describe("selectorObserved — a flag spelled like a selector is not one", () => {
  const fixture = (rel: string): TargetInfo => {
    const p = join(HERE, "fixtures", rel);
    return { path: p, argv0: ["bun", p] };
  };

  // The false positive that motivated the rule. Before corroboration this target was NOT
  // CONFORMANT on three core rules, all of them for answering in prose a question it was never
  // asked in machine mode.
  test("a --json that names an input file is not established as a selector", async () => {
    const h = await record(fixture("json-flag-is-an-input.ts"), CHECKERS);
    expect(h.discovery.machineModeFlag).toBe("--json");
    expect(selectorObserved(h)).toBe(false);

    // B3 and B5 have nothing left to say: their whole subject is output under the selector.
    for (const ruleId of ["B3", "B5"]) {
      const checker = CHECKERS.find((c) => c.ruleId === ruleId);
      if (!checker) throw new Error(`no checker for ${ruleId}`);
      const f = checker.check(h);
      expect([ruleId, f.verdict]).toEqual([ruleId, "unverified"]);
      expect(f.detail).toContain("not established as a machine-mode selector");
    }

    // D1 PASSES, and that difference is the point rather than an inconsistency. Its other
    // clauses — a version is reported, and still reported with an unusable HOME — are about
    // plain `--version` and were measured directly. An uncorroborated selector silences the
    // payload clause only, exactly as an unadvertised machine mode does.
    //
    // The first cut returned `unverified` for the whole rule from inside that clause, which
    // discarded the problems the earlier clauses had already collected: a target that genuinely
    // required a usable HOME went from `fail` to `unverified` because its help spelled a flag
    // `--json`. A guard on one clause may not answer for the others.
    const d1 = CHECKERS.find((c) => c.ruleId === "D1");
    if (!d1) throw new Error("no checker for D1");
    const f = d1.check(h);
    expect(f.verdict).toBe("pass");
    expect(f.detail).toContain("not established as a machine-mode selector");
  }, 60_000);

  // The other direction, and the one that keeps this from being a blanket amnesty: a target whose
  // `--json` demonstrably changes the answer is established, and the paths where it changed it for
  // the worse are condemned. This fixture answers its parser error as a document under the flag and
  // in prose without it — the flag governs output shape — while its help under the flag stays prose.
  test("a --json that changes the answer IS established, and B3 fails on it", async () => {
    const p = join(HERE, "fixtures/broken/machine-mode-only-on-the-error-path.ts");
    const h = await record({ path: p, argv0: ["bun", p] }, CHECKERS);
    expect(selectorObserved(h)).toBe(true);

    const b3 = CHECKERS.find((c) => c.ruleId === "B3");
    if (!b3) throw new Error("no checker for B3");
    expect(b3.check(h).verdict).toBe("fail");
  }, 60_000);

  // THE INVERSION THIS PREDICATE SHIPPED WITH, pinned so it cannot come back. Asking "did a
  // document ever appear UNDER the flag" is anti-correlated with the defect B5 exists to catch:
  // a CLI answering the bare parser error as an envelope and the same error under `--json` in
  // prose has no document under the flag at all, so the more completely its machine mode collapsed
  // the less the kit could say. A contrast sees it; a presence test cannot.
  test("a machine mode that COLLAPSES under the flag is established, not excused", async () => {
    const p = join(HERE, "fixtures/broken/machine-mode-drops-under-flag.ts");
    const h = await record({ path: p, argv0: ["bun", p] }, CHECKERS);
    expect(selectorObserved(h)).toBe(true);

    const b5 = CHECKERS.find((c) => c.ruleId === "B5");
    if (!b5) throw new Error("no checker for B5");
    const f = b5.check(h);
    expect(f.verdict).toBe("fail");
    expect(f.detail).toContain("came back as prose");
  }, 60_000);
});

describe("corroboration is evidence, and it has to be evidence of the right thing", () => {
  // `JSON.parse` accepts bare scalars, so `parsesWhole` — the predicate this guard first shipped
  // with — called `1.4` a document. The false-positive fixture escaped only because `1.0.0`
  // happens not to be valid JSON, which is an accident of the version string. Two digits instead
  // of three restored all three core failures against a CLI that had broken nothing.
  test("a bare JSON scalar is not corroboration", () => {
    for (const scalar of ["1.4", "7", '"1.0.0"', "true", "null"]) {
      expect([scalar, parsesAsDocument(scalar)]).toEqual([scalar, false]);
    }
    for (const doc of ['{"a":1}', "[1,2]", '{"a":1}\n{"a":2}']) {
      expect([doc, parsesAsDocument(doc)]).toEqual([doc, true]);
    }
  });

  // The same fixture with its version string changed and nothing else. This is the regression
  // test for the accident above: it must stay CONFORMANT whatever the version happens to spell.
  test("the innocent CLI stays innocent whatever its version number parses as", async () => {
    const source = readFileSync(join(HERE, "fixtures/json-flag-is-an-input.ts"), "utf8");
    const dir = mkdtempSync(join(tmpdir(), "acc-scalar-"));
    try {
      for (const version of ["1.4", "7", "1.0.0"]) {
        const p = join(dir, `v${version}.ts`);
        writeFileSync(p, source.replace('"1.0.0\\n"', JSON.stringify(`${version}\n`)));
        const h = await record({ path: p, argv0: ["bun", p] }, CHECKERS);
        for (const ruleId of ["B3", "B5"]) {
          const checker = CHECKERS.find((c) => c.ruleId === ruleId);
          if (!checker) throw new Error(`no checker for ${ruleId}`);
          const f = checker.check(h);
          expect([version, ruleId, f.verdict]).toEqual([version, ruleId, "unverified"]);
        }
        const d1 = CHECKERS.find((c) => c.ruleId === "D1");
        if (!d1) throw new Error("no checker for D1");
        expect([version, d1.check(h).verdict]).toEqual([version, "pass"]);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 120_000);

  // The regression the guard itself introduced. A directly measured core violation — `--version`
  // works normally and fails with an unusable HOME — was silenced because the same target's help
  // spelled a flag `--json`. The guard belongs to the payload clause and may not answer for the
  // rest of the rule.
  test("an uncorroborated selector does not silence a violation measured elsewhere", async () => {
    const dir = mkdtempSync(join(tmpdir(), "acc-home-"));
    try {
      const p = join(dir, "needs-home.sh");
      writeFileSync(
        p,
        [
          "#!/bin/sh",
          `HELP='v — thing`,
          "",
          "Options:",
          "  --json <file>   Treat the input file as JSON.",
          "  --help          Show help.",
          "'",
          'case "$1" in',
          "  --help|-h) printf '%s' \"$HELP\"; exit 0 ;;",
          "  --version|-V) [ -d \"$HOME\" ] || { printf 'no home\\n' >&2; exit 1; }; printf '1.0.0\\n'; exit 0 ;;",
          "esac",
          "printf 'v: unknown option: %s\\n' \"$1\" >&2; exit 2",
        ].join("\n"),
      );
      chmodSync(p, 0o755);
      const h = await record({ path: p, argv0: [p] }, CHECKERS);
      const d1 = CHECKERS.find((c) => c.ruleId === "D1");
      if (!d1) throw new Error("no checker for D1");
      const f = d1.check(h);
      expect(f.verdict).toBe("fail");
      expect(f.detail).toContain("requires configuration");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60_000);
});

describe("corroboration decides whether a rule may condemn, never a rule that already answered", () => {
  // The regression that survived the first fix and was found by outside review. A CLI whose
  // machine mode is real only on the error path answers B5's own probe with a JSON document; an
  // early guard placed at the top of the evaluation returned before that observation was loaded
  // and reported that nothing had come back under the flag.
  test("B5 passes on a document it collected itself", async () => {
    const p = join(HERE, "fixtures/broken/machine-mode-only-on-the-error-path.ts");
    const h = await record({ path: p, argv0: ["bun", p] }, CHECKERS);
    const b5 = CHECKERS.find((c) => c.ruleId === "B5");
    if (!b5) throw new Error("no checker for B5");
    const f = b5.check(h);
    expect(f.verdict).toBe("pass");
    expect(f.evidence.length).toBeGreaterThan(0);
  }, 60_000);

  // The other half, and the reason this is not a blanket amnesty: the same document establishes
  // the selector, so the paths that answered in prose under it are condemned.
  test("and the same document establishes the selector for the rules that were lied to", async () => {
    const p = join(HERE, "fixtures/broken/machine-mode-only-on-the-error-path.ts");
    const h = await record({ path: p, argv0: ["bun", p] }, CHECKERS);
    for (const ruleId of ["B3", "D1"]) {
      const checker = CHECKERS.find((c) => c.ruleId === ruleId);
      if (!checker) throw new Error(`no checker for ${ruleId}`);
      expect([ruleId, checker.check(h).verdict]).toEqual([ruleId, "fail"]);
    }
  }, 60_000);

  // An NDJSON stream corroborates on the shape of its records, not on whether a brace appears
  // somewhere in the bytes. These two differ by one character inside a string VALUE, and briefly
  // got opposite answers — a substring standing in for a structural claim, which is the error the
  // whole rule exists to remove.
  test("NDJSON corroborates on record shape, not on a brace in the text", () => {
    expect(parsesAsDocument('["a",1]\n["b",2]')).toBe(true);
    expect(parsesAsDocument('["a{b",1]\n["c",2]')).toBe(true);
    expect(parsesAsDocument("1.4\n2.5")).toBe(false);
  });
});

// A verdict that depends on which OTHER rules ran is not a measurement, and this has broken twice:
// once because a rule read corroboration it never asked for, and once because a rule asked for two
// of the three routes and a target's machine mode lived on the third. Locked here rather than
// re-derived, because neither break was visible in any single-target check.
describe("no rule's verdict depends on which other rules ran", () => {
  const targets = [
    "fixtures/broken/machine-mode-only-on-the-error-path.ts",
    "fixtures/broken/machine-mode-help-not-json.ts",
    "fixtures/json-flag-is-an-input.ts",
  ];

  test.each(targets)(
    "%s gives the same verdict alone as in a full run",
    async (rel) => {
      const p = join(HERE, rel);
      const target: TargetInfo = { path: p, argv0: ["bun", p] };
      const full = await record(target, CHECKERS);
      for (const ruleId of ["B3", "B5", "D1"]) {
        const checker = CHECKERS.find((c) => c.ruleId === ruleId);
        if (!checker) throw new Error(`no checker for ${ruleId}`);
        const solo = checker.check(await record(target, [checker])).verdict;
        expect([ruleId, "solo", solo]).toEqual([ruleId, "solo", checker.check(full).verdict]);
      }
    },
    120_000,
  );
});
