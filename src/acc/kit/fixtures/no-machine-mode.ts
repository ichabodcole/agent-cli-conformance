#!/usr/bin/env bun
// Same shape as conforming.ts and conforming at every L0 rule, but its help never advertises a
// machine-mode flag (no --json, --format, or --output anywhere in the Options block). POSITIVE
// control for B3's "unverified" branch: discovery finds `machineModeFlag: null`, so B3 has
// nothing to probe or parse and must say so rather than silently passing or guessing.
const args = process.argv.slice(2);
const HELP = `usage: fixture <command>

Commands:
  list   List things.

Options:
  --help     Show help.
  --version  Show version.
`;

function fail(message: string): never {
  process.stderr.write(
    `${JSON.stringify({ ok: false, error: { kind: "usage", exit_code: 2, retryable: false, message } })}\n`,
  );
  process.exit(2);
}

if (args.length === 0) fail("no command given");
if (args.includes("--help") || args.includes("-h")) {
  process.stdout.write(HELP);
  process.exit(0);
}
if (args.includes("--version")) {
  process.stdout.write("1.0.0\n");
  process.exit(0);
}

// Same `--` handling as conforming.ts (A6), kept even though no B3 test exercises it here —
// this fixture is meant to be conforming in every OTHER respect, not just the one under test.
const dd = args.indexOf("--");
const optArgs = dd === -1 ? args : args.slice(0, dd);
const after = dd === -1 ? [] : args.slice(dd + 1);

// No known flags at all: this fixture advertises none, so it rejects every flag it sees.
const flags = optArgs.filter((a) => a.startsWith("-"));
for (const f of flags) fail(`unknown option '${f}'`);

const verbs = [...optArgs.filter((a) => !a.startsWith("-")), ...after];
if (verbs[0] !== "list") fail(`unknown command '${verbs[0]}'`);
if (verbs.length > 1) fail(`too many arguments: '${verbs[1]}'`);

process.stdout.write(
  `${JSON.stringify({ ok: true, data: { items: [] }, meta: { command: "list" } })}\n`,
);
