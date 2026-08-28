---
type: plan
generated: { by: claude-opus-5, at: 2026-08-28 }
status: draft
lifecycle: live
description:
  A design proposal for `acc declare --paths`, which turns a command-path list into a declaration
  skeleton so that drift an adopter finds by hand becomes a finding the kit can read. Written to
  be vetted — first for whether it is sound and not over-built, then by the adopter who asked, for
  whether it answers what they actually wanted.
tags: [adoption, declaration, tooling, proposal]
---

# The declaration skeleton — a design proposal

**This is a proposal, not a plan of record.** Nothing here is decided. It exists to be argued
with on two separate questions, in this order: is the design sound and no bigger than the ask
(internal), and does it answer what was actually asked (the adopter). Either review can send it
back.

## The ask, in the adopter's words

Round 3's central finding (N3). They derived a command-path list from their tool's own dispatch
table, and it surfaced three verbs — `changes`, `delete-batch`, `message` — that their usage line
does not advertise. That is the drift this kit exists to detect, found by an adopter in their own
tool for the first time. Then:

> "I had no declaration, so the most valuable finding of the whole trial lives in my prose, not in
> any artifact the kit reads. A 'declaration skeleton from a path list' generator would have
> caught it structurally."

And the bridge complaint attached to it: step 6's registry guide argues the why, "but the jump
from 'one table' to a formatVersion-0 declaration file is unbridged in what I read".

The adjacent ask, N6, from the same session: "there's no tool-side cross-check; I wanted one while
writing paths.json".

## What the kit already has, so the gap is exact

- `acc probe-plan --paths <file>` accepts a path list — a JSON array of command paths, e.g.
  `[["state"], ["send", "note"]]` — and emits a capture harness.
- `Declaration` (`src/acc/kit/declaration.ts`) is much richer: `formatVersion`, `provenance`,
  `selfDescription`, and per command a `path`, `args[]` (`name`, `type`, `status`, optional
  `values` / `valueHint`) and `positionals[]`.
- `acc check --declaration <file>` already runs the census and reports `declared-not-accepted`
  and `accepted-not-declared`.

So the census that would have turned the adopter's prose into a machine finding **already
exists**. What is missing is only the step from a list of paths to a document that census can
read. That is the whole gap, and keeping it that small is the point of this proposal.

## The proposal

One new read-only verb:

```
acc declare --paths ./paths.json > declaration.json
```

It reads a path list and emits a `formatVersion: "0"` declaration containing exactly those
command paths, with `args` and `positionals` **empty**, and the attested fields set to values the
reader REFUSES.

That is all it does. It runs nothing, reads nothing but the file it is given, and writes to
stdout like everything else here.

### Why paths-only, and no attempt at `args`

`probe-plan` already refuses to guess paths from `--help`, on the argument that a guess produces
records at paths that do not exist. The same argument forbids guessing `args`: a skeleton that
invents flags produces a declaration whose census findings are about the generator rather than
about the tool. The adopter asked for the bridge from a path list they had already derived — not
for the kit to infer their surface.

### Why it must not look finished

Prior art from the probe-plan plan, which settled this for the harness and applies unchanged:

> **The attested fields must refuse to default.** If the skeleton ships with
> `"completeness": "complete"` pre-filled, every adopter attests it without deciding, and the one
> field the guide says only they can answer becomes the one field nobody answered. Emit an
> explicit value that the reader **rejects**, so an unedited harness fails loudly rather than
> lying quietly.

A skeleton that reads as complete is worse than no skeleton: it converts "I have not declared my
surface" into "I have declared it empty", and an empty declaration makes every accepted flag an
`accepted-not-declared` finding — a wall of noise that reads as the tool being wrong.

So an unedited skeleton must **refuse to run**, and the refusal must say which fields the human
owes.

### `provenance` says where the paths came from, and does not overclaim

`provenance` is required. A skeleton's honest value is "these paths were supplied by the caller
from a list they built" — weaker than "derived from the parser", and it should say so rather than
borrow the stronger claim. If the census later disagrees with the declaration, the reader needs to
know the paths were asserted rather than extracted.

## N6, the reality check — deliberately NOT in this proposal

N6 asked for a cross-check while writing `paths.json`. The report guesses it and N3 are
"plausibly one mechanism". **They are not**, and the difference decides the cost:

|                         | N3, the skeleton | N6, the reality check      |
| ----------------------- | ---------------- | -------------------------- |
| input                   | a path list      | a path list                |
| output                  | a declaration    | which paths the target has |
| **executes the target** | **no**           | **yes**                    |

N3 is a pure transform. N6 inherits every safety question `acc check` already carries about
running someone's CLI, plus a new one: a path list is written BEFORE anyone has established the
target is safe to probe.

There is a cheaper form worth considering separately: check the path list against a **recorded
batch** the adopter already has, which executes nothing. Whether that answers N6 or only part of
it is a question for the adopter, not for us.

**This proposal takes N3 only.** N6 is named here so the split is deliberate and visible, not so
it is forgotten.

## What this does not do

- It does not infer, guess, or probe anything.
- It does not make a declaration correct — it makes one **startable**. The adopter still fills in
  args and positionals, which is the work only they can do.
- It does not close N6.
- It does not bridge the registry guide's "one table to a declaration file" gap in PROSE. If the
  verb lands, that guide should point at it — but a document change is not a substitute for the
  bridge, and if the reviewers think the guide alone would have served the adopter, that is a
  finding against this whole proposal and I want to hear it.

## Open questions, for the reviews rather than for us

1. **Is one verb the right shape, or is this a flag on `probe-plan`** — which already takes
   `--paths` and already knows this input format?
2. **Should the skeleton include the paths' `path: []` root?** `DeclaredCommand` says the root is
   declared like any other command. A path list may or may not name it.
3. **What exactly does an unedited skeleton's refusal say?** The mechanism is settled (refuse to
   default); the message is not, and it is the whole user experience of this feature.
4. **Does the adopter want stdout, or `--out`?** `probe-plan` has `--out`; everything else here
   writes to stdout.
5. **Is `formatVersion: "0"` right for a generated document**, given an unknown major refuses the
   run — does a skeleton pin the version it was generated against, or the version the reader will
   expect?

## How this gets vetted

1. **Internal review** — is the design sound, and is it no larger than the ask? Explicitly
   including: is any part of this over-built, and would something smaller have served?
2. **The adopter** — does it answer what they asked for? They are the only party who can say, and
   per this project's standing rule the consumer defines the concept.

Neither review is a rubber stamp. A "this is bigger than what I wanted" from the adopter is the
most useful answer this document can get.
