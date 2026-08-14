#!/usr/bin/env bun
// NEGATIVE CONTROL for E1: conforming on --help, but every other invocation waits for input
// that will never come. stdin is closed by the runner (see runner.ts), so this genuinely never
// terminates on its own — it is killed by the deadline, not by anything it does itself. That is
// the point: E1 exists to prove the deadline is what saves you, and a fixture that terminates by
// itself would prove nothing about deadline enforcement.
const args = process.argv.slice(2);
if (args.includes("--help")) {
  process.stdout.write("usage: hangs\n\nOptions:\n  --help\n");
  process.exit(0);
}
process.stderr.write("Continue? [y/N] ");
await new Promise(() => {}); // never resolves
