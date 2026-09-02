import { existsSync, readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { emit, type OutputMode, useColor } from "../envelope.ts";
import { notFoundError, usageError } from "../errors.ts";
import {
  argvFamily,
  argvLabel,
  type Comparison,
  compareReports,
  type LabelledReport,
  type ProbeComparison,
  type SurfaceRow,
} from "../kit/compare.ts";
import { identitySummaryLines } from "../kit/identity.ts";
import type { Report } from "../kit/report.ts";
import { type Surface, surfaceSummary } from "../kit/surface.ts";

/**
 * `acc compare` — where several targets answer the same probe differently.
 *
 * WHY THE INPUT IS STORED REPORTS RATHER THAN TARGETS. Both were on the table and both work; the
 * arguments that decided it:
 *
 *  - **No new safety surface.** `acc check` is the one command in this CLI that executes a
 *    stranger's binary, and its help carries eleven lines of warning about what L0 does not
 *    prevent. Taking targets here would mean N times that risk behind a command whose name
 *    sounds inert, and every one of those warnings would have to be repeated on this surface.
 *    Reading JSON files executes nothing, so `compare` is `read_only` in the strong sense the
 *    schema's `effects` field means it — the sense `check` had to give up (see its declaration).
 *  - **The reports already exist.** This is the finding that prompted the command: the author of
 *    the eight-CLI report reproduced §2's table with a shell loop while eight `--json` reports
 *    sat in the same directory holding the same numbers. The data was there and the read was
 *    missing. A form that re-probes solves a problem nobody had.
 *  - **The comparison is then reproducible and cheap.** Reports are artifacts. Two people
 *    comparing the same eight files get the same document, a comparison across a week of stored
 *    runs is possible, and re-reading twenty reports costs no process spawns.
 *
 * WHAT THE OTHER FORM WOULD HAVE BOUGHT, since it is a real cost and not a rejected idea:
 * friendliness (`acc compare ./a ./b` with nothing to prepare) and, more sharply, ACCESS TO THE
 * STREAMS. A `Report` carries byte counts and digests, never content — see the note in
 * `compare.test.ts` about the one divergence in §2 this surface therefore cannot express.
 * `acc check <each> --json > <file>` is two lines of shell away, and nothing here forecloses a
 * later `--target` form that records first and compares after.
 */

/**
 * Read one report file.
 *
 * ACCEPTS BOTH SHAPES, deliberately: the envelope `acc check --json` writes, and a bare `Report`
 * someone extracted with `jq '.data'`. Both are things a caller plausibly has on disk, and
 * refusing the second would make the obvious preparation step — pulling the payload out — the
 * thing that breaks the next command.
 */
export function loadReport(path: string): Report {
  const abs = resolve(path);
  if (!existsSync(abs)) {
    throw notFoundError(`no such report: ${path}`, {
      hint: "Pass a file written by `acc check <target> --json`.",
      details: { path: abs },
    });
  }
  let document: unknown;
  try {
    document = JSON.parse(readFileSync(abs, "utf8"));
  } catch (err) {
    // `usage`, not `internal`: the caller named a file that is not what this command reads, and
    // that is something they can fix. Reported as `internal` it would read as a defect in acc.
    throw usageError(`${abs} is not JSON: ${err instanceof Error ? err.message : String(err)}`, {
      hint: "Pass a file written by `acc check <target> --json`.",
      // `reason` is the branching field — a wrapper distinguishing "the artifact is corrupt"
      // from the shapes below reads this rather than parsing prose. Values kebab-case on the
      // `release.ts` precedent.
      details: { path: abs, reason: "not-json" },
    });
  }
  const envelope = document as { ok?: unknown; data?: unknown };
  const payload = envelope?.ok === true && envelope.data ? envelope.data : document;
  const report = payload as Partial<Report>;
  // The two fields this command cannot work without, checked by hand rather than by trusting the
  // cast. A report missing `observations` is the one input that would otherwise produce an empty
  // comparison and no complaint — the silent-no-op shape this whole catalogue objects to.
  if (!Array.isArray(report.observations) || typeof report.target !== "string") {
    throw usageError(`${abs} is not an acc check report`, {
      hint: "It must carry `.data.target` and `.data.observations[]` — write one with `acc check <target> --json`.",
      details: { path: abs, reason: "not-a-report" },
    });
  }
  return payload as Report;
}

/**
 * The name a reader sees for each report.
 *
 * The FILE's basename rather than the target's, because the file is what the caller typed and
 * what they will type again — and because comparing two runs of the SAME target (before and
 * after a change) is a legitimate use that a target-derived label would render as two identical
 * columns. Collisions fall back to the full path for the same reason: a comparison whose columns
 * cannot be told apart is not a comparison.
 */
function labelsFor(paths: string[]): string[] {
  const short = paths.map((p) => basename(p).replace(/\.json$/i, ""));
  return short.map((s, i) => (short.filter((o) => o === s).length > 1 ? (paths[i] as string) : s));
}

const pad = (s: string, width: number) => s.padEnd(width);

/** `spell out=0 err=51 · anthill out=152 err=0` — the row of the report's own §2 table. */
function bytesLine(p: ProbeComparison): string {
  return p.outcomes.map((o) => `${o.label} out=${o.stdoutBytes} err=${o.stderrBytes}`).join(" · ");
}

/**
 * Fold a repetition family whose members all say the same thing into ONE row.
 *
 * C3, D4 and F2 each record the same argv two or three times, so a population that disagrees
 * about `--version` produces four identical divergence rows — the base probe plus three
 * repetitions — and a reader counting rows sees four disagreements where there is one. The fold
 * is presentational ONLY: `.data.divergent[]` keeps every probe, because a repetition that
 * behaved DIFFERENTLY is a real thing to see, and this is what makes it visible — such a member
 * does not match its family's signature and is printed on its own line with its `#n` intact.
 */
function foldRepeats(probes: ProbeComparison[]): Array<{ probe: ProbeComparison; runs: number }> {
  const rows: Array<{ probe: ProbeComparison; runs: number; key: string }> = [];
  for (const probe of probes) {
    // The whole rendered content of the row: if two repetitions agree on this, printing both
    // adds a line and no information.
    const key = JSON.stringify([argvFamily(probe), probe.axes, bytesLine(probe), probe.absent]);
    const existing = rows.find((r) => r.key === key);
    if (existing) existing.runs += 1;
    else rows.push({ probe, runs: 1, key });
  }
  return rows.map(({ probe, runs }) => ({ probe, runs }));
}

/** The argv, plus how many identical recordings it stands for. */
function rowLabel(probe: ProbeComparison, runs: number): string {
  return runs === 1 ? argvLabel(probe) : `${argvFamily(probe)}  (${runs} identical runs)`;
}

/**
 * A `SurfaceRow` back in the shape `surfaceSummary` reads, so `check` and `compare` render the
 * capture through ONE function. The `not-enumerated` and `enumerated-none` sentences are the ones
 * this whole capture exists to keep apart — a silence attributed to the read against an emptiness
 * attributed to the target — and two copies of either are two chances to get it wrong in one place
 * only.
 */
export function rowSurface(row: SurfaceRow): Surface | undefined {
  if (row.status === "not-recorded") return undefined;
  return {
    status: row.status,
    ...(row.flags ? { flags: row.flags } : {}),
    ...(row.consistent === undefined ? {} : { consistent: row.consistent }),
    evidence: [],
    probesRead: row.probesRead,
    // CARRIED, NOT DROPPED: `surfaceSummary` reads these for `enumerated-none` (`emptySetKeys`)
    // and for the near-miss clause both `not-enumerated` and `enumerated-none` render
    // (`nonFlagCandidates`). `SurfaceRow` never carries `evidence` above and no clause of
    // `surfaceSummary` reads it, but a field the sentence DOES read has to travel here too, or
    // `check` and `compare` print two different sentences for one status — the thing the comment
    // above this function forbids.
    ...(row.emptySetKeys ? { emptySetKeys: row.emptySetKeys } : {}),
    ...(row.nonFlagCandidates ? { nonFlagCandidates: row.nonFlagCandidates } : {}),
  };
}

function renderText(c: Comparison): string {
  const bold = useColor() ? "\x1b[1m" : "";
  const reset = useColor() ? "\x1b[0m" : "";
  const width = Math.max(...c.targets.map((t) => t.label.length), 1);

  const divergentFolded = foldRepeats(c.divergent);
  const divergentRows = divergentFolded.length;
  const divergent = divergentFolded.flatMap(({ probe: p, runs }) => [
    `    ${bold}${rowLabel(p, runs)}${reset}`,
    // One line per group, per axis — which IS "who differs from whom on what", spelled out
    // rather than left to be reconstructed from a table. An axis where everyone agrees is
    // printed too: dropping it would leave a reader unable to tell "they agree on where the
    // bytes went" from "nobody looked at where the bytes went".
    ...p.axes.flatMap((a) =>
      a.groups.map(
        (g, i) =>
          `      ${pad(i === 0 ? a.axis : "", 10)} ${pad(g.value, 34)} ${g.targets.join(", ")}`,
      ),
    ),
    `      ${pad("bytes", 10)} ${bytesLine(p)}`,
    ...(p.absent.length ? [`      ${pad("not run", 10)} ${p.absent.join(", ")}`] : []),
    "",
  ]);

  // The agreed row carries the answer everyone gave, not just the argv: "they all agree" is a
  // weaker sentence than "they all exit 2 with the message on stderr", and the second is the one
  // a reader can carry to the next tool they write.
  const agreed = foldRepeats(c.agreed).map(
    ({ probe: p, runs }) =>
      `    ${pad(`${p.outcomes[0]?.ending ?? ""} · ${p.outcomes[0]?.placement ?? ""}`, 26)} ${rowLabel(p, runs)}`,
  );

  const unaligned = foldRepeats(c.unaligned).map(
    ({ probe: p, runs }) => `    ${pad(rowLabel(p, runs), 44)} ${p.present.join(", ")}`,
  );

  return [
    `${bold}COMPARISON${reset} — ${c.counts.targets} targets, ${c.counts.aligned} probes aligned, ${c.counts.divergent} divergent  [acc ${c.kitVersions.join(", ")}]`,
    "",
    // WHAT EACH TARGET SAID ABOUT ITSELF, on the line under the path it was said from.
    //
    // Here rather than in a section of its own because it is a COORDINATE on the target, like the
    // path above it — not a probe anybody is comparing. A target whose report predates the capture
    // gets no second line rather than an invented one.
    ...c.targets.flatMap((t) => [
      `  ${pad(t.label, width)}  ${t.target}`,
      ...(t.identity
        ? identitySummaryLines(t.identity).map((l) => `  ${pad("", width)}  ${l}`)
        : []),
    ]),
    // THE SENTENCE THIS FIELD WAS ADDED FOR, printed only when the situation it describes is
    // actually on screen. Two targets that call themselves the same thing and answer probes
    // differently is `DT-10` — and it is the one reading of this column a reader could otherwise
    // reach by accident and in the wrong direction, by taking equal quotes for one binary.
    //
    // A TRUNCATED OR LOSSY QUOTE CANNOT ESTABLISH THE PREMISE, so it withholds the sentence. The
    // NOTE asserts that these targets said the same thing, and `truncated` means the quote is a
    // prefix while `lossy` means (in the field's own words) that equality of these strings is not
    // equality of bytes — either way, equal renderings are consistent with different answers.
    // Withholding rather than qualifying: the NOTE's whole job is to be believed on sight.
    ...(() => {
      const stated = c.targets
        .map((t) => t.identity)
        .filter((i) => i?.status === "stated" && !i.truncated && !i.lossy);
      const said = new Set(stated.map((i) => i?.said));
      return stated.length === c.targets.length &&
        c.targets.length > 1 &&
        said.size === 1 &&
        c.counts.divergent > 0
        ? [
            "",
            `  NOTE: every target here said the same thing about itself and they answered ${c.counts.divergent} probe${c.counts.divergent === 1 ? "" : "s"}`,
            "  differently. Identical bytes under --version are not evidence of one binary.",
          ]
        : [];
    })(),
    // Only when it happened. Two reports from two kit versions compare two instruments as well
    // as two tools, and the counts above cannot show it.
    ...(c.kitVersions.length > 1
      ? ["", `  NOTE: these reports were produced by different kit versions — probes may differ.`]
      : []),
    "",
    ...(divergent.length
      ? [
          `  ${bold}DIVERGENT (${c.counts.divergent})${reset} — same argv, different answer:`,
          // Says the arithmetic out loud, and only when it applies. Nine rows under a heading
          // that counts seventeen looks like a rendering bug until you know that three rules
          // record some argvs several times over to ask about determinism.
          ...(divergentRows > 0 && divergentRows !== c.counts.divergent
            ? [
                `    (${divergentRows} invocations; repeated recordings of one argv are folded, and the JSON keeps each)`,
              ]
            : []),
          "",
          ...divergent,
        ]
      : [`  DIVERGENT (0) — every aligned probe was answered the same way by every target.`, ""]),
    // The agreed list is what makes the divergent list readable: a comparison reporting four
    // divergences out of four aligned probes is a different document from one reporting four out
    // of eighteen, and the counts alone leave the reader unable to see which they are holding.
    ...(agreed.length
      ? [`  AGREED (${c.counts.agreed}) — answered alike by every target:`, ...agreed, ""]
      : []),
    ...(unaligned.length
      ? [
          `  NOT ALIGNED (${c.counts.unaligned}) — run against some targets only, so nothing to compare:`,
          ...unaligned,
          "    (probes built from a target's OWN help — a near-miss of a flag it advertises, its",
          "    machine-mode flag — differ by construction; this is not a finding about anyone.)",
          "",
        ]
      : []),
    // WHAT EACH TARGET SAYS IT ACCEPTS, carried across from each report's own capture.
    //
    // Under the divergence blocks and not among them, because it is not one: no probe is being
    // compared here and no target is in a group. It earns a place on this surface because the
    // question it answers is a population question — an agent driving eight of these tools finds
    // out from this column which of them will tell it what they accept when it gets a flag wrong.
    // Printed for every target including the silent ones, since the silent ones are the finding.
    `  ${bold}SELF-DECLARED FLAGS${reset} — what each target says it accepts, read from its own`,
    "  rejection of an unknown flag AT THE ROOT, the only path probed. Evidence, not an axis:",
    "  differing here is not diverging.",
    ...c.surfaces.map((s) => `    ${pad(s.label, width)}  ${surfaceSummary(rowSurface(s))}`),
    "",
    // THE LAST WORD, on every comparison, because the format invites the other reading. Rows,
    // groups and counts look like a scoreboard, and a reader who takes it for one will go and
    // "fix" the tool in the smaller group. The charter's position is that consistency is not
    // uniformity: what this surface produces is a difference someone can see, which turns it
    // from an accident into a choice.
    "  A COMPARISON, NOT A VERDICT — no rule was applied, nothing passed, nothing failed, and",
    "  this command exits 0 whatever it finds. Two tools differing is a decision to make, not a",
    "  defect to clear; where they differ, either may be right.",
  ].join("\n");
}

export function compareCommand(reportPaths: string[], mode: OutputMode, startedAt: number): void {
  // TWO IS THE FLOOR, and it is a usage error rather than a degenerate answer. A one-report
  // "comparison" would emit a document whose every probe is unaligned and whose divergence count
  // is zero — a confident-looking answer to a question that was never asked.
  if (reportPaths.length < 2) {
    throw usageError(`compare needs at least two reports, got ${reportPaths.length}`, {
      hint: "Write one per target with `acc check <target> --json > <file>`, then pass them all.",
    });
  }
  const labels = labelsFor(reportPaths);
  const inputs: LabelledReport[] = reportPaths.map((p, i) => ({
    label: labels[i] as string,
    report: loadReport(p),
  }));

  const comparison = compareReports(inputs);

  emit({
    mode,
    command: "compare",
    startedAt,
    data: comparison,
    // No `next` when nothing diverged: the useful follow-up is to read a divergence, and
    // offering one where there is none sends the caller to an empty array.
    next: comparison.counts.divergent
      ? [
          {
            exec: "acc",
            // One element per path, never a joined string: a report path is filesystem input,
            // and a space or a quote in one is a filename here rather than an argument break.
            args: ["compare", ...reportPaths, "--json"],
            when: "to read every divergence with its byte counts and digests",
          },
        ]
      : [],
    renderText,
  });
  // NOTHING SETS AN EXIT CODE HERE, and that is the design rather than an omission. `check` exits
  // 9 on a non-conformant target because a violation is a finding a harness must see; a
  // divergence is not a violation, and gating CI on one would make this surface an enforcer of
  // uniformity — the thing the charter says the project is not for.
}
