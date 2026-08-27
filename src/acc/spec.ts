import { ErrorKind, type ErrorKindValue } from "./exit-codes.ts";

/**
 * THE command surface, declared once as data.
 *
 * `cli.ts` builds the parser from this, `schema.ts` serialises it, and help text is derived
 * from it. That is the whole point: a hand-written help string beside a separate parse config
 * is two sources of truth, and Spellbook's CLIs demonstrated exactly how that drifts — a HELP
 * template promising flags the parser did not accept.
 *
 * Adding a flag here makes it parseable, documented, and introspectable in one edit. There is
 * no way to add it to only one of the three.
 */

export interface ArgSpec {
  /** Long form, including the leading dashes. */
  name: string;
  type: "string" | "boolean";
  description: string;
  /** A closed set. Rejections quote it back as `choices`, so a caller self-corrects. */
  values?: string[];
  valueHint?: string;
}

export interface PositionalSpec {
  name: string;
  description: string;
  required: boolean;
  /**
   * This positional consumes every remaining token, and the handler receives an ARRAY.
   *
   * Declared here rather than encoded in the name, because three consumers read this field and
   * each needs the fact rather than a spelling convention: `cli.ts` builds `<name...>`,
   * `schema.ts` publishes it, and the conformance suite provokes a surplus-positional error —
   * which a variadic command cannot have, since every extra token is another value. A command
   * that wants a MINIMUM above one enforces it in its handler, where the number can be quoted
   * back to the caller (see `compare`).
   */
  variadic?: boolean;
}

export interface CommandSpec {
  name: string;
  description: string;
  /**
   * read_only is falsifiable: run it in a sandbox and diff the filesystem.
   *
   * The claim covers everything the command CAUSES, not only what its own code writes. A
   * command that spawns another program owns that program's effects for the purpose of this
   * field, because the caller experiences them either way — which is why `check` cannot be
   * `read_only` (see its declaration).
   */
  effects: "read_only" | "idempotent" | "non_idempotent";
  output_kind: "data" | "stream" | "opaque";
  cardinality: "single" | "bounded" | "unbounded";
  positionals: PositionalSpec[];
  args: ArgSpec[];
  /** ADDITIONAL kinds this command's handler can produce. The parser-level kinds every command
   *  can hit are added by `errorsOf` — declaring them here would be restating them six times. */
  errors: ErrorKindValue[];
  examples: string[];
  /** Caveats a caller must read BEFORE running the command, rendered above the examples in
   *  help. Distinct from `description`, which has to stay one line for the command list. */
  notes?: string[];
}

/**
 * Error kinds EVERY command can produce, whatever its handler declares.
 *
 * `usage` because the parser runs before any handler: an unknown option or a stray positional
 * fails identically on `tags` and on `check`. `internal` because an unclassified fault is
 * reported as `internal` by the boundary in cli.ts, and no command can promise it has none.
 *
 * These are unioned into every command by `errorsOf` rather than restated six times. `acc tags
 * extra` and `acc schema --bogus` were both structured `usage` errors at exit 2 while the
 * schema declared only `["internal"]` for those commands — telling a machine caller an outcome
 * could not happen when it plainly could.
 */
export const PARSER_ERRORS: ErrorKindValue[] = [ErrorKind.Usage, ErrorKind.Internal];

/** Every kind a command can produce: the parser's, plus whatever its handler declares. */
export function errorsOf(spec: CommandSpec): ErrorKindValue[] {
  return [...new Set([...spec.errors, ...PARSER_ERRORS])];
}

/** Available on every command. Declared once so no subcommand can forget it — the citty
 *  gotcha, where a root flag silently did not reach subcommands. */
export const GLOBAL_ARGS: ArgSpec[] = [
  {
    name: "--format",
    type: "string",
    description: "Output format. An explicit value always beats auto-detection.",
    values: ["text", "json"],
    valueHint: "text|json",
  },
  {
    name: "--json",
    type: "boolean",
    description: "Shorthand for --format json.",
  },
];

export const COMMANDS: CommandSpec[] = [
  {
    name: "rules",
    description: "List conformance rules.",
    effects: "read_only",
    output_kind: "data",
    cardinality: "bounded",
    positionals: [],
    args: [
      {
        name: "--tier",
        type: "string",
        description: "Only rules of this tier.",
        values: ["core", "diagnostic"],
        valueHint: "core|diagnostic",
      },
      {
        name: "--probe-level",
        type: "string",
        description: "Only rules probed at this level.",
        values: ["L0", "L1", "L2"],
        valueHint: "L0|L1|L2",
      },
      {
        name: "--deviation",
        type: "string",
        description: "Only rules where not satisfying it means this.",
        values: ["defect", "design-choice"],
        valueHint: "defect|design-choice",
      },
      {
        name: "--tag",
        type: "string",
        description: "Only rules carrying this tag.",
        valueHint: "tag",
      },
    ],
    errors: [],
    examples: [
      "acc rules",
      "acc rules --tier core",
      "acc rules --deviation design-choice",
      "acc rules --tag silent-failure --json",
    ],
  },
  {
    name: "show",
    description: "Show one page by rule id, slug, or path.",
    effects: "read_only",
    output_kind: "data",
    cardinality: "single",
    positionals: [
      {
        name: "handle",
        description: "A rule id (A1), a page slug, or a wiki-relative path.",
        required: true,
      },
    ],
    args: [{ name: "--body", type: "boolean", description: "Include the full page text." }],
    errors: [ErrorKind.NotFound],
    examples: ["acc show A1", "acc show exit-codes --body", "acc show A1 --json"],
  },
  {
    name: "path",
    // Direction stated in the DESCRIPTION, not just in the failure hint. "Shortest link path"
    // reads as symmetric, so `acc path A1 delegator` looked like a working example and exited
    // 5; the caller learned the traversal was directed only by getting it wrong.
    description: "Shortest path of outbound links from one page to another.",
    effects: "read_only",
    output_kind: "data",
    cardinality: "single",
    positionals: [
      {
        name: "from",
        description: "Starting page handle. Traversal follows its links OUT.",
        required: true,
      },
      { name: "to", description: "Destination page handle.", required: true },
    ],
    args: [],
    errors: [ErrorKind.NotFound],
    // Both directions shown, because the pair is the lesson: A6 links to the delegator
    // archetype, so the reverse of the second example is a legitimate exit 5.
    examples: ["acc path A1 exit-codes", "acc path A6 delegator", "acc path delegator B1 --json"],
  },
  {
    name: "tags",
    description: "List tags and how many pages carry each.",
    effects: "read_only",
    output_kind: "data",
    cardinality: "bounded",
    positionals: [],
    args: [],
    errors: [],
    examples: ["acc tags", "acc tags --json"],
  },
  {
    name: "version",
    description: "Show the installed version, and with --check whether it is the current release.",
    // `read_only` WITH `--check`, deliberately. The flag makes one outbound `git ls-remote` and
    // writes nothing anywhere — no file, no cache, no state. `effects` covers what a command
    // CAUSES, and a read of a remote ref advertisement causes nothing.
    effects: "read_only",
    output_kind: "data",
    cardinality: "single",
    positionals: [],
    args: [
      {
        name: "--check",
        type: "boolean",
        description:
          "Compare against the newest published release tag. One network call; reports 'could not check' plainly when the remote is unreachable rather than failing.",
      },
    ],
    // No `not_found` and no `auth`: an unreachable remote or a missing key is NOT an error here.
    // It is the third outcome, reported on `ok: true` with `checked: false`.
    errors: ["usage", "internal"],
    examples: ["acc version", "acc version --check", "acc version --check --json"],
    notes: [
      "SEPARATE FROM `--version` on purpose: the D1 checker probes `--version` on every target, so",
      "a network call there would make this CLI's own version path non-inert during dogfooding.",
      "REACH: this catches staleness that SPANS A RELEASE. A stale extracted package at the same",
      "version but different bytes is invisible to it — only a version string is compared.",
    ],
  },
  {
    name: "schema",
    description: "Emit this CLI's machine-readable interface description.",
    effects: "read_only",
    output_kind: "data",
    cardinality: "single",
    positionals: [],
    args: [],
    errors: [],
    // `.data.commands`, not `.commands`: the schema is enveloped in BOTH modes, so the query
    // path does not change when the command is piped.
    examples: ["acc schema", "acc schema | jq '.data.commands[].name'"],
  },
  {
    name: "check",
    description: "Run the L0 conformance probes against a CLI binary.",
    // `read_only` was a claim about acc's OWN file access, and as a claim about the command it
    // was false: `check` spawns third-party code, and nothing the kit does bounds what that code
    // writes (review R2-1). The weakest value in the vocabulary is the only honest one — a
    // second run repeats every probe, so whatever the target did the first time it may do again.
    effects: "non_idempotent",
    output_kind: "data",
    cardinality: "single",
    positionals: [
      { name: "target", description: "Path to the binary or script to check.", required: true },
    ],
    args: [
      // `--config-dir`, not `--config`. The value is a DIRECTORY the kit looks for
      // `acc.config.json` in, and `--config` names a file almost everywhere it appears — a flag
      // whose name promises a file and rejects one is the small lie this project spends its
      // whole catalogue objecting to. The name states what it takes.
      {
        name: "--config-dir",
        type: "string",
        // WHAT OMITTING IT DOES is half the description, and the half that was missing. Without
        // the flag the CURRENT WORKING DIRECTORY is searched, and a file found there is loaded —
        // so the same command against the same absolute target gives two verdicts from two
        // directories. An adopter hit exactly that and worked it out only because residue from an
        // earlier run was on disk. A flag description that documents the flag and not its absence
        // leaves the default undocumented everywhere.
        //
        // "That directory only, with no search upward" is carried here as well as in the README,
        // the guide and the concept page, because this is the text `acc check --help` prints and
        // so the one a reader reaches without leaving their shell. "The working directory is
        // searched" on its own invites the wrong picture — a walk up to the repo root, the way
        // most tools resolve their config — and a reader holding it would leave a config one
        // directory up and never learn why their waivers did nothing.
        description:
          "Directory holding acc.config.json. Omitted, the current working directory is searched — that directory only, with no search upward — and a file found there is loaded; the report names whichever was used.",
        valueHint: "dir",
      },
      // A FILE, and a separate one from `acc.config.json` — the name says which, for the same
      // reason `--config-dir` says "dir". A declaration is falsifiable and a config is a choice:
      // they have different authors, different lifetimes, and a maintainer publishing a
      // declaration in their own repository must not be publishing somebody's suppressions with
      // it. See src/acc/kit/declaration.ts.
      {
        name: "--declaration",
        type: "string",
        description:
          "Path to a declaration file to diff against what the target says it accepts. Omitted, no comparison is made and the report says so; nothing here passes or fails, because the kit cannot tell which side of a disagreement is wrong.",
        valueHint: "file",
      },
      // A FILE, on the `--declaration` precedent above and for that flag's own stated reason: a
      // recorded batch is the same kind of thing as a declaration — somebody's account of what
      // happened, handed to the kit to be diffed — so it arrives the same way. It is NOT an
      // `acc.config.json` key: a key describing the target's own shape belongs in a declaration
      // file, and a repository that committed a batch would be committing one machine's afternoon.
      //
      // THE PLURAL IS THE FILE'S CONTENTS, NOT A REPEATABLE FLAG. One file holds a batch of
      // surfaces, and one document is one session assertion — so a second `--recorded-surfaces` is
      // REFUSED rather than merged, which commander does not do for a string option on its own.
      // See `refuseRepeated` in cli.ts, which is where that departure is enforced and argued.
      {
        name: "--recorded-surfaces",
        type: "string",
        description:
          "Path to a batch of surfaces you recorded yourself, below the root the kit probes. Give it at most once — one batch is one session assertion, and a second is refused rather than merged. Every census line says who observed it; nothing here passes or fails. For the format: acc show how-to-record-surfaces-below-the-root",
        valueHint: "file",
      },
    ],
    errors: [ErrorKind.NotFound],
    // What the gate does and does not buy, stated where someone is about to point this at a
    // binary. The residual risks are listed rather than summarised as "low": a reader who is
    // told a probe is safe stops reading, and every item below is something they can act on by
    // choosing a different target.
    //
    // This note used to END with "Probes are inert against a CLI that dispatches on a fixed verb
    // table" — one sentence after correctly naming bare-invocation work, an ignored flag followed
    // by a default root action, and pre-dispatch global initialisation, none of which a fixed verb
    // table prevents and one of which (the bare invocation) the probe set sends regardless
    // (review R6-4). A summary that contradicts the list above it is worse than no summary,
    // because it is the part a reader remembers. The claim is deleted rather than softened: what
    // a sentinel token establishes is that it names nothing DECLARED, and that is now all the
    // sentence says. "Risk-reduced, not inert" is the wording used everywhere else — README,
    // inert.ts, the A2 and A6 rule pages — and it is used here too.
    notes: [
      "The target is YOUR binary; the examples below are placeholders for it.",
      "SAFETY: this command EXECUTES the target. L0 is RISK-REDUCED, not inert —",
      "only help paths, sentinel-bearing arguments, and bare invocations, which is a far smaller",
      "blast radius than arbitrary probing. It is NOT a sandbox, and does not prevent: a CLI that",
      "does real work on a bare invocation; a fixed-verb CLI that ignores an unknown flag and",
      "runs a default root action; --help or --version handled only after global init; writes",
      "through HOME, XDG paths, absolute paths or subprocesses (the fresh temporary working",
      "directory redirects RELATIVE paths only); credentials, which the child inherits with the",
      "rest of the environment; or any network call. A sentinel token establishes exactly one",
      "thing: it names no declared verb and no declared flag. That buys least against a CLI whose",
      "first positional is free-form text (claude, llm, aider), where the token is a prompt.",
      "Point this only at a binary you are willing to run. This list says what is NOT prevented;",
      "the method for establishing what your target actually does with these probes is one page:",
      "acc show how-to-establish-your-target-is-safe-to-check",
      "EVIDENCE: each finding carries `probes` — the argv behind every id it cites, already",
      "resolved, so a verdict and the invocation that produced it are one read apart. --json also",
      "adds an `observations` array under .data: every probe that ran, with its exit code, timings",
      "and stream digests. The ids a finding cites in `evidence` index it. `acc show` does not",
      "resolve them; they exist only in the report the run produced.",
    ],
    examples: ["acc check ./mycli", "acc check $(which gh) --json"],
  },
  {
    name: "probe-plan",
    description: "Emit a capture harness for the command paths below the root.",
    // `idempotent`, and the two neighbours are both wrong for a reason worth stating.
    //
    // NOT `read_only`: with `--out` this command writes a file the caller named, and the effects
    // claim covers what a command CAUSES. An earlier draft put the harness on stdout to keep this
    // `read_only` — that failed on the CLI's own machine-mode rule, since a redirect is not a
    // terminal and `> capture.sh` therefore resolves to JSON and writes an envelope into a file
    // named like a script. Nothing in the standard says a conforming CLI has no mutating commands;
    // it says a CLI declares its effects honestly.
    //
    // NOT `non_idempotent` either, which is where `check` sits: this command spawns nothing. Same
    // inputs in, same bytes out, and a second run leaves the same state — which is exactly what
    // `idempotent` claims.
    effects: "idempotent",
    // The command's output is the PLAN, and it is data. The harness is a file the plan writes.
    // `opaque` was considered and is the wrong fit: with `--out` there is a real envelope on
    // stdout, and `opaque` promises no JSON is expected there.
    output_kind: "data",
    cardinality: "single",
    positionals: [
      {
        name: "target",
        description: "Path to the binary or script to plan a capture for.",
        required: true,
      },
    ],
    args: [
      {
        name: "--declaration",
        type: "string",
        description:
          "Derive the command paths from this declaration's commands[].path. The convenient source, and the one that can only ever probe paths you have already named.",
        valueHint: "file",
      },
      {
        name: "--paths",
        type: "string",
        description:
          'Command paths as a JSON array of arrays, e.g. [["state"], ["send", "note"]]. The source that can find a verb your declaration does not name, because it comes from wherever you actually enumerate them.',
        valueHint: "file",
      },
      {
        name: "--out",
        type: "string",
        description:
          "Write the harness here. Omitted, nothing is written and the script is carried in the JSON payload — a redirect cannot substitute, because stdout carries the envelope.",
        valueHint: "file",
      },
      {
        name: "--force",
        type: "boolean",
        description:
          "Overwrite the --out file if it exists. Without it an existing file is refused rather than replaced.",
      },
    ],
    // `not_found` for a target, declaration or path list that is not there and for a missing
    // parent directory; `conflict` for an --out that exists; `permission` for one that cannot be
    // written. The last two are the kinds only this command can reach, because it is the only one
    // that writes.
    errors: [ErrorKind.NotFound, ErrorKind.Conflict, ErrorKind.Permission],
    notes: [
      "The harness is a script YOU run: the kit never executes below the root. Hand what it writes back with `acc check <target> --recorded-surfaces batch.json`.",
      "`completeness` and `streams` are derived by the harness, not asked of you — it redirects to files rather than piping, so nothing downstream can cut a stream.",
    ],
    examples: [
      "acc probe-plan ./mycli --declaration ./declaration.json --out ./capture.sh",
      "acc probe-plan ./mycli --paths ./paths.json --out ./capture.sh",
      "acc probe-plan ./mycli --declaration ./declaration.json --json",
    ],
  },
  {
    name: "compare",
    // "Where they disagree", not "whether they conform". Every other command in this list judges
    // one tool against the catalogue; this one holds several tools against EACH OTHER and reports
    // no verdict at all — see src/acc/kit/compare.ts for why verdicts cannot carry the finding.
    description: "Show where several checked targets answer the same probe differently.",
    // The strong sense of the word, and the one `check` had to give up: this command reads JSON
    // files and executes nothing. Comparing eight targets spawns no processes at all.
    effects: "read_only",
    output_kind: "data",
    cardinality: "single",
    positionals: [
      {
        name: "reports",
        description: "Two or more JSON reports written by `acc check <target> --json`.",
        required: true,
        variadic: true,
      },
    ],
    args: [],
    errors: [ErrorKind.NotFound],
    notes: [
      "INPUT IS STORED REPORTS, not targets: nothing is executed, and no probe is re-run. Write",
      "one report per target first — `acc check <target> --json > <name>.json` — then pass them",
      "all. The file's name becomes the target's label in the output.",
      "NOT A VERDICT. Rows are grouped by who answered alike, nothing passes or fails, and this",
      "command exits 0 whatever it finds. Two tools differing is a decision to surface, not a",
      "defect to clear.",
      "WHAT IT COMPARES: the `observations` array — how each probe ENDED (exit code, signal,",
      "timeout) and WHERE its bytes went (stdout, stderr, both, neither), aligned across reports",
      "by identical argv. Byte counts and digests travel on every row but never decide",
      "divergence: two tools always have help screens of different lengths. Report CONTENT is not",
      "carried by a report at all, so a difference visible only in the bytes — prose help versus",
      "JSON help, both on stdout at exit 0 — is one this command cannot see.",
    ],
    examples: [
      "acc compare run-a.json run-b.json",
      "acc compare run-a.json run-b.json --json | jq '.data.divergent[].args'",
    ],
  },
];
