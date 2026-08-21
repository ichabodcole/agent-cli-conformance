#!/usr/bin/env bun
// A MACHINE-FIRST CLI: structured output is what it emits, and prose is the thing you opt into.
//
// This is the shape the kit could not see until `defaultOutput: "json"` existed. There is no
// `--json` flag to advertise, because there is no mode to switch INTO — so help names none,
// discovery finds none, and D3 used to report "help names no machine-mode flag" against a target
// that is more agent-ready than one passing D3 with a flag bolted on. B5 then had nothing to
// select and reported `unverified`, skipping the envelope check on precisely the class of CLI the
// kit is for.
//
// Note what help is: PROSE. That is deliberate and it is the realistic shape — a machine-first
// tool still answers `--help` to a human, and its data commands still emit JSON. It is also why
// B3 cannot be satisfied here at L0: reading a data command's output means selecting a data
// command, and nothing at L0 knows which verb is side-effect-free. B5 can be satisfied, because a
// parser error can be provoked inertly.
const args = process.argv.slice(2);

const HELP = `fixture — a machine-first CLI

Usage:
  fixture list                 List things.
  fixture --version            The version.
  fixture --help               This text.

Output:
  Data commands emit JSON on stdout by default; pass --human for prose.
  Diagnostics go to stderr. Usage errors exit 2.
`;

/** The envelope, on both the success and the failure path — which is the whole claim. */
function envelope(error: { kind: string; message: string } | null, data?: unknown): string {
  return error
    ? JSON.stringify({ ok: false, error: { ...error, exit_code: 2, retryable: false } })
    : JSON.stringify({ ok: true, data });
}

const verb = args[0];
switch (verb) {
  case "--version":
  case "-V":
    // Machine-first here too: a version is a value in a document, not a bare string. Answered
    // from a constant, so it needs no configuration and survives an unusable HOME — which is
    // what D1 sends a second probe to check.
    process.stdout.write(`${envelope(null, { name: "fixture", version: "1.0.0" })}\n`);
    break;
  case "--help":
  case "-h":
    // Prose, on purpose. A machine-first CLI is not obliged to answer help as a document.
    process.stdout.write(HELP);
    break;
  case "list":
    process.stdout.write(
      args.includes("--human") ? "no items\n" : `${envelope(null, { items: [] })}\n`,
    );
    break;
  case undefined:
    process.stderr.write(`${envelope({ kind: "usage", message: "no command given" })}\n`);
    process.exitCode = 2;
    break;
  default:
    // THE CLAUSE B5 CHECKS. The declaration says machine mode is the default, so a parser error
    // must arrive as a document with no selector sent. A target declaring the default and
    // answering here in prose fails B5 — that is what makes the declaration falsifiable, and why
    // it is a declaration rather than an inference the kit makes on the target's behalf.
    process.stderr.write(`${envelope({ kind: "usage", message: `unknown command: ${verb}` })}\n`);
    process.exitCode = 2;
}
