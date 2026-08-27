---
type: report
generated: { by: claude-fable-5, at: 2026-08-27 }
status: stable
lifecycle: discharged
description:
  The claims from both adopter trial runs — halley against astrolabe, tansy against media-buffet's
  mb — sorted into what an adopter observed, what they asked for in their own words, and what we
  infer. Claims both independent runs hit are marked as such, and so are the claims a later
  message in the same trial logs verifies as fixed.
tags: [adoption, trial, evidence, consumer-signal, conformance]
subject: the claims from both adopter trials, weighted by corroboration and sourced to the run logs
examined:
  round 1, adopter halley vs astrolabe (Spellbook's observatory-board CLI), run with the docs
  ahead of the kit — a silently-installed v0.1.0 kit under current-checkout docs — with follow-up
  passes at v0.1.1 (step 4 end to end) and v0.1.2 (cold re-read); round 2, adopter tansy vs
  media-buffet's mb, docs and kit both at v0.1.3.
---

# The claims from two trials

Two cold adopters have taken a real CLI through the kit with no help from this repository
beyond its shipped artifacts. This report reduces both runs to the claims that should drive what
we implement. It decides nothing: it says what was observed, what was asked for, how strongly,
and what the record already shows as answered — so the owner can decide from evidence rather than
from anyone's memory of it.

## How to read this

Every claim keeps three registers separate, because blurring them is how our own preferences
would end up counted as consumer signal:

- **Observed** — what an adopter saw, with the command and output where they gave one.
- **Asked** — what an adopter requested, quoted. A paraphrase appears only where the original is
  too long to quote whole, and never replaces the load-bearing wording.
- **Inferred** — ours, and marked as ours.

**Weight.** A claim marked **two-adopter** was hit by both runs independently — neither adopter
saw the other's trial, and the second hit survived the doc revisions the first one caused. That
is the strongest evidence this project has. **One-adopter** claims are real data points, listed
separately so nobody has to count. Where the maintainer verified a claim from their side before
(or instead of) taking the adopter's word, that is noted — it raises confidence without making
the claim two-adopter.

**Status.** _Open_ — nothing in the record answers it. _Acknowledged_ — the maintainer took it
on the record; closure not shown in these logs. _Closed in-trial_ — a later message in the same
record verifies the fix.

## Sources and conditions

Citations are `(r1 §N)` and `(r2 §N)`, message N of each channel log. For anything that matters,
read the logs, not summaries of them — including this one. Step numbers throughout are
SKILL.md's.

- **Round 1** — adopter `halley`, target astrolabe (Spellbook's observatory-board CLI: a
  bun-run `.ts` over a local daemon). Log: `~/.grapevine/archive/acc-trial-1787816232743.jsonl`
  (16 messages). Condition: **mixed** — halley read current docs from a local checkout, but
  `bun add -d` on the unpinned git URL silently delivered v0.1.0 from a cached resolution
  (r1 §7). The whole of halley's "docs describe things the tool doesn't have" category was
  manufactured by that gap, which itself became the round's largest finding. Follow-ups in the
  same log: step 4 end to end at v0.1.1 (r1 §11), a cold re-read at v0.1.2 (r1 §15).
- **Round 2** — adopter `tansy`, target media-buffet's `mb` (`packages/cli`, checked as
  `dist/mb.js`). Log: pulled live from the `acc-trial` channel on 2026-08-27 (10 messages;
  saved copies outside the repo in two agents' scratch directories). Condition:
  **clean** — docs and kit both at v0.1.3, which already carried the round-1-driven fixes. So
  where round 2 hit the same failure as round 1, it hit it _through_ the revised docs, and the
  corroboration is genuine.

Both rounds ran the same protocol: silence until the adopter says done, then seven pre-written
questions, then corrections. Neither adopter broke silence. Both targets ended CONFORMANT (L0)
— astrolabe in one session (r1 §2), mb with "no acc.config.json needed" and "0 waivers" (r2 §6).

## Two-adopter claims

### T1. The check report's JSON shape is undocumented — both adopters reverse-engineered it

**Observed (r1).** halley: "Extracted evidence with python over the saved JSON rather than any
acc verb" (r1 §5). **Observed (r2).** tansy's first three `jq` queries guessed wrong
(`.data.results`, `.status`, `.summary`; `observations[].argv` came back null — the field is
`args`), then "dumped `.data | keys` and `findings[0]` whole and re-derived the shape from that"
(r2 §8).

**Observed (maintainer).** `acc schema` does not answer this: it "describes acc's OWN CLI
surface — name, global_args, commands, errors — and contains no `findings`, no `verdict`, no
`conformant`, no `coverageGaps`" — verified by running it before replying, which is the only
reason the finding is not misfiled as "user missed an existing command" (r2 §9).

**Asked (r2, one adopter).** "a shape reference for the check JSON — even one worked example in
a guide, or an acc schema/`--explain` verb; it is the only artifact in the flow I had to
reverse-engineer" (r2 §8). halley did not ask for this; their workaround stands as observation
only.

**Inferred (ours).** The corroboration is on the _observation_ — both guessed, at the same
artifact, in a flow where nothing else needed guessing. There is a tension worth preserving:
tansy also listed "findings JSON being fully self-describing (rulePath, evidence ids, deviation
class)" under what worked well (r2 §6). Both are true: the finding objects explain themselves
once found; the envelope around them had to be guessed. The gap is the envelope, not the finding
objects.
The adopter-named options (worked example in a guide, a schema/`--explain` verb) differ a lot in
cost; the cheap one is a documentation change.

**Status:** open.

### T2. Findings carry evidence ids, not the probe argv — both adopters did the same join by hand, at the same decision

**Observed (r1).** halley joined evidence ids against the observations array with python to
prove "C2's third invocation was D2's bare invocation"; the text line "a usage error exited 0
(2,2,0)" never names the argv (r1 §5). **Observed (r2).** tansy: "the finding's evidence field
gives observation ids, and I wanted the probe argv inline; I joined ids into `.data.observations`
myself" (r2 §8).

Both joins happened at the same kind of moment. halley was triaging their first failure; tansy:
"I was deciding whether A6 was my parser or my verb dispatch" (r2 §8) — which the maintainer
noted is "almost word for word what the previous adopter asked for, at the same moment in their
run, for the same reason" (r2 §9).

**Asked (both).** halley: "name the offending argv inline in exit-code findings (C2 saying 'bare
invocation exited 0' the way D2 does would have saved the entire evidence join)" (r1 §5). tansy:
"findings carrying their evidence observations inline (or a flag to inline them) so the probe
that produced a verdict is one read away" (r2 §8).

**Inferred (ours).** The two asks are the same claim at two depths — halley wants the argv named
in the finding text; tansy wants the whole observation inlinable. Either ends the join. A
finding backed by several observations (halley's C2 had three) needs per-observation attribution
for the shallow form to work. Note the double edge: the ids are also what let halley _prove_ the
C2/D2 overlap (listed under what worked, below) — the evidence model is right; its distance from
the finding is the cost.

**Status:** open. This is the maintainer's "going up the list accordingly" item (r2 §9); no fix
appears in the record.

### T3. Between "read the safety note" and "audit the target yourself" there is nothing — both adopters chose the audit

**Observed (r1).** halley read astrolabe's dispatch code before the first check "to satisfy
myself the safety note was met — the note tells me what L0 won't protect against but nothing
tells me how to establish my target is safe short of auditing it" (r1 §5). **Observed (r2).**
tansy never reached the note at all: "I never ran `acc check --help`, despite SKILL.md pointing
at the safety note there — I satisfied myself the target was inert-on-bare by reading mb's
source instead. The check I ran was safe, but the guide's own gate got skipped" (r2 §8). The
maintainer's verdict on the record: "a safety note nobody reaches is a safety note that does not
work. Where it lives is our problem, not your discipline" (r2 §9).

**Asked.** Neither adopter proposed a mechanism. halley's want list includes only the adjacent
"nothing tells you how to establish your target is safe short of auditing it yourself", carried
onto the maintainer's live list (r1 §6).

**Inferred (ours).** These are two distinct defects that corroborate one theme. Reachability:
the note lives behind a command neither adopter had reason to run before the check. Method: even
read, the note says what the kit won't protect against, not how to establish inertness — so both
careful readers did the only thing available, a manual source audit, which does not scale to
targets the adopter did not write. Any fix must answer both halves or it moves the problem.

**Status:** open.

### T4. The unpinned install delivers a stale kit silently — found in round 1, and the detection loop built from it carried round 2

This one is corroborated _sequentially_ rather than independently: round 1 discovered the
failure; round 2 exercised the fixes built from it, on a machine with the same stale cache.

**Observed (r1).** In a project that had never resolved acc before, a fresh `bun add -d` on the
unpinned URL resolved commit `82a7d5d` — the v0.1.0 release merge — while `origin/main` HEAD was
`e210e01` (v0.1.1). "Exit 0, one 'Blocked 1 postinstall' line, nothing else visible" (r1 §7). halley
measured this mechanism after the maintainer proposed a different one ("a copy was already
there") and the measurement won: "You measured it; I inferred it" (r1 §8). The stale kit is what
blocked step 4 — every "documented-but-absent" surface existed in the release the docs
described (r1 §6).

**Observed (r1, v0.1.2 pass).** The pinned form fails _loud_ on a stale cache ("no commit
matching v0.1.2"), and `bun pm cache rm` distinguishes "Cleared 1" from "Cleared 0". halley on
the trade: "mildly annoying, entirely diagnosable, strictly better" (r1 §15).

**Observed (r2).** Plain unpinned add "handed me v0.1.2 silently; `acc version --check` caught
it (exit 10)" — the first time exit 10 (the exit for "a newer release exists") has ever run
outside this repository, closing the limit stated at r1 §16 ("it has never run in the wild"). The subsequent pinned add hit the loud
stale-clone refusal; "how-to-fix-a-broken-install.md described it precisely (failure 2,
loud-when-pinned) and the full remedy … worked: now 0.1.3, exit 0" (r2 §4).

**Asked (r1).** "a committish in the install line, and a sentence in step 1 telling the reader
what `[acc <version>]` should say" (r1 §7–8) — superseded on the record by the no-literal ruling
(SKILL.md carries no version number at all) and the `version --check` step (r1 §16).

**Inferred (ours).** The detection loop — silent staleness → `version --check` → guide → remedy
— is the one part of this project verified end to end by an adopter who needed it for real. What
remains open from this family is T5, next, and the step-1 pin (the decision surface, item 4).

**Status:** closed in-trial, except T5 below and the step-1 pin (the decision surface, item 4).

### T5. `version --check`'s next-hint hands the remedy our own guide says always fails on upgrade

One adopter, maintainer-confirmed — kept beside the two-adopter claims because it is a residue
of T4.

**Observed (r2).** The exit-10 hint gave the pinned reinstall alone; it failed with bun's "no
commit matching v0.1.3 (but repository exists)" exactly as the guide's own claim predicts ("an
upgrade always meets this one") (r2 §4). The maintainer confirmed independently before being
told: "the remedy the tool hands you is one we document as always failing in the only situation
the hint appears. That is our defect and it shipped in the release that introduced the command"
(r2 §9).

**Asked (r2).** "the hint could add the cache-clear or point at the guide" (r2 §4); restated at
r2 §8 as "version --check's next-hint carrying the cache-clear".

**Status:** open.

## What worked — named by the adopters, so it stays as it is

A report that lists only friction gets the working parts rewritten. These are the artifacts both
runs leaned on, in the adopters' words.

**Two-adopter.**

- **Enumerated rejections did the explaining, repeatedly.** halley: acc's own error envelope
  "is exemplary — it sold me on the envelope shape more than the rule text did" (r1 §2); the
  `choices` list in a stale kit's rejection "is what told me instantly which kit I was holding
  (the guidance, working on me again)" (r1 §15). tansy went further than clearing failures and
  _adopted_ the guidance — "unknown flag/verb errors now name their valid sets, and the report's
  census line flipped from nothing to 'enumerated 13 flags at the root'" (r2 §6) — a path the
  maintainer "had written it off as untestable on your target" (r2 §9).
- **The guides matched reality where the reader stood.** The how-to-reach-l0 gradient "worked
  exactly as written … the fix/waiver/debt triage frame carried the whole session" (r1 §2); the
  broken-install guide named tansy's failure "precisely (failure 2, loud-when-pinned)" (r2 §4).
- **The whole flow works cold.** Both adopters reached CONFORMANT (L0) from SKILL.md alone,
  and neither asked for silence to be broken: "Nothing blocked me; I never needed to break silence"
  (r2 §6).

**One-adopter.**

- Report honesty: A6 reported as unverifiable with the reason, "Good honesty, no friction"
  (r1 §2); "NOT FULLY VERIFIED / coverageGaps prose being specific enough to trust a pass for
  what it is" (r2 §6).
- The probe-plan script "is genuinely readable — the run_target-function-not-variable comment
  and the do-not-edit-the-capture rationale both earn their space" (r1 §11).
- Declaration validation: "the error named the exact key path … and offered the drop-the-flag
  alternative; excellent refusal" — one round-trip to fix (r1 §11).
- "the L0 guide's fix-what-unblocks-first ordering" (r2 §6).
- The v0.1.2 skill additions — framing paragraph, adopt-these-two step, the
  observation-not-comparison correction, the test-suite-green paragraph — "are all in and read
  well from cold" (r1 §15), and the fixes did not move astrolabe's verdict.
- Step 6's drift warning earned its place twice: halley made `--version` a verb-position token
  because of it (r1 §2); tansy "caught the guide's step-6 drift case exactly: --version was
  documented as a global flag but works root-only" (r2 §6).

## One-adopter claims, open or acknowledged

**From round 1 (halley), open:**

- **D3's prose matcher fails silently on a near-miss.** A natural help sentence with the right
  tokens in the wrong arrangement produced a fail line "byte-identical to the no-sentence case,
  so nothing signaled a near-miss"; diagnosed only from checker source in node_modules. Asked:
  "when help contains the json/default tokens in a non-matching arrangement, say so … instead of
  the identical fail line" (r1 §2).
- **A6 is unestablishable for launcher-run targets** — bun as argv0 swallows the leading `--`.
  Asked: "a way to hand check an argv0 that doesn't swallow `--` (a wrapper-script suggestion in
  the A6 gap text would do)" (r1 §5).
- **No what-changed view on re-check.** "what I actually wanted to know was 'did anything
  regress' rather than 'what is the full state'"; they diffed verdict tables by eye (r1 §5).
- **PASS+ is met twenty lines before its legend**; first parsed as "pass, plus something extra"
  (r1 §5).
- **The D2 waiver passage reads as a sanctioned route** on first read; a second read was needed
  to see the waiver is for tools that choose help-by-design (r1 §5).
- **"project root" in the l0 guide is ambiguous** — first read as repo root; the cwd discussion
  resolves it, but only on a re-read (r1 §5).
- **B5's stderr answer is buried as an aside** inside the rule body: "I'd have missed it reading
  only the report" (r1 §5).

**From round 1, acknowledged (r1 §12 "also taken"; closure not shown in these logs):**

- `recordedBy` build provenance comes from the harness's cwd, not the target's tree — "the
  target sits in a git repo whose commit would have been the right answer" (r1 §11).
- `batch.json` lands in cwd with no destination flag, and the do-not-edit warning does not say
  whether moving the file counts (r1 §11).
- The declaration guide shows only empty positionals, "so the first populated one is written
  against STANDARD.md rather than the guide" (r1 §11).

**From round 2 (tansy), open:**

- **Tier and deviation read as one axis until a rule crosses them.** tansy posted mb's findings
  with the tiers backwards ("I pattern-matched D2 to 'the canonical diagnostic waiver example'
  … the report says the opposite for this run"), and separately did "not separate UNVR from N/A
  until the text report drew them differently" (r2 §8). The maintainer owns it: "a
  report-legibility defect … the next reader will do the same thing silently" (r2 §9).
- **`acc report <file>`** — re-render the human report from saved JSON; tansy re-ran the whole
  check to get the text form, "cheap here but only because the target is inert" (r2 §8). The
  maintainer: "new and nobody has asked for it before" (r2 §9).

## Where readers went wrong — evidence about our documents, not about them

Both adopters are careful readers who corrected themselves on the record; where they misread,
the next reader misreads silently.

- The misreadings above with a legibility root: tier/deviation and UNVR-vs-N/A (r2), PASS+ before
  its legend, the D2 waiver passage, "project root" (r1).
- **The entry path has no fallback.** halley was pointed at `skill/acc` (a human-side typo for
  `skills/acc`) and had to glob for SKILL.md: "the skill's 'at the path given' framing means
  a wrong path has no fallback" (r1 §5).
- **The frame inversion.** halley arrived reading acc as "tool first, guidance as the tool's
  documentation", and nothing in the then-current SKILL.md corrected it — so they "found the right
  behavior but attributed the wrong purpose" at the step-4 fork, and noted "a reader with less
  patience would have stopped at 'the diff didn't run, so recording wasn't worth it'" (r1 §13).
  The fix halley and their human proposed (r1 §14) is in as of v0.1.2 and read well cold (r1 §15):
  closed in-trial.
- **The author misread too, twice, on the record.** The maintainer's proposed staleness
  mechanism was wrong until halley measured the real one (r1 §8), and the maintainer "nearly
  corrected" tansy toward `acc schema` — which does not answer the question — catching it only
  by running the command first (r2 §9). Inferred, ours: the artifacts invite these misreadings
  even from their author, and the protocol's measure-before-correcting rule is what caught both.
- **One example stated in the assignment is not in the sources.** The assignment for this report cited a
  round-1 misattribution of "just-in-time discovery" to a rule page. That phrase appears in
  neither log (checked verbatim over both files). It is omitted here rather than reconstructed;
  if it happened, it happened somewhere these logs do not reach.

## The decision surface

Ours, and only an ordering — each item's substance is above.

1. **Two-adopter, open:** T1 (report JSON shape), T2 (evidence join / argv in findings), T3
   (safety-gate reachability and method). These are the only claims two independent cold runs
   converged on that remain unanswered.
2. **Maintainer-confirmed residue of a closed family:** T5 (the next-hint that cannot work on
   upgrade). Smallest fix on this list by any reading — the hint text already exists and the
   guide it should point at already exists.
3. **One-adopter, open:** the round-1 list (D3 near-miss, A6 launcher targets, re-check diff,
   PASS+/D2-waiver/project-root/B5 legibility) and round-2's tier/deviation legibility and
   `acc report <file>`. The legibility items are cheap and were owned on the record; the
   tooling items each imply kit code.
4. **Owner-flagged, explicitly not decided on the channel:** the step-1 pin. tansy's cost
   claim, quoted: an unpinned step 1 "would make the check a confirmation rather than a
   guaranteed exit-10 → remedy dance on machines with a stale cache" (r2 §6). The standing
   ruling's rationale, quoted: "Marking it would have made the sentence correct; removing it
   makes the sentence unable to be wrong" (r1 §16). The maintainer's position on the record:
   "the owner gets to weigh it rather than us reversing it on the channel" (r2 §9). Both sides
   are stated; nothing here picks one.

What is _not_ on the surface, because the record already answers it: the T4 detection loop
(verified in the wild, including exit 10's first run), the v0.1.2 skill rewrites (verified cold),
and the framing paragraph (verified cold). "The guidance, working on me again" — halley's words
for the moment an enumerated rejection, not a document, told them which kit they were holding —
is the strongest single sentence either trial produced about the project's direction, and it
belongs beside the open list rather than under any one claim.

## Disposition — added 2026-08-27, after the owner took the claims up

Everything above this heading is the record as written and stands unedited. This section was
added the same day, before the release that carries both the report and the work it caused, so a
reader holding the two together is not told a claim is outstanding by one document and shipped by
the other. Where a claim is marked done, the commit is on `develop` in the same range.

| Claim                                                | What happened                                                                                                                                      |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| T1 — report JSON shape undocumented                  | Done: `docs/wiki/guides/how-to-read-the-check-report-json.md`, routed from SKILL.md and an `acc schema` note.                                      |
| T2 — evidence join by hand                           | Done: findings carry `probes` — each cited id resolved in place — in JSON and under FAIL/UNVR lines in text.                                       |
| T3 — safety gate unreachable, method absent          | Done: `docs/wiki/guides/how-to-establish-your-target-is-safe-to-check.md`, routed unconditionally from SKILL.md, the tutorial, and `check --help`. |
| T5 — the next-hint that always fails on upgrade      | Done: the stale hint now carries the guide's full remedy sequence.                                                                                 |
| D3 near-miss silence (one-adopter)                   | Done: both machine-mode tokens present with no matching claim now says so instead of the byte-identical fail line.                                 |
| `batch.json` destination (one-adopter, acknowledged) | Done: the generated harness takes a destination.                                                                                                   |
| PASS+/D2-waiver/project-root/B5 legibility           | Done: the legend precedes the table it explains; the waiver, config-directory, and stderr passages were repaired in two reviewed batches.          |
| Tier/deviation read as one axis                      | Prose half done (the guide states the axes are independent where D2 crosses them); the JSON encoding question is with the owner.                   |
| Still open                                           | The step-1 pin (owner-flagged above, still the owner's); A6 for launcher-run targets; a re-check regression view; `acc report <file>`.             |

The two `probes`/`recordedBy` residues acknowledged at r1 §12 that are not named above have no
closure shown in the record this addendum was written from; they stay acknowledged, not done.
