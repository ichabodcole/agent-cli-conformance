// THE catalogue-wide invariant, second half: truncated evidence is a PREFIX, not a recording.
//
// The runner now stops capturing at an explicit byte ceiling and kills the target (see
// MAX_STREAM_BYTES in runner.ts). What is left is everything the target did write up to that
// byte, no exit code at all, and no information whatsoever about the rest. Read naively that is
// the timeout failure mode wearing different clothes: `exitCode` is null so `!== 0` holds, a
// scan for escapes or credentials over the part we kept finds nothing, and two prefixes that
// agree as far as they go look byte-identical.
//
// Written against the WHOLE registry rather than per checker, for the same reason timeouts.test
// is: the failure mode is one checker at a time being written without the guard, so the test
// that prevents a recurrence has to be one no new checker can be added without facing.

import { beforeAll, describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { record } from "./record.ts";
import { CHECKERS } from "./registry.ts";
import { digestOfText, invocationId } from "./runner.ts";
import type { Discovery, History, Observation, TargetInfo } from "./types.ts";

// Rich enough that every checker declares its probes — same shape as timeouts.test.ts, and for
// the same reason: a checker whose probes are empty would satisfy this suite vacuously.
const DISCOVERY: Discovery = {
  subcommands: ["list"],
  flags: ["--json", "--verbose"],
  machineModeFlag: "--json",
  helpReadable: true,
};

/** The fields runProbe writes when a capture ceiling ends a probe: the prefix it kept, no status
 *  (we killed it), and `timedOut: false` — a flood is not a hang, and the record keeps the two
 *  reasons distinguishable. */
const asTruncated = (o: Observation): Observation => ({
  ...o,
  truncated: true,
  exitCode: null,
  // The ceiling kill goes through `killTree` too, so this observation carries a signal as well —
  // and `crashed: false`, because the kit sent it. All three null-exit-code cases are now
  // distinguishable from each other rather than only from a clean exit.
  signal: "SIGKILL",
  crashed: false,
  timedOut: false,
});

/** The history `record()` would have produced if every probe flooded before writing anything a
 *  checker could read — the worst case for a rule that reads absence as compliance. */
function everyProbeTruncated(): History {
  const wanted = new Map<string, Observation>();
  for (const checker of CHECKERS) {
    for (const inv of checker.probes(DISCOVERY)) {
      const id = invocationId(inv);
      const existing = wanted.get(id);
      if (existing) existing.purposes.push(inv.purpose);
      else {
        wanted.set(
          id,
          asTruncated({
            id,
            invocation: inv,
            purposes: [inv.purpose],
            stdout: "",
            stderr: "",
            stdoutBytes: 4 * 1024 * 1024,
            stderrBytes: 0,
            stdoutDigest: digestOfText(""),
            stderrDigest: digestOfText(""),
            stdoutLossy: false,
            stderrLossy: false,
            truncated: true,
            exitCode: null,
            signal: "SIGKILL",
            crashed: false,
            timedOut: false,
            spawnFailed: false,
            durationMs: 900,
            timeToFirstByteMs: 3,
          }),
        );
      }
    }
  }
  const observations = [...wanted.values()];
  return {
    target: { path: "/flooding-target", argv0: ["/flooding-target"] },
    discovery: DISCOVERY,
    observations,
    byId: new Map(observations.map((o) => [o.id, o])),
  };
}

describe("truncated evidence is never evidence of compliance", () => {
  const h = everyProbeTruncated();

  test("the synthesised history actually covers the catalogue's probes", () => {
    // Guards the test itself: with no observations every checker would answer "probe was not
    // recorded" and the suite would pass for the wrong reason.
    expect(h.observations.length).toBeGreaterThan(8);
    expect(h.observations.every((o) => o.truncated)).toBe(true);
  });

  test.each(CHECKERS.map((c) => [c.ruleId, c] as const))(
    "%s does not report pass when every probe was truncated",
    (_ruleId, checker) => {
      expect(checker.check(h).verdict).not.toBe("pass");
    },
  );

  // Unlike hangs, NO rule in the catalogue owns being killed for flooding: a target we silenced
  // has not violated A1, C1, D2 or E1 — it never got to answer them. So unlike timeouts.test,
  // there is no OWNS_ exception list here, and adding one should require a rule that says so.
  test.each(CHECKERS.map((c) => [c.ruleId, c] as const))(
    "%s reports unverified, not a verdict derived from the part we refused to read",
    (_ruleId, checker) => {
      expect(checker.check(h).verdict).toBe("unverified");
    },
  );
});

// The other half of the rule: a violation the prefix CONTAINS is real, and downgrading it to
// `unverified` would lose a finding the evidence supports. These three are the checkers whose
// violation is positive content rather than an absence or an exit code.
describe("a violation already visible in the prefix still fails", () => {
  const base = (id: string, args: string[], purpose: string): Observation =>
    asTruncated({
      id,
      invocation: { args, inertness: "help-path", purpose },
      purposes: [purpose],
      stdout: "",
      stderr: "",
      stdoutBytes: 0,
      stderrBytes: 0,
      stdoutDigest: digestOfText(""),
      stderrDigest: digestOfText(""),
      stdoutLossy: false,
      stderrLossy: false,
      truncated: true,
      exitCode: null,
      signal: "SIGKILL",
      crashed: false,
      timedOut: false,
      spawnFailed: false,
      durationMs: 900,
      timeToFirstByteMs: 3,
    });

  const historyOf = (observations: Observation[]): History => ({
    target: { path: "/flooding-target", argv0: ["/flooding-target"] },
    discovery: DISCOVERY,
    observations,
    byId: new Map(observations.map((o) => [o.id, o])),
  });

  /** One of D4's two probes: identical argv and no env, told apart by the recorder-only `repeat`
   *  index the checker selects on. The pair used to differ by an `ACC_PROBE_NONCE` the child
   *  could see, which is the defect `repeat` removed. */
  const d4Run = (id: string, repeat: number): Observation => ({
    ...base(id, ["--help"], `D4: help run ${repeat}`),
    invocation: {
      args: ["--help"],
      repeat,
      inertness: "help-path" as const,
      purpose: `D4: help run ${repeat}`,
    },
  });

  test("B2 still fails on an escape that was emitted before the limit", () => {
    const o = base("b2", ["--help"], "B2: help must be escape-free");
    // The literal ESC bytes are the fixture: B2's whole assertion is that they were emitted.
    const h = historyOf([{ ...o, stdout: "\x1b[31mred\x1b[0m", stdoutBytes: 4 * 1024 * 1024 }]);
    const f = CHECKERS.find((c) => c.ruleId === "B2");
    expect(f?.check(h).verdict).toBe("fail");
  });

  test("F1 still fails on a credential that was printed before the limit", () => {
    const o = base("f1", ["--help"], "F1: scan help");
    const h = historyOf([{ ...o, stdout: "token: ghp_abcdefghijklmnopqrstuvwxyz0123456789" }]);
    const f = CHECKERS.find((c) => c.ruleId === "F1");
    expect(f?.check(h).verdict).toBe("fail");
  });

  test("D4 still fails on help that already differed inside both prefixes", () => {
    const a = d4Run("d4a", 1);
    const b = d4Run("d4b", 2);
    const h = historyOf([
      { ...a, stdout: "usage: t\nbuilt 11:04:02\n" },
      { ...b, stdout: "usage: t\nbuilt 11:04:09\n" },
    ]);
    const f = CHECKERS.find((c) => c.ruleId === "D4");
    expect(f?.check(h).verdict).toBe("fail");
  });

  test("D4 does NOT fail on prefixes that merely stop at different lengths", () => {
    // The mirror image, and the reason the check is `firstDiff < minLen` rather than string
    // inequality: at the ceiling a length mismatch is OUR cut showing through, not the target's
    // nondeterminism, and reporting it as a diff would fabricate the finding D4 exists to make.
    const a = d4Run("d4a", 1);
    const b = d4Run("d4b", 2);
    const h = historyOf([
      { ...a, stdout: "usage: tool" },
      { ...b, stdout: "usage: too" },
    ]);
    const f = CHECKERS.find((c) => c.ruleId === "D4");
    expect(f?.check(h).verdict).toBe("unverified");
  });

  test("A1 still fails on stdout the target had already written", () => {
    const o = base("a1", ["--acc-probe-xyzzy-flag"], "A1: an unrecognised flag must be rejected");
    const h = historyOf([
      {
        ...o,
        stdout: "results...",
        stdoutBytes: 4 * 1024 * 1024,
        invocation: { ...o.invocation, inertness: "sentinel" },
      },
    ]);
    const f = CHECKERS.find((c) => c.ruleId === "A1");
    const verdict = f?.check(h);
    expect(verdict?.verdict).toBe("fail");
    expect(verdict?.detail).toContain("output limit");
  });
});

// The partial case, against a REAL recording — the same shape timeouts.test.ts uses, and for the
// same reason: only a genuinely conforming target produces what each of nineteen rules considers
// a pass, so "one probe truncated, the rest complete" cannot be synthesised generically.
const CONFORMING: TargetInfo = (() => {
  const p = join(dirname(fileURLToPath(import.meta.url)), "fixtures/conforming.ts");
  return { path: p, argv0: ["bun", p] };
})();

function withOneTruncatedProbe(base: History, id: string): History {
  const observations = base.observations.map((o) => (o.id === id ? asTruncated(o) : o));
  return { ...base, observations, byId: new Map(observations.map((o) => [o.id, o])) };
}

describe("one truncated probe among completed ones is not compliance either", () => {
  let real: History;
  beforeAll(async () => {
    real = await record(CONFORMING, CHECKERS);
  }, 60_000);

  test("the base recording is one the checkers actually pass", () => {
    // Guards the test itself: if the fixture stopped conforming, every case below would be
    // satisfied by a verdict that had nothing to do with truncation.
    const passing = CHECKERS.filter((c) => c.check(real).verdict === "pass");
    expect(passing.length).toBeGreaterThan(12);
  });

  test.each(CHECKERS.map((c) => [c.ruleId, c] as const))(
    "%s reports the gap when one of its own probes is truncated and the rest complete",
    (ruleId, checker) => {
      for (const inv of checker.probes(real.discovery)) {
        const id = invocationId(inv);
        expect(real.byId.has(id)).toBe(true);
        const label = `${ruleId} with \`${inv.args.join(" ") || "(bare)"}\` truncated`;
        const verdict = checker.check(withOneTruncatedProbe(real, id)).verdict;
        // Compared as a pair so a failure names the probe rather than just "expected pass".
        expect([label, verdict]).toEqual([label, "unverified"]);
      }
    },
    60_000,
  );
});
