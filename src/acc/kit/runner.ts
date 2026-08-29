import { type ChildProcessByStdio, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Readable, Writable } from "node:stream";
import { assertInert } from "./inert.ts";
import type { Invocation, Observation, TargetInfo } from "./types.ts";

/**
 * Stable id over everything that affects the result, so two checkers asking for the same probe
 * share one recording.
 *
 * `repeat` is the one field in here that the target never sees (see `Invocation.repeat`): it
 * exists solely to keep a deliberate repetition out of the dedup, which is what lets C3 ask
 * "does the SAME invocation answer the same way" instead of perturbing the argv to get past
 * `record()`. Everything else in this hash is something the child observes.
 */
export function invocationId(inv: Invocation): string {
  const material = JSON.stringify({ args: inv.args, env: inv.env ?? {}, repeat: inv.repeat ?? 0 });
  return createHash("sha256").update(material).digest("hex").slice(0, 12);
}

export const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * How long after the kill the runner still waits for Node's `close` event before resolving
 * anyway.
 *
 * `close` fires only once the process has exited AND every stdio stream has ended. A descendant
 * we could not reach — one that called `setsid` itself, or a Windows grandchild — can hold the
 * inherited pipe open indefinitely, and the promise would wait with it. That is exactly the R1-1
 * defect one level down: the deadline would still be a signal rather than a bound.
 *
 * 250ms is far more than SIGKILL needs (the kernel reaps immediately; this is only the time for
 * pending `data` events already in flight to drain), and small enough that the advertised
 * deadline stays a deadline. Past it the streams are being held by something outside our
 * control, and continuing to wait would trade a correct measurement for none at all.
 */
const FINALIZE_GRACE_MS = 250;

/**
 * Capture ceilings, per stream and combined.
 *
 * The target is an unknown binary and its output is unbounded by construction: nothing stops a
 * noisy — or hostile — CLI from writing until the runner's heap is gone, and `record()` holds
 * every observation for the whole run, so the cost compounds across probes rather than being
 * paid once.
 *
 * 4 MiB is chosen against MEASURED legitimate output, not guessed: the largest thing an L0 probe
 * can honestly elicit is help or a machine-mode schema dump, and the biggest observed here are
 * `git help -a` at ~12 KB and `acc --help --json` at ~4.6 KB. 4 MiB is roughly 350x the largest
 * of those, so no truthful CLI is ever truncated by it. The combined ceiling exists because two
 * per-stream limits alone would permit ~8 MiB; 6 MiB caps a target that splits its flood evenly.
 * Worst case a hostile target can pin is therefore ~(probe count x 6 MiB) ~= 120 MiB for the
 * current catalogue — bounded, where the previous behaviour was not.
 */
export const MAX_STREAM_BYTES = 4 * 1024 * 1024;
export const MAX_OUTPUT_BYTES = 6 * 1024 * 1024;

/**
 * The evidence for one captured stream: what a reader sees, and what a checker compares.
 *
 * Both halves are computed from the SAME Buffer, in this order, because the order is the whole
 * fix. The decode is lossy — `0x80`, `0x81` and `0xC8` are three different invalid bytes and all
 * three become one `U+FFFD` — so a digest taken after it would hash the collapse rather than the
 * capture and separate nothing (review R6-1). Digest the bytes, then render them.
 *
 * `lossy` is the round trip: re-encode the string and compare. It is true for invalid UTF-8 and
 * for a `truncated` capture cut mid-code-point, and it is what stops `stdout` from being read as
 * the evidence when it is only a rendering of it.
 */
export function streamEvidence(bytes: Buffer): { text: string; digest: string; lossy: boolean } {
  const text = bytes.toString("utf8");
  return {
    text,
    digest: createHash("sha256").update(bytes).digest("hex"),
    lossy: !Buffer.from(text, "utf8").equals(bytes),
  };
}

/**
 * The digest a stream of exactly this text would have, for a hand-built observation.
 *
 * Test histories are written as string literals, and a digest that did not follow from the text
 * beside it would be a lie in the fixture — the kind of unfalsifiable data this project exists to
 * fail on. Only sound for a stream that IS valid UTF-8 (`lossy: false`); an observation standing
 * in for invalid bytes must be built from a Buffer through `streamEvidence` instead.
 */
export function digestOfText(text: string): string {
  return createHash("sha256").update(Buffer.from(text, "utf8")).digest("hex");
}

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
 * The deadline bounds a process TREE, not a process. Targets are launched in their own process
 * group (`detached`) and the GROUP is killed, because SIGKILL to the direct child does not close
 * a pipe a descendant inherited, and Node's `close` waits for the streams: a target that
 * backgrounded a `sleep 30` holding stdout took 30 seconds against a 50ms deadline. See
 * `killTree` for the platform limit.
 *
 * Every probe runs in a FRESH TEMPORARY DIRECTORY, removed afterwards. The kit's probes name
 * nothing a verb-dispatching CLI declares, which is a reduction in risk rather than a proof of
 * inertness, and `inert.ts` cannot prove anything at all about a CLI whose root positional is
 * free-form data — while inheriting the caller's cwd meant a misjudged probe wrote into the
 * user's project. This does not make an unsafe probe safe — it
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

  // THE LAUNCH COMPENSATION. Bun strips one bare `--` per BUN LAYER between the launcher and the
  // script, so a probe whose argv leads with the terminator never delivers it and A6 measured A1
  // wearing A6's name. We send one extra; bun eats it; the target receives `inv.args` exactly as
  // a non-bun target does.
  //
  // Here rather than in the checker's `probes()` because `invocationId` hashes `{args, env,
  // repeat}` and `compare` keys `byProbe` on that id: compensating in `args` would fork the bun
  // population's A6 evidence id and file the rule as NOT ALIGNED on exactly the mixed fleet the
  // comparison exists to serve.
  //
  // THE GUARANTOR IS `toTarget`, NOT BUN. Stripping is one per layer, and this compensates by
  // one; that is correct only while `argv0` names at most one NAMED bun layer, which `toTarget`
  // (src/acc/commands/check.ts) is the sole producer of and check.test.ts asserts. A bun layer
  // hidden behind a wrapper script — `argv0 = [abs]`, so `cmd !== "bun"` — is invisible here and
  // stays uncompensated; that is a pre-existing limit of what `toTarget` can see, not something
  // this change introduces. Measured on bun 1.4.0 — see
  // docs/plans/2026-08-29-a6-reaches-the-bun-population.md Appendix B.
  //
  // If a future bun stops stripping, the survivor is ITSELF a terminator: an honouring target
  // reads it as a positional after an honoured `--` and still passes, a non-honouring one still
  // meets the sentinel and still fails by name. The probe's shape degrades, not its verdict.
  //
  // The predicate matches the literal token `"bun"` — the only form `toTarget` ever emits — so
  // an absolute-path launcher (e.g. `/usr/bin/bun`) is not compensated. That is consistent with
  // the rest of the kit rather than an oversight: nothing else here recognises bun by realpath.
  const compensated = cmd === "bun" && inv.args[0] === "--";
  const wireArgs = compensated ? ["--", ...inv.args] : inv.args;

  // Created before the promise so a failure to make the sandbox is a thrown error, not a
  // probe that quietly runs in the caller's project directory instead.
  const sandbox = mkdtempSync(join(tmpdir(), "acc-probe-"));

  return new Promise<Observation>((resolve) => {
    const startedAt = performance.now();
    let firstByteAt: number | null = null;
    // Buffers, decoded ONCE at the end — never `string += chunk`.
    //
    // Appending a Buffer to a string decodes that chunk in isolation, so a UTF-8 sequence split
    // across two writes becomes replacement characters on both sides of the boundary: a target
    // that emitted `€` in two writes was recorded as `��`. That is fabricated evidence
    // — it can invent a difference for D4, and it corrupts the bytes quoted in any finding.
    // Concatenating first and decoding the whole capture is the only version that cannot get a
    // boundary wrong (`StringDecoder` is the streaming equivalent; this needs the byte counts
    // anyway, so it keeps the buffers).
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let truncated = false;
    let timedOut = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let graceTimer: ReturnType<typeof setTimeout> | undefined;
    // `resolve` is idempotent, but `finish` is not: it also removes the sandbox and reads timing.
    // Three paths can now reach it (close, error, the finalisation fallback), so the guard is
    // explicit rather than leaning on the promise swallowing the second call.
    let settled = false;

    const finish = (code: number | null, signal: string | null, spawnFailed = false) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      if (graceTimer) clearTimeout(graceTimer);
      // `force` so a probe that already removed its own cwd doesn't turn cleanup into a crash;
      // the recording is the point, and a leftover temp directory is not worth losing it over.
      rmSync(sandbox, { recursive: true, force: true });
      // Digested BEFORE the decode, from the same Buffers, because the decode is where two
      // different byte streams become one string. See `streamEvidence`.
      const out = streamEvidence(Buffer.concat(stdoutChunks));
      const err = streamEvidence(Buffer.concat(stderrChunks));
      resolve({
        id: invocationId(inv),
        invocation: inv,
        purposes: [inv.purpose],
        ...(compensated
          ? {
              launchAdjustment: `one \`--\` was prepended for the bun launcher and consumed before delivery; the wire argv was ${JSON.stringify([cmd, ...base, ...wireArgs])}`,
            }
          : {}),
        stdout: out.text,
        stderr: err.text,
        stdoutBytes,
        stderrBytes,
        stdoutDigest: out.digest,
        stderrDigest: err.digest,
        stdoutLossy: out.lossy,
        stderrLossy: err.lossy,
        truncated,
        // A process WE killed did not choose its status. Recording 128+n as the target's exit
        // code would fabricate evidence about a tool that never got to exit — and that is as
        // true of the output-limit kill as it is of the deadline, so `truncated` nulls it too.
        //
        // A SIGNAL death is already null here, straight from Node, and stays that way for the
        // same reason: 128+n is a SHELL convention, not the target's answer. POSIX guarantees
        // only "greater than 128" for a signal death (see
        // docs/wiki/decisions/exit-codes-below-125.md), so synthesising the exact number would
        // put a code in the record that neither the target nor the standard ever chose. What
        // the null needed was not a value but a companion — `signal` and `crashed` below.
        exitCode: timedOut || truncated ? null : code,
        signal,
        // Terminated by a signal THE KIT DID NOT SEND.
        //
        // `signal` alone cannot carry this: `killTree` sends SIGKILL, so a hung probe and an
        // output-ceiling kill report a signal exactly as a segfaulting target does, and a
        // checker reading the raw field would call all three the same thing. Both kit-sent
        // kills are already flagged before the kill lands (`timedOut` in the deadline timer,
        // `truncated` in `enforceLimits`), which is what makes this subtraction sound: whatever
        // signal is left over came from outside. `spawnFailed` needs no term — a process that
        // never started reports no signal at all.
        //
        // Without it, a target that dies on every probe is recorded exactly as one we killed:
        // `exitCode: null` satisfies every "exited non-zero" test and empty streams satisfy
        // every "stdout was empty" test, and a fixture whose whole body is `kill -SEGV $$`
        // collected NINE passes it did nothing to earn. See `crashedUnverified` in finding.ts.
        crashed: signal !== null && !timedOut && !truncated,
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
      child = spawn(cmd, [...base, ...wireArgs], {
        stdio: ["pipe", "pipe", "pipe"],
        cwd: sandbox,
        env: { ...process.env, ...inv.env },
        // POSIX only (Node ignores it for signalling purposes on Windows): makes the child the
        // leader of a new process group, which is what gives `killTree` a group to signal.
        // It does NOT change what the target sees on stdin — stdin is still the pipe closed
        // below, so E1's contract (a target waiting on input hits the deadline rather than
        // hanging forever) is unaffected.
        detached: process.platform !== "win32",
      });
    } catch {
      finish(127, null, true);
      return;
    }

    /**
     * Kill the target and everything it spawned.
     *
     * A negative pid signals the whole process group, which on POSIX is what `detached: true`
     * above created. Killing only the direct child leaves any descendant holding the inherited
     * stdout/stderr pipe, and Node's `close` event waits for those streams — which is how a
     * 50ms deadline became a 30-second probe.
     *
     * WINDOWS IS NOT COVERED. Windows has no POSIX process groups, `process.kill` there
     * terminates only the named process, and killing a tree needs `taskkill /T` or a job object
     * — neither of which this runner does today. On Windows the group kill is skipped and the
     * deadline degrades to what it was before: a signal to the direct child, backstopped by the
     * finalisation fallback below, which still bounds the PROBE even though the descendant may
     * outlive it. Stated rather than implied, because a deadline that silently does less than it
     * claims on one platform is the same defect class this kit exists to report.
     */
    const killTree = () => {
      if (process.platform !== "win32" && child.pid !== undefined) {
        // ESRCH once the group is already gone — a race we win either way, so it is not an error.
        try {
          process.kill(-child.pid, "SIGKILL");
        } catch {
          /* group already reaped */
        }
      }
      // Windows' only path, and a harmless no-op on POSIX once the group kill has landed.
      child.kill("SIGKILL");

      // The bound that holds regardless of what the kill reached. A descendant that escaped the
      // group (it called setsid itself, or this is Windows) still owns the write end of our
      // pipes, so `close` may never arrive; resolve on a hard timer instead and tear down the
      // handles so a live pipe cannot keep the event loop — or the caller — alive.
      graceTimer = setTimeout(() => {
        child.stdout.destroy();
        child.stderr.destroy();
        child.stdin.destroy();
        child.unref();
        // No signal recorded, because none was OBSERVED: `close` never arrived, so nothing told
        // us how the process ended. Naming our own SIGKILL here would be a guess dressed as an
        // observation. Nothing is lost — this path is reachable only from `killTree`, and both
        // of its callers have already set `timedOut` or `truncated`, which is what a checker
        // reads.
        finish(null, null);
      }, FINALIZE_GRACE_MS);
    };

    const mark = () => {
      if (firstByteAt === null) firstByteAt = performance.now();
    };

    /**
     * Append what fits under both ceilings; kill the target the moment either is reached.
     *
     * The partial chunk IS kept: truncating at the exact byte gives a prefix that is still a
     * faithful record of what the target wrote, which is what lets a checker call a violation it
     * can already see in the prefix (see `truncatedUnverified` in finding.ts). The cut can land
     * mid-code-point, and the decode will show that as a replacement character at the very end —
     * honest for a capture that is explicitly flagged `truncated`, unlike the boundary corruption
     * this rewrite removed, which appeared in the MIDDLE of intact output.
     */
    const absorb = (chunks: Buffer[], own: number, chunk: Buffer, streamLimit: number): number => {
      mark();
      const headroom = Math.min(streamLimit - own, MAX_OUTPUT_BYTES - (stdoutBytes + stderrBytes));
      if (headroom <= 0) return own;
      if (chunk.length <= headroom) {
        chunks.push(chunk);
        return own + chunk.length;
      }
      chunks.push(chunk.subarray(0, headroom));
      return own + headroom;
    };

    const enforceLimits = () => {
      if (truncated) return;
      if (
        stdoutBytes >= MAX_STREAM_BYTES ||
        stderrBytes >= MAX_STREAM_BYTES ||
        stdoutBytes + stderrBytes >= MAX_OUTPUT_BYTES
      ) {
        // Recorded BEFORE the kill, so `finish` sees it however the process ends: a target left
        // running would keep filling the heap the limit exists to protect.
        truncated = true;
        killTree();
      }
    };

    child.stdout.on("data", (d: Buffer) => {
      stdoutBytes = absorb(stdoutChunks, stdoutBytes, d, MAX_STREAM_BYTES);
      enforceLimits();
    });
    child.stderr.on("data", (d: Buffer) => {
      stderrBytes = absorb(stderrChunks, stderrBytes, d, MAX_STREAM_BYTES);
      enforceLimits();
    });
    child.stdin.end();

    timer = setTimeout(() => {
      timedOut = true;
      killTree();
    }, timeoutMs);

    // BOTH arguments, always. Node calls this `(code, signal)` and exactly one of them is
    // non-null; dropping the second meant a target that DIED was recorded identically to one we
    // killed, because `exitCode` is null either way. See `Observation.crashed`.
    child.on("close", (code, signal) => finish(code, signal));
    // A target that cannot be spawned at all (ENOENT, EACCES, a file with no exec bit) is an
    // observation too, not a crash — but it must be FLAGGED as one. 127 alone is a code a real
    // CLI can choose to return, so without `spawnFailed` a file that never executed is
    // indistinguishable from one that ran and answered; see Observation.spawnFailed.
    //
    // Both `error` and `close` fire for an async failure (ENOENT). `error` lands first, and the
    // promise is already settled by the time `close` arrives, so the `spawnFailed` recording is
    // the one that survives — resolve() is a no-op the second time and rmSync is `force`.
    child.on("error", () => finish(127, null, true));
  });
}
