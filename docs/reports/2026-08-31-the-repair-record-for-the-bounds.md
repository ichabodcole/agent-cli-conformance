---
type: report
generated: { by: claude-opus-5, at: 2026-08-31 }
status: draft
lifecycle: live
description:
  The repair record for the four documentation items in the 2026-08-31 bounds plan, and the first
  end-to-end run of the repair-chain skill. Two review rounds, eleven reproduced defects, and the
  finding that matters more than any of them — every defect was caught by a party asking a question
  the repair had not set, and none by re-reading.
tags: [method, documentation, evidence, adoption]
subject:
  the repair of four documentation defects, the instruments run against it, and what each
  instrument caught that the others did not
examined:
  commits 6af2d46 and bc01da4 on branch docs/the-bounds-the-consumers-named, against CHARTER.md,
  README.md, STANDARD.md and docs/reports/2026-08-26-the-group-command-candidate.md; tool figures
  re-measured on gh 2.98.0, Docker 29.2.0 and kubectl v1.34.1, macOS, 2026-08-31
---

# The repair record for the bounds

**Verdict: `defects to repair`, then repaired.** Round 1 produced a candidate; two independent
lenses and two cold reads returned eleven reproduced defects; round 2 repaired them. This record
exists because [the plan](../plans/2026-08-31-the-bounds-the-consumers-named.md) required one, and
because the second reviewer noticed it did not exist.

## The finding card

**Subject** `docs/reports/2026-08-26-the-group-command-candidate.md` at `6af2d46`.
**Comparison** `STANDARD.md` and `docs/wiki/` at the same commit.

**Observed.** The report's closing sentence asserts _"the standard now recommends what they asked
for"_. No passage in `STANDARD.md` or the wiki recommended anything about a group node.

**Reproduced** over `STANDARD.md` plus all 45 wiki files, through four handles — subject
(`group command`, `group node`, `holds subcommands`, `no flags of its own`), mechanism (`valid
set`, `name the set`, `more information rather than less`), consequence (inbound links), and
structure. Zero passages. The nearest material,
[`advertised-value-set-is-enforced`](../wiki/rules/parsing/advertised-value-set-is-enforced.md),
scopes its SHOULD to a **flag's value set**, a different premise.

**Diagnosis, after challenge.** Not the reported defect. Three competing explanations were tested
and the third changed the repair: `STANDARD.md` defines **`[C?]`** as _"checkable in principle, no
checker exists"_, which is exactly this candidate's shape. So the sentence named work that was
intended and never done, and the repair was the missing work rather than a softer sentence.

## What each instrument caught

The ordering is the finding. **No defect below was caught by re-reading the draft.** Each was
caught by a party holding a question the repair had not set.

| instrument                 | caught                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------- |
| challenge (repair-chain 1) | the repair was the wrong shape; the plan's own scope gate was miscategorised                      |
| cascade inventory          | a dependent the correct repair would falsify, two paragraphs above the sentence being repaired    |
| same-class audit           | two fresh instances of the repaired defect, authored by the repair                                |
| cold read                  | two terms used once and defined nowhere, invisible to the writer still carrying their definitions |
| Reviewer A                 | two false measurements, a miscounted tier, a structural placement error                           |
| Reviewer B                 | three assertions falsified without their bytes moving, and a whole untracked population           |

### BND-1 · The cascade found the dependent before the edit

The report's `## Status` read _"The recommendation above can be revised at no cost **while it lives
here**."_ Landing it in `STANDARD.md` falsifies that. Correct repair, silently broken neighbour,
two paragraphs from the sentence under repair — found by the pre-edit inventory rather than by a
later reader.

### BND-2 · The same-class audit found the repair committing its own class

Two instances, both authored by the repair that exists to remove them:

- the new charter section claimed both respondents pointed at `CHARTER.md`; only one did;
- the repaired report asserted the recommendation was _"marked `[C?]`"_ while the section it
  pointed at carried no mark.

Collapsing the second fix produced a third: the Part 4 bullet duplicated the Part 3 text verbatim,
two homes with no mechanism holding them together.

### BND-3 · A document is not a measurement

`STANDARD.md` inherited two figures from the report — `gh repo` prints **19** subcommands in a
rejection, and the two tools declining to print hold **12 and 16**. The contract recorded the
report as the warrant. Reviewer A re-ran them instead.

    gh repo --acc-not-a-flag   -> 18 subcommands   (gh 2.98.0)
    kubectl config --help      -> 15              (kubectl v1.34.1)
    docker image --help        -> 12              (Docker 29.2.0)

Both wrong figures were one high, on the exact builds the report's `examined:` block names. The
bolded 19 was the load-bearing figure in the paragraph titled _"the survey refutes it"_. The
argument survives — 18 against 12 and 15 carries it exactly as 19 against 12 and 16 did — but the
report was wrong at its source and the repair promoted the error into a more permanent document.
Corrected in both, with the correction recorded in the report rather than silently applied.

**The general form:** a source passage warrants that a claim was _made_. It does not warrant that
the claim is _true_. Where a claim is a measurement and the instrument is still available, the
warrant is a re-run.

### BND-4 · A promise-shaped sentence, written into the standard, in the commit documenting the harm

The first repair marked the recommendation `[C?]` and said a checker _"would report `unverified` on
every target **until `L1` exists**"_.

The same commit records, as the strongest evidence against the ladder, an adopter who read
`N/A A4 — arity cannot be probed at L0 … only safe once the command has declared effects:
read_only`, took it for a roadmap promise, and waited for a level nobody is building.
[The plan after the ladder](../plans/2026-08-26-the-plan-after-the-ladder.md) lists that verdict
string as a banked item to repair — in the same bullet that banks this candidate.

So the repair authored a fresh instance of a defect the project has already diagnosed, queued, and
was in the act of documenting. The blocker is now stated as what is true independent of the
vocabulary: checking it means sending a verb, and nothing here can select one safely without the
target saying so. The ladder decision can go any of three ways without falsifying the standard.

### BND-5 · Two reviewers contradicted each other and the shallower one was wrong

Reviewer A verified the new charter claim that `STANDARD.md` treats shipped instructions as
load-bearing. Reviewer B reported that `STANDARD.md:323` denies it. Reproduced directly: line 310
does say a flag is global because the shipped instructions make it global — but line 323 marks that
claim **`[—]`** and states _"nothing on this page reads a `SKILL.md`"_. A confirmed the first half
and never asked whether anything **reads** them.

Two consequences. The candidate's sentence _"It reads them for scope and never for truth"_ was
false on either antecedent, and has been rewritten. And the bound `sable` asked for **was already
in the tree**, scoped to one declaration field — which the cascade missed because it searched
`shipped instructions` and the passage says `reads a SKILL.md`. Same fact, different words: a
lexical search failing to reach a semantic carrier, inside the instrument whose job is to prevent
exactly that.

### BND-6 · The sweep could not see the population that specified it

Reviewer B found that `docs/plans/` — fourteen files, including the plan commissioning this work —
appeared in no sweep row. The sweep was derived from the premise note, the premise note from the
plan, and **a document does not enumerate itself as a dependent**. Per
[`docs/plans/README.md`](../plans/README.md), a shipped plan going stale is correct and must not be
repaired; the finding is not the staleness but what it concealed — the plan's own gate for Item 4
was passed through without an in-tree record, and the repair record it required did not exist. This
document answers both.

B also found that the new `###` heading rescoped an unchanged paragraph: `## Parsing`'s closing
`[C]`/`[—]`/`[C?]` marks fell inside the new subsection, so they read as marks on the group-node
recommendation. Reviewer A found the same defect independently from the other lens. The bytes did
not move; what they scoped did.

## What the repair holds

No rule id minted. The catalogue stays at 23 rules. No wiki page, checker, coverage-matrix entry,
frontmatter or verdict changed; nothing under `src/`. `bun run check` green at every commit.

## Limits

- **The adopter who raised the candidate was told the stronger version on a channel**, and no edit
  reaches them. Consumer contact is deferred at the owner's direction while their project is in
  heavy development. No in-tree artifact records a notification; this record cannot establish that
  one did not happen outside the tree.
- **`git remote`, `git stash` and `anthill comms` rejection shapes were not re-measured.** Only the
  three figures the argument rests on were. `anthill` is not on this machine.
- **The counting error's mechanism is not established.** Two figures, both one high, suggests one
  slip rather than two, but the original method was not recorded.
- **The cold reads returned findings in pre-existing prose that were deliberately not repaired** —
  three figures of speech in `CHARTER.md`, a provenance defect and a mis-aimed citation in
  `README.md`. Out of the plan's scope; recorded here so they are known-absent rather than unfound.
- **Reviewer B's F7 remains a judgement, not a defect.** A ratified plan banks the group-command
  item with the ladder decision. The reading taken is that the banked item is the **rule id**,
  which is untouched; the guidance never depended on that decision. Stated so it can be overruled.

## What this says about the skill

The instruments did not agree with each other, and that is where the value was. Every defect came
from a party the repair could not have consulted: a challenge step that doubted the diagnosis, an
inventory built before the edit, an audit pointed at the repair rather than the defect, a reader
denied the rationale, and two lenses forbidden from answering each other's question. The one
instrument that failed — the cascade's lexical search — failed silently and was caught by a
reviewer standing somewhere else.

Two things the run showed are worth carrying into the skill rather than into this document, and are
raised there rather than edited in: a source passage is not a warrant for a measurement, and a
sweep derived from a plan cannot see the plan.
