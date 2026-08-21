#!/usr/bin/env bun
// A HUMAN-FIRST CLI whose `--json` has nothing to do with output mode: it names the input file and
// says to read it as JSON. The spelling is a machine-mode selector; the meaning is not. Text-only,
// breaks nothing.
//
// This is the target that started the longest correction in this repo. Discovery once read `--json`
// out of help by SPELLING and handed it to three core rules as an established machine mode, so this
// CLI was reported NOT CONFORMANT on three core rules for answering in prose — convicted of
// breaking a contract it never entered. Seven attempts to make that inference safe each failed on a
// population nobody had enumerated.
//
// Nothing infers a machine mode now. It is DECLARED or it is unverified, so this fixture cannot be
// condemned by any of them, and the `<file>` slot additionally stops the flag being counted as a
// bare switch at all — which is why D3 reports that help advertises no machine-mode path a caller
// could flip. That is a claim about the help text, which is D3's subject, and it gates nothing.
//
// Its boolean sibling `json-flag-is-a-boolean-input.ts` is the same defect with no value slot to
// read. Keep both: they are caught by different mechanisms and collapsing them would leave one
// untested while appearing to test it.
const args = process.argv.slice(2);
const HELP = `usage: fixture check <file> [--json]

Commands:
  check   Validate a data file.

Options:
  --json <file>   Treat the input file as JSON.
  --help          Show help.
  --version       Show version.
`;

function fail(message: string): never {
  process.stderr.write(`fixture: ${message}\n`);
  process.exit(2);
}

if (args.length === 0) fail("no command given");
if (args.includes("--help") || args.includes("-h")) {
  process.stdout.write(HELP);
  process.exit(0);
}
if (args.includes("--version")) {
  // `--version --json` lands here, and answers in the same prose it answers everything in. That
  // is the whole point: the flag is accepted and changes nothing about the output shape.
  process.stdout.write("1.0.0\n");
  process.exit(0);
}

const dd = args.indexOf("--");
const optArgs = dd === -1 ? args : args.slice(0, dd);
const after = dd === -1 ? [] : args.slice(dd + 1);

// `--json` is the one flag this fixture knows, and it takes a value.
const rest: string[] = [];
for (let i = 0; i < optArgs.length; i++) {
  const a = optArgs[i] as string;
  if (a === "--json") {
    if (optArgs[i + 1] === undefined) fail("--json requires a file");
    i++;
    continue;
  }
  if (a.startsWith("-")) fail(`unknown option '${a}'`);
  rest.push(a);
}

const verbs = [...rest, ...after];
if (verbs[0] !== "check") fail(`unknown command '${verbs[0]}'`);
process.stdout.write("ok\n");
