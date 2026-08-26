---
type: report
generated: { by: claude-opus-5, at: 2026-08-24 }
status: stable
lifecycle: live
description:
  The first trial anywhere of a CLI checked against its own machine-readable declaration. Eight
  disagreements between anthill's auto-generated manifest and its running behaviour — one stale,
  one wrong, six incomplete — found by making the tool enumerate its own valid-flag set and
  diffing that against what it publishes.
tags: [conformance, evidence, adoption, parsing, contract, declaration]
subject: anthill v2.3.0's auto-generated manifest measured against the running CLI
examined:
  anthill v2.3.0 at `plugin/scripts/anthill/cli.ts` and the PATH launcher `~/.bun/bin/anthill`;
  acc `acc check --json`; macOS, bun; 2026-08-24
---

> **Both repositories were read-only throughout.** The trial ran from a scratch directory outside
> both trees, containing only a synthetic `package.json`, `.env` and `.anthill/config.json`
> created there. No writes, no git commands, no installs in either repository.
>
> **Provenance.** The findings, ids and verbatim invocations below are the trial agent's, filed
> here because the material is evidence this project needs and the transcript that holds it will
> not outlive the session. The framing around them is this report's.
>
> **Amended 2026-08-25.** The trial and its eight findings are unchanged and are what the headline
> counts. Two findings that arrived afterwards are filed at the end under
> [findings that arrived after the trial](#findings-that-arrived-after-the-trial), because the
> `DT-` series is where findings about this target live and a second report would split the
> namespace. They are `DT-9` and `DT-10`, and neither is the trial's.
>
> **Finding ids are prefixed `DT-` throughout**, and map one-to-one onto the trial's own `D1`–`D8`.
> The prefix is not decoration: unprefixed `C2`, `D2`, `A1`, `A7` and the like are **rule ids from
> the catalogue**, a different namespace, and this report contains both — `DT-2` is the finding
> about `refused` flags; `D2` is `discoverability/bare-invocation-is-a-usage-error`.

# The first drift trial: a CLI against its own declaration

## Why this report is not about anthill

[The charter](../../CHARTER.md) bets the project on one move: **declare what your interface is,
and bind that declaration to the code that implements it.** Everything else — fleet visibility,
contract testing, a checker that reads rather than guesses — is downstream of a tool being able to
say what it does.

[The declaration survey](../research/2026-08-22-machine-readable-cli-declarations.md) established
what that bet is up against. There is no standard. Of the artifacts that exist, every
hand-authored one drifts from the tool it describes, none of them has a drift check, and every
artifact that covers a real CLI completely is one the tool emits itself. Its conclusion, scoped as
the survey scopes it: **nothing found probes a running tool and falsifies what it declares.** The
nearest thing it found anywhere is Azure's `azdev latest-index verify` — regenerate from the live
command table, byte-compare to the checked-in JSON, exit non-zero naming the stale file. That gate
is real and cheap, and it compares a generation against a regeneration; the findings below are the
class it cannot see.

This trial is the first time anyone did. anthill emits its manifest from the same `define.ts`
structures its parser consumes — the generated-not-authored case, the strongest form of the
bet, the one the survey says should not drift because there is no second copy to fall out of
date. The question was whether agreement actually holds.

**It does not.** Eight disagreements, in a manifest regenerated live from the source of truth.

So the readings below are about a **method**, and anthill is the instrument's first sample.
The findings are real and several are one-line fixes, but anthill is the owner's project and this
report does not assign work in someone else's tree. What was observed is stated; what to do about
it is the owner's call.

## The sentence this report exists to deliver

One stale. One wrong. Six incomplete.

**The prior art's entire failure mode is staleness — and staleness accounts for the least
consequential finding here.** Every drift the survey catalogued in hand-authored specs is a copy
that fell behind its tool. That class shows up once in this trial, as [DT-7](#dt-7--the-cli-reports-two-different-versions-of-itself),
a scaffold literal nobody moved. The finding that actually endangers a caller —
[DT-2](#dt-2--eight-refused-flags-published-as-valid), eight flags published as valid by the same
binary that refuses them — is generated fresh on every invocation and is **wrong at generation
time**. Regenerating it does not help; it has never been right.

A drift check built for the failure mode the field knows about would have found the smallest thing
here and missed the rest.

## Method

**Target:** `bun /Users/colereed/Projects/dreamwood/anthill/plugin/scripts/anthill/cli.ts`
(v2.3.0), and the PATH launcher `/Users/colereed/.bun/bin/anthill`.

**Declaration obtained from:** `help --json` (bare manifest, piped) and bare invocation
(enveloped manifest). Both agree.

**Instruments:**

- `acc check <path> --json` — 17 observations, 24 rule findings, exit 9. That figure is the
  trial's and was not re-derived when filing; it counts **rule findings, not rules**, so it is not
  the quantity the [eight-CLI report](./2026-08-24-eight-owner-clis.md#m8-0--the-denominator-is-23-not-24)
  corrected from 24 to 23 — but the coincidence of the number is worth knowing before anyone leans
  on it.
- Direct invocation of all 25 manifest command paths.
- **A generated differ**: for each of the 25 paths, invoke it with a sentinel unknown flag, parse
  the tool's own `Valid flags: …` list out of the error envelope, and diff that against the
  manifest's `flags[]`.
- `--help --format json` on all 25 paths, to confirm the per-command help surface carries the same
  claims.

**Probe classes established as inert before running**, each verified by reading the code path:
parse-time failures (`parseArgs` throws before `run()` is ever called), `refuseArg` guards that
`process.exit(1)` at the top of `run()`, `--version`, help/manifest interceptors, `info show`
(reads one `package.json`), `info env` (reads one `.env`), `comms read` (`readChannel` is
`existsSync` + `readFileSync`, creates nothing), and `feedback` with an invalid `--category` or
empty message (both exit at a guard _before_ `buildFeedback`, which is where `realGh`/`realEnv`
live).

**Two targets compared once.** The repo checkout's manifest was diffed against the PATH launcher's.
Both report `2.3.0` and their manifests are byte-identical for every command and flag. `acc compare`
proper — report against report — is not the right instrument for a single target and was not forced.

**Scepticism discipline.** Every finding below was produced **twice, in separate processes, with
identical output**. Nothing seen once is reported.

### The technique, stated for reuse

The single highest-yield probe was **making the tool enumerate its own surface**.

anthill's parser is strict, and its unknown-flag error names the valid set:

```
$ anthill --nope
{"ok":false,"error":"Unknown option '--nope'. Valid flags: --format", ...}
```

That string is the tool's own account of what it accepts, produced by the parser rather than by
documentation. Diffing it against `flags[]` across all 25 command paths is a **complete census of
the declared-vs-accepted gap**: one probe per command, fully inert, no mutation, no guessing, and
automatable end to end. The contradiction is exhibited inside a single process — the same binary
publishes the flag and refuses it.

**This generalises to any CLI whose parse errors name the valid set.** It needs no cooperation
beyond that one property, and it costs one invocation per command path. Where the property holds,
this check is available today.

## The eight findings

### DT-1 — root `--format` is declared in code, absent from the manifest, and inert where it looks like it works

**The calibration finding. This was known before the trial started** and is recorded to show the
instrument reads true, not as a discovery.

`Manifest` has no `flags` field; `buildManifest` never reads `rootCmd.args`. The manifest's top
level is `{name, version, description, commands}` — nowhere for `--format` to go. The tool
contradicts this in its own voice: the root advertises exactly one valid flag (see the `--nope`
probe above); the manifest advertises none.

**The consequence not previously recorded:** the root `--format` is _accepted_ before a subcommand
and then _silently discarded_.

```
$ anthill --format text info show        # piped
{"ok":true,"data":{...}}                 # JSON, not text — exit 0
$ anthill --format text --version        # piped
2.3.0 (/Users/.../cli.ts)                # text — honoured
```

Same flag, same position, two meanings: honoured for the interceptor paths (`--version`, `help`),
parsed-and-ignored for every dispatched command — root `args` are not inherited, and `cli.ts` says
so in a comment. A caller cannot discover this, because the flag it applies to is the one the
manifest cannot mention.

**Class: incomplete** (no slot in the type) **compounding into wrong** (the flag exists, parses,
exits 0, and does nothing).

### DT-2 — eight `refused` flags published as valid

The largest finding, and believed new.

`define.ts` has a `refused` arg property: a flag the command _recognises_ and _deliberately
refuses_, registered with the parser so it does not read as "unknown", and **excluded from the
advertised valid set**. `manifest.ts`'s `WalkArg` has no `refused` field, so a refused flag is
emitted as an ordinary flag — indistinguishable from a working one.

Full census from the differ:

| command           | declared flag | tool's advertised valid set                          |
| ----------------- | ------------- | ---------------------------------------------------- |
| `info show`       | `--team`      | `--format`                                           |
| `info env`        | `--team`      | `--file, --format, --show-values`                    |
| `comms read`      | `--as`        | `--channel, --format, --id, --last, --since, --team` |
| `comms positions` | `--as`        | `--channel, --format, --team`                        |
| `scan`            | `--team`      | `--format, --root`                                   |
| `feedback`        | `--team`      | `--category, --format, --skill, --submit`            |
| `field-notes`     | `--team`      | `--format`                                           |
| `migrate`         | `--team`      | `--dry-run, --format, --keep-paths`                  |

Observed:

```
$ anthill info show --team foo
{"ok":false,"error":"`--team` is not accepted here. `info` reports on the PLUGIN, not on a team …"}  exit 1
$ anthill comms read --as foo
{"ok":false,"error":"`--as` is not accepted here: reads are not attributed to a seat …"}            exit 1
```

The refusal machinery is careful, well-reasoned work — and the manifest inverts it. The `refused`
design exists precisely so a seat that types `--as` on `comms read` learns _why_; the manifest
hands that same seat the flag as valid input.

There is a tell visible in the manifest alone, and it means nothing without behaviour: every
refused flag is the _only_ flag on its command with no `description` and no `valueHint`. A reader
would call that sloppiness. It is a semantic field silently dropped.

**The per-command help surface propagates it.** `cli.ts` deliberately returns the manifest entry
rather than rendered usage, so agents get "the flags as data". All 25 paths were verified to return
the manifest entry verbatim — so `anthill comms read --help --format json` tells an agent `--as` is
a valid string flag, and `anthill comms read --as x` refuses it.

**Class: wrong.** The generator has a slot (`ManifestFlag` could carry `refused`); it drops a field
that exists in the source. Not staleness — the manifest is regenerated live and is wrong at
generation time.

### DT-3 — positionals are emitted inside `flags[]`, and every one is rejected as a flag

Seven positional/positionals args appear in the manifest's `flags` array, distinguished only by
`type: "positional"` / `"positionals"`. `parseArgs` routes those into positional and free-form
handling and never registers them as options, so the flag spelling is always an error:

```
$ anthill join --handle foo
{"ok":false,"error":"Unknown option '--handle'. Valid flags: --channel, --format, --team"}
$ anthill spawn --handles alpha    → Unknown option '--handles'
$ anthill commit --paths README.md → Unknown option '--paths'
$ anthill feedback --message hello → Unknown option '--message'
$ anthill team use --name foo      → Unknown option '--name'
```

`comms send --text` and `comms follow --channel` are the same shape; `comms follow` was not run
past parse.

A consumer that reads `flags[]` as "the flags" — which is what the field is called, and what
`--help --format json` calls it — constructs invalid argv for **7 of 25 commands**, including
`commit`, the command every seat runs.

**Class: incomplete.** The type has one array where the CLI has two argument kinds. `type` carries
the distinction, but the _container_ asserts otherwise, and containers are what consumers iterate.

### DT-4 — `valueHint` means two different things and nothing says which

`--category` declares `valueHint: "bug|friction|idea|docs"` and the set is enforced:

```
$ anthill feedback --category bogus hi
{"ok":false,"error":"unknown --category \"bogus\". Use one of: bug, friction, idea, docs."}  exit 1
$ anthill feedback --category BUG hi     → same refusal (case-sensitive)
```

`--format` declares `valueHint: "text|json"` on **21 commands** and the set is not enforced
anywhere:

```
$ anthill info show --format bogus
{"ok":true,"data":{...}}   exit 0
```

`resolveFormat` treats any unrecognised value as _no value supplied_ and falls back to the TTY
heuristic. So an out-of-set `--format` is silently accepted, exit 0, with output in whatever format
the stream implies. Identical declared shape, opposite behaviour, no field distinguishing them.

The kit's `A7` reported `unverified` here, correctly: it saw no closed set at the root, because the
root's flag is not in the manifest — DT-1 again.

**Class: incomplete.** `valueHint` is a display string with no declared semantics, so it cannot be
checked, only guessed at.

### DT-5 — a `type: "string"` hiding a validated integer, and an inexpressible XOR

`comms read` declares `--id`, `--since`, `--last` as three independent `type: "string"` flags.
Observed against a synthetic scratch team config:

```
$ anthill comms read --last 0
{"ok":false,"error":"--last needs a whole number of messages (1 or more), got \"0\"."}
$ anthill comms read --last abc     → same
$ anthill comms read --last 1e1     → exit 0, accepted (Number("1e1") === 10)
$ anthill comms read --last 2 --id 1
{"ok":false,"error":"--id and --last cannot be combined — each selects a different window …"}
```

Two things the declaration cannot say: (a) `--last` is an integer ≥ 1, not a string —
`ManifestFlag.type` has no numeric kind and no range; (b) the three flags are mutually exclusive.
An agent reading the manifest has no reason not to compose `--last 5 --since 3`, and gets a refusal
the declaration gave no warning of.

Same class: `comms send --text` is declared `required: false` but is required _unless_ `--stdin` is
passed — its own description says so, in prose. `commit` has the same `--message`/`--stdin`/`--file`
triangle. `required` is a boolean where the constraint is an arity relation across flags.

**Class: incomplete.**

### DT-6 — present but undeclared: the entire universal surface, including the discovery verb itself

None of these appear anywhere in the manifest; all are accepted.

- **`help`** — a working verb, exit 0, emits the manifest. **The manifest does not list the command
  that produces the manifest.** The human help screen ends with "Run `anthill help --json` for a
  machine-readable manifest", pointing at a verb the machine-readable manifest omits.
- **`--json`** (on `help`) — the shipped bare-manifest spelling.
- **`--help` / `-h`** — every command; exit 0.
- **`--version` / `-v`** — root; exit 0.
- **`--scope <label>`** — read by the bare/`help` interceptor. Undeclared, _and_ it fails oddly:
  because the root arg spec does not know it takes a value, `findSubCommandIndex` does not skip
  that value, so `anthill --scope app` reports **`Unknown command app`** — an error about the
  user's _value_, naming neither the flag nor the cause. It is also silently ignored under
  `--format json` (the JSON branch of the interceptor never reads it), so it is a human-only flag.
- **`--no-<flag>` negation** — `info env --no-show-values` works, exit 0. It also applies to
  _string_ flags, where it writes a boolean `false` into a slot the manifest types `"string"`
  (`info show --no-format` → exit 0). Latent, not externally observable today.
- **`--` terminator.**

**Class: incomplete** for the interceptor flags — `buildManifest` walks `subCommands` and root
`args`, and interceptors are neither — and **wrong** for `--scope`, which is a root flag in
behaviour and is nowhere in the source's `args` either.

### DT-7 — the CLI reports two different versions of itself

The manifest declares `version: "2.3.0"`; `--version` agrees. `info show` — described as "Show
resolved paths, runtime, and project info" — returns a hardcoded `cli: {name: "anthill", version:
"0.1.0"}` (`commands/info-show.ts`). Two machine-readable outputs of the same process disagree
about what it is, by two major versions. Reproduced on both the repo checkout and the PATH
launcher.

Secondary, in the same command: outside a project, `info show` does not degrade — it emits
`ENOENT … package.json` and exits 1, despite `paths.ts` falling back to cwd specifically so it
would degrade. The description promises project info; the behaviour is a filesystem error.

Also minor and confirmed: `info show`'s refusal envelope reports `meta.command: "info"` while its
success envelope reports `"info show"` — the `refuseArg` call passes the wrong path.

**Class: stale.** The `0.1.0` literal is scaffold residue that release-please's
`x-release-please-version` marker does not cover. **This is the only stale finding in the trial,
and it is the smallest one.**

### DT-8 — latent generator gaps

No live instance exists for either; recorded so they are not rediscovered.

- `CommandMeta` has `hidden` and `deprecated`. `help-renderer.ts` filters on `hidden`.
  `manifest.ts`'s `WalkMeta` has neither, so the first hidden command will be **visible to agents
  and invisible to humans**. No command sets either today — all 25 were checked.
- `parseArgs` registers only single-character aliases (`.find(a => a.length === 1)`).
  `ManifestFlag.alias` carries `string | string[]` unfiltered, so a multi-char alias would be
  declared and never registered. Only `-m` and `-F` (on `commit`) exist today; both are fine.

**Class: incomplete**, both.

## Classification

| #                                                                                                                | Finding                                                                        | Class                         |
| ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------- |
| [DT-1](#dt-1--root---format-is-declared-in-code-absent-from-the-manifest-and-inert-where-it-looks-like-it-works) | Root `--format` absent; inert before subcommands                               | incomplete → wrong            |
| [DT-2](#dt-2--eight-refused-flags-published-as-valid)                                                            | 8 `refused` flags declared as valid                                            | **wrong**                     |
| [DT-3](#dt-3--positionals-are-emitted-inside-flags-and-every-one-is-rejected-as-a-flag)                          | 7 positionals emitted in `flags[]`, all rejected as flags                      | incomplete                    |
| [DT-4](#dt-4--valuehint-means-two-different-things-and-nothing-says-which)                                       | `valueHint` enforced on one flag, ignored on 21                                | incomplete                    |
| [DT-5](#dt-5--a-type-string-hiding-a-validated-integer-and-an-inexpressible-xor)                                 | `--last` string-typed integer; `--id`/`--since`/`--last` XOR                   | incomplete                    |
| [DT-6](#dt-6--present-but-undeclared-the-entire-universal-surface-including-the-discovery-verb-itself)           | `help`, `--json`, `--help`, `-h`, `--version`, `-v`, `--scope`, `--no-*`, `--` | incomplete (+`--scope` wrong) |
| [DT-7](#dt-7--the-cli-reports-two-different-versions-of-itself)                                                  | `info show` reports `0.1.0` vs manifest `2.3.0`                                | **stale**                     |
| [DT-8](#dt-8--latent-generator-gaps)                                                                             | `hidden`/`deprecated`/multi-char alias dropped                                 | incomplete (latent)           |

**One stale. One wrong. Six incomplete.** The prior art's entire failure mode — staleness —
accounts for the least consequential finding here.

Two further findings about this target, `DT-9` and `DT-10`, were filed after the trial and are not
counted in that table or that sentence — see
[findings that arrived after the trial](#findings-that-arrived-after-the-trial).

## What the kit found, and what it structurally could not

`acc check` returned exit 9, `conformant: false`, 2 core failures — both the same behaviour:

- **C2 fail** — "a usage error exited 0": the bare invocation, which the kit classes as a usage
  error, exits 0 with 13,827 bytes on stdout.
- **D2 fail** (the rule, not [DT-2](#dt-2--eight-refused-flags-published-as-valid)) — "bare
  invocation exited 0; wrote 13827 bytes to stdout".

This is anthill's deliberate design — bare invocation is the manifest for agents and grouped help
for humans — not drift. It is recorded as a **rule-versus-design disagreement, not a defect**, and
it is the one thing the kit surfaced that reading the manifest would not have.

**The kit found none of the eight findings, and could not have.** It probes only the root and does
not consume the declaration. Every finding above is one level down. It reported `pass (partial)` on
`A1`, `A2` and `A3` and `unverified` on `A5` and `A7` — all five falsified by the differ at the
subcommand level, which the kit's own `coverageGaps` honestly names as unprobed.

**The kit's contribution in this trial was its coverage honesty, not its findings.** That is worth
saying without hedging: a checker that reports what it did not reach is what made the gap
measurable at all. The declaration is the thing that tells a checker _where to look_, and the kit
is not yet using it.

## The second limit: runtime behaviour was reached for 4 of 25 commands

### What was refused, and why

Each of these would spawn a process, write a shared store, shell out to `gh` or git, or mutate
`.anthill/`. None were run.

- **`convene`, `join` (past parse), `spawn`, `attach`, `down`, `status`, `team use`, `commit`,
  `init`, `migrate`, `comms send`, `comms follow`, `comms stand-down`, `field-notes`** — every
  `run()` body. Spawns tmux, writes shared stores, shells out, or mutates `.anthill/`.
- **`feedback` with a _valid_ category** — reaches `realGh`. So `--submit`'s declared default
  `false` is unverified at runtime.
- **`spawn --handles`**, described as "(default: every seat in the roster)" — the manifest's
  `default` field is empty, and whether that is a generator gap or an inaccurate description cannot
  be told without spawning tmux panes.
- **`commit --paths`**, described as "never a bare `git add -A`" — an assertion about git
  behaviour, verifiable only by committing.
- **`migrate --dry-run`** — a _preview_ flag, and exactly the kind worth checking; but its code
  path is `migrate`'s, and a dry-run whose implementation was not fully traced is not a safe read.
- **`comms read --channel <other-team>`** (`exitIfOtherTeamChannel`) — needs a multi-team config
  that would have to be fabricated accurately.

**An honestly unreachable check is a result.** Each refusal above is a declared limit on the
verdict, not a gap in it.

### Unobservable from outside, confirmed by code only

`--no-format` writing boolean `false` into a `type: "string"` slot; multi-char aliases;
`hidden`/`deprecated`. None reachable by probe.

### Not expressible, so not checkable at all

Whether `valueHint` is meant to be a constraint or a label. The manifest gives no way to state the
difference, so **DT-4 cannot be automated against any target**, including this one.

### The ceiling is general, not anthill's

The trial reached run-time behaviour for **4 of 25 commands**. Every mutating command's declaration
is unverified.

A method that can only check the read-only quarter of a tool that manages teams and spawns
processes has a real ceiling — and the ceiling is not a property of anthill. It is the general case
for any CLI worth checking, because the commands that matter most are the ones that change
something.

Passing it requires the declaration to carry an **effects claim** — `read_only`, `mutates`,
`spawns` — and requires the tool to be **trustworthy about it**. That is the next thing to bet on,
and it is also the next thing to verify: an effects claim nobody falsifies is exactly the kind of
document the survey found drifting everywhere else.

## What the trial says about the method

**The method works, and the yield is not thin.**

Reading the manifest alone gives you the calibration finding and nothing more; the refused flags
look like flags with missing descriptions. Reading the code alone gives you `refused` as a
well-documented feature and no reason to suspect the manifest drops it — the `refused` design has
more prose defending it than most of the codebase, and every word of it is correct about the
parser.

**The defect lives strictly in the join.** Eight flags are advertised as valid by the same binary
that refuses them, and neither document, read alone, says so.

Three things carry forward:

1. **Make the tool enumerate its own surface.** The valid-flag-set differ is a complete,
   automatable, fully-inert census at one probe per command. Any CLI whose parse errors name the
   valid set can be checked this way today.
2. **A checker that does not read the declaration cannot find declaration defects.** The kit
   probes the root; every finding is one level down. The declaration is what tells the checker
   where to look.
3. **The sharpest finding is not in the predicted class.** Structural gaps were the expected yield
   and were the largest class — but DT-2 is a plain generator bug: a field that exists in the source,
   matters to behaviour, and is dropped in transit. Checking against behaviour is what makes a
   dropped field visible. From inside the tool it is an absence, and **absences do not fail
   tests.**

---

## Findings that arrived after the trial

**These are not the trial's findings and do not move its counts.** One stale, one wrong, six
incomplete still describes the eight above. The two below were found on 2026-08-25, by different
people and by different means, and are filed here because the `DT-` series is the namespace for
findings about this target.

Both were **measured in this tree** on 2026-08-25, from a scratch directory outside both
repositories, using only help, version and parse-error paths — the classes
[the method section](#method) established as inert.
Nothing was written and no command body ran. Both were reproduced in separate processes.

### DT-9 — the manifest is a bare document while every other output is enveloped

**Reported by the adopter behind anthill**, who had run `acc check` against it twice and read
[`STANDARD.md`](../../STANDARD.md) for the first time. It is their finding; the confirmation and the
framing below are this report's.

Every anthill command answers with an envelope. Success is `{ok: true, data, meta}` and failure is
`{ok: false, error, meta}`:

```
$ anthill --version
{"ok":true,"data":{"version":"2.3.0","source":"…/cli.ts"},"meta":{"command":"version"}}

$ anthill info show --nope
{"ok":false,"error":"Unknown option '--nope'. Valid flags: --format","meta":{"command":"info show"}}

$ anthill            # bare invocation, piped
{"ok":true,"data":{"name":"anthill","version":"2.3.0","description":…},"meta":…}
```

`help --json` does not:

```
$ anthill help --json
{
  "name": "anthill",
  "version": "2.3.0",
  "description": "Project orchestration CLI",
  "commands": [ … ]
}
```

Same manifest, same process, two shapes. The bare invocation wraps it; the documented machine
spelling does not — and `help --json` is the invocation anthill's own human help screen tells the
reader to run for a machine-readable manifest.

**Why it is worth an id rather than a shrug.** This is
[`STANDARD.md`'s own "machine mode is a mode, not a flag on one command"](../../STANDARD.md#machine-mode)
failing on the one command where it costs most. A consumer that has learned the envelope reads `ok`
before anything else; against the declaration it reads `undefined`, and the branch it takes next is
whatever it does for a malformed response. The one machine output whose entire job is to be
machine-readable is the only one a caller has to special-case, and the caller discovers that at the
first invocation it ever makes.

It is also not visible from either document alone — the same shape as [DT-2](#dt-2--eight-refused-flags-published-as-valid).
The manifest is well-formed. The envelope is well-formed. The defect is that they are different
answers to the same question from the same binary, and only running both shows it.

**Class: wrong.** Not incomplete: nothing is missing from the manifest here. Two of the tool's own
machine outputs disagree about their own contract, which `STANDARD.md` files under
[the one cross-artifact check that needs no external model](../../STANDARD.md#checkable-and-not-built).

**Why the kit did not find it, and why it is not a kit defect.** `acc` probes the root, and at the
root anthill's answer _is_ enveloped. The disagreement is one level down, on `help --json`, which
the kit does not reach — the same structural reason it found none of the eight above.

### DT-10 — two builds of the same declared version disagree about whether the root enumerates

Found while confirming DT-9, and it is a finding about **this project's own numbers** rather than
about anthill's manifest.

[`STANDARD.md`](../../STANDARD.md#a-caller-may-declare--and-at-the-root-that-is-all-the-census-can-act-on)
and [`declaration.test.ts`](../../src/acc/kit/declaration.test.ts) both rest on anthill's root
naming a flag when it rejects one — `Unknown option '--nope'. Valid flags: --format` — which is what
makes `1 of 25` paths comparable rather than none. Measured on 2026-08-25, that holds on one build
and not the other, from the same working directory:

```
$ bun …/dreamwood/anthill/plugin/scripts/anthill/cli.ts --nope
{"ok":false,"error":"Unknown option '--nope'. Valid flags: --format","meta":{"command":"anthill"}}

$ anthill --nope                      # the PATH launcher, ~/.bun/bin/anthill
{"ok":false,"error":"No command specified.","meta":{"command":"anthill"}}
```

Both self-report `version: "2.3.0"`. The second resolves to the published plugin build; the first is
the repo checkout, whose git HEAD has moved past the release the literal names. The root's answer to
an unknown flag is therefore **not** a property of anthill `2.3.0`; it is a property of which build
you invoked, and only one of the two enumerates.

**What it costs.** The trial compared these two targets once and found their manifests
byte-identical, which was true and which is not the same question — it compared what they _declare_,
never what they _reject_. So `1 of 25` is sound as measured and is a figure about the repo checkout.
On the published launcher the root names no flag, the census has nothing to compare, and a modelled
declaration for it buys what the verb-first case buys: a report about what could not be compared.

**Class: wrong** — about a version claim, not about the manifest. A binary whose behaviour differs
from the release it names is the staleness class the survey knows about, arriving on the axis
nobody diffs: not the declaration against the code, but two builds against each other.

**Disposition.** `STANDARD.md`'s `1 of 25` sentence now carries the build it was measured on and
points here. The in-tree expectation in `declaration.test.ts` is **not** changed: its fixture is the
recorded surface `["--format"]`, which is what the repo checkout answers, and re-baselining it on
this finding would delete the record rather than correct it. What was owed is that any future
re-measurement names its build.

**Discharged 2026-08-26, and by construction rather than by discipline.** Every report now carries
`targetIdentity` — what the target said about itself under `--version`, quoted from the probe `D1`
already runs on every target, and rendered under `TARGET IDENTITY` in the text report and beside
each target in `acc compare`. It is what the report was missing: `target` is a path, `targetArgv0`
is how the kit launched it, and `kitVersion` is **ours**, so nothing in a stored report was the
tool's own account of itself. A re-measurement no longer has to remember to name its build; the
artifact carries the bytes.

**What it establishes is narrower than the disposition it discharges**, and the scope is the one
this finding argued for: **a binary that answers this way existed at capture time**, and nothing
more. It does not establish which build, which release, or — when two reports quote different
bytes — that they came from different builds. It is not a verification that the target reported a
version either: `D1`'s detector is a non-empty stdout at exit `0`, and its standing coverage gap
says stdout is never checked to carry a version string.

**What discharges this disposition is anthill's own answer, not the field's general power.** The
version literal is `2.3.0` on both builds, and if that were the whole answer the field would carry
the same bytes twice and settle nothing. It is not the whole answer: anthill's `--version` names
the file it ran from, which is visible in [DT-9](#dt-9--the-manifest-is-a-bare-document-while-every-other-output-is-enveloped)'s
own specimen above and in [DT-1](#dt-1--root---format-is-declared-in-code-absent-from-the-manifest-and-inert-where-it-looks-like-it-works)'s
`--format text --version` line. Re-measured 2026-08-26, on the same pair this finding is about:

```
$ anthill --version                       # the PATH launcher, ~/.bun/bin/anthill
{"ok":true,"data":{"version":"2.3.0","source":"/Users/…/plugins/cache/anthill-marketplace/anthill/2.3.0/scripts/anthill/cli.ts"},"meta":{"command":"version"}}

$ bun …/dreamwood/anthill/plugin/scripts/anthill/cli.ts --version
{"ok":true,"data":{"version":"2.3.0","source":"/Users/colereed/Projects/dreamwood/anthill/plugin/scripts/anthill/cli.ts"},"meta":{"command":"version"}}
```

Same declared version, **different bytes**. So a report of either build now carries, in the tool's
own words, which of the two it was, and a re-measurement does not have to remember to name its
build. That is a property of the answer anthill happens to give: a tool whose `--version` prints
the bare literal would leave two of its builds quoting identically, and this field would be silent
about which one ran.

**What `acc compare` adds here, and what it does not.** Run on the two reports, it renders both
quotes side by side and **does not** print its NOTE — the NOTE fires only when every target quotes
the same bytes, and these do not. Nor does DT-10's own divergence appear among the divergent
probes: `compare`'s axes are **ending** and **placement**, both builds reject `--acc-probe-xyzzy-flag`
at exit `1` on stderr, and so that probe lands in **AGREED** with the difference between
`Valid flags: --format` and `No command specified.` inside it. Where the difference does surface is
the `SELF-DECLARED FLAGS` block, which reads each target's rejection rather than comparing exit
codes:

```
  SELF-DECLARED FLAGS — …
    launcher  did not enumerate at the root; 4 rejections read, none named a set (NOT a tool with no flags)
    checkout  enumerated 1 flag at the root: --format
```

That is this finding, rendered from two stored artifacts by a command that was given no prose. The
NOTE is for the case these two builds are **not** — two targets whose quotes are byte-identical
while their probes disagree — which is the reading a reader could otherwise reach by accident, and
in the wrong direction, by taking equal quotes for one binary.
