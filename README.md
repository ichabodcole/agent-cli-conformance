# Agent CLI Conformance

A specification and conformance kit for command-line tools that **LLM agents drive** — and
that fail loudly instead of silently when the agent gets something wrong. It helps CLI authors
and framework maintainers make ordinary command-line tools predictable, machine-readable and
safely operable by autonomous agents, using an executable specification and black-box evidence
rather than documentation alone.

> **Status: pre-1.0.** Usable today and installable — 23 rules, 22 of them with a registered
> checker, run against your CLI as black-box evidence. Not yet settled: rule ids are
> append-only but the report and schema shapes may still change before 1.0, every checker
> covers only part of its rule, one of the 22 ([A4](docs/wiki/rules/parsing/unexpected-positionals-rejected.md))
> can only report `unverified` until `L1` exists, and `L0` is the only probe level there is.

**For** — CLI authors, framework and scaffold maintainers, and platform/tooling teams;
agent-harness authors second. It is a conformance suite for _ordinary CLIs consumed by agents_,
not for agent applications that happen to have a CLI. If a person types your tool and a script
also runs it, it is in scope.

**Today** — the [wiki](docs/wiki/index.md) (23 rules, 22 of them with a checker; the 23rd is
`planned`), the `acc` reference CLI, the documentation graph and linter, and an `L0` black-box
checker that records argv, stdout, stderr, exit status, the terminating signal and timing per
probe. Every one of the 22 checkers declares `coverage: partial` — see
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

## Getting started

You need [Bun](https://bun.sh) 1.4 or later, on **macOS or Linux**. `acc` is not published to npm, and this repository
is **private** while the first few projects are run through it — so install it over SSH, into
the project whose CLI you want to check:

```bash
bun pm cache rm && bun add -d git+ssh://git@github.com/ichabodcole/agent-cli-conformance.git
```

> **⚠ Upgrading, or re-pointing at a different ref? You need BOTH remedies, in this order.**
>
> ```sh
> bun remove agent-cli-conformance && bun pm cache rm && bun add -d 'git+ssh://…#<new-ref>'
> ```
>
> They fix two different failures and neither covers the other. **`bun remove`** is for the
> duplicate key: `bun add` with a new ref does not replace the existing dependency, it appends a
> second entry under the same key, prints `warn: Duplicate key` in output nobody reads, and
> resolves the **first** one. **`bun pm cache rm`** is for the stale bare clone above — and an
> upgrade always needs it, because **a release tag is by definition pushed after your first
> install**, so the tag you are asking for is the one your cache cannot see. Skip it and you get
> `no commit matching "<tag>" found (but repository exists)`, which reads like a missing tag.
>
> This is the third distinct way this install path has silently delivered the wrong bytes at exit
> 0 — after the stale bare clone and the stale extracted package, both above. An adopter hit all
> three; this one is the nastiest, because the remedy for the other two does nothing. **Check the
> installed artifacts before trusting a diff**: if the version you expect ships a file, look for it.

The cache clear is first because **the second install of this package is the one that goes wrong**:
Bun keeps a bare clone it does not re-fetch, so a tag pushed since your last install is invisible.
Clearing costs a re-download and removes both failure modes below in one step. Drop it if this is
your first install.

That needs GitHub access to this repository. The shorter
`bun add -d github:ichabodcole/agent-cli-conformance` goes through GitHub's tarball API, which
answers `404` for a private repository whatever token is in the environment
([oven-sh/bun#19618](https://github.com/oven-sh/bun/issues/19618)); it becomes the install line
if and when this one opens up.

Either form records the resolved commit in your lockfile. To pin explicitly, name a branch, a
commit or a release tag after the `#` — `…agent-cli-conformance.git#v1.0.0`.

**Two ways this install goes wrong, and only one of them is loud.**

**The loud one.** Bun keeps a bare clone of each git dependency in its cache and does not
re-fetch it, so a tag pushed after your first install of this package is invisible and the install
fails with `no commit matching "…" found (but repository exists)` — indistinguishable from a tag
that does not exist. `bun pm cache rm` fixes it
([oven-sh/bun#18947](https://github.com/oven-sh/bun/issues/18947)). A `#semver:` range is a
different matter — Bun does not support one
([oven-sh/bun#4978](https://github.com/oven-sh/bun/issues/4978)).

**The silent one, which is worse.** The install can succeed at exit `0`, print a commit SHA, and
put **different bytes on disk** — because the extracted-package cache is stale _independently_ of
the bare clone, so clearing one does not clear the other. Nothing in the output says so.

Every report carries the kit's own version for this reason: compare it against the release you
meant to install, and if they disagree run `bun pm cache rm` and reinstall.

**Be clear how far that check reaches.** The version only changes when a release is cut, so it
catches staleness that spans a release and not staleness within one — pin a **tag** and the check
is meaningful; pin a branch or nothing and a stale copy reports the same version as a fresh one.
On an unpinned install, `bun pm cache rm` before installing is the only reliable answer, and it
costs a re-download.

This is Bun's behaviour, not something this kit can fix. It is documented here because a tool that
reports success while doing something else is the entire subject of this project, and the install
path had an arm of exactly that shape with nothing pointing at it.

Then point it at your CLI:

```bash
bunx acc check ./your-cli
```

**Piped output is JSON, and a terminal gets the text report** — unless `AI_AGENT` is set, which
selects JSON anywhere. That is the contract this kit asks of everyone else, so it applies to itself — which means the report below is what you see at a
terminal, and a pipe or a CI step gets one JSON document instead. `--format text` forces the human
report anywhere:

```bash
bunx acc check ./your-cli --format text
```

The first line is the verdict, and the exit code is the gate:

```
NOT CONFORMANT (L0) — 2 core violated, 3 core unverified, 13 core partially covered  /opt/homebrew/bin/git
```

That line also ends with the kit's own version — `[acc 1.0.0]` <!-- x-release-please-version -->
— which appears as `kitVersion` in the JSON report. It is there because an install can silently
give you an older kit than you asked for; the install notes above explain how, and how far the
check reaches.

`0` means conformant and `9` means it is not. Any other code is `acc` itself failing rather
than a verdict about your tool — the distinction is
[outcomes are not errors](docs/wiki/concepts/exit-codes.md#outcomes-are-not-errors). That makes
the whole CI step one line with no flags.

**Read the safety note before pointing it at your own work.** `acc check` **executes** the
target — see [what L0 does not prevent](#the-conformance-kit) below.

**Platform.** macOS and Linux are supported and tested; CI runs the gate on Ubuntu. Windows is
untested and one safety guarantee is weaker there: a probe that outruns its deadline is bounded
by terminating the target's whole **process group**, which is POSIX-only, so on Windows a
descendant the target spawned may outlive the run. The deadline still resolves the probe either
way. Details in [probing](docs/wiki/concepts/probing.md#a-probe-the-kit-killed-is-not-a-probe-the-target-failed).

Where to go next:

- **[Check your first CLI](docs/wiki/guides/check-your-first-cli.md)** — ten minutes, learning
  to read a report against CLIs that pass and fail on purpose. It uses the fixtures that ship
  with this repository, so clone it for that one.
- **[How to reach L0 in your project](docs/wiki/guides/how-to-reach-l0-in-your-project.md)** —
  taking your own CLI from a first failing check to a green gate.

## Branches and releases

`develop` is where work lands; `main` is what is released from. Branch off `develop`, merge
back into `develop`, and open a pull request from `develop` into `main` to begin a release.

**Releasing takes two merges, not one.** Merging `develop` into `main` publishes nothing: it
makes release-please open a _second_ pull request carrying the version bump and the changelog
entry, and merging **that** creates the tag and the GitHub Release. So between the two merges
`main` holds the next release rather than the last one. Merge the promotion PR with a merge or
rebase merge — a squash takes its headline from the PR title, and a title that is not a
Conventional Commit leaves release-please with no version signal.

[release-please](.github/workflows/release-please.yml) watches `main` only, and derives the
version and the changelog from the commit messages
([Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)). It writes the version
to `package.json`, which is what `src/acc/version.ts` reads — so `acc --version`, the git tag and
the changelog cannot disagree. Releases are tagged `v<version>`. Nothing is
published to npm.

[The gate](.github/workflows/check.yml) runs on every push and every pull request, on both
branches.

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

Two keys, two different statements about **rules**, kept apart on purpose:

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

`knownFailures` is **debt**: "this is broken, I know, I will fix it." It is meant only to
shrink, and a rule that starts passing is reported under **STALE EXPECTATIONS** — the entry to
delete. An entry for a rule the run never evaluated is reported under **NOT BEING EVALUATED**
instead, and that one should not be deleted on sight: the kit stopped looking, so the defect may
be entirely intact. That report is a reminder, not a gate: `acc` still exits `0`, because a target with a
stale expectation is conformant and an exit code that said otherwise would be lying. Enforcing
removal needs an outcome code of its own and is
[on the roadmap](docs/roadmap.md#a-ratchet-the-tool-does-not-turn), not in the tool today.

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

### Declaring that your tool is machine-first

A third key in the same file says nothing about any rule. It describes **your tool**:

```json
{ "defaultOutput": "json" }
```

`rules`, `knownFailures` and `defaultOutput` are the whole vocabulary — **an unrecognised top-level
key is an error**, not an ignored line, for the same reason a mistyped rule id is: a declaration
that silently does nothing leaves you believing you declared something you did not.

It means: **your CLI writes JSON to a pipe**, and prose is the thing a caller
opts into. That covers the tool with no `--json` flag because it never needed one — and it also
covers the far more common shape, **a CLI that emits JSON when stdout is not a terminal and prose
when it is.** Every probe runs against a pipe, never a terminal, so if your tool would answer a
script in JSON, this key is describing you.

Without it, the kit reads your help looking for a machine-mode flag. Finding none, it reports that
machine mode is undiscoverable — and
[B5](docs/wiki/rules/streams/machine-mode-holds-on-parser-errors.md), the rule that checks the
shape of your errors, has no way to ask for a mode and reports `unverified`. With it, B5 provokes a
parser error and requires that **one of your two streams contains exactly one JSON document**.

**Declaring it commits you to it.** Answer a parser error in prose and B5 fails you. That is what
makes it a declaration rather than a guess the kit makes on your behalf: a guess cannot be wrong in
a way anything notices.

It does not excuse a rule and it does not suppress a failure — the only thing it changes is which
probe the kit is able to send.

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
docs/research/ the evidence trail: reports on case studies, frameworks, CLI-vs-MCP,
               testing methodology, defect archaeology and prose. Cited by decision and
               rule pages; dated and not maintained.
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

`bun run check` is the whole gate and the only definition of it. [The CI
workflow](.github/workflows/check.yml) runs that line and nothing else; the pre-commit hook runs
it too, behind a `lint-staged` pass that applies the same rules to the staged files first for
speed. Nothing the hook enforces is absent from `bun run check`, so a `--no-verify` commit cannot
land something CI would have caught.

The wiki lint is not optional decoration. It verifies that every rule page declares a checker
that exists, that every checker has a rule page, and that each page's `tier`, `probe_level`,
`coverage` and stated gaps match the checker's — so spec-versus-implementation drift fails the
gate rather than accumulating silently.
