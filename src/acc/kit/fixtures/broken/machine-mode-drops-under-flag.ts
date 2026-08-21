#!/usr/bin/env bun
// Advertises --json. Answers a BARE parser error as JSON, but the SAME error under --json in
// prose — the "format resolved only from tokens parsed before the parser stopped" defect.
//
// `--help --json` returns a document, and that is load-bearing rather than decoration: a flag is
// matched out of help by SPELLING, and `--json <file>  Treat the input file as JSON` is an
// ordinary entry belonging to a text-only CLI that would answer every probe here in prose while
// having broken nothing. Without one path where `--json` demonstrably selects something, this
// fixture's defect is indistinguishable from that innocent shape and B5 reports `unverified`
// instead — correctly, on the evidence. Showing the mode work somewhere is what makes the drop a
// defect rather than a guess.
const a = process.argv.slice(2);
const HELP = `usage: liar <cmd>\n\nOptions:\n  --json  Machine-readable output.\n  --help  Show help.\n`;
if (a[0] === "--help") {
  process.stdout.write(a.includes("--json") ? '{"ok":true,"data":{"usage":"liar"}}\n' : HELP);
  process.exit(0);
}
if (a[0] === "list") {
  process.stdout.write('{"ok":true,"data":[]}\n');
  process.exit(0);
}
if (a.includes("--json")) {
  process.stderr.write(`liar: unknown option ${a[0]}\n`);
  process.exitCode = 2;
} else {
  process.stderr.write(
    `{"ok":false,"error":{"kind":"usage","message":"unknown option ${a[0]}"}}\n`,
  );
  process.exitCode = 2;
}
