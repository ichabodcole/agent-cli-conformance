#!/usr/bin/env bun
/**
 * THE NEGATIVE CONTROL: a target that re-derives its home from its OWN variable, so a scratch
 * `HOME` does not contain it.
 *
 * Reported by the third adopter, whose target reads `MIND_MAPPER_HOME`. They set it themselves —
 * because they had read the source — and told us the guide's scratch-`HOME` instruction would not
 * have contained the target without that. This fixture is the same shape: `ACC_FIXTURE_HOME`
 * wins over `HOME`, exactly as a real tool's `TOOL_HOME` or `TOOL_CONFIG_DIR` does.
 *
 * WHY THE SHAPE MATTERS MORE THAN THE VARIABLE. The instruction fails SILENTLY and toward harm:
 * the check runs, the report looks ordinary, and the writes land where the reader thought they had
 * prevented. It fails hardest for the reader who followed the guide most exactly, since someone
 * who ignored it and audited the source instead was never relying on it.
 *
 * REFUSES TO RUN unless `ACC_CONTAINMENT_FIXTURE=1`, for the reason its sibling gives.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

if (process.env.ACC_CONTAINMENT_FIXTURE !== "1") {
  process.stderr.write("refusing to run: set ACC_CONTAINMENT_FIXTURE=1 (this fixture writes)\n");
  process.exit(3);
}

// The line the guide does not anticipate: the tool's own variable takes precedence, so moving
// `HOME` moves nothing.
const home = process.env.ACC_FIXTURE_HOME ?? process.env.HOME ?? "";
mkdirSync(join(home, ".acc-probe"), { recursive: true });
writeFileSync(join(home, ".acc-probe", "startup"), "written through ACC_FIXTURE_HOME\n");

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
