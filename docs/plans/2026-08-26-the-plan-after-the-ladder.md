---
type: plan
generated: { by: claude-fable-5, at: 2026-08-26 }
status: stable
lifecycle: live
description:
  The proposed path to a delivery boundary, after the ladder decision and the first cold
  consumer round — what is decided and on what signal, what gets built in what order, the four
  bars "1.0" was shorthand for (stability, friction, completeness, conceptual settledness), the
  exposure-normalized gate for the last, and the three adopters' answers recorded where they
  settled questions and held where they diverged. Its acceptance test is an adopter who never
  speaks to us.
tags: [roadmap, probe-level, adoption, release, consumer-signal, declaration]
---

# The plan after the ladder

**Status: ratified by the owner, 2026-08-27** (_"The plan looks solid to me"_), after two cold
reads, a buildability review, and the cold consumer round. **Amended once post-ratification, at
the owner's direction:** the skill as the third evolved deliverable (§3.9), and §5's contact rule
corrected from _no contact_ to _no real-time back-and-forth_, with the skill's feedback
touchpoint as part of the artifact under test. Written at the owner's direction after
the direction thread
on `acc-internal` (2026-08-26): write up what is decided with its signal, pull the open questions
out **as questions** rather than answering them internally, then take both to the consuming
projects for a stronger signal than this room can produce. Drafted by the author of
[the bounds report](../reports/2026-08-26-the-bounds-and-the-ladder.md); the consumer questions
(§4) are the survey author's and the current-state inventory (§3) is the builder's, merged with
attribution. **Round A of the consumer questions was sent cold and answered by all three
adopters while this plan was in review**; §4 records the questions as sent and what came back.

**This plan proposes; it does not perform.** Nothing here rewrites
[the roadmap](../roadmap.md), [probing](../wiki/concepts/probing.md), or the decision record.
Those edits land after ratification, so the consuming projects review a proposal rather than a
fait accompli.

**Three inputs, and their shared limit.** The evidence base is
[the bounds report](../reports/2026-08-26-the-bounds-and-the-ladder.md),
[the three-adopter survey](../reports/2026-08-26-what-three-adopters-want.md), and the
`acc-internal` direction thread of 2026-08-26. All three are readings by people who talk to each
other daily, and every adopter data point in them was produced with a maintainer answering on a
channel within minutes. The survey warned about exactly this
(`sable`: enthusiasm for pruning is not license to cut what is load-bearing for readers who never
speak to us), and this plan's own acceptance test (§5) exists because of it.

**One naming rule:** `acc` is the tool this
project ships; "the kit" is its checking half; "the reference implementation" is `acc` measured
as a target of its own catalogue. One binary, three roles.

---

## 1. What "1.0" was standing for — four bars, kept separate

The owner's clarification, quoted because it redefines this section:

> I am fine with not sticking to a 1.0.0 unit. Really, what I'm trying to get to — that I am
> perhaps calling 1.0.0 as a shorthand — is a point where we have an initial delivery boundary
> with some conclusion about what is useful to provide to a consuming app, and if we are
> providing that. Basically a point where it feels like we are not reinventing what we are
> delivering conceptually (or in reality).

The number was shorthand for four different bars, and the plan keeps them separate:

| Bar                        | What it claims                                                                                             | Who can check it                              |
| -------------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| **Stability**              | The contract does not move under you                                                                       | Anyone, from a changelog                      |
| **Friction**               | The thing is pleasant to adopt (declaration authoring helped, install boring, report's first screen right) | Nobody, as a gate; everybody, as roadmap work |
| **Completeness**           | No structural surprise on a new consumer's first encounter                                                 | Only a consumer                               |
| **Conceptual settledness** | We have stopped changing our mind about what the thing **is**                                              | Us, and only us                               |

**Settledness and completeness are one variable observed from two desks** — a consumer's
structural surprise is a boundary discovery happening at their desk instead of ours. They stay
two rows because they can disagree in one direction: we can be settled around the wrong concept,
and only a consumer reveals that. That asymmetry is the reason §5's trial exists.

**The version-number gate stays stability-shaped**, amending
[pre-1.0 while the design moves](../wiki/decisions/pre-1-0-while-the-design-moves.md#what-would-change-our-mind),
whose third condition — _"`L1` exists and has not forced `L0` to move"_ — becomes unreachable
the day the ladder dissolves. The proposed replacement is the post-ladder analogue of what that
clause was reaching for:

> **1.0 returns** when the report shape has survived a release without changing, **the
> declaration format and the batch format have survived a release without a breaking change**,
> and the right-hand column has emptied enough that an adopter can automate against the kit
> without reading the changelog first.

**Asked cold, all three adopters said a 1.0 now is premature — for three different reasons, none
shared** (§4): `trellis`, the **unit** is wrong — per-contract promises, not a project stamp
(_"a promise-shaped label over parts with different maturities"_, the ladder's own indictment);
`sable`, fix the exit-contract contradiction first (_"a project whose documents contradict each
other about its exit contract is describing the exact defect class it exists to argue
against"_); `flint`, spend the pre-1.0 window on the premise-change fixes a 1.0 makes expensive.
The stability clause above is already per-contract, which answers `trellis`'s mechanism; the
timing is answered by the gate below.

**The delivery boundary, in the honest tense: this plan proposes the path to it, not the
boundary.** The candidate conclusion the boundary will assert when the gate passes, drawn from
the three answers: **the deliverable is the standard with its evidence, plus the census/drift
loop over declarations; the per-target verdict is instrumentation in their service, not the
product.** None of the three named the checker's verdict as the valuable part; `flint`'s ratio —
three findings from `acc check`, 289 from one census — and `sable`'s ordering claim (§3) are the
measurements behind that sentence.

**The settledness gate, normalized by exposure rather than the calendar.** The owner's
correction, kept in his words: _"I would not specify a time period, as this will be more about
the volume and quality of testing vs a specific frame of time."_ A raw boundary count improves
the moment we stop looking — the advice-induced inversion class pointed at our own gate — so the
measure is **boundaries discovered per unit of testing exposure, against a named list of
unexercised shapes**. Enumerating the shapes is the anti-gaming mechanism, not a to-do list: the
denominator is fixed in advance so silence cannot be read as agreement, which is the census's
own `NOT COMPARED` rule applied to our own gate. The list:

- a **wrapper-fronted** CLI, where the launcher is not the tool;
- **genuine nested subcommands** (`git remote add`-shaped);
- **group commands** — the shape the unminted rule is about;
- **compiled targets** (no interpreter, no shebang) — the interpreted non-JS half is already
  covered by seven `sh` fixtures across five test files and is excluded under the covered-shape
  rule;
- an **emitted-rather-than-modelled declaration**, the direction `SG-8` half-tested.

The list is append-only in one direction — a shape may be added when shown unexercised, never
removed for being expensive — and a trial against an already-covered shape does not count toward
the bar. The operational form: **a round of adopter questions plus a cold read of the front-door
documents produces no new statement about what the project is.**

**Today's reading fails that gate unambiguously.** Nine boundaries on 2026-08-26/27: a recorded
path is an assertion nothing establishes; an explicit `"choices": []` read as silence — a
fraction that moves the wrong way as a tool improves; requiring targets to make `1`–`8` routable
while promising ourselves only a band; the linter's anchors diverging from the renderer's, 19
headings latent; shipped instructions as a larger surface than the CLI; the advice-induced
inversion class — defects that fire only on a tool that took our advice; _"a tool worth running
and a tool worth committing to are different asks, presented as one"_ (`flint`); _"the delivery
unit itself may be wrong"_ (`trellis`); and the README's _"Rust, TypeScript, Go and Python CLIs
are tested identically"_ — true of the design, false of the testing, since no compiled target
exists in the tree. **Boundaries seven and eight arrived from consumers during the settledness
exercise itself**, and the ninth sits in the front door. None is a bug in new code — a
productive day ships many of those, and they say nothing about shape. A project mid-reinvention,
productively, is the opposite of the state the boundary names, and no version number changes it.

**Friction items become roadmap items with named consumers** (§3). A friction clause in the gate
would be the unreachable-condition failure the ladder is being retired for, in a new costume.

---

## 2. Decided, and on what signal

Each item names its signal. None of it is news to this room; the point of the list is that a
consumer can audit it.

1. **Delete the rungs; keep names for boundaries.** Signal: unanimous across three adopters by
   three independent routes; the internal disproof unrefuted; the owner's charter license; the
   pre-1.0 bar met on its own second condition
   ([bounds report §2](../reports/2026-08-26-the-bounds-and-the-ladder.md);
   [survey](../reports/2026-08-26-what-three-adopters-want.md)). The three "keeps" differ —
   stable names in report sentences, `L0` as a bundle name, the blast-radius content — and the
   redesign must satisfy all three, not the intersection.
2. **The decision page gets written** — below-root execution not built, the subject-assertion
   argument, the four-part reopening bar plus operator opt-in — and it carries the one open
   sub-decision: **what the verdict line says instead of `L0`** (§4, question 2). The verdict
   line is decided in the page, not after, because that string propagates into CI logs and
   READMEs the moment it changes. Who decides: **consumers supply the costs and constraints;
   the decision page chooses the string with those answers in hand.** The answers are now in
   (§4), and they constrain without agreeing: `trellis` — drop the badge word (a finding count,
   not a certification; `NO-VIOLATIONS` if a grep-able word must exist); `sable` — if a word
   stays, the establishment count sits adjacent in the same breath, so the line cannot be
   cropped and keep its meaning; `flint` — **deleting the rung must not delete the reach**:
   `CONFORMANT — 0 core violated` silently claims _more_ than `CONFORMANT (L0)` did, and the
   replacement is the reach in words (`root probes only`, `root probes + 17 recorded paths`).
   `flint`'s is the binding constraint — whatever string the page chooses, the reach survives
   in it.
3. **Three items bank with the decision**, none needing the roadmap first: the group-command
   rule (decided strict, unminted, blocked only on "it would be `L1`"); `A4`'s verdict string
   (which told an adopter to wait for a level nobody is building, and they did); the 1.0
   criterion fix above.
4. **`probe_level` retires from the report's applicability logic** in favour of a typed reason
   on `unverified` (`no-probe-sendable` / `nothing-declared` / `evidence-void` /
   `no-instrument`) — the change the wrong-primitives report itself keeps, and the field that
   lets the renderer serve both sides of the reading-tax disagreement (fold the permanent rows,
   keep the honesty). Rule ids and `conformant` do not move.
5. **A catalogue-wide invariant: a partial check never reaches `pass`.** Signal: two adopters
   independently; measured damage (D3's phantom flag steering five rules). Both before-cases are
   vendored, with a provenance difference worth keeping: `magpie.empty-enumeration.json`
   (digest-pinned, adopter-captured — bytes a real tool produced) and
   `denies-the-json-flag-it-lacks.ts` (kit-authored, single-variable control recorded in the
   file — weaker evidence and adequate, because the defect is in our reader, not in any tool's
   behaviour). The defect itself sits in `parseHelp`, one function below D3, feeding
   `machineSelector` — so the fixture is ready and **the sweep is the work**: five rules read
   the shared premise, and the before/after must cover all five. Vendoring it also surfaced a
   third member of the advice-induced inversion class: the contamination reaches `A3` only on a
   tool that declared `defaultOutput` and still has a prose error path — both things the
   project's own guidance instructs. Enforced as a lint binding, the way G1's signal taxonomy
   already is.
6. **The roadmap is rewritten from the evidence documents, not reordered.** Its ordering premise
   was withdrawn by the charter; its spine still climbs toward L1/L2; the items with named
   consumers today are not its numbered steps. The rewrite is drafted with citations and
   cold-read before landing — this project's theory-first designs have been reversed twice.
7. **The sandbox stops being an assumed step.** The strongest consumer view is "never build it";
   nothing measured argues the other way; the bounds report reframes it as a containment
   question on its own merits. Status: the sandbox is **undecided and unscheduled** — no work is
   proposed anywhere in this plan, and nothing here forecloses proposing it when a consumer
   arrives. What is decided is only that it is no longer assumed.
8. **Exit codes: the band is the promise, and the guide is the text that moves.** Signal:
   unanimous in §4 — nothing any adopter wrote branches beyond zero versus non-zero; `flint`'s
   reason adopted (diagnostic detail belongs in the JSON's `kind`, a contract extendable without
   breaking a gate — not in a one-byte channel a CI gate is simultaneously branching on);
   `sable`'s symmetry recorded (a contract in two places agreeing in neither is our own C2
   defect, in our repository). Alongside the band, one promise we already hold becomes written:
   **census disagreements never move the exit code** — measured (three disagreements, exit `9`
   unmoved), with the builder's caveat that its test must assert the diff _ran_ before asserting
   the code held still. The guide's verification step narrows to `0`/`9`; that edit is the
   builder's, post-ratification.

## 3. Proposed build order, to be costed

Ordered by what unblocks what; buildability review done, with two items resized by it. One
ordering claim from the answers, recorded for the costing: `sable` — **everything that widens
the census beats everything that lengthens the catalogue, and it is not close** (15 of 23 rules
identical on eight targets; the archaeology's 1-in-7 hit rate); their order is probe-plan
(shipped), below-root coverage of the rules that exist, then the standard. `flint` adds the
subtraction: stop polishing the `L0` report's presentation. Item 4 survives that test only where
it serves the census — which is how it is scoped.

1. The decision page + the three banked items + the verdict-line wording (one unit — see §2.2).
2. Two steps, deliberately split because they differ by an order of magnitude and a consumer
   must ratify the right one. **2a:** the typed `unverified` reason and the `LEVEL_RANK`
   retirement — one source file and three documents, an afternoon. **2b:** retiring the
   `probe_level` **field** itself — 34 files in `src/`, 23 rule-page frontmatters, and the lint
   that binds page to checker verbatim in both directions, all landing in one commit or the
   gate is red in between. The decision implies 2b (a field carrying level vocabulary with no
   consumer contradicts it); the plan proposes 2a immediately and 2b as its own scheduled item,
   not a rider — and scheduled is not optional: 2b's timing is open, its outcome is not. `probing.md`'s table becomes the two axes in 2a (the admission test stays).
3. The never-pass-on-partial invariant as a lint, proven on the D3 five-rule sweep and the
   empty-enumeration fixture — **together with the third-enumeration-state premise fix**
   (`"choices": []` as "we looked and it said none", across the surface reader, the census
   sentences and the declaration diff). `flint`'s answer names these two as exactly the changes
   a 1.0 makes expensive, which is the argument for doing both inside the pre-1.0 window while
   a breaking change still costs a minor.
4. The report surface the adopters asked for: census and deltas above the fold; the honest
   denominator — 23 rules, of which 19 can return a verdict **against an undeclared target**
   (`A4`, `B3` and `B4` have no runnable check; `B5` waits on a declaration), which is
   `STANDARD.md`'s own count. A second, coincidental 19 exists — 20 core minus the 1 core
   unverified on `acc`'s own run — and it is a different derivation over a different
   denominator; the two agreeing is arithmetic accident, not corroboration;
   permanent-unverified behind a flag.
5. **Fleet declaration diffing** — the highest-value in-bounds unbuilt thing, the owner's
   original complaint, one named consumer with eight tools waiting. **Costed as a new engine,
   not a flag on `acc compare`**: today's `compare` keys on probe observations and the census
   diffs one declaration against one target's surface — neither is N declarations against each
   other. Design pass first — and deliberately absent from Round A (no §4 question raises it),
   with consumers asked to want it only once the design pass has produced a shape worth
   reacting to, because its open
   questions are real: what counts as a disagreement between two declarations, whether a
   missing path is a difference or an absence, and what the output is when eight tools disagree
   three ways.
6. **Declaration-authoring help** — reshaped by the answers, which diverge three ways and then
   reconcile. `trellis`: do not build it — the transcription discipline is _why_ their result
   was understated-never-misstated, and a generator modelling from help imports an extractor's
   reading bugs at authoring time. `sable`: hand-writing was fine, the friction was **knowing
   what to write** — wants `acc declaration init <target>` (derive the visible skeleton, mark
   every unknown field explicitly unknown) and **more fixtures**, a worked example having
   resolved the shape faster than the field table. `flint`: hand-writing was the bottleneck and
   the reason the census is out of a stranger's reach — and supplies the reconciliation:
   **the remediation the census recommends is the same work that makes a declaration
   emittable** (one table driving parser, help and `choices` makes the declaration a
   serialisation of it), so a tool that cannot emit its surface is usually a tool whose surface
   is not derived from one place — the defect the census exists to find. The unanimous floor,
   now consumer-ratified rather than merely ours: **never generate a conformance document beside
   real dispatch structures** (`sable`: Fig with our name on it, and check-time derivation is
   out — _"a document that cannot be wrong is not a declaration"_; `flint` supplies the inside
   cost and asks for the argument in the standard, because the argument is stronger than the
   prohibition). Design pass first, with `sable`'s init-plus-explicit-unknowns as the leading
   candidate, `trellis`'s extractor-bug warning as its bound, and `flint`'s emitter argument at
   the top of the census guide.
7. The two one-paragraph boundary statements the project owes its charter and standard:
   consistency-is-not-correctness, and shipped-instructions-are-the-larger-surface.
8. **The registry pattern, written up as a consolidation spec — scheduled ahead of items 4–7
   despite its number, because it is the one artifact whose value expires.** `flint`'s
   reconciliation (item 6) is a specification: one registry per tool driving the parser, the
   help text, the rejection's `choices`, and the declaration yields — from a single structural
   decision — no flag-scope drift, enumerating rejections, an emitted declaration, and a census
   that ratchets. `grapevine` is the worked example that exists; `magpie` is the measured cost
   of its absence (289). `sable` asked for the artifact independently ("a worked example
   resolved the shape faster than a table did"). Written before the owner's Spellbook
   consolidation (§6) it shapes seven tools; written after, it documents what someone already
   decided. **Shipped while this plan was in final review**
   ([the guide](../wiki/guides/how-to-derive-your-surface-from-one-registry.md), grounded in
   grapevine's real code with both measured traps recorded, ending in the
   `schema | acc check --declaration -` ratchet) — the item stays listed because Round B readers
   should see what was prioritized and why, and its status is: done.
9. **The skill — the third evolved deliverable, added by the owner post-ratification.** A Claude
   Marketplace / `.agent` skill as the _"okay, you're going to use this to start the process"_
   artifact: what this is, how to run it, how to read the verdict, which guide to go to next,
   and how to send feedback — the toolkit's three evolved surfaces being the tooling, the
   documentation, and this. It is the attempt to make **acc-the-agent into an artifact**: the
   briefing a maintainer gave the newest adopter on a channel, packaged so nobody has to give
   it — which is the direct answer to `trellis`'s scaling finding. **v1 is minimal by design,
   and the minimalism is the instrument** (the owner: _"don't add information that isn't
   actually needed"_): every gap the adopter hits is a measurement of what the skill must
   contain — the fixed-denominator argument applied to the artifact. v1 **routes to** the guides
   rather than containing them; three of the four answers the newest adopter needed a maintainer
   for are already in guides the skill links. It also carries the feedback touchpoint §5's
   amended contact rule depends on. Drafted by the survey author, who holds the empirical record
   of what a first contact actually needed.

**Deliberately absent:** the warrant/reach/hazard schema (untested; its measured fragments
already ship), the sandbox (§2.7), kit-side below-root execution (settled, with a written
reopening bar), and per-record hazard warnings in probe plans (waits for an operator to ask —
a warning added because a document called for it is not evidence anyone reads warnings).

### Current-state inventory

**Supplied by the builder (sextant, `acc-internal` message 38), merged whole.** Measured on
2026-08-26 at `0a9677d`, by running the tool against itself — recorded because this room was
wrong twice in one day about what the tree holds.

**Eight commands ship**, with their declared effects:

```
rules  show  path  tags  schema        read_only
compare                                read_only
probe-plan                             idempotent      <- the only command that writes
check                                  non_idempotent  <- the only command that spawns
```

**23 rules**, 20 core and 3 diagnostic; 20 at `L0`, 3 at `L1`. **22 checkers on disk**, so one
rule is catalogued without one.

**Every one of the 23 declares a coverage gap.** That is the honest state of the catalogue and
it is not a defect: a gap is a rule saying what its checker does not establish. It does mean any
claim of the form "the kit checks X" is, for all 23, "the kit checks part of X and says which
part".

**The reference implementation passes its own catalogue, and does not pass it completely:**

```
CONFORMANT (L0) — 0 core violated, 1 core unverified, 16 core partially covered
```

**16 of 20 core rules are partially covered against the tool we control most.** `acc` is the
positive control, so this is close to the ceiling of what an `L0` run establishes about
anything — not a statement about `acc`'s quality.

**"Partially covered" is not the same as a partial check.** Coverage is a rule page's declared,
permanent scope: `partial` names its gaps in advance, and a `pass` claims only that nothing
inside that scope was violated. §2.5's invariant forbids a **run** claiming more than it
established. `acc`'s `CONFORMANT (L0)` therefore survives the invariant; a pass built on a
phantom premise does not.

**Two rules report `UNVR` on that run** — unverifiable rather than failing, on a target built to
satisfy them. One is core (`B5`) and one diagnostic (`A6`), which is why the verdict line reads
`1 core unverified`.

**45 test files, 1645 tests.** What they cover well: parsing, the report algebra, the
recorded-surface reader, the harness generator across three git topologies and four shell
shapes. **What they do not cover**, in the plan's own terms:

- **No test varies the `awk` implementation.** The byte encoder is verified across four by an
  adopter's measurement
  ([research](../research/2026-08-26-the-byte-encoder-across-awk-implementations.md)) and by
  nothing in CI.
- **No test runs a shipped instruction.** The guides tell adopters to run commands; a wrong one
  fails an adopter, not the gate. One published example was unloadable for an unknown period and
  was found by a writer copying it, not by a test.
- **`probe-plan`'s two new error kinds** (`conflict`, `permission`) had no test provoking them
  until today, in a project whose `exit-codes.ts` requires exactly that.

**Half-built, in the sense of shipped-but-not-finished:**

- **Recorded surfaces** read below the root and reach no verdict, by design — but a batch cannot
  establish a recorded path exists, so the census numerator is inflatable in good faith.
- **The empty-enumeration collapse:** an explicit `"choices": []` reads as silence, and the
  parenthetical then asserts the opposite of the truth. Fixture vendored; fix deliberately not
  attempted, because it is a premise change across three subsystems.
- **`acc probe-plan`** ships the generator and nothing runs the harness — by design, and the
  boundary is load-bearing rather than a gap.

**What this inventory is not**, in the builder's own words: it says what the tree holds, not
what an adopter can do with it — every number above was produced by someone who wrote part of
it. That gap is what §5's trial exists to measure, and no inventory can substitute for it.

---

## 4. The consumer questions — sent cold, and what came back

**The protocol, a constraint on us rather than on them, in two rounds.** The property the
questions needed was not _cold_ — the recipients are three adopters fluent in the tool — but
**uncontaminated: answerable without having read our reasoning.** Round A therefore went out
before this plan was ratified, with no plan attached, after its own texts were twice cold-read
(the questions themselves failed the first read, and were repaired). Round B — this plan, plus
_"does this match what you told us, and where does it not?"_ — is gated on ratification, because
Round B _is_ the plan; a mismatch between what they said cold and what we proposed is a finding,
where agreement reached after reading the proposal would not be.

**As sent, 2026-08-27, identical to all three** (`standard-grapevine`, `standard-anthill` 14,
`acc-magpie` 74), abridged to the six questions:

> **1. The recommendation test.** A colleague on another team asks whether they should adopt
> `acc` — the conformance checker and the standard behind it. What would you tell them, and what
> would you attach a warning about? "Nothing, I would recommend it as it stands" and "I would
> not recommend it yet" are both real answers.
>
> **2. Are we working on the wrong things?** What should we be building that we are not? And
> what are we spending effort on that does not matter to you? If the honest answer is "your
> priorities are wrong", that is the single most useful thing you could tell us — it is also the
> answer we are least equipped to reach on our own, because the three of us agree with each
> other too much.
>
> **3. The verdict line, and the ladder behind it.** We have decided to remove the
> `L0`/`L1`/`L2` probe-level ladder. If you think that is a mistake, say so — nothing has
> shipped, and reversing it costs us a paragraph. Separately: the verdict line reads
> `CONFORMANT (L0) — 0 core violated …` and is the string most likely to end up in a CI log or
> a README. What should it say? "It does not matter to me" is a real answer.
>
> **4. Exit codes.** Does anything you have written branch on the kit's exit code beyond `0`
> and `9`? And what should we promise: the specific code for a given input class, only the band
> (`0` conformant, `9` not, `1`–`8` the kit itself failing), or something neither describes?
> One fact you should have first: our own texts disagree today.
>
> **5. The declaration.** You wrote one by hand. What would you have wanted instead? Anything
> is on the table, including that it should not exist, or should be derived at check time, or
> that hand-writing it was fine. Separately and independently: should the kit ever generate a
> conformance document that sits beside your real dispatch structures? We currently hold that
> it must not.
>
> **6. One sentence to a colleague.** If you described this to someone in a single sentence,
> what would it be? And what is the sentence that would make them decide it is not worth an
> afternoon?

**What came back** — all three answered the same day (`trellis` relayed at `acc-internal` 62;
`sable` at `standard-anthill` 15; `flint` at `acc-magpie` 75, both worth reading whole):

- **Q1 — recommend, with warnings, and the warnings agree.** All three would recommend; every
  warning converges on the shallow default. `sable`: read `STANDARD.md` first, run the census
  second, run `acc check` alone last or not at all — the default invocation is the least
  informative thing in the box. `flint`: run it today (ten minutes, two or three real findings),
  but _adopting_ is a different ask than _running_ — boundary seven, and the guides present the
  two as one. This is the completeness bar answered: not yet, with the gap list named.
- **Q2 — yes, partly, three ways.** `sable`'s ordering claim (§3 intro); `flint`'s declaration
  bottleneck (§3.6); `trellis`'s unit challenge (§1). The question the second cold read added
  produced, on its first outing, exactly the input §6 names as most plan-changing.
- **Q3 — removal confirmed by all three, no reversal sought; the verdict line constrained three
  ways** (§2.2), with `flint`'s reach-must-survive as the binding constraint.
- **Q4 — band only, unanimous, with the guide as the text that moves** (§2.8).
- **Q5 — the three-way divergence and its reconciliation** (§3.6). The never-generate constraint
  came back unanimously ratified, twice independently re-derived before we disclosed holding it.
- **Q6 — the messaging material.** `flint`'s pitch: _"It drives your CLI the way an agent would,
  and tells you — with the evidence attached — where your tool tells the truth, where it does
  not, and where the kit could not tell."_ `sable`'s losing sentence: _"It is a conformance
  kit"_ — a certification promised, a narrow careful partial check delivered, and the gap is
  where a stranger decides we oversell (the charter's own naming concern, returned as consumer
  evidence). `flint`'s killing sentence, true today: _"the half that finds the serious bugs
  needs a declaration you write by hand, and the half that runs in ten minutes only looks at
  your root command"_ — close that and the pitch has no second half, which is §3's items 5 and
  6 stated as marketing.

**Questions that are ours, not theirs, and stay here:** which primitives or ontology the report
uses internally; what `read_only` would mean (no field until a consumer arrives with a testable
contract); whether kit-side below-root execution reopens (evidence arrives through the workflow
question or not at all).

---

## 5. The acceptance test: an adopter who never speaks to us

The owner's bar for 1.0 — _"a new consumer can be brought in and feel like they're getting
value … we shouldn't be getting wholesale new feedback on large gaps"_ — **is a pass condition
for an experiment, not a description of a release**, and it is the experiment no trial has run:
every adopter so far had a maintainer answering within minutes, so a gap in the artifacts gets
closed in the channel before it is ever recorded as a gap.

So the consumer round (§4) and this trial answer different halves of that sentence, and the plan
needs both:

- **The consumer round** asks people who have been in these channels for months: _is this
  wanted?_ It cannot say whether it is deliverable without us.
- **The artifacts-alone trial** runs one adopter through a pinned tree with the documents alone
  and no maintainer reachable: _is it deliverable without us?_ **The builder prepares what the
  adopter receives and does not communicate with them at all** — not on a channel, not through
  an intermediary, and not by answering a question relayed by someone else. The person who wrote
  the harness and the guide is the worst possible source of clarification for a reader whose
  confusion is the measurement.
- **The trial's subject is a fourth adopter, recruited for it — not one of the three.** The
  owner's bar is about a **new** consumer's first encounter, and the eligible population among
  the current adopters is zero and has been for weeks — all three have had a maintainer
  answering within minutes, and holding one back from §4 would buy a reader who is quieter, not
  fresher: a contaminated experiment presented as a clean one. So the §4 rounds spend nothing
  the trial needs, and go to all three. Recruiting is also cheaper than it first looks — the
  newest adopter _was_ exactly this at the start of their trial (a fresh agent, given the
  guides and nothing else), and the move is repeatable. Three constraints bind the trial, owned
  by the fixture builder: the fourth gets the artifacts and **no real-time back-and-forth with
  us** — _amended post-ratification at the owner's direction_: the skill (§3.9) carries an
  async, defined feedback touchpoint that is **part of the artifact under test**, so using it is
  data about where the artifact stops, and being visibly stuck without using it is a finding
  about the touchpoint rather than about the adopter — what the rule forbids is the live channel
  the record shows we cannot help ourselves on; what counts as stuck is pinned in writing before
  they start; and they read **a pinned commit, not `develop`**, or every fix landed mid-trial
  makes the result unattributable. With the skill in the fixture, the acceptance question
  sharpens from _"can they survive the docs alone"_ to **"does the skill do what the maintainer
  did"** — a more specific question with a fixable answer. The retro afterward pre-registers its
  two failure classes before the run — **a gap in understanding how to use the tool** versus
  **the tooling not working in their scenario** — with the evidence that separates them decided
  in advance, because a retro run by the people whose artifact is under test will find "they
  misunderstood" more comfortable than "our tooling did not work". One standing
  protection on the reserved population: **anyone
  needing a fresh reader for review work uses a throwaway in-session subagent — never a named
  Spellbook agent**, because a named fresh agent is exactly the trial's candidate pool, and
  briefing one on our reasoning spends a fourth adopter on a proofread.
- **Pre-registered before it starts, in writing: what counts as the adopter being stuck.**
  Otherwise the first silence gets read as "the docs work" or "they gave up", whichever we
  already believed. Same discipline as `SG-8` and `DT-11`, applied to ourselves.

The trial is this plan's acceptance test. A plan the trial fails is a plan that gets revised,
not defended.

---

## 6. Sequence from here

Where this stands: drafted, twice cold-read with all findings applied, buildability-reviewed
with two items resized, and **Round A sent cold and answered by all three adopters** — this
revision records the answers.

**One external constraint, arrived after the second cold read: the owner's Spellbook CLI
consolidation is starting, and it has been waiting on us.** Two consequences, stated so neither
is decided by accident:

- **Nothing not-ready blocks the consolidation, and the plan says so plainly rather than let a
  team stay held.** All three adopters said the standard is adoptable on its own evidence,
  independent of the checker; the parts that are not ready — the headline word, the
  declaration-authoring path — are not parts a consolidation waits on. What the consolidation
  most wants from us is §3's item 8, the registry pattern, whose value expires when the
  consolidation decides without it.
- **The test population is not stable, and it is smaller than it looks.** All seven Spellbook
  CLIs are flat verb dispatchers; four are already exercised, and by §1's own covered-shape rule
  most further Spellbook trials would not count toward the settledness bar. Two
  pre-consolidation rounds, time-boxed by the other team's schedule rather than ours:
  `astrolabe` (the one sibling whose below-root rejections name nothing — a distinct shape,
  counts toward the bar) and one of `glamour`/`imago` (a covered-shape replication — worth
  running for confidence, not counted). After the consolidation there is one shape where there
  were seven. §5's fourth adopter gets easier, not harder — a consolidation is exactly when a
  fresh agent arrives needing the guides — and the reserved-population rule holds.

What remains:

1. The survey author's final pass over the merged whole; the owner reviews and the room
   ratifies.
2. **Round B** goes to the three adopter channels: this plan, plus _"does this match what you
   told us, and where does it not?"_ A mismatch is a finding.
3. The artifacts-alone trial is prepared in parallel (fixture, stuck-criteria pre-registration,
   pinned commit) — **its subject recruited, not drawn from the three adopters** (§5). **When it
   runs is the owner's open sequencing question, carried here rather than answered:** against a
   pinned commit of today's tree (measuring what a stranger actually meets now — the honest
   baseline) or after the §3 items land (measuring the proposed shape). The trial protocol is
   drafted only once this is decided, because what the fourth adopter receives depends on it.
4. Then: the roadmap rewrite, the decision page, and the banked items land as §2–§3 describe,
   revised by whatever Round B and the trial said — and the two premise-change fixes (§3.3)
   land inside the pre-1.0 window, per `flint`'s argument.

**What would change this plan:** a Round B mismatch with what the adopters said cold (that is
what the two-round design is for); the trial finding the artifacts alone do not deliver (then
the gap it names outranks everything in §3); or the settledness gate staying failed across the
named-shape exposures of §1 (then the delivery boundary recedes, and saying so beats shipping
past it).
