#!/usr/bin/env bun
/**
 * THE POSITIVE CONTROL for the safety guide's scratch-`HOME` instruction: a target that writes
 * through `HOME` during startup, before it looks at a single argument.
 *
 * `docs/wiki/guides/how-to-establish-your-target-is-safe-to-check.md` tells a reader who cannot
 * answer "what runs before parsing?" to give the whole check a scratch `HOME`. This fixture is
 * what that instruction contains, and its sibling `re-derives-its-own-home.ts` is what it does
 * not. A claim about containment with only the arm that succeeds is not a control.
 *
 * REFUSES TO RUN unless `ACC_CONTAINMENT_FIXTURE=1`. A file whose entire purpose is to write
 * outside where it was told to should not do so because someone ran it to see what it did.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

if (process.env.ACC_CONTAINMENT_FIXTURE !== "1") {
  process.stderr.write("refusing to run: set ACC_CONTAINMENT_FIXTURE=1 (this fixture writes)\n");
  process.exit(3);
}

// BEFORE ANY ARGUMENT IS READ — the shape the guide's question 3 is about.
const home = process.env.HOME ?? "";
mkdirSync(join(home, ".acc-probe"), { recursive: true });
writeFileSync(join(home, ".acc-probe", "startup"), "written through HOME\n");

const argv = process.argv.slice(2);
if (argv[0] === "--help" || argv[0] === "-h") {
  process.stdout.write("toy — a fixture\n\nOptions:\n  --help  Show help.\n");
  process.exit(0);
}
if (argv[0] === "--version") {
  process.stdout.write("1.0.0\n");
  process.exit(0);
}
process.stderr.write(`toy: unknown option ${argv[0] ?? ""}\n`);
process.exit(2);
