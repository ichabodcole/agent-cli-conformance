---
type: report
generated: { by: claude-opus-5, at: 2026-08-28 }
status: stable
lifecycle: live
description:
  A record of how one adopter ask travelled from a request to a specification — through a design
  that was demolished, a framing question that found a veto we already held, and a consumer who
  caught the defect that would have made the feature useless. The steps as run once, the five
  corrections and who held the evidence for each, and the one step that is proposed and has not
  been run.
tags: [method, adoption, consumer-signal, design]
subject:
  the loop from adopter signal to specification, recorded once so a second run can be compared to
  it, including the guidance-or-tooling question that changed the answer
examined:
  round 3's N3 ask through the four options and option B's specification — acc-internal messages
  216-236, acc-trial 11-17, and docs/plans/2026-08-28-the-declaration-skeleton.md as it stands on
  develop
---

# What to build, and how we found out

**One run, one ask.** Everything below happened once, over one feature, on 2026-08-28. It is
recorded because the same shape will come up again and because the steps are cheap to repeat and
expensive to reconstruct. "It produced a better answer than the first draft" is a fact this page
can state. "This is how to decide what to build" is a claim it cannot, and does not.

## The occasion

An adopter derived a command-path list from their dispatch table and found three verbs their usage
line did not advertise — the drift this kit exists to detect, found by an adopter in their own tool
for the first time. Then: _"I had no declaration, so the most valuable finding of the whole trial
lives in my prose, not in any artifact the kit reads. A 'declaration skeleton from a path list'
generator would have caught it structurally."_

A request for a tool, with a reason attached. The first design took the request at face value. It
was wrong, and the ways it was wrong are the content of this page.

## The lenses, in the order they earned their place

### 1. Is this guidance, tooling, or the mix?

**Asked by the project owner, after two internal reviews had passed the design as sound.** This
project's value is the guidance; tooling reinforces it. So before building a verb: was what the
adopter DID a technique worth teaching, or something any agent would do anyway?

Checking it found that **the discovery required no tooling at all** — the adopter read a table they
already had against their own usage line — and that our own guide taught the adjacent CONSTRUCTION
act (build one table) and never the INSPECTION act (read the one you have). One adopter in three
trials had done it unprompted, which is the evidence it needed teaching rather than assuming.

It also surfaced a **veto we already held**. A different adopter had told us: _"a scaffolding tool
that writes conformance structures beside an adopter's real code manufactures exactly the
parallel-document disease this project exists to kill, with your name on it."_ Nothing checks a
proposal against the recorded "nevers"; two reviewers had passed the design without consulting a
list already in the tree.

**The lens is not "guidance or tooling" as a taxonomy.** It is a question that makes you re-derive
what actually produced the outcome, and the answer here was: a technique produced it, and a tool
was requested.

### 2. Whose signal is it, and do they have skin in the mechanism?

We are the worst-placed party to decide what to build, because we are not the consumer of our own
tool. What makes an outside signal worth more is not that it is outside — it is that the consumer
**has a pain point and a way of working**, and does not care whether our tool succeeds. They care
whether their problem is gone.

Two provenance questions worth asking of any request:

- **Did anyone outside report this?** One item in this session's queue turned out to be an internal
  review finding with no adopter behind it, and knowing that changed how it was designed: there was
  no consumer reading-habit to defer to, so the project's own written contract decided it instead.
- **Do several consumers converge?** Triangulation does two things at once — it confirms the pain
  is real, and it is the only honest basis for generalising a design. A single consumer's shape may
  be their shape.

### 3. Draft the design — and expect the draft to be the thing that gets falsified

The first design was `acc declare --paths`, a generator emitting a declaration skeleton. Its stated
premise was that the census would then turn the adopter's finding into a machine finding.

**The premise was false and only running it revealed that.** The census diffs declared args against
recorded flags per path; nothing compares a declared path set against the verbs a root advertises.
The adopter's three verbs would have come back as a coverage fraction. Both reviewers had passed
the design as sound before one of them built a skeleton by hand and ran it.

### 4. Present it back — and ask what it is NOT

The four options went to the adopter with the skeleton ranked last and its measured weakness
stated, plus the sentence that mattered: _"'Smaller than all of this' is a useful answer."_

They picked the comparison, and said something about their own ask that no review could have
produced: _"my question 7 said 'I wanted the drift NAMED' and guessed at a skeleton as the
mechanism — **the guess was wrong the same way your first design was, and for the same reason: I
reached for an artifact when what I wanted was a FINDING.**"_

**An ask phrased as a tool request can have a finding underneath it, and the phrasing is not
evidence about the want.**

### 5. Specify, and let the consumer break the specification

The costed design went back. Their first answer found that the rule's LOCATION was right and its
SHAPE too narrow: their fleet advertises verb sets in two forms, and the parse we had costed read
only one — the JSON envelope. The legacy form is a pipe-delimited usage string, and the tool whose
drift started the entire thread was that form.

Measured on a fixture emitting exactly that string: **no advertised set captured at all**. The
feature would have missed the finding it exists to reproduce.

## The five corrections, and who held the evidence

The pattern is not "reviews are good". Every correction came from a party holding evidence the
designer structurally could not hold:

| #   | correction                                                  | held by                        |
| --- | ----------------------------------------------------------- | ------------------------------ |
| 1   | the premise is false — the census compares flags, not verbs | a reviewer who RAN it          |
| 2   | a recorded "never" already forbids this class of tool       | the owner's framing question   |
| 3   | the legacy usage-string shape is invisible to the parse     | the adopter's fleet            |
| 4   | the ellipsis in the adopter's own string means an OPEN set  | a reviewer reading it closely  |
| 5   | that ellipsis was shorthand, not the tool's bytes           | the adopter's committed source |

Two of those are corrections to corrections. **Author blindness is not fixed by more care; it is
fixed by someone standing somewhere else** — which is the same finding the cold-repair pipeline
reached about seams, arriving here at the level of what to build rather than how to edit.

## What we did NOT do, and it is the step most likely to matter next

The owner named a step this run did not take: **get the consumer to walk the thing through their
actual workflow, not to agree with it in principle.**

> It is easy to get agreement on something that sounds good. Walking through how you would use it
> is where you find that it is redundant, or that it is not what you actually needed.

What we got was a considered ranking, four design answers, and a caught defect — all of it
valuable, and none of it a walkthrough. The adopter's own closing line is a plan rather than a
trial: _"when B ships, the first thing we will do is run it over the un-hardened spells with a
fresh batch each."_

**So the walkthrough step is proposed and unrun.** A future run should ask for it before building,
not after, and should record whether it changed the design — that is the measurement this page
cannot supply.

## And size the value before building it

Solving a pain does not settle whether the pain was worth solving. A paper cut can be real,
reproducible, confirmed by a consumer, and still not worth the maintenance it commits us to. Two
things make that judgeable rather than a feeling: **how often the consumer hits it**, and **what it
costs them when they do**. Neither was formally asked in this run — the ask was taken as important
because it was the trial's central finding, which is a reasonable proxy and not the same thing.

## What a second run should record

| count, this run                                               | n                      |
| ------------------------------------------------------------- | ---------------------- |
| designs falsified before implementation                       | 1                      |
| corrections from a party holding evidence the designer lacked | 5                      |
| corrections between reviewers, each accepted                  | 2                      |
| recorded consumer "nevers" the design was checked against     | 0 → 1 (after the fact) |
| consumer workflow walkthroughs performed                      | 0                      |
| features built                                                | 0                      |

**Zero features built is the honest headline.** What the loop produced was a specification, a
guidance section that shipped, a worked example that shipped, and one design killed before it cost
anything. Whether that ratio is good is not answerable from one run.

## The specifics that are ours rather than general

Research, consumer input, design iteration, confirmation — that loop is not novel and this page
does not claim it. Two things about it are shaped by what this project is:

- **The deliverable can be guidance, tooling, or both**, and choosing wrongly is a real failure
  mode rather than a preference. This run shipped guidance and specified a tool, from one ask.
- **Both halves have a delivery question of their own.** Where does the documentation go so the
  reader meets it before they need it — and what shape of tooling supports the guidance rather than
  replacing it? The option that lost here lost because it would have written a document beside the
  adopter's code, which is the shape this project tells others not to build.
