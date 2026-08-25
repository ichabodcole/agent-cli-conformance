#!/usr/bin/env bun
// A CLI with NO VERBS: its first positional is a search pattern, the way `rg`'s is. Not a broken
// fixture — this is a legitimate and common shape, which is the point. It is here so the three
// checkers that read `<cli> acc-probe-xyzzy-verb` as an unknown command can be run against a
// target for which that reading is simply false, and their verdicts pinned as WRONG.
//
// The behaviour is `ripgrep` 15.2.0's, reproduced from the blind trial
// (docs/reports/2026-08-23-blind-trial-ripgrep.md):
//
//   $ printf '' | rg acc-probe-xyzzy-verb ; echo $?   ->  1   (no match — a documented SUCCESS)
//   $ rg --acc-probe-xyzzy-flag           ; echo $?   ->  2   (a real usage error)
//   $ rg                                  ; echo $?   ->  2   (no pattern given)
//
// So A2 reports `pass` for a rejection that never happened, A3 reports `fail` about the wording
// of a diagnostic nothing emitted, and C2 collects `(2,1,2)` and calls a clean taxonomy
// inconsistent. Nothing in this branch fixes that; the tests beside it assert the verdicts are
// unchanged AND that each one now says what it assumed.
const args = process.argv.slice(2);

const HELP = `usage: fixture <pattern> [--count]

Search stdin for <pattern>. There are no subcommands.

Options:
  --count    Print the number of matching lines.
  --help     Show help.
  --version  Show version.
`;

function usage(message: string): never {
  process.stderr.write(`fixture: ${message}\n`);
  process.exit(2);
}

if (args.includes("--help") || args.includes("-h")) {
  process.stdout.write(HELP);
  process.exit(0);
}
if (args.includes("--version")) {
  process.stdout.write("1.0.0\n");
  process.exit(0);
}

const known = new Set(["--count"]);
const dd = args.indexOf("--");
const optArgs = dd === -1 ? args : args.slice(0, dd);
const positionals = [
  ...optArgs.filter((a) => !a.startsWith("-")),
  ...(dd === -1 ? [] : args.slice(dd + 1)),
];
for (const token of optArgs) {
  if (token.startsWith("-") && !known.has(token)) usage(`unrecognized flag '${token}'`);
}

// The bare invocation IS a usage error here — a pattern is required — which is what makes the
// exit codes C2 collects `(2,1,2)` rather than `(2,1,0)`.
if (positionals.length === 0) usage("missing <pattern>");

// The search itself. stdin is closed under every probe, so there is nothing to match: exit 1,
// both streams empty. That code means NO MATCH, and no part of it is a rejection of the pattern.
process.exit(1);
