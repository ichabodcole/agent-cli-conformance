import { tmpdir } from "node:os";
import { isAbsolute, resolve } from "node:path";

/**
 * Running git in a TEST FIXTURE, without touching the repository the tests live in.
 *
 * The three occurrences and the mechanism are recorded in `docs/reports/2026-08-27-the-repository-went-bare-three-times.md`.
 *
 * This is the third occurrence's fix. The guard was written once, in `harness.test.ts`, and two
 * new `git init` sites on a feature branch did not have it — because having it required the
 * author to remember, and remembering is what failed. Defining it once and importing it is the
 * weaker half of the repair; the durable half is a check that FAILS a test which spawns git with
 * `GIT_DIR` set, and that is repo-wide work rather than a feature branch's.
 *
 * WHAT GOES WRONG WITHOUT IT. A pre-commit hook run from a linked worktree exports `GIT_DIR`
 * absolute at the worktree's git-dir, `GIT_INDEX_FILE` beside it, and — decisively — NO
 * `GIT_WORK_TREE`. A fixture's `git init` inherits that, re-initialises the git-dir it was handed,
 * cannot determine a work tree for it, and records `core.bare = true`. Worktrees share one config
 * file, so that lands on the MAIN checkout, which then answers every command with
 * `fatal: this operation must be run in a work tree`. Measured three times on this repository.
 *
 * It is invisible to a hand-run gate: with no hook there is no `GIT_DIR`, the fixtures build their
 * own repos in tmp, and the suite is honestly green. The input that matters is supplied only by
 * the hook, so a green `bun run check` is NOT evidence that a fixture is safe here.
 */

/**
 * Every `GIT_*` stripped — broader than the measured danger, deliberately. The exported set is
 * git's to change, and a fixture that runs git has no business inheriting any of it.
 */
export const GIT_FREE_ENV = Object.fromEntries(
  Object.entries(process.env).filter(([k]) => !k.startsWith("GIT_")),
) as Record<string, string>;

/**
 * A base directory that is definitely not inside the working tree, CHECKED BEFORE anything is
 * created so a bad `TMPDIR` leaves no litter in the repository it was trying to avoid.
 *
 * `tmpdir()` reads `TMPDIR`, and a relative value puts `mkdtempSync` in the process cwd — which,
 * under a pre-commit hook, is the repository root. The env strip above closes the route that
 * depends on inheritance; this closes the one that does not.
 *
 * It throws rather than relocating: a suite that quietly moves its fixtures is a suite whose
 * location nobody can reason about.
 */
export function disposableBase(): string {
  const base = resolve(tmpdir());
  if (!isAbsolute(base) || base === "/")
    throw new Error(`TMPDIR does not resolve to a usable absolute path: ${tmpdir()}`);
  const cwd = resolve(process.cwd());
  if (base === cwd || base.startsWith(`${cwd}/`))
    throw new Error(
      `TMPDIR resolves to ${base}, inside the working directory ${cwd}. These tests run git and must never do so against a repository they did not create`,
    );
  return base;
}

/** Spawn with the git environment stripped. Never `Bun.spawnSync` directly in a fixture. */
export function shGitFree(
  args: string[],
  cwd: string,
): { code: number; stdout: string; stderr: string } {
  const p = Bun.spawnSync(args, { cwd, stdout: "pipe", stderr: "pipe", env: GIT_FREE_ENV });
  return {
    code: p.exitCode ?? 1,
    stdout: new TextDecoder().decode(p.stdout),
    stderr: new TextDecoder().decode(p.stderr),
  };
}

/**
 * A fixture git command that REFUSES TO CONTINUE if it failed.
 *
 * Nothing checked these at the two sites this module exists for. `git init`, `git add` and
 * `git commit` could each fail and the fixture would carry on as though it held a repository,
 * which turns a fixture defect into a mystery somewhere downstream.
 */
export function gitFixture(args: string[], cwd: string): void {
  const r = shGitFree(["git", ...args], cwd);
  if (r.code !== 0)
    throw new Error(`fixture setup failed: git ${args.join(" ")} in ${cwd}\n${r.stderr}`);
}
