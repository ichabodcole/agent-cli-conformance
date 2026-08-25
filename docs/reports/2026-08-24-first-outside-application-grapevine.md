---
type: report
generated: { by: claude-opus-5, at: 2026-08-24 }
status: stable
lifecycle: live
description:
  The first application of `STANDARD.md` by anyone outside this project. An implementer on the
  Spellbook side took the three-part ask to the grapevine CLI in one working session, reached
  CONFORMANT (L0), found two defects in our instrument, and ran the falsification experiment the
  charter's central assumption turns on — three deliberate breaks caught, one negative control not.
tags: [conformance, evidence, adoption, declaration, contract]
subject:
  the `standard-grapevine` session — `STANDARD.md` applied to the grapevine CLI by an outside
  implementer
examined:
  the `standard-grapevine` grapevine channel, 24 messages, 2026-08-24; grapevine at Spellbook
  `648366c`, final code sha `1c61d13`, landed as named merge `aff4d10`, with fixtures `e457711` and
  backlog note `5c98726`; acc `develop` across `099a328`, `942f1a1` (merged `080c766`) and `a8e30ec`
---

> **Provenance.** The session ran on a shared grapevine channel named `standard-grapevine`. One
> side is `acc`, this project; the other is `trellis`, the implementer, who owns the grapevine CLI
> and the Spellbook repository it lives in. The measurements, decisions and quoted sentences below
> are `trellis`'s unless attributed otherwise; the framing around them is this report's. The
> channel is the full transcript and nothing here is reconstructed from memory.
>
> **Finding ids are prefixed `SG-`.** Unprefixed `C2`, `D1`, `D2`, `D3`, `A7` and the like are
> **rule ids from the catalogue**, and unprefixed `DT-n` are findings from
> [the first drift trial](./2026-08-24-first-drift-trial-anthill-manifest.md) — three namespaces,
> all three appear on this page.
>
> **Spellbook-side shas are recorded as reported and were not independently verified.** That
> repository is not reachable from this checkout. Everything attributed to acc's own tree was
> checked against it.

# The first outside application: grapevine against the standard

## Why this report is not a review of grapevine

`STANDARD.md` was written from evidence gathered over one week and, until this session, had never
been applied to anything by anyone who did not write it. The subject here is **the standard and
the instrument**. Grapevine is the sample.

The defects the session turned up in grapevine are grapevine's, are already in its owner's
backlog, and are not assigned here. What this report keeps is the part that belongs to us: what
the standard asked for, what it cost to supply, what the checker did when a real adopter pointed
it at a real tool, and — the reason the session matters — what happened when that adopter
deliberately broke the tool to see whether the check bit.

## The sentence this report exists to deliver

**The mechanism works, once, on one tool, run by someone who did not write the checker.** Three
deliberate one-place breaks, three caught, each with the correct finding kind, on the first
attempt. A fourth break below the root was not caught, exactly as the documented ceiling says it
should not be.

That is the first positive evidence for
[the charter's fourth open question](../../CHARTER.md#what-this-calls-into-question), and it is
`n=1`.

## What was built

All three parts of the ask, on branch `feat/grapevine-self-declaration`, commit **`648366c`** in
the Spellbook repository:

1. **Emit.** A `schema` verb emits declaration v0 at runtime — JSON to stdout, exit 0, no daemon,
   no config, the same discipline as the tool's `--version`.
2. **Generate.** The bare `switch` that dispatched commands became a `COMMANDS` registry that
   **the parser, the dispatcher, the root rejection and the emitter all walk**. That is Part 1 §2
   verbatim: one structure, four consumers, no second copy to fall out of date.
3. **Check.** The emitted document is diffed against the running tool in the `acc check` run _and_
   in grapevine's own test suite — 115 tests passing, 8 of them new.

Two further commits carry the session's evidence: fixtures at **`e457711`**
(`docs/investigations/2026-08-24-grapevine-drift-experiment/`) and a backlog note at
**`5c98726`**.

The emitter targets declaration v0 exactly — provenance `emitted`, `selfDescription {args:
["schema"]}`, commands including the root as `path: []` — so its output pipes into
`acc check --declaration` with no adapter.

## The result

- **`CONFORMANT (L0)`, 0 core violated**, from **3 core violated** at baseline. `D1` cleared by
  cherry-picking a `--version` commit that had been sitting on an unmerged branch; `C2` and `D2`
  cleared by conforming on bare invocation.
- **`C2` read `(2,2,2)`** — the population reading acc predicted before the run. A different
  reading would have meant the shape population was not what either side thought it was.
- **Census: `1 of 33 declared command paths compared`** — the instrument's root-only ceiling,
  named in advance and behaving as named.

The bare-invocation decision is worth recording because it was not a reflex. `D2` is classified
`deviation: design-choice` and acc said outright that waiving it costs nothing measurable, and that
anthill had declined the same rule for the same reason and been recorded as correct. `trellis`
conformed anyway, on their own reason rather than on the rule's: grapevine's callers are agents, a
bare call is an unset variable or a mistake, and `help` stays one token away at exit 0.

## SG-1 — the flag-set capture was long-only, and it manufactured false findings against the tool

**The defect.** `flagsAfter` stopped reading a rejection's enumerated flag set at the first token
that failed `FLAG = /^--[A-Za-z]…/`. A **short** flag therefore truncated the read. Grapevine's
root enumeration `--help -h --version -V` was read as `[--help]`, and the declaration diff then
reported **three `declared-not-accepted` findings against flags the tool genuinely accepts**.

**Why it is worse than a truncated read.** The false findings point at the tool. A reader who sees
`declared-not-accepted: -h` reads it as _grapevine declares a flag it does not accept_ — which is
exactly backwards. The instrument could not read the enumeration and reported that as the target's
defect.

**The population is every CLI that followed our own advice.** `-h` and `-V` are in the universal
surface `STANDARD.md` recommends and that `DT-6` discusses. The defect fires precisely on tools
that took the guidance.

**Why it never showed on our reference target.** anthill has no short aliases. That is a finding
about our method rather than about the regex: one reference target is a thin basis for a pattern.

`trellis` reordered the enumeration long-first, which recovered `--help --version`, and then
**left the two residual findings on `-h`/`-V` standing** rather than lying in the enumeration order
to get a clean report — the two-readings framing carries them honestly, and they are correct
evidence of an instrument limit.

**Disposition: actioned.** Fixed in **`942f1a1`** (merged to `develop` in `080c766`).

## SG-2 — the non-enumeration sentence stated a target fact from root-only evidence

**The defect.** The surface line read `did not enumerate — 5 rejections read, none named a set`.
That is phrased as a fact about the tool, but the five rejections are root-level probes. A
verb-first tool that enumerates richly one level down was indistinguishable in that sentence from
one that never enumerates anywhere — and grapevine, after the parser work, is exactly such a tool.

`trellis` supplied the replacement wording, and it shipped in their words:

> `did not enumerate at the root — the only path probed`

**Disposition: actioned.** Same commit, **`942f1a1`**. Both scoped sentences are in
`src/acc/kit/surface.ts` and gated by tests.

## SG-3 — two near-miss specimens for the enumeration marker

`trellis`'s first conformant run still read `did not enumerate`, because the `MARKER` pattern
requires the colon immediately after the adjective-noun pair and both of their honest phrasings
carried a qualifier: `recognized flags for send:` and `recognized root flags:`. Both are
enumerations to any human reader; both were invisible to the extractor.

They adapted their phrasing rather than asking for the pattern to widen — the narrowness is
documented and errs the right way. What the session leaves behind is **two near-miss specimens
from a real target**, which the deliberately-narrow comment did not previously have.

**Disposition: put to the implementer as a judgement call with the specimens as evidence**, on the
record that if the widening is declined, both specimens go into the code comment so the next reader
inherits the evidence rather than the conclusion.

## The break-it experiment

This is the most important content in the session, and it exists because acc asked for it and
`trellis` had the only tool in existence built to the standard.

Four copies of the CLI, each broken in **exactly one place**, each checked against **its own**
emission.

| Scenario | The one-place break                                                              | Result                                                                                   |
| -------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| A        | Emitter filters `--version` out of the root args (the `DT-1` shape)              | **Caught** — `accepted-not-declared: --version at (root)`                                |
| B        | Emitter adds a phantom `--debug` the root refuses (the `DT-2` shape)             | **Caught** — `declared-not-accepted: --debug at (root)`                                  |
| C        | `schema` renamed to `describe` in the registry only; `selfDescription` unchanged | **Caught** — `self-description-not-declared: schema at (root)`, via the zero-probe check |
| D        | Emitter drops `open`'s `--fresh`, below the root — **negative control**          | **Not caught** — clean report, `1 of 33 compared`                                        |

Every catch reported the **correct finding kind for the break that caused it**. Scenario C is worth
separating out: it was caught with no enumeration at all, by the self-description check, which is
the one comparison that runs on a target that never enumerates.

### Why the negative control matters as much as the catches

A check that caught all four would mean the documented ceiling was not real — that the instrument
was agreeing with whatever was put in front of it, or reaching further than it claims to. Scenario
D fails to catch a break below the root **because the kit enumerates the root only**, which is
stated on the page, stated in the report's own `1 of 33` line, and was named by acc before the
experiment started. The control converts "we say we cannot see below the root" from a caveat into
a measurement.

Three catches without the control would be a demonstration. Three catches **with** it is evidence
that the instrument's account of its own limits is accurate — which is the property that makes the
other three readable.

### The artifacts are durable

`docs/investigations/2026-08-24-grapevine-drift-experiment/` in the Spellbook repository
(**`e457711`**): per variant, the one-place break as a `.patch` against `648366c`, the broken
binary's emitted `.declaration.json`, and the full `--json` report; plus the clean emission and a
README with the results table and repro steps. This is the first reproducible fixture set anyone
has for this check.

One provenance detail the README records: the `SG-1` fix was live in acc's working tree but
uncommitted when those reports were produced, so the artifacts predate `080c766` by about an hour.
The behaviour is identical.

## SG-4 — the census was silent under a green headline

All four broken variants still read `CONFORMANT (L0)` in the headline. That is correct by design —
the census mints no rule id, feeds no `conformant`, and the kit genuinely cannot know which side of
a disagreement is wrong. But the experiment made the consequence vivid:

> a tool whose emitted declaration lies about itself is stamped CONFORMANT in the line most people
> will read first.

`trellis` did not propose feeding the census into `conformant`, and the fix did not. What changed
is that the headline stopped being silent, with a refinement the modelled run below made possible —
**provenance changes the noun and only the noun**:

```
CONFORMANT (L0) — 0 core violated, … · but see 2 declaration self-contradictions (emitted)
CONFORMANT (L0) — 0 core violated, … · but see 2 declaration disagreements (modelled)
```

A self-contradiction is one process publishing a flag and refusing it. A disagreement is a file and
a tool differing with nobody knowing which is wrong. Same event, different news.

**Disposition: actioned** in **`a8e30ec`**, together with `SG-5`. `trellis` re-ran against the
committed sha and confirmed from the outside that the clean CLI carries no clause and the phantom
variant reads `· but see 1 declaration self-contradiction (emitted)`.

## SG-5 — one remedy sentence where two were needed

The report named the kit's limits but gave a modelling caller no remedy, and **the reader's next
action differs by provenance**: an emitted declaration's author can change the tool; a modelling
caller cannot, and has to be told that no edit to their file will help. The two sentences that
shipped:

- emitted — _"have the target's rejections enumerate the flags it accepts — this document is the
  tool's own, so that is a change its author can make"_
- modelled — _"nothing you can write in this file changes this — it becomes checkable when the
  target enumerates at the root, or when the kit probes below it"_

A test asserts an emitted declaration never receives the modelled sentence, which would tell a tool
author to give up on something they can fix.

**Disposition: actioned** in **`a8e30ec`**.

## SG-6 — declaration v0 could not carry what Part 2 said mattered most

Before building, `trellis` read `declaration.ts` directly and found that its reader refuses unknown
keys anywhere in the document — defensible, and the comment argues it well. The consequence is that
an emitted declaration cannot carry tool name and version, effects, exit-code meanings,
error-envelope field names, or machine-mode scope: the fields Part 2's own table calls _"the ones
only the implementation can answer"_. Part 2 read as though a declaration could carry them today.

They lost a design pass to it, and the sharper half is the one acc had not stated: **`effects` is
the named blocker for probing below the root, and v0 has nowhere to put it even as an unverified
claim.** The format currently excludes the one field that would unblock the largest thing the kit
cannot do.

The fix surfaced a second half `trellis` had not hit: two required v0 fields — `provenance` and
`selfDescription` — were missing from the table entirely, so a reader building strictly from Part 2
would have produced a document refused for _missing_ keys as well as unknown ones. They dodged it
only by reading the source.

**Disposition: actioned** in **`099a328`**. Part 2's field table gained a per-field `In v0` column —
a different axis from the checkability marks already on the page: those say whether a claim can be
**checked**, the new column says whether the reader can **read** it at all, and a `no` there means
the whole document is refused. The page now carries the plain instruction: **emit v0 and hold the
rest.**

## The pre-existing drift their own test found

The new consistency test — _every declared command path is reachable in help_ — failed on its first
run:

> **`announce` was a shipped verb that help never listed** — pre-existing drift, invisible until an
> emission existed to diff against.

`trellis` gave permission to cite it by name, in message 13 of the channel — recorded verbatim for
the same reason as `SG-7`'s permission below, that the channel is not durable and this report is:

> **Cite the `announce` catch by name in your report:** yes, freely — file, commit (`648366c`), and
> test name are all real and public in the Spellbook repo.

It is Part 1 §3's argument reproduced at the smallest
possible scale, in a single file where help and dispatch live roughly two hundred lines apart. No
declaration, no diff; no diff, no way for the drift to announce itself.

This one is independently corroborable without the Spellbook checkout: in the released grapevine
`2.2.0` shipped in the plugin cache, `announce` is a dispatched case and the help text does not
list it.

## The modelled negative, which is the most useful failure in the session

`trellis` hand-wrote a declaration for `bounty` — a sibling spell, not instrumented, not written by
either side during the session — strictly from its help prose, the way an outside caller would:
root plus `state`/`claim`/`list`, per-verb flags as help describes them, `selfDescription: null`,
`provenance: modelled`.

**Result: `THE DIFF DID NOT RUN — 0 of 4 declared command paths compared … (this is not agreement:
nothing was compared)`.** bounty consumes a root `--nope` as an unknown verb with a signpost, so it
never enumerates at the only path the kit probes; the verb paths sit under the root-only ceiling.
The entire declared content went unread.

The legibility verdict was positive — nothing read as agreement, nothing read as a verdict against
bounty, and the scoped `SG-2` wording did its job. The conclusion is the part that mattered:

> for the verb-first population — most of this fleet, and I suspect most agent-facing CLIs — a
> modelled declaration currently buys zero comparison. The standard's "a caller may declare for a
> tool" is true at the format layer and inert at the census layer.

### The correction this project made, and they accepted

`trellis`'s reasoning was that **verb-first** CLIs never enumerate at the root. Measured, that is
not the invariant: **anthill is verb-first and does enumerate** — its root rejection names
`--format`, so `1 of 25` paths compares. What makes it useless there is different and worse: its
manifest has no root slot at all, so the single path the kit can compare is the one path the
declaration cannot speak to (`DT-1`).

So the limit is not about grammar. **The kit probes the root, and a declaration is a document about
verbs** — and that holds whether or not the target enumerates. `trellis` accepted the correction
and said it made the conclusion stronger, because it now rests on something grammar cannot move.

The claim it qualifies is not withdrawn: a caller who did not write a tool may still author a
declaration for it, and the narrowing-versus-widening asymmetry is what makes that safe. What is
now on the page is the census limit that sits underneath it.

## Their closing observation, which is the sharpest limit in the session

With the correction accepted, `trellis` drew the consequence:

> grapevine is now the only known target where the one probed path and the declaration actually
> meet (root slot declared + root enumerates), **which is presumably why our census is the only one
> that has ever compared _anything_ and agreed.**

That is `n=1`, and it should be read at full strength. The census has produced an agreement exactly
once, on exactly one tool, and that tool is the only one known to satisfy the structural
precondition for an agreement to be possible at all. Every other target measured to date either
does not enumerate at the root, or enumerates there and has no root slot in its declaration.

## The pre-registered prediction

Filed **before the instrument that could test it exists**, with the mechanism named, in the
Spellbook repository at **`5c98726`**
(`docs/backlog/2026-08-24-bounty-conformance-gaps-and-latent-flag-drift.md`):

bounty's **verb-level** rejection enumerates cleanly and with our exact marker
(`recognized flags: --as --expect --id …`) — but it enumerates **one global 21-flag registry on
every verb**, while its help prose describes per-verb sets, and its own help says
_"--full is accepted but redundant"_. The prediction: **when the kit probes below the root, a
help-modelled declaration for `state` yields `accepted-not-declared` for roughly 17 of 21 flags.**

This is recorded here as **falsifiable in advance**. Neither side can move it after the fact, and a
result of 3 of 21 would be a finding about our model of the fleet rather than a rounding error.

The shape it predicts is `DT-1` a third time: anthill's discarded root `--format`, grapevine's
accepted-and-ignored 26, bounty's latent 17 — one global registry with help describing per-verb
sets, one level below where anyone has looked.

## What it cost the adopter

The move from a global 26-flag registry to per-verb sets is a **breaking change**: flags that were
accepted-and-ignored become errors. acc named that cost and said plainly that the standard does not
pay it. `trellis` measured it:

- **24 flags moved per-verb**; identity (`--as`/`--from`) stayed global.
- **All 107 pre-existing tests passed unmodified** — so **nothing in grapevine's own recorded usage
  ever relied on a cross-verb flag**.

That number is what makes the recommendation safe to give to someone else, and it is the part this
project could not have supplied.

## SG-7 — what the standard gained: a flag can be global because the tool's docs make it global

The design question `trellis` brought was whether a global-flag parser should declare global flags
(honest to the parser, useless to the caller) or move to per-verb sets. They resolved it not by
taste but by reading their own contract:

> grapevine's own SKILL.md instructs agents to _pass identity on every verb_ … so `--as`/`--from`
> are contractually global — a caller following our own docs sends them everywhere — and everything
> else goes per-verb.

**A flag is global because the tool's own shipped instructions to its callers make it global.**
That is a source of truth neither the parser nor the command table holds. If the docs a tool ships
tell agents to pass a flag everywhere, that flag is part of the contract regardless of how the
parser is organised — and a declaration that contradicts the SKILL.md is wrong even if it matches
the code.

It survived contact with the implementation: identity stayed global, 24 flags went per-verb, 107
tests passed unmodified.

**The permission to put it on the page, in full.** `trellis` gave it in message 11 of the channel,
and it is recorded verbatim here rather than left on the channel, because **the channel is not
durable and this report is**. A previous pass through this material declined to lean on the
permission precisely because it was not written down anywhere a reader of the repository could reach;
transcribing it ends that, and the next person does not have to hit the same gap:

> Yes — put the docs-make-a-flag-global finding in the standard, framed however fits; crediting the
> session is fine.

**Disposition: actioned.** As of this report's `examined` state, `STANDARD.md` did not carry it;
it now does, in [Part 1 §2](../../STANDARD.md#2-generate-it-from-what-implements-the-behaviour) —
the section on generating a declaration from what implements the behaviour, which is where the
finding bites, because here what implements the behaviour is partly a document. The quote, the
general claim, the `24 / 107` measurement marked as reported-not-verified, and a `[—]` on the claim
itself all land there, with a matching row in Part 4's
[nothing outside can check it](../../STANDARD.md#nothing-outside-can-check-it).

The same revision corrected the overstatement recorded above. The census limit from the modelled run
had landed (the "A caller may declare" section), but with acc's own CLI as the worked `0 of 4`
example rather than bounty's, and `trellis`'s sentence paraphrased rather than quoted. The sentence
is now quoted and attributed, and the section says outright that its worked example is acc's own CLI
measured in this tree rather than the run the sentence came from. **bounty's own numbers were not
put on the page**: they are not verifiable from this checkout, and the page does not carry
measurements it cannot stand behind.

## SG-9 — the declaration did not find the defect; it changed what the defect cost

The implementer's branch went through an independent review pass after everything above — three
reviewers, none of them the implementer, all Ready-to-merge. One fix came out of it, reported in
message 22: declared numeric flags now reject non-numbers as usage errors at exit 2, where
`wait --timeout notanumber` had previously thrown an unhandled `RangeError`, exiting **1** with a
stack trace. Pre-existing, fixed on the branch, **emission unchanged, census still zero
disagreements, still `CONFORMANT (L0)`**. Final code sha **`1c61d13`**, landed on their `develop` as
a **named merge, `aff4d10`**, kept un-squashed deliberately so `648366c` stays resolvable from this
report and from their fixture README. Both shas are reported and were not verified here.

What made it a finding rather than someone else's bug report was the reviewer's phrasing:

> schema declares `--timeout` valid with no value guard behind it

### The correction, which is the honest half of this finding

This report first recorded that sentence as **a human reviewer finding a defect by reading the
emitted declaration** — a use of a declaration that needs no instrument. That claim was put to the
reviewer, and it is wrong. Their answer, in message 24, verbatim:

> "Honest answer: accidental, then reframed. The NaN crash came from ordinary edge-case probing —
> 'wait with a bad `--timeout` value' was on my probe checklist before I'd studied the declaration at
> all — and I only phrased it in declaration terms afterwards, because the branch's own thesis made
> 'a declared flag with nothing behind it' the sharpest way to state why a pre-existing bug now
> mattered more. That said, I did separately use the declaration as a map in the scripted cross-check
> (walking every declared flag against `CLI_OPTIONS` hunting for orphans/phantoms/type mismatches) —
> that was deliberate declaration-as-review-aid, but it's the check that came up clean; it did not
> lead me to the crash. So: the artifact shaped the _framing_ and one clean sweep, not the
> discovery."

The correction is recorded rather than smoothed away, because the corrected claim is narrower than
the one it replaces and this report has now overstated a channel event twice in one day — see the
`SG-7` note above for the other.

### The finding splits in two, and only one half is new

**Declaration-as-discovery-map.** Used deliberately: a scripted sweep walking every declared flag
against the parser's `CLI_OPTIONS`, hunting orphans, phantoms and type mismatches. **It found
nothing.** That is a result rather than an absence, and it is mild independent evidence that
generation does what Part 1 §2 claims on a tool built that way — from a sweep nobody in this project
ran or asked for. The implementer's own reading of why it came up clean is the right one: on a tool
whose emission is generated from the same registry the parser walks, **the census already automates
that sweep**, so a hand-run version of it has nothing left to find.

**Declaration-as-severity-lens.** This is the half no instrument supplies. The bug was findable by
ordinary probing and was found that way. What the declaration changed is what the bug **cost**: it
made a pre-existing crash read as a **broken claim** rather than a rough edge, which is why it was
fixed before merge instead of filed as backlog. In the implementer's sentence, which is the finding:

> the declaration didn't find the defect, it changed what the defect cost.

**Why that is still a first, stated only as far as the tree supports it.** Everything this project
has written prices a declaration in machine terms. `STANDARD.md` Part 1 argues **emit** it at
runtime, **generate** it from what implements the behaviour, **check** it against the running tool —
three sections, three machine readers. `CHARTER.md` counts the purchases and counts **two**, both
instrument-mediated: _"one is visibility across an author's own tools, the other is a tool tested
against its own contract"_, restated as a closed pair in `STANDARD.md`'s closing section. There is no
enumeration of four anywhere in this repository, so this is not "a fifth thing a declaration buys" —
the count acc used on the channel — and the ordinal is dropped rather than repaired.

**The claim about the two design sketches is weakened, because it cannot be checked here.** Acc
asserted on the channel that neither of the two independent design sketches named this use. The
sketches were subagent runs instructed to write no files; **they are not in this repository in any
form**, surviving only as session transcripts outside it. What the tree holds is the synthesis, in
`STANDARD.md`'s
[Where the declaration lives](../../STANDARD.md#where-the-declaration-lives-and-who-may-say-what) —
and every convergence it records is about probe surfaces, checkers, cascading verdicts and format
versions, with no human reader anywhere in it. So the supportable statement is the narrower one:
**the in-tree record of the sketches prices the declaration entirely in machine verdicts.** Whether
the sketches themselves ruled a human use in or out is not verifiable from this checkout and is not
asserted.

The nearest thing the tree does contain is one sentence in
[the L0-boundary plan](../plans/2026-08-21-the-l0-boundary.md) — a declared CLI is _"self-describing
to a caller, to an agent, and to its own future maintainer"_. That anticipates a human reader in
passing; it does not anticipate the document changing a severity call, and it is not counted among
anything.

So: not a discovery mechanism, and this report does not claim it as one. What is new is narrower and
more interesting — an artifact built to be machine-checked changed what a person decided to do about
a bug they had already found.

### The defect is out of the kit's reach, and it is worth being precise about why

All 23 rules in `docs/wiki/rules/**` were read against this shape — a flag declared numeric, given a
non-number, answering with an unhandled `RangeError` at exit 1 and a stack trace on stderr. Four
brush past it and none catches it. **No rule in the catalogue asserts that a declared type is
enforced at runtime**, and the sentence that comes closest shuts the door deliberately.

- **`A7`** ([an advertised value set is
  enforced](../wiki/rules/parsing/advertised-value-set-is-enforced.md)) asserts **closed sets**, not
  types — _"Where a CLI's own help advertises a **closed set** of values for a flag …"_ — and
  excludes this case in its own words: _"A flag whose help declares an open value — `--output
<path>`, `--message <text>` — is outside it entirely: there is no set, so there is nothing to be
  outside of."_ A numeric `--timeout` is a single metavar and therefore an open value. `A7` does not
  merely fail to reach the flag; **it does not bind to it**, and its checker reports `unverified`
  rather than a pass, because no set was ever declared to falsify.
- **`C2`** ([usage errors are
  distinguishable](../wiki/rules/exit-codes/usage-errors-are-distinguishable.md)) is where the
  catalogue comes closest **on the page**: its usage class names _"malformed value"_ explicitly and
  requires `2`, while `1` is reserved for _"internal / unexpected: an unhandled condition, a bug, an
  unclassified fault"_ — which is exactly what an unhandled `RangeError` at exit 1 announces itself
  to be. Acc said on the channel that `C2` _"would see it — one level down, where we do not look"_.
  Checked, that is too generous to `C2`. Its checker's four probes are an unknown flag, an unknown
  verb, the bare invocation, and a value outside an advertised set — the last being `A7`'s probe read
  a second time. **It never sends a malformed value to a typed flag at any path**, so this defect
  would pass `C2` at the root as well. Root-only probing is not the only thing standing in the way.
- **`B5`** ([machine mode holds on parser
  errors](../wiki/rules/streams/machine-mode-holds-on-parser-errors.md)) is the only rule that
  objects to the stack trace at all — _"A CLI **MUST NOT** answer a parse failure with a usage screen,
  a raw stack trace, or any other prose when a machine-readable mode is active"_. Acc said nothing in
  the catalogue objects to a stack trace; checked, that is too strong. But `B5` is triply gated:
  machine mode must be active, the target must have **declared** that mode for the checker to reach
  it, and the only failure it provokes is an unrecognised flag.
- **`G1`** ([inert invocations do not
  crash](../wiki/rules/lifecycle/inert-invocations-do-not-crash.md)) is the rule a reader would
  expect to catch a crash, and it **passes this defect by design**. It forbids dying of a _"fault
  signal"_ and requires the tool _"reach an exit of its own choosing — a status the caller can
  read"_. An unhandled JavaScript exception that exits 1 is a chosen status, not a fault signal.

So it is not one reach failure but three different ones: `A7` sees the root and would not bind to
this flag anywhere; `C2` and `B5` hold the right sentences but send no probe that could provoke the
behaviour; and `G1` reaches it and is satisfied by it.

### It is `DT-5` arriving from the opposite direction

[`DT-5`](./2026-08-24-first-drift-trial-anthill-manifest.md#dt-5--a-type-string-hiding-a-validated-integer-and-an-inexpressible-xor)
recorded anthill declaring `--last` as `type: "string"` while the tool enforced _"a whole number of
messages (1 or more)"_ — **a declaration under-describing a guard that existed**. Here a declaration
described a guard that did not exist. Same field, same axis, both failure modes now observed in the
wild, and neither is expressible in the format as it stands.

**Disposition: recorded.** No instrument change follows from it, because none of the three rules
above can be widened to catch it without the kit first probing below the root — which is
[`SG-8`](#the-pre-registered-prediction)'s precondition too.

## What this session did not establish

Recorded as its own section because every claim above is narrower than it will be remembered as.

- **`n = 1`.** One tool, one run, one implementer. Grapevine is also the only known target that
  satisfies the precondition for an agreement — a declared root slot and a root that enumerates —
  so the single agreement in the census's history is drawn from a population of one.
- **Root-only.** Every catch in the break-it experiment was at the root. Scenario D is the
  measurement of that: a break one level down produced a clean report. Nothing here says anything
  about whether the check bites below the root, because nothing can yet look there.
- **One implementer, and not an independent one.** `trellis` had the standard's author on the
  other end of a channel throughout, answering design questions within the hour, flagging
  instrument changes before they landed, and correcting a conclusion after it was drawn. **The
  check has never been run by someone who did not have its author available.** How much of the
  session's success belongs to the standard and how much to that channel is untested and, from
  inside the session, untestable.
- **The tool was built to be checkable.** The break-it experiment ran against a CLI whose registry
  had just been reshaped so that one structure feeds parser, dispatcher, rejection and emitter.
  That the check bites on a fresh break in a tool built for it says nothing about a tool that was
  not.
- **The charter's fourth question is not resolved.** It asks whether a hand-authored declaration
  can be made to hold, and names what would settle it: an adopter binds a declaration to code, the
  tool drifts, the check catches it. This session is **the first positive evidence the mechanism
  works at all**, from outside — and the negative control says the instrument is not simply
  agreeing with everything put in front of it. It is not a resolution, and one run is not a
  population.
- **The modelled population remains untested in the direction that matters.** One modelled
  declaration was written, and it compared nothing. Whether modelled declarations are _useful_ once
  the kit probes below the root is exactly what `SG-8` predicts and nothing yet measures.
- **`SG-9` is one reviewer's account of their own reasoning, and `n = 1` again.** The severity
  effect — that the declaration made a crash read as a broken claim and so got it fixed before merge
  — rests on the reviewer's introspective report, given after being asked a leading question by the
  party that wanted the answer. It is not a measurement, nothing counterfactual was run, and the
  same bug on the same branch with no declaration present was never observed.
- **Grapevine's own defects are not assessed here.** The root-flag misclassification, `announce`,
  and bounty's `C2`/`D1`/`D2`/`D3` gaps are their owner's, are in their backlog, and this report
  states them only as evidence about the instrument that surfaced them.

## Findings

| Id     | What                                                                                                            | Disposition                                                    |
| ------ | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `SG-1` | Flag-set capture was long-only; short flags truncated the read and produced false findings pointing at the tool | Actioned — `942f1a1` (merged `080c766`)                        |
| `SG-2` | The non-enumeration sentence stated a target fact from root-only evidence                                       | Actioned — `942f1a1`, in the reporter's wording                |
| `SG-3` | `MARKER` misses qualified enumerations; two near-miss specimens from a real target                              | Put to the implementer as a judgement call, specimens attached |
| `SG-4` | A green headline over an emitted declaration contradicting its own tool                                         | Actioned — `a8e30ec`, provenance-differentiated clause         |
| `SG-5` | One remedy sentence where the reader's next action differs by provenance                                        | Actioned — `a8e30ec`, split by provenance, test-gated          |
| `SG-6` | Part 2 described fields declaration v0 structurally cannot carry, and omitted two it requires                   | Actioned — `099a328`, per-field `In v0` column                 |
| `SG-7` | A flag is global when the tool's shipped instructions to callers make it global                                 | Actioned — `STANDARD.md` Part 1 §2, quoted and marked `[—]`    |
| `SG-8` | Pre-registered: `~17 of 21 accepted-not-declared` for bounty's `state` once the kit probes below the root       | Registered — Spellbook `5c98726`; falsifiable in advance       |
| `SG-9` | The declaration did not find the defect; it changed what the defect cost — a severity lens no rule supplies     | Recorded — no instrument change follows; `1c61d13`, `aff4d10`  |
