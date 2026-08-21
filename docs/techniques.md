# Techniques that have caught something here

Not general advice. Each of these found a real defect in this repository, and several found one
that had already survived review, a full test suite, and its own author's confidence.

The through-line: **a check you have not seen fail is not a check.** Almost everything below is a
way of making something fail on purpose so you can watch what happens.

## Revert the fix and watch the test fail

After writing a regression test, put the defect back and run it. If the test still passes, it was
never testing what you think.

Caught here three times, twice in tests written by someone who believed they were being careful: a
test named "every declared error kind maps to a **distinct** exit code" that only asserted each was
below 124; a falsifiability test that failed through an unrelated code path and stayed green with
the entire feature deleted; a new branch with no test at all whose removal left 1,215 tests
passing.

Cheap: revert in a scratch copy, run one test file, restore.

## Execute it, do not reason about it

Tracing code is a hypothesis. Running it is a result.

Two failures here came from reasoning where running was available. A reviewer without a shell
produced a careful, entirely correct static trace and could not find a bug that a reviewer with a
shell found in one experiment. And a diagnosis was "confirmed" by reproducing it twice — against
the same poisoned cache both times, so the second run was not independent evidence.

**Reproducing a failure twice the same way is one observation, not two.**

## Build the adversary

To test that a claim cannot be gamed, write the target that games it.

A CLI that declares "my output is structured" and then answers in prose. A CLI that answers the
bare error correctly and the flagged error wrongly. A fixture whose whole body is `kill -SEGV $$`.
The last one collected nine passing rules it had done nothing to earn; the second turned a real
failure into a pass on one line of config.

If a feature accepts a claim from outside, the adversary is the first fixture to write, not the
last.

## Cold-read with lookups forbidden

Give a fresh agent only the text, and forbid it from reading files, searching, or running
anything. Then ask what it could not confidently interpret — separating _"I don't know this word"_
from _"I know it but it might mean something specific here."_ The second list is the dangerous one:
an unknown term sends a reader to look it up, a half-recognised one lets them carry on with the
wrong reading.

**The wanting-to-go-check is the finding.** Record it rather than answering it.

Caught: a self-refuting example config, a hedge that overclaimed in the one section whose job was
preventing overclaims, and a question the docs had never answered about the most common shape of
the thing they described.

## Send a fresh agent to the tree, not to the session

An agent that did the work knows what was _interesting_ — what surprised it, what it falsified. It
does not reliably know what was _delivered_, and asked for a summary it will write the retro.

Give it the commit range and nothing else. If it cannot reconstruct the work from the artifacts,
that is a finding about the artifacts.

## Ask what happens when the precondition fails

A checker, a parser, a report: exercise the case where the thing it is about does not exist.

The worst defect found by an outside user was a rule that accused any CLI **without** a `--version`
of having a broken one. Every fixture and every target it had ever been pointed at either had a
`--version` or crashed outright, so the case was structurally unreachable from inside.

Ask: what is the population this has never met?

## Check counts and claims against the code, never against prose

A number in a document is a claim someone made once. Rule counts, test counts, coverage figures and
"N of M" phrases go stale silently and then propagate, because the next writer copies the sentence.

Every count in this repository has been wrong at least once while reading as authoritative.

## Prefer the narrow predicate

When you widen a condition to catch a case, ask what else it now catches.

"The two runs differ" is not the same claim as "configuration is required", and only the second is
what the rule says. The narrow version could not fire on the population that produced the bug; the
wide one would have found new ways to be wrong.

## Watch the pipe

`cmd | tail` reports **`tail`'s** exit status, which is `0` whatever `cmd` did. Redirect and read
`$?`.

Piping also changes what a well-behaved CLI emits — this one switches to JSON — so an example
captured at a terminal is not what a script sees. That difference has been mistaken for two
separate bugs in one session.

## Treat grep results as a hypothesis

`grep -c -- '--json'` returning `0` was read as "this tool has no machine mode." It meant the
opposite: machine mode was the default, so there was no flag to name. A different grep read a
literal `\|` in an extended regex as alternation and nearly produced an accusation that a subagent
had invented data.

A grep tells you about strings. Confirm what it means by running the thing.

## Test your own proposal as hard as you tested theirs

An outside reviewer here spent an hour writing eight attacks against a pattern set we had
written, could not break it, and said so. In the same message they proposed widening it to a new
family — and handed over four examples that should pass and **not one attack against the family
they were asking for.** The widening shipped with a defect their own method would have caught in
minutes.

Their words afterwards: _"I tested your patterns adversarially and my own proposal credulously…
the bias is not that I liked the design too much to criticise it, but that I stopped generating
counterexamples the moment the idea was mine."_ And: _"On my own I would have signed off on my own
bug."_

Two things follow. **Ask for the attack explicitly** — they caught it on the next pass only
because the request named breaking it as the goal, and would otherwise have re-run their existing
fixtures, seen them all pass, and reported it ready. And **get a reader with no stake before
merging** anything a reviewer helped design; by the third round the best-informed reviewer is also
the most invested one, and those are the same person.

## When a reading of the source disagrees with a measurement, the measurement wins

Two people read one CLI's dispatch and both concluded its bare invocation would exit non-zero. It
printed help and exited `0`, and the black-box probe was right.

This is the argument the whole catalogue makes, so it should not be surprising when it applies to
us.

---

Add to this file when a technique catches something here — with what it caught, so the entry keeps
its evidence. Remove one that stops earning its place.
