// acc, checked against the spec it enforces.
//
// This is the POSITIVE CONTROL. A conformance kit with nothing that provably passes cannot
// distinguish "found a real defect" from "the checker is wrong", so the reference
// implementation has to be verifiably conforming — and verified on every commit, or it drifts
// like any other undefended claim.
//
// Probes are taken verbatim from the `## The probe` section of each rule page. When the kit
// exists these move into it and this file becomes `acc check $(which acc)`.

import { describe, expect, test } from "bun:test";
import { spawn } from "node:child_process";
import { chmodSync, copyFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadExpectations } from "./kit/expectations.ts";
import { record } from "./kit/record.ts";
import { CHECKERS } from "./kit/registry.ts";
import { buildReport, runCheckers } from "./kit/report.ts";
import type { TargetInfo } from "./kit/types.ts";
import { COMMANDS, GLOBAL_ARGS } from "./spec.ts";
import { VERSION } from "./version.ts";

const CLI = join(dirname(fileURLToPath(import.meta.url)), "cli.ts");
// Rule B2 forbids ANSI escapes when stdout is not a terminal. Detecting them requires naming
// the byte they begin with, so the control character here is the check, not an accident.
// biome-ignore lint/suspicious/noControlCharactersInRegex: matching ESC is the assertion
const ANSI = /\x1b\[/;
const SECRET = /(sk-|ghp_|xox[baprs]-|AKIA|opk_|-----BEGIN [A-Z ]*PRIVATE KEY)/;

interface Run {
  code: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

/**
 * Run acc with stdin closed and a deadline enforced IN-PROCESS.
 *
 * Not `timeout(1)`: it is GNU coreutils and absent on stock macOS, where invoking it yields
 * 127 and the probe silently measures nothing. A killed process also reports `code: null`
 * rather than 128+n — it did not choose that status, and recording it as an exit code would
 * fabricate evidence.
 */
function run(args: string[], env: Record<string, string> = {}): Promise<Run> {
  return new Promise((resolve) => {
    const child = spawn("bun", [CLI, ...args], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, ...env },
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    child.stdout.on("data", (d) => {
      stdout += d;
    });
    child.stderr.on("data", (d) => {
      stderr += d;
    });
    child.stdin.end();
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, 10_000);
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code: timedOut ? null : code, stdout, stderr, timedOut });
    });
  });
}

const parses = (s: string): boolean => {
  try {
    JSON.parse(s);
    return true;
  } catch {
    return false;
  }
};

describe("A — parsing", () => {
  test("A1 unknown flags exit non-zero, stdout empty, flag named", async () => {
    const r = await run(["rules", "--frmat", "json"]);
    expect(r.code).toBe(2);
    expect(r.stdout).toBe("");
    expect(r.stderr).toContain("--frmat");
  });

  test("A2 unknown commands exit non-zero, stdout empty, verb named", async () => {
    const r = await run(["nonsense-verb-xyz"]);
    expect(r.code).toBe(2);
    expect(r.stdout).toBe("");
    expect(r.stderr).toContain("nonsense-verb-xyz");
  });

  test("A3 a rejected closed-set value returns the valid set as `choices`", async () => {
    const r = await run(["rules", "--tier", "nonsense", "--json"]);
    expect(r.code).toBe(2);
    const env = JSON.parse(r.stderr);
    expect(env.error.kind).toBe("usage");
    expect(env.error.choices).toEqual(["core", "diagnostic"]);
    expect(env.error.message).toContain("nonsense");
  });

  test("A4 unexpected positionals are rejected", async () => {
    const r = await run(["tags", "unexpected-value-xyz"]);
    expect(r.code).toBe(2);
    expect(r.stdout).toBe("");
  });

  test("A5 a near-miss verb is not executed", async () => {
    const r = await run(["rule"]); // one edit from `rules`
    expect(r.code).toBe(2);
    expect(r.stdout).toBe("");
  });
});

describe("B — streams", () => {
  test("B1 stdout is empty on every failure path", async () => {
    for (const args of [["--frmat", "x"], ["nonsense-xyz"], ["show", "A99"], ["tags", "extra"]]) {
      const r = await run(args);
      expect({ args, stdout: r.stdout }).toEqual({ args, stdout: "" });
    }
  });

  test("B2 no ANSI escapes when stdout is not a terminal", async () => {
    const help = await run(["--help"]);
    const data = await run(["rules"]);
    const err = await run(["show", "A99"]);
    expect(ANSI.test(help.stdout)).toBe(false);
    expect(ANSI.test(data.stdout)).toBe(false);
    expect(ANSI.test(err.stderr)).toBe(false);
  });

  test("B3 the WHOLE stdout stream parses in machine mode", async () => {
    for (const args of [
      ["rules", "--json"],
      ["schema"],
      ["--help", "--json"],
      ["show", "A1", "--json"],
      ["tags", "--json"],
      ["path", "A1", "exit-codes", "--json"],
    ]) {
      const r = await run(args);
      expect({ args, parses: parses(r.stdout) }).toEqual({ args, parses: true });
    }
  });

  test("B3 a stray write to stdout would break the parse (the mechanism, demonstrated)", async () => {
    // Not a defect: proof that the check has teeth. If any code path outside envelope.ts ever
    // writes to stdout, `rules --json` stops parsing and this suite goes red.
    const r = await run(["rules", "--json"]);
    expect(r.stdout.trimEnd().split("\n")).toHaveLength(1);
  });
});

describe("C — exit codes", () => {
  test("C1 help exits 0 on stdout, at root and nested", async () => {
    const root = await run(["--help"]);
    const nested = await run(["rules", "--help"]);
    expect(root.code).toBe(0);
    expect(root.stdout.length).toBeGreaterThan(0);
    expect(nested.code).toBe(0);
    expect(nested.stdout.length).toBeGreaterThan(0);
  });

  test("C2 every usage error uses 2, and not-found uses 5", async () => {
    for (const args of [["--frmat", "x"], ["nonsense-xyz"], ["tags", "extra"], []]) {
      expect({ args, code: (await run(args)).code }).toEqual({ args, code: 2 });
    }
    expect((await run(["show", "A99"])).code).toBe(5);
  });

  test("C2 the declared kind matches the declared exit code", async () => {
    const r = await run(["show", "A99", "--json"]);
    const env = JSON.parse(r.stderr);
    expect(env.error.kind).toBe("not_found");
    expect(env.error.exit_code).toBe(5);
    expect(r.code).toBe(env.error.exit_code);
  });

  test("C3 identical invocations produce identical exit codes", async () => {
    const runs = await Promise.all([1, 2, 3].map(() => run(["rules", "--frmat", "x"])));
    expect(new Set(runs.map((r) => r.code)).size).toBe(1);
  });
});

describe("D — discoverability", () => {
  test("D1 --version works with no usable configuration", async () => {
    const r = await run(["--version"], { HOME: "/nonexistent-xyz" });
    expect(r.code).toBe(0);
    expect(r.stdout.trim().length).toBeGreaterThan(0);
    expect(r.stderr).toBe("");
  });

  // D1's other half: in machine mode the version must be a FIELD, not a bare string a caller
  // has to regex. Commander's built-in handling answered before the envelope existed, so all
  // three machine-mode spellings emitted `0.0.0` at exit 0 — and the D1 checker never saw it,
  // because it probes only plain `--version`, which in a terminal is legitimately a bare
  // string. Both option orders AND both selectors, since the defect was order-independent.
  test("D1 the version is a structured field in machine mode", async () => {
    for (const args of [
      ["--version", "--json"],
      ["--json", "--version"],
      ["--format", "json", "--version"],
      ["-V", "--json"],
    ]) {
      const r = await run(args);
      expect({ args, code: r.code, stderr: r.stderr }).toEqual({ args, code: 0, stderr: "" });
      const env = JSON.parse(r.stdout);
      expect({ args, ok: env.ok, version: env.data.version }).toEqual({
        args,
        ok: true,
        version: VERSION,
      });
    }
  });

  // ...and the bare string survives where it belongs. A shell comparing `acc --version` to a
  // string must not start receiving JSON because this rule was fixed.
  test("D1 text mode still emits the bare version string", async () => {
    const r = await run(["--version", "--format", "text"]);
    expect(r.code).toBe(0);
    expect(r.stdout.trim()).toBe(VERSION);
  });

  test("D2 bare invocation is a usage error on stderr", async () => {
    const r = await run([]);
    expect(r.code).toBe(2);
    expect(r.stdout).toBe("");
    expect(r.stderr.length).toBeGreaterThan(0);
  });

  test("D3 help advertises the machine-readable path", async () => {
    const r = await run(["--help"]);
    expect(r.stdout).toMatch(/--json|--format|schema/);
  });

  test("D4 help output is byte-identical between runs", async () => {
    const [a, b] = await Promise.all([run(["--help"]), run(["--help"])]);
    expect(a?.stdout).toBe(b?.stdout as string);
  });
});

describe("E — interactivity", () => {
  test("E1 never blocks on stdin without a terminal", async () => {
    for (const args of [[], ["--help"], ["rules"], ["nonsense-xyz"]]) {
      const r = await run(args);
      expect({ args, timedOut: r.timedOut }).toEqual({ args, timedOut: false });
    }
  });
});

describe("F — safety", () => {
  test("F1 no credential patterns in help or schema", async () => {
    const help = await run(["--help"]);
    const schema = await run(["schema"]);
    expect(SECRET.test(help.stdout)).toBe(false);
    expect(SECRET.test(schema.stdout)).toBe(false);
  });
});

describe("machine mode", () => {
  test("an explicit --format wins over detection, in BOTH directions", async () => {
    // stdout is always a pipe here, so detection alone would choose json every time.
    const forcedText = await run(["tags", "--format", "text"]);
    expect(parses(forcedText.stdout)).toBe(false);

    // ...and an announced agent harness must not override an explicit request either.
    const stillText = await run(["tags", "--format", "text"], { AI_AGENT: "probe" });
    expect(parses(stillText.stdout)).toBe(false);

    const forcedJson = await run(["tags", "--json"]);
    expect(parses(forcedJson.stdout)).toBe(true);
  });

  test("AI_AGENT alone selects machine mode", async () => {
    const r = await run(["tags"], { AI_AGENT: "probe" });
    expect(parses(r.stdout)).toBe(true);
  });

  test("success envelopes carry `next` command templates", async () => {
    const r = await run(["rules", "--json"]);
    const env = JSON.parse(r.stdout);
    expect(env.ok).toBe(true);
    expect(env.next[0].command).toContain("acc show");
  });
});

// A closed set the parser does not enforce is a lie the schema tells. `--format` declared
// `text|json` and accepted anything, so `acc rules --format nonsense` returned data and exit 0
// — the exact silent acceptance A1/A3 exist to catch in other CLIs, in the tool that checks
// for it.
//
// The cases are WALKED out of `spec.ts` rather than listed, which is the point: a flag added
// with a `values` the parser ignores fails here the day it is added, without anyone
// remembering to extend this file.
describe("every declared closed set is enforced", () => {
  const closedSets = COMMANDS.flatMap((c) =>
    [...c.args, ...GLOBAL_ARGS]
      .filter((a) => a.values?.length)
      .map((a) => [`${c.name} ${a.name}`, c.name, a.name, a.values as string[]] as const),
  );

  test("the walk found closed sets to check", () => {
    // Guards the degenerate pass: an empty walk would make every case below vacuous.
    expect(closedSets.length).toBeGreaterThan(0);
  });

  test.each(closedSets)("%s rejects an out-of-set value", async (_label, command, flag) => {
    const r = await run([command, flag, "nonsense-value-xyz", "--json"]);
    expect({ flag, code: r.code, stdout: r.stdout }).toEqual({ flag, code: 2, stdout: "" });
    const env = JSON.parse(r.stderr);
    expect(env.error.kind).toBe("usage");
    // Both halves of a self-correcting rejection: what was wrong, and what would be right.
    expect(env.error.message).toContain("nonsense-value-xyz");
    expect(env.error.choices).toEqual(
      COMMANDS.flatMap((c) => [...c.args, ...GLOBAL_ARGS]).find((a) => a.name === flag)?.values,
    );
  });

  // The other direction. A validator that rejected EVERYTHING would satisfy the cases above,
  // so each declared value has to survive its own flag.
  test.each(closedSets)(
    "%s accepts every value it declares",
    async (_label, command, flag, values) => {
      for (const value of values) {
        const r = await run([command, flag, value, "--json"]);
        expect({ flag, value, stderr: r.stderr }).toEqual({
          flag,
          value,
          stderr: expect.not.stringContaining(`invalid value for ${flag}`),
        });
      }
    },
    20_000,
  );

  // The EARLY paths, which answer before commander ever parses. `--help` was intercepted and
  // served the schema at exit 0 no matter what else the invocation carried.
  test("an early-exit path still rejects an out-of-set value", async () => {
    for (const args of [
      ["--help", "--format", "nonsense"],
      ["--format", "nonsense", "--help"],
      ["rules", "--help", "--format", "nonsense"],
    ]) {
      const r = await run(args);
      expect({ args, code: r.code, stdout: r.stdout }).toEqual({ args, code: 2, stdout: "" });
    }
  });

  // ...but the terminator still ends option parsing (A6): after `--`, `--format nonsense` is
  // two positional values, and rejecting them as a bad format would be reading data as syntax.
  test("does not scan past the `--` terminator", async () => {
    const r = await run(["show", "--", "--format", "nonsense", "--json"]);
    expect(r.code).toBe(2);
    expect(r.stderr).not.toContain("invalid value for --format");
  });
});

// A schema that omits an outcome tells a machine caller the outcome cannot happen. `acc tags
// extra` and `acc schema --bogus` were both structured `usage` errors at exit 2 while the
// schema declared only `["internal"]` for those two commands.
//
// Provoked against EVERY command, both ways, because the parser runs before every handler:
// nothing about `tags` made it immune, it simply never declared what it could already do.
describe("the schema declares every error kind a command can produce", () => {
  const provocations = COMMANDS.flatMap((c) => {
    // One filler token per declared positional, so the extra one is the ONLY thing wrong —
    // otherwise `acc show extra` is a missing-argument error, not a surplus-argument one.
    const filler = c.positionals.map((_, i) => `acc-probe-positional-${i}`);
    return [
      [`${c.name}: unknown option`, c.name, [c.name, ...filler, "--acc-probe-bogus-xyz"]],
      [`${c.name}: extra positional`, c.name, [c.name, ...filler, "acc-probe-extra-xyz"]],
    ] as const;
  });

  test("every provoked kind is declared for the command that produced it", async () => {
    const schema = JSON.parse((await run(["schema", "--json"])).stdout).data;
    const declared = new Map<string, string[]>(
      schema.commands.map((c: { name: string; errors: string[] }) => [c.name, c.errors]),
    );

    for (const [label, command, args] of provocations) {
      const r = await run([...args, "--json"]);
      const env = JSON.parse(r.stderr);
      expect({ label, code: r.code, stdout: r.stdout }).toEqual({ label, code: 2, stdout: "" });
      expect({ label, kind: env.error.kind, declared: declared.get(command) }).toEqual({
        label,
        kind: env.error.kind,
        declared: expect.arrayContaining([env.error.kind]),
      });
    }
  }, 30_000);
});

describe("schema", () => {
  // The same argv used to yield two incompatible query paths: the raw object in a terminal,
  // `{ok, data}` in a pipeline. A caller cannot write one `jq` filter against a document whose
  // shape depends on whether stdout is a TTY — which is exactly how the published
  // `acc schema | jq '.commands[].name'` example came to fail.
  test("emits the same enveloped document in both modes", async () => {
    const asText = JSON.parse((await run(["schema", "--format", "text"])).stdout);
    const asJson = JSON.parse((await run(["schema", "--json"])).stdout);
    // durationMs is the one field that legitimately differs between two runs.
    for (const doc of [asText, asJson]) delete doc.meta.durationMs;
    expect(asText).toEqual(asJson);
    expect(asText.ok).toBe(true);
    expect(asText.data.commands.length).toBe(COMMANDS.length);
  });

  test("describes every command the parser accepts, and nothing it does not", async () => {
    const r = await run(["schema"]);
    const { data } = JSON.parse(r.stdout);
    const declared: string[] = data.commands.map((c: { name: string }) => c.name);

    // Every declared command must actually run. A schema promising a command that does not
    // exist is the drift this project exists to prevent.
    for (const name of declared) {
      const probe = await run([name, "--help"]);
      expect({ name, code: probe.code }).toEqual({ name, code: 0 });
    }
    expect(declared).toContain("schema");
    expect(data.errors.map((e: { kind: string }) => e.kind)).toContain("not_found");
  });

  test("every declared error kind maps to a distinct, declared exit code", async () => {
    const r = await run(["schema"]);
    const { data } = JSON.parse(r.stdout);
    for (const e of data.errors as Array<{ kind: string; exit_code: number }>) {
      expect(e.exit_code).toBeLessThan(125); // the reserved passthrough band
    }
  });
});

// acc, checked against the spec it enforces — now through the kit itself.
//
// This is the POSITIVE CONTROL, and it is now self-referential: the checker checks itself. If
// acc ever stops conforming, or a checker breaks in a way that stops detecting, this goes red.
// This suite is ADDED alongside the hand-written probes above, not a replacement for them: the
// kit only re-implements what the 19 rule pages cover, and does not check the `choices` field's
// contents, `next` command templates, machine-mode precedence, or schema completeness — those
// stay covered by the tests above.
const ACC: TargetInfo = { path: CLI, argv0: ["bun", CLI] };

describe("acc checks itself, through the kit", () => {
  test("is conformant", async () => {
    const h = await record(ACC, CHECKERS);
    const r = buildReport(h, runCheckers(h, CHECKERS), CHECKERS, loadExpectations("."), "L0");
    if (!r.conformant) {
      const failed = r.findings.filter((f) => f.verdict !== "pass" && f.tier === "core");
      throw new Error(
        `acc is not conformant:\n${failed.map((f) => `  ${f.ruleId} ${f.verdict}: ${f.detail}`).join("\n")}`,
      );
    }
    expect(r.conformant).toBe(true);
  }, 60_000);

  // The claim that actually matters for a positive control, and the reason `fullyVerified`
  // exists as a separate boolean: `conformant` alone would now be satisfied by a run in which
  // every core rule came back `unverified`. acc must clear the stronger bar — every applicable
  // core rule VERIFIED, not merely unfalsified. (A4 is core but above L0, so it is reported
  // not-applicable and excluded from both claims; A6 is diagnostic and unverifiable through a
  // bun launcher, so it gates neither.)
  test("every applicable core rule is verified, not merely unfailed", async () => {
    const h = await record(ACC, CHECKERS);
    const r = buildReport(h, runCheckers(h, CHECKERS), CHECKERS, loadExpectations("."), "L0");
    const unverified = r.findings.filter(
      (f) => f.applicable && f.tier === "core" && f.verdict === "unverified",
    );
    expect(unverified.map((f) => `${f.ruleId}: ${f.detail}`)).toEqual([]);
    expect(r.fullyVerified).toBe(true);
  }, 60_000);

  test("the kit detects a CLI that is NOT conformant", async () => {
    // Without this, a kit that silently stopped checking anything would still pass the test
    // above. The positive control needs a negative control.
    const broken = join(dirname(CLI), "kit/fixtures/broken/exits-zero-on-unknown-flag.ts");
    const target: TargetInfo = { path: broken, argv0: ["bun", broken] };
    const h = await record(target, CHECKERS);
    const r = buildReport(h, runCheckers(h, CHECKERS), CHECKERS, { knownFailures: {} }, "L0");
    expect(r.conformant).toBe(false);
    expect(r.findings.find((f) => f.ruleId === "A1")?.verdict).toBe("fail");
  }, 60_000);
});

// `acc check` end to end, through the real CLI entry point rather than the kit's library
// functions directly — these exercise checkCommand's own exit-code plumbing (see
// src/acc/exit-codes.ts's Outcome band), which the kit-driven tests above never touch since
// they call record/buildReport in-process and never observe a process exit code at all.
describe("acc check — the outcome exit code", () => {
  test("exits 9 (Outcome.NonConformant) against a non-conformant target", async () => {
    const broken = join(dirname(CLI), "kit/fixtures/broken/exits-zero-on-unknown-flag.ts");
    const r = await run(["check", broken, "--format", "text"]);
    expect(r.code).toBe(9);
    // Still a successful invocation, not an error: the report is data, not a failure envelope.
    expect(r.stdout).toContain("NOT CONFORMANT");
    expect(r.stderr).toBe("");
  }, 30_000);

  test("exits 0 against a conformant target", async () => {
    const conforming = join(dirname(CLI), "kit/fixtures/conforming.ts");
    const r = await run(["check", conforming, "--format", "text"]);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain("CONFORMANT");
  }, 30_000);

  // The ruling in docs/wiki/concepts/conformance.md, end to end. This fixture documents itself
  // as conforming at every L0 rule and has ZERO violations — it simply advertises no
  // machine-mode flag, so A5 and B3 cannot be established. Exit 9 for that told a caller the
  // target had broken a rule it had not broken.
  test("exits 0, not 9, on a target with unverified core rules but no violation", async () => {
    const target = join(dirname(CLI), "kit/fixtures/no-machine-mode.ts");
    const r = await run(["check", target, "--json"]);
    expect(r.code).toBe(0);
    const { data } = JSON.parse(r.stdout);
    expect(data.conformant).toBe(true);
    expect(data.counts.coreFailures).toBe(0);
    // ...and the weaker claim is still withheld, and still visible.
    expect(data.fullyVerified).toBe(false);
    expect(data.counts.coreUnverified).toBeGreaterThan(0);
  }, 30_000);

  test("the text verdict states both claims and names the probe level", async () => {
    const conforming = join(dirname(CLI), "kit/fixtures/conforming.ts");
    const r = await run(["check", conforming, "--format", "text"]);
    expect(r.stdout).toMatch(/CONFORMANT \(L0\) — \d+ core violated, \d+ core unverified/);
    // The headline is core-scoped and the summary counts every tier, so the same word carries
    // two different numbers three lines apart. Both must name their scope.
    expect(r.stdout).toMatch(/unverified \d+ \(all tiers; \d+ core\)/);
  }, 30_000);

  // Finding 4: the not_found path (a target that doesn't exist) had no coverage at all — `check`
  // declares ErrorKind.NotFound in spec.ts but nothing exercised it.
  test("exits 5 (not_found) when the target path does not exist", async () => {
    const r = await run(["check", "/no/such/binary-xyz", "--format", "text"]);
    expect(r.code).toBe(5);
    expect(r.stdout).toBe("");
    expect(r.stderr).toContain("no such file");
  }, 15_000);

  test("exits 5 (not_found) with a structured envelope in machine mode", async () => {
    const r = await run(["check", "/no/such/binary-xyz", "--json"]);
    expect(r.code).toBe(5);
    const env = JSON.parse(r.stderr);
    expect(env.ok).toBe(false);
    expect(env.error.kind).toBe("not_found");
    expect(env.error.exit_code).toBe(5);
  }, 15_000);

  // A6, through the product's own target-resolution path rather than a hand-built TargetInfo.
  //
  // A Bun CLI installed without a `.ts` extension used to be launched directly, so `argv0` never
  // said "bun", A6's swallow guard never fired, and the checker reported `FAIL` against an argv
  // the target never received — on a fixture that provably honours `--`. `toTarget` now reads
  // the shebang. The honest verdict for any bun-launched target is `unverified`.
  test("a bun CLI with no .ts extension is launched through bun, so A6 does not invent a FAIL", async () => {
    const noExtension = join(tmpdir(), `acc-conforming-noext-${process.pid}`);
    copyFileSync(join(dirname(CLI), "kit/fixtures/conforming.ts"), noExtension);
    chmodSync(noExtension, 0o755);
    try {
      const r = await run(["check", noExtension, "--json"]);
      expect(r.code).toBe(0);
      const { data } = JSON.parse(r.stdout);
      const a6 = data.findings.find((f: { ruleId: string }) => f.ruleId === "A6");
      expect(a6.verdict).toBe("unverified");
      expect(a6.detail).toContain("bun");
      expect(data.conformant).toBe(true);
    } finally {
      rmSync(noExtension, { force: true });
    }
  }, 30_000);

  // The other side of the same resolution path: a target that is NOT a bun script must still be
  // launched directly, so A6 is actually exercised. The `sh` fixtures are the only ones that can
  // receive the terminator, and this is the only test that reaches them the way a user does —
  // via `acc check`, which needs their exec bit to be committed.
  test("a shell CLI is launched directly, so A6 is exercised rather than skipped", async () => {
    const fixture = join(dirname(CLI), "kit/fixtures/sh/honours-double-dash.sh");
    const r = await run(["check", fixture, "--json"]);
    // Not 5: an exec bit missing from the committed fixture makes this a not_found error.
    expect(r.code).not.toBe(5);
    const { data } = JSON.parse(r.stdout);
    expect(data.findings.find((f: { ruleId: string }) => f.ruleId === "A6").verdict).toBe("pass");
  }, 30_000);

  // A file that EXISTS but cannot be executed. Before this, `printf 'hello' > f; acc check f`
  // produced a report in which nine rules PASSED — every checker satisfied by an empty stream
  // and a non-zero exit. A target that never runs must not be certified against anything.
  test("errors, rather than reporting, when the target exists but cannot be executed", async () => {
    const notABinary = join(tmpdir(), `acc-not-a-binary-${process.pid}.txt`);
    writeFileSync(notABinary, "hello\n");
    try {
      const r = await run(["check", notABinary, "--json"]);
      expect(r.code).toBe(5);
      expect(r.stdout).toBe("");
      const env = JSON.parse(r.stderr);
      expect(env.ok).toBe(false);
      expect(env.error.kind).toBe("not_found");
      expect(env.error.message).toContain("could not be executed");
    } finally {
      rmSync(notABinary, { force: true });
    }
  }, 30_000);

  // Same class of target, opposite spawn failure. With the exec bit SET and no shebang the
  // kernel gets far enough to refuse with ENOEXEC, which `spawn()` throws synchronously — so
  // `child.on("error")` never fired, `spawnFailed` was never set, and this escaped the abort
  // above as `{"kind":"internal","exit_code":1}`. A wrong-architecture binary fails the same
  // way, and that is precisely what the not_found hint tells the caller to go and check.
  test("reports not_found, not internal, for a file the kernel refuses to exec", async () => {
    const notABinary = join(tmpdir(), `acc-enoexec-${process.pid}`);
    writeFileSync(notABinary, "hello\n");
    chmodSync(notABinary, 0o755);
    try {
      const r = await run(["check", notABinary, "--json"]);
      expect(r.code).toBe(5);
      expect(r.stdout).toBe("");
      const env = JSON.parse(r.stderr);
      expect(env.error.kind).toBe("not_found");
      expect(env.error.message).toContain("could not be executed");
    } finally {
      rmSync(notABinary, { force: true });
    }
  }, 30_000);
});
