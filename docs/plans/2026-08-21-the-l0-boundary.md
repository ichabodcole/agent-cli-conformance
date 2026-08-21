---
type: plan
generated: { by: claude-opus-5, at: 2026-08-21 }
status: draft
lifecycle: live
description:
  Draw a sharp boundary around what `L0` may assume, on the grounds that falsification needs an
  assertion and `L0` has been manufacturing its own — demote the three core rules that condemn on
  an inferred meaning, keep the contrast as a reported signal, and name declaration as what `L1`
  buys.
tags: [conformance, probe-level, machine-mode, scope, falsification]
---

# The `L0` boundary — what a kit may assume when nothing has been declared

**Goal:** `L0` makes a promise it can keep. Every core failure it reports rests on something it
observed, never on a guess about what a token means. Where it must guess, it says so and gates
nothing.

## The problem, stated once

Three core rules — machine output parses, machine mode holds on a parser error, `--version` in
machine mode returns a document — apply **only when the tool is in machine mode**. Nothing declares
machine mode at `L0`, so the kit infers it from the spelling of a flag in `--help`.

That inference is not a small approximation. It is the kit writing the claim it then tests:

> We are trying to falsify something based on a claim that hasn't been made.

Falsification needs an assertion to falsify. With no assertion, the kit supplies one, tests its own
supposition, and reports the result as though the target had promised something. Five consecutive
attempts to make that sound have each failed in a different direction, which is the symptom of a
premise that cannot be repaired rather than an implementation that keeps missing.

**The specific reason it cannot be repaired**: two tools emit byte-identical evidence on every probe
available at `L0`, with and without the flag —

- a human-first tool whose `--json` names an **input file**, which has broken nothing;
- a tool whose `--json` is genuinely meant to select JSON output and works nowhere.

The difference lives in the author's intent. Nothing observable carries it. So the kit's options are
to be wrong about the first, wrong about the second, or to say it does not know.

## What is actually at stake — the measurement

The soft spot is narrow and precisely located. Of the twenty-two shipped rules:

| class                              | rules                                       | assumes                                              |
| ---------------------------------- | ------------------------------------------- | ---------------------------------------------------- |
| **Mechanics only**                 | 11 core, 2 diagnostic                       | nothing about meaning                                |
| **Inference selects the probe**    | 4 core (A3, B1, B2, C2)                     | a spelling, to decide what to run — never to condemn |
| **Inference licenses the verdict** | **3 core (B3, B5, D1)** + 1 diagnostic (D3) | that `--json` means "emit JSON"                      |

The eleven mechanics rules are the ones that actually break an agent: a CLI that hangs without a
TTY, exits `0` on an unknown flag, writes prose to stdout on failure, or dies on a bad argument
ruins an agent regardless of what its flags mean. **`L0` is not broadly compromised, and this plan
is not an apology for it.** One row of the table is compromised, and it is the row this branch has
been fighting for five rounds.

The middle row is the principle already working: **inference may select what to look at; only
observation may condemn.** Four core rules use a flag's spelling to choose a probe and never let it
reach a verdict. That is legitimate — a wasted spawn is the whole cost of being wrong.

## The churn was the boundary announcing itself

Worth recording as a diagnostic, because it is cheaper than five rounds of review next time.

The obvious reading is that each broken assumption forced another special case, and the case list
grew without bound. **The record only partly supports that.** Counting the conditions in the
predicate across the four attempts gives `4 → 6 → 4 → 5` — the predicate was not accumulating. It
was being **replaced**, wholesale, every time.

That is the sharper signal. Five internally coherent theories of the same question, each one
falsified by a population nobody had enumerated: a version string that happens to parse as JSON; a
machine mode reachable only on the error path; a machine mode that collapses under its own flag; a
machine-first tool whose flag names an input. Nobody was being careless. The question simply has no
answer from outside, so every theory of it was a guess dressed as a predicate, and the next
unenumerated population falsified it.

What _did_ accumulate is narrower and just as telling: **exemptions**. Clauses excusing the declared
default, excusing a null flag, restricting which routes may corroborate, pinning which branches the
guard may gate. Each one is a carve-out for "what if they meant something else here" — and a
carve-out for intent is the thing `L0` cannot have, because intent is what it cannot see.

So the boundary has a practical detector:

> **When a fix's correctness depends on enumerating populations of tools, and the enumeration is
> never complete, you are inferring meaning — and you are past the edge of `L0`.**

Rewriting the predicate rather than extending it is the same signal wearing different clothes. A
rule whose theory has to be replaced on contact with each new population does not have a theory.

## The boundary

`L0` may assume:

1. **Mechanics that need no vocabulary.** Exit codes, stream discipline, hangs, crashes,
   determinism, ANSI in a pipe. A tool's own behaviour defines the terms — "unknown flag" means
   whatever the tool rejects.
2. **Request-named conventions**, narrowly: `--help` and `--version`. These name a **request for
   information about the tool**, and that has one meaning. A tool may opt out by declaring it
   otherwise; absent that, the kit treats them as vocabulary and the catalogue advises authors to
   honour them.

`L0` may **not** assume:

3. **What a format-named flag governs.** `--json`, `--format`, `--output`, `--csv`, `--yaml` name a
   **data format**, and a format name does not say which side of the pipe it applies to — input,
   output, or the subject matter. That ambiguity is structural, not incidental, and it is why the
   request-named exemption above does not generalise.

That distinction is also **advice for CLI authors**, which is half of what this catalogue is for: a
flag named for a request is unambiguous; a flag named for a format is not, and its help entry has to
carry the direction.

## The change

1. **The three rules become `diagnostic` when the premise was INFERRED, and stay `core` when it was
   DECLARED.** The demotion attaches to the evidence, not to the rule. A tool that writes
   `"machineMode": "default"` in [`acc.config.json`](../wiki/concepts/conformance.md) has made an
   assertion, and falsifying an assertion is sound at any level — that path keeps failing builds
   exactly as it does today. What stops gating is the path where the kit wrote the claim itself.

   This is not a special case bolted on. `acc.config.json` is already a small `L1`: the mechanism
   this plan says is the real product exists in embryo, and the boundary is the line between the
   part of the kit that has an assertion and the part that invents one. It also preserves the
   finding an outside adopter called the most valuable thing the kit has produced — a machine mode
   that answers every success as JSON and every parser error in prose — because that adopter
   **declared**, and the rule still gates on the strength of their own statement.

2. **Keep the contrast test** (shipped at `0e36d8b`) as what produces the report line. It is the
   most an assumption-free `L0` can say: pair each invocation with and without the flag, and see
   whether the answer's shape changes.
3. **Add one honest flag-level line**, which is a claim about the flag rather than about the rule,
   and therefore falsifiable on evidence we hold: _"help advertises `--json`; sending it changed
   nothing we could observe."_ Today the diagnostic that reports whether help names a machine-mode
   flag passes all four of these tool shapes, so it distinguishes nothing.
4. **`L0`'s stated scope is written down** — in `docs/wiki/concepts/probing.md`, as the boundary
   above, so an adopter reads what the level promises before they read a verdict.
5. **The three rules return as `core` at `L1`**, gated on a declaration.

## What `L1` buys, and why it is the real product

Conformance means conforming **to a declaration**. At `L1` the tool states what `--json` does and
the kit falsifies that statement — which is sound, and cheap, because the hard half was never the
testing. It was never having an assertion.

Two things follow that are worth saying to adopters plainly:

- **The declaration has value before any test runs.** A CLI that states how its own interface
  behaves is a better-designed CLI: it is self-describing to a caller, to an agent, and to its own
  future maintainer. Testability is a consequence, not the motivation.
- **It rules out a class `L0` cannot touch at all.** Not "tests it better" — makes it reachable for
  the first time. Whether `--json` does what its author meant is not a hard question at `L0`; it is
  an unanswerable one.

## Costs, and who pays

- **A tool whose `--json` is meant to select JSON and works nowhere** is no longer failed on three
  core rules. It gets reported lines instead. This is the cost of the boundary and it is the point
  of the boundary: that tool is externally indistinguishable from an innocent one.
- **Adopters who never declared lose three core failures.** The same defects are still reported;
  they stop breaking the build. Anyone relying on them as a gate should be told directly rather
  than discovering it from a changed exit code — and told that the fix is one line of config, not a
  wait for `L1`.
- **Adopters who declared lose nothing.** Verdict, exit code and message are unchanged, which is
  the property to verify before this ships rather than assert here.
- **`acc` itself** has a working machine mode and is unaffected in what is detected.

## What this does not fix

- A tool that advertises a machine mode and implements none is still not condemned **unless it
  declares**. It is now _described_ — the flag-level line — and the line should point at the
  declaration as the way to be held to it.
- The `L1` declaration format does not exist. This plan does not design it; it states what it is for
  and why the three rules are waiting on it.
- Nothing here revisits the four rules that use inference to select probes. They are correct as they
  stand and are named so a reviewer can check that claim rather than take it.

## Open questions

- Do the three rules keep their identifiers when they return as core at `L1`, or does a rule that
  changes tier by level need that stated in the catalogue's own vocabulary? Ids are append-only;
  tier-by-level is not currently expressible.
- Does demotion change the **exit code** for existing adopters mid-branch, and does that warrant a
  major version rather than a minor?
- Is `--version` genuinely request-named, or is it closer to a format-named flag than the boundary
  admits — a tool for which `--version` selects a version _of something else_ would break the
  exemption the same way `--json` broke the inference.
