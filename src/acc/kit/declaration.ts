import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { type Surface, type SurfaceProvenance, surfaceSummary } from "./surface.ts";

/**
 * WHAT A TARGET SAYS ITS INTERFACE IS — read from a file, checked against what the target's own
 * parser says it accepts.
 *
 * `STANDARD.md` Part 1 asks a CLI for three things: emit a description of your own interface,
 * generate it from what implements the behaviour, and **check it against the running tool**. The
 * survey behind that page — `docs/research/2026-08-22-machine-readable-cli-declarations.md` —
 * found nothing that probes a running tool and falsifies what it declares. The nearest thing
 * anyone does is Azure's `azdev latest-index verify`, which that survey calls the cheapest
 * generalisable drift gate found anywhere: regenerate from the live command table, byte-compare
 * to the checked-in JSON, exit non-zero naming the stale file. It answers a different question,
 * and answers it well — it catches a checked-in copy falling behind its generator. What it cannot
 * catch is a declaration that was never right AT GENERATION TIME, which is exactly what
 * `docs/reports/2026-08-24-first-drift-trial-anthill-manifest.md` found (DT-2, DT-1): the
 * generator faithfully emitted everything its type could hold, and the type had no slot for part
 * of the surface. Regenerating changes nothing; the artifact has never been right. The survey
 * also said that if an adopter builds one thing from the page before anything else, it is this
 * third part. `surface.ts` is the expensive half —
 * the target's own account of its accepted flags, read out of a rejection the kit already
 * provoked. This file is the other half: the declared side, and the set difference.
 *
 * ## Why the declaration is a FILE and not a key in `acc.config.json`
 *
 * A declaration is falsifiable and a config is a choice, and the two have different lifetimes and
 * different authors — see `docs/wiki/decisions/require-a-config-never-raise-ownership.md` and
 * `not-in-the-config-not-inferred.md`, which argue the split from both directions. There is also a
 * mechanical reason: adding a key describing the TARGET'S OWN SHAPE to `TOP_LEVEL_KEYS` is the
 * stated trigger for building the config-refusal gate, and that gate would invalidate the frame of
 * `docs/reports/2026-08-24-eight-owner-clis.md`, where all eight runs carry
 * `configSource.origin: "none"`. The declaration lives in its own file, and `TOP_LEVEL_KEYS` does
 * not move.
 *
 * ## Why nothing here is a rule
 *
 * No rule id, no tier, nothing feeds `conformant` or `fullyVerified`. A declaration disagreeing
 * with a tool is its own finding class, and the kit cannot tell which side is wrong: the tool may
 * be publishing a flag it refuses, or the enumeration may be short. So every finding carries BOTH
 * readings, in the order provenance justifies — which is the whole reason provenance is a field.
 */

/** The file `acc check --declaration` expects, when a caller wants a conventional name. */
export const DECLARATION_FILE = "acc.declaration.json";

/**
 * The only format major this reader understands.
 *
 * A MAJOR ALONE, not `major.minor`, and that is deliberate. A minor would exist to let a newer
 * document be read by an older reader on the fields it recognises — and this reader refuses
 * unknown fields outright, because an unrecognised field may be the one that bounds a probe's
 * safety. A version component whose only job is to license partial reading has no job here.
 */
export const DECLARATION_FORMAT_MAJOR = "0";

/**
 * WHO SAID IT — the field that decides what a disagreement MEANS.
 *
 * NOT A NEW IDEA. The author-first sketch in
 * `docs/research/2026-08-24-two-declaration-format-sketches.md` gives its §0 to provenance,
 * proposes a three-point scale — derived, emitted, observed — and settles the thing that matters:
 * the stamp records the PROVENANCE OF THE BYTES, never the quality of the authorship, with
 * `ConfigSource.origin` as precedent. What ships departs from it twice. **Two values, not three**,
 * because that sketch's own argument is that the kit cannot tell derived from emitted from
 * outside, and a distinction nothing can establish is one nobody can be held to. **A field of the
 * document, required, with no default**, because both sketches let the CONTAINER carry provenance
 * — the tool's mouth versus the caller's file — and this reader takes both from a path on disk.
 * The container no longer says it, so the document has to.
 *
 * `STANDARD.md` Part 2 establishes the asymmetry both design sketches reached independently: a
 * statement that NARROWS what the kit does may be believed on anyone's word; one that WIDENS it
 * must come from the tool. Downstream of that, the same page separates two events that look
 * identical in a diff:
 *
 * - **`emitted`** — the document came out of the target at runtime. A disagreement is then a
 *   contradiction inside ONE PROCESS: the same binary publishes the flag and refuses it. That is
 *   a defect in its own right, and arguably the most consequential thing a checker can report.
 * - **`modelled`** — somebody wrote it from outside. A disagreement says only that a file and a
 *   tool disagree, and nothing here can tell which is wrong. This repository's own decisions hold
 *   a caller-authored declaration fully legitimate; what they do not hold is that it may be
 *   reported as the tool's own words.
 *
 * Conflating them produces a confident accusation against a tool resting on a stranger's
 * two-minute guess, so this field is REQUIRED and has no default. A document assembled from both
 * — an emitted manifest a human then annotated — is `modelled`, because that is the weaker claim
 * and the mixed case is exactly the one a per-statement field would be needed to describe. Per
 * statement is the right shape and it is a format break: v0 carries one line.
 */
export type Provenance = "emitted" | "modelled";

/**
 * Whether the target ACCEPTS this argument or RECOGNISES AND REFUSES it.
 *
 * The field DT-2 exists for. anthill's framework has a `refused` property — a flag the command
 * knows about and deliberately rejects, registered with the parser so it does not read as
 * "unknown" and excluded from the advertised valid set — and the manifest type has no slot for
 * it, so eight refused flags are published as ordinary valid ones. A slot that can be omitted
 * would reproduce that: a generator with nowhere to put refusal writes nothing, and nothing reads
 * as valid. So `status` is REQUIRED on every argument, and an author who does not know has to
 * find out rather than inherit an answer.
 */
export type ArgStatus = "valid" | "refused";

/**
 * One argument, in `spec.ts`'s vocabulary rather than a parallel one.
 *
 * `name` carries its leading dashes, as `ArgSpec.name` does — the token the caller types, which
 * is also the token the target's enumeration names, so the comparison is over spellings nobody
 * had to normalise. `values` is an ENFORCED closed set and `valueHint` is a LABEL, the
 * distinction DT-4 found no field for and `spec.ts` already draws.
 */
export interface DeclaredArg {
  name: string;
  type: "string" | "boolean";
  status: ArgStatus;
  /** A closed set the target ENFORCES. Absent is not "no set" — it is "no claim". */
  values?: string[];
  /** A display label with no declared semantics. Never read as a constraint. */
  valueHint?: string;
}

/**
 * One positional, in a container of its own — which is the entire point.
 *
 * DT-3: seven positionals emitted inside the array called `flags`, every one of them rejected
 * when a consumer spells it as a flag, on 7 of 25 commands including the one every user runs.
 * `type: "positional"` was present and the CONTAINER said otherwise, and containers are what
 * consumers iterate. Here there is no container to get it wrong in.
 */
export interface DeclaredPositional {
  name: string;
  required: boolean;
  /** Consumes every remaining token; the handler receives an array. See `PositionalSpec`. */
  variadic?: boolean;
}

/**
 * One command path. `path: []` IS THE ROOT, declared like any other command rather than as a
 * distinguished block — a root that lives in its own shape is a second thing to keep in step, and
 * DT-1 is what happens when the root has nowhere to go: anthill's manifest has no slot for root
 * flags at all, so the one flag its root accepts is undeclarable.
 */
export interface DeclaredCommand {
  path: string[];
  args: DeclaredArg[];
  positionals: DeclaredPositional[];
}

/**
 * The document. `formatVersion` first, and required.
 *
 * An unknown major REFUSES THE RUN rather than reading what it recognises, and unknown keys are
 * an error anywhere in the document, for one reason: the fields in a declaration unlock probes,
 * and an unrecognised field may be the one that bounds a probe's safety. Half-applying a document
 * you half-understand is how a narrowing statement gets dropped and a widening one gets obeyed.
 */
export interface Declaration {
  formatVersion: string;
  provenance: Provenance;
  /**
   * HOW THIS DOCUMENT IS OBTAINED FROM THE TOOL, or `null` when the tool emits no such document.
   *
   * The key is REQUIRED and the null is a positive claim, not an "I don't know": `STANDARD.md`
   * says the caller must always supply the pointer, because running `mycli schema` requires
   * already knowing that `schema` is the token and that running it is safe — `sqlite3 schema`
   * creates a database file called `schema`. The bootstrap is irreducible, so the format asks for
   * it rather than guessing at a spelling.
   *
   * `args` is the argv after the binary, e.g. `["help", "--json"]` or `["--cli-schema"]`. The
   * reader does not RUN it; what it does is check that a verb named here is a verb the document
   * declares — see `self-description-not-declared`, which is DT-6's headline and costs no probe.
   */
  selfDescription: { args: string[] } | null;
  /** Every command path the declaration speaks to, including the root as `path: []`. */
  commands: DeclaredCommand[];
}

/** A malformed declaration file. Its own error type, exactly as `ConfigError` is — the kit is
 *  usable without this CLI's error taxonomy, and the command layer owns the mapping. */
export class DeclarationError extends Error {
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
    this.name = "DeclarationError";
    this.path = path;
    this.missing = missing;
  }
}

/**
 * WHAT A DISAGREEMENT IS, and there are four kinds.
 *
 * Three come from the set difference against the target's own enumeration; the fourth costs no
 * probe at all.
 */
export type DeclarationFindingKind =
  /**
   * The declaration publishes an argument as `valid` and the target's own enumeration of its
   * accepted set does not name it. **DT-2's shape** — a refused flag published as ordinary — and
   * **DT-3's**, since a positional written into the argument container is a flag spelling the
   * parser never registered.
   */
  | "declared-not-accepted"
  /**
   * The target enumerates a flag the declaration mentions in neither container. **DT-6** — the
   * universal surface a generator walking "the commands" walks past, because interceptors are not
   * commands.
   */
  | "accepted-not-declared"
  /**
   * The declaration marks an argument `refused` and the target's own enumeration names it valid.
   * The inverse contradiction, and the one a declaration must not be able to buy silence with: a
   * narrowing statement may be believed on anyone's word, but this one is contradicted by the
   * parser's own account, which is the one source the asymmetry defers to.
   */
  | "refused-but-enumerated"
  /**
   * The declaration names the invocation that produces it, and does not declare the verb that
   * invocation uses. **DT-6's headline**: anthill's manifest omits `help`, the verb that emits
   * the manifest, while the human help screen ends by telling the reader to run it — so a caller
   * holding the declaration and nothing else cannot rediscover the door it came through.
   *
   * Needs no probe and no enumeration, so it is reported even on a target that never enumerates.
   */
  | "self-description-not-declared";

export interface DeclarationFinding {
  kind: DeclarationFindingKind;
  /** The command path this is about. `[]` is the root. */
  path: string[];
  /** The flag or verb the finding is about, as one side or the other spelled it. */
  subject: string;
  /**
   * BOTH READINGS, ALWAYS, and never a verdict.
   *
   * `STANDARD.md` requires the report to name both, because the kit does not know which side is
   * wrong and a single sentence would pick one. Order carries the provenance: an `emitted`
   * document puts the tool's self-contradiction first, a `modelled` one puts the model's error
   * first. Both sentences appear either way.
   */
  readings: [string, string];
}

/**
 * WHY A PATH HAD NO SURFACE AT ALL — and there are two, not three.
 *
 * The difference between them is what the reader would do next, which is the only thing that
 * justifies two sentences instead of one.
 *
 * A third, `no-warrant` — _reachable in principle, but the declaration claims nothing the kit may
 * act on_ — was specified in an earlier round and is WITHDRAWN with the item that would have
 * produced it. The probe warrant is a decision not to build, so no declaration can carry one, the
 * distinction has no referent, and the member must not be stored or emitted. An inert name in a
 * stored enum acquires apparent authority and invites a consumer to infer a distinction the kit
 * cannot make.
 */
export type NoEvidenceReason =
  /** The kit sent no probe there and none was possible. */
  | "unreachable"
  /** A batch WAS supplied and carries no record at this path. Never printed without one. */
  | "not-recorded";

/** Whether one declared path could be diffed at all, and when not, why. */
export interface DeclarationPathResult {
  path: string[];
  checked: boolean;
  /** Present only when `checked` is false. The sentence a reader gets instead of a result. */
  reason?: string;
  /**
   * WHO OBSERVED THIS PATH — present whenever a surface existed for it, absent when none did.
   *
   * A census line that does not say who observed it is the defect this project is named after, so
   * this is not optional decoration: a caller-modelled declaration diffed against kit-probed
   * evidence and a tool-emitted declaration diffed against caller-recorded evidence are both
   * ordinary combinations, and a reader checking one is checking exactly this field.
   */
  surfaceProvenance?: SurfaceProvenance;
  /** Present only when no surface existed for the path. See `NoEvidenceReason`. */
  noEvidenceReason?: NoEvidenceReason;
  /**
   * PRESENT ONLY WHEN THE DECLARATION HAS NO ENTRY FOR THIS PATH — absent, never `false`, in the
   * ordinary case, matching how `flags` is absent rather than empty.
   *
   * A path reaches this list two ways: the declaration names it, or evidence arrived for it. The
   * second is the `DT-1` case — anthill's manifest has no slot for root flags at all — and it is
   * the reason the two counts below are separate. Without this field a reader cannot tell which
   * set a row came from, and the summary cannot say so either.
   */
  undeclared?: true;
}

export interface DeclarationDiff {
  provenance: Provenance;
  /**
   * WHETHER THE SET DIFFERENCE HAPPENED AT ALL — the field to read before `findings`.
   *
   * `not-checked` means no declared path had a usable enumeration, so an empty `findings` does
   * NOT say everything agreed; it says nothing was compared. This is the same distinction
   * `SurfaceStatus` draws between `not-enumerated` and `enumerated-none`, one level up, and it is
   * the one most likely to be read wrongly: a diff that could not run and a diff that found
   * nothing look identical in a count.
   *
   * What `enumerated-none` contributes here is a path that can be diffed while naming no flags.
   * It records that the target ANSWERED the probe — it named its accepted set, and the set it
   * named held nothing — and that is a set difference this can perform. It is NOT a claim that
   * the tool accepts no flags: the kit reports what the target said and does not adopt it. Such a
   * path is `checked`, every `valid` arg declared at it is `declared-not-accepted`, and a run
   * whose only evidence was empty enumerations is `checked` here too.
   *
   * `self-description-not-declared` findings can be present while this is `not-checked`, because
   * that check reads the document and never the target.
   */
  status: "checked" | "not-checked";
  /** Why the diff did not run, when `status` is `not-checked`. */
  reason?: string;
  paths: DeclarationPathResult[];
  findings: DeclarationFinding[];
  /** How many command paths the document declares. */
  declaredCommands: number;
  /**
   * HOW MANY OF THOSE DECLARED PATHS WERE DIFFED — never more, which is the invariant this field
   * exists to hold. The denominator that keeps "no findings" honest: `0 of 25` is a different
   * claim from `25 of 25`.
   *
   * It counted the UNION of declared and observed paths once, and that produced a fraction whose
   * numerator was not drawn from its denominator: anthill's `1 of 25` was the root, which is not
   * one of the 25, and a batch reaching further printed `26 of 25`. A path that was compared and
   * is not declared is counted by `checkedUndeclared` and named in the summary instead.
   */
  checkedCommands: number;
  /**
   * HOW MANY COMPARED PATHS THE DECLARATION DOES NOT NAME. Usually the root, which the kit always
   * probes and which a manifest listing subcommands has no slot for.
   *
   * Reported rather than folded in, because the two numbers answer different questions: how much
   * of the document was checked, and how much was looked at. `status` is `checked` when EITHER is
   * above zero — an undeclared path that enumerates still produces real `accepted-not-declared`
   * findings, and calling that "the diff did not run" would suppress them.
   */
  checkedUndeclared: number;
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** Reject any key the format does not define, wherever it appears. See `Declaration`. */
function requireOnlyKeys(path: string, where: string, o: Record<string, unknown>, keys: string[]) {
  for (const key of Object.keys(o)) {
    if (!keys.includes(key)) {
      throw new DeclarationError(
        path,
        `${where}: unknown key ${JSON.stringify(key)}. This reader refuses a document it half-understands; known keys are ${keys.join(", ")}`,
      );
    }
  }
}

function requireString(path: string, where: string, v: unknown): string {
  if (typeof v !== "string" || v === "")
    throw new DeclarationError(path, `${where} must be a non-empty string`);
  return v;
}

function parseArg(path: string, where: string, raw: unknown): DeclaredArg {
  if (!isPlainObject(raw)) throw new DeclarationError(path, `${where} must be an object`);
  requireOnlyKeys(path, where, raw, ["name", "type", "status", "values", "valueHint"]);
  const name = requireString(path, `${where}.name`, raw.name);
  if (!name.startsWith("-"))
    throw new DeclarationError(
      path,
      `${where}.name is ${JSON.stringify(name)}, which carries no leading dash. Arguments are declared as the caller types them; a name without dashes is a positional, and positionals have their own container`,
    );
  if (raw.type !== "string" && raw.type !== "boolean")
    throw new DeclarationError(path, `${where}.type must be "string" or "boolean"`);
  if (raw.status !== "valid" && raw.status !== "refused")
    throw new DeclarationError(
      path,
      `${where}.status must be "valid" or "refused", and is required — a generator with nowhere to put refusal publishes a refused flag as an ordinary one (DT-2)`,
    );
  const values = raw.values;
  if (values !== undefined && (!Array.isArray(values) || values.some((v) => typeof v !== "string")))
    throw new DeclarationError(path, `${where}.values must be an array of strings if present`);
  const valueHint = raw.valueHint;
  if (valueHint !== undefined && typeof valueHint !== "string")
    throw new DeclarationError(path, `${where}.valueHint must be a string if present`);
  return {
    name,
    type: raw.type,
    status: raw.status,
    ...(values ? { values: values as string[] } : {}),
    ...(valueHint !== undefined ? { valueHint } : {}),
  };
}

function parsePositional(path: string, where: string, raw: unknown): DeclaredPositional {
  if (!isPlainObject(raw)) throw new DeclarationError(path, `${where} must be an object`);
  requireOnlyKeys(path, where, raw, ["name", "required", "variadic"]);
  const name = requireString(path, `${where}.name`, raw.name);
  if (typeof raw.required !== "boolean")
    throw new DeclarationError(path, `${where}.required must be a boolean`);
  if (raw.variadic !== undefined && typeof raw.variadic !== "boolean")
    throw new DeclarationError(path, `${where}.variadic must be a boolean if present`);
  return {
    name,
    required: raw.required,
    ...(raw.variadic !== undefined ? { variadic: raw.variadic } : {}),
  };
}

function parseCommand(path: string, index: number, raw: unknown): DeclaredCommand {
  const where = `commands[${index}]`;
  if (!isPlainObject(raw)) throw new DeclarationError(path, `${where} must be an object`);
  requireOnlyKeys(path, where, raw, ["path", "args", "positionals"]);
  if (!Array.isArray(raw.path) || raw.path.some((t) => typeof t !== "string" || t === ""))
    throw new DeclarationError(
      path,
      `${where}.path must be an array of non-empty strings — the empty array IS the root`,
    );
  if (!Array.isArray(raw.args)) throw new DeclarationError(path, `${where}.args must be an array`);
  if (!Array.isArray(raw.positionals))
    throw new DeclarationError(path, `${where}.positionals must be an array`);
  return {
    path: raw.path as string[],
    args: raw.args.map((a, i) => parseArg(path, `${where}.args[${i}]`, a)),
    positionals: raw.positionals.map((p, i) =>
      parsePositional(path, `${where}.positionals[${i}]`, p),
    ),
  };
}

/**
 * Parse a declaration document, refusing anything it does not fully understand.
 *
 * `path` is carried for the message only; nothing is read from disk here, so a consumer holding
 * a document from somewhere else can use this directly.
 */
export function parseDeclaration(path: string, raw: unknown): Declaration {
  if (!isPlainObject(raw))
    throw new DeclarationError(path, "a declaration must be a JSON object at the top level");
  // VERSION BEFORE ANYTHING ELSE, including before the unknown-key check: a document from a
  // future major may legitimately carry keys this reader has never heard of, and reporting those
  // instead of the version would send the author to fix the wrong thing.
  const version = raw.formatVersion;
  if (typeof version !== "string" || version === "")
    throw new DeclarationError(
      path,
      `formatVersion is required and must be a string. This reader understands major ${DECLARATION_FORMAT_MAJOR}`,
    );
  if (version !== DECLARATION_FORMAT_MAJOR)
    throw new DeclarationError(
      path,
      `formatVersion ${JSON.stringify(version)} is not a major this reader understands (${DECLARATION_FORMAT_MAJOR}). Refusing the run rather than reading the fields it recognises: a field this reader cannot name may be the one that bounds a probe's safety`,
    );
  requireOnlyKeys(path, "the document", raw, [
    "formatVersion",
    "provenance",
    "selfDescription",
    "commands",
  ]);
  if (raw.provenance !== "emitted" && raw.provenance !== "modelled")
    throw new DeclarationError(
      path,
      `provenance is required and must be "emitted" (the target produced this document) or "modelled" (somebody wrote it from outside). Which one decides what a disagreement means, so there is no default`,
    );
  const self = raw.selfDescription;
  if (self !== null) {
    if (!isPlainObject(self))
      throw new DeclarationError(
        path,
        `selfDescription is required: an object naming the invocation that emits this document, or null to declare that the target emits none`,
      );
    requireOnlyKeys(path, "selfDescription", self, ["args"]);
    if (!Array.isArray(self.args) || self.args.some((a) => typeof a !== "string" || a === ""))
      throw new DeclarationError(path, "selfDescription.args must be an array of argv tokens");
  }
  if (!Array.isArray(raw.commands))
    throw new DeclarationError(path, "commands must be an array (the root is `path: []`)");
  const commands = raw.commands.map((c, i) => parseCommand(path, i, c));
  const seen = new Set<string>();
  for (const c of commands) {
    const key = c.path.join("\0");
    if (seen.has(key))
      throw new DeclarationError(
        path,
        `two entries declare the command path ${c.path.length === 0 ? "(root)" : c.path.join(" ")}. A path is the key the diff is performed on, so a duplicate makes one of the two silently unreachable`,
      );
    seen.add(key);
  }
  return {
    formatVersion: version,
    provenance: raw.provenance,
    selfDescription: self === null ? null : { args: (self as { args: string[] }).args },
    commands,
  };
}

/** Read and parse a declaration from disk. A path the caller named that is missing is an ERROR —
 *  they asked for it, and continuing without it would silently withdraw every check it unlocks. */
export function loadDeclaration(file: string): Declaration {
  const abs = resolve(file);
  if (!existsSync(abs)) throw new DeclarationError(abs, "no such file", true);
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(abs, "utf8"));
  } catch (err) {
    throw new DeclarationError(abs, `is not valid JSON: ${(err as Error).message}`);
  }
  return parseDeclaration(abs, parsed);
}

/**
 * A target's own account of its accepted flags AT ONE COMMAND PATH.
 *
 * Keyed by path rather than assumed to be the root, because the declaration is keyed by path and
 * a diff that flattened them would compare a root enumeration against a subcommand's flags. Today
 * the kit produces exactly one member, `path: []` — `captureSurface` reads only root-level
 * rejections, and the kit does not execute a subcommand of the target it is checking. Evidence
 * below the root reaches the differ from surfaces a caller recorded and handed in (and, once it is
 * built, from a probe plan the kit generates for an operator to run). Every other declared path is
 * reported as not checked, with that as the reason.
 */
export interface PathSurface {
  path: string[];
  surface: Surface;
  /**
   * HOW THIS PATH'S EVIDENCE WAS OBTAINED. Required, on every entry.
   *
   * Named `surfaceProvenance` rather than `provenance` deliberately: `DeclarationDiff.provenance`
   * already means `emitted | modelled` — who wrote the DOCUMENT — and the two answer different
   * questions about the same line. One spelling for both would make the report unreadable at
   * exactly the place a reader is checking who observed what.
   */
  surfaceProvenance: SurfaceProvenance;
  /**
   * Sentences naming records at this path that were NOT read, and why — caller-recorded surfaces
   * only. A record excluded by its shape or by its declared completeness is not a missing one, and
   * a line that did not say so would send a caller to capture a path they had already captured.
   */
  notes?: string[];
}

const samePath = (a: string[], b: string[]) =>
  a.length === b.length && a.every((t, i) => t === b[i]);

const showPath = (p: string[]) => (p.length === 0 ? "(root)" : p.join(" "));

/**
 * The two sentences a finding carries, ordered by provenance.
 *
 * An `emitted` document is the tool's own words, so the tool contradicting it is the first
 * reading and the strong one. A `modelled` document is a stranger's, so the model being wrong
 * comes first. Neither order deletes the other sentence — that is the requirement.
 */
function readings(
  kind: DeclarationFindingKind,
  provenance: Provenance,
  subject: string,
  path: string[],
): [string, string] {
  const where = showPath(path);
  const toolIsWrong: Record<DeclarationFindingKind, string> = {
    "declared-not-accepted": `the tool publishes ${subject} at ${where} and its own parser does not list it among the flags it accepts — one process, both statements`,
    "accepted-not-declared": `the tool accepts ${subject} at ${where} and its declaration never mentions it, so a caller holding only the declaration cannot reach it`,
    "refused-but-enumerated": `the tool declares ${subject} refused at ${where} and its parser advertises it as valid`,
    "self-description-not-declared": `the tool declares that ${subject} produces this document and does not list ${subject} among its commands, so the declaration omits the door it came through`,
  };
  const declarationIsWrong: Record<DeclarationFindingKind, string> = {
    "declared-not-accepted": `the declaration claims ${subject} is valid at ${where} and the enumeration read back from the tool does not name it — the enumeration may also be short of a flag the tool does accept`,
    "accepted-not-declared": `the declaration is incomplete about ${where}, or ${subject} is accepted somewhere the declaration does not cover`,
    "refused-but-enumerated": `the declaration claims ${subject} is refused at ${where} and the tool's own enumeration names it valid`,
    "self-description-not-declared": `the declaration names ${subject} as the invocation that emits it and does not declare ${subject} as a command`,
  };
  return provenance === "emitted"
    ? [toolIsWrong[kind], declarationIsWrong[kind]]
    : [declarationIsWrong[kind], toolIsWrong[kind]];
}

/**
 * The sentence each no-evidence reason prints. Two entries, and the enum has two members.
 *
 * `not-recorded` is only ever reachable when a batch was supplied — with no batch, a path the kit
 * could not reach is `unreachable`, which is what it is.
 */
const NO_EVIDENCE_SENTENCE: Record<NoEvidenceReason, string> = {
  unreachable: "the kit probes the root only, so nothing reached this path",
  "not-recorded": "the caller supplied recorded surfaces and recorded nothing at this path",
};

/**
 * Diff a declaration against what the target said it accepts.
 *
 * PURE, exactly as a checker's `check` is: nothing here spawns, and the evidence has already been
 * recorded. Nothing here reaches a verdict either — see the module comment.
 */
export function diffDeclaration(
  declaration: Declaration,
  evidence: readonly PathSurface[],
  /**
   * Whether the run was given a batch of caller-recorded surfaces.
   *
   * It changes only the sentence a path with no evidence gets, and it has to be passed rather than
   * inferred from `evidence`: a batch that was supplied and happens to say nothing about THIS path
   * is `not-recorded`, and with no batch at all the same path is `unreachable`, which is what it
   * is. Inferring from a non-empty `evidence` would also mislabel every path on a run where the
   * batch's records were all excluded.
   */
  recordedBatchSupplied = false,
): DeclarationDiff {
  const findings: DeclarationFinding[] = [];
  const add = (kind: DeclarationFindingKind, path: string[], subject: string) =>
    findings.push({
      kind,
      path,
      subject,
      readings: readings(kind, declaration.provenance, subject, path),
    });

  // THE ZERO-PROBE CHECK, run before anything that needs evidence and independently of whether
  // any arrived. `STANDARD.md`: "It must be listed in itself." The first token that is not a flag
  // is the verb; an invocation that is all flags (`--cli-schema`) claims no verb and is skipped
  // rather than guessed at.
  const selfVerb = declaration.selfDescription?.args.find((a) => !a.startsWith("-"));
  if (selfVerb !== undefined && !declaration.commands.some((c) => c.path[0] === selfVerb)) {
    add("self-description-not-declared", [], selfVerb);
  }

  // The UNION of declared paths and paths evidence arrived for. A path with evidence and no
  // declaration is the DT-1 case — anthill's manifest has no slot for root flags at all — and
  // treating it as "nothing declared here" is what lets its accepted flags be reported instead of
  // silently skipped.
  const paths: string[][] = [...declaration.commands.map((c) => c.path)];
  for (const e of evidence) if (!paths.some((p) => samePath(p, e.path))) paths.push(e.path);

  const results: DeclarationPathResult[] = [];
  for (const path of paths) {
    const declared = declaration.commands.find((c) => samePath(c.path, path));
    const found = evidence.find((e) => samePath(e.path, path));
    if (!found) {
      // Named as a property of THE KIT or of the BATCH, never of the target: nothing was learned
      // about this command. One sentence used to serve both, which was right for a path nothing
      // reached and wrong for a path the caller simply did not record — and those lead to
      // different next actions.
      const noEvidenceReason: NoEvidenceReason = recordedBatchSupplied
        ? "not-recorded"
        : "unreachable";
      results.push({
        path,
        checked: false,
        noEvidenceReason,
        reason: NO_EVIDENCE_SENTENCE[noEvidenceReason],
      });
      continue;
    }
    // THE ACCEPTED SET, OR NOTHING — and `enumerated-none` yields a set, an empty one.
    //
    // Two statuses carry an answer and two do not. `enumerated-none` is the target SAYING its
    // accepted set is empty, which is a set difference this can perform: every `valid` declared
    // arg is absent from it, `refused-but-enumerated` cannot fire because nothing is in it, and
    // `accepted-not-declared` cannot fire because it names no flags. That is a comparison with a
    // predictable shape, not a silence, so `checked` is `true` for it — `checked: false` means the
    // diff DID NOT RUN at this path, and here it ran.
    //
    // Written as `undefined` versus a set rather than as `!flags`, deliberately. `![]` is `false`,
    // so a truthiness test would admit an empty array by accident and the distinction this
    // function is supposed to draw would rest on a coincidence. `enumerated` with no `flags` is
    // still not comparable, and that is the branch below, reached by name.
    const acceptedFlags =
      found.surface.status === "enumerated"
        ? found.surface.flags
        : found.surface.status === "enumerated-none"
          ? []
          : undefined;
    if (acceptedFlags === undefined) {
      // THE HONESTY CASE. A target that did not enumerate has not agreed with anything; it has
      // said nothing, and the diff did not happen. Reusing `surfaceSummary` so this sentence
      // cannot drift from the one the surface block prints two lines above it — and passing the
      // PATH, so it names the path it is about instead of claiming the root.
      results.push({
        path,
        checked: false,
        surfaceProvenance: found.surfaceProvenance,
        reason: [surfaceSummary(found.surface, path), ...(found.notes ?? [])].join("; "),
        ...(declared === undefined ? { undeclared: true as const } : {}),
      });
      continue;
    }
    results.push({
      path,
      checked: true,
      surfaceProvenance: found.surfaceProvenance,
      ...(declared === undefined ? { undeclared: true as const } : {}),
    });
    const accepted = new Set(acceptedFlags);
    const args = declared?.args ?? [];
    for (const arg of args) {
      if (arg.status === "valid" && !accepted.has(arg.name))
        add("declared-not-accepted", path, arg.name);
      if (arg.status === "refused" && accepted.has(arg.name))
        add("refused-but-enumerated", path, arg.name);
    }
    // A POSITIONAL IS NOT EXPECTED IN THE FLAG SET, so its absence is never a finding — that is
    // the container doing its job. What IS checked is the other direction: a flag the tool
    // accepts and neither container declares.
    const named = new Set([
      ...args.map((a) => a.name),
      // Positional names are compared as flag spellings, because that is the mistake DT-3
      // describes: a consumer builds `--handle foo` from a positional called `handle`. If the
      // tool really does accept that spelling, the declaration has the wrong container and the
      // finding belongs to the arg side, not here.
      ...(declared?.positionals ?? []).map((p) => `--${p.name}`),
    ]);
    for (const flag of acceptedFlags) {
      if (!named.has(flag)) add("accepted-not-declared", path, flag);
    }
  }

  // TWO COUNTS, ONE TOTAL. `checkedCommands` is the fraction's numerator and must come from the
  // same set as its denominator; `checkedUndeclared` carries everything else that was compared.
  // `status` and `reason` read the TOTAL, because a diff that ran only at an undeclared root
  // still ran — reading `checkedCommands` here would report `not-checked` on a census that
  // produced findings.
  const checkedCommands = results.filter((r) => r.checked && !r.undeclared).length;
  const checkedUndeclared = results.filter((r) => r.checked && r.undeclared).length;
  const checkedTotal = checkedCommands + checkedUndeclared;
  return {
    provenance: declaration.provenance,
    status: checkedTotal > 0 ? "checked" : "not-checked",
    ...(checkedTotal === 0
      ? {
          reason:
            results[0]?.reason ??
            "the declaration names no command path, so there was nothing to diff",
        }
      : {}),
    paths: results,
    findings,
    declaredCommands: declaration.commands.length,
    checkedCommands,
    checkedUndeclared,
  };
}

/**
 * WHAT THE READER DOES NEXT when the diff did not run — one sentence, chosen by provenance.
 *
 * Every `not-checked` reason names a limit of THE KIT or a silence of the TARGET, which is
 * correct and is also where an adopter stopped: the reasons say what happened and nothing says
 * what to do about it. The remedy differs by who wrote the document, and only by that. An
 * `emitted` declaration's author owns the tool, so the enumeration is theirs to add. A modelling
 * caller cannot patch a target they did not write, and the thing they most need to know is that
 * no edit to their own file will help — otherwise they go looking for the mistake in it.
 *
 * One sentence each, deliberately: this is a report line, not a tutorial.
 */
const NOT_CHECKED_REMEDY: Record<Provenance, string> = {
  emitted:
    "Remedy: have the target's rejections enumerate the flags it accepts — this document is the tool's own, so that is a change its author can make",
  modelled:
    "Remedy: nothing you can write in this file changes this — it becomes checkable when the target enumerates at the root, or when the kit probes below it",
};

/**
 * One line saying what the diff did, in words that cannot be read as a verdict.
 *
 * The `not-checked` sentence is the one this whole reader exists to get right: an empty finding
 * list on a target that never enumerated must not read as agreement.
 */
export function declarationSummary(d: DeclarationDiff | undefined): string {
  if (!d) return "no declaration was supplied, so nothing was compared";
  const scope = `${d.checkedCommands} of ${d.declaredCommands} declared command path${
    d.declaredCommands === 1 ? "" : "s"
  } compared`;
  // NAMED, NOT JUST COUNTED. A reader who sees that some path outside the declaration was
  // compared immediately wants to know which one, and the answer is almost always `(root)` —
  // which is also the sentence that explains why the fraction ahead of it can be `0 of 25`.
  const outside = d.paths.filter((p) => p.checked && p.undeclared).map((p) => showPath(p.path));
  const alsoCompared =
    outside.length === 0
      ? ""
      : `; ${outside.length} path${outside.length === 1 ? "" : "s"} the declaration does not name — ${outside.join(", ")} — ${outside.length === 1 ? "was" : "were"} also compared`;
  if (d.status === "not-checked") {
    // The zero-probe check still ran, so its findings are counted here — otherwise a document
    // that omits its own discovery verb would look clean on a target that never enumerated.
    const zero = d.findings.length;
    return `THE DIFF DID NOT RUN — ${scope}${alsoCompared}. ${d.reason} (this is not agreement: nothing was compared)${
      zero > 0 ? `; ${zero} disagreement${zero === 1 ? "" : "s"} found without probing` : ""
    }. ${NOT_CHECKED_REMEDY[d.provenance]}`;
  }
  const n = d.findings.length;
  return `${scope}${alsoCompared}; ${n} disagreement${n === 1 ? "" : "s"} (${d.provenance} declaration)`;
}
