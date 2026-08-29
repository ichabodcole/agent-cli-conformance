#!/usr/bin/env bun
// A CLI THAT NAMES ITS VERB SET WHEN IT REFUSES ONE — the shape the advertised-verb census reads,
// and the only fixture in this repo that reaches its ASSERTED path.
//
// It exists because every other fixture here renders `THE COMPARISON DID NOT RUN`. That render is
// correct for them and it is the majority output on real targets, but a feature whose POSITIVE
// path has only unit coverage is a feature whose end-to-end behaviour nobody has generated — the
// defect class this project files against other people's tools.
//
// The advertisement is a `usage:` line carrying a pipe-delimited bracket group, on stderr, from the
// unknown-verb rejection. That is the LEGACY shape, chosen over a JSON `choices` envelope
// deliberately: the envelope shape is what an already-retrofitted tool emits, and the legacy shape
// is where the drift this census was reported for actually lives.
//
// Points to check against it, each of which a narrowing rule decides:
//   `<open|state|tail>`  asserts   — usage-anchored, first bracket group, piped, token-shaped
//   `<file>`             refused   — the pipe rule, not a formatting quirk
//   the SECOND group     ignored   — only the first group after the program token contributes
const args = process.argv.slice(2);
const VERBS = ["open", "state", "tail"];

if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
  // The bare invocation and `--help` share this text. It carries NO `usage:` bracket group, so the
  // census must not read a verb set from here — the provenance rule admits the bare capture, and
  // the narrowing stack is what refuses this one.
  process.stdout.write("A fixture that advertises its verbs when it refuses one.\n");
  process.exit(args.length === 0 ? 2 : 0);
}

if (args[0] === "--version") {
  process.stdout.write("advertises-its-verbs 1.0.0\n");
  process.exit(0);
}

if (args[0]?.startsWith("-")) {
  process.stderr.write(`unknown flag: ${args[0]}\n`);
  process.exit(2);
}

if (!VERBS.includes(args[0] as string)) {
  // THE ADVERTISEMENT. `<file>` is a second bracket group on purpose: the census reads the first
  // group only, so a fixture that passes while contributing `file` would be a fixture that cannot
  // fail for the right reason.
  process.stderr.write(`usage: advertises-its-verbs <${VERBS.join("|")}> <file>\n`);
  process.exit(2);
}

process.stdout.write(`${args[0]}: ok\n`);
process.exit(0);
