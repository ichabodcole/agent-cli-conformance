---
type: report
generated: { by: claude-opus-5, at: 2026-09-02 }
status: draft
lifecycle: live
description:
  The repair record for the third enumeration state, and the thirteen rulings taken on the owner's
  behalf while it was built. Carries the verification that established the fix, the two lenses and
  the cold read that examined it, and the finding the run produced about its own method — that one
  defect class recurred ten times and three of those were introduced by the repair for another.
tags: [conformance, evidence, remediation, adoption, tooling]
subject:
  what was established about the third enumeration state, what was decided without asking, and what
  the run measured about writing prose against code
examined:
  branch `feat/the-third-enumeration-state` at `50c700c` against merge-base `69f050e`; 26 commits,
  24 files; 222 invocation pairs swept across both trees; macOS, 2026-09-02
---

# The repair record for the third enumeration state

**Verdict: `defects to repair`.** The original defect is fixed and independently verified. The
verdict is not `clear to land` because one observed move was never predeclared and a cold reader
reached defects that were deliberately scoped to follow-on work. Landing is a separate decision;
this records what was established.

The plan is [the third enumeration state](../plans/2026-09-02-the-third-enumeration-state.md).

## What was repaired

A target answering an unknown-flag probe with an explicit empty set — `"choices": []`, meaning it
accepts no flags at that path — was recorded `not-enumerated` and its path dropped from the census.
That status asserted the tool **has** flags and merely did not list them, so the kit published the
negation of what the target said. The adopter's own summary of the cost:
_"the fraction moves the wrong way as the tool improves, which is the one direction a measurement
must never move"_ ([the magpie trial](./2026-08-26-the-magpie-trial.md)).

The competing explanation was tested and rejected. Deleting the length guard makes any empty
recognised key an enumeration of zero flags, so a false empty **generates** findings where a false
`not-enumerated` only suppresses them. The repair needed a fourth status, not a deleted clause.

## Verification

| Check               | Result                                                                                                                                                     |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Target reproduction | Both recorded paths mint the new state; census counts 2 of 2; `declared-not-accepted` emitted                                                              |
| Edge cases          | Nine-shape boundary matrix at and below the root; the exclusion is normalised, so a respelling cannot evade it; recorded evidence still beats an empty key |
| Defect-restored     | Reverting the empty scan to return nothing gives 1832 pass / 17 fail, the adopter's tests failing on the status **and** the census number                  |
| Before/after sweep  | 222 invocation pairs across both trees; 17 moved assertions, 16 intended                                                                                   |
| Same-class audit    | Ten instances across the run; three introduced by a repair for another                                                                                     |
| Far seam            | Two dependents found late and named in no plan or brief: the consumer skill, and the page defining `choices` for adopters                                  |
| Repository gate     | Green, 1851 tests                                                                                                                                          |

**Held outcomes, machine-checked across every pair:** no exit-code movement, no rule verdict
movement, `conformant` and `fullyVerified` unmoved, 23 rules throughout, `flags` absent and never
empty, and an empty `choices` at the root still recording `not-enumerated`.

## Independent review

Preparation was expanded rather than bounded, on four of the conditions in
[`repair-chain`](../../.claude/skills/repair-chain/SKILL.md) — the premise crosses code, tests and
documentation; more than one home asserts the rule; the repair adds behavioural prose; and the work
repairs a previous repair.

- **Reviewer A, correctness: correct.** Established by execution, including proving both
  exhaustiveness claims by adding a fifth union member and observing exactly two compile errors.
- **Reviewer B, consequence: eleven consequences.** Three sat in prose that three commits had
  authored and nothing had audited.
- **Cold read:** the reader stopped before the section on recording below-root surfaces, unable to
  determine whether their flagless subcommands would produce agreement or a wall of findings.

## The rulings

Decisions taken without asking. Each carries what it costs if wrong.

| #      | Ruling                                                                  | Cost if wrong                               |
| ------ | ----------------------------------------------------------------------- | ------------------------------------------- |
| R1     | The declaration comment belongs to the guard's task, not the prose task | Edited twice, the second a no-op            |
| R2     | The near-miss fix belongs to the compare task, not the minting task     | A test passes immediately                   |
| R3     | The minting task writes only its own member's comment                   | One paragraph contradicts for a few commits |
| R4     | The rollup test goes beside the existing rollup coverage                | Lands in a neighbouring file                |
| R5     | State the cross-version limit honestly; add no version comparison       | A paragraph replaced later                  |
| R6     | The status is named `enumerated-none`                                   | A rename across fourteen sites              |
| R7     | The new field's documentation folds into the docs task                  | Undocumented one release longer             |
| **R8** | **An empty `choices` never mints the new state**                        | **A green suite over the unfixed defect**   |
| **R9** | **Supersedes R8 — exclude at the root only**                            | A missed improvement, not a regression      |
| R10    | The plan's near-miss premise is superseded; the work is rendering       | A test written for an impossible regression |
| R11    | The parity fix is verified by measurement, read by the next reviewer    | A documentation list reads unevenly         |
| R12    | The old status's doc claim is false and is fixed inside this scope      | The contrast rests on a stronger warrant    |
| R13    | The user-facing parenthetical is queued rather than fixed here          | One release with a known ambiguity          |

**R8 is the ruling that mattered.** A reviewer showed that `choices` is ambiguous between flags and
subcommands, and the controller excluded it everywhere — sound reasoning from the evidence given,
and wrong, because the adopter artifact this work exists to fix spells its empty answer with exactly
that key. The exclusion would have shipped a passing suite over the reported defect. An implementer
caught it in a hand-off note. R9 replaced it with the positional rule the code already implied: the
root is the one place the kit reads `choices` as subcommands, so the ambiguity is a property of
position rather than of the key.

## What the run established about its own method

**One defect class produced ten instances: a statement asserting what the code does not establish.**
Three were introduced by the repair for another one. Every instance was found by a person reading
prose against code; the repository gate — typecheck, lint, format, two doc linters, a site build and
the full suite — found none, because no step compares a claim to its subject.

Nine of the ten were claims spanning cases rather than describing one. Each sat on a threshold or an
exclusion: a fold at four paths, a sample capped at four members, a key excluded at one position.
Sentences about a single instantiated case were almost all true. **Compression is the operation that
loses this**, because the exceptions are what a summary omits.

The intervention that worked was procedural rather than informational. Stating the rule in a brief
did not prevent instances. Requiring each quoted render to arrive with the command that produced it
did: roughly fifteen came back byte-exact under independent check, and that wave's two failures were
exactly the claims the requirement did not reach — a count embedded in prose, and a `because`.

Two artifacts came out of this. [`write-from-the-run`](../../.claude/skills/write-from-the-run/SKILL.md)
carries the procedure for the moment a sentence is written, which no instrument covered.
[`guidance-not-argument`](../../.claude/skills/guidance-not-argument/SKILL.md) gained the shape that
compression manufactures — a quantifier nobody enumerated — and the trailing clause that calibrates
a claim rather than stating a consequence. The general instrument is
[claims about the code that nothing re-derives](../roadmap.md#claims-about-the-code-that-nothing-re-derives).

## Limits

- One adopter's bytes. No other real-world target emitting an empty recognised key was available.
- One moved row was never predeclared: `acc compare` now renders near-miss clauses for the old
  status too. A deliberate non-revert, and an improvement, but outside the contract.
- Three items the final pass could not settle by measurement, named in its own report.
- The population a cold reader needs was not repaired: a term used nine times before definition, a
  level vocabulary never explained, and one word carrying three incompatible meanings across two
  documents. Scoped to follow-on work rather than fixed.
- Two process failures. Two implementers were dispatched into one worktree; nothing was contaminated,
  and only because the file sets did not overlap. A false claim about the code was written into the
  final wave's brief and disproved by the implementer who ran it.
