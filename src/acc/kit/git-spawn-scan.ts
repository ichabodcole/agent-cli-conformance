/**
 * A SOURCE-LEVEL check that a fixture cannot spawn git with the environment it inherited.
 *
 * The incident this exists for, including the three confident explanations of it that were
 * wrong, is recorded in `docs/reports/2026-08-27-the-repository-went-bare-three-times.md`.
 *
 * WHY THIS IS NOT A BEHAVIOURAL TEST, which is the whole design and was established by
 * measurement rather than argument. The damage needs `GIT_DIR` in the environment, and only a
 * pre-commit hook supplies it. Run by hand there is no `GIT_DIR`, the fixtures build their own
 * repositories in a temp directory, and an unguarded suite is HONESTLY GREEN — that is not a
 * flake, it is the state that hid this bug three times, including a full gate run minutes before
 * the commit that bricked the checkout. A test that only fires under a hook fires nowhere anyone
 * looks.
 *
 * So this reads the SHAPE OF THE CALL instead of the result of running it. It fails in a plain
 * `bun test`, on any machine, with no hook and no `GIT_DIR` anywhere.
 *
 * WHAT IT BINDS TO, stated because it is the weakness. It matches source text, which is the same
 * class of instrument as recognising an error by its message: it works until someone writes the
 * call in a shape it does not recognise. Two consequences, both deliberate:
 *
 *   - It FAILS CLOSED. A spawn it cannot classify, in a file that mentions git at all, is a
 *     failure to look at rather than a pass.
 *   - The allowlist takes a REASON, printed on failure, so an entry is a decision somebody made
 *     rather than a silence.
 */

/** A spawn call site the scan could not clear. */
export type GitSpawnFinding = {
  file: string;
  line: number;
  kind: "unguarded-git" | "unclassifiable";
  snippet: string;
};

/**
 * Sites deliberately exempt, each with the reason it is safe. A path here is a claim someone
 * checked, so it carries the measurement rather than a name.
 */
export const ALLOWLIST: Record<string, string> = {
  "src/acc/kit/git-fixture-env.ts":
    "the guard's own home — the one place permitted to spawn git directly, because it is what supplies the stripped environment to everyone else",
  "src/acc/release.ts":
    "`git ls-remote` against an EXPLICIT remote URL, in production rather than a fixture. It creates and initialises nothing, and was measured unaffected by an inherited GIT_DIR: identical output and exit 0 with and without one, and neither repository's core.bare moved",
};

const SPAWN =
  /\b(?:Bun\.spawnSync|Bun\.spawn|spawnSync|spawn|execFileSync|execSync|execFile)\s*\(/g;

/**
 * Does this file run git at all? Files that never do cannot spawn it by accident.
 *
 * THE OBVIOUS VERSION OF THIS WAS BACKWARDS, and it was caught by running the check against a
 * reintroduced copy of the real incident rather than by reading it. Keying only on a quoted
 * `"git"` literal meant a file that routes every git call through `gitFixture` — which is the
 * CORRECT shape, and removes the literal — stopped counting as git-running. The check went blind
 * on exactly the files that had taken the advice. Importing the guard is therefore the strongest
 * evidence a file runs git, not the weakest.
 */
const RUNS_GIT = /["'`]git["'`]|git-fixture-env|\b(?:gitFixture|shGitFree)\s*\(/;

/** The call's own text, from the opening paren to its match. */
function callText(src: string, from: number): string {
  let depth = 0;
  for (let i = src.indexOf("(", from); i < src.length; i++) {
    if (src[i] === "(") depth++;
    else if (src[i] === ")") {
      depth--;
      if (depth === 0) return src.slice(from, i + 1);
    }
  }
  return src.slice(from);
}

/**
 * Findings for ONE file's source. Pure, so the suite can feed it a source string that does not
 * exist on disk — which is how the check proves it can still fire.
 */
export function scanSource(file: string, src: string): GitSpawnFinding[] {
  if (ALLOWLIST[file]) return [];
  const out: GitSpawnFinding[] = [];
  const runsGit = RUNS_GIT.test(src);
  for (const m of src.matchAll(SPAWN)) {
    const call = callText(src, m.index);
    const line = src.slice(0, m.index).split("\n").length;
    // `env: GIT_FREE_ENV` is the only spelling that clears a call. One symbol, so a second copy
    // of the filtering logic cannot quietly count as guarded — copies are what failed here.
    if (call.includes("GIT_FREE_ENV")) continue;
    const spawnsGit = /\(\s*\[\s*["']git["']/.test(call) || /\(\s*["']git["']\s*,/.test(call);
    // The command is an identifier, so its value is not visible here.
    const opaque = /\(\s*(?:\[\s*)?[A-Za-z_$][\w$]*\s*[,\]]/.test(call);
    if (spawnsGit) out.push({ file, line, kind: "unguarded-git", snippet: call.slice(0, 120) });
    else if (opaque && runsGit)
      out.push({ file, line, kind: "unclassifiable", snippet: call.slice(0, 120) });
  }
  return out;
}

/** The sentence a failure prints, naming the repair rather than only the offence. */
export function explain(f: GitSpawnFinding): string {
  const how =
    f.kind === "unguarded-git"
      ? "spawns git while inheriting this process's environment"
      : "spawns a command this scan cannot identify, in a file that also runs git";
  return [
    `${f.file}:${f.line} ${how}.`,
    `    ${f.snippet.replace(/\s+/g, " ")}`,
    "    Route it through `gitFixture` or `shGitFree` in src/acc/kit/git-fixture-env.ts,",
    "    or add the file to ALLOWLIST in git-spawn-scan.ts with the reason it is safe.",
  ].join("\n");
}
