#!/usr/bin/env bun
// NEGATIVE CONTROL for D4: conforming at every other L0 rule, but help embeds a fresh random
// session id on every invocation. Two runs of `--help` therefore differ byte-for-byte, even
// though nothing else about the tool is broken — the same shape as a build timestamp or a
// hash-ordered flag list baked into help text.
const args = process.argv.slice(2);
const sessionId = crypto.randomUUID();
const HELP = `usage: fixture <command> [--json]

Commands:
  list   List things.

Options:
  --json     Machine-readable output.
  --help     Show help.
  --version  Show version.

Session: ${sessionId}
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
  // D1's machine-mode half: a caller that asked for structured output must not have to regex a
  // bare string out of stdout. The plain string survives where it belongs, in text mode.
  process.stdout.write(
    args.includes("--json")
      ? `${JSON.stringify({ ok: true, data: { version: "1.0.0" } })}\n`
      : "1.0.0\n",
  );
  process.exit(0);
}

// Same `--` handling as conforming.ts (A6), kept even though no D4 test exercises it — this
// fixture is meant to be conforming in every OTHER respect, not just the one under test.
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
