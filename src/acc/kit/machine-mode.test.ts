import { describe, expect, test } from "bun:test";
import { helpStatesMachineDefault } from "./machine-mode.ts";

// The corpus an outside adopter built to attack this, plus the family it missed.
//
// They could not produce a false pass in eight attempts; every miss was a false FAIL, and those
// were systematic — the entire pipe-conditional family, which this project's own docs call the
// common shape. Including the sentence this project uses to describe ITSELF.
//
// Why the suite could not have found it: `acc` advertises `--json`, so D3 answers on its flag
// clause and never reaches the prose branch. The positive control has a structural blind spot
// here, and no amount of care in `conformance.test.ts` would have closed it. These fixtures are
// the closure.
describe("a help statement that structured output is the default", () => {
  const RECOGNISED = [
    // default-shaped
    "Data commands emit JSON on stdout by DEFAULT; pass --human for prose.",
    "Output defaults to JSON when stdout is not a terminal.",
    "The default output format is json.",
    // pipe-conditional — the family that was missed entirely
    "Prints JSON when stdout is not a terminal, and a table when it is.",
    "Output is JSON when piped, human-readable at a terminal.",
    "When stdout is not a TTY, output is JSON.",
    "JSON when piped; text at a terminal.",
    // this project's own sentence about itself, which used to fail
    "acc writes JSON when its output is piped and the human report when it is not.",
  ];

  // Each of these carries a format word, most carry "default" or "piped" too, and every one of
  // them describes a tool whose OUTPUT is text. A pass on any is a false claim about the one rule
  // whose subject is whether a caller was told the truth.
  const REFUSED = [
    "Reads JSON from stdin and prints a human-readable table.", // JSON as input
    "JSON is the default input format. Results print as a table.", // "default" + input
    "Converts JSON to CSV. Output is CSV.", // JSON as subject
    "This tool parses JSON configuration files. Output: a summary table.",
    "Validates that a file is well-formed JSON. Prints OK or the first error.",
    "Logs are written as JSON to ~/.app/log. Console output is plain text.",
    "Default: JSON output is disabled. Run with --machine to enable it.", // adjacent, opposite
    "Output format is text by default. JSON output is planned.",
    "  --format json    Output format (default: text)", // both words, opposite meaning
    "  --json           Emit JSON.  Text is the default.",
    "Pretty tables by default; use --json for machine output",
    "Prints a JSON schema. Colour is off when piped.", // must not span two sentences
  ];

  for (const help of RECOGNISED) {
    test(`recognises: ${help.slice(0, 52)}`, () => {
      expect({ help, machineFirst: helpStatesMachineDefault(help) }).toEqual({
        help,
        machineFirst: true,
      });
    });
  }

  for (const help of REFUSED) {
    test(`refuses: ${help.trim().slice(0, 52)}`, () => {
      expect({ help, machineFirst: helpStatesMachineDefault(help) }).toEqual({
        help,
        machineFirst: false,
      });
    });
  }
});
