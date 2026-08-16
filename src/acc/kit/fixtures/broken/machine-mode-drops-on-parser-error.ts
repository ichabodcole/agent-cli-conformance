#!/usr/bin/env bun
// NEGATIVE CONTROL for B5: machine mode is real everywhere EXCEPT the parser-error path.
//
// `--help --json` returns a JSON document, so B3 passes and discovery finds `--json` — this
// fixture's machine mode is not missing, it is incomplete. An argument the parser refuses gets a
// human usage block on stderr, in every mode, because the rejection happens before anything has
// resolved a format. That is the exact shape the archaeology records being fixed twice
// independently in one repository, four days apart, by two people who each found it alone.
//
// The consequence is what makes it a rule rather than a bug: `--format json` promises an agent a
// parseable envelope on EVERY outcome. It held for errors raised inside a command and broke for
// errors raised by the parser — which is the class an agent hits most, since a wrong flag is the
// commonest way an agent gets a command wrong. An agent branching on `.ok` gets `undefined`.
//
// A3 reports `unverified` against this fixture rather than passing, and that is correct: the
// usage block does name the offending token, so A3's prose clause holds, but there is no
// envelope for its machine-mode clause to inspect.
const args = process.argv.slice(2);
const HELP = `usage: fixture <command> [--json]

Commands:
  list   List things.

Options:
  --json     Machine-readable output.
  --help     Show help.
  --version  Show version.
`;

/** THE DEFECT: a usage block, as prose, whatever the caller asked for. */
function fail(message: string): never {
  process.stderr.write(`error: ${message}\n\n${HELP}`);
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
  process.stdout.write(
    args.includes("--json")
      ? `${JSON.stringify({ ok: true, data: { version: "1.0.0" } })}\n`
      : "1.0.0\n",
  );
  process.exit(0);
}

// Same `--` handling as conforming.ts (A6).
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
