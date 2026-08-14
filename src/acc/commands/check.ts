import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { emit, type OutputMode, useColor } from "../envelope.ts";
import { notFoundError } from "../errors.ts";
import { loadExpectations } from "../kit/expectations.ts";
import { record } from "../kit/record.ts";
import { CHECKERS } from "../kit/registry.ts";
import { buildReport, runCheckers } from "../kit/report.ts";
import type { TargetInfo } from "../kit/types.ts";

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

  const history = await record(target, CHECKERS);
  const findings = runCheckers(history, CHECKERS);
  // Run at L0: everything the kit can probe without effect-classifying subcommands first. A
  // checker whose rule needs a higher level (e.g. A4) is reported not-applicable here rather
  // than unverified — see buildReport's `level` parameter.
  const expectations = loadExpectations(opts.expectations ?? ".");
  const report = buildReport(history, findings, CHECKERS, expectations, "L0");

  emit({
    mode,
    command: "check",
    startedAt,
    data: report,
    next: report.conformant
      ? []
      : [
          {
            command: `acc show ${report.findings.find((f) => f.verdict === "fail")?.ruleId ?? "A1"}`,
            when: "to read the rule behind the first failure",
          },
        ],
    renderText: (r) => {
      const bold = useColor() ? "\x1b[1m" : "";
      const reset = useColor() ? "\x1b[0m" : "";
      const mark = (v: string) => (v === "pass" ? "PASS" : v === "fail" ? "FAIL" : "----");
      const lines = r.findings.map(
        (f) =>
          `  ${mark(f.verdict)}  ${f.ruleId.padEnd(3)} ${f.detail}${f.excused ? " (excused)" : ""}`,
      );
      const verdict = r.conformant ? "CONFORMANT" : "NOT CONFORMANT";
      return [
        `${bold}${verdict}${reset}  ${r.target}`,
        "",
        ...lines,
        "",
        `  core ${r.counts.corePassed}/${r.counts.core} · failures ${r.counts.coreFailures} · unverified ${r.counts.unverified} · diagnostics ${r.counts.diagnosticFailures}`,
        ...(r.staleExpectations.length
          ? [`  stale expectations (now passing, remove them): ${r.staleExpectations.join(", ")}`]
          : []),
      ].join("\n");
    },
  });
}
