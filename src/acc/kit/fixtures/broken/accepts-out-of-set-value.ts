#!/usr/bin/env bun
// NEGATIVE CONTROL for A7: help advertises `--format=<text|json>` as a closed set, and the
// parser accepts anything at all — silently falling back to the default rendering. This is the
// shape recorded in the archaeology as `--format josn` → exit 0, where the caller asked for one
// thing, received another, and was told the run succeeded.
//
// FLAGS-ONLY, with no verbs, and that is what makes the defect reachable without one. A
// verb-dispatching CLI answers a verbless probe on its missing-verb path, so the bad value is
// never read and A7 reports `unverified` rather than a violation — which is a limit of the
// probe, not a property of this defect. A reporter driven entirely by flags is the honest shape
// to write the control against, and the bare invocation is still a usage error (D2).
//
// It also fails C2, and that is the same defect counted twice rather than a second one: an
// out-of-set value IS a usage error, so answering it with 0 while every other usage error
// answers 2 is exactly the inconsistency C2 contrasts.
const args = process.argv.slice(2);
const HELP = `usage: fixture [--format=<text|json>] [--json]

Options:
  --format=<text|json>  Output format.
  --json                Machine-readable output.
  --help                Show help.
  --version             Show version.
`;

function fail(message: string): never {
  process.stderr.write(
    `${JSON.stringify({ ok: false, error: { kind: "usage", exit_code: 2, retryable: false, message } })}\n`,
  );
  process.exit(2);
}

if (args.length === 0) fail("no arguments given");
if (args.includes("--help") || args.includes("-h")) {
  if (args.includes("--json")) {
    process.stdout.write(
      `${JSON.stringify({ ok: true, data: { usage: "fixture [--format=<text|json>]" } })}\n`,
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
const dd = args.indexOf("--");
const optArgs = dd === -1 ? args : args.slice(0, dd);
const after = dd === -1 ? [] : args.slice(dd + 1);

let format = "text";
const seen: string[] = [];
for (let i = 0; i < optArgs.length; i++) {
  const token = optArgs[i] as string;
  if (!token.startsWith("-")) {
    seen.push(token);
    continue;
  }
  if (token === "--json") {
    format = "json";
    continue;
  }
  // THE DEFECT, in both spellings so neither half of A7's probe finds an accidentally-correct
  // parser. The value is read, never checked against the advertised set, and an unrecognised one
  // leaves `format` at its default — so the caller is answered in a shape it did not ask for, at
  // exit 0, with nothing anywhere to say so.
  if (token === "--format" || token.startsWith("--format=")) {
    const value = token === "--format" ? optArgs[++i] : token.slice("--format=".length);
    if (value === "text" || value === "json") format = value;
    continue;
  }
  fail(`unknown option '${token}'`);
}

const positionals = [...seen, ...after];
if (positionals.length > 0) fail(`unexpected argument: '${positionals[0]}'`);

process.stdout.write(
  format === "json" ? `${JSON.stringify({ ok: true, data: { items: [] } })}\n` : "no items\n",
);
