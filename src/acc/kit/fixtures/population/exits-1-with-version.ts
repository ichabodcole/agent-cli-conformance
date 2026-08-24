#!/usr/bin/env bun
// THE OTHER REPOSITORY — a model of `anthill` in
// docs/reports/2026-08-24-eight-owner-clis.md §2, written by the same author as the six spells
// and disagreeing with all of them:
//
//   (a) an unknown flag or verb exits **1**, where the other seven exit **2**. Same developer,
//       same error class, opposite convention — and A1, A2 and A3 report `PASS+` on both,
//       because each requires only "non-zero". This is the divergence the kit is structurally
//       incapable of noticing, and the reason `acc compare` compares observations.
//   (b) `--help` answers on stdout at exit 0, like the spells — but with a JSON DOCUMENT rather
//       than prose. Held here deliberately as the case the comparison CANNOT see: a report
//       carries `stdoutBytes` and `stdoutDigest`, never the bytes, so this row is "stdout, exit
//       0" beside the spells' "stdout, exit 0" and only the byte counts differ, exactly as they
//       differ between any two tools' help screens.
//   (c) `--version` is answered, in a population where seven of eight have no such flag.
const args = process.argv.slice(2);

const envelope = (data: unknown) =>
  `${JSON.stringify({ ok: true, data, meta: { command: "fixture" } })}\n`;

/** Exit 1 — the whole point. Not a typo, and not a shape any rule in the catalogue objects to. */
function die(message: string): never {
  process.stderr.write(
    `${JSON.stringify({ ok: false, error: message, meta: { command: "fixture" } })}\n`,
  );
  process.exit(1);
}

const verb = args[0];
switch (verb) {
  case undefined:
    process.stdout.write(envelope({ name: "fixture", commands: ["list", "help"] }));
    break;
  case "--help":
  case "-h":
    process.stdout.write(envelope({ name: "fixture", description: "Project orchestration CLI" }));
    break;
  case "--version":
  case "-V":
    process.stdout.write(envelope({ version: "2.3.0" }));
    break;
  case "list":
    process.stdout.write(envelope({ items: [] }));
    break;
  default:
    die(verb.startsWith("-") ? `Unknown option: ${verb}` : `No command specified: ${verb}`);
}
