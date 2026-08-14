#!/usr/bin/env bun
// NEGATIVE CONTROL for A6: conforming in every other respect, but never treats `--` as an
// end-of-options terminator. It tolerates the literal `--` token itself (so it doesn't choke on
// `--` the same way the pre-fix conforming fixture did — that would be a useless negative
// control, since A6's check only fires when stderr names the SENTINEL) but keeps scanning
// everything AFTER `--` for flag-shaped tokens instead of passing it through as positional
// data. `-- --acc-probe-xyzzy-value` is rejected as an unknown option, not accepted as a value.
const args = process.argv.slice(2);
const HELP = `usage: fixture <command> [--json]

Commands:
  list   List things.

Options:
  --json     Machine-readable output.
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

const known = new Set(["--json"]);
const flags = args.filter((a) => a.startsWith("-") && a !== "--");
for (const f of flags) if (!known.has(f)) fail(`unknown option '${f}'`);

const verbs = args.filter((a) => !a.startsWith("-"));
if (verbs[0] !== "list") fail(`unknown command '${verbs[0]}'`);
if (verbs.length > 1) fail(`too many arguments: '${verbs[1]}'`);

process.stdout.write(
  `${JSON.stringify({ ok: true, data: { items: [] }, meta: { command: "list" } })}\n`,
);
