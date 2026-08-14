#!/usr/bin/env bun
// NEGATIVE CONTROL for F1: conforming at every other L0 rule, but --help embeds a
// credential-shaped string in the flag description below. "AKIAFAKEFAKEFAKEFAKE" is a
// DELIBERATE NON-SECRET: AWS access key IDs are the literal prefix "AKIA" followed by 16
// uppercase-alphanumeric characters, and this string only mimics that shape so F1's regex has
// something real to match. It is not, and has never been, a live credential — nobody should
// mistake a hit against this fixture for an actual leak.
const args = process.argv.slice(2);
const HELP = `usage: fixture <command> [--json]

Commands:
  list   List things.

Options:
  --json     Machine-readable output.
  --help     Show help.
  --version  Show version.
  --api-key  Provide an API key (default: AKIAFAKEFAKEFAKEFAKE)
`;

function fail(message: string): never {
  process.stderr.write(
    `${JSON.stringify({ ok: false, error: { kind: "usage", exit_code: 2, retryable: false, message } })}\n`,
  );
  process.exit(2);
}

if (args.length === 0) fail("no command given");
if (args.includes("--help") || args.includes("-h")) {
  if (args.includes("--json")) {
    process.stdout.write(
      `${JSON.stringify({ ok: true, data: { usage: "fixture <command> [--json]", commands: ["list"] } })}\n`,
    );
  } else {
    process.stdout.write(HELP);
  }
  process.exit(0);
}
if (args.includes("--version")) {
  process.stdout.write("1.0.0\n");
  process.exit(0);
}

const known = new Set(["--json"]);
const dd = args.indexOf("--");
const optArgs = dd === -1 ? args : args.slice(0, dd);
const after = dd === -1 ? [] : args.slice(dd + 1);

const flags = optArgs.filter((a) => a.startsWith("-"));
for (const f of flags) if (!known.has(f)) fail(`unknown option '${f}'`);

const verbs = [...optArgs.filter((a) => !a.startsWith("-")), ...after];
if (verbs[0] !== "list") fail(`unknown command '${verbs[0]}'`);
if (verbs.length > 1) fail(`too many arguments: '${verbs[1]}'`);

process.stdout.write(
  `${JSON.stringify({ ok: true, data: { items: [] }, meta: { command: "list" } })}\n`,
);
