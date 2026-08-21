#!/usr/bin/env bun
// A CLI whose BARE INVOCATION PRINTS HELP and exits 0 — deliberately, the way many well-liked
// tools do. Conforming at every other L0 rule.
//
// It exists for the waiver case, which the first outside adopter found unreachable. D2 says a bare
// invocation must be a usage error; this tool disagrees on purpose and waives D2. But C2 was
// reading the SAME observation as one of four usage-error shapes, so it went on failing on that
// byte and the gate stayed red — leaving no configuration that says "bare help is deliberate" and
// reaches exit 0, and pushing an honest project to record a permanent design decision as debt.
//
// So the assertion is a pair, and both halves matter:
//   with `{"rules": {"D2": {"severity": "off", ...}}}`   → conformant, exit 0
//   with no config at all                                → D2 and C2 both fail
//
// And E1 and G1 must keep their verdicts on that same observation either way. Their premises do
// not depend on it being an error — one asks whether the target blocked, the other whether it died
// by a fault — so a waiver of D2 says nothing about them. Stripping the observation instead of
// withdrawing the premise would have silently taken evidence they are entitled to.
const args = process.argv.slice(2);

const HELP = `fixture — bare invocation prints help, by design

Usage:
  fixture list [--json]        List things.
  fixture --version            The version.
  fixture --help               This text.

Options:
  --json     Machine-readable output.
`;

const machine = args.includes("--json");

function usage(message: string): never {
  process.stderr.write(
    machine
      ? `${JSON.stringify({ ok: false, error: { kind: "usage", exit_code: 2, retryable: false, message } })}\n`
      : `fixture: ${message}\n`,
  );
  process.exit(2);
}

const verb = args[0];
switch (verb) {
  case "--help":
  case "-h":
  case undefined: // THE DESIGN DECISION: no arguments means "show me what you can do".
    process.stdout.write(
      machine ? `${JSON.stringify({ ok: true, data: { usage: HELP } })}\n` : HELP,
    );
    break;
  case "--version":
  case "-V":
    process.stdout.write(machine ? '{"ok":true,"data":{"version":"1.0.0"}}\n' : "1.0.0\n");
    break;
  case "list":
    process.stdout.write(machine ? '{"ok":true,"data":[]}\n' : "no items\n");
    break;
  default:
    usage(`unknown command: ${verb}`);
}
