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
 * DIFFERENCE between "it did not", "it said the set was empty", and "nothing readable was
 * recorded".
 *
 * TWO THINGS THAT LOOK ALIKE AND ARE NOT. Most CLIs do not enumerate, and answering one of them
 * with an empty array would be THE KIT inferring zero flags out of a silence — a false and
 * confident-sounding claim about a population this project exists to describe honestly. That
 * inference is forbidden here and nothing mints it: `flags` is absent on every status but
 * `enumerated`.
 *
 * `enumerated-none` is the other case, and it is a quotation rather than an inference: THE TARGET
 * named a set and left it empty. Recording what was said is not adopting it — what the tool
 * accepts remains unknown to this capture either way, and an empty array is as easily a serializer
 * that dropped its contents as a program with nothing to declare.
 */
export type SurfaceStatus =
  /** At least one rejection named a set of flags. `flags` is present. */
  | "enumerated"
  /**
   * Root-level rejections were read and none named a set of flags. A STATEMENT ABOUT THE TOOL'S
   * ROOT ERROR TEXT, and not about what it accepts: whether the tool has flags is exactly what
   * this does not settle. A tool with flags it never lists and a tool with none that stays quiet
   * land here alike, and nothing in the condition that mints this can tell them apart — rejections
   * read, no flag list, and no recognised key left empty WHOSE EMPTINESS SETTLES ANYTHING WHERE
   * THE CALLER IS STANDING. That last clause is a real one and not a hedge: at the root a rejection
   * carrying `choices: []` does leave a recognised key empty and still lands here, because
   * `ROOT_AMBIGUOUS_WHEN_EMPTY` excludes it — an empty `choices` at the root is as likely to be a
   * tool announcing no SUBCOMMANDS. See the filter in `surfaceFrom` and the two constants beside
   * `captureSurface` before reading this status as "nothing was empty".
   *
   * It says nothing about a subcommand either: a verb-first CLI that enumerates one level down
   * lands here too, which is why every rendered sentence names the scope.
   */
  | "not-enumerated"
  /**
   * A root-level rejection named a set under a key this reads AND THAT SET WAS EMPTY — one whose
   * emptiness is not excluded where the caller is standing. The target answered the question
   * rather than declining it, which is the whole difference from `not-enumerated`: that status
   * says no rejection named a set OF FLAGS, and the rejection here named one — empty, but named
   * under a key that can mean nothing else. (It is NOT "named no set at all" — `not-enumerated`
   * renders a near-miss clause for a set the target did name but whose members are not flags, and
   * an empty `choices` at the root lands there too.) Recording
   * this as that one publishes a sentence — `none named a set of flags` — that the target's own
   * bytes refute. `emptySetKeys` names the key, so the claim can be checked against those bytes
   * rather than trusted.
   *
   * WHAT IT DOES NOT SAY IS THAT THE TOOL ACCEPTS NO FLAGS. This is the target's assertion,
   * captured, and an empty array is as easily a serializer that dropped its contents as a program
   * with nothing to declare — the kit reports what was said and does not adopt it. `flags` stays
   * ABSENT for the same reason it is absent on `not-enumerated` and `no-evidence`: an empty list
   * published as a list is indistinguishable from a list, and nothing here enumerated anything.
   *
   * Like `not-enumerated` it says nothing about a subcommand. A verb-first CLI whose verbs scope
   * their own flags answers at the root with an empty set and lands here, which is why the rendered
   * sentence names the scope.
   */
  | "enumerated-none"
  /**
   * Nothing readable was recorded — no root-level flag rejection ran, or every one of them hung,
   * crashed, failed to spawn or was truncated at the output ceiling. A statement about the RUN.
   * Distinguished from `not-enumerated` AND from `enumerated-none` for the same reason
   * `unverified` is distinguished from `pass` everywhere else in this kit: "we did not look" is
   * neither "we looked and found nothing" nor "we looked and it said none".
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
   * Absent rather than empty on the other three — `enumerated-none` included, where the target
   * DID answer — so a consumer reading `.flags` gets `undefined` and has to look at `status`,
   * instead of an empty array it can mistake for an answer. An empty list published as a list is
   * indistinguishable from a list, and this field is where a reader takes the kit's word for what
   * a target accepts. What the target said about an empty set is carried by `status` and named by
   * `emptySetKeys`, never by an empty `flags`.
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
   * How many recorded rejections were readable, which is what makes `not-enumerated` AND
   * `enumerated-none` measurements rather than assumptions: "4 rejections read, none named a set
   * of flags" and "4 rejections read, and the set the target named held nothing" are both claims
   * with a denominator. Undenominated, either one degrades into a bare assertion about the tool —
   * the one thing this capture may never make.
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
  /**
   * THE KEYS THE TARGET NAMED AND LEFT EMPTY — present only on `enumerated-none`, which is minted
   * from them.
   *
   * Deduplicated and in first-sighting order, the way `nonFlagCandidates` is: one key repeated
   * across four probes is one entry. It carries no members because there were none; the whole
   * content of the observation is WHICH key was empty, and that is what makes the status a claim a
   * reader can check against the recorded bytes rather than one they have to take on trust.
   */
  emptySetKeys?: string[];
  /**
   * THE ADVERTISED VERB SET — what the target says its commands are, read from its root captures.
   *
   * A FIELD OF ITS OWN, and not a widening of `nonFlagCandidates` above, because the two carry
   * opposite contracts. That one is DIAGNOSTIC: a set the flag reader saw and REJECTED, sampled to
   * `SAMPLE` because all it claims to do is show a reader what kind of thing was there. This one is
   * an ASSERTION — *this IS the set of verbs the target advertises* — so it carries the full list,
   * the shape it was read in, which capture it came from, and whether the list said of itself that
   * it was incomplete. Overloading one field with both is how sample-versus-full and
   * diagnostic-versus-assertion end up disagreeing inside one structure.
   *
   * PRESENT ONLY ON THE KIT'S OWN ROOT CAPTURE. `surfaceFrom` does not build it, so a
   * caller-recorded batch never carries one: the batch is the RECORDED side of the comparison, and
   * a recorded surface asserting an advertised set as well would be the kit reading the same claim
   * out of two places. `captureSurface` derives it once and every consumer reads it — see
   * `advertisedVerbsFrom`.
   */
  advertisedVerbs?: AdvertisedVerbs;
}

/** How a root capture named its verb set. Published so a reader can audit the match. */
export type AdvertisedShape =
  /** A `choices` array in a JSON error envelope — the retrofitted shape, and the reliable one. */
  | "envelope-choices"
  /** A pipe-delimited bracket group on a `usage:` line — the legacy shape, where the drift lives. */
  | "usage-line";

/** Which ROOT capture a verb set was read from. There are two, and never a `--help` body. */
export type AdvertisedFrom = "bare-invocation" | "unknown-verb-rejection";

/**
 * ONE ROOT CAPTURE'S ACCOUNT OF THE VERBS IT ACCEPTS.
 *
 * `verbs` IS THE WHOLE LIST AND IS NOT SAMPLED, which is a deliberate exception to the discipline
 * `nonFlagCandidates` follows, taken for the reason the action on this field is different: the
 * thing a reader does with a verb-set disagreement is go and add THESE verbs to their help, so a
 * sample plus a count is the tool saying what it did while withholding what it found.
 *
 * IT IS STILL BOUNDED, by an existing mechanism rather than by an assumption. `runner.ts` caps
 * every captured stream at `MAX_STREAM_BYTES`, so a pathological target produces a pathological
 * list bounded by that and nothing further. This is the SECOND user of a documented reliance and
 * not a new exception: `ReportedObservation.args` in `report.ts` leans on exactly the same cap, in
 * the same words — *"bounded only by `MAX_STREAM_BYTES` in `runner.ts` … it is written down
 * because 'argv is small' is an assumption a reader would otherwise make."* "Verb sets are small"
 * is that same assumption, and it is written down here rather than relied on. The TEXT line
 * samples at `VERB_LINE_CAP`; the JSON always carries every member.
 */
export interface AdvertisedVerbSet {
  /** Every member, in the order the target listed them. Never sampled — see above. */
  verbs: string[];
  shape: AdvertisedShape;
  /**
   * The list said of ITSELF that it is incomplete — it carried `…` or `...` as a member.
   *
   * The marker is dropped from `verbs` rather than kept as one, because `...` is not a verb any
   * caller can type. It is carried here because a `recorded but never advertised` finding cannot
   * be ASSERTED from a list that says it is incomplete: the verb may live in the elided tail.
   */
  open: boolean;
  /**
   * TRUE WHEN SHAPE ALONE CANNOT ASSERT THIS BLOB — two members or fewer.
   *
   * `<name|id>` is a type union and `<get|set>` is a two-verb tool, and no lexical rule separates
   * them. Three members or more assert on shape alone, deliberately: nothing about a larger verb
   * set may depend on how fresh the caller's batch is. At two or fewer the last discriminator is
   * EVIDENCE rather than shape — a majority of the members matching recorded paths — and the
   * boundary to hold is that recorded paths CONFIRM the blob and never CONSTRUCT it. The members
   * come from the target's own bytes either way, so the freshness property survives.
   */
  confirmationRequired: boolean;
  from: AdvertisedFrom;
  /** The observation this was read from — resolvable in `Report.observations[]`. */
  observationId: string;
  /** The argv that produced the capture. */
  args: string[];
  stream: "stdout" | "stderr";
}

export interface AdvertisedVerbs {
  /**
   * How many ROOT captures were readable, which is what makes an empty `sets` a measurement rather
   * than an assumption — the same denominator `probesRead` gives the flag capture.
   */
  capturesRead: number;
  /** One entry per root capture that named a set. Empty is NOT "the target advertises no verbs". */
  sets: AdvertisedVerbSet[];
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
 *
 * `empty` collects the keys that matched and held NOTHING, and it is a third output for the same
 * reason. An empty array is not a set of flags and must never reach `out` — the two `value.length
 * > 0` guards below are what stop it, and the guards below them are all vacuously satisfied by
 * `[]`, so an empty array threaded through `out` would be published as an enumeration of zero
 * flags. It is a key with no members, and it goes where a key with no members goes.
 */
function keyedSets(
  document: unknown,
  rejected?: Array<{ key: string; values: string[] }>,
  empty?: string[],
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
      } else if (
        empty &&
        KEYS.has(normaliseKey(key)) &&
        Array.isArray(value) &&
        value.length === 0
      ) {
        // Matched a key this reads and held nothing. That is an answer — not a near miss and not a
        // silence — and it is the one case where the emptiness itself is the whole content. WHICH
        // of these keys settles anything is not decided here: it depends on WHERE the document was
        // captured, which this reader cannot see. See `surfaceFrom`'s `ambiguousWhenEmpty`.
        empty.push(key);
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
 * ONLY JSON DOCUMENTS ARE READ HERE, and the refusal that used to be written in this comment still
 * holds FOR THIS FIELD. It used to end: *guessing which prose list is "a set of something else" is
 * exactly the inference this capture refuses to make.* That is still true of `nonFlagCandidates`,
 * whose whole claim is the negative one — "there was a set here and it is not flags" — and a prose
 * near-miss reader would have to decide which arbitrary bracketed list counted as a set at all.
 *
 * WHAT CHANGED, AND WHY IT IS NOT THIS REFUSAL BEING QUIETLY REVERSED. `advertisedVerbsIn` below
 * does read a bracket group out of prose, and it is a different reader answering a different
 * question under conditions this one has none of: it is restricted BY PROVENANCE to two root
 * captures (a bare invocation and an unknown-verb rejection, never a `--help` body), it is anchored
 * to a `usage:` line, it takes only the first bracket group, it requires a pipe, and it requires
 * every member to be token-shaped. The general inference — read any prose list as a set — is still
 * refused, here and there. A reader arriving at these two functions six months from now should
 * find one decision, narrowed, rather than a comment and a contradiction.
 */
export function nonFlagSetsIn(text: string): Array<{ key: string; values: string[] }> {
  const trimmed = text.trim();
  if (trimmed === "" || !parsesWhole(trimmed)) return [];
  const rejected: Array<{ key: string; values: string[] }> = [];
  keyedSets(JSON.parse(trimmed) as unknown, rejected);
  return rejected;
}

/**
 * Keys this reads that the target named and left EMPTY — the channel that carries an explicit
 * "none" up to `surfaceFrom`.
 *
 * A SECOND PASS over the raw text, on exactly the model of `nonFlagSetsIn` above and for the same
 * reason: `readStream` answers "is there a flag surface here", every caller reads it that way, and
 * an empty set is the one answer that must never travel beside a flag list. `surfaceFrom` is handed
 * evidence and raw streams rather than a parsed document, so the answer has to be re-read from the
 * bytes there — which is what keeps this reachable from the caller-recorded reader too, through the
 * stream texts it already passes.
 *
 * ONLY JSON DOCUMENTS ARE READ, for a stronger reason than the near-miss reader has: there is no
 * prose spelling of an empty list. A sentence that names no flags is a sentence that named no
 * flags, which is `not-enumerated`, and inventing an empty-set marker for prose would be the kit
 * deciding what one of the target's sentences MEANS.
 *
 * IT REPORTS EVERY RECOGNISED KEY HELD EMPTY AND JUDGES NONE OF THEM. Whether a particular key's
 * emptiness settles anything depends on WHERE the document was captured — see `surfaceFrom`'s
 * `ambiguousWhenEmpty` and the two constants beside `captureSurface` — and this function is handed
 * one stream's text with no idea which path it came from. A reader that filtered here would be
 * deciding a positional question from a position it cannot see.
 */
export function emptySetsIn(text: string): string[] {
  const trimmed = text.trim();
  if (trimmed === "" || !parsesWhole(trimmed)) return [];
  const empty: string[] = [];
  keyedSets(JSON.parse(trimmed) as unknown, undefined, empty);
  return empty;
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
 * KEYS WHOSE EMPTINESS SETTLES NOTHING AT THE ROOT — and the reason it is a POSITION and not a
 * property of the key.
 *
 * `choices` is the one recognised key ambiguous between flags and verbs. For a NON-EMPTY array the
 * flag-shape test resolves it by inspecting the members — `["rules","show"]` is verbs and
 * `["--a"]` is flags — but an empty array has no members, so the test cannot run.
 *
 * AT THE ROOT that leaves a real ambiguity. `advertisedVerbsFrom` is attached to the root capture
 * and nowhere else, so the root is the one place in this kit where `choices` is read as a set of
 * SUBCOMMANDS; a root saying `"choices": []` is as likely announcing that it has no subcommands as
 * that it accepts no flags, and minting `enumerated-none` from it would publish the first as the
 * second. So at the root, and only there, an empty `choices` alone leaves the status where it was.
 *
 * BELOW THE ROOT THE AMBIGUITY IS NOT THERE TO RESOLVE — see `NO_AMBIGUOUS_KEYS`. This is why the
 * exclusion is a parameter rather than a constant inside the reader: the fact that decides it is
 * "which position is this", and the reader is handed one stream's bytes with no way to know.
 */
export const ROOT_AMBIGUOUS_WHEN_EMPTY: ReadonlySet<string> = new Set(["choices"]);

/**
 * NO KEY'S EMPTINESS IS CONTESTED HERE — the exclusion set for every position below the root.
 *
 * A recorded path is not read for an advertised verb set by anything in this kit: `advertisedVerbs`
 * is derived in `captureSurface` alone, and `readRecordedBatch` calls `surfaceFrom` directly. So
 * below the root nothing reads `choices` as verbs, and a verb-first CLI answering
 * `sessions --nope` with `"choices": []` is saying what it accepts AT `sessions` — which is the
 * adopter report this state was built for. A group node that really does name subcommands names
 * them, and a non-empty list is resolved by the flag-shape test as it always was.
 *
 * Passed explicitly rather than defaulted, because a caller that has not thought about its own
 * position is the caller most likely to be at the root.
 */
export const NO_AMBIGUOUS_KEYS: ReadonlySet<string> = new Set();

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

  const surface = surfaceFrom(
    evidence,
    rejections.length,
    rejections.flatMap((o) => [o.stderr, o.stdout]),
    // THIS IS THE ROOT, and the root is where `choices` means verbs — see the constant. The fact
    // is supplied here because this is the function that knows it, and it is the same fact the
    // `advertisedVerbs` derivation below rests on.
    ROOT_AMBIGUOUS_WHEN_EMPTY,
  );
  // THE ONE DERIVATION. Attached here rather than inside `surfaceFrom` because that function is
  // shared with the caller-recorded reader, and a recorded batch is the RECORDED side of this
  // comparison — deriving an advertised set there too would give one claim two homes, which is
  // exactly the defect `surfaceFrom` exists to have ended.
  return { ...surface, advertisedVerbs: advertisedVerbsFrom(observations) };
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
 *
 * `ambiguousWhenEmpty` IS THE CALLER'S POSITION, expressed as the keys whose emptiness settles
 * nothing there, and it has no default on purpose. `choices` is contested between flags and verbs
 * at the root and nowhere else — `advertisedVerbs` is derived in `captureSurface` alone — so the
 * rule cannot live in this function or in the reader beneath it: neither can see where the bytes
 * came from. Both positions are named and documented as constants beside `captureSurface`, and a
 * new caller has to pick one rather than inherit whichever was convenient to default to.
 */
export function surfaceFrom(
  evidence: SurfaceEvidence[],
  probesRead: number,
  streams: readonly string[],
  ambiguousWhenEmpty: ReadonlySet<string>,
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
  // Deduped and in first-sighting order, exactly as the near-miss keys above are. A key held empty
  // is an ANSWER — the target named the set and there was nothing in it — so it decides the status
  // rather than merely annotating it. `probesRead > 0` still gates the whole branch: a run that
  // read no rejection has heard nothing, whatever the streams it never read contain.
  //
  // MINUS THE KEYS WHOSE EMPTINESS SETTLES NOTHING WHERE THE CALLER IS STANDING. Compared on the
  // normalised spelling, because the target chose the capitalisation and this set names the key.
  const emptyKeys = [...new Set(streams.flatMap((text) => emptySetsIn(text)))].filter(
    (key) => !ambiguousWhenEmpty.has(normaliseKey(key)),
  );
  const statedNone = probesRead > 0 && emptyKeys.length > 0;
  return {
    status: probesRead > 0 ? (statedNone ? "enumerated-none" : "not-enumerated") : "no-evidence",
    evidence: [],
    probesRead,
    ...(byKey.size > 0 ? { nonFlagCandidates: [...byKey.values()] } : {}),
    ...(statedNone ? { emptySetKeys: emptyKeys } : {}),
  };
}

/**
 * One line saying what the capture found AT ONE PATH, in words that cannot be read as a verdict.
 *
 * Shared by `acc check` and `acc compare` so the two cannot describe the same field differently —
 * the `not-enumerated` and `enumerated-none` sentences in particular have to say the same thing in
 * both places, because those two are what this whole capture exists to keep apart. One of them
 * attributes a silence to the read and the other attributes an emptiness to the target, and a copy
 * that drifted would put the kit's name on a claim only the target made.
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
 *
 * A SWITCH WITH NO `default`, AND EVERY STATUS SPELLED OUT, because the alternative failed silently.
 * This was an `if`-chain ending in an unconditional `return` that WAS the `no-evidence` sentence,
 * so a status added without a clause printed "nothing readable was recorded" — a confident "we did
 * not look" — about a target that had answered explicitly, and nothing in the compiler could say
 * so, because an `if`-chain is never checked for exhaustiveness. `no-evidence` has its own case for
 * that reason: it must be a sentence a status is GIVEN, never one it inherits by falling past the
 * others. The next member of `SurfaceStatus` is a type error here.
 */
export function surfaceSummary(s: Surface | undefined, path: readonly string[] = []): string {
  if (!s) return "not recorded — this report predates the flag-surface capture";
  const where = path.length === 0 ? "the root" : path.join(" ");
  switch (s.status) {
    case "enumerated": {
      const flags = s.flags ?? [];
      const n = flags.length;
      const disagreed = s.consistent === false;
      return `enumerated ${n} flag${n === 1 ? "" : "s"} at ${where}: ${flags.join(" ")}${
        disagreed ? "  (rejections disagreed; see the per-probe lists)" : ""
      }`;
    }
    case "not-enumerated": {
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
    case "enumerated-none": {
      // NOTHING HERE MAY READ AS `not-enumerated` OR `no-evidence` — the two sentences that
      // attribute an absence to the READ. This target spoke: it named the key and left it empty,
      // so the sentence has to attribute the emptiness to the target instead. Nor may it read as
      // `enumerated`: what the target said is quoted, never adopted as the tool's surface.
      // Naming the key is a clause rather than the claim, so a caller that carries the status
      // without the keys still gets a true sentence.
      const keys = s.emptySetKeys ?? [];
      const under = keys.length === 0 ? "" : ` under ${keys.map((k) => `\`${k}\``).join(", ")}`;
      // THE SAME NEAR-MISS CLAUSE `not-enumerated` RENDERS, and worded identically on purpose: a
      // target can name one key empty (minting this status) while a DIFFERENT key on the same
      // rejection carried a non-flag list — `choices: ["run","build"]` beside `validFlags: []` is
      // exactly this shape. `surfaceFrom` already attaches `nonFlagCandidates` here, right beside
      // `emptySetKeys`, so withholding the clause would drop data the JSON still carries.
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
      return `stated an empty set of flags at ${where}${under}; ${s.probesRead} rejection${
        s.probesRead === 1 ? "" : "s"
      } read, and the set the target named held nothing (the target's own answer, not silence read as one)${seen}`;
    }
    case "no-evidence":
      return `nothing readable was recorded at ${where}, so nothing was read (not a statement about the tool)`;
  }
  // NOT A `default` CLAUSE, AND NOT A BARE TRAILING RETURN — the two shapes that would each undo
  // the switch. Without this line the compiler's complaint about a fourth status is `TS2366:
  // Function lacks ending return statement`, which names no status, and whose obvious repair is a
  // trailing sentence — restoring the exact fallthrough this switch removed. Assigning the status
  // to `never` makes the error name the member that has no clause, which is the thing a maintainer
  // needs to be told, and that half of this is unchanged.
  const unhandled: never = s.status;
  // WHAT IS NOT UNREACHABLE IS THIS LINE. The exhaustiveness above is a compile-time property of
  // `SurfaceStatus`; `s` on this path came from `JSON.parse` of a stored report, and `acc report`
  // and `acc compare` accept any report file — including one a NEWER kit wrote, which the JSON
  // guide names as a live case. So the type says `never` and the value can be a string this build
  // has never heard of. Returning it published the bare enum token AS the surface sentence: no
  // scope, no qualifier, and no statement that the reader could not read it.
  //
  // The sentence below is this project's standing rule for an artifact it cannot fully read —
  // render it as "not recorded by that kit", never as an absent or garbled thing — applied in the
  // direction the older-artifact guards do not cover. It names the scope like every other sentence
  // here, quotes the token so a reader can look it up in the kit that wrote it, and carries the
  // same "not a statement about the tool" qualifier as `no-evidence`: what is unknown here is the
  // READING, and nothing about the target has been established either way.
  return `not recorded by this kit at ${where} — the stored status ${JSON.stringify(
    unhandled as string,
  )} is one this build cannot read, so nothing was read from it (not a statement about the tool)`;
}

/**
 * THE SHAPE EVERY MEMBER OF AN ADVERTISED VERB SET MUST HAVE.
 *
 * Lowercase, starting with a letter — the shape of a token a caller types. It kills `<FILE>` and
 * `<key=value>`, which are metavariables wearing a bracket group's clothes. It is a shape test and
 * not a meaning test: nothing here works out what one of the target's words MEANS, which is the
 * limit `docs/wiki/concepts/probing.md` puts on every reader in this file.
 */
const VERB_TOKEN = /^[a-z][a-z0-9-]*$/;

/**
 * The two spellings of an OPEN-SET MARKER, which are dropped from the set rather than counted in it.
 *
 * Found inside the adopter's own quoted usage string — `usage: cli.ts <open|state|tail|…>` — where
 * a fixture built from that line dropped the ellipsis without anyone noticing, and the parse would
 * have shipped reading `…` as a fifth verb. An ellipsis is the usage line declaring its own list
 * INCOMPLETE, so it is a marker: it leaves `verbs`, and it sets `open`.
 */
const OPEN_MARKERS = new Set(["…", "..."]);

/**
 * HOW MANY VERBS THE TEXT LINE PRINTS before it samples.
 *
 * The JSON field is never sampled (see `AdvertisedVerbSet.verbs`); this bounds the one-line render
 * only, because a report line is read by a person and a thousand names on it is not a line. 32
 * covers every tool in the fleet this was measured against, and past it the line prints a sample
 * and the true count so a cut can never pass for the whole list.
 *
 * DELIBERATELY NOT `SAMPLE`. That constant bounds `nonFlagCandidates`, whose contract is diagnostic
 * and whose bound is tested by name; repurposing it would make one number answer to two contracts.
 */
const VERB_LINE_CAP = 32;

/** What a parse of one stream yields, before it is attributed to a capture. */
export type VerbBlob = { verbs: string[]; shape: AdvertisedShape; open: boolean } | null;

/**
 * Turn the raw members of a blob into a set, or refuse the blob outright.
 *
 * Shared by both shapes so the ellipsis and the member-shape test cannot come to differ between a
 * JSON `choices` array and a usage line — the two shapes are two ways of reading one claim, and a
 * rule that held for one and not the other would be a second place to be wrong.
 */
function membersOf(raw: readonly string[]): { verbs: string[]; open: boolean } | null {
  let open = false;
  const verbs: string[] = [];
  for (const member of raw) {
    const token = member.trim();
    if (token === "") continue;
    if (OPEN_MARKERS.has(token.toLowerCase())) {
      open = true;
      continue;
    }
    // EVERY member must be token-shaped, and one that is not refuses the WHOLE blob rather than
    // being skipped. A blob half of whose members are metavariables is not a verb list with some
    // noise in it; it is a usage line describing arguments, and reading the half that happens to
    // look like verbs out of it would publish a set the target never named.
    if (!VERB_TOKEN.test(token)) return null;
    verbs.push(token);
  }
  // A BLOB WITH NO MEMBERS IS REFUSED, AND THE ASYMMETRY WITH THE FLAG READER IS DELIBERATE.
  // `keyedSets` stopped discarding an empty flag set, because there a target that names
  // `validFlags` and leaves it empty has ANSWERED the only question asked at that path: nothing
  // else speaks for it, so dropping the answer published its negation, which is what
  // `enumerated-none` exists to stop. A verb blob is not in that position. `advertisedVerbsFrom`
  // reads TWO KINDS of root capture — the unknown-verb rejection and the bare invocation — over
  // however many observations carry them, and collects a set from every one that yields, so a
  // `null` here settles nothing: it leaves the question to the other captures. What it does cost is
  // real and worth naming — when NO capture yields, the fact that a `choices` was present and empty
  // is recorded nowhere on the verb side, and only `capturesRead` says we looked.
  // And an empty `choices` on an unknown-verb rejection is as easily a tool that scopes its verbs
  // somewhere this cannot see as one that advertises none; minting a set from it would be the kit
  // deciding what an absence MEANS, the same fabrication the flag side refuses, reached from the
  // other direction.
  return verbs.length === 0 ? null : { verbs, open };
}

/**
 * The `choices` array of a JSON error envelope — the retrofitted shape.
 *
 * Only `choices`, and not the qualified flag keys `KEYS` also holds: those are declarations ABOUT
 * FLAGS by construction (`validFlags` cannot mean anything else), and reading one as a verb set
 * would be the reader deciding what the target's own field name means.
 */
function choicesIn(text: string): VerbBlob {
  const trimmed = text.trim();
  if (trimmed === "" || !parsesWhole(trimmed)) return null;
  let found: string[] | null = null;
  const visit = (node: unknown): void => {
    if (found) return;
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    if (node === null || typeof node !== "object") return;
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if (
        normaliseKey(key) === "choices" &&
        Array.isArray(value) &&
        value.every((v) => typeof v === "string")
      ) {
        found = value as string[];
        return;
      }
      visit(value);
    }
  };
  visit(JSON.parse(trimmed) as unknown);
  if (found === null) return null;
  const members = membersOf(found);
  return members ? { ...members, shape: "envelope-choices" } : null;
}

/**
 * THE NARROWING STACK, CHEAPEST REFUSAL FIRST — a pipe-delimited bracket group on a usage line.
 *
 * The legacy shape, and the one the whole comparison exists for: a tool that answers an unknown
 * verb with `usage: cli.ts <open|state|tail>` and nothing else is exactly where the drift this was
 * reported for lives, and a reader that only understood the JSON envelope would have reported an
 * EMPTY advertised set on precisely those tools — which, by the asymmetry below, would have turned
 * every recorded path into a false `recorded but never advertised`.
 *
 * 1. ONLY A LINE MATCHING `^usage[:\s]`. The cheapest refusal, and the one that keeps this out of
 *    arbitrary error prose.
 * 2. ONLY THE FIRST BRACKET GROUP AFTER THE PROGRAM TOKEN, so `usage: cli <open|state> <file>`
 *    never contributes `file`. The later groups are the ARGUMENTS of the verb, not more verbs.
 * 3. AT LEAST ONE PIPE. This is the clause that kills `<file>`, `<command>` and `<path>` — the
 *    singleton metavariable, which is the overwhelmingly common shape of a first bracket group and
 *    which would otherwise be published as a one-verb tool advertising a verb called `file`.
 *    ⚠ IT IS NOT THE CHEAP ONE TO LOOSEN. It looks like a formatting quirk and it is the entire
 *    discriminator between "this group enumerates alternatives" and "this group names one slot";
 *    dropping it does not widen the reader, it converts every usage line on earth into a verb set.
 * 4. EVERY MEMBER TOKEN-SHAPED, and `…` an open-set marker rather than a member — `membersOf`.
 */
function usageLineIn(text: string): VerbBlob {
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    // 1. the usage anchor.
    const anchor = /^usage[:\s]/i.exec(trimmed);
    if (!anchor) continue;
    const rest = trimmed.slice(anchor[0].length).trim();
    // 2. the FIRST bracket group after the program token. The program token is whatever follows
    // the anchor up to the first space, and it is skipped whether or not it is itself bracketed —
    // `usage: <cli> <open|state>` names its own program in a group, and reading that group would
    // publish the program's name as its only verb.
    const afterProgram = rest.slice(rest.search(/\s/) + 1);
    if (rest.search(/\s/) === -1) continue;
    const group = /<([^<>]*)>/.exec(afterProgram);
    if (!group) continue;
    const inner = group[1] ?? "";
    // 3. at least one pipe. See the ⚠ above before touching this.
    if (!inner.includes("|")) continue;
    const members = membersOf(inner.split("|"));
    if (members) return { ...members, shape: "usage-line" };
  }
  return null;
}

/**
 * Read one stream for an advertised verb set. The JSON envelope is tried first, for the reason
 * `readStream` tries it first: a field is a structure the target chose and a usage line is a shape
 * we are recognising.
 */
export function advertisedVerbsIn(text: string): VerbBlob {
  return choicesIn(text) ?? usageLineIn(text);
}

/**
 * WHICH ROOT CAPTURE THIS OBSERVATION IS, or `null` for one that is neither.
 *
 * PROVENANCE IS THE DISCRIMINATION, not shape. There are exactly two places a tool enumerates what
 * it would have accepted at the root — the bare invocation, and its rejection of an unknown verb —
 * and reading a bracket group from anywhere else means reading a `--help` body for an advertised
 * set, which is the hand-maintained artifact this whole capture exists to get away from.
 *
 * An unknown-FLAG rejection is deliberately not one of the two either, even though it is where the
 * flag reader lives: the set a parser names when refusing a FLAG is a set of flags, and taking a
 * `choices` array out of it as verbs would be reading one field as two different claims.
 *
 * THE EXCLUSIONS ARE `isReadableRejection`'S, applied to whichever capture is read: timed out,
 * crashed, failed to spawn, TRUNCATED. Truncation matters more here than anywhere: a usage line cut
 * mid-blob yields a verb set short by an unknowable number and looks complete, and short-by-unknown
 * is the input that manufactures `recorded but never advertised` findings out of our own read.
 */
function rootCapture(o: Observation): AdvertisedFrom | null {
  if (o.timedOut || o.crashed || o.spawnFailed || o.truncated) return null;
  const { args, inertness } = o.invocation;
  if (inertness === "bare" && args.length === 0) return "bare-invocation";
  // One token, not flag-shaped: an unknown verb offered at the root. `sentinel` is the inertness
  // class the kit gives a probe built from a token no real tool implements.
  if (inertness === "sentinel" && args.length === 1 && !(args[0] as string).startsWith("-"))
    return "unknown-verb-rejection";
  return null;
}

/**
 * DERIVE THE ADVERTISED VERB SET ONCE, from the observations the run already holds.
 *
 * One pass, in one file, and the census reads what it produces. The alternative — deriving it here
 * and again wherever it is rendered or compared — is the `surfaceFrom` defect this project has
 * already shipped once: one construction with two homes, six green unit tests, and unchanged
 * end-to-end output. If a stream is being parsed for verbs anywhere outside this function, that is
 * the bug arriving.
 */
export function advertisedVerbsFrom(observations: readonly Observation[]): AdvertisedVerbs {
  const sets: AdvertisedVerbSet[] = [];
  const seen = new Set<string>();
  let capturesRead = 0;
  // The rejection first, so `sets` reads in precedence order: the `choices` array is the parser
  // speaking, and a hand-maintained usage string is where the drift is.
  const ordered: AdvertisedFrom[] = ["unknown-verb-rejection", "bare-invocation"];
  for (const want of ordered) {
    for (const o of observations) {
      if (rootCapture(o) !== want) continue;
      capturesRead += 1;
      // stderr first: a rejection belongs there (B1), exactly as the flag reader does it.
      for (const stream of ["stderr", "stdout"] as const) {
        const blob = advertisedVerbsIn(stream === "stderr" ? o.stderr : o.stdout);
        if (!blob) continue;
        // Deduped on what was READ rather than on the observation: three checkers can record the
        // same bare invocation, and one advertisement repeated is one advertisement.
        const key = JSON.stringify([want, blob.shape, blob.verbs, blob.open]);
        if (!seen.has(key)) {
          seen.add(key);
          sets.push({
            verbs: blob.verbs,
            shape: blob.shape,
            open: blob.open,
            confirmationRequired: blob.verbs.length <= 2,
            from: want,
            observationId: o.id,
            args: [...o.invocation.args],
            stream,
          });
        }
        break;
      }
    }
  }
  return { capturesRead, sets };
}

/**
 * THE COMPARISON, AND WHAT IT SAYS WHEN IT DID NOT HAPPEN.
 *
 * `recordedRootVerbs` is `null` when the run was given no batch, and a (possibly empty) list of the
 * FIRST token of every recorded path when it was. The distinction is the whole reason it is
 * nullable: with no batch there is nothing to compare against, which is a fact about the RUN, and
 * an empty batch-derived list is a fact about the batch.
 */
export interface AdvertisedVerbsComparison {
  /**
   * `not-asserted` — no root capture produced a set this reader will stand behind, so the
   * comparison DID NOT RUN. Measured on a real fleet, half of whose tools answer an unknown verb
   * with a help screen and no `usage:`-anchored bracket group anywhere: this is the MAIN render,
   * not a safety net, and its wording is a primary surface.
   * `no-batch` — a set was asserted and there is nothing recorded to compare it against.
   * `compared` — both sides were present and the difference is stated in both directions.
   */
  status: "not-asserted" | "no-batch" | "compared";
  /** How many root captures were readable at all — the denominator behind `not-asserted`. */
  capturesRead: number;
  /** Sets that were read and NOT asserted. Present so a hedge renders as a hedge, never as silence. */
  hedged: AdvertisedVerbSet[];
  /**
   * ANY ASSERTED SET MARKED ITSELF INCOMPLETE with an ellipsis.
   *
   * Carried on the comparison rather than left to be read off `quoted`, because the defect
   * direction is computed over the UNION: a bare capture whose list is open contributes its
   * openness to the union whether or not it is the set being quoted, and a `recorded but never
   * advertised` line that ignored it would flatly accuse a tool whose own advertisement said the
   * list was partial.
   */
  open: boolean;
  /**
   * WHOSE STATEMENT IS BEING REPEATED — the rejection's when both were asserted, otherwise the one
   * that was. That falls out of "asserted" and needs no clause of its own: a hedged or unreadable
   * rejection beside an asserted bare capture leaves the bare capture as the only thing to quote.
   */
  quoted?: AdvertisedVerbSet;
  /**
   * THE UNION OF THE ASSERTED SETS, sorted, and the set both directions are computed over.
   *
   * NOT the precedence winner alone, and the difference is a false finding: with a bare capture
   * naming four verbs and a rejection naming three, testing recorded paths against the rejection's
   * three turns the fourth into a `recorded but never advertised` accusation manufactured by our
   * own choice of source. Precedence answers whose words to QUOTE; the union is what to COMPARE.
   */
  union?: string[];
  /** THE DEFECT DIRECTION — a path the caller records that no asserted set advertises. */
  recordedNotAdvertised?: string[];
  /**
   * COVERAGE, NOT A DEFECT — advertised verbs this batch holds no record for.
   *
   * For a deliberately partial batch this is the EXPECTED state, so it is rendered "not covered by
   * this batch" and never "missing". It is kept because it is the only line that can flag a usage
   * string still naming a verb that no longer exists: nobody records a path they do not believe in.
   */
  notCoveredByBatch?: string[];
  /**
   * WHERE TWO ASSERTED SETS DISAGREE — the spellings one names and the other does not.
   *
   * Where both surfaces come from one string constant behind one fallthrough they agree trivially.
   * The case this catches is a PARTIAL RETROFIT: a tool grows a `choices` array on its rejection
   * while its hand-maintained usage string goes stale, so the two advertisements come from
   * different sources for the first time — which is exactly when they can diverge.
   */
  disagreement?: string[];
}

/** True when a majority of a blob's members match something the caller recorded. */
function confirmedBy(set: AdvertisedVerbSet, recorded: readonly string[]): boolean {
  const hits = set.verbs.filter((v) => recorded.includes(v)).length;
  return hits * 2 > set.verbs.length;
}

export function compareAdvertisedVerbs(
  surface: Surface,
  recordedRootVerbs: readonly string[] | null,
): AdvertisedVerbsComparison {
  const advertised = surface.advertisedVerbs ?? { capturesRead: 0, sets: [] };
  const capturesRead = advertised.capturesRead;
  // ONE ADJECTIVE, THREE CONSUMERS. "Readable" was the word this design used in three places and
  // meant "asserted" in all of them — and a hedged blob is readable, so the looser word would let
  // a hedge suppress a real finding. Everything below reads `asserted`.
  const asserted = advertised.sets.filter(
    (s) =>
      !s.confirmationRequired || (recordedRootVerbs !== null && confirmedBy(s, recordedRootVerbs)),
  );
  const hedged = advertised.sets.filter((s) => !asserted.includes(s));
  if (asserted.length === 0) return { status: "not-asserted", capturesRead, hedged, open: false };

  const quoted =
    asserted.find((s) => s.from === "unknown-verb-rejection") ?? (asserted[0] as AdvertisedVerbSet);
  const union = [...new Set(asserted.flatMap((s) => s.verbs))].sort();
  const open = asserted.some((s) => s.open);
  const disagreement =
    asserted.length > 1 ? union.filter((v) => !asserted.every((s) => s.verbs.includes(v))) : [];

  if (recordedRootVerbs === null)
    return {
      status: "no-batch",
      capturesRead,
      hedged,
      open,
      quoted,
      union,
      ...(disagreement.length > 0 ? { disagreement } : {}),
    };

  const recorded = [...new Set(recordedRootVerbs)].sort();
  return {
    status: "compared",
    capturesRead,
    hedged,
    open,
    quoted,
    union,
    recordedNotAdvertised: recorded.filter((v) => !union.includes(v)),
    notCoveredByBatch: union.filter((v) => !recorded.includes(v)),
    ...(disagreement.length > 0 ? { disagreement } : {}),
  };
}

/** The verb list as a line prints it — capped, and never silently. See `VERB_LINE_CAP`. */
function verbLine(verbs: readonly string[]): string {
  return verbs.length <= VERB_LINE_CAP
    ? verbs.join(" ")
    : `${verbs.slice(0, VERB_LINE_CAP).join(" ")} … (${verbs.length} in all; the full list is in the JSON)`;
}

const SHAPE_WORD: Record<AdvertisedShape, string> = {
  "envelope-choices": "envelope-choices shape",
  "usage-line": "usage-line shape",
};

const FROM_WORD: Record<AdvertisedFrom, string> = {
  "bare-invocation": "the bare invocation",
  "unknown-verb-rejection": "the unknown-verb rejection",
};

/**
 * WHAT THE CENSUS PRINTS — evidence, in words that cannot be read as a verdict.
 *
 * Nothing here mints a rule id, moves a count or touches an exit code, and that is not caution: the
 * recorded side is CALLER-ATTESTED, and nothing gate-failing may rest on bytes the kit did not
 * observe itself. An adopter who wants a gate greps the JSON field in CI, which is them opting into
 * a gate rather than the kit shipping one.
 */
export function advertisedVerbsSummary(c: AdvertisedVerbsComparison): string[] {
  if (c.status === "not-asserted") {
    // THE HONESTY CASE, and it is the main render rather than the fallback: on a fleet measured for
    // this, half the tools answer an unknown verb with a help screen carrying no `usage:`-anchored
    // bracket group at all, so this is the first thing they see. It matches the sentence
    // `declaration.ts` already renders for a target that did not enumerate — nothing was compared,
    // and that is not agreement — rather than inventing a second way of saying it.
    return [
      "THE COMPARISON DID NOT RUN — no advertised verb set could be asserted at the root, so the" +
        " recorded paths were compared against nothing.",
      c.capturesRead === 0
        ? "  no root capture was readable, so nothing was read (not a statement about the tool)"
        : `  ${c.capturesRead} root capture${c.capturesRead === 1 ? "" : "s"} read, none asserted a verb set (NOT a tool that advertises no verbs)`,
      ...c.hedged.map(
        (s) =>
          `  seen and not asserted: <${s.verbs.join("|")}> from ${FROM_WORD[s.from]} — two members or fewer, which no shape rule separates from a type union, and nothing recorded confirms it`,
      ),
      "  This is not agreement: nothing was compared, and nothing here is a finding about the tool.",
    ];
  }
  const q = c.quoted as AdvertisedVerbSet;
  const union = c.union ?? [];
  const open = c.open;
  const head = `advertised set captured (${union.length} verb${union.length === 1 ? "" : "s"}, ${SHAPE_WORD[q.shape]}, quoted from ${FROM_WORD[q.from]}${open ? ", and the line marks its list open with …" : ""}): ${verbLine(union)}`;
  if (c.status === "no-batch") {
    // NAMED RATHER THAN OMITTED. Leaving the field out when there is no batch would make a missing
    // thing render as an absent thing, which is the defect class this project is named after.
    return [
      `${head}; no recorded surfaces in this run, so no comparison was made.`,
      ...(c.disagreement?.length
        ? [`  the two root captures disagree on: ${c.disagreement.join(" ")}`]
        : []),
    ];
  }
  const missing = c.recordedNotAdvertised ?? [];
  const uncovered = c.notCoveredByBatch ?? [];
  return [
    head,
    missing.length === 0
      ? "  every recorded path is among the advertised verbs"
      : open
        ? `  recorded but never advertised: ${missing.join(" ")} — not among the ${union.length} verbs the advertised list names, and that list marks itself open with … , so the verb may live in the elided tail`
        : `  recorded but never advertised: ${missing.join(" ")}`,
    // NEVER "MISSING", and never anything that reads as an accusation: for a deliberately partial
    // batch this is the expected state and the caller has done nothing wrong.
    uncovered.length === 0
      ? "  every advertised verb has a recorded surface in this batch"
      : `  not covered by this batch: ${verbLine(uncovered)}`,
    ...(c.disagreement?.length
      ? [
          `  the two root captures disagree on: ${c.disagreement.join(" ")} — one advertisement has gone stale beside the other`,
        ]
      : []),
  ];
}
