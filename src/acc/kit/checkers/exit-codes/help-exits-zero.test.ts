import { beforeAll, describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { record } from "../../record.ts";
import { AMBIGUOUS_SIGNALS, FAULT_SIGNALS } from "../../signals.ts";
import type { History, Observation, TargetInfo } from "../../types.ts";
import { helpExitsZeroChecker } from "./help-exits-zero.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (rel: string): TargetInfo => {
  const p = join(HERE, "../../fixtures", rel);
  return { path: p, argv0: ["bun", p] };
};

describe("C1 — help exits zero", () => {
  test("PASSES the conforming fixture", async () => {
    const h = await record(fixture("conforming.ts"), [helpExitsZeroChecker]);
    const f = helpExitsZeroChecker.check(h);
    expect(f.verdict).toBe("pass");
    expect(f.ruleId).toBe("C1");
  });

  // The negative control. `broken/accepts-extra-positionals.ts` treats `-h` as an unrecognised
  // flag (only the literal `--help` is special-cased) and exits 2 instead of 0 — a real C1
  // violation, unlike `broken/exits-zero-on-unknown-flag.ts`, which exits 0 on every invocation
  // including `-h` and so would pass this checker despite being broken in other respects.
  test("FAILS a CLI whose -h is not recognised as help", async () => {
    const h = await record(fixture("broken/accepts-extra-positionals.ts"), [helpExitsZeroChecker]);
    const f = helpExitsZeroChecker.check(h);
    expect(f.verdict).toBe("fail");
    expect(f.detail).toContain("-h");
    expect(f.ruleId).toBe("C1");
  });

  test("cites the observations backing its verdict", async () => {
    const h = await record(fixture("conforming.ts"), [helpExitsZeroChecker]);
    const f = helpExitsZeroChecker.check(h);
    expect(f.evidence.length).toBeGreaterThan(0);
    for (const id of f.evidence) expect(h.byId.has(id)).toBe(true);
  });
});

// C1'S CRASH EXCEPTION, SIGNAL BY SIGNAL.
//
// C1 is one of two rules that judge how a process ENDED rather than what a probe established, so
// it reads the same taxonomy G1 does (signals.ts) and reaches the same two answers. It did not
// always: while G1 was being split into `fail` on the fault signals and `unverified` on the rest
// (review R6-2), C1 was left as "THE ONE EXCEPTION to crashedUnverified" and kept failing on ANY
// signal — so the false positive R6-2 identified did not go away, it moved from G1 to C1, and
// `dies-by-sigterm.sh` measured `G1 … cannot attribute` on one line and `C1 fail --help died on
// SIGTERM` on the next. An outer CI timeout that kills the process group produces exactly that
// recording for every probe of an arbitrary, blameless target.
//
// Built by mutating a REAL recording of the conforming fixture rather than a synthesised history,
// for the reason crash.test.ts gives: only a genuinely conforming target produces the `pass` these
// cases have to move away from, so a mistake here shows up as the wrong verdict rather than as a
// verdict that was never earned.
describe("C1 — a help path that ended on a signal", () => {
  let base: History;
  beforeAll(async () => {
    base = await record(fixture("conforming.ts"), [helpExitsZeroChecker]);
  }, 60_000);

  /** The fields runProbe writes for a signal death: no status the target chose, the signal that
   *  ended it, and `crashed` — which is what separates this from the kit's own SIGKILL. */
  const asCrashed = (o: Observation, signal: string): Observation => ({
    ...o,
    stdout: "",
    stderr: "",
    exitCode: null,
    signal,
    crashed: true,
    timedOut: false,
    truncated: false,
    timeToFirstByteMs: null,
  });

  /** `base` with each named invocation replaced by the ending it is keyed to — a signal name, or
   *  an exit code for the ordinary-violation cases. Keyed on args because dedup can merge one
   *  recording across several requesters, which is exactly what should happen to it. */
  function endedAs(spec: Record<string, string | number>): History {
    const observations = base.observations.map((o) => {
      const how = spec[o.invocation.args.join(" ")];
      if (how === undefined) return o;
      return typeof how === "number" ? { ...o, exitCode: how } : asCrashed(o, how);
    });
    return { ...base, observations, byId: new Map(observations.map((o) => [o.id, o])) };
  }

  test("the base recording is one C1 passes, so every case below moves away from a pass", () => {
    // Guards the whole describe. If the fixture stopped conforming, an assertion of `fail` would
    // hold for a reason that has nothing to do with signals.
    expect(helpExitsZeroChecker.check(base).verdict).toBe("pass");
  });

  test.each([...FAULT_SIGNALS])("%s is the target's own fault, so help FAILED", (signal) => {
    const f = helpExitsZeroChecker.check(endedAs({ "--help": signal, "-h": signal }));
    expect(f.verdict).toBe("fail");
    // The signal, never the absent exit code: "exited null" describes a status the target never
    // chose, and is the wording that let a crash read as a clean rejection in the first place.
    expect(f.detail).toContain(`--help died on ${signal} instead of exiting`);
  });

  test.each([...AMBIGUOUS_SIGNALS])(
    "%s could have come from outside, so C1 reports the gap",
    (signal) => {
      // The narrowing itself. Widen this back to `o.crashed` and every case here goes red — which
      // is the point: an operator's Ctrl-C, an outer deadline and an OOM kill produce the same
      // recording a conforming tool produces when something else kills it.
      const f = helpExitsZeroChecker.check(endedAs({ "--help": signal, "-h": signal }));
      expect(f.verdict).toBe("unverified");
      expect(f.detail).toContain(signal);
    },
  );

  test.each(["SIGUSR1", "SIGWINCH", "SIGRTMIN+3", "SIGWHATEVER"])(
    "%s is unrecognised, so it falls to the safe side rather than becoming a violation",
    (signal) => {
      // Membership of FAULT_SIGNALS, never absence from AMBIGUOUS_SIGNALS — asked once in
      // `isFaultSignal` so C1 and G1 cannot answer it differently. Written the other way round,
      // every signal name this kit has not met would be a violation.
      expect(helpExitsZeroChecker.check(endedAs({ "--help": signal })).verdict).toBe("unverified");
    },
  );

  test("one probe faulting and another ending ambiguously still FAILS", () => {
    // THE PRECEDENCE RULE, and it is the one `does-not-crash.ts` already argues for: a fault is a
    // completed observation of a violation the target committed, and a second probe ending on a
    // signal nobody can source does not undo it. Asserted in both orderings so the answer cannot
    // depend on which observation the loop happens to reach first.
    for (const spec of [
      { "--help": "SIGSEGV", "-h": "SIGTERM" },
      { "--help": "SIGTERM", "-h": "SIGSEGV" },
    ]) {
      const f = helpExitsZeroChecker.check(endedAs(spec));
      expect([JSON.stringify(spec), f.verdict]).toEqual([JSON.stringify(spec), "fail"]);
      expect(f.detail).toContain("SIGSEGV");
      // Only the fault is named. Listing the ambiguous death beside it would put the sentence
      // this fix removed — "died on SIGTERM instead of exiting" — back on the same report line.
      expect(f.detail).not.toContain("SIGTERM");
    }
  });

  test("an ordinary violation on one probe outranks an unattributable signal on the other", () => {
    // Same precedence, arrived at from the other side: help that exited 2 exited 2, whatever an
    // outer deadline did to `-h`. This is why `crashedUnverified` is called AFTER the loop here
    // rather than before it, which is the inverse of every checker that does not own crashes.
    const f = helpExitsZeroChecker.check(endedAs({ "--help": 2, "-h": "SIGTERM" }));
    expect(f.verdict).toBe("fail");
    expect(f.detail).toContain("--help exited 2");
  });

  test("one ambiguous death among clean probes is a gap, not a pass and not a violation", () => {
    // The single-probe case, which is the shape an interrupted run actually takes: `--help`
    // answered, `-h` was killed. Neither `pass` (that probe established nothing) nor `fail`
    // (nobody can say who sent it) is available, and the finding cites only the probe in doubt.
    const h = endedAs({ "-h": "SIGTERM" });
    const f = helpExitsZeroChecker.check(h);
    expect(f.verdict).toBe("unverified");
    expect(f.detail).toContain("-h: SIGTERM");
    const killed = h.observations.filter((o) => o.crashed).map((o) => o.id);
    expect(f.evidence).toEqual(killed);
  });
});
