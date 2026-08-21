#!/usr/bin/env bun
// Advertises --json. Answers a BARE parser error as JSON, but the SAME error under --json in
// prose — the "format resolved only from tokens parsed before the parser stopped" defect.
const a = process.argv.slice(2);
const HELP = `usage: liar <cmd>\n\nOptions:\n  --json  Machine-readable output.\n  --help  Show help.\n`;
if (a[0] === "--help") {
  process.stdout.write(HELP);
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
