import { closeSync, existsSync, openSync, readSync } from "node:fs";
import { basename, resolve } from "node:path";
import { emit, type OutputMode, useColor } from "../envelope.ts";
import { notFoundError, usageError } from "../errors.ts";
import { Outcome } from "../exit-codes.ts";
import { type Expectations, ExpectationsError, loadExpectations } from "../kit/expectations.ts";
import { record, TargetNotExecutableError } from "../kit/record.ts";
import { CHECKERS } from "../kit/registry.ts";
import { buildReport, primaryProblem, type ReportedFinding, runCheckers } from "../kit/report.ts";
import type { History, TargetInfo } from "../kit/types.ts";

export interface CheckOptions {
  expectations?: string;
}

/** Enough for any real interpreter line — the kernel caps it at 127 bytes on Linux and the BSDs
 *  — and small enough that pointing `acc check` at a gigabyte-sized binary costs one page. */
const SHEBANG_BYTES = 256;

/**
 * True when the target's first line is a `#!` naming `bun` as its interpreter.
 *
 * This exists for A6. Its checker reports `unverified` whenever `argv0[0] === "bun"`, because
 * Bun eats the bare `--` the probe leads with and what gets measured is A1 wearing A6's name.
 * A Bun CLI installed WITHOUT a `.ts` extension used to miss that guard — nothing in the
 * invocation said "bun" — so a target that honours `--` perfectly collected a FAIL derived from
 * an argv it never received. Launching it the way its own shebang says puts it back inside the
 * guard, and `check()` stays pure: the inference happens here, once, not inside a checker.
 *
 * Reading a `#!` line is NOT the guess `inert.ts` refuses. That refusal is about whether a
 * target's root positional is free-form data — a property with no observable signal, where a
 * wrong answer licenses an unsafe spawn. A shebang is the kernel's own contract about what runs
 * the file, and a wrong answer here costs one diagnostic verdict. The line below already infers
 * an interpreter from a strictly weaker signal: the filename extension.
 *
 * Never throws. An unreadable file, a directory, a race between `existsSync` and here — all are
 * "no shebang", and the existing not-found/not-executable paths report them properly.
 */
function hasBunShebang(abs: string): boolean {
  let fd: number | undefined;
  try {
    fd = openSync(abs, "r");
    const buf = Buffer.alloc(SHEBANG_BYTES);
    const read = readSync(fd, buf, 0, SHEBANG_BYTES, 0);
    // A binary decodes to mojibake rather than throwing, and mojibake does not start with `#!`.
    const firstLine = buf.subarray(0, read).toString("utf8").split(/\r?\n/, 1)[0] ?? "";
    if (!firstLine.startsWith("#!")) return false;
    // Whole-basename comparison over every token, so `#!/usr/bin/env bun`,
    // `#!/usr/bin/env -S bun run` and `#!/opt/homebrew/bin/bun` all match while `bunx` and a
    // node interpreter living under `/home/bunny/bin` do not.
    return firstLine
      .slice(2)
      .trim()
      .split(/\s+/)
      .some((token) => basename(token) === "bun");
  } catch {
    return false;
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

/** A `.ts` target, or one whose shebang names bun, is run through bun; anything else is
 *  executed directly. */
function toTarget(path: string): TargetInfo {
  const abs = resolve(path);
  const viaBun = abs.endsWith(".ts") || hasBunShebang(abs);
  return { path: abs, argv0: viaBun ? ["bun", abs] : [abs] };
}

export async function checkCommand(
  targetPath: string,
  opts: CheckOptions,
  mode: OutputMode,
  startedAt: number,
): Promise<void> {
  const target = toTarget(targetPath);
  if (!existsSync(target.path)) {
    throw notFoundError(`no such file: ${targetPath}`, {
      hint: "Pass a path to an executable or a .ts entry point.",
    });
  }

  // A target that cannot execute gets an ERROR, never a report. Reporting it would mean
  // publishing verdicts derived from a process that never ran — see TargetNotExecutableError.
  // `not_found` is the honest kind: the caller named something that is not a runnable CLI.
  let history: History;
  try {
    history = await record(target, CHECKERS);
  } catch (err) {
    if (err instanceof TargetNotExecutableError) {
      throw notFoundError(`target could not be executed: ${targetPath}`, {
        hint: "The file exists but could not be spawned. Check the exec bit, the shebang, and the architecture.",
        details: { argv0: target.argv0 },
      });
    }
    throw err;
  }
  const findings = runCheckers(history, CHECKERS);
  // Run at L0: everything the kit can probe without effect-classifying subcommands first. A
  // checker whose rule needs a higher level (e.g. A4) is reported not-applicable here rather
  // than unverified — see buildReport's `level` parameter.
  //
  // `opts.expectations` is passed through UNDEFAULTED: the kit distinguishes "nobody asked" (a
  // missing file in the cwd is normal) from "the caller named a path" (a missing one is their
  // mistake, and continuing with an empty set would fail rules they believed were excused).
  // The registry goes in so a mistyped id is rejected rather than silently excusing nothing.
  let expectations: Expectations;
  try {
    expectations = loadExpectations(
      opts.expectations,
      CHECKERS.map((c) => c.ruleId),
    );
  } catch (err) {
    // `usage`, not `internal`: every one of these is something the caller can fix by editing a
    // file they own. Reported as `internal` it would read as a defect in acc.
    if (err instanceof ExpectationsError) {
      throw usageError(`${err.path} ${err.message}`, {
        hint: "Fix the expectations file, or drop --expectations to skip it.",
        details: { path: err.path },
      });
    }
    throw err;
  }
  const report = buildReport(history, findings, CHECKERS, expectations, "L0");

  // The rule that actually explains the report's headline — see primaryProblem, which owns the
  // ranking (violations before gaps, and the rule that owns a failure mode before whatever
  // happens to come first in the registry).
  const firstCoreProblem = primaryProblem(history, report);
  // ...falling back to the first rule with an evidence gap, which is the only outstanding thing
  // on a run where every applicable core rule PASSED and some of those passes were partial.
  // `primaryProblem` ranks verdicts and has nothing to say about that case; offering a hardcoded
  // "acc show A1" for it would send the caller to a rule that passed cleanly.
  const nextRule = firstCoreProblem?.ruleId ?? report.evidenceGaps[0]?.ruleId;

  emit({
    mode,
    command: "check",
    startedAt,
    data: report,
    // Offered whenever something core is outstanding — violation, gap, or a pass narrower than
    // its rule. A caller staring at an unverified core rule needs the page just as much as one
    // staring at a failure, and a caller staring at `fullyVerified: false` over nothing but
    // partial coverage needs it more, because no line in the findings list looks wrong.
    next: nextRule
      ? [
          {
            command: `acc show ${nextRule}`,
            // Not "the FIRST violation" any more: for a hang the offer is E1, which may sit
            // well after the other rules the hang tripped. Naming a position the ranking no
            // longer guarantees would be a small lie in the field that tells the caller what
            // they are about to read.
            when: !report.conformant
              ? "to read the rule that best explains the violations"
              : firstCoreProblem
                ? "to read the rule that could not be verified"
                : "to read a rule whose checker establishes only part of it",
          },
        ]
      : [],
    renderText: (r) => {
      const bold = useColor() ? "\x1b[1m" : "";
      const reset = useColor() ? "\x1b[0m" : "";
      // `unverified` and "not applicable at this level" are different claims — see
      // ReportedFinding.applicable — and collapsing them to the same glyph in text mode would
      // lose a distinction the JSON output (and report.ts's own doc comment) treats as
      // load-bearing: "out of scope here" vs "tried and could not establish it".
      const mark = (f: ReportedFinding) => {
        if (f.verdict === "pass") return "PASS";
        if (f.verdict === "fail") return "FAIL";
        return f.applicable ? "UNVR" : "N/A ";
      };
      // A `+` on a PASS whose checker declares `coverage: "partial"`. Without it the strongest
      // glyph in the report sits beside a rule the kit only sampled, and the reader has to know
      // to cross-reference the gap block below to find out which passes were narrow ones.
      const lines = r.findings.map(
        (f) =>
          `  ${mark(f)}${f.verdict === "pass" && f.coverage === "partial" ? "+" : " "} ${f.ruleId.padEnd(3)} ${f.detail}${f.excused ? " (excused)" : ""}`,
      );
      // Named, not counted. `fullyVerified: false` with nothing beside it is the same
      // information-free verdict this project criticises a CLI for emitting — the caller learns
      // that something is missing and nothing about what. Printed in full rather than
      // summarised because these ARE the report's caveats; the JSON carries the same list under
      // `evidenceGaps`.
      const gaps = r.evidenceGaps.map((e) => `    ${e.ruleId.padEnd(3)} ${e.gaps.join("; ")}`);
      // Both claims, on one line, always. The verdict answers "did anything VIOLATE a core
      // rule"; the counts beside it answer "and was everything actually established". Naming
      // the level is part of the claim, not decoration — A4 is core and silently excluded as
      // N/A at L0, so a bare "CONFORMANT" overstates what was checked.
      //
      // Both counts here are CORE, and both say so. The summary line below counts `unverified`
      // across every tier, so the two lines legitimately disagree — a target with one
      // diagnostic gap and no core one printed "0 unverified" above "unverified 1", with
      // nothing on either line naming the scope that made them differ.
      const verdict = r.conformant ? "CONFORMANT" : "NOT CONFORMANT";
      return [
        `${bold}${verdict} (${r.level})${reset} — ${r.counts.coreFailures} core violated, ${r.counts.coreUnverified} core unverified, ${r.counts.corePartial} core partially covered  ${r.target}`,
        "",
        ...lines,
        "",
        `  core ${r.counts.corePassed}/${r.counts.core} · violations ${r.counts.coreFailures} · unverified ${r.counts.unverified} (all tiers; ${r.counts.coreUnverified} core) · partial coverage ${r.counts.corePartial} core · diagnostics ${r.counts.diagnosticFailures}`,
        // Two claims, and the weaker one now has to say what it is short of. "Conformant but not
        // fully verified" is the honest resting state of an L0 run against almost any target,
        // including acc itself, and a report that did not spell out the difference would leave a
        // reader assuming the headline covered both.
        `  ${
          r.fullyVerified
            ? "every applicable core rule was verified in full"
            : "conformance means no core rule was VIOLATED; it does not mean every core rule was established"
        }`,
        ...(gaps.length
          ? ["", `  NOT FULLY VERIFIED (${r.level}) — what the evidence does not cover:`, ...gaps]
          : []),
        "",
        "  PASS pass · FAIL fail · UNVR unverified (probed, inconclusive) · N/A  not applicable at this level",
        "  PASS+ passed, but the checker establishes only part of its rule — see the gaps above",
        ...(r.staleExpectations.length
          ? [`  stale expectations (now passing, remove them): ${r.staleExpectations.join(", ")}`]
          : []),
      ].join("\n");
    },
  });

  // Non-zero-ness is the ONE signal a harness that never parses stdout still sees. The report
  // itself is not an error — stdout stays `ok: true` and well-formed data — but exiting 0 on a
  // non-conformant target is exactly the silent-failure shape this whole project exists to
  // catch a CLI doing.
  //
  // Fires on a VIOLATION only. An unverified core rule is a gap in the evidence, not a defect
  // in the target, and exiting 9 for one told `git` it had failed a rule it had not broken.
  // It is still reported prominently and still gates `fullyVerified`.
  //
  // `process.exitCode` and return, never `process.exit()`: exiting immediately after a stdout
  // write can truncate it when stdout is a pipe. Setting the code lets the runtime flush and
  // exit on its own, which removes that failure class rather than making it unlikely.
  if (!report.conformant) process.exitCode = Outcome.NonConformant;
}
