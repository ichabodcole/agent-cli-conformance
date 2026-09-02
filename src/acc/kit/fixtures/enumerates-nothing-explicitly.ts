#!/usr/bin/env bun
// THE SINGLE TRAP: an unknown-flag rejection carrying the RIGHT key, `validFlags`, empty. Nothing
// is being declared here — an empty array is as likely a serializer that dropped its contents as a
// tool with no flags — and "enumerated zero flags" is the one output this whole capture exists to
// avoid. No other recognised key is present, so this fixture tests that trap alone.
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
        validFlags: [],
      },
    })}\n`,
  );
  process.exit(2);
}
process.stdout.write(`${JSON.stringify({ ok: true, data: {} })}\n`);
