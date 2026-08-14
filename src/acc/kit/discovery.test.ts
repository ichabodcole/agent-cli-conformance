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
  });
});
