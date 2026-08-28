import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { disposableBase, gitFixture } from "../kit/git-fixture-env.ts";
import { VERSION } from "../version.ts";
import { upgradeSteps } from "./version.ts";

/**
 * `acc version --check`'s REMEDY, which has twice been wrong in the situation it is offered in.
 *
 * FIRST it was a bare pinned `bun add` and nothing else, which left the duplicate key in place;
 * both adopter trials followed it and the second reported the resulting failure as their top
 * friction item. THEN it grew a `bun pm cache rm` — correct for the `git+ssh://` transport, but
 * the sequence prints a `git+https://` line, and for a public github.com repo on bun 1.4.0 that
 * transport writes no bare clone at all, so the step wiped the caller's entire global cache to
 * clear an artifact that was never written.
 *
 * The guard both failures need is the same one, and it is NOT "a cache step is present". It is:
 * every command in the sequence must be the remedy for a failure that reproduces on the transport
 * the sequence prints, ordered so it works, and provable afterwards. That is what these tests
 * assert — order (`remove` before `add`, because a second entry under one key resolves to the old
 * kit at exit 0), pinning, the closing `--check`, and, for any destructive whole-cache step that
 * anyone reinstates, that its cost travels with it.
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
  test("the steps remove before installing, pin, and confirm afterwards", () => {
    const steps = upgradeSteps("v9.9.9");
    const line = (s: { exec: string; args: string[] }) => [s.exec, ...s.args].join(" ");
    const rendered = steps.map(line);
    const removeAt = rendered.findIndex((l) => l.includes("remove"));
    const addAt = rendered.findIndex((l) => l.includes(" add "));
    // ORDER IS THE FIX FOR THE FAILURE THAT REPRODUCES EVERYWHERE. Adding over an existing entry
    // appends a duplicate key and resolves the FIRST one — the old kit, at exit 0, with the
    // duplicate committed for CI to install from.
    expect(removeAt).toBeGreaterThanOrEqual(0);
    expect(addAt).toBeGreaterThan(removeAt);
    // Pinned, because the check only settles anything against a named tag.
    expect(rendered[addAt]).toContain("#v9.9.9");
    // A caller who runs what we hand them must end up able to see whether it worked.
    expect(rendered[rendered.length - 1]).toContain("version --check");
  });

  test("the sequence prints one transport and carries no remedy belonging to another", () => {
    // `bun pm cache rm` is the `git+ssh://` remedy. On bun 1.4.0 against this public github.com
    // repository the documented `git+https://` line normalises to `github:owner/repo` and writes
    // no bare clone, so the step would wipe the caller's WHOLE global cache to clear an artifact
    // that was never written. Both conditions — that bun version, a public github.com repo — are
    // load-bearing; if either changes, re-measure before this assertion is relaxed.
    const steps = upgradeSteps("v9.9.9");
    const rendered = steps.map((s) => [s.exec, ...s.args].join(" "));
    expect(rendered.some((c) => c.includes("git+https://"))).toBe(true);
    expect(rendered.some((c) => c.includes("git+ssh://"))).toBe(false);
    expect(rendered.some((c) => c.includes("pm cache rm"))).toBe(false);
  });

  test("any whole-cache step, if one is ever reinstated, states its cost on itself", () => {
    // The guard the old cache-step tests provided, kept as a conditional invariant rather than
    // deleted: `next` is advisory and nothing in the envelope classifies effects, so the only
    // place a destructive step's cost can travel is its own `when`. Vacuous today by design —
    // it becomes load-bearing the moment someone adds the step back.
    for (const step of upgradeSteps("v9.9.9")) {
      if (!step.args.join(" ").includes("pm cache rm")) continue;
      expect(step.when).toMatch(/whole|entire|all of/i);
      expect(step.when).toMatch(/CI|build step/i);
    }
  });

  test("json: a stale check hands over the whole sequence, not just the install", async () => {
    const r = await run(["version", "--check", "--json"]);
    const env = JSON.parse(r.stdout);
    expect(env.data.upToDate).toBe(false);
    const cmds = (env.next as Array<{ exec: string; args: string[] }>).map((n) =>
      [n.exec, ...n.args].join(" "),
    );
    expect(cmds.some((c) => c.includes("remove"))).toBe(true);
    expect(cmds.some((c) => c.includes(`#v${NEWER}`))).toBe(true);
    expect(cmds[cmds.length - 1]).toContain("version --check");
    expect(cmds.some((c) => c.includes("pm cache rm"))).toBe(false);
  }, 30_000);

  test("text: the remedy shown is the one the json hands over, step for step", async () => {
    // These drifted apart once already — the text branch told the reader that "the cache
    // commands do not" prove anything while never printing a cache command at all. So assert the
    // whole sequence, not a sample of it: every step the machine gets is a line a human sees.
    const r = await run(["version", "--check", "--format", "text"]);
    expect(r.stdout).toContain("BEHIND");
    expect(r.stdout).toContain(`#v${NEWER}`);
    for (const step of upgradeSteps(`v${NEWER}`)) {
      expect(r.stdout).toContain([step.exec, ...step.args].join(" "));
    }
  }, 30_000);
});
