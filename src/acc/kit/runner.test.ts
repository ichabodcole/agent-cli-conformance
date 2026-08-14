import { describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SENTINEL } from "./inert.ts";
import { invocationId, runProbe } from "./runner.ts";
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

  test("closes stdin so a target waiting on input cannot hang", async () => {
    // A target invoked with `--help` never reads stdin, so it would pass this test whether or
    // not stdin was closed. `read` blocks on an open stdin and returns immediately on EOF, so
    // this is the shape that actually proves the pipe was closed rather than left dangling.
    const reader: TargetInfo = { path: "sh", argv0: ["sh", "-c", "read line; echo done"] };
    const o = await runProbe(reader, inv([`--${SENTINEL}`], "sentinel"));
    expect(o.timedOut).toBe(false);
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
});
