---
type: report
generated: { by: claude-opus-5, at: 2026-08-22 }
status: draft
lifecycle: live
description:
  The `deviation: design-choice` classification may not be a property of a rule at all. Every rule
  it labels is one a declaration would resolve, and no rule it does not label is — which suggests
  the field is marking rules that belong at `L1`, not rules that are permanently different.
tags: [probe-level, l1, scope, declaration, catalogue, open]
subject: the four `design-choice` rules, and what they have in common
examined: docs/wiki/rules/, docs/wiki/concepts/probing.md, docs/wiki/SCHEMA.md
---

# `design-choice` may be `L1` leaking into `L0`

**Not a proposal. A recorded signal**, written before `L1` design starts because it changes what
`L1` is for.

## The observation

`deviation` was added to say what a violation MEANS: `defect` where no defensible alternative
exists, `design-choice` where a different design can be right. Four rules got `design-choice`:
[D2](../wiki/rules/discoverability/bare-invocation-is-a-usage-error.md),
[D3](../wiki/rules/discoverability/help-advertises-machine-mode.md),
[A6](../wiki/rules/parsing/double-dash-terminator.md) and
[F2](../wiki/rules/safety/first-byte-is-prompt.md).

They have something in common that was not the criterion used to pick them:

| rule | the declaration that would settle it                                  |
| ---- | --------------------------------------------------------------------- |
| D2   | "a bare invocation returns a manifest of my command surface"          |
| D3   | "my machine-readable path is `X`" — or "I have none"                  |
| A6   | "my grammar is position-independent; `-`-leading is always an option" |
| F2   | "my startup loads a model; my first-byte budget is `N` ms"            |

And the rules it does **not** label go the other way. No declaration makes crashing acceptable
([G1](../wiki/rules/lifecycle/inert-invocations-do-not-crash.md)), or leaking a credential
([F1](../wiki/rules/safety/no-secrets-in-help-or-schema.md)), or truncating output
([B4](../wiki/rules/streams/output-is-delivered-whole.md)), or putting diagnostics on stdout
([B1](../wiki/rules/streams/stdout-carries-only-data.md)).

So on the current catalogue, `design-choice` and _"a declaration would resolve this"_ pick out the
same four rules. That correlation is the finding.

## Why it matters: this is a defect class the project already met

[Probing](../wiki/concepts/probing.md#what-l0-may-assume--the-admission-test) states what `L0` may
and may not do, and the last row of its table is:

> `L0` may **falsify something the target declared**. `L0` may not **falsify something the kit
> inferred on the target's behalf**… falsification needs an assertion: with none, a kit supplies
> its own, tests its own supposition, and reports the result as though the target had promised
> something.

**A `design-choice` rule at `L0` supplies its own assertion.** Nothing about the target says a
bare invocation should be a usage error; the catalogue says it, tests it, and records a gap when
the target differs. That is the shape the machine-mode work spent seven attempts and a major
version removing.

**The difference is honesty, not structure.** The machine-mode inference was a guess dressed as a
predicate — the kit read `--json` out of help and pretended the target had promised something. The
design-choice rules say plainly "this is our default." That is much better, and it is still the
kit testing a claim the target never made.

**The admission test does not catch this**, and that is worth noticing. It asks whether a rule
must work out what one of the target's own _words_ means. These rules infer nothing from the
target's vocabulary — they assert a design preference instead. Same principle violated, different
route, and the test as written lets it through.

## What it costs today

A tool that declares its difference through the only mechanism available — a waiver — is marked
for it. Measured, on a target that waives D2 with a stated reason:

```
conformant: true    fullyVerified: false    D2 listed in evidenceGaps
```

`fullyVerified` reads `evidenceGaps`, and a waiver lands there whatever the reason. That rule is
principled for a `defect`: you chose not to be measured against a real failure, and the evidence
claim should show it. For a `design-choice` it conflates two different things — _"I hid a
failure"_ and _"this rule does not bind for my design"_ — and the mark is permanent.

The adopter who hit this named it as a reason not to put the kit in CI: committing an
`acc.config.json` to a repository that does not otherwise depend on `acc`, purely to record a
design decision, is _"dead config carrying a live opinion."_

## The direction this points

Today a consumer **opts out of our defaults**. At `L1` a consumer **declares their design and the
kit falsifies the declaration**. Those are not the same relationship, and the second is the one
this project says it is building.

Under that reading:

- **`design-choice` is not a permanent property of a rule.** It is a marker that the rule is
  waiting for `L1` — a placeholder for a declaration that does not exist yet.
- **`L0` may end up smaller than it is now**, not larger. The mechanical rules — exit codes,
  stream discipline, hangs, crashes, determinism — are what survives an assumption-free level.
- **The waiver stops being the mechanism.** A declaration is not an exemption from a rule; it is
  the thing the rule is evaluated against. `fullyVerified` would then be a claim about the
  target's own declared contract, which is what it should have been measuring all along.

## What would settle it

1. **Does the correlation survive a fifth rule?** It holds on four. The next rule classified
   `design-choice` either declares cleanly or breaks the pattern, and either is informative.
2. **Can each of the four be written as a declaration** that a checker could falsify — not just
   phrased as one? D3 is the interesting case: "I have no machine-readable mode" is a declaration
   whose falsification is trivial, while A6's grammar claim may need probes `L0` cannot send.
3. **Should `fullyVerified` distinguish a waived `defect` from a waived `design-choice`?** That is
   answerable now, independently of `L1`, and it is the part costing an adopter today.

## What this does not say

It does not say `L0`'s scope should shrink now, or that the four rules should move. The catalogue
is more useful with them than without, and a project starting a new CLI gets a coherent set of
defaults precisely because they are there. The claim is narrower: **when `L1` is designed, these
four are the evidence for what `L1` is actually for**, and the boundary between the levels is
fuzzier than either page currently admits.
