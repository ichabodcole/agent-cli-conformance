---
type: report
generated: { by: codex, at: 2026-08-24 }
status: draft
lifecycle: live
description:
  A whole-project audit against the problem it was started to solve; the foundations are strong,
  but the shipped single-target L0 checker cannot propagate decisions or expose fleet-wide drift,
  so the next increment should prove a code-bound declaration and comparison loop on the owner's
  own CLIs.
tags: [conformance, adoption, declaration, evidence, l0]
subject: the repository's product direction, documentation corpus, conformance kit, and evidence of adoption
examined: develop at 0d14cf508d76eec8bc604243c7da0cdc6e964c8a, 2026-08-24
---

# Product-direction audit: keep the foundation, change the center

## Executive answer

**The problem is real. The project has built several of the right ingredients. It has not yet
built the product that most directly solves the problem.**

The recurring problem is not merely that an individual CLI violates a universal rule. It is that
one author makes the same interface decisions repeatedly, the decisions diverge across projects,
and a repair in one tool does not reach the next. The current product, `acc check <target>`, judges
one binary at a time against a fixed catalogue. That is useful as a black-box smoke test, but it
cannot show a relationship between tools and it cannot propagate an implementation. Those are the
two operations the original problem requires.

The repository has now reached the same conclusion itself. [`CHARTER.md`](../../CHARTER.md) names
guidance, code-bound declarations, fleet visibility, and contract testing as the intended product.
That charter is the right strategic correction. As of the examined commit, however, it describes a
future direction rather than a shipped workflow: there is no adoptable declaration format, no
multi-target comparison, and no library or scaffold that carries a decision into the next CLI.

My recommendation is therefore a **narrow pivot, not a restart**:

- keep the evidence-backed guidance, observation model, report honesty, and black-box runner;
- stop treating further `L0` checker refinement as the default form of progress;
- extract the single-source pattern already proven by `acc` itself into one code-bound declaration
  for the owner's actual TypeScript/Bun tools;
- use it to verify one target and compare several targets; and
- change the shared scaffold once, then observe whether the change reaches the fleet.

That vertical slice tests the project's central thesis. A portable declaration IR, more probe
levels, durable replay, and an ontology refactor should wait until the slice produces value worth
generalising.

## What I examined

I read the front door, charter, wiki structure, roadmap, all plan and report summaries, the reports
and research bearing directly on adoption and real defects, and the implementation path from
`acc check` through config loading, recording, checking, and reporting. I also inspected the
single-source command declaration used by `acc` itself and ran the full repository gate.

At commit `0d14cf5` the repository contained:

- 23 rule pages, 22 implemented checkers, and one rule with no checker;
- 19 reports, of which 13 were still `lifecycle: live`;
- 5 plans and 10 research notes, excluding their folder READMEs;
- about 9,326 lines of non-test TypeScript and 8,655 lines of TypeScript tests under `src/acc`;
- 316 commits over twelve calendar dates, including 130 `docs` commits, 69 `fix` commits, and 40
  `feat` commits; and
- a clean `bun run check`: 1,386 tests passed, with typecheck, Biome, Markdown formatting, both
  documentation lints, and the suite all green.

The counts are context, not a productivity score. They matter because the product charter first
appeared at commit `a624e28`, after 312 of the 316 commits in the examined history. Almost the
entire implementation and review system therefore pre-dates the document that now says what work
should be accepted or rejected.

## What is genuinely strong

The audit should not flatten “wrong product center” into “bad project.” Four assets are unusually
good and should survive the change in direction.

**The evidence discipline is real.** Claims about other tools are sourced or measured, negative
results are retained, and reports distinguish violations from what could not be established. Both
outside adoption accounts valued that honesty. The first adopter called the detailed coverage
report the best artifact the tool makes, and the blind trial trusted the result precisely because
the kit disclosed its limits.

**The observation/checker separation is a sound core.** Recording an invocation once and running
pure checkers over the result is the right architecture for reproducibility, replay, and adding a
new interpretation without rerunning a target. Durable replay does not exist yet, but the in-memory
model is a useful foundation rather than a dead end.

**Black-box execution has already beaten source reading.** In the first external adoption trial,
two readers predicted the bare-invocation behavior incorrectly and the probe got it right. The
trials also led to real changes: grapevine gained a version path, and anthill fixed an unknown-flag
and offending-token defect that its own project had already repaired in two neighboring parser
positions. The checker is not valueless merely because its present reach is narrow.

**`acc` contains a working seed of the higher-leverage product.** [`src/acc/spec.ts`](../../src/acc/spec.ts)
declares commands, arguments, closed value sets, effects, output kinds, cardinality, errors, and
examples. [`src/acc/cli.ts`](../../src/acc/cli.ts) derives parser behavior and help from it;
[`src/acc/commands/schema.ts`](../../src/acc/commands/schema.ts) serializes it. The suite checks the
result. This is the repository's “make drift impossible” layer in miniature. It is currently
private to the reference CLI instead of available to the tools whose drift motivated the project.

## Findings

### PDA-1 — The current unit of analysis cannot answer the original question

`acc check` accepts one target and emits one judgment. Every rule asks whether that target meets a
catalogue requirement. The original complaint is relational: _where did my tools solve the same
problem differently, and was that difference chosen?_

The distinction is not theoretical. The
[`eight-owner-CLIs` report](./2026-08-24-eight-owner-clis.md) found five material differences across
the fleet:

- usage errors exit `1` in one tool and `2` in seven;
- help has three different stream/status/output shapes;
- one of eight tools supports `--version`;
- machine mode follows two different selection models; and
- the two repositories encode opposite policies for exiting after a write.

No rule reports those relationships. Several rules deliberately accept any non-zero status, so
both sides of the `1` versus `2` divergence pass. Six related tools produce the same verdict vector
six times, which tells their maintainer to fix the scaffold but provides no operation for doing or
even presenting that work as one unit.

**Consequence:** the checker can find an isolated defect, but the shipped report cannot deliver
the fleet visibility named by the charter's North Star.

### PDA-2 — `L0` is well-engineered around a surface that misses most expensive defects

The strongest available measurement is
[`defect archaeology`](../research/2026-08-15-defect-archaeology.md), because it starts from defects
that actually happened rather than rules the kit already knows how to probe. Seven fixed defects
were replayed before and after their repairs. One was detected. For the other six, the entire
verdict vector was unchanged.

The misses share a cause: they appear when a real command runs, a flag carries a value, a large
payload drains, or a machine mode is selected. `L0` mostly excludes those paths to control hazard.
That boundary is legitimate, but it means further precision inside the boundary has diminishing
returns against the owner's actual defect population. The eight-tool run reinforces this: 15 of 23
rules returned the same verdict on every target, including rules that always passed and rules that
could never establish an answer.

The failure is therefore not “the checkers need more care.” They have received exceptional care.
It is that the most consequential behavior depends on facts the target must declare and commands
the runner must be licensed to execute.

**Consequence:** `L0` should be positioned as an opportunistic, risk-reduced diagnostic. Calling
its output the main conformance product encourages more work at a boundary the evidence says cannot
reach the dominant failures.

### PDA-3 — The project implemented “caught” before “impossible,” though recurrence needs the latter

The README proposes three enforcement layers: make a defect impossible, catch it, document it. In
the product offered to adopters, the first layer is absent. There is no exported contract API,
generator, parser wrapper, or scaffold carrying the recommendations into the next CLI.

That omission is especially costly for this population. Six of the eight measured CLIs share a
scaffold. Adding a version path, an error printer, or closed-set validation to that common source
can improve six tools in one change. Adding a checker tells six tools the same thing six times.

The repository has already implemented the relevant pattern for itself in `spec.ts`; it simply has
not made the pattern an adopter-facing artifact. Starting with a universal, language-neutral IR is
not required to correct that. The owner has a concrete TypeScript/Bun fleet on which a small typed
contract can prove or disprove the propagation claim first.

**Consequence:** the shortest route to value is to extract and apply an implementation primitive,
not to add another universal rule.

### PDA-4 — The new strategy is not yet a coherent current state

The charter is directionally strong, but it arrived after almost all of the examined history and
is not linked from either `README.md` or `AGENTS.md`. Its own consequences section says both links
are owed. The roadmap still puts adoption surfaces ninth and organizes the work around the report
and checker architecture that the charter demotes. The README still says the project starts at
“caught” because uncheckable guidance does not qualify as a rule, while the charter says guidance
is primary.

There is also a direct shipped-behavior contradiction. The stable decision
[`Require a config`](../wiki/decisions/require-a-config-never-raise-ownership.md) says `acc check`
does not run without a declaration. The stable decision
[`If it is not in the config`](../wiki/decisions/not-in-the-config-not-inferred.md) says an empty
config is not a config. Current `loadConfig` returns an empty config when the file is absent, the
README calls that the normal case, and a clean-directory run during this audit returned
`conformant: true` with `configSource.origin: "none"`. The test suite explicitly protects that
behavior.

Decision records can precede implementation, but the repository currently presents the decision,
the front door, the help text, the code, and the tests as simultaneous truths. A reader cannot tell
whether required declarations are a product contract or a proposed migration.

**Consequence:** before adding declaration fields, the project needs one maintained statement of
the product topology and migration state. Otherwise every new field reopens the `L0`/`L1` debate.

### PDA-5 — The quality system rewards another analysis after evidence has stopped being scarce

The reports folder is designed so findings are discharged by action, promotion, or explicit
decline. At the examined commit it held 13 live reports and 6 discharged ones. Several live reports
independently reach the same answer: machine-mode spelling cannot substitute for a declaration,
argument grammar cannot safely be guessed, design choices need target-supplied facts, and a
single-target report cannot represent a fleet.

This is not evidence that the reports are poor. It is evidence that analysis is no longer the
scarce input. The repository has excellent procedures for producing and checking a document, but
no equally strong admission rule for starting another inquiry when an earlier one already supplies
an executable next step. The result is locally rational churn: each investigation improves the
model, and the product remains in the same place.

The history makes the imbalance visible without turning it into a quota: 130 documentation commits
and 19 reports are not excessive in isolation. They are excessive relative to the fact that none
of the charter's success signals has yet been demonstrated by a product workflow.

**Consequence:** further analysis should be triggered by a blocked build or contradictory external
evidence, not by the availability of another internal distinction to refine.

### PDA-6 — The declaration thesis is the right bet and remains untested

The declarations research finds the central risk plainly: hand-maintained CLI descriptions drift,
while declarations generated from the implementation remain accurate but often omit exit, output,
and effect semantics. This project proposes to combine the two: bind a richer declaration to code,
then falsify it against the running binary.

That is a differentiated and plausible thesis. It has not happened once in an adopter's tool.
Today's `acc.config.json` mixes policy (`rules`, `knownFailures`) with one target claim
(`defaultOutput`) and cannot describe commands, positionals, output surfaces, errors, or effects.
The richer declaration exists only for `acc` itself. No test has yet shown an adopter's declaration
drift, followed by the kit catching it.

**Consequence:** the next body of work should be designed as an experiment on this thesis, not as
an implementation of the full roadmap.

## Recommended product shape

The recurring boundary questions become simpler if the product is understood as three operations,
whether or not these become literal command names:

1. **Inspect** — run safe-ish black-box probes with no declaration and report observations and
   suspicions. This is today's `L0`. It is useful, non-authoritative, and never needs to pretend it
   knows the target's grammar.
2. **Verify** — take a code-bound declaration and a target, execute the paths that declaration
   licenses, and fail when runtime behavior contradicts the declared contract. This is the missing
   contract test.
3. **Compare** — place several declarations side by side and report shared decisions, deliberate
   exceptions, and unexplained divergences. This is the missing answer to the original fleet
   problem.

Guidance supplies recommended declarations for a new tool. An implementation library or scaffold
makes those recommendations cheap to adopt. Verification prevents the declaration from becoming
stale documentation. Comparison makes divergence visible without requiring every tool in the
world to follow one standard.

This shape also gives the current assets clear jobs. The wiki recommends. The typed declaration
binds. The runner observes. Checkers falsify. The fleet report compares. Policy decides which
differences gate a project. None of those concepts has to carry all the others.

## Recommended next body of work

### 1. Freeze the current checker surface except for trust defects

Do not add rules, widen universal grammar support, or undertake the seven-primitive refactor yet.
Continue to fix false verdicts, unsafe probes, and regressions in already-promised behavior; those
damage trust. Treat weaker coverage and a prettier internal ontology as known debt until the
declaration experiment says which structures the product actually needs.

The stop condition is not a date or a rule count. The freeze ends when a declaration-backed run
or fleet comparison needs a capability the current core cannot express.

### 2. Define the smallest declaration that can reproduce known fleet differences

Start from facts already measured, not from a complete theory of CLIs. The first declaration needs
enough to state:

- positional shape: verb-dispatch versus free-form data, with command paths and arity where
  declared;
- help and version spellings, statuses, and output surfaces;
- usage-error taxonomy and the field or stream that names the offending token;
- output kind and selection per command or surface, rather than one tool-wide `defaultOutput`;
- closed value sets; and
- effect/idempotency metadata for the first real commands the verifier will execute.

Every field must have a planned falsification. If a field cannot change a comparison or license a
runtime check in the first slice, leave it out.

### 3. Bind it to the owner's code before making it portable

Extract the pattern from `src/acc/spec.ts` into the shared TypeScript/Bun scaffold, or build a thin
adapter around the scaffold's existing command declarations. Generate the machine description
from the same object that creates parsing and help. Hand-authored policy may remain beside it, but
the command surface should not be copied into a second JSON file.

Language neutrality is an output-format property at this stage: emit JSON that another ecosystem
could later produce. It need not be an implementation constraint on the first adopter.

### 4. Build comparison before general replay infrastructure

Run the declarations for the owner's eight tools through one population report. Its acceptance
test is concrete: it should surface the known `1` versus `2`, help, version, machine-mode, and exit
policy differences from the eight-tool measurement, identify the six shared-scaffold tools as one
cohort, and allow a declared exception to remain visible without being called a defect.

If the product cannot express those already-known differences clearly, more fields or more targets
will not rescue it. If it can, the project has delivered its first direct answer to the North Star.

### 5. Close the loop in real repositories

Use two complementary trials:

- **Propagation trial:** change one shared-scaffold decision, regenerate the six related CLIs, and
  verify the population report moves once rather than requiring six independent repairs.
- **Drift trial:** bind anthill's existing manifest/format declarations to the runtime, deliberately
  introduce a mismatch, and confirm verification catches it before restoring the implementation.

The slice succeeds when the product, rather than a one-off research script, finds a previously
unseen divergence; a code-bound declaration catches a real or deliberately reintroduced drift;
and a shared fix reaches more than one CLI. A green self-conformance run is necessary engineering
evidence, but it is not one of these product outcomes.

### 6. Rebase the roadmap and front door on what the trials establish

After the vertical slice, decide which of durable replay, environment control, profiles, versioned
IR, lifecycle rules, and checker assurance is the next blocker. Rewrite the roadmap around that
dependency evidence. Link the charter from the front door and grounding file, reconcile the two
required-config decisions with shipped behavior, and discharge or promote the live reports that
the slice resolves.

Do not preserve the current order merely because it is argued carefully. Its premise predates the
charter, and the charter changes what “blocked” means.

## What not to throw away

The current kit should remain available during this experiment. It is fast, it has found real
defects, and its explicit uncertainty is a better substrate than starting from a schema generator
that believes itself. The change is in role:

- a heuristic finding is a lead, not a universal judgment about an undeclared tool;
- a declaration-backed contradiction can gate;
- a fleet difference is reported as a relation, not forced into pass or fail; and
- a shared implementation is the mechanism that prevents recurrence.

That division preserves the project's hardest-won engineering while moving the center of gravity
to the value the owner originally wanted.

## Bottom line

The project is not churning because it has learned nothing. It is churning because it has learned
the decisive thing several times and has not converted it into the next product surface.

The decisive thing is this: **black-box conformance against undeclared CLIs can catch useful edge
defects, but it cannot make an author's next CLI inherit the last one's decisions or show that
author where their fleet diverged. A code-bound declaration, verified at runtime and compared
across the fleet, can.**

Build that smallest loop on the CLIs already in hand. Its result will say whether the project has
found its product; another round of internal refinement cannot.
