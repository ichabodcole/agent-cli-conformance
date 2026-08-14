#!/bin/sh
// 2>/dev/null; printf 'acc-fixture-interpreter: sh\n'; exit 0
// ^ THIS FILE IS A POLYGLOT, on purpose. It is the fixture for R2-5: an EXECUTABLE `.ts` file
// whose shebang names something other than bun, proving `toTarget` lets the kernel decide.
//
// Read as SHELL: line 2 runs `//` (a directory, so it fails; stderr is discarded), then prints
// the marker and exits 0. Read as TYPESCRIPT: line 2 is a comment, and the only statement is
// the `export {}` below — so if the old `.ts`-means-bun override ever comes back, bun runs this
// file, prints NOTHING, and the test asserting the marker fails. That is the point: the
// assertion has to be able to fail.
//
// The alternative was a fixture in a language this repo does not otherwise depend on (Deno,
// Node with type stripping), which would make the test's outcome depend on what happens to be
// installed. `/bin/sh` is on every machine that can run the rest of this suite. The cost is
// this comment, and the file staying inside `tsc` and Biome's reach rather than needing an
// exclusion in two config files.
export {};
