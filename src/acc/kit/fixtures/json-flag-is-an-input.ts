#!/usr/bin/env bun
// A HUMAN-FIRST CLI whose `--json` has nothing to do with output mode: it names the input file
// and says to read it as JSON. The spelling is a machine-mode selector; the meaning is not.
//
// This is the false-positive control for the selector path. Discovery finds `--json` in help by
// spelling alone, so three CORE rules — B3, B5 and D1 — used to probe this target in a "machine
// mode" it never had, get prose back because prose is the only thing it emits, and report three
// core violations against a CLI that breaks no rule. Real CLIs are shaped this way: `--json` for
// an input format, `--format` for a source-code formatter, `--output` for a destination path.
//
// The fix is not a longer list of spellings to exclude — it is that a selector has to be
// CORROBORATED before anything may be condemned under it. Nothing this fixture emits under
// `--json` ever parses as a document, so the flag is never established as a selector and those
// three rules report `unverified` with that reason. A CLI whose `--json` genuinely works is
// unaffected: see broken/machine-mode-help-not-json.ts, which still FAILS B3 because its
// `--version --json` returns a document and its `--help --json` does not.
//
// D3 PASSES this fixture — "help advertises --json" — on exactly the spelling the core rules now
// refuse to condemn on, and that asymmetry is the design rather than a leftover. D3 is
// `diagnostic`: it reports, it gates nothing, and its page already says it measures whether a
// flag is named. Inference is allowed to decide what is worth looking at; only observation may
// fail a build. So the same evidence that is enough for a reported line is not enough for a core
// violation, and the fixture is a live demonstration of both halves at once.
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
