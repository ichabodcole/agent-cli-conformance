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
];
