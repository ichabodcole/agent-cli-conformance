#!/usr/bin/env bun
// D3's negative control for the case the old checker could not see.
//
// This CLI HAS a machine mode and switches into it automatically when stdout is not a terminal
// — which, under the kit's runner, it never is. So plain `--help` answers with a schema, and a
// schema necessarily spells out `--json` and `--format`. The old D3 probe scanned exactly that
// document and reported a pass, testing its own machine output rather than the human help
// surface the rule names.
//
// The HUMAN help below mentions no machine-mode flag and lists no `schema` command, so the
// honest verdict is FAIL: an agent running `--help` in a terminal learns nothing about the
// structured path. Everything else is copied from conforming.ts so D3 is the only rule this
// fixture is making a point about.
const args = process.argv.slice(2);

const HELP = `usage: fixture <command>

Commands:
  list   List things.

Options:
  --help     Show help.
  --version  Show version.
`;

const SCHEMA = JSON.stringify({
  ok: true,
  data: {
    usage: "fixture <command>",
    commands: ["list"],
    global_args: [{ name: "--json" }, { name: "--format", values: ["text", "json"] }],
  },
});

function fail(message: string): never {
  process.stderr.write(
    `${JSON.stringify({ ok: false, error: { kind: "usage", exit_code: 2, retryable: false, message } })}\n`,
  );
  process.exit(2);
}

/** Explicit beats detection, in both directions — the machine-mode precedence contract. */
function machineMode(): boolean {
  if (args.includes("--format=text")) return false;
  if (args.includes("--json") || args.includes("--format=json")) return true;
  return !process.stdout.isTTY;
}

if (args.length === 0) fail("no command given");
if (args.includes("--help") || args.includes("-h")) {
  process.stdout.write(machineMode() ? `${SCHEMA}\n` : HELP);
  process.exit(0);
}
if (args.includes("--version")) {
  process.stdout.write(
    machineMode() ? `${JSON.stringify({ ok: true, data: "1.0.0" })}\n` : "1.0.0\n",
  );
  process.exit(0);
}

// Same `--` handling as conforming.ts (A6).
const known = new Set(["--json", "--format=json", "--format=text"]);
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
