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
import { record, TargetNotExecutableError } from "../kit/record.ts";
import { CHECKERS, UNCHECKED_RULES } from "../kit/registry.ts";
import { buildReport, primaryProblem, type ReportedFinding, runCheckers } from "../kit/report.ts";
import { surfaceSummary } from "../kit/surface.ts";
import type { History, TargetInfo } from "../kit/types.ts";
import { VERSION } from "../version.ts";

export interface CheckOptions {
  configDir?: string;
  /** Path to a declaration file. A path the caller named that cannot be read is an ERROR — see
   *  the load below, which follows `--config-dir`'s rule for the same reason. */
  declaration?: string;
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
function isExecutable(abs: string): boolean {
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
 *    A6: that checker reports `unverified` whenever `argv0[0] === "bun"`, because Bun eats the
 *    bare `--` its probe leads with — including when the kernel launched the script — so what
 *    would get measured is A1 wearing A6's name. A Bun CLI installed without a `.ts` extension
 *    used to miss the guard entirely and collect a FAIL derived from an argv it never received.
 * 2. **A non-executable `.ts` file with no conflicting shebang.** That is a SOURCE file rather
 *    than a program, and Bun is the documented fallback for running one. A non-executable file
 *    that declares some other interpreter gets neither: it is launched as itself and fails to
 *    spawn, which `record()` reports as `TargetNotExecutableError` — an honest "chmod +x it"
 *    rather than a verdict about a program nobody asked us to build.
 */
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
        throw usageError(`${err.path} ${err.message}`, {
          hint: "Fix that file, or drop --declaration — a run without one is a full report with no comparison in it.",
          details: { path: err.path },
        });
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
      const lines = r.findings.map(
        (f) =>
          `  ${mark(f)}${!f.waived && f.verdict === "pass" && f.coverage === "partial" ? "+" : " "} ${f.ruleId.padEnd(3)} ${f.detail}${f.excused ? " (excused)" : ""}${f.waived ? ` (waived; would ${f.verdict.toUpperCase()})` : ""}`,
      );
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
      return [
        // The kit's own version rides on the headline, not in a footer. A stale install reports
        // success and puts an older commit on disk, and this is the only line every reader
        // certainly sees — the alternative was `acc --version`, which nobody thinks to check.
        `${bold}${verdict} (${r.level})${reset} — ${r.counts.coreFailures} core violated, ${r.counts.coreUnverified} core unverified, ${r.counts.corePartial} core partially covered${waiverNote}  ${r.target}  [acc ${r.kitVersion}]`,
        configLine,
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
        // THE TARGET'S OWN ACCOUNT OF ITS SURFACE, printed on every report including the ones
        // where it is empty — because "this tool does not enumerate" is the finding for most
        // tools, and a section that appears only on the tools that do would leave the reader
        // unable to tell a silent target from a capture that never ran. Nothing here is a
        // verdict, and the heading says so before the reader reaches the data.
        "  SELF-DECLARED FLAGS — read back from the target's own rejection of an unknown flag.",
        "  Evidence, not a rule: nothing in this report passes or fails on it.",
        `    ${surfaceSummary(r.surface)}`,
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
            r.surface.evidence.map((e) => [
              JSON.stringify([e.args, e.stream, e.shape, e.matched, e.flags]),
              e,
            ]),
          ),
        ].map(([key, e]) => {
          const runs = r.surface.evidence.filter(
            (o) => JSON.stringify([o.args, o.stream, o.shape, o.matched, o.flags]) === key,
          ).length;
          return `    from ${e.args.join(" ")}${runs > 1 ? ` (${runs} identical rejections)` : ""} · ${e.shape} ${JSON.stringify(e.matched)} on ${e.stream} · ${e.flags.join(" ")}`;
        }),
        "",
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
              ...[...new Set(r.declaration.paths.filter((p) => !p.checked).map((p) => p.reason))]
                .filter((reason): reason is string => reason !== undefined)
                .map((reason) => {
                  const paths = r.declaration?.paths
                    .filter((p) => !p.checked && p.reason === reason)
                    .map((p) => (p.path.length === 0 ? "(root)" : p.path.join(" ")));
                  const shown = (paths ?? []).slice(0, 4).join(", ");
                  const more =
                    (paths?.length ?? 0) > 4 ? `, +${(paths?.length ?? 0) - 4} more` : "";
                  return `    NOT COMPARED: ${shown}${more} — ${reason}`;
                }),
              ...r.declaration.findings.flatMap((f) => [
                `    ${f.kind}  ${f.subject}${f.path.length ? ` at ${f.path.join(" ")}` : " at (root)"}`,
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
        `    acc check ${r.target} --json  →  .data.observations[]  (acc show resolves wiki pages, not these ids)`,
        "",
        "  PASS pass · FAIL fail · UNVR unverified (probed, inconclusive) · N/A  not applicable to this run",
        "  PASS+ passed, but the checker establishes only part of its rule — see the gaps above",
        // N/A now covers two reasons and the legend has to say both, or a rule with no checker
        // reads as one that was merely deferred to a higher level and will be picked up there.
        "  N/A   out of scope at this level, or no checker exists for the rule at any level",
        // The glyph is explained even when nothing carries it, exactly as the four above are: a
        // legend that changes shape between runs is one a reader has to re-read.
        "  WVD  waived by config — the probe still ran, and the verdict it reached binds nothing",
        // Its own sentence, not the stale one. "Now passing, remove them" and "not being
        // evaluated" call for opposite actions, and sharing a line would teach a reader to
        // delete on both — where the second deletion loses the only record of a live defect.
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
