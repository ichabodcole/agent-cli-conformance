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

---

## The third read — verifying the rewrite (2026-08-22)

Same brief as the first-contact read above, verbatim, so the two are comparable. Run against the
rewritten README.

### What moved

| measure                                    | before                 | after                                          |
| ------------------------------------------ | ---------------------- | ---------------------------------------------- |
| where the first command arrives            | line 119               | **line 48**                                    |
| install-failure prose in the reader's path | ~70 lines, skimmed     | **4 lines, obeyed**                            |
| "what do I pass as the target?"            | unanswered by any page | answered                                       |
| the four-verdict table                     | tutorial only          | in the README — _"the best thing on the page"_ |

On the install pointer: _"'A first install meets none of them; skip it for now,' which is exactly
the right instruction and I obeyed it."_ That is the redirect working as designed.

### What it caught that the rewrite had broken

**The "what to pass" section recommended the defect it warned about.** It told TypeScript
maintainers to write a shell wrapper — the one shape that defeats the A6 Bun-launcher guard.
Measured, same CLI:

```
passed directly     UNVR  A6  cannot be probed through a `bun` launcher
behind a wrapper    FAIL  A6  a value after `--` was still parsed as an option
```

`toTarget` already launches a non-executable `.ts` as `["bun", path]`, which is exactly what the
guard keys on, so the direct path needs no wrapper and is the case the kit handles best. Fixed.

The reader found it by noticing the README demanded an **executable file** while the tutorial's
first command passes a non-executable `.ts`. Both were right; the rule was stated too narrowly.

### Exit criterion: two of three

Met: reaches the tutorial without scrolling past install prose; can say what to pass. **Not met:**
the positive control was never reached on a natural read. It sits at `README.md` §"`acc`, the
reference implementation", which this reader skipped — as the earlier one did. `sable` valued it
specifically, so it remains a live non-regression constraint that is currently unverified.

### The remaining problem is ordering, and it is larger than the install section

> _"The README is defensive before it is useful. Four caveat blocks before the install line, three
> warnings before the first run, and a 'Non-goals' section arguing about what a pass does not
> prove — all before I have any experience of what a pass looks like. The honesty is the project's
> best quality and it is deployed too early to be appreciated. A reader who has never run the tool
> cannot be disappointed by it yet."_

And it pushed them out of the document:

> _"Because 'Where to go next' sits at line 147 and the substantive material starts at line 177, I
> left the README at the exact moment it was about to tell me why the project exists. 'The
> problem' — the fifteen-CLI survey, the citty finding, `docker inspect` printing `[]` to stdout —
> is the most persuasive writing on the page, and it is below the exit door."_

Two of the three pre-run warnings were added by this rewrite. The exit-door effect was not; it was
uncovered by removing the install prose that had been hiding it.

### Deferred to the follow-up

1. **Four caveat blocks before the install line** — `Status`, `Today`, `Planned`, `Non-goals`.
2. **`Where to go next` is an exit door above the best writing on the page.**
3. **No successful run is ever shown.** The only sample output is `NOT CONFORMANT`.
4. **Not one concrete rule.** _"I finished the README knowing the shape of the verdict and not one
   concrete thing my CLI is required to do."_ Rule ids appear only as links, never as a list.
5. **The duplication is worse than first measured.** `how-to-reach-l0-in-your-project.md` is now a
   **strict superset** of the README's config material, same arguments nearly verbatim.
6. **`Branches and releases`, `Layout`, `Commands`** — contributor reference, skipped by all three
   readers, sitting between the user's quickstart and the user's motivation.
7. **The positive control is unreachable on a natural read.**
