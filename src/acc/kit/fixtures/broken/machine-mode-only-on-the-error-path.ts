#!/usr/bin/env bun
// A REAL machine mode that reaches only the parser-error path: `--json` produces a structured
// error document there, while help and version answer in prose under every spelling.
//
// TWO controls in one fixture, and the second was a surprise this file is kept for.
//
// B5 PASSES, on evidence it collected itself. This is the population the corroboration guard kept
// getting wrong and had no fixture for: an early cut ran the guard before the observation was even
// loaded, so a target of this shape answered B5's OWN probe with a JSON document and was told
// nothing had come back under the flag — a measured, correct pass discarded. Corroboration may
// decide whether a rule can condemn; it may never decide a rule that has already seen the answer.
//
// B3 and D1 FAIL, and that is the guard working rather than the guard failing to fire. The point
// of corroboration is never to excuse a target — it is that a flag matched from help by SPELLING
// has not yet been shown to mean anything. Here it HAS: the error document establishes that
// `--json` selects machine output, so help and version answering in prose under the same flag are
// a machine mode that does not reach where it says it does, which is exactly what those two rules
// are for. An earlier draft of this file asserted it violated nothing; running it said otherwise,
// and the fixture was moved rather than the claim defended.
const args = process.argv.slice(2);
const HELP = `usage: fixture <command>

Commands:
  list   List things.

Options:
  --json     Machine-readable output.
  --help     Show help.
  --version  Show version.
`;

if (args.includes("--help") || args.includes("-h")) {
  process.stdout.write(HELP);
  process.exit(0);
}
if (args.includes("--version")) {
  // Prose, under every spelling — the machine mode does not reach here.
  process.stdout.write("1.0.0\n");
  process.exit(0);
}
if (args[0] === "list") {
  process.stdout.write(`${JSON.stringify({ ok: true, data: { items: [] } })}\n`);
  process.exit(0);
}
// The error path, and the only place the flag changes anything.
const message = `unknown option '${args[0]}'`;
if (args.includes("--json")) {
  process.stderr.write(
    `${JSON.stringify({ ok: false, error: { kind: "usage", exit_code: 2, retryable: false, message, token: args[0] } })}\n`,
  );
} else {
  process.stderr.write(`fixture: ${message}\n`);
}
process.exit(2);
