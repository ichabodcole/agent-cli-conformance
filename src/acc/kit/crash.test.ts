// THE THIRD catalogue-wide invariant: a probe killed by a signal the kit did not send is never
// evidence of compliance.
//
// The runner used to write `child.on("close", (code) => finish(code))`, dropping Node's second
// argument. A target that dies of a signal reports `code: null` — the same null a process the
// deadline or the output ceiling killed reports, and `Observation.exitCode`'s own doc comment
// defined that null as "a process we killed did not choose its status". So a CRASH and a KILL
// were the same recording, with `timedOut` and `spawnFailed` both false and nothing flagging the
// difference.
//
// Nine rules passed a fixture whose entire body is `kill -SEGV $$` — A2, A6, B1, B2, C3, D2, D4,
// E1, F1 — because `null !== 0` satisfies every "exited non-zero" clause and an empty stream
// satisfies every "stdout was empty" clause. Nine is the same number, and the same defect class,
// `spawnFailed` closed for a target that cannot START; this is that hole one step later in the
// lifecycle.
//
// Written against the WHOLE registry rather than per checker, for the reason timeouts.test.ts and
// truncation.test.ts are: the failure mode is one checker at a time being written without the
// guard, so the test that prevents a recurrence has to be one no new checker can be added
// without facing.

import { beforeAll, describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { doesNotCrashChecker } from "./checkers/lifecycle/does-not-crash.ts";
import { loadExpectations } from "./expectations.ts";
import { record } from "./record.ts";
import { CHECKERS } from "./registry.ts";
import { buildReport, primaryProblem, runCheckers } from "./report.ts";
import { invocationId, runProbe } from "./runner.ts";
import type { Discovery, History, Observation, TargetInfo } from "./types.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

// POSIX shell, not a `.ts` fixture: bun traps SIGSEGV and turns it into an ordinary exit with a
// crash report on stderr, which is a different observation entirely. See the fixture's header.
const SEGV: TargetInfo = (() => {
  const p = join(HERE, "fixtures/sh/dies-by-signal.sh");
  return { path: p, argv0: ["sh", p] };
})();

// The same trick, half applied: `--help`, `-h` and `--version` answered properly, `kill -SEGV $$`
// on every other path. POSIX shell for the same reason as above — under bun the signal would
// become a chosen exit status and a crash report on stderr, which is not the observation this
// fixture exists to produce.
const PARTIAL_CRASHER: TargetInfo = (() => {
  const p = join(HERE, "fixtures/sh/crashes-except-help.sh");
  return { path: p, argv0: ["sh", p] };
})();

describe("the runner records the signal, not just the missing status", () => {
  test("a target that dies of SIGSEGV is distinguishable from one we killed", async () => {
    const o = await runProbe(SEGV, {
      args: ["--help"],
      inertness: "help-path",
      purpose: "crash: the runner must see the signal",
    });
    // The line the bug was on. `close` fires with `(code, signal)`; dropping the second argument
    // is what made the two cases identical, so this is the assertion that has to be able to fail.
    expect(o.signal).toBe("SIGSEGV");
    expect(o.crashed).toBe(true);
    // Everything else about the recording is what it always was — which is exactly why the crash
    // went unnoticed: no other field distinguishes this from a clean, silent rejection.
    expect(o.exitCode).toBeNull();
    expect(o.timedOut).toBe(false);
    expect(o.truncated).toBe(false);
    expect(o.spawnFailed).toBe(false);
    expect(o.stdout).toBe("");
  }, 30_000);

  test("128+n is NOT synthesised into the exit code", async () => {
    // The tempting repair, and the wrong one. 139 is a SHELL convention; POSIX guarantees only
    // "greater than 128" for a signal death (docs/wiki/decisions/exit-codes-below-125.md), and
    // the target never chose either number. A fabricated code would satisfy `!== 0` in every
    // checker and put the kit straight back where it started, with a value that reads as the
    // target's answer.
    const o = await runProbe(SEGV, {
      args: [],
      inertness: "bare",
      purpose: "crash: the exit code stays null",
    });
    expect(o.exitCode).toBeNull();
  }, 30_000);
});

// THE REGRESSION TEST. A real recording of a real crashing binary, through the real registry, at
// the level `acc check` runs by default. Restoring `child.on("close", (code) => finish(code))`
// turns this red: every probe would come back `crashed: false`, and the nine would return.
describe("the full-registry L0 report over a crashing target", () => {
  let h: History;
  beforeAll(async () => {
    h = await record(SEGV, CHECKERS);
  }, 120_000);

  test("every probe crashed, and the recording says so", () => {
    // Guards the test itself. If the fixture ever started exiting normally — a shell that
    // declined to deliver the signal, say — every assertion below would hold for the wrong
    // reason.
    expect(h.observations.length).toBeGreaterThan(8);
    expect(h.observations.every((o) => o.crashed)).toBe(true);
    expect(h.observations.every((o) => o.signal === "SIGSEGV")).toBe(true);
  });

  test("NO rule passes on evidence that is a crashed observation", () => {
    const report = buildReport(
      h,
      runCheckers(h, CHECKERS),
      CHECKERS,
      loadExpectations(undefined),
      "L0",
    );
    // Phrased over the EVIDENCE rather than as "no findings pass", because that is the actual
    // claim: a verdict may legitimately rest on something other than a probe (A4 declares none;
    // B3 reads discovery). What must never happen is a `pass` citing an observation of a process
    // that fell over.
    const crashedIds = new Set(h.observations.filter((o) => o.crashed).map((o) => o.id));
    const builtOnACrash = report.findings.filter(
      (f) => f.verdict === "pass" && f.evidence.some((id) => crashedIds.has(id)),
    );
    expect(builtOnACrash.map((f) => `${f.ruleId}: ${f.detail}`)).toEqual([]);
  });

  test("none of the nine can come back wearing the same words", () => {
    // The exact details the nine reported, so a regression cannot return under the old prose.
    const details = runCheckers(h, CHECKERS)
      .map((f) => f.detail)
      .join("\n");
    expect(details).not.toContain("rejected with exit null");
    expect(details).not.toContain("exited null with stdout empty");
    expect(details).not.toContain("all 4 inert invocation(s) terminated");
    expect(details).not.toContain("invocations all exited null");
  });

  test("C1 is the one rule that calls a crash a violation", () => {
    // The single exception (see crashedUnverified in finding.ts): C1's rule is that a help
    // request SUCCEEDS, and help that dies on a signal has not succeeded. Every other rule
    // reports a gap in the evidence; this one reports the violation, and names the signal rather
    // than the null status the target never chose.
    const c1 = runCheckers(h, CHECKERS).find((f) => f.ruleId === "C1");
    expect(c1?.verdict).toBe("fail");
    expect(c1?.detail).toContain("SIGSEGV");
  });

  test("the headline is not conformant, and not fully verified", () => {
    const report = buildReport(
      h,
      runCheckers(h, CHECKERS),
      CHECKERS,
      loadExpectations(undefined),
      "L0",
    );
    expect(report.conformant).toBe(false);
    expect(report.fullyVerified).toBe(false);
    expect(report.counts.corePassed).toBe(0);
  });
});

// The synthesised sweep, mirroring timeouts.test.ts: every checker, every probe, against a
// history in which nothing survived. Catches a checker added later that reads a status field
// before asking how the process ended.
const DISCOVERY: Discovery = {
  subcommands: ["list"],
  flags: ["--json", "--verbose"],
  machineModeFlag: "--json",
  helpReadable: true,
};

/** The fields runProbe writes for a signal death: no status the target chose, the signal that
 *  ended it, and `crashed` — which is what separates this from the kit's own SIGKILL. */
const asCrashed = (o: Observation): Observation => ({
  ...o,
  stdout: "",
  stderr: "",
  exitCode: null,
  signal: "SIGSEGV",
  crashed: true,
  timedOut: false,
  truncated: false,
  timeToFirstByteMs: null,
});

function everyProbeCrashed(): History {
  const wanted = new Map<string, Observation>();
  for (const checker of CHECKERS) {
    for (const inv of checker.probes(DISCOVERY)) {
      const id = invocationId(inv);
      const existing = wanted.get(id);
      if (existing) existing.purposes.push(inv.purpose);
      else {
        wanted.set(
          id,
          asCrashed({
            id,
            invocation: inv,
            purposes: [inv.purpose],
            stdout: "",
            stderr: "",
            stdoutBytes: 0,
            stderrBytes: 0,
            truncated: false,
            exitCode: null,
            signal: null,
            crashed: false,
            timedOut: false,
            spawnFailed: false,
            durationMs: 4,
            timeToFirstByteMs: null,
          }),
        );
      }
    }
  }
  const observations = [...wanted.values()];
  return {
    target: { path: "/crashing-target", argv0: ["/crashing-target"] },
    discovery: DISCOVERY,
    observations,
    byId: new Map(observations.map((o) => [o.id, o])),
  };
}

// Two rules, for two different reasons. C1 owns it incidentally — its subject is that a help
// request SUCCEEDS, and help that dies on a signal has not. G1 owns it outright: a crash is its
// entire subject matter, the way a hang is E1's. G1 was minted after this file was written,
// because recording the signal was only half the job — every other rule reporting `unverified`
// left `conformant` counting zero violations for a target that fell over on eleven core rules.
const OWNS_CRASHES = new Set(["C1", "G1"]);

describe("a crashed probe is never evidence of compliance", () => {
  const h = everyProbeCrashed();

  test("the synthesised history actually covers the catalogue's probes", () => {
    expect(h.observations.length).toBeGreaterThan(8);
    expect(h.observations.every((o) => o.crashed)).toBe(true);
  });

  test.each(CHECKERS.map((c) => [c.ruleId, c] as const))(
    "%s does not report pass when every probe crashed",
    (_ruleId, checker) => {
      expect(checker.check(h).verdict).not.toBe("pass");
    },
  );

  test.each(CHECKERS.filter((c) => !OWNS_CRASHES.has(c.ruleId)).map((c) => [c.ruleId, c] as const))(
    "%s reports unverified, not a verdict derived from a process that fell over",
    (_id, checker) => {
      expect(checker.check(h).verdict).toBe("unverified");
    },
  );

  test.each(CHECKERS.filter((c) => OWNS_CRASHES.has(c.ruleId)).map((c) => [c.ruleId, c] as const))(
    "%s owns the crash and reports it as a failure",
    (_ruleId, checker) => {
      expect(checker.check(h).verdict).toBe("fail");
    },
  );
});

// The PARTIAL case — the half that survived the first two invariants. A checker that drops the
// crashed probes and computes over the survivors reports a confident number about a target that
// died two runs out of three. Same construction as timeouts.test.ts: only a genuinely conforming
// target produces what nineteen different rules consider a pass, so this has to run a real
// recording and replace one probe at a time.
const CONFORMING: TargetInfo = (() => {
  const p = join(HERE, "fixtures/conforming.ts");
  return { path: p, argv0: ["bun", p] };
})();

function withOneCrashedProbe(base: History, id: string): History {
  const observations = base.observations.map((o) => (o.id === id ? asCrashed(o) : o));
  return { ...base, observations, byId: new Map(observations.map((o) => [o.id, o])) };
}

describe("one crashed probe among completed ones is not compliance either", () => {
  let real: History;
  beforeAll(async () => {
    real = await record(CONFORMING, CHECKERS);
  }, 60_000);

  test("the base recording is one the checkers actually pass", () => {
    // Guards the test itself: if the fixture stopped conforming, every case below would be
    // satisfied by a verdict that had nothing to do with the crash.
    const passing = CHECKERS.filter((c) => c.check(real).verdict === "pass");
    expect(passing.length).toBeGreaterThan(12);
  });

  test.each(CHECKERS.map((c) => [c.ruleId, c] as const))(
    "%s reports the gap when one of its own probes crashes and the rest complete",
    (ruleId, checker) => {
      const expected = OWNS_CRASHES.has(ruleId) ? "fail" : "unverified";
      for (const inv of checker.probes(real.discovery)) {
        const id = invocationId(inv);
        // Every declared probe is recorded, so a miss means the checker asked for something
        // record() never ran — worth knowing, and not something to skip past silently.
        expect(real.byId.has(id)).toBe(true);
        const label = `${ruleId} with \`${inv.args.join(" ") || "(bare)"}\` crashed`;
        const verdict = checker.check(withOneCrashedProbe(real, id)).verdict;
        // Compared as a pair so a failure names the probe rather than just "expected pass".
        expect([label, verdict]).toEqual([label, expected]);
      }
    },
    60_000,
  );

  // G1 declares no probes, so the loop above skips it entirely — its case has to be written by
  // hand, and it is the one that matters most: G1 judges the invocations OTHER checkers asked
  // for, so a crash on any single one of them is its violation even though it requested none of
  // them. Without this, the sweep above would report G1 as covered while never running it once.
  test.each([0, 1, 2] as const)(
    "G1 fails on crashed observation #%i, which no G1 probe ever requested",
    (index) => {
      const target = real.observations[index];
      expect(target).toBeDefined();
      expect(doesNotCrashChecker.probes(real.discovery)).toEqual([]);
      const f = doesNotCrashChecker.check(withOneCrashedProbe(real, target?.id ?? ""));
      expect(f.verdict).toBe("fail");
      // The signal, not the absent exit code — "exited null" is the wording that let a crash
      // read as a rejection in the first place.
      expect(f.detail).toContain("SIGSEGV");
      expect(f.evidence).toEqual([target?.id ?? ""]);
    },
  );
});

// THE FIXTURE G1 WAS MINTED FOR, run end to end through the real registry.
//
// `dies-by-signal.sh` above is the easy half: nothing survives, so nothing can be mistaken for
// compliance. This is the half that survived the third invariant. A target that answers `--help`,
// `-h` and `--version` correctly and segfaults on every other path collected FOUR honest passes
// and eleven `unverified` core rules, and `conformant` — which counts violations — came back
// `true` at exit 0. Every line of that report was individually correct; the headline was not.
describe("the partial crasher — a green headline over eleven fallen-over rules", () => {
  let h: History;
  beforeAll(async () => {
    h = await record(PARTIAL_CRASHER, CHECKERS);
  }, 120_000);

  test("the fixture really is partial: help and version answer, everything else dies", () => {
    // Guards the test itself in both directions. If it stopped crashing, G1 would pass and the
    // conformance assertions below would hold for the wrong reason; if it stopped answering
    // help, this would be `dies-by-signal.sh` again and prove nothing new.
    const crashed = h.observations.filter((o) => o.crashed);
    const survived = h.observations.filter((o) => !o.crashed);
    expect(crashed.length).toBeGreaterThan(4);
    expect(survived.length).toBeGreaterThan(2);
    expect(crashed.every((o) => o.signal === "SIGSEGV")).toBe(true);
    expect(survived.every((o) => o.exitCode === 0)).toBe(true);
  });

  test("G1 reports the violation, naming the signal and the invocations that died", () => {
    const g1 = runCheckers(h, CHECKERS).find((f) => f.ruleId === "G1");
    expect(g1?.verdict).toBe("fail");
    expect(g1?.detail).toContain("SIGSEGV");
    expect(g1?.detail).toContain("(bare)");
  });

  test("C1 still passes, which is what makes this the PARTIAL case", () => {
    // The rules the target genuinely satisfies must keep saying so. A rule that owns crashes is
    // not a licence to fail everything once one probe dies.
    const findings = runCheckers(h, CHECKERS);
    expect(findings.find((f) => f.ruleId === "C1")?.verdict).toBe("pass");
    expect(findings.find((f) => f.ruleId === "D1")?.verdict).toBe("pass");
  });

  test("the headline is NOT conformant, and G1 is the only core rule violated", () => {
    const report = buildReport(
      h,
      runCheckers(h, CHECKERS),
      CHECKERS,
      loadExpectations(undefined),
      "L0",
    );
    expect(report.conformant).toBe(false);
    const violated = report.findings.filter(
      (f) => f.applicable && f.tier === "core" && f.verdict === "fail",
    );
    expect(violated.map((f) => f.ruleId)).toEqual(["G1"]);
  });

  // THE FALSIFICATION, and the reason this fixture is permanent. Everything above would still
  // hold if some OTHER core rule had quietly started failing this target — so run the same
  // history through the registry with G1 removed and confirm the old, wrong headline comes back
  // exactly as it was measured: conformant, zero violations, eleven core rules unverified. If
  // G1 ever stops biting, the assertions above go red rather than passing on a neighbour's work.
  test("without G1 the same recording certifies as conformant — the pre-G1 report", () => {
    const withoutG1 = CHECKERS.filter((c) => c.ruleId !== "G1");
    const report = buildReport(
      h,
      runCheckers(h, withoutG1),
      withoutG1,
      loadExpectations(undefined),
      "L0",
    );
    expect(report.conformant).toBe(true);
    expect(report.counts.coreFailures).toBe(0);
    expect(report.counts.coreUnverified).toBe(11);
    // ...and the report was never silent about it: `fullyVerified` was false and every gap was
    // named. The defect was the HEADLINE speaking over them, which is what G1 changes.
    expect(report.fullyVerified).toBe(false);
  });

  // The caller-facing half. `primaryProblem` used to send this target to A1 — a rule about
  // rejecting unknown flags, which it never got far enough to break — because registry order
  // offered the first unverified core rule and nothing owned the crash. Same shape as the hang
  // case that put E1 ahead of position; now there is a page that explains the other eleven lines.
  test("the rule offered to the caller is G1, not registry order", () => {
    const report = buildReport(
      h,
      runCheckers(h, CHECKERS),
      CHECKERS,
      loadExpectations(undefined),
      "L0",
    );
    expect(primaryProblem(h, report)?.ruleId).toBe("G1");
  });
});
