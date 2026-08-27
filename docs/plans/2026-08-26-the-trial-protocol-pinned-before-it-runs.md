---
type: plan
generated: { by: claude-opus-5, at: 2026-08-26 }
status: stable
lifecycle: live
description:
  The trial's protocol, written before the adopter starts — what they are given, what the
  silence rule is, what counts as being stuck, the two failure classes with the evidence that
  separates them, and the interview questions. Pinned in advance because a retro run by the
  people whose artifact is under test will find "they misunderstood" more comfortable than "our
  tooling did not work".
tags: [adoption, consumer-signal, trial]
---

# The trial protocol, pinned before it runs

[The plan after the ladder](./2026-08-26-the-plan-after-the-ladder.md) §5 requires two things in
writing **before** the adopter starts: what counts as being stuck, and the retro's failure classes
with their discriminating evidence. This file is that, plus the interview questions. Nothing here
is revised after the run — a class you can redefine once you have seen the answer classifies
nothing.

## 1. What the adopter is given

- The repository at tag **`v0.1.1`**, not `develop`. Every fix landed mid-trial would otherwise
  make the result unattributable. `skills/acc/` and `docs/wiki/` are byte-identical between
  `v0.1.1` and `develop` as of this writing, so the pin costs nothing this round.
- The `acc` skill, and the guides it names.
- The channel `acc-trial`, which is where `skills/acc/REPORTING.md` sends them.
- No briefing on our reasoning, no session summary, no target chosen for them.

## 2. The silence rule

We do not reply on `acc-trial` until they say they are done. The channel's topic says so, and
`REPORTING.md` already carries the escape hatch: **if they ask for an answer rather than to be left
alone, we break silence and answer.** A trial that leaves someone stuck on purpose is measuring our
patience, not our artifacts.

Posting during the run is expected and is data. The touchpoint is part of the artifact under test.

## 3. What counts as stuck

Any one of these. Written now so the first silence cannot be read as whichever we already believed:

1. **They say so.** Explicit, and it ends the question.
2. **They run the same failing command three or more times** with no change to it and no change
   between runs.
3. **They stop running `acc` at all** while still working the task — no new invocation, while the
   transcript shows them still trying.
4. **They finish without reaching a verdict.** They declare done having never got `acc check` to
   print a first line.

**Being visibly stuck without posting is a finding about the touchpoint**, not about the adopter.
Record it as one.

## 4. The two failure classes, and what separates them

| class                                              | means                                                       |
| -------------------------------------------------- | ----------------------------------------------------------- |
| **A — a gap in understanding how to use the tool** | The tooling worked. They could not tell what to do with it. |
| **B — the tooling did not work in their scenario** | It crashed, or reported something untrue about their CLI.   |

**B is established by:** a command we re-run ourselves that crashes, or whose output disagrees with
the target's actual behaviour when we hand-check it. Our re-run is the evidence, not their report
of it.

**A is established by all three:** the command they needed existed at `v0.1.1`; it produced correct
output when run; and **we can name the exact line, in an artifact they were pointed at, that would
have told them.**

> **The tie-break, pre-registered: if we cannot name that line, it is not class A.** It is a defect
> in the artifact, and it goes to the same queue as class B. This rule exists because we are the
> people whose artifact is under test, and "they misunderstood" is the finding we would rather
> reach.

A third outcome is neither class: **it worked, and they wanted more.** That is the skill's §6 case 3
and it is a feature request, filed as one.

## 5. The interview

Asked after they say they are done, in this order. Behaviour before opinion, and open before ours —
a question that names what we are worried about teaches them the answer.

1. **Walk us through what you did, in order**, from the moment you were pointed at this.
2. **Where did you stop, or nearly stop?** What did you do next?
3. **What did you go looking for and not find?**
4. **Was there anything you read one way and later found meant another?**
5. **Did you work around anything?** A workaround is a defect we never hear about otherwise.
6. **What would you want from us?** — open, verbatim, unshaped.
7. **Anything missing?** And: what were you doing at the moment you wanted it?

**Do not ask** whether the documentation was clear, whether the skill was helpful, or whether they
understood `L0`. Those are answerable by a polite agent without telling us anything.

**Ask before telling.** We correct nothing — not a misreading, not a wrong command — until every
question above has an answer. The first correction ends the interview's usefulness, because
everything after it is a conversation with us.
