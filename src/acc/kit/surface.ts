import { parsesWhole, stringValuesOf } from "./machine-mode.ts";
import type { Observation } from "./types.ts";

/**
 * THE TARGET'S OWN ACCOUNT OF WHAT IT ACCEPTS — captured, never judged.
 *
 * A strict parser answers an unknown flag by naming the flags it does accept:
 *
 *     $ anthill --nope
 *     {"ok":false,"error":"Unknown option '--nope'. Valid flags: --format", ...}
 *
 * That string is the one kind of declaration `docs/research/2026-08-22-machine-readable-cli-
 * declarations.md` found never drifts: it is emitted by the same parser that enforces it, at
 * runtime, so it cannot disagree with the parser the way a hand-authored manifest can. Diffing it
 * against a published manifest found eight disagreements in a CLI whose manifest is generated and
 * whose author is careful.
 *
 * ## Why this is not a rule
 *
 * Nothing here reaches a verdict, nothing fails, and no rule reads it. A tool that enumerates is
 * not thereby better than one that does not — enumerating is a design choice, and the catalogue
 * has no clause about it. What this produces is EVIDENCE a reader or a fleet-wide comparison can
 * act on, which is the thing the core cannot express: every rule judges one tool against one page,
 * and "what does this tool say its surface is" is not a judgement at all.
 *
 * ## Why it lives in the report rather than behind its own command
 *
 * The probes already ran. Six checkers send a root-level unknown-flag rejection (A1, A3, A5, B1,
 * B2, C2, E1 among them) and the recorder deduplicates them into one or two spawns, so the capture
 * costs NO additional execution of a stranger's binary — the one act in this kit that carries real
 * risk. A separate `acc surface <target>` command would have to re-spawn the target, and would
 * have to repeat every warning `acc check --help` carries about what `L0` does not prevent, for a
 * command whose name sounds inert.
 *
 * It has to be captured HERE, at report-build time, for a second reason: `ReportedObservation`
 * deliberately drops the streams and keeps only their digests, so the enumeration is unreadable
 * from a stored report. Extracted before that projection, it travels with the artifact and reaches
 * `acc compare` for free.
 *
 * ## What it may and may not do, under `docs/wiki/concepts/probing.md`
 *
 * That page permits using a spelling to choose which probe to SEND and forbids using it to reach a
 * VERDICT. This uses a spelling to decide what to READ — strictly weaker than either, since being
 * wrong costs a line in a report labelled as the target's own words, not a build. The guard rails
 * are the ones that page's `L0` admission test asks for: no clause here works out what one of the
 * target's words MEANS. It recognises a marked shape and copies the tokens out.
 */

/**
 * Whether the target named its accepted set, and — this is the whole point of the type — the
 * DIFFERENCE between "it did not" and "it accepts nothing".
 *
 * Most CLIs do not enumerate. A capture that answered them with an empty array would read as a
 * tool that accepts no flags at all, which is a false and confident-sounding claim about a
 * population this project exists to describe honestly.
 */
export type SurfaceStatus =
  /** At least one rejection named a set of flags. `flags` is present. */
  | "enumerated"
  /**
   * Rejections were read and none named a set. A STATEMENT ABOUT THE TOOL'S ERROR TEXT, and not
   * about what it accepts: the tool has flags, it simply does not list them when it refuses one.
   */
  | "not-enumerated"
  /**
   * Nothing readable was recorded — no root-level flag rejection ran, or every one of them hung,
   * crashed, failed to spawn or was truncated at the output ceiling. A statement about the RUN.
   * Distinguished from `not-enumerated` for the same reason `unverified` is distinguished from
   * `pass` everywhere else in this kit: "we did not look" is not "we looked and found nothing".
   */
  | "no-evidence";

/** How one rejection named its set. Published so a reader can audit the match rather than trust it. */
export type SurfaceShape =
  /** A field in a JSON document the target emitted — the reliable path, and the one tried first. */
  | "json-field"
  /** A marked phrase in prose (`Valid flags: --format`), including prose inside a JSON string. */
  | "prose-marker";

export interface SurfaceEvidence {
  /** The observation this was read from; resolves in `Report.observations[]`. */
  observationId: string;
  /** The argv that provoked the rejection. */
  args: string[];
  stream: "stdout" | "stderr";
  shape: SurfaceShape;
  /**
   * WHAT MATCHED: the JSON key for `json-field`, the marker phrase as the target spelled it for
   * `prose-marker`. A capture that says only "recognised" cannot be checked by the person reading
   * it; this is the substring that made the decision.
   */
  matched: string;
  /** The flags this one rejection named, in the order the target listed them. */
  flags: string[];
}

export interface Surface {
  status: SurfaceStatus;
  /**
   * The union of every enumerated set, sorted — PRESENT ONLY when `status` is `enumerated`.
   *
   * Absent rather than empty on the other two, so a consumer reading `.flags` on a target that
   * said nothing gets `undefined` and has to look at `status`, instead of an empty array it can
   * mistake for an answer.
   *
   * A union because two rejections can legitimately name different sets — the near-miss probe A5
   * builds from the target's own help lands in a different parser branch from A1's sentinel on
   * some tools. `consistent` says whether that happened; the per-rejection lists in `evidence`
   * are the unmerged record.
   */
  flags?: string[];
  /** True when every rejection named the same set. Present only when `status` is `enumerated`. */
  consistent?: boolean;
  evidence: SurfaceEvidence[];
  /**
   * How many recorded rejections were readable, which is what makes `not-enumerated` a
   * measurement rather than an assumption: "none of 4 rejections named a set" is a claim with a
   * denominator.
   */
  probesRead: number;
}

/** One long flag, whole. The shape every recognised list member must have — see `flagsAfter`. */
const FLAG = /^--[A-Za-z][A-Za-z0-9-]*$/;

/**
 * A phrase that marks what follows as the accepted set, requiring the colon.
 *
 * DELIBERATELY NARROW. "Valid flags: --format" is a declaration; "run --help for the valid flags"
 * is a signpost, and only the punctuation separates them from a matcher's point of view. The
 * adjective is required too: a bare "flags:" heading appears in help screens, changelogs and
 * commit messages.
 */
const MARKER =
  /\b(valid|accepted|allowed|available|known|supported|recogni[sz]ed)\s+(flags|options|switches)\b\s*(?:are\s*)?:/gi;

/**
 * JSON keys that name an accepted set, normalised to letters.
 *
 * The qualified ones are declarations by construction — a field called `validFlags` cannot mean
 * anything else. `choices` earns its place separately: it is this project's own error-envelope
 * vocabulary for "here is the closed set you got wrong", and it is the spelling an adopter
 * following `docs/wiki/concepts/error-envelope.md` will have used.
 *
 * BARE `flags` AND `options` ARE DELIBERATELY ABSENT, and the reason is not caution in general but
 * one specific failure: an error document that echoes what the CALLER passed under a key called
 * `flags` would hand back the sentinel we just sent as the target's accepted set. An unqualified
 * key names a field; it does not declare anything.
 */
const KEYS = new Set(
  ["flags", "options", "switches", "arguments"].flatMap((noun) =>
    ["valid", "accepted", "allowed", "known", "supported", "available"].map(
      (adj) => `${adj}${noun}`,
    ),
  ),
);
KEYS.add("choices");

const normaliseKey = (k: string) => k.toLowerCase().replace(/[^a-z]/g, "");

/**
 * Flag tokens from the start of `text`, stopping at the first token that is not one.
 *
 * The stop is what bounds the read to the list: "Valid flags: --format. See the manual for more"
 * yields `["--format"]` and not the rest of the sentence. It also refuses the signpost shape
 * outright — "valid flags: see `acc --help`" starts with a word, so nothing is returned.
 *
 * A MEMBER CARRYING ITS VALUE SLOT — `--format=<text|json>` — is not a flag by this test, so a
 * list that opens with one is read as no list at all. That is a real target this capture will
 * report as silent, and it is the direction the error has to fall: finding less leaves the
 * previous state of knowledge, while stripping the slot to get a name would mean deciding where a
 * flag ends inside a notation nobody declared. Written down rather than guessed at, the way the
 * value-set reader in `discovery.ts` declares the metavar spelling it refuses.
 */
function flagsAfter(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.split(/[\s,|]+/)) {
    // Quotes, backticks and sentence punctuation are how a target decorates a list, never part of
    // a flag name.
    const token = raw.replace(/^[`'"([]+/, "").replace(/[`'")\].,;]+$/, "");
    if (token === "") continue;
    if (!FLAG.test(token)) break;
    out.push(token);
  }
  return out;
}

/** Every `[key, members]` pair anywhere in a parsed document whose key names an accepted set. */
function keyedSets(document: unknown): Array<{ key: string; values: string[] }> {
  const out: Array<{ key: string; values: string[] }> = [];
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    if (node === null || typeof node !== "object") return;
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if (
        KEYS.has(normaliseKey(key)) &&
        Array.isArray(value) &&
        value.length > 0 &&
        // EVERY member must be flag-shaped, which is the clause that keeps this honest against a
        // field that enumerates something else. `acc`'s own unknown-flag envelope carries
        // `choices: ["rules","show","path",...]` — its COMMANDS — and reading that as a flag
        // surface would publish a fabricated one for the kit's own reference implementation.
        value.every((v) => typeof v === "string" && FLAG.test(v))
      ) {
        out.push({ key, values: value as string[] });
      }
      visit(value);
    }
  };
  visit(document);
  return out;
}

/**
 * Read one stream for an enumeration. MACHINE-READABLE FIRST: a document that parses is asked for
 * a field before any prose is read, because a field is a structure the target chose and a sentence
 * is a shape we are guessing at.
 *
 * When the document parses but carries no such field, the prose scan runs over its STRING VALUES
 * rather than the raw bytes — `anthill` puts "Valid flags: --format" inside its `error` string, so
 * a machine-readable target can still carry the set in prose, and walking values keeps keys and
 * JSON punctuation out of the match.
 *
 * `rejected` is the flag the probe sent. An accepted set can never contain the token the target
 * has just refused, so a "set" that does is not one — the cheapest available guard against a field
 * or sentence that echoes the caller's own input back, and it needs no inference about the target
 * at all.
 */
function readStream(
  text: string,
  rejected: string[],
): Omit<SurfaceEvidence, "observationId" | "args" | "stream"> | null {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  const isDocument = parsesWhole(trimmed);
  if (isDocument) {
    const document: unknown = JSON.parse(trimmed);
    for (const { key, values } of keyedSets(document)) {
      if (values.some((v) => rejected.includes(v))) continue;
      return { shape: "json-field", matched: key, flags: values };
    }
    for (const value of stringValuesOf(document)) {
      const found = fromProse(value, rejected);
      if (found) return found;
    }
    return null;
  }
  return fromProse(trimmed, rejected);
}

function fromProse(
  text: string,
  rejected: string[],
): Omit<SurfaceEvidence, "observationId" | "args" | "stream"> | null {
  // A fresh lastIndex per call: MARKER is global so it can find a later marker when an earlier one
  // is followed by prose, and a shared regex object would carry state between streams.
  const re = new RegExp(MARKER.source, MARKER.flags);
  let m: RegExpExecArray | null = re.exec(text);
  while (m) {
    const flags = flagsAfter(text.slice(m.index + m[0].length));
    if (flags.length > 0 && !flags.some((f) => rejected.includes(f))) {
      return { shape: "prose-marker", matched: m[0], flags };
    }
    m = re.exec(text);
  }
  return null;
}

/**
 * True for a recorded probe that asked the target to reject an unknown flag AT THE ROOT.
 *
 * THE INERTNESS CLASS IS THE FILTER, not the token shape alone, and the difference is not
 * cosmetic: `--help` and `--version` are flag-shaped too, so a shape-only test reads seventeen
 * probes on a target that has one rejection, and — much worse — it reads the target's HELP SCREEN
 * for a marked list of flags. Parsing help prose for an accepted set is precisely the drift this
 * capture exists to get away from; a help screen is hand-maintained, and `docs/research/
 * 2026-08-22-machine-readable-cli-declarations.md` is a catalogue of hand-maintained artifacts
 * disagreeing with their parsers. Only `sentinel` and `no-verb` probes are rejections.
 *
 * Every token must also be flag-shaped, which is what makes this the ROOT surface: a probe carrying a
 * verb would elicit that SUBCOMMAND's accepted set, and publishing it as the tool's surface would
 * be a straightforward lie. The kit cannot probe a subcommand's flags at `L0` anyway — a verb in
 * the argv is not inert, which is the same limit that keeps A2's nested case and all of A4 out of
 * `L0` — so the root is not a simplification here, it is the whole of what is reachable.
 *
 * Timed-out, crashed, spawn-failed and TRUNCATED captures are excluded. Truncation matters more
 * here than elsewhere: a prefix cut mid-list yields a set that is short by an unknowable number of
 * flags and looks complete, which is worse than reading nothing.
 */
function isReadableRejection(o: Observation): boolean {
  if (o.timedOut || o.crashed || o.spawnFailed || o.truncated) return false;
  const { args, inertness } = o.invocation;
  if (inertness !== "sentinel" && inertness !== "no-verb") return false;
  // A bare `--` makes everything after it DATA (A6), so the rejection it provokes on a target that
  // honours the terminator is about a positional rather than about a flag. Two different questions
  // arriving at one field is how a capture starts publishing answers to a question nobody asked.
  if (args.includes("--")) return false;
  return args.length > 0 && args.every((a) => a.startsWith("-"));
}

/**
 * Capture what the target said about its own accepted flags, from probes already recorded.
 *
 * PURE over observations — nothing here spawns, exactly as a checker does not.
 */
export function captureSurface(observations: readonly Observation[]): Surface {
  const rejections = observations.filter(isReadableRejection);
  const evidence: SurfaceEvidence[] = [];
  for (const o of rejections) {
    // The flags this probe sent, so a set echoing them back can be refused. `--format=json` is
    // sent attached by the machine-mode probes, so the value is stripped: what the parser rejected
    // is the flag name.
    const rejected = o.invocation.args.map((a) => a.split("=")[0] as string);
    // stderr first: a rejection belongs there (B1), so on a tool that writes to both it is the
    // stream carrying the error rather than whatever else was in flight.
    for (const stream of ["stderr", "stdout"] as const) {
      const found = readStream(stream === "stderr" ? o.stderr : o.stdout, rejected);
      if (found) {
        evidence.push({ observationId: o.id, args: [...o.invocation.args], stream, ...found });
        break;
      }
    }
  }

  if (evidence.length === 0) {
    return {
      status: rejections.length > 0 ? "not-enumerated" : "no-evidence",
      evidence: [],
      probesRead: rejections.length,
    };
  }
  const sets = evidence.map((e) => e.flags.join("\0"));
  return {
    status: "enumerated",
    flags: [...new Set(evidence.flatMap((e) => e.flags))].sort(),
    consistent: new Set(sets).size === 1,
    evidence,
    probesRead: rejections.length,
  };
}

/**
 * One line saying what the capture found, in words that cannot be read as a verdict.
 *
 * Shared by `acc check` and `acc compare` so the two cannot describe the same field differently —
 * the `not-enumerated` sentence in particular has to say the same thing in both places, because it
 * is the sentence this whole capture exists to get right.
 */
export function surfaceSummary(s: Surface | undefined): string {
  if (!s) return "not recorded — this report predates the flag-surface capture";
  if (s.status === "enumerated") {
    return `enumerated ${s.flags?.length ?? 0} flags: ${(s.flags ?? []).join(" ")}${
      s.consistent === false ? "  (rejections disagreed; see the per-probe lists)" : ""
    }`;
  }
  if (s.status === "not-enumerated") {
    return `did not enumerate — ${s.probesRead} rejection${
      s.probesRead === 1 ? "" : "s"
    } read, none named a set (NOT a tool with no flags)`;
  }
  return "nothing readable was recorded, so nothing was read (not a statement about the tool)";
}
