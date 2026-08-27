#!/usr/bin/env bun
// A machine-first CLI whose help DENIES having a `--json` flag — and the kit credits it with one.
//
// THIS TARGET IS HONEST. It is machine-first, it has no mode flag, and it says both in one
// sentence. Nothing here violates a rule. The defect this fixture exists to pin is entirely the
// kit's, and it is vendored BEFORE the fix for the same reason the empty-enumeration batch was:
// the before-case is what proves the fix moved something.
//
// Found by the second adopter, on their own tool, while trying to write an honest Output line:
//
//     PASS+ D3  help advertises --json
//
// It does not. `advertises-machine-mode.ts` returns `pass` on `surface.machineModeFlag !== null`,
// and `discovery.ts` populates that from a whole-text scan whenever help has no `Options:` block
// — so the token inside the denial becomes an advertised flag.
//
// AND IT DOES NOT STOP AT D3, which is the half that makes it worth a fixture rather than a
// comment. The phantom flag lands in `Discovery.machineModeFlag`, which `machineSelector` reads,
// which `names-offending-token.ts` (A3), `stdout-carries-only-data.ts`, `no-ansi-when-piped.ts`
// and `machine-mode-holds-on-parser-error.ts` (B5) all import. One substring match steers probes
// for five rules.
//
// The adopter's own framing, and the reason the invariant it argues for is worth having: the
// damage from a partial check is not proportional to its reach, it is decided by WHICH VERDICT the
// partial reach is allowed to produce. A half-reaching check that returns `unverified` cost them
// nothing, ever. This one returned `pass`.
//
// MEASURED, single variable — this file against itself with only the Output sentence changed,
// through the whole pipeline, with `{ "defaultOutput": "json" }` declared:
//
//     "…prints JSON by default on stdout."           ->  UNVR D3 (correct),  A3 pass
//     "…has no --json flag because JSON is default"  ->  PASS+ D3 (FALSE),   A3 UNVR
//
// The declared `defaultOutput` is required to see A3 move, and it is not a trick: it is what B5
// and D1 tell an adopter to add, and the adopter who found this had added it for exactly that
// reason. The contamination reaches a tool BECAUSE it took the project's advice.
//
// The prose error path below is the second condition, and it is the shape the adopter's tool had:
// JSON on the data path, prose on the error path, which is what B5 exists to catch and what an
// adopter looks like before they have done the envelope work.
//
// Contrast with `states-machine-first-in-help.ts`, which makes the same claim in the affirmative
// and is handled correctly at `unverified`. The two differ only in whether the sentence names the
// flag it is disclaiming — and the prose route is capped at `unverified` while the token route
// next door is not, which is the asymmetry the source comment calls structurally impossible.
const args = process.argv.slice(2);

const HELP = `fixture — a machine-first tool that has no mode flag

Usage:
  fixture list                 List things.
  fixture --help               This text.

Output: fixture is machine-first and has no --json flag because JSON is the default.
`;

const envelope = (data: unknown) => `${JSON.stringify({ ok: true, data })}\n`;

switch (args[0]) {
  case "--help":
  case "-h":
    process.stdout.write(HELP);
    break;
  case "--version":
  case "-V":
    process.stdout.write(envelope({ name: "fixture", version: "1.0.0" }));
    break;
  case "list":
    process.stdout.write(envelope({ items: [] }));
    break;
  default:
    // PROSE ON THE ERROR PATH, JSON ON THE DATA PATH. That combination is not a defect and it is
    // not incidental to this fixture — it is the shape the adopter's tool had, and it is the shape
    // that makes the contamination visible. A3 follows the phantom `--json` looking for a
    // machine-mode document to read its field out of, finds prose, and drops from `pass` to
    // `unverified` — a rule losing evidence because a different rule guessed at a flag.
    //
    // Emit a JSON envelope here instead and A3 finds a document, passes, and the contamination is
    // invisible while the false `pass` on D3 remains. The first draft of this fixture did exactly
    // that, which is worth recording: the false pass is easy to reproduce and the damage it does
    // is not.
    process.stderr.write(`fixture: unknown command '${args[0] ?? ""}'\n`);
    process.exitCode = 2;
}
