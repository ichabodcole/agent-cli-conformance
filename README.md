# Agent CLI Conformance

A specification and conformance kit for command-line tools that **LLM agents drive** — and
that fail loudly instead of silently when the agent gets something wrong. It helps CLI authors
and framework maintainers make ordinary command-line tools predictable, machine-readable and
safely operable by autonomous agents, using an executable specification and black-box evidence
rather than documentation alone.

> **Status: early.** The research is complete; the spec is being written. Nothing here is
> stable yet.

**For** — CLI authors, framework and scaffold maintainers, and platform/tooling teams;
agent-harness authors second. It is a conformance suite for _ordinary CLIs consumed by agents_,
not for agent applications that happen to have a CLI. If a person types your tool and a script
also runs it, it is in scope.

**Today** — the [wiki](docs/wiki/index.md) (20 rules, each with a checker), the `acc` reference
CLI, the documentation graph and linter, and an `L0` black-box checker that records argv,
stdout, stderr, exit status, the terminating signal and timing per probe. Every one of the 20
checkers declares `coverage: partial` — see
[the matrix](docs/wiki/index.md#coverage-at-a-glance) for what each one leaves unestablished.

**Planned** — filesystem hashing and snapshot diffing, the `L1` and `L2` levels that falsify a
CLI's own effect declarations, durable and replayable observation histories, and the
retroactive re-checking those make possible. None of it exists yet; every mention below is
labelled. [The roadmap](docs/roadmap.md) is the full list — what is missing, why each item is
blocked on the ones before it, and the evidence that each gap is real. Nothing on it is
scheduled or promised.

**Non-goals** — a passing report is **not a security certification**, does **not** prove
domain-level correctness, and at `L0` does **not** prove a target is harmless to execute. It
proves that no core rule the kit could apply was violated, which is a narrower claim than any of
those and is deliberately reported as two separate booleans (see
[conformance](docs/wiki/concepts/conformance.md)).

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

Records a structured _observation_ per probe — argv, stdout, stderr, exit code, the terminating
signal, timing, and whether the capture was cut short — then runs rule-checkers over the
recorded observations.
(Filesystem hashes belong in that list and are _planned_; nothing hashes anything today.) Two
consequences:

- **A new rule is a new checker over data already collected** — not a new test in every
  project. Learn a lesson once and every CLI is audited for it retroactively. _Planned:_ the
  history is in-memory and dies with the process, so retroactive checking is a property of the
  architecture rather than a workflow you can run.
- **It is language-agnostic by construction**, because it only ever touches argv, streams, and
  exit codes. Rust, TypeScript, Go and Python CLIs are tested identically, and an executable
  target is launched as itself so the kernel honours its own shebang.

Probes come in three levels. `L0` is **risk-reduced, not inert**: it uses only help paths,
sentinel-bearing arguments, and bare invocations, which is a much smaller blast radius than
arbitrary probing — but it does execute the target, and it is not a sandbox. What it does not
prevent:

- a **bare invocation** is one of its classes, and a CLI that does real work with no arguments
  does that work;
- a fixed-verb CLI may **ignore an unknown flag** and execute a default root action — which is
  the very [A1](docs/wiki/rules/parsing/unknown-flag-exits-nonzero.md) violation being probed;
- `--version` and `--help` can be ignored, or handled only **after** global initialisation has
  already run;
- the fresh temporary working directory redirects **relative** paths only — it does not stop
  writes through `HOME`, XDG paths, absolute paths, subprocesses, or platform config
  directories;
- the child inherits the **full parent environment, credentials included**; and
- nothing denies filesystem access outside that directory, and nothing denies the network.

Point `acc check` only at a binary you are already willing to run. Per-run temporary
`HOME`/XDG directories, credential stripping, an OS-level sandbox, and a dry run of the planned
argv are all _planned_; none of them exist today.

`L1` and `L2` are _planned_ — neither level runs today, and `acc check` is `L0` only. They will
require the CLI to _declare_ what its commands do, and then try to falsify those claims: a
command declaring `read_only` run in a snapshotted sandbox, with the filesystem diffed
afterwards. A declaration that cannot be falsified is a comment that lies, which is the whole
argument for building them — and the reason the rules that need them
([A4](docs/wiki/rules/parsing/unexpected-positionals-rejected.md)) report `not applicable`
rather than passing today.

### Per-project rules — `acc.config.json`

Two keys, two different statements, kept apart on purpose:

```json
{
  "rules": {
    "D2": { "severity": "off", "reason": "human-first CLI; bare help is deliberate" },
    "A6": { "severity": "core", "reason": "we delegate to ffmpeg; -- is load-bearing" }
  },
  "knownFailures": {
    "B2": "colour leaks from the progress bar — tracked in #412"
  }
}
```

`knownFailures` is **debt**: "this is broken, I know, I will fix it." It only ever shrinks, and
a rule that starts passing is reported as a **stale expectation** so the line gets deleted.

`rules` is a **declaration**: "this rule binds differently for my tool, by design."
`severity` is `core`, `diagnostic` or `off` — a project may raise a rule as well as lower one —
and `off` is a **waiver**, which never goes stale, because passing was never the goal. A
`reason` is required on both, and rule ids are validated, so a mistyped id is an error rather
than a line that quietly does nothing.

A waiver can buy `conformant: true`. It can never buy `fullyVerified` — a waived core rule
blocks the evidence claim even when it would have passed, because a rule you chose not to be
measured against was not established. Waived rules are still **probed**, so the report shows
what the verdict would have been. The full argument, including why an unwaivable spec is worse
than a waived one, is in [conformance](docs/wiki/concepts/conformance.md#the-frame-a-verdict-was-reached-in).

```bash
acc check ./mycli --config-dir .    # look for acc.config.json in this directory
```

The flag names a **directory**, not a file, which is why it is not called `--config`.

### `acc`, the reference implementation

`acc` explores the spec — and is built to satisfy it. That second part is the reason it
exists: **a conformance kit with nothing that provably passes cannot tell "found a real
defect" from "the checker is wrong."** `acc` is the positive control, and
`src/acc/conformance.test.ts` runs the L0 probes against it inside `bun run check` — the
pre-commit hook locally, and [the CI workflow](.github/workflows/check.yml) on every push and
pull request — so it cannot quietly stop conforming. The hook is the faster of the two and the
bypassable one; CI is what the claim rests on.

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
bun run check                  # THE gate: typecheck, lint, wiki lint, tests
bun docs/wiki/lint.ts          # link, anchor, frontmatter, orphan and rule checks
bun docs/wiki/lint.ts --json   # emit the knowledge graph
bun run docs:sync              # regenerate the generated blocks in docs/wiki/index.md
bun run docs:build             # render the wiki to docs/dist/ — open index.html, no server
```

`docs:build` consumes the same `--json` graph rather than re-deriving it, which is what lets a
page show the one thing the markdown cannot: the backlinks, which SCHEMA.md says are computed and
never authored. The output is gitignored and needs no network — it reads from `file://`.

`bun run check` is the whole gate and the only definition of it — the pre-commit hook and
[the CI workflow](.github/workflows/check.yml) both run exactly that line, so neither can
enforce something the other does not.

The wiki lint is not optional decoration. It verifies that every rule page declares a checker
that exists, that every checker has a rule page, and that each page's `tier`, `probe_level`,
`coverage` and stated gaps match the checker's — so spec-versus-implementation drift fails the
gate rather than accumulating silently.
