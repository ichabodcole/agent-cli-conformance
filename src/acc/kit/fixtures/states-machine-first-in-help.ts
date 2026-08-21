#!/usr/bin/env bun
// A CLI that declares machine-first IN ITS HELP and has no machine-mode flag at all.
//
// The shape the reference implementation cannot test. `acc` advertises `--json`, so D3 answers on
// its flag clause and never reaches the prose branch — a structural blind spot in the positive
// control, found by an outside adopter rather than by the suite. This fixture is what closes it.
//
// It matters twice over. A statement in help is a declaration to the tool's own CALLERS, which is
// a stronger promise than a key in `acc.config.json`, and it therefore unlocks the same
// no-selector B5 probe: say it here and the kit goes and tries to falsify it. Before that wiring
// existed, a tool could make this claim in the artifact its callers read, collect a D3 pass for
// saying it, and never be checked.
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
