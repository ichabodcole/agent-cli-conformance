import type { Observation } from "./types.ts";

/**
 * WHAT THE TARGET SAID ABOUT ITSELF — quoted, never parsed, and never a verdict.
 *
 * The report already names US. `Report.kitVersion` is the version of the instrument,
 * `Report.target` is the path we were pointed at and `Report.targetArgv0` is how we launched it.
 * Nothing in it was the target's own account of what it is, so two reports produced by one kit
 * against two different builds of one tool were distinguishable only by a path.
 *
 * ## The measurement that forced it
 *
 * `docs/reports/2026-08-24-first-drift-trial-anthill-manifest.md` § `DT-10`. Two builds of anthill,
 * both self-reporting `version: "2.3.0"`, answer an unknown root flag differently — one enumerates
 * its accepted set, the other says `No command specified.` and names nothing. This project's
 * headline `1 of 25` figure rests on the enumerating one, so the figure is a fact about a build and
 * not about the release the build names, and nothing in a stored report said which binary produced
 * it.
 *
 * `targetArgv0` could not have said it: that is OUR bookkeeping, the argv the kit assembled,
 * and in the anthill case the two argv0s were exactly what a reader had to guess from. This field
 * is the other half — the tool's own bytes, in the tool's own words. Both belong, and they are
 * different kinds of fact: one is how we launched it, the other is what it said about itself. The
 * anthill case is precisely where they diverge, and it is the same caller-parsed-versus-tool's-
 * own-bytes distinction that decided the recorded-surface format (see `recorded.ts`).
 *
 * ## What a present identity establishes, and it is one sentence
 *
 * **A binary that answers this way existed at capture time.** Nothing more. Not which build, not
 * which release, and not — when two reports quote different bytes — that they came from different
 * builds. That scope is the outside adopter's, arrived at from two independent failures, and it is
 * narrower than anything written here before it.
 *
 * ## It is not a verification that the target reported a version
 *
 * `D1`'s detector for "reported a version" is `plain.exitCode === 0 && plain.stdout.trim() !== ""`
 * — a non-empty stream standing in for a typed payload — and `D1` carries the standing coverage
 * gap "stdout is never checked to carry a version string in either mode". So a `stated` identity
 * establishes that the target said SOMETHING under `--version`. The bytes are quoted; they are
 * never labelled a version, and no line rendered from this may read as though one was parsed.
 *
 * ## The absence is a real case, and it is not `D1`'s verdict
 *
 * A tool with no `--version`, one that exits non-zero, or one that writes nothing to stdout has an
 * honest absence — `not-stated` — rather than a missing field. That is deliberately NOT the same
 * predicate `D1` fails on: `D1` fails "reported no version at all" only when the exit is non-zero
 * AND stdout is empty, so a tool exiting `0` with a help screen passes that clause and lands here
 * as `stated` with a help screen quoted. Reading a `not-stated` identity as a `D1` failure, or a
 * `stated` one as a `D1` pass, is a conflation of a quotation with a verdict.
 *
 * ## The census reaches no verdict, and this changes none
 *
 * Nothing here feeds `conformant` or `fullyVerified`, nothing here moves an exit code, and nothing
 * here mints a rule id — exactly as `surface.ts` and `recorded.ts` do not. It costs no additional
 * execution of a stranger's binary either: `D1` already runs `["--version"]` on every target, and
 * this is a pure read over the observation that probe left behind.
 */

/**
 * Whether the target said anything about itself, and — this is the whole point of the type — the
 * DIFFERENCE between "it said nothing" and "nothing readable was recorded".
 *
 * The same three-way split `SurfaceStatus` makes, for the same reason: a middle value that
 * collapsed into the absent one would report a run that never happened as a tool that stayed
 * silent.
 */
export type IdentityStatus =
  /** The probe ran to completion and the target wrote to stdout. `said` is present. */
  | "stated"
  /**
   * The probe ran to completion and the target wrote nothing to stdout. A STATEMENT ABOUT THE
   * TOOL under this argv, whatever its exit code — and not a `D1` verdict, which reads the exit
   * code alongside the stream and belongs to the checker.
   */
  | "not-stated"
  /**
   * Nothing readable was recorded — the probe was never recorded, or it hung, crashed, failed to
   * spawn, or was cut at the output ceiling with nothing on stdout. A statement about the RUN.
   */
  | "no-evidence";

export interface TargetIdentity {
  status: IdentityStatus;
  /**
   * The argv the quote is attributed to, always — including on `no-evidence`, where it names what
   * was looked for. Held rather than assumed by the reader, on the same terms `identityLines` in
   * `recorded.ts` substitutes the record's own argv: a line that names the wrong argv misreports
   * the one thing it exists to attribute.
   */
  argv: string[];
  /**
   * The target's own bytes on stdout, trimmed — PRESENT ONLY when `status` is `stated`.
   *
   * Absent rather than empty on the other two, so a consumer reading `.said` on a silent target
   * gets `undefined` and has to look at `status`, instead of an empty string it can mistake for an
   * answer. Whole rather than clipped to some length: what bounds it is the runner's own stream
   * ceiling (MAX_STREAM_BYTES), and `truncated` below is what says that bound was reached. A
   * second, smaller cap here would be a number with no reason behind it, and would silently
   * shorten a quote nothing declared short.
   *
   * STDERR IS NEVER SUBSTITUTED. A target that answers `--version` on stderr is `not-stated` here,
   * because substituting would be this capture inventing an answer out of the other stream — the
   * same rule the caller-recorded identity holds itself to.
   */
  said?: string;
  /** The observation this was read from, resolvable in `Report.observations[]`. Present whenever
   *  an observation was read at all — so on `stated` and `not-stated`, never on `no-evidence`. */
  observationId?: string;
  /**
   * The status the target CHOSE under that argv, on the same terms as `Observation.exitCode`.
   * Published beside the quote because a tool answering at exit `2` said something about itself
   * too, and a reader must be able to see that without it being read as a verdict.
   */
  exitCode?: number | null;
  /**
   * True when the capture hit the output ceiling and the quote is a PREFIX.
   *
   * THE QUOTE SURVIVES TRUNCATION, and that is a deliberate departure from how `surface.ts`
   * treats a truncated capture. There, a cut list is short by an unknowable number of flags and
   * still LOOKS complete, so a truncated rejection is refused outright. A quotation is read for
   * bytes rather than for a set, so a cut makes it shorter rather than false — and the honest
   * repair is to print the cut beside the quote. That is the identical argument the
   * caller-recorded identity already makes for a `completeness: "truncated"` capture, and keeping
   * the two consistent is what stops a reader meeting both from working out whether they mean
   * different things.
   */
  truncated?: boolean;
  /**
   * True when the decode threw information away, so `said` is a RENDERING of the bytes and not the
   * bytes — see `Observation.stdoutLossy`. Printed beside the quote for the same reason
   * `truncated` is: the quote is still worth having, and a reader comparing two of them across
   * reports needs to know that equality of these strings is not equality of bytes.
   */
  lossy?: boolean;
}

/**
 * True for the recorded observation this quote is read from: the PLAIN `--version` probe.
 *
 * Matched on the argv rather than on `D1`'s purpose string, because the argv is what the rendered
 * line attributes the bytes to — a match keyed on a purpose would let a checker's private label
 * decide what a quotation claims. `D1` is what puts the observation in the history (it declares
 * `["--version"]` on every target), and if it ever stops doing so this reports `no-evidence`,
 * which is the true answer rather than a broken one.
 *
 * THE HOSTILE-ENV TWIN IS EXCLUDED. `D1` records `["--version"]` a second time with `HOME` and
 * `XDG_CONFIG_HOME` pointed at a path that does not exist, and that run exists to answer a
 * question about configuration. Quoting it as the tool's account of itself would attribute bytes
 * produced under a deliberately broken environment to the tool's ordinary answer.
 */
function isIdentityProbe(o: Observation): boolean {
  const { args, env, repeat } = o.invocation;
  return args.length === 1 && args[0] === "--version" && env === undefined && repeat === undefined;
}

/**
 * Read the target's account of itself from probes already recorded.
 *
 * PURE over observations — nothing here spawns, exactly as `captureSurface` does not.
 */
export function captureIdentity(observations: readonly Observation[]): TargetIdentity {
  const argv = ["--version"];
  const o = observations.find(isIdentityProbe);
  // A run the target never chose the end of has no account of itself in it, whoever ended it.
  if (!o || o.timedOut || o.crashed || o.spawnFailed) return { status: "no-evidence", argv };
  const said = o.stdout.trim();
  const cut = o.truncated;
  // AN ABSENCE CANNOT BE ESTABLISHED FROM A PREFIX. A capture cut at the ceiling with nothing yet
  // on stdout says the kit stopped looking, not that the tool stayed silent, so it may not become
  // `not-stated` — the same line `Observation.truncated` draws.
  if (said === "") {
    return cut
      ? { status: "no-evidence", argv }
      : { status: "not-stated", argv, observationId: o.id, exitCode: o.exitCode };
  }
  return {
    status: "stated",
    argv,
    said,
    observationId: o.id,
    exitCode: o.exitCode,
    ...(cut ? { truncated: true } : {}),
    ...(o.stdoutLossy ? { lossy: true } : {}),
  };
}

/**
 * THE IDENTITY LINES — the tool's own bytes, quoted, and no verdict.
 *
 * Deliberately the same shape, register and wording as `identityLines` in `recorded.ts`: a head
 * naming the argv and quoting what came back, a required parenthetical saying what the quote is
 * not, and one further line per qualification on the quote. A reader meeting both should not have
 * to work out whether they mean different things — the only thing that differs is WHO OBSERVED IT,
 * and that is the one distinction the two are there to draw.
 *
 * THE QUOTE IS CLIPPED HERE AND NOWHERE ELSE, and this is the one place the two renderings part
 * company. The caller sized their own capture before handing it in; the kit's is whatever the
 * target chose to write under a probe the kit sent, and a `--version` that answers with a help
 * screen would displace the report it is a footnote in. THE CLIP IS ON THE RENDERING ONLY: the
 * JSON keeps every byte of `said`, the line says what it did not show — lines and bytes both —
 * and nothing about which part was kept is a judgement about what the bytes MEAN.
 *
 * It is clipped on TWO axes because one axis does not bound it. The first line alone is bounded
 * only by the runner's stream ceiling (`MAX_STREAM_BYTES`, 4 MiB), and a machine-mode-default CLI
 * answering `--version` with a single line of JSON is the ordinary shape rather than the exotic
 * one — anthill's real answer is 152 bytes on one line. Measured before the byte cap existed, a
 * one-line 200 KB answer rendered as 94% of the whole text report: the exact displacement the
 * line clip is here to prevent, arriving on the axis it does not watch.
 */

/**
 * How much of the first line the RENDERED head may carry.
 *
 * The condition, not the number: the head has to stay small enough that a reader meeting it as a
 * footnote in a report reads the report rather than the quote, and long enough that a real
 * `--version` answer arrives whole. The largest honest one measured here is anthill's enveloped
 * `{"ok":true,"data":{"version":"2.3.0","source":"…/cli.ts"},"meta":…}` at 152 bytes; `D1`'s own
 * rendering of an unusable payload clips at 40, which is too short to show an envelope at all.
 * If a class of tool turns up whose ordinary answer is longer than this, raise it and say which
 * tool — a quote cut mid-envelope is worse than a slightly long line. Nothing reads this but the
 * renderer, so moving it cannot change a verdict, a count or a stored byte.
 */
const MAX_QUOTED_HEAD_BYTES = 240;

/**
 * A prefix of `s` no longer than `max` bytes of UTF-8, cut on a code-point boundary.
 *
 * `for...of` iterates code points, so a cut never lands inside a surrogate pair and turns a
 * character the target wrote into a replacement character the renderer invented — the same
 * distinction `Observation.stdoutLossy` exists to keep.
 */
function clipToBytes(s: string, max: number): string {
  if (Buffer.byteLength(s, "utf8") <= max) return s;
  let out = "";
  let bytes = 0;
  for (const ch of s) {
    const n = Buffer.byteLength(ch, "utf8");
    if (bytes + n > max) break;
    out += ch;
    bytes += n;
  }
  return out;
}
export function identitySummaryLines(identity: TargetIdentity): string[] {
  const argv = JSON.stringify(identity.argv);
  if (identity.status === "no-evidence")
    return [
      `identity: no readable ${argv} probe was recorded, so nothing was read (not a statement about the tool)`,
    ];
  const exit = identity.exitCode === null ? "no exit code" : `exit ${identity.exitCode}`;
  if (identity.status === "not-stated")
    return [
      `identity: the kit ran ${argv} and the target wrote nothing to stdout (${exit}; stderr is not substituted)`,
      "          (an absence, not a verdict — D1 is what judges whether --version satisfies the rule)",
    ];
  const whole = identity.said ?? "";
  const lines = whole.split("\n");
  const first = lines[0] as string;
  const head = clipToBytes(first, MAX_QUOTED_HEAD_BYTES);
  const cutBytes = Buffer.byteLength(first, "utf8") - Buffer.byteLength(head, "utf8");
  const rest = lines.length - 1;
  // Both omissions in one parenthetical, and each says WHICH axis it was cut on, because "+2 more
  // lines" and "+900 more bytes on this line" are different facts about the same quote.
  const omitted = [
    ...(rest > 0 ? [`+${rest} more line${rest === 1 ? "" : "s"}`] : []),
    ...(cutBytes > 0 ? [`+${cutBytes} more bytes on this line`] : []),
  ];
  const out = [
    `identity: the kit ran ${argv} and the target answered with ${JSON.stringify(head)}${
      omitted.length ? ` (${omitted.join(", ")}, in the JSON)` : ""
    } (${exit})`,
    "          (the tool's own bytes, probed by the kit — not verified to be a version)",
  ];
  if (identity.truncated)
    out.push("          the kit cut this capture at its output ceiling, so the quote may be short");
  if (identity.lossy)
    out.push(
      "          the capture did not decode losslessly, so the quote renders the bytes rather than reproducing them",
    );
  return out;
}
