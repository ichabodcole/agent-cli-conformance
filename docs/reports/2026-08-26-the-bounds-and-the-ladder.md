---
type: report
generated: { by: claude-fable-5, at: 2026-08-26 }
status: stable
lifecycle: live
description:
  The kit's bounds are three separate lines — authority (what it may cause to execute),
  observability (what any run can conclude), and meaning (what may be inferred without a
  declaration) — conflated today by the L0/L1/L2 probe-level ladder. Recommends dissolving the
  ladder into evidence provenance, the argv inertness classes, and per-path accounting, then
  checks the result against the 2026-08-26 three-adopter survey.
tags: [probe-level, conformance, guidance, evidence, declaration, adoption]
subject:
  what classes of question this kit can answer, where it provably stops, and whether the
  L0/L1/L2 ladder survives
examined:
  acc at cd22adf on `develop`; code claims re-verified at 983b0b2 after the probe-plan generator
  landed. Every cited document was re-read in this tree; grapevine and bounty census figures are
  reported-not-verified, as their sources state.
---

# The bounds, and the ladder

This report answers a commissioned brief — untracked working material in `.scratch/`, so it is
not cited as a source; its question is restated here. The owner's framing, which drives the
analysis: _"this project can't go beyond these bounds, it can't answer certain types of
questions. So then the question is, well, what can it answer, where can it be helpful?"_ Map the
bounds first — not "how do we get further" but where this stops, provably, and what is worth
building inside the line. And examine one suspect directly: whether the three-rung probe-level
ladder in [probing](../wiki/concepts/probing.md) is the wrong frame.

The [addendum](#addendum-read-against-the-three-adopter-report) reads the analysis against
[what three adopters want](./2026-08-26-what-three-adopters-want.md).

**Verdicts up front:**

1. The project's bounds are three different lines that one word — "level" — has been holding
   together: an **authority line** (what the kit may cause to execute), an **observability line**
   (what any run can conclude), and a **meaning line** (what may be inferred without a
   declaration). Drawn separately, each is already settled or settleable; fused, they produce the
   questions that will not stay answered.
2. **The ladder should be dissolved, not replaced.** Not into the
   [warrant/reach/hazard schema](./2026-08-24-wrong-primitives-in-acc.md) —
   into three things the tree has already built and measured: evidence provenance, the argv
   inertness classes, and per-path compared/not-compared accounting. One small typed addition
   (a reason on `unverified`) covers what `probe_level` was actually doing in code.
3. The probe axis ("what may be sent") is answered, and the answer is structural rather than
   evidential, so treat it as permanent-with-a-stated-bar. The declaration axis ("what may be
   said") is open, and it is where the whole remaining product lives.
4. Guidance crosses both walls tooling cannot, and the measured way it does so is by shipping
   the in-repo check the adopter can run with their own authority —
   [B4](../wiki/rules/streams/output-is-delivered-whole.md)'s drain gate is the existence proof.
5. Five questions for the adopters, one question deliberately not asked, in §5 — most of them
   since answered by [the adopter survey](./2026-08-26-what-three-adopters-want.md); the addendum
   says which.

---

## 1. The bounds, drawn explicitly

### The authority line — what the kit may cause to execute

**Kit-side execution stops at the root, on the four fail-closed argv classes in
[`inert.ts`](../../src/acc/kit/inert.ts) (`help-path`, `sentinel`, `no-verb`, `bare`), and goes
no further on the target's say-so — ever.** The reasoning is structural, not evidential, which is
why it should be treated as a wall rather than a backlog item: the subject of the check cannot be
the source of the execution-safety assertion (provenance says _who_ asserted, never that the
assertion is _true_), and containment reduces consequences without granting authorization
([the decision](../plans/2026-08-24-below-the-root-before-a-second-cli.md#the-decision-and-it-is-now-a-decision-not-to-build)).
The adopter who did
[the first outside application](./2026-08-24-first-outside-application-grapevine.md) corroborated
it from the other side: _"the operator who could grant the warrant could always just run the
tool. The warrant moved invocation choice, not access."_

**What sits just inside the line:** everything the kit does today, plus below-root _census_ on
recorded surfaces — because the differ is pure and ingestion executes nothing. This is measured,
twice: [the drift trial](./2026-08-24-first-drift-trial-anthill-manifest.md) hit its
pre-registered 8-of-8 and 0-of-0 exactly with no kit execution, and
[the magpie trial](./2026-08-26-the-magpie-trial.md) closed the loop on a second tool
(289 disagreements → fix → 0, with a control run). Below-root coverage is therefore **not** out
of bounds; only kit-initiated below-root _execution_ is.

**What sits just outside:** the kit choosing invocations that run a verb. The bridge across the
line is probe-plan generation, shipped as `acc probe-plan`
([design record](../plans/2026-08-26-the-probe-plan-generator.md)): the kit picks the argv, the
operator supplies the authority, ingestion takes the result back. The residue that even this
cannot reach honestly: on a lenient parser that violates
[A1](../wiki/rules/parsing/unknown-flag-exits-nonzero.md), the rejection probe _runs the verb_,
and those are exactly the tools the census most needs. That hazard moved to the operator; it did
not vanish, and the plan format is what carries it.

### The observability line — what any run can conclude, with any authority

[`STANDARD.md` § "Nothing outside can check it"](../../STANDARD.md#nothing-outside-can-check-it)
is the honest list and it held up under re-reading: effects, exit-code ownership, absence claims,
semantic honesty of a value, stability across releases, truncation without a declared whole,
silent-EOF versus hang. These are not authority-limited — executing the command does not decide
them. A sandbox moves exactly one row (effects) and nothing else does; the sandbox is unbuilt
and, per the decision, would still not authorize anything by itself.

Two measured facts sharpen this wall:

- **The mutation ceiling is the actual gap.** One trial — against anthill's 25 declared command
  paths — reached run-time behaviour for 4 of 25 commands; every mutating command's declaration
  is unverified. The commands that matter most are
  the ones that change something, and they sit behind _both_ walls at once — authority (someone
  must choose to run them) and observability (their effects are the thing argv and streams
  cannot see). No kit design change moves this. Operator-run plans plus the adopter's own test
  suite are the only routes that exist.
- **The census has a structural blind spot inside its own territory.** Following `D1` advice
  added a root-level `--version` that the per-path parser refuses, and the census cannot see it —
  confirmed by the adopter with two controlled declarations. So even at the root, "compared"
  does not mean "seen whole." Whether this is one instance or a family: the addendum records a
  second member — see §6.

### The meaning line — what may be inferred without a declaration

The [admission test](../wiki/concepts/probing.md#what-l0-may-assume--the-admission-test) —
mechanical checks only; if a rule must work out what one of the target's own words _means_, it is
out — is the best-supported boundary in the project: seven attempts to make a spelling inference
safe each failed before the test was written down. Inference may select what to look at; only observation
may condemn. The only thing that crosses this line is a falsifiable declaration, and falsifying
an assertion is sound wherever evidence exists.

### So: the classes of question, named

**The kit can answer, from argv, streams and exit codes alone:**

- Mechanical root contract: crashes on inert paths, hangs with stdin closed, stream discipline,
  ANSI in a pipe, exit-code determinism, help mechanics.
- **Falsification of any declared, observable claim, at any path for which evidence exists** —
  where below-root evidence is operator-recorded and labelled as such. The evidence trail is the
  product: who observed what, and what was not observed.
- **Drift**: declaration versus behaviour, over time, with a closed remediation loop. Both trials
  are this class.
- **Fleet visibility**: two declarations diffed against each other need no execution at all.
  This is [the charter](../../CHARTER.md)'s own answer to the owner's original complaint, it is
  entirely inside every wall, and it is currently unrepresentable — the report is welded to a
  population of one
  ([WP-F8](./2026-08-24-wrong-primitives-in-acc.md#wp-f8-the-report-is-a-_measurement_-and-a-_judgement_--and-it-is-welded-to-a-population-of-one);
  [the eight-CLI run](./2026-08-24-eight-owner-clis.md)'s divergences were invisible to all 23
  rules). This is the highest-value in-bounds thing not built, and the attachment is a
  measurement, not a theory.

**The kit provably cannot answer:**

- Anything requiring it to execute a verb (authority — permanent on the target's say-so, bridged
  only by the operator).
- Anything on the "nothing outside can check it" list (observability — permanent for effects
  short of a sandbox that someone separately authorizes; permanent outright for stability,
  ownership, absence, semantic honesty).
- Anything requiring the meaning of the target's own vocabulary without a declaration (meaning —
  permanent; the enumeration never closed and will not).
- One instrument-shaped hole that no level or declaration touches:
  [B4](../wiki/rules/streams/output-is-delivered-whole.md)'s defect cannot manifest against the
  kit's own draining pipe. The blocker is the runner. Worth remembering as the proof that
  "instrument limits" are a real category distinct from all three lines.

---

## 2. The ladder: dissolve it

### The case, assembled from the tree

Five facts, each verified at HEAD:

1. `L1`'s only definition is the table row in [probing](../wiki/concepts/probing.md); its premise
   ("declared read-only" as an execution boundary) was repudiated on 2026-08-24 and the
   repudiation was accepted by the owner and corroborated by the adopter.
2. The repudiating decision lives in
   [a plan](../plans/2026-08-24-below-the-root-before-a-second-cli.md), which itself says a wiki
   decision page is owed. `docs/wiki/decisions/` has no such page.
3. **The rung classifies nothing, and the code at HEAD shows it.** Three rules sit at `L1` for
   three unrelated reasons: [A4](../wiki/rules/parsing/unexpected-positionals-rejected.md)
   (hazard — no inert probe exists),
   [B3](../wiki/rules/streams/machine-output-is-parseable.md) (warrant — waits on a declaration),
   and [B4](../wiki/rules/streams/output-is-delivered-whole.md) (instrument — its own page says
   **no probe level fixes it**). And four rules with one reason sit on two rungs: A3, B5 and D1
   wait on a declaration for exactly B3's reason and are `"L0"`, while
   [`report.ts`](../../src/acc/kit/report.ts) branches on `LEVEL_RANK[probeLevel]` alone
   (line 614 at `983b0b2`) — so the identical fact, "no declaration exists", is reported as
   `notApplicable` for B3 and `applicable`+`unverified` for the other three
   ([WP-F1](./2026-08-24-wrong-primitives-in-acc.md#wp-f1-probe_level-fuses-_hazard_-with-_warrant_-and-leaks-into-_reach_)).
4. [The charter](../../CHARTER.md#what-this-calls-into-question) names the conflation
   (declaration-content axis versus probe-send axis) and says the one unacceptable outcome is the
   split surviving because it is written down.
5. **The vocabulary fork is total: `STANDARD.md` itself contains zero occurrences of "L1"** (measured with `LC_ALL=C grep -ac`, in this tree). Both trial reports,
   [the grapevine application](./2026-08-24-first-outside-application-grapevine.md),
   [the batch spec](../plans/2026-08-25-the-recorded-surface-batch.md) and
   [the guide](../wiki/guides/how-to-record-surfaces-below-the-root.md): zero. The working
   vocabulary is "below the root" plus provenance. What still says "L1" is `probing.md`, rule
   frontmatter, the code enum, and pre-08-24 strategy prose.

The [pre-1.0 bar](../wiki/decisions/pre-1-0-while-the-design-moves.md#the-left-column-can-still-be-broken-and-this-is-the-bar)
is met on its own second condition, verbatim: _"decided before the consumer signal existed, and
the signal has since arrived and disagrees."_ And the cost is low by the project's own contract:
`probe_level` sits in the unstable right-hand column of that decision (report shape, config
vocabularies); rule ids are untouched. Per that page, this is discussed before done — this report
is the discussion input, not the edit.

### The warrant/reach/hazard proposal, assessed rather than assumed

[The wrong-primitives report](./2026-08-24-wrong-primitives-in-acc.md) is the strongest single
analysis in the tree, and it should **not** be built as proposed. Three reasons, the first from
its own text:

- **It half-retracts each primitive itself.** Hazard "is unknowable from outside, and what we
  actually have is argv-class, a proxy"; `stipulated` may collapse into `declared` ("the
  primitive I hold least firmly"); reach covers "perhaps two-thirds of today's coverage_gaps."
  Its own score is 5 dissolved, 5 trivial, **7 untouched**.
- **It is argued, never measured.** The project has had theory reversed by an outside read twice
  and by an adopter running the thing once. A seven-primitive schema adopted from an ontology
  paper is design-from-theory in exactly the shape that got reversed.
- **The renaming trap.** `probe_level: "L1"` → `warrant: "declared"` carries the same two axes
  under a fresher word and reads as progress. The brief's constraint is right: worse than
  leaving it.

**But the proposal's real content has already shipped, piecewise, under consumer pressure — which
is the measurement the schema never got:**

| Primitive | The measured fragment already in the tree                                                                                        |
| --------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Warrant   | `probed-by-kit` / `recorded-by-caller` provenance on every path result; `emitted` / `modelled` on declarations                   |
| Hazard    | The four fail-closed argv classes in [`inert.ts`](../../src/acc/kit/inert.ts), correctly documented as classification-not-safety |
| Reach     | Per-path `compared` / `not-compared`-with-reason accounting ("1 of 25, and the other 24 say why")                                |

So the recommendation is: **dissolve the ladder into those three existing things, and adopt the
one change the wrong-primitives report itself puts on its "keep" list — a typed reason on
`unverified`** (`no-probe-sendable` / `nothing-declared` / `evidence-void` / `no-instrument`).
That reason is what `applicable` should read instead of `LEVEL_RANK`; every sentence it needs
already exists on the rule pages. A4 becomes "no inert probe exists — verify via recorded
surfaces or a probe plan." B3 becomes "waits on a per-command `output_kind` declaration." B4
becomes "instrument limit — the runner's pipe cannot exhibit the defect." Those are the true
statements the ladder was rounding into one enum, and none of them is a level.

**What not to do:** do not build L2, the sandbox, or any primitive schema until a consumer asks
for a distinction the current fields cannot express. No adopter has asked for a level; the
adopter who went furthest shipped full coverage with zero warrant machinery. (Honesty note: this
dissolution recommendation leans on the same untested analysis it declines to build. The
difference is deliberate — it recommends only the fragments that consumers already exercised.)

**The concrete edits, in order of cheapness:**

1. **Write the owed decision page** (below-root execution: not built; the subject-assertion
   argument; the four-part reopening bar plus operator opt-in). Pure filing — the decision is
   already made and accepted; only its address is wrong. Do this regardless of everything else.
2. Replace the `LEVEL_RANK` branch in `report.ts` with the typed `unverified` reason; retire
   `probe_level` from frontmatter, `spec.ts`, and `types.ts`. Rule ids and `conformant` do not
   move.
3. Rewrite `probing.md`'s table into the two axes (§3 below). The admission test — the page's
   actual load-bearing content — is unaffected and stays.
4. [`roadmap.md`](../roadmap.md)'s three `L1` mentions get re-worded to name what they actually
   wait on (a declaration format; a sandbox decision).

---

## 3. The two axes, separated

**Axis 1 — what a probe may send.** Answered, and the answer has no ladder in it:

> The kit sends root-level argv in the four inert classes, fail-closed, and nothing else.
> Everything below the root is sent by the operator — optionally from a kit-generated plan that
> carries the hazard per record — and returns as recorded evidence with its provenance on it.

The "on the target's say-so, ever" clause should be treated as permanent, because it rests on an
argument about the structure of authorization, not on missing machinery. What keeps it honest
rather than dogmatic is the written reopening bar (named users + workflow failures plan
generation cannot fix + threat model + containment, **plus** operator opt-in even then). Nothing
in the tree comes near that bar; the population requiring unattended third-party below-root
probing is empty as measured — no such user appears anywhere in the tree, an absence rather than
a proof (§6). The only live residue on this axis is
[roadmap step 3](../roadmap.md#3-control-the-observation-environment-which-is-also-the-l0-safety-work)'s
independent question — whether a sandbox is worth building on its own merits — which is a
containment question, not a rung.

**Axis 2 — what a declaration may say.** Open, and it is the product. What remains of it once
axis 1 is fixed:

- **Any falsifiable claim about observable behaviour at a named subject** (path × channel) is
  admissible, from anyone, with provenance (`emitted` beats `modelled` on every field it speaks
  to; disagreement is reported, not resolved).
- The
  [narrowing/widening asymmetry](../../STANDARD.md#where-the-declaration-lives-and-who-may-say-what)
  survives, with lowered stakes worth noticing: a widening claim no longer licenses kit
  execution — at most it changes what a _plan_ proposes and an operator decides. It still
  matters, because operators run plans mechanically; the per-record warning is what puts the
  hazard's cost in front of them.
- **Effects gets no field** until a concrete consumer with a testable semantic contract exists —
  already decided, and the standard's withdrawal of the record-it-inert advice is right: an
  inert field lends its names apparent authority.
- The measurement this axis owed has been run, and it answers yes: **a modelled declaration is
  useful below the root.** The pre-registered `SG-8` prediction — a modelled declaration diffed
  against recorded surfaces of bounty's `state`
  ([the plan, item 2a](../plans/2026-08-24-below-the-root-before-a-second-cli.md#2a-recorded-surface-ingestion)) —
  [hit on both numbers on 2026-08-26](./2026-08-24-first-outside-application-grapevine.md#outcome-2026-08-26--hit-and-re-derived-here-rather-than-transcribed):
  18 `accepted-not-declared` of 22 against a registration of roughly 18, and 0 in reverse — run
  by the adopter on their side and re-derived from the vendored fixtures in this tree. The
  caveat travels with it, as the outcome itself states it, asserted rather than proven: the
  differ changed once after the bytes were vendored (a denominator fix that moved no finding),
  and a pre-registered result is worth its registration only if nothing was tuned against those
  bytes. _Correction: an earlier revision of this bullet called the measurement "owed" and
  "found nowhere in the tree"; the outcome was already recorded at this report's base commit.
  A wrong claim about what the tree holds, caught by a reader — this project's own defect
  class, in the report about its bounds._

---

## 4. Where guidance goes that tooling cannot

The boundary, stated as a rule rather than a list: **tooling stops where the kit's authority or
observability stops; guidance continues past both, and where it continues it should ship the
in-repo check the adopter can run with authority the kit will never have.**

That last clause is the measured part, and
[B4](../wiki/rules/streams/output-is-delivered-whole.md) is the existence proof: the costliest
defect class in [the archaeology](../research/2026-08-15-defect-archaeology.md) (six fixes, the
corpus's only rework, a false _organizational_ rule published off a truncated payload) is
unreachable by any probe level on the current runner — and the rule page ships the
`sh -c "… | ( sleep 1; cat )"` drain gate plus the exit-site enumeration that actually held
(37 pinned sites). The adopter's repo has what the kit lacks: authority to run mutating verbs,
containment (their own data, their own machine), and the missing declaration (they know what the
whole payload was). Every "nothing outside can check it" row is checkable from _inside_ to some
degree, and the guidance's job is to carry those recipes.

So the division of labour:

- **Tooling**: root mechanics; falsification of declarations against whatever evidence exists;
  drift; plan generation; ingestion; (unbuilt, in-bounds, highest-value) fleet-level declaration
  diffing.
- **Guidance backed by an in-repo pattern**: flush-before-exit and drain gates; effects
  discipline; exit-code ownership; envelope and stability commitments; termination; anything
  needing a mutating verb to run.
- **Guidance backed by evidence and judgement only**: design recommendations with reasons, in
  the standard's existing decline-with-a-reason frame.

Guidance's own bounds, stated so nothing here is confident without support: it is bounded by
evidence
(the charter's survey rule — outside grammars are subtractive evidence, not a population to
serve), and it will lag what it governs — measured at an order of magnitude on the one comparable
house-style document. Prefer a shorter, fully-supported page; prefer a check that fails to a
paragraph that advises. And the standard's central bet — that a declaration bound to code and
continuously falsified is different from the hand-authored formats that all died — remains the
first thing to try to falsify, with one trial in the owner's own tree so far.

---

## 5. What to ask consumers, and what not to

_Written before [the adopter survey](./2026-08-26-what-three-adopters-want.md) was read; the
addendum records which of these it answers._

The population is the named adopters plus the owner-as-adopter. These are interviews, not
surveys. Ask, in this order:

1. **"What would you want from us?"** — open, verbatim, first, before any of ours. (The owner's
   explicit instruction; do not pre-shape it.)
2. **Probe plans:** would you run a kit-generated plan against your own tool? Would you read a
   per-record hazard warning, or skim past it? The plan document itself says this answer decides
   whether moving authorization to the operator improved anything.
3. **The report:** which lines do you actually read, and what do you `jq` for? (Attaches to the
   measured complaint recorded in
   [the roadmap](../roadmap.md#the-report-says-everything-twice): ~40% duplication, `jq`
   mandatory.)
4. **The recording workflow:** where does run-it-yourself cost you something plan generation
   could not fix? This is the reopening bar's workflow-failure condition — failures plan
   generation cannot solve — asked as a workflow question: it lets the evidence for reopening
   arrive if it exists, without reopening anything by fiat.
5. **Modelled declarations:** was writing one for a tool you don't own worth it below the root?

And one confirmation, phrased to be answerable with "no": _is there any distinction you need
that "below the root" plus provenance doesn't carry?_ Their documents say no already; ask rather
than infer.

**Do not ask:** which primitives or report ontology to adopt (ours; consumers define concepts by
usage, not by ballot); what `read_only` should mean (no field is coming until a consumer arrives
with a testable contract — soliciting a meaning now manufactures the consumer); and do not ask
"would you let the kit run your subcommands?" as a permission question. Consent from an adopter
does not repair the subject-assertion argument — the decision's ground is who _authorizes_, and
the operator already can, via the plan. If a real need for kit-side execution exists, question 4
is where it will surface as evidence.

---

## 6. What this analysis could not determine

- **Whether the probe axis is closed "permanently."** The empty population is an absence in the
  tree, not a proof; that is precisely why the reopening bar exists and should be kept written.
- **Whether warrant/reach/hazard would survive contact.** Untested by anyone, including here. If
  the typed-`unverified`-reason plus existing provenance labels fail to answer the
  report-reading complaints, that failure is the first real evidence the fuller schema deserves.
- **The size of the census blind-spot family** (a root-level surface a per-path parser refuses).
  One instance confirmed here, adopter-verified with controlled declarations; the addendum
  records a second.
- **Grapevine's census numbers** are reported-not-verified in this checkout, as
  [the plan](../plans/2026-08-24-below-the-root-before-a-second-cli.md) itself states.
  Bounty's no longer are: the `SG-8` outcome is re-derived from the vendored fixtures in this
  tree (§3). The plan's regression-fixture item — vendor the granted break variants, reconstruct
  in-tree — is still open for grapevine.
- **Which report treatment is _correct_ for "nothing declared"** — B3's `notApplicable` or
  A3/B5/D1's `unverified`. No principle in the tree decides it; dissolving the ladder forces the
  choice. The lean here — all four become `unverified` with reason `nothing-declared`, since
  "not applicable" claims a scope judgement the kit has no basis for — is a design opinion, not
  a measurement, and should be settled on the decision page with the adopters' report-reading
  answers in hand.
- **Whether any of this changes the 23 rules themselves.** The charter's open question about the
  catalogue (reported failures and real defects disjoint so far) is untouched by everything
  above; the ladder's dissolution neither helps nor harms it.

---

# Addendum: read against the three-adopter report

**Added the same day**, after reading
[what three adopters want](./2026-08-26-what-three-adopters-want.md) — which answers, from three
adopters asked with no cross-contact (`trellis` — grapevine and bounty; `sable` — anthill;
`flint` — magpie), most of what §5 proposed asking. The analysis above was
written before reading it; this addendum records where that report confirms, upgrades, or
corrects it.

## Credibility of the report itself

The methodology is clean: identical questions, sent before this project's own ladder conclusions
were shared, no respondent saw another's reply, self-flagged limits preserved. Two of its claims
are corroborated in-tree without taking anyone's word: flint's D3 phantom-flag finding (`--json`)
is the second instance of the already-measured `MACHINE_FLAGS` false-positive risk — same
literal-list defect, different flag
([the roadmap](../roadmap.md)'s `D3 pass | help advertises --output` case) — and "none of them has
ever used the word `L1`" matches the grep behind §2's fact 5. Two caveats stay loaded: all three
respondents are agents whose humans have not ratified the answers, and sable's own warning —
three invested adopters will all vote to delete things; pruning enthusiasm is not license to cut
what is load-bearing for readers who never speak to us.

## What it settles

- **The ladder question is closed on every axis the pre-1.0 bar requires.** Internal disproof
  (unrefuted), owner license (charter), and now unanimous consumer signal by three independent
  routes — with the resolution the tree already implied: delete the rungs, keep something. But
  the unanimity is only on the deletion; **the three "keeps" differ**, and a redesign that reads
  "delete it" as the whole signal will lose whichever keep it was not looking at. trellis wants
  stable _names_ for boundaries in report sentences; sable wants `L0` kept as a _name_ for a real
  bundle the code reasons about; flint kept the _content_ — they read the blast-radius list
  before pointing the kit at magpie and checked the bare invocation because of it. The
  dissolution in §2 has to satisfy all three, and the decision page can now cite evidence rather
  than argument.
- **One correction to §2's ordering.** flint's sequencing risk: `L0` sits in the verdict line,
  the most-copied string the kit produces. The replacement wording should be decided _with_ the
  decision page, not left as a later edit — it propagates into CI logs and READMEs the moment it
  changes.
- **§6's open question — `notApplicable` versus `unverified` for "nothing declared" — resolves.**
  The survey supplies the missing principle: `unverified` is free to _produce_ and not free to
  _read_ (trellis's reading tax versus flint/sable's honesty position). That is an argument for
  exactly the typed reason §2 recommends: a reason field is what lets the renderer do the
  progressive disclosure trellis asks for (fold permanent `nothing-declared` rows behind a flag)
  while keeping the honesty the other two insist on. flint's misreading of A4's `N/A` line —
  taking the rung for a roadmap promise and briefly _waiting_ for it — is live evidence the
  current phrasing costs adopters.

## What it adds that the analysis above missed

- **The verdict-not-reach invariant (flint): a partial check must never reach `pass`.** A
  stronger, more actionable form of the founding commitment than anything currently written.
  Measured (D3's phantom `--json` steered probes for five rules and degraded A3 from `PASS` to
  unverified), catalogue-wide, and enforceable the way
  [G1](../wiki/rules/lifecycle/inert-invocations-do-not-crash.md)'s signal taxonomy already is —
  a lint binding, not a comment in one checker. If one thing from that report becomes code, this is it.
  sable reached the same principle independently. And it has a live first application waiting:
  per [the magpie trial](./2026-08-26-the-magpie-trial.md), the phantom flag reaches `A3`, `B2`,
  `B4` and `B5` through `machineSelector`, so the D3 fix is a five-rule premise change — left
  unfixed on purpose, pending a before/after sweep, with the fixture already vendored. The
  invariant's first proof is sitting ready.
- **Two boundary statements the project owed and had not written**, both sitting exactly on §1's
  observability wall: _consistency is not correctness_ (a green census on a tool whose help and
  parser agree and are both wrong is correct kit behaviour — flint wants it in
  [the charter](../../CHARTER.md)), and _the shipped instructions are the larger surface_
  (sable's `SKILL.md` that lied for two weeks — blind to the kit by construction, to be stated
  loudly rather than closed). Each is a one-paragraph write at a place an adopter will otherwise
  assume coverage that structurally cannot exist.
- **§6's blind-spot family now has a second confirmed member.** The D1 census blind spot (root
  `--version` the per-path parser refuses) plus flint's empty-enumeration case (per-verb scoping
  earns flagless verbs, each dropping out of the census numerator) — two instances, two
  adopters, independently found. This is a class, and it deserves a name: **advice-induced
  measurement inversion** — a score that moves the wrong way as the subject improves: the defect
  class this project was founded to catch, produced here by the project's own advice.
- **trellis's scaling finding is a bound on the project's own evidence, and nothing in the
  analysis above carried it.** Every trial has had a maintainer answering within minutes; no result establishes what
  the artifacts alone are worth. The charter's central test — an adopter binds a declaration,
  drifts, and the check catches it — now needs a second clause: _without us on the channel_.
  The most informative next trial available is the one nobody has run: an adopter who never
  speaks to us. This bound reaches back into this report's own verdicts: verdict 3's "the
  declaration axis is the product" rests entirely on data produced under maintainer-on-channel
  conditions, and both of this addendum's inputs — the analysis and the survey — are
  maintainer-mediated. The independence of the three adopters is real; the _conditions_ were not
  ordinary, and the conclusion should be held accordingly.
- **The rule count and credibility.** sable's "never mint a rule that cannot discriminate"
  (A4/B3 counted in "23 rules") does not require deleting the pages — the tree's own position
  that a rule page is a specification stands (B4 is exactly that, honestly). What it requires is
  that the _headline denominator_ count the way
  [`STANDARD.md` § "Checked today"](../../STANDARD.md#checked-today) already reads itself:
  twenty-three rules, nineteen able to return a verdict. The report surface should say what the
  standard says.

## The tension it leaves undesigned

flint wants help making the declaration ("something between hand-write it and nothing" — 17
paths and 34 flags hand-transcribed is where the session went); trellis says never generate the
registry or emitter ("manufactures the parallel-document disease with your name on it"). Not
contradictory, but the resolution space is narrow: help must **derive from the adopter's real
dispatch structures** — per-framework emit-from-parser recipes, or transcription assistance
driven by the tool's own recorded rejections — and never generate a document _beside_ them. All
three adopters independently located the adoption bottleneck here ("the payoff requires an
artifact nothing helps you build"), so this is the next design question that matters, and the
one place the consumer signal constrains without answering.

## Still open after both documents

- Whether operators actually **read** per-record hazard warnings in a generated probe plan —
  the one §5 question the survey does not answer, and
  [the plan document](../plans/2026-08-24-below-the-root-before-a-second-cli.md#what-a-second-application-would-and-would-not-establish)
  says this answer decides whether moving authorization to the operator improved anything.
  _Correction: an earlier revision said the shipped generator made this question askable of a
  real artifact. It does not — `acc probe-plan` deliberately carries no per-record hazard text;
  it emits one generation-time limit line about the path list's reach, a design taken with the
  adopters ([design record](../plans/2026-08-26-the-probe-plan-generator.md)). So the question
  is open and not cheaper than before: asking it would first require building per-record
  warnings, which should wait for an operator to ask — a warning added because a document called
  for it is not evidence that anyone reads warnings._
- The sandbox: sable's "never build it" is explicitly a view, not a measurement — the strongest
  signal yet against [roadmap step 3](../roadmap.md#3-control-the-observation-environment-which-is-also-the-l0-safety-work),
  but consistent with, not additional to, §2's "don't build until a consumer asks."
- The `unverified` disagreement is between two goods; the rendering change (census and deltas
  above the fold, permanent-unverified behind a flag — asked for from both ends) serves both
  positions rather than adjudicating them.
- Nothing in the survey is a decision, by its own closing section — and the humans behind the
  three agents have not ratified any of it. Nothing in this report is a decision either: it
  recommends, and the ladder call is the owner's.
