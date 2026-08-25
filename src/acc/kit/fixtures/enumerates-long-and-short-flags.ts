#!/usr/bin/env bun
// A CLI whose parser NAMES ITS ACCEPTED FLAGS and whose accepted set is the universal surface
// `STANDARD.md` recommends — long flags AND their short aliases, in one list:
//
//     {"ok":false,"error":"Unknown option '--nope'. Valid flags: --help, -h, --version, -V, --format"}
//
// This is the fixture the long-only reader got wrong: it captured `[--help]` and stopped at `-h`,
// so `declaration.ts` reported three flags this program plainly accepts as `declared-not-accepted`.
// The reference target has no short aliases, which is why nothing in the tree caught it; a CLI that
// follows this project's own advice about `-h` and `-V` is exactly the population that trips it.
const args = process.argv.slice(2);

const FLAGS = ["--help", "-h", "--version", "-V", "--format"];

const HELP = `usage: fixture <command>

Options:
  --format=<text|json>  Output format.
  -h, --help            Show help.
  -V, --version         Show version.
`;

if (args.includes("--help") || args.includes("-h")) {
  process.stdout.write(HELP);
  process.exit(0);
}
if (args.includes("--version") || args.includes("-V")) {
  process.stdout.write("1.0.0\n");
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
