// How `acc check` decides what will actually run the target.
//
// `toTarget` used to send every `.ts` path through Bun, whatever the file's own `#!` line said —
// so a Deno or Node-TypeScript CLI was tested as a program its author never wrote (review R2-5).
// These tests fix the decision table in place. The end-to-end half is in conformance.test.ts.

import { afterEach, beforeEach, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { chmodSync, copyFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { toTarget } from "./check.ts";

const FIXTURES = join(dirname(import.meta.dir), "kit/fixtures");
/** Executable `.ts`, shebang `#!/bin/sh`, prints a marker only `sh` can produce. */
const DECLARES_SH = join(FIXTURES, "declares-sh.ts");

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "acc-target-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

/** Write a file with `content`, optionally making it executable. */
function fixture(name: string, content: string, exec = false): string {
  const path = join(dir, name);
  writeFileSync(path, content);
  if (exec) chmodSync(path, 0o755);
  return path;
}

// THE REGRESSION. If the `.ts`-means-bun override returns, both halves of this fail: `argv0`
// gains "bun", and bun produces no output at all from a file whose only statement is `export {}`.
test("an executable .ts whose shebang names sh is launched as itself, and sh is what runs it", () => {
  expect(toTarget(DECLARES_SH).argv0).toEqual([DECLARES_SH]);

  const run = spawnSync(DECLARES_SH, [], { encoding: "utf8" });
  expect(run.status).toBe(0);
  expect(run.stdout).toContain("acc-fixture-interpreter: sh");
});

test("...and the same file run through bun does NOT produce that marker", () => {
  // The falsification, stated as its own test: without this, "the marker appeared" would be
  // consistent with bun having run the file and printed it, and the test above would prove
  // nothing about which interpreter was used.
  const run = spawnSync("bun", [DECLARES_SH], { encoding: "utf8" });
  expect(run.stdout).not.toContain("acc-fixture-interpreter: sh");
});

test("an executable file with no extension and no bun shebang is launched as itself", () => {
  const path = fixture("plain", "#!/bin/sh\necho hi\n", true);
  expect(toTarget(path).argv0).toEqual([path]);
});

test("an executable script with an unrelated interpreter keeps it", () => {
  const path = fixture("deno-cli.ts", "#!/usr/bin/env -S deno run -A\nconsole.log(1);\n", true);
  expect(toTarget(path).argv0).toEqual([path]);
});

// Bun is named in argv0 whenever bun is what will run the file, INCLUDING when the kernel would
// have done the naming: A6's guard keys on the launcher, and Bun swallows the probe's leading
// `--` either way. A target that honours `--` perfectly used to collect a FAIL because of it.
test.each([
  ["#!/usr/bin/env bun", "env-bun"],
  ["#!/usr/bin/env -S bun run", "env-s-bun"],
  ["#!/opt/homebrew/bin/bun", "absolute-bun"],
])("an executable bun script (%s) is still launched through bun", (shebang, name) => {
  const path = fixture(name, `${shebang}\nconsole.log("hi");\n`, true);
  expect(toTarget(path).argv0).toEqual(["bun", path]);
});

test("a bun CLI installed without a .ts extension is recognised by its shebang", () => {
  const path = join(dir, "acc-noext");
  copyFileSync(join(FIXTURES, "conforming.ts"), path);
  chmodSync(path, 0o755);
  expect(toTarget(path).argv0).toEqual(["bun", path]);
});

// A near-miss basename must not match: `bunx` is not bun, and a node under a `bun`-ish directory
// is not bun either. Both would make A6 report `unverified` on a target that never touches Bun.
test.each(["#!/usr/bin/env bunx", "#!/home/bunny/bin/node"])(
  "%s does not count as bun",
  (shebang) => {
    const path = fixture("near-miss", `${shebang}\n`, true);
    expect(toTarget(path).argv0).toEqual([path]);
  },
);

// A file with no exec bit is a SOURCE file, not a program, and bun is the documented fallback
// for running one — but only when nothing else is declared.
test("a non-executable .ts with no shebang falls back to bun", () => {
  const path = fixture("source.ts", "console.log('hi');\n");
  expect(toTarget(path).argv0).toEqual(["bun", path]);
});

test("a non-executable .ts declaring bun falls back to bun", () => {
  const path = fixture("source.ts", "#!/usr/bin/env bun\nconsole.log('hi');\n");
  expect(toTarget(path).argv0).toEqual(["bun", path]);
});

test("a non-executable .ts declaring another interpreter gets no fallback", () => {
  // Launched as itself, it fails to spawn, and `record()` reports TargetNotExecutableError —
  // an honest "chmod +x it" rather than a verdict about a program nobody asked us to build.
  const path = fixture("deno-source.ts", "#!/usr/bin/env deno\nconsole.log(1);\n");
  expect(toTarget(path).argv0).toEqual([path]);
});

test("a non-executable file that is not .ts gets no fallback either", () => {
  const path = fixture("script.sh", "#!/bin/sh\necho hi\n");
  expect(toTarget(path).argv0).toEqual([path]);
});

test("the path is always resolved to an absolute one", () => {
  const t = toTarget("src/acc/cli.ts");
  expect(t.path.startsWith("/")).toBe(true);
  expect(t.path.endsWith("/src/acc/cli.ts")).toBe(true);
});
