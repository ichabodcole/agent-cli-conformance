#!/usr/bin/env bun
// A machine-first CLI that SAYS SO IN HELP and declares nothing to the kit.
//
// It exists for D3, whose subject is the help text a caller reads: the prose claim moves that rule
// from `fail` to `unverified` and no further, because matching a sentence is a guess about meaning
// and a guess may not buy a pass. Two reviewers broke every version of the matcher with ordinary
// rephrasings, one of them the literal opposite ("JSON output is disabled by default").
//
// It UNLOCKS NOTHING. An earlier design let a help statement unlock the parser-error rule's
// no-selector probe, on the argument that a promise made where callers can read it deserves
// scrutiny; that reasoning is sound for a claim actually made and did not survive the matcher's
// false-positive rate — three ordinary human-first CLIs became CORE violations on one unrelated
// sentence. Measured against this fixture today: `UNVR B5 — no machine mode was DECLARED`.
// Unlocking a core check stays a deliberate, revocable act: `machineMode` in `acc.config.json`.
const args = process.argv.slice(2);

const HELP = `fixture — a machine-first tool with no flag

Usage:
  fixture list                 List things.
  fixture --help               This text.

Output:
  Prints JSON when stdout is not a terminal, and a table when it is.
`;

const envelope = (data: unknown) => `${JSON.stringify({ ok: true, data })}\n`;

switch (args[0]) {
  case "--help":
  case "-h":
    process.stdout.write(HELP);
    break;
  case "--version":
  case "-V":
    process.stdout.write(envelope({ name: "fixture", version: "1.0.0" }));
    break;
  case "list":
    process.stdout.write(envelope({ items: [] }));
    break;
  default:
    // The claim, honoured on the error path — which is where B5 goes looking.
    process.stderr.write(
      `${JSON.stringify({ ok: false, error: { kind: "usage", exit_code: 2, retryable: false, message: `unknown command: ${args[0] ?? ""}` } })}\n`,
    );
    process.exitCode = 2;
}
