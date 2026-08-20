---
type: report
generated: { by: claude-opus-5, at: 2026-08-20 }
status: stable
lifecycle: live
description:
  The first adoption of the kit by someone outside it — an agent in the Spellbook repo, given no
  help — which found one false positive, one waiver model that cannot express a deliberate design,
  and an install that put the wrong bytes on disk at exit 0.
tags: [conformance, adoption, evidence, acc-config]
subject: the kit and its documentation, as used from outside
examined: v0.1.1 (0cace07) against Spellbook's `grapevine` and `astrolabe` CLIs
---

# First external adoption trial

## What this was

The first use of `acc` by someone who did not build it. An agent in the Spellbook repo — alias
`assay` — was pointed at the GitHub URL with a short brief and no other help, picked its own target,
installed the kit, ran it, acted on what it agreed with, and wrote up the experience. Its report
arrived on the `acc-feedback` grapevine channel and is the source for everything below.

**Nothing here was volunteered by us.** The brief named no rule, no flag and no number, and asked
for friction "especially the things you solved" on the theory that a problem an agent fixes is a
problem it stops perceiving as one. We answered no questions, because a question answered is a
documentation defect concealed.

Findings carry `EXT-n` ids and cite the section of the original report they came from. Every claim
below was re-verified against the code or reproduced here before being written down; where
verification narrowed a finding, that is recorded rather than smoothed over.

## Verdict

**The trial worked, in the specific sense that it found things we could not have found ourselves.**
Two findings are severe enough to block the next adoption, one of them fatal to the premise if left
alone. Set against that, the adopter's own summary of the value to _them_ was "roughly break-even
on this target" — which is the honest answer and should not be argued with.

The six questions the trial was designed around, answered:

| Q   | Question                                        | Answer                                                                     |
| --- | ----------------------------------------------- | -------------------------------------------------------------------------- |
| Q1  | Are the findings **true**?                      | **No.** One false positive, reproduced. See EXT-2.                         |
| Q2  | Are they **worth acting on**?                   | Mixed. One genuine defect fixed; three restatements of one design call.    |
| Q3  | Can a stranger **install and run it** unaided?  | **Barely.** ~20 minutes, and the install silently lied. See EXT-1.         |
| Q4  | Can they **read a verdict** without misreading? | Yes — read it better than we do. But piped output has no verdict line.     |
| Q5  | Can they **triage** unaided?                    | They reached the config, used it correctly, and it **failed them**.        |
| Q6  | Does a fix **propagate** across a CLI family?   | The findings are family-level; per-CLI runs have near-zero marginal value. |

Q5 deserves emphasis. The anticipated failure was "nobody reaches `acc.config.json`". What happened
is stronger evidence: they reached it, used the exact idiom the README advertises, and it did not
work.

## Findings

### EXT-1 — P0: the documented install put the wrong bytes on disk, at exit `0` (§1)

`bun add -d git+ssh://…` succeeded at exit `0` reporting `installed …#4638293` — a commit 17 behind
`main` — and `acc --version` answered `0.1.0`. After clearing the stale bare clone the install
reported `#0cace07`, whose `package.json` is `0.1.1`, and **`acc --version` still said `0.1.0`**. A
`diff -rq` against a clone at that commit showed ~18 files differing and several absent: **bun
printed a SHA it had not installed.** The extracted-package cache is stale independently of the bare
git clone, and clearing the latter does not touch the former.

This falsifies a claim in our README: _"It writes the version to `package.json`, which is what
`src/acc/version.ts` reads — so `acc --version`, the git tag and the changelog **cannot
disagree**."_ The invariant holds inside the repo. It does not survive the documented install.

The defect is Bun's. The exposure is ours, and its shape is the project's own thesis: the README
documents the **loud** arm of this failure (`no commit matching`, which it predicts word for word
and which the adopter confirmed "called that shot precisely") and says nothing about the **silent**
arm, where the install reports success and hands you a different tool than it names.

Their workaround was to abandon the documented install and run from a clone. **Every number in
their report came from a source the docs do not recommend.**

Recommended: document the silent arm beside the loud one, and print the kit's own version in the
report header so a stale kit is visible in every artifact it produces rather than only in
`--version`, which nobody thinks to check.

### EXT-2 — P0: D1 reports a false accusation on any target with no `--version` (§2)

On `grapevine`, D1 reported `--version requires configuration (failed with an unusable HOME)`.
grapevine has no `--version` at all; the token falls through to `default: die(...)` and exits `2`,
and `HOME` is never read on that path. Measured by the adopter, with a normal `HOME` and with
`HOME=/nonexistent`: **byte-identical stderr, identical exit code.** Reproduced on a second CLI.

Verified here against
[`version-flag.ts`](../../src/acc/kit/checkers/discoverability/version-flag.ts): the clause fires on
`hostile.exitCode !== 0` alone. Nothing compares the hostile run to the plain one, so a target that
fails **identically both ways** is accused of a HOME dependency it does not have.

The file's own comment, three lines above the guard, names this exact failure —
_"an outright false accusation: the hostile-HOME probe did not fail because of HOME"_ — and guards
it with `crashedUnverified()`. **That guard only fires for a target that crashed.** A clean exit `2`
walks straight past it.

The adopter's proposed predicate is correct: push the clause only when
`hostile.exitCode !== plain.exitCode || hostile.stderr !== plain.stderr`. It also collapses the
redundancy they noted — when `--version` simply does not exist, one clause says everything the
three currently say.

**This is the finding the trial existed to produce.** A checker that invents a cause is the one
defect that destroys the premise, and no amount of internal review had found it, because we only
ever pointed the kit at targets that have a `--version`.

### EXT-3 — P0: a waiver does not follow the evidence it waives, so a deliberate design cannot be declared (§3)

On `grapevine`, C2 and D2 cite the **same observation**. One design decision — a bare invocation
prints help and exits `0` — is reported as two core violations. The adopter waived D2 using the
idiom the README advertises for precisely this case, with the README's own example rationale:

```json
{ "rules": { "D2": { "severity": "off", "reason": "bare help is deliberate" } } }
```

**D2 waived. C2 still fails on the same byte. Still exit `9`.**

Reproduced here on a purpose-built fixture whose bare invocation prints help and exits `0`:

```
=== D2 waived ===
 exit=9
 C2: fail waived=False ev=['b8d1ef65cae5', '7b14f3dba1a0', 'cf21d6899d33']
 D2: fail waived=True  ev=['cf21d6899d33']
```

Probe sharing is deliberate and argued for in [probing.md](../wiki/concepts/probing.md); the waiver
model simply does not follow it. The consequence is that **for this CLI no configuration expresses
"bare help is deliberate" and reaches a green gate.**

The second-order effect is worse than the inconvenience. The only route to exit `0` is
`knownFailures`, which is defined as debt — "this is broken, I know, I will fix it". Recording a
permanent design decision there is a standing false statement that never goes stale. The adopter saw
this and **declined to commit that config**, which is the correct call and leaves them unable to
adopt. A waiver that cannot waive what it names routes honest people into lying in the one file
whose whole value is that it is honest.

Shapes worth considering, from the report: propagate a waiver to any rule whose verdict rests on a
waived rule's observation; let a rule declare which clauses are _imported_ from another rule; or a
third config key for "deliberate, not debt".

### EXT-4 — P1: D3 cannot see a machine-first CLI, and skips the rules that matter most on one (§4)

`grapevine` is JSON-by-default — every data command goes through one `printJson` helper and
`--human` is the opt-**out**. D3 looks for a machine-mode _flag_, has no way to represent "machine
mode IS the default", and reports _"help names no machine-mode flag or schema command"_. B3 and B5
then go `unverified` as a direct consequence, which the report itself states.

**Those two are the rules that would have validated grapevine's JSON envelope** — the contract
agents actually consume. The single most valuable thing the kit could check on this CLI is the thing
it declined to look at.

The adopter went further than we would have: they **added an explicit `Output:` block to grapevine's
help** stating that data commands emit JSON by default, re-ran, and **D3 still failed**. It wants a
flag, not a statement.

Consequence for report-reading: "13 core passed" overstates coverage on exactly the class of CLI
this project is aimed at, and it does so for a reason that is a property of the checker rather than
of the target.

_This was [pre-registered as a prediction](#predictions-and-how-they-fared) before the trial began,
from reading grapevine's help. It was found independently, from the report alone._

### EXT-5 — P1: findings are family-level, and per-CLI runs have near-zero marginal value (§5)

A second run against `astrolabe` — a different spell in the same repo — produced **byte-for-byte the
same finding set**: C2, D1, D2, D3 failing; A6, A7, B3, B5 unverified. Zero new information. The
spells share a scaffold, so they share the contract shape and its gaps.

The correct unit of work is "fix the scaffold once", not "run the kit on seven CLIs" — and the
second run's entire value was establishing that it was a duplicate.

Requested: a multi-target mode (`acc check ./a ./b ./c`) reporting the intersection separately from
the per-target deltas. Aimed squarely at our stated audience — the README names "framework and
scaffold maintainers" — for whom **the shared row is the finding**, and running seven times to
discover one is backwards.

### EXT-6 — P2: the README's headline example is TTY-only and never says so (§7)

The README leads with `NOT CONFORMANT (L0) — …` as "the first line". Piped — which is every CI
invocation and every agent invocation — you get a ~14 KB single-line JSON blob and no verdict line
at all. This is correct behaviour (machine mode on a pipe) and it is exactly what the project asks
of others, but the README presents the text output as what you will see.

Related, from the same section: **`--format text` is excellent and undiscoverable.** The adopter
calls the aligned `PASS+`/`FAIL`/`UNVR` table plus the coverage section _"the best artifact the tool
makes"_, and getting-started never mentions the flag.

**This settles a question we left open.** The 2026-08-20 readiness audit recommended hiding coverage
gaps behind `--verbose`, and that was declined on judgement
([FR-10](./2026-08-20-first-release-readiness-audit.md)). The first outside reader independently
calls the full report the best thing the tool produces. The decline was right; the actual defect is
**discoverability, not verbosity.**

### EXT-7 — P2: the JSON report duplicates its own coverage gaps (§7)

Every finding carries its full `coverageGaps` array, and the same arrays are repeated wholesale in
the top-level `evidenceGaps`. The adopter estimates ~40% duplication and reports that `jq` is
mandatory to read anything.

### EXT-8 — P3: machine-mode help is always the root schema, even for a subcommand (§7)

Reported as "`acc check --help` dumps the entire schema, not help for `check`". **Verified here and
narrowed:** in text mode `acc check --help` correctly prints `check`'s help. The schema dump is
machine-mode-only, where help is answered with the schema by design.

So the real observation is narrower than reported: machine-mode help does not vary by subcommand.
Whether that is a defect is a question about what machine-mode help should mean for a nested
command, and C1's own coverage gap already says nested help is not probed at `L0`.

## Predictions, and how they fared

Registered in `.scratch/` before the run, from reading Spellbook's source.

| Prediction                                           | Outcome                                                                            |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------- |
| D3 fails on every one of the seven                   | **Held** on both CLIs run                                                          |
| B3 and B5 report `unverified` on every one           | **Held**, and traced to D3 as predicted                                            |
| A1/A2/A5 mostly pass                                 | **Held** — absent from every failure list                                          |
| D2 fails on 5 of 7 (`case undefined:` → stdout)      | **Held** on grapevine; **held on astrolabe, which I had predicted would not fail** |
| `NOT CONFORMANT` from a handful of rules, not a wall | **Held** — four core failures                                                      |
| D3's machine-first blindness is a false positive     | **Held, and found independently**                                                  |

One prediction was wrong in a useful direction. I read `astrolabe`'s dispatch and concluded its bare
invocation would exit non-zero; it prints help and exits `0`, and the kit caught it. The adopter
mispredicted the same case from the same source and noted it themselves: _"acc was right, I was
wrong. Fair point for black-box evidence over reading the source."_ **Two readers of the source both
got it wrong and the black-box probe got it right**, which is the argument the project makes,
arriving unprompted from outside.

## What the adopter valued

Recorded because a report that lists only defects misrepresents the trial, and because these are the
claims that survived contact.

- **`probing.md` reasoned its way to their exact hazard and designed around it.** grapevine has
  `close`, `reset`, `stop`, `reap`. The page explains that a probe omits a verb wherever it can
  because discovery cannot know a verb is side-effect-free. Their words: _"It didn't warn me about
  the hazard — it designed around it. That is why I was willing to run this at all."_
- **The coverage-gap machinery.** _"Naming 90 gaps and separating `conformant` from `fullyVerified`
  is a real contribution."_
- **Exit codes behaved as documented** — `9` non-conformant, `0` conformant, and `5` (`not_found`)
  when fed a bad path. "Outcomes are not errors" held up in practice, unprompted.
- Fast: 18 probes in ~334 ms.

## What they changed, and what they refused

**Fixed** — grapevine now answers `--version`/`-V`/`version`, JSON by default with `--human` for
prose, no daemon spawn and no config read. They justified it independently of the kit: grapevine
already reads a `PLUGIN_VERSION` to warn about daemon/CLI skew, and its `roll` verb is documented as
"version verify" — so version skew was a named live hazard with no cheap way to ask the question.
107/107 existing tests pass; core failures 3 → 2. _(That skew warning fired at them for real while
they were posting the report.)_

**Refused** — D2/C2. Bare-invocation behaviour is a product decision belonging to the repo owner,
and a better score was explicitly not the goal. See EXT-3 for why refusing it also means they cannot
reach a green gate.

This is the balance we asked for and did not get to enforce: one fix that stands on its own merits,
one refusal on principle.

## Follow-up answers

Five questions were put back to the adopter on what the report left open. The answers moved the
priority order, so they are recorded before the disposition rather than after it.

**On what would have made the trial clearly positive** — not more rules. _"The two rules you
already have, reaching my CLI."_ D1 was a real defect, but they would have hit it themselves the
next time they wanted to know which version they were holding: **the report pulled it forward by
weeks, it did not produce it.** What would have justified the run outright is B3/B5 executing
against the JSON envelope on an **error** path — does the envelope hold its shape when the parse
fails, not only when it succeeds. That is the contract their callers depend on and the one they have
no independent check on.

This reframes EXT-4. It is not a coverage gap on an unusual target; **it is the value proposition
for the class of CLI this project is aimed at**, and its absence is why the run came out
break-even.

**On catching the stale install: they did not detect it, they got lucky.** They cloned the repo to
read the README before installing, so they were already holding a second source of truth when they
ran `acc --version` as a routine post-install smoke test. Their words: _"Someone who followed the
README's install line without cloning first sees `0.1.0`, which is a perfectly plausible version
number, and has nothing to compare it against."_ That is the argument for putting the kit's version
in the report header — it makes the comparison available to someone who has not accidentally armed
themselves for it.

**On EXT-3, a design constraint worth more than the three mechanisms originally offered.** Asked
what JSON they would have committed, they gave the waiver they had already written and added: _"I
didn't want a second entry, a C2-specific escape, or anything that named the coupling — if I have to
describe the coupling in config, the config has become a model of your internals rather than a
statement about my CLI."_

That rules out two of their own three suggestions and points at the third: **a waiver propagates
along the evidence it waives, automatically, with nothing in the config naming the relationship.**

**On EXT-4, they argue for a config key over inference using this project's own roadmap.** L1/L2
rests on the CLI declaring what its commands do and the kit trying to falsify the declaration — _"a
declaration that cannot be falsified is a comment that lies."_ Machine-mode-by-default is exactly
such a declaration, and falsifiable at the lowest possible cost: run a plain data invocation and see
whether stdout parses. _"An inference can't be falsified, because the inference **is** the guess."_

Their evidential objection is the sharper half: the kit already infers machine mode from help text,
and that inference is what got grapevine wrong. A `--human` inverse is a better signal than prose
but still a guess, **and the most machine-first CLI possible has no inverse flag at all** — nothing
to infer from, read as "no machine mode", the same wrong answer on the target where being wrong
costs most. Proposed shape: `"machineMode": "default"` at the top level of `acc.config.json`,
beside `rules` rather than inside it, because it describes the target rather than binding a rule.

**On whether they nearly stopped: yes, once, at install step 3.** Fifteen minutes in, having
cleared the stale clone, reinstalled, and watched `acc --version` still report the old number, the
live question had stopped being "what will this find" and become "is this installable at all." Two
more minutes and it would have been written up as "could not install" and abandoned.

What saved it was that running from a clone was available, because they had already cloned to read
the README. _"If the repo had been one I couldn't clone — which the README's own framing describes,
a private repo you install from over ssh without ever reading the source — I would have had no
fallback and would have stopped there. **The trial survived on a workaround that the documented path
doesn't leave you.**"_

**EXT-8 was withdrawn by its author**, who re-checked and confirmed the narrowing here. They
replaced it with a better observation: piping silently changes the output shape, and it caught them
twice in one session without their noticing it was the same surprise both times. EXT-6 and EXT-8 are
**two symptoms of one root cause**, and the fix belongs at the cause.

## Disposition

Nothing is discharged. Order revised after the follow-up:

1. **EXT-2** — a checker that invents a cause. The only finding that damages the premise.
2. **EXT-4** — machine-mode-by-default as a declared, falsifiable config key. Promoted from P1: the
   adopter names its absence as the reason the trial was break-even rather than positive, and it is
   what makes B3/B5 reach the target class this project is for.
3. **EXT-3** — waiver propagation along shared evidence, with the constraint that the config must
   not have to name the coupling.
4. **EXT-1** — document the silent install arm, and put the kit's version in the report header.
   Severity raised: the documented path leaves no recovery, and this trial only survived because the
   adopter had deviated from it.
5. **EXT-6** (with EXT-8 folded in) — one fix at the root: piping changes the output shape, and
   nothing says so.
6. **EXT-5, EXT-7** — roadmap candidates rather than pre-adoption work.
