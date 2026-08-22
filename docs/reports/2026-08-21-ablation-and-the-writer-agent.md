---
type: report
generated: { by: claude-opus-5, at: 2026-08-21 }
status: draft
lifecycle: live
description:
  Two open questions about the instruction sets this project writes for agents — how to find out
  which parts are load-bearing, and whether a dedicated writer agent produces better artifacts than
  the agent that did the work.
tags: [instructions, prose, agents, method, open]
subject: the skills, output styles and grounding files in this repository
examined: .claude/skills/, .claude/output-styles/, AGENTS.md
---

# Ablation, and a writer agent

Two open questions, related. Neither is decided. This records them so they are not rediscovered.

## The problem both are aimed at

Instruction sets in this repository grow and never shrink.

`.claude/skills/two-lens-review/SKILL.md` went from 110 lines to 293 across four cold reads:
**+280 lines added, 97 removed.** Every read returned real defects and every fix was an addition.
Not one round asked whether a paragraph already there was still earning its place.

That is not a failure of the reads. They were asked _"can you execute this, and where would you act
wrongly?"_ — questions about comprehension. A paragraph can be perfectly comprehensible and still be
noise, and no reader answering those questions would ever say so.

The cost is that we cannot tell signal from bloat by looking. Density reads as rigour. And the
economics favour bloat: tokens are cheap, and a model asked to improve a document will nearly always
add to it, because adding is the available move.

## Question 1 — ablation

Borrowed from lesion studies and from ML, where you remove a term and measure whether the result
degrades. Applied to an instruction set: strip it to nothing, add back the minimum, and test after
each addition.

The test is the one this repository already uses for prose: hand it to a fresh agent and watch where
they stop. A blocker means something is missing. No blocker means the last thing you added was not
needed — which is the measurement no cold read has ever made here.

What to work out:

- **What counts as a pass.** For a skill, probably: a fresh agent executes it end to end and
  produces the artifact without inventing anything material.
- **Whether to ablate forward or backward.** Forward (start empty, add) finds the minimum. Backward
  (start full, remove one thing at a time) is cheaper and finds slack. Backward is likely the
  practical one for a file that already exists.
- **How to keep the reasoning.** Several paragraphs in these files exist to stop a reader
  rationalising past a rule, and would ablate cleanly while making the rule easier to ignore. That
  is a real cost the test as described cannot see, and it needs an answer before anything is cut.
- **What it costs.** One ablation pass on a 293-line skill is many fresh-agent runs.

## Question 2 — a writer agent

Rather than the agent that did the work writing the artifact, dispatch a subagent whose profile is
technical writing, given the brief and nothing else.

The release skill already does this for release notes, for a stated reason: the agent that did the
work "knows what was interesting, not what was delivered." The question is whether that
generalises to skills, guides and rule pages.

**The evidence that it should.** Three independent cold readers found the same defect in a release
note this week: it argued with its reviewers. Three separate guards on one config key, a rebuttal of
a naming alternative nobody had proposed, a closing passage answering _why didn't you guess harder_.
Every one was written by the agent that had been through the argument and remembered the objections.

A writer with no memory of the argument cannot rehearse it. That is structural rather than
disciplinary, which is why it is worth testing.

What such a profile would carry, as a starting sketch:

- **Role.** One artifact, one named reader, and that reader does not have your context.
- **Type first.** Classify the artifact — Diátaxis — because the type decides what belongs in it.
- **Register.** The pairs in `.claude/output-styles/plainspoken.md`: loose over periodic,
  right-branching over left, literal over figure. One word, one meaning.
- **The sourcing rail.** Do not assert a behaviour you have not run.
- **What it must not do.** Defend a decision, answer an objection the reader has not raised, or
  explain why the current design beat an alternative. That reasoning belongs in a design document.

**What is unknown.** Whether a writer without the context produces something accurate enough to
need less correction than it saves, and whether the brief needed to make it accurate ends up being
the artifact. A brief detailed enough to prevent invention may be most of the work.

## How they compose

An ablated instruction set is what you would hand a writer agent. Ablation says which rules survive;
the writer agent applies them without the author's memory of the argument. Doing either first is
useful; doing ablation first means the writer agent is not handed the bloat to reproduce.

## What would settle each

- **Ablation:** one backward pass on a single skill, with the fresh-agent execution test as the
  measure. Report how much came out and whether anything broke.
- **Writer agent:** write the profile, hand it one real artifact, and compare the cold-read findings
  against the last artifact written inline. Fewer defensive passages would be the signal.
