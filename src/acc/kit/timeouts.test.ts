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

import { describe, expect, test } from "bun:test";
import { CHECKERS } from "./registry.ts";
import { invocationId } from "./runner.ts";
import type { Discovery, History, Observation } from "./types.ts";

// Rich enough that every checker declares its probes: A5 needs a long non-help flag to build a
// near-miss from, B3 needs an advertised machine-mode flag, discovery must be readable.
const DISCOVERY: Discovery = {
  subcommands: ["list"],
  flags: ["--json", "--verbose"],
  machineModeFlag: "--json",
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
          // Both are what runProbe records for a killed process: we killed it, so it never
          // chose a status, and it never got to write anything.
          exitCode: null,
          timedOut: true,
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
