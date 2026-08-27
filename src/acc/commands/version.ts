import { emit, type OutputMode } from "../envelope.ts";
import { Outcome } from "../exit-codes.ts";
import { checkRelease } from "../release.ts";
import { VERSION } from "../version.ts";

/**
 * The version, as a FIELD rather than a bare string.
 *
 * D1 requires machine mode to carry the version in a structured payload, and commander's
 * built-in `--version` handling wrote `0.0.0` and exited before the envelope existed. That
 * escaped the positive control too, because the D1 checker probes only plain `--version` — in a
 * terminal that is text mode, where a bare string is exactly right.
 *
 * Text mode keeps the bare string on purpose: `acc --version` in a shell should be pipeable
 * into a comparison, and wrapping it would break every script that reads it.
 */
/*
 * No `startedAt`, deliberately — see schemaCommand for the argument. `--version` is answered
 * from a constant; a duration beside it measures the runtime's startup, not the answer.
 */
export function versionCommand(mode: OutputMode): void {
  emit({
    mode,
    command: "--version",
    data: { name: "acc", version: VERSION },
    next: [{ exec: "acc", args: ["schema"], when: "to see the surface this version implements" }],
    renderText: (d) => d.version,
  });
}

/**
 * `acc version` — the installed version, and with `--check` whether it is the current release.
 *
 * A SEPARATE VERB, NOT PART OF `--version`, and that is a hard constraint rather than taste: the
 * D1 checker probes `--version` on every target, so a network call there would fire during every
 * dogfooding run and make this CLI's own version path non-inert — the kit failing a property it
 * asks of everyone else.
 *
 * THREE OUTCOMES, and the exit codes are chosen from this project's own bands (see exit-codes.ts:
 * 1-8 = why the invocation failed, 9-123 = what the subject turned out to be):
 *
 *   up to date        exit 0            the answer is yes
 *   newer release     exit 10 (Stale)   the invocation succeeded, the answer is negative
 *   COULD NOT CHECK   exit 0            no network, no key, remote unreachable — or the
 *                                       installed version is not X.Y.Z and cannot be compared
 *
 * The third is the one that is easy to get wrong. It is NOT a failure: nothing about the
 * invocation was wrong, and a network blip must not put an alarming line in someone's first run.
 * It is reported as a plain state — `checked: false` — on `ok: true`, and it exits 0 so no gate
 * turns red because a laptop was on a plane.
 *
 * ⚠ WHAT THIS CANNOT SEE, and the output says so. It catches staleness that SPANS A RELEASE and
 * nothing else. A stale extracted package at the SAME version but different bytes — failure mode
 * 3 in how-to-fix-a-broken-install.md — is invisible to it, because the only thing compared is a
 * version string against a tag name. The one thing worse than no check is a check trusted further
 * than it reaches.
 */
export function versionVerbCommand(
  opts: { check: boolean },
  mode: OutputMode,
  startedAt: number,
): void {
  if (!opts.check) {
    emit({
      mode,
      command: "version",
      startedAt,
      // `checked` is ABSENT here, not `false`. Without `--check` nothing looked; with `--check`
      // and an unreachable remote something looked and could not tell. Part 3 of the standard
      // requires those to be distinguishable, and this command would otherwise collapse "I did
      // not look" into "I looked and failed" — in the CLI that argues for the distinction.
      data: { name: "acc", version: VERSION },
      next: [
        {
          exec: "acc",
          args: ["version", "--check"],
          when: "to compare it against the newest release",
        },
      ],
      renderText: (d) => d.version,
    });
    return;
  }

  const result = checkRelease(VERSION);
  if (result.checked && !result.upToDate) process.exitCode = Outcome.Stale;

  emit({
    mode,
    command: "version",
    startedAt,
    data: { name: "acc", version: VERSION, ...result },
    next:
      result.checked && !result.upToDate
        ? [
            {
              exec: "bun",
              args: [
                "add",
                "-d",
                `git+ssh://git@github.com/ichabodcole/agent-cli-conformance.git#${result.latest}`,
              ],
              when: "to install the newest release, pinned",
            },
          ]
        : [],
    renderText: (d) =>
      d.checked
        ? d.upToDate
          ? `acc ${d.installed} is the current release (${d.latest})`
          : [
              `acc ${d.installed} is BEHIND — the newest release is ${d.latest} (${d.latestSha.slice(0, 7)})`,
              "",
              "  Reinstall pinned, then re-run this to confirm it took:",
              `    bun add -d git+ssh://git@github.com/ichabodcole/agent-cli-conformance.git#${d.latest}`,
              "",
              "  Only the version after reinstall proves the cache cleared; the cache commands do not.",
            ].join("\n")
        : [
            `acc ${VERSION} installed — COULD NOT CHECK for a newer release.`,
            `  ${d.detail}`,
            // The closing line names the reason rather than assuming the network one. Telling
            // someone with a malformed install that the remote was unreachable sends them to
            // debug a connection that worked.
            d.reason === "unparseable-version"
              ? "  This is not a failure: the remote answered, but this build's version cannot be compared."
              : "  This is not a failure: the remote was unreachable, not your invocation.",
          ].join("\n"),
  });
}
