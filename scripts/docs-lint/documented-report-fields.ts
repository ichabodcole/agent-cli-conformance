// A field of the report JSON that the JSON guide does not define is invisible to exactly the
// audience the field exists for. `docs/wiki/guides/how-to-read-the-check-report-json.md` is what a
// script author is pointed at; twice in two consecutive releases a newly-shipped field reached
// them undocumented — `advertisedVerbs`, then `launchAdjustment` — and each was caught only
// because a reviewer happened to look at the right page in the right week. This is the second half
// of making that impossible rather than remembered.
//
// The first half is `DOCUMENTED_REPORT_FIELDS` in `src/acc/kit/report.ts`: a runtime spec bound to
// the four published interfaces by a mapped type, so a field added to an interface fails `tsc`
// until it is added to the spec. This rule closes the loop from the spec to the page.
//
// WHAT COUNTS AS DOCUMENTED: the backticked name in the TERM of a bullet item, a table row, or a
// heading — never merely somewhere in the file. That is the guide's own convention, measured off
// the page rather than imposed on it: every field it documents sits in a `- **`name`** — …` bullet,
// a first table cell, or a heading. Requiring it rules out the drive-by mention in an unrelated
// sentence that a bare "appears somewhere in backticks" test accepts, and it is what makes a field
// named inside ANOTHER field's explanation count as used rather than defined. A bullet's term may
// run across the continuation lines prettier wraps it onto; see `definedNames`.
//
// Fenced code blocks are stripped before matching, because a field name inside a specimen is the
// specimen, not documentation of the field — and because a fence's contents pair backticks across
// its boundaries, which manufactures failures that are artefacts of the scan. A reviewer measuring
// without the strip got eight false "missing" that way.
//
// THREE LIMITS, named here and in the failure message, because a green check is a claim and a gate
// whose limits are unnamed claims more than it checks — plus a fourth, below them, that is a
// property of the gate rather than a gap in it:
//
//  1. TOP-LEVEL KEYS ONLY. `DOCUMENTED_REPORT_FIELDS` is flat over four types; a key whose value is
//     an object (`surface`, `counts`, `configSource`, …) is a leaf, and the fields INSIDE it are
//     checked by neither gate. Both misses that motivated this work were top-level keys. A
//     recursive spec is a separate, larger piece of work — it would oblige roughly fifty further
//     guide entries before this repo's whole-tree gate went green again.
//  2. SHAPE, NOT EXPLANATION. This certifies a definition-shaped OCCURRENCE. No lint reads an
//     explanation, and claiming otherwise would be the overclaim this project exists to refuse.
//  3. FORWARD ONLY. A field REMOVED from a type but left in the guide is not caught, and that
//     failure is real: it sends a script author grepping for a key no report will ever carry, and
//     an empty grep reads as absent DATA rather than as an absent field. Deliberately not closed —
//     the reverse direction needs an allowlist maintained forever against a guide full of
//     legitimate non-report identifiers (`jq`, envelope keys, rule ids), and field removal is rare
//     before 1.0. Written down so that the day it bites, the record says this was chosen.
//
// 4. THE GATE CERTIFIES THAT A SENTENCE EXISTS; ONLY A READER CAN CERTIFY THAT IT SAYS ANYTHING.
//    Stated as mechanism rather than caution, because it is how the rule works and not a risk it
//    happens to carry: every field this gate forces into the guide is a SENTENCE SOMEONE HAS TO
//    INVENT, and the only property the gate can test is that the sentence occupies a definition
//    position. What follows was observed on the change that introduced this file, not reasoned
//    about.
//
//    EIGHT FALSE SENTENCES were found in the 37 bullets, across three rounds of review and one
//    audit aimed at this specific class. The aimed audit found THREE THAT THE THREE ROUNDS MISSED
//    — including the worst of the eight, a `spawnFailed` bullet describing a branch that can never
//    fire in any report this kit writes.
//
//    WHERE THEY CAME FROM, and the honest version is not the tidy one. Making this gate green
//    turned two prose sections into 32 converted bullets, and MOST of the defects fell there:
//    pinned to the revisions, seven of the eight sit in a bullet converted from existing prose,
//    where a sentence that already read well was rewritten into a definition and gained a claim on
//    the way. That population is one-time, identified, and now audited. But the eighth
//    (`excused`/`waived`) was NOT a conversion, so the risk is not retired by the migration ending
//    — writing a bullet for a newly shipped field runs the same hazard, just at lower volume.
//
//    THE RATE IS A FLOOR: AT LEAST 7 OF 32 CONVERTED BULLETS, roughly one in four and a half. It
//    can only ever be a floor, and the reason is the same defect this note is about. The passes
//    that produced the number were each hunting ONE shape — an over-strong generalisation — so
//    they could raise the count and could never confirm it: a bullet wrong in some other way was
//    not being looked for. Reading it as "one in four and a half" rather than "or worse" would be
//    a number asserting more than its method could observe. Two further passes are queued against
//    this same population and either may raise it again, as the last one did.
//
//    - FALSE CONTENT. `exitCode`/`signal` said exactly one is set; `counts` said the tallies were
//      over one set; `applicable` said `detail` distinguishes its two causes; `timeToFirstByteMs`
//      said a null means a hang; `counts` again, on the repair, said two counts cover precisely
//      what the others leave out; `spawnFailed` offered a broken-install alarm that can never
//      fire; `sweep` claimed equal marks prove identical evidence, when the hash omits the kill
//      flags and both timings; `excused` omitted that it goes false once the rule passes. Each was
//      a plausible generalisation invented to fill a bullet.
//    - THE VOID BULLET, the writer-side hazard, and the sharper one because it is the CHEAPEST way
//      to turn a red gate green. A bullet that asserts nothing — "`capturedAt` — when it was
//      captured" — passes every instrument here and can never be falsified, because it contains no
//      claim to falsify. It is WORSE than absence: absence signals undocumented and sends a reader
//      to the source, while a void bullet reads as documentation and stops them. Not hypothetical
//      — a blind reader found two in this guide without being told the class existed.
//    - COMPLETENESS KILLS ABSENCE, the reader-side counterpart. Before the gate, a field with no
//      entry sent a reader to the source, and that silence was a WORKING SIGNAL. After it, every
//      field carries a confident-looking line, so the reader stops at the guide — and the
//      certification raises trust in exactly the sentences whose truth it cannot check. It is this
//      repo's own `bounded-search-is-not-absence` inverted: the search now always returns
//      something, so an empty result no longer exists to be read.
//    - THE ATTENTION DEPENDENCY, and the eight above are its evidence rather than an illustration
//      of it. Every one was caught by review this gate does not bring with it, and the three the
//      aimed audit added are the measurement of what ordinary review misses. The steady state is
//      one field, one red gate, one bullet, and nobody with the code open ever reading it. A
//      property that holds only under audit-level attention is not a property of the gate, and
//      nothing here should let a later reader assume those catches were structural.
//
//    So a bullet this gate makes you write is NOT verified by the gate going green. Check it
//    against the code it describes; PREFER THE UNAMBITIOUS SENTENCE TO THE TIDY ONE, which is the
//    only rule anyone found that resists the pull; and if a bullet would only restate its own field
//    name, the field needs its definition somewhere the reader already is — a heading, or an
//    existing entry — rather than a line of its own.
//
//    On why that rule is needed at all: the fifth false claim was written while explicitly on guard
//    for that exact shape, in the commit repairing the fourth. The failure is not carelessness. It
//    is that "fill this bullet" and "state something general and clean" pull in the same direction,
//    and generality is what makes a sentence read as finished.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DOCUMENTED_REPORT_FIELDS } from "../../src/acc/kit/report.ts";

/** Repo-relative, forward slashes — the page the report's own consumers are pointed at. */
export const GUIDE_PATH = "docs/wiki/guides/how-to-read-the-check-report-json.md";

/** One entry per key of a published type: a leaf, or a pointer at another published type. */
type Marker = string | { readonly type: string };

const BULLET_OPEN = /^\s{0,3}[-*+]\s/;
const CONTINUATION = /^\s{2,}\S/;
const TABLE_ROW = /^\s{0,3}\|/;
const HEADING = /^\s{0,3}#{1,6}\s/;
/** The guide's convention is `- **`name`** — explanation`; the dash is where the term ends. */
const TERM_END = "—";
/**
 * The fallback term when a bullet carries no em dash: the bold run the item OPENS with.
 *
 * Without it, a bullet written `- **`field`**: explanation` would have its WHOLE body treated as
 * the term, and every name in the explanation would silently count as defined. That failure mode
 * is the dangerous direction — the gate quietly widens toward "anywhere in the bullet" instead of
 * going red — and a gate that weakens without saying so is the thing this file exists to prevent.
 * Latent rather than live when written: zero backtick-bearing bullets in the guide lack an em
 * dash today, which is exactly why it is worth pinning before one does.
 *
 * ANCHORED to the list marker deliberately. An unanchored `\*\*(.+?)\*\*` would take the first bold
 * run ANYWHERE in the item, so `- see the **`env`** field` would define `env` from a sentence that
 * defines nothing — a smaller version of the same widening. The guide opens every definition
 * bullet with its term, so anchoring costs nothing it actually uses.
 */
const BOLD_TERM = /^\s{0,3}[-*+]\s+\*\*(.+?)\*\*/s;

/**
 * Every name this page DEFINES, as opposed to merely mentions.
 *
 * Three shapes, all measured off the guide rather than imposed on it: a bullet item, a table row,
 * and a heading. For a bullet the unit is the whole ITEM — its opening line plus the indented
 * continuation lines prettier wraps it onto, since a term as long as
 * ``waivers`, `knownFailures`, `severityOverrides`, `staleExpectations`, `inertExpectations``
 * does not fit on one line and the last name in it is no less defined for that. Within the item
 * only the TERM counts — the text before the first em dash, or, when the item carries no em dash,
 * the bold run the item OPENS with (see `BOLD_TERM`). That is what makes this stronger than "appears in
 * backticks somewhere", because a field named in another field's explanation is being used, not
 * defined.
 */
export function definedNames(text: string): Set<string> {
  const names = new Set<string>();
  const add = (s: string) => {
    for (const m of s.matchAll(/`([A-Za-z][A-Za-z0-9]*)`/g)) names.add(m[1]);
  };
  const term = (s: string) => {
    const at = s.indexOf(TERM_END);
    if (at !== -1) return s.slice(0, at);
    // No em dash: fall back to the bold run the item opens with, rather than to the whole item.
    return BOLD_TERM.exec(s)?.[1] ?? "";
  };

  const lines = stripFences(text).split("\n");
  let item: string | null = null;
  const flush = () => {
    if (item !== null) add(term(item));
    item = null;
  };
  for (const line of lines) {
    if (item !== null && !BULLET_OPEN.test(line) && CONTINUATION.test(line)) {
      item = `${item} ${line.trim()}`;
      continue;
    }
    flush();
    if (BULLET_OPEN.test(line)) item = line;
    // A table row's term is its first cell; a heading is all term.
    else if (TABLE_ROW.test(line)) add(line.split("|")[1] ?? "");
    else if (HEADING.test(line)) add(line);
  }
  flush();
  return names;
}

/**
 * Drop fenced blocks, which are specimens rather than prose.
 *
 * A field name inside a JSON example is the example; and worse, a fence's own contents pair
 * backticks across lines, so leaving them in produces failures that are artefacts of the scan
 * rather than facts about the page. Deliberately tolerant of an unterminated fence — the last
 * block simply runs to the end of the file, which is the safe direction: it can only ever hide a
 * definition, never invent one.
 */
export function stripFences(text: string): string {
  let fenced = false;
  return text
    .split("\n")
    .map((line) => {
      if (/^\s*(?:```|~~~)/.test(line)) {
        fenced = !fenced;
        return "";
      }
      return fenced ? "" : line;
    })
    .join("\n");
}

/**
 * PURE over its inputs, exactly as `version-literals.ts`'s `scanFile` is: the caller supplies the
 * guide text and the spec, so the scan is testable without a filesystem and without the real page's
 * contents deciding what a test proves.
 */
export function scanGuide(
  text: string,
  spec: Readonly<Record<string, Record<string, Marker>>>,
): string[] {
  const problems: string[] = [];
  const defined = definedNames(text);

  for (const [typeName, keys] of Object.entries(spec)) {
    for (const [key, marker] of Object.entries(keys)) {
      // THE LIST OF TYPES, CHECKED. A key pointing at another published type must point at one the
      // spec actually holds, so a fifth type reached from a listed one cannot stay unlisted and
      // silent. Nothing else in either gate looks at the shape of the spec itself.
      if (typeof marker === "object" && !(marker.type in spec))
        problems.push(
          `UNSPECIFIED TYPE  src/acc/kit/report.ts: ${typeName}.${key} names "${marker.type}", which is not in DOCUMENTED_REPORT_FIELDS  (add a documented<${marker.type}>() entry)`,
        );
      if (defined.has(key)) continue;
      problems.push(
        `UNDOCUMENTED FIELD  ${GUIDE_PATH}: ${typeName}.${key}  (define \`${key}\` in the term of a bullet, a table row or a heading, outside any code fence. LIMITS: top-level keys only, so fields of nested types are unchecked; definition SHAPE, not explanation; and forward-only, so a field REMOVED from a type but left in the guide is not caught here)`,
      );
    }
  }
  return problems;
}

export function documentedReportFieldProblems(repoRoot: string): string[] {
  return scanGuide(readFileSync(join(repoRoot, GUIDE_PATH), "utf8"), DOCUMENTED_REPORT_FIELDS);
}
