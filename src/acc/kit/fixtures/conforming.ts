#!/usr/bin/env bun
// A minimal CLI that satisfies every L0 rule. The kit's POSITIVE control: any checker firing
// against this is a false positive, which is the failure mode that makes a gate untrustworthy.
const args = process.argv.slice(2);
// `--level` carries A7's closed set, and it is deliberately NOT `--format`: this rule is about
// any advertised set, not about output formats, and a fixture whose only set were the format
// selector would leave that untested. The attached spelling is written into the help on purpose
// — A7 sends one value outside the set as a single token, and a fixture advertising the detached
// spelling would owe an arity model it does not have.
const HELP = `usage: fixture <command> [--json]

Commands:
  list   List things.

Options:
  --json                     Machine-readable output.
  --level=<debug|info|warn>  Log level.
  --help                     Show help.
  --version                  Show version.
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
  // D1's machine-mode half: a caller that asked for structured output must not have to regex a
  // bare string out of stdout. The plain string survives where it belongs, in text mode.
  process.stdout.write(
    args.includes("--json")
      ? `${JSON.stringify({ ok: true, data: { version: "1.0.0" } })}\n`
      : "1.0.0\n",
  );
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

// A7: ONE set, BOTH spellings. `--level=warn` and `--level warn` are the same request, so a
// parser enforcing the advertised set in one of them and not the other has not enforced it —
// which is why the value is consumed by index here rather than by filtering flag-shaped tokens.
// The rejection names the value it refused, because a caller told only that something was wrong
// cannot tell which of its tokens to change.
const LEVELS = ["debug", "info", "warn"];
const positionals: string[] = [];
for (let i = 0; i < optArgs.length; i++) {
  const token = optArgs[i] as string;
  if (!token.startsWith("-")) {
    positionals.push(token);
    continue;
  }
  if (token === "--level" || token.startsWith("--level=")) {
    const value = token === "--level" ? optArgs[++i] : token.slice("--level=".length);
    if (value === undefined) fail(`--level requires a value (one of: ${LEVELS.join(", ")})`);
    if (!LEVELS.includes(value))
      fail(`invalid value for --level: '${value}' (one of: ${LEVELS.join(", ")})`);
    continue;
  }
  if (!known.has(token)) fail(`unknown option '${token}'`);
}

const verbs = [...positionals, ...after];
if (verbs[0] !== "list") fail(`unknown command '${verbs[0]}'`);
if (verbs.length > 1) fail(`too many arguments: '${verbs[1]}'`);

process.stdout.write(
  `${JSON.stringify({ ok: true, data: { items: [] }, meta: { command: "list" } })}\n`,
);
