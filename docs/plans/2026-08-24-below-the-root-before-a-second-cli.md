---
type: plan
generated: { by: claude-opus-5, at: 2026-08-25 }
status: draft
lifecycle: live
description:
  What has to land before this standard is applied to a second CLI. The census only ever compares
  the root, and lifting that ceiling was thought to run through a chain — probe below the root,
  which needs a read-only claim, which the declaration format has nowhere to put. Revised on the
  first consumer's review: the chain gates the probe, not the census, because the differ is pure and
  a caller can record surfaces itself. Revised again on an outside read: the probe warrant is not
  built and `effects` is not added, because a subject's self-description is evidence to test rather
  than an execution-safety boundary — the kit generates a probe plan and the operator runs it.
tags: [declaration, probe-level, adoption, safety, remediation]
---

# Below the root, before a second CLI

[The first outside application](../reports/2026-08-24-first-outside-application-grapevine.md) put
`STANDARD.md` in the hands of somebody who did not write it. It worked: three deliberate one-place
breaks, three caught, correct finding kind each time, on a tool the implementer had reshaped so
that one registry feeds parser, dispatcher, rejection and emitter. It also produced the fourth
scenario — a break one level down, **not caught**, exactly as the documented ceiling says.

This plan is the work between that session and a second one. It exists because of a single
measurement in that report, and everything below is downstream of it.

## The spine: the census only ever compares the root

Four targets, four denominators:

| Target                       | Declared command paths | Compared | Why                                                                                                          |
| ---------------------------- | ---------------------: | -------: | ------------------------------------------------------------------------------------------------------------ |
| grapevine (`emitted`)        |                     33 |        1 | The only known target where a declared root slot and a root that enumerates meet                             |
| anthill v2.3.0 (manifest)    |                     25 |        1 | The root enumerates; the manifest has no root slot, so the one comparable path is the one it cannot speak to |
| bounty (`modelled`)          |                      4 |        0 | The root consumes an unknown flag as a verb with a signpost, so it never enumerates where the kit looks      |
| `acc`'s own CLI (`modelled`) |                      4 |        0 | `did not enumerate at the root — the only path probed; 7 rejections read, none named a set`                  |

**Provenance of those numbers.** anthill's `1 of 25` is gated by a test in this tree
(`declaration.test.ts`, _"the honest denominator: 1 of 25 paths compared, and the other 24 say
why"_). `acc`'s `0 of 4` was measured against this checkout while writing this plan, with a
four-command modelled declaration and no root entry. grapevine's and bounty's are **reported and
not verified here** — that tree is not reachable, and see [item 3](#3-regression-fixtures-from-the-first-application),
which is about exactly that.

The declared command tree is precisely what nothing probes. A second application would reproduce
this table with a fifth row and learn nothing the fourth row did not already say.

### Probing below the root is blocked by a chain, and the chain is one thing

1. **Probe below the root.** `PathSurface` in
   [`declaration.ts`](../../src/acc/kit/declaration.ts) produces exactly one member, `path: []`,
   because `captureSurface` reads root-level rejections only. Every other declared path is reported
   as not compared, with the kit named as the reason.
2. **Which needs a claim about which commands are read-only.** A below-root probe is not a help
   path. `mycli send --acc-probe-xyzzy-flag` is a bet that the parser refuses the flag before the
   verb runs — and a lenient parser that ignores the unknown flag and executes the verb is the
   exact `A1` violation the probe exists to find, so the targets most worth probing are the ones
   where the bet loses.
3. **Which the format has nowhere to put.** Declaration v0 refuses any key it does not define,
   anywhere in the document. There is no slot for an effects claim **even as an unverified one the
   kit records and lets gate nothing**, which is what both design sketches and `STANDARD.md` say to
   do with it.

**The hazard is measured, not hypothetical.** From
[the defect archaeology](../research/2026-08-15-defect-archaeology.md): `bounty close --help`
**closed the board**, `state --help` dumped it, `tail --help` opened a stream that never exited.
`classifyInertness` in [`inert.ts`](../../src/acc/kit/inert.ts) refuses that argv shape today —
`help-path` classifies only when _every_ token is a help or format token, so `mycli deploy --help`
does not classify and will not run — and it is right to.

**The chain has since been cut twice, at two different links, and both cuts survive in this
document.** The consumer's amendment cut it at the first link: a below-root **census** does not need
the kit to probe at all. An outside read then cut it at the second: the kit is not going to execute
below the root on a claim the target makes about itself, so link 2 has nothing to lead to and link 3
is not worth building. What remains of the chain is a correct account of why _the kit executing a
subcommand_ was blocked — kept because it is the reasoning the two amendments act on, not because
anything downstream of it is still scheduled.

### The chain gates the probe, not the census — which is the consumer's amendment

That chain is correct about **the kit executing a subcommand**. It is wrong as a gate on **a
below-root census**, and the plan's own [item 3](#3-regression-fixtures-from-the-first-application)
already said why without following it through: `diffDeclaration` is pure, so a recorded observation
serves as well as a live probe.

The consumer who did the first outside application
([review on `standard-grapevine`, message 28](../reports/2026-08-24-first-outside-application-grapevine.md))
read this plan at `f2bdeee` and returned the amendment: **an adopter can run their own tool, at
whatever paths they choose, and hand the kit the recorded surfaces.** That is their machine and
their right, their tests already spawn the binary, and the kit executes nothing. It needs no effects
claim, no warrant, no safety decision — so it is [item 2a](#2a-recorded-surface-ingestion), it lands
before the decision page, and the chain above keeps gating only what it should have been gating all
along.

**Verified before restructuring.** `diffDeclaration` in
[`declaration.ts`](../../src/acc/kit/declaration.ts) takes `(declaration, evidence: readonly
PathSurface[])`, reads no filesystem and spawns nothing — its own comment says _"PURE, exactly as a
checker's `check` is"_ — and [`report.ts`](../../src/acc/kit/report.ts) supplies exactly one member,
`[{ path: [], surface }]`, built from a root-only `captureSurface`. The differ is already
multi-path; only its caller is single-path.

**What it buys, and it is the reason this reordering is worth doing.** The `SG-8` prediction —
roughly 18 of 22 `accepted-not-declared` for bounty's `state`, pre-registered before the instrument
to test it existed, at a denominator corrected before any diff ran — becomes runnable **now** rather
than after the safety decision. The decision
page is then written by people who have read below-root census output instead of reasoning about it.

**The trust question, raised and answered by the same reviewer.** Caller-recorded evidence can only
ever be evidence: the census binds nothing, mints no id and feeds no verdict, and a caller who
fabricates a surface is lying to a tool that renders both readings and no verdict — they gain a
sentence, not a pass. The one requirement it does impose is on the report: **it must say who
recorded what.**

---

## Where this revision came from

**One outside read, on a reframing question.** The question put to a non-Claude model was not _which
warrant shape is safe_ but **is the probe warrant a problem anyone actually has**. Its answer —
accepted by the repo owner and carried below — is: do not build the warrant, do not add `effects`
even as an inert field, and generate a probe plan for the operator instead. The response is
untracked working material in `.scratch/`, so nothing here cites it as a source; its arguments are
restated below and stand or fall on their own.

**Two things about that provenance, said rather than left implicit.**

- **It is one read, and its central claim is an argument rather than a measurement.** Nothing was
  run to produce it. What it did was point at the subject–assertion relation the plan had stopped
  looking at, which is the kind of thing an argument can settle and a measurement usually cannot —
  but it is still one model's reasoning, adopted because the reasoning holds up, not because of
  where it came from.
- **The same technique had just reversed the truncation design**, one round earlier. Two reversals
  in two rounds is a run, not a method; it is exactly the point at which a technique starts getting
  believed instead of read. Recorded here so that the third one gets argued with.

**It worked from a brief, not from this tree.** It could not open the reader, `spec.ts`, or the
fixtures, so its claims about this project are only as good as the brief was. Where it was wrong
about this project, this plan says so in place rather than importing it — the framing of who is left
without a warrant was wrong _in the plan_, and is corrected in
[item 2](#2-a-probe-warrant-below-the-root) rather than deleted.

---

## The decision, and it is now a decision not to build

**Probing below the root would be the first time `acc check` executed a subcommand on a target's
say-so.** Everything the kit does today is a help path, a version request, or a deliberately
malformed argv that fails at parse. That is a step change in what this tool does to a machine, and
it is not a step inside an implementation item. It still gets **its own decision page** in
[`../wiki/`](../wiki/SCHEMA.md) — but the page now records a decision **not** to build, plus what
would reopen it, rather than a list of questions to settle before building.

**The central correction: the subject of the check is the source of the safety assertion.** The
warrant asks the checker to execute a subcommand on a safety claim made by the binary being checked
— the same binary whose declaration may be wrong, which is the entire reason the census exists.
Provenance establishes **who** asserted; it never establishes that the assertion is **true**.
`emitted` rules out human transcription error and does nothing whatever about a buggy or hostile
tool. This plan treated the narrowing-versus-widening asymmetry as though it settled safety. It does
not: it is a rule about **documents**, and the question here is about **execution**. A conformance
subject's self-description is evidence to test; it is not an execution-safety boundary.

**Ownership was the wrong distinction, and it dissolves the "who is left" question.** Anyone who can
let `acc` execute a local binary can execute that binary themselves and record what came back. The
warrant creates access for nobody. What it does is **transfer the choice of invocation from the
operator to the checker** — which is a transfer of authority, not an unlocking of capability, and it
is a transfer in the wrong direction.

**That argument stopped being reasoning when the adopter answered it from their own position.** They
accept the reversal without reservation, and report: _"I shipped full below-root coverage yesterday
with zero warrant machinery, because the operator who could grant the warrant could always just run
the tool. The warrant moved invocation choice, not access."_ One person has now done the thing the
warrant was for, without the warrant, and says which half of it was load-bearing.

**Command-level effects are the wrong abstraction for warranting execution**, and this plan already
half-knew it. Safety belongs to an exact invocation, in a particular environment, under a threat
model. `read_only` addresses none of: termination, network access, credential use, data disclosure,
process creation, UI launches, resource consumption, API charges, audit-visible activity. The plan
names `output_kind` as a second axis and a third hazard class found by accident, and files both as
refinements — they are better read as evidence that the abstraction is wrong, because adding a
category per hazard as each one appears is the clause-by-clause churn this whole project exists to
argue against.

**The hazards that make it concrete, kept as they were measured.** The worked example is the
adopter's own tool, kept at their explicit request and sharpened with a hazard class they supplied
that neither axis names. **Three classes, one tool:** `close` deletes the message log, `reset`
clears it, `reap` kills daemons — _destroys your state_; `tail` and `wait` are read-only and
unbounded — _never terminates_; and `watch` is read-only with respect to its own state and **acts on
the operator's machine** by opening a browser — _causes something over there_. A wrong `read_only`
on any of the first class costs somebody their data, and the kit's report would say a probe ran and
nothing else. `read_only` already has two plausible meanings — no mutation of the tool's own state,
versus no externally visible effect — and `watch` is precisely where the two come apart.

**The real questions were never "which warrant shape".** They are **who authorizes execution** and
**what contains the consequences when the target is wrong**. The first is answered by the operator,
not by the subject. The second requires an actual execution boundary —
[roadmap step 3](../roadmap.md#3-control-the-observation-environment-which-is-also-the-l0-safety-work)'s
sandbox, unbuilt and undecided as to which sandbox, on which platforms, and what the kit does where
it has none — not another declaration field. That page already says the answer must not be _"probe
anyway, quietly"_, and that sentence binds here.

### What the decision page records, and what would reopen it

The page states the decision not to build, the argument above, and the evidence that would change
it. **All four, not any one:**

- **Named users** who require unattended, third-party, below-root probing — a CI operator, a
  standards body, a package evaluator — and who say so, rather than a role someone can imagine.
- **Demonstrated failures of the recording workflow that probe-plan generation cannot solve.** If
  the operator-runs-it route is merely tedious, that is an argument for making it cheaper, which is
  [item 2b](#2b-probe-plan-generation).
- **A defined platform and threat model.** Which machines, against which adversary.
- **A containment mechanism** that actually enforces limits on filesystem writes, network access,
  process creation, UI launches, time and output.

**And containment alone would still not be enough**, which is the outside read's point and belongs
on the page: containment reduces consequences, it does not grant authorization. Even with a sandbox,
an operator-authored policy or an explicit opt-in would be required, because the tool being checked
cannot consent on the operator's behalf.

### A rejected alternative: the dedicated conformance endpoint

**The proposal.** A narrowly specified endpoint the tool implements to return rejection evidence
directly, without the kit dispatching ordinary subcommands. It was raised by the outside read as a
possible future design, and its appeal is real: it moves the contract away from guessing whether
`send --badflag` reaches application behaviour at all, and it avoids the specific defect that killed
the warrant — treating a semantic label such as `read_only` as **permission to exercise general
command paths**.

**Rejected, by the adopter it would be pitched to.** Their argument, and it is the stronger one: a
dedicated endpoint is the tool testifying about itself down a **second code path** — evidence
generated _beside_ the behaviour instead of _by_ it, which is the anthill manifest failure with
better intentions. The dilemma has no third horn. Either the endpoint routes the same parser
invocation a real caller hits, in which case it is running the tool with extra steps; or it does
not, in which case its evidence needs exactly the validation the endpoint existed to avoid. **The
reason a rejection is worth anything is that it came from the path a real caller reaches.** They
would decline to implement one for grapevine.

Recorded here as a named rejected alternative with its reason attached, not as a live direction, so
that the next person to reach for it inherits the objection rather than the idea.

**What this unblocks.** Items 2a, 2b, 3, 4 and 5 below are unblocked by this decision. Items 1 and 2
are **not scheduled at all** — the decision removes them rather than gating them.

---

## The items

### 1. An `effects` field in the declaration format — decided, then withdrawn

**Not to be built. This item was decided, with the consumer, and then withdrawn when the premise it
rested on was removed.** The premise was that a warrant would read the field
([item 2](#2-a-probe-warrant-below-the-root)); with the warrant not being built, an `effects` field
in the declaration format has **no consumer**, and the work below is **no longer needed**. The
consumer had agreed to it and expected to mark roughly **14 of grapevine's 33 paths**. They are not
being asked for that field, this round or on the current plan.

**The reasoning below is kept, not deleted.** It was sound given the premise, and the premise is
what changed — the version route, the optionality argument and the coverage count all still follow
correctly from _"a warrant will read this"_. Deleting them would leave the next reader to redo the
same argument and reach the same answer under a premise that no longer holds.

**And an inert field is not a neutral placeholder**, which is the second half of why it is withdrawn
rather than merely deferred. A declared-but-ungated `effects` gives its names apparent authority,
invites consumers to infer safety from them, and constrains whatever later definition a real
consumer would need. `read_only` already carries two plausible meanings — no mutation of the tool's
own state, versus no externally visible effect — and `watch`, which writes nothing of its own and
opens a browser on the operator's machine, is the case that separates them. **Add the field when a
concrete consumer and a testable semantic contract exist**, and let that consumer's requirements
pick the meaning, rather than reserving the names now and discovering later which one was meant.

What follows is the withdrawn design, as it stood when it was decided.

---

Declared, provenance-marked, gating nothing by itself. This is the format work; the warrant that
reads it is item 2.

**Why it is a claim and never a check.** `STANDARD.md` files effects under
[nothing outside can check it](../../STANDARD.md#nothing-outside-can-check-it) — _"That a command
performs no writes is unobservable from argv and streams alone … A sandbox moves this into the row
above; nothing else does."_ Both design sketches scoped it out for the same reason and reached the
same instruction: **record it; let it gate nothing.** So the field must be readable, reportable,
and inert until something else licenses acting on it.

**Take `spec.ts`'s vocabulary rather than mint one.** `CommandSpec` already carries
`effects: "read_only" | "idempotent" | "non_idempotent"`, with a comment that is the argument the
declaration needs: the claim covers everything the command **causes**, not only what its own code
writes, which is why `check` cannot be `read_only`. `declaration.ts` already took `spec.ts`'s
vocabulary for arguments deliberately — _"in `spec.ts`'s vocabulary rather than a parallel one"_ —
and this is the same move for the same reason. Carry `output_kind` with it, for the terminating
question above.

- `DeclaredCommand` gains `effects`, and the `output_kind` axis with it.
- **Optional, not required — and the reason is the asymmetry, not economy.** `status` on an
  argument is required because a generator with nowhere to put refusal writes nothing and
  nothing reads as valid (`DT-2`). The default here runs the other way: an absent effects claim
  is silence, silence withholds a probe, and withholding a probe costs coverage rather than
  somebody's data. This is the inverse of the `DT-2` precedent and has to be argued rather than
  inherited from it. **Settled, and the emitter-side half of the argument is the consumer's:**
  a required field would force them to answer on day one for `watch`, `roll` and `reap` — the
  exact commands where a rushed wrong `read_only` costs someone their data. Forced answers are
  how `DT-2`'s inverse is actually produced. They expect to mark roughly 14 of grapevine's 33
  paths and leave the rest silent this round.
- **The report counts coverage** — _"effects declared on 14 of 33 paths"_ — which is the real
  `DT-2` lesson applied to silence rather than to refusal. Optionality means an absent claim
  withholds a probe; the count means it also **shows up as a number**, so nobody reads silence
  as an answer. Consumer's refinement, and it is the thing that makes optional safe.
- The reader records the claim and reports it. Nothing in the census changes.

**The version question, which is the part a current adopter's emitter turns on.** The reader
compares `formatVersion` by exact string equality against `DECLARATION_FORMAT_MAJOR = "0"`, and its
comment argues against a minor on purpose: a minor exists to let an older reader read a newer
document on the fields it recognises, and this reader refuses unknown fields outright. So there are
two routes and no third:

- **A — define `effects` inside v0 as an optional key.** Every existing v0 emission keeps parsing
  unchanged. A document carrying `effects` is refused **whole** by an older reader, which is
  precisely the fail-closed behaviour the strict-key rule exists to produce: an unlocking field is
  never silently dropped. Cost: `"0"` then names two documents, and
  [roadmap step 2](../roadmap.md#2-version-the-contract-not-only-the-rules) — versioning the
  contract — is unbuilt.
- **B — bump the major to `"1"`.** Honest about the break. Cost: the reader becomes a multi-major
  reader (it must keep accepting `"0"`, or the one emitter in existence stops parsing), which is
  machinery this format does not have.

**Decided: A**, and decided by the only person it touches. The lean was A — the safety property
holds in both directions, and the whole cost of B is paid to describe a change no reader can act on
without item 2 anyway — and the consumer, whose emitter is the population this question is about,
agreed and verified their half: under A their emitter changes **zero bytes** until they choose to
claim effects, and an old reader refusing a claim-bearing document **whole** is exactly what they
want, because a dropped `effects` key read silently as no-claim is the disaster. Their earlier
instinct that a format break should be honest about being one did not survive contact with the
actual reader ecology: population one. A's cost is theoretical until a second reader exists; B's
cost is real and paid now.

- **Write the ratchet in, as they asked.** _The first optional key inside v0 is a wart; a second
  is a policy._ If any other field wants this route,
  [roadmap step 2](../roadmap.md#2-version-the-contract-not-only-the-rules) — version the
  contract — goes first. This is the sentence that stops A from becoming the way fields are
  always added.

### 2a. Recorded-surface ingestion

**The consumer's item, and the one that lifts the ceiling without touching the chain.** The kit
accepts recorded rejections from the caller alongside the declaration, reads them into
`PathSurface[]` itself, and diffs. The caller ran their own tool at whatever paths they chose, on
their own machine, and recorded what came back. Nothing here executes anything, so nothing here needs an effects claim, a warrant, or the
decision page.

**Why this is not a hole in the safety argument.** The safety argument is about what `acc check`
does **to a machine**. Ingestion does nothing to any machine. The trust argument is separate and is
answered above: the census renders both readings and reaches no verdict, so a fabricated surface
buys a sentence, not a pass — and the report names who recorded it.

**The shape a caller supplies: raw, observation-shaped records. Decided on the consumer's review**
(`standard-grapevine`, message 30), whose stake is the one that settles it — they are the caller who
will produce the first recorded surfaces. A record is what the tool **did**: the argv sent, the exit
code, the stdout and stderr bytes verbatim, plus who recorded it and when. Not a pre-parsed flag
set. Everything downstream — the readable-rejection filter, `MARKER`, `flagsAfter`, the diff — stays
on this side. Their three reasons, which are the justification and not a preference:

1. **A caller-parsed set imports the caller's extractor into the trust chain**, and the caller's
   extractor is the one component here that has never been through this project's discipline. The
   `SG-1` class — short flags truncating the read — becomes **unfindable** in a submission that
   arrives already parsed: the kit would be diffing against the caller's parsing bugs while
   labelling the result the tool's own account of itself. Raw text keeps the reading in the single
   place it happens, with its documented narrowness and its documented error direction intact.
2. **Raw text preserves specimens.** Both `SG-3` near-miss phrasings exist only because the raw
   wording survived to be looked at, and the widening decision is still waiting on a second
   independent specimen. Below-root phrasings are the qualifier-carrying population — the second
   near miss is a subcommand's own list, phrased with a qualifier — so they are about to arrive in
   volume, at exactly the moment a parsed-set submission would destroy them.
3. **It is cheaper for the caller.** Recording what happened is a shell one-liner; parsing it
   correctly is a program, and the parsed shape makes every adopter write the program.

**What it means for provenance labelling.** `recorded-by-caller` attests to the **recording**, never
to the reading — in the consumer's words, _"the caller attests only to what the tool DID, never to
what it means."_ The label stays honest at the altitude it is printed at: it says these bytes came
back from that argv on someone else's machine, and it says nothing about what the bytes mean,
because the kit decided that and owns being wrong about it.

**This is [`probing.md`](../wiki/concepts/probing.md)'s own rule at a different altitude.** That page
permits using a spelling to choose which probe to **send** and forbids using it to reach a
**verdict** — _"inference may select what to look at; only observation may condemn."_ Here the
caller chooses what to **record** and does not reach the reading, and the asymmetry that justifies
it is the same one: being wrong about what to record costs a capture, and being wrong about what it
meant would put words in a target's mouth in a section labelled as the target's own.

- [ ] A way to supply recorded surfaces on a run — per record: the command path, the argv sent, the
      exit code, both streams verbatim, and the recorder's identity and timestamp. The kit runs its
      own extraction over them, so a caller records what the kit would have read rather than a
      parallel format.
- [ ] **The kit classifies; the caller does not.** Inertness, readability and truncation are
      kit-side judgements over the record, not fields a caller asserts. A record whose argv the kit
      would not have sent is still readable evidence — the caller ran it, not us — but it is the
      kit that decides whether the argv is a rejection at that path.
- [ ] **Surface provenance on every path result: `recorded-by-caller` versus `probed-by-kit`.** This
      is the reported-not-verified discipline of
      [the eight-owner report](../reports/2026-08-24-eight-owner-clis.md), one level down. A census
      line that does not say who observed it is the defect this project is named after.
- [ ] Fix the reason string that still assumes one answer. `declaration.ts` today hardcodes
      _"no flag-surface evidence for this path — the kit probes the root only; evidence below it
      comes from surfaces a caller recorded"_ for every path without evidence. That sentence is
      right for a path nothing reached and wrong for a path the caller simply did not record, so it
      splits in two. Two reasons — and **not three**: the third, _no warrant for this path_, was to
      come from [item 2](#2-a-probe-warrant-below-the-root), which is not being built, so it has no
      referent and must not be emitted.
      [The batch document](2026-08-25-the-recorded-surface-batch.md) specified all three in an
      earlier round; it now specifies two and records the third as withdrawn with item 2, to be
      re-derived only if the decision is reopened. **The shape decision above
      does not change what those two are.** A caller record that arrives and yields no
      enumeration is not a fourth state: it lands in the `Surface` statuses that already exist
      (`not-enumerated`, `no-evidence`) on a path that was looked at, which is the distinction those
      statuses were built for. What it does change is that `no-evidence` now has two provenances —
      _the kit sent no probe_ and _the caller's record was unreadable_ — so the sentence must be
      rendered beside the `recorded-by-caller` label rather than on its own.
- [ ] **Run `SG-8`.** bounty's verb-level rejection enumerates its global registry with the kit's
      exact marker — measured on the channel — so a `PathSurface` for `["state"]` is one command to
      capture. **The capture has arrived**, is vendored at
      [`fixtures/recorded-surfaces/`](../../src/acc/kit/fixtures/recorded-surfaces/PROVENANCE.md),
      and it moves the denominator: the registry is **22** flags, not 21. The corrected
      pre-registration is roughly **18 of 22** `accepted-not-declared`, and the correction was made
      by `trellis` before any diff existed to run — see
      [the amendment](../reports/2026-08-24-first-outside-application-grapevine.md#amendment-2026-08-25--the-denominator-was-22-and-the-correction-preceded-the-diff).
      It must be run **before anything in the differ is tuned**, which is the whole value of having
      registered it, and which the ordering below now makes possible.
- [x] **Run `DT-11`.** **Run 2026-08-26 by the adopter, and
      [the outcome is recorded beside the registration](../reports/2026-08-24-first-drift-trial-anthill-manifest.md#outcome-2026-08-26--run-by-the-adopter-two-of-the-three-numbers-exact-the-path-count-out-by-a-factor-of-three)**:
      the **8** and the **0** landed exactly; the path count did not — `23 of 26` against a
      registered `8 of 25`, because the run recorded all 25 paths where the registration had
      specified eight. Nothing in the differ was touched before or after. The item as written
      follows. anthill enumerates at all eight of `DT-2`'s paths, on both builds, and the
      kit's own `readStream` reads every one of the eight sets — verified 2026-08-26 and recorded
      with the commands in
      [the registration](../reports/2026-08-24-first-drift-trial-anthill-manifest.md#dt-11--the-pre-registered-prediction-the-census-against-dt-2).
      So the batch is eight captures and the run is one command. It tests the sentence
      [`STANDARD.md` puts first](../../STANDARD.md#where-to-start-if-you-already-have-a-cli): that
      the census catches a defect two root-probing `acc check` runs missed. Registered at **8**
      `declared-not-accepted` and **0** `accepted-not-declared`, with the ninth finding and the
      modelling choice that produces it named in advance. Like `SG-8`, it must be run **before
      anything in the differ is tuned**, and the run must quote anthill's `--version` bytes so it
      names its build rather than repeating [`DT-10`](../reports/2026-08-24-first-drift-trial-anthill-manifest.md#dt-10--two-builds-of-the-same-declared-version-disagree-about-whether-the-root-enumerates).
- [ ] **Pre-registered alongside it: `32 of 33 compared` for the grapevine pair.** Registered by
      `trellis` at Spellbook `d45def2` and pinned here on 2026-08-25, under the same discipline and
      for the same reason — before any ingestion code exists. Grapevine's emitted declaration carries
      **33** command paths; the batch carries **32** records, one per declared below-root path and
      none at the root, because [the root is the kit's](2026-08-25-the-recorded-surface-batch.md#the-root-is-the-kits-and-a-path--record-refuses-the-batch).
      So once ingestion lands, the census for that pair should read **33 paths, 32 of them compared
      on recorded surfaces and the 33rd on the kit's own root probe** — against the `1 of 33` the
      first application measured. Counted here from the vendored artifacts, not taken on the
      recorder's word: 33 declared paths, 32 recorded, and the two sets differ by the root alone.
      **A result of 32 is the prediction; a result of 31 or fewer is a finding about the reader**,
      most likely a path that failed one of the readable-rejection rules and landed `no-evidence`,
      which is the case the spec says the census line must name.

**What a caller can get wrong that we cannot see — and it is not fabrication.** The trust argument
above covers a caller who lies, and the label plus the no-verdict census answer that. The harder
case is a caller who is honest and whose capture is lossy in a way the bytes do not show:

- **A truncated capture.** `captureSurface` excludes its own truncated observations because a list
  cut mid-way yields a set short by an unknowable number of flags **and looks complete** — the one
  failure worse than reading nothing. The kit knows when it truncated; it cannot know when a
  caller's pipe, buffer or `head` did. Everything the differ then reports as `declared-not-accepted`
  at that path is a finding against flags the tool accepts.
- **Merged streams.** The consumer's own one-liner is `... 2>&1`, and `SurfaceEvidence.stream` is a
  published field a reader is invited to audit. A merged capture cannot fill it honestly, so the
  record must be able to say _merged_ rather than have the kit guess `stderr`.
- **A different binary.** The record says what some build of the tool did; nothing in it ties that
  build to the declaration being diffed. **Answered on the consumer's proposal**
  (`standard-grapevine`, message 32), and the answer is the shape decision applied one more time:
  **make binary identity an observation in the batch, not an attestation on the record.** A
  caller-supplied version _string_ is the pre-parsed-set problem again — the caller would be
  attesting to a **reading**, which the shape decision above has just ruled out. The same session
  that captures the rejections can capture `argv ["--version"]`, or the schema emission itself, as
  one more observation-shaped record: same binary, same bytes, our extraction. The tie between the
  recorded surfaces and the diffed declaration then rests on **the tool's own words, captured under
  the same discipline as everything else**, and a batch missing its identity observation is legible
  as exactly that — **unstated, not lied about**. A tool with no `--version` leaves the field
  honestly empty, and the census must carry that as a stated fact of its own, because **no rule
  covers it**: `D1` is a verdict about the binary **the kit** ran, an empty identity is a silence
  about the binary **the caller** ran, and `"--version reported no version"` fires only on
  `exitCode !== 0 && stdout.trim() === ""` — so a target with no `--version` that exits `0` printing
  its help screen does not trip even that clause. See
  [the recorded-surface batch](2026-08-25-the-recorded-surface-batch.md#the-identity-observation).

  **It narrows the gap; it does not close it, and this plan should not say otherwise.** A caller
  can still record `--version` from one build and the rejections from another. What the proposal
  changes is the **category** of that error: today it is an unstated assumption nobody can see or
  contradict, and afterwards it is a **mistake** — a wrong claim, made in the tool's own words,
  inside a batch that asserts one session. That is real progress, because mistakes are the kind of
  thing a reader can catch and a caller can be shown. Two residues survive it, and both should be
  said out loud rather than absorbed:

  1. **The session, not the bytes, is what binds the records.** Nothing in an identity observation
     ties it to the rejection observations beside it except the caller's assertion that they came
     from one session. The batch stays the unit of trust and the line stays `recorded-by-caller`;
     what improves is that the assertion is now **checkable against a tool's own output**, not
     merely unstated.
  2. **`D1` establishes less than the field looks like it carries.** Its detector is
     `plain.exitCode === 0 && plain.stdout.trim() !== ""` (`version-flag.ts:104`) — a non-empty
     stream standing in for a typed payload — and its own standing coverage gap says _"stdout is
     never checked to carry a version string in either mode."_ So a present identity observation establishes that
     **the caller recorded** the target saying **something** under `["--version"]` — the kit
     observed nothing here — not that what it said is a version, and
     not that two batches quoting different bytes are different builds. The field is honest in
     both directions, which is the property being bought here; it is not a verification, and the
     report must not print it as one.

- [ ] **Say what happens then, rather than assume it away.** The record carries the fields that make
      the loss declarable — stream attribution including _merged_, and a completeness declaration —
      and the report says what each one cost the read. The worry when this item was written was that
      a raw prefix reads as a whole where a parsed set at least fails loudly on a truncated list.
      [The batch document](2026-08-25-the-recorded-surface-batch.md#completeness) answers it by
      making completeness a required field and reading only `complete`, which is the rule
      `isReadableRejection` already applies to the kit's own truncated captures — so the raw shape
      is not weaker here after all, and the caller's extractor still stays out of every finding.
- [ ] **The identity observation is optional and counted — the same treatment item 1 gave `effects`,
      reached by a different argument rather than by proximity to it.** Requiring it would refuse a
      batch over a property of the **target**: a tool with no `--version` cannot supply one, so a
      hard requirement leaves the caller a choice between fabricating a reading and dropping the
      capture — forced answers again, and this time they cost specimens the `SG-3` widening decision
      is still waiting on. The honest-empty case has to be representable at all, and once it is, a
      required field is indistinguishable from an optional one left blank. **Where it parts company
      with `effects`:** an absent effects claim withholds a probe, so silence is fully priced by one
      coverage total. An absent identity observation withholds nothing — every recorded surface is
      still read and still reported — it only weakens the tie under **that batch's** lines. So the
      count cannot only be a total at the top of the report: the unstated-identity fact must be
      rendered **beside the `recorded-by-caller` label on the affected paths**, where the reader is
      deciding what to make of that census line, with a total as a summary of it rather than a
      substitute for it.

**No format change and no version question.** Recorded surfaces are an input to a run, not a field
in the declaration, so this item does not touch `formatVersion`, `TOP_LEVEL_KEYS`, or the ratchet in
item 1.

### 2b. Probe-plan generation

**The cheaper feature that serves the need the warrant was invented for. Scoped here, not designed
— it needs its own design pass before anyone implements it.**

**What it is.** The kit reads a declaration and emits an explicit **probe plan**: the exact argv it
would send at each declared command path, for the operator to read, run, and hand back as a
recording. It also reports which command paths remain unobserved. The kit executes nothing at any
point.

**Why it serves the need.** Same coverage as the warrant, with the authorization in the right hands:
the operator decides what runs on their machine, rather than the checker deciding on the strength of
what the target said about itself. It composes directly with
[item 2a](#2a-recorded-surface-ingestion) — the plan comes out, the operator fills it in, ingestion
takes it back — so it adds a generation step to a route that already exists rather than a new route.

**The shape: the plan _is_ an unfilled batch. The adopter's design, and it is better than a
freestanding plan format.** Emit the plan in the recorded-surface batch's own vocabulary: a
batch-shaped document with `path` and `argv` filled in and `exitCode`, the streams, `completeness`,
`recordedBy` and `recordedAt` left empty, which the operator's runner fills **in place**. Plan and
record become one document at two lifecycle stages. Three consequences they name, and each is a
defect that stops existing rather than a convenience:

1. **Argv-transcription drift dies outright.** The operator never retypes a token, so the argv that
   was run is the argv the kit specified, byte for byte.
2. **The batch spec's `path`-is-a-prefix-of-`argv` self-check now validates the kit's own
   emission**, not only a caller's. The rule was written to catch a caller's mistake; it catches
   ours for free.
3. **"Which paths remain unobserved" becomes trivial** — they are the records still empty. No
   separate accounting, and no second definition of coverage to keep in step with the first.

Their capture script was accidentally this design already, minus the generation step: roughly
fifteen lines of subprocess-fill.

#### The hazard did not vanish, it moved to the operator — and the plan must carry it in its own bytes

**This is the residue that makes probe-plan generation safe or not, and it is not a footnote.**
Every rejection probe is a bet that the parser refuses the unknown flag **before** the verb
dispatches. On a strict parser the invocation is inert. But the `A1`-violating tool — the lenient
parser that ignores the unknown flag and runs the verb anyway — is **simultaneously the tool the
census most needs to probe and the tool where `close --acc-not-a-flag` actually closes the board**.
An operator mechanically executing a kit-emitted plan against a lenient tool does real work and gets
a success-shaped transcript back.

Moving authorization to the operator is only an improvement **if the plan hands them the risk
legibly**. Three requirements follow, and they are requirements on the emitted document, not on a
README beside it:

- **The warning is inline and per-record**, on every record: this argv assumes rejection before
  dispatch; on a tool that ignores unknown flags, running it executes the verb. A warning the
  operator reads once at the top is a warning they read once.
- **Order the records so the obviously-inert paths come first**, so an operator can work down the
  plan and stop when they reach something they are not willing to run.
- **Flag any path whose verb name pattern-matches the destructive family** — `close`, `reset`,
  `delete`, `rm`, `prune`, `kill` — for manual confirmation. **The adopter calls the pattern-match
  crude and argues the crudeness is honest, which is the right reading:** the kit cannot know what a
  verb does, and that it cannot know is the whole reason the warrant died. A crude flag that says
  _this name looks dangerous, you decide_ makes no claim the kit is unable to support.

**What the design pass still owes.** Where the plan is emitted from and under what flag; whether it
covers every declared path or only those a caller selects; what it does for a declaration that
declares no paths below the root; how the empty-record shape validates against the batch schema
without a caller having to hand-write one; and whether the unobserved-path accounting is a mode of
this item or a report line item 2a already has to grow.

### 2. A probe warrant below the root

**Not to be built.** See [the decision](#the-decision-and-it-is-now-a-decision-not-to-build): the
warrant asks the kit to execute a subcommand on a safety claim made by the binary under test, and a
subject's self-description is evidence to test rather than an execution-safety boundary. **What
would reopen it** is the four-part evidence list on that page — named users needing unattended
third-party below-root probing, demonstrated failures of the recording workflow that
[item 2b](#2b-probe-plan-generation) cannot solve, a defined platform and threat model, and a
containment mechanism that enforces real limits — plus, even then, an operator opt-in, because
containment reduces consequences without granting authorization.

**The mechanism below is kept for whoever reopens it.** It is the shape the warrant would take, and
re-deriving it would cost a day. It is not a scheduled item, and the checkboxes have been taken off
it deliberately: nothing here is work anyone is expected to do.

---

Opens only for command paths a declaration marks read-only, and only when the declaration is the
tool's own.

**The asymmetry decides the provenance — and this is the sentence the decision overturns.**
"The framing checks out" was wrong. The narrowing-versus-widening asymmetry is a rule about
**documents**, and it settles who may say a thing, never whether the thing is true. Reading it as an
execution-safety boundary is the error the whole item rests on. Kept verbatim below so the mistake
is legible rather than quietly patched. `STANDARD.md` Part 2:
_"A statement that narrows the probe surface may be accepted on anyone's word. A statement that
widens it must come from the tool."_ Probing a subcommand is a widening claim, so the warrant reads
`provenance: "emitted"` and nothing else.

**One refinement the rule implies and is worth stating.** The same field is admissible in one
direction and not the other, depending on its **value**. A `modelled` `read_only` widens and must
be refused as a warrant; a `modelled` `non_idempotent` only removes probes, and the rule's own
gloss admits it — _"an unfalsifiable field is admissible exactly when the only thing it can do is
remove probes and withdraw verdicts."_ So a caller's declaration can still make the kit do
**less**, which is worth having and costs nothing.

- `classifyInertness` gains a class that opens only on: `emitted` provenance, a `read_only`
  claim at that exact path, and an argv that is the declared path tokens plus tokens the
  existing classes already admit. It fails closed like the other four.
- The four existing classes are not weakened. `help-path` keeps requiring every token to be a
  help or format token, so `mycli deploy --help` still refuses **under the old class** and runs
  only under an explicit warrant.
- `captureSurface` reads rejections at warranted paths, and `PathSurface` carries more than one
  member.
- The report distinguishes a path not compared because the kit cannot reach it from one not
  compared because no warrant was given — those are different sentences with different remedies,
  and item 2a would have made it a three-way distinction by adding _the caller recorded nothing
  here_. (Written when both items were live. Live item 2a makes it a **two**-way distinction —
  _nothing reached this path_ against _the caller recorded nothing here_ — because the warrant half
  never arrives.)

**The framing this item closed on was wrong, and correcting it is what ended the item.** It said the
warrant was "the machinery for the kit running a target's subcommand on the target's say-so, for
callers who do not own the tool and cannot record its surfaces themselves." **Ownership is not the
distinction.** Anyone who can let `acc` execute a local binary can execute that binary themselves
and record what came back; the warrant creates access for nobody. It transfers the **choice of
invocation** from the operator to the checker — and the adopter who shipped full below-root coverage
with no warrant machinery at all has now confirmed that from the other side. Once the population it
was supposed to serve is described correctly, it is empty, and everything above it is mechanism in
search of a user.

### 3. Regression fixtures from the first application

**The gap, stated exactly.** The four deliberately-broken variants live in the Spellbook repository
at `docs/investigations/2026-08-24-grapevine-drift-experiment/` and are not in this checkout.
Nothing here guards a census regression against the only tool ever built to this standard. The
permission gap is now closed — see the grant below — and what remains is the work of vendoring and
of reconstructing.

**And it is worse than "not in the tree", which is worth being precise about.** The reachable
grapevine — Spellbook 2.2.0 in the plugin cache, the build the
[eight-owner measurement](../reports/2026-08-24-eight-owner-clis.md) used — **has no `schema`
verb**: the token does not occur in its `cli.ts`. It predates the adoption work. So grapevine's
`CONFORMANT (L0)` and its `1 of 33` are not reproducible in this checkout **by any means**, and
cannot be listed as something that must not regress until something changes. (One claim from that
report _is_ independently corroborable against the cache, and was: `announce` is a dispatched case
at line 1724 and the `--help` screen never lists it.)

What exists in-tree today guards the mechanism and not the target: synthetic fixtures
(`enumerates-flags-in-prose.ts` and its neighbours) exercise the differ end to end, and two anthill
v2.3.0 manifest fixtures guard `DT-1`, `DT-2` and `DT-3` against a real generated manifest.

**Granted, in full, in the review.** The ask below has been answered: take the four `.patch` files,
the four broken `.declaration.json` emissions and the clean emission, with attribution, from
`ichabodcole/spellbook`, branch `develop`, at
`docs/investigations/2026-08-24-grapevine-drift-experiment/` — reachable by clone even though the
local tree is not in this checkout's reach. Two caveats they asked be **stated rather than
assumed**, and stating them is the point:

- The fixtures were cut at `648366c`. The final code sha `1c61d13` added numeric-value guards and
  **did not change the emission**, so the declarations remain current. That is their report of it,
  not something verified here.
- The `c-rename` variant's declaration was emitted via `describe`, the **renamed** verb, as that
  experiment's README says. A fixture whose emission came through a different door than the others
  must carry that on its face, or the next reader infers a door that was never there.

- [ ] **Vendor the granted artifacts**, with attribution and both caveats recorded alongside them.
- [x] ~~Also request, or reconstruct, **grapevine's recorded root enumeration**.~~ **Answered, and
      answered differently than asked.** The shape was specified
      ([the recorded-surface batch](2026-08-25-the-recorded-surface-batch.md)), and what came back is
      not a root enumeration but the whole below-root sweep: two batches and two declarations,
      vendored at
      [`fixtures/recorded-surfaces/`](../../src/acc/kit/fixtures/recorded-surfaces/PROVENANCE.md)
      with attribution, capture method and three caveats on the artifacts. **The root record is
      absent on purpose** — the spec [refuses a `path: []`
      record](2026-08-25-the-recorded-surface-batch.md#the-root-is-the-kits-and-a-path--record-refuses-the-batch),
      so this ask as originally worded is one the spec written to serve it can no longer satisfy. The
      cost is the one that section already names and prices; nothing new is owed here.
- [ ] **Reconstruct anyway** — the reviewer explicitly endorsed doing so even having granted the
      originals, because a vendored fixture depends on somebody else's repository staying reachable
      and a reconstructed one is reproducible in-tree forever: a fixture
      CLI shaped like grapevine — a verb registry, a root that enumerates long **and** short flags
      (the `SG-1` population) — plus its emitted declaration and the four breaks as variants. This
      is reproducible in-tree forever and needs nobody's permission. What it cannot do is say
      anything about grapevine.
- [ ] Record which of the two happened. A reconstructed fixture presented as the original would be
      the defect class this project is named after.

**Timing is load-bearing.** Whichever route lands, it must land **before** the census changes shape.
Fixtures captured after item 2 record the new behaviour and prove nothing about a regression.

### 4. `next` as an executable plus an argv array

[Roadmap step 1](../roadmap.md#1-remediation-becomes-structured-data), blocked on nothing, and the
only item here that needs no decision from anyone.

`STANDARD.md` tells adopters: _"If you are designing this now, carry an executable and an argv array
rather than a string, and you will be ahead of this page"_ — on a field the same paragraph calls a
command-injection boundary. `NextAction` in [`envelope.ts`](../../src/acc/envelope.ts) is
`{ command: string; when?: string }`, and eight command modules emit ten of them — `show.ts` and
`rules.ts` carry two each. Six interpolate a value into the string (`path.ts` builds
`acc show ${to.slug}`); the values are internal and the shape is the one the standard warns about.

So the reference implementation does the thing its own standard tells adopters not to do. That is
tolerable while nobody has read the page, and this round is precisely the round where a second
adopter reads it.

- [x] `NextAction` carries an executable and an argv array.
- [x] All ten emit sites move with it, and the
      [error-envelope concept page](../wiki/concepts/error-envelope.md) stops describing the
      typed version as an intended direction.
- [x] `acc schema`'s own output changes shape, which is consumer-visible — the same versioning
      question as item 1, arriving on a different artifact.

### 5. Name the clause once: "Evidence, not a rule"

`STANDARD.md`'s legend carries three marks — `[C]` checked today, `[C?]` checkable and unbuilt,
`[—]` unestablishable from outside. The declared-versus-accepted census fits none of them. It ships
today, it runs on every `--declaration` run, and it is deliberately not a rule: it mints no id,
feeds no verdict, and reports a disagreement as two readings because nothing can tell which side is
wrong. It currently sits under `[C?]` with a four-line clause explaining that it is not `[C]`.

The clause is correct and it is carrying a mark's worth of meaning in prose, in a page whose legend
preamble says blurring these distinctions _"would be dishonest"_.

**No fourth mark. Take the fallback — decided by the reviewer, and their standing is the argument.**
They are the only person who has read `STANDARD.md` cold, and what did the work for them was the
**phrase** _"Evidence, not a rule"_, met in the report before they ever reached the legend. A fourth
glyph is one more thing to hold in memory with a population of two; a named concept used verbatim
everywhere it applies is self-teaching. The `In v0` precedent points the same way: when the
three-mark axis does not cover something, the page has added an axis or a column, not a mark.

- [ ] **"Evidence, not a rule"** is named once, as a concept, and reused **verbatim** everywhere it
      applies — no paraphrase, because the phrase is doing the teaching.
- [ ] It applies in at least two places: the declared-versus-accepted census, and the self-declared-
      flags surface capture, which the report already labels with those words. Item 2a adds a third,
      since a caller-recorded surface is evidence in exactly this sense.
- [ ] The four-line clause under `[C?]` shrinks to the named phrase plus its pointer, and stops
      carrying a mark's worth of meaning in prose.

**The objection, recorded rather than dropped.** Two claims was always a thin population for a new
mark; that thinness is what the decision turns on, and it is also what would change if the
population grew. If a later round finds this axis has five members and the phrase is being restated
five different ways, the mark question reopens — with evidence rather than with two instances.

---

## What must not regress

Verified against the tree rather than assumed, and stated as properties with the thing that guards
them.

- **The eight-owner measurement's frame.** All eight runs carry `configSource.origin: "none"`, and
  the report's denominator is 23 rules. `declaration.ts` names the trap explicitly: adding a key
  describing the target's own shape to `TOP_LEVEL_KEYS` is the stated trigger for the config-refusal
  gate, which would invalidate that frame. So **`TOP_LEVEL_KEYS` does not move** — whatever field
  wants in next, a key describing the target's own shape belongs in the declaration file and never
  in `acc.config.json`. (This bullet was written for `effects`, which is
  [withdrawn](#1-an-effects-field-in-the-declaration-format--decided-then-withdrawn); the constraint
  it protects is not about that field and stands without it.)
- **The honesty properties in `surface.ts`.** Three statuses stay three: `enumerated`,
  `not-enumerated` (the tool did not list, which is not "it has no flags") and `no-evidence` (we did
  not look). `flags` stays absent rather than empty on the latter two. Every rendered sentence keeps
  naming its scope — `SG-2`'s wording, _"did not enumerate at the root — the only path probed"_,
  which becomes **more** important, not less, once some paths are probed and others are not. The
  `SG-1` fix stays: flag capture reads short flags as well as long.
- **The honesty properties in `declaration.ts`.** `status: "checked" | "not-checked"` stays the
  field a reader is told to read first, and an empty finding list keeps meaning _nothing was
  compared_ rather than _nothing disagreed_. Both readings stay on every finding, ordered by
  provenance. The remedy sentences stay split by provenance, with the test that an emitted
  declaration never receives the modelled sentence. Unknown keys stay refused anywhere in the
  document, and `formatVersion` stays checked before them.
- **The census stays evidence.** The headline clause moves no number and no exit code; nothing here
  feeds `conformant`.
- **`classifyInertness` keeps failing closed**, and `assertInert` keeps throwing. The four classes
  that exist are not widened. No fifth is proposed — the only one that was is
  [the withdrawn warrant's](#2-a-probe-warrant-below-the-root) — and if one ever is, it adds a door
  rather than widening those four.
- **anthill's `1 of 25` is guarded in-tree, and [item 2a](#2a-recorded-surface-ingestion) changes
  it.** That test's expectation moves as soon as any path below the root is compared, and there is
  now one way that happens: a surface somebody recorded and handed in. It must be **re-baselined
  deliberately, with the new number argued** — silently updating the assertion would delete the only
  in-tree record of the ceiling. And the re-baselined test must still say **what** moved it, naming
  the recorded evidence rather than the number alone: the surfaces a
  [generated probe plan](#2b-probe-plan-generation) comes back with are recorded evidence too, run
  by an operator instead of assembled by hand, so the live distinction the report keeps is
  `probed-by-kit` against `recorded-by-caller` — not two kinds of below-root evidence, of which
  there is one.
- **Grapevine's conformant result and its census are not on this list yet.** The artifacts that
  would put them there have been granted (item 3) and are not vendored; until they are, the only
  guard is the consumer re-running against their own tree.

## Deliberately not in this round

- **Widening the enumeration matcher (`SG-3`).** Deferred — but not for the reason it is usually
  given, and the usual reason is wrong. It does **not** dissolve when the root ceiling lifts; it
  gets more load-bearing. The two near-miss specimens are `recognized flags for send:` and
  `recognized root flags:`, and a qualifier is exactly what a **verb-level** rejection carries,
  because it has a verb to name. Below-root probing multiplies the population the pattern has to
  read. The honest reason to defer is the evidence: two specimens is a thin basis for widening a
  pattern that errs the right way, and that basis grows the moment recorded surfaces start arriving
  from below the root — [item 2a](#2a-recorded-surface-ingestion), not the withdrawn item 2, which
  is a correction rather than a rewording: the specimens now arrive from callers running their own
  tools, so they arrive sooner and from more tools. The interim
  commitment already on the record stands — if the widening is declined, both specimens go into the
  code comment so the next reader inherits the evidence rather than the conclusion.
- **Modelled declarations.** Deferred, and the reasoning has been through two revisions worth
  keeping. It once read: today a modelled declaration buys zero comparison for the verb-first
  population, and after item 2 it would buy comparison **only where an emitted declaration has
  already marked a path read-only**, because the warrant is a widening claim and a caller cannot
  make one — a limit that changes shape into something slightly perverse rather than vanishing, with
  modelled declarations useful exactly on the tools that had least need of one. **That residue is
  gone with the warrant**, and what remains is simpler and better: a recorded surface is an
  observation, not a widening claim, so a caller who can run the tool can compare a **modelled**
  declaration below the root with no warrant, no effects claim and no permission from anyone. That
  is exactly how `SG-8` gets run against bounty. The population the old residue described — callers
  who cannot record surfaces themselves — is the same empty population the warrant was built for.
  Do not build modelled-specific machinery now; re-measure the claim once recorded surfaces are
  landing.
- **Feeding the census into `conformant`.** Not proposed by the adopter, not done by the fix that
  answered `SG-4`, and not reopened here. The kit cannot tell which side of a disagreement is wrong,
  and a verdict that requires knowing would be a guess wearing a rule id.
- ~~**Running the `SG-8` prediction.**~~ **Moved into this round**, and this is the amendment's whole
  payoff. The old entry deferred it because item 2 was thought to be what made it runnable; item 2a
  makes it runnable without executing anything, so it runs here — see
  [item 2a](#2a-recorded-surface-ingestion). The pre-registration constraint is unchanged and now
  actually enforceable: roughly 18 of 22 `accepted-not-declared` for bounty's `state` — the
  denominator corrected from 21 before any diff ran, see
  [the amendment](../reports/2026-08-24-first-outside-application-grapevine.md#amendment-2026-08-25--the-denominator-was-22-and-the-correction-preceded-the-diff) —
  run **before** anything in the differ is tuned against it, or the registration is worth nothing.
- **The portable declaration IR** ([roadmap 6](../roadmap.md#6-the-portable-declaration-ir)).
  Larger, and blocked on roadmap steps 2 and 5.

## What a second application would, and would not, establish

**Would.** Whether the emit–generate–check loop is reproducible by a second implementer on a second
tool — the thing `n = 1` cannot say. Whether a caller-recorded surface is something a second adopter
can actually produce, or whether the shape is only obvious to the person who wrote the differ. And,
once [item 2b](#2b-probe-plan-generation) exists, whether a generated probe plan is something a
second adopter will actually run — including whether its per-record hazard warning is read or
skipped, which is the question that decides whether moving authorization to the operator improved
anything.

**No longer on this list, because the field it asked about is not being added.** _Whether an
implementer can answer an effects claim per command without losing a design pass to it._ That was
the cost this round was going to ask adopters to pay; it is not being asked, so the question has no
occasion.

**No longer on this list, because the amendment moved it into this round.** _Whether a below-root
census finds real drift._ `SG-8` is run in step 4 of the sequencing, against bounty, on a recorded
surface — so the answer arrives before the second application rather than out of it, and the second
application inherits the result instead of the question.

**Would not.** `n` goes from one to two, which is not a population. A second tool built to be
checkable says nothing about a tool that was not — the first report already names that limit and
this round does not touch it. Nothing is learned about the tools that emit nothing at all. And the charter's fourth question still needs drift **across releases**, which one session
cannot see — `STANDARD.md`'s own "Stability" row says a single run cannot see across releases, and
that applies to this project's evidence as much as to a target's claims.

One more, because it is this round's own doing: without item 3, a second application cannot
re-verify the first. That is the difference between two data points and one data point plus an
anecdote.

## If you have already adopted the standard

Written for the implementer who did the first application, and for anyone in the same position.

**Your existing declaration keeps working.** No field you emit today changes meaning, and nothing
you emit today becomes invalid. Your emitter changes zero bytes.

**You are no longer being asked for an effects claim.**
[Item 1](#1-an-effects-field-in-the-declaration-format--decided-then-withdrawn) was decided with you
— route A, optional, with a coverage count — and has been **withdrawn**, because the warrant that
was going to read it is
[not being built](#the-decision-and-it-is-now-a-decision-not-to-build). The roughly 14 of 33 paths
you expected to mark: **do not mark them.** Nothing in this round wants that field, and adding it
now would put names with apparent authority into the format ahead of any consumer who could say what
they mean.

**Your census does not move on its own.** It stays at `1 of 33` until you hand the kit surfaces you
recorded yourself. That act is not the same as being probed.

**The route below the root, and it is now the only one.** Run your own tool at the paths you care
about, capture the per-path rejections, pass them in with your declaration
([item 2a](#2a-recorded-surface-ingestion)). The kit executes nothing, claims nothing about safety,
and labels the surfaces as **recorded by you** rather than probed by it. If your tests already spawn
the binary, the capture is work you have mostly done — as you have now demonstrated, having shipped
full below-root coverage with no warrant machinery at all.

**What the kit owes you in exchange**, and it is [item 2b](#2b-probe-plan-generation): the exact
argv it would have sent, emitted as an unfilled batch for your runner to fill in place, with the
still-empty records standing as the list of paths nobody has observed. Your capture script is
already most of it.

**What it costs you, stated plainly, because the cost did not disappear — it moved to you.** Every
rejection probe in that plan is a bet that your parser refuses the unknown flag before the verb
dispatches. Where that bet loses, the invocation runs the verb — and the tools where it loses are
exactly the `A1`-violating ones the census most wants to see. So the plan will carry the warning per
record rather than in a preamble, order the obviously-inert paths first, and flag verbs whose names
pattern-match the destructive family for your explicit confirmation. That flag is crude on purpose:
the kit cannot know what `close` does, and its not knowing is the whole reason it is not deciding.
Your tool remains the worked example, at your request — `close` deletes a message log, `reset`
clears it, `tail` and `wait` are read-only and unbounded, and `watch` writes nothing of yours while
opening a browser on **the operator's** machine.

**The ask is answered, and nothing is outstanding on your side.** The break variants, the clean
emission and the four `.declaration.json` files are granted and remain to be vendored. The recorded
surfaces this plan owed you a shape for have been specified, captured and vendored — 32 grapevine
records, 3 bounty records, both declarations, at
[`fixtures/recorded-surfaces/`](../../src/acc/kit/fixtures/recorded-surfaces/PROVENANCE.md). One
thing changed between the ask and the answer, and it is worth knowing: **the batch format refuses a
root record**, so the root enumeration originally asked for is not something a batch can carry.

## Sequencing

**Amended twice.** The consumer's review split "compare below the root" from "execute below the
root" and moved every below-root result out from behind the safety decision. The outside read then
removed the tail of the order rather than reordering it: the sequence used to end _item 1 → decision
page → item 2_, and items 1 and 2 are no longer scheduled at all. What replaces them is the decision
page, written as a decision **not** to build, and a design pass on
[item 2b](#2b-probe-plan-generation).

1. **Item 4** first. It needs no decision and no one else, and it is the item that stops the
   standard's reference implementation contradicting the standard while a second adopter is reading
   it.
2. **Item 3** — the request is answered, so this is vendoring the granted artifacts with their two
   caveats, and starting the reconstruction. It still comes early, because fixtures captured after
   the census changes shape record the new behaviour and prove nothing about a regression.
3. **Item 2a, recorded-surface ingestion.** No effects claim, no warrant, no decision, no execution
   by the kit — so nothing gates it, and it is what lifts the root ceiling for anyone who owns the
   tool they are checking.
4. **Run `SG-8`**, immediately, before any differ tuning. This is the step the whole reordering
   exists to reach: a pre-registered prediction tested while it is still pre-registered.
5. **The decision page** — written by people who have read below-root census output, and recording
   the decision **not** to build the warrant, the argument for it, and the four-part evidence that
   would reopen it.
6. **Item 2b, probe-plan generation** — its own design pass first, then the work. It is last because
   it is the only item here that is scoped rather than designed, not because anything gates it.

**Item 5** has no ordering constraint. **Items 1 and 2 are not in the order**, and their absence is
the point of this revision rather than a deferral inside it.

**What the order is buying, stated plainly so it can be argued with.** Steps 3 and 4 move the only
thing this round can learn that a second application could not — real below-root drift — in front
of the decision that would otherwise gate it, at the cost of the census depending on evidence the
kit did not observe itself. That cost is paid with a label, not with a verdict, because the census
reaches none. Step 5 is still worth writing after step 4 for the same reason it always was: a
decision not to build is as easy to take badly on hypotheticals as a decision to build, and the
people taking it will have read real below-root output.

## Open, and not decided here

Five questions this plan flagged were closed by the consumer's review, and are recorded at their
items: **the version route** (A, with the ratchet — item 1), **`effects` optional** (yes, plus a
coverage count in the report — item 1), **the fixtures** (granted, with two caveats — item 3), the
**fourth legend mark** (no; name the clause and reuse it verbatim — item 5), and **the shape a
caller supplies a recorded surface in** (raw, observation-shaped records — item 2a). Keeping
grapevine as the worked hazard example was endorsed and sharpened into three hazard classes.

**Two of those five are now moot rather than closed**, and the distinction matters to whoever reads
this next: the version route and `effects` optionality were answers about a field that is
[no longer being added](#1-an-effects-field-in-the-declaration-format--decided-then-withdrawn). They
were decided correctly and then the question stopped being asked. They stay on the record because
the next person to want an optional key inside v0 needs the ratchet argument, not because either is
scheduled.

**And the biggest thing this section used to hold is now closed too.** Everything under _"the
decision this plan does not make"_ — what a warrant licenses, what happens when it is wrong, whether
`read_only` is the right shape, whether a caller can grant one — is answered by
[not building the warrant](#the-decision-and-it-is-now-a-decision-not-to-build). Two questions
dissolved with it: **whether the warrant is per command path or per path plus argv class**, and
whether the third hazard class belongs inside `effects` at all.

Still open:

- **What [item 2b](#2b-probe-plan-generation) actually looks like.** It is scoped and not designed,
  and the design pass is named in the item.
- **What a caller can get wrong invisibly**, now that the shape is settled — item 2a names
  truncation, merged streams and an unidentified binary, and says the record must let a caller
  declare the loss. Which fields do that, and what the report prints when they are unstated, is not
  decided here.
- **Whether recorded-versus-probed coverage wants its own number** in the report. This was asked
  alongside _"effects declared on 14 of 33 paths"_, which is gone; the recorded half survives, and
  only real output will settle it. Item 2b changes its shape once more, since an unfilled record in
  a generated plan is a third thing to count.
- **Whether a containment mechanism is worth building on its own merits** — separately from the
  warrant, which no longer depends on it.
  [Roadmap step 3](../roadmap.md#3-control-the-observation-environment-which-is-also-the-l0-safety-work)
  is where that question lives, and this plan neither advances nor closes it.
