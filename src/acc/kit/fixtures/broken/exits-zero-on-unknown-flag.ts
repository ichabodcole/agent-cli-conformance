#!/usr/bin/env bun
// NEGATIVE CONTROL for A1: accepts any flag, exits 0, and silently falls back to text output.
// This is the citty behaviour, reproduced deliberately.
const args = process.argv.slice(2);
if (args.includes("--help")) {
  process.stdout.write("usage: broken <command> [--json]\n\nOptions:\n  --json\n  --help\n");
  process.exit(0);
}
if (args.length === 0) {
  process.stdout.write("usage: broken <command>\n");
  process.exit(0); // also violates D2, deliberately
}
process.stdout.write("did the thing\n");
process.exit(0);
