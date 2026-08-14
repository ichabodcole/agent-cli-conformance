import { type ChildProcessByStdio, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Readable, Writable } from "node:stream";
import { assertInert } from "./inert.ts";
import type { Invocation, Observation, TargetInfo } from "./types.ts";

/** Stable id over everything that affects the result, so two checkers asking for the same
 *  probe share one recording. */
export function invocationId(inv: Invocation): string {
  const material = JSON.stringify({ args: inv.args, env: inv.env ?? {} });
  return createHash("sha256").update(material).digest("hex").slice(0, 12);
}

export const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Run one probe and record what happened.
 *
 * Deadline is enforced IN-PROCESS. Shelling out to `timeout(1)` is a trap: it is GNU coreutils
 * and absent on stock macOS, where the call yields 127 and the probe silently measures nothing
 * while appearing to pass.
 *
 * stdin is closed immediately, so a target that waits for input hits the deadline instead of
 * hanging forever — which is itself the E1 finding.
 *
 * Every probe runs in a FRESH TEMPORARY DIRECTORY, removed afterwards. The kit's probes are
 * inert by construction against a verb-dispatching CLI, but `inert.ts` cannot prove anything
 * about a CLI whose root positional is free-form data, and inheriting the caller's cwd meant a
 * misjudged probe wrote into the user's project. This does not make an unsafe probe safe — it
 * bounds what an unsafe probe can reach, at no cost. Nothing bounds a network call.
 */
export async function runProbe(
  target: TargetInfo,
  inv: Invocation,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Observation> {
  assertInert(inv);

  const [cmd, ...base] = target.argv0;
  if (!cmd) throw new Error("target has an empty argv0");

  // Created before the promise so a failure to make the sandbox is a thrown error, not a
  // probe that quietly runs in the caller's project directory instead.
  const sandbox = mkdtempSync(join(tmpdir(), "acc-probe-"));

  return new Promise<Observation>((resolve) => {
    const startedAt = performance.now();
    let firstByteAt: number | null = null;
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const finish = (code: number | null, spawnFailed = false) => {
      if (timer) clearTimeout(timer);
      // `force` so a probe that already removed its own cwd doesn't turn cleanup into a crash;
      // the recording is the point, and a leftover temp directory is not worth losing it over.
      rmSync(sandbox, { recursive: true, force: true });
      resolve({
        id: invocationId(inv),
        invocation: inv,
        purposes: [inv.purpose],
        stdout,
        stderr,
        // A process WE killed did not choose its status. Recording 128+n as the target's exit
        // code would fabricate evidence about a tool that never got to exit.
        exitCode: timedOut ? null : code,
        timedOut,
        spawnFailed,
        durationMs: Math.round(performance.now() - startedAt),
        timeToFirstByteMs: firstByteAt === null ? null : Math.round(firstByteAt - startedAt),
      });
    };

    // Some spawn failures never reach the `error` event: an exec-bit-set file with no shebang,
    // and a wrong-architecture binary — the very thing the not-executable hint tells the caller
    // to check — make posix_spawn fail with ENOEXEC, which `spawn()` reports by THROWING
    // synchronously. Left uncaught that escaped record()'s abort entirely and surfaced as
    // `{"kind":"internal"}`, the wrong error class for a whole family of unexecutable targets.
    // Routing it through `finish` gives it the same `spawnFailed` recording as the async path.
    //
    // Typed to the stdio tuple below rather than to bare `ChildProcess`, so the three pipes stay
    // non-nullable and this keeps reading them without a `?.` that would hide a wiring mistake.
    let child: ChildProcessByStdio<Writable, Readable, Readable>;
    try {
      child = spawn(cmd, [...base, ...inv.args], {
        stdio: ["pipe", "pipe", "pipe"],
        cwd: sandbox,
        env: { ...process.env, ...inv.env },
      });
    } catch {
      finish(127, true);
      return;
    }

    const mark = () => {
      if (firstByteAt === null) firstByteAt = performance.now();
    };
    child.stdout.on("data", (d) => {
      mark();
      stdout += d;
    });
    child.stderr.on("data", (d) => {
      mark();
      stderr += d;
    });
    child.stdin.end();

    timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    child.on("close", (code) => finish(code));
    // A target that cannot be spawned at all (ENOENT, EACCES, a file with no exec bit) is an
    // observation too, not a crash — but it must be FLAGGED as one. 127 alone is a code a real
    // CLI can choose to return, so without `spawnFailed` a file that never executed is
    // indistinguishable from one that ran and answered; see Observation.spawnFailed.
    //
    // Both `error` and `close` fire for an async failure (ENOENT). `error` lands first, and the
    // promise is already settled by the time `close` arrives, so the `spawnFailed` recording is
    // the one that survives — resolve() is a no-op the second time and rmSync is `force`.
    child.on("error", () => finish(127, true));
  });
}
