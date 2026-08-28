import { resolve } from "node:path";
import { emit, type OutputMode } from "../envelope.ts";
import { usageError } from "../errors.ts";
import { Outcome } from "../exit-codes.ts";
import type { Report } from "../kit/report.ts";
import { renderCheckReportText } from "./check.ts";
import { loadReport } from "./compare.ts";

/**
 * `acc report` — render the text report from a JSON a check already wrote.
 *
 * THE ASK THIS ANSWERS, twice over. One adopter wanted "a way to re-render the human report from
 * the JSON I had saved"; another ran the whole check twice — once for the text, once redirected
 * for the JSON. Both asks are one verb: run once (`acc check <t> --json > report.json`), render
 * as often as wanted. The alternative — a check that emits both formats — was rejected on a
 * measured constraint: redirecting stdout is how a caller GETS json, that inference is
 * load-bearing for two adopters, and this command leaves `check` untouched.
 *
 * AGREEMENT BY CONSTRUCTION. Two sweeps cannot be assumed to agree, and their evidence ids align
 * whether or not they do (ids hash the invocation, not the outcome — measured: same id,
 * different stdout digests on a nondeterministic target). A rendering of a stored artifact
 * describes the same sweep as the artifact, by construction; both renderings carry the same
 * `sweep` mark so a reader can verify a pairing instead of trusting it.
 *
 * THE EXIT CODE MIRRORS THE STORED VERDICT (0 conformant, 9 not). A rendered verdict is still a
 * verdict about the subject — the 9–123 band is "what the subject turned out to be" — and the
 * text and the one signal that survives truncation must travel together, exactly as they do on a
 * live run. `compare` exits 0 always because it genuinely produces no verdict; this command's
 * whole output is one.
 *
 * A RENDERING MUST SAY IT IS ONE. This is the first thing in this tool that can render a past
 * state as a present one — the stored target may have changed since the sweep — so the prelude
 * names the source file and the capture time, and an artifact from before reports carried a time
 * says so rather than looking current. The same rule covers every field this artifact may
 * predate: the report shape became an INPUT format the day this command landed, and a missing
 * thing must render as "not recorded by that kit", never as an absent thing.
 */
export function reportCommand(file: string, mode: OutputMode, startedAt: number): void {
  const data = loadReport(file);
  // `loadReport` (one home, shared with `compare`) establishes target + observations. Rendering
  // a VERDICT needs the verdict skeleton on top, checked by hand for the same reason: a file
  // missing these would otherwise render a confident empty document.
  const partial = data as Partial<Report>;
  if (
    typeof partial.conformant !== "boolean" ||
    !Array.isArray(partial.findings) ||
    typeof partial.counts !== "object" ||
    partial.counts === null
  ) {
    throw usageError(`${file} carries observations but not a verdict this command can render`, {
      hint: "Pass the full JSON `acc check <target> --json` writes — `.data.conformant`, `.data.counts` and `.data.findings[]` are what the text report is made of.",
      details: { path: resolve(file), kitVersion: partial.kitVersion ?? "unknown" },
    });
  }
  const prelude = [
    "RENDERED FROM A STORED REPORT — nothing was re-run; the verdict below is as old as the file.",
    `  source: ${resolve(file)}`,
    data.capturedAt
      ? `  captured ${data.capturedAt}`
      : `  captured: not recorded — this artifact was written by acc ${data.kitVersion}, before reports carried a time`,
  ];
  emit({
    mode,
    command: "report",
    startedAt,
    data,
    // The stored report's own `next` is gone with its envelope; the useful follow-up from a
    // rendering is the same as from a live run and the renderer's body already names the
    // evidence surfaces, so nothing is offered here rather than something guessed.
    next: [],
    renderText: (r) => renderCheckReportText(r, prelude),
  });
  if (!data.conformant) process.exitCode = Outcome.NonConformant;
}
