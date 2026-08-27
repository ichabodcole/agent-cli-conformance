import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { disposableBase, gitFixture } from "../kit/git-fixture-env.ts";
import { VERSION } from "../version.ts";
import { upgradeSteps } from "./version.ts";

/**
 * `acc version --check`'s REMEDY, which used to be one command our own documentation says always
 * fails.
 *
 * The hint offered a pinned `bun add` and nothing else. `how-to-fix-a-broken-install.md:117` says
 * of the stale-bare-clone refusal, in bold, "An upgrade always meets this one" — and this hint
 * appears only on an upgrade. Both adopter trials followed it and both got bun's `no commit
 * matching "v0.1.3" (but repository exists)`; the second reported it as their top friction item.
 *
 * So the assertion here is not "a hint exists" but "the hint clears the cache before installing",
 * which is the step whose absence made the old one fail.
 */

const CLI = join(dirname(import.meta.dir), "cli.ts");

let remote = "";
let base = "";
/** A version above the installed one, so the command takes its stale branch. */
const NEWER = `${Number(VERSION.split(".")[0]) + 1}.0.0`;

beforeAll(() => {
  base = mkdtempSync(join(disposableBase(), "acc-version-"));
  remote = join(base, "release-remote");
  mkdirSync(remote, { recursive: true });
  // Every git call goes through `gitFixture` — see `kit/git-fixture-env.ts`. A bare `git init`
  // here inherits a pre-commit hook's `GIT_DIR` and re-initialises the real checkout.
  gitFixture(["init", "-q", "."], remote);
  gitFixture(["config", "user.email", "t@t"], remote);
  gitFixture(["config", "user.name", "t"], remote);
  writeFileSync(join(remote, "f.txt"), "x\n");
  gitFixture(["add", "-A"], remote);
  gitFixture(["commit", "-qm", "init"], remote);
  gitFixture(["tag", `v${NEWER}`], remote);
});

afterAll(() => {
  if (base) rmSync(base, { recursive: true, force: true });
});

function run(args: string[]): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolve) => {
    // `ACC_RELEASE_REMOTE` is the documented substitution point, not a debug hook: the remote is
    // a parameter of this command, so a local repository with real tags stands in and the
    // command RUNS rather than being excused from the test.
    const child = spawn("bun", [CLI, ...args], {
      env: { ...process.env, ACC_RELEASE_REMOTE: remote },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => {
      stdout += d;
    });
    child.stderr.on("data", (d) => {
      stderr += d;
    });
    child.stdin.end();
    child.on("close", (code) => resolve({ stdout, stderr, code }));
  });
}

describe("the upgrade remedy", () => {
  test("the steps clear the cache before installing, and confirm afterwards", () => {
    const steps = upgradeSteps("v9.9.9");
    const line = (s: { exec: string; args: string[] }) => [s.exec, ...s.args].join(" ");
    const rendered = steps.map(line);
    const cacheAt = rendered.findIndex((l) => l.includes("pm cache rm"));
    const addAt = rendered.findIndex((l) => l.includes("add"));
    // ORDER IS THE WHOLE FIX. Installing before dropping the stale clone is exactly what both
    // adopters did, on our instructions, and it is what failed.
    expect(cacheAt).toBeGreaterThanOrEqual(0);
    expect(addAt).toBeGreaterThan(cacheAt);
    expect(rendered[addAt]).toContain("#v9.9.9");
    // A caller who runs what we hand them must end up able to see whether it worked.
    expect(rendered[rendered.length - 1]).toContain("version --check");
  });

  test("the cost of clearing the whole cache is stated on the step that does it", () => {
    // The guide is emphatic that `bun pm cache rm` takes no package argument and must not go in
    // a build step. `next` is advisory and nothing in the envelope classifies effects, so the
    // only place that warning can travel is the step's own `when`.
    const cache = upgradeSteps("v9.9.9").find((s) => s.args.join(" ").includes("pm cache rm"));
    expect(cache?.when ?? "").toMatch(/whole|entire|all of/i);
    expect(cache?.when ?? "").toMatch(/CI|build step/i);
  });

  test("json: a stale check hands over the whole sequence, not just the install", async () => {
    const r = await run(["version", "--check", "--json"]);
    const env = JSON.parse(r.stdout);
    expect(env.data.upToDate).toBe(false);
    const cmds = (env.next as Array<{ exec: string; args: string[] }>).map((n) =>
      [n.exec, ...n.args].join(" "),
    );
    expect(cmds.some((c) => c.includes("pm cache rm"))).toBe(true);
    expect(cmds.some((c) => c.includes(`#v${NEWER}`))).toBe(true);
  }, 30_000);

  test("text: the remedy shown is the one the json hands over", async () => {
    // These drifted apart once already — the text branch told the reader that "the cache
    // commands do not" prove anything while never printing a cache command at all.
    const r = await run(["version", "--check", "--format", "text"]);
    expect(r.stdout).toContain("BEHIND");
    expect(r.stdout).toContain("bun pm cache rm");
    expect(r.stdout).toContain(`#v${NEWER}`);
  }, 30_000);
});
