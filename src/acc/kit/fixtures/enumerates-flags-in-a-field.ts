#!/usr/bin/env bun
// A CLI that carries its accepted set in a STRUCTURED FIELD rather than in a sentence — the path
// the capture tries first, because a field is a shape the target chose and a sentence is one we
// are guessing at.
//
// The key is `validFlags`, and the fixture also carries a `choices` array of SUBCOMMANDS in the
// same document. That second field is not decoration: it is the shape `acc`'s own error envelope
// emits, and a capture that read `choices` without checking its members would publish this tool's
// command names as its flag surface. Every recognised member must be flag-shaped, so the two
// fields are told apart by their contents rather than by a key that happens to be spelled right.
const args = process.argv.slice(2);

const FLAGS = ["--format", "--dry-run"];
const COMMANDS = ["list", "sync"];

if (args.includes("--help")) {
  process.stdout.write("usage: fixture <command> [--format=<text|json>] [--dry-run]\n");
  process.exit(0);
}

const unknown = args.find((a) => a.startsWith("-") && !FLAGS.includes(a.split("=")[0] as string));
if (unknown) {
  process.stderr.write(
    `${JSON.stringify({
      ok: false,
      error: {
        kind: "usage",
        message: `unknown option ${unknown}`,
        validFlags: FLAGS,
        choices: COMMANDS,
      },
    })}\n`,
  );
  process.exit(2);
}
process.stdout.write(`${JSON.stringify({ ok: true, data: {} })}\n`);
