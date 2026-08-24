#!/usr/bin/env bun
// A CLI whose parser NAMES ITS ACCEPTED FLAGS when it refuses one, in prose inside a machine
// document. The shape `anthill` has (measured 2026-08-24):
//
//     {"ok":false,"error":"Unknown option '--nope'. Valid flags: --format", ...}
//
// This is the capture's positive control for `prose-marker`, and it is deliberately the harder of
// the two prose cases: the sentence lives inside a JSON string, so a reader that scanned raw bytes
// would have to cope with escaping, and one that only looked for a structured FIELD would find
// nothing at all and report a tool that plainly enumerates as one that does not.
const args = process.argv.slice(2);

const FLAGS = ["--format", "--verbose"];

const HELP = `usage: fixture <command>

Options:
  --format=<text|json>  Output format.
  --verbose             More output.
  --help                Show help.
`;

if (args.includes("--help")) {
  process.stdout.write(HELP);
  process.exit(0);
}

const unknown = args.find((a) => a.startsWith("-") && !FLAGS.includes(a.split("=")[0] as string));
if (unknown) {
  process.stderr.write(
    `${JSON.stringify({
      ok: false,
      error: `Unknown option '${unknown}'. Valid flags: ${FLAGS.join(", ")}`,
    })}\n`,
  );
  process.exit(2);
}
process.stdout.write(`${JSON.stringify({ ok: true, data: {} })}\n`);
