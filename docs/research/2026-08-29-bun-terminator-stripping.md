---
type: research
generated: { by: claude-opus-5, at: 2026-08-29 }
status: stable
description: Measured how many bare `--` tokens Bun strips between the launcher and a script across launcher forms, layer counts, and a compiled binary — stripping is per bun layer, not a fixed count, and a compiled binary strips nothing.
tags: [bun, parsing, evidence]
---

# Bun's `--` stripping is per launcher layer, not a fixed count

**Research date:** 2026-08-29
**Question:** [A6](../wiki/rules/parsing/double-dash-terminator.md) probes that a target honours
a bare `--` as end-of-options. Bun is known to strip a `--` immediately after the script path
before the script's own parser ever sees it, which had been treated as "exactly one token,
always" across the launcher forms `bun <script>`, `bun run <script>`, `bun --bun <script>` and
`bun -- <script>`. Is that true — does every Bun launcher form strip exactly one bare `--`, and
does a compiled `bun build --compile` binary strip one too?

**Method:** A fixture script printing `process.argv.slice(2)` was run through each launcher form
and layer count below, with the delivered argv read back from stdout. Five repetitions of each
row; the delivered argv was identical every time. Machine: macOS (`darwin 25.6.0`). Runtime:
`bun 1.4.0`. Run in a scratch directory outside the repository.

**Confidence notation:** `[MEASURED]` — observed in this session, repeat count stated.

## Terminator delivery by launcher form

`[MEASURED]`

| form                                                      | delivered                 |
| --------------------------------------------------------- | ------------------------- |
| `bun argv.ts -- --x sentinel`                             | `["--x","sentinel"]`      |
| `bun run argv.ts -- --x sentinel`                         | `["--x","sentinel"]`      |
| `#!/usr/bin/env bun` shebang, `./argv.ts -- --x sentinel` | `["--x","sentinel"]`      |
| wrapper `exec bun argv.ts "$@"`                           | `["--x","sentinel"]`      |
| wrapper `exec bun argv.ts -- "$@"`                        | `["--","--x","sentinel"]` |

No launcher form forwards the terminator; a wrapper that INSERTS one does, and is transparent
when the caller passes none (`./wrap --x sentinel` -> `["--x","sentinel"]`, nothing manufactured).

This falsified the belief that "no launcher form avoids it" was the interesting property. It
isn't — every launcher form here strips one token, uniformly. The interesting property is below.

## Stripping is per bun layer, not a fixed count

`[MEASURED]`

| layers                   | sent                    | delivered                 | ate |
| ------------------------ | ----------------------- | ------------------------- | --- |
| one — `bun argv.ts`      | `-- -- --x sentinel`    | `["--","--x","sentinel"]` | 1   |
| two — `bun run <script>` | `-- -- --x sentinel`    | `["--x","sentinel"]`      | 2   |
| two — `bun run <script>` | `-- -- -- --x sentinel` | `["--","--x","sentinel"]` | 2   |

This falsified "Bun consumes exactly one bare `--`" as a property of Bun. `bun run` interposes a
second layer (the `run` subcommand's own arg handling) between the launcher and the script, and
each layer strips one terminator, so two layers strip two. "Exactly one" is not a fact about Bun;
it is a fact about which launcher shape `toTarget` (`src/acc/commands/check.ts`) ever
constructs — `["bun", abs]` or `[abs]`, both single-layer — and that single-layer shape, not Bun
itself, is what makes "compensate by exactly one" the correct amount.

## Compiled binaries do not strip

`[MEASURED]`

| form                                 | delivered                      |
| ------------------------------------ | ------------------------------ |
| `./argv-compiled -- --x sentinel`    | `["--","--x","sentinel"]`      |
| `./argv-compiled --x sentinel`       | `["--x","sentinel"]`           |
| `./argv-compiled -- -- --x sentinel` | `["--","--","--x","sentinel"]` |

A `bun build --compile` binary strips nothing: it has no launcher token and no shebang line for
`toTarget` to read, so it is excluded from the runner's compensation by construction, and every
terminator sent arrives intact. The third row is also a working stand-in for a future Bun that
stops stripping — an honouring target still passes and a non-honouring one still fails by name,
so the probe's shape degrades rather than its verdict.

## Provenance

Machine: macOS, `darwin 25.6.0`. Runtime: `bun 1.4.0`. Fixture: a script printing
`process.argv.slice(2)`, invoked directly, via `bun run`, via a `#!/usr/bin/env bun` shebang, and
via two one-line shell wrappers (`exec bun argv.ts "$@"` and `exec bun argv.ts -- "$@"`). All runs
outside the repository, in a scratch directory.

## Not measured

- Any Bun version other than `1.4.0`.
- Windows path semantics — every row above assumes a POSIX shell and POSIX argv handling.
- A `bun build --compile` binary produced by a different Bun than the one running it.
