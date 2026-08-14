#!/usr/bin/env bun
// NEGATIVE CONTROL for B1 and B2: rejects unknown flags with a non-zero exit (so A1 passes),
// but writes an empty result to STDOUT alongside the error, and colours it. This is the
// `docker inspect <missing> --format json` shape: a plausible wrong answer on the success
// channel.
const args = process.argv.slice(2);
if (args.includes("--help")) {
  process.stdout.write(
    "usage: broken3 <command>\n\nCommands:\n  list   List things.\n\nOptions:\n  --json\n  --help\n",
  );
  process.exit(0);
}
if (args.length === 0) {
  process.stderr.write("usage: broken3 <command>\n");
  process.exit(2);
}
for (const a of args) {
  if (a.startsWith("-") && a !== "--json") {
    process.stdout.write("[]\n"); // the defect
    process.stderr.write(`\x1b[31merror: unknown option '${a}'\x1b[0m\n`); // and ANSI
    process.exit(2);
  }
}
process.stdout.write("[]\n");
process.exit(0);
