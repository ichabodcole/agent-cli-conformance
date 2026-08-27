---
type: report
generated: { by: claude-fable-5, at: 2026-08-27 }
status: stable
lifecycle: live
description:
  The third adopter trial — meridian against mind-mapper's CLI, at kit v0.1.4 — reduced to what
  it changes in the standing claim weights. Two claims move from one adopter to two, the full
  recording path runs outside this repository for the first time, and the trial's sharpest
  finding — three verbs the usage line does not advertise — has no kit artifact that can record
  it.
tags: [adoption, trial, evidence, consumer-signal, conformance]
subject: what round 3 adds to the trials record, weighted against the first two rounds
examined:
  round 3, adopter meridian vs mind-mapper's CLI (Spellbook working tree,
  plugins/spellbook/skills/mind-mapper/scripts/cli.ts at develop fcdd3d5), docs and kit both at
  v0.1.4 — the first run to take probe-plan through to a recorded-surfaces re-run (48 paths)
---

# The third trial

This report extends the trials record without editing it.
[The claims from two trials](./2026-08-27-the-claims-from-two-trials.md) is a discharged record
with its dispositions attached; round 3 gets its own document because the honest move on new
evidence is to re-weight the claims, not to rewrite the page that recorded them. Read that
report first for the claim inventory and the register discipline; both carry over unchanged —
**observed** (with commands), **asked** (quoted), **inferred** (marked ours).

## Sources and conditions

Citations are `(r3 §N)`, message N of the round-3 channel log (9 messages, pulled live from
`acc-trial` on 2026-08-27 and saved outside the repo in two agents' scratch directories; the
coordinator holds a third copy). Adopter `meridian`; target mind-mapper's CLI in the Spellbook
working tree — the live source, not the frozen plugin-cache build; docs and kit both at v0.1.4.
Same protocol as rounds 1 and 2: silence until done, seven unchanged questions, then
corrections. meridian never asked for silence to be broken.

Two conditions are new. This is the first round on a kit that already contains the fixes the
first two rounds caused — so every artifact it verifies is verified in its repaired form. And it
is the first run anywhere outside this repository to complete the whole recording path:
`probe-plan` from a hand-built 48-path list, the generated harness, and a `--recorded-surfaces`
re-run (r3 §5).

## Two claims move from one adopter to two

The weight change is what round 3 is for. Both items below were single-adopter claims in the
first report; both now have a second independent hit, on docs already revised since round 1.

### W1. `recordedBy` build provenance comes from the harness's cwd, not the target's tree

**Observed (r1).** "recordedBy says 'build unknown' — I ran the harness from a scratch
directory, and the build provenance comes from the harness's cwd, not the target's tree" (r1
§11). **Observed (r3).** "my batch says 'build unknown' for a target sitting at a known commit
in a repo, because I ran the harness from scratch space" (r3 §7).

**Asked (r3), and it carries the part round 1 missed:** the harness was run from scratch space
"(which your own guide encourages by telling me the batch lands in cwd)" (r3 §7) — the guide's
own advice produces the condition under which provenance is lost. Round 1's ask: "a sentence in
the guide or a `git -C` toward the target" (r1 §11).

**Inferred (ours).** Same defect, same cause, two adopters, and the second showed the docs
manufacture it. The fix candidates are unchanged from r1; what changed is that "worth a look"
became a two-adopter pattern with a documented mechanism.

**Status:** open. Acknowledged at r1 §12; no closure in any record this report was written from.

### W2. A6 through a bun launcher — permanent for the whole population, not awkward for one tool

**Observed (r1).** A6 "cannot be probed through a `bun` launcher: bun swallows the leading
`--`" (r1 §2). **Observed (r3).** The same honest `unverified`, and the sharpening: "nearly
every house CLI is a bun script, so that unverified is permanent for us as-is" (r3 §5).

**Asked (r1).** "a wrapper-script suggestion in the A6 gap text would do" (r1 §5). **Asked
(r3).** "even a documented 'invoke the .ts directly with a shebang' pattern or a config
acknowledgment would settle it" (r3 §7).

**Inferred (ours).** Round 1 framed this as one target's inconvenience; round 3 reframed it as
a population property — for a house whose every CLI is a bun script, A6 is structurally
unverifiable forever under the shipped behaviour. That is the fact that decides priority, and
it came from an adopter, not from us.

**Status:** open.

## Verified on a third stranger — the leave-alone list

Round 3 ran against a kit already carrying the round-1 and round-2 fixes, so these are
verifications of the repaired artifacts, in the adopter's words:

- **The upgrade detection loop, end to end, first try.** The pinned add failed loud ("no commit
  matching v0.1.4"); in the adopter's words, "`acc version --check` exited 10 and its `next`
  block carried the reinstall command. Remedy worked first try" — with the skill's framing
  named as what made it happen: "the skill's step-1 framing ('the second line is part of the
  install') earned its keep here — I'd have trusted the exit-0 bunx otherwise" (r3 §3). The
  next-hint fix was exercised in the wild within hours of shipping.
- **The wrong-first-guesses table generalised past its rows.** meridian's first guess was
  `.data.verdict` — a name the table does not contain — and the table still "resolved it in one
  read" (r3 §7). It "saved me once already (.findings not .results)" during the run (r3 §4).
- **The choices envelope, on a genuine typo.** "(accidentally, genuinely) `acc shw`" (r3 §7) —
  "the choices envelope worked on me exactly as the skill promises" (r3 §5).
- **The recording path.** "probe-plan harness ran first try; ACC_RECORDED_BY honored" (r3 §5),
  declaration-free, 48 paths.
- **The safety triage's decision frame** — the three questions were answerable and answered
  ("verb table, bare=usage-error, no pre-parse work", r3 §4) — with the sharp exception below.

## New claims, one adopter each

### N1. The safety guide's containment is unsound for a target that re-derives its home — fixed alongside this report

**Observed.** "the target honors its own home env var, and the safety guide's scratch-HOME
trick would NOT have contained it (it re-derives from its own var, not $HOME)" (r3 §7).
meridian was contained only because they had read the source and set `MIND_MAPPER_HOME` to a
scratch directory themselves (r3 §4) — the reader who followed the guide most exactly would
have been the one not contained. **Asked.** "Worth a sentence in the safety guide: 'if the
target has its own home override, set that too'" (r3 §7).

**Status:** fixed alongside this report, in the same set of branches, with both arms controlled — a fixture that
re-derives from its own variable, the scratch-HOME arm shown failing against it, then the guide
sentence. The repair's own measurement found a second defect in the same line: whether one
prefix assignment sees another (`HOME="$(mktemp -d)" XDG_CONFIG_HOME="$HOME/.config"`) is
unspecified, and on the machine measured it genuinely differed by which shell binary ran the
line — two measurers first split it by shell name and then found even that was wrong, because
one's `bash` was the system 3.2 (not contained) and the other's was a newer bash on PATH
(contained). The stable statement is the honest one: the behaviour is unspecified, it was
observed to differ, and the binaries that did not contain were this machine's system defaults —
the ones a shebang or a CI runner reaches.

**Inferred (ours), and the two defects carry different lessons — merging them would lose one:**

- Defect 1 is author blindness: the original control used the one fixture shape the instruction
  was written for — a target writing through `$HOME` — so it demonstrated the claim instead of
  testing where the claim stops holding. Remedy: a control built by someone other than the claim's author, or an
  author made to enumerate the shapes the claim _excludes_.
- Defect 2 is not about authorship at all: a cold reader running the same control once would
  have gotten one shell and passed it too. The control inherited an unexamined property of the
  machine it ran on — and that is its second appearance in this tree, beside the `awk`/`od`
  portability note the research already flags as unmeasured. Remedy: vary the environment the
  control runs in; four shells would have caught it with the same author and the same fixture.

### N2. The census has no rollup — 48 paths print 48 lines

**Observed.** "The RECORDED SURFACES block prints 48 near-identical 'did not enumerate at X'
lines" (r3 §5). **Asked.** "a rollup ('48 paths, 0 enumerated') with only the exceptions
itemized would read better at this scale" (r3 §5). **Inferred (ours).** No earlier trial
recorded enough paths for this to be visible; it is the first finding produced by the recording
path succeeding. **Status:** open.

### N3. The drift was found — and had nowhere to go

**Observed.** Deriving the path list from the dispatch table surfaced "three verbs — `changes`,
`delete-batch`, `message` — that the usage line does not advertise" (r3 §6): the exact drift
the kit exists to detect, found by an adopter in their own tool for the first time. **And then:** "I had no declaration, so the most valuable finding of the whole
trial lives in my prose, not in any artifact the kit reads. A 'declaration skeleton from a path
list' generator would have caught it structurally" (r3 §7). The related bridge ask: step 6's
registry guide argues the why, "but the jump from 'one table' to a formatVersion-0 declaration
file is unbridged in what I read" (r3 §7).

**Inferred (ours).** This is the strongest tooling argument any trial has produced: the drift
the kit exists to detect was found, and the kit has no artifact that can record it. A
declaration skeleton
generated from a path list is argued for by a trial rather than by us. **Status:** open, and
first on this report's decision surface.

### N4. Step 1 is written for a fresh install; every later reader is upgrading

**Observed.** "step 1 is written for a fresh install; my machine had an existing pin, and the
duplicate-key hazard means a naive second `bun add` is exactly the trap. The broken-install
guide covers it, but I got there only because my failure was loud; the silent shapes wouldn't
have routed me" (r3 §7). **Asked.** "One upgrade sentence in SKILL.md step 1" (r3 §7).
**Status:** open.

### N5. The second rendering costs a second execution

**Observed.** "A way to get the text report and the JSON from one run — I ran the check twice"
(r3 §7). **Inferred (ours).** Adjacent to round 2's `acc report <file>` ask (re-render the
human report from saved JSON) — not the same ask, but the same cost paid at the same moment, so
the two belong in one design conversation if either is taken up. **Status:** open.

### N6. A hand-built path list has no reality check

**Observed.** "The recording guide honestly documents the dead-path hazard (even citing
mind-mapper), but there's no tool-side cross-check; I wanted one while writing paths.json" (r3
§7). **Status:** open; N3's skeleton generator and this are plausibly one mechanism.

### N7. Exit 9 appears before its meaning does

**Observed.** "at the moment the first check exited 9 I was briefly parsing 'is this acc
failing or the target failing' from the envelope alone"; the answer was found "later in the L0
guide and the JSON guide" (r3 §7). **Asked.** exit 9's meaning "inline in the skill" (r3 §7).
**Inferred (ours).** The same met-before-explained class as the first report's legend finding.
**Status:** open.

### N8. Where to read the guides is ambiguous after a bun install

**Observed.** meridian read guides from a clone checked out at the tag, "same bytes, but the
skill's 'every guide is a file in the acc repository' leaves where-to-read ambiguous when you
installed via bun" (r3 §7). **Status:** open.

## Misreads — evidence about the documents, and one about the coordinator

- **"did not enumerate at the root" read as contradicted by a usage line listing every verb.**
  The "(NOT a tool with no flags)" parenthetical corrected it (r3 §7) — the guard added after
  round 1 fired, and the maintainer's verdict stands: "it should not have needed to" (r3 §8).
  The same misread was made the same day by the coordinator choosing the target: "I read that
  usage line as enumeration and told the owner this tool would exercise the census comparison.
  It does not" (r3 §8). Two independent readers, one of them the briefer — the strongest
  evidence yet that verbs-in-usage reads as enumeration to everyone who has not hit the misread
  before.
- **Step 4's bullet primes A3 as `choices`** when the rule's MUST is naming the offending token
  and `choices` is the SHOULD (r3 §7).
- **`defaultOutput: json` reads as a cheap unlock**, "with the correction living one document
  later than the temptation" (r3 §7) — the correction itself was praised ("well written"); its
  placement is the defect.
- **The `$?`-after-a-pipeline class**, reported by meridian as self-inflicted and matched by
  the maintainer twice the same night, once affecting a report to the owner (r3 §8). Not a
  document defect; recorded because it is, in the maintainer's words, "the most common way
  anyone in this project has been wrong today."

## The decision surface

Ours, and only an ordering — substance above.

1. **N3, the declaration skeleton** — the trial's central result: the drift was found and the
   kit had no artifact to record it. N6 plausibly rides along.
2. **W1 and W2, the newly two-adopter items** — provenance-from-cwd (with the docs shown to
   manufacture it) and the bun-launcher permanence (now a population claim).
3. **The one-adopter list** — N2 rollup, N4 upgrade sentence, N5 one-run renderings (with r2's
   adjacent ask), N7 exit-9 placement, N8 where-to-read; and the two doc-priming misreads
   (step 4's A3 bullet, `defaultOutput`'s correction placement).
4. **Already fixed alongside this report, not a decision:** N1, the safety-guide containment
   defect.

What round 3 did _not_ produce: any finding against the check report's truthfulness, any kit
misbehaviour on the target ("none smell like kit artifacts", r3 §4), or any request to break
silence. Three adopters in, the maintainer's close stands as the round's summary: "this is the
first run where every artifact in the path did its job … and the failures that remain are ours
to fix rather than yours to work around" (r3 §8).
