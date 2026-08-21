// THE catalogue-wide invariant: a probe the deadline killed is never evidence of compliance.
//
// This is the regression test for the highest-value defect the final review found. Twelve of
// the nineteen checkers never read `timedOut`, and seven of them returned `pass` on a killed
// probe — a killed process has `exitCode: null` (so `!== 0` holds), empty stdout (so "stdout
// was empty" holds), and two killed help runs are byte-identical to each other. A CLI that
// prompted to confirm a fuzzy correction and then blocked forever reported CONFORMANT, 15/15
// core, exit 0.
//
// Written against the WHOLE registry rather than per checker, deliberately: the failure mode
// was one checker at a time being written without the guard, so the test that prevents a
// recurrence has to be one no new checker can be added without facing.

import { beforeAll, describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { isCorroborationProbe } from "./machine-mode.ts";
import { record } from "./record.ts";
import { CHECKERS } from "./registry.ts";
import { digestOfText, invocationId } from "./runner.ts";
import type { Discovery, History, Observation, TargetInfo } from "./types.ts";

// Rich enough that every checker declares its probes: A5 needs a long non-help flag to build a
// near-miss from, B3 needs an advertised machine-mode flag, discovery must be readable.
const DISCOVERY: Discovery = {
  subcommands: ["list"],
  flags: ["--json", "--verbose"],
  machineModeFlag: "--json",
  machineModeDefault: false,
  valueSets: { "--format": ["text", "json"] },
  helpReadable: true,
};

/**
 * The history `record()` would have produced if every single probe hit the deadline.
 *
 * Built by mirroring record()'s dedup (same id, unioned purposes) so the checkers see exactly
 * the shape they see in production — a checker that looks up its probe by purpose must still
 * find it, or this suite would pass for the wrong reason.
 */
function everyProbeTimedOut(): History {
  const wanted = new Map<string, Observation>();
  for (const checker of CHECKERS) {
    for (const inv of checker.probes(DISCOVERY)) {
      const id = invocationId(inv);
      const existing = wanted.get(id);
      if (existing) existing.purposes.push(inv.purpose);
      else {
        wanted.set(id, {
          id,
          invocation: inv,
          purposes: [inv.purpose],
          stdout: "",
          stderr: "",
          stdoutBytes: 0,
          stderrBytes: 0,
          stdoutDigest: digestOfText(""),
          stderrDigest: digestOfText(""),
          stdoutLossy: false,
          stderrLossy: false,
          truncated: false,
          // Both are what runProbe records for a killed process: we killed it, so it never
          // chose a status, and it never got to write anything.
          exitCode: null,
          timedOut: true,
          // `killTree` sends SIGKILL, so a hung probe reports a signal exactly as a crashing
          // target does — which is why `crashed` exists and is false here. If the two were
          // conflated, this suite and crash.test.ts would each be asserting the other's case.
          signal: "SIGKILL",
          crashed: false,
          spawnFailed: false,
          durationMs: 10_000,
          timeToFirstByteMs: null,
        });
      }
    }
  }
  const observations = [...wanted.values()];
  return {
    target: { path: "/hung-target", argv0: ["/hung-target"] },
    discovery: DISCOVERY,
    observations,
    waived: new Set<string>(),
    byId: new Map(observations.map((o) => [o.id, o])),
  };
}

// The four rules that own hangs as their own subject matter and report `fail` instead of
// `unverified`. A1 (an unknown flag must be REJECTED — blocking is not rejecting), D2 (same,
// for the empty invocation), C1 (help is a request that must SUCCEED), and E1, whose entire
// finding is the hang. Everything else must say it could not establish anything.
const OWNS_HANGS = new Set(["A1", "C1", "D2", "E1"]);

describe("a timed-out probe is never evidence of compliance", () => {
  const h = everyProbeTimedOut();

  test("the synthesised history actually covers the catalogue's probes", () => {
    // Guards the test itself: if probe construction silently produced nothing, every checker
    // below would report "probe was not recorded" and the suite would pass vacuously.
    expect(h.observations.length).toBeGreaterThan(8);
    expect(h.observations.every((o) => o.timedOut)).toBe(true);
  });

  test.each(CHECKERS.map((c) => [c.ruleId, c] as const))(
    "%s does not report pass when every probe hung",
    (_ruleId, checker) => {
      expect(checker.check(h).verdict).not.toBe("pass");
    },
  );

  test.each(CHECKERS.filter((c) => !OWNS_HANGS.has(c.ruleId)).map((c) => [c.ruleId, c] as const))(
    "%s reports unverified, not a verdict derived from an empty stream",
    (_ruleId, checker) => {
      expect(checker.check(h).verdict).toBe("unverified");
    },
  );

  test.each(CHECKERS.filter((c) => OWNS_HANGS.has(c.ruleId)).map((c) => [c.ruleId, c] as const))(
    "%s owns hangs and reports them as a failure",
    (_ruleId, checker) => {
      expect(checker.check(h).verdict).toBe("fail");
    },
  );

  // The seven the review named specifically, asserted by their old wrong details so a
  // regression cannot come back wearing the same words.
  test("none of the seven false-pass details can be produced any more", () => {
    const details = CHECKERS.map((c) => c.check(h).detail).join("\n");
    expect(details).not.toContain("rejected with exit null");
    expect(details).not.toContain("help output identical across runs");
    expect(details).not.toContain("`--` ended option parsing");
  });
});

// The TOTAL hang above is the easy half. The one that survived it was PARTIAL: F2 recorded three
// timing runs, dropped the ones the deadline killed, and reported `pass — first byte in 4ms
// (runs: 4ms)` for a target where two of the three never terminated. Every probe hanging is the
// case a checker notices; some of them hanging is the case it computes an average over.
//
// This half has to run a REAL recording. A partial hang means the surviving observations still
// carry compliant output, and there is no generic way to synthesise "what this particular
// checker considers a pass" for nineteen different rules — only a real conforming target
// produces that. So: record once, then re-check each rule against a history in which exactly one
// of ITS OWN probes was replaced by what runProbe writes for a killed process.
const CONFORMING: TargetInfo = (() => {
  const p = join(dirname(fileURLToPath(import.meta.url)), "fixtures/conforming.ts");
  return { path: p, argv0: ["bun", p] };
})();

/** The same probe, recorded as the deadline killer would have left it: nothing written, no
 *  status the target chose, no first byte. */
const asHung = (o: Observation): Observation => ({
  ...o,
  stdout: "",
  stderr: "",
  exitCode: null,
  timedOut: true,
  signal: "SIGKILL",
  crashed: false,
  durationMs: 10_000,
  timeToFirstByteMs: null,
});

function withOneHungProbe(base: History, id: string): History {
  const observations = base.observations.map((o) => (o.id === id ? asHung(o) : o));
  return { ...base, observations, byId: new Map(observations.map((o) => [o.id, o])) };
}

describe("a PARTIAL hang is not evidence of compliance either", () => {
  let real: History;
  beforeAll(async () => {
    real = await record(CONFORMING, CHECKERS);
  }, 60_000);

  test("the base recording is one the checkers actually pass", () => {
    // Guards the test itself. If the fixture stopped conforming, every case below would be
    // satisfied by a verdict that had nothing to do with the hang.
    const passing = CHECKERS.filter((c) => c.check(real).verdict === "pass");
    expect(passing.length).toBeGreaterThan(12);
  });

  test.each(CHECKERS.map((c) => [c.ruleId, c] as const))(
    "%s reports the gap when one of its own probes hangs and the rest complete",
    (ruleId, checker) => {
      const expected = OWNS_HANGS.has(ruleId) ? "fail" : "unverified";
      // Corroboration probes are excluded: they are supporting evidence for whether the rule
      // applies, not a subject of it. See isCorroborationProbe.
      for (const inv of checker.probes(real.discovery).filter((p) => !isCorroborationProbe(p))) {
        const id = invocationId(inv);
        // Every declared probe is recorded, so a miss means the checker asked for something
        // record() never ran — worth knowing, and not something to skip past silently.
        expect(real.byId.has(id)).toBe(true);
        const label = `${ruleId} with \`${inv.args.join(" ") || "(bare)"}\` hung`;
        const verdict = checker.check(withOneHungProbe(real, id)).verdict;
        // Compared as a pair so a failure names the probe rather than just "expected pass".
        expect([label, verdict]).toEqual([label, expected]);
      }
    },
    60_000,
  );
});
