#!/usr/bin/env bun
// A minimal CLI that satisfies every L0 rule. The kit's POSITIVE control: any checker firing
// against this is a false positive, which is the failure mode that makes a gate untrustworthy.
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
  // B3: in machine mode, even help output must parse as its declared kind — so `--help --json`
  // gets a JSON document instead of the plain-text usage screen. Plain `--help` is untouched,
  // since discovery (and A1-A6) depend on parsing that as ordinary help text.
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

// Honour `--` as the end-of-options terminator (A6): everything after the first `--` is a
// positional value, never a flag, even if it starts with `-`. Split once, up front, rather than
// filtering `-`-prefixed tokens over the whole array — that was the original bug here, which
// made this fixture reject `--` itself as an unknown option instead of ending option parsing.
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
