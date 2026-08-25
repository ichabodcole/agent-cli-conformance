# Charter

This document states the problem this project exists to solve, who it is for, and what it is
trying to be true of the world when it has worked. It is written to be used, not admired: a
proposal is tested against it, and a proposal that does not serve the North Star below is rejected
even when it is good work. Where the rest of the repository disagrees with this page, this page is
the one that was written on purpose and the other is the one to change — the disagreements known
at the time of writing are listed at the end.

It is written now because the project had begun drifting from a concrete problem toward a theory
of conformance checking, and because a measurement taken along the way says the theory was aimed
at the wrong surface.

## The problem

Someone builds a lot of CLIs. Some are project-local tools an agent uses to do work inside that
project; others are the command-line face of an application an agent is orchestrating. Agents work
well with CLIs — they have been trained on them — so once you start building for agents you start
building CLIs, and you keep building them.

The trouble arrives on the third one and never leaves. **The same defects come back, in a new
project, in a tool written by the same person who already fixed them somewhere else** — and the
tools that do not share defects share nothing else either, because each was implemented its own
way. A fix does not propagate. A convention does not propagate. Nothing carries from one CLI to
the next except whatever the author happens to remember.

This is measured rather than felt.

- A survey of 15 CLIs across one developer's projects found the same contract implemented at
  **four different maturity levels**, with no path for improvements to propagate: one project had
  grown an exit-code taxonomy, another had independently added a `code` field to its error
  envelope, and the shared scaffold both were generated from had neither.
- [Defect archaeology](docs/research/2026-08-15-defect-archaeology.md) mined 1,392 non-merge
  commits across two of the owner's repositories and catalogued **15 classes** of CLI-contract
  defect. **Six of them recur across both repositories from independent causes** — an unknown flag
  accepted while the verb runs anyway, a positional silently swallowed, a field that collapses
  "none" with "I could not tell", a `--` terminator that fails to protect what it is for, a
  process that never exits, `0` where the answer is unknowable.
- The first external trial of the kit found, in one CLI, a defect **its own team had already fixed
  twice in two other argv positions**, with a test named after the first fix
  ([report](docs/reports/2026-08-21-anthill-first-contact-trial.md)).
- Measured across the owner's own eight CLIs on 2026-08-24: seven answer an unknown flag with exit
  `2` and one with exit `1`; `--help` goes to stdout in six, to **stderr at exit 2** in one, and to
  stdout as **JSON** in one; `--version` exists in exactly one of the eight. One author, one
  toolset, three answers to the same question — and **no rule in the catalogue reports any of it**,
  because every rule judges one tool alone. That measurement is the owner's original complaint,
  reproduced directly.

The failures share a shape, which is why they hurt more than their count suggests: **the tool does
the wrong thing and reports success.** A dropped flag value turns a filtered read into a full-board
read at exit `0`. A swallowed positional returns the entire log with `ok: true`. A payload
truncated at a pipe buffer stops mid-string and exits `0`. An agent has no way to learn it made a
mistake, and neither does the person reading the transcript afterwards.

And there is nowhere to look this up. A survey of interface-declaration prior art run for this
charter — not yet filed in `docs/research/`, and a consequence below — found **no standard for a
CLI to declare its own interface**. The nearest things are `dotnet --cli-schema` (shipped in .NET
10, emitted by the tool, motivated by feature probing), `jdx/usage` (the most expressive, one
maintainer, near-zero adoption) and `clispec` (closest in intent, four months old). Every
hand-authored declaration format in that survey drifts from the tool it describes and none of them
has a drift check; every artifact that covers a real CLI completely is one the tool emits itself.
Fig accumulated 735 hand-written specs and is abandoned. **Nothing found probes a running tool and
falsifies what it declares** — the nearest thing anyone does is Azure's `azdev latest-index
verify`, which regenerates from the live command table and byte-compares to the checked-in JSON.
That is a real drift gate and a good one, and it compares one generation against another; a
declaration that was wrong the first time it was generated passes it.

So the person building their fourth agent-facing CLI has no spec to adopt, no scaffold that
carries what the last three taught them, and no way to be told they have drifted.

## Who this is for

The owner of this repository, first and concretely: someone maintaining several agent-facing CLIs
across several projects, who keeps re-solving the same problems and wants them to stop coming back.
Then people in the same position — building more than one CLI that agents drive, with nothing
carrying lessons between them.

That is the population. It is worth being plain that it is a narrow one, and that the value case
rests on the third CLI rather than the first: someone shipping a single tool can hold its
conventions in their head, and this project is not aimed at them.

**The audience line currently in [`README.md`](README.md)** — "CLI authors, framework and scaffold
maintainers, and platform/tooling teams; agent-harness authors second" — was written before this
was clear. It describes relationships to a target rather than the problem someone has, and
[require a config](docs/wiki/decisions/require-a-config-never-raise-ownership.md) has already
withdrawn part of it on separate reasoning. It needs to be replaced, not defended.

## The North Star

> **A person who builds several agent-facing CLIs should be able to build the next one right the
> first time, and see across the ones they already have — so that where two of their tools solve
> the same problem differently, that is a choice somebody made rather than an accident nobody
> noticed.**

**Consistency here is not uniformity.** The goal is not that every CLI behaves identically; it is
that the differences between them are **visible and deliberate**. Two tools may reasonably answer
the same question two ways. What costs the author is not the divergence — it is discovering it
years later, in the third project, by re-fixing a bug they had already fixed.

The test a proposal has to pass is: **does this make it more likely that someone's next CLI is
better, or that the differences between the ones they have become visible to them?** Not "does
this make the checker more thorough", and not "does this close a gap in the catalogue".

Three worked rejections, so the test can be seen to bite:

- **A rule minted for a grammar found in a survey of tools nobody here maintains** fails it. The
  survey's value is subtractive — see the scope section below.
- **A checker refinement whose only beneficiary is a target that will never adopt the guidance**
  fails it, however correct the refinement is.
- **One more rule that nobody's CLI will be changed by** fails it, even if the rule is true.

And one that passes: **anything that makes the guidance easier to follow, or makes a declaration
carry more of what the checker currently has to guess.** That is the direction of travel.

It is expected that this requires a lift from whoever adopts it. The ask is not "fix your exit
code number"; it is "declare your interface and tie it to your code", which is real work with a
real payoff and is not free. Guidance that asks for nothing changes nothing.

## What the project offers

One foundational ask, two things it buys, and a body of guidance beside them.

**The ask is: declare what your interface is, and bind that declaration to the code that
implements it.** It is the foundational move, it is real work, and it is where the rest of the
value comes from. Everything below is downstream of a tool being able to say what it does.

**First, visibility across a fleet.** With several CLIs each emitting a declaration, you can put
them side by side and see where you solved the same problem two different ways — the same flag
spelled differently, the same error shaped differently, the same decision taken twice without
noticing. That is the direct answer to the original complaint, and it does not require anybody to
agree on a standard: the comparison is between your own tools, and the outcome is that a
divergence becomes a choice.

Worth stating plainly, because it is not what the project currently builds: **no rule in this
catalogue can do this**, and the eight-CLI measurement above is the demonstration — every
divergence it found was invisible to every rule in the catalogue, several of them because a checker requires only
that an exit code be non-zero and so passes both conventions. Every rule examines one tool in
isolation and reports a verdict about it. Comparing declarations across a fleet is a different
product surface from checking a tool against a spec, and it is the surface the owner's problem
actually asks for.

**Second, contract testing for your own tool.** Declare what your CLI does, then have the kit try
to falsify the declaration against the running binary. This is useful to somebody with exactly one
CLI, no fleet, and no interest in anyone else's standards — it is a testing strategy rather than a
conformance regime, and it is the half nothing in the prior-art survey does at all.

**The guidance sits alongside both, and it is recommendations with reasons.** It says what the
interface owes a caller that is a program, and why: here is the shape we recommend, here is the
failure it avoids, here is what a different design would have to get right instead. A tool may
reasonably decline a recommendation — the [grammar
survey](docs/reports/2026-08-23-triaging-the-argument-grammar-survey.md) is a standing supply of
defensible designs that do, from exit codes that are bit fields to exit codes owned by a delegated
child. A declined recommendation is a decision, not a failure, and the guidance is written to be
evaluated rather than obeyed. For a CLI that does not exist yet it is worth more than that: adopt
it wholesale and you get a coherent set of interface decisions without having to make each one.

**The guidance is the primary product and the checker serves it.** That order is not a preference;
it is what the measurement says. The archaeology replayed seven real fixed defects against
`acc check` at the pre-fix and post-fix trees and found a hit rate of **1 in 7**. For six of the
seven the entire verdict vector is byte-identical before and after the fix: the kit could not tell
the defective tree from the repaired one on any rule. One fixture that silently loses 57% of its
output scores `conformant: true` with zero core failures.

The reason is the load-bearing part. Every miss only manifests **when a verb runs, when a flag
carries a value, when a payload exceeds a pipe buffer, or when machine mode is selected** — four
conditions the current probe level excludes by construction. The checker is not weak by accident
and it is not weak because the checkers are badly written. It is aimed at a surface that is not the
one that breaks, and the thing standing between it and the surface that does break is the absence
of anything the target has declared.

The same eight-CLI run shows the other half of that shape. **Fifteen rules — nearly two thirds of the catalogue —
return an identical verdict on all eight targets**: nine always `PASS+`, three always `UNVR`, three
always `N/A`. The six CLIs sharing a scaffold produce one verdict vector six times over, so three
quarters of the output is duplicate on a corpus picked to expose difference. And the tool that
behaves most like the guidance recommends is the one the kit can say least about: anthill's piped
`--help` is a JSON document with no `flags` key, so help discovery finds no value sets and `A5` and
`A7` report `unverified` — on a target that does declare a closed set, in its own manifest, where
nothing currently reads it. **Being machine-first makes a target less checkable today**, which is
the argument for reading a declaration rather than parsing help, stated as a measurement.

So the checker's job is to keep a declaration honest — which is what makes the visibility real
rather than aspirational, since a fleet of declarations nobody falsifies is a fleet of documents
that have quietly stopped being true. Build the checker first and it measures help text.

## What is out of scope

**Serving CLIs that never adopted the guidance.** The kit will run against a tool the person
running it does not maintain — who wrote the declaration is
[explicitly not material](docs/wiki/decisions/require-a-config-never-raise-ownership.md), and that
stands. What is out of scope is the _undeclared_ run and, more importantly, building for a
population that will never declare anything. A verdict on a tool nobody will change is a verdict
nobody acts on, and the evidence says such verdicts are also frequently wrong: against `ripgrep`,
three of them were, including a **false pass** built on the guess that the first positional is a
verb ([blind trial](docs/reports/2026-08-23-blind-trial-ripgrep.md)).

**Supporting every argument grammar in existence.** The
[grammar survey triage](docs/reports/2026-08-23-triaging-the-argument-grammar-survey.md) collected
real CLIs whose grammars break assumptions this catalogue makes — `-h` that means host or
human-readable, `--output` that names a file, exit codes that are bit fields, exit codes owned by a
delegated child, argv where order changes meaning. **Those tools are evidence, not a population we
must serve.** They tell us which assumptions are unsafe to bake into a rule, and the work they
generate is removing an unsafe inference — not widening the catalogue until every grammar is
covered. A finding from that survey earns its place by deleting a guess, not by adding a rule.

**Being a general-purpose CLI linter.** The subject is the contract between a command-line tool and
a program driving it. Guidance aimed at what makes a CLI pleasant for a human at a terminal is a
different document with a different reader, and mixing them produces a catalogue that serves
neither — and a set of rules an adopter cannot tell apart when deciding what binds them.

## What this calls into question

These are named, not settled. Each is open, each has its evidence attached, and none of them is
decided by this page.

**Whether the `L0`/`L1` split survives.** [Probing](docs/wiki/concepts/probing.md) defines three
levels and only the shallowest exists. If every miss in the archaeology is outside `L0` by
construction, and if the project has
[committed to a run that will not start without a declaration](docs/wiki/decisions/require-a-config-never-raise-ownership.md#the-refusal-is-not-being-built-yet-and-what-would-start-it),
then the boundary the levels draw may no longer be the boundary the project cares about. The owner
has said outright that "there isn't really an `L0` versus an `L1`" is an acceptable answer, and so
is "there is an `L0` but it is very limited". What is not acceptable is the split surviving because
it is already written down.

The evidence that this is live rather than philosophical is in the decisions, which is where a
premise lives. `L0` was defined as the level that needs nothing from the target, and `L1` as the
level that begins when the target declares something. Then
[require a config](docs/wiki/decisions/require-a-config-never-raise-ownership.md) settled that
`acc check` must not run at all without a declaration, and
[if it is not in the config](docs/wiki/decisions/not-in-the-config-not-inferred.md) settled that
the declaration cannot be empty and cannot be filled in by inspecting the target. **Taken
together, those two decisions commit every run to starting from something the caller declared —
which is `L1`'s premise arriving at `L0`'s door.** Neither has reached the code, and that is
deliberate rather than a backlog: `acc check` still runs with no config at all, and the refusal
is [held until a declaration format exists that a config is required to carry](docs/wiki/decisions/require-a-config-never-raise-ownership.md#the-refusal-is-not-being-built-yet-and-what-would-start-it).
**That does not soften this question, it sharpens it.** A premise moves when a project decides
what it is for, not when a line ships, so the boundary is inconsistent with what has been
committed to _now_ — and waiting for the code would be waiting for the very build whose premise
is the thing in doubt. What the levels still separate is how much a declaration is allowed to say
and what a probe is allowed to send, and those are two different axes that the single word
"level" has been carrying at once. My reading is that the split as written is already
inconsistent with the decisions taken this week, and that nobody has noticed because the split is
only ever read against the code, which has not moved. Settling it is a decision page, not an edit
to this one.

The owner's own diagnosis of how the project got here is evidence about the mechanism, not only
about the outcome:

> I think we got stuck on `L0` because we implemented some things and then went past the boundary
> of where it should have been, and then we were finding all sorts of edge cases and CLIs that
> don't work that way, and reinventing `L0`, going back and forth. `L0` was meant to be a quick,
> cheap initial thing before moving to `L1`.

That is visible in the record. `L0` acquired an
[admission test](docs/wiki/concepts/probing.md#what-l0-may-assume--the-admission-test) written
after seven successive attempts to make a spelling inference safe, and the grammar survey then
supplied more edge cases for the same boundary. Each round was locally correct and the sum was a
cheap first step turning into the project.

**What an `L0` is for, if the guidance is the product.** Several readings are available and none is
chosen here: a first-contact triage that costs an adopter nothing; a CI gate that stays cheap once
the real work is done; the subset that needs no declaration and therefore no adoption; or a stage
that stops being a level at all and becomes the part of the guidance a checker happens to reach.
The question is worth asking directly rather than answering by keeping the current shape.

**Whether the 23 rules are the right rules.** They were derived largely from the same repositories
the archaeology later mined, which is a stronger objection than it sounds: on four CLIs across
eight trees, the complete set of rules the kit reported as failing was `D1`, `D2` and `D3` — all
discoverability — while **not one of roughly 40 real CLI-contract defects in those same
repositories was a discoverability defect**. That is not proof the rules are wrong. It is proof
that what the catalogue reports and what actually breaks have, so far, been disjoint. The
catalogue's own recommended additions — output completeness, closed value sets, machine mode on the
parser-error path, termination — came out of that mismatch and are not yet a settled answer to it.

**Whether a hand-authored declaration can be made to hold — which is the risk the whole thesis
rests on.** This charter says the checker gets its power from the declaration the guidance asks
for. The prior-art survey says every hand-authored declaration format drifts from the tool it
describes, and that the artifacts which never drift are the ones the tool emits by loading itself.
Put together, the guidance's central ask — declare your interface and bind it to your code — is
asking adopters to do the thing the entire prior art failed at.

That is a risk to name, not a reason to stop, because the failures are documented and specific
rather than mysterious. Fig accumulated 735 hand-written specs and its CI type-checked the
**documents**; nothing ever probed a binary to ask whether a spec was still true, and the
collection is now abandoned. So the question is not "will this work" but **"what makes our version
different from the ones that died"** — and the candidate answer is the one thing none of them had:
the declaration is bound to code and continuously falsified against the running tool, which is the
checker's job and the reason it stays in the product at all.

What would settle it is not an argument. **An adopter binds a declaration to their code, the tool
drifts from it, and the drift check catches it.** Until that has happened once, this is the
project's central untested assumption, and it should be the first thing anyone tries to falsify.

## How we will know it is working

The owner's test, and it is the one that counts:

> If the CLIs in my own projects genuinely improve and become consistent with each other, this is
> valuable.

Read "consistent" the way the North Star does: not identical, but differing where somebody chose
to differ and knows they did.

That is a criterion, not a sentiment, and it can be checked. The signals that follow from it:

- **The next CLI built after the guidance exists needs fewer of these fixes than the last one did.**
  The archaeology is the baseline; the same method run later is the measurement.
- **A defect class stops recurring across projects.** Six classes recurred independently across two
  repositories. If a class that recurred twice does not recur a third time in a tool built under
  the guidance, that is the propagation this project exists to create.
- **Someone follows the guidance without the checker in the room.** If the guidance is only ever
  applied by people chasing a red line, then the checker is the product after all and this charter
  is wrong.
- **Two of the owner's CLIs are compared through their declarations, and a difference nobody knew
  about turns up.** That is the visibility claim being cashed, and it is the one signal none of the
  existing rules can produce.

And the signal that we have drifted back: **progress being reported in rules written and checkers
implemented, against CLIs that were never going to change.** That is the shape the project was in
when this document was commissioned.

## What this implies elsewhere

Consequences, not edits. Each belongs to someone else and to its own review.

- **[`README.md`](README.md)'s audience line** must be replaced rather than trimmed — see above. Its
  "The problem" section is compatible with this page but narrower, resting on the 15-CLI survey and
  three third-party examples; the archaeology and the recurrence result are the stronger evidence
  and are absent from the front page.
- **[`README.md`](README.md)'s "The approach"** says the project "starts at layer 2, because a rule
  that cannot be mechanically checked does not get to be a rule". That is in direct tension with the
  guidance being primary. Under this charter, guidance that cannot yet be checked is still guidance;
  what a rule earns by being checkable is the right to gate a build, not the right to exist. Whoever
  edits that section decides how to say so.
- **[`docs/roadmap.md`](docs/roadmap.md) orders adoption surfaces last** (item 9), on an argument
  about export formats pinning to the report shape that is sound in its own terms. If the guidance
  is the product, the artifact that carries it to an adopter is not an adoption surface at the end
  of a queue. The dependency arguments in that document are unaffected; its ordering premise is.
- **[`docs/roadmap.md`](docs/roadmap.md)'s "one run per CLI, for a family that shares one
  contract"** is the nearest thing on the page to the visibility surface, and it is not the same
  thing: it intersects **verdicts** across several targets, where the visibility this charter
  describes diffs **declarations**. The first tells a scaffold maintainer which finding is shared;
  the second tells an author that two of their tools answered the same question differently. Both
  may be worth building; neither substitutes for the other. That item also rests its argument on
  the README audience line being withdrawn above, which
  [require a config](docs/wiki/decisions/require-a-config-never-raise-ownership.md) already
  flagged.
- **[`docs/roadmap.md`](docs/roadmap.md)'s "design guidance that is not yet normative"** rules that
  five requirements stay guidance until a checker design exists. That ruling reads differently now:
  it is a description of where most of the product currently lives, not a holding pattern.
- **[`docs/wiki/concepts/probing.md`](docs/wiki/concepts/probing.md)** carries the `L0`/`L1`/`L2`
  definitions the first open question puts in doubt. Nothing there is wrong today and none of it
  should change before that question is settled — but it is the page that changes if it is settled
  either way.
- **[`docs/plans/2026-08-23-clear-the-runway-then-take-off.md`](docs/plans/2026-08-23-clear-the-runway-then-take-off.md)**
  Part 2 is written as `L1`'s opening scope. Its three items are the right items under this charter
  — each is a fact only the target can supply — but they are now the beginning of the declaration
  format rather than the beginning of a probe level.
- **Two measurements this page rests on are not in the tree yet** — the prior-art survey cited in
  "The problem", and the eight-CLI run of 2026-08-24 cited three times above. Both were made for
  this charter. Under this project's own standard — a claim about another tool traces to
  `docs/research/` or a primary source — both belong there before anything else cites them, and
  this page's claims about `dotnet --cli-schema`, `jdx/usage`, `clispec` and Fig, and every number
  attributed to the eight-CLI run, should be read as owing those notes.
- **The word "conformance" is in the project's name and in most of its prose, and it now overshoots
  what the project claims.** Neither thing the declaration buys is conformance to a standard: one
  is visibility across an author's own tools, the other is a tool tested against its own contract.
  Renaming anything is out of scope here and probably not worth the churn — but wherever the prose
  implies a target either conforms or fails, it should read as a recommendation declined or
  followed. [`docs/wiki/SCHEMA.md`](docs/wiki/SCHEMA.md)'s `deviation` field already carries this
  distinction (`defect` against `design-choice`) and is the right place to start.
- **Nothing links here yet.** [`AGENTS.md`](AGENTS.md) is the grounding index and
  [`README.md`](README.md) is the front door; if this page is what everything else is re-tested
  against, both need a line pointing at it.
