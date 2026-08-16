#!/usr/bin/env bun
// NEGATIVE CONTROL for F2: conforming at every other L0 rule, but sleeps ~300ms before writing
// anything, on every path including --version. 300ms is comfortably above F2's 100ms threshold
// even on a slow or loaded machine, which is what makes a `fail` assertion against this fixture
// stable — unlike the conforming fixture's own timing, which rides on `bun`'s environment-
// dependent process-startup cost and is deliberately NOT asserted to pass or fail F2.
await new Promise((resolve) => setTimeout(resolve, 300));

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
  // D1's machine-mode half: a caller that asked for structured output must not have to regex a
  // bare string out of stdout. The plain string survives where it belongs, in text mode.
  process.stdout.write(
    args.includes("--json")
      ? `${JSON.stringify({ ok: true, data: { version: "1.0.0" } })}\n`
      : "1.0.0\n",
  );
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
