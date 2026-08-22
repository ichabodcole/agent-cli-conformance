---
type: report
generated: { by: claude-opus-5, at: 2026-08-21 }
status: draft
lifecycle: live
description:
  Triaged findings from two unbriefed readers of README.md — a first-contact reader with a
  matching tool, and a catalogue reader hunting prose defects. Both converged on the install
  section. Every factual finding below was verified against the file before it was accepted.
tags: [prose, readme, cold-read, diataxis, adoption]
subject: README.md at v1.0.1
examined: README.md, docs/wiki/guides/check-your-first-cli.md, docs/wiki/guides/how-to-reach-l0-in-your-project.md
---

# Two cold reads of the README

Run for [workstream B](../plans/2026-08-21-anthill-trial-findings.md). Two fresh subagents, neither
briefed on what was suspected. The mechanical sweeps from the cold-read catalogue (entry 1,
entry 3) returned **no hits**, so everything below came from reading.

**They converged.** One was asked to accomplish something; the other was asked to find prose
defects. Both spent most of their report on the same seventy lines.

## Verified — factual contradictions

Each was checked against the file. These are not matters of taste or arrangement.

| #   | the contradiction                                                                                                                                           | where                            |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| 1   | The stale bare clone and stale extracted package are called **"above"**; they are documented **below**. Twenty lines later the same pair is called "below". | `:61`, `:74` vs `:80`, `:92-104` |
| 2   | "The cache clear is **first**" — the code block it describes runs `bun remove` first.                                                                       | `:78` vs `:54`                   |
| 3   | "the **third** distinct way" — then "**Two ways** this install goes wrong".                                                                                 | `:74` vs `:92`                   |
| 4   | "That line also ends with the kit's own version — `[acc 1.0.1]`". The line shown ends with `/opt/homebrew/bin/git`.                                         | `:140` vs `:137`                 |
| 5   | A4 "can only report `unverified`" / those rules "report `not applicable`" / tutorial shows `N/A`.                                                           | `:13` vs `:264`                  |
| 6   | "`L0` is the only probe level there is" / "Probes come in three levels". Reconciled 246 lines later.                                                        | `:13` vs `:238`, `:259`          |
| 7   | "Status: pre-1.0" while `package.json` reads `1.0.1` and `v1.0.1` is tagged.                                                                                | `:9`                             |
| 8   | The pinning example names `#v1.0.0`, one release stale — while `<!-- x-release-please-version -->` sits fifty lines below, unused for it.                   | `:90` vs `:140`                  |

**Numbers 1–3 are all inside the upgrade block**, which is also the block both readers skipped.
A passage nobody finishes is where contradictions survive.

## The first-contact read

A reader with a TypeScript/Bun CLI of about a dozen subcommands, told to open the README and
nothing else, and explicitly licensed to skim and give up.

**What they did.** Read the top 35 lines properly. Hit _Getting started_, skimmed ~70 lines after
the first two sentences. Picked back up at "Then point it at your CLI". Skipped _Branches and
releases_, _Layout_ and _Commands_ outright. Then read both linked guides in full and stopped.

**When they knew what to do first.** Not at the install block — because the prose immediately
began explaining how that command fails. The line that settled it was _"Drop it if this is your
first install"_, **35 lines after the code block it modifies**. The unambiguous instruction came
from the how-to guide instead.

**Read too early:** the whole upgrade blockquote; "Two ways this install goes wrong"; "Be clear
how far that check reaches"; _Branches and releases_; _`acc`, the reference implementation_;
_Layout_; _Commands_.

**Missing at the moment it was needed:**

- **What `./your-cli` should actually be** for an interpreted tool — the entry `.ts`, a bin shim,
  the `package.json` bin name. Never answered by any page. _This is the same gap the anthill trial
  hit, found independently by a reader who never saw that report._
- **That Bun targets have a known instrument limit** — buried in step 3 of a tutorial about
  fixtures rather than stated where a Bun user would meet it.
- What a full first-run report looks like, and a one-line honest statement of the effort involved.

**Their tone note, which is the argument for the whole branch:** _"The install section's honesty
is admirable and it is also the reason my first emotional read of the project was 'this is going
to be a fight.' … The document's proportions do not match the experience it describes."_

## Duplication, measured in both directions

Read the README and both guides back to back. **Six things stated in the README and again in the
guides**, the guide version being better each time: the piped-JSON contract; the `0`/`9` gate; the
`defaultOutput` declaration (the how-to has the D3/B5/B3 table); waiver-versus-debt (the how-to
has a decision table); the L0 safety note; the private-repo SSH rationale.

> _"Roughly half of the README's second half is a lower-resolution version of the two guides it
> points at."_

**And the reverse.** The two things they said made the project click are **not in the README**:
the tutorial's four-verdict table, and the how-to's _"will I delete this line once the tool
changes?"_ test. This branch moves prose out **and** pulls orientation in.

## The catalogue read

Accepted findings, by catalogue entry.

- **Entry 3 (provenance) + entry 4 (references).** The "third distinct way / an adopter hit all
  three" passage counts the project's own discoveries rather than stating a property of the
  install path, and its direction words are wrong. Both faults in one passage; the underlying
  claim survives and needs rewriting, not deleting.
- **Entry 4.** _"You need BOTH remedies, in this order. **The second** matters when…"_ — "the
  second" has nothing behind it; the pair is not named until the next line. Name the remedy
  instead of numbering it.
- **Entry 2 (terms the passage does not carry).** _"deliberately reported as two separate
  booleans"_ in **Non-goals** — the block an evaluating reader reads first and often alone. Neither
  boolean is named; `conformant` and `fullyVerified` appear ~260 lines later.
- **Entry 5 (figure where the mechanism belongs).** _"a comment that lies"_, _"an exit code that
  said otherwise would be lying"_, _"a waiver can **buy** `conformant: true`"_, _"an arm of exactly
  that shape"_. The reader's point is not the individual images but that with _"fail loudly"_ on
  line 4 they form a house style — _"and a house style trains the reader to decode rather than
  read."_
- **Entry 6 (a report's register inside a how-to).** The 28-line upgrade blockquote spends most of
  itself establishing that the failures are real. That is the register of a report, whose reader
  is deciding whether to believe the author. This reader has already decided; they hit the error
  and want the command.

**Rejected / closed with no change:** the 15-CLI survey and the `citty` measurement are subject
history, which the catalogue keeps. "Blast radius" is domain-standard vocabulary.

## Could not resolve — to decide during the rewrite

`exit 5` at `:355` ("reversed, this is a valid exit 5"); `delegator` as an argument to `acc path`;
`D2`/`A6`/`B2` unlinked in the config example while `A1`/`A4`/`B5` carry links elsewhere; whether
the kit sets or only reads `AI_AGENT`; "the report below" pointing past an intervening code block.

## Uncatalogued — candidates for `/prose-defect`

The two worth working up as new kinds:

- **A headline banks a benefit its own last clause withdraws.** _"Learn a lesson once and every
  CLI is audited for it retroactively. **Planned:** the history is in-memory and dies with the
  process…"_ The reader has already banked the present-tense claim before the correction arrives.
- **A direction word that reverses sense between adjacent sentences.** "Three layers, each
  enforcing what **the one below** cannot" — where "below" means later-in-the-list, immediately
  followed by "Most CLI guidance stops at layer 3. This project starts at layer 2", where the
  spatial sense is inverted.

Also noted, ordinary editing rather than new kinds: a comma splice in the longest sentence of the
install block (`:58`); the rule counts stated twice twelve lines apart (`:9`, `:20`); a 45-word
sentence at `:126` restating the 15-word sentence before it; a double negative at `:404`; a pronoun
at `:316` separated from `defaultOutput` by an intervening paragraph.
