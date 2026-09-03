#!/usr/bin/env bun
// THE FIXTURE THAT KEEPS THE CAPTURE HONEST. Every one of these is a tool talking about flags in
// its rejection, and NONE of them is a tool declaring its accepted set. A pattern loose enough to
// match any of them would manufacture a flag surface out of ordinary error text, and the resulting
// report would put words in the target's mouth — the precise failure `docs/wiki/concepts/probing.md`
// forbids when it permits a spelling to choose a probe and forbids it from reaching a verdict.
//
// The traps, one per line of the document below:
//
//   `message`    — names the offending flag, and points at help for the list. A signpost, not a
//                  list. Separated from a real declaration only by punctuation, which is why the
//                  marker requires the colon.
//   `hint`       — carries the marker phrase AND a colon, and then says where to look instead of
//                  saying what. Reading tokens until the first non-flag is what refuses it, and
//                  the first token here is a word.
//   `choices`    — a closed set the target really is declaring, of SUBCOMMANDS. `acc`'s own
//                  envelope emits exactly this on an unknown flag. Refused on its members.
//   `flags`      — the caller's own input, echoed. A capture that trusted an unqualified key would
//                  report the sentinel we just sent as a flag this tool accepts. "Enumerated zero
//                  flags" is the one output this whole capture exists to avoid.
//
// The fifth trap, `validFlags: []` — the right key, empty — has its own single-trap fixture,
// `enumerates-nothing-explicitly.ts`.
const args = process.argv.slice(2);

if (args.includes("--help")) {
  process.stdout.write("usage: fixture <list|sync> [--format=<text|json>]\n");
  process.exit(0);
}

const unknown = args.find((a) => a.startsWith("-") && a.split("=")[0] !== "--format");
if (unknown) {
  process.stderr.write(
    `${JSON.stringify({
      ok: false,
      error: {
        kind: "usage",
        message: `unknown option ${unknown} — run --help to see the valid flags`,
        hint: "valid flags: see the manual",
        choices: ["list", "sync"],
        flags: [unknown],
      },
    })}\n`,
  );
  process.exit(2);
}
process.stdout.write(`${JSON.stringify({ ok: true, data: {} })}\n`);
