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

## Diff the behaviour, not the diff

Reading a diff tells you what the author changed. It does not tell you what the change decides. For
that, run the system's observable output over a corpus of inputs before and after, and diff **that**
— every input whose result moved needs an explanation, and one nobody can explain is load-bearing.

Restrict the corpus to inputs that touch the changed premise so the sweep finishes, and compare
against the merge base in a worktree rather than stashing, so both trees stay runnable.

Run over the fixtures touching one guard here, seven of twenty-two moved. All seven were intended
and each had a reason — but the same sweep is what makes an eighth, unintended one visible, and two
regressions had already shipped past a green gate because nothing compared verdicts across the
corpus.

**The silence is the trap.** A population with no fixture cannot move, and reads exactly like a
clean result. Both regressions here lived in the one shape nothing exercised — a machine mode
reachable only on the error path — so the missing case was the finding, ahead of what it was
hiding. Before trusting a clean sweep, ask which shapes of input have no case at all.

## Fix the premise, not the branch

A fix that adds a **precondition** — a guard, a corroboration check, an applicability test — does
not belong to the branch where the symptom was reported. It belongs to every path that reads the
same premise. Find those before editing, by grepping the symbol rather than the symptom, and write
down what each one decides.

Skipped twice here, at a cost both times:

- A prose matcher was argued safe on the grounds that it was diagnostic and "gates nothing". Nobody
  checked its call sites. It ran for every target and gated a **core** rule, and three correct
  human-first CLIs were failed because of one unrelated sentence in their help.
- A corroboration guard meant to stop three core rules condemning innocent CLIs was added at the
  three places the symptom had been reported. An outside review found four more: one branch of the
  same clause still condemned, one of the three rules never asked for the evidence it was reading,
  the guard swallowed problems that rule had already measured, and the predicate underneath
  admitted `1.4` as a structured document.

Both times the governing principle was already written down and correct. What was missing was the
step between the principle and the edit — **the list of places the principle has to hold.** Three
questions produce it:

- **Who reads this premise?** Grep the symbol. Every consumer, tests included.
- **What does the predicate actually admit?** Run it on the edges instead of reading its name.
  `parsesWhole` is `JSON.parse`, and `JSON.parse("1.4")` succeeds.
- **What else is behind the gate?** A guard suppresses. Whatever it suppresses that is not the
  target of the fix is a regression being shipped with the repair — here, a directly measured core
  violation silenced because the target's help happened to spell a flag `--json`.

The third question is the one that gets skipped, because the first two are about the bug and the
third is about everything else.

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

## Get a reader with no stake before it merges

Three reviewers looked at one change here in sequence. The first two had helped design it, and each
declared the pattern matching unbreakable after failing to break it. The third had no stake, was
told to attack it, and produced a dozen false passes in one pass — including the one that mattered:
an ordinary human-first CLI, correct in every respect, failed on a **core** rule because its help
mentioned `coverage.json`.

The invested reviewers were not careless; they were the best-informed people available and had
found real defects in earlier rounds. But by round three the best-informed reviewer and the most
invested one were the same person, and the design's central safety argument — "this is diagnostic,
it gates nothing" — had been repeated by everyone who had helped write it, and was **false about
the code as shipped**.

**When a reviewer has shaped a design, they can still test it — but they cannot be the last word on
whether it is sound.**

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

## Build the innocent target too

`Build the adversary` above has a complement that is easier to skip and cost more here. Every
fixture in this repo was a CLI that had done something wrong, and the suite grew to 1,281 tests
without one that asked the other question: **what does this mechanism do to a tool that has done
nothing wrong?**

What it did was report `NOT CONFORMANT — 3 core violated` against a correct, text-only CLI, because
its help said `--json <file>   Treat the input file as JSON` and three core rules read the spelling
as a promise of machine mode. Every test passed. The rules were each correct about the target they
were written against; none of them had ever been pointed at a target they should leave alone.

A false-positive control is a different fixture from a negative control, and neither substitutes
for the other. The negative control proves the check fires. The innocent one proves it stops.

## Run the checker alone

A checker that reads evidence out of the shared recording can be reading a probe **some other
checker** asked for. That holds while the whole registry runs and inverts the moment it does not —
which is what a single-checker unit test is, and what any future `--only B5` would be.

Found here by accident: a guard added to three rules was correct in `acc check` and wrong in the
one unit test that recorded a single checker, because the corroborating evidence came from a
different rule's probe. The fix was for each checker to declare the probe it needs rather than
borrow one — recordings deduplicate, so asking costs nothing.

**If a verdict depends on an observation, the checker that reaches the verdict should have asked
for it.**

## Trace the inference back to where it entered

When a rule reaches a wrong verdict, the defect is often not in the rule. Three core rules were
condemning innocent CLIs, and all three were reading one line — a list of flag spellings in
`discovery.ts` — committed in `08f38ba`, an ancestor of all three: ninety minutes before the first
rule that reads it (`da66644`, B1–B3) and two days before the last (`479697c`, B5). **It predated
every consumer it now decides for.** No review of those rules could have caught it, because in each
one the inference arrived as a fact.

`git log -S` on the responsible expression dates the line and shows what it was written for. If it
predates its consumers, its original author never agreed to what it now decides.

The rule that came out of it is worth more than the fix: **inference may select what to look at;
only observation may condemn.** A heuristic that picks which probe to send costs a wasted spawn when
it is wrong. The same heuristic gating a core verdict costs someone their build.

## When a reading of the source disagrees with a measurement, the measurement wins

Two people read one CLI's dispatch and both concluded its bare invocation would exit non-zero. It
printed help and exited `0`, and the black-box probe was right.

This is the argument the whole catalogue makes, so it should not be surprising when it applies to
us.

---

Add to this file when a technique catches something here — with what it caught, so the entry keeps
its evidence. Remove one that stops earning its place.
