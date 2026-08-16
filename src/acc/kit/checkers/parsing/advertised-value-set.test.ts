import { describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { record } from "../../record.ts";
import { digestOfText } from "../../runner.ts";
import type { History, TargetInfo } from "../../types.ts";
import { advertisedValueSetChecker } from "./advertised-value-set.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (rel: string): TargetInfo => {
  const p = join(HERE, "../../fixtures", rel);
  return { path: p, argv0: ["bun", p] };
};

interface Outcome {
  exitCode: number | null;
  stdout: string;
  stderr: string;
}

/**
 * Both recorded spellings, with the fields the verdict reads and nothing else varying.
 *
 * Built by hand rather than from a fixture because the cases these exist for — a target that
 * refuses the invocation without ever looking at the value, and one that enforces the set in one
 * spelling but not the other — are behaviours of ordinary CLIs, and pinning them to one fixture's
 * wording would test that fixture instead of the checker.
 */
function historyWith(attached: Outcome, detached: Outcome = attached): History {
  const observations = [
    ["attached", ["--format=acc-probe-xyzzy"], attached] as const,
    ["detached", ["--format", "acc-probe-xyzzy"], detached] as const,
  ].map(([spelling, args, outcome]) => {
    const purpose = `A7 ${spelling}: --format advertises text|json and must refuse anything else`;
    return {
      id: spelling,
      invocation: { args: [...args], inertness: "sentinel" as const, purpose },
      purposes: [purpose],
      stdout: outcome.stdout,
      stderr: outcome.stderr,
      stdoutBytes: outcome.stdout.length,
      stderrBytes: outcome.stderr.length,
      stdoutDigest: digestOfText(outcome.stdout),
      stderrDigest: digestOfText(outcome.stderr),
      stdoutLossy: false,
      stderrLossy: false,
      truncated: false,
      exitCode: outcome.exitCode,
      signal: null,
      crashed: false,
      timedOut: false,
      spawnFailed: false,
      durationMs: 5,
      timeToFirstByteMs: 1,
    };
  });
  return {
    target: { path: "x", argv0: ["x"] },
    discovery: {
      subcommands: [],
      flags: ["--format"],
      machineModeFlag: null,
      valueSets: { "--format": ["text", "json"] },
      helpReadable: true,
    },
    observations,
    byId: new Map(observations.map((o) => [o.id, o])),
  };
}

describe("A7 — an advertised value set is enforced", () => {
  test("PASSES the conforming fixture", async () => {
    const h = await record(fixture("conforming.ts"), [advertisedValueSetChecker]);
    const f = advertisedValueSetChecker.check(h);
    expect(f.verdict).toBe("pass");
    expect(f.ruleId).toBe("A7");
  });

  // The negative control: help advertises `text|json` and the parser takes anything, falling
  // back to the default rendering at exit 0 — the archaeology's `--format josn` shape.
  test("FAILS a CLI that accepts a value outside the set it advertises", async () => {
    const h = await record(fixture("broken/accepts-out-of-set-value.ts"), [
      advertisedValueSetChecker,
    ]);
    const f = advertisedValueSetChecker.check(h);
    expect(f.verdict).toBe("fail");
    expect(f.detail).toContain("exited 0");
    expect(f.ruleId).toBe("A7");
  });

  // A tool that declared nothing has made no claim to falsify. This must not read as a pass:
  // the fixture is conforming in every other respect and simply advertises no set.
  test("reports unverified when help advertises no closed set", async () => {
    const h = await record(fixture("no-machine-mode.ts"), [advertisedValueSetChecker]);
    const f = advertisedValueSetChecker.check(h);
    expect(f.verdict).toBe("unverified");
    expect(f.detail).toContain("no closed value set");
  });

  test("declares no probe when there is no set to falsify", () => {
    expect(
      advertisedValueSetChecker.probes({
        subcommands: ["list"],
        flags: ["--json"],
        machineModeFlag: "--json",
        valueSets: {},
        helpReadable: true,
      }),
    ).toEqual([]);
  });

  // BOTH SPELLINGS, and this is why the second probe exists. Archaeology class 8 records
  // `--flag=value` going unparsed across five shipped tools, so a parser that rejects the
  // attached form outright is the modal shape of the corpus this rule was written for — and it
  // produces a non-zero exit, an empty stdout and the whole token on stderr without the set
  // validation ever running.
  test("declares the attached and the detached spelling of the same value", () => {
    const probes = advertisedValueSetChecker.probes({
      subcommands: [],
      flags: ["--format"],
      machineModeFlag: null,
      valueSets: { "--format": ["text", "json"] },
      helpReadable: true,
    });
    expect(probes.map((p) => p.args)).toEqual([
      ["--format=acc-probe-xyzzy"],
      ["--format", "acc-probe-xyzzy"],
    ]);
    // Both must survive the EXISTING gate: the attached form under `no-verb` or `sentinel`, the
    // detached one under `sentinel` alone, which is the class inert.ts documents for exactly
    // this — a flag carrying a value, provably invalid whatever the flag's arity.
    expect(probes.map((p) => p.inertness)).toEqual(["sentinel", "sentinel"]);
  });

  // THE ATTRIBUTION BRANCH, and the reason this checker is not simply "exit non-zero". A
  // verb-dispatching CLI answers a verbless probe on its missing-verb path: non-zero, stdout
  // empty, and not one byte of it caused by the value. That is the vacuous-pass shape.
  test("reports unverified when neither rejection names the offending value", () => {
    const f = advertisedValueSetChecker.check(
      historyWith({ exitCode: 2, stdout: "", stderr: "error: no command given\n" }),
    );
    expect(f.verdict).toBe("unverified");
    expect(f.detail).toContain("can be attributed");
  });

  test("PASSES when the rejection names the value it refused", () => {
    const f = advertisedValueSetChecker.check(
      historyWith({
        exitCode: 2,
        stdout: "",
        stderr: "invalid value for --format: 'acc-probe-xyzzy'\n",
      }),
    );
    expect(f.verdict).toBe("pass");
    expect(f.detail).toContain("stdout empty");
  });

  // ONE spelling naming the value is enough to attribute the refusal: a parser only has to
  // understand one of the two, and the other legitimately rejects it as unparsable syntax.
  test("PASSES when only one spelling names the value and neither accepts it", () => {
    const f = advertisedValueSetChecker.check(
      historyWith(
        { exitCode: 2, stdout: "", stderr: "error: no command given\n" },
        { exitCode: 2, stdout: "", stderr: "invalid value for --format: 'acc-probe-xyzzy'\n" },
      ),
    );
    expect(f.verdict).toBe("pass");
    expect(f.detail).toContain("1 of 2 named the value");
  });

  // THE HOLE THE SECOND PROBE CLOSES. The attached form is refused as unparsable syntax — the
  // modal parser of the corpus — while the detached form, which that same parser DOES read,
  // accepts the out-of-set value at exit 0. One probe would have called this conformant.
  test("FAILS when the attached form is refused but the detached form accepts the value", () => {
    const f = advertisedValueSetChecker.check(
      historyWith(
        { exitCode: 2, stdout: "", stderr: "unknown option '--format=acc-probe-xyzzy'\n" },
        { exitCode: 0, stdout: "no items\n", stderr: "" },
      ),
    );
    expect(f.verdict).toBe("fail");
    expect(f.detail).toContain("the detached spelling exited 0");
  });

  // A non-zero exit does not license a pass on its own, and neither does naming the value: a
  // target that prints a plausible result alongside its complaint has still answered.
  test("FAILS when the value is refused but a result reaches stdout anyway", () => {
    const f = advertisedValueSetChecker.check(
      historyWith({
        exitCode: 2,
        stdout: "[]\n",
        stderr: "invalid value for --format: 'acc-probe-xyzzy'\n",
      }),
    );
    expect(f.verdict).toBe("fail");
    expect(f.detail).toContain("wrote 3 bytes to stdout");
  });

  test("cites the observations backing its verdict", async () => {
    const h = await record(fixture("conforming.ts"), [advertisedValueSetChecker]);
    const f = advertisedValueSetChecker.check(h);
    expect(f.evidence.length).toBeGreaterThan(0);
    for (const id of f.evidence) expect(h.byId.has(id)).toBe(true);
  });
});
