---
type: plan
generated: { by: claude-opus-5, at: 2026-08-24 }
status: draft
lifecycle: live
description:
  What has to land before this standard is applied to a second CLI. The census only ever compares
  the root, and lifting that ceiling was thought to run through a chain — probe below the root,
  which needs a read-only claim, which the declaration format has nowhere to put. Revised on the
  first consumer's review: the chain gates the probe, not the census, because the differ is pure and
  a caller can record surfaces itself.
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
roughly 17 of 21 `accepted-not-declared` for bounty's `state`, pre-registered before the instrument
to test it existed — becomes runnable **now** rather than after the safety decision. The decision
page is then written by people who have read below-root census output instead of reasoning about it.

**The trust question, raised and answered by the same reviewer.** Caller-recorded evidence can only
ever be evidence: the census binds nothing, mints no id and feeds no verdict, and a caller who
fabricates a surface is lying to a tool that renders both readings and no verdict — they gain a
sentence, not a pass. The one requirement it does impose is on the report: **it must say who
recorded what.**

---

## The decision this plan does not make

**Probing below the root is the first time `acc check` would execute a subcommand on a target's
say-so.** Everything the kit does today is a help path, a version request, or a deliberately
malformed argv that fails at parse. That is a step change in what this tool does to a machine, and
it is not a step inside an implementation item.

It gets **its own decision page** in [`../wiki/`](../wiki/SCHEMA.md), taken before
[item 2](#2-a-probe-warrant-below-the-root) is built — and now, per the consumer's amendment, taken
**after** [item 2a](#2a-recorded-surface-ingestion) has produced real below-root census output and
after `SG-8` has been run against it. The page is the same page; it is written with data instead of
hypotheticals. What has to be settled:

- **What an effects claim licenses, exactly.** Which argv, at which paths, under which classes. A
  `read_only` claim about `send` is not a claim about `send --acc-probe-xyzzy-flag`, which is an
  invocation the tool's author never considered.
- **What happens when it is wrong.** There is no undo and no rule that fires. The worked example is
  the adopter's own tool, kept at their explicit request and sharpened with a hazard class they
  supplied that neither axis here names. **Three classes, one tool:** `close` deletes the message
  log, `reset` clears it, `reap` kills daemons — _destroys your state_; `tail` and `wait` are
  read-only and unbounded — _never terminates_; and `watch` is read-only with respect to its own
  state and **acts on the operator's machine** by opening a browser — _causes something over
  there_. A wrong `read_only` on any of the first class costs somebody their data, and the kit's
  report would say a probe ran and nothing else.
- **That the third class is inside `effects` at all**, stated in one sentence on the page:
  `effects` as [`spec.ts`](../../src/acc/spec.ts) defines it covers what the command **causes**,
  and causes-on-the-caller's-machine is part of that. Opening a browser tab is the mild form;
  the archaeology's `close --help` is the severe one. A declarer reading `read_only` as "writes
  nothing of mine" would mark `watch` read-only and be wrong by this definition.
- **Whether `read_only` is even the right shape of warrant.** It is not sufficient on its own: a
  read-only command can still fail to terminate. `tail --help` never exited; grapevine's `tail` and
  `wait` are read-only and unbounded. [`spec.ts`](../../src/acc/spec.ts) already carries the second
  axis that names it — `output_kind: "data" | "stream" | "opaque"` — and a warrant that reads only
  `effects` would license a probe that hangs.
- **Whether a caller can decline it, and whether a caller can grant it.** Declining is the easy
  half. The hard half is whether an operator running the check against a tool they own may widen
  the surface themselves — which is a different speech act from a declaration (consent to run,
  not a claim about the tool) and is not obviously governed by the narrowing-versus-widening
  asymmetry, which is a rule about documents.
- **Whether anything is required beyond the target's word.**
  [Roadmap step 3](../roadmap.md#3-control-the-observation-environment-which-is-also-the-l0-safety-work)'s
  sandbox is unbuilt and undecided — which sandbox, on which platforms, and what the kit does
  where it has none. That page already says the answer must not be _"probe anyway, quietly"_, and
  that sentence binds here.
- **What the report says about a licensed run**, so that a probe which ran on a claim is legible
  as such rather than indistinguishable from an inert one.

**Nothing here resolves any of that.** Items 1, 2a, 3, 4 and 5 below are unblocked by it; item 2 is
not, and is written to stop at the boundary. Item 2a is unblocked **because the kit executes
nothing in it** — that is the whole of its claim to be sequenced first, and it is not a shortcut
around this page.

---

## The items

### 1. An `effects` field in the declaration format

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

- [ ] `DeclaredCommand` gains `effects`, and the `output_kind` axis with it.
- [ ] **Optional, not required — and the reason is the asymmetry, not economy.** `status` on an
      argument is required because a generator with nowhere to put refusal writes nothing and
      nothing reads as valid (`DT-2`). The default here runs the other way: an absent effects claim
      is silence, silence withholds a probe, and withholding a probe costs coverage rather than
      somebody's data. This is the inverse of the `DT-2` precedent and has to be argued rather than
      inherited from it. **Settled, and the emitter-side half of the argument is the consumer's:**
      a required field would force them to answer on day one for `watch`, `roll` and `reap` — the
      exact commands where a rushed wrong `read_only` costs someone their data. Forced answers are
      how `DT-2`'s inverse is actually produced. They expect to mark roughly 14 of grapevine's 33
      paths and leave the rest silent this round.
- [ ] **The report counts coverage** — _"effects declared on 14 of 33 paths"_ — which is the real
      `DT-2` lesson applied to silence rather than to refusal. Optionality means an absent claim
      withholds a probe; the count means it also **shows up as a number**, so nobody reads silence
      as an answer. Consumer's refinement, and it is the thing that makes optional safe.
- [ ] The reader records the claim and reports it. Nothing in the census changes.

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

- [ ] **Write the ratchet in, as they asked.** _The first optional key inside v0 is a wart; a second
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
- [ ] Fix the reason string that assumes the answer. `declaration.ts` today hardcodes _"no flag-
      surface evidence for this path — the kit enumerates the root only"_ for every path without
      evidence. Once a caller can supply evidence, that sentence is wrong for a path the caller
      simply did not record, and right only for a path nothing could reach. Two reasons, and the
      report line in [item 2](#2-a-probe-warrant-below-the-root) about distinguishing _cannot reach_
      from _no warrant_ becomes a three-way distinction that starts here. **The shape decision above
      does not change what those three are.** A caller record that arrives and yields no
      enumeration is not a fourth state: it lands in the `Surface` statuses that already exist
      (`not-enumerated`, `no-evidence`) on a path that was looked at, which is the distinction those
      statuses were built for. What it does change is that `no-evidence` now has two provenances —
      _the kit sent no probe_ and _the caller's record was unreadable_ — so the sentence must be
      rendered beside the `recorded-by-caller` label rather than on its own.
- [ ] **Run `SG-8`.** bounty's verb-level rejection enumerates its 21 flags with the kit's exact
      marker — measured on the channel — so a `PathSurface` for `["state"]` is one command to
      capture. The pre-registered prediction is roughly 17 of 21 `accepted-not-declared`. It must be
      run **before anything in the differ is tuned**, which is the whole value of having registered
      it, and which the ordering below now makes possible.

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

### 2. A probe warrant below the root

Opens only for command paths a declaration marks read-only, and only when the declaration is the
tool's own.

**The asymmetry decides the provenance, and the framing checks out.** `STANDARD.md` Part 2:
_"A statement that narrows the probe surface may be accepted on anyone's word. A statement that
widens it must come from the tool."_ Probing a subcommand is a widening claim, so the warrant reads
`provenance: "emitted"` and nothing else.

**One refinement the rule implies and is worth stating.** The same field is admissible in one
direction and not the other, depending on its **value**. A `modelled` `read_only` widens and must
be refused as a warrant; a `modelled` `non_idempotent` only removes probes, and the rule's own
gloss admits it — _"an unfalsifiable field is admissible exactly when the only thing it can do is
remove probes and withdraw verdicts."_ So a caller's declaration can still make the kit do
**less**, which is worth having and costs nothing.

- [ ] `classifyInertness` gains a class that opens only on: `emitted` provenance, a `read_only`
      claim at that exact path, and an argv that is the declared path tokens plus tokens the
      existing classes already admit. It fails closed like the other four.
- [ ] The four existing classes are not weakened. `help-path` keeps requiring every token to be a
      help or format token, so `mycli deploy --help` still refuses **under the old class** and runs
      only under an explicit warrant.
- [ ] `captureSurface` reads rejections at warranted paths, and `PathSurface` carries more than one
      member.
- [ ] The report distinguishes a path not compared because the kit cannot reach it from one not
      compared because no warrant was given — those are different sentences with different remedies,
      and item 2a has already made it a three-way distinction by adding _the caller recorded nothing
      here_.

**Blocked on the decision above, and no longer blocking anything else.** Everything in this item is
mechanism; none of it says the mechanism should be pointed at a stranger's binary. What changes
under the amendment is that this item stops being the bottleneck for **every** below-root result —
item 2a delivers those — and becomes what it always was on its own terms: the machinery for the kit
running a target's subcommand on the target's say-so, for callers who do not own the tool and
cannot record its surfaces themselves.

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
- [ ] Also request, or reconstruct, **grapevine's recorded root enumeration**. The differ needs a
      `PathSurface`, and a recorded observation serves as well as a binary. They have offered to
      capture and send one **once the exact shape is specified** — which is [item
      2a](#2a-recorded-surface-ingestion)'s first checkbox, so specifying that shape is now on this
      round's critical path rather than a later convenience.
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
  gate, which would invalidate that frame. So **`effects` goes in the declaration file and never in
  `acc.config.json`, and `TOP_LEVEL_KEYS` does not move.**
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
- **`classifyInertness` keeps failing closed**, and `assertInert` keeps throwing. A new class adds a
  door; it does not widen the four that exist.
- **anthill's `1 of 25` is guarded in-tree, and items 2a and 2 both change it.** That test's
  expectation moves as soon as any path below the root is compared — by recorded surface or by
  probe. It must be **re-baselined deliberately, with the new number argued** — silently updating
  the assertion would delete the only in-tree record of the ceiling. And the re-baselined test must
  say **which** kind of evidence moved it, or the record loses the distinction item 2a exists to
  keep.
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
  pattern that errs the right way, and that basis grows the moment item 2 lands. The interim
  commitment already on the record stands — if the widening is declined, both specimens go into the
  code comment so the next reader inherits the evidence rather than the conclusion.
- **Modelled declarations.** Deferred, and the "it dissolves" reasoning is **half right**, which is
  worth writing down because the residue is the interesting part. Today a modelled declaration buys
  zero comparison for the verb-first population. After item 2, it buys comparison **only where an
  emitted declaration has already marked a path read-only** — because the warrant is a widening
  claim and a caller cannot make one. So the limit does not vanish; it changes shape into something
  slightly perverse: a modelled declaration becomes useful exactly on the tools that had least need
  of one. Do not build modelled-specific machinery now. Re-measure the claim after item 2, and
  record the residue as a real limit rather than a leftover. **Item 2a changes this and the change
  is worth stating**: a recorded surface is an observation, not a widening claim, so a caller who
  owns the tool can compare a **modelled** declaration below the root without any warrant at all —
  which is exactly how `SG-8` gets run against bounty. The residue named above survives only for
  callers who cannot record surfaces themselves. The other exit remains roadmap step 3's sandbox —
  the same undecided decision named above.
- **Feeding the census into `conformant`.** Not proposed by the adopter, not done by the fix that
  answered `SG-4`, and not reopened here. The kit cannot tell which side of a disagreement is wrong,
  and a verdict that requires knowing would be a guess wearing a rule id.
- ~~**Running the `SG-8` prediction.**~~ **Moved into this round**, and this is the amendment's whole
  payoff. The old entry deferred it because item 2 was thought to be what made it runnable; item 2a
  makes it runnable without executing anything, so it runs here — see
  [item 2a](#2a-recorded-surface-ingestion). The pre-registration constraint is unchanged and now
  actually enforceable: roughly 17 of 21 `accepted-not-declared` for bounty's `state`, run **before**
  anything in the differ is tuned against it, or the registration is worth nothing.
- **The portable declaration IR** ([roadmap 6](../roadmap.md#6-the-portable-declaration-ir)).
  Larger, and blocked on roadmap steps 2 and 5.

## What a second application would, and would not, establish

**Would.** Whether the emit–generate–check loop is reproducible by a second implementer on a second
tool — the thing `n = 1` cannot say. Whether an implementer can answer an effects claim per command
without losing a design pass to it, which is the cost this round is asking adopters to pay. Whether
a caller-recorded surface is something a second adopter can actually produce, or whether the shape
is only obvious to the person who wrote the differ.

**No longer on this list, because the amendment moved it into this round.** _Whether a below-root
census finds real drift._ `SG-8` is run in step 4 of the sequencing, against bounty, on a recorded
surface — so the answer arrives before the second application rather than out of it, and the second
application inherits the result instead of the question.

**Would not.** `n` goes from one to two, which is not a population. A second tool built to be
checkable says nothing about a tool that was not — the first report already names that limit and
this round does not touch it. Nothing here establishes that an effects claim is **true**: the
sandbox is what would, it is not built, and so a second application would rest on an unfalsified
claim by design rather than by oversight. Nothing is learned about the tools that emit nothing at
all. And the charter's fourth question still needs drift **across releases**, which one session
cannot see — `STANDARD.md`'s own "Stability" row says a single run cannot see across releases, and
that applies to this project's evidence as much as to a target's claims.

One more, because it is this round's own doing: without item 3, a second application cannot
re-verify the first. That is the difference between two data points and one data point plus an
anecdote.

## If you have already adopted the standard

Written for the implementer who did the first application, and for anyone in the same position.

**Your existing declaration keeps working.** No field you emit today changes meaning, and nothing
you emit today becomes invalid. **Route A is chosen**, which means your emitter changes zero bytes
until you decide to claim effects — that was your call to make and you made it.

**Your census does not move on its own.** It stays at `1 of 33` until you either add an effects
claim per command path or hand the kit surfaces you recorded yourself. Neither act is the same as
being probed.

**The cheapest route below the root, and it needs nothing from item 1.** Run your own tool at the
paths you care about, capture the per-path rejections, pass them in with your declaration
([item 2a](#2a-recorded-surface-ingestion)). The kit executes nothing, claims nothing about safety,
and labels the surfaces as **recorded by you** rather than probed by it. If your tests already spawn
the binary, the capture is work you have mostly done.

**What you would add.** One value per command path, from the same registry your parser, dispatcher,
root rejection and emitter already walk — the shape `spec.ts` already has for this CLI's own
commands. If your registry is the single structure the first session made it, this is one field on
each entry and one line in the emitter.

**What it buys you.** The paths you mark read-only become comparable, and the drift `SG-8` predicts
becomes visible in your own tool by your own emission rather than by somebody's model of it.

**What it costs you, stated plainly.** You would be making a widening claim that nothing can
falsify, about a tool where `close` deletes a message log and `reset` clears it. That is why the
step change is [a decision with its own record](#the-decision-this-plan-does-not-make) rather than a
box inside item 2, and why your tool is the worked example in it — kept there at your own request.
Related, and the reason the plan asks for a second axis: `read_only` alone does not make a command
safe to probe, because `tail` and `wait` are read-only and unbounded, and a probe that hangs is its
own failure. And a third class you named that neither axis covers: `watch` writes nothing of yours
and opens a browser on **the operator's** machine, which is still something the command causes.

**The ask is answered, and what is outstanding is smaller.** The break variants, the clean emission
and the four `.declaration.json` files are granted; what remains is one recorded root enumeration
for grapevine, in a shape this plan owes you — [item 2a](#2a-recorded-surface-ingestion) specifies
it, and it is sequenced early for that reason.

## Sequencing

**Amended on the consumer's review**, and the amendment is the substance of this revision rather
than a reshuffle. The old order put every below-root result behind the safety decision, because it
treated "compare below the root" and "execute below the root" as one step. They are two, and only
the second needs the decision.

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
5. **Item 1**, on route A, with the ratchet written in.
6. **The decision page** — now written by people who have read below-root census output.
7. **Item 2**, the probe warrant, unchanged and still last.

**Item 5** has no ordering constraint.

**What the order is buying, stated plainly so it can be argued with.** Steps 3 and 4 move the only
thing this round can learn that a second application could not — real below-root drift — in front
of the decision that would otherwise gate it, at the cost of the census depending on evidence the
kit did not observe itself. That cost is paid with a label, not with a verdict, because the census
reaches none.

## Open, and not decided here

Five questions this plan flagged were closed by the consumer's review, and are recorded at their
items: **the version route** (A, with the ratchet — item 1), **`effects` optional** (yes, plus a
coverage count in the report — item 1), **the fixtures** (granted, with two caveats — item 3), the
**fourth legend mark** (no; name the clause and reuse it verbatim — item 5), and **the shape a
caller supplies a recorded surface in** (raw, observation-shaped records — item 2a). Keeping
grapevine as the worked hazard example was endorsed and sharpened into three hazard classes.

Still open:

- Everything named under [the decision this plan does not make](#the-decision-this-plan-does-not-make),
  which item 2a defers rather than answers.
- Whether the warrant is per command path or per command **path plus argv class**, which is the
  narrower and probably safer shape and costs more to declare.
- **What a caller can get wrong invisibly**, now that the shape is settled — item 2a names
  truncation, merged streams and an unidentified binary, and says the record must let a caller
  declare the loss. Which fields do that, and what the report prints when they are unstated, is not
  decided here.
- **Whether the coverage count belongs anywhere else.** _"Effects declared on 14 of 33 paths"_ is
  the same move as _"1 of 33 compared"_; whether recorded-versus-probed coverage wants its own
  number is an item-2a question that only real output will settle.
