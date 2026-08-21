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
  // Output claims that a clause-wide input scan wrongly REFUSED. A false fail costs a diagnostic
  // line, but each of these is a tool telling the truth and being marked down for it.
  const RECOGNISED = [
    "Output defaults to JSON for easy parsing",
    "Emits JSON by default so downstream tools can read it",
    "Prints JSON by default, accepted by jq",
    "The output is JSON unless stdout is a terminal",
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
  // THE DIRECTION BUG. The pipe-conditional patterns shipped without the discrimination the
  // default-shaped ones already had: they tested proximity of a format word to a pipe word and
  // stopped, so a tool that reads JSON IN and writes text OUT read as machine-first.
  //
  // The expensive direction, and the adopter said why: a statement recognised as a declaration
  // also unlocks B5, so a JSON-CONSUMING tool would have its error path measured against a
  // promise it never made — and could be failed on a CORE rule for it. A false fail costs a
  // diagnostic line; a false pass costs a build.
  const READS_IN_WRITES_OUT = [
    "JSON input is accepted when piped to stdin.",
    "Reads JSON when input is piped. Prints a table.",
    "Accepts JSON on stdin when piped; writes a CSV report.",
    "When piped, the JSON config is validated and a summary is printed.",
  ];

  // The corpus a reviewer with NO STAKE in the design produced, after two invested reviewers had
  // each declared the patterns unbreakable. Every string below returned the wrong answer at some
  // point on this branch. They are grouped by the guard that now handles them, because each group
  // is a different way for prose to look like a promise.
  const NEGATED = [
    "JSON output is disabled by default",
    "JSON is never emitted by default",
    "Do not emit JSON by default",
    "JSON output is suppressed when stdout is not a terminal",
  ];
  const WRITES_A_FILE = [
    // The clause split used to cut `coverage.json` into `coverage` + `json by default`, so ANY
    // sentence naming a `*.json` output file matched. This one turned a correct human-first CLI
    // into a core violation.
    "Coverage is written to coverage.json by default",
    "Report is saved to report.json by default",
    "Audit events are written to the log file as JSON by default",
    "Generated config files are JSON by default",
    "The lockfile is JSON by default",
    "Cache entries are stored as JSON by default under ~/.cache",
  ];
  const DOCUMENTS_A_FLAG = [
    "--json is recommended when output is piped to another program",
    "Colour is disabled when stdout is not a terminal, so pass --json for machine output",
    "--format FMT  Output format. Defaults to text; use json when piped",
    "If you want JSON by default, set MYAPP_FORMAT=json",
  ];
  const READS_IT_IN = [
    "Takes JSON when piped from another tool",
    "Expects NDJSON when piped",
    "Decodes JSON when piped",
    "Loads JSON by default",
    "The manifest it opens is JSON by default",
  ];
  const NOT_A_SENTENCE = [
    "| json | by default |",
    "Some subcommands print JSON by default; most print a table",
  ];

  const REFUSED = [
    ...NEGATED,
    ...WRITES_A_FILE,
    ...DOCUMENTS_A_FLAG,
    ...READS_IT_IN,
    ...NOT_A_SENTENCE,
    ...READS_IN_WRITES_OUT,
    // Controls: a pipe word with no output claim at all must not fire either.
    "When piped, colour is disabled and progress bars are suppressed.",
    "Pipe the JSON log to jq to filter it.",
    "When stdout is not a terminal, output is buffered.",
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
