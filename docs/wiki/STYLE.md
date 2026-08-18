# How this wiki is written

`SCHEMA.md` governs **structure** — frontmatter, page types, required sections, what the lint
enforces. This page governs **prose**. Read it before writing a page; use it as the checklist when
editing one.

It is the source. The `Plainspoken` output style is derived from it, so when the two disagree, this
page is right and the output style needs updating.

## This wiki uses Diátaxis

The five page types — `concept`, `archetype`, `rule`, `decision`, `guide` — are
[Diátaxis](https://diataxis.fr) with local names. That has never been stated anywhere, which left
contributors following a shape whose reasoning was invisible.

Diátaxis sorts documentation on two axes: **acquisition** (studying) against **application**
(working), and **action** (doing) against **cognition** (thinking).

|               | Acquisition — studying                           | Application — working  |
| ------------- | ------------------------------------------------ | ---------------------- |
| **Action**    | Tutorial                                         | How-to guide (`guide`) |
| **Cognition** | Explanation (`concept`, `archetype`, `decision`) | Reference (`rule`)     |

The claim that makes it useful: **a reader is only ever in one mode at a time**, so a page serving
two serves neither. The commonest inversion is putting reference on the study side — reference is
consulted _while working_, which is why a rule page is read by someone mid-task whose attention is
elsewhere.

Adopt it the way its authors prescribe: **one improvement at a time**. "Consider what you see… Ask:
is there any way it could be improved? Decide on **one** thing… Do that thing. And then repeat."
Do not restructure the wiki in a pass, and do not create empty sections to fill.

## Language, by page type

Diátaxis is prescriptive about grammatical person and mood, and the four differ:

**Tutorial** — first-person plural. _"In this tutorial, we will…"_, _"First, do x. Now, do y."_,
_"Notice that… Let's check…"_. Announce the outcome up front and give a visible result at each
step. **Ruthlessly minimise explanation** and link out instead. Note that _"In this tutorial you
will learn…"_ is named by the framework as "presumptuous and a very poor pattern".

**How-to** (`guide`) — conditional imperatives. _"If you want x, do y."_ Titles start with "How
to…" and say exactly what the guide shows. Assume competence; omit the unnecessary. Practical
usability beats completeness.

**Reference** (`rule`) — declarative statements of fact, plus warnings where they apply: _"You must
use a. You must not apply b unless c."_ Describe and only describe. A rule page must not teach the
task; link to a guide.

**Explanation** (`concept`, `archetype`, `decision`) — the one type licensed to argue. _"W is
better than z, because…"_, _"Some users prefer w. This can be a good approach, but…"_ Weigh
alternatives, offer judgements, admit the counter-case. Keep it **closely bounded**: use a "why"
question to fix the scope, and do not let instructions or reference tables creep in.

## Density

The rest is ours, and the evidence behind it varies. It is stated here with that variation
attached, because a rule stripped of its condition gets applied mechanically.

**Keep what belongs together, together.** Subject next to its verb, modifier next to what it
modifies. This is the one rule here with strong measured support: material wedged between a
subject and its verb depressed recall more than any other feature tested, for experienced readers,
in real documents.

Two rules you might expect are inside that one. **Abstract nouns** hurt mainly by pushing the verb
away — the mechanism is locality, not nominality, and the direct evidence that nominalised prose is
harder to read is thin. **Long sentences** are not the problem either: length tracks dependency
distance without causing the cost. **Do not split a sentence to hit a word count** — splitting
drops the connective (_because_, _however_, _unless_) and leaves the reader to infer the logic.
No numeric sentence limit appears here for that reason.

**Put the point first.** A reader who stops after one sentence should still have the answer.
Weaker evidence, and contested — in some constructions more preceding material makes the ending
easier — so treat a run of point-last sentences as the signal, not a single one.

**Do not compress without declaring it.** An acronym announces that a definition exists to look
up. A memorable phrase hides the same compression behind ordinary words, so a reader who lacks the
argument cannot tell whether they are missing context or reading badly, and concludes the fault is
theirs. Aristotle named the form: a maxim is "the premises or conclusions of enthymemes without the
syllogism" — a conclusion with its reasoning removed.

The test: **would this sentence be improved by being an acronym?** If yes, it carries a definition.
Expand it where it appears, or link it to a glossary entry. A compressed line may stay when it
earns its place — pay for it immediately with a concrete instance in the next sentence.

**Compression is appropriate by type**, and the table above says where. It suits explanation and
decision pages, whose reader is studying. It is wrong in a guide and worst in a tutorial, whose
reader is working with attention elsewhere. The further a page sits toward _doing_, the looser and
more concrete its prose should be.

And **dense content is a reason to write more plainly, not less**. A reader spending capacity on
new facts has none left for a construction that must also be decoded.

## What earns its place

Every line is a liability as well as an asset. Before adding one, ask whether it is
**non-discoverable** (the reader cannot get it from the surrounding material), **reachable** (if it
is a warning, the wrong path it guards is genuinely reachable from what the page already says), or
**load-bearing** (it changes a judgment, names a destination, or encodes intent). If it is none of
those it is noise, and noise is not neutral — it buries the signal.

Four things no measurement detects, which reading must catch:

- **Context dragged in** — material belonging to another document, or to the history of how this
  one came to be written. A rule page carrying the story of a bug already fixed is the standing
  example.
- **Unnecessary explanation** — the reader told why before they have any use for it, or told twice.
- **A promise the page does not keep** — the heading announces one thing, the body delivers another.
- **A scaffold taught and then abandoned** — once a reader learns a section shape, every departure
  costs a re-derivation.

## Satellites

`docs/roadmap.md` and the files in `docs/research/` are not wiki pages and carry no `type`. The
type-specific language rules above do not bind them; the density rules do. `docs/research/` files are
dated evidence documents and are not maintained after the fact.

## What is not enforced, and cannot be

The lint checks **shape**: frontmatter vocabulary, link and anchor resolution, orphan
reachability, rule-to-checker agreement, index hooks matching descriptions. It cannot check
whether an explanation explains.

Diátaxis says the same about itself, and more sharply — it addresses qualities that "cannot be
checked or measured… Instead of taking measurements, we must make judgements."

There is deliberately no prose checker, and a green one would be worse than none. It would read as
"the prose is fine", and nothing available can support that claim. **The check is a reading, by a
person or an agent, page by page.** Everything on this page is input to that reading, not a
substitute for it.
