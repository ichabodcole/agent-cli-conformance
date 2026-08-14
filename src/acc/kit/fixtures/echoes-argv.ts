#!/usr/bin/env bun
// Reports exactly what it received, so a test can assert what the kit actually handed it.
//
// This exists for `Invocation.repeat`, which is recorder-only: it must distinguish two probes
// inside `record()` while being invisible to the target. "Invisible" is not something the kit
// can assert about itself from its own data structures — the Observation stores the Invocation
// the kit BUILT, so a leak into argv or env would be recorded as faithfully as everything else
// and prove nothing. The only witness is the child, which is this file.
//
// Not a conformance fixture: it is neither a positive nor a negative control and no checker is
// meant to pass or fail against it. Output goes to stderr with exit 2 so it reads as an
// ordinary usage error rather than as data.
const argv = process.argv.slice(2);
// Every environment variable the kit could plausibly be smuggling a probe identity through,
// including the two real ones (`ACC_PROBE_NONCE` from D4, `ACC_PROBE_TIMING` from F2) so a test
// asserting an EMPTY object here is asserting something that has a way to be non-empty.
const injected = Object.fromEntries(
  Object.entries(process.env).filter(([k]) => /^ACC_/.test(k) || /REPEAT/i.test(k)),
);
process.stderr.write(`${JSON.stringify({ argv, injected })}\n`);
process.exit(2);
