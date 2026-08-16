import { describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { discover, parseHelp } from "./discovery.ts";
import type { TargetInfo } from "./types.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const CONFORMING: TargetInfo = {
  path: join(HERE, "fixtures/conforming.ts"),
  argv0: ["bun", join(HERE, "fixtures/conforming.ts")],
};

describe("parseHelp", () => {
  test("finds long flags", () => {
    const d = parseHelp("Options:\n  --json     Machine output.\n  --help\n");
    expect(d.flags).toContain("--json");
    expect(d.flags).toContain("--help");
  });

  test("finds subcommands under a Commands heading", () => {
    const d = parseHelp("Commands:\n  list   List things.\n  show   Show one.\n");
    expect(d.subcommands).toEqual(["list", "show"]);
  });

  test("identifies an advertised machine-mode flag", () => {
    expect(parseHelp("  --json  JSON output\n").machineModeFlag).toBe("--json");
    expect(parseHelp("  --format <fmt>\n").machineModeFlag).toBe("--format");
    expect(parseHelp("  --verbose\n").machineModeFlag).toBeNull();
  });

  // Discovery must not invent structure. Finding nothing is a legitimate result, and it is
  // what makes downstream checkers report `unverified` rather than passing vacuously.
  test("returns empty results for help it cannot parse", () => {
    const d = parseHelp("this program does things\n");
    expect(d.subcommands).toEqual([]);
    expect(d.flags).toEqual([]);
  });

  // A flag belonging to a piped example command, or to a docs URL, is not the target's own
  // surface. Scoping to the Options block is what keeps those out.
  test("does not pick up flags outside the options block", () => {
    const d = parseHelp(
      "Options:\n  --loglevel <level>   Set the log level.\n\nExamples:\n  mycli list | jq --raw-output '.items'\n",
    );
    expect(d.flags).toEqual(["--loglevel"]);
  });

  // No options heading anywhere means there is no block to scope to — falling back to an
  // unscoped scan is safer than reporting no flags at all when a real (if unheaded) one exists.
  test("falls back to an unscoped scan when no options heading exists", () => {
    const d = parseHelp("Usage: mycli [--json]\n");
    expect(d.flags).toContain("--json");
  });

  // Real CLIs disagree on how they head the commands block: gh uses no colon at all, docker
  // uses a qualifier before "Commands:". The heading match has to tolerate both.
  test("finds subcommands under headings with no colon or an extra qualifier word", () => {
    expect(
      parseHelp("CORE COMMANDS\n  issue   Manage issues.\n  pr      Manage pull requests.\n")
        .subcommands,
    ).toEqual(["issue", "pr"]);
    expect(parseHelp("Common Commands:\n  run    Run a container.\n").subcommands).toEqual(["run"]);
    expect(parseHelp("Management Commands:\n  volume   Manage volumes.\n").subcommands).toEqual([
      "volume",
    ]);
  });

  // gh suffixes every entry in its command table with a colon that is table punctuation, not
  // part of the name. Left in, a nested probe built as `gh auth: <sentinel>` gets rejected as an
  // unknown ROOT command — a false pass for a check that exists to verify nested-verb handling.
  test("strips gh-style trailing colons from subcommand names", () => {
    const d = parseHelp(
      "CORE COMMANDS\n  auth:        Authenticate gh and git with GitHub\n  browse:      Open the repository in the browser\n",
    );
    expect(d.subcommands).toEqual(["auth", "browse"]);
  });

  // Interior colons are real, namespaced verb names (`db:migrate`, `cache:clear`) — only a
  // trailing colon is punctuation, and stripping must not touch these.
  test("keeps interior colons in namespaced subcommand names", () => {
    const d = parseHelp("Commands:\n  db:migrate    Run migrations.\n");
    expect(d.subcommands).toEqual(["db:migrate"]);
  });
});

// A7 falsifies the target's OWN declaration, so everything it can assert rests on what is read
// back here. A set invented from a layout that does not carry one would make A7 fail a tool for
// breaking a promise it never made — so the negative cases below matter as much as the positive
// ones, and there are more of them.
describe("parseHelp — closed value sets", () => {
  test.each([
    ["angle brackets", "Options:\n  --format <text|json>   Output format.\n"],
    ["parentheses", "Options:\n  --format (text|json)   Output format.\n"],
    ["square brackets", "Options:\n  --format [text|json]   Output format.\n"],
    ["an attached value slot", "Options:\n  --format=<text|json>   Output format.\n"],
    ["prose", "Options:\n  --format   Output format, one of: text, json\n"],
    ["prose with `or`", "Options:\n  --format   Output format, one of text or json\n"],
  ])("reads a set advertised with %s", (_label, help) => {
    expect(parseHelp(help).valueSets).toEqual({ "--format": ["text", "json"] });
  });

  test("reads sets for several flags, keyed by the flag each belongs to", () => {
    const d = parseHelp(
      "Options:\n  --format <text|json>    Output format.\n  --tier <core|diagnostic>  Tier.\n",
    );
    expect(d.valueSets).toEqual({
      "--format": ["text", "json"],
      "--tier": ["core", "diagnostic"],
    });
  });

  // The three shapes that LOOK like a set and are not. Each one would hand A7 a probe built on
  // a promise the tool never made.
  test.each([
    ["a value hint with no alternation", "Options:\n  --format <fmt>   Output format.\n"],
    ["optional-flag notation", "Options:\n  --format <fmt>   see [--json]\n"],
    ["an alternation of flags", "Options:\n  --mode <--fast|--slow>   Mode.\n"],
    ["a bare description", "Options:\n  --verbose   Say more.\n"],
  ])("finds no set in %s", (_label, help) => {
    expect(parseHelp(help).valueSets).toEqual({});
  });

  // Same scoping argument as the flag scan: an alternation inside a piped example belongs to jq,
  // not to the target.
  test("does not read a set out of an example outside the options block", () => {
    const d = parseHelp(
      "Options:\n  --verbose   Say more.\n\nExamples:\n  mycli list | jq '.a|.b'\n",
    );
    expect(d.valueSets).toEqual({});
  });

  // The structural branch. Every probe runs with stdout on a pipe, so a tool that answers a
  // program with a schema — exactly what this catalogue asks for — publishes its sets as data
  // rather than as prose, and reading only prose would exempt the tools that complied.
  test("reads sets structurally when help is itself a JSON document", () => {
    const help = JSON.stringify({
      ok: true,
      data: {
        name: "mycli",
        global_args: [{ name: "--json" }, { name: "--format", values: ["text", "json"] }],
        commands: [{ name: "rules", args: [{ name: "--tier", values: ["core", "diagnostic"] }] }],
      },
    });
    expect(parseHelp(help).valueSets).toEqual({
      "--format": ["text", "json"],
      "--tier": ["core", "diagnostic"],
    });
  });

  // Declaration order, not discovery order: A7 probes the first set it is given, and a global
  // flag reaching the target's root is a stronger probe than a subcommand's flag sent there.
  test("presents a global flag's set before a subcommand's", () => {
    const help = JSON.stringify({
      data: {
        global_args: [{ name: "--format", values: ["text", "json"] }],
        commands: [{ args: [{ name: "--tier", values: ["core", "diagnostic"] }] }],
      },
    });
    expect(Object.keys(parseHelp(help).valueSets)).toEqual(["--format", "--tier"]);
  });

  test("ignores a JSON entry whose values are not a set of at least two plain strings", () => {
    const help = JSON.stringify({
      args: [
        { name: "--one", values: ["only"] },
        { name: "--objs", values: [{ a: 1 }, { b: 2 }] },
        { name: "--spaced", values: ["two words", "other"] },
        { name: "not-a-flag", values: ["a", "b"] },
      ],
    });
    expect(parseHelp(help).valueSets).toEqual({});
  });
});

describe("discover", () => {
  test("reads the conforming fixture's surface", async () => {
    const d = await discover(CONFORMING);
    expect(d.helpReadable).toBe(true);
    expect(d.subcommands).toContain("list");
    expect(d.machineModeFlag).toBe("--json");
  });

  test("reports helpReadable false when the target cannot be run", async () => {
    const d = await discover({ path: "nope", argv0: ["/nonexistent-acc-xyz"] });
    expect(d.helpReadable).toBe(false);
    expect(d.subcommands).toEqual([]);
    // A7 reads this map, and a target whose help could not be read has declared nothing —
    // inheriting a set from a failed run would be the purest form of inventing the evidence.
    expect(d.valueSets).toEqual({});
  });
});
