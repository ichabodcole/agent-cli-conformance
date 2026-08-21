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

  // A flag that REQUIRES a value is not a mode switch, whatever it is spelled. Sending it bare is
  // a malformed invocation and the tool answers by complaining about the missing argument — a real
  // difference in output, which a with-and-without comparison reads as the flag governing output
  // shape. Measured before this check existed: a machine-first CLI whose help said `--json <file>`
  // collected two core failures that vanished when the same tool called the flag `--infile`.
  test("a --json that requires a value is not a machine-mode flag", () => {
    for (const help of [
      "Options:\n  --json <file>   Treat the input file as JSON.\n",
      "Options:\n  --json=<file>   Treat the input file as JSON.\n",
      "Options:\n  -j, --json <file>   Treat the input file as JSON.\n",
    ]) {
      expect([help, parseHelp(help).machineModeFlag]).toEqual([help, null]);
    }
  });

  // The narrowness is deliberate and asymmetric: missing a slot leaves the previous behaviour,
  // inventing one silently stops probing a real machine mode. `JSON` here is a description, not a
  // metavar, and no rule can tell those apart.
  test("a boolean --json is still a machine-mode flag, description notwithstanding", () => {
    for (const help of [
      "Options:\n  --json  JSON output\n",
      "Options:\n  --json     Machine-readable output.\n",
      "Options:\n  --json    Emit JSON (see <docs>)\n",
      "Options:\n  --json [<file>]  optional input\n",
    ]) {
      expect([help, parseHelp(help).machineModeFlag]).toEqual([help, "--json"]);
    }
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

  // THE BLANK-LINE DEFECT, found by execution against a real target. A renderer that puts a rule
  // of whitespace under its section titles closed the block on the line after the heading, so a
  // screen that plainly lists its flags yielded NOTHING — and A5, A7 and D3 each reported that
  // absence in words that read as a fact about the target rather than about the parse.
  test("a blank line under a heading is layout and does not end the block", () => {
    const help = [
      "USAGE anthill [OPTIONS] info|convene",
      "",
      "OPTIONS",
      "",
      "  --format=<text|json>    Output format",
      "",
      "COMMANDS",
      "",
      "  info    Inspect CLI and project state",
      "  convene    Report the team board state",
      "",
      "Use anthill <command> --help for more information.",
    ].join("\n");
    const d = parseHelp(help);
    expect(d.flags).toEqual(["--format"]);
    expect(d.valueSets).toEqual({ "--format": ["text", "json"] });
    expect(d.subcommands).toEqual(["info", "convene"]);
    expect(d.machineModeFlag).toBe("--format");
  });

  // ...and a blank line AFTER content still ends it, which is the half that keeps the scoping
  // honest. Without it the options block would swallow every following section.
  test("a blank line after content still ends the block", () => {
    const d = parseHelp(
      [
        "Options:",
        "",
        "  --loglevel <a|b>   Log level.",
        "",
        "Examples:",
        "  mycli | jq -r '.a|.b'",
      ].join("\n"),
    );
    expect(d.flags).toEqual(["--loglevel"]);
    expect(d.valueSets).toEqual({ "--loglevel": ["a", "b"] });
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

// THE WIRING. `defaultOutput` is read from acc.config.json and has to survive all the way into
// Discovery, because that is where checkers look — and it must survive help that could not be
// read at all, since a declaration is the one thing the kit knows about a target that does not
// depend on parsing anything the target printed.
describe("a declared machine-mode default reaches Discovery", () => {
  test("is carried through when help parses", async () => {
    const p = join(HERE, "fixtures/machine-first.ts");
    const d = await discover({ path: p, argv0: ["bun", p] }, true);
    expect(d.machineModeDefault).toBe(true);
    // ...and it is NOT the same fact as an advertised flag. This fixture has none.
    expect(d.machineModeFlag).toBe(null);
  });

  // NOT `machine-first.ts`, whose help says so out loud — that fixture is now `true` without any
  // config, which is the point of the help route and was this test's stale assumption.
  test("defaults to false when nothing was declared and help says nothing", async () => {
    const p = join(HERE, "fixtures/broken/no-version-flag.ts");
    const d = await discover({ path: p, argv0: ["bun", p] });
    expect(d.machineModeDefault).toBe(false);
  });

  test("survives a target whose help could not be read", async () => {
    const p = join(HERE, "fixtures/sh/dies-by-signal.sh");
    const d = await discover({ path: p, argv0: [p] }, true);
    expect(d.helpReadable).toBe(false);
    expect(d.machineModeDefault).toBe(true);
  });
});

// A HELP STATEMENT DOES NOT UNLOCK THE PROBE, and this test asserted the opposite for one commit.
//
// The coupling was argued for on the grounds that a promise made where callers can read it is the
// stronger one. It is — but it is read by pattern, and a reviewer with no stake in the design
// turned three ordinary human-first CLIs into CORE violations with one unrelated sentence each,
// including "Coverage is written to coverage.json by default". Routing a matcher's output into a
// gating rule amplifies every one of its mistakes from a printed line into a broken build.
//
// So D3 reads help, and `acc.config.json` unlocks B5. Deliberate, revocable, and the maintainer's
// own act rather than an inference from their prose.
describe("a help statement does not unlock the probe", () => {
  const at = (rel: string) => {
    const p = join(HERE, rel);
    return { path: p, argv0: ["bun", p] };
  };

  test("help stating a machine default leaves machineModeDefault false", async () => {
    const d = await discover(at("fixtures/states-machine-first-in-help.ts"));
    expect(d.machineModeDefault).toBe(false);
  });

  test("the config key is what sets it", async () => {
    const d = await discover(at("fixtures/states-machine-first-in-help.ts"), true);
    expect(d.machineModeDefault).toBe(true);
  });

  test("a target that says nothing is unaffected either way", async () => {
    expect((await discover(at("fixtures/broken/no-version-flag.ts"))).machineModeDefault).toBe(
      false,
    );
    expect(
      (await discover(at("fixtures/broken/no-version-flag.ts"), true)).machineModeDefault,
    ).toBe(true);
  });
});
