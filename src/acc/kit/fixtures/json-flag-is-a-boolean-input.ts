#!/usr/bin/env bun
// A HUMAN-FIRST CLI whose `--json` is a BOOLEAN and still has nothing to do with output mode: it
// asks the tool to check that the input parses as JSON. Text-only, breaks nothing.
//
// Nothing in its spelling, its arity, or anything observable from outside separates it from a real
// mode switch. That is the point: it is the fixture proving the kit does not try. A machine mode is
// DECLARED or it is unverified, and this target declares nothing, so no rule may condemn it for
// one.
//
// Its sibling `json-flag-is-an-input.ts` takes a value, so the flag is not even counted as a bare
// switch. Keep both — they are stopped at different points and collapsing them would leave one of
// those points untested.
const args = process.argv.slice(2);
const HELP = `usage: fixture check <file> [--json]

Commands:
  check   Validate a data file.

Options:
  --json          Check that the input parses as JSON.
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
  if (a === "--json") continue; // boolean: asks for an input check, changes no output
  if (a.startsWith("-")) fail(`unknown option '${a}'`);
  rest.push(a);
}

const verbs = [...rest, ...after];
if (verbs[0] !== "check") fail(`unknown command '${verbs[0]}'`);
process.stdout.write("ok\n");
