# The standard

**How to build a command-line tool an agent can drive, and how to make that tool checkable
against its own claims.**

This is what the project is for. [`CHARTER.md`](CHARTER.md) argues why guidance is the primary
product and the checker serves it; this page is the guidance. Everything else in the repository —
the research notes, the trial reports, the 23-rule catalogue — is evidence that led here, and
every recommendation below points at the measurement it came from.

## How to read this

**These are recommendations, not requirements.** Consistency is not uniformity. The
[grammar survey triage](docs/reports/2026-08-23-triaging-the-argument-grammar-survey.md) is a
standing supply of defensible tools that decline conventions on this page — `ffmpeg`, `find`,
`dd`, `jq`, `ssh` and `psql` are not badly built, they are built for something else. Where a
recommendation has a known counter-example, this page names it. Declining one is a decision; the
thing worth avoiding is declining one without noticing.

**Every recommendation carries its reason.** A bare rule is not this project's voice. If a
paragraph tells you what to do and not what goes wrong otherwise, that is a defect in this page.

**Every claim about another tool traces to a source.** Where a behaviour is cited, the link names
the research note or report that read or measured it. A plausible-sounding claim about a tool
nobody checked is the exact failure this project exists to argue against.

**Checkability is marked three ways**, because the difference is this project's own subject and
blurring it here would be dishonest:

| Mark     | Meaning                                                                                         |
| -------- | ----------------------------------------------------------------------------------------------- |
| **[C]**  | Checked today by a rule in [the catalogue](docs/wiki/index.md), named where it appears          |
| **[C?]** | Checkable in principle, no checker exists — the design is known or the blocker is named         |
| **[—]**  | Nothing outside the process can establish it. Believe the author, or arrange to see it directly |

All three marks are about whether a claim can be **checked**. Whether a declaration can **express**
the claim at all is a separate axis, and a `[C?]` on a field no format can carry is not a promise
that writing one is enough — [Part 2's `In v0` column](#the-fields-and-why-each-exists) carries
that second axis for the shipped reader.

**No new rule ids are minted here.** The catalogue mints an id when a checker design exists, and
this page is upstream of that. Ids that do appear — `A1`, `B5`, `C2` and the rest — are existing
rules in [the catalogue](docs/wiki/index.md), cited so a recommendation can point at what already
binds instead of restating it.

**What this does not cover: domain design.** Whether your tool should have a `reap` verb, whether
delivery should be addressed, whether the resource model is right — none of that is here, and a
tool that gets it wrong is not failing this standard.

That boundary was found by reading a record rather than chosen from taste. A census of 298
CLI-source commits across two repositories concluded that the axis deciding what any external check
can reach is **not** defect against missing feature — it is **general against domain-specific**
([research](docs/research/2026-08-24-missing-capability-or-implementation-defect.md), whose own
classifications are marked as judgements):

> A kit can catch a **missing general affordance** — `--version`, a machine-mode error envelope, an
> exit-code taxonomy. It can never catch a **missing domain capability** — `reap`, `roll`,
> addressed delivery, session rotation — whether or not anything was built wrongly.

Of the 201 of those commits that iterate on something already built, 77 were a capability that had
never been there. **Thirty-four of the 77 were general affordances** — the ones this page is about.
Forty-one were domain capabilities, and those are yours.

Guidance for a human at a terminal is also out of scope — a different document with a different
reader, and [mixing them produces something that serves neither](CHARTER.md#what-is-out-of-scope).

---

# Part 1 — The declaration

Three moves. The first two are things other people recommend. The third is this project's finding,
and it is what makes the first two worth anything.

1. **The CLI emits its own interface description, from a command or a flag, at runtime.**
2. **That description is generated from the same structures that implement the behaviour** — not a
   parallel document, not a hand-written spec.
3. **The description is checked against the running tool**, because generation is necessary and
   not sufficient.

## 1. Emit it at runtime

**Recommendation.** Give your CLI one invocation that prints a machine-readable description of its
own interface: on stdout, exit `0`, needing no configuration and no credentials.

**Why.** The alternative — a description living beside the tool rather than inside it — has been
tried at every scale and fails the same way each time. The
[declaration survey](docs/research/2026-08-22-machine-readable-cli-declarations.md) went looking
for a standard, found none, and found something more useful on the way:

> **Every artifact in that survey covering 100% of a real CLI's surface is produced by loading the
> CLI in-process and walking it.** `dotnet --cli-schema` walks the live `System.CommandLine` tree;
> gcloud's `cli_tree.Dump()` walks a live calliope CLI; Azure's `meta-export` loads the CLI
> in-process; AWS's `ac.index` instantiates the live clidriver at wheel-build time.
>
> **Every hand-authored one drifts, and none of them has a drift check.** Fig's 735 specs,
> carapace's 533 completers, Cobra doc trees, `oclif.manifest.json`.

Fig is the post-mortem worth reading in full, and every figure in it is in
[the same survey](docs/research/2026-08-22-machine-readable-cli-declarations.md#6-the-fig-post-mortem): 25,218 stars, 735 spec directories, and a CI pipeline
that ran `build`, `lint`, `typecheck` — **type-checking the documents, and never probing a real
binary.** The collection is a zombie now, `fig.io` returns 503, and the npm packages still serve
tens of thousands of downloads a month against specs nobody has touched since May 2025.

**A runtime invocation specifically, rather than a build artifact.** A build artifact is a copy, and
a copy can be stale by the time a caller reads it — `oclif.manifest.json` is generated in `prepack`
for startup speed and, in [the survey's](docs/research/2026-08-22-machine-readable-cli-declarations.md#41-complete-declarations-are-emitted-never-authored)
words, _"can and does go stale"_: rename a command, skip the
regeneration, get `Cannot find module`. An invocation cannot be stale relative to the binary that
answers it, because it is the binary answering.

**Practical shape**, all three read in [the survey](docs/research/2026-08-22-machine-readable-cli-declarations.md#2-the-three-closest-candidates).
`dotnet --cli-schema` (shipped in .NET 10 GA, on every `dotnet` command) uses a flag;
[clispec](https://clispec.dev/) mandates a `schema` subcommand; `jdx/usage` documents a hidden
`--usage-spec` as the integration pattern for both clap and Cobra. Any of the three works. Two
properties matter more than the spelling.

**It must need nothing.** `clispec-cli` sanitises `HOME` before invoking a target's `schema`
command, specifically to prove the declaration is reachable without config
([survey](docs/research/2026-08-22-machine-readable-cli-declarations.md#22-clispec--closest-on-intent-effectively-pre-adoption)). A description you cannot read
until you have authenticated is not one an agent can bootstrap from.

**It must be listed in itself.** The one CLI anyone has run this check against — anthill, the
owner's own team-orchestration tool, and the subject of the drift trial below — omits `help` from
its manifest, the verb that produces the manifest
([DT-6](docs/reports/2026-08-24-first-drift-trial-anthill-manifest.md#dt-6--present-but-undeclared-the-entire-universal-surface-including-the-discovery-verb-itself)),
while the human help screen ends by telling the reader to run it. A caller holding the declaration
and nothing else cannot rediscover the door it came through. The same finding covers `--help`, `-h`,
`--version`, `-v`, `--` and the negation prefix: **the universal surface is what a generator walking
"the commands" walks past**, because interceptors are not commands.

**And it must not be the only machine surface, if help is one too.** Measured on eight of one
author's CLIs, the tool that behaves most like this page recommends is the one the kit can say
least about: anthill answers a piped `--help` with a 109-byte JSON document carrying no `flags`
key, so help-based discovery finds a parseable document, treats it as a complete declaration, finds
no value sets in it, and reports two rules `unverified` — **on the one target in the population
that actually declares a closed set**
([measurement](docs/reports/2026-08-24-eight-owner-clis.md)). Being machine-first makes a target
less checkable today, which is an argument for reading a declaration rather than parsing help, and
also a warning: if your help is a document, make it the same document, or make it complete.

**[C]** Of a much narrower claim than this recommendation makes: `D3` establishes that help _names_
a machine path, and its own coverage gap records that a pass never establishes the flag is accepted.
**[C?]** Running the declared invocation and requiring a parseable document back is cheap and
obvious, and nothing implements it. The kit reads the pointer without following it: a v0
declaration names the invocation that emits it, and `acc` reports when the verb in that invocation
is not among the commands the document declares — a zero-probe check, never an execution.

**Counter-example, and it is the population rather than the exception.** `jq`, `ffmpeg`, `ssh`,
`find`, `dd`, `psql` and `rg` emit no machine-readable self-description and never will. This page is
aimed at the CLI you are about to write, not at those. Their absence is the reason a checker must
also be able to read a description somebody else wrote, and the difference in what that buys is
[Part 2's problem](#where-the-declaration-lives-and-who-may-say-what).

## 2. Generate it from what implements the behaviour

**Recommendation.** Produce the description by walking the same structures your parser consumes.
Not a second document kept in step by discipline, and not a document your CI type-checks.

**Why.** This is the failure mode the field already knows about, and the survey's framing of the
universal mitigation is exact: "regenerate in CI, fail on a dirty tree" is _"weaker than it sounds
because it only catches divergence someone remembered to regenerate for."_ Two artifacts in the
survey cannot drift at all, and both are the same move — gcloud's CLI tree is serialised from a live
calliope CLI, and Azure's AAZ generates the Python from the model rather than the other way round.
Junos closed the same loop by generating the CLI from a YANG model, which is why the survey records
that _"conformance is structural and never tested"_
([§7](docs/research/2026-08-22-machine-readable-cli-declarations.md#7-the-failed-and-dormant-attempts)).

`acc` — this repository's own kit, and the reference implementation of the spec — states the rule in
one line of its `schema.ts`, and it is the sentence to steal:

> A schema maintained separately from the parser is a document that lies as soon as anyone edits
> the other.

**Where generation gets you nothing, and you must write it by hand anyway.** The survey's second
structural finding:

> Framework extraction gets you commands, flags, arity and enums for free. It gets you **nothing**
> for exit codes, output formats, effects or idempotency — because no framework models them.

clispec and jdx/usage reached the same answer independently: declare those by hand, **adjacent to
the code that implements them**, with a test that fails when a new command has no entry. clispec's
Rust guide has the tightest version — hang the exit code off the error-kind enum and generate the
schema's `errors` array from that same function, _"so the declared mapping and the process status
cannot drift apart."_ Its implementation guide has a section titled _"The part your framework cannot
generate"_, and the reason it gives for the test generalises: _"adding a subcommand is exactly the
moment the declarations go stale, and exactly the moment nobody is thinking about the schema."_

**And one source of truth sits outside the code entirely.** Generation walks the parser, so what it
reports is the parser's organisation — which is not always the contract the caller is following. The
first outside application of this page hit that as its opening design question: a CLI whose parser
held one global flag registry had to decide whether to declare those flags global (honest to the
parser, useless to the caller) or split them per verb. The implementer settled it by reading their
own shipped documentation rather than their code
([SG-7](docs/reports/2026-08-24-first-outside-application-grapevine.md#sg-7--what-the-standard-gained-a-flag-can-be-global-because-the-tools-docs-make-it-global)),
in their words:

> grapevine's own SKILL.md instructs agents to _pass identity on every verb_ ("a fresh shell per
> command means the env var doesn't persist, so pass `--as`/`--from` explicitly"). So
> `--as`/`--from` are contractually global — a caller following our own docs sends them everywhere —
> and everything else goes per-verb.

**A flag is global because the tool's own shipped instructions to its callers make it global.** That
is a source of truth neither the parser nor the command table holds, and a declaration that
contradicts the shipped SKILL.md, README or agent instructions is wrong even if it matches the code,
because the caller is following the document and not reading the source. It bites hardest on
agent-facing CLIs, where the shipped instructions are often _the_ interface an agent meets first.

**The measurement is what makes the split safe to recommend to somebody else**, because moving flags
per-verb is a breaking change: flags that were accepted-and-ignored become errors. On that CLI, **24
flags moved per-verb, identity stayed global, and all 107 pre-existing tests passed unmodified** — so
nothing in its own recorded usage had ever relied on a cross-verb flag. Those numbers are the
implementer's, recorded in the report **as reported and not independently verified**, because their
tree is not reachable from this checkout.

**[—]** for the claim itself. Nothing on this page reads a SKILL.md: emitting from the parser,
generating from the command table and checking against the running tool all miss it by construction,
and the kit has no way to falsify a declaration that contradicts the documentation shipped beside the
binary.

**What generation does not prevent.** It kills staleness. It does not kill **incompleteness**, and
incompleteness is the larger problem. That is the next section, and it is a measurement rather than
a worry.

**[—]** Nothing outside your process can establish that your emitter walks your parser's
structures. What is visible is the consequence.

## 3. Check it against the running tool

**This is the finding, and it is argued rather than asserted.**

`CHARTER.md` bets that a declaration bound to code is different from the declarations that died.
The [first drift trial](docs/reports/2026-08-24-first-drift-trial-anthill-manifest.md) is the first
test of that bet anywhere — the survey found **nothing that probes a running tool and falsifies
what it declares**. Its own wording is "almost nothing, and the 'almost' is four months old": the
single exception, clispec, had 10 stars and a 0-star reference implementation when the survey read
it
([§5](docs/research/2026-08-22-machine-readable-cli-declarations.md#5-nothing-checks-a-tool-against-its-own-declaration)).

**The nearest thing anyone does is real, and it is not this.** Azure's `azdev latest-index verify`
is what the survey calls
[the cheapest generalisable drift gate found anywhere](docs/research/2026-08-22-machine-readable-cli-declarations.md#41-complete-declarations-are-emitted-never-authored):
regenerate from the live command table, byte-compare to the checked-in JSON, exit non-zero naming
the stale file. That is good practice and it answers a different question — it compares a
generated artifact against a regenerated one, both from the same in-process source, so it catches
a copy falling behind its generator. It cannot catch a declaration that was never right at
generation time, and that is the class the trial below found.

The target was chosen to be the strongest form of the bet. anthill emits its manifest from the same
`define.ts` structures its parser consumes, regenerated live on every invocation, with no second
copy to fall out of date. The survey says a document like that should not drift.

**It found eight disagreements. One stale, one wrong, six incomplete.**

The distribution is the argument.

**The one stale finding is the smallest one.** A `0.1.0` scaffold literal in `info show`, while the
manifest and `--version` both say `2.3.0` — two machine-readable outputs of one process disagreeing
about what it is
([DT-7](docs/reports/2026-08-24-first-drift-trial-anthill-manifest.md#dt-7--the-cli-reports-two-different-versions-of-itself)).
Staleness is the entire failure mode the prior art knows about, and generation had already reduced
it to this.

**The finding that endangers a caller is wrong at generation time.**
[DT-2](docs/reports/2026-08-24-first-drift-trial-anthill-manifest.md#dt-2--eight-refused-flags-published-as-valid):
the framework has a `refused` property — a flag the command recognises and deliberately refuses,
registered with the parser so it does not read as "unknown", and excluded from the advertised valid
set. The manifest type has no `refused` field, so eight refused flags are emitted as ordinary valid
ones. **The same binary publishes the flag and refuses it.** Regenerating does not help; the
manifest has never been right. The refusal machinery is careful, well-reasoned work, and the
manifest inverts it.

**Six findings share one shape**: the model the generator writes into has no slot for part of the
surface. Positionals emitted inside the array called `flags`, so a consumer that iterates `flags`
constructs invalid argv for 7 of 25 commands — including the command every user runs. A `valueHint`
string that is an enforced closed set on one flag and an ignored label on 21, with no field
distinguishing them. A `type: "string"` hiding a validated integer, and three flags that are
mutually exclusive with nowhere to say so. The entire universal surface, present and accepted and
absent from the document.

The trial's closing sentence is the one to carry:

> Checking against behaviour is what makes a dropped field visible. From inside the tool it is an
> absence, and **absences do not fail tests.**

**So generation is necessary and not sufficient.** It eliminates the class the field knows about and
leaves the larger class untouched, and the larger class is invisible from inside the process by
construction. There is no test you can write against a field your type does not have.

### The cheapest version of "checked"

The trial's highest-yield probe is worth adopting directly. It costs one inert invocation per
command and needs no cooperation beyond one property most strict parsers already have:

> **Make the tool enumerate its own surface.** anthill's unknown-flag error names the valid set —
> `Unknown option '--nope'. Valid flags: --format`. That string is the parser's own account of what
> it accepts, produced by the parser rather than by documentation. Diffing it against the
> declaration's flag list across every command path is a complete census of the
> declared-versus-accepted gap: fully inert, no mutation, no guessing, automatable end to end.

**This generalises to any CLI whose parse errors name the valid set**, and it is available today
with no kit at all — a shell loop and `jq` will do it. If you build one thing from this page before
anything else, build that.

**Note what a spec-to-spec differ is not.** `usage diff` is the closest existing thing to a CLI
contract differ, and it is genuinely good: it classifies every change as breaking, compatible or
metadata under one stated rule, with a published edge-case table
([survey](docs/research/2026-08-22-machine-readable-cli-declarations.md#21-jdxusage--closest-on-expressiveness-weakest-on-legitimacy)). But when the left side is emitted
by the binary it _is_ the implementation, so what it detects is release-over-release regression, not
a lying declaration. The same gap appears wherever it is looked for. PowerShell's `OutputType`
attribute is the one place in mainstream tooling where a command declares its output shape, and its
own documentation, quoted in [the survey](docs/research/2026-08-22-machine-readable-cli-declarations.md#7-the-failed-and-dormant-attempts), says:

> _The OutputType attribute value isn't derived from the function code or compared to the actual
> function output. As such, the value might be inaccurate._

PSScriptAnalyzer has a rule to catch that — statically, by reading source, never by running the
command. And MCP's official conformance suite validates protocol compliance and does **not** check
that a tool annotated `readOnlyHint: true` is actually read-only
([survey](docs/research/2026-08-22-machine-readable-cli-declarations.md#5-nothing-checks-a-tool-against-its-own-declaration)). **The same gap reappears one
level up.**

### The ceiling, stated honestly

The trial reached run-time behaviour for **4 of 25 commands**. Everything that spawns a process,
writes a store, shells out or mutates state was refused and stayed refused, so **every mutating
command's declaration is unverified**.

That ceiling is general rather than anthill's. It is the case for any CLI worth checking, because
the commands that matter most are the ones that change something. This page used to say that passing
it required the declaration to carry an effects claim and the tool to be trustworthy about it, while
noting in the same clause that an effects claim nobody falsifies is exactly the kind of document the
survey found drifting everywhere else. **That objection won.** A subject's account of itself is
evidence to test, never a licence to execute it, so no claim in any format was ever going to lift
this ceiling. What lifts it is somebody who already holds the authority doing the running — the
operator, on their own machine, handing back what came out — or an execution boundary the checker
owns. Neither is built here, and this page does not pretend it is solved.

**[C?]** The declared-versus-accepted census, on any target whose parse errors name the valid set —
and the kit now ships it, at the root, behind `acc check --declaration`. It is not `[C]`, because it
is not a rule: it mints no id, feeds no verdict, and reports a disagreement as two readings rather
than as a failure, since nothing here can tell which side is wrong. Below the root it stays
unbuilt.
**[—]** Anything behind a command that changes state, until there is a sandbox to run it in.

---

# Part 2 — What the declaration carries

Every field below earns its place one of two ways: it **retires a guess** a checker or an agent
currently makes from a spelling, or it **unlocks a probe** that would otherwise be unsafe or
meaningless. A field that does neither is documentation — real content, and it buys no verdict and
prevents no defect.

**The declaration must not restate the rules.** "My unknown flags exit 2" is a claim a checker
already establishes by probing; declaring it is either redundant or a self-issued waiver wearing a
schema's clothes. The declaration says what kind of thing this is and where its surface is. The
catalogue says what it owes.

## The fields, and why each exists

**Read the last column before you write an emitter.** It answers a different question from the
`[C] / [C?] / [—]` marks used everywhere else on this page, and conflating the two costs an
implementer a design pass. Those marks say whether the kit can **check** a claim. The `In v0`
column says whether the one reader that exists can **read** it at all. `v0` is the format in
[`src/acc/kit/declaration.ts`](src/acc/kit/declaration.ts), which `acc check --declaration`
consumes — and it **refuses any key it does not define, anywhere in the document**, deliberately,
because a field it cannot name may be the one bounding a probe's safety. So a `no` in that column
is not "supported weakly": a document carrying that field is rejected whole, and the run gets no
comparison at all. What to do about that is [below the table](#emit-v0-hold-the-rest).

| Field                                   | What it retires or unlocks                                                                | Who can answer it          | In v0                                                                                         |
| --------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------- |
| Format version                          | Lets a reader refuse a document it half-understands rather than half-applying it          | anyone                     | yes — `formatVersion`, required                                                               |
| Who is speaking                         | Whether a disagreement is the tool contradicting itself or a stranger's model being wrong | whoever produced the file  | yes — `provenance`, required                                                                  |
| The invocation that emits this document | The pointer a caller must supply anyway, and the verb a declaration must list in itself   | anyone; caller supplies it | yes — `selfDescription`, required (`null` is the positive claim that there is none)           |
| Tool name and version                   | Makes a stored report replayable; the thing an outside copy cannot keep in sync           | only the tool, accurately  | no                                                                                            |
| Help invocations                        | Retires guessing that `-h` means help — and it decides whether a probe is safe            | anyone with `--help`       | no                                                                                            |
| Version invocations                     | Same guess, same hazard                                                                   | anyone with `--help`       | no                                                                                            |
| The command tree, fully nested          | Unlocks every check below the root — the single largest block of coverage debt            | anyone; free if generated  | yes — `commands[].path`, a flat list of full paths; `[]` is the root                          |
| Root positional shape                   | Decides whether an unrecognised first token is rejected, searched for, or **written**     | only the implementation    | partly — name, `required`, `variadic`; nothing says whether an unrecognised token is written  |
| Per-argument arity                      | Distinguishes a boolean flag from one whose value you just orphaned                       | anyone; free if generated  | yes — `type: "string" \| "boolean"`                                                           |
| Positionals, held apart from flags      | A consumer iterating the flag list must not build `--handle foo` for a positional         | anyone; free if generated  | yes — its own container, `positionals`                                                        |
| Closed value sets, marked as enforced   | Unlocks sending an out-of-set value and requiring rejection                               | anyone; free if generated  | yes — `values` binds, `valueHint` is a label                                                  |
| Cross-argument constraints              | Mutual exclusion, requires, required-unless — an agent has no other way to know           | only the implementation    | no                                                                                            |
| Refused and hidden arguments            | A recognised-but-rejected flag is not a valid flag and must not be published as one       | only the implementation    | partly — `status: "valid" \| "refused"`, required on every argument; nothing expresses hidden |
| Machine mode: how it is reached         | Retires reading `--json` / `--format` / `--output` out of help prose                      | anyone, by running it      | no                                                                                            |
| Machine mode: what it covers            | Whether the mode governs errors too, or only the success payload                          | only the implementation    | no                                                                                            |
| Output kind and cardinality             | Says whether stdout is one document, a stream of records, or opaque bytes                 | only the implementation    | no                                                                                            |
| Error-envelope field names              | Unlocks checking that an error names the offending token, in the field it names           | only the implementation    | no                                                                                            |
| Exit-code meanings                      | `1` is not always failure and `2` is not always usage                                     | only the implementation    | no                                                                                            |
| Exit-code ownership                     | Whether the code you read was produced by a program this tool did not write               | only the implementation    | no                                                                                            |
| Effects, per command                    | The only thing that would let a checker run a real verb — **and see the caveat below**    | nobody, confidently        | no — **and see the roadmap cost below**                                                       |

Three things about that table are worth stating outright.

**The fields that matter most are the ones only the implementation can answer.** Exit-code
ownership, envelope field names, whether an unrecognised token becomes a file the tool writes,
whether a command performs no writes — each is one line for the author and a guess for anybody else.
That asymmetry is the whole argument for the tool emitting its own description rather than someone
modelling it from outside.

**Every default is "absent", never a value.** A field nobody stated must make the dependent check
report `unverified` and name the field as the remedy; it must not fall back to a convention. The
reason is concrete: a template pre-filled with `--help` produces a wrong declaration for `ffmpeg`,
which documents `-h` and `-help` and not `--help`
([SURV-5](docs/reports/2026-08-23-triaging-the-argument-grammar-survey.md)) — and a wrong declaration is worse than no declaration, because it convicts a correct
tool. This is the repository's own
[if it is not in the config, it is not inferred](docs/wiki/decisions/not-in-the-config-not-inferred.md)
applied one level down.

**Marked-as-enforced is not a detail.**
[DT-4](docs/reports/2026-08-24-first-drift-trial-anthill-manifest.md#dt-4--valuehint-means-two-different-things-and-nothing-says-which)
is the case: one hint string spelled `bug|friction|idea|docs` is enforced with a refusal, and
another spelled `text|json` on 21 commands is silently ignored — an out-of-set value falls back to
a TTY heuristic and exits `0`. Identical declared shape, opposite behaviour, and no field
distinguishes them, so **that defect cannot be automated against any target**, including that one.
A value list that does not say whether it binds is a label, and a checker that treats a label as a
constraint manufactures a failure.

### Emit v0, hold the rest

**The advice, plainly: write the v0 document, and keep the rest of this page's fields out of the
file.** There is no third option where you emit a richer document and the reader takes what it
recognises. `parseDeclaration` refuses an unknown key anywhere in the document, and refuses a
`formatVersion` that is not the major it knows rather than reading the fields it does know — so a
document carrying `exitCodes` or `effects` alongside its commands does not get a partial check, it
gets no check. That is the reader working as designed: half-applying a document you half-understand
is how a narrowing statement gets dropped and a widening one gets obeyed. The cost lands on the
emitter author anyway, so it is stated here rather than discovered in a rejection.

Concretely, a v0 document is `formatVersion: "0"`, `provenance`, `selfDescription` (an object or an
explicit `null`), and `commands` — each with `path`, `args` and `positionals`, each argument
carrying `name`, `type` and `status`. All of those keys are required; nothing else is permitted at
any level. The file is
[`src/acc/kit/declaration.ts`](src/acc/kit/declaration.ts), and it is the authority, not this
table.

**The rest of the fields keep their argument.** Exit-code meanings, envelope field names, machine
mode's scope, tool version — this page argues for them on the evidence, and the evidence does not
weaken because one reader lags it. If you have those facts, publish them: in your own emitted
schema, in your docs, adjacent to the code that implements them, with the test that fails when a
new command has no entry ([Part 1 §2](#2-generate-it-from-what-implements-the-behaviour)). What
they do not yet have is a slot in `acc.declaration.json`, and an emitter written against them today
buys a document nothing here can consume.

**What that costs this project — and this passage was wrong once, which is the first thing it owes
you.** It used to name `effects` as the blocker, twice over: [the ceiling](#the-ceiling-stated-honestly)
reached runtime for 4 of 25 commands, and [Part 4](#checkable-and-not-built) marked `[—]` on rows
said to need a declared read-only claim. It then observed that _"probing below the root waits on an
effects claim"_ was true but unreachable, because v0 had nowhere to put the claim, and that there was
no plan here for how. **That dependency was asserted on this page and has since been withdrawn.** It
was never a format problem. What gets anyone below the root is evidence, and evidence need not come
from the checker's own probe: an operator can run their own tool at the paths they choose and hand
back the recordings, executing nothing on the checker's authority and reading no claim at all.
`effects` is not being added, so v0's missing slot costs nothing.

What is genuinely unbuilt is narrower, and naming it exactly is the honest thing this page can do
today: the kit cannot yet **read** a recorded surface, it generates no probe plan to make producing
one cheap, and it owns no execution boundary of its own. The cost that leaves is that below-root
coverage depends on somebody else doing the running — a limit on convenience, and on who can be
checked without their cooperation, rather than on what is knowable from outside.

## The two things a declaration must never carry

**Caller policy.** Waivers, severities, known failures, which rules bind — those are choices of
whoever is running the check, they are neither true nor false, and a maintainer publishing a
declaration in their own repository must not be publishing somebody's suppressions with it. Keep
them in a separate file with a separate lifetime. The payoff is that one document then serves three
carriers unchanged: the tool's own emission, a file in the tool's repository, and a file beside a
third party's CI config.

**Anything about the run rather than the tool.** Locale, platform, the shell's inherited variables.
A target declaring "my errors are English" is answering for the caller's shell. The hazard is not
hypothetical in shape, though nobody here has yet produced the target that exhibits it: one checker
in this repository decides a verdict by matching an English phrase on stderr, over a locale
inherited from whoever invoked it, so the same target and the same argv would pass under one
`LC_ALL` and fail under another with nothing in the report distinguishing the two runs
([SURV-3](docs/reports/2026-08-23-triaging-the-argument-grammar-survey.md), which records that it
could not find a tool localising its parser errors). Measure the environment, print it beside the
declaration, and label it as measured.

## Where the declaration lives, and who may say what

[Two independent design sketches](docs/research/2026-08-24-two-declaration-format-sketches.md) were
written for this, from opposite starting points — one derived from what the checkers need, one from
what a person can honestly say. They converged on more than they disagreed about, and the
convergences are the load-bearing part. Both are filed whole, with what has since overtaken them
marked rather than corrected; this section is a reading of them and they are the source.

**They converged on the asymmetry, and it is the most useful rule in this section.** Both reached it
independently, from different premises:

> **A statement that narrows the probe surface may be accepted on anyone's word. A statement that
> widens it must come from the tool.**
>
> A wrong "do not probe me" costs coverage. A wrong "you may probe me" costs somebody a written
> file.

The concrete case is the file-writing population the
[grammar survey triage](docs/reports/2026-08-23-triaging-the-argument-grammar-survey.md) collected under `SURV-4`. `ffmpeg` documents that _"anything found on
the command line which cannot be interpreted as an option is considered to be an output url"_;
`sqlite3`'s first positional is a database path, created if absent; `ogr2ogr` and `cdo` take an
output file as a positional. An outside observer who declares "my first positional
selects from a fixed table of verbs" and is wrong has authorised a probe that writes a file. One
who declares "my first positional is data, do not send sentinels" and is wrong has only lost a
verdict.

So the narrowing direction is admissible from anyone and the widening direction is not, and **an
unfalsifiable field is admissible exactly when the only thing it can do is remove probes and
withdraw verdicts. The declarer buys silence, not a pass.**

**They converged on several other things**, briefly, because agreement reached from two directions
is worth more than either argument alone:

- An emitted declaration wins over an outside model on every field it speaks to, and a
  disagreement is reported rather than silently resolved.
- The caller must always supply the pointer to the emission, because running `mycli schema`
  requires already knowing that `schema` is the token and that running it is safe — and
  `sqlite3 schema` creates a database file called `schema` ([SURV-4](docs/reports/2026-08-23-triaging-the-argument-grammar-survey.md)). The bootstrap is
  irreducible.
- Falsifying an emitted declaration and falsifying somebody's model of a tool are **different
  events with different reports**. The first says the tool lies about itself, which is a defect in
  its own right and arguably the most consequential one a checker could report. The second says
  only that a file and a tool disagree, and the checker cannot tell which is wrong. Conflating them
  produces a confident accusation against a tool resting on a stranger's two-minute guess.
- Any check that consumed a contradicted statement cascades to `unverified` — never to pass, never
  to fail.
- Refuse to run against a declaration whose format version you do not understand, rather than
  ignoring it and carrying on. The fields unlock probes, and unknown semantics on an unlocking
  field means running an invocation whose justification you cannot read.
- Say nothing about **effects** — and do not record it as a placeholder either. Both sketches scoped
  it out, for the reason the drift trial hit its ceiling: there is no sandbox to falsify such a claim
  in. An earlier version of this page told you to record it and let it gate nothing; **that advice is
  withdrawn**, and no field is coming for it. An inert field is not a neutral placeholder: it lends
  its names apparent authority, invites a consumer to infer safety from them, and fixes a meaning
  before any consumer exists to need one. `read_only` already reads two ways — no mutation of the
  tool's own state, versus no externally visible effect — and a command that writes nothing of its
  own while opening a browser on the operator's machine is exactly where the two come apart. The
  field earns its place when a concrete consumer and a testable contract for it exist, and that
  consumer picks the meaning.
- Do not add a field for bitmask exit codes. `pylint` ORs fatal `1`, error `2`, warning `4`,
  convention `8`, refactor `16` and usage `32`, so a run with a fatal and a warning exits `5`;
  `fsck` documents its status across filesystems as _"the bit-wise OR of the exit statuses"_
  ([SURV-8](docs/reports/2026-08-23-triaging-the-argument-grammar-survey.md)). No declaration
  changes what `2` means in a taxonomy that assumes an enumeration. **The taxonomy grows a position
  on bit fields or it does not**, and adding a field would let a format look like it had answered a
  question it had only relocated.

### A caller may declare — and at the root, that is all the census can act on

**The claim above is not weakened: a caller who did not write the tool may author a declaration for
it**, and the narrowing-versus-widening asymmetry is what makes that safe. What follows is a limit
on what the **census** can do with one today, and it belongs here because it is invisible from the
format layer, where a modelled document is as well-formed as an emitted one.

The kit probes **the root only** — `captureSurface` in
[`src/acc/kit/surface.ts`](src/acc/kit/surface.ts) reads a flag set out of root-level rejections,
and the kit does not execute a subcommand of a target on that target's own say-so. Evidence below
the root has to be recorded by somebody who already holds the authority to run the tool and handed
to the kit, which cannot yet accept it.
A verb-first tool's declaration is a document about its **verbs**, so every path it declares is a
path nothing probes, and the one path that is probed is often the one it does not declare. Measured
on this repository's own CLI, which is verb-first: `acc --nope` answers `unknown option '--nope'`
and lists its verbs, naming no flag, so the root surface reads `did not enumerate` — and a
four-command modelled declaration for it reports `THE DIFF DID NOT RUN — 0 of 4 declared command
paths compared`. anthill v2.3.0 is the better case and still a narrow one: its root rejection does
name `--format`, so **1 of 25** paths compares, and its manifest has no slot for root flags, so the
only comparable path is the one it cannot speak to (DT-1).

So the `[C?]` on this Part, and every `yes` in the [`In v0` column](#the-fields-and-why-each-exists),
carry a condition already stated in both places and worth stating plainly: **on any target that
enumerates _at the root_**. The conclusion is not this page's. It was drawn by the implementer in
[the first outside application of the standard](docs/reports/2026-08-24-first-outside-application-grapevine.md#the-modelled-negative-which-is-the-most-useful-failure-in-the-session),
and it belongs here in their words rather than in a paraphrase:

> for the verb-first population — most of this fleet, and I suspect most agent-facing CLIs — a
> modelled declaration currently buys zero comparison. The standard's "a caller may declare for a
> tool" is true at the format layer and inert at the census layer.

**The worked `0 of 4` above is this repository's own CLI, measured in this tree**, and it is not the
run that produced that sentence: that session modelled a declaration for a different tool, on a tree
this checkout cannot reach, and the report records its numbers as reported rather than verified. The
grammar in the sentence is also not the invariant — anthill is verb-first and does enumerate at the
root — which is why the limit above is stated as the root-slot mismatch rather than as a fact about
verb-first parsers. It is not wasted: the self-description check runs on it with no probe at all, and the report
says which paths went uncompared and why. But an author writing one today should expect a report
about what could not be compared rather than about what agreed, and the fix is the kit's and the
tool's, not the file's.

### Where they disagreed, and it is not settled here

**Exit-code ownership.** One sketch makes it declarable by anyone — `own` against `delegating`, plus
a reserved band of codes the tool keeps for itself — and names it, unprompted, as the largest
unfalsifiable escape hatch in its own design: a tool that owns its codes but declares delegation
exits the whole exit-code rule family. The other makes it **promise-only**, inexpressible by an
outside observer at all, with its absence withholding the dependent checks and naming the field as
a remedy the author could supply and the observer could not.

The second sketch flags the sharpest objection to its own position: `ssh(1)` states the answer in
plain words — _"exits with the exit status of the remote command or with 255 if an error
occurred"_ — so an observer reading the man page is not guessing. Its lean is to hold the line
anyway, because `ssh` is unusually explicit and `tar`, `xargs` and `bazel run` are not.

**Nothing here decides it.** Both positions are defensible, and the disagreement is about who may be
trusted with a field that switches off a whole family of checks. It is settleable by experiment
rather than argument: take the delegators the survey names, have several people who did not write
them answer ownership from the documentation alone, and see whether they agree and are right.

**Where the declaration lives.** One sketch splits hard into two files — a declaration that is true
or false, and a policy file that is neither — and argues the split is what lets one schema serve
three carriers. The other keeps one file with a distinguished block for the outside observer's
model, for one loader and one discovery path, and then flags its own doubt: mixing caller policy
with a model of the target in one file is the same conflation it spent its opening section arguing
against.

They agree on the semantics and differ on the container. **Follow the semantics** — a declaration
and a policy are different speech acts with different lifetimes, and whether they share a file is
the smaller question. If you are choosing now, choose two files: that is the choice that survives
somebody wanting to publish a declaration in their own repository.

**[C?]** for this Part as a whole, and it is the reason the Part exists — but the mark now needs
its two halves separated. A reader ships: `acc check --declaration` reads a v0 document and diffs
its declared flags against the set the target's own parser names, at the root, reporting both
readings and never a verdict. So the fields the `In v0` column marks `yes` are read and compared
today, on any target that enumerates. Every field it marks `no` is not merely unchecked — it is
**unwritable**, and "checkable the moment a declaration is written" does not apply to a field no
declaration can carry. [Part 4](#checkable-and-not-built) lists what each unlocks once the format
can hold it. The exceptions are marked in place: effects, and exit-code ownership.

---

# Part 3 — What the interface owes a program

The declaration says where the surface is. This part says what the surface should do. Where the
catalogue already has a rule, this section points at it and stops.

## Machine mode

**Recommendation.** Have one, make it selectable explicitly, and let an explicit selection override
detection **in both directions**.

The precedence order:

1. **An explicit flag** — `--json`, or `--format json`. Always wins.
2. **An explicit environment variable**, for callers that cannot alter argv.
3. **Inference** — stdout is not a TTY, or an agent-harness variable is set.

**Why the override, both ways.** Detection is genuinely useful and is also a documented failure
mode: Vercel's agent-mode envelope was discovered _through a bug report_ caused by its own agent
detection, which users worked around by faking a PTY
([machine mode](docs/wiki/concepts/machine-mode.md#the-detection-hazard), which carries the sourcing for this and for `gh` below).
When behaviour depends solely on inference
about the caller, a caller that guesses wrong has no recourse. `gh` gets this right in both
directions, honouring an `AI_AGENT` override and spelling the reverse `GH_FORCE_TTY=1`, both
verified directly. That page also carries the full contract and the table of what changes between
the two modes; read it rather than a summary here.

**Machine mode is a mode, not a flag on one command.** Once selected it should govern success
output, failure output, and every subcommand alike.

**Declare what your machine mode covers, because two different things share the spelling.** `rg
--json` selects a JSON Lines format for search results; it is not a CLI-wide output mode and does
not govern help, version or diagnostics. A checker that reads `--json` out of help and concludes
"this tool has a machine mode" then fails it on the parser-error path for a feature it never claimed
— measured in the [blind trial](docs/reports/2026-08-23-blind-trial-ripgrep.md), where one misread
produced three downstream failures. Declaring the scope is what lets an honest tool decline an
obligation instead of failing it.

**And do not assume a flag spelling means what you think.** `--output` names a file at least as
often as a format — `curl`, `ffmpeg`, `ogr2ogr`, every `cp`-shaped tool — and `--format` is `ps`'s
column layout and `ffprobe`'s writer name
([SURV-2](docs/reports/2026-08-23-triaging-the-argument-grammar-survey.md)). A `--output <file>`
spelling produces a **false pass** in this repository's own kit — reproduced against a fixture whose
help documents it as writing a body to a file — which is the honest reason this page asks for a
declaration instead of a convention.

**[C]** `B2` (no ANSI when piped), `B1` (stdout carries only data), `D3` (help advertises it,
diagnostic).

**[C?]** `B3` (machine output parses) — listed as checked today until this revision, and it is not.
Its checker declares `probes: []`, every branch returns `unverified`, and its own
`coverageEstablished` reads _"nothing at L0"_
([`machine-output-parseable.ts`](src/acc/kit/checkers/streams/machine-output-parseable.ts)). Its
subject is the output of a **data command**, and selecting one means knowing it is side-effect-free.
`B5` (machine mode holds on the parser-error path) is a genuine probe and sound at the root, but it
is gated on `defaultOutput` and reported `unverified` on **all eight** targets of the
[owner-CLI run](docs/reports/2026-08-24-eight-owner-clis.md) — every one of which is a machine-mode
tool, so the rule is currently unreachable on the population it was proposed for. Each becomes live
on a declaration and neither needs new kit machinery: `defaultOutput` for `B5`, and for `B3` a
command declared read-only whose output the kit is licensed to read.

Also **[C?]**: the precedence order and the two-way override — nothing measures either, and neither
needs anything the kit does not already have; and "governs every subcommand alike", unreachable both
because nothing probes below the root and because reaching it means running a subcommand.

**[—]** Whether the mode's behaviour survives the next release.

## Complete and untruncated output

**Recommendation.** A command that writes to stdout delivers every byte it wrote before the process
terminates. Machine-mode values are never abbreviated, never humanised, never elided.

**Why.** This is the sharpest instance of the shape every defect in this project shares — **the tool
does the wrong thing and reports success.** A payload cut off at a pipe buffer stops mid-string and
exits `0`, so a caller receives two thirds of an answer with nothing anywhere to say a third is
missing. The [archaeology](docs/research/2026-08-15-defect-archaeology.md) has the fixture measured
both ways: **65,536 bytes through the pipe before the fix, 114,101 after**, with the only difference
being a `process.exit()` on a path that had written to a stream it had not drained. The defective
binary delivers 57% of its payload at exit `0` — and `acc check` scores it `conformant: true`, zero
core failures. That is the kit's own headline verdict certifying a CLI that loses more than half its
output, and it is recorded here rather than hidden because it is the clearest thing anyone has
measured about the limits of black-box checking.

The class is also the most expensive one in that corpus: ten-plus commits, nine or ten entry-point
sites, thirty-seven exit sites pinned, and a regression after the first fix.

**How to comply** is runtime-specific and measured per runtime — see
[a command delivers every byte it wrote](docs/wiki/rules/streams/output-is-delivered-whole.md). The
short form: set the exit code and return from the entry point; do not call `process.exit()`,
`exit()` or `os.Exit()` after writing.

**And do not assert the buffer size.** Bun 1.4 delivered 131,072 bytes through the same code path
that had delivered 65,536 — the reason `B4` asserts delivery rather than a number, and why the
figures live in [a dated note](docs/research/2026-08-19-flush-on-exit-by-runtime.md) rather than on a rule page. A rule written around the number
would have been wrong within weeks.
The invariant is "every byte it wrote"; the number belongs in a dated note.

**[C?]** `B4` states the rule and its checker is `planned` — the blocker is the runner, because a
pipe the runner creates cannot exhibit the defect at all. `B4` therefore reports not-applicable on
every target it has ever met. **[—]** Truncation of a _value_ — a shortened id, a humanised
timestamp — needs a declaration of what the whole value was, and nothing establishes it without one.

## Error envelopes

**Recommendation.** When a command fails in machine mode, write one structured object to stderr
carrying a stable machine-readable `kind`, the exit code, a retry verdict, and the valid
alternatives where the failure was caused by an invalid value. Two top-level shapes, discriminated
on one field, and no third status.

**Why `kind` rather than the message.** Prose is not a contract. When a maintainer rewrites `rate
limit exceeded` to `too many requests (429)`, nothing crashes — the caller simply stops matching,
falls through to a default branch, and behaves confidently and wrongly. No test fails, because the
matching logic lives in somebody else's repository. Improving an error message is normally a
welcome, non-breaking change, and it must stay one.

**Why stderr, and why stdout must be empty.** `docker inspect <missing> --format json` prints `[]`
to stdout and the error to stderr at exit `1`
([error envelope](docs/wiki/concepts/error-envelope.md#why-it-matters-for-agents)). A consumer reading stdout — which is what stdout is
for — sees an empty result set, not a failure. The tool answered a question it could not answer, in
the shape of a successful answer.

**Why enumerate the alternatives in the envelope.** An error is a just-in-time slice of the schema,
delivered exactly when the caller has demonstrated it needs that slice and paid for only on failure.
Both are generated from the same declaration, so the flags an error offers are by construction the
flags the parser accepts.

The full shape, the `confirmation_required` case and the `next` field's real semantics are in
[the error envelope](docs/wiki/concepts/error-envelope.md). Two things from it are worth repeating
because they are easy to get wrong.

**`next` carries an executable and an argv array, and is a proposal to validate rather than text to
run.** Carry it that way in your own tool. A shell string loses the distinction between argv and
shell syntax, so interpolating a caller-controlled identifier into one is a command-injection
boundary; split into argv elements, that identifier is only ever data. The split is not the whole
job — nothing in the field yet declares its placeholders or what running an offer would do, so a
consumer can spawn one safely and still not know whether it writes anything.

**`next` is advisory, never required.** A caller that ignores it must still be able to reach the same
state by other means.

**A field must distinguish absent, null and zero.** Three states an envelope routinely collapses:
"there are none", "I could not tell", and "I did not look". Across two repositories this was the
largest single cost in the corpus and belongs to none of the usual defect categories — a `0` that
means "I could not count" is a lie a caller cannot detect, and a field that is absent rather than
present-and-null is unreadable, because absence and a null answer are the same bytes.

**[C]** `B1` (stdout carries only data, so it is empty when the command failed), `A3` (an error
names the offending token), `C2` (usage errors distinguishable from internal faults) — and `B5`
(machine mode holds on the parser-error path) **only where `defaultOutput` is declared**, which was
true of none of the eight targets in the
[owner-CLI run](docs/reports/2026-08-24-eight-owner-clis.md).
**[C?]** `kind`, `retryable`, the two-shape discipline and the `choices` list — all checkable the
moment the envelope's field names are declared, which is exactly what
[A3's coverage gap asks for](docs/wiki/rules/parsing/errors-name-the-offending-token.md). **[—]**
Whether a `0` is a count or a shrug; whether `kind` values are stable across releases.

## Exit codes

**Recommendation.** Group codes by what the caller should do about them, keep the whole allocated
range below the reserved band, publish the mapping in your declaration, and never renumber.

The taxonomy this project uses — nine codes, plus a separate band for outcomes that are answers
rather than failures — is in [exit codes](docs/wiki/concepts/exit-codes.md). It is a house standard
and says so. Measured against one probe, an unrecognised flag, `git` returns `129`, `docker`
returns `125`, and `kubectl`, `gh` and `cargo` all return `1`
([exit codes](docs/wiki/concepts/exit-codes.md#there-is-no-industry-standard)). **None uses `EX_USAGE`.** The value is not
that it is right in some universal sense; it is that an agent learns it once and it holds across
every tool that adopts it — which is exactly why a local convention that is not machine-discoverable
is tribal knowledge.

**Get this right when the CLI is born.** Kubernetes' KEP-2551 proposed normalising kubectl's exit
codes and has sat alpha-gated behind an environment variable since 2022
([exit codes](docs/wiki/concepts/exit-codes.md#exit-codes-are-append-only)) — not because the design is bad, but because
retrofitting exit codes onto a tool with existing consumers is close to impossible.

**Three counter-examples that bite, all three defensible.**

**Non-zero does not always mean failure.** `rg` exits `1` for "no matches", a complete and correct
and successful run, and `expr 1 = 2` exits `1` the same way
([SURV-4](docs/reports/2026-08-23-triaging-the-argument-grammar-survey.md)); `kubectl diff` reuses exit `1` to mean "differences found"
([survey](docs/research/2026-08-22-machine-readable-cli-declarations.md#43-cloud-vendors-rich-api-models-missing-cli-models)). A tool in this family should say so in its declaration, and a
checker that assumes `1` is a failure reads a correct answer as a broken one.

**Some tools do not own their exit codes.** `ssh` delegates the entire namespace, not just a
reserved band; `tar` documents that _"if a subprocess exits non-zero, tar assumes that exit code as
well"_; `timeout`, `xargs` and `env` reserve a small band and pass the rest through verbatim; `jq`'s
`halt_error(n)` puts the code under the control of the input program, which is a positional the
caller supplied
([SURV-9](docs/reports/2026-08-23-triaging-the-argument-grammar-survey.md)). The archetype and its
hazards are in [delegator](docs/wiki/archetypes/delegator.md) — including the honest admission that
verbatim passthrough makes the wrapper's own `125` / `126` / `127` indistinguishable from the
child's, and that a delegator needing the distinction should carry the child's code as a field in
its envelope.

**Some tools compose codes as bit fields.** Covered in Part 2; the taxonomy has no position on them
and this page does not invent one.

**This is where fleet divergence shows up first, and where nothing reports it.** Across one author's
eight agent-facing CLIs
([measurement](docs/reports/2026-08-24-eight-owner-clis.md)):

- seven answer an unknown flag with exit `2`; one answers with exit `1`;
- `--help` goes to stdout in six, to **stderr at exit 2** in one, and to stdout as **JSON** in one;
- `--version` exists in exactly one of the eight;
- machine mode is unconditional and unflagged in seven and TTY-conditional and flagged in one;
- one repository bans `process.exit()` after a write at every entry point, in a comment ending
  _"Do not tidy this back into an explicit exit"_, and the other calls it at six sites.

**No rule in the catalogue reports any of it**, for two structural reasons the report states
plainly: every relevant checker requires only that a code be non-zero, and every run judges one tool
alone — a divergence is a relation between reports, and a report is the largest object the kit
produces. On a corpus chosen to expose inconsistency, 15 of 23 rules returned an identical verdict
on all eight targets, and the six tools sharing a scaffold produced one identical set of verdicts
six times over.

One author, one toolset, and every one of those questions answered more than once. The only
instrument that surfaces it is putting the declarations side by side.

**[C]** `C1` (help exits zero), `C2` (usage distinguishable from internal), `C3` (deterministic
codes), `A1` / `A2` (unknown flag, unknown command exit non-zero). **[C?]** Holding a tool to its
own declared mapping — provoke each declared kind and compare. The design is obvious and the blocker
is entirely that the mapping is not machine-readable. **[—]** Whether a delegating tool really
delegates; whether the codes stay stable across releases.

## Pagination and field selection

**Recommendation.** A command whose output is open-ended provides pagination arguments, a
field-selection argument, and an in-band signal that the answer was truncated.

**Why.** This is a context-window concern rather than an aesthetic one: a command that dumps ten
thousand records into an agent's context has failed even though every byte was valid. Field
selection is the cheaper half — most of the time a caller wants three fields of each record and has
no way to ask.

**Only declare it where it applies, and only expect it where it was declared.** clispec states the
rule this page endorses — _"do not probe what the tool did not claim"_
([survey](docs/research/2026-08-22-machine-readable-cli-declarations.md#22-clispec--closest-on-intent-effectively-pre-adoption)): only a command declared with
unbounded output owes you pagination, and the limit flag and cursor field come from the document
rather than from a convention. A command returning one record owes nothing here.

The kinds and cardinality vocabulary are in [output kind](docs/wiki/concepts/output-kind.md#why-it-matters-for-agents), which also
carries the Docker case: under the same `--format json` flag, `docker version` emits one object,
`docker ps` emits NDJSON with no enclosing array, and `docker inspect` emits an array. The
inconsistency is now permanent — asked to fix `docker ps`, a maintainer replied that _"for
compatibility reason, this can't be fixed"_ — and it is permanent **because it was never declared,
only observed.**

**This is the thinnest recommendation on the page, and it is marked as such.** The reasoning is
sound and the Docker case is real, but no defect in either archaeology corpus is a pagination
defect, and nothing in this repository has measured the cost of its absence. Take it as a design
argument rather than as a finding.

**[C?]** Once a command declares its output is unbounded: ask for a page, get a page, get a cursor,
and get told when there are more. **[—]** Until then, and honestly — nothing measures pagination and
nothing can, because there is no claim to hold the tool to.

## Non-interactivity

**Recommendation.** When stdin is not a terminal, never wait for input. Where an operation genuinely
needs a decision, fail fast with a structured error, name the flag that would supply the answer, and
do not treat EOF or closed stdin as an answer — neither as consent nor as refusal.

**Why the last clause is the important one.** A prompt that hangs forever is obvious and gets fixed.
A prompt silently answered by EOF is the dangerous half: `docker container prune` treats closed
stdin as a decline and exits `0`, so an agent invoking it non-interactively gets a success code and
no work done ([E1](docs/wiki/rules/interactivity/never-block-without-a-tty.md#why)). Declining is a decision the caller did not make, and it must not be reported as
success.

**A bypass flag is consent to skip the prompt, not consent to guess the argument.** `gh` ignores
`--yes` when the repository would be inferred from the working directory; Vercel applies no default
scope non-interactively and returns an action-required error naming the flag that resolves it. That
rule page — [never block on input without a terminal](docs/wiki/rules/interactivity/never-block-without-a-tty.md#how-to-comply) — carries both, along with
the per-language terminal checks and the naming conventions.

**[C]** `E1`, for the hang. **[—]** For the silent EOF answer — the rule page's own coverage gap says
it: treating EOF or closed stdin as an answer is not detectable from termination alone. That is the
more dangerous of the two failures and it is the one nothing sees from outside.

## Parsing

The catalogue covers this ground densely and this page will not restate it — read
[the index](docs/wiki/index.md) for the seven rules. What is worth saying here is the shape they all
defend against, because it is one shape:

**A parser that accepts something it does not understand and runs anyway is the defect.** An unknown
flag accepted while the verb runs; a positional silently swallowed; `--flag=value` split on
whitespace so the value is dropped and the command runs with defaults; a `--` terminator that fails
to protect what it is for. Every one is invisible at the point where documentation would be read,
which is why documentation does not fix this class. All four are measured, repeatedly, in
[the archaeology](docs/research/2026-08-15-defect-archaeology.md) — including `bounty close --help`,
which closed the board.

One clause deserves highlighting because it is counter-intuitive: **never act on a guessed
correction.** A parser that accepts `--frmat` silently produces no error, so there is no
just-in-time slice of the schema, so there is nothing for the caller to correct from. Suggesting the
correction is good; applying it is not. Real tools do apply it: Perl's `Getopt::Long` enables
`auto_abbrev` by default, and PLINK resolves flag names by exact match, then prefix, then
Damerau-Levenshtein distance 1 — _guessing and proceeding_, while looking to any checker reading
exit codes and diagnostics exactly like a tool that rejected
([SURV-10](docs/reports/2026-08-23-triaging-the-argument-grammar-survey.md)).

**Counter-examples worth knowing before you adopt any of this wholesale.** "You can append `--help`
to any invocation and get help" is false by design for a real population: `ffmpeg` applies options
to the next file so _"order is important"_, ImageMagick's settings persist as they appear on the
command line while operators apply immediately, `find`'s arguments are primaries in a boolean
expression with precedence and there is no `--` role at all, `bazel` startup options must precede
the command, and PLINK's `--help` _"causes everything before it on the command line to be ignored"_
([SURV-11](docs/reports/2026-08-23-triaging-the-argument-grammar-survey.md)). If your grammar is
order-dependent by design, say so in the declaration; the clause is not for you.

Likewise, this page asserts **no flag spelling**. `sqlite3`, `openssl`, `ip`, GROMACS, BLAST+, PLINK
and GDAL use single-dash long options; `dig +short`, `ps aux`, `tar cfv` and `dd if=/of=` are not
even the same grammar. None of that falsifies anything above, and none of it is a defect.

**[C]** `A1`–`A3` and `A5`–`A7`, at the root only — with `A6` and `A7` carrying a caveat the
[owner-CLI run](docs/reports/2026-08-24-eight-owner-clis.md) measured: both returned `unverified` on
all eight targets, `A6` because a `bun` launcher swallows the leading `--` before the target sees
it, `A7` because its prose extractor found no closed value set to falsify. Neither is a target fact
and both checkers can resolve on other shapes, but on the population `acc` handles best they have
yet to. **[—]** `A4` — the silently swallowed positional,
which is the second item in the shape above — at any depth: its checker declares no probe and
returns `unverified` unconditionally
([`unexpected-positionals.ts`](src/acc/kit/checkers/parsing/unexpected-positionals.ts)), because
testing arity means sending extra positionals to a _real_ verb and running it. It becomes checkable
in a sandbox, or on a surface an operator recorded by running a generated probe plan — not on
discovery, and not on anything the tool says about itself. **[C?]** The rest
of them one level down, which is the largest single block of coverage debt in the catalogue —
blocked on the tool declaring that the subcommand exists, and, for every one of them whose probe
would run the subcommand rather than ask it for help, blocked a second time on knowing that command
is safe to run. `bounty close --help` closed the board.

---

# Part 4 — What is checkable, collected

The three-way split in one place, because a reader deciding what to adopt should see what adopting
it buys today against what it buys eventually.

## Checked today

Twenty-three rules — twenty-two of them with a checker behind them — probing the root and nothing
below it, every one declaring `coverage: partial` over more than 90 named gaps
([the catalogue](docs/wiki/index.md)).

**A checker existing is not the same as a check running, and two of the twenty-two do not run one.**
`B3` and `A4` both declare `probes: []` and return `unverified` from every branch; their own
`coverageEstablished` fields say so in as many words —
[_"nothing at L0"_](src/acc/kit/checkers/streams/machine-output-parseable.ts) and
[_"nothing because no probe is declared"_](src/acc/kit/checkers/parsing/unexpected-positionals.ts).
A third, `B5`, has a real probe but is gated on `defaultOutput` and reported `unverified` on all
eight targets of the [owner-CLI run](docs/reports/2026-08-24-eight-owner-clis.md). Read the number
as **twenty-three rules, nineteen of which can return a verdict at all against an undeclared
target** — and measured rather than reasoned, that run found **only eight rules that discriminated
between its eight targets**.

What the ones that do run establish is real and narrow: an unknown flag
exits non-zero, help succeeds and is deterministic, stdout carries only data, no ANSI reaches a
pipe, identical invocations produce identical codes, nothing blocks with stdin closed, nothing
crashes on an inert path.

**Read the limits with the coverage.** Replayed against seven real fixed defects from the
archaeology corpus, at the pre-fix and post-fix trees, the kit's hit rate was **1 in 7** — and for
six of the seven, every rule returned exactly the same verdict before the fix as after it. The kit
could not tell the defective tree from the repaired one on anything. The reason is
structural, and it is this whole page's argument:

> Every miss is a defect that only manifests when a verb runs, when a flag carries a value, when a
> payload exceeds a pipe buffer, or when machine mode is selected — four conditions `L0` excludes by
> construction.

`L0` is the kit's name for the only probe depth that exists today: help paths, sentinel arguments
and the bare invocation, sent to the root and nowhere below it. Every one of those four conditions
sits outside it, and a declaration is what would move the boundary.

**The ceiling, if every one of those conditions were reachable, is about 28%.** The denominator is
the same 201 commits — the ones iterating on something already built rather than building it the
first time — and the numerator is the 57 whose rater judged that a mechanical black-box check on argv, streams, exit codes or help output
could in principle have caught them. **It is a judgement, not a measurement — none of the raters ran
a checker** — and it is quoted with that caveat attached because a project arguing for evidence
should not launder its own estimates. The same census puts the catalogue's reach today under 10%,
and the distance between the two is almost entirely what a declaration would unlock.

So roughly three quarters of that history is out of any external checker's reach by construction.
Thirty-eight per cent of the 201 — the 77 counted at the top of this page — is capability that was
never there, and a large slice of the remainder is semantic — a `0` that is a lie, a field whose absence is unreadable. **Both halves hold
at once and neither cancels the other**: the kit's last four findings in that corpus were real, and
one of them was a missing capability a rule actually caught.

## Checkable, and not built

Most of these need a declaration and nothing else. That is the point, and the two rows marked
**[—]** below are where it stops holding: they need a declaration _and_ a way to run a subcommand
safely, which is a different kind of thing to be missing and belongs under a different mark.

- **Declared against accepted, per command** — the valid-flag census. Available today against any
  target whose parse errors name the valid set, and it needs no kit. **Built at the root**, in
  `acc check --declaration`; _per command_ is the half still missing, and it is missing because the
  kit probes the root only. The differ is already per-path; what it lacks is below-root evidence to
  feed it — which a caller running their own tool can record, and the kit cannot yet accept.
- **The declared self-description invocation actually runs and parses.** The document half is
  built — the kit reports a declaration that omits the verb it says emits it — and the running half
  is not.
- **[—] Every declared command answers `--help` rather than "unknown command."** This row read
  **[C?]** until this revision and the correction comes from this project's own corpus: checking it
  means _running a subcommand_, and a subcommand's help path is not inert. In the archaeology
  `bounty close --help` **closed the board**, `state --help` dumped it, and `tail --help` opened a
  stream that never exited
  ([defect archaeology §6.1](docs/research/2026-08-15-defect-archaeology.md)). So a declaration that
  the command exists does not make this checkable; what would is a real OS sandbox, or an operator
  running a generated probe plan and handing back what came out. Neither is something a declaration
  can supply — and effects, which an earlier revision named here as a third route, is filed under
  [nothing outside can check it](#nothing-outside-can-check-it) below — which is why the mark is
  `[—]` and not `[C?]`. The kit already refuses the shape rather than guessing at it:
  `classifyInertness` in [`src/acc/kit/inert.ts`](src/acc/kit/inert.ts) grants a `help-path`
  classification only when _every_ argv token is a help or format token, so `mycli deploy --help`
  does not classify and will not run. **The recommendation is unchanged**; only the claim about who
  can verify it is.
- **Every declared value flag rejects a missing value.** A parser-error probe, sound at the root,
  and a declaration is genuinely all it needs.
- **[—] Every declared boolean flag is accepted.** These two were one bullet until this revision,
  and they split because only one half survives the same test as `--help` above. Rejecting a missing
  value is a parser error, observable before anything runs; an _accepted_ flag is accepted **by
  running the command**, and there is no observation of acceptance that is not an execution. So this
  half waits on a sandbox, or on an operator running a generated probe plan, not on a declaration of
  the flag.
- **Every declared enforced value set rejects an out-of-set value.**
- **The declared error-envelope fields carry what they say they carry.**
- **The declared exit-code mapping holds** — provoke each kind, compare.
- **The emission does not contradict the tool's own help.** This one is special: it is a
  disagreement between two of the tool's own outputs, so it is a legitimate finding whichever one is
  wrong, and it needs no external model at all.
- **Everything the catalogue already checks, one level down** — for the rules whose probe is a help
  path or a parser error only. Discovery is the blocker there. For any rule whose probe would have
  to _run_ the subcommand, read the two `[—]` rows above: that half is blocked twice over.

## Nothing outside can check it

Named rather than dressed up.

- **That your emitter walks your parser's structures.** Only the consequences are visible.
- **That a flag's declared scope matches the tool's own shipped instructions.** An identity flag
  every SKILL.md tells agents to pass on every verb is contractually global whatever the parser
  does ([Part 1 §2](#2-generate-it-from-what-implements-the-behaviour)), and no probe over argv,
  streams, exit codes or help output reads a document that ships beside the binary.
- **Effects.** That a command performs no writes is unobservable from argv and streams alone, which
  is why the drift trial reached runtime for four commands in twenty-five. A sandbox moves this into
  the row above; nothing else does.
- **Exit-code ownership.** You cannot show from outside that `ssh`'s `255` is its own and its `3` is
  the remote's.
- **Absence claims** — "I have no hidden subcommands", "I have no machine mode". A hidden command is
  invisible by definition. The partial exception is the cross-artifact check above: two of the
  tool's own outputs disagreeing is checkable even when neither is verifiable alone.
- **A silent EOF answer**, as against a hang.
- **Semantic honesty of a value** — whether a `0` is a count or a shrug. The one recorded attempt
  to mechanise it, a type-sentinel probe over one of the archaeology corpora, scored zero true
  positives, two false positives, and 26 of 33 functions undecidable
  ([research](docs/research/2026-08-24-missing-capability-or-implementation-defect.md)).
- **Stability** — that a `kind` or a code or a field name will still mean this next release. A
  single run cannot see across releases, and a check that accepts an unfalsifiable claim has stopped
  being a check.
- **Whether a value was truncated**, absent a declaration of what the whole value was.

---

# What this standard is not

**It is not a specification you conform to.** Neither thing a declaration buys is conformance to a
standard: one is visibility across your own tools, the other is a tool tested against its own
contract. Where this page says a tool "declines" a recommendation, that is a decision with a reason,
and the catalogue's own vocabulary distinguishes a defect from a design choice for exactly that.

**It is not complete, and completeness is not the goal.** Solving a core set of problems is enough;
solving every one is not the ask. That follows from the charter's own test — a change earns its
place by making somebody's next CLI better, not by closing a gap in a catalogue
([North Star](CHARTER.md#the-north-star)) — and it means a shorter document that is entirely
supported beats a longer one padded with plausible advice. Where the evidence runs out — pagination
is the clearest case — this page says so rather than filling the gap.

**It will lag what it governs.** The one comparable artifact anyone here has measured is the
house-style document inside one of the archaeology corpora
([research](docs/research/2026-08-24-missing-capability-or-implementation-defect.md)): it is real, it works, it names `--stdin` and cursor-resume and snapshot/restore —
and it does **not** name `start`, `restart`, `doctor`, `reap`, `roll`, `--version` or bounded
catch-up, the exact set the next CLI in that repository had to discover alone. It grew nine commits
against 151 CLI commits, lagging the surface it governs by an order of magnitude. Expect the same of
this page, and prefer a check that fails to a paragraph that advises.

**Its central assumption is untested.** The bet is that a declaration bound to code and continuously
falsified against the running tool is different from the hand-authored declarations that all
drifted. One trial exists, in the owner's own tree. What would settle it is not an argument:
**an adopter binds a declaration to their code, the tool drifts from it, and the drift check catches
it.** Until that has happened in somebody else's repository, this is the thing to try to falsify
first.
