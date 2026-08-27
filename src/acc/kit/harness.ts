/**
 * THE CAPTURE HARNESS — a runnable script, not a list of argv.
 *
 * `acc probe-plan` emits what this builds. The kit does not run it: probing below the root is an
 * invocation of somebody's subcommand, and the whole reason the recorded-surface format exists is
 * that the caller runs their own tool and hands over what came back.
 *
 * The design and every argument for it are in
 * `docs/plans/2026-08-26-the-probe-plan-generator.md`. The parts that are not obvious:
 *
 * ## `completeness` is DERIVED, never asked for
 *
 * The emitted script redirects to files rather than piping, so both streams are read to EOF by the
 * kernel and nothing downstream can cut them. It writes `complete` only where it can demonstrate
 * that — the process exited normally — and `unknown` otherwise, which is the format's own honest
 * answer for "cannot establish no bytes were lost".
 *
 * It does NOT make the caller attest it. The adopter who built one of these by hand attested
 * `complete` seventeen times and thought about it once: "the seventeenth was a copy of the first."
 * A field a tool asks you to confirm seventeen times is a field nobody reads, and scripting the
 * confirmation manufactures exactly the false `complete` the attestation exists to prevent.
 *
 * ## `streams` is derived too, and the guide is behind on this
 * A generated harness writes its own redirections, so it knows whether it separated them. The
 * guide's "the only two fields on which you are the authority" was written for hand-capture and
 * is true of `completeness` alone once this ships.
 *
 * ## The launcher never appears in `argv`
 * `argv` is what the TOOL received. `bun /abs/cli.ts` is how it was started, and baking it into a
 * variable that is prepended at invocation and excluded from every record is the only way both
 * facts stay true. This reuses `toTarget`'s `argv0` rather than re-deriving it, so the harness and
 * `acc check` cannot disagree about how the same target is launched.
 *
 * ## Four defects found by an adopter, all one class
 *
 * The draft of this script behaved differently depending on where it was standing, and nothing in
 * its output recorded where that was: a relative launcher, a CWD-relative pathspec, a CWD-scoped
 * dirt check beside a repo-wide identifier, and a logical-versus-physical path comparison. Each is
 * commented at its site below. The class is why a regression test for this output must run from a
 * subdirectory AND through a symlinked path — a suite with one topology passes while inert.
 */

/** Where the command paths in a plan came from. Carried in prose, not as a parsed field. */
export type PathSource = "declaration" | "caller-supplied";

export interface HarnessInput {
  /** How to launch the target, e.g. `["bun", "/abs/path/cli.ts"]`. Never part of a record. */
  launcher: string[];
  /** Command paths BELOW THE ROOT. `[]` is refused — see `validatePaths`. */
  paths: string[][];
  /** A flag no tool would plausibly accept. */
  sentinel: string;
  /** Argv for the identity capture, or `null` to emit none. */
  identityArgv: string[] | null;
  /** Named in `recordedBy` so a reader of the census knows the plan's reach. */
  pathSource: PathSource;
  /** The batch file the emitted script writes. */
  out: string;
  /**
   * FILES THIS WORKFLOW ASKED THE ADOPTER TO CREATE INSIDE THEIR REPOSITORY.
   *
   * The path list or declaration `probe-plan` was pointed at. They are untracked files in the tree
   * being measured, exactly as the harness and the batch are, so leaving them out of the dirt
   * exclusion makes `-dirty` fire on every run of the documented workflow from a clean checkout —
   * the same inversion the exclusion exists to prevent, arriving through an artifact that was
   * created after it. Documenting "keep your paths file outside the repo" is the wrong repair: it
   * makes the correct workflow the unusual one and leaves the failure silent for anyone who does
   * the obvious thing. The generator knows every one of these at generation time, so it emits
   * them rather than hard-coding two.
   */
  sourceFiles?: string[];
}

/** A plan that cannot produce a readable batch. Its own type, as `DeclarationError` is. */
export class HarnessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HarnessError";
  }
}

/**
 * Single-quote a value for POSIX sh.
 *
 * Everything interpolated into the emitted script goes through here — paths, tokens, the
 * sentinel. Inside `'…'` the shell expands nothing, so a token containing `$`, backticks or a
 * newline is inert; the only character needing care is the quote itself, which closes the string
 * and is re-opened after an escaped one.
 */
export function shQuote(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

/**
 * A CONFIG assignment whose value is pre-quoted shell words, written to be EDITED.
 *
 * `IDENTITY_ARGV` holds already-single-quoted tokens that a later `eval` re-splits. Passing that
 * through `shQuote` a second time does not merely look bad — it nests the quoting one level deeper
 * than the single `eval` unwinds, and the capture silently runs with NO argv at all. Double quotes
 * carry the pre-quoted text verbatim whenever it holds nothing the shell would expand inside them,
 * which is the readable form an adopter can edit; anything else is refused rather than mangled,
 * because this value sits in the CONFIG block precisely so it can be changed by hand.
 */
export function shConfigValue(preQuoted: string): string {
  if (/[$"\\]/.test(preQuoted) || preQuoted.includes("`"))
    throw new HarnessError(
      `cannot place ${JSON.stringify(preQuoted)} in the harness CONFIG block: it contains a character the shell would expand inside double quotes, and re-quoting it would nest one level deeper than the capture unwinds`,
    );
  return `"${preQuoted}"`;
}

/**
 * Refuse a path list that cannot produce a readable record, naming which rule it missed.
 *
 * These are the guide's three argv rules, enforced at generation rather than left to the caller —
 * `path + [sentinel]` satisfies all three by construction, so the only way to miss one is a path
 * that was never a command path. Refusing here means the caller learns before they run anything,
 * rather than from a census line saying their record was not read.
 */
export function validatePaths(paths: string[][]): void {
  if (paths.length === 0)
    throw new HarnessError(
      "no command paths to probe. A plan with no paths would emit a harness that captures nothing",
    );
  for (const path of paths) {
    // THE ROOT IS THE KIT'S. `captureSurface` yields a `path: []` surface on every run before any
    // batch is opened, so a recorded root capture would give one census line two observers — and
    // the reader refuses the whole batch for it. Caught here, where the fix is obvious.
    if (path.length === 0)
      throw new HarnessError(
        "a command path is empty. The kit probes the root itself on every run, so a record at the root would give one census line two observers, and the reader refuses the whole batch for it — list only paths below the root",
      );
    for (const token of path) {
      if (token === "")
        throw new HarnessError(`a command path contains an empty token: ${JSON.stringify(path)}`);
      // Rule 1: no `--` anywhere in the argv. After a terminator everything is data, so what came
      // back is about a positional rather than a flag.
      if (token === "--")
        throw new HarnessError(
          `the command path ${JSON.stringify(path)} contains a bare --, and after a terminator every token is data, so the rejection it provokes would be about a positional rather than about this path's flags`,
        );
      // Rule 3, applied to the path rather than the sentinel: a flag-shaped token in the PATH
      // means this is not a command path, and the set a tool names when refusing it belongs
      // somewhere else.
      // PATHS IS LINE-DELIMITED, so a token carrying a newline splits into two lines the runner
      // reads as two paths — and the second is an unterminated quote, which fails the `eval` mid
      // record and leaves a batch that is not JSON. Refused here because the emitted script cannot
      // represent it, not because the token is implausible.
      if (/[\r\n]/.test(token))
        throw new HarnessError(
          `the command path ${JSON.stringify(path)} contains a line break, and the harness lists one path per line, so the token cannot survive the round trip`,
        );
      if (token.startsWith("-"))
        throw new HarnessError(
          `the command path ${JSON.stringify(path)} contains ${JSON.stringify(token)}, which is flag-shaped. A path is the tokens BEFORE the flags; a flag here would make the capture about a different question`,
        );
    }
  }
}

/** The sentinel must be one the target cannot plausibly own, or a real flag erases the read. */
export function validateSentinel(sentinel: string): void {
  if (!/^--[A-Za-z0-9][\w-]*$|^-[A-Za-z]$/.test(sentinel))
    throw new HarnessError(
      `the sentinel ${JSON.stringify(sentinel)} is not flag-shaped, so what comes back would be about a verb or a positional rather than about a path's flags`,
    );
}

/**
 * Build the harness.
 *
 * PURE: no filesystem, no spawning, no clock. Everything time-dependent is emitted as an
 * unexpanded shell expression, which is the rule `recordedAt` forced — a generator that pre-fills
 * a capture timestamp writes the time the PLAN was made into a field meaning the time the capture
 * happened, and nothing in the batch can detect it afterwards. Anything this function could
 * compute is by definition the wrong value for that field.
 */
export function buildHarness(input: HarnessInput): string {
  validatePaths(input.paths);
  validateSentinel(input.sentinel);
  if (input.launcher.length === 0)
    throw new HarnessError("the launcher is empty; there would be nothing to invoke");

  const launcher = input.launcher.map(shQuote).join(" ");
  const pathLines = input.paths.map((p) => p.map(shQuote).join(" ")).join("\n");
  const identityLine = input.identityArgv?.length ? input.identityArgv.map(shQuote).join(" ") : "";
  // Emitted into the exclusion loop's word list, pre-quoted, so a path with a space survives.
  const sourceList = (input.sourceFiles ?? []).map((f) => ` ${shQuote(f)}`).join("");
  const sourceNote =
    input.pathSource === "declaration"
      ? "paths derived from the declaration"
      : "paths supplied by the caller";

  return `#!/bin/sh
# Capture harness generated by \`acc probe-plan\`. Runs the target once per command path and
# writes a recorded-surface batch to ${input.out}.
#
# DO NOT EDIT THE CAPTURE. \`completeness\` is DERIVED from how this script captures — it redirects
# to files rather than piping, so nothing can cut a stream. Edit the capture and the derivation
# becomes a lie that nothing downstream can detect.
#
# Hand the result to:  acc check <target> --recorded-surfaces ${input.out}

set -u
LC_ALL=C; export LC_ALL

# AN INHERITED GIT ENVIRONMENT WOULD MAKE THE BUILD STRING NAME THE WRONG REPOSITORY. Git exports
# these to the environment of a hook, so a harness run from one — or from anything a hook invoked —
# would compute its provenance from the repository being committed to rather than from the tree
# holding the target. The build string would be a true fact about a repository nobody was measuring.
unset GIT_DIR GIT_WORK_TREE GIT_INDEX_FILE GIT_OBJECT_DIRECTORY GIT_COMMON_DIR 2>/dev/null || :

# How the tool is STARTED. Never part of any recorded argv — \`argv\` is what the tool received.
#
# A FUNCTION rather than a variable, and that is not style. \`LAUNCHER='bun' '/abs/cli.ts'\` parses
# as an environment assignment followed by a COMMAND, so the shell executes the target at line one
# instead of defining anything. The obvious repair — an unquoted string split at the point of use —
# then breaks on any launcher path containing a space. A function holds a pre-quoted argv and
# forwards "$@" without re-splitting either.
run_target() { ${launcher} "$@"; }
SENTINEL=${shQuote(input.sentinel)}
# What the target is asked to say about itself. Empty skips the identity capture entirely. This is
# CONFIG and you may change it: a tool with no \`--version\` may name itself some other way, and the
# batch records what you asked for either way. It is not read as a verification of anything.
IDENTITY_ARGV=${shConfigValue(identityLine)}
OUT=${shQuote(input.out)}
RECORDED_BY=\${ACC_RECORDED_BY:-"$(id -un 2>/dev/null || echo unknown) via acc probe-plan harness"}

# One command path per line, tokens shell-quoted. The root is excluded by the format.
PATHS=$(cat <<'ACC_PATHS_EOF'
${pathLines}
ACC_PATHS_EOF
)

# The build being measured. \`identity\` is what the TOOL says it is and is release-granularity;
# this is which bytes were measured, and is working-tree granularity. Two builds of one declared
# version routinely disagree (DT-10), which is why both are emitted rather than either alone.
BUILD=$(git rev-parse --short HEAD 2>/dev/null || echo unknown)

# THE HARNESS MUST NOT SEE ITS OWN OUTPUT. This script and the batch it writes are untracked files
# inside the tree being measured, so an unfiltered \`git status\` reports "-dirty" on a spotlessly
# clean checkout, every run, forever — which inverts the flag: \`-dirty\` warns that uncommitted
# changes may be inside the measurement, and one that always fires carries no warning when a
# genuinely dirty tree needs it to.
_top=$(git rev-parse --show-toplevel 2>/dev/null || echo "")
# PHYSICAL paths on both sides of the prefix match. \`--show-toplevel\` is resolved, while \`pwd\`
# and an absolute $0 may both be LOGICAL — \`/tmp\` is a symlink to \`/private/tmp\` on macOS, and
# symlinked checkouts and automounts do the same. When the two disagree the match fails, the
# excludes vanish, and the harness reports its own artifacts as dirt. Resolving $0's DIRECTORY
# handles the absolute-but-logical case, which \`pwd -P\` alone would not.
_abs() {
  _d=$(dirname "$1"); _b=$(basename "$1")
  _dp=$(cd "$_d" 2>/dev/null && pwd -P) || _dp=""
  if [ -n "$_dp" ]; then printf '%s/%s' "$_dp" "$_b"; else printf '%s' "$1"; fi
}
_rel() {
  _a=$(_abs "$1")
  case "$_a" in "$_top"/*) printf '%s' "\${_a#"$_top"/}" ;; *) printf '' ;; esac
}
# \`,top\` anchors each pathspec at the REPO ROOT, the coordinate system \`_rel\` produces. Without
# it git reads the pathspec relative to CWD and the exclusion silently matches nothing from any
# subdirectory. There is deliberately NO \`.\` pathspec: the check must be repo-wide to agree with
# BUILD, which names the whole repo — and a CWD-scoped check makes an over-exclusion test vacuous,
# because it never looks outside CWD to begin with.
# Built as positional args rather than a string so a path containing spaces survives.
# \`set --\` deliberately consumes $@; this harness takes no arguments.
set --
if [ -n "$_top" ]; then
  for _f in "$0" "$OUT"${sourceList}; do
    _r=$(_rel "$_f")
    [ -n "$_r" ] && set -- "$@" ":(exclude,top)$_r"
  done
fi
# With no excludes (a harness outside the tree it measures) this degrades to a bare repo-wide
# \`git status --porcelain\`, which is the correct check rather than a CWD-scoped one.
if [ -n "$(git status --porcelain -- "$@" 2>/dev/null)" ]; then BUILD="$BUILD-dirty"; fi
RECORDED_BY="$RECORDED_BY, build $BUILD, ${sourceNote}"

TMP=$(mktemp -d) || exit 1
trap 'rm -rf "$TMP"' EXIT

# Byte-exact JSON string from a FILE ON DISK.
#
# Piping here is safe and is NOT the trap this script exists to avoid: the file is already
# complete before \`od\` opens it. The trap is piping the TARGET's live output, where a \`head\` or a
# full buffer cuts a stream and the loss does not show in the bytes. Worth stating because the
# script otherwise appears to contradict its own rule.
json_string() {
  od -v -An -tu1 "$1" | awk '
    BEGIN { printf "\\"" }
    {
      for (i = 1; i <= NF; i++) {
        c = $i + 0
        if      (c == 34) printf "\\\\\\""
        else if (c == 92) printf "\\\\\\\\"
        else if (c == 8)  printf "\\\\b"
        else if (c == 9)  printf "\\\\t"
        else if (c == 10) printf "\\\\n"
        else if (c == 12) printf "\\\\f"
        else if (c == 13) printf "\\\\r"
        else if (c < 32)  printf "\\\\u%04x", c
        else              printf "%c", c
      }
    }
    END { printf "\\"" }
  '
}

json_array() {
  printf '['
  _sep=""
  for _tok in "$@"; do
    printf '%s' "$_sep"
    printf '%s' "$_tok" > "$TMP/tok"
    json_string "$TMP/tok"
    _sep=", "
  done
  printf ']'
}

# ONE CAPTURE. Redirects to FILES — never a pipe — so both streams are read to EOF and nothing
# downstream can cut them. \`completeness\` is derived from that plus the exit status: a signalled
# process may have been cut mid-write, and \`unknown\` is the format's honest answer for a capture
# whose completeness cannot be established.
emit_record() {
  # SHELL-QUOTED path tokens, expanded in a SUBSHELL. Expanding them here with \`set --\` would
  # clobber "$@", which is holding the argv this record is about; the quoted form has to survive
  # until something can expand it without owning the positional parameters.
  _pq="$1"; shift
  run_target "$@" > "$TMP/out" 2> "$TMP/err"
  _code=$?
  # Stamped PER RECORD, at capture time. Records are captured at different moments and the whole
  # value of the field is that it dates the recording.
  _at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  if [ "$_code" -ge 128 ]; then _completeness="unknown"; else _completeness="complete"; fi

  printf '    {\\n'
  if [ -n "$_pq" ]; then
    printf '      "path": %s,\\n' "$(eval "set -- $_pq"; json_array "$@")"
  fi
  printf '      "argv": %s,\\n' "$(json_array "$@")"
  printf '      "exitCode": %s,\\n' "$_code"
  printf '      "streams": "separated",\\n'
  printf '      "stdout": %s,\\n' "$(json_string "$TMP/out")"
  printf '      "stderr": %s,\\n' "$(json_string "$TMP/err")"
  printf '      "completeness": "%s",\\n' "$_completeness"
  printf '%s' "$RECORDED_BY" > "$TMP/rb"
  printf '      "recordedBy": %s,\\n' "$(json_string "$TMP/rb")"
  printf '      "recordedAt": "%s"\\n' "$_at"
  printf '    }'
}

# WRITTEN IN ONE MOVE, not streamed into "$OUT". A redirect truncates its target before the first
# capture runs, so a failure part-way leaves a SHORT batch that looks whole — three paths of
# seventeen, every field true, nothing marking the absence. That is the same defect as a \`head\` in
# the capture, arriving through the writer instead. A partial temp file is discarded by the trap.
{
  printf '{\\n  "formatVersion": "0",\\n  "records": [\\n'
  _first=1
  while IFS= read -r _p; do
    [ -n "$_p" ] || continue
    [ "$_first" -eq 1 ] || printf ',\\n'
    _first=0
    # shellcheck disable=SC2086
    eval "emit_record \\"\\$_p\\" $_p \\"\\$SENTINEL\\""
  done <<ACC_RUN_EOF
$PATHS
ACC_RUN_EOF
  printf '\\n  ]'
  if [ -n "$IDENTITY_ARGV" ]; then
    printf ',\\n  "identity":\\n'
    eval "emit_record '' $IDENTITY_ARGV"
  fi
  printf '\\n}\\n'
} > "$TMP/batch" || exit 1

# THE LAST STEP IS CHECKED, AND SO IS WHAT IT IS ABOUT TO MOVE.
#
# Everything above exists so that a failure leaves no batch rather than a short one. An unchecked
# \`mv\` gave that away at the last line: an unwritable directory printed its error, the success
# line ran anyway, and the script exited 0 having written nothing — which is the silent no-op this
# whole project reports in other people's tools.
#
# The closing brace test catches the general case behind it: any step that died mid-record leaves a
# document that stops early, and a truncated batch that still parses is the outcome with no
# downstream detector at all.
case "$(tail -c 2 "$TMP/batch" 2>/dev/null)" in
  *'}') ;;
  *) echo "capture did not complete; $OUT not written" >&2; exit 1 ;;
esac
mv "$TMP/batch" "$OUT" || exit 1

echo "wrote $OUT" >&2
`;
}
