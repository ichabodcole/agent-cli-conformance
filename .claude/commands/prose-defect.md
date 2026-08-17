---
description:
  Work through one passage that read badly — diagnose it, agree the category with the user, rewrite
  it — and produce a self-contained capture of the defect.
argument-hint: "[pasted passage, or file:line, or nothing]"
---

# How to capture a prose defect

Someone hit a sentence that read badly. Work out what kind of defect it is, agree that with them,
fix the passage, and write up the capture.

**One passage per run.** This captures a single defect well; it does not sweep a document for
them.

**The capture is the output.** Where it goes afterwards is the user's call, asked at the end.

Passage, `file:line`, or nothing: $ARGUMENTS

## Steps

1. **Identify the passage.** If none was given, ask which one. Then open the file and read around
   it, even when the passage was pasted in full — the surrounding text often holds what the
   sentence is missing.

2. **Ask what happened when they read it, and quote the answer verbatim.** The capture uses their
   words. If they cannot name it: did you read it twice? did you finish and not know what it
   claimed? could you tell whether you were missing background?

   Do not offer a diagnosis first. Whatever you name, they will reach for — and the capture then
   records your theory rather than their reading.

3. **Say what kind of defect it is.** If a catalogue of known kinds is available, check it first
   and say whether this is one of them or new.

4. **Look at the sentence again once the first defect is named.** Strip it to what it asserts and
   ask whether anything is left. A single passage often carries more than one fault, and the named
   one draws attention away from its neighbours.

5. **State the category and why it is that one, and wait for the user to agree it.** This is the
   step that matters most. A category written down confidently and wrongly is worse than no
   capture, because the next reader applies it.

6. **Propose a rewrite that keeps the claim exactly.** Keep numbers, file paths and figures. Keep
   domain terms unless a term is itself the defect. Say what the rewrite costs when it costs
   something, and say when a fix is partial.

   Some fixes cannot be a straight swap. Where a sentence narrates what a thing used to do, the
   present tense makes it false — "this checker **used to compare** decoded strings" does not
   become "this checker compares decoded strings". Recast it as the counterfactual the sentence
   was really making: "comparing decoded strings **cannot establish** the byte identity this rule
   requires."

7. **Apply the rewrite** once the user accepts it, and confirm the file changed.

8. **Write the capture** (shape below) and **ask the user what they want done with it.** Doing
   nothing is a legitimate answer. So is filing it somewhere, or fixing the other instances. Ask
   rather than assume — and do not commit, file, or copy it anywhere until they say.

## The capture

Self-contained. Someone must be able to act on it in a different project, months from now,
without opening anything it mentions.

```markdown
## <the pattern, named — not the page it came from>

**Where it appears.** <the kind of slot or context, not a path>

> **Before** — <verbatim>

> **After** — <verbatim>

**The reader's report.** <their words>

**What goes wrong.** <the mechanism, specific enough to recognise again>

**Where it looks like this but is not.** <the boundary>

**How to spot it.** <a reading tell, or a search pattern with its false positives>
```

**No file paths, commit hashes or scan counts.** A capture that cites them is dead the moment the
file moves, and useless anywhere else. Name the kind of place the defect appeared instead.

**Every capture needs its boundary case.** Where does this look like the defect and turn out to be
fine? Without one the rule gets over-applied, and the boundary is exactly where the next reader
will misapply it.

**If you write a search pattern, run it before writing it down.** Report what it caught, what it
false-positives on, and what it cannot see. A pattern is a way to find candidates, never a way to
declare a document clean.
