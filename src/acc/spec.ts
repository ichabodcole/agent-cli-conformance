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
  /** read_only is falsifiable: run it in a sandbox and diff the filesystem. */
  effects: "read_only" | "idempotent" | "non_idempotent";
  output_kind: "data" | "stream" | "opaque";
  cardinality: "single" | "bounded" | "unbounded";
  positionals: PositionalSpec[];
  args: ArgSpec[];
  errors: ErrorKindValue[];
  examples: string[];
  /** Caveats a caller must read BEFORE running the command, rendered above the examples in
   *  help. Distinct from `description`, which has to stay one line for the command list. */
  notes?: string[];
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
    errors: [ErrorKind.Usage, ErrorKind.Internal],
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
    errors: [ErrorKind.NotFound, ErrorKind.Usage, ErrorKind.Internal],
    examples: ["acc show A1", "acc show exit-codes --body", "acc show A1 --json"],
  },
  {
    name: "path",
    description: "Shortest link path between two pages.",
    effects: "read_only",
    output_kind: "data",
    cardinality: "single",
    positionals: [
      { name: "from", description: "Starting page handle.", required: true },
      { name: "to", description: "Destination page handle.", required: true },
    ],
    args: [],
    errors: [ErrorKind.NotFound, ErrorKind.Usage, ErrorKind.Internal],
    examples: ["acc path A1 exit-codes", "acc path B1 delegator --json"],
  },
  {
    name: "tags",
    description: "List tags and how many pages carry each.",
    effects: "read_only",
    output_kind: "data",
    cardinality: "bounded",
    positionals: [],
    args: [],
    errors: [ErrorKind.Internal],
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
    errors: [ErrorKind.Internal],
    examples: ["acc schema", "acc schema | jq '.commands[].name'"],
  },
  {
    name: "check",
    description: "Run the L0 conformance probes against a CLI binary.",
    effects: "read_only",
    output_kind: "data",
    cardinality: "single",
    positionals: [
      { name: "target", description: "Path to the binary or script to check.", required: true },
    ],
    args: [
      {
        name: "--expectations",
        type: "string",
        description: "Directory holding .acc-expectations.json.",
        valueHint: "dir",
      },
    ],
    errors: [ErrorKind.NotFound, ErrorKind.Usage, ErrorKind.Internal],
    // The gate's guarantee, stated where someone is about to point this at a binary. L0 probes
    // are inert against a CLI that dispatches on a verb table; they are NOT inert against one
    // whose first positional is free-form text, where the probe token is a prompt rather than
    // an unknown command. The kit cannot detect that shape, so the caller has to know.
    notes: [
      "SAFETY: probes are inert against a CLI that dispatches on a fixed verb table — the probe",
      "token matches no flag and no command, so nothing runs. They are NOT inert against a CLI",
      "whose first positional is free-form text (claude, llm, aider): there the token is a",
      "prompt, and running it costs money and may take actions. Probes run with stdin closed,",
      "a deadline, and a fresh temporary working directory, which bounds filesystem damage but",
      "not network calls. Do not point this at a CLI of that shape.",
    ],
    examples: ["acc check ./mycli", "acc check $(which gh) --json"],
  },
];
