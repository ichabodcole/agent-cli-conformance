---
type: report
generated: { by: claude-fable-5, at: 2026-08-28 }
status: stable
lifecycle: live
description:
  The retroactive per-class baseline promised by the 2026-08-27 cold-repair report — the nine
  regressions the repairs of runs 1 and 2 introduced, coded from recorded evidence on the NEAR,
  FAR and LIST catch-conditions, plus four specimens from the 2026-08-28 transport episode, coded
  separately because that episode was not a pipeline run. Two predictions about the class counts
  were posted to acc-internal before any row was coded; both held, and the count added a result
  neither covered.
tags: [method, docs, review, testing]
subject:
  the per-class baseline for run 3 of the cold-repair pipeline, recovered from recorded evidence,
  with each regression coded on catch-condition, introducer, and the kind of evidence backing it
examined:
  run 1's regressions via commits 5b7559a and d5174eb and acc-internal messages 153-160; run 2's
  via commit 7ff689d and the cold-repair report; the transport-episode specimens via commits
  2a2c72c, 2c57cfe and e62464c, acc-internal messages 189-200, and the live files
---

# The per-class baseline

[The cold-repair report](./2026-08-27-the-cold-repair-pipeline.md) took up per-class tagging to
untangle three instruments adopted at once — the writer's dependency list, the near-seam check
and the far-seam grep — and stated that "the per-class baseline exists already, from evidence
nobody has to regenerate." This page delivers what that sentence promised: every
repair-introduced regression from runs 1 and 2, coded on the three catch-conditions, from the
recorded evidence and nothing else. Nothing was re-run.

## The expectations, stated before the count

Posted to `acc-internal` as message 201, before any row below was coded — kept here so a reader
can tell this sweep from one that found what it went looking for:

1. Runs 1 and 2 would look **near-seam-heavy**, with a reader-class residue: run 2's
   reintroduction and destructive fence satisfy no seam condition, being defects _in_ the edit
   rather than sentences falsified _by_ it.
2. The **far-seam class might have zero members inside the pipeline runs**, its entire baseline
   coming from the transport episode — which was not a pipeline run.

The count below bears out both — and adds one result neither expectation covered: a live seam
specimen that satisfies **no** instrument's catch-condition at all.

## The coding frame

Each regression is coded on the conditions as pinned in the cold-repair report, at the
granularity of the **dependent sentence**, never the file:

- **NEAR** — the falsified sentence sits inside a hunk's context window, or is cited by / cites
  the hunk (the "one unit outward" rule).
- **FAR** — the sentence carries the measurement's dethroned mechanism noun, outside the files
  the edit touched.
- **LIST** — the sentence was named **as a dependent** in the writer's role-marked dependency
  list. For runs 1 and 2 this codes **N/A, not off-list**: the stage did not exist, so no
  prediction was possible, and scoring an impossible prediction as a miss would hand the stage a
  before/after improvement it did not earn.
- **INTRODUCER** — who made the edit that introduced the regression: a cold **writer**, or a
  **non-writer** (the coordinator, or the landing agent). The dependency-list stage is
  writer-side only, so a regression introduced elsewhere sits outside its reach and would dilute
  the signal if pooled.
- **EVIDENCE** — _first-hand_ (a surviving diff or file this sweep re-read) or _reconstructed_
  (quoted in a commit message, channel message, or the cold-repair report; the underlying
  before/after copies were scratch-scoped and are gone).

A defect can satisfy more than one condition; the tagging keeps that visible and an ambiguous
defect credits no single instrument.

## Run 1 — three regressions, all caught before merge

| #   | regression                                                                                                                          | introducer           | NEAR | FAR | LIST | evidence                                                                          |
| --- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ---- | --- | ---- | --------------------------------------------------------------------------------- |
| 1.1 | added lead-in "D3 still counts it, and" contradicted by the report text quoted four lines beneath it                                | writer               | yes  | no  | N/A  | reconstructed — message 157 records the four-line distance and both texts         |
| 1.2 | removing two of three sibling constructs left the third reading as authoritative when it no longer was                              | writer               | yes  | no  | N/A  | reconstructed — messages 157/160; siblings share one unit, so the window holds it |
| 1.3 | restoring the dropped to-stderr fact made the same sentence's own tail false — "no signal" where `ok:true` is a signal, a false one | non-writer (landing) | yes  | no  | N/A  | first-hand — the sentence and its repair are in d5174eb's diff and message        |

Coding note on 1.2: the third sibling's sentence was not falsified textually — its _reading_
changed, gaining authority by elimination. The near-seam question ("is this still true now that
the edit exists?") reaches it, since the authority it now claims is untrue, but this is the
softest of the three codings and is marked as such rather than smoothed over.

FAR is _no_ across the run for a reason the record already contains: the landing stage's
cascade-check swept the restored fact's degraded form across wiki, STANDARD.md, roadmap, README
and src, and found zero carriers — a documented bounded search, not an assumption of absence.

## Run 2 — six regressions, all caught before merge

The total of six is **first-hand** (the coordinator ran every stage in one session). The
itemization below is **reconstruction** from the commit message of 7ff689d and the cold-repair
report's rationale paragraph, which name at most six identifiable items with one uncertain
pairing: the "`package.json` untouched, measured" sentence is recorded as falsified _twice_
across successive edits, and rows 2.5 and 2.6 code those as two instances of one sentence. A
reader should cite the total as measurement and the rows as reconstruction.

| #   | regression                                                                                                                                     | introducer | NEAR | FAR | LIST | evidence                                        |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---- | --- | ---- | ----------------------------------------------- |
| 2.1 | carving out the skip-install reader made "the second line is part of the install" false                                                        | writer     | yes  | no  | N/A  | reconstructed — report rationale                |
| 2.2 | the block growing from three lines to six detached "before the third line" from the command it guarded                                         | writer     | yes  | no  | N/A  | reconstructed — 7ff689d message, report         |
| 2.3 | pass 2 reintroduced the exact briefed defect: an empty derived ref leaves a bare `#`, delivering an older kit at exit `0` while looking pinned | writer     | no   | no  | N/A  | first-hand — measured and quoted in 7ff689d     |
| 2.4 | pass 3 made the copy-pasteable block destructive: remove, cache wipe, failed add — a working install ends as nothing                           | writer     | no   | no  | N/A  | first-hand — measured and quoted in 7ff689d     |
| 2.5 | "`package.json` untouched, measured" falsified by a structural edit (first instance)                                                           | writer     | yes  | no  | N/A  | reconstructed — report: "falsified … twice"     |
| 2.6 | the same sentence falsified again — `bun remove` moved above the add, four lines above it                                                      | writer     | yes  | no  | N/A  | reconstructed — report rationale names the move |

Rows 2.3 and 2.4 are the cases the frame was built to keep out of the seam classes: they are
defects **in** the edit, not sentences falsified **by** it, and neither seam instrument's condition reaches them. They were
the two worst defects of the week, and they belong to the reader stages alone. Letting them into
a seam class would credit those instruments on the strength of nothing.

## The transport episode — coded separately, because it was not a pipeline run

Four seam specimens from 2026-08-28's transport measurements and repairs. Their semantics differ
from the runs above: these are not regressions caught inside a pipeline — they are sentences a
measurement falsified, found (or missed) on the live tree across three passes. The LIST column
here is live, because the repair run `e62464c` carried the first role-marked dependency list.

| #   | specimen                                                                                                                            | introducer            | NEAR | FAR | LIST     | evidence                                                                                              |
| --- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ---- | --- | -------- | ----------------------------------------------------------------------------------------------------- |
| T.1 | README's "resolves from whatever bare clone it already holds" — the last trailing context line of seam-commit 2c57cfe's own hunk    | non-writer (coord.)   | yes  | yes | N/A      | first-hand — the hunk was re-read for this sweep; the sentence sits two lines below it                |
| T.2 | the L0 guide's copy of the same warrant, in a file 2c57cfe never touched                                                            | non-writer (coord.)   | no   | yes | N/A      | first-hand — e62464c repaired it by deletion; found by the noun grep alone                            |
| T.3 | README's "a first install into a new project can still hit the silent ones", unconditional where the guide conditions both failures | non-writer (coord.)   | no   | no  | on-list  | first-hand — e62464c's list named it a SUSPECTED dependent before editing, and it moved               |
| T.4 | SKILL.md's "an unpinned install resolves from whatever bun already has cached" — the mechanism as paraphrase                        | writer (run 2's pass) | no   | no  | off-list | first-hand — read at skills/acc/SKILL.md:45 on develop `e12ac1c`; since repaired by `1838a62`, merged |

**T.4 is the result the expectations did not cover.** It satisfies no condition at all: not near,
not far, and off-list. Not near, because its file was untouched by the falsifying repairs. Not
far, by measurement taken for this sweep on develop `e12ac1c`: `grep -n "bare clone"
skills/acc/SKILL.md` hits only lines 63 and 67, both correctly conditioned to the ssh path, while
line 45 words the mechanism as "whatever bun already has cached" — the literal noun grep cannot
reach it. And off-list, because the one list that existed named the sentence as a source to
quote. What actually found it was none of the instruments: a writer opening the file to quote it
(message 196). A widened grep did reach the line afterwards — the coordinator's post-merge check,
whose terms included `resolves from whatever` and `already has cached` — but that demonstration
is **confounded by provenance**: those alternates are the specimen sentence's own words, quoted
to the coordinator four messages earlier. Widening the term list to a claim's paraphrases is
sufficient once the wording is in hand and demonstrates nothing about generating it — and
generating paraphrases is a prediction, a writer guessing at other people's vocabulary,
author-blind in exactly the dimension the far-seam instrument exists to sit outside of.

**Paraphrase defeats the noun grep**, and the countermeasure that needs no anticipation was
measured by the instrument's own author over the pre-repair tree (`cd6372a`), all four specimens,
live surfaces:

| term                          | reaches            | count |
| ----------------------------- | ------------------ | ----- |
| `bare clone` (mechanism noun) | T.1, T.2           | 2 / 4 |
| `older kit` (consequence)     | T.1, T.2, **T.4**  | 3 / 4 |
| neither                       | T.3 — README:92-94 | 1 / 4 |

The consequence term reaches the paraphrase the noun cannot, and not by luck of wording: **the
mechanism is the half a writer paraphrases, because it is the half they explain in their own
words; the consequence is the half they copy, because it is the payload the warrant exists to
deliver.** Three of four carried "an older kit at exit `0`" nearly verbatim while one had already
stopped saying "bare clone". And the consequence term needs no specimen in hand — the finding
names which failure is now impossible, and the broken-install guide states at :171-174 what that
failure did to the reader — so two people holding only the finding derive the same two terms. The
far-seam rule as refined: **two terms from the measurement — what it DETHRONED, and what that
thing DID TO THE READER — both derivable from the finding alone; paraphrases of the first where
the writer can think of them, marked best-effort and never relied on.**

The price, stated as a price and not a caveat: the consequence grep returned **three** extra hits
on this tree, each a true sentence a reader confirms and moves on — and one of the three was
`1838a62`'s verified-and-unchanged entry, which its writer had otherwise found only by hand, so a
third of the overhead bought something. The count itself carries a lesson: the author first
reported two, having excluded the mechanism-owning guide by piping through `grep -v <path>` —
which also deletes every line that CITES that file by path, and hid the third hit in the
direction that made the instrument look cheaper. **Exclude a file by path argument, never by
piping through `grep -v <path>`** — in a wiki that routes by path, the pipe deletes most of it. A
bounded search read as a covered set, for the third time this week, inside the message reporting
one.

**The headline is the three-finders shape, not either term.** Four specimens: the noun grep
reached two, the consequence grep reached a third, and T.3 — which names a HAZARD CLASS, neither
mechanism nor consequence — was reached only by reading the whole document before editing, the
half of the stage with no instrument in it. Three specimens, three different finders. Any
write-up of this episode where a single instrument carries the story is wrong about it. In the
instrument author's own words, carried verbatim:

> The noun grep was proposed on the strength of two specimens it happened to catch. Measured
> afterwards against the full set of four, it finds two. Its author did not know that until the
> retroactive sweep measured it, and would not have found out by using it — an instrument that
> only ever reports what it caught cannot tell you what it walked past. That is the same reason
> the dependency list has to record the entries that did not move, and the same reason neither
> belongs in the hands of the person whose work it is checking.

None of this changes the class counts: four specimens from one episode outside the method is
still one episode, and far-seam's n = 0 inside the pipeline stands uninflated. The repair of T.4
does not remove the limit; it removes this one instance of it.

One countermeasure to T.4's failure mode already exists on the record, adopted by the writer it
happened to: the repair lists its quoted file as SOURCE TO QUOTE **and** DEPENDENT, in both roles
deliberately, because a source-only mark is exactly how the sentence was missed. The two
role-marked dependency lists to date survive in full in the commit messages of `e62464c` and
`1838a62`, which is where run 3's coder should look for the LIST column's ground truth.

## The list entries, coded by outcome

Only the two list-bearing repairs have entries to code, and the coordinator has directed that
**predicted-and-held** be kept as an outcome in its own right rather than dropped: an entry named
before the edit, checked after it, found unchanged, and said so, is not the same as
never-considered. A list that
only ever reports moves is indistinguishable from one written to justify the edits already made;
the entries that come back unchanged are what make the moving ones evidence.

| run       | named-and-moved | predicted-and-held                         | off-list finds |
| --------- | --------------- | ------------------------------------------ | -------------- |
| `e62464c` | 2               | 8 — six unchanged entries, two constraints | 1 (T.4)        |
| `1838a62` | 1 (the brief)   | 5 — four constraints, one checked seam     | 0              |

Constraints are coded as held: an entry that forbade a repair shape ("restating the routing here
would rebuild the fourth home two paragraphs below where it was just removed") constrained the
edit and survived it. `1838a62`'s zero off-list is recorded with its writer's own three confounds
attached — one run, a much smaller edit, the defect already named — and is not evidence the stage
improved. These counts are read directly from the two commit messages; the messages, not this
table, are the record.

## The per-class counts

| class                       | run 1 | run 2 | pipeline total | transport episode |
| --------------------------- | ----- | ----- | -------------- | ----------------- |
| NEAR condition satisfied    | 3     | 4     | **7**          | 1                 |
| FAR condition satisfied     | 0     | 0     | **0**          | 2                 |
| LIST: on-list               | N/A   | N/A   | —              | 1                 |
| LIST: off-list              | N/A   | N/A   | —              | 1                 |
| no condition satisfied      | 0     | 2     | **2**          | 1                 |
| introduced by a cold writer | 2     | 6     | **8**          | 1                 |
| introduced by a non-writer  | 1     | 0     | **1**          | 3                 |

## What run 3 can and cannot conclude, per class

- **NEAR is grounded.** Seven of nine pipeline regressions satisfy the near condition, so a run-3
  fall in that class is a comparison against a real baseline. If the near-seam check works, most
  of the historical regression rate was reachable by it.
- **FAR is ungrounded inside the pipeline: n = 0.** Both expectations said this might happen; it
  did. Every far-seam specimen on record comes from the transport episode, which was not a
  pipeline run — different material, no stages, no writer. Run 3 cannot compare its far-seam
  count against anything, and a run-3 report that pools the classes would be resting that
  instrument's justification entirely on an episode outside the method it instruments. The instrument may still be right; this baseline simply cannot show it, and records that limit
  explicitly.
- **The reader-class residue is the floor.** Two of nine — including the two severe ones —
  satisfy no condition, and T.4 shows the same gap live on the tree. Whatever run 3's instruments
  catch, this class is what the reader stages exist for, and its baseline share (two of nine,
  plus the week's two worst) is the number to hold against any temptation to shrink them.
- **The introducer split points somewhere the current stages do not.** Pipeline regressions were
  writer-introduced eight to one — but the transport episode's seam defects were non-writer three
  to one, and the specimen that survived a purpose-built seam pass was the coordinator's own. The
  dependency-list stage is writer-side only. If run 3's writer-introduced rate falls while
  non-writer seams persist, the open question the coordinator posed — whether the coordinator
  writes a dependency list too — has its evidence. This sweep records the introducer for every row; it does not decide the
  question.

## Limits

The scratch before/after copies of both runs are gone; every distance this page could not re-read
in a surviving diff is carried from the contemporaneous record and marked _reconstructed_. Run
2's itemization in particular is a reconstruction around a first-hand total, and the uncertain
pairing (rows 2.5/2.6) is one sentence counted twice on the report's explicit statement that it
was falsified twice. The transport-episode rows are all first-hand: their diffs, lists and
sentences survive on `develop` and were re-read for this sweep. And the coding of row 1.2 is the
softest in the table, for the reason given beside it. None of these limits change the headline
counts' shape: NEAR-heavy, FAR empty, a reader-class floor, and one specimen no instrument
reaches.
