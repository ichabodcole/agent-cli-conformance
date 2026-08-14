import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { emit, type OutputMode, useColor } from "../envelope.ts";
import { notFoundError } from "../errors.ts";
import { Outcome } from "../exit-codes.ts";
import { loadExpectations } from "../kit/expectations.ts";
import { record, TargetNotExecutableError } from "../kit/record.ts";
import { CHECKERS } from "../kit/registry.ts";
import { buildReport, type ReportedFinding, runCheckers } from "../kit/report.ts";
import type { History, TargetInfo } from "../kit/types.ts";

export interface CheckOptions {
  expectations?: string;
}

/** A `.ts` target is run through bun; anything else is executed directly. */
function toTarget(path: string): TargetInfo {
  const abs = resolve(path);
  return { path: abs, argv0: abs.endsWith(".ts") ? ["bun", abs] : [abs] };
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
  const expectations = loadExpectations(opts.expectations ?? ".");
  const report = buildReport(history, findings, CHECKERS, expectations, "L0");

  // The rule that actually explains why this target is not conformant — a core, applicable,
  // unexcused fail or unverified. Filtered to `applicable` core findings specifically: with no
  // filter, an early DIAGNOSTIC fail (which never blocks conformance) could shadow the real,
  // later CORE fail that does, pointing the caller at a rule that isn't why the check is red.
  const firstCoreProblem = report.findings.find(
    (f) =>
      f.applicable &&
      f.tier === "core" &&
      !f.excused &&
      (f.verdict === "fail" || f.verdict === "unverified"),
  );

  emit({
    mode,
    command: "check",
    startedAt,
    data: report,
    next: report.conformant
      ? []
      : [
          {
            command: `acc show ${firstCoreProblem?.ruleId ?? "A1"}`,
            when: "to read the rule behind the first failure",
          },
        ],
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
      const lines = r.findings.map(
        (f) => `  ${mark(f)}  ${f.ruleId.padEnd(3)} ${f.detail}${f.excused ? " (excused)" : ""}`,
      );
      const verdict = r.conformant ? "CONFORMANT" : "NOT CONFORMANT";
      return [
        `${bold}${verdict}${reset}  ${r.target}`,
        "",
        ...lines,
        "",
        `  core ${r.counts.corePassed}/${r.counts.core} · failures ${r.counts.coreFailures} · unverified ${r.counts.unverified} · diagnostics ${r.counts.diagnosticFailures}`,
        "  PASS pass · FAIL fail · UNVR unverified (probed, inconclusive) · N/A  not applicable at this level",
        ...(r.staleExpectations.length
          ? [`  stale expectations (now passing, remove them): ${r.staleExpectations.join(", ")}`]
          : []),
      ].join("\n");
    },
  });

  // Non-zero-ness is the ONE signal a harness that never parses stdout still sees. The report
  // itself is not an error — stdout stays `ok: true` and well-formed data — but exiting 0 on a
  // non-conformant target is exactly the silent-failure shape this whole project exists to
  // catch a CLI doing. `emit` already performed the one stdout write; this only decides the
  // process's exit status afterward.
  if (!report.conformant) process.exit(Outcome.NonConformant);
}
