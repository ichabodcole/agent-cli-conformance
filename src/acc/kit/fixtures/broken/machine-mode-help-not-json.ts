#!/usr/bin/env bun
// NEGATIVE CONTROL for B3: `--json` works — `--version --json` returns a document — but
// `--help --json` still returns the plain-text usage screen, ignoring the flag on the one path
// B3 actually probes. That pairing is the realistic defect: a machine mode that exists and does
// not reach everywhere it should.
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
// `--json` DEMONSTRABLY WORKS on this path, and that is load-bearing for the fixture rather than
// incidental. A flag name alone no longer licenses a machine-mode verdict — a CLI whose `--json`
// means "treat the input file as JSON" was being failed on three core rules for answering in
// prose, so a clause now needs to have seen something structured come back under the selector.
// Without this branch the kit could not tell this fixture's real defect (machine mode works, help
// under it does not) from a flag that was never a selector, and would honestly report neither.
if (args.includes("--version") || args.includes("-V")) {
  process.stdout.write(
    args.includes("--json") ? '{"ok":true,"data":{"version":"1.0.0"}}\n' : "1.0.0\n",
  );
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
