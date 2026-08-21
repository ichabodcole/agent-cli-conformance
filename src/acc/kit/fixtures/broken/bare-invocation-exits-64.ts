#!/usr/bin/env bun
// A bare invocation that is NOT a help path: it exits 64 while every other usage error exits 2.
//
// The regression fixture for a hole in the waiver logic. Waiving D2 declares "a bare invocation
// is a help path for my tool", and a help path exits 0 — so excluding the shape on the waiver
// ALONE let this target's genuine inconsistency disappear: C2 passed over (2,2), and D2's own
// waived verdict happened to fail on a different clause, leaving no line anywhere in the report
// saying one error class was answered with two different codes.
//
// So the assertion is narrow: with D2 waived, C2 must STILL fail and still name the 64.
const args = process.argv.slice(2);

const HELP = `fixture — bare invocation exits 64

Usage:
  fixture list
  fixture --help
`;

if (args[0] === "--help" || args[0] === "-h") {
  process.stdout.write(HELP);
  process.exit(0);
}
if (args.length === 0) {
  // Not 0, and not 2 either — the disagreement this fixture exists to preserve.
  process.stdout.write(HELP);
  process.exit(64);
}
process.stderr.write(`fixture: unknown command: ${args[0]}\n`);
process.exitCode = 2;
