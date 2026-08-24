---
type: research
generated: { by: claude-opus-5, at: 2026-08-22 }
status: stable
description: Whether any standard exists by which a CLI declares its own interface in machine-readable form, surveyed across runtime emitters, build-time artifacts, hand-authored specs and third-party registries.
tags: [declaration, schema, conformance, contract, mcp]
---

# Is there a standard by which a CLI declares its own interface?

**Research date:** 2026-08-22

**Method:** A **web survey conducted by an agent**, working from public repositories,
specifications, issue trackers, package registries and documentation sites reachable by search.
**Nothing was installed and nothing was run.** No binary was probed, no schema was emitted, no
star count or download figure was independently audited beyond reading the page that displayed
it. Three parallel research streams were used, split by where a declaration lives (runtime,
build-time, hand-authored/registry) with deliberate query overlap on the conformance question so
that a negative result there would come from two independent search paths rather than one.

**Confidence notation**, per claim:

- **[READ]** — a primary source was loaded and, where quoted, quoted verbatim: a spec page, a
  merged PR, a schema file, a source file, a registry listing.
- **[INFERRED]** — concluded from _absence_ (no such issue, no such job, no such test) or from
  reasoning over what was read. Absence found by search is weaker than absence found by
  exhaustion, and every one of these is flagged.

There are **no measured claims in this note.** Where the original survey marked something as
inference, that marking is preserved below rather than smoothed away.

**Scope bounded.** The question asked was descriptive — _does a standard exist_ — not
evaluative. Deliberately not looked at: shell-completion UX quality; anything behind a login or
paywall; non-English sources; internal or unpublished vendor formats; and the many
Windows-specific or IDE-specific command models that never surface at a shell. Popularity
figures (stars, downloads) are snapshots taken on the research date and will be wrong later; they
are recorded because the _order of magnitude_ is the load-bearing part, not the digit.

---

## 1. The direct answer

**No, there is no standard — and as of August 2026 the field is fragmenting rather than
converging.** [READ]

There are at least **four** live projects each describing itself as "OpenAPI for CLIs," **two of
them literally named OpenCLI and mutually unaware of each other** — the more active one's stated
inspirations list does not mention the other. The two things that _are_ genuinely widespread —
framework completion protocols, and vendor API models — describe something adjacent to, but not
the same as, a CLI's interface.

The honest formulation is not "no standard, full stop." It is: _there is no standard, here are
the three closest things, and here is what each costs._

---

## 2. The three closest candidates

### 2.1 `jdx/usage` — closest on expressiveness, weakest on legitimacy

[jdx/usage](https://github.com/jdx/usage), 929 stars, v6.3.0 released **the day of this
research** (6.1.1 → 6.3.0 inside two days). KDL. Explicitly self-described as "OpenAPI (swagger)
for CLIs." [READ]

It is the **only format found in this survey that covers exit codes _and_ output formats _and_ a
JSON Schema for stdout.** [READ]

- **Output formats** ([reference](https://usage.jdx.dev/spec/reference/output)):
  `output "json" media_type="application/json" framing="json"`, where `framing` is
  `text|json|jsonl` — described in the spec as _"the stream contract a consumer reads"_ — plus an
  embedded or file-referenced JSON Schema for stdout, a `select` binding an output set to a
  `--format` flag (whose `choices` are then auto-filled), a `default`, and per-command
  inheritance and refinement.
- **Exit codes**: `exit_code 0 "all checks passed"`, folded by number, inheritable CLI-wide and
  refinable per command.
- Plus nested `cmd`, hideable `alias`, global flags, `count` flags, `choices` with `strict`,
  `conflicts`, `overrides`, `required_unless`, exclusive groups, `default_subcommand`,
  `external_subcommand`, `subcommand_precedence_over_arg`, `arg_required_else_help`,
  `deprecated`, `hide`, env vars, config-file backing with resolution order, an `argv` grammar,
  and `mount` for commands discovered by running a subprocess.

It also carries a **runtime-emission convention**: a hidden `--usage-spec` flag is the documented
integration pattern for both [clap](https://usage.jdx.dev/spec/integrations/clap) and
[Cobra](https://usage.jdx.dev/spec/integrations/cobra) — the binary prints its own spec, which
pipes into `usage generate completion|md|manpage|sdk`. Completion scripts can re-fetch it at
runtime via `--usage-cmd 'mycli --usage-spec'`. [READ]

**`usage diff`** ([docs](https://usage.jdx.dev/cli/diff)) is the closest existing thing to a
CLI-contract differ. It classifies every change as `breaking` / `compatible` / `metadata` under
one stated rule — _"a command line that worked against the old spec now fails, binds differently,
or resolves to a different value"_ — with a published edge-case table: dropping a value from a
`strict` choices set is breaking, from a non-strict set is metadata; appending an optional
positional is compatible, a required one is breaking; renaming a command that keeps an alias is
metadata. Exits 1 on breaking; `--format json` for scripting. The documented CI shape is
`mycli --usage-spec | usage diff released.usage.kdl - --breaking`. [READ]

**Note precisely what that is: spec-to-spec, not spec-to-behaviour.** When the left side is
emitted by the binary it _is_ the implementation, so what it detects is release-over-release
regression, not a lying declaration.

**Adoption is the weak point, and it should not be softened.** [READ] Bus factor 1 — jdx has 891
commits, the next human 19. `clap_usage` shows 88k recent downloads, essentially all of them the
author's own tools (mise, hk). The Node/Python/Java integrations exist but
`@usage-spec/oclif` shows **11 downloads/month**. GitHub code search finds **zero** `*.usage.kdl`
files outside the ecosystem. The docs are candid about extraction limits: a clap-generated spec
cannot carry `requires` or `default_value_if` because clap exposes no getter, and
`clap_usage::spec_with_report` exists precisely to report those losses.

### 2.2 `clispec` — closest on intent, effectively pre-adoption

[clispec.dev](https://clispec.dev/) — "The CLI Spec," by Ruben Jongejan
([rvben/clispec](https://github.com/rvben/clispec)), created **2026-04-03**, **10 stars**, v0.3
still a candidate. [READ]

Six principles for CLIs that work for humans, scripts and agents. **Principle 2 mandates a
`schema` subcommand** emitting a document that validates against
`https://clispec.dev/schema/v0.3.json` (JSON Schema draft 2020-12): required `clispec`, `name`,
`version`, `commands`, `errors`; optional `output {tty, piped}`, `global_args`, `outcomes`.
Enumerations include `effects: read_only|idempotent|non_idempotent`,
`output_kind: data|stream|opaque`, `cardinality: single|bounded|unbounded`,
`pagination.style: cursor|offset|none`, and `stability`. **Every error kind declares its exit
code.** [READ]

Its [Verifying Compliance](https://clispec.dev/guide/verifying/) page is the closest published
prior art found to declaration-conformance testing, and it opens with the framing:

> _Two halves, and both are needed. The document says what your tool claims. … The tool has to
> actually behave that way. No amount of schema validation proves that `--yes` is honored or that
> stdout is clean._

It then documents **declaration-driven probing** — reading the schema to decide what to test:

```sh
kind=$(mytool -o json bad-command 2>&1 >/dev/null | tail -n1 | jq -r '.error.kind')
want=$(mytool schema | jq -r --arg k "$kind" '.errors[] | select(.kind==$k) | .exit_code')
mytool -o json bad-command >/dev/null 2>&1; [ "$?" = "$want" ]
```

…and states the rule **"do not probe what the tool did not claim"**: only a command declared
`cardinality: unbounded` owes you pagination, and the limit flag and cursor field come from the
document, not from a convention. It also separates what a static checker can prove from what only
a runtime probe can — _"The checker can only prove the argument exists; that the tool accepts the
token it just handed out is a runtime fact."_ [READ]

[rvben/clispec-cli](https://github.com/rvben/clispec-cli) implements it: spawns the binary in its
own process group, sanitizes `HOME` to prove `schema` needs no config, 30s timeout with SIGKILL,
ten checks each pinned to a spec checklist item (_"a check that cites no checklist item has no
basis in the spec and must not award or deduct points"_), and genuine declaration-vs-behaviour
diffing — _"a declared structured default the tool does not actually emit — fails."_ [READ]

**Scale, stated plainly:** `clispec-cli` has **0 stars and roughly 705 total crates.io
downloads.** The spec repo has **10 stars**, is **four months old**, and has a **single author**.
Its "reference implementations" are all that same author's own tools — verified against
[rvben/homebrew-tap](https://github.com/rvben/homebrew-tap): proxctl, dotpick, downstat, jira-cli
and others. This is one person's project, not an ecosystem. [READ]

It also concedes the hard part. Its
[implementation guide](https://github.com/rvben/clispec/blob/main/docs/guide/index.md) has a
section titled _"The part your framework cannot generate"_ — `effects`, `cardinality`,
`output_kind` — with the mitigation being a test that fails when a command has no table entry,
because _"adding a subcommand is exactly the moment the declarations go stale, and exactly the
moment nobody is thinking about the schema."_ [READ]

### 2.3 OpenCLI ×2 — same name, same tagline, unaware of each other

**[spectreconsole/open-cli](https://github.com/spectreconsole/open-cli)** (Patrik Svensson of
Spectre.Console, with Bob Lail), 284 stars, [opencli.org](https://opencli.org/), **v0.1,
self-described as "just a proposal,"** last push 2026-04-26, six contributors with one dominant.
[READ] Its [`draft.md`](https://github.com/spectreconsole/open-cli/blob/main/draft.md) gives
`Document` → `opencli`, root `command`, `info`, `conventions` (`groupOptions`,
`optionArgumentSeparator`); `Command` → `name`, `aliases`, `options`, `arguments`, `commands`,
**`exitCodes`**, `examples`, `interactive`, `hidden`, `metadata`; `Argument` → `required`,
`arity {minimum, maximum}`, `acceptedValues`, `group`; `ExitCode` → `{code, description}`. **No
output formats, and no types beyond `acceptedValues`.** Stated uses include _"Automate external
tools such as MCP servers"_ and _"Detect changes in CLI APIs."_ The
[launch post](https://patriksvensson.se/blog/2025/07/introducing-open-cli) records that the idea
sat dormant for three years after talks with the System.CommandLine team and was revived by MCP —
_"I haven't seen anyone take the initiative."_

**[bcdxn/opencli](https://github.com/bcdxn/opencli)**, 44 stars, active, Go, ships an `ocli`
binary, [opencli.dev](https://opencli.dev). **Independent** — its "Inspiration" list cites
OpenAPI, oapi-codegen, Cobra and yargs, and _not_ the Spectre project. [READ] Its
[schema](https://github.com/bcdxn/opencli/blob/main/spec.schema.json) has `opencliVersion`,
`info` (including `binary`), `install`, `global` (`exitCodes`, `config`, `flags`), `commands`;
args and flags carry `type`, `variadic`, `minItems`/`maxItems`, `choices`, `default`,
`alternativeSources`, `passthrough`; `ExitCodeObject` has `code`, `status`, `summary`.
Contract-first by design — `ocli validate` checks the _document_, `ocli generate` emits docs and
CLI boilerplate. **It never executes a CLI.**

Adopting the name "OpenCLI" today buys ambiguity, not interoperability.

---

## 3. `dotnet --cli-schema` — the largest real deployment, and the thing to watch

The strongest single data point in the survey. [READ]

[PR dotnet/sdk#49118](https://github.com/dotnet/sdk/pull/49118), merged **2025-06-15**, added
`--cli-schema` to **every** `dotnet` command; it shipped in **.NET 10 GA, November 2025**
([docs](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-10/sdk)).
`dotnet clean --cli-schema` emits JSON with `name`, `version`, `description`, `hidden`, `aliases`,
`arguments` (each with `valueType` as a .NET type name, `hasDefaultValue`, `defaultValue`, and
`arity: {minimum, maximum}`), `options`, and recursive `subcommands`.

**The motivation is feature-probing.** [Issue dotnet/sdk#46345](https://github.com/dotnet/sdk/issues/46345):
_"useful for tools that are doing feature-probing of the .NET CLI."_ It originated in
[dotnet/aspire#7112](https://github.com/dotnet/aspire/issues/7112) — Aspire needing to detect
whether the installed `dotnet run` supported particular flags. Empty collections and nulls are
emitted deliberately so _"deserialization by tooling and consistency on understanding by AI would
be easier."_

**The caveats are the PR author's own.** The option is **hidden and a preview**; _"the internal
structure of the CLI has many 'thorny edges'."_
[Issue #49500](https://github.com/dotnet/sdk/issues/49500): _"we don't have a published schema."_
It cannot express exit codes or output formats. [READ]

It cannot drift — it is generated from the live `System.CommandLine` tree.

**By distribution alone this is the highest-leverage thing to watch.** No third-party consumer of
it was found [INFERRED — absence in search, and the flag is hidden and preview-labelled, so
absence is weak evidence]. If Microsoft stabilises it and publishes a schema, it becomes a de
facto standard on install base alone.

---

## 4. The structural findings

These matter more than the ranking above.

### 4.1 Complete declarations are emitted, never authored

**Every artifact in this survey that covers 100% of a real CLI's surface is produced by loading
the CLI in-process and walking it.** [READ]

| Artifact                                 | How produced                                        |
| ---------------------------------------- | --------------------------------------------------- |
| `dotnet --cli-schema`                    | walks the live `System.CommandLine` tree            |
| gcloud's `cli_tree.Dump()`               | walks a live calliope CLI                           |
| Azure `azdev command-change meta-export` | loads the CLI in-process                            |
| AWS `awscli/data/ac.index`               | instantiates the live clidriver at wheel-build time |

**Every hand-authored one drifts, and none of them has a drift check.** Fig's 735 specs,
carapace's 533 completers, Cobra doc trees, `oclif.manifest.json` — all stale silently. The
universal framework mitigation is "regenerate in CI, fail on a dirty tree," which is weaker than
it sounds because it only catches divergence someone remembered to regenerate for.

**Two exceptions are worth naming:**

- **gcloud's CLI tree cannot drift by construction.**
  [`calliope/cli_tree.py`](https://raw.githubusercontent.com/twistedpair/google-cloud-sdk/master/google-cloud-sdk/lib/googlecloudsdk/calliope/cli_tree.py)
  is also the best _schema_ of the four cloud vendors and nobody uses it: `commands`, `flags`,
  `positionals`, **`constraints`** (nested mutex/required groups), and per-argument `type`,
  `choices`, `default`, **`nargs` (`0,1,'?','*','+'`)**, `completer` module path, `is_global`,
  `is_required`, `release` (`ga|beta|alpha`). It carries an explicit schema `version: '1'` with a
  documented rule — _"If an external CLI tree version does not exactly match VERSION then it is
  incompatible and must be regenerated or ignored."_ Serialization dedupes flags to cut the tree
  from ~35 MB to ~4.3 MB. It is exported by `gcloud meta list-gcloud`, which is `@base.Hidden`
  with 404ing reference docs. Google's own
  [gcloud-mcp](https://github.com/googleapis/gcloud-mcp) does **not** consume it — it uses a
  hard-coded denylist. [READ]
- **Azure's `azdev latest-index verify` is the cheapest generalisable drift gate found
  anywhere**: regenerate from the live command table, byte-compare to the checked-in JSON, exit
  non-zero naming the stale file. [READ] Its sibling `azdev command-change meta-diff` is wired
  into the Azure CLI PR pipeline as a **breaking-change gate**.

### 4.2 The gap is always in the same place

**Framework extraction gets you commands, flags, arity and enums for free. It gets you _nothing_
for exit codes, output formats, effects or idempotency — because no framework models them.**
[READ]

The introspection models exist nearly everywhere; the exporters mostly do not.

| Framework  | Introspection                                                                                                                 | Reachable from the shell?                                                                                 |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Click      | `to_info_dict()` (8.0+) — recursive, `nargs`, `multiple`, `required`, `type` (so `Choice` enums survive), `envvar`, `default` | **No.** Python API only, and absent from the published API reference                                      |
| clap       | full public getters: `get_subcommands`, `get_possible_values`, `get_num_args`                                                 | No                                                                                                        |
| picocli    | complete `CommandSpec`/`OptionSpec` object graph                                                                              | No — and its three JSON outputs are all GraalVM reflection config, none describing the CLI                |
| argparse   | private `_actions` / `_subparsers`                                                                                            | No; argcomplete keeps a `safe_actions` allowlist because introspecting argparse means executing user code |
| Cobra      | `GenYamlTree`; the `__complete` protocol                                                                                      | Per-position only                                                                                         |
| PowerShell | `Get-Command(...).Parameters` → `ParameterMetadata` with `Mandatory`, `ValidateSet`, parameter sets                           | Yes — but only for cmdlets inside PowerShell, never for external binaries                                 |

Two data points on why the exporters are missing: mitsuhiko filed the same feature request twice,
[pallets/click#461](https://github.com/pallets/click/issues/461) (2015) and
[clap-rs/clap#918](https://github.com/clap-rs/clap/issues/918) (2017, "Add JSON Export for App").
Click shipped it and almost nothing consumes it. **clap#918 has been open for nine years,
labelled `S-waiting-on-design`** — the demand is acknowledged, and nobody wants to pick the
schema. jdx/usage cites that issue by name as the reason nothing else can do CLI diffing. [READ]

Completion protocols are runtime but are not descriptions: Cobra's `__complete` answers "what
tokens are valid at _this_ position," terminated by a `:<int>` directive bitfield; clap's is
`COMPLETE=$SHELL <bin>` emitting shell-specific code behind an unstable feature; .NET's is a
`[suggest:N]` directive emitting newline-delimited candidates. All three converged on the same
_shape_ with mutually incompatible wire formats. None can enumerate a tree without recursive
process spawning, and none distinguishes "this candidate is a subcommand" from "this is an enum
value." [READ]

**Both clispec and jdx/usage arrived independently at the same conclusion**: exit codes, outputs
and effects must be declared by hand, adjacent to the code that implements them, with a test that
fails when a new command has no entry. clispec's Rust guide shows the tightest version — hang the
exit code off the error-kind enum and generate the schema's `errors` array from that same
function, _"so the declared mapping and the process status cannot drift apart."_ [READ]

### 4.3 Cloud vendors: rich API models, missing CLI models

The most consistent finding across AWS, Azure, gcloud and kubectl: **every one has an excellent
machine-readable model of its API/resource surface and essentially nothing authoritative for its
own command surface.** The gap always lands in the same place — hand-written wrapper commands,
global options, exit codes. [READ]

**AWS.** `botocore/data/<service>/<ver>/service-2.json` describes `operations`, `shapes` (with
`required`, `enum`), errors with `httpStatusCode`, plus sibling `paginators-1.json`,
`waiters-2.json`, `endpoint-rule-set-1.json` — generated upstream from **Smithy** and published
since June 2025 at [aws/api-models-aws](https://github.com/aws/api-models-aws). The CLI-specific
surface is _one small file_,
[`awscli/data/cli.json`](https://raw.githubusercontent.com/aws/aws-cli/v2/awscli/data/cli.json),
argparse-shaped, with real enums (`output: ["json","text","table","yaml","yaml-stream","off"]`).
Exit codes (0/1/2/130/252/253/254/255) are
[prose only](https://docs.aws.amazon.com/cli/latest/userguide/cli-usage-returncodes.html). The
coverage gap is bigger than `aws s3 sync`:
[`awscli/customizations/`](https://github.com/aws/aws-cli/tree/v2/awscli/customizations) is 49
modules of hand-written Python, and customizations _rewrite model-derived commands too_
(`argrename.py`, `removals.py`, `flatten.py`), so even API commands' flag names are model member
names after an undocumented Python pass. AWS states the consequence itself: _"Custom AWS CLI
commands, such as the `aws s3` commands don't support either `--generate-cli-skeleton` or
`--cli-input-json`."_ The only artifact covering both models and customizations is
`awscli/data/ac.index`, a SQLite file — **uncommitted, schema-undocumented.**

**Azure.** `~/.azure/commandIndex.json` is not a command model — it maps only the top-level word
to contributing Python modules, for import speed. The real command table is imperative Python
(`load_command_table()` / `load_arguments()`), so no model exists until you import and execute.
Three things are worth noting anyway: **[Azure/aaz](https://github.com/Azure/aaz)** ("Atomic Azure
CLI"), a published MIT repo of command models as XML plus a `Commands/tree.json` over 10 MB,
generated from Swagger 2.0 or TypeSpec, from which the Python is then generated — its
`<prop arg="…">` attribute expresses the mapping from CLI argument to JSON body property, which
no ad-hoc command tree carries, and drift is impossible for AAZ commands because the code is
generated from the model; plus `meta-export` and `latest-index verify`, covered above.

**kubectl** is the cleanest illustration of the split. The _resource_ surface is fully
machine-readable and **cannot drift because it is fetched, never declared**: discovery
(`APIResource` with `verbs`, `shortNames`, `categories`), aggregated discovery
([KEP-3352](https://github.com/kubernetes/enhancements/tree/master/keps/sig-api-machinery/3352-aggregated-discovery),
stable 1.30) and OpenAPI v3
([KEP-2896](https://github.com/kubernetes/enhancements/tree/master/keps/sig-api-machinery/2896-openapi-v3),
stable 1.27) drive `kubectl explain` and `--validate`; CRDs extend it at runtime with zero kubectl
changes. The _command_ surface is hand-written cobra with no release artifact:
[`cmd/genyaml`](https://raw.githubusercontent.com/kubernetes/kubernetes/master/cmd/genyaml/gen_kubectl_yaml.go)
emits per-command YAML but only into `docs/`; output formats are hardcoded per print-flags struct
(`return []string{"json","yaml","kyaml"}` — `wide` is not even in that set); exit codes are only
`DefaultErrorExitCode = 1` plus a `CheckDiffErr` special case, because `kubectl diff` reuses exit
1 to mean _differences found_. Plugins are undeclared **by design** — krew manifests explicitly
say _"Avoid including a list of commands or options for your plugin."_ [READ]

**Build-time artifacts drift in the ordinary way too.** `oclif.manifest.json` is generated in
`prepack` for startup speed and _"can and does go stale"_ — rename a command, skip regeneration,
get `Cannot find module`. Nothing verifies it. Cobra's `GenYamlTree` is the only structured Cobra
export and gives `Name`, `Synopsis`, `Options` with `DefaultValue` as a _string_ (so bool and
string flags are indistinguishable), `InheritedOptions`, `SeeAlso` — no types, no arity, no
enums, no required-ness, no nesting; subcommand structure is recoverable only by parsing
`see_also` cross-references. [READ]

---

## 5. Nothing checks a tool against its own declaration

**Almost nothing, and the "almost" is four months old.** [READ, with the negative result
[INFERRED] from exhausted search]

Two agents searched this independently with non-overlapping queries — `"CLI conformance test"`,
`"CLI contract testing"`, `"schemathesis for CLI"`, `"dredd for CLI"`,
`detect CLI breaking changes compare --help between versions`,
`property testing for command line interfaces`, plus GitHub repository searches. **There is no
Dredd, no Schemathesis, no Pact for CLIs.** Every 2026 contract-testing roundup (Specmatic, Pact,
Dredd, Keploy) is API-only.

The single exception is **clispec** (§2.2): a four-month-old, 10-star, single-author spec with a
0-star reference implementation.

The adjacent tools, and why they are not this:

- **[modiqo/cliare](https://github.com/modiqo/cliare)** (534 stars, 236 crates.io downloads,
  Rust, active) — _"like OpenAPI/Swagger for CLIs, but generated from runtime evidence rather than
  hand-written docs."_ Probes a released binary as a black box, snapshots the filesystem around
  each probe to catch side effects from "safe" commands, and emits `command-index.json`,
  `shape.json`, `evidence.jsonl`, SARIF, JUnit, a scorecard and an `AGENT_SKILL.md`. **It derives
  a declaration by probing rather than falsifying one** — no declaration input, no drift check
  against a claimed spec.
- **[Camil-H/cli-agent-lint](https://github.com/Camil-H/cli-agent-lint)** (56 stars, dormant since
  May 2026) — 34 convention checks, `--no-probe` to run passively.
- **[hop-top/spec-12fc](https://github.com/hop-top/spec-12fc)** (0 stars) — a lint-plus-probe CI
  gate, not a spec differ.
- **[modelcontextprotocol/conformance](https://github.com/modelcontextprotocol/conformance)** (107
  stars, official) — validates **protocol** compliance, i.e. JSON-RPC wire schemas. It does _not_
  check that a tool annotated `readOnlyHint: true` is actually read-only, or that output matches
  `outputSchema`. **The same gap reappears one level up.**
- The doc/behaviour research line (CASCADE, Metamon, PatchGuru) generates tests from prose with an
  LLM; it is not declaration conformance.

---

## 6. The Fig post-mortem

The largest third-party CLI-description registry ever built, and it is a **zombie, not an
archive.** [READ]

|                                                     |                                                                                                                                                                        |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `withfig/autocomplete`                              | **25,218 stars**, **735 spec directories**, **not archived**, last commit **2025-05-05**                                                                               |
| Recent PRs                                          | closing **unmerged** (#2495 on 2026-07-14, and #2624, #2618, #2521, #2592, #2602)                                                                                      |
| `@withfig/autocomplete-types` on npm                | last published **2024-05-08** — yet still ~10.5k downloads/month                                                                                                       |
| `@withfig/autocomplete` on npm                      | ~31k downloads/month                                                                                                                                                   |
| fig.io                                              | **HTTP 503** — including `fig.io/docs`, which the README still directs contributors to                                                                                 |
| Successor `aws/amazon-q-developer-cli-autocomplete` | created 2025-05-15, 54 stars, last commit 2025-11-15                                                                                                                   |
| Amazon Q Developer                                  | [end-of-support announced 2026-04-30](https://aws.amazon.com/blogs/devops/amazon-q-developer-end-of-support-announcement/): signups blocked 2026-05-15, EOL 2027-04-30 |

**What a Fig spec declared:** `subcommands`, `options` (`isRepeatable`, `exclusiveOn`,
`dependsOn`, `requiresEquals`), `args` (`isVariadic`, `isOptional`), `generators`. `exitCode` and
`stdout` appear only in `HistoryContext`/`ExecuteCommandOutput` — runtime values handed _to_
generators, never declared facts. So: **invocation surface only.**

**Its CI ran `build`, `lint`, `typecheck`, `verify-cla` — TypeScript type-checking of the spec
documents, and never a probe of a real binary.** That is exactly how 735 hand-maintained
declarations drift silently.

The format outlived the product as an interchange target: jdx/usage ships `usage generate fig`,
and the download numbers show live consumption 15 months after the last commit.

The other registry, [clime.sh](https://clime.sh/) — "The CLI Registry for AI Agents," 856 CLIs
with "command maps" — is effectively abandoned: `@cli-me/cli` last published **2026-02-23**, **39
downloads/month**, "Claim-Verified Publishers: 0." [READ]

---

## 7. The failed and dormant attempts

**GNU has no machine-readable intent, and never did.** The
[coding standards](https://www.gnu.org/prep/standards/html_node/_002d_002dhelp.html) say only that
`--help` should "output brief documentation… then exit successfully."
`struct argp_option`'s `doc` field is explicitly "for printing in help messages."
**[help2man](https://www.gnu.org/software/help2man/) is the proof the ecosystem knew this was
insufficient** — its documented heuristics are literal string matches (`Options:`, `Copyright`),
and its escape hatch when parsing fails is `--include` with hand-written text. [READ]

**POSIX Chapter 12 "Utility Conventions"** defines a notation for _documenting_ syntax plus 14
guidelines, and
[no machine-readable declaration and no conformance procedure](https://pubs.opengroup.org/onlinepubs/9699919799/basedefs/V1_chap12.html).
No Austin Group proposal for one was found. Solaris **CLIP** is prose too —
[illumos `intro(1)`](https://illumos.org/man/1/intro) describes it as a superset of the POSIX
guidelines, with no artifact. [READ]

**clig.dev is alive, inert, and consumed by nothing.**
[cli-guidelines/cli-guidelines](https://github.com/cli-guidelines/cli-guidelines), 3,828 stars,
not archived, but content commits since roughly 2021 are typo and link fixes. No schema, no
linter, no validator, no version number. Its only mechanical consumers are LLM prompt-packs — i.e.
consumption _as text_. [READ]

**IETF: two hits ever.**
[`draft-michaud-hcli`](https://datatracker.ietf.org/doc/draft-michaud-hcli/) "Hypertext Command
Line Interface" — a single `-00`, **expired 2025-02-08**, never adopted. And
[`draft-dkg-openpgp-stateless-cli`](https://datatracker.ietf.org/doc/draft-dkg-openpgp-stateless-cli/)
(active, `-16`), a genuine partial exception: a prose CLI spec written _explicitly to enable
interoperability testing_, with Sequoia running [a public interop suite](https://tests.sequoia-pgp.org/)
in CI — but it is one CLI shape testing cryptographic semantics, not a description format.
**OASIS: nothing.** [READ]

**The best post-mortem is [RFC 3535](https://www.rfc-editor.org/rfc/rfc3535.html)** (IAB Network
Management Workshop, 2003), lines 420–427, verbatim:

> _The command line interface is primarily targeted to humans which can adapt to minor syntax and
> format changes easily. Using command line interfaces as a programmatic interface is troublesome
> because of parsing complexities._
>
> _Command line interfaces often lack proper version control for the syntax and the semantics._

That is the industry deciding, in 2003, to route **around** CLI description rather than solve it.
NETCONF/YANG is the consequence. Junos later closed the loop from the other side —
`show system schema` emits YANG with a `junos:command` extension binding RPCs to CLI commands —
but that works because **the CLI is generated from the model**, so conformance is structural and
never tested. [READ]

**docopt is the one place drift was impossible by construction, and the ecosystem left it.** The
usage string _is_ the grammar: commands, options, optional/required, alternation, repetition,
`[default: …]`. It cannot express types, **value enums** ([docopt#327](https://github.com/docopt/docopt/issues/327)
and [docopt.rs#179](https://github.com/docopt/docopt.rs/issues/179) both asked; neither got it),
exit codes, or output formats. Python docopt: 8k stars, **last release 0.6.2 in 2014**, 225+ open
issues, [#371 "Is docopt maintained?"](https://github.com/docopt/docopt/issues/371) still the
standing answer, and it emits `SyntaxWarning` on modern Python. The live fork is
[docopt-ng](https://github.com/jazzband/docopt-ng) under Jazzband (223 stars); the Rust crate is
self-deprecated. **A directly relevant precedent.** [READ]

**Extraction research is measurably lossy, and lossy in the worst place.**
[explainshell](https://github.com/idank/explainshell) (14,210 stars) indexed 29,761 Ubuntu man
pages and went stale because the pipeline was unsustainable. fish's
`create_manpage_completions.py` is the production-scale version and its bug record is the
post-mortem: [#419](https://github.com/fish-shell/fish-shell/issues/419),
[#3272](https://github.com/fish-shell/fish-shell/issues/3272),
[#9787](https://github.com/fish-shell/fish-shell/issues/9787), and structurally
[#7257](https://github.com/fish-shell/fish-shell/issues/7257) (one-man-page-per-subcommand
projects). The best recent paper,
[The Command Line GUIde](https://arxiv.org/html/2510.01453v1) (VL/HCC 2025), reached an **89.8%
mean parse rate** across 8,653 invocations — and its failure analysis is the thesis: _"head and
tail used flags not noted in their man pages"_; _"uniq's 5 failing examples contained uncommon
shorthands… not described in its man page."_ **The residue is exactly the undocumented behaviour
a conformance kit exists to catch.** That paper's own evaluation was documentation-side only,
never tested against execution. [READ]

**Even the success cases have a declaration/reality gap.** PowerShell's `OutputType` attribute is
the one place in mainstream tooling where a command declares its output shape, and
[its own docs say](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_functions_outputtypeattribute):

> _The OutputType attribute value isn't derived from the function code or compared to the actual
> function output. As such, the value might be inaccurate._

PSScriptAnalyzer's `UseOutputTypeCorrectly` rule exists to catch that — **statically, by reading
source**, never by running the command. PowerShell's MAML help XML drifts from the runtime type
system the same way. [READ]

**The through-line across all three eras:** every strategy tried has _avoided_ verification rather
than solved it. Docs-from-code (help2man, argp, MAML) — no round-trip, silent drift.
Code-from-docs (docopt, OpenCLI, AAZ) — drift impossible by construction, adoption near-zero
because it demands a rewrite. Extraction-after-the-fact (explainshell, fish, gcloud's man-page
scraper) — about 90%, and the residue is what matters.

---

## 8. The MCP analogy, and where it fails

**It partially holds, and the part that fails is exactly the part a process-level conformance kit
cares about.** [READ]

MCP revision `2026-07-28`
([tools spec](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)): a tool
declares `name`, `title`, `description`, `inputSchema` (object-typed JSON Schema 2020-12),
optional `outputSchema`, and `annotations` — `readOnlyHint`, `destructiveHint`, `idempotentHint`,
`openWorldHint`, which the spec says clients **MUST** treat as untrusted. Mutually-exclusive
groups became expressible via `oneOf` in this revision.

What it has **no vocabulary for**: **exit codes** (only a boolean `isError` — no numeric space,
and no way to declare `grep`'s convention, or `kubectl diff`'s, that non-zero means "found
something"), **stdout vs stderr as separate streams**, **stdin**, **positional arity** (erased
into named JSON properties), **repeated flags** (`-vvv` vs an array), **env vars**, **TTY
behaviour**, **streaming/partial output**, and **signals**.

The structural reason: **MCP declares the call, not the process** — and every item on that list is
a property of process execution.

Two market signals:

- **The traffic runs the other way.**
  [knowsuchagency/mcp2cli](https://github.com/knowsuchagency/mcp2cli) — MCP→CLI — has **2,365
  stars**, dwarfing every CLI→MCP wrapper (`ophis` 90, `clap-mcp` 31, `click-mcp` 14). The stated
  reason is token cost: MCP tool schemas are re-sent every turn. That is why `usage mcp` exposes
  exactly two tools, `list_commands` and `describe_command`, rather than one per command — a
  deliberate decision visible in
  [`cli/src/cli/mcp.rs`](https://github.com/jdx/usage/blob/main/cli/src/cli/mcp.rs). [READ]
- **The 2025–26 wave is MCP-motivated and is repeating the pattern.** OpenCLI's launch post names
  MCP as the trigger. Fern's [CLI generator](https://buildwithfern.com/post/cli-generator)
  generates a Rust CLI from OpenAPI, exposes `--help --format json`, and doubles as an MCP server
  — but the introspection format reads as Fern-internal rather than something a third party could
  adopt [INFERRED]. **AGENTS.md** (60k+ repositories, now under the Linux Foundation's Agentic AI
  Foundation) is explicitly _not_ machine-readable — _"just standard Markdown. Use any headings
  you like."_ And apart from clispec, all of it validates documents, not tools. [READ]

---

## 9. Other formats found, in brief

- **`carapace-spec`** ([spec](https://github.com/carapace-sh/carapace-spec), 34 stars; the
  registry [carapace-bin](https://github.com/carapace-sh/carapace-bin), 1,933 stars) — a YAML DSL
  with 533 completers in `completers/common` alone, JSON-schema'd at
  `https://carapace.sh/schemas/command.json`. Flags with arity notation, persistent flags, nested
  commands, positional and value completion. Very active, effectively single-maintainer. Its
  bridge macros delegate at runtime to argcomplete, clap and others. **Scope is completion only —
  nothing else consumes it.** [READ]
- **nushell `extern`** ([docs](https://www.nushell.sh/book/externs.html)) — declares a _typed
  signature_ for an external command inside the shell, with `@`-attached custom completers.
  Hand-authored, shell-local, never verified against the binary. Worth knowing as the "declaration
  lives in the consumer, not the tool" pattern. [READ]
- **gcloud's `ManPageCliTreeGenerator`** — builds CLI trees for arbitrary third-party commands by
  DFS-scraping `--help`, `man(1)`, or man7.org HTML. A vendor shipping third-party extraction as a
  product feature, using the same technique whose failure modes are catalogued in §7 — those trees
  can and do drift. (A small irony: the docs say `data/cli` ships trees for four tools; the
  shipped tarball contains `bq.json`, `gsutil.json` and a completions `.py`.) [READ]

---

## 10. What the survey could not determine

Kept deliberately, because these are the places where the note is weakest.

- **Whether Cobra's maintainers have ever ruled on a machine-readable command dump.** No canonical
  issue with a maintainer verdict surfaced. Treat the absence after 10+ years and enormous
  adoption (Kubernetes, Hugo, `gh`, Docker) as a signal, not as a decision. [INFERRED]
- **Whether anything checks AWS's models against the CLI implementation.** botocore's functional
  tests enforce model↔model invariants rigorously; nothing checking model↔CLI was found, but that
  is inferred from absence in the test listing. [INFERRED]
- **Whether AAZ drift is CI-gated.** `Azure/aaz` and the generated Azure CLI code live in separate
  repositories; no job regenerating and diffing was found. [INFERRED]
- **How `aka.ms/azExtCmdTree` is regenerated.** `azdev command-change tree-export` emits that
  shape, but the pipeline YAML was not located.
- **The exact Smithy-AST → botocore `service-2.json` transform** — not open-sourced; the two
  formats are not identical.
- **Whether Fern's `--help --format json` output is a published, versioned format** a third-party
  CLI could adopt, or Fern-internal. It reads as the latter. [INFERRED]
- **Real-world usage of `dotnet --cli-schema`.** It is hidden and preview-labelled with no
  published JSON Schema, and no third-party consumer was found. [INFERRED]
- **Whether clispec v0.3 will freeze**, and whether it acquires any adopter outside its author.
