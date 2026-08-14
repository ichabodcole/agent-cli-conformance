import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SENTINEL } from "./inert.ts";
import { invocationId, MAX_OUTPUT_BYTES, MAX_STREAM_BYTES, runProbe } from "./runner.ts";
import type { Invocation, TargetInfo } from "./types.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const CONFORMING: TargetInfo = {
  path: join(HERE, "fixtures/conforming.ts"),
  argv0: ["bun", join(HERE, "fixtures/conforming.ts")],
};

const inv = (args: string[], inertness: Invocation["inertness"]): Invocation => ({
  args,
  inertness,
  purpose: "test",
});

describe("runProbe", () => {
  test("captures stdout, exit code and timing for a help path", async () => {
    const o = await runProbe(CONFORMING, inv(["--help"], "help-path"));
    expect(o.exitCode).toBe(0);
    expect(o.stdout).toContain("usage:");
    expect(o.stderr).toBe("");
    expect(o.timedOut).toBe(false);
    expect(o.timeToFirstByteMs).toBeGreaterThanOrEqual(0);
  });

  test("keeps the two streams separate", async () => {
    const o = await runProbe(CONFORMING, inv(["--acc-probe-xyzzy-flag"], "sentinel"));
    expect(o.exitCode).toBe(2);
    expect(o.stdout).toBe("");
    expect(o.stderr).toContain("acc-probe-xyzzy");
  });

  test("refuses a non-inert invocation rather than running it", async () => {
    await expect(runProbe(CONFORMING, inv(["list", "--help"], "help-path"))).rejects.toThrow(
      /not inert/i,
    );
  });

  // R1-1: the deadline has to bound a process TREE. SIGKILL to the direct child does not close a
  // pipe a descendant inherited, and Node's `close` waits for the streams — so a target that
  // backgrounded a `sleep` holding stdout ran for as long as the SLEEP, not as long as the
  // deadline. Measured against the old runner this fixture took ~10s for a 500ms deadline.
  //
  // The bound below is deliberately loose (5x the deadline) so a loaded machine cannot make it
  // flaky, and still an order of magnitude under the descendant's lifetime, so it fails hard if
  // the group kill is ever removed.
  test("the deadline bounds the whole process tree, not just the direct child", async () => {
    const fixture = join(HERE, "fixtures/spawns-surviving-descendant.ts");
    const target: TargetInfo = { path: fixture, argv0: ["bun", fixture] };
    const startedAt = performance.now();
    const o = await runProbe(target, inv([`--${SENTINEL}`], "sentinel"), 500);
    const wall = performance.now() - startedAt;
    expect(o.timedOut).toBe(true);
    // The status is still null, not 128+9. We killed the group; nothing in it chose a status.
    expect(o.exitCode).toBeNull();
    expect(wall).toBeLessThan(2_500);
  }, 30_000);

  test("reports a timeout as exitCode null, never as a signal code", async () => {
    // `sleep 30 --acc-probe-xyzzy` exits immediately: sleep rejects the extra operand instead
    // of sleeping. Wrapping in `sh -c` makes the extra arg become $0 for the script, which
    // ignores it and sleeps regardless — so the deadline actually gets exercised.
    const sleeper: TargetInfo = { path: "sh", argv0: ["sh", "-c", "sleep 30"] };
    const o = await runProbe(sleeper, inv(["--acc-probe-xyzzy"], "sentinel"), 300);
    expect(o.timedOut).toBe(true);
    expect(o.exitCode).toBeNull();
  });

  // The distinction that keeps a non-executable file out of the report: 127 alone is a status
  // a real CLI can choose, so "never ran" has to be recorded as its own fact.
  test("flags a target that cannot be spawned, rather than recording an ordinary exit 127", async () => {
    const notExecutable = join(HERE, "fixtures/conforming.ts"); // real file, no exec bit
    const o = await runProbe({ path: notExecutable, argv0: [notExecutable] }, inv([], "bare"));
    expect(o.spawnFailed).toBe(true);
    expect(o.exitCode).toBe(127);
    expect(o.timedOut).toBe(false);
  });

  test("a target that really runs is never flagged as spawn-failed", async () => {
    const o = await runProbe(CONFORMING, inv(["--help"], "help-path"));
    expect(o.spawnFailed).toBe(false);
  });

  // Bounding the blast radius: probes used to inherit the caller's cwd, so a probe that turned
  // out not to be inert wrote into the user's project. This does not make an unsafe probe safe,
  // it makes an unsafe probe survivable.
  test("runs each probe in a fresh temporary directory, not the caller's cwd", async () => {
    const pwd: TargetInfo = { path: "sh", argv0: ["sh", "-c", "pwd"] };
    const a = await runProbe(pwd, inv([`--${SENTINEL}`], "sentinel"));
    const b = await runProbe(pwd, inv([`--${SENTINEL}-two`], "sentinel"));
    expect(a.stdout.trim()).not.toBe(process.cwd());
    expect(a.stdout.trim()).toContain("acc-probe-");
    // A fresh one per probe, so one probe cannot leave state another one reads.
    expect(a.stdout.trim()).not.toBe(b.stdout.trim());
  });

  test("removes the temporary directory once the probe finishes", async () => {
    const pwd: TargetInfo = { path: "sh", argv0: ["sh", "-c", "pwd"] };
    const o = await runProbe(pwd, inv([`--${SENTINEL}`], "sentinel"));
    expect(existsSync(o.stdout.trim())).toBe(false);
  });

  test("closes stdin so a target waiting on input cannot hang", async () => {
    // A target invoked with `--help` never reads stdin, so it would pass this test whether or
    // not stdin was closed. `read` blocks on an open stdin and returns immediately on EOF, so
    // this is the shape that actually proves the pipe was closed rather than left dangling.
    const reader: TargetInfo = { path: "sh", argv0: ["sh", "-c", "read line; echo done"] };
    const o = await runProbe(reader, inv([`--${SENTINEL}`], "sentinel"));
    expect(o.timedOut).toBe(false);
  });
});

// R2-3, first half: the runner used to do `stdout += chunk`, which decodes each Buffer on its
// own. A UTF-8 sequence straddling two writes came back as replacement characters — evidence the
// target never produced. That can invent a difference for D4 and corrupts the bytes any finding
// quotes.
describe("runProbe — the capture is byte-faithful", () => {
  test("records a multi-byte character split across two writes, not replacement characters", async () => {
    // `€` is E2 82 AC. The first two bytes are written, then a pause long enough to guarantee a
    // separate `data` event, then the third — the exact boundary that used to be corrupted.
    const split: TargetInfo = {
      path: "sh",
      argv0: ["sh", "-c", 'printf "\\342\\202"; sleep 0.1; printf "\\254"'],
    };
    const o = await runProbe(split, inv([`--${SENTINEL}`], "sentinel"), 5_000);
    expect(o.stdout).toBe("€");
    expect([...o.stdout].map((c) => c.codePointAt(0))).toEqual([0x20ac]);
    // The byte count is of the BYTES, not of the JS string's UTF-16 units: `€` is one character
    // and three bytes, and conflating the two is how the old code got here.
    expect(o.stdoutBytes).toBe(3);
    expect(o.truncated).toBe(false);
  }, 15_000);

  test("counts bytes, not characters, on both streams", async () => {
    const both: TargetInfo = {
      path: "sh",
      argv0: ["sh", "-c", 'printf "héllo"; printf "wörld" >&2'],
    };
    const o = await runProbe(both, inv([`--${SENTINEL}`], "sentinel"), 5_000);
    expect(o.stdout).toBe("héllo");
    expect(o.stderr).toBe("wörld");
    expect(o.stdoutBytes).toBe(6);
    expect(o.stderrBytes).toBe(6);
  }, 15_000);
});

// R2-3, second half: capture was unbounded, so a noisy or hostile target could exhaust the
// runner's memory during the deadline window — the subject under test crashing the instrument.
describe("runProbe — output is bounded", () => {
  test("truncates and kills a target that floods one stream", async () => {
    const flood: TargetInfo = { path: "sh", argv0: ["sh", "-c", "yes acc-probe-flood"] };
    const startedAt = performance.now();
    const o = await runProbe(flood, inv([`--${SENTINEL}`], "sentinel"), 20_000);
    expect(o.truncated).toBe(true);
    expect(o.stdoutBytes).toBe(MAX_STREAM_BYTES);
    // The decoded text is the captured prefix and nothing else — the limit is a limit, and the
    // capture is still exactly the bytes the target wrote up to it.
    expect(Buffer.byteLength(o.stdout)).toBe(MAX_STREAM_BYTES);
    // Killed by the limit, not by the deadline: this must resolve long before 20s, and the two
    // reasons a probe can be cut short must stay distinguishable in the record.
    expect(o.timedOut).toBe(false);
    expect(performance.now() - startedAt).toBeLessThan(15_000);
    // Same rule as the deadline: we killed it, so it did not choose a status. Recording 128+9
    // here would fabricate an exit code exactly as the old timeout path would have.
    expect(o.exitCode).toBeNull();
  }, 40_000);

  test("caps the two streams TOGETHER, not just each on its own", async () => {
    // Two per-stream ceilings alone would permit 2 x MAX_STREAM_BYTES. The combined ceiling is
    // what a target splitting its flood across both streams runs into.
    const flood: TargetInfo = {
      path: "sh",
      argv0: ["sh", "-c", "yes acc-probe-flood-out & yes acc-probe-flood-err >&2"],
    };
    const o = await runProbe(flood, inv([`--${SENTINEL}`], "sentinel"), 20_000);
    expect(o.truncated).toBe(true);
    expect(o.stdoutBytes + o.stderrBytes).toBeLessThanOrEqual(MAX_OUTPUT_BYTES);
  }, 40_000);

  test("leaves an ordinary target unflagged", async () => {
    const o = await runProbe(CONFORMING, inv(["--help"], "help-path"));
    expect(o.truncated).toBe(false);
    expect(o.stdoutBytes).toBe(Buffer.byteLength(o.stdout));
    expect(o.stderrBytes).toBe(0);
  });
});

describe("invocationId", () => {
  test("is stable for identical invocations and differs otherwise", () => {
    expect(invocationId(inv(["--help"], "help-path"))).toBe(
      invocationId(inv(["--help"], "help-path")),
    );
    expect(invocationId(inv(["--help"], "help-path"))).not.toBe(
      invocationId(inv(["--version"], "help-path")),
    );
  });

  test("distinguishes invocations that differ only by env", () => {
    const a: Invocation = { args: ["--help"], inertness: "help-path", purpose: "p" };
    const b: Invocation = { ...a, env: { AI_AGENT: "probe" } };
    expect(invocationId(a)).not.toBe(invocationId(b));
  });

  // The whole point of `repeat`: it must reach the id, so record()'s dedup keeps a deliberate
  // repetition as N recordings, while reaching nothing the target can see. Without this, C3
  // cannot ask its own question — three identical probes collapse into one.
  test("distinguishes invocations that differ only by repeat", () => {
    const a: Invocation = { args: ["--help"], inertness: "help-path", purpose: "p" };
    expect(invocationId({ ...a, repeat: 1 })).not.toBe(invocationId({ ...a, repeat: 2 }));
  });

  // An absent `repeat` and `repeat: 0` are the same invocation, so adding the field to this
  // hash did not renumber every existing probe's id.
  test("an absent repeat hashes as 0", () => {
    const a: Invocation = { args: ["--help"], inertness: "help-path", purpose: "p" };
    expect(invocationId(a)).toBe(invocationId({ ...a, repeat: 0 }));
  });
});
