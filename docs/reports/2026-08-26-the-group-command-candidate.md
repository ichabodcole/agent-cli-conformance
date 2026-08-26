---
type: report
generated: { by: claude-opus-5, at: 2026-08-26 }
status: draft
lifecycle: live
description:
  A rule candidate raised by the anthill adopter and NOT minted. A group command that refuses a
  flag while naming no valid set leaves a caller with nowhere to go. Six tools measured, three
  name a set and three do not, and the case that decides the rule is the one in between.
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

## Status

**Not minted. Not declined.** The evidence is sufficient — six tools, five vendors, a genuine
split — and the definition is not, because tier 2 is unresolved.

**What would move it:** a decision on tier 2, in either direction. If a pointer does not count, the
rule is well-defined and buildable today. If it does count, then only `anthill` fails among the six
and the case returns to `n=1`, which argues for leaving this file as the record and revisiting when
a second tier-3 tool appears.

The adopter was told they would get a straight answer either way rather than silence, and this file
is not yet that answer.
