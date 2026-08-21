// The machine-mode probe, shared by every rule whose clauses bind only when machine mode is
// active — B5 (the answer's shape), A3 (the token as a field), B1 (which stream carries it) and
// B2 (escapes, which the rule binds on whenever machine mode is selected).
//
// It lives here rather than in B5's checker file for the reason `signals.ts` does: the wiki lint
// treats every non-test `.ts` under `checkers/` as a declared rule checker and flags anything no
// rule page names, so a checker importing from another checker's file is a dependency that scan
// has no way to express. Four rules reading one definition is also the point — they must all be
// talking about the same invocation, or the recorder's dedup silently gives them different ones.

import { SENTINEL } from "./inert.ts";
import type { Discovery, History, Invocation, Observation } from "./types.ts";

/**
 * The token that selects machine mode, written so the whole probe stays flag-shaped.
 *
 * `--format` takes a value, so it is sent attached — the same reasoning as `FORMAT_TOKENS` in
 * inert.ts, which already whitelists `--format=json` for exactly this. `--output` is refused: it
 * names an output FILE at least as often as an output format, and `--output=json` against a tool
 * of the first kind would create a file rather than select a mode. That is a declared gap on
 * every rule that reads this, not an oversight — a probe whose meaning depends on which sense of
 * a flag a target implements is not a probe.
 */
export function machineSelector(d: Discovery): string | null {
  if (d.machineModeFlag === "--json") return "--json";
  if (d.machineModeFlag === "--format") return "--format=json";
  return null;
}

/**
 * A parser error with machine mode explicitly selected.
 *
 * Every token begins with `-`, so the invocation satisfies the inertness gate's `no-verb` class,
 * and the first carries the sentinel, so it satisfies `sentinel` as well — admissible twice over
 * under the gate exactly as it stands.
 *
 * The sentinel flag comes FIRST deliberately. That is the order in which a caller's mistake
 * actually arrives, and a target that resolves its format only from the tokens it managed to
 * parse before stopping is the defect B5 is named for.
 */
export function machineErrorArgs(selector: string): string[] {
  return [`--${SENTINEL}-flag`, selector];
}

/**
 * The parser-error probe for a target however its machine mode is reached — or `null` when it
 * cannot be reached at all.
 *
 * A DECLARED default sends no selector, and that is the point rather than a shortcut. B5's first
 * coverage gap has always been that selecting machine mode explicitly "never exercises the
 * piped-default resolution path that the same defect most often breaks" — the row the archaeology
 * calls the one that matters most, because a tool's own emitted commands pass no format flag. A
 * declared default IS that row, so the declaration closes the gap rather than widening the rule.
 *
 * The invocation is byte-identical to A1's unknown-flag probe, so the recorder deduplicates them
 * and this costs no extra spawn — two rules reading one observation for different reasons, which
 * is the normal case here.
 */
export function machineErrorProbesFor(d: Discovery): { args: string[]; how: string }[] {
  const out: { args: string[]; how: string }[] = [];
  // BOTH, when both exist, and the reason is the defect B5 is named for.
  //
  // A CLI that emits JSON to a pipe very often ALSO ships `--json`, and the classic failure is a
  // format resolved only from the tokens the parser managed to read before it stopped: the bare
  // error comes back as a document and the SAME error under `--json` comes back as prose. Probing
  // only the declared path would take the target's word for the half it got right and never look
  // at the half it got wrong — a declaration turning a real failure into a pass, which is the
  // exact shape this catalogue exists to report.
  if (d.machineModeDefault) out.push({ args: [`--${SENTINEL}-flag`], how: "the declared default" });
  const selector = machineSelector(d);
  if (selector) out.push({ args: machineErrorArgs(selector), how: selector });
  return out;
}

/** A successful command in machine mode — the smallest one every CLI is expected to have. */
export function machineVersionArgs(selector: string): string[] {
  return ["--version", selector];
}

/** True when the WHOLE string is exactly one JSON document. */
export function parsesWhole(s: string): boolean {
  try {
    JSON.parse(s);
    return true;
  } catch {
    return false;
  }
}

/** True when every non-empty line is its own JSON document. */
export function parsesAsNdjson(s: string): boolean {
  const lines = s.trim().split("\n").filter(Boolean);
  return lines.length > 0 && lines.every(parsesWhole);
}

/**
 * Every string that appears as a VALUE anywhere in a parsed document, keys excluded.
 *
 * A3 asks whether the offending token reached a FIELD rather than only the prose. Searching the
 * raw text would answer a different and much weaker question — whether the bytes contain the
 * token — which the prose half of that rule already establishes. Walking the parsed structure is
 * what makes the two halves different claims.
 */
export function stringValuesOf(document: unknown): string[] {
  const out: string[] = [];
  const visit = (node: unknown): void => {
    if (typeof node === "string") {
      out.push(node);
      return;
    }
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    if (node === null || typeof node !== "object") return;
    for (const value of Object.values(node as Record<string, unknown>)) visit(value);
  };
  visit(document);
  return out;
}

/**
 * Does this help text state that structured output is what the tool emits by default?
 *
 * The target's own words, in the artifact its callers read — a declaration, not the kit guessing.
 * That distinction is what makes acting on it legitimate: it unlocks B5's no-selector probe, so
 * the claim gets FALSIFIED rather than believed. A statement in help is the stronger of the two
 * declarations, because it binds the tool to its callers and not merely to this kit.
 *
 * Two families, and the second was missing until an adopter measured it. `default`-shaped
 * statements are the obvious ones; `pipe-conditional` ones — "JSON when stdout is not a terminal"
 * — are the shape the docs call the common one, and every phrasing of it failed. So did this
 * project's own sentence about itself, which is the tell: `acc` has a `--json` flag, so it answers
 * D3 on clause one and can never exercise this branch. The positive control had a structural blind
 * spot, and no amount of care in its own suite would have found it.
 *
 * Each pattern requires the format word to be the thing defaulted TO, or the thing produced WHEN
 * piped. The near-miss that makes that necessary is `--format json (default: text)`, which carries
 * both words and means the opposite; so does "JSON is the default INPUT format", and a tool whose
 * subject is JSON while its output is a table. All are refused.
 *
 * Bounded with `[^.\n]` so a pattern cannot span two sentences: "Prints a JSON schema. Colour is
 * off when piped." must not read as machine-first.
 */
export function helpStatesMachineDefault(help: string): boolean {
  // Split on SENTENCE punctuation, not on every dot: `coverage.json` must not become `coverage`
  // + `json by default`, which is how "Coverage is written to coverage.json by default" once read
  // as a promise about stdout.
  return help.split(/[;\n]|\.(?=\s|$)/).some(isMachineDefaultClause);
}

function isMachineDefaultClause(clause: string): boolean {
  // Documenting a FLAG is not declaring a default — "--json is recommended when output is piped"
  // and "use json when piped" both describe a choice the caller makes.
  if (FLAG_OR_CALLER_ACTION.test(clause)) return false;
  // A file is not stdout.
  if (WRITES_TO_FILE.test(clause)) return false;
  // A table row is not a sentence. `| json | by default |` carries both tokens and asserts
  // nothing about this tool's stdout.
  if ((clause.match(/\|/g)?.length ?? 0) >= 2) return false;
  // A hedged claim is not a default. "Some subcommands print JSON by default; most print a table"
  // describes a tool that is not machine-first, in the clause that looks like it is.
  if (QUALIFIED.test(clause)) return false;

  for (const { re, gated } of MACHINE_DEFAULT_PHRASES) {
    const m = re.exec(clause);
    if (!m) continue;
    // Window on the FORMAT TOKEN, not on the match start — two of these patterns begin at `when`,
    // so a window on the match start looks at the wrong words entirely.
    const at = m[0].search(/\b(json|ndjson)\b/i);
    if (at < 0) continue;
    const tokenAt = m.index + at;
    const before = clause.slice(Math.max(0, tokenAt - 28), tokenAt);
    const after = clause.slice(tokenAt, tokenAt + 34);

    // Polarity, near the claim. `not a terminal` is the legitimate phrasing and is excised first;
    // a distant "not" ("…and the human report when it is not") is not a negation of this claim.
    if (NEGATED.test(`${before} ${after}`.replace(NOT_A_TERMINAL, " piped "))) continue;

    if (gated) {
      // An OUTPUT verb in front settles it: "Prints JSON by default, accepted by jq" is an output
      // claim whatever follows. Without that, any downstream-consumption verb in the sentence
      // wrongly refused a true statement.
      const saysOutput = WRITES_OUT.test(before);
      if (!saysOutput && (READS_JSON.test(before) || READS_JSON.test(after))) continue;
    }
    return true;
  }
  return false;
}

const NOT_A_TERMINAL = /\bnot\s+(a\s+)?(tty|terminal)\b|\bnot\s+attached\b/gi;
const NEGATED = /\b(not|never|no|without|disabled?|suppressed?|omitted?|off)\b/i;
const FLAG_OR_CALLER_ACTION = /--\w|\b(use|pass|add|set|specify|supply)\b/i;
const QUALIFIED = /\b(some|most|certain|a few|several|many)\b/i;
// Deliberately no bare `report` or `config`: "the human report" is this project's own phrase for
// its text output, and refusing it was a false fail. The input gate already covers the config case.
const WRITES_TO_FILE =
  /\.(json|ndjson|jsonl)\b|\b(file|files|log|logs|cache|lockfile|manifest|artifact|written\s+to|saved\s+to|stored)\b/i;
const WRITES_OUT = /\b(prints?|emits?|writes?|outputs?|returns?|produces?|renders?)\b/i;
const READS_JSON =
  /\b(input|stdin|reads?|reading|takes?|expects?|decodes?|loads?|opens?|accept(s|ed|ing)?|pars(e|es|ed|ing)|consum(e|es|ed|ing)|ingest(s|ed|ing)?|validat(e|es|ed|ing))\b/i;

/** `gated` marks a pattern whose format token can be the object of an input verb. */
const MACHINE_DEFAULT_PHRASES: readonly { re: RegExp; gated: boolean }[] = [
  { re: /\b(json|ndjson)\b[^.\n]{0,60}\bby default\b/i, gated: true },
  { re: /\bdefaults?\s+to\b[^.\n]{0,30}\b(json|ndjson)\b/i, gated: false },
  { re: /\bdefault\s+(output\s+)?(format\s+)?is\b[^.\n]{0,20}\b(json|ndjson)\b/i, gated: false },
  {
    re: /\b(json|ndjson)\b[^.\n]{0,70}\b(when|whenever|unless)\b[^.\n]{0,40}\b(piped|not\s+(a\s+)?(tty|terminal)|a\s+(tty|terminal))\b/i,
    gated: true,
  },
  {
    re: /\b(when|whenever)\b[^.\n]{0,40}\b(piped|not\s+(a\s+)?(tty|terminal))\b[^.\n]{0,70}\b(json|ndjson)\b/i,
    gated: true,
  },
];

/** The purpose prefix marking a probe as supporting evidence rather than a subject of the rule. */
const CORROBORATION = "corroboration:";

/**
 * The three invocations that exist in both a bare and a selected form at `L0`.
 *
 * Each is inert, needs no data command, and is already sent by some rule — `--help` by D2 and B3,
 * `--version` by D1, the sentinel by A1 and B5 — so pairing them costs no additional spawn.
 */
const CONTRAST_BASES: readonly (readonly string[])[] = [
  ["--help"],
  ["--version"],
  [`--${SENTINEL}-flag`],
];

/**
 * True when the text is one structured document, or a stream of them.
 *
 * Deliberately NARROWER than `parsesWhole`, which `JSON.parse` makes far weaker than it looks:
 * `1.4` is valid JSON, so a text-only CLI printing a two-component version number would otherwise
 * count as having produced a document. A bare scalar is exactly what a plain-text CLI emits.
 *
 * The NDJSON arm asks the same question of every line rather than looking for a `{` in the text.
 * It briefly did the latter, and a substring standing in for a structural claim is the error this
 * rule exists to remove, one layer down.
 */
export function parsesAsDocument(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed === "") return false;
  if (isStructured(trimmed)) return true;
  const lines = trimmed.split("\n").filter((line) => line.trim() !== "");
  return lines.length > 1 && lines.every(isStructured);
}

/** One JSON value that is an object or an array — not a bare scalar, and not unparseable. */
function isStructured(text: string): boolean {
  try {
    const value: unknown = JSON.parse(text);
    return typeof value === "object" && value !== null;
  } catch {
    return false;
  }
}

/** Did EITHER stream of this observation come back as a document? */
function answeredWithDocument(o: Observation): boolean {
  return parsesAsDocument(o.stdout) || parsesAsDocument(o.stderr);
}

/**
 * Every probe a checker declares so its evidence about the selector is complete on its own.
 *
 * Both halves of all three pairs. Reading corroboration out of whatever the shared recording
 * happens to hold works while the whole registry runs and inverts the moment it does not — a
 * single-checker unit test, or a future `--only B5`. A verdict that changes depending on which
 * OTHER rules ran is not a measurement, so a checker that needs an observation asks for it.
 */
export function selectorCorroborationProbes(d: Discovery): Invocation[] {
  const selector = machineSelector(d);
  if (!selector) return [];
  return CONTRAST_BASES.flatMap((base) =>
    [base, [...base, selector]].map((args) => ({
      args: [...args],
      inertness:
        args[0] === "--help" || args[0] === "--version"
          ? ("help-path" as const)
          : ("sentinel" as const),
      purpose: `${CORROBORATION} does ${selector} change what ${base.join(" ")} answers with`,
    })),
  );
}

/**
 * True for a probe that exists to corroborate the selector, not to be judged by the rule.
 *
 * The incomplete-evidence sweeps need the distinction. Losing a probe the rule is ABOUT means the
 * rule cannot reach a verdict; losing one of these closes one pair, and the other two still answer.
 */
export function isCorroborationProbe(inv: Invocation): boolean {
  return inv.purpose.startsWith(CORROBORATION);
}

/**
 * Did the selector CHANGE anything? — the premise every rule needs before condemning under it.
 *
 * `machineModeFlag` is matched out of help by SPELLING. `--json <file>   Treat the input file as
 * JSON` is an ordinary help entry, and a CLI shaped that way was failed on three core rules for
 * answering their probes in prose. It had entered no contract to break.
 *
 * THE QUESTION IS A CONTRAST, NOT A PRESENCE, and getting that wrong inverted the rule against
 * exactly the targets it should catch hardest. Asking "did a document ever come back under the
 * flag" cannot see a machine mode that COLLAPSES under it: a CLI answering the bare parser error
 * as an envelope and the same error under `--json` in prose — B5's flagship defect — produced no
 * document under the flag and so could not be condemned, while the worse the collapse the quieter
 * the kit became. It also cleared a machine-first CLI whose `--json` names an input file, because
 * JSON was going to happen anyway.
 *
 * Pairing answers all four shapes with one question. A flag that changes whether the answer is a
 * document is doing something to the output; a flag that changes nothing, on any of the three
 * pairs available at `L0`, has not been shown to be a selector at all — which is the honest
 * reading of an input-file flag that happens to be spelled `--json`.
 *
 * Not circular where the contrast IS the defect. B5 condemning a collapse reads the pair as
 * evidence that the flag governs output shape; that it governs it WRONGLY is the separate claim,
 * and the observation cannot establish both at once by accident — a flag doing nothing produces no
 * contrast and no verdict.
 *
 * The cost, stated on all three rule pages: a CLI whose `--json` is genuinely a selector but whose
 * output shape is identical with and without it, on every pair this kit can reach, is not
 * condemned. From outside it cannot be told apart from the innocent one.
 */
export function selectorObserved(h: History): boolean {
  const selector = machineSelector(h.discovery);
  if (!selector) return false;
  const find = (args: readonly string[]): Observation | undefined =>
    h.observations.find(
      (o) =>
        o.invocation.args.length === args.length &&
        o.invocation.args.every((a, i) => a === args[i]),
    );
  return CONTRAST_BASES.some((base) => {
    const bare = find(base);
    const selected = find([...base, selector]);
    if (!bare || !selected) return false;
    return answeredWithDocument(bare) !== answeredWithDocument(selected);
  });
}
