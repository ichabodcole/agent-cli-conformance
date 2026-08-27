import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { PathSurface } from "./declaration.ts";
import {
  isRejectionShape,
  readStream,
  type Surface,
  type SurfaceEvidence,
  surfaceSummary,
} from "./surface.ts";

/**
 * SURFACES SOMEBODY ELSE RECORDED — read here, classified here, and labelled as theirs.
 *
 * A caller runs their own tool, at whatever command paths they chose, on their own machine, and
 * records what came back. They hand the recording to `acc` alongside their declaration; this file
 * reads it, runs THE KIT'S OWN extraction over the recorded bytes, and produces the same
 * `PathSurface[]` the differ already takes. The format is pinned, field by field, in
 * `docs/plans/2026-08-25-the-recorded-surface-batch.md`, which is written for an adopter who never
 * opens `src/` — so this reader and that document must not disagree in either direction.
 *
 * Three boundaries hold throughout, and each one is load-bearing rather than decorative.
 *
 * ## Nothing here executes anything
 *
 * Ingestion is a read over bytes the caller already has. It needs no effects claim, no probe
 * warrant and no decision page, which is why it can land while probing below the root cannot.
 *
 * ## The kit classifies; the caller does not
 *
 * Inertness and readability are judgements the kit makes over the record, exactly as it makes them
 * over its own probes — `isRejectionShape` is the same function both sides go through. The caller
 * supplies what the tool DID. There is one exception, and it is `completeness`: whether the
 * caller's own capture was complete is not something the record's bytes show, so the caller
 * declares it rather than the kit judging it. Everything else a caller might be tempted to send —
 * digests, `inertness`, timings — is an unknown key that refuses the batch, because a
 * caller-supplied digest would certify a caller-supplied string against itself.
 *
 * ## The census reaches no verdict
 *
 * No finding here feeds `conformant`, nothing here moves an exit code, and nothing here mints a
 * rule id. A fabricated batch buys a sentence, not a pass — which is the whole trust argument, and
 * the reason the only thing the report owes is to say WHO RECORDED WHAT. That is
 * `SurfaceProvenance`, and it rides on every path result.
 */

/** The only batch major this reader understands. Compared by string equality. */
export const RECORDED_SURFACES_FORMAT_MAJOR = "0";

/**
 * Whether the caller establishes that every byte the tool wrote is in the record.
 *
 * REQUIRED, and three-valued. The kit knows when IT truncated; it cannot know when a caller's
 * pipe, buffer or `head` did. An ABSENT field used to be read as `complete`, so silence strictly
 * dominated honesty — a caller who said nothing got a full read and a caller who declared their
 * capture lossy got less. That is an input-contract defect and it is fixed at the input contract:
 * the field is required, so there is no longer a silence to prefer. `unknown` is what keeps the
 * requirement answerable, because nothing at the moment of answering tells you your pipe cut.
 */
export type RecordedCompleteness = "complete" | "truncated" | "unknown";

/** Whether the capture kept the two streams apart. A property of the caller's own command line. */
export type RecordedStreams = "separated" | "merged";

/** The fields a record and the identity observation share. */
export interface RecordedCapture {
  argv: string[];
  /** Required and NULLABLE: a `… 2>&1 | tee` pipeline loses `$?`, and `null` is the honest
   *  answer. Read by no part of the extraction, so `null` costs the read nothing. */
  exitCode: number | null;
  streams: RecordedStreams;
  /** Present when `streams` is `separated`; either may be `""`. */
  stdout?: string;
  stderr?: string;
  /** Present when `streams` is `merged`. Evidence read from it is attributed `merged`. */
  output?: string;
  completeness: RecordedCompleteness;
  /** Free text: a person, a CI job, a script. Printed with the batch; read for nothing. */
  recordedBy: string;
  /** RFC 3339. Printed with the batch; read for nothing. */
  recordedAt: string;
}

export interface RecordedRecord extends RecordedCapture {
  /** The command path this record contributes to. Non-empty, and a prefix of `argv`. */
  path: string[];
  /** Position in `records[]`. The `recorded:<index>` observation id is built from it. */
  index: number;
}

/**
 * ONE OBSERVATION CAPTURING WHAT THE TOOL SAYS IT IS — optional, counted, and never a
 * verification.
 *
 * Its own envelope key rather than a member of `records[]`: `["--version"]` is flag-shaped and
 * would land at the root, where reading it for a marked list of flags means parsing a help-shaped
 * screen for an accepted set — the exact drift the surface capture exists to get away from. A
 * separate key makes that impossible by construction rather than by a filter rule somebody has to
 * keep correct. `path` is FORBIDDEN on it for the same reason.
 */
export type RecordedIdentity = RecordedCapture;

export interface RecordedBatch {
  formatVersion: string;
  records: RecordedRecord[];
  /** `null` when the batch states no identity, which is a FACT the census carries — not a hole,
   *  and not a `D1` failure: `D1` is a verdict about the binary THE KIT ran. */
  identity: RecordedIdentity | null;
}

/** A malformed batch. Its own error type, exactly as `DeclarationError` is — the kit is usable
 *  without this CLI's error taxonomy, and the command layer owns the mapping. */
export class RecordedSurfacesError extends Error {
  readonly path: string;
  /**
   * WHETHER THE FILE WAS ABSENT, as opposed to present and unreadable.
   *
   * The two are different mistakes with different repairs — you create a missing file, and you
   * edit a malformed one — so the command layer owes them different error kinds. Carried as a
   * field rather than left for a caller to recognise from the message: three call sites map these
   * errors, and a rule enforced by matching prose is one that breaks the first time the prose is
   * reworded, silently and in the direction of the wrong remedy.
   */
  readonly missing: boolean;
  constructor(path: string, message: string, missing = false) {
    super(message);
    this.name = "RecordedSurfacesError";
    this.path = path;
    this.missing = missing;
  }
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const RECORD_KEYS = [
  "path",
  "argv",
  "exitCode",
  "streams",
  "stdout",
  "stderr",
  "output",
  "completeness",
  "recordedBy",
  "recordedAt",
];
/** The identity's keys are a record's MINUS `path`, so a `path` on it is an unknown key. */
const IDENTITY_KEYS = RECORD_KEYS.filter((k) => k !== "path");

function requireOnlyKeys(
  file: string,
  where: string,
  o: Record<string, unknown>,
  keys: string[],
): void {
  for (const key of Object.keys(o)) {
    if (!keys.includes(key)) {
      throw new RecordedSurfacesError(
        file,
        `${where}: unknown key ${JSON.stringify(key)}. This reader refuses a document it half-understands; known keys are ${keys.join(", ")}`,
      );
    }
  }
}

const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((t) => typeof t === "string");

/**
 * The fields a record and the identity share, including the cross-field `streams` rules.
 *
 * THE CROSS-FIELD RULES NEED THEIR OWN PASS because the unknown-key sweep cannot see them:
 * `stdout` and `output` are both KNOWN keys, so a record carrying the wrong one for its `streams`
 * value passes the sweep untouched. A record that both merges and separates is not a record with a
 * spare field in it — it is two incompatible claims about one capture, and reading it either way
 * means the reader picking which of the caller's statements to believe.
 */
function parseCapture(file: string, where: string, raw: Record<string, unknown>): RecordedCapture {
  if (!isStringArray(raw.argv) || raw.argv.length === 0)
    throw new RecordedSurfacesError(file, `${where}.argv must be a non-empty array of strings`);
  if (raw.exitCode !== null && typeof raw.exitCode !== "number")
    throw new RecordedSurfacesError(
      file,
      `${where}.exitCode is required and must be a number, or null when the capture did not keep it — a pipeline that loses $? has nothing to report, and null is the honest answer`,
    );
  if (raw.streams !== "separated" && raw.streams !== "merged")
    throw new RecordedSurfacesError(
      file,
      `${where}.streams is required and must be "separated" or "merged" — it names which stream fields are present, and it is a property of your own command line rather than of the target`,
    );
  const separated = raw.streams === "separated";
  if (separated) {
    if (typeof raw.stdout !== "string" || typeof raw.stderr !== "string")
      throw new RecordedSurfacesError(
        file,
        `${where} declares streams "separated", so stdout and stderr are both required strings (either may be "")`,
      );
    if (raw.output !== undefined)
      throw new RecordedSurfacesError(
        file,
        `${where} declares streams "separated" and also carries output. That is two incompatible claims about one capture, and reading it either way would mean picking which of your statements to believe`,
      );
  } else {
    if (typeof raw.output !== "string")
      throw new RecordedSurfacesError(
        file,
        `${where} declares streams "merged", so output is required and holds both streams interleaved`,
      );
    if (raw.stdout !== undefined || raw.stderr !== undefined)
      throw new RecordedSurfacesError(
        file,
        `${where} declares streams "merged" and also carries stdout or stderr. That is two incompatible claims about one capture, and reading it either way would mean picking which of your statements to believe`,
      );
  }
  if (
    raw.completeness !== "complete" &&
    raw.completeness !== "truncated" &&
    raw.completeness !== "unknown"
  )
    throw new RecordedSurfacesError(
      file,
      `${where}.completeness is required and must be "complete", "truncated" or "unknown". Nothing in the bytes shows whether your capture was cut, so the kit cannot judge it — and "unknown" is here so a caller who does not hold the fact can still answer honestly`,
    );
  if (typeof raw.recordedBy !== "string" || raw.recordedBy === "")
    throw new RecordedSurfacesError(file, `${where}.recordedBy must be a non-empty string`);
  if (typeof raw.recordedAt !== "string" || raw.recordedAt === "")
    throw new RecordedSurfacesError(
      file,
      `${where}.recordedAt must be a non-empty RFC 3339 timestamp string`,
    );
  return {
    argv: raw.argv,
    exitCode: raw.exitCode as number | null,
    streams: raw.streams,
    ...(separated
      ? { stdout: raw.stdout as string, stderr: raw.stderr as string }
      : { output: raw.output as string }),
    completeness: raw.completeness,
    recordedBy: raw.recordedBy,
    recordedAt: raw.recordedAt,
  };
}

/**
 * Parse a batch, refusing anything it does not fully understand.
 *
 * THE ORDER IS PART OF THE CONTRACT. `formatVersion` is checked before the unknown-key sweep and
 * before anything else in the document, exactly as `parseDeclaration` does it and for the same
 * reason: a document from a future major may legitimately carry keys this reader has never heard
 * of, and reporting those instead of the version sends the author to fix the wrong thing.
 *
 * `file` is carried for the message only; nothing is read from disk here.
 */
export function parseRecordedBatch(file: string, raw: unknown): RecordedBatch {
  if (!isPlainObject(raw))
    throw new RecordedSurfacesError(
      file,
      "a recorded-surface batch must be a JSON object at the top level",
    );
  const version = raw.formatVersion;
  if (typeof version !== "string" || version === "")
    throw new RecordedSurfacesError(
      file,
      `formatVersion is required and must be a string. This reader understands major ${RECORDED_SURFACES_FORMAT_MAJOR}`,
    );
  if (version !== RECORDED_SURFACES_FORMAT_MAJOR)
    throw new RecordedSurfacesError(
      file,
      `formatVersion ${JSON.stringify(version)} is not a major this reader understands (${RECORDED_SURFACES_FORMAT_MAJOR}). Refusing the whole batch rather than reading the records it recognises: a key silently dropped is a caller's claim silently deleted`,
    );
  requireOnlyKeys(file, "the document", raw, ["formatVersion", "records", "identity"]);
  if (!Array.isArray(raw.records) || raw.records.length === 0)
    throw new RecordedSurfacesError(
      file,
      "records is required and must hold at least one record — an empty array is not a batch",
    );

  // THE UNKNOWN-KEY SWEEP RUNS OVER EVERY RECORD BEFORE ANY SHAPE IS CHECKED, so a batch carrying
  // a forbidden field is told about the field rather than about the first type mismatch after it.
  raw.records.forEach((r, i) => {
    if (!isPlainObject(r)) throw new RecordedSurfacesError(file, `records[${i}] must be an object`);
    requireOnlyKeys(file, `records[${i}]`, r, RECORD_KEYS);
  });
  if (raw.identity !== undefined && raw.identity !== null) {
    if (!isPlainObject(raw.identity))
      throw new RecordedSurfacesError(
        file,
        "identity must be one record capturing what the tool says it is, or be absent",
      );
    requireOnlyKeys(file, "identity", raw.identity, IDENTITY_KEYS);
  }

  const records = raw.records.map((r, index) => {
    const where = `records[${index}]`;
    const record = r as Record<string, unknown>;
    if (!isStringArray(record.path) || record.path.some((t) => t === ""))
      throw new RecordedSurfacesError(
        file,
        `${where}.path must be an array of non-empty strings naming the command this record is about`,
      );
    // THE ROOT IS THE KIT'S. `captureSurface` yields a `path: []` surface on every run, before any
    // batch is opened, so a root record would produce one path result with two provenances —
    // which `surfaceProvenance` cannot express, and which no third value could make actionable.
    // Refused rather than dropped: silently dropping it is a caller's claim deleted without a
    // word, which is the thing this reader refuses everywhere else.
    if (record.path.length === 0)
      throw new RecordedSurfacesError(
        file,
        `${where} carries an empty path. The root is the one path the kit reads for itself, on every run and before any batch is opened, so a recorded root capture would give one census line two observers. Resubmit without it — every record below the root is still read`,
      );
    const capture = parseCapture(file, where, record);
    const path = record.path;
    // SELF-CHECKING: without this the kit would be trusting a claim about which command produced
    // the bytes while reading the bytes for that command's flags.
    if (path.some((t, i) => capture.argv[i] !== t))
      throw new RecordedSurfacesError(
        file,
        `${where}.path is ${JSON.stringify(path)} and must be a prefix of argv ${JSON.stringify(capture.argv)} — a record whose path is not the start of the argv is a filing mistake, and the reader can catch it`,
      );
    return { ...capture, path, index };
  });

  return {
    formatVersion: version,
    records,
    identity:
      raw.identity === undefined || raw.identity === null
        ? null
        : parseCapture(file, "identity", raw.identity),
  };
}

/** Read and parse a batch from disk. A path the caller named that is missing is an ERROR — they
 *  asked for it, and continuing without it would silently withdraw every path it unlocks. */
export function loadRecordedBatch(file: string): RecordedBatch {
  const abs = resolve(file);
  if (!existsSync(abs)) throw new RecordedSurfacesError(abs, "no such file", true);
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(abs, "utf8"));
  } catch (err) {
    throw new RecordedSurfacesError(abs, `is not valid JSON: ${(err as Error).message}`);
  }
  return parseRecordedBatch(abs, parsed);
}

/**
 * WHY ONE RECORD WAS NOT READ, in words that name what to fix.
 *
 * A record that fails the shape test and a record excluded by its declared completeness are
 * different things for the caller to fix — one recaptures with a different argv, the other
 * recaptures without the `head` — so the sentences must not blur together. And neither of them is
 * a MISSING record: a path whose only records were excluded is `no-evidence` under
 * `recorded-by-caller`, never `not-recorded`.
 */
function exclusionFor(record: RecordedRecord): string | null {
  const after = record.argv.slice(record.path.length);
  const where = `record ${record.index}`;
  if (record.argv.includes("--"))
    return `${where} sent a bare -- , so the rejection it provoked is about a positional rather than about a flag, and it was not read`;
  if (after.length === 0)
    return `${where} carries no token after its path, so it records an invocation rather than a rejection of anything, and it was not read`;
  if (!isRejectionShape(after)) {
    const offending = after.find((t) => !isRejectionShape([t]));
    return `${where} sent ${JSON.stringify(offending)} after its path, which is not flag-shaped, so what came back is about a verb or a positional rather than about this path's flags, and it was not read`;
  }
  // The two pinned sentences. They name the DECLARED VALUE rather than a rule, because that is
  // the different fix.
  if (record.completeness === "truncated")
    return "the caller recorded a truncated capture at this path, so it was not read";
  if (record.completeness === "unknown")
    return "the caller could not establish this capture was complete, so it was not read";
  return null;
}

/**
 * WHAT THE STORED REPORT KEEPS ABOUT THE BATCH — the counts, who recorded it, and the identity
 * observation if the batch stated one.
 *
 * Not the records themselves: the batch is an INPUT to the run, and a `recorded:` observation id
 * is a pointer into that input rather than into the artifact. Whether the report should also carry
 * enough to name what an archived id pointed at is an open question, recorded rather than built —
 * it is a new field on a published type, and it is worth doing on evidence that somebody followed
 * an id and could not.
 */
export interface RecordedSurfacesReport {
  /** The batch file, as the caller named it. */
  source: string;
  /** How many records the batch carried, read or not. */
  records: number;
  /**
   * ONE LINE PER RECORDED PATH, saying what was read there and naming every record that was not.
   *
   * Held here rather than left to the declaration diff because a batch can arrive WITHOUT a
   * declaration, and a report that showed it only as a count would swallow the caller's evidence
   * in the one case where nothing else prints it.
   */
  readings: Array<{ path: string[]; summary: string }>;
  recordedBy: string[];
  identity: RecordedIdentity | null;
}

/** Everything one supplied batch contributes to a run. */
export interface RecordedReading {
  /** One entry per distinct path in the batch, in the order the paths first appear. */
  surfaces: PathSurface[];
  /** How many records the batch carried, read or not. Named in the census. */
  records: number;
  /** Distinct `recordedBy` values, so the report can name who the batch says recorded it. */
  recordedBy: string[];
  identity: RecordedIdentity | null;
}

/**
 * Read a batch with the kit's own extraction, and key the result by path.
 *
 * SEVERAL RECORDS AT ONE PATH ARE PERMITTED AND UNION, exactly as `captureSurface` unions several
 * root rejections — a path here is a bucket evidence accumulates in, not the key a diff is
 * performed on, so the duplicate-path refusal in `parseDeclaration` is not a counter-example.
 * `consistent: false` when two rejections named different sets, because two rejections
 * legitimately can.
 *
 * A path falls to `no-evidence` only when NOTHING at it survived to be read. One excluded record
 * beside one complete record is not `no-evidence`: the complete one is read, and the excluded one
 * is named on the line.
 *
 * PURE over the batch — nothing here spawns, and nothing here reads the filesystem.
 */
export function readRecordedBatch(batch: RecordedBatch): RecordedReading {
  const order: string[] = [];
  const byPath = new Map<string, RecordedRecord[]>();
  for (const record of batch.records) {
    const key = record.path.join(" ");
    const existing = byPath.get(key);
    if (existing) existing.push(record);
    else {
      order.push(key);
      byPath.set(key, [record]);
    }
  }

  const surfaces: PathSurface[] = [];
  for (const key of order) {
    const records = byPath.get(key) as RecordedRecord[];
    const path = (records[0] as RecordedRecord).path;
    const evidence: SurfaceEvidence[] = [];
    const notes: string[] = [];
    let read = 0;
    for (const record of records) {
      const exclusion = exclusionFor(record);
      if (exclusion !== null) {
        notes.push(exclusion);
        continue;
      }
      read += 1;
      // The flags this record's own argv sent, so a set echoing them back can be refused. Any
      // `=value` is stripped: what the parser rejected is the flag name.
      const rejected = record.argv.map((a) => a.split("=")[0] as string);
      const streams: Array<[SurfaceEvidence["stream"], string]> =
        record.streams === "merged"
          ? [["merged", record.output ?? ""]]
          : // stderr first: a rejection belongs there (B1), exactly as the kit reads its own
            // observations.
            [
              ["stderr", record.stderr ?? ""],
              ["stdout", record.stdout ?? ""],
            ];
      for (const [stream, text] of streams) {
        const found = readStream(text, rejected);
        if (found) {
          evidence.push({
            observationId: `recorded:${record.index}`,
            args: [...record.argv],
            stream,
            ...found,
          });
          break;
        }
      }
    }

    const sets = evidence.map((e) => e.flags.join(" "));
    const surface: Surface =
      evidence.length === 0
        ? {
            status: read > 0 ? "not-enumerated" : "no-evidence",
            evidence: [],
            probesRead: read,
          }
        : {
            status: "enumerated",
            flags: [...new Set(evidence.flatMap((e) => e.flags))].sort(),
            consistent: new Set(sets).size === 1,
            evidence,
            probesRead: read,
          };
    surfaces.push({
      path,
      surface,
      surfaceProvenance: "recorded-by-caller",
      ...(notes.length ? { notes } : {}),
    });
  }

  return {
    surfaces,
    records: batch.records.length,
    recordedBy: [...new Set(batch.records.map((r) => r.recordedBy))],
    identity: batch.identity,
  };
}

/**
 * THE IDENTITY LINES — the tool's own bytes, quoted, and no verdict.
 *
 * The parenthesis is required and is not decoration. `D1`'s detector for "reported a version" is
 * `plain.exitCode === 0 && plain.stdout.trim() !== ""` — a non-empty stream standing in for a
 * typed payload, with its own standing coverage gap saying stdout is never checked to carry a
 * version string. So a present identity observation establishes that THE CALLER RECORDED the
 * target saying SOMETHING under the argv they sent. It does not establish that what the target
 * said was a version, and it does not establish that two batches quoting different bytes came from
 * different builds. The report must not print it as a verification.
 *
 * THE ARGV IS THE RECORD'S OWN, substituted, never the literal `["--version"]` — a batch whose
 * identity record ran `["--cli-schema"]` must print `["--cli-schema"]`, or the line misreports the
 * one thing it exists to attribute.
 */
export function identityLines(identity: RecordedIdentity): string[] {
  const argv = JSON.stringify(identity.argv);
  const merged = identity.streams === "merged";
  const quoted = (merged ? (identity.output ?? "") : (identity.stdout ?? "")).trim();
  const head =
    quoted === "" && !merged
      ? // STDERR IS NOT SUBSTITUTED. Substituting would be the kit inventing `D1`'s answer out of
        // the other stream.
        `identity: the caller recorded ${argv} and the target wrote nothing to stdout under that argv (stderr is not substituted)`
      : `identity: the caller recorded ${argv} answering with ${JSON.stringify(quoted)}${
          merged ? " (streams merged, so stderr may be inside the quote)" : ""
        }`;
  const lines = [
    head,
    "          (the tool's own bytes, recorded by the caller — not verified to be a version)",
  ];
  // A QUOTATION IS READ FOR BYTES, not for a set, so a cut makes it shorter rather than false —
  // the declared completeness prints beside the quote instead of removing it.
  if (identity.completeness === "truncated")
    lines.push(
      "          the caller recorded a truncated capture of this identity, so the quote may be short",
    );
  if (identity.completeness === "unknown")
    lines.push(
      "          the caller could not establish this identity capture was complete, so the quote may be short",
    );
  return lines;
}

/**
 * The label a census line carries, which is the one thing this whole feature owes the report.
 *
 * `identityStated` is a property of the BATCH, and it renders BESIDE THE AFFECTED PATHS rather
 * than only as a total: an absent identity observation withholds nothing — every recorded surface
 * is still read — but it weakens the tie between the recording and the binary the kit ran, and the
 * place a reader decides what to make of that is the line, not a footer.
 */
export function provenanceLabel(
  provenance: PathSurface["surfaceProvenance"],
  identityStated: boolean,
): string {
  if (provenance === "probed-by-kit") return "probed-by-kit";
  return identityStated ? "recorded-by-caller" : "recorded-by-caller (identity unstated)";
}

/** One line saying what a recorded path's surface found, with its exclusions named after it. */
export function recordedPathSummary(p: PathSurface): string {
  return [surfaceSummary(p.surface, p.path), ...(p.notes ?? [])].join("; ");
}
