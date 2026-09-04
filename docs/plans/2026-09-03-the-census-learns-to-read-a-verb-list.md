---
type: plan
generated: { by: claude-fable-5-1, at: 2026-09-03 }
status: draft
lifecycle: live
description:
  A sketch, not yet a task list, of the second half of the answer to issue #40 — teaching the
  kit's flag reader that a group node which answers an unknown flag by naming its subcommands has
  said "no flags here", and letting the census check those subcommands against the declaration.
  Lays out the problem as two adopters met it, the documentation-only fix that ships first, what
  the reader change would give and cost, and the questions to settle before deciding to build it.
tags: [declaration, evidence, conformance, adoption, consumer-signal]
---

# The census learns to read a verb list — a sketch

> **Status of this document:** a sketch written to decide whether to build, not a plan written to
> be executed. The documentation-only fix in §3 is going ahead regardless and is not planned here.
> If the reader change is chosen, this document grows a task list and the usual review structure;
> until then it holds the options and the context, so the decision is not re-derived from scratch.

**Goal, if built:** a group node that follows the standard's own recommendation — answer a bad
flag by naming your subcommands — is compared by the census without the tool doing anything extra,
and the census gains its first check that the subcommands a tool names match the ones the
declaration declares.

## 1 · The problem, as the consumers met it

Two adopters hit the same reader in one day, from two directions.
[The glamour report](../reports/2026-09-03-the-glamour-adopter-report.md), `GL-1`: a verb-first
tool put its verb roster in the root rejection's `choices`, and the root was reported as not
enumerated, so the diff did not run at all. [The anthill
report](../reports/2026-09-03-the-anthill-adopter-report.md), `AN-3`: three group nodes did what
[`STANDARD.md`](../../STANDARD.md) recommends under _A group node that refuses a flag should name
its subcommands_, carrying the set in `choices`, and each was reported as

```
did not enumerate at comms; 1 rejection read, none named a set of flags (NOT a tool with no flags); a `choices` list of 5 was present and its members are not flag-shaped ("follow", "positions", "read", "send", …) — a set of something else, not of flags
```

so the census compared 24 of 27 declared paths. The adopter followed a recommendation this
project makes and got a smaller number for it. That is the whole complaint, and it is a fair one.
`acc`'s own root has the same shape and never enumerates in its self-check.

## 2 · Why the reader does that, and why it is not simply a bug

The flag reader in [`surface.ts`](../../src/acc/kit/surface.ts) claims "this path accepts no
flags" — the `enumerated-none` state that
[the third enumeration state](./2026-09-02-the-third-enumeration-state.md) minted — only when the
tool says so itself: a recognised flag key, present and empty. A list of verbs under `choices` is
a statement about verbs. The reader's flag-shape test on the members is what carries the claim
that a set is a set of flags, and `["follow", "positions", …]` fails it, so the reader records
the near miss (`nonFlagKeys: ["choices"]`) and declines to say anything about flags. Reading the
verb list as "and therefore no flags" would be the kit inferring an empty flag set from a
statement about something else, which is the inference `enumerated-none` exists to refuse.

That discipline is what keeps every census line a quotation. Any change here trades some of it
for convenience, and the trade has to be named in the report the census renders.

## 3 · The half that ships first: documentation only

The tool can already say "no flags" explicitly. Adding one key beside the unchanged verb list —

```json
{ "choices": ["follow", "positions", "read", "send", "stand-down"], "validFlags": [] }
```

— is read below the root as the tool's own answer, and the path compares. Measured on the
anthill-shaped fixture in the anthill report: 3 of 5 declared paths compared without the key,
5 of 5 with it, and the census line becomes

```
stated an empty set of flags at comms under `validFlags`; 1 rejection read, and the set the target named held nothing (the target's own answer, not silence read as one); a `choices` list of 5 was present …
```

No page says this. The fix is one sentence in the surfaces guide and one in the standard's
group-node section, on the branch that carries the other anthill guide sentences. The consumer's
cost is one key in one rejection; the kit stays a quoter. **This is being done and is not part of
what this document decides.**

## 4 · The other half: the reader change

The adopter's proposal, offered "not insisted on": when a recorded rejection's non-flag key holds
members that are **all declared subcommands of that path** — every member matches a
`commands[].path` one level down in the declaration — read the path as `enumerated-none` for
flags and compare it. Optionally, compare the verb set itself against the declared subcommands.

### What the consumer gets

- **Nothing extra to do.** A group node written to the standard's recommendation compares as-is.
  The standard and the census stop disagreeing about what a good rejection looks like, which is
  the disagreement both adopters ran into.
- **A verb check the census does not have today.** The census diffs flags only. If the reader is
  already matching a verb list against the declaration's subcommand paths to decide the flag
  question, it has in hand the two sets a verb diff needs: a subcommand the tool names and the
  declaration omits (`accepted-not-declared`, at the verb level), and a declared subcommand the
  tool's rejection does not name (`declared-not-accepted`, likewise). That is a kind of drift
  the census is blind to now, and the first drift trial's eight disagreements were flag-level
  only because that is all it could see.

The second is the real value. The first is a paper cut, and §3 removes it on its own.

### What it costs, and where the nuance is

- **The reader stops purely quoting.** Its "no flags" would rest on the declaration — a document
  the caller supplied — rather than on the tool's bytes. The rendered line has to say so
  honestly, in the register the other states use: something like _read as no flags because all 5
  members of `choices` are declared subcommands of `comms`_, so a reader can check the claim
  against the bytes and disagree with it. The JSON reading needs a field that says the same,
  because [the read-JSON guide](../wiki/guides/how-to-read-the-check-report-json.md) promises
  consumers can tell how each state was reached.
- **It needs the declaration, so it changes shape with and without one.** A batch handed back
  with no `--declaration` has no subcommand list to match against; the same rejection then reads
  `not-enumerated` as today. Two runs of one batch would render the same path two ways depending
  on a flag. That is defensible — the diff does not run without a declaration either — but it has
  to be stated, and the "who observed this" provenance tag may need a third value.
- **The root is a special case, and it is the case `GL-1` is about.** At the root, `choices` is
  already read for verbs by a different reader (`advertisedVerbsFrom`, attached to the root
  capture and nowhere else), and the root's declared subcommands are every `commands[].path` of
  length one. Making the flag reader also consult the declaration there means two readers with
  two rules over one key, and `ROOT_AMBIGUOUS_WHEN_EMPTY` already exists because of that
  collision. Whether the change applies at the root, below it only, or both with different
  wording is the first design question. The GL-1 paragraph merged today in the surfaces guide
  describes the reader as it is; it moves with whichever answer is chosen.
- **Partial matches.** Four of five members declared, or a member that is a flag-shaped string
  among verbs. The rule has to say what a mixed list means, and the safe answer — any non-match
  leaves the path `not-enumerated` with the near miss reported as today — is also the one that
  gives an adopter the least help when their declaration is the thing that is stale.
- **A new state or a reason on an old one.** Either `enumerated-none` gains a "how" (a key was
  empty / a verb list matched the declaration), or a fourth state is minted. The third-state plan
  records how much of the tree a new state touches: the renderer's exhaustiveness, the compare
  path, cross-version rendering of older reports, the guide that lists the states, and the
  prose homes. A reason field on the existing state is cheaper and may be honest enough.
- **Witnesses and fixtures.** A fixture with verbs in `choices` and a declaration that declares
  them; the same with one undeclared verb; the same with no declaration; the root variant. Each
  is a population the two-lens sweep needs an input for.

### A rough size

Comparable to the third enumeration state, smaller if it is a reason on that state rather than
a fourth one: the reader, the renderer, the JSON reading and its guide, the diff's population
count, one or two rule-adjacent prose homes, and the GL-1 paragraph. The verb diff itself is
additional — a second diff over a second pair of sets, with its own two finding kinds and its own
renderings — and could be a second step after the flag question is settled.

## 5 · How to decide

Build it if the verb check is wanted. Do not build it to remove the paper cut; §3 does that for
one key.

Signals that would settle it, in order of weight:

1. A consumer asks for verb-level drift — a subcommand added to a tool and not to its
   declaration, or the reverse — as a thing the census should catch. Nobody has yet; the first
   drift trial found flag drift because that is what it could see.
2. A third adopter hits the same reader after the §3 sentences land, which would mean the
   documentation was not enough.
3. The self-check: `acc`'s own root never enumerating is a standing embarrassment the reader
   change would fix without changing `acc`'s rejection. It is also fixable by changing the
   rejection, which the GL-1 paragraph now tells other tools to do.

## 6 · Open questions

- Does the change apply at the root, below it, or both? If both, do the two readers of `choices`
  at the root share one rule?
- Is "all members declared" the right threshold, or does a partial match carry a distinct
  reading?
- Reason on `enumerated-none`, or a fourth state?
- Is the verb diff part of this, or a second scope once the flag question is settled?
- Does anthill confirm 27 of 27 with the §3 key? Asked on issue #40; the answer says whether §3
  alone closes that issue.

## What this document does not establish

- **No measurement of the reader change itself.** Nothing here was prototyped; the costs in §4 are
  read from `surface.ts` and the third-state plan, not observed.
- **No count of how many tools in the trials record have the shape.** glamour's root and
  anthill's three group nodes are the known instances; `acc`'s root is the fifth.
