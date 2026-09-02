import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { type AllowlistEntry, IGNORED_DIRS, scanFile } from "./version-literals.ts";

const HAZARDS = ["0.1.0", "0.1.2"];

describe("scanFile", () => {
  test("an unmarked hazard literal fails, naming file, line and the three remedies", () => {
    const { problems } = scanFile("docs/x.md", "keep the `#v0.1.0` pin\n", HAZARDS, []);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("docs/x.md:1");
    expect(problems[0]).toContain("v0.1.0");
    expect(problems[0]).toContain("allowlist");
  });

  test("an inline x-release-please-version marker on the line passes it", () => {
    const { problems } = scanFile(
      "docs/x.md",
      "The `#v0.1.2` pin. <!-- x-release-please-version -->\n",
      HAZARDS,
      [],
    );
    expect(problems).toHaveLength(0);
  });

  test("a start/end block covers every line inside it and none after it", () => {
    const text = [
      "<!-- x-release-please-start-version -->",
      "install with #v0.1.2",
      "<!-- x-release-please-end -->",
      "but this v0.1.2 is bare",
      "",
    ].join("\n");
    const { problems } = scanFile("docs/x.md", text, HAZARDS, []);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("docs/x.md:4");
  });

  test("an allowlist entry permits its one (file, version) pair and is reported as hit", () => {
    const entry: AllowlistEntry = { file: "docs/x.md", version: "0.1.0", reason: "a capture" };
    const { problems, allowlistHits } = scanFile(
      "docs/x.md",
      "taken with acc 0.1.0, kept as taken\n",
      HAZARDS,
      [entry],
    );
    expect(problems).toHaveLength(0);
    expect(allowlistHits.has(entry)).toBe(true);
  });

  test("a DIFFERENT hazard version in an allowlisted file still fails", () => {
    const entry: AllowlistEntry = { file: "docs/x.md", version: "0.1.0", reason: "a capture" };
    const { problems } = scanFile("docs/x.md", "now on v0.1.2\n", HAZARDS, [entry]);
    expect(problems).toHaveLength(1);
  });

  test("non-hazard semvers never match: other projects' versions and spec URLs are not ours", () => {
    const { problems } = scanFile(
      "docs/x.md",
      'conventionalcommits.org/en/v1.0.0/ and framework 2.3.4 and payload {"version":"1.0.0"}\n',
      HAZARDS,
      [],
    );
    expect(problems).toHaveLength(0);
  });

  test("a hazard version embedded in a longer version does not match", () => {
    const { problems } = scanFile("docs/x.md", "bun 10.1.0.2 and v0.1.20 shipped\n", HAZARDS, []);
    expect(problems).toHaveLength(0);
  });
});

describe("IGNORED_DIRS", () => {
  // THE LIST IS THE DEFECT SURFACE, not the walk. `.superpowers` was absent until an agent
  // workspace under it failed the check, so this holds the set against the file that decides
  // what is ignored rather than against a second hand-maintained copy.
  test("covers every top-level directory .gitignore ignores", () => {
    const ignored = readFileSync(join(import.meta.dir, "../../.gitignore"), "utf8")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith("#") && l.endsWith("/") && !l.includes("*"))
      // `skipDirs` matches a BASENAME, so `docs/dist/` is covered by the entry `dist`.
      .map((l) => l.replace(/\/$/, "").split("/").pop() as string);
    const missing = ignored.filter((d) => !IGNORED_DIRS.has(d));
    expect(missing).toEqual([]);
  });
});
