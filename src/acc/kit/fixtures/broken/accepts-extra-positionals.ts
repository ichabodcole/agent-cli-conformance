#!/usr/bin/env bun
// NEGATIVE CONTROL for A2: rejects unknown FLAGS correctly, but accepts any verb and any
// number of positionals at exit 0. This is the cobra shape.
const args = process.argv.slice(2);
if (args.includes("--help")) {
  process.stdout.write(
    "usage: broken2 <command>\n\nCommands:\n  list   List things.\n\nOptions:\n  --json\n  --help\n",
  );
  process.exit(0);
}
if (args.length === 0) {
  process.stderr.write("usage: broken2 <command>\n");
  process.exit(2);
}
for (const a of args) {
  if (a.startsWith("-") && a !== "--json") {
    process.stderr.write(`error: unknown option '${a}'\n`);
    process.exit(2);
  }
}
process.stdout.write("{}\n");
process.exit(0);
