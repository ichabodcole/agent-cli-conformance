---
type: decision
title: If it is not in the config, the kit does not infer it
description:
  What a config must minimally declare resolves to one principle — a choice the kit makes for a
  caller is stated in the file or is not made at all — which rules out an empty object, an
  `acc init` that derives values by probing the target, and optional keys with defaults behind
  them.
tags: [config, declarations, inference, setup, l1]
related:
  [
    decision/require-a-config-never-raise-ownership,
    concept/probing,
    concept/machine-mode,
    concept/conformance,
  ]
status: stable
generated: { by: claude-opus-5, at: 2026-08-24 }
---

# If it is not in the config, the kit does not infer it

## Context

[Require a config](./require-a-config-never-raise-ownership.md) settled that `acc check` stops
when no declaration was loaded, and
[left the next question open](./require-a-config-never-raise-ownership.md#also-open-what-a-required-config-must-contain):
what the file has to say before a run can start. Three shapes of the question were put — whether
`{}` counts, whether a generated config may fill itself in from what the target does when probed,
and how readily a key should be optional.

They are one question. Each is a place where a value the kit acts on could live somewhere other
than the file the caller wrote.

## Decision

**A choice the kit makes on a caller's behalf is stated in `acc.config.json`, or the kit does not
make it.** Where a value is not in the file it is in code, and a value in code is hidden from the
person whose result depends on it — they can read the config and still not be able to account for
the verdict they got. This applies whether the value arrived as a language default, a heuristic,
or a reading of the target's own behaviour.

Three applications follow, and they were reached separately before they were recognised as one.

### An empty config is not a config

`{}` leaves the kit in the position a missing file left it in: guessing, or hedging every answer
it gives. It also reintroduces the fork the previous decision was taken to end — the two-mode
problem arriving one level down, inside a file whose existence was supposed to settle it. A run
against a config with values and a run against a config without them would need documenting as
two behaviours, and the branch would be selected by whether the caller filled anything in, which
is not a distinction any page can usefully explain.

The `helpFlags` case makes the second cost concrete. A kit that proceeds on an empty config is
assuming a shape for the target's help surface — that there is one, that it is reached the usual
way, that what comes back is the command's own description of itself. That assumption is not
written down anywhere the caller can see, which is the objection, and it holds equally whether the
guess turns out right.

### `acc init` states values; it does not derive them

A generated starter config is welcome. A generated config that inspected the target and wrote down
what it found is not.

The distinction is the whole point of this decision: **a default is a stated assumption, a derived
value is a hidden one.** A file that ships `defaultOutput` unset, or a rules block a caller is
expected to edit, is making a claim in plain sight — the caller can read it, disagree with it, and
change it. A file whose values came from probing reads identically and means something else
entirely: the caller has no way to tell which lines are their intent and which are a machine's
inference about their tool, and the ones that are half right are worse than the ones that are
wrong, because nothing prompts them to look.

The failure mode is not exotic. The more targets a probe meets, the more shapes it meets, and an
inference that has held so far is a claim about the population it has been shown rather than about
CLIs. An assumption that is never made cannot be broken by the next one.

### A key that could be required is required

Where a key is optional, the question to ask of it is whether its absence means the kit guesses.
If it does, the key is required. An override with a default behind it is the same hidden value in
a friendlier shape: the caller reads their config, sees no mention of the thing that produced the
behaviour they are asking about, and has nowhere to look.

This is a lean rather than a rule with a list attached, because the list does not exist yet —
today `acc.config.json` accepts three keys, and the question only bites as the fourth and fifth
arrive.

## Rationale

**The argument is the previous decision's, applied to the contents of the file rather than to its
existence.** A second mode is expensive whether it is selected by the absence of a file or by the
absence of a key inside one: two behaviours to keep working, two sets of verdicts to keep
consistent with each other, and every rule added later added twice. Requiring the file bought that
saving at the boundary; requiring it to say something is what keeps the saving once the caller is
inside.

**And a declaration is falsifiable in a way an inference is not**, which is why this project
prefers one everywhere else. `defaultOutput: "json"` against a tool that answers a parser error in
prose fails [B5](../rules/streams/machine-mode-holds-on-parser-errors.md); that is the declaration
being caught, and it only works because a person asserted it. A value the kit derived and then
checked against the target is checking its own guess, and a value the kit derived and did not
check is the guess with a config file's authority added to it.

**What this does not reach, stated so the principle is not read wider than it is.** `rules` and
`knownFailures` are config keys that encode the caller's choices, and they satisfy the principle
by construction — a waiver or an accepted failure is a declaration, written down, with a required
`reason` beside it. The catalogue's own positions are the harder boundary: a rule's `tier` and
`deviation` are choices the project made for every adopter, they live in
[the rule page and its checker](../SCHEMA.md#rule-pages-carry-extra-frontmatter) rather than in
anyone's config, and a project's `rules` block overrides them rather than stating them. That is
the "default with an override" pattern this decision is suspicious of. It survives on a
distinction worth naming: those defaults are published, cited by id in the output, and reported in
[the frame the verdict was reached in](../concepts/conformance.md#the-frame-a-verdict-was-reached-in),
so nothing about them is hidden from the reader of a report. The principle bites on facts about
_this target_ that the kit would otherwise guess, not on positions the catalogue takes in public
and names when it acts on them.

**Requiring a key is one way to avoid a guess and it is not the only one.** `defaultOutput` is
optional today and its absence produces no default: the machine-mode rules report `unverified` and
name the key as the remedy, which is the [`L0` admission
test](../concepts/probing.md#what-l0-may-assume--the-admission-test) working rather than a hole in
it. Nothing is inferred and nothing is hidden — the caller is told, in the report, exactly which
declaration would have changed the answer. So an optional key whose absence withholds a verdict is
consistent with this decision, and an optional key whose absence supplies a value is not. The lean
toward required is about the second kind.

## Left open: whether `unknown` may be declared

Whether a required key may be answered with an explicit `"unknown"` is not settled here. The lean
is against it — the caller who does not know how their own CLI behaves is the caller a declaration
format has least to offer, and forcing the answer is the point of asking. But it is a lean, and it
was left as one deliberately: what would settle it is looking at the actual cases where somebody
reaches for it, which nobody has yet collected.

**It is a different question from opting out**, and the two must not be merged on the way to
answering it. A project that cannot satisfy a rule says so through
[`rules`](../concepts/conformance.md#waivers-a-rule-that-does-not-apply-to-this-tool) or
`knownFailures`, with a reason, and that is a legitimate and already-designed move. `"unknown"` on
a shape key would be something else — not "this rule does not bind for my tool" but "I do not know
what my tool does" — and it would flow into the kit's reasoning rather than out of the gate.

## Consequences

### Sketch `L1`'s declaration shape before adding a shape key to `acc.config.json`

`helpFlags` is the first key that would describe the target's own surface — here is the flag, here
is what it means, here is what it is supposed to do — and that is what `L1` is for. Adding it to
`acc.config.json` first risks defining the same information twice, in two places with two
vocabularies, and leaving the config's version behind as a vestigial tail once the declaration
format exists.

[The roadmap already carries the narrow form of this
warning](../../roadmap.md#6-the-portable-declaration-ir): the moment a second key lands on the
machine-mode axis, `defaultOutput` and something like `machineFlag` have to agree on a vocabulary,
and the decision is cheap while the parser is open and expensive once adopters have written both.
That is a warning about **spelling**. The `helpFlags` case generalises it to **structure** — not
which word names the axis, but which artifact owns the declaration at all. So the sequencing this
implies is stronger than the roadmap's: settle enough of `L1`'s declaration shape to know where a
shape key belongs, and then add it, rather than adding it and reconciling later.

This does not block the rest of the decision. `rules`, `knownFailures` and `defaultOutput` say
nothing about the target's command surface, and the principle applies to them today.

### What the code does today, which is not this yet

Three gaps, none of them closed here.

- **`{}` is currently valid.** [`loadConfig`](../../../src/acc/kit/config.ts) requires no key:
  `rules` and `knownFailures` default to empty, `defaultOutput` is optional, and a file containing
  only `{}` loads clean. Unknown top-level keys are rejected and every accepted key is validated
  down to its own keys — the file is strict about what it is told and silent about being told
  nothing.
- **A missing file is not yet a refusal.** `loadConfig` returns an empty config with
  `origin: "none"` when the working directory holds no `acc.config.json`. The refusal is decided on
  [the previous page](./require-a-config-never-raise-ownership.md) and not implemented, so both
  halves of "no config, no result" are still ahead of the code.
- **The exit code for a missing config is still open**, along with whether this repository must
  ship one for `acc check ./acc` — both carried on that page rather than reopened here.

### A setup skill is the intended front door, and nothing here is one yet

The stated intention is that the kit ships a skill so that a first-time agent is walked through
setup rather than sent to read documentation — which is the shape this decision makes necessary,
since the file can no longer be skipped and can no longer be filled in by inspection.

Nothing in this repository does that today. `.claude/skills/` holds three skills and all three are
maintainer-facing — `prose-cold-read`, `two-lens-review` and `release` are about writing and
shipping this project, not about adopting it. The only place a shipped skill is named as an
artifact is [roadmap step 6](../../roadmap.md#6-the-portable-declaration-ir), where it appears as
one of the things a portable declaration format would become the single source for, which is a
different thing at a different time. The adoption path that exists is prose:
[how to reach L0 in your project](../guides/how-to-reach-l0-in-your-project.md).

## What would change our mind

**Derivation earns its place** if a probe turns out to establish something about a target that a
caller demonstrably cannot state themselves — and it would arrive as a probe result the report
publishes beside the config, labelled as measured rather than declared, not as lines written into
the file. The objection is to derived values wearing a declaration's clothes, not to measurement.

**The lean toward required was too strong** if adopters start declaring keys they have no basis
for, to get past a gate. A required field answered by a guess is worse than an optional field left
empty: it moves the guess into the file, where the kit will believe it and the reader will assume
a person meant it. If that is what the cases show when somebody collects them, the `unknown`
question answers itself in the affirmative and this page narrows.
