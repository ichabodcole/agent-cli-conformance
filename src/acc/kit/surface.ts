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
   * Root-level rejections were read and none named a set. A STATEMENT ABOUT THE TOOL'S ROOT ERROR
   * TEXT, and not about what it accepts: the tool has flags, it simply does not list them when it
   * refuses one at the root. It says nothing about a subcommand — a verb-first CLI that enumerates
   * one level down lands here too, which is why every rendered sentence names the scope.
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

/**
 * WHO OBSERVED THE EVIDENCE A PATH'S SURFACE RESTS ON.
 *
 * A census line that does not say who observed it is the defect this project is named after, so
 * the label rides on every path result rather than on the run. `recorded-by-caller` attests to
 * the RECORDING and never to the reading: these bytes came back from that argv on someone else's
 * machine. What they mean is the kit's judgement, and the kit owns being wrong about it.
 */
export type SurfaceProvenance = "probed-by-kit" | "recorded-by-caller";

export interface SurfaceEvidence {
  /**
   * The observation this was read from, and it resolves in ONE OF TWO PLACES.
   *
   * Under `probed-by-kit` it resolves in `Report.observations[]`. Under `recorded-by-caller` it
   * is `recorded:<index>` over `records[]` OF THE BATCH SUPPLIED TO THE RUN THAT PRODUCED THIS
   * REPORT — its own namespace, so the two id spaces cannot collide in a stored report.
   *
   * The narrower invariant is deliberate, and the comment must not claim the wider one: the batch
   * a `recorded:` id indexes is an INPUT to one run, which no artifact carries or names, so once
   * the batch file is gone that id resolves nowhere. No such id reaches a stored report today —
   * `Report.surface` is the ROOT's and is always `probed-by-kit`, and `Report.recordedSurfaces`
   * carries rendered summaries rather than evidence — but the id lives on `SurfaceEvidence`, so
   * whatever serializes one of these next inherits the problem, and the field is documented for
   * that reader rather than for the current call sites. A recorded record can never be minted into
   * `Report.observations[]`
   * either — `ReportedObservation` carries stream digests, `inertness` and timings, which are
   * derived facts and kit-side judgements a caller is forbidden to send and the kit has no honest
   * way to fill.
   */
  observationId: string;
  /** The argv that provoked the rejection. */
  args: string[];
  /**
   * The stream this was read from.
   *
   * `merged` is the caller-recorded case only: a capture ending `2>&1` cannot fill this honestly,
   * and attributing merged bytes to a stream nobody observed them on would be a fabrication in a
   * section labelled as the target's own words. The kit's own probes never produce it.
   */
  stream: "stdout" | "stderr" | "merged";
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
  /**
   * SETS THE TARGET NAMED THAT ARE NOT FLAG SETS — seen, rejected, and said out loud.
   *
   * Present only when a candidate key held a non-empty list whose members are not all
   * flag-shaped. It changes NO verdict and never contributes to `flags`: the every-member test
   * above it is what stops `acc`'s own `choices: ["rules","show",…]` — its COMMANDS — from being
   * published as a flag surface for the kit's own reference implementation.
   *
   * It exists because the census could not tell a target that named a DIFFERENT set from one that
   * named nothing. Round 3's target emitted `choices` at all 49 of its paths — flag-shaped at
   * exactly one, a non-flag set at the other 48 — and the report printed the same sentence it
   * prints for silence, so the adopter's comparison had to rest on the recorded
   * bytes instead of on our line. Same repair as D3's near-miss clause: distinguish "there was
   * nothing" from "there was something and it is not the kind of thing this reads".
   */
  nonFlagCandidates?: Array<{
    key: string;
    /** At most `SAMPLE` members, verbatim. */
    sample: string[];
    /** How many members there were, so a truncated sample cannot pass for the whole list. */
    count: number;
  }>;
}

/**
 * How many members of a rejected list are quoted back.
 *
 * Bounded because the members are the TARGET's bytes and the list has no length limit of its own —
 * the same consideration `ReportedObservation.args` records. Four is enough to show a reader what
 * kind of thing it is, which is all this field claims to do.
 */
const SAMPLE = 4;

/** One long flag, whole. */
const LONG = /^--[A-Za-z][A-Za-z0-9-]*$/;

/**
 * One short flag, whole — a single dash and a single LETTER, and nothing else.
 *
 * `-h` and `-V` are members of the universal surface `STANDARD.md` itself recommends, so a
 * long-only test truncated the captured set on any CLI following this project's own advice: a
 * target enumerating `--help -h --version -V` was read as `[--help]`, and `declaration.ts` then
 * reported the three lost flags as `declared-not-accepted` — findings against flags the tool
 * plainly accepts. The reference target has no short aliases, which is why it never showed, and is
 * the reason one reference target is a thin basis for a shape.
 *
 * A SINGLE LETTER, not a cluster: `-abc` is a bundle on one parser, a single old-style long name
 * on another, and deciding which would be working out what one of the target's words MEANS — the
 * one thing the module comment forbids. A digit is excluded too, so `-1` in ordinary error prose
 * cannot open a list.
 */
const SHORT = /^-[A-Za-z]$/;

/** The shape every recognised list member must have — see `flagsAfter`. */
export const isFlag = (token: string) => LONG.test(token) || SHORT.test(token);

/**
 * WHETHER AN ARGV IS A REJECTION AT ITS OWN PATH — the shape half of the filter, and the one rule
 * that governs a probe the kit sent and a record a caller handed in alike.
 *
 * `tokens` is what follows the command path: the whole argv for a root probe, and everything
 * after the `path` prefix for a recorded record. Three clauses, and they are published to
 * adopters in `docs/plans/2026-08-25-the-recorded-surface-batch.md`, so this function and that
 * document must not disagree in either direction.
 *
 * 1. NO `--` ANYWHERE. A bare terminator makes everything after it data (A6), so the rejection it
 *    provokes on a target that honours it is about a POSITIONAL rather than about a flag. Two
 *    different questions arriving at one field is how a capture starts publishing answers to a
 *    question nobody asked.
 * 2. AT LEAST ONE TOKEN. A bare `state` is an invocation, not a rejection of anything.
 * 3. EVERY TOKEN FLAG-SHAPED, by the same `isFlag` a list member must satisfy. This used to be
 *    `startsWith("-")`, which admits `-1` and `-abc` — a digit opens no list, and a cluster is
 *    one parser's `-a -b -c` and another's old-style long name, so picking would be reading what
 *    one of the target's words MEANS. It is also what makes this a rejection at THIS path: a
 *    token that is not flag-shaped is a verb or a positional, and the set a tool names when
 *    refusing one of those belongs somewhere else.
 *
 * THE VALUE SLOT IS STRIPPED BEFORE THE SHAPE TEST, and that is not a widening of clause 3: the
 * kit's own machine-mode probes send `--format=json` attached (see `machineSelector`) and A1's
 * value-set probes send `--flag=<sentinel>`, so testing the raw token would stop the kit reading
 * the root rejections it reads today — the one thing this change must not do. `captureSurface`
 * already strips the same slot to compute the echo guard, for the same reason: what the parser
 * rejected is the flag NAME.
 */
export function isRejectionShape(tokens: readonly string[]): boolean {
  if (tokens.includes("--")) return false;
  return tokens.length > 0 && tokens.every((t) => isFlag(t.split("=")[0] as string));
}

/**
 * A phrase that marks what follows as the accepted set, requiring the colon.
 *
 * DELIBERATELY NARROW. "Valid flags: --format" is a declaration; "run --help for the valid flags"
 * is a signpost, and only the punctuation separates them from a matcher's point of view. The
 * adjective is required too: a bare "flags:" heading appears in help screens, changelogs and
 * commit messages.
 *
 * ## Two near misses, measured on a real target, and DECLINED (2026-08-24)
 *
 * An outside implementer running this against their own CLI hit two phrasings this pattern does
 * not match, and adapted their wording rather than ask for a widening. Both are declarations by any
 * ordinary reading; both are recorded here so the next person weighs evidence rather than intuition:
 *
 *   - `recognized root flags:`     — a qualifier between the adjective and the noun.
 *   - `recognized flags for send:` — a qualifier after the noun, before the colon.
 *
 * The second is not a matcher problem at all: it declares a SUBCOMMAND's set. Capturing it here
 * would publish `send`'s flags as the root's, which is the same overstatement `surfaceSummary` was
 * corrected for, in a worse form — a set that genuinely belongs to another path. The honest home
 * for it is the path-keyed shape `PathSurface` already anticipates, and reaching it needs a
 * subcommand probe `L0` cannot send.
 *
 * The first is safe in meaning, and it is still one specimen from one target. Admitting an
 * arbitrary token between adjective and noun widens the pattern for every target on the strength of
 * that one, and the cost of being wrong is asymmetric: finding less leaves the previous state of
 * knowledge, while a false surface puts words in a target's mouth in a section labelled as its own.
 * A second independent specimen is what would change the answer.
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
 * A SHORT FLAG IS AN ORDINARY MEMBER — `-h` is captured exactly as `--help` is, and the two are
 * INDEPENDENT members of the set. Nothing in a rejection says which long flag a short one aliases;
 * a list is a sequence of tokens, and pairing them would be reading a relationship the target never
 * stated. So the downstream diff in `declaration.ts` compares spellings, as it already does: a
 * declaration that names `--help` and not `-h` on a target enumerating both gets one
 * `accepted-not-declared` finding for `-h`, which is a true statement about that document. Relating
 * them would be an aliasing model — a field on `SurfaceEvidence`, a rule for which spelling is
 * canonical, and a diff that has to decide whether declaring one declares the other — and that is
 * far more than a line, so it is not here.
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
    if (!isFlag(token)) break;
    out.push(token);
  }
  return out;
}

/**
 * Every `[key, members]` pair anywhere in a parsed document whose key names an accepted set.
 *
 * `rejected` collects the pairs that matched a key and FAILED the flag-shape test, so a caller can
 * report having seen them. It is deliberately a separate output rather than a looser `out`: nothing
 * downstream may confuse the two, and the shape test stays exactly as strict as it was.
 */
function keyedSets(
  document: unknown,
  rejected?: Array<{ key: string; values: string[] }>,
): Array<{ key: string; values: string[] }> {
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
        value.every((v) => typeof v === "string" && isFlag(v))
      ) {
        out.push({ key, values: value as string[] });
      } else if (
        rejected &&
        KEYS.has(normaliseKey(key)) &&
        Array.isArray(value) &&
        value.length > 0 &&
        value.every((v) => typeof v === "string")
      ) {
        // Matched a key this reads, held strings, and was not a flag list. That is the near miss.
        rejected.push({ key, values: value as string[] });
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
/**
 * Lists the target named under a key this reads, whose members are NOT flag-shaped.
 *
 * A SEPARATE PASS rather than an extra return channel on `readStream`, deliberately: that function
 * answers "is there a flag surface here", every caller reads it that way, and widening its result
 * to carry a not-a-flag-surface would put the two one field apart in a type a reader trusts to
 * keep them apart. Nothing here can reach `flags` or move `status`.
 *
 * Only JSON documents are read. A prose near-miss would need the same enumerating-phrase heuristic
 * the prose path uses, and guessing which prose list is "a set of something else" is exactly the
 * inference this capture refuses to make.
 */
export function nonFlagSetsIn(text: string): Array<{ key: string; values: string[] }> {
  const trimmed = text.trim();
  if (trimmed === "" || !parsesWhole(trimmed)) return [];
  const rejected: Array<{ key: string; values: string[] }> = [];
  keyedSets(JSON.parse(trimmed) as unknown, rejected);
  return rejected;
}

export function readStream(
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
  // The shape half is `isRejectionShape`, shared with the reader of caller-recorded records so
  // one rule governs both provenances. The inertness class above has no counterpart there: it is
  // a kit-side judgement about a probe the KIT sent, and a caller does not assert it.
  return isRejectionShape(args);
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

  return surfaceFrom(
    evidence,
    rejections.length,
    rejections.flatMap((o) => [o.stderr, o.stdout]),
  );
}

/**
 * ONE PLACE THAT TURNS EVIDENCE INTO A `Surface`, for the kit's own probes and for a caller's
 * recorded batch alike.
 *
 * These were two copies of the same twelve lines — `captureSurface` here and the reader in
 * `recorded.ts` — which is how the near-miss field came to exist on one and not the other: the
 * repair landed on the kit's own capture while the batch that PROMPTED it, 49 recorded paths of
 * `choices`, still produced the old sentence. A rule with no home gets re-decided at every call
 * site, and this one had two.
 *
 * `streams` is the raw text of every rejection read, scanned only when nothing enumerated — that
 * is the branch where "which set did you see" is a question anyone asks.
 */
export function surfaceFrom(
  evidence: SurfaceEvidence[],
  probesRead: number,
  streams: readonly string[],
): Surface {
  if (evidence.length > 0) {
    const sets = evidence.map((e) => e.flags.join("\0"));
    return {
      status: "enumerated",
      flags: [...new Set(evidence.flatMap((e) => e.flags))].sort(),
      consistent: new Set(sets).size === 1,
      evidence,
      probesRead,
    };
  }
  // Deduped by key so a target repeating one `choices` list across four probes produces one entry
  // rather than four identical ones; the first sighting wins, and `count` keeps the sample honest
  // about how long the list was.
  const byKey = new Map<string, { key: string; sample: string[]; count: number }>();
  for (const text of streams) {
    for (const { key, values } of nonFlagSetsIn(text)) {
      if (!byKey.has(key)) {
        byKey.set(key, { key, sample: values.slice(0, SAMPLE), count: values.length });
      }
    }
  }
  return {
    status: probesRead > 0 ? "not-enumerated" : "no-evidence",
    evidence: [],
    probesRead,
    ...(byKey.size > 0 ? { nonFlagCandidates: [...byKey.values()] } : {}),
  };
}

/**
 * One line saying what the capture found AT ONE PATH, in words that cannot be read as a verdict.
 *
 * Shared by `acc check` and `acc compare` so the two cannot describe the same field differently —
 * the `not-enumerated` sentence in particular has to say the same thing in both places, because it
 * is the sentence this whole capture exists to get right.
 *
 * EVERY SENTENCE CARRIES ITS SCOPE, and `path` is where the scope now comes from. A verb-first CLI
 * that enumerates richly one level down is indistinguishable HERE from one that never enumerates
 * at all, so "did not enumerate" without naming where is a claim about the tool made from evidence
 * that covers one path — the same overreach as reading an empty array as a tool with no flags, one
 * step further out. The `enumerated` sentence needs it for the mirror reason: a reader must not
 * take one path's list for the tool's whole surface.
 *
 * WHAT IT NO LONGER SAYS IS "the only path probed", and dropping that is the point rather than a
 * loss. `diffDeclaration` reuses this sentence verbatim for every non-enumerated path, so the
 * literal made the first caller who records a `["state"]` surface read "did not enumerate at the
 * root — the only path probed" ABOUT `state`: a false scope claim, produced by the very wording
 * `SG-2` added to stop one. The claim about coverage — which paths were reached, and by whom —
 * belongs where the set of paths is actually held, which is the census header and not here.
 */
export function surfaceSummary(s: Surface | undefined, path: readonly string[] = []): string {
  if (!s) return "not recorded — this report predates the flag-surface capture";
  const where = path.length === 0 ? "the root" : path.join(" ");
  if (s.status === "enumerated") {
    const flags = s.flags ?? [];
    const n = flags.length;
    const disagreed = s.consistent === false;
    return `enumerated ${n} flag${n === 1 ? "" : "s"} at ${where}: ${flags.join(" ")}${
      disagreed ? "  (rejections disagreed; see the per-probe lists)" : ""
    }`;
  }
  if (s.status === "not-enumerated") {
    // "A SET" NEVER SAID WHICH SET. A target naming a list of VERBS landed here reading exactly
    // like a target that named nothing, so the clause now says `set of flags` and, when a
    // non-flag list was actually seen, names it and quotes enough of it to recognise.
    const near = s.nonFlagCandidates ?? [];
    const seen =
      near.length === 0
        ? ""
        : `; ${near
            .map(
              (c) =>
                `a \`${c.key}\` list of ${c.count} was present and its members are not flag-shaped (${c.sample
                  .map((v) => JSON.stringify(v))
                  .join(
                    ", ",
                  )}${c.count > c.sample.length ? ", …" : ""}) — a set of something else, not of flags`,
            )
            .join("; ")}`;
    return `did not enumerate at ${where}; ${s.probesRead} rejection${
      s.probesRead === 1 ? "" : "s"
    } read, none named a set of flags (NOT a tool with no flags)${seen}`;
  }
  return `nothing readable was recorded at ${where}, so nothing was read (not a statement about the tool)`;
}
