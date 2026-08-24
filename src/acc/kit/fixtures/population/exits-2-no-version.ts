#!/usr/bin/env bun
// THE MAJORITY OF THE POPULATION — a model of the six Spellbook spells in
// docs/reports/2026-08-24-eight-owner-clis.md §2, which produced one verdict vector six times
// over: help on stdout at exit 0, every rejection on stderr at exit 2, and NO `--version` flag,
// so `--version` falls through as an unknown verb and dies at 2 with an empty stdout.
//
// It exists for `acc compare`, not for a checker. What matters about it is not whether it
// conforms — it does not; C2 and D2 fail here exactly as they fail on the real six — but that
// its ANSWERS differ from the other two fixtures in this directory in the three specific ways
// the report measured by hand. See src/acc/commands/compare.test.ts.
const args = process.argv.slice(2);

const HELP = `fixture — a spell-shaped CLI

Usage:
  fixture list                 List things.
  fixture --help               This text.
`;

function die(message: string): never {
  process.stderr.write(`fixture: ${message}\n`);
  process.exit(2);
}

const verb = args[0];
switch (verb) {
  // The bare invocation prints help at exit 0, which is D2's violation and is what the six
  // spells do. Kept because divergence (b) is about WHERE help goes, and a fixture that
  // answered the bare probe differently from the real ones would compare a tool nobody has.
  case undefined:
  case "--help":
  case "-h":
    process.stdout.write(HELP);
    break;
  case "list":
    process.stdout.write("no items\n");
    break;
  // NO `--version` CASE. That is the fixture's whole point on divergence (c): the flag is not
  // absent from the help text and handled anyway, it is not handled at all, so it arrives here.
  default:
    die(verb.startsWith("-") ? `unknown option: ${verb}` : `unknown command: ${verb}`);
}
