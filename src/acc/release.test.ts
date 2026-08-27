import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { disposableBase, gitFixture } from "./kit/git-fixture-env.ts";
import { checkRelease, defaultLsRemote, type LsRemote, parseTags } from "./release.ts";

/**
 * NO NETWORK. Two layers, both offline:
 *   - the pure layers (parseTags, checkRelease) take an injected runner;
 *   - the REAL runner is exercised against a local bare repo with real tags, so the
 *     ls-remote parsing is proven against git's actual output rather than a string a test
 *     author imagined. `git ls-remote` on a filesystem path is a local operation.
 */

/**
 * A real repo with two real tags — the fixture the brief asked for.
 *
 * EVERY git call goes through `gitFixture`, and the base comes from `disposableBase()`. An
 * earlier version of this file spawned git directly with an inherited environment, and under a
 * pre-commit hook run from a linked worktree that `git init` re-initialised the repository these
 * tests live in and set `core.bare = true` on it. See git-fixture-env.ts for the mechanism; the
 * short version is that a hand-run gate cannot show you this, because the variable that causes it
 * is supplied only by the hook.
 */
function makeTaggedRepo(tags: string[]): string {
  const root = mkdtempSync(join(disposableBase(), "acc-release-"));
  gitFixture(["init", "-q", "."], root);
  gitFixture(["config", "user.email", "t@t"], root);
  gitFixture(["config", "user.name", "t"], root);
  writeFileSync(join(root, "f.txt"), "x\n");
  gitFixture(["add", "-A"], root);
  gitFixture(["commit", "-qm", "init"], root);
  for (const t of tags) gitFixture(["tag", t], root);
  return root;
}

describe("parseTags", () => {
  test("reads git's own ls-remote output, newest first", () => {
    const out = [
      "82a7d5dee3f89fa228c001082e28525473d0792f\trefs/tags/v0.1.0",
      "e210e0194f1d71479b7cb2f78dec18d9b1e919f7\trefs/tags/v0.1.1",
    ].join("\n");
    expect(parseTags(out).map((t) => t.tag)).toEqual(["v0.1.1", "v0.1.0"]);
    expect(parseTags(out)[0]?.sha).toBe("e210e0194f1d71479b7cb2f78dec18d9b1e919f7");
  });

  test("orders by SEMVER, not lexically — v0.10.0 is newer than v0.9.0", () => {
    const out = [
      `${"a".repeat(40)}\trefs/tags/v0.9.0`,
      `${"b".repeat(40)}\trefs/tags/v0.10.0`,
    ].join("\n");
    expect(parseTags(out)[0]?.tag).toBe("v0.10.0");
  });

  test("ignores anything that is not vX.Y.Z", () => {
    const out = [
      `${"a".repeat(40)}\trefs/tags/v0.1.0`,
      `${"b".repeat(40)}\trefs/tags/nightly`,
      `${"c".repeat(40)}\trefs/tags/v1.2.3-rc1`,
    ].join("\n");
    expect(parseTags(out).map((t) => t.tag)).toEqual(["v0.1.0"]);
  });
});

describe("checkRelease", () => {
  const ok =
    (stdout: string): LsRemote =>
    () => ({ code: 0, stdout, stderr: "" });
  const two = [`${"a".repeat(40)}\trefs/tags/v0.1.0`, `${"b".repeat(40)}\trefs/tags/v0.1.1`].join(
    "\n",
  );

  test("behind the newest tag", () => {
    const r = checkRelease("0.1.0", ok(two));
    expect(r).toMatchObject({
      checked: true,
      installed: "0.1.0",
      latest: "v0.1.1",
      upToDate: false,
    });
  });

  test("on the newest tag", () => {
    expect(checkRelease("0.1.1", ok(two))).toMatchObject({ upToDate: true, latest: "v0.1.1" });
  });

  test("AHEAD of every tag is up to date, not stale — a maintainer working before a release", () => {
    expect(checkRelease("0.2.0", ok(two))).toMatchObject({ upToDate: true });
  });

  test("unreachable is a STATE, not an error, and names every remote it tried", () => {
    const fail: LsRemote = () => ({
      code: 128,
      stdout: "",
      stderr: "fatal: could not read Username",
    });
    const r = checkRelease("0.1.1", fail);
    expect(r.checked).toBe(false);
    if (r.checked) throw new Error("unreachable");
    expect(r.reason).toBe("unreachable");
    expect(r.attempted).toHaveLength(2); // ssh then https
    expect(r.detail).toContain("could not read Username");
  });

  test("falls back to the second remote when the first fails", () => {
    let calls = 0;
    const flaky: LsRemote = () => {
      calls += 1;
      return calls === 1
        ? { code: 128, stdout: "", stderr: "fatal: Could not read from remote repository" }
        : { code: 0, stdout: two, stderr: "" };
    };
    expect(checkRelease("0.1.1", flaky)).toMatchObject({ checked: true, latest: "v0.1.1" });
    expect(calls).toBe(2);
  });

  test("a reachable remote with no version tags is unreachable-shaped, not a false 'up to date'", () => {
    const r = checkRelease("0.1.1", ok(`${"a".repeat(40)}\trefs/tags/nightly`));
    expect(r.checked).toBe(false);
  });
});

describe("defaultLsRemote (real git, local path — still no network)", () => {
  test("reads real tags out of a real repository", () => {
    const repo = makeTaggedRepo(["v0.1.0", "v0.1.1"]);
    try {
      const r = defaultLsRemote(repo);
      expect(r.code).toBe(0);
      expect(parseTags(r.stdout).map((t) => t.tag)).toEqual(["v0.1.1", "v0.1.0"]);
      // and end to end through the comparison
      expect(checkRelease("0.1.0", () => r)).toMatchObject({ upToDate: false, latest: "v0.1.1" });
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  test("a path that is not a repository fails without hanging", () => {
    const empty = mkdtempSync(join(disposableBase(), "acc-norepo-"));
    try {
      expect(defaultLsRemote(empty).code).not.toBe(0);
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });
});
