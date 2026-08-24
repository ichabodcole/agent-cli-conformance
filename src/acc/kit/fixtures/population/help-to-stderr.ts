#!/usr/bin/env bun
// THE ODD ONE OUT ON HELP — a model of `mind-mapper` in
// docs/reports/2026-08-24-eight-owner-clis.md §2, whose entire row of the table is one cell
// repeated: `2`/0/212 for the bare invocation, `--help`, `-h`, `--version`, an unknown flag and
// an unknown verb alike. It has no help screen at all, only a usage line, and that line goes to
// STDERR at exit 2.
//
// Divergence (b) is the reason it is here: three tools in one toolset answer `--help` three ways,
// and "help goes to stdout at 0" versus "help goes to stderr at 2" is the half of that split the
// observations can express. The half they cannot — prose on stdout versus JSON on stdout — is
// modelled by exits-1-with-version.ts and documented where the test asserts what is missing.
const USAGE = "usage: fixture <open|state|tail|projects|ingest|activity>\n";

// EVERY path, with no branch on argv: that is the shape, not a simplification of it. A single
// `die()` at the top of a dispatch table is what the real tool does.
process.stderr.write(USAGE);
process.exit(2);
