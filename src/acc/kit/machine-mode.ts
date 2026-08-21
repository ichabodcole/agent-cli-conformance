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
import type { Discovery } from "./types.ts";

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
  return MACHINE_DEFAULT_PHRASES.some((re) => re.test(help));
}

const MACHINE_DEFAULT_PHRASES: readonly RegExp[] = [
  // default-shaped
  /\b(json|ndjson)\b[^.\n]{0,60}\bby default\b/i,
  /\bdefaults?\s+to\b[^.\n]{0,30}\b(json|ndjson)\b/i,
  /\bdefault\s+(output\s+)?(format\s+)?is\b[^.\n]{0,20}\b(json|ndjson)\b/i,
  // pipe-conditional
  /\b(json|ndjson)\b[^.\n]{0,70}\bwhen\b[^.\n]{0,40}\b(piped|not\s+(a\s+)?(tty|terminal))\b/i,
  /\bwhen\b[^.\n]{0,40}\b(piped|not\s+(a\s+)?(tty|terminal))\b[^.\n]{0,70}\b(json|ndjson)\b/i,
];
