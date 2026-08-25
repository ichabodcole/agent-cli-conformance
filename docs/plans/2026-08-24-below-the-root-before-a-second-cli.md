---
type: plan
generated: { by: claude-opus-5, at: 2026-08-24 }
status: draft
lifecycle: live
description:
  What has to land before this standard is applied to a second CLI. The census only ever compares
  the root, and lifting that ceiling runs through a chain — probe below the root, which needs a
  read-only claim, which the declaration format has nowhere to put.
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

### It is blocked by a chain, and the chain is one thing

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

---

## The decision this plan does not make

**Probing below the root is the first time `acc check` would execute a subcommand on a target's
say-so.** Everything the kit does today is a help path, a version request, or a deliberately
malformed argv that fails at parse. That is a step change in what this tool does to a machine, and
it is not a step inside an implementation item.

It gets **its own decision page** in [`../wiki/`](../wiki/SCHEMA.md), taken before
[item 2](#2-a-probe-warrant-below-the-root) is built. What has to be settled:

- **What an effects claim licenses, exactly.** Which argv, at which paths, under which classes. A
  `read_only` claim about `send` is not a claim about `send --acc-probe-xyzzy-flag`, which is an
  invocation the tool's author never considered.
- **What happens when it is wrong.** There is no undo and no rule that fires. The worked example
  is the adopter's own tool: grapevine's `close` deletes the message log, `reset` clears it, `reap`
  kills daemons. A wrong `read_only` on any of those costs somebody their data, and the kit's
  report would say a probe ran and nothing else.
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

**Nothing here resolves any of that.** Items 1, 3, 4 and 5 below are unblocked by it; item 2 is
not, and is written to stop at the boundary.

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
      inherited from it.
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

**Lean: A**, because the safety property holds in both directions — an old reader refuses a new
document, a new reader reading an old document finds no claim and therefore widens nothing — and
because the whole cost of B is paid to describe a change that no reader can act on without item 2
anyway. **This is the single item the consumer should push hardest on**, and it is marked open
rather than settled.

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
      compared because no warrant was given — those are different sentences with different remedies.

**Blocked on the decision above.** Everything in this item is mechanism; none of it says the
mechanism should be pointed at a stranger's binary.

### 3. Regression fixtures from the first application

**The gap, stated exactly.** The four deliberately-broken variants live in the Spellbook repository
at `docs/investigations/2026-08-24-grapevine-drift-experiment/` and are not reachable from this
checkout. Nothing here guards a census regression against the only tool ever built to this
standard.

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

- [ ] **Request**, with attribution and a clear ask: the four `.patch` files, the four broken
      `.declaration.json` emissions, and the clean emission. Of those, **the declarations alone are
      enough to guard the differ** — `diffDeclaration` is pure and takes a declaration and a
      recorded surface — so the ask can be small if the large one is unwelcome. It is their
      repository and their call; ask before vendoring anything.
- [ ] Also request, or reconstruct, **grapevine's recorded root enumeration**. The differ needs a
      `PathSurface`, and a recorded observation serves as well as a binary.
- [ ] **Reconstruct in parallel**, because the request has lead time and may be declined: a fixture
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
`{ command: string; when?: string }`, and seven command modules emit it. One of them already
interpolates a value into the string (`path.ts` builds `acc show ${to.slug}`); the value is internal
and the shape is the one the standard warns about.

So the reference implementation does the thing its own standard tells adopters not to do. That is
tolerable while nobody has read the page, and this round is precisely the round where a second
adopter reads it.

- [ ] `NextAction` carries an executable and an argv array.
- [ ] Seven emit sites move with it, and the
      [error-envelope concept page](../wiki/concepts/error-envelope.md) stops describing the
      typed version as an intended direction.
- [ ] `acc schema`'s own output changes shape, which is consumer-visible — the same versioning
      question as item 1, arriving on a different artifact.

### 5. A mark for "the kit does this, deliberately, and not as a rule"

`STANDARD.md`'s legend carries three marks — `[C]` checked today, `[C?]` checkable and unbuilt,
`[—]` unestablishable from outside. The declared-versus-accepted census fits none of them. It ships
today, it runs on every `--declaration` run, and it is deliberately not a rule: it mints no id,
feeds no verdict, and reports a disagreement as two readings because nothing can tell which side is
wrong. It currently sits under `[C?]` with a four-line clause explaining that it is not `[C]`.

The clause is correct and it is carrying a mark's worth of meaning in prose, in a page whose legend
preamble says blurring these distinctions _"would be dishonest"_.

- [ ] Add a fourth mark for **shipped, and deliberately not a rule**, and use it where the clause
      currently stands.
- [ ] The population is at least two: the census, and the self-declared-flags surface capture,
      which the report also labels _"Evidence, not a rule"_.

**The objection, recorded rather than dodged.** Two claims is a thin population for a new mark, and
the page has a precedent that runs the other way: the `In v0` axis was added as a **column**, not a
mark, on the argument that the three marks are one axis. The counter is that this is the same axis
with a value the three do not cover — measured, reported, and binding nothing — rather than a
second axis. If the reviewer prefers the column precedent, the fallback is to name the clause once
and reuse the phrase verbatim everywhere it applies.

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
- **anthill's `1 of 25` is guarded in-tree, and item 2 changes it.** That test's expectation moves
  when below-root probing lands. It must be **re-baselined deliberately, with the new number
  argued** — silently updating the assertion would delete the only in-tree record of the ceiling.
- **Grapevine's conformant result and its census are not on this list**, because they cannot be:
  see item 3. Until fixtures exist, the only guard is the consumer re-running against their own
  tree.

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
  record the residue as a real limit rather than a leftover. The only other exit is roadmap step 3's
  sandbox — which is the same undecided decision named above.
- **Feeding the census into `conformant`.** Not proposed by the adopter, not done by the fix that
  answered `SG-4`, and not reopened here. The kit cannot tell which side of a disagreement is wrong,
  and a verdict that requires knowing would be a guess wearing a rule id.
- **Running the `SG-8` prediction.** Item 2 makes it runnable; running it is the next round's
  measurement, not this one's work. It is **pre-registered and falsifiable in advance** — roughly 17
  of 21 `accepted-not-declared` for bounty's `state` — so it must be run before anything in the
  differ is tuned against it, or the registration is worth nothing.
- **The portable declaration IR** ([roadmap 6](../roadmap.md#6-the-portable-declaration-ir)).
  Larger, and blocked on roadmap steps 2 and 5.

## What a second application would, and would not, establish

**Would.** Whether the emit–generate–check loop is reproducible by a second implementer on a second
tool — the thing `n = 1` cannot say. Whether a below-root census finds real drift, with `SG-8` as
the pre-registered test rather than a post-hoc reading. Whether an implementer can answer an effects
claim per command without losing a design pass to it, which is the cost this round is asking
adopters to pay.

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
you emit today becomes invalid. Under route A of item 1 your emitter does not change at all; under
route B you change one string. That choice is open, it is the one thing here that touches your code
without your asking, and your objection to it should land before it is made.

**Your census does not move on its own.** It stays at `1 of 33` until you add an effects claim per
command path. Adding the field is not the same act as being probed.

**What you would add.** One value per command path, from the same registry your parser, dispatcher,
root rejection and emitter already walk — the shape `spec.ts` already has for this CLI's own
commands. If your registry is the single structure the first session made it, this is one field on
each entry and one line in the emitter.

**What it buys you.** The paths you mark read-only become comparable, and the drift `SG-8` predicts
becomes visible in your own tool by your own emission rather than by somebody's model of it.

**What it costs you, stated plainly.** You would be making a widening claim that nothing can
falsify, about a tool where `close` deletes a message log and `reset` clears it. That is why the
step change is [a decision with its own record](#the-decision-this-plan-does-not-make) rather than a
box inside item 2, and why your tool is the worked example in it. Related, and the reason the plan
asks for a second axis: `read_only` alone does not make a command safe to probe, because `tail` and
`wait` are read-only and unbounded, and a probe that hangs is its own failure.

**And an ask.** The four break variants and the clean emission from your drift experiment, or as
little as the four `.declaration.json` files if the rest is inconvenient. Nothing in this checkout
can reproduce your result — the released build we can reach has no `schema` verb — so those
artifacts are currently the only thing standing between the census and a silent regression against
the one tool ever built to this page.

## Sequencing

1. **Item 4** first. It needs no decision and no one else, and it is the item that stops the
   standard's reference implementation contradicting the standard while a second adopter is reading
   it.
2. **Item 3's request** goes out on day one regardless of everything else, because it depends on
   another person's time and must land before the census changes shape.
3. **Item 1**, once the version route is chosen.
4. **The decision page**, then **item 2**.

**Item 5** has no ordering constraint.

## Open, and not decided here

- The version route in item 1 — A or B, and whether roadmap step 2 has to move first.
- Everything named under [the decision this plan does not make](#the-decision-this-plan-does-not-make).
- Whether the warrant is per command path or per command **path plus argv class**, which is the
  narrower and probably safer shape and costs more to declare.
- Whether a fourth legend mark is right, or whether the `In v0` column is the precedent to follow.
