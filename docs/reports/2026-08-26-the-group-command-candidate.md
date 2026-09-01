---
type: report
generated: { by: claude-opus-5, at: 2026-08-26 }
status: draft
lifecycle: live
description:
  A rule candidate raised by the anthill adopter, decided and still NOT minted. A group command
  that refuses a flag while naming no valid set leaves a caller with nowhere to go. Six tools
  measured, three name a set and three do not; naming it inline is now the recommendation, as a
  design choice rather than a defect, and the append-only id is deliberately still unspent.
tags: [conformance, evidence, adoption, parsing, discoverability, rule-candidate]
subject: whether a node that holds subcommands owes the caller a set when it refuses a flag
examined:
  anthill v2.3.0 `comms`/`info`/`team`; git 2.55.0 `remote`/`stash`; gh 2.98.0 `repo`; Docker
  29.2.0 `image`; kubectl v1.34.1 `config`; all seven Spellbook spells; macOS, 2026-08-26
---

# The group-command candidate — raised, evidenced, not minted

**No rule id has been assigned and none should be cited.** This file exists so the decision has a
home other than a chat channel, and so that whoever takes it up does not have to re-gather the
evidence.

## Who raised it, and why it is not a census feature

The anthill adopter, after running their census. Three of their command paths could not be
compared, and all three are the same shape: **group nodes** — `comms`, `info`, `team` — which
exist to hold subcommands and have no flags of their own.

```
anthill comms --acc-not-a-flag
-> {"ok":false,"error":"Unknown option '--acc-not-a-flag'"}      exit 1
```

It refuses **by name**, so it knows the token is wrong, and then names nothing. It cannot name a
flag set, because it has none. It does not name its subcommands. In their words: _"a node that
refuses a flag while having no valid set to offer leaves a caller with no route forward"_, and
they judged it _"a catalogue rule rather than something in the census"_ — then declined to mint an
id themselves.

They were right about the shape. The census compares a declaration against an enumeration; a node
with nothing to enumerate is not a disagreement, it is a silence, and no amount of census work
turns it into one.

## The survey — six group nodes, five vendors

One sentinel flag sent after the group node, nothing else. Verbatim heads:

| tool             | names a set? | what it answered                                                                                            |
| ---------------- | ------------ | ----------------------------------------------------------------------------------------------------------- |
| `git remote`     | **yes**      | `error: unknown option 'acc-not-a-flag'` then a usage block listing `git remote add`, `rename`, `remove`, … |
| `git stash`      | **yes**      | same shape, listing `list`, `show`, `push`, …                                                               |
| `gh repo`        | **yes**      | `unknown flag: --acc-not-a-flag` then `Available commands:` and the list                                    |
| `docker image`   | **no**       | `unknown flag: --acc-not-a-flag` / `Usage: docker image` / `Run 'docker image --help' for more information` |
| `kubectl config` | **no**       | `error: unknown flag: --acc-not-a-flag` / `See 'kubectl config --help' for usage.`                          |
| `anthill comms`  | **no**       | the JSON above. Nothing.                                                                                    |

**Three of six name a set and three do not.** This is a live disagreement between five independent
vendors, not one tool's oversight, which is what raises it above an adopter's bug report.

**The Spellbook fleet supplies no signal here and cannot.** All seven spells were checked and none
of them has a group command — they are flat verb dispatchers. The shape does not exist there, so
the second adopter has no view on it. That is worth recording because the absence of a second
consumer voice on this is a fact about their architecture, not a gap in the consultation.

## The three tiers, and why the middle one decides the rule

The survey does not split two ways. It splits three:

1. **Names the set inline** — `git`, `gh`. The rejection carries the subcommands.
2. **Names where to get the set** — `docker`, `kubectl`. The rejection carries a pointer:
   _"Run `docker image --help`"_.
3. **Names nothing** — `anthill`.

Tier 3 is indefensible for an agent and nobody would argue for it. Tier 1 is plainly good. **The
rule is entirely decided by tier 2**, and a rule minted without settling it would be applied
inconsistently to a third of the tools in circulation.

The question, stated so it can be answered: **is a pointer to another invocation a route forward,
or a deflection?** Both readings are defensible.

- _A route._ The caller is not stuck. They know exactly what to run, the command is spelled out,
  and it will work. Demanding the set inline puts a subcommand list into every error message.
- _A deflection._ The caller asked a question the tool could have answered and got told where to
  ask it again. For an agent that is a second process, a second round-trip and a second parse,
  and the tool already knew the answer when it declined to give it. It is the shape
  [the just-in-time schema slice](../../STANDARD.md) exists to argue against.

Nothing in this project settles it today, and it is not a question the evidence can answer — six
more tools would split the same way. It is a judgement about what a rejection owes a caller.

## What minting would cost, so the decision is not made on a false sense of cheapness

- **`rule_id` values are append-only** — never reused, never re-pointed, because they travel in
  reports that outlive any version. Minting is permanent in a way that a checker is not.
- **A rule page is the human half of a checker**, and the wiki lint enforces that its frontmatter,
  its prose and the checker source agree. There is no such thing here as a rule page with no
  checker.
- **The denominator moves.** Reports carry `core N/M` and a rule count; every figure derived from
  it shifts, and the last time that happened it needed
  [a section of its own](./2026-08-24-eight-owner-clis.md#m8-0--the-denominator-is-23-not-24).
- **It would be `L1`.** Probing a group node means sending a verb, which is above `L0` by the
  admission test. Its checker would report `unverified` on every target until `L1` exists — which
  is not a novelty: `B3`, `B4` and `A4` already sit there doing exactly that.

The machinery cost is therefore **low and well-precedented**. The permanence is the real cost, and
it is paid on a boundary nobody has drawn.

## Decided, 2026-08-26 — strict is the recommendation, as a design choice

**Tier 2 does not satisfy it. Naming the set inline is what this standard recommends.** A node that
refuses a flag should name the valid set, and pointing the caller at another invocation is a
legitimate design that this standard would not choose.

The principle behind it, in the deciding party's terms: **when a caller makes a mistake, return
more information rather than less.** A rejection is the moment the tool knows most and the caller
knows least, and it is the cheapest place in the whole interaction to close that gap.

Four supporting reasons, in the order they carry weight:

1. **The tool already knows.** `docker` holds `image`'s subcommand list at the moment it declines
   to print it — it has just printed the word `Usage:` about that node. It is not being asked to
   compute anything.
2. **Agents pay in turns, not milliseconds.** The cost of _"go run `--help`"_ is not the process
   spawn; it is that reading and reasoning about a help screen is usually a model round-trip.
3. **Recovery crosses a format boundary.** The rejection may be JSON and help is prose, so the
   agent switches parsers mid-recovery for information it was already offered a pointer to.
4. **The bloat objection does not survive its own evidence.** It is the strongest case for tier 2
   and the survey refutes it: **`gh repo` prints 19 subcommands in a rejection** and nobody
   considers that broken, while the two tools declining to print have 12 and 16. The tool with the
   most to say says it.

**The deviation is `design-choice`, not `defect`, and that is the whole of what makes this
sayable.** It puts this project on record recommending against Docker and Kubernetes, and the
`design-choice` tier is what lets that read as _"they chose differently and it is legitimate"_
rather than _"they are broken"_. That position is taken deliberately rather than arrived at.

**One consequence to accept openly.** A rule carries a single `deviation` value, so one rule cannot
call tier 2 a legitimate choice and tier 3 — naming nothing at all — a defect. The recommendation
is one rule at `design-choice` whose checker DETAIL distinguishes the tiers, so a tool that names
nothing reads differently from one that names a pointer even though neither satisfies the rule.
Splitting tier 3 into a defect of its own is possible and means a second id for one shape, which
this file argues against.

## Status

**Still not minted, and that is the reversible half.** The recommendation now lives in
[`STANDARD.md` § Parsing](../../STANDARD.md#a-group-node-that-refuses-a-flag-should-name-its-subcommands),
marked `[C?]`, so revising it costs an edit to the guidance rather than nothing — but it is still
only guidance. `rule_id` values are append-only — never reused, never re-pointed — so minting is
the step that cannot be taken back, and it has not been taken. Anyone reading this as settled
catalogue policy is reading it wrong: it is a recommendation on the guidance page with its
evidence, waiting on a decision to mint.

**What minting now needs** is no longer a definition — tier 2 is settled — but a judgement that the
permanent cost is worth paying: an append-only id, a moved denominator, and a checker reporting
`unverified` on every target until `L1` exists.

The adopter was told they would get a straight answer either way rather than silence. The answer is
that their reading was right, the shape is real, the standard now recommends what they asked for,
and the id is deliberately still unspent.
