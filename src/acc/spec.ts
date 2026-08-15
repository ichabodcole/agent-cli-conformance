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
        name: "--tag",
        type: "string",
        description: "Only rules carrying this tag.",
        valueHint: "tag",
      },
    ],
    errors: [],
    examples: ["acc rules", "acc rules --tier core", "acc rules --tag silent-failure --json"],
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
        description: "Directory holding acc.config.json.",
        valueHint: "dir",
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
      "Point this only at a binary you are willing to run.",
    ],
    examples: ["acc check ./mycli", "acc check $(which gh) --json"],
  },
];
