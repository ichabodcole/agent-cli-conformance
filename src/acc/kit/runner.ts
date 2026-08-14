import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
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
 */
export async function runProbe(
  target: TargetInfo,
  inv: Invocation,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Observation> {
  assertInert(inv);

  const [cmd, ...base] = target.argv0;
  if (!cmd) throw new Error("target has an empty argv0");

  return new Promise<Observation>((resolve) => {
    const startedAt = performance.now();
    let firstByteAt: number | null = null;
    const child = spawn(cmd, [...base, ...inv.args], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, ...inv.env },
    });

    let stdout = "";
    let stderr = "";
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

    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    const finish = (code: number | null) => {
      clearTimeout(timer);
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
        durationMs: Math.round(performance.now() - startedAt),
        timeToFirstByteMs: firstByteAt === null ? null : Math.round(firstByteAt - startedAt),
      });
    };

    child.on("close", finish);
    // A target that cannot be spawned at all (ENOENT) is an observation too, not a crash.
    child.on("error", () => finish(127));
  });
}
