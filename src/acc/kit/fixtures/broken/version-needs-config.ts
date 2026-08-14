#!/usr/bin/env bun
// NEGATIVE CONTROL for D1: conforming at every other L0 rule, but --version reads HOME and
// fails when it's unusable. The defect is that version dispatch got wired up after config
// resolution instead of before it, so the one invocation that's supposed to work against any
// environment doesn't. D1's plain probe (run with the real, existing HOME) still passes; only
// its hostile probe (HOME pointed at a directory that doesn't exist) trips this — which is the
// point: a --version that needs configuration is useless as a first probe against an unknown
// build.
import { existsSync, statSync } from "node:fs";

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
  const home = process.env.HOME;
  if (!home || !existsSync(home) || !statSync(home).isDirectory()) {
    process.stderr.write(
      `${JSON.stringify({
        ok: false,
        error: {
          kind: "config",
          exit_code: 1,
          retryable: false,
          message: "cannot resolve config directory from HOME",
        },
      })}\n`,
    );
    process.exit(1);
  }
  process.stdout.write("1.0.0\n");
  process.exit(0);
}

// Same `--` handling as conforming.ts (A6), kept even though no D1 test exercises it — this
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
