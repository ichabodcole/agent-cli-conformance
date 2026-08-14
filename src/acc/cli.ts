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
import { Command, CommanderError } from "commander";
import { pathCommand } from "./commands/path.ts";
import { rulesCommand } from "./commands/rules.ts";
import { schemaCommand } from "./commands/schema.ts";
import { showCommand } from "./commands/show.ts";
import { tagsCommand } from "./commands/tags.ts";
import { emitError, type OutputMode, resolveMode } from "./envelope.ts";
import { AccError, usageError } from "./errors.ts";
import { ExitCode } from "./exit-codes.ts";
import { COMMANDS, GLOBAL_ARGS } from "./spec.ts";
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

const argv = process.argv;
const mode = earlyMode(argv);
const startedAt = performance.now();

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
    cmd.option(
      a.type === "boolean" ? a.name : `${a.name} <${a.valueHint ?? "value"}>`,
      a.description,
    );
  }
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
      default:
        throw new AccError("internal", `no handler for command "${spec.name}"`);
    }
  });
}

try {
  program.parse(argv);
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
