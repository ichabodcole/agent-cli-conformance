import {
  accessSync,
  closeSync,
  constants,
  existsSync,
  openSync,
  readSync,
  statSync,
} from "node:fs";

import { basename, resolve } from "node:path";
import { emit, type OutputMode, useColor } from "../envelope.ts";
import { notFoundError, usageError } from "../errors.ts";
import { Outcome } from "../exit-codes.ts";
import { type AccConfig, CONFIG_FILE, ConfigError, loadConfig } from "../kit/config.ts";
import {
  type Declaration,
  DeclarationError,
  declarationSummary,
  loadDeclaration,
} from "../kit/declaration.ts";
import { identitySummaryLines } from "../kit/identity.ts";
import { record, TargetNotExecutableError } from "../kit/record.ts";
import {
  identityLines,
  loadRecordedBatch,
  provenanceLabel,
  type RecordedReading,
  RecordedSurfacesError,
  readRecordedBatch,
} from "../kit/recorded.ts";
import { CHECKERS, UNCHECKED_RULES } from "../kit/registry.ts";
import {
  buildReport,
  primaryProblem,
  type Report,
  type ReportedFinding,
  runCheckers,
} from "../kit/report.ts";
import { advertisedVerbsSummary, type SurfaceStatus, surfaceSummary } from "../kit/surface.ts";
import type { History, TargetInfo } from "../kit/types.ts";
import { VERSION } from "../version.ts";

export interface CheckOptions {
  configDir?: string;
  /** Path to a declaration file. A path the caller named that cannot be read is an ERROR — see
   *  the load below, which follows `--config-dir`'s rule for the same reason. */
  declaration?: string;
  /**
   * Path to a batch of caller-recorded surfaces. Read, never executed — the whole feature is a
   * read over bytes the caller already has, which is why it needs no effects claim and no probe
   * warrant. A named path that cannot be read is an ERROR, for the same reason `declaration`'s is.
   *
   * At most one. The refusal of a second lives in `cli.ts`, over raw argv, because commander is
   * last-wins and the option's parser never sees the first occurrence again.
   */
  recordedSurfaces?: string;
}

/** Enough for any real interpreter line — the kernel caps it at 127 bytes on Linux and the BSDs
 *  — and small enough that pointing `acc check` at a gigabyte-sized binary costs one page. */
const SHEBANG_BYTES = 256;

/**
 * The interpreter a target's `#!` line names, by basename, or null when it has none.
 *
 * `env` and its flags are skipped, so `#!/usr/bin/env bun`, `#!/usr/bin/env -S bun run` and
 * `#!/opt/homebrew/bin/bun` all answer "bun", while `bunx` and a node living under
 * `/home/bunny/bin` answer their own names rather than matching a substring.
 *
 * Reading a `#!` line is NOT the guess `inert.ts` refuses. That refusal is about whether a
 * target's root positional is free-form data — a property with no observable signal, where a
 * wrong answer licenses an unsafe spawn. A shebang is the kernel's own contract about what runs
 * the file, and it is in the first bytes of the file.
 *
 * Never throws. An unreadable file, a directory, a race between `existsSync` and here — all are
 * "no shebang", and the existing not-found/not-executable paths report them properly.
 */
function shebangInterpreter(abs: string): string | null {
  let fd: number | undefined;
  try {
    fd = openSync(abs, "r");
    const buf = Buffer.alloc(SHEBANG_BYTES);
    const read = readSync(fd, buf, 0, SHEBANG_BYTES, 0);
    // A binary decodes to mojibake rather than throwing, and mojibake does not start with `#!`.
    const firstLine = buf.subarray(0, read).toString("utf8").split(/\r?\n/, 1)[0] ?? "";
    if (!firstLine.startsWith("#!")) return null;
    const tokens = firstLine.slice(2).trim().split(/\s+/).filter(Boolean);
    // `env` is not an interpreter, and `-S` is how you portably pass one its own arguments; the
    // first token that is neither is the program the kernel will hand the file to.
    const interpreter = tokens.find((t) => basename(t) !== "env" && !t.startsWith("-"));
    return interpreter ? basename(interpreter) : null;
  } catch {
    return null;
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

/** True when this process may execute the file — the ownership bits, not just `0o111`. */
export function isExecutable(abs: string): boolean {
  try {
    accessSync(abs, constants.X_OK);
    return statSync(abs).isFile();
  } catch {
    return false;
  }
}

/**
 * How the target will be launched.
 *
 * **An executable file is executed directly, so the kernel honours its own shebang.** Every
 * `.ts` path used to go through Bun regardless, which tests a different program from the one
 * users run: a Deno or Node-TypeScript CLI would be handed to a runtime it never declared,
 * changing argv handling and rejecting runtime-specific APIs — and quietly undercutting the
 * language-agnostic claim (review R2-5). The extension is a weaker signal than the `#!` line,
 * and the exec bit is what makes the `#!` line the kernel's business rather than ours.
 *
 * Bun is named in `argv0` in exactly two cases, and neither overrides a declared interpreter:
 *
 * 1. **The shebang says bun.** Then bun is what runs it either way, and naming it matters for
 *    A6: the runner compensates for bun's terminator stripping at the spawn (see `runner.ts`),
 *    and it can only do that when `argv0` NAMES bun. A Bun CLI installed without a `.ts`
 *    extension used to miss this argv0-naming case entirely, so the runner never compensated,
 *    and the CLI collected a FAIL derived from an argv it never received.
 * 2. **A non-executable `.ts` file with no conflicting shebang.** That is a SOURCE file rather
 *    than a program, and Bun is the documented fallback for running one. A non-executable file
 *    that declares some other interpreter gets neither: it is launched as itself and fails to
 *    spawn, which `record()` reports as `TargetNotExecutableError` — an honest "chmod +x it"
 *    rather than a verdict about a program nobody asked us to build.
 */
/**
 * The word the rollup counts in, per status.
 *
 * Kept beside the renderer rather than derived from `surfaceSummary`, because that function
 * writes a SENTENCE about one path and this needs a NOUN for a group — and slicing a substring
 * out of the sentence would be the text-matching predicate this rollup deliberately avoids.
 */
const VERDICT_WORD: Record<SurfaceStatus, string> = {
  enumerated: "enumerated",
  "not-enumerated": "did not enumerate",
  "enumerated-none": "stated an empty set",
  "no-evidence": "recorded nothing readable",
};

/**
 * `VERDICT_WORD`, READ AS THE RUNTIME LOOKUP IT ACTUALLY IS.
 *
 * The `Record<SurfaceStatus, string>` above is total over the TYPE, and that is worth keeping: a
 * fifth status is a `tsc` failure at the literal rather than a missing word at runtime. It is not
 * total over the VALUE. `p.status` is annotated `SurfaceStatus` but arrives from `JSON.parse` of a
 * stored report — `acc report` renders any report file, including one a newer kit wrote — and
 * nothing on that path validates it. Read without this guard the lookup printed `5 paths: 5
 * undefined`, which is the census reporting a count of nothing at all.
 *
 * The fallback says the same thing `surfaceSummary` says for a status it cannot read, and for the
 * same reason: this project renders what it cannot read as "not recorded by that kit", never as an
 * absent or garbled thing. The token is quoted so a reader can look it up in the kit that wrote it.
 */
function verdictWord(status: SurfaceStatus): string {
  // The cast is the honest half: it is what makes the `??` a real branch rather than dead code the
  // annotation has already promised away.
  const word = (VERDICT_WORD as Record<string, string | undefined>)[status];
  return word ?? `not recorded by this kit (status ${JSON.stringify(status)})`;
}

export function toTarget(path: string): TargetInfo {
  const abs = resolve(path);
  const interpreter = shebangInterpreter(abs);
  if (isExecutable(abs)) {
    return { path: abs, argv0: interpreter === "bun" ? ["bun", abs] : [abs] };
  }
  const bunFallback = abs.endsWith(".ts") && (interpreter === null || interpreter === "bun");
  return { path: abs, argv0: bunFallback ? ["bun", abs] : [abs] };
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

  // CONFIG BEFORE THE FIRST SPAWN, for two reasons.
  //
  // It carries `defaultOutput`, which discovery needs — a declaration is something the kit knows
  // about the target, and everything the kit knows about a target lives in Discovery.
  //
  // And it means a malformed `acc.config.json` is reported before the target is executed
  // eighteen times, rather than after. The old order spent the whole run and then refused to
  // publish it.
  let config: AccConfig;
  try {
    config = loadConfig(
      opts.configDir,
      CHECKERS.map((c) => c.ruleId),
    );
  } catch (err) {
    // `usage`, not `internal`: every one of these is something the caller can fix by editing a
    // file they own. Reported as `internal` it would read as a defect in acc.
    if (err instanceof ConfigError) {
      // THE ERROR PATH DISCLOSES WHAT THE SUCCESS PATH DOES. A report names the config it read
      // and how the kit reached it; a config that fails to load is the one moment the caller most
      // needs both, and it used to give neither — the file was named without its directory, and
      // the remedy offered was to drop a flag that a caller who had not typed `--config-dir`
      // could not drop. `err.path` is absolute (see `loadConfig`), so the file is now identified
      // the same way the `config:` line identifies it, and the hint tells a caller who named the
      // directory something different from a caller for whom the working directory chose it.
      throw usageError(`${err.path} ${err.message}`, {
        hint:
          opts.configDir === undefined
            ? // Reachable only for a file that EXISTS — a missing one in the working directory is
              // the normal case and never an error — so "fix it" is always the right verb here,
              // and what the caller is missing is how the kit ever reached it.
              `Fix that file. It was DISCOVERED in the working directory, not named on the command line, so nothing but the directory you ran from selected it.`
            : // Reachable for a missing file too, which is why this does not only say "fix".
              `Fix or create that file, or drop --config-dir — the working directory is searched instead, and no ${CONFIG_FILE} there is not an error.`,
        details: { path: err.path, origin: opts.configDir === undefined ? "discovered" : "flag" },
      });
    }
    throw err;
  }

  // THE DECLARATION, LIKE THE CONFIG, IS READ BEFORE THE FIRST SPAWN. A malformed document is
  // something the caller can fix by editing a file they own, and reporting it after eighteen
  // invocations of a stranger's binary spends the risky part of the run to deliver a message that
  // was available before it started.
  //
  // A NAMED PATH THAT CANNOT BE READ IS AN ERROR, never an empty diff. Continuing would publish a
  // report whose declaration block is absent — indistinguishable from a run where nobody asked
  // for one — over a caller who did.
  let declaration: Declaration | null = null;
  if (opts.declaration !== undefined) {
    try {
      declaration = loadDeclaration(opts.declaration);
    } catch (err) {
      if (err instanceof DeclarationError) {
        // A FILE THAT IS NOT THERE IS `not_found`; A FILE THAT IS THERE AND WRONG IS `usage`.
        // The two are different repairs — create it, or edit it — and the kind is how a machine
        // caller tells them apart without reading the prose. Applied identically to
        // `--recorded-surfaces` below and to `acc probe-plan`, so the same mistake does not answer
        // differently depending on which flag or which command met it.
        const opts = {
          hint: err.missing
            ? "Create that file, or drop --declaration — a run without one is a full report with no comparison in it."
            : "Fix that file, or drop --declaration — a run without one is a full report with no comparison in it.",
          details: { path: err.path },
        };
        throw err.missing
          ? notFoundError(`no such file: ${err.path}`, opts)
          : usageError(`${err.path} ${err.message}`, opts);
      }
      throw err;
    }
  }

  // THE BATCH IS READ BEFORE THE FIRST SPAWN TOO, and for the declaration's reason: a malformed
  // document is something the caller can fix by editing a file they own, and reporting it after
  // eighteen invocations of a stranger's binary spends the risky part of the run to deliver a
  // message that was available before it started. Nothing here executes anything — this is a read
  // over bytes the caller already has.
  let recorded: { source: string; reading: RecordedReading } | null = null;
  if (opts.recordedSurfaces !== undefined) {
    try {
      recorded = {
        source: resolve(opts.recordedSurfaces),
        reading: readRecordedBatch(loadRecordedBatch(opts.recordedSurfaces)),
      };
    } catch (err) {
      if (err instanceof RecordedSurfacesError) {
        // Same rule as `--declaration` above, and stated there.
        const opts = {
          hint: `${err.missing ? "Create" : "Fix"} that file, or drop --recorded-surfaces — a run without one reports the root the kit probes and says every other path was not reached.`,
          details: { path: err.path },
        };
        throw err.missing
          ? notFoundError(`no such file: ${err.path}`, opts)
          : usageError(`${err.path} ${err.message}`, opts);
      }
      throw err;
    }
  }

  // A target that cannot execute gets an ERROR, never a report. Reporting it would mean
  // publishing verdicts derived from a process that never ran — see TargetNotExecutableError.
  // `not_found` is the honest kind: the caller named something that is not a runnable CLI.
  let history: History;
  try {
    history = await record(
      target,
      CHECKERS,
      config.defaultOutput === "json",
      // The SAME config object buildReport reads, so the two consumers cannot disagree about what
      // was waived — one applies it to the verdict, the other to a checker's premise.
      new Set(
        Object.entries(config.rules).flatMap(([id, r]) => (r.severity === "off" ? [id] : [])),
      ),
    );
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
  // `opts.configDir` is passed UNDEFAULTED above: the kit distinguishes "nobody asked" (a
  // missing file in the cwd is normal) from "the caller named a path" (a missing one is their
  // mistake, and continuing with an empty set would fail rules they believed were excused).
  // The registry goes in so a mistyped id is rejected rather than silently excusing nothing.
  //
  // `UNCHECKED_RULES` goes in so the rules the catalogue declares and the kit cannot yet check
  // appear as `N/A` with their reason, rather than being absent from the report entirely.
  const report = buildReport(
    history,
    findings,
    CHECKERS,
    config,
    "L0",
    VERSION,
    UNCHECKED_RULES,
    declaration,
    recorded,
  );

  // The rule that actually explains the report's headline — see primaryProblem, which owns the
  // ranking (violations before gaps, and the rule that owns a failure mode before whatever
  // happens to come first in the registry).
  const firstCoreProblem = primaryProblem(history, report);
  // ...falling back to the first rule with an evidence gap, which is the only outstanding thing
  // on a run where every applicable core rule PASSED and some of those passes were partial.
  // `primaryProblem` ranks verdicts and has nothing to say about that case; offering a hardcoded
  // "acc show A1" for it would send the caller to a rule that passed cleanly.
  //
  // WAIVED rules are skipped here as they are in `primaryProblem`, and for the same reason: a
  // waived core rule blocks `fullyVerified` and therefore appears in `evidenceGaps`, but this
  // field answers "what should I read next", and a project that declared a rule inapplicable is
  // not asking for its page. The waiver is still printed in full, with its reason.
  const waived = new Set(report.waivers.map((w) => w.ruleId));
  const nextRule =
    firstCoreProblem?.ruleId ?? report.evidenceGaps.find((g) => !waived.has(g.ruleId))?.ruleId;

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
            exec: "acc",
            args: ["show", nextRule],
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
    renderText: (r) => renderCheckReportText(r),
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

/**
 * THE ONE HOME OF THE TEXT REPORT. `acc check` renders through this, and `acc report` renders
 * a STORED artifact through the same function — extracted rather than copied, because a rule
 * with two homes repaired in one is the failure this tree has now measured four times (the git
 * guard, the version literals, the evidence pointers, `surfaceFrom`). `prelude` is the only
 * seam: lines printed above the headline, used by `report` to say a rendering is one.
 */
export function renderCheckReportText(r: Report, prelude: string[] = []): string {
  const preludeLines = prelude.length ? [...prelude, ""] : [];
  const bold = useColor() ? "\x1b[1m" : "";
  const reset = useColor() ? "\x1b[0m" : "";
  // `unverified` and "not applicable at this level" are different claims — see
  // ReportedFinding.applicable — and collapsing them to the same glyph in text mode would
  // lose a distinction the JSON output (and report.ts's own doc comment) treats as
  // load-bearing: "out of scope here" vs "tried and could not establish it".
  //
  // A WAIVED rule takes its own glyph rather than its verdict's. The verdict is still real —
  // the checker ran — but it binds nothing, and printing a bare FAIL beside a rule the
  // project declared inapplicable is the report contradicting the config. The would-be
  // verdict follows on the same line, in the waiver block below.
  const mark = (f: ReportedFinding) => {
    if (f.waived) return "WVD ";
    if (f.verdict === "pass") return "PASS";
    if (f.verdict === "fail") return "FAIL";
    return f.applicable ? "UNVR" : "N/A ";
  };
  // A `+` on a PASS whose checker declares `coverage: "partial"`. Without it the strongest
  // glyph in the report sits beside a rule the kit only sampled, and the reader has to know
  // to cross-reference the gap block below to find out which passes were narrow ones.
  // THE ARGV, UNDER THE FINDINGS A READER TRIAGES. Two independent adopters joined evidence
  // ids against the observations by hand at the same moment — deciding whether a finding was
  // their own parser or their own dispatch — and one asked for exactly this: "name the
  // offending argv inline in exit-code findings". A verdict about behaviour is unreadable
  // without the invocation that produced it, and a reader holding the text report does not
  // have the JSON open.
  //
  // FAIL and applicable UNVERIFIED only, which is the triage set. Every finding would add one
  // line per citation — 59 lines on a 23-finding report of the kit's own fixture, three
  // quarters of them under passes nobody is going to investigate — and a legend that scrolls
  // is one a reader stops reading. `.data.findings[].probes` carries all of them for the
  // reader who wants the rest, and the EVIDENCE block below names it.
  const probeLines = (f: (typeof r.findings)[number]) =>
    (f.verdict === "fail" || (f.verdict === "unverified" && f.applicable)) && !f.waived
      ? // An artifact from before findings carried probes must say so, not render nothing —
        // a missing thing rendering as an absent thing is the census defect over again.
        (f.probes ?? []).map(
          (p) =>
            // `(bare)` rather than an empty string: an empty argv IS the probe for D2 and E1,
            // and a blank after the arrow reads as a rendering fault rather than as the
            // least dangerous possible invocation.
            `        ↳ ${p.args.length ? p.args.join(" ") : "(bare)"}${
              p.repeat === undefined ? "" : ` [run ${p.repeat}]`
            }${p.env ? ` [env ${Object.keys(p.env).sort().join(", ")}]` : ""}${
              p.unresolved ? "  (unresolved — this run published no such observation)" : ""
            }`,
        )
      : [];
  const lines = r.findings.flatMap((f) => [
    `  ${mark(f)}${!f.waived && f.verdict === "pass" && f.coverage === "partial" ? "+" : " "} ${f.ruleId.padEnd(3)} ${f.detail}${f.excused ? " (excused)" : ""}${f.waived ? ` (waived; would ${f.verdict.toUpperCase()})` : ""}`,
    ...probeLines(f),
  ]);
  // Every waiver, with the REASON, because the reason is the only thing standing between a
  // considered design decision and "this rule was annoying". A human reading a report is the
  // reviewer that string was written for; a count alone would put the frame off-screen.
  //
  // Not a nag, and worded so it cannot be read as one: `would PASS` is offered as information
  // — a waiver you could now delete — never as a stale entry to go and remove. Debt goes
  // stale; a declaration does not.
  //
  // The COST is named per line, because the two kinds of waiver look identical here and are
  // not: waiving a `defect` also blocks `fullyVerified` and puts the rule in the gaps above,
  // while waiving a `design-choice` does neither. A reader who cannot tell them apart cannot
  // tell a suppressed failure from a declared design — which is the whole distinction the
  // catalogue's classification exists to draw.
  const cost = (w: (typeof r.waivers)[number]) =>
    w.deviation === "design-choice"
      ? "design choice, costs nothing"
      : w.tier === "core"
        ? "defect, also blocks full verification"
        : "defect";
  const waivers = r.waivers.map(
    (w) =>
      `    ${w.ruleId.padEnd(3)} ${w.reason}  (would ${w.verdict.toUpperCase()}; ${cost(w)}${w.applicable ? "" : "; not applicable at this level"})`,
  );
  // Severity moves, in both directions, for the same reason: `conformant` is a claim inside a
  // frame, and a raise is as much a part of that frame as a lowering.
  const overrides = r.severityOverrides.map(
    (o) => `    ${o.ruleId.padEnd(3)} ${o.from} -> ${o.to}  ${o.reason}`,
  );
  // Named, not counted. `fullyVerified: false` with nothing beside it is the same
  // information-free verdict this project criticises a CLI for emitting — the caller learns
  // that something is missing and nothing about what. Printed in full rather than
  // summarised because these ARE the report's caveats; the JSON carries the same list under
  // `evidenceGaps`.
  const gaps = r.evidenceGaps.map((e) => `    ${e.ruleId.padEnd(3)} ${e.gaps.join("; ")}`);
  // WHERE THE CONFIG CAME FROM, on every run, in the same shape every time — a line that
  // changes shape between runs is one a reader has to re-read. It sits directly under the
  // headline because it is the frame the headline was reached inside: waivers, severity
  // moves and `defaultOutput` all arrive through it.
  //
  // The DISCOVERED case says more than the other two, and deliberately. A `--config-dir` the
  // caller typed is already on their screen, and "none" is the absence of a frame; a file
  // picked up from the working directory is the only one that can change the verdict with
  // nothing visible anywhere to say so — which is exactly how two runs of one command
  // disagreed for an adopter, absolute target path and all.
  const configLine = ((c) => {
    if (c.origin === "none") return `  config: none — no ${CONFIG_FILE} in ${c.dir}`;
    if (c.origin === "flag") return `  config: ${c.path}  (--config-dir)`;
    return `  config: ${c.path}  (DISCOVERED in the working directory, not named on the command line — the same command run from elsewhere can reach a different verdict)`;
  })(r.configSource);
  // Both claims, on one line, always. The verdict answers "did anything VIOLATE a core
  // rule"; the counts beside it answer "and was everything actually established". Naming
  // the level is part of the claim, not decoration — A4 is core and silently excluded as
  // N/A at L0, so a bare "CONFORMANT" overstates what was checked.
  //
  // Both counts here are CORE, and both say so. The summary line below counts `unverified`
  // across every tier, so the two lines legitimately disagree — a target with one
  // diagnostic gap and no core one printed "0 unverified" above "unverified 1", with
  // nothing on either line naming the scope that made them differ.
  //
  // The waiver count rides on the HEADLINE, not in a footnote, because it is the one thing
  // that changes what every other number on that line means. `0 core violated` over a config
  // that waived the rule which would have violated is true and misleading on its own; beside
  // `1 waiver` it is a claim a reader can size. Omitted entirely when there are none, so an
  // unconfigured run reads exactly as it did before.
  const verdict = r.conformant ? "CONFORMANT" : "NOT CONFORMANT";
  const waiverNote = r.counts.waived
    ? ` · ${r.counts.waived} waiver${r.counts.waived === 1 ? "" : "s"}`
    : "";
  // A DECLARATION DISAGREEMENT RIDES ON THE HEADLINE TOO, and it is a POINTER, not a number.
  // The census mints no rule id, feeds no verdict and gates no exit code — `declaration.ts`
  // argues at length why the kit cannot know which side of a disagreement is wrong — and none
  // of that changes here: this clause is a string, it touches no count on this line or the
  // next, and the exit code below still fires on a core VIOLATION only.
  //
  // What it stops doing is being silent. Four deliberately broken variants of one tool each
  // printed a clean headline while the block that caught three of them sat below the fold,
  // and the headline is the line most readers get to the end of.
  //
  // The two provenances read DIFFERENTLY, because the headline is the cheapest place in the
  // report to draw the distinction the whole `provenance` field exists for. An `emitted`
  // document is the tool's own words, so a disagreement is one process publishing a flag and
  // refusing it — a self-contradiction, and the strong reading. A `modelled` one is somebody's
  // model of the tool, so the same diff says only that a file and a tool disagree. One word
  // apart, so the shape is the same either way and a reader is not learning two clauses.
  //
  // Counted over `findings`, not over `status`: `self-description-not-declared` needs no probe
  // and is a real disagreement on a target that never enumerated.
  const declarationNote = ((d) => {
    if (!d || d.findings.length === 0) return "";
    const n = d.findings.length;
    const noun =
      d.provenance === "emitted"
        ? `self-contradiction${n === 1 ? "" : "s"}`
        : `disagreement${n === 1 ? "" : "s"}`;
    return ` · but see ${n} declaration ${noun} (${d.provenance})`;
  })(r.declaration);
  return [
    ...preludeLines,
    // The kit's own version rides on the headline, not in a footer. A stale install reports
    // success and puts an older commit on disk, and this is the only line every reader
    // certainly sees — the alternative was `acc --version`, which nobody thinks to check.
    `${bold}${verdict} (${r.level})${reset} — ${r.counts.coreFailures} core violated, ${r.counts.coreUnverified} core unverified, ${r.counts.corePartial} core partially covered${waiverNote}${declarationNote}  ${r.target}  [acc ${r.kitVersion}]`,
    configLine,
    "",
    // THE LEGEND COMES BEFORE THE TABLE IT EXPLAINS. It sat at the foot until an adopter met
    // `PASS+` twenty lines before its explanation and read the `+` as "pass, plus something
    // extra" — close to the opposite of what it means. A legend is needed at the FIRST
    // marker, not the last.
    "  PASS pass · FAIL fail · UNVR unverified (probed, inconclusive) · N/A  not applicable to this run",
    "  PASS+ passed, but the checker establishes only part of its rule — see the gaps below",
    // N/A covers two reasons and the legend has to say both, or a rule with no checker
    // reads as one that was merely deferred to a higher level and will be picked up there.
    "  N/A   out of scope at this level, or no checker exists for the rule at any level",
    // The glyph is explained even when nothing carries it, exactly as the four above are: a
    // legend that changes shape between runs is one a reader has to re-read.
    "  WVD  waived by config — the probe still ran, and the verdict it reached binds nothing",
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
    ...(waivers.length
      ? [
          "",
          `  WAIVED (${waivers.length}) — declared not applicable to this tool, by config:`,
          ...waivers,
        ]
      : []),
    ...(overrides.length
      ? [
          "",
          `  SEVERITY MOVED (${overrides.length}) — this project binds differently:`,
          ...overrides,
        ]
      : []),
    ...(r.staleExpectations.length
      ? [
          "",
          `  STALE EXPECTATIONS (${r.staleExpectations.length}) — these rules now pass; remove them from knownFailures:`,
          `    ${r.staleExpectations.join(", ")}`,
        ]
      : []),
    // Its own SECTION, not a line in the legend, and not merged with the stale one. This is a
    // finding about the reader's config, and the legend is where abbreviations are explained —
    // an outside adopter reported it rendering "indented like a glossary entry, the last thing
    // on the page". "Now passing, remove them" and "not being evaluated" also call for opposite
    // actions, so sharing either a line or a heading would teach a reader to delete on both.
    ...(r.inertExpectations.length
      ? [
          "",
          `  NOT BEING EVALUATED (${r.inertExpectations.length}) — these knownFailures entries suppress nothing:`,
          `    ${r.inertExpectations.map((e) => e.ruleId).join(", ")}`,
          "    NOT evidence the defect is fixed — the kit stopped looking. Check it is still",
          "    tracked before removing them.",
        ]
      : []),
    "",
    // WHAT THE TARGET SAID ABOUT ITSELF, printed on every report including the ones where it
    // said nothing — because "this tool has no --version" and "the probe never ran" are two
    // different facts and a section that appeared only on the talkative targets would leave a
    // reader unable to tell them apart. It sits immediately above the flag surface because the
    // two are the same kind of thing: the target's own words, captured and not judged.
    //
    // It answers a question the report could not answer before. `target` is a path,
    // `targetArgv0` is how the kit launched it, `kitVersion` is OURS — so two reports produced
    // by one kit against two builds of one tool were distinguishable only by a path, which is
    // how this project's `1 of 25` figure came to be build-dependent with nothing in a stored
    // report saying which build. See docs/reports/2026-08-24-first-drift-trial-anthill-
    // manifest.md, DT-10.
    "  TARGET IDENTITY — what the target said about itself under --version, which D1 already",
    "  runs. Evidence, not a rule: nothing in this report passes or fails on it, and the quote",
    "  is bytes rather than a parsed version.",
    ...(r.targetIdentity
      ? identitySummaryLines(r.targetIdentity)
      : ["this artifact carries no identity capture"]
    ).map((l) => `    ${l}`),
    "",
    // THE TARGET'S OWN ACCOUNT OF ITS SURFACE, printed on every report including the ones
    // where it is empty — because "this tool does not enumerate" is the finding for most
    // tools, and a section that appears only on the tools that do would leave the reader
    // unable to tell a silent target from a capture that never ran. Nothing here is a
    // verdict, and the heading says so before the reader reaches the data.
    "  SELF-DECLARED FLAGS — read back from the target's own rejection of an unknown flag at",
    "  the root, which is the only path the kit probes.",
    "  Evidence, not a rule: nothing in this report passes or fails on it.",
    // An artifact from before the census existed says so — a missing capture rendering as
    // "did not enumerate" would be a missing thing rendered as an absent thing.
    `    ${r.surface ? surfaceSummary(r.surface) : `this artifact predates the surface census (written by acc ${r.kitVersion})`}`,
    // Where each list came from, so a reader can re-run the probe and see the same bytes
    // rather than take the capture's word for it.
    //
    // FOLDED the way `acc compare` folds its repetition families, and for the same reason:
    // three rules record the same unknown-flag argv several times to ask about determinism, so
    // an unfolded list shows six identical rows and a reader counts six declarations where the
    // target made one. The JSON keeps every row, because a repetition that answered
    // DIFFERENTLY is a real thing to see — and it shows up here as a second, unfolded line.
    ...[
      ...new Map(
        (r.surface?.evidence ?? []).map((e) => [
          JSON.stringify([e.args, e.stream, e.shape, e.matched, e.flags]),
          e,
        ]),
      ),
    ].map(([key, e]) => {
      const runs = (r.surface?.evidence ?? []).filter(
        (o) => JSON.stringify([o.args, o.stream, o.shape, o.matched, o.flags]) === key,
      ).length;
      return `    from ${e.args.join(" ")}${runs > 1 ? ` (${runs} identical rejections)` : ""} · ${e.shape} ${JSON.stringify(e.matched)} on ${e.stream} · ${e.flags.join(" ")}`;
    }),
    "",
    // THE ADVERTISED VERB SET, printed on every report — including the ones where nothing could be
    // asserted, which is the majority case on a fleet where half the tools answer an unknown verb
    // with a help screen and no `usage:`-anchored bracket group. A section that appeared only when
    // there was something to compare would make a missing thing render as an absent thing.
    //
    // It sits under the flag surface because it is the same kind of fact — the target's own words,
    // captured and not judged — and above the recorded block because that is the order a reader
    // needs: what the tool advertises, then what somebody else recorded, then the diff over both.
    "  ADVERTISED VERBS vs RECORDED PATHS — the verb set the target names at its own root, against",
    "  the paths in a recorded batch. Evidence, not a rule: there is no rule id here, nothing in",
    "  this report passes or fails on it, and the recorded side is the caller's attestation.",
    ...(r.advertisedVerbs
      ? advertisedVerbsSummary(r.advertisedVerbs).map((l) => `    ${l}`)
      : [
          `    this artifact predates the advertised-verb comparison (written by acc ${r.kitVersion})`,
        ]),
    "",
    // SURFACES THE CALLER RECORDED, printed only when they supplied a batch. It sits between
    // the kit's own root capture above and the declared side below, because that is the order
    // a reader needs them in: what the kit saw, what somebody else says they saw, and only
    // then the diff over both.
    ...(r.recordedSurfaces
      ? [
          "  RECORDED SURFACES — captured by the caller on their own machine, read here with the",
          "  kit's own extraction. The kit executed nothing below the root.",
          "  Evidence, not a rule: nothing in this report passes or fails on it.",
          `    ${r.recordedSurfaces.records} record${r.recordedSurfaces.records === 1 ? "" : "s"} at ${r.recordedSurfaces.readings.length} path${r.recordedSurfaces.readings.length === 1 ? "" : "s"}, from ${r.recordedSurfaces.source}`,
          `    recorded by ${r.recordedSurfaces.recordedBy.join(", ")}`,
          // WHAT WAS READ AT EACH PATH, and what was not — printed here rather than only in
          // the declaration block, because a batch can arrive without a declaration and a
          // report that showed it as a count would swallow the caller's evidence entirely.
          // The summary names its own path, so nothing prefixes it — a line reading
          // "state: … at state" teaches a reader that one of the two is decoration.
          // ROLLED UP WHEN THE OUTCOME REPEATS, itemised when it does not.
          //
          // A 49-path batch produced 48 sentences differing only in the path, with the one
          // that differed buried among them — a wall a reader skims, which is the opposite of
          // what a census is for. Only visible at a scale no earlier trial reached; with three
          // paths the repetition reads as thoroughness.
          //
          // GROUPED ON `status`, not on the text. Deciding which lines repeat by matching the
          // prose would be a predicate that breaks silently the next time one of these
          // sentences is reworded, and these sentences have been reworded repeatedly.
          //
          // The threshold is not a tidiness rule: a group is folded only when it is big enough
          // that itemising it hides its own exceptions, and the count and its denominator are
          // always stated so nothing reads as fewer paths than there were.
          ...((rs) => {
            const FOLD_AT = 4;
            // Keyed by `SurfaceStatus`, not `string` — `p.status` is already that type (see
            // `RecordedSurfacesReport.readings`), so this is the annotation matching what the
            // value already is, not a cast. What that buys is a COMPILE-TIME obligation: a fifth
            // status makes `VERDICT_WORD`'s literal fail `tsc` rather than quietly lack a word.
            // It buys nothing at runtime — `p.status` is read out of a stored report by
            // `JSON.parse` and nothing on that path validates it against this build's type — so
            // the word comes from `verdictWord`, which handles a status this build cannot read.
            const groups = new Map<SurfaceStatus, typeof rs.readings>();
            for (const p of rs.readings) {
              groups.set(p.status, [...(groups.get(p.status) ?? []), p]);
            }
            const folded = [...groups.entries()].filter(([, g]) => g.length >= FOLD_AT);
            if (folded.length === 0) return rs.readings.map((p) => `      ${p.summary}`);
            const said = new Set(folded.flatMap(([, g]) => g.map((p) => p.path.join(" "))));
            return [
              `      ${rs.readings.length} paths: ${[...groups.entries()]
                .map(([status, g]) => `${g.length} ${verdictWord(status)}`)
                .join(", ")}`,
              // THE ROLLUP MUST NOT FOLD AWAY WHAT THE LINE ABOVE IT EXISTS TO SAY. The
              // per-path sentence names a non-flag list where one was seen; collapsing 48 of
              // those would delete, at scale, exactly the fact the same batch was the reason
              // for adding. Round 3 emitted `choices` at 49 of 49 paths — the case that
              // motivated the rollup is the case that would have lost it.
              ...(() => {
                const keys = [
                  ...new Set(folded.flatMap(([, g]) => g.flatMap((p) => p.nonFlagKeys ?? []))),
                ];
                if (keys.length === 0) return [];
                const n = folded
                  .flatMap(([, g]) => g)
                  .filter((p) => (p.nonFlagKeys ?? []).length > 0).length;
                return [
                  `        of those, ${n} named a non-flag list (${keys
                    .map((k) => `\`${k}\``)
                    .join(", ")}) — a set of something else, not of flags`,
                ];
              })(),
              // The exceptions in full — they are the finding, and the reason the rollup is
              // safe is that nothing which differs is folded away.
              ...rs.readings
                .filter((p) => !said.has(p.path.join(" ")))
                .map((p) => `      ${p.summary}`),
              // WHERE THE REST WENT, said out loud. A summary that quietly replaced 48 lines
              // would be this project's own silent-truncation defect, printed by the census
              // that exists to prevent it.
              `      the folded ${[...said].length} are listed individually in .data.recordedSurfaces.readings`,
            ];
          })(r.recordedSurfaces),
          // BESIDE THE AFFECTED PATHS FIRST, and this total is a summary of that rather than
          // a substitute for it — an absent identity observation withholds nothing, but it
          // weakens the tie between the recording and the binary the kit ran, and the place a
          // reader decides what to make of that is the census line.
          ...(() => {
            // Counted over the lines that actually rest on the batch: the census lines when a
            // declaration was supplied, and the per-path readings above when none was.
            const resting =
              r.declaration === undefined
                ? (r.recordedSurfaces?.readings.length ?? 0)
                : r.declaration.paths.filter((p) => p.surfaceProvenance === "recorded-by-caller")
                    .length;
            return r.recordedSurfaces?.identity
              ? identityLines(r.recordedSurfaces.identity).map((l) => `    ${l}`)
              : [
                  `    ${resting} census line${resting === 1 ? "" : "s"} rest${resting === 1 ? "s" : ""} on recorded surfaces; ${resting === 1 ? "that one" : `${resting} of them`} on a batch that states no identity.`,
                ];
          })(),
          "",
        ]
      : []),
    // THE DECLARED SIDE, printed only when a caller supplied one — a section that appeared
    // empty on every other run would be a permanent advertisement rather than a report.
    //
    // The HEADING says what the block is before the reader reaches a number, and the second
    // line says what it is not. `STANDARD.md` requires both readings of a disagreement to be
    // named, because the kit does not know which side is wrong, so each finding prints two
    // sentences and neither is a verdict.
    ...(r.declaration
      ? [
          "  DECLARED vs ACCEPTED — a declaration the caller supplied, against the target's own",
          "  enumeration above. Evidence, not a rule: nothing in this report passes or fails on it.",
          `    ${declarationSummary(r.declaration)}`,
          // Every path that could NOT be compared, with the reason, because a diff over one of
          // twenty-five paths reported as a bare finding count is a claim about twenty-five.
          // Folded to one line per distinct reason: the reason is the same sentence for every
          // path the kit cannot reach below the root, and twenty-four copies of it teach a
          // reader to skip the block.
          // WHO OBSERVED EACH PATH rides on the line, not only in a summary. Folded on the
          // reason AND the observer together: two paths that could not be compared for the
          // same reason but were looked at by different parties are two different facts, and
          // one folded line would report them as one.
          ...(() => {
            const identityStated = Boolean(r.recordedSurfaces?.identity);
            const unchecked = (r.declaration?.paths ?? []).filter(
              (p) => !p.checked && p.reason !== undefined,
            );
            const keys = [
              ...new Set(
                unchecked.map((p) => JSON.stringify([p.reason, p.surfaceProvenance ?? null])),
              ),
            ];
            return keys.map((key) => {
              const group = unchecked.filter(
                (p) => JSON.stringify([p.reason, p.surfaceProvenance ?? null]) === key,
              );
              const [reason, provenance] = JSON.parse(key) as [
                string,
                "probed-by-kit" | "recorded-by-caller" | null,
              ];
              const paths = group.map((p) => (p.path.length === 0 ? "(root)" : p.path.join(" ")));
              const shown = paths.slice(0, 4).join(", ");
              const more = paths.length > 4 ? `, +${paths.length - 4} more` : "";
              // A path with NO surface has no observer to name, and the reason already says
              // so in words — inventing a label for it would be the census claiming somebody
              // looked.
              const who =
                provenance === null ? "" : ` [${provenanceLabel(provenance, identityStated)}]`;
              return `    NOT COMPARED: ${shown}${more} — ${reason}${who}`;
            });
          })(),
          ...r.declaration.findings.flatMap((f) => [
            // THE OBSERVER OF THE PATH THE FINDING RESTS ON, except for the one finding kind
            // that rests on no observation at all: `self-description-not-declared` reads the
            // document and never the target, so labelling it `probed-by-kit` would attribute a
            // reading to a probe that had nothing to do with it.
            `    ${f.kind}  ${f.subject}${f.path.length ? ` at ${f.path.join(" ")}` : " at (root)"}${((
              p,
            ) =>
              f.kind !== "self-description-not-declared" && p?.surfaceProvenance
                ? ` [${provenanceLabel(p.surfaceProvenance, Boolean(r.recordedSurfaces?.identity))}]`
                : "")(
              r.declaration?.paths.find(
                (p) => p.path.join(" ") === f.path.join(" ") && p.path.length === f.path.length,
              ),
            )}`,
            `      either ${f.readings[0]}`,
            `      or     ${f.readings[1]}`,
          ]),
          "",
        ]
      : []),
    // WHERE THE EVIDENCE IS, said once, on every report. The ids each finding cites have
    // resolved since 0.1.0 and a blind reader never found out: they tried `acc show <id>` —
    // the obvious guess — got a hint naming rule ids and page slugs, and reconstructed the
    // probes by hand instead, producing a wrong reproduction that nearly became a wrong bug
    // report. A mechanism nobody can reach is not shipped. The command is written out with
    // this run's own target rather than described, because the reader is holding the report
    // and not the manual.
    "  EVIDENCE — every finding cites observation ids, which resolve in the JSON report:",
    `    acc check ${r.target} --json  →  .data.findings[].probes  (the argv behind each verdict, already resolved)`,
    `    acc check ${r.target} --json  →  .data.observations[]     (the full record, including outcome and digests)`,
    "    acc show resolves wiki pages, not these ids.",
    // ONE SWEEP, ONE MARK, IN BOTH RENDERINGS. Evidence ids hash the invocation, so ids from
    // two different sweeps align whether or not the runs saw the same bytes — measured: same
    // id, different stdout digests on a nondeterministic target. The sweep id is a hash over
    // the outcomes (see sweepId in report.ts), so a text report and a JSON that carry one
    // value describe one run; `capturedAt` answers the separate question of WHEN, and folding
    // it into the id would destroy the deterministic-agreement property that makes the id
    // worth having. An artifact from before these fields says so instead of rendering blanks.
    ...(r.sweep
      ? [
          `  sweep ${r.sweep} · captured ${r.capturedAt ?? "(time not recorded)"} — two renderings carrying one sweep id describe one run`,
        ]
      : [`  this artifact predates sweep and capture marks (written by acc ${r.kitVersion})`]),
  ].join("\n");
}
