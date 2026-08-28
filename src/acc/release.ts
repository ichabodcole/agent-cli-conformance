/**
 * Is the INSTALLED kit the current release?
 *
 * WHY THIS EXISTS AS A MEASUREMENT AND NOT A NOTE IN A GUIDE. An unpinned
 * `bun add -d git+ssh://…` delivered 0.1.0 to an adopter reading 0.1.1 docs, at exit 0, and cost
 * them a workstream. The documented remedy (`bun remove` + a pinned `bun add`, and on
 * `git+ssh://` a `bun pm cache rm` first) works — but it cannot prove it worked: nothing bun
 * prints during an upgrade distinguishes a real reinstall from a silent no-op, and
 * `bun pm cache rm` reported "Cleared 0 cached 'bunx' packages" on a machine that WAS poisoned,
 * while the git-clone cache it needed to clear reports nothing at all. Only the version after
 * reinstall settles it, so this has to BE the proof step.
 *
 * WHY `git ls-remote` AND NOT THE GITHUB API. It needs nothing the caller does not already
 * have: the repository is public, so an anonymous `https` read answers with no credential at
 * all, and the documented install line is the same transport. No token, no `gh`, no API client.
 * Measured at ~1.4s.
 *
 * AND WHY IT IS AN INDEPENDENT MEASUREMENT: `ls-remote` talks to the remote directly. It does
 * not read bun's bare-clone cache, which is the thing that lied in the incident. A check that
 * consulted the same cache would agree with it and prove nothing.
 */

/** What a check can conclude. `checked: false` is a STATE, not a failure — see versionCommand. */
export type ReleaseCheck =
  | {
      checked: true;
      installed: string;
      latest: string;
      latestSha: string;
      upToDate: boolean;
    }
  | {
      checked: false;
      /**
       * TWO WAYS TO NOT KNOW, kept distinct because they send the reader to different repairs.
       * `unreachable` is about the network; `unparseable-version` is about this build. Collapsing
       * them would tell someone with a malformed install to check their connection.
       */
      reason: "unreachable" | "unparseable-version";
      detail: string;
      attempted: string[];
    };

/** One `git ls-remote` invocation, injectable so the tests never touch the network. */
export type LsRemote = (remote: string) => { code: number; stdout: string; stderr: string };

/**
 * The two spellings of the same repository.
 *
 * https is tried FIRST because it is the transport the documented install line uses and the one
 * that needs nothing: the repository is public, so an anonymous read succeeds with no ssh key,
 * no credential helper and no token — measured, including with the global git config disabled.
 * That is the case a CI runner and a sandboxed agent are in.
 *
 * ssh stays as the fallback rather than being deleted. It is what a contributor with a key
 * already uses, it is unaffected by an https proxy that blocks or rewrites github.com, and this
 * repository was private until recently — a reader on an older kit, or a fork that is still
 * private, is served by the second entry.
 */
const PUBLISHED_REMOTES = [
  "https://github.com/ichabodcole/agent-cli-conformance.git",
  "git@github.com:ichabodcole/agent-cli-conformance.git",
] as const;

/**
 * `ACC_RELEASE_REMOTE` overrides both, and it is not a debug hook.
 *
 * The published example `acc version --check` has to RUN in the conformance suite — this project
 * refuses to excuse an example from being executed, on the argument that copy-pasteable text
 * which does not work is worse than none. But the suite must not touch the network. Both hold if
 * the remote is substitutable: the test points this at a local bare repo carrying real tags, the
 * example runs end to end, and nothing leaves the machine. It is the same move as standing a
 * fixture in for `./mycli` in `check`'s examples.
 *
 * It also happens to be what a fork needs, which is a reason to keep it rather than the reason it
 * exists.
 */
export function remotes(): readonly string[] {
  const override = process.env.ACC_RELEASE_REMOTE;
  return override ? [override] : PUBLISHED_REMOTES;
}

/**
 * The default runner.
 *
 * `GIT_TERMINAL_PROMPT=0` is the ANTI-HANG mechanism and the reason trying two remotes is safe:
 * without it, a git transport that wants a credential blocks on a username prompt forever,
 * inside a command someone ran to answer a question. With it, that attempt exits 128 in
 * milliseconds and the fallback proceeds. Measured both ways, against this repository while it
 * was private. It is kept now that an anonymous read succeeds, because the guard is about what
 * happens when a read does NOT succeed — a fork, a proxy, a revoked key — and that is exactly
 * when nobody is watching the terminal.
 */
export function defaultLsRemote(remote: string): { code: number; stdout: string; stderr: string } {
  const p = Bun.spawnSync(["git", "ls-remote", "--tags", "--refs", remote], {
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  });
  return {
    code: p.exitCode ?? 1,
    stdout: new TextDecoder().decode(p.stdout),
    stderr: new TextDecoder().decode(p.stderr),
  };
}

/** `<sha>\trefs/tags/v1.2.3` → the tags, newest first. Anything not `vX.Y.Z` is ignored. */
export function parseTags(stdout: string): { tag: string; sha: string; parts: number[] }[] {
  const rows: { tag: string; sha: string; parts: number[] }[] = [];
  for (const line of stdout.split("\n")) {
    const m = /^([0-9a-f]{40})\s+refs\/tags\/v(\d+)\.(\d+)\.(\d+)$/.exec(line.trim());
    if (!m) continue;
    rows.push({
      tag: `v${m[2]}.${m[3]}.${m[4]}`,
      sha: m[1] as string,
      parts: [Number(m[2]), Number(m[3]), Number(m[4])],
    });
  }
  return rows.sort((a, b) => cmp(b.parts, a.parts));
}

const cmp = (a: number[], b: number[]) =>
  (a[0] ?? 0) - (b[0] ?? 0) || (a[1] ?? 0) - (b[1] ?? 0) || (a[2] ?? 0) - (b[2] ?? 0);

/**
 * Compare the installed version against the newest published tag.
 *
 * A version NEWER than any tag is reported `upToDate: true`: that is a maintainer working ahead
 * of a release, and telling them they are stale would be false.
 */
export function checkRelease(
  installed: string,
  lsRemote: LsRemote = defaultLsRemote,
): ReleaseCheck {
  const attempted: string[] = [];
  const details: string[] = [];
  for (const remote of remotes()) {
    attempted.push(remote);
    const r = lsRemote(remote);
    if (r.code !== 0) {
      details.push(`${remote}: ${firstLine(r.stderr) || `git exited ${r.code}`}`);
      continue;
    }
    const tags = parseTags(r.stdout);
    if (!tags.length) {
      details.push(`${remote}: no vX.Y.Z tags found`);
      continue;
    }
    const latest = tags[0] as { tag: string; sha: string; parts: number[] };
    const mine = /^(\d+)\.(\d+)\.(\d+)/.exec(installed);
    if (!mine) {
      // AN UNPARSEABLE INSTALLED VERSION IS NOT EVIDENCE OF STALENESS. This used to fall to
      // `upToDate: false`, which reports "a newer release exists" and exits 10 — asserting a
      // negative nothing established, in the one command whose whole argument is that it
      // verifies rather than believes. Reachable only on a malformed build, and that is the
      // build least able to afford a confident wrong answer.
      return {
        checked: false,
        reason: "unparseable-version",
        detail: `the installed version ${JSON.stringify(installed)} is not X.Y.Z, so it cannot be compared against ${latest.tag}`,
        attempted,
      };
    }
    const upToDate = cmp([Number(mine[1]), Number(mine[2]), Number(mine[3])], latest.parts) >= 0;
    return {
      checked: true,
      installed,
      latest: latest.tag,
      latestSha: latest.sha,
      upToDate,
    };
  }
  return { checked: false, reason: "unreachable", detail: details.join("; "), attempted };
}

const firstLine = (s: string) =>
  s
    .split("\n")
    .find((l) => l.trim())
    ?.trim() ?? "";
