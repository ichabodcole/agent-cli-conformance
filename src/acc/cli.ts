#!/usr/bin/env bun
/**
 * acc — Agent CLI Conformance.
 *
 * This CLI is the spec's reference implementation: it is built to satisfy the rules in
 * docs/wiki/rules/, so that the conformance kit has a KNOWN-GOOD target. A kit with nothing
 * that provably passes cannot distinguish "found a real defect" from "the checker is wrong".
 *
 * The parser is built from spec.ts, so help, parsing and `acc schema` cannot disagree.
 */
import { Command, CommanderError, Option } from "commander";
import { checkCommand } from "./commands/check.ts";
import { pathCommand } from "./commands/path.ts";
import { rulesCommand } from "./commands/rules.ts";
import { schemaCommand } from "./commands/schema.ts";
import { showCommand } from "./commands/show.ts";
import { tagsCommand } from "./commands/tags.ts";
import { versionCommand } from "./commands/version.ts";
import { emitError, type OutputMode, resolveMode } from "./envelope.ts";
import { AccError, usageError } from "./errors.ts";
import { ExitCode } from "./exit-codes.ts";
import { type ArgSpec, COMMANDS, GLOBAL_ARGS } from "./spec.ts";
import { VERSION } from "./version.ts";

/**
 * Mode must be known BEFORE parsing, because a parse failure has to be reported in the right
 * shape. Scanning argv directly is deliberate: asking commander would require a successful
 * parse, and the case that matters most is the one where parsing fails.
 */
function earlyMode(argv: string[]): OutputMode {
  if (argv.includes("--json")) return resolveMode("json");
  const i = argv.indexOf("--format");
  const value = i >= 0 ? argv[i + 1] : undefined;
  return resolveMode(value);
}

/**
 * Reject a value outside an argument's declared set, quoting both the value and the set.
 *
 * `ArgSpec.values` used to be decoration. The builder below read `name` and `type` and ignored
 * it, and `resolveMode` treats an unrecognised explicit format as if none had been supplied —
 * so `acc rules --format nonsense` returned 4KB of data and exit 0. That is the precise
 * silent-acceptance shape A1 and A3 exist to catch in OTHER CLIs, in the reference
 * implementation itself. The set travels back as `choices` so the caller self-corrects in one
 * step rather than going to help.
 */
function rejectOutOfSet(arg: ArgSpec, value: string): void {
  if (!arg.values || arg.values.includes(value)) return;
  throw usageError(`invalid value for ${arg.name}: "${value}"`, {
    hint: `Pass one of: ${arg.values.join(", ")}`,
    choices: arg.values,
  });
}

/** Every argument a command accepts: its own, plus the globals every command carries. */
function argsFor(commandName: string | undefined): ArgSpec[] {
  const spec = COMMANDS.find((c) => c.name === commandName);
  return [...(spec?.args ?? []), ...GLOBAL_ARGS];
}

/** Long options that take a value, across the whole surface. Needed to tell the `core` in
 *  `--tier core` (a value) from a bare token that names the command. */
const VALUE_TAKING = new Set(
  [...GLOBAL_ARGS, ...COMMANDS.flatMap((c) => c.args)]
    .filter((a) => a.type === "string")
    .map((a) => a.name),
);

/**
 * Enforce every declared closed set over raw argv, before commander parses.
 *
 * Command actions are covered by an `argParser` derived from the same declaration (see the
 * builder below), but two paths answer and exit before commander ever runs: the bare
 * invocation, and the machine-mode help interception. `acc --help --format nonsense` returned
 * a schema and exit 0 until this ran first.
 */
function enforceClosedSets(argv: string[]): void {
  const rest = argv.slice(2);
  const supplied: Array<[name: string, value: string]> = [];
  let command: string | undefined;
  for (let i = 0; i < rest.length; i++) {
    const token = rest[i] as string;
    // Everything after the terminator is positional DATA, never a flag (rule A6). Scanning
    // past it would reject `acc show -- --format nonsense`, where those are literal arguments.
    if (token === "--") break;
    if (!token.startsWith("-")) {
      command ??= token;
      continue;
    }
    const eq = token.indexOf("=");
    if (eq > 0) {
      supplied.push([token.slice(0, eq), token.slice(eq + 1)]);
      continue;
    }
    const value = rest[i + 1];
    if (VALUE_TAKING.has(token) && value !== undefined) {
      supplied.push([token, value]);
      i++; // consumed as a value, so it cannot also be read as the command name
    }
  }
  const args = argsFor(command);
  for (const [name, value] of supplied) {
    const arg = args.find((a) => a.name === name);
    if (arg) rejectOutOfSet(arg, value);
  }
}

const argv = process.argv;
const mode = earlyMode(argv);
const startedAt = performance.now();

// Before ANY early path answers: an invocation carrying a value the spec does not allow is
// wrong, whether or not the path it took would have needed to parse.
try {
  enforceClosedSets(argv);
} catch (err) {
  process.exit(emitError({ mode, command: argv[2] ?? "", error: err }));
}

// Bare invocation is a usage error (rule D2): nothing was requested, nothing ran. Exiting 0
// here is how an unset shell variable becomes a silent no-op that reports success.
if (argv.length <= 2) {
  process.exit(
    emitError({
      mode,
      command: "",
      error: usageError("no command given", {
        hint: "Run `acc --help` to see available commands.",
        choices: COMMANDS.map((c) => c.name),
      }),
    }),
  );
}

// In machine mode a help request must still yield parseable stdout (rule B3), so it is
// answered with the schema rather than prose. An agent asking what the tool can do gets
// something it can branch on; a human asking gets the human rendering below.
if (mode === "json" && (argv.includes("--help") || argv.includes("-h"))) {
  schemaCommand(mode, startedAt);
  process.exit(ExitCode.Success);
}

// Version travels the SAME early path, for the same reason. Commander's built-in `--version`
// wrote a bare `0.0.0` and exited before the envelope existed, so every machine-mode spelling —
// `--version --json`, `--json --version`, `--format json --version` — returned an unparseable
// string at exit 0, violating D1's structured-payload requirement. Help is checked first so
// `acc --help --version` keeps answering the broader question.
if (mode === "json" && (argv.includes("--version") || argv.includes("-V"))) {
  versionCommand(mode, startedAt);
  process.exit(ExitCode.Success);
}

const program = new Command();
let commanderStderr = "";

program
  .name("acc")
  .description("Agent CLI Conformance — explore the spec and check binaries against it.")
  .version(VERSION, "-V, --version", "Print the version and exit.")
  .exitOverride()
  .configureOutput({
    // Help goes to stdout and exits 0 — it is a request that succeeded (rule C1).
    writeOut: (s) => process.stdout.write(s),
    // Commander's own diagnostics are captured, not printed, so failures leave through the
    // one envelope path instead of producing prose beside it.
    writeErr: (s) => {
      commanderStderr += s;
    },
  });

for (const spec of COMMANDS) {
  const cmd = program.command(spec.name).description(spec.description);
  for (const p of spec.positionals) {
    cmd.argument(p.required ? `<${p.name}>` : `[${p.name}]`, p.description);
  }
  // Global args are attached to EVERY command in this loop rather than to the root. Declaring
  // them once on the root is the citty gotcha: root flags do not reach subcommands, so
  // `mycli sub --format json` silently returns human text.
  for (const a of [...spec.args, ...GLOBAL_ARGS]) {
    const option = new Option(
      a.type === "boolean" ? a.name : `${a.name} <${a.valueHint ?? "value"}>`,
      a.description,
    );
    // Validation is DERIVED from the declaration, never restated beside it. An ArgSpec that
    // names a closed set gets a parser that enforces it, so a flag cannot be added with a set
    // the parser then ignores — which is exactly how `--format` came to accept anything.
    if (a.values?.length) {
      option.argParser((value: string) => {
        rejectOutOfSet(a, value);
        return value;
      });
    }
    cmd.addOption(option);
  }
  // Notes before examples: a caveat a caller must read BEFORE running the command is worth
  // nothing underneath the copy-pasteable invocation it is warning about.
  if (spec.notes?.length)
    cmd.addHelpText("after", `\n${spec.notes.map((n) => `  ${n}`).join("\n")}`);
  for (const example of spec.examples) cmd.addHelpText("after", `\n  ${example}`);

  cmd.action((...actionArgs: unknown[]) => {
    // commander passes: ...positionals, options, command
    const positionals = actionArgs.slice(0, spec.positionals.length) as string[];
    const opts = actionArgs[spec.positionals.length] as Record<string, string | boolean>;
    const resolved = resolveMode(opts.json ? "json" : (opts.format as string | undefined));

    switch (spec.name) {
      case "rules":
        return rulesCommand(
          {
            tier: opts.tier as string | undefined,
            tag: opts.tag as string | undefined,
            probeLevel: opts.probeLevel as string | undefined,
          },
          resolved,
          startedAt,
        );
      case "show":
        return showCommand(
          positionals[0] as string,
          { body: Boolean(opts.body) },
          resolved,
          startedAt,
        );
      case "path":
        return pathCommand(positionals[0] as string, positionals[1] as string, resolved, startedAt);
      case "tags":
        return tagsCommand(resolved, startedAt);
      case "schema":
        return schemaCommand(resolved, startedAt);
      case "check":
        return checkCommand(
          positionals[0] as string,
          { expectations: opts.expectations as string | undefined },
          resolved,
          startedAt,
        );
      default:
        throw new AccError("internal", `no handler for command "${spec.name}"`);
    }
  });
}

try {
  await program.parseAsync(argv);
} catch (err) {
  if (err instanceof CommanderError) {
    // Help and version are REQUESTS, and they succeeded. Commander models them as exceptions;
    // that is a control-flow detail, not a failure.
    if (err.code === "commander.helpDisplayed" || err.code === "commander.help") {
      process.exit(ExitCode.Success);
    }
    if (err.code === "commander.version") process.exit(ExitCode.Success);

    // Everything else commander throws is the caller getting the invocation wrong. Commander
    // already named the offending token (rule A3); that text becomes the envelope's message.
    const message = commanderStderr.trim().replace(/^error:\s*/i, "") || err.message;
    process.exit(
      emitError({
        mode,
        command: argv[2] ?? "",
        error: usageError(message, {
          hint: "Run `acc --help`, or `acc schema` for the machine-readable surface.",
          choices: COMMANDS.map((c) => c.name),
        }),
      }),
    );
  }
  // An escaping non-AccError is by definition unclassified, and emitError reports it as
  // `internal` (exit 1). Forgetting to classify a failure therefore yields the honest answer.
  process.exit(emitError({ mode, command: argv[2] ?? "", error: err }));
}
