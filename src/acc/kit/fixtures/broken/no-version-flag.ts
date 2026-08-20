#!/usr/bin/env bun
// NEGATIVE CONTROL for D1, and the regression fixture for a FALSE ACCUSATION the checker used to
// make.
//
// This CLI has no `--version` at all. The token falls through to the unknown-command branch and
// exits 2 with a message on stderr — and it never reads HOME, so the hostile-HOME probe and the
// plain probe produce byte-identical results.
//
// Until 2026-08-20 D1 reported three problems against a target of this shape: "exited 2", "wrote
// nothing to stdout", and "requires configuration (failed with an unusable HOME)". The third was
// false. The clause fired on `hostile.exitCode !== 0` alone, so any target whose `--version`
// failed for ANY reason was told it depended on configuration. Reported by the first outside
// adopter, against a real CLI of exactly this shape.
//
// The existing guard was `crashedUnverified()`, which only fires for a target that DIED. A clean
// exit 2 walks straight past it, which is why nothing in the suite caught this: every fixture and
// every real target the kit had been pointed at either had a `--version` or crashed.
//
// So the assertion this fixture exists to make is narrow and load-bearing: D1 must fail it (there
// is no version to report) while saying NOTHING about configuration.
const args = process.argv.slice(2);

const HELP = `usage: fixture <command> [--json]

Commands:
  list   List things.

Options:
  --json  Machine-readable output.
  --help  Show help.
`;

function unknown(token: string): never {
  // No HOME read, no config resolution, no filesystem access on this path — deliberately, so the
  // two D1 probes cannot differ.
  process.stderr.write(`fixture: unknown command: ${token}\n`);
  process.exit(2);
}

const verb = args[0];
switch (verb) {
  case "--help":
  case "-h":
    process.stdout.write(HELP);
    break;
  case "list":
    process.stdout.write(args.includes("--json") ? '{"ok":true,"data":[]}\n' : "no items\n");
    break;
  case undefined:
    process.stderr.write("fixture: no command given\n");
    process.exit(2);
    break;
  default:
    unknown(verb);
}
