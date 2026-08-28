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
import { compareCommand } from "./commands/compare.ts";
import { pathCommand } from "./commands/path.ts";
import { probePlanCommand } from "./commands/probe-plan.ts";
import { reportCommand } from "./commands/report.ts";
import { rulesCommand } from "./commands/rules.ts";
import { schemaCommand } from "./commands/schema.ts";
import { showCommand } from "./commands/show.ts";
import { tagsCommand } from "./commands/tags.ts";
import { versionCommand, versionVerbCommand } from "./commands/version.ts";
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
  // BOTH spellings. Commander accepts `--format=text`, and matching only the separated form
  // meant `acc --help --format=text` was read as having no explicit format at all: detection
  // then chose json on a pipe and answered with the schema, silently ignoring a format the
  // caller had stated outright.
  const attached = argv.find((a) => a.startsWith("--format="));
  if (attached) return resolveMode(attached.slice("--format=".length));
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

/**
 * Flags that may be given AT MOST ONCE, with the reason each one refuses its own repetition.
 *
 * Commander is LAST-WINS for a repeated string option: `--declaration a.json --declaration b.json`
 * silently reads `b.json`. That is the wrong default for a batch of recorded surfaces, and the
 * reason is not tidiness — one batch is ONE SESSION ASSERTION, the caller's statement that these
 * records came from one tool on one machine in one sitting. Merging two batches would erase the
 * binding the batch exists to assert, and keeping one of them silently is a caller's claim deleted
 * without a word. A caller with two sessions runs twice.
 *
 * Enforced over raw argv, before commander parses, for the same reason `enforceClosedSets` is: the
 * option's own parser never sees the first occurrence again once the second overwrites it.
 */
const AT_MOST_ONCE: Record<string, string> = {
  "--recorded-surfaces":
    "One batch is one session assertion — these records came from one tool, on one machine, in one sitting. Merging two would erase the binding the batch exists to assert. Run acc check once per batch.",
};

function refuseRepeated(argv: string[]): void {
  const counts = new Map<string, number>();
  for (const token of argv.slice(2)) {
    // Everything after the terminator is positional DATA, never a flag (rule A6).
    if (token === "--") break;
    const name =
      token.startsWith("--") && token.includes("=") ? token.slice(0, token.indexOf("=")) : token;
    if (!(name in AT_MOST_ONCE)) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  for (const [name, n] of counts) {
    if (n > 1)
      throw usageError(`${name} was given ${n} times, and it may be given at most once`, {
        hint: AT_MOST_ONCE[name],
      });
  }
}

const argv = process.argv;
const mode = earlyMode(argv);
const startedAt = performance.now();

// Before ANY early path answers: an invocation carrying a value the spec does not allow is
// wrong, whether or not the path it took would have needed to parse.
try {
  enforceClosedSets(argv);
  refuseRepeated(argv);
} catch (err) {
  process.exit(emitError({ mode, command: argv[2] ?? "", error: err }));
}

/**
 * Bare invocation is a usage error (rule D2): nothing was requested, nothing ran. Exiting 0
 * here is how an unset shell variable becomes a silent no-op that reports success.
 *
 * This is decided from commander's own outcome rather than from `argv.length <= 2`, which asks
 * the wrong question: it tests how many tokens arrived when the rule is about whether any of
 * them named a command. Every global flag made the two disagree, and `acc --json` — three
 * tokens, no verb — is the shape an agent hits by selecting machine mode and forgetting the
 * command.
 *
 * What that invocation met is subtler than a missing guard. Commander answers a missing
 * subcommand by writing usage through `writeErr` and throwing `commander.help` with its own
 * exit code of `1`; an explicit `--help` writes through `writeOut` and throws
 * `commander.helpDisplayed` with `0`. The two were classified together as "help is a request,
 * and it succeeded", so the incomplete invocation exited `0` — and because this CLI captures
 * `writeErr` rather than printing it (so failures leave through the envelope), it also wrote
 * nothing at all. Exit `0`, both streams empty: D2's own failure mode in the tool that defines
 * D2, and the silent no-op this catalogue exists to report.
 *
 * They are distinguished below by code. A pre-parse scan for a known command name would not
 * work: it cannot tell `acc --json` from `acc --bogus`, so it would answer both with "no
 * command given" and swallow the unknown flag commander names for us (rule A3).
 */
const noCommandGiven = () =>
  emitError({
    mode,
    command: "",
    error: usageError("no command given", {
      hint: "Run `acc --help` to see available commands.",
      choices: COMMANDS.map((c) => c.name),
    }),
  });

// In machine mode a help request must still yield parseable stdout (rule B3), so it is
// answered with the schema rather than prose. An agent asking what the tool can do gets
// something it can branch on; a human asking gets the human rendering below.
if (mode === "json" && (argv.includes("--help") || argv.includes("-h"))) {
  schemaCommand(mode);
  process.exit(ExitCode.Success);
}

// Version travels the SAME early path, for the same reason. Commander's built-in `--version`
// wrote a bare `0.0.0` and exited before the envelope existed, so every machine-mode spelling —
// `--version --json`, `--json --version`, `--format json --version` — returned an unparseable
// string at exit 0, violating D1's structured-payload requirement. Help is checked first so
// `acc --help --version` keeps answering the broader question.
if (mode === "json" && (argv.includes("--version") || argv.includes("-V"))) {
  versionCommand(mode);
  process.exit(ExitCode.Success);
}

/** One Commander option, derived from its declaration — closed-set enforcement included. */
function toOption(a: ArgSpec): Option {
  const option = new Option(
    a.type === "boolean" ? a.name : `${a.name} <${a.valueHint ?? "value"}>`,
    a.description,
  );
  // Validation is DERIVED from the declaration, never restated beside it. An ArgSpec that names
  // a closed set gets a parser that enforces it, so a flag cannot be added with a set the
  // parser then ignores — which is exactly how `--format` came to accept anything.
  if (a.values?.length) {
    option.argParser((value: string) => {
      rejectOutOfSet(a, value);
      return value;
    });
  }
  return option;
}

const program = new Command();
let commanderStderr = "";
/** Set by every command action; read after the parse to detect an invocation that named none. */
let commandRan = false;

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

// Globals go on the ROOT as well as on every subcommand below.
//
// The loop's own warning is about attaching them ONLY to the root — the citty gotcha, where
// `mycli sub --format json` silently returns human text because the root flag never reaches the
// subcommand. Attaching to BOTH is what that argument actually calls for: `acc rules --help`
// documented `--format`/`--json` while `acc --help` listed only `--version` and `--help`, so
// the first surface a caller reaches never named the machine-readable path (rule D3).
for (const a of GLOBAL_ARGS) program.addOption(toOption(a));

for (const spec of COMMANDS) {
  const cmd = program.command(spec.name).description(spec.description);
  for (const p of spec.positionals) {
    // A variadic positional takes every remaining token, and commander hands the action ONE
    // argument for it: an array. `<reports...>` still requires at least one, so a command
    // needing more enforces that in its handler, where the count can be quoted back.
    const tail = p.variadic ? "..." : "";
    cmd.argument(p.required ? `<${p.name}${tail}>` : `[${p.name}${tail}]`, p.description);
  }
  // Global args are attached to EVERY command in this loop as well as to the root above.
  // Declaring them once on the root is the citty gotcha: root flags do not reach subcommands,
  // so `mycli sub --format json` silently returns human text.
  for (const a of [...spec.args, ...GLOBAL_ARGS]) cmd.addOption(toOption(a));
  // Notes before examples: a caveat a caller must read BEFORE running the command is worth
  // nothing underneath the copy-pasteable invocation it is warning about.
  if (spec.notes?.length)
    cmd.addHelpText("after", `\n${spec.notes.map((n) => `  ${n}`).join("\n")}`);
  for (const example of spec.examples) cmd.addHelpText("after", `\n  ${example}`);

  cmd.action((...actionArgs: unknown[]) => {
    commandRan = true;
    // commander passes: ...positionals, options, command
    // One slot per DECLARED positional, variadic included — commander collapses a variadic's
    // tokens into a single array argument, so the slot count never varies with the argv length.
    const positionals = actionArgs.slice(0, spec.positionals.length) as Array<string | string[]>;
    const opts = actionArgs[spec.positionals.length] as Record<string, string | boolean>;
    // Both scopes, subcommand first. Now that the globals also live on the root, `acc --json
    // rules` parses — and reading only the subcommand's options would accept the flag and
    // ignore it, which is the same silent acceptance the citty gotcha produces in reverse.
    const root = program.opts();
    const resolved = resolveMode(
      opts.json || root.json ? "json" : ((opts.format ?? root.format) as string | undefined),
    );

    switch (spec.name) {
      case "rules":
        return rulesCommand(
          {
            tier: opts.tier as string | undefined,
            deviation: opts.deviation as string | undefined,
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
      case "version":
        return versionVerbCommand({ check: Boolean(opts.check) }, resolved, startedAt);
      case "schema":
        return schemaCommand(resolved);
      case "probe-plan":
        return probePlanCommand(
          positionals[0] as string,
          {
            declaration: opts.declaration as string | undefined,
            paths: opts.paths as string | undefined,
            out: opts.out as string | undefined,
            force: Boolean(opts.force),
          },
          resolved,
          startedAt,
        );
      case "check":
        return checkCommand(
          positionals[0] as string,
          {
            configDir: opts.configDir as string | undefined,
            declaration: opts.declaration as string | undefined,
            recordedSurfaces: opts.recordedSurfaces as string | undefined,
          },
          resolved,
          startedAt,
        );
      case "report":
        return reportCommand(positionals[0] as string, resolved, startedAt);
      case "compare":
        return compareCommand(positionals[0] as string[], resolved, startedAt);
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
    if (err.code === "commander.helpDisplayed") process.exit(ExitCode.Success);
    if (err.code === "commander.version") process.exit(ExitCode.Success);

    // NOT a request that succeeded: commander throws this when it printed usage because the
    // invocation named no subcommand. See `noCommandGiven` for what classifying it as help cost.
    if (err.code === "commander.help") process.exit(noCommandGiven());

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

// A BACKSTOP, not the primary guard: commander answers today's no-command invocations by
// throwing `commander.help`, which the catch above classifies. This catches the other shape —
// a parse that resolves with no action having fired — because the failure it would otherwise
// produce is exit 0 with nothing written, which is the one outcome this CLI must never have.
// Commands set `process.exitCode` and return rather than exiting, so reaching here after one
// has run is the normal success path and must not be disturbed.
if (!commandRan) process.exit(noCommandGiven());
