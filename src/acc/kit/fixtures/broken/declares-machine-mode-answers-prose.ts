#!/usr/bin/env bun
// THE LIAR. Paired with `{"machineMode": "default"}`, this is a false declaration: it claims
// structured output is what it emits, and answers a parser error in prose.
//
// It exists so the falsifiability claim has a fixture that can only fail one way. The first
// attempt used `broken/no-version-flag.ts`, which also answers in prose — but that fixture's help
// advertises `--json`, so it failed through the ordinary selector path and would have stayed red
// with the whole declared branch deleted. A test that passes for the wrong reason is worse than
// no test, and an independent review caught it by reverting the branch and watching the suite
// stay green.
//
// So: NO `--json` anywhere, in help or in argv handling. The only way the kit reaches this
// target's error path is the declaration, which makes B5's verdict here a statement about the
// declaration and nothing else.
const args = process.argv.slice(2);

const HELP = `fixture — declares machine mode and does not deliver it

Usage:
  fixture list                 List things.
  fixture --help               This text.
`;

switch (args[0]) {
  case "--help":
  case "-h":
    process.stdout.write(HELP);
    break;
  case "--version":
  case "-V":
    process.stdout.write("1.0.0\n");
    break;
  case "list":
    process.stdout.write("no items\n");
    break;
  default:
    // Prose. This is the lie: the declaration says a caller gets a document here.
    process.stderr.write(`fixture: unknown command: ${args[0] ?? ""}\n`);
    process.exitCode = 2;
}
