import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkRelease, defaultLsRemote, type LsRemote, parseTags } from "./release.ts";

/**
 * NO NETWORK. Two layers, both offline:
 *   - the pure layers (parseTags, checkRelease) take an injected runner;
 *   - the REAL runner is exercised against a local bare repo with real tags, so the
 *     ls-remote parsing is proven against git's actual output rather than a string a test
 *     author imagined. `git ls-remote` on a filesystem path is a local operation.
 */

function sh(args: string[], cwd: string) {
  const p = Bun.spawnSync(args, { cwd, stdout: "pipe", stderr: "pipe" });
  if (p.exitCode !== 0) {
    throw new Error(`${args.join(" ")} failed: ${new TextDecoder().decode(p.stderr)}`);
  }
}

/** A real repo with two real tags — the fixture the brief asked for. */
function makeTaggedRepo(tags: string[]): string {
  const root = mkdtempSync(join(tmpdir(), "acc-release-"));
  sh(["git", "init", "-q", "."], root);
  sh(["git", "config", "user.email", "t@t"], root);
  sh(["git", "config", "user.name", "t"], root);
  Bun.write(join(root, "f.txt"), "x\n");
  sh(["git", "add", "-A"], root);
  sh(["git", "commit", "-qm", "init"], root);
  for (const t of tags) sh(["git", "tag", t], root);
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
    const empty = mkdtempSync(join(tmpdir(), "acc-norepo-"));
    try {
      expect(defaultLsRemote(empty).code).not.toBe(0);
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });
});
