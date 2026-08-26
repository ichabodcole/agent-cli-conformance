---
type: plan
generated: { by: claude-opus-5, at: 2026-08-26 }
status: draft
lifecycle: live
description:
  A new `acc probe-plan` command that emits a runnable capture harness rather than a list of
  argv, cutting at the seam the guide already draws between fields the kit can derive and the two
  only the caller can attest. Asked for by both adopters, designed from what each of them built
  by hand first.
tags: [adoption, evidence, declaration, probe-level, tooling]
---

# The probe-plan generator

**Read [the recorded-surface batch](./2026-08-25-the-recorded-surface-batch.md) first.** That plan
pins the format this one produces; nothing here changes it.

## Why this exists

Two adopters, on different tools, with no contact between them, independently wrote the same
thing before building a batch:

```python
argv = path + ["--acc-not-a-flag"]
```

Both described their version as worth nothing to anyone else. The anthill adopter asked for this
directly — _"if you build one thing next after the reader, I would build that"_ — and the magpie
adopter built one by hand the same day without calling it that. **The derivation is a pure
function of a path list, and every adopter is currently re-writing it.**

## The design, and where it came from

Everything below is a consequence of something an adopter measured. The sourcing is kept
attached, because the parts that look like ergonomic preferences are the parts that came from a
failure.

### 1. Emit a capture harness, not a list of argv

**A bare argv list is the wrong deliverable.** The argv was the easy half of what both adopters
wrote; the hard half was the capture, and `completeness` is a property of **how you capture**
rather than of what you claim afterwards. The magpie adopter could honestly assert `complete`
only because their runner read both pipes to EOF; had they piped through `head`, the honest answer
was `unknown` and they doubt a hurried adopter would notice the difference. They named this the
field where they would most expect a false `complete` in the wild.

A generator that emits a correct harness makes `complete` **true by construction**. A generator
that emits a list leaves everyone to re-derive the harness, badly, with `head` in it.

### 2. Cut at the seam the guide already draws

[Step 4 of the guide](../wiki/guides/how-to-record-surfaces-below-the-root.md) already says
`streams` and `completeness` are the only two fields on which the caller is the authority. That is
the seam:

| the generator derives                                          | the caller attests         |
| -------------------------------------------------------------- | -------------------------- |
| `formatVersion`, the envelope                                  | `streams`                  |
| `path`, `argv`                                                 | `completeness`             |
| the harness that fills `exitCode`, `stdout`, `stderr` verbatim | `recordedBy`, `recordedAt` |

**The attested fields must refuse to default.** If the skeleton ships with
`"completeness": "complete"` pre-filled, every adopter attests it without deciding, and the one
field the guide says only they can answer becomes the one field nobody answered. Emit an explicit
value that the reader **rejects**, so an unedited harness fails loudly rather than lying quietly.

### 3. Say which artifact the plan was derived from — and prefer the parser

**This is the one that is not ergonomics, and it came from the magpie adopter unprompted.**

They derived their probe list from the tool's **dispatch switch**, and wrote the declaration
separately from **help**. Two artifacts, two sources. A generator that derives the probe list from
`commands[].path` in the declaration loses that:

> If the probe plan comes from `commands[].path`, you can only ever discover drift at paths the
> declaration already names. A verb that exists in the parser and is missing from help would never
> be probed — it would sit in the census as nothing at all, not even as a disagreement.

On magpie the hole was empty — switch and help both had seventeen — **but they only know that
because they built the two sides independently and they happened to agree.** A declaration-derived
plan would have assumed it.

So:

- `--declaration <file>` is the convenient source and stays the default.
- The emitted batch and the plan itself must **record which artifact the paths came from**, the
  way every census line already names its observer.
- The report should say, where a plan was declaration-derived, that **paths absent from the
  declaration were never probed** — a limit of the plan, not a finding about the tool.
- A second source (a caller-supplied path list, from wherever they actually enumerate verbs)
  must be accepted, because that is the shape that can find the hole.

### 4. Record the build, not only the person

`recordedBy` is free text and the guide's three examples are all people or jobs. The magpie
adopter wrote `"flint (agent) via bun subprocess, magpie working tree feat/magpie-acc-l0"` on
instinct, and the branch turned out to be the most valuable thing in the block: **this session's
largest confusion was two parties measuring two different builds** — a registration against
`2b2ce93`, a census against `d7dfacf`, with a `--version` added in between.

Emit a commit SHA by default. `recordedBy` reads as provenance-of-person; what disambiguated the
trial was provenance-of-artifact, and it was got right by accident.

### 5. The argv rules become an invariant, not a compliance burden

The three rules that decide whether a rejection is readable exist **only because adopters
hand-write argv**. `path + [sentinel]` satisfies all three by construction — no `--` can appear,
exactly one token follows the path, and it is flag-shaped.

Both adopters confirmed they satisfied rules 1 and 2 **by accident** and only rule 3 (a sentinel
the tool cannot plausibly own) deliberately, prompted by the guide's warning. The anthill adopter
also reported nearly breaking rule 2: they considered probing group nodes **bare**, with no token
after the path — on the exact three paths that turned out to be the interesting ones.

A generator makes accident into guarantee. **The guide's rules section stays**, because a caller
supplying their own argv still needs it, but it stops being the common path.

## What is NOT in scope

- **Running the harness.** The kit does not execute below the root; that is the whole reason this
  format exists. The generator emits something the caller runs.
- **Changing the batch format.** `formatVersion` stays `"0"`.
- **Guessing paths from help.** Discovery's verb extraction is a heuristic tuned for the root, and
  a wrong path list produces records at paths that do not exist. If no declaration and no path
  list is supplied, refuse.

## Open questions for whoever builds this

1. **What does the harness emit in?** A `sh` script is the lowest common denominator and the
   easiest to get `completeness` wrong in (a pipe, a `head`). A small runner in the target's own
   ecosystem is safer and is not portable. Possibly both, chosen by a flag.
2. **Does it emit one file or two** — harness plus a batch skeleton, or a harness that writes the
   batch itself? The magpie adopter asked for `--out ./capture.sh` writing `batch.json`, which is
   the second.
3. **How is a path list supplied** for the non-declaration source, and what does the batch record
   about where it came from?
4. **What does `acc check` do with a plan-derived batch it can tell was declaration-derived?**
   Naming the limit is right; whether it belongs on the census line or in the recorded-surfaces
   block is not settled.

## Validation

The magpie adopter has two more batches to build this session and offered to build one against a
draft — _"I would rather find the trap than describe it."_ **Take that offer.** They are the only
person who has built one of these from the guide alone, and that expertise expires the moment a
generator makes it easy.

The anthill adopter has already broken their own batch three ways to test the failure modes and
should be sent the design rather than the finished thing.
