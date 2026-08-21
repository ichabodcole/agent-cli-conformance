#!/usr/bin/env bun
// NEGATIVE CONTROL for B3: advertises --json in its help text, so discovery finds a
// machine-mode flag — but `--help --json` still returns the plain-text usage screen instead of
// a JSON document, ignoring --json on the one path B3 actually probes.//
// NOTE: with inference gone this target is not condemned for its machine mode at all unless it
// declares one. Advertising `--json` and doing nothing with it is a real defect that no L0 rule
// can reach, and inventing a verdict for it is what this catalogue spent seven attempts undoing.
const args = process.argv.slice(2);
const HELP = `usage: broken4 <command> [--json]

Commands:
  list   List things.

Options:
  --json     Machine-readable output.
  --help     Show help.
`;

if (args.length === 0) {
  process.stderr.write("usage: broken4 <command>\n");
  process.exit(2);
}
if (args.includes("--help") || args.includes("-h")) {
  process.stdout.write(HELP); // the defect: --json is ignored here, even paired with --help
  process.exit(0);
}
for (const a of args) {
  if (a.startsWith("-") && a !== "--json") {
    process.stderr.write(`unknown option '${a}'\n`);
    process.exit(2);
  }
}
if (args[0] !== "list") {
  process.stderr.write(`unknown command '${args[0]}'\n`);
  process.exit(2);
}
process.stdout.write(`${JSON.stringify({ items: [] })}\n`);
process.exit(0);
