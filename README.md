# Agent CLI Conformance

A specification and conformance kit for command-line tools that **LLM agents drive** — and
that fail loudly instead of silently when the agent gets something wrong.

> **Status: early.** The research is complete; the spec is being written. Nothing here is
> stable yet.

## The problem

CLIs built for agents keep re-learning the same lessons, one project at a time. A survey of 15
CLIs across one developer's projects found the same contract implemented at four different
maturity levels, with no path for improvements to propagate — one project had grown a proper
exit-code taxonomy, another had independently added a `code` field to its error envelope, and
the shared scaffold both were generated from had neither.

The failures are consistent, and they share a shape: **the tool does the wrong thing and
reports success.**

- An unrecognised flag is accepted, its value orphaned, and the command runs with defaults —
  exit `0`. (Measured in `citty`, which underpins the scaffold that was supposed to prevent
  exactly this.)
- `docker inspect <missing> --format json` prints `[]` to stdout _and_ an error to stderr, so
  a consumer reading stdout sees "no results" rather than "that failed."
- `docker container prune` treats closed stdin as a decline and exits `0` — an agent invoking
  it non-interactively gets a success code and no work done.

Documentation does not fix this class of bug, because the failure is invisible at the point
where documentation would be read.

## The approach

Three layers, each enforcing what the one below cannot:

1. **Impossible** — API shapes that make the violation unrepresentable.
2. **Caught** — a conformance kit that fails CI when a violation ships.
3. **Documented** — the wiki, explaining why each rule exists.

Most CLI guidance stops at layer 3. This project starts at layer 2, because a rule that cannot
be mechanically checked does not get to be a rule.

### The conformance kit

Records a structured _observation_ per probe (argv, stdout, stderr, exit code, timing,
filesystem hashes), then runs rule-checkers over the recorded observations. Two consequences:

- **A new rule is a new checker over data already collected** — not a new test in every
  project. Learn a lesson once, and every CLI is audited for it retroactively.
- **It is language-agnostic by construction**, because it only ever touches argv, streams, and
  exit codes. Rust, TypeScript, Go and Python CLIs are tested identically.

Probes come in three levels. `L0` is inert — only help paths and deliberately-invalid
invocations, so it is safe to run against any binary with no cooperation and no risk. `L1` and
`L2` require the CLI to _declare_ what its commands do, and then try to falsify those claims:
a command declaring `read_only` is run in a snapshotted sandbox and the filesystem is diffed.
A declaration that cannot be falsified is a comment that lies.

### `acc`, the reference implementation

`acc` explores the spec — and is built to satisfy it. That second part is the reason it
exists: **a conformance kit with nothing that provably passes cannot tell "found a real
defect" from "the checker is wrong."** `acc` is the positive control, and
`src/acc/conformance.test.ts` runs the L0 probes against it on every commit, so it cannot
quietly stop conforming.

```bash
acc rules --tier core      # the rules a conforming CLI must satisfy
acc show A1                # one rule, with its links in and out
acc show exit-codes --body # ...and the full text
acc path A6 delegator      # shortest path of OUTBOUND links; reversed, this is a valid exit 5
acc tags
acc schema                 # the machine-readable interface description
acc schema | jq '.data.commands[].name'
```

Each of those is declared in `src/acc/spec.ts` and executed by `src/acc/conformance.test.ts`,
so a published invocation cannot quietly stop working.

Its parser is built from `src/acc/spec.ts` — one declaration producing the parser, the help
text, and `acc schema` together, so the three cannot drift. Adding a flag in one place adds it
to all three; there is no way to add it to only one.

Try the error contract directly:

```bash
acc show A99 --json        # exit 5, kind: not_found, and every valid handle as `choices`
acc rules --tier nonsense  # exit 2, kind: usage, choices: ["core","diagnostic"]
```

## Layout

```
docs/wiki/     the spec and its rationale — see docs/wiki/SCHEMA.md before editing
src/acc/       the reference implementation; spec.ts is its single source of truth
research/      the evidence trail: four reports on case studies, frameworks,
               CLI-vs-MCP, and testing methodology. Cited by decision pages; not maintained.
scripts/
  docs-lint/   portable, zero-dependency wiki linter (lift it into other repos as-is)
```

## Commands

```bash
bun docs/wiki/lint.ts          # link, anchor, frontmatter, orphan and rule checks
bun docs/wiki/lint.ts --json   # emit the knowledge graph
```

The lint is not optional decoration. It verifies that every rule page declares a checker that
exists, and that every checker has a rule page — so spec-versus-implementation drift fails the
gate rather than accumulating silently.
