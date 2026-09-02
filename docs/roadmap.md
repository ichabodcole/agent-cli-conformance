# Roadmap

What is known to be missing from this project, and the order the dependencies imply.

## Status: known, not planned

**Nothing on this page is scheduled, staffed, or promised.** No item has a date, an owner, or a
release it is attached to, and the order below is a dependency argument rather than a queue
anyone has committed to work.

That is a deliberate position between two weaker ones. A list of intentions ("we would like
profiles one day") claims less than this page does, because it does not say what has to be true
first, and so cannot be used to decide what to build next. A plan claims more than this project
can back, because a plan implies capacity. What follows is the middle claim: **this is what is
missing, this is why each item is blocked on the ones above it, and this is the evidence that
each gap is real.** If an item moves, it moves because its blockers cleared — not because it was
scheduled.

Where an item is already partly built, the section says what exists today and what it lacks,
because the distance between "not started" and "two thirds of the data model is already there"
is the most useful thing a roadmap can record.

The evidence is the Round 4 findings of an implementation review conducted in six numbered rounds
— `docs/reports/2026-08-14-implementation-review.md` — plus the scope decisions taken during Phases 1 to 4, the four remediation phases that
preceded this page. The order is argued here on its own terms rather than transcribed from that
review; the two disagree in five places, reconciled in
[the appendix](#appendix-where-this-departs-from-the-review) for the reader who has the review
open.

## Why this is not in the wiki

[`docs/wiki/SCHEMA.md`](./wiki/SCHEMA.md) says only rule pages are normative, and that a concept
page which appears to state a requirement is a page whose requirement belongs in a rule. A
roadmap is neither. Filing aspirations inside the specification is precisely the conflation the
review's normative-scope finding named — where "implemented", "pass" and "planned" all become
easier to overread than the project intends — and the cheapest defence against it is that the
spec and the roadmap are different files.

It also spares this page a contract that does not fit it. Every wiki page owes a `type`, a
catalog line in `index.md`, reachability from that catalog, and — for rules — a checker on disk
whose tier, level, coverage and gap list match its frontmatter verbatim. None of that is
meaningful for a document whose entire subject is work that has not been done. A roadmap forced
through a lint designed to prevent spec drift would either weaken the lint or lie to it.

## The order

Every step below has the same shape: **what it is**, **why it matters**, whatever that step needs
in between, and **blocked on** last.

1. [**Structured remediation**](#1-remediation-becomes-structured-data) — the schema decision that
   gets more expensive with every consumer.
2. [**Version the contract**](#2-version-the-contract-not-only-the-rules) — before anything
   downstream produces something a consumer can pin to.
3. [**Control the observation environment**](#3-control-the-observation-environment-which-is-also-the-l0-safety-work)
   — and with it the L0 safety capability deferred out of Phase 4.
4. [**Durable observation and replay**](#4-durable-observation-and-replay) — the artifact, once
   there are coordinates to stamp on it and an environment worth describing.
5. [**Profiles and the outcome algebra**](#5-profiles-and-the-outcome-algebra) — declared
   archetypes, together with the rules that say what a partial stream or batch result means.
6. [**The portable declaration IR**](#6-the-portable-declaration-ir) — the largest single
   unblocker of the coverage debt.
7. [**The lifecycle rule family**](#7-the-lifecycle-rule-family) — begun, not pending: `G1` is in
   the registry, and the rest waits on an evidence record that can carry what it measures.
8. [**Checker assurance at scale**](#8-test-the-checker-as-a-measurement-instrument) — after the
   corpus stops changing shape, and not a day later.
9. [**Adoption surfaces**](#9-adoption-surfaces) — last, deliberately.

The [coverage debt](#the-coverage-debt) is not a step. Those 89 gaps close as their blockers
land, which is why they are grouped below by what blocks them rather than sequenced.

---

## 1. Remediation becomes structured data

**What it is.** The injection half of this step has shipped. `next` no longer carries a shell
string; it carries an executable and an argv array, one element per argument:

```json
"next": [{ "exec": "acc", "args": ["show", "A1", "--body"], "when": "to read the full text" }]
```

What remains is the description of what an offer MEANS: **typed placeholders**, an **effect
classification**, a **confirmation requirement**, and **provenance** — the fields that let a
consumer validate a proposal rather than merely spawn it safely.

**Why it matters.** The argv split closed the boundary: an identifier interpolated into a shell
string is data or syntax depending entirely on who executes it, and in an argv element it is
only ever data. The remaining gap is a different one. An offer still says nothing about what
running it would do, and its placeholders are still undeclared — `acc link --project <name>`
carries a `<name>` no schema describes, so a caller has to recognise the convention by reading
it. A consumer can therefore run an offer safely and still not know whether it writes anything.
[The error-envelope concept](./wiki/concepts/error-envelope.md#next-carries-remediation-as-an-executable-plus-an-argv-array)
states both halves — what the field now is, and what it still does not carry.

**Why first.** Three reasons compounded; two are untouched and the third is weaker than it was.
`acc` emits `next` in every success envelope, so consumers can start depending on its shape today.
The remaining change is small, touching the envelope and one declaration. And the cost curve is the
one the project already argued about somewhere else: the
[exit-code decision](./wiki/decisions/exit-codes-below-125.md) rests on KEP-2551 having been
alpha-gated behind a feature flag since 2022 — "not because the design is unsound, but because
retrofitting exit codes onto a tool with existing consumers is nearly impossible." A remediation
schema is the same shape of decision, at the same stage. What has changed is the third reason: the
safety consequence is no longer attached, so what is left is an ergonomic argument competing on
ergonomic terms.

**Blocked on.** Nothing. The design argument is written; what is missing is the vocabulary for
effects and placeholders, and the emitter that fills it in.

## 2. Version the contract, not only the rules

**What it is.** Compatibility semantics — version negotiation, deprecation, and migration — for
the six things a consumer can depend on: the spec, the profiles, the declared schema, the
observation artifact, the checker corpus, and the report document. Machine reports carry those
coordinates instead of presenting `conformant` as an unqualified boolean.

**Why it matters.** Rule IDs are append-only and exit codes are append-only, which the wiki
argues for at length, but neither discipline says anything about the shape of the documents
those IDs travel in. A report stored today says `{ target, level, findings, counts, … }` — the
probe level is its only coordinate. It does not record which spec it was judged against, which
checker corpus produced it, which version of the report shape it is written in, or which version
of `acc` produced it. A report that outlives a release without those fields cannot be
re-interpreted later; a report format that ships without them acquires a compatibility promise
by accident, which is the worst way to acquire one.

**Why here.** Every step below produces something a consumer can pin to: an artifact format, a
profile name, a declaration schema, an export format. Versioning is the cheapest of them and the
only one whose absence silently damages the others.

**Why before the artifact specifically.** The artifact's own required-field list opens with
"spec, checker, report, and artifact format versions", so the coordinate set has to exist before
the artifact schema can embed it. Designing the two together means designing the fields twice,
once provisionally.

**Blocked on.** Nothing technical. It needs one decision made deliberately: what a version
_covers_, and what happens when a coordinate is added later — because profiles do not exist yet
and will become one. A versioning discipline that cannot absorb a new coordinate is not a
versioning discipline, so the profile coordinate arriving at step 5 is this step's first real
test rather than an argument for delaying it.

## 3. Control the observation environment, which is also the L0 safety work

**What it is.** A hermetic environment policy: locale, TTY state, terminal width, `HOME` and the
XDG paths, timezone, proxy variables, credentials, and ambient configuration all fixed
deliberately, with any deviation recorded rather than inherited silently. Plus schema-based
discovery displacing English-text heuristics.

**And, in the same breath, the capability deferred out of Phase 4.** Five measures answer the L0
safety overclaim. Phase 4 corrected the **claim** — the README and the safety prose now say that
`L0` is risk-reduced rather than inert, that `acc check` executes third-party code, and that a
fresh temporary working directory redirects relative paths and nothing else — and **did not build
the capability**. Stated plainly, because a corrected claim reads like progress and is not:

- a per-run temporary `HOME` and XDG root rather than the inherited ones;
- credential-shaped environment variables stripped unless explicitly allowed;
- a real OS or container sandbox before any filesystem or network isolation is claimed;
- a dry-run mode that prints the planned argv list before execution;
- explicit acknowledgement, or a target declaration, before behavioural probes run.

**Why they are one item.** Each measure answers two questions at once. A per-run temporary `HOME`
is both "the target must not write into my real configuration" (safety) and "my real
configuration must not change the verdict" (reproducibility). Stripping credentials is both "do
not hand my keys to a binary I have not audited" and "do not let ambient credentials change what
the target does". They share an implementation — the code path that constructs the child
environment — and building them as two efforts means building that path twice with two different
sets of assumptions about who it is protecting.

**Why it matters, measured.** The runner spawns each probe with
`env: { ...process.env, ...inv.env }` and a fresh `mkdtemp` working directory. So the target
inherits everything, and relative writes are the only thing redirected. Discovery is the other
half: [`discovery.ts`](../src/acc/kit/discovery.ts) finds a target's subcommands and flags by
looking for a line matching `/^\s*[a-z ]*\bcommands\b\s*:?\s*$/i`, an options or flags heading,
and flags matching `/--[a-z][a-z0-9-]*/`. A CLI whose help is localised, or whose flags carry
uppercase, discovers nothing — and an empty discovery turns every dependent probe into
`unverified`. Two users with different `LANG` values can therefore receive materially different
reports for the same binary, and neither report says which locale produced it. "Different
verdicts for the same binary" is not a hypothetical about exotic environments; it is one
environment variable.

**One correction to the dry-run measure, as worded above.** "A dry-run mode printing the complete
planned argv list **before execution**" is not achievable as stated. A checker's probes are a
function of discovery — `probes: (d: Discovery) => Invocation[]` — and discovery is produced by
running the target's help path. So the kit can print the complete plan _after one `--help`
invocation_, or the discovery-independent part of it before any execution at all, but not both.
The two are genuinely different products (an audit of what will run next, versus a preflight for
a binary you have not yet consented to run once), and whichever is built should say which it is.
It is otherwise the cheapest item on this page, and it is a safety mitigation rather than an
adoption nicety.

**Blocked on.** The first two measures are unblocked. The sandbox needs a decision the project
has not made — which sandbox, on which platforms, and what the kit does where it has none. That
last part is the load-bearing one: the answer must not be "probe anyway, quietly", which is the
same defect class the runner already names explicitly for its Windows process-group gap.

## 4. Durable observation and replay

**What it is.** A versioned, portable observation artifact, and `record` / `check` / `replay` as
three separate operations rather than one pass. The artifact carries at least: target identity
and executable digest; spec, checker, report and artifact format versions; platform and
controlled-environment metadata; exact argv and the probe level and sandbox policy in force;
stdout and stderr with their raw-byte digests, lossy-decode flags and truncation metadata; status,
signal, timing, timeout and cancellation information; and filesystem or network observations where
the probe level supports them.

**Why it matters.** This is the architecture's most differentiated promise — a new checker
audits evidence already collected, so a lesson learned once is applied retroactively to every
CLI ever recorded — and it is not a user workflow today. The history is in-memory and dies with
the process; the README already labels it that way. Making it durable buys retroactive audits,
reproducible bug reports, offline checker development, comparison across versions of the same
tool, and third-party verification. That last one is also the safety payoff: an artifact is the
only way to check a binary you are not willing to execute yourself.

**Redaction and retention are part of the design, not a later hardening pass.** The artifact
stores captured output and environment metadata, and either can contain secrets — F1 exists
precisely because credentials turn up in help text. An artifact format without a redaction story
turns a conformance run into a credential-exfiltration format, and one without a retention story
turns every bug report into an indefinite copy of someone's environment.

**What already exists.** More than the framing suggests. An `Observation` today carries argv and
env overrides, streams decoded once over the whole capture with a SHA-256 digest of the raw bytes
beside each one and a `lossy` flag saying when the decode threw information away, `truncated` with
retained byte counts, `exitCode`, `signal` and `crashed`, `timedOut`, `spawnFailed`, `durationMs`
and `timeToFirstByteMs`. The digest is deliberately the whole of the byte-level record: retaining
the bytes as well would double the artifact for an equality question a 32-byte hash already
answers, and would hand the redaction and retention problems above an unbounded binary field.
What it lacks is the target digest, every version coordinate, platform and environment metadata,
the sandbox policy, cancellation state, and any filesystem or network observation. This is a
schema-and-persistence job over a data model that is substantially there — not a rewrite.

**Blocked on.** Step 2, for coordinates worth stamping on it. Step 3, for an environment worth
describing: an artifact that faithfully records an _uncontrolled_ environment cannot back the
reproducibility claim that is its entire purpose.

## 5. Profiles and the outcome algebra

**What it is.** Declared conformance profiles with explicit rule applicability and falsifiable
profile claims, covering at least verb and subcommand tools, Unix filters, free-form prompt
tools, delegators over another executable, service and daemon controllers, streaming producers,
and intentionally interactive sessions or REPLs. A report answers "conforms to which spec
version, which profile, and which probe level?" rather than to a bare boolean.

Together with the **outcome algebra** those profiles need — the rules that say what a partial
result means. Streams get a machine-readable terminal event, a non-zero process outcome, and an
unambiguous way for a consumer to know the preceding stream is incomplete; batches get per-item
outcomes plus a defined overall result.

**Why it matters.** These archetypes have genuinely incompatible contracts. A filter may have no
command tree at all. A delegator cannot always enumerate its downstream schema. And a stream
_cannot_ retract the valid records it already emitted, which makes
[B1's "stdout is empty on failure"](./wiki/rules/streams/stdout-carries-only-data.md) — correct
and important for an atomic command — impossible to satisfy rather than merely inconvenient.
Without profiles, one of two things happens: good tools fail rules that were never about them,
or the universal rules get weakened until they say nothing. Both destroy the gate, and the first
one destroys it faster, because the first thing a maintainer does with a gate that reports
irrelevant failures is switch it off.

The hole is already visible in the catalogue. A6's coverage gap reads "the delegator passthrough
requirement is not exercised" — a profile-shaped concern recorded as a coverage gap because
there is currently nowhere else to put it. The wiki has one archetype page and four more marked
planned.

**Why the profiles and the algebra are one step.** A streaming profile _is_ its completion
semantics: strip those out and nothing distinguishes it from a verb tool at the level of the
rules. Written first, the algebra has no declared subject to attach to; written second, the
stream profile ships with a placeholder where its central rule goes.

**Waiver reasons are evidence about the SPEC, and they are how this step should be triggered.**
`acc.config.json` requires a non-empty `reason` on every waiver, and the report publishes it in
both output modes — so a waiver is not only a per-project opt-out, it is a datum. **If many
projects waive the same rule for the same stated reason, that rule needs an archetype rather
than a waiver**, and the reason strings say which archetype and why. D2 is the live candidate:
"human-first CLI; bare help is deliberate" is the shape of a profile claim, written by an
adopter, in prose, because there is nowhere yet to declare it.

That matters for sequencing more than for design. Written from theory, a profile catalogue is a
guess about which archetypes exist; written from accumulated waiver reasons, each profile starts
from projects that already stated the incompatibility in their own words. The kit therefore does
not need to predict the archetypes — it needs to keep collecting reasons until they cluster.
Until then a waiver is the correct answer and the honest one: a project declaring the rule does
not apply, rather than a spec pretending the rule was never about anyone.

**Blocked on.** Step 2 — the profile is a version coordinate, and adding it to the report is
exactly the migration the versioning discipline was designed for. Falsifiability is the harder
dependency and resolves in sequence rather than in a circle: a profile claim starts as something
the caller asserts to `acc check`, and becomes something the target declares — and can therefore
be caught lying about — when step 6 lands.

## 6. The portable declaration IR

**What it is.** A versioned JSON Schema for command structure, inputs, output kinds, effects,
errors and outcomes, stability, and examples — one declaration another ecosystem can either
generate its CLI surface from or export from an existing framework. It is then the natural single
source for generated help, checker expectations, an agent skill, and any MCP projection, with
parity machine-checked rather than maintained as prose.

**Why it matters.** `spec.ts` already proves the single-source idea works: one declaration
produces `acc`'s parser, its help text and `acc schema` together, the conformance suite walks it
to check that every declared closed set is enforced in both directions, and every published
example is executed because it is declared rather than written in prose. What it cannot do is
travel. It is TypeScript, imported directly by the kit, so a Go or Rust CLI cannot participate in
any of it. Directionally right, bound to the reference implementation.

**A naming decision falls due when the second declaration lands, and not before.** Today
`acc.config.json` carries exactly one declaration, `defaultOutput: "json"`, and internally the kit
holds the pair `Discovery.machineModeFlag` / `Discovery.machineModeDefault` — one axis, _how is
machine mode reached_: by a flag, or because it is the default. Concept and key are deliberately
different words. "Machine mode" is a state a CLI is in and has its own
[concept page](./wiki/concepts/machine-mode.md); `defaultOutput` is one assertion about how that
state is reached, and naming the concept after one of its declarations would be the tail wagging
the dog.

That holds while there is one key. The moment a **flag-selected** machine mode becomes declarable
— the gap named on
[B5](./wiki/rules/streams/machine-mode-holds-on-parser-errors.md#current-checker-coverage) and its
neighbours, where a target with a real machine mode reachable only through a flag is not checked
at all — there are two config keys on the axis the internal pair is already named for, and they
have to agree on a vocabulary. `defaultOutput: "json"` beside something like `machineFlag: "--json"`
would be two spellings of one axis, which is how domain language drifts. **Decide the axis when
you add the second key**, while the parser and its docs are already open; it is cheap then and
expensive once adopters have written both.

It is also the largest single unblocker of the [coverage debt](#the-coverage-debt). The biggest
group of gaps is some variant of "only the root is probed", and every one of them is a _discovery_
limit — discovery today means parsing English help text, and a declaration replaces the parsing.
That is what this step buys, and it is not the whole blocker: **a subcommand's `--help` is not as
inert as the root's**, and this project's own corpus is what falsifies the claim. `bounty close
--help` closed the board; `state --help` dumped it; `tail --help` opened a stream that never exited
([defect archaeology §6.1](./research/2026-08-15-defect-archaeology.md)). Knowing the subcommand
exists does not license running it — see the [coverage debt](#the-coverage-debt) for what the second
blocker is and which gaps carry it.

**Blocked on.** Step 5, so a declaration can state which profile it claims, and step 2, since
this is the most pinned-to artifact of the lot.

## 7. The lifecycle rule family

**What it is.** Rules and fixtures for the part of the process lifecycle the spec does not yet
cover: SIGINT and SIGTERM and their platform equivalents; bounded shutdown with descendant
cleanup; signal-distinguishable outcomes; broken pipes and SIGPIPE without stack traces or
corrupt trailing output; resumability, or an explicit declaration of non-resumability, for
interrupted work; and idempotency keys or request identifiers where a mutation may be retried.

The family is begun rather than pending. `G` is `lifecycle`, and
[G1](./wiki/rules/lifecycle/inert-invocations-do-not-crash.md) — an inert invocation must not
terminate the target by signal — is core, `L0`, and in the registry. It is a down-payment on this
step rather than a new axis, and the list above is what remains. Later members take G2, G3 and so
on, under the discipline that minted G1: a rule id is issued when a checker design exists to
carry it.

**Why it matters.** Agent-driven commands are cancelled, piped, retried and killed by an outer
deadline constantly. The caller has to be able to decide whether the work completed, can be
retried, or needs reconciliation — an agent-contract question, not process hygiene.

**What the record had to carry first.** These rules measure things `Observation` could not
represent, and that half is fixed: it now carries `signal` and `crashed`. Before it did, a fixture
whose entire body is `kill -SEGV $$` collected **nine passing rules**, and a target that
segfaulted on every path but help reported `conformant: true` at exit `0` — told in full at
[already discharged](#how-the-crash-gap-was-found-and-closed).

**Blocked on.** Step 4, for cancellation and the durable record — signal and timing now exist.
Step 5, for scope: a REPL's SIGINT contract is not a filter's, and a lifecycle family written
before profiles would be written universally and then immediately weakened. **G1 is exempt from
both**: it judges a target that fell over on an invocation the kit already sends, which needs
neither a cancellation signal to deliver nor a profile to say whose contract it is.

## 8. Test the checker as a measurement instrument

**What it is.** An assurance methodology for the kit itself: mutation tests proving each checker
rejects the defect it names; false-positive fixtures for legitimate but unusual CLI shapes;
property and metamorphic tests across flag order, locale, chunking and equivalent invocations;
differential checks where independent observers should agree; and coverage assertions mapping
every normative clause to either evidence or `unverified`. That is the difference between having
tests for a checker and knowing what the checker can validly claim.

**Why it matters.** An untested instrument reports its own defects as the target's. The dogfood
suite's copy of F1's credential patterns did exactly that, and was caught by accident
([already discharged](#already-discharged)) — one pattern, in one file, which is the argument for
the systematic sweep rather than against it.

**What is already half-built.** The coverage-assertion half partly exists: every checker declares
`coverage_gaps` and `coverage_established`, the lint compares three copies of each list
(frontmatter, page prose, checker source) and fails on any divergence, and every report carries
`evidenceGaps` naming what the verdict withheld itself over. What is missing is that the phrases
are ones a human wrote, not a mechanical enumeration of a page's **MUST** clauses. Nothing checks
that either list is _complete_.

**What the established lint proves, and the exact thing it does not.** `coverage_established`
landed with the same bidirectional discipline as the gaps: the checker declares what a `pass`
licenses, the page's frontmatter repeats it, the page's prose repeats it again, and the gate
fails on any of the three disagreeing. That closes the drift it was built for — a page can no
longer claim a broader measurement than its checker _declares_. It cannot close the drift
underneath, because every copy is a copy of the DECLARATION. A checker whose `coverageEstablished`
reads "root `--help` exits 0 with non-empty stdout" while its `check` forgot the stdout half
satisfies this lint on all three copies and is wrong on all three. The lint compares strings to
strings; nothing in it ever runs the checker.

**What is owed: 32 mutation fixtures.** Only a mutation fixture establishes that an entry is true
of the code — a target built to violate exactly the named property, and the checker made to catch
it. The 22 implemented checkers now carry 32 established entries between them, and that is 32
mutation fixtures owed, one per claim, which is the concrete shape this step takes for the first
time. Until they exist, `coverageEstablished` is a declaration in the same sense the project's own
thesis warns about, distinguished only by being one the authors were careful with. That is a
reason to write the fixtures, not a reason to trust the care.

**A distinction `coverage_gaps` currently cannot make.** A false-positive risk and ordinary
undercoverage push the headline in **opposite** directions, and they are filed in the same list.
Undercoverage narrows a `pass`: "only root help is scanned" means a green line covers less ground
than the page. A false-positive risk widens a `fail`: it means the checker may report a violation
the target did not commit. `coverage: partial` is defined as a qualifier on a pass, so it cannot
carry the second kind at all — which is not a theoretical objection. G1 was the first instance: it
carried "a signal the kit did not send is attributed to the target" as a coverage gap while
failing on operator interrupts and OOM kills its own rule text excluded, so a wrong
`conformant: false` and exit `9` were reachable with the mismatch fully documented and fully
inert. **No new schema field is being added on one instance**, so what came first was an audit of
every declared gap asking which direction it pushes — the shape of work this step exists for, and
the same population its false-positive fixtures are written against. If enough instances turned
up, the gap list needed splitting; if G1's was the only one, the honest conclusion was that a
false-positive risk is a bug to fix rather than a caveat to publish.

**The audit found two.** It read every implemented checker and asked of each verdict branch: could
this report a violation a conforming target did not commit? G1's own instance is not among the
two — it was resolved by narrowing G1 and C1 to fault signals rather than published. Neither
survivor is expressible as a coverage gap:

- **~~B3 fails a tool whose help is not JSON.~~** _Resolved 2026-08-21_: B3 is `L1` and sends no
  probe at `L0`. Kept for the record — the risk was real and the audit that found it was right.
  Its only probe was `--help --json`, sent to any
  target whose root help advertises `--json`, and a stream that is neither one document nor NDJSON
  is a `fail` on a **core** rule — `conformant: false`, exit `9`. A tool whose `--json` governs
  its data commands while `--help` keeps printing human help has violated nothing on any data
  path, and B1's own page carves help out as "the one deliberate exception" for a closely related
  reason. The rule's application to the help path is contested, and B3's only evidence comes from
  it.
- **D3 fails a machine mode it does not recognise.** The verdict turns on `MACHINE_FLAGS` in
  `discovery.ts` — the literals `--json`, `--format`, `--output` — plus a row-shaped regex for a
  `schema` command. A target advertising `--porcelain`, `-o json`, or a `schema` command described
  in prose gets `help names no machine-mode flag or schema command`: a reported violation of a
  rule it satisfies. `diagnostic` tier caps the blast radius at the report rather than the exit
  code, which makes it cheaper, not correct.

Two considered and **not** counted, because naming a weak instance would inflate the very number
this decision turns on. A5 can build its near-miss from an incomplete flag list and so could send
a token that is really a valid flag, but that needs the target to own two flags differing by one
interior deletion, which is close to hypothetical. F2 measures from spawn, so an interpreted
target's runtime startup counts against the 100 ms — and that is the rule as written, since the
caller waits for it too; the caveat there is about the threshold and already sits on the page.

**Recommended, not built: a distinct `falsePositiveRisks: string[]`**, sibling to `coverageGaps`,
surfaced in the report beside a `fail` rather than beside a `pass`, and empty for the eighteen
checkers with none. Two instances clear the bar this section set for minting a field, and they
argue for it in the way the section asked: the two above cannot be filed anywhere today, so they
are prose in a roadmap instead of data in a verdict — which is the position `coverage_gaps` was in
before it existed. It is recommended rather than landed because the honest first move for both
instances is to fix the checker, exactly as G1's was fixed: B3 needs a probe that is not the help
path, and D3 needs discovery that is not a list of three literals. Both fixes are already blocked
on step 6, and a field minted now would be carrying two entries whose intended lifetime is until
step 6 lands.

**A candidate rule, not minted: stdout must be valid UTF-8.** D4 once certified two different byte
streams as identical, and two remedies answered it — keep a representation the comparison can
trust, or narrow the contract so ill-formed output is itself a violation. The first was taken
(`Observation.stdoutDigest`, and `stdoutLossy` to stop the display string being read as the
evidence). The second is a real rule and it is written down here rather than in the catalogue,
because a rule id is minted when a checker design exists to give it and not when the rule merely
sounds right — the discipline stated at
[design guidance](#design-guidance-that-is-not-yet-normative) and argued for at length in the
[exit-code decision](./wiki/decisions/exit-codes-below-125.md#rationale). What it would need
first: a decision about which streams and which modes it binds (machine mode certainly; a human
help path emitting a locale-encoded string is a different question), and about what it says when
a `truncated` capture is ill-formed only because the kit's own ceiling cut it mid-code-point.
Note the interaction with the SIGPIPE clause at [step 7](#7-the-lifecycle-rule-family): "corrupt
trailing output" on a closed pipe is the same defect arriving by another route.

**What does not wait.** Every new or changed checker gets its false-positive fixture as it lands.
The ordering defers the sweep. It does not defer the discipline, and the dogfood copy of F1's
credential patterns is the standing example of what happens when it does.

**Blocked on.** Nothing, technically — and it is placed late anyway, for a reason worth stating
because it is the one item where late placement is a risk rather than a saving. Mutation and
metamorphic suites are written against a checker corpus, and that corpus changes shape at steps 5
through 7: profiles change which rules apply, the declaration IR changes how discovery works, and
lifecycle adds a family. Sweeping first means sweeping twice.

## 9. Adoption surfaces

**What it is.** `acc init`, CI integration beyond this repository's own gate, and SARIF or JUnit
report exports. The adoption guide this group used to name is written —
[how to reach L0](./wiki/guides/how-to-reach-l0-in-your-project.md), with a first-run tutorial and
a checker guide beside it — so what remains here is tooling rather than navigation.

**Why last.** An export format is a consumer, and it pins to the report shape. Shipping SARIF
before step 2 creates precisely the accidental compatibility promise that step exists to prevent.

**Blocked on.** Step 2, for the export formats. The one item lifted out of this group is the
probe-plan dry run, which belongs with step 3 — it is a safety mitigation, not an ergonomic one.

---

## The installed package is never the thing under test

**What it is.** A gate step that installs `acc` the way an adopter does — from a git ref into an
empty project — and runs the linked binary by name against a conforming fixture and a broken one,
asserting `0` and `9`.

**Why it matters.** Everything the gate runs today runs from a source checkout, so the whole
packaging surface is unmeasured: `commander` sat in `devDependencies` while `cli.ts` imported it
at runtime, and `prepare` ran `husky` unguarded. Both worked perfectly in this repository and
would have failed on the consumer's first import. Both were found by hand, once, on the day the
package was first installed anywhere — which is not a mechanism.

**Also here.** ~~A git install prints `Blocked 1 postinstall`, because the `prepare` script that
sets up this repository's own hooks is shipped inside the consumer's artifact.~~ _Resolved
2026-08-23_: the script is now `hooks`, run once per clone, so nothing runs on a consumer's
install and a git install prints no block. Kept for the record, because it is this section's own
argument in miniature: it was harmless, it was invisible from a source checkout, three separate
readers stopped at it on first contact, and it took someone installing the package the way an
adopter does to see it at all.

**Blocked on** nothing. The cost is one CI job and a fixture; the reason it is not done is that
the release story is a day old.

## One run per CLI, for a family that shares one contract

**What it is.** `acc check ./a ./b ./c`, reporting the **intersection** separately from the
per-target deltas.

**Why it matters.** The first outside adopter ran the kit against a second CLI in the same
repository and got a byte-identical finding set: C2, D1, D2, D3 failing, A6, A7, B3, B5
unverified. Zero new information. The two CLIs share a scaffold, so they share the contract shape
and its gaps, and the correct unit of work was "fix the scaffold once" rather than "run the kit
seven times".

That is precisely the audience the README names — "framework and scaffold maintainers" — and for
them **the shared row is the finding**. Running seven times to discover one is backwards, and the
second run's entire value was establishing that it was a duplicate.

**Blocked on** nothing, though it wants [step 2](#2-version-the-contract-not-only-the-rules)
first if the multi-target result is ever stored: a report about several targets is a different
document shape from a report about one.

## The report says everything twice

**What it is.** The JSON report carries each finding's full `coverageGaps` array, and repeats the
same arrays wholesale under a top-level `evidenceGaps`. The first outside adopter measured roughly
40% duplication and reported that `jq` is mandatory to read anything.

**Why it matters.** The duplication is deliberate — `evidenceGaps` answers "why is
`fullyVerified` false" in one place, per rule, rather than making a reader assemble it — but
nobody checked what it costs the consumer of the document, and the answer came from outside.

**Why it is not just a trim.** Whichever copy goes, something that reads reports today breaks, so
this wants the report-shape versioning in
[step 2](#2-version-the-contract-not-only-the-rules) to land first. Dropping a field from an
unversioned document is how a format acquires a compatibility promise by accident.

## A ratchet the tool does not turn

**What it is.** An outcome code, and the report algebra behind it, for a run whose target
conforms but whose `acc.config.json` no longer describes it — today that is a `knownFailures`
entry the target has started passing, reported as a **stale expectation**.

**Why it matters.** `knownFailures` is documented as debt that only shrinks, and borrows the
word ratchet from Web Platform Tests, where the list failing on a newly-passing entry is the
mechanism. Here nothing turns: the run names the stale line and exits `0`, so a project that
ignores the reminder keeps a suppression that will silently excuse the same rule when it
regresses. The distinction between debt and a waiver — the thing the two config keys exist to
keep apart — quietly stops being enforced by anything.

**Why it is not a small fix.** Exit `9` is wrong for it. A target with a stale expectation _is_
conformant, and a `9` would assert the opposite — a CLI reporting a false outcome, which is the
defect this catalogue exists to report. It needs its own code in the `9`–`123` outcome band, and
those are append-only once published, so the shape has to be right the first time: whether
configuration staleness is one outcome or a family, whether it composes with a non-conformant
verdict on the same run, and whether a project can decline it the way it declines a rule.

**Blocked on** [step 5](#5-profiles-and-the-outcome-algebra), which is where the outcome algebra
is designed rather than extended one code at a time.

## An evidence audit nobody has run

**What it is.** A pass over every rule page's `## Evidence` section, checking that each measured
claim names its tool version, the OS, the date, the exact command or fixture, whether the result
was measured in this repository or inherited from a research note, and a primary-source link where
it quotes external guidance.

**Why it matters.** Review finding R3-9 asked for it and it has never been done as a set.
Individual sections have been corrected when something else surfaced them, and that is precisely
the problem: what remains unsourced is unfound rather than known-absent. Two measurements taken on
2026-08-19 both refuted a wiki claim that had read as settled — that `gh` advertises its
machine-mode flag in root help, and that Python needs an explicit flush before exit. Neither was
suspected until someone looked.

**Blocked on** nothing. It is unglamorous reading, and its value is exactly that nobody can
currently say how much of the Evidence corpus would survive it.

## The first screen is the coverage prose, not the finding

**What it is.** Reorder `acc check`'s text report so the census and the verdict deltas come first
and `NOT FULLY VERIFIED` sits above the rule table, rather than below twenty-three rows of coverage
prose.

**Why it matters.** Two adopters asked for the same reordering from opposite ends. One: _"whatever
the report's first screen says is all they'll read. Make it the census and the three things that
moved."_ The other, independently: _"put `NOT FULLY VERIFIED` above the fold. It is the most
valuable part of the report and it is below a 23-line table."_ A third put the pitch the same way —
lead with the defect class, not the verdict
([what three adopters want](reports/2026-08-26-what-three-adopters-want.md)).

**Blocked on** nothing. It is a change to `renderText` in `src/acc/commands/check.ts` and a decision
about ordering, not a report-shape change.

## The ladder, and what replaces `L0` in the verdict line

**What it is.** A decision on whether the `L0`/`L1`/`L2` split survives, and — if it does not —
what the verdict line says instead.

**Why it matters.** Three adopters were asked separately and all three said delete it, by three
different routes, none having ever used the word `L1`. One was actively misinformed: reading a
verdict string that named a level, they took it for a roadmap promise and waited for it. All three
independently said keep something, and the sharpest form of the answer is **names for boundaries,
yes; numbered rungs, no**. The evidence is attached to the question in
[`CHARTER.md`](../CHARTER.md#what-this-calls-into-question), which is where it is settled.

**Why it is not a documentation change.** `L0` appears in the verdict line, the most-copied string
this kit produces — into CI logs and READMEs. Whatever replaces it should be decided before it
propagates further, which makes the replacement the gating step rather than the deletion.

## Three findings from reading `STANDARD.md` against the wiki

**What it is.** The open dispositions of
[`STANDARD.md` against the wiki](reports/2026-08-31-standard-md-against-the-wiki.md), which the
2026-09-01 pass did not close:

- **`SW-3`** — the narrowing-versus-widening asymmetry has no wiki home while its weaker sibling
  has one. Wants a `decision` page, with the standard reduced to a pointer.
- **`SW-4`** — there is no `concepts/declaration.md`, though every other part of the surface has a
  concept page, and the declaration is what the project bets on.
- **`SW-9`** — the wiki and the standard hold **different licences to state an obligation**, and
  what keeps them apart is a page type the wiki does not have rather than a boundary. A
  `recommendation` type — states obligations, carries its evidence and a checkability mark, mints no
  id, exempt from the normative lint _because_ it declares its own unenforceability — would let the
  two documents be one product.

**Why `SW-9` is the one that matters.** It is a decision rather than a task, and it is the only
thing standing between the guidance and the catalogue being a single shelf. What would settle it is
not an argument: write the contract, publish one `recommendation` page, and put it in front of a
reader who has not been briefed. If they take it for spec, the split was load-bearing after all.

**Blocked on** nothing for `SW-3` and `SW-4`, which are writing. `SW-9` is blocked on somebody
deciding.

## A reference shelf the page types do not have

**What it is.** A `type: reference` for the tables a reader consults rather than reads: the
exit-code taxonomy, the error-envelope shape, the output kinds, the probe levels and inertness
classes. Concept pages would explain and link them instead of containing them.

**Why it matters.** `## The details` is the largest section in the wiki — 185 lines on
`conformance.md`, 157 on `exit-codes.md` — and on several pages it holds three kinds of content
at once. `exit-codes.md` is the clearest: `The taxonomy` is reference, `Exit codes are
append-only` is a policy, and `There is no industry standard` is explanation, all under one
heading (review DTX-5). The canonical exit-code table, plausibly the most looked-up artifact
here, sits three levels down inside explanatory prose.

`probing.md` is the same shape and is evidence the gap is structural rather than historical: it
was written recently, carries a probe-level table and an inertness-class table, and put them in
`## The details` because `concept` was the only type on offer.

**Why not yet.** The cost of DTX-5 is discoverability, not correctness, and the cheap half of that
is already paid — the index's "Start here" table links the taxonomy and the envelope shape
directly. Nobody has yet failed to find them. A new page type is a SCHEMA row, a lint vocabulary
entry, a section contract and surgery on four pages that are individually good, which is a poor
trade against an inferred need.

**Blocked on** evidence of the need rather than on another item: a reader who could not find a
table, or a guide that wants to link one and finds no anchor worth linking.

## Design guidance that is not yet normative

Five requirements live only in concept-page prose. Under this project's own contract, only rule
pages are normative, so none of them binds anything:

- every conforming CLI has a machine mode, with explicit override precedence over detection;
- machine output is complete and untruncated;
- unbounded data provides pagination and field selection;
- structured errors use a particular envelope shape;
- `next` actions carry particular remediation semantics.

**The ruling: they stay labelled as design guidance for now; promoting them to rules is roadmap
work, not remediation work.** Rule IDs are append-only and appear in reports that outlive any
release, so minting five speculative ones during a cleanup pass is the exact "cheap now,
unaffordable later" trap the
[exit-code decision](./wiki/decisions/exit-codes-below-125.md#rationale) warns about — KEP-2551
has been alpha-gated since 2022 for the same reason. They get rule IDs when a checker design
exists to give them, not before.

The reasoning is not merely procedural. Three of the five cannot be given a falsifiable checker
at all until items above them land: "complete and untruncated" needs the outcome algebra of
step 5 to say what completeness means for a stream, pagination applies only to profiles that have
unbounded output, and the `next` semantics are being redesigned at step 1. A rule ID minted now
would be minted against a clause that is about to change.

What Phase 5 did instead was cheaper and reversible: each of the five now reads unambiguously as
guidance where it sits, with a pointer here. The fix was a label, not a rewrite — the prose was
already correct, and the ambiguity was only ever about whether a reader should treat it as
binding.

## The coverage debt

All 23 rules declare `coverage: partial`, over **90 named gaps** — see
[the matrix](./wiki/index.md#coverage-at-a-glance), which is generated from rule frontmatter and
fails the lint when it drifts. Twenty-two of those rules have an implemented checker carrying 88
of the gaps; `B4` is `checker_status: planned`, so its two gaps live on the page and not yet in
code. Closing them is roadmap work, and most of it is blocked rather than merely unwritten. The
groups below are not disjoint: several gaps need two things, and a gap blocked on two blockers
closes with the later one.

**The count went from 51 to 78 without a single checker getting weaker**, and A7 and B5 have since
taken it to 89. The number was never the achievement. B2 is the clearest case: it declared three
gaps, all of them real, all of them limits of the DETECTOR — CSI-only matching, no carriage-return
animation, unreachable TTY overrides — while its rule binds on stdout and stderr for **every**
output the target produces and its checker samples root help and one usage error. Nested help,
`--version`, the output of a command that succeeds and machine-mode output were not named as
missing because the list was answering "what can the matcher see?" and never "where did it look?".
The audit that followed asked three questions of each partial checker instead of one: which
normative clauses are untested outright, which are tested by a detector that recognises only part
of what they say, and — the category that was systematically absent — **which execution paths a
universal clause reaches that no probe visits.** A page can look thorough while silently scoping a
universal rule down to whatever the probe happened to run.

**Blocked on discovery** — the largest group by some distance. Every gap here is blocked on knowing
that the subcommand exists, which today means parsing English help text: step 6, with step 3's
schema-based discovery as the interim improvement. That is the blocker they share and it is why they
are grouped, and per the note above, a gap can carry a second one.

**They do, and this entry used to deny it.** It read: _"none of these is an L0 safety limit — a
subcommand's help path is exactly as inert as the root's."_ That is false, and this repo's own
corpus falsifies it. `bounty close --help` **closed the board**; `state --help` dumped it;
`tail --help` opened the stream and never exited
([defect archaeology §6.1](./research/2026-08-15-defect-archaeology.md)). A subcommand's help path is
a subcommand invocation, and whether it does work is a property of the target, not of the token
`--help`. The kit already behaves correctly on this and the argument here must not be read as
licence to change it: `classifyInertness` in [`../src/acc/kit/inert.ts`](../src/acc/kit/inert.ts)
grants `help-path` only when **every** argv token is a help or format token, so `mycli deploy
--help` does not classify and is refused. **That refusal is correct and stays.** So these gaps do
not stop being blocked on discovery — they gain a second blocker: a real sandbox, or an operator
running a kit-generated probe plan and handing back what came out. A per-command `effects: read_only`
declaration was named here as a route and is **withdrawn** — a subject's self-description is evidence
to test, not an execution-safety boundary, so no claim a target makes about itself licenses the kit
to run its verbs
([the decision](./plans/2026-08-24-below-the-root-before-a-second-cli.md#the-decision-and-it-is-now-a-decision-not-to-build)).
The sandbox half is the same blocker the effect-observation group below already names, and by the
rule above each gap closes with whichever of its blockers lands later.

- Every gap of the form "only the root is probed", "nested subcommands are not probed at L0",
  "nested help is not probed", "a help subcommand is not probed" and "only root help is scanned".
- G1 — "only the inert invocations other checkers already request are observed".
- F1 — nested help, where the flag whose default is a token actually lives.
- A5 — the near-miss of a subcommand's flag.
- A1 — the short-flag shape, which needs discovery for a subtler reason than the others: choosing
  a short flag the target does **not** recognise means knowing which ones it does.
- D3 — "the flag scan falls back to the whole help text when no options block is recognised",
  which is the heuristic itself confessing. Schema-based discovery removes the fallback rather
  than tuning it.

**Blocked on a declaration from the target.** The kit cannot hold a target to a contract the
target never stated — that is not strictness the kit is missing, it is information. Step 6.

- A2, D2 — "the exit code is only required to be non-zero here and not the declared 2".
- B3, and now A1 as well — "the undeclared-output default of data is not enforced at L0".
- A3 — the machine-mode envelope field it never inspects.
- D1 — the structured version payload.
- C2 — the taxonomy codes.

Four more arrived with the audit, and they are the same problem wearing a different word.

- C1 and D1 — **a non-empty stream standing in for a typed payload**: C1 asserts "help text on
  stdout" as `stdout.trim() !== ""`, and D1 asserts "the version on stdout" the same way, so a
  single character satisfies both clauses. Neither can be tightened by guessing a syntax the rule
  does not state.
- B3 — its `stream` and `opaque` output kinds: two of the three rows of its own normative table
  have no probe because nothing selects them, and a declaration is what would.
- A6 — its English-only `unknown option` matcher. A declared error envelope carries a code, and
  matching a code is not matching a language.

**Blocked on effect observation, and therefore on a sandbox.** These share one shape: **a checker
cannot establish "no side effects" without a sandbox to falsify the claim in.** The negative is
unobservable from argv and streams alone, which is the entire argument for L1 and L2 — and why A4
is reported not-applicable today rather than passing. Steps 3 and 4.

- A4 — in its entirety: "no probe is declared so nothing about arity is established".
- A5 — "performing no work is inferred from a non-zero exit rather than observed".
- C3 — "unchanged state is assumed rather than established".
- D1 — "no network and no credentials and no side effects cannot be observed at L0".
- B1 — its runtime failure path.
- E1 — its real confirmation path, and the structured `confirmation_required` response behind it.
- G1 — "no invocation that does real work is sent at L0", which is the same boundary seen from the
  lifecycle side.

The audit put six more here, and every one of them is a path a probe cannot safely visit rather
than an assertion nobody wrote.

- A1 — "the command did not otherwise proceed", which is A5's sentence about a different token.
- A2 — its near-miss verb, refused for the reason A5 refuses it: a corrected verb executes.
- C2 — it can only contrast two of the five usage errors its page enumerates, because an
  unexpected positional and a malformed value both need a real verb to attach to.
- B2 — the last of its unsampled paths, the output of a command that succeeds.
- E1 — its short-timeout prompt, the same boundary read from the instrument's side: distinguishing
  "waited for input and gave up" from "never waited" means watching the read, not the exit.
- G1 — it sees only the process it spawned, so a delegator whose child faults while the parent
  reports it cleanly is a fault on an inert invocation that no observation records.

**Blocked on profiles and the outcome algebra.** Step 5.

- A6 — its delegator passthrough.
- B3 — shape stability across commands.
- F2 — the stream first-record and per-record flush requirement.
- B1 — stdout on a successful command.

**Blocked on environment control.** B2's `NO_COLOR`, `--no-color` and `TERM=dumb` overrides, which
"need a TTY and are never exercised" — and, from the audit, D2's bare invocation, which the runner
can only send down a pipe. Both are the same missing capability seen from opposite sides: B2
cannot reach the clauses that bind only **with** a terminal, and D2 cannot see the wizard that
starts only **with** one. Step 3.

**Blocked on nothing — simply unwritten.** These are the gaps a contributor can close this week,
and they are listed last precisely because "blocked" is a claim that should be checked rather than
assumed.

- B2 — OSC and single-character escape sequences, and carriage-return animation.
- F1 — its seven known credential shapes.
- C3 — it repeats only one invocation shape, and only three times.
- D3 — it requires either the machine-mode flag or a schema command rather than both.
- G1 — it cannot tell a crash caused by the probe's own sentinel token from one the target would
  suffer on any input, which a second token would narrow.

The audit roughly doubled this group, which is the most useful thing it did.

- A3 — it matches the sentinel **substring** rather than the whole offending token.
- A5 — its single deletion edit, where a transposition is as inert as a deletion.
- A6 — its single value after the terminator.
- B1 — its silence about whether the diagnostic reached stderr at all; and both B1 and B2 never
  select machine mode when B3 already knows the flag.
- C3 — it compares only a usage-error path when `--help` and `--version` are repeatable today, and
  it compares three runs milliseconds apart.
- D3 — it never invokes the flag its pass says help advertises.
- D4 — it compares stdout and never stderr.
- F2 — its best-of-three floor.

Two entries left this list rather than closing as gaps. G1's was never a coverage gap at all — it
described a way G1 could produce a wrong FAIL, which `coverage: partial` cannot qualify
([step 8](#8-test-the-checker-as-a-measurement-instrument)). G1 now fails on the fault-like
signals and reports `unverified` for the ones it cannot attribute, so the scope of its rule page
and the scope of its checker are the same scope. A controlled environment would still narrow the
ambiguous class — that is a reason to want step 3, not a hole in what a G1 pass claims.

D4's admission that its two runs "are not identical invocations because the second carries a probe
nonce in its environment" is closed, by `Invocation.repeat` rather than by environment control —
the probe identity moved out of the environment instead of the environment being controlled around
it. C3 had already taken the same fix, and F2's three timing runs, the last holdout, have since
taken it too: **no probe in the kit now puts a recorder-only identity where the target can read
it.** F2's case was the third distinct objection to doing so. It does not compare its runs, it
times them, so an environment-sensitive target would have been made faster or slower by the
recorder's own dedup workaround, and the instrument would have been perturbing the quantity it
measured.

## Non-goals are not deferred goals

The README's non-goals block is not a to-do list with a longer horizon. A passing report is not a
security certification, does not prove domain-level correctness, and at `L0` does not prove a
target is harmless to execute — and **nothing on this page moves toward changing that.**

The distinction that keeps it true: widening what the kit can _observe_ never widens what a pass
_claims_. The sandbox in step 3 exists so the kit can be pointed at a binary you have not
audited, and so L1 and L2 can falsify a CLI's own effect declarations. It does not exist so that
a clean report can mean "this tool is safe". Those are two independent axes, and the second one
is fixed: `conformant` means no applicable core rule was violated at the probe level stated
beside it, and no item here proposes to make it mean more.

## Already discharged

Recorded so the review is not read as a list of pending work. Four remediation phases closed
Rounds 1, 2 and 5, the mechanical half of Round 3, and every item under the review's additional
hardening recommendations. One Round 3 finding remains and is placed above rather than here: the normative-scope question
is settled at [design guidance](#design-guidance-that-is-not-yet-normative). The adoption guide
(R3-8) and the page-shape restructure (R3-7) are both written; what is left of Round 3 is R3-9,
the Evidence-provenance audit, at
[an evidence audit nobody has run](#an-evidence-audit-nobody-has-run).

- the front page now separates **For**, **Today**, **Planned** and **Non-goals** — the review's
  own step 1, and its "separate current capability from roadmap language" recommendation;
- process termination bounds the whole process tree, and output capture is bounded, with
  truncation reported rather than silent and a raw-byte digest beside each decoded stream, so two
  streams the UTF-8 decode renders identically are no longer identical evidence (R1-1, R2-3,
  R6-1);
- the observation records the terminating signal and `G1` judges it, so a target that crashes on
  every path but help is `NOT CONFORMANT` at exit `9` instead of green at exit `0` — the record
  half of the [lifecycle family](#7-the-lifecycle-rule-family), told in full
  [below](#how-the-crash-gap-was-found-and-closed). That opens the family rather than closing it:
  the rules for cancellation, bounded shutdown, SIGPIPE and resumability remain at step 7;
- G1 fails the fault-like signals and reports `unverified` for the ones it cannot attribute, so
  its normative scope and its checker's scope are one scope, quoted from one list and held there
  by the lint (R6-2). `SIGPIPE` moves with the rest of the ambiguous class to step 7, where a
  closed pipe is the normal end of a pipeline rather than a fault;
- the L0 safety **wording** is corrected — the capability is step 3 above (R2-1);
- the envelope has one model, `confirmation_required` rather than a parallel status field, and
  the exit-code decision page states its residual collision instead of overclaiming portability
  (R3-2, R3-3);
- verdict accounting distinguishes `pass`, `fail` and `unverified` from not-applicable, and
  `fullyVerified` can no longer be purchased over admitted coverage gaps (R1-4, R3-4);
- `checker_status` is defined as implementation presence, every rule page carries a
  `## Current checker coverage` section, and the coverage matrix is generated (the mechanical half
  of the normative-scope finding);
- the per-project config file is validated rather than cast, and a target's own shebang is
  honoured (R2-4, R2-5);
- `acc.config.json` carries per-rule severity beside the known-failure ratchet, so a project can
  waive a rule that does not apply to it — and a waived core `defect` still blocks `fullyVerified`,
  so the adopter's frame moves the gate and never the evidence claim. A waived `design-choice` is
  the exception, and deliberately so
  ([conformance](./wiki/concepts/conformance.md#the-asymmetry-a-waiver-buys-the-gate-and-the-evidence-only-when-the-rule-is-a-defect));
- every published example is executed by the test suite, C3 repeats one invocation instead of
  comparing three flags, and the CLI's own dogfood suite runs in the gate (R3-5, R5-1);
- the dogfood suite's copy of F1's credential patterns is now tested in both directions. It was
  looser than the shipped ones — no word boundary, no length floor — so `sk-` matched inside
  ordinary English, it fired on the word "risk-reduced" in README prose during Phase 4, and the
  prose was reworded to dodge it. Nothing was wrong with the shipped checker; the instrument
  standing beside it had never been tested against prose it must ignore or against a credential it
  must catch, and so did neither correctly — the instance that argues for
  [step 8](#8-test-the-checker-as-a-measurement-instrument);
- the gate runs as a checked-in CI workflow on push and pull request, and duplicate wiki
  identities fail the lint (both additional hardening recommendations).

### How the crash gap was found and closed

`runner.ts` used to close over `child.on("close", (code) => …)`, discarding Node's second
argument, the terminating signal. `Observation.exitCode` is then `null`, which its own doc comment
defined as "the deadline or the output ceiling killed it". A target that died of a signal nobody
in this kit sent was recorded as one this kit killed. Running a fixture whose entire body is
`kill -SEGV $$` through `record()` and `buildReport()` produced **nine passing rules** — A2, A6,
B1, B2, C3, D2, D4, E1 and F1 — among them:

```
A2 pass  root verb rejected with exit null
C3 pass  three identical invocations all exited null
D2 pass  bare invocation exited null with stdout empty; stderr not inspected
E1 pass  all 4 inert invocation(s) terminated (bare, --help, unknown flag, unknown verb)
```

Nine was not a coincidence. It is the same number, and the same defect class, the kit already
closed once from the other end: `spawnFailed` exists because a target that could not be executed
_at all_ once collected nine passes from checkers satisfied by an empty stream and a non-zero
exit. A target that _starts_ and then dies on every probe walked straight back through the same
hole, because `null` is not `0` and no checker asked a second question.

`Observation` now carries `signal` — the terminating signal as the OS reported it — and `crashed`,
meaning terminated by a signal the kit did not send, which is the distinction `signal` alone
cannot make once you notice that `killTree` sends SIGKILL too. `crashedUnverified` is the
catalogue's third invariant beside `hungUnverified` and `truncatedUnverified`, and the same
fixture now scores zero passes.

Recording the signal was half the job. With every checker reporting `unverified` on a crashed
probe, a fixture that answers `--help`, `-h` and `--version` correctly and segfaults on every
other path reported **`conformant: true` at exit `0`, with eleven core rules unverified** —
`conformant` counts violations, and a crash was nobody's violation. `fullyVerified` was false and
`evidenceGaps` named all eleven, which is the report saying what it knows; the headline was the
part that could not.

That is what G1 closes, and it is why the id was minted then rather than with the rest of the
family: this one had a checker design that needs no probes of its own. The fixture is permanent
(`src/acc/kit/fixtures/sh/crashes-except-help.sh`), asserted at `conformant: false` and exit `9`,
with the pre-G1 headline asserted alongside it so the rule cannot silently stop biting. C1 still
reports `fail` for help that dies on a **fault** signal, incidentally rather than by ownership,
because C1's subject is that a help request _succeeds_ — and it reads G1's own taxonomy to draw
that line, reporting `unverified` on a signal G1 has declined to attribute.

## Appendix: where this departs from the review

For the reader who has `docs/reports/2026-08-14-implementation-review.md` open. Its Round 4
findings map onto this page as R4-4 → [step 1](#1-remediation-becomes-structured-data), R4-6 →
[step 2](#2-version-the-contract-not-only-the-rules), R4-9 →
[step 3](#3-control-the-observation-environment-which-is-also-the-l0-safety-work), R4-1 →
[step 4](#4-durable-observation-and-replay), R4-2 with R4-3 →
[step 5](#5-profiles-and-the-outcome-algebra), R4-7 → [step 6](#6-the-portable-declaration-ir),
R4-5 → [step 7](#7-the-lifecycle-rule-family), R4-8 →
[step 8](#8-test-the-checker-as-a-measurement-instrument).

Five of those placements differ from the review's own seven-step order. Each reason is stated
positively in the step it belongs to; collected here so none of the five is silent:

- **R4-4 first.** The review rates it P1 and then leaves it out of its own ordering entirely.
  Ranked by consequence rather than by label it goes first: a small schema change today, an
  unaffordable one once agent clients auto-follow remediation.
- **R4-6 split from R4-1 and put strictly before it.** The review bundles both into its own step 3.
- **R4-9 merged with the deferred L0 safety work and promoted ahead of the artifact.** The review
  keeps them apart — safety under R2-1, environment under R4-9 at P2.
- **R4-3 merged into R4-2 rather than sitting a step ahead of it.** The review resolves the
  outcome model at its own step 2 and adds profiles at its own step 4.
- **R4-5 placed at step 7.** The review omits it from its order as well. Most of it cannot go
  earlier, and its first member has since landed anyway.

The review's own step 1 — audience, current capability, planned capability, and non-goals on the
front page — is done, which is why this page starts where it does. See
[already discharged](#already-discharged), which carries the rest of the discharged findings by
number.

Five findings are cited above by name rather than by number, because a number resolves to nothing
a reader can open: the **normative-scope** finding (R3-1) at
[design guidance](#design-guidance-that-is-not-yet-normative), the **Evidence-provenance audit** (R3-9) at
[an evidence audit nobody has run](#an-evidence-audit-nobody-has-run), the **false-positive
sweep** (R6-5) and the bidirectional
`coverage_established` lint (DTX-8, from `docs/reports/2026-08-15-wiki-diataxis-review.md`) at
[step 8](#8-test-the-checker-as-a-measurement-instrument), and the **probe nonce** in F2's timing
runs (R6-6) in [the coverage debt](#the-coverage-debt).
