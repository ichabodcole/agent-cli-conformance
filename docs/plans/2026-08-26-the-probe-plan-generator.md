---
type: plan
generated: { by: claude-opus-5, at: 2026-08-26 }
status: draft
lifecycle: live
description:
  A new `acc probe-plan` command that emits a runnable capture harness rather than a list of
  argv, cutting at the seam the guide already draws between fields the kit can derive and the two
  only the caller can attest. Asked for by both adopters, designed from what each of them built
  by hand first.
tags: [adoption, evidence, declaration, probe-level, tooling]
---

# The probe-plan generator

**Read [the recorded-surface batch](./2026-08-25-the-recorded-surface-batch.md) first.** That plan
pins the format this one produces; nothing here changes it.

## Why this exists

Two adopters, on different tools, with no contact between them, independently wrote the same
thing before building a batch:

```python
argv = path + ["--acc-not-a-flag"]
```

Both described their version as worth nothing to anyone else. The anthill adopter asked for this
directly — _"if you build one thing next after the reader, I would build that"_ — and the magpie
adopter built one by hand the same day without calling it that. **The derivation is a pure
function of a path list, and every adopter is currently re-writing it.**

## The design, and where it came from

Everything below is a consequence of something an adopter measured. The sourcing is kept
attached, because the parts that look like ergonomic preferences are the parts that came from a
failure.

### 1. Emit a capture harness, not a list of argv

**A bare argv list is the wrong deliverable.** The argv was the easy half of what both adopters
wrote; the hard half was the capture, and `completeness` is a property of **how you capture**
rather than of what you claim afterwards. The magpie adopter could honestly assert `complete`
only because their runner read both pipes to EOF; had they piped through `head`, the honest answer
was `unknown` and they doubt a hurried adopter would notice the difference. They named this the
field where they would most expect a false `complete` in the wild.

A generator that emits a correct harness makes `complete` **achievable** by construction. A
generator that emits a list leaves everyone to re-derive the harness, badly, with `head` in it.

**Achievable, not asserted — an earlier draft of this plan said both and they cannot both hold of
one field.** The resolution: the harness emits `complete` only where it can DEMONSTRATE it —
captured to files rather than through a pipe, process exited normally — and emits the refusing
value otherwise. Derived where provable, refusing where not, and never a silent default. Whether
a caller who was handed a demonstrably correct harness should still be made to type the word is
the open question, not the mechanism.

### 2. Cut at the seam the guide already draws

[Step 4 of the guide](../wiki/guides/how-to-record-surfaces-below-the-root.md) already says
`streams` and `completeness` are the only two fields on which the caller is the authority. That is
the seam:

| the generator derives                                          | the caller attests         |
| -------------------------------------------------------------- | -------------------------- |
| `formatVersion`, the envelope                                  | `streams`                  |
| `path`, `argv`                                                 | `completeness`             |
| the harness that fills `exitCode`, `stdout`, `stderr` verbatim | `recordedBy`, `recordedAt` |

**`streams` may not stay in the right-hand column.** A generated harness writes its own
redirections, so it already knows whether it separated them, and the guide's claim that `streams`
and `completeness` are the only two fields the caller is the authority on was written for
hand-capture. If `streams` becomes derived, that sentence needs qualifying rather than
contradicting — it is true of a caller capturing by hand and false of one running a harness we
emitted. Open; raised in review and not yet settled.

**The attested fields must refuse to default.** If the skeleton ships with
`"completeness": "complete"` pre-filled, every adopter attests it without deciding, and the one
field the guide says only they can answer becomes the one field nobody answered. Emit an explicit
value that the reader **rejects**, so an unedited harness fails loudly rather than lying quietly.

### 3. Say which artifact the plan was derived from — and prefer the parser

**This is the one that is not ergonomics, and it came from the magpie adopter unprompted.**

They derived their probe list from the tool's **dispatch switch**, and wrote the declaration
separately from **help**. Two artifacts, two sources. A generator that derives the probe list from
`commands[].path` in the declaration loses that:

> If the probe plan comes from `commands[].path`, you can only ever discover drift at paths the
> declaration already names. A verb that exists in the parser and is missing from help would never
> be probed — it would sit in the census as nothing at all, not even as a disagreement.

On magpie the hole was empty — switch and help both had seventeen — **but they only know that
because they built the two sides independently and they happened to agree.** A declaration-derived
plan would have assumed it.

So:

- `--declaration <file>` is the convenient source and stays the default.
- **A second source — a caller-supplied path list, from wherever they actually enumerate verbs —
  must be accepted.** That is the real mitigation. A label describing the hole is not one.
- **`acc probe-plan` names the limit at generation time**, in its own output, standing next to
  the person who chose the source: these paths came from the declaration, and a path your parser
  accepts while your declaration omits it was not probed and will not appear as a disagreement.
- **The batch carries nothing about this, and `acc check` is not told.**

**That last point reverses an earlier draft of this plan**, which required the emitted batch to
record which artifact its paths came from. The requirement was wrong, and the review that caught
it was right that the format has no room: the envelope takes `formatVersion`, `records` and
`identity` and refuses every other key, so the only home would have been free text in
`recordedBy` — and pattern-matching free text is the drift this project refuses everywhere else.

But the deeper reason to strike it is that **the blind spot is unobservable from inside the batch
by construction.** A verb the parser accepts that appears in neither help nor the declaration
leaves no trace in any artifact the batch can see: no record at that path, no declared path, and
nothing anywhere that knows it is missing. A `pathSource` key would name which artifact the paths
came from and still say nothing about what was absent from it — buying the appearance of coverage
over the gap, which is worse than the gap.

### 4. Record the build, not only the person

`recordedBy` is free text and the guide's three examples are all people or jobs. The magpie
adopter wrote `"flint (agent) via bun subprocess, magpie working tree feat/magpie-acc-l0"` on
instinct, and the branch turned out to be the most valuable thing in the block: **this session's
largest confusion was two parties measuring two different builds** — a registration against
`2b2ce93`, a census against `d7dfacf`, with a `--version` added in between.

**Emit BOTH, because they are different facts and the second is not redundant.**

- **`identity` is the tool naming itself**, and the format already has the slot. A generated
  harness can capture it without asking, and should by default. The plan omitted it in an earlier
  draft for a reason worth recording: magpie had no `--version` when that batch was built, so the
  slot was empty and the build string in `recordedBy` was carrying the whole load.
- **The build string is the checkout naming itself.** A tool that cannot report its own build
  cannot be identified by `identity` alone, and that is not hypothetical — it is
  [DT-10](../reports/2026-08-24-first-drift-trial-anthill-manifest.md#dt-10--two-builds-of-the-same-declared-version-disagree-about-whether-the-root-enumerates),
  where two builds of anthill reported the same version string and disagreed about whether the
  root enumerates.

The failure this guards is a tool whose `identity` is honest and useless. `recordedBy` reads as
provenance-of-person; what disambiguated this trial was provenance-of-artifact, and it was got
right by accident.

### 5. The argv rules become an invariant, not a compliance burden

The three rules that decide whether a rejection is readable exist **only because adopters
hand-write argv**. `path + [sentinel]` satisfies all three by construction — no `--` can appear,
exactly one token follows the path, and it is flag-shaped.

Both adopters confirmed they satisfied rules 1 and 2 **by accident** and only rule 3 (a sentinel
the tool cannot plausibly own) deliberately, prompted by the guide's warning. The anthill adopter
also reported nearly breaking rule 2: they considered probing group nodes **bare**, with no token
after the path — on the exact three paths that turned out to be the interesting ones.

A generator makes accident into guarantee. **The guide's rules section stays**, because a caller
supplying their own argv still needs it, but it stops being the common path.

## What is NOT in scope

- **Running the harness.** The kit does not execute below the root; that is the whole reason this
  format exists. The generator emits something the caller runs.
- **Changing the batch format.** `formatVersion` stays `"0"`.
- **Guessing paths from help.** Discovery's verb extraction is a heuristic tuned for the root, and
  a wrong path list produces records at paths that do not exist. If no declaration and no path
  list is supplied, refuse.

## Open questions for whoever builds this

1. **What does the harness emit in?** A `sh` script is the lowest common denominator and the
   easiest to get `completeness` wrong in (a pipe, a `head`). A small runner in the target's own
   ecosystem is safer and is not portable. Possibly both, chosen by a flag.
2. **Does it emit one file or two** — harness plus a batch skeleton, or a harness that writes the
   batch itself? The magpie adopter asked for `--out ./capture.sh` writing `batch.json`, which is
   the second.
3. **How is a path list supplied** for the non-declaration source, and what does the batch record
   about where it came from?
4. **Should a caller handed a demonstrably correct harness still have to type `complete`
   themselves?** The mechanism above makes it derivable; whether removing the attestation removes
   a useful moment of thought is a question for someone who has captured a batch by hand.

   _(A fourth question here previously asked what `acc check` should do with a batch it could tell
   was declaration-derived. It is struck along with the requirement that produced it — see the
   third design point.)_

## Validation

The magpie adopter has two more batches to build this session and offered to build one against a
draft — _"I would rather find the trap than describe it."_ **Take that offer.** They are the only
person who has built one of these from the guide alone, and that expertise expires the moment a
generator makes it easy.

The anthill adopter has already broken their own batch three ways to test the failure modes and
should be sent the design rather than the finished thing.

## Questions raised in review, before any of this is built

A two-lens review read this plan against the pinned format in
[the recorded-surface batch](./2026-08-25-the-recorded-surface-batch.md), the reader in
`src/acc/kit/recorded.ts`, and
[the guide](../wiki/guides/how-to-record-surfaces-below-the-root.md). **The sourcing holds and
none of the reasoning above is disputed.** What follows are places where two things this plan
wants are not both available, so an implementer would have to decide which one to drop — and
deciding that silently is how a design gets settled by whoever typed first.

**A. The batch has nowhere to record where the paths came from, and this plan forbids making
one.** Item 3 requires the emitted batch to record which artifact the paths came from, and item 4
wants a commit SHA emitted. But the batch envelope accepts `formatVersion`, `records` and
`identity` and refuses every other key; a record accepts ten named keys and refuses every other
one. "Changing the batch format" is out of scope and `formatVersion` stays `"0"`. The only field
with room is `recordedBy` — which is free text, and item 4 is itself the observation that
`recordedBy` reads as provenance-of-person. So: does the format grow a key, and this plan's scope
with it, or does the provenance ride inside `recordedBy` as prose?

**B. If it rides as prose, `acc check` cannot tell.** Open question 4 asks what `acc check` does
with a batch **it can tell** was declaration-derived. Nothing in a closed format lets it tell,
unless the reader parses free text for a marker — which is the drift this project refuses
everywhere else. Either the fact is machine-readable or the report cannot state it; item 3's
third bullet has no implementable middle.

**C. Is `completeness` true by construction, or attested?** Item 1 argues a correct harness makes
`complete` true by construction. Item 2 argues the attested fields must refuse to default, so an
unedited harness fails loudly. Both cannot hold of one field: if the harness establishes it,
asking the caller to attest it is theatre; if the caller must attest it, item 1's claim is about
the harness as emitted rather than about the run that used it. Which one is being claimed?

**D. `streams` stops being the caller's to attest.** The seam is real and the guide's words are
exact — step 4 says `streams` and `completeness` are "the only two fields on which you are the
authority". But a generated harness writes its own redirections, so it already knows whether it
separated the streams. That leaves `completeness` alone on the caller's side, while the table in
item 2 lists four fields where the guide names two: `recordedBy` and `recordedAt` are free text
the kit reads for nothing, not fields anyone is the authority on. Does "must refuse to default"
apply to all four, or to `completeness` alone?

**E. The format already answers "which build", and this plan does not mention it.** The confusion
item 4 reports — a registration against `2b2ce93`, a census against `d7dfacf` — is what the
`identity` key exists for: one capture of the tool naming itself, which every census line labels
`identity unstated` when it is absent. Should the emitted harness capture an identity by default?
If yes, item 4 is largely solved by the format already. If no, the reason is worth writing down.

**F. What kind of command is `acc probe-plan`?** The plan describes the output and never the
command. `acc` is the positive control, so every command it grows owes `effects`, `output_kind`,
`cardinality`, its args and its errors in `spec.ts`; owes parseable stdout in machine mode; and
owes exit codes from an append-only taxonomy. A command whose job is to write a file to a path
the caller names would be the first mutating command in this CLI, and nothing here says so.

**G. Does it take a target?** The harness has to invoke the tool, so something must supply the
invocation. `acc check` takes a target as a positional; this plan never says whether
`acc probe-plan` does, nor whether the tool's path is baked into the emitted harness or left for
the caller to set at run time.

**H. `recordedAt` is stamped when the harness runs, not when it is generated.** A generator that
pre-fills it writes the time the plan was made into a field that means the time the capture
happened — the one field whose whole value is that it dates the recording. Cheap to get wrong
inside a heredoc, and invisible afterwards.

**I. The validation window is perishable.** The Validation section rests on the magpie adopter
having two more batches to build in a session that is now running, and on the anthill adopter
being sent the design rather than the finished thing. Both expire. They are worth more spent on
the questions above than on a draft that has already guessed at them.

## The magpie adopter's answers, 2026-08-26

Asked on the `acc-magpie` grapevine, before anything was built, and answered in full — message 18
on that channel. **Recorded here rather than acted on:** each one still needs a decision, and two
of them cost this plan its stated scope. Attributed because the arguments are theirs.

**On A and B — grow a key, and keep it off `recordedBy`.** Free text as a home for provenance
"would make my own instinctive convention load-bearing, and I got that right by accident."
Proposed instead: an enumerated key on the **envelope**, not on a record, because the plan is a
property of the batch — `"pathSource": "target" | "declaration" | "mixed" | "unstated"`, with
absent meaning `unstated`, so every batch written before the key existed stays honest instead of
being retconned into a claim nobody made. **This costs the plan its "no format change" scope, and
`formatVersion` with it.**

They also cut the report question down to size: knowing the provenance **does not let the kit
recover the missing path**, because no record exists at a path nobody planned. All it lets the
kit do is say so — in the voice it already uses for `NOT COMPARED: (root)`, announcing its own
reach limit to the person who can fix it by re-deriving from the target. And a warning:
`pathSource: "target"` must not read as a quality badge. Their own target-derived list came from
a grep for `case "..."` at one indentation level in one file. **`target` means derived from the
implementation, not complete.**

**On C — the two items are not in conflict, and the remedy is neither.** Construction covers "the
harness I gave you captures properly"; attestation covers "you ran the harness I gave you", which
does not follow from it once anyone edits, pipes, or reruns one path by hand. But blanket
refusal-to-default is the wrong fix, and the evidence is their own run: they attested `complete`
seventeen times. **"If a harness had made me type it seventeen times I would have scripted the
typing — which is a rubber stamp with extra steps"**, and it manufactures the false `complete`
the rule exists to prevent. Proposed instead: **derive where derivable, refuse where not.** A
harness that redirects to files and can establish it read to EOF writes `complete` itself; one
that cannot writes `unknown`, which is already the format's correct answer and needs no new
state; the refusal-to-default applies only to the case the harness genuinely cannot tell. "The
current design's real risk is not that adopters lie; it is that they attest in bulk without
deciding, and then the one time it mattered they had already stopped reading."

**On D — take `streams`, it was never really theirs.** Writing `"streams": "separated"` was "not
making a judgment, I was restating a decision I had already made four lines earlier by choosing
`capture_output=True`. The field was a transcription of my own code, and transcription is where
typos live." It looks like an attestation only because in a hand-rolled world the adopter is also
the harness author. **Consequence beyond this plan: step 4 of the guide should shrink from two
fields to one, and its "the only two fields on which you are the authority" becomes wrong the day
a generator ships.**

**On E — `identity` would not have saved the trial, and this was measured.** Not because magpie
lacked a `--version`, but because magpie's version comes from `plugin.json`, which release tooling
bumps. All three builds in question report the same string:

    2b2ce93 (the registration's build):  2.2.0
    d7dfacf (census 1's build):          2.2.0
    bb67078 (census 2's build):          2.2.0

An identity block would have printed `2.2.0` in every batch and separated nothing, while the
branch name in `recordedBy` did the work. **It generalises:** any tool whose version comes from a
package manifest has this property between releases, which is most tools, and is exactly the
window in which an adopter iterates against the kit. **Identity is release-granularity; the
confusion was working-tree granularity.** So emit both, and do not let `identity` stand in for the
build — "what does the tool say it is" and "which bytes did we measure" are different questions,
and the second has no home in the format.

**On the harness language — `sh`, and they would have run it unmodified**, on one condition: it
redirects to files rather than piping. Two arguments beyond portability. It **preserves the
language-agnosticism claim** — a runner in the target's ecosystem means a Python tool's adopter
needs Python tooling in the measurement path of a kit that otherwise only ever touches argv,
streams and exit codes. And **`sh` makes the honest-capture property inspectable**: "I can read
`>out 2>err` and see that nothing was lost. I cannot read someone's runner and see that as fast."

**A trap this plan had not found: the launcher prefix.** Their argv was
`["bun", "scripts/cli.ts", verb, "--acc-not-a-flag"]`. The launcher is not in the recorded `argv`
and must not be, since `argv` is what the tool received — so a generated harness needs a launcher
prefix configured once and excluded from every record. `acc check` already draws this distinction
for targets; it has to reach the harness too.

**A correction to item 4's own evidence.** The `recordedBy` string quoted above says "via bun
subprocess". The harness was **python3** — `subprocess.run(..., capture_output=True)` driven from
bash, with bun only ever launching the target. So the string this plan cites as provenance got
right by accident is **wrong about its own harness**, and the property that made the capture
honest was `capture_output` reading both pipes to EOF, not anything about bun. Item 4's argument
survives — the branch name was still the useful part — but its exemplar is evidence for A's
conclusion rather than against it.

**The offer, restated and still open:** "Happy to run a draft harness against magpie before you
commit to it — I have census 3 coming and would rather find the trap in your script than describe
one in prose."

### Answers to F, G, H and open questions 2 and 3

From the plan's author on the `acc-magpie` grapevine, message 28, offered explicitly to be
overruled: "Not editing the plan; the file is yours." **Recorded, not adopted.**

**F — `output_kind: "data"`, `cardinality: "single"`, and `effects` turns on whether it writes a
file at all.** `spec.ts` scopes the effects claim to what a command CAUSES, not what its own code
writes, which is why `check` is `non_idempotent`. `probe-plan` spawns nothing, so it inherits
none of that — but a command that writes to a caller-named path is not `read_only` either, and
the honest value would be `idempotent`. **Recommendation: emit on stdout and stay `read_only`**,
because `acc` is the positive control for its own standard and the first mutating command in it
should clear a higher bar than convenience; because it sidesteps overwrite-or-refuse, parent
directories, the executable bit and read-only filesystems, none of which buy insight; and because
`sh capture.sh` runs without the executable bit, so `--out`'s convenience argument is thinner than
it looks. The adopter's request for `--out ./capture.sh` is the one thing pulling the other way —
if taken, declare `idempotent` and say in the spec comment why it is not `read_only`.
`errors`: `not_found` for an unreadable declaration or path file, `usage` when neither is
supplied; `errorsOf` adds the parser kinds and they should not be restated.

**G — yes, a required positional named `target`, same word and position as `check`.** Consistency
is cheap, but the settling reason is the launcher trap: the harness has to invoke something, and
`bun scripts/cli.ts` must not appear in a recorded `argv`. `check` already solves this and the
report carries the result — **`targetArgv0` is an array**, `["bun", "/abs/path/cli.ts"]` on
exactly this shape. Reuse that resolution rather than re-deriving it, or the two will disagree.

**H — the generator emits the COMMAND, never the value**, and this belongs in the plan as a rule
rather than a caution. The harness computes `date -u +%Y-%m-%dT%H:%M:%SZ` at run time and the
generator emits that expression unexpanded: **anything the generator can compute at generation
time is by definition the wrong value for this field.** One sub-question not asked — stamp once
per run or once per record? The adopter used one timestamp across every record and nobody was
misled, but per-record is more truthful, costs nothing, and the field's whole value is that it
dates the recording.

**Open 2 — one file: a harness that writes the batch itself.** Two files means the caller keeps
them in sync, and the part most likely to drift is the part that matters, because `completeness`
is a property of how the capture ran and its derivation has to live in the same artifact as the
capture. This is also what the adopter asked for, and their `sh`-with-file-redirection condition
is what makes it work: `>out 2>err` is inspectable, so a reader can see nothing was lost without
trusting the generator.

**Open 3 — `--paths ./paths.json`, a JSON array of arrays** — `[["state"], ["send", "note"]]`,
the same shape as `commands[].path`, so it is one vocabulary rather than two. Newline-delimited
text is tempting and wrong: a multi-token path has no unambiguous separator, and `send note`
would have to be split on a space that could legitimately be inside a token.

**And a cost neither the review nor the adopter flagged: adding `pathSource` would be a BREAKING
change, not an additive one.** `recorded.ts` closes the envelope to `formatVersion`, `records` and
`identity` and refuses every other key, deliberately, so a reader never half-understands a
document. A batch carrying `pathSource` is therefore **refused outright by every `acc` built
before the key exists** — exit 2, no report. Absent-means-`unstated` makes old batches safe in new
readers and does nothing for new batches in old readers. That may still be the right call — the
project is pre-public with two adopters, and
[the pre-1.0 decision](../wiki/decisions/pre-1-0-while-the-design-moves.md) treats the promised
surface as a default rather than a wall, with a bar this case arguably clears, since the
closed-key rule was written before anyone had built a generator. But **"grow a key" reads as
additive and this format's design makes it not**, and the plan should say so before anyone prices
it as cheap.

### Both remaining decisions were taken

They are recorded at the end of this document, under
[the decisions](#the-decisions-taken-2026-08-26). Neither was settled internally: both were put to
the adopter, who had personally proposed the position that lost in each case.

## The harness trial, 2026-08-26

The Validation section's offer was taken. A draft `sh` harness — the shape this generator would
emit, hand-written rather than generated — was verified against `acc` itself and then **run cold
against magpie by the adopter**, who did not write it and whose declaration it never saw.
`acc-magpie` messages 29 to 32.

**It worked.** Against magpie's 17 paths it produced a batch byte-identical to the one that
adopter had built by hand in python that morning — `17 records at 17 paths`, `0 byte-differences`,
every record's `stderr` re-parsing as magpie's own envelope with escapes intact, and the same
`15 of 17 declared command paths compared; 0 disagreements` census. **The `od`/`awk` encoder
survived JSON rejections being escaped into JSON**, which was the open risk.

Three things the trial settled that reasoning had not.

**The open question about `completeness` is answered, and the answer is derivation.** Asked
directly whether being handed a demonstrably correct harness removes a useful moment of thought:
_"no… I attested `complete` seventeen times by hand this morning and thought about it exactly
once, on the first record. The seventeenth was a copy of the first. Derivation is strictly better
than a ritual I had already stopped performing by record two."_ That retires the question raised
as **C** and reframed as open question 4.

**The harness dirtied the tree it measured.** Its build string read `cd06cb5-dirty` from a clean
checkout, because the script and the batch it writes are untracked files inside the tree — so on a
_generated_ harness the flag fires every run, forever. It inverts the field: `-dirty` warns that
uncommitted changes may be inside the measurement, and one that always fires carries no warning
when a genuinely dirty tree needs it to. **The instrument contaminated what it measured**, in a
plan whose subject is keeping the two apart. Fixed by excluding the harness's own two artifacts
from the check by repo-relative pathspec — not by basename, which would silently drop a real dirty
file sharing the name — and verified with the negative cases as well as the happy one.

**The cwd trap is worse than a warning, and here is the measurement.** Run from the wrong
directory with a relative launcher, the harness produced **eighteen honest, complete, verbatim
captures of a broken invocation**. Every field true, the batch valid, `completeness` correctly
`complete`. A reader would conclude the tool enumerates nothing at any path — a statement about
the tool, drawn from a batch in which nothing is false. **Nothing in the batch records the working
directory**, and the launcher resolution is the only thing standing between a generated harness
and this outcome, which is a further argument for reusing `check`'s `targetArgv0` rather than
re-deriving it.

One weak signal exists and must not be acted on: all eighteen records were byte-identical. A tool
with one global flag registry answers identically at every verb by construction — magpie itself
did, before `cd06cb5` — so treating that as a broken-invocation verdict would fire on a correct
tool. **As a reported line in the `NOT COMPARED` voice rather than a judgment**, it costs nothing
and names something a reader can check in one command.

**A second round found two more defects of the same shape, and the first fix was verified
vacuously.** The exclusion above was checked in a throwaway repo with the harness at the repository
root, where the current directory _is_ the top — so a repo-relative pathspec and a CWD-relative one
are the same string, and both of the following are invisible. Re-run by the adopter from a nested
skill directory inside a monorepo, all four states reported `-dirty` and the fix had changed
nothing:

- **A pathspec is read relative to CWD, not to the repository root.** `:(exclude)` on a
  root-relative path matches nothing from any subdirectory. It needs `:(exclude,top)`, which
  anchors at the root — the coordinate system the path was already in.
- **Scoping the check with `-- .` disagrees with what `BUILD` names.** The identifier is
  `git rev-parse HEAD`, which is repo-wide; a CWD-scoped dirt check describes something else, and
  **it makes an over-exclusion test vacuous**, because it never looks outside the current directory
  to begin with. The check must be repo-wide, with top-anchored excludes and no `.`.

A third of the same family was found while repairing them: excludes joined into a string word-split
on a repo path containing a space, so they are built as positional arguments instead.

**The requirement this leaves behind: a regression test for the generated harness must run from a
subdirectory AND through a symlinked path.** A root-level run cannot distinguish a working
exclusion from an inert one, and a run through a physical path cannot detect the
logical-versus-physical defect below. "The tool lives in a subdirectory of a larger repo" is the
ordinary case for a monorepo rather than an exotic one, and `/tmp` is symlinked on macOS, so the
throwaway fixture repo is itself the second topology.

The adopter's sentence for it, which is stronger than the requirement: **a harness whose
correctness depends on where it is standing cannot be verified from one place.** Neither party
could have produced this defect list alone — one had a fixture repo at a root, the other a nested
skill directory in a monorepo on a machine where `/tmp` is a symlink — and no amount of additional
care on either side substitutes for the second topology.

All three defects, plus the relative launcher above, have one shape: **the harness's correctness
depends on where it is standing, and nothing in its output records where that was.**

## The decisions, taken 2026-08-26

Both were put to the magpie adopter rather than settled between maintainers, because on each one
the internal lean ran against a request that adopter had made. They withdrew both of their own
proposals on arguments that arrived after them — `acc-magpie` message 37.

**`acc probe-plan` emits on stdout and stays `read_only`.** The `--out ./capture.sh` request is
withdrawn: _"no, a redirect would not have cost me anything real… `sh capture.sh` runs without the
executable bit, so the only thing `--out` was buying me was not typing `>`."_ The positive-control
argument outweighs the keystroke, and the overwrite / parent-directory / executable-bit /
read-only-filesystem questions are avoided rather than answered.

**But redirection has its own failure mode, and it is this project's founding one.**
`acc probe-plan > capture.sh` truncates the file **before** `acc` runs, so a failure leaves a
zero-byte script behind — and an empty script is a valid script that does nothing, successfully,
exit `0`. The adopter would get a harness that appears to run, produces no batch, and reports
success. `--out` does not save anyone who typed `>` anyway. **The generator buffers the whole
document and writes it in one call**, so a failure produces an empty file rather than half a
script: half a script may capture three paths of seventeen and write a batch that is short and
complete-looking, which is the `head`-in-the-capture defect arriving through the generator instead
of the harness. This belongs in the guide as well as in the code.

**The batch format does not grow `pathSource`, and the requirement it carried is met in
`recordedBy`.** Its proposer priced the breaking change and withdrew it, then identified what the
key was actually buying: not a label, but **who hears the sentence.** Generation time reaches the
person who chose the source; the census reaches the person who draws a conclusion from the report,
and those are frequently not the same person. So `acc probe-plan` appends the source to the
`recordedBy` string, which the report already prints on its own line:

    recorded by flint (agent) via sh harness, build cd06cb5-dirty, paths derived from the declaration

No format change, nothing refused by any existing reader, and **nothing parses it** — the kit never
reads that field, so this is not the free-text pattern-matching the review and the adopter both
argued against. It is prose printed to a human on a line that already exists.

It is strictly weaker than an enumerated key: no machine can act on it, and a hand-written batch
can say anything there. That is the right trade at two adopters. **The requirement to keep, in the
proposer's words: _the limit must reach the person reading the census, not only the person running
the generator._** If the format ever breaks for a reason of its own, ride `pathSource` along on
that break rather than causing one — at which point the census line becomes machine-driven and the
string retires.

### A fourth defect, and the class it completes

The adopter flagged a hypothesis with a named mechanism rather than a finding, because their only
reproduction was confounded. **It reproduces.** `git rev-parse --show-toplevel` reports a
_physical_ path while `pwd` and an absolute `$0` may both be _logical_ — `/tmp` is a symlink to
`/private/tmp` on macOS, and symlinked checkouts and automounted homes do the same. When they
disagree the prefix match fails, the excludes vanish, and the harness reports its own artifacts as
dirt: the original `-dirty` inversion, reappearing wherever a path is symlinked, and reappearing
in every throwaway fixture repo built under `/tmp`.

`pwd -P` is not sufficient, which only running it reveals: that fixes a relative `$0`, but
`sh /tmp/…/capture.sh` supplies an `$0` already absolute and already logical, so the fallback never
runs. The resolution has to physicalise `$0`'s own directory.

**Four defects, and all four are one class**: the relative launcher, the CWD-relative pathspec, the
CWD-scoped dirt check, and the logical-versus-physical path. Every one of them is the harness
behaving differently depending on where it was standing, and **nothing in its output records where
that was.** Three of the four were found by the adopter, from a machine and a directory layout the
author did not have — which is the argument for the subdirectory regression test stated above, and
against trusting a matrix run in a repo built for convenience.
