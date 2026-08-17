# Prose defect catalogue

A running log of prose defects found in this project's own documentation, one entry per kind.
Each entry records a real passage, what was wrong with it, and how you would spot the next one.

**How entries get here.** A human reads something, struggles, and says so. We work out what the
mechanism is and rewrite it. The entry is written afterwards, from what actually happened. No
entry is invented to fill a category.

**Who reads this.** Two callers. The `/prose-defect` command adds to it, one passage at a time,
with a human. The `prose-cold-read` skill hands it verbatim to a fresh subagent and asks it to
find these defects in a document. So an entry is written twice over: as a record of what happened,
and as instructions someone with no context will act on.

**The definitions are the artifact. The greps clear the low-hanging fruit first.** Some entries
carry a search pattern. Its job is to sweep a corpus, catch the obvious instances and get them
fixed, so that the read which follows has less to find and can spend its attention on what only
reading catches.

That job sets the error economics, and they are the opposite of what you would want from a
checker. **False positives are cheap** — a few seconds of triage each — so a loose pattern that
over-reports is fine and often better. **False negatives are harmless too, but only because the
read is still coming.** The moment a pattern is used _instead of_ the read, every miss becomes
silent and permanent, and you find out months later when someone struggles with the page.

Measured on this wiki: entry 1's pattern returned three candidates and no defects; entry 3's
first pattern missed seven of nineteen instances because of one lazy alternation. Neither number
is a problem for a pre-pass. Both would be disqualifying for a gate. **A pattern finding nothing
is not evidence a document is clean.**

So: sweep first, then read line by line against the definitions below — at writing time, and
again whenever a sentence changes.

Started 2026-08-16.

---

## 1. `is not` followed by a gerund

**Seen in** `docs/wiki/archetypes/delegator.md`, description. Fixed in `244cb05`.

> **Before** — A CLI whose job is to resolve and run another program — where the hardest problem
> is not confusing its own failures with the child's.

> **After** — A CLI whose job is to resolve and run another program — where the hardest problem
> is reporting failures so a caller can tell the delegator's from the child's.

**What goes wrong.** Two parses compete and English takes the wrong one first. The intended
reading is `the hardest problem is [not confusing X with Y]`, where _not_ heads a gerund phrase
serving as the complement. The default reading is `the hardest problem is not [confusing X with
Y]` — a negated copula, which says the opposite.

The default wins because `is not …ing` is also the surface form of the negated present
progressive ("the parser is not confusing X with Y"), which is far commoner than a gerund
complement with a fronted negator.

**Why it costs more than a reread.** The wrong parse does not break. It is grammatical, it
finishes, and "the hardest problem is not X" is a normal thing for a description to say. The
reader can finish the sentence, believe they understood it, and carry away the inverse claim.
A garden path that stalls at least announces itself; this one does not.

**How to spot it.** Grep for `is not [a-z]+ing\b`, then decide by hand whether _not_ negates the
copula or heads a gerund. If it heads a gerund, remove the negation entirely rather than trying
to disambiguate it.

**The tell's precision, measured on this wiki.** Three candidates across 33 pages, and none was a
defect:

- `decisions/exit-codes-below-125.md:178` — "the envelope's `kind` field is not carrying that
  weight" — a negated progressive, correct as written.
- `rules/discoverability/help-output-is-deterministic.md:54` — "reports safety it is not
  providing" — same.
- `rules/parsing/advertised-value-set-is-enforced.md:54` — "is not something the kit invented" —
  a regex artifact. `something` matches `[a-z]+ing`, as do `nothing`, `anything`, `everything`.

So the grep narrows 33 pages to three lines, and a human resolves all three in under a minute.
That is what this class of tell is worth: it is a search, not a check. It cannot tell a gerund
complement from a progressive participle, and nothing regex-shaped can.

---

## 2. A description that uses a term the page invents

**Seen in** `docs/wiki/concepts/conformance.md`, description. Fixed in `4d5c324`.

> **Before** — What the kit's headline verdict claims, and the separate claim it deliberately
> does not make — no core rule was violated, versus every core rule was established.

> **After** — What `acc check` means by `conformant` and `fullyVerified`, and why a target can be
> conformant without being fully verified.

**What goes wrong.** `the kit's headline verdict` is a definite noun phrase, and the `the`
promises the reader can identify which one is meant. They cannot. The term is defined on line 27
of the page the description introduces, and `headline verdict` occurs exactly twice in the whole
wiki — in the description and in that definition. The reader has to open the document to
understand the description of the document.

**Why the description slot specifically.** Every other line on a page may borrow from what came
before it — that is what being on a page means. A `description` renders in `index.md`, in search
results, in a hover, read by someone deciding whether to open the thing. It is read out of
context by construction, so it is the one text that must carry its own antecedents.

**The underlying cause is a register mismatch.** The description has a different reader from the
page it sits on. Conformance is a `concept` — explanation, a reader settled in to study. Its
description is read by someone scanning a catalogue mid-task. The author writes both in one
sitting, in the page's register, and the description inherits the page's voice without the page's
reader.

**The same mismatch is not confined to descriptions.** The first draft of
`.claude/commands/prose-defect.md` carried a justification under almost every step — why context
matters, which diagnoses had been wrong before, how the greps had under-reported. A command is a
**how-to**: its reader is an agent mid-task, and Diátaxis says a how-to assumes competence and
links out rather than teaching. Every one of those justifications was already in this catalogue,
which the command tells the agent to read at step 3. Cut in `19271b7`; the command went from
120 lines to 83 and lost no instruction, only the evidence for instructions.

Worth generalising: **whenever an artifact has a Diátaxis type, check that its prose is in that
type's register and not in the register of whatever produced it.** A description written while
writing the page, a how-to written by whoever assembled the evidence — both inherit the wrong
voice the same way.

**How to spot it.** Two ways, and the first is mechanical: for each term in a description, count
its occurrences across the wiki. A term appearing only in the description and in its own page's
body is coined by that page and unusable in its description. The second is to ask what decision
the description supports — for a catalogue entry it is only ever _is this the page I need_ — and
check that the sentence answers it without a lookup.

**What this defect is not.** The first diagnosis offered was "it has no main verb, so it names a
topic instead of stating one". That was wrong. The delegator description in entry 1 is also a
verbless noun phrase and reads fine. Fragment is not the mechanism; self-contained versus
referring is.

---

## 3. Provenance stated where purpose belongs

**Seen in** `docs/wiki/concepts/conformance.md:143`. Fixed in `7f87103`.

> **Before** — There is a second reason `conformant` and `fullyVerified` are separate booleans,
> and it only became visible once projects could tune the rules.

> **After** — The second reason `conformant` and `fullyVerified` are separate booleans is that
> projects can tune the rules.

**What goes wrong.** The clause narrates the project's own discovery instead of stating what is
true of the framework. `became visible` is a verb about the authors' perception, not about the
system. And "once projects could tune the rules" posits a before-state no reader inhabits —
projects can tune the rules, so there is no "once they could".

**Purpose against provenance.** Both answer "why", which is how they get conflated. _Why this
exists_ and _what it is for_ belong on the page. _How we came to know it_, _what it used to be_,
and _when we noticed_ do not. A writer reaches for the second because it is how they know the
first.

**Tense alone decides it.** Compare `docs/wiki/concepts/conformance.md:191`, fixed in `9af4fd0`:

> **Before** — Excusing only failures **left** a project blocked by an unverified rule with
> nothing it **could** change to clear it.

> **After** — Excusing only failures **leaves** a project blocked by an unverified rule with
> nothing it **can** change to clear it.

Two words, same fact. The past tense asserts that the kit once excused only failures and that we
hit the problem and fixed it. The present tense makes the identical claim a property of the
design space: this is what the narrower rule would do, which is why the rule is not narrower.
**The same fact is purpose or provenance depending only on tense**, which is a more useful rule
than "do not narrate history" because it says what to write instead.

**It accumulates — measured across 31 pages** (the wiki less `STYLE.md` and `SCHEMA.md`, which
are contract pages and quote defective prose on purpose). Nineteen hits from the pattern below,
in four grades:

- **Pure, on concept pages.** `concepts/exit-codes.md:69` ("this page used to read it
  backwards") and `:163` ("This page previously listed `124` as an adopted timeout outcome…").
  Both are the page narrating its own past self-contradiction. The live claim in the second is
  only that `124` belongs to `timeout` and is not ours to allocate.
- **Pure, on rule pages.** `rules/streams/stdout-carries-only-data.md:87` ("a path that
  previously had no probe" — the kit's coverage timeline, not the rule);
  `rules/lifecycle/inert-invocations-do-not-crash.md:68` ("the checker used to fail on **any**
  signal the kit did not send"); `rules/parsing/double-dash-terminator.md:88` and `:101`.
- **Load-bearing content trapped inside the narration.** The probe-deduplication story, told as
  history on **three** pages: `rules/discoverability/help-output-is-deterministic.md`,
  `rules/safety/first-byte-is-prompt.md:93` and `rules/exit-codes/exit-codes-are-deterministic.md:67`.
  The constraint underneath is current and worth keeping — the runner deduplicates identical
  probes, so repetitions are told apart by a recorder-only index, because a variable the target
  can read is part of the input to the measurement. **Fixing these means extracting the
  constraint, not deleting the paragraph**, which is why they cost more than the appended kind in
  entry 5.

  One of the three is done, in `8c73dcb`, and it shows the shape of the repair. The constraint
  moved into the main paragraph, and the rejected alternative got its own labelled paragraph —
  "**Not an environment variable, deliberately.**" — because _we considered an env var and here is
  why it fails_ is a design constraint a reader needs, while _we once used one and it was wrong_
  is not. Same information, minus the claim that anyone ever shipped the mistake. The other two
  are outstanding and are the same edit twice.

- **Looked like a scope exception, was not.** Four hits on `decisions/exit-codes-below-125.md`
  (`:53`, `:72`, `:95`, `:125`). A decision record should narrate — that is its content — so
  these seemed exempt. They were not: all four were the page's own editorial history rather than
  the subject's. Cut in `c95e00d`; worked through under entry 5.

**Standing at 23 hits after three rounds of fixes and three pattern extensions**, on ten pages.
The number went up each time the pattern improved, which is the point of the caution below.
Outstanding, roughly a dozen genuine:

| Page                                                   | Lines            |
| ------------------------------------------------------ | ---------------- |
| `concepts/exit-codes.md`                               | 69, 163          |
| `rules/lifecycle/inert-invocations-do-not-crash.md`    | 68, 91, 236, 273 |
| `rules/parsing/double-dash-terminator.md`              | 88, 101, 104     |
| `rules/safety/first-byte-is-prompt.md`                 | 93, 94, 100      |
| `rules/exit-codes/exit-codes-are-deterministic.md`     | 46, 67           |
| `rules/exit-codes/usage-errors-are-distinguishable.md` | 80               |
| `rules/streams/stdout-carries-only-data.md`            | 87               |
| `rules/parsing/advertised-value-set-is-enforced.md`    | 179              |

Known false positives inside that set, all covered by entry 5 or by `once` meaning _one time_:
`concepts/conformance.md:357`, `concepts/exit-codes.md:95` and `:156`,
`rules/streams/machine-output-is-parseable.md:52`,
`rules/exit-codes/usage-errors-are-distinguishable.md:84`.

**How to spot it.** Not by past tense. Past-tense markers run to 216 across these 31 pages and
`was` alone accounts for 144, nearly all load-bearing ("the probe ran and the rule **was**
broken"). What is findable is past tense that **contrasts with a present state**, because English
has to lexicalise that contrast:

```
\b(previously|used to|originally|became|was once|it once|an earlier version|at first|turned out|we (found|discovered|realised|realized))\b
\b(is|are|has|have) now\b|\bnow (told|uses|reports|does|has|is)\b
```

The second line was added after the first missed seven instances — including "The repetitions
are **now** told apart by…", which is the same sentence as one the first line did catch on a
different page. **A contrastive `now` is the commonest spelling of this defect and the easiest to
overlook**, because `now` is a four-letter word doing the work of "and it used to be otherwise".

**`no longer` is a poor term here, not a missing one.** Four of its five occurrences in this wiki
are logical rather than historical — "an excused `fail` no longer blocks it", "a flag the child
can no longer receive transparently" — where `no longer` means _not, once X holds_. Roughly 20%
precision, against about 70% for a contrastive `now`. Worth knowing before adding it to a
pre-pass that someone will trust.

Then ask entry 5's question of each hit: whose past is this?

**Where it looks like this but is not.** Three of the nineteen:

- `concepts/exit-codes.md:95` and `rules/exit-codes/usage-errors-are-distinguishable.md:84` —
  `once` meaning _one time_, not _formerly_.
- `concepts/conformance.md:357` — the Acid3 "Potemkin village" critique. Third-party history is
  reference material. See entry 5.

**The pattern has under-reported three times, each time on extension.** Recorded in sequence,
because the sequence is the argument:

1. **Four found.** The first grep wrote `used to (be|have)`, requiring an auxiliary, and missed
   `used to tell`, `used to claim`, `used to collapse`, `used to fail`, `used to compare`,
   `used to slip`, `used to launch`.
2. **Nineteen found.** Dropping the auxiliary requirement added seven, on pages the first scan
   had called clean.
3. **Seven more found.** Adding a contrastive `now` surfaced instances on five further pages,
   one of them inside a sentence the previous scan had already flagged for a different marker.

Each round, the previous round's silence had read as absence. **Nobody would have gone back to
check if the fix had not been forced by a reader hitting one of the misses by hand.** This is the
concrete case for treating a pattern as a pre-pass and never as a clearance — not an argument
from principle, but three measurements of the same instrument getting the same answer wrong in
the same direction.

---

## 4. Compound — an unresolvable ordinal wearing a history

**Seen in** `docs/wiki/concepts/conformance.md:62`. Fixed in `10105b1`.

> **Before** — The `pass` row above carries a qualifier the other two do not, and it is the second
> half of what `fullyVerified` had to be taught.

> **After** — The `pass` row above carries a qualifier the other two do not: it blocks
> `fullyVerified` only when the checker declares `partial` coverage.

**Three faults in one sentence, and the named one is the least of them.**

**Provenance (entry 3).** `had to be taught` asserts a prior state in which `fullyVerified` did
not account for coverage, and turns a boolean into a pupil. This is the part that has a name, and
it is the part a reader spots first.

**An ordinal with no antecedent (entry 2's mechanism).** `the second half` points at a first half
that is never labelled as one. Nothing before line 62 is marked as the first of two. The nearest
candidate — that `unverified` also blocks the claim — has to be constructed from a table.

**A sentence carrying no content.** Stripped, it said that a visible row has a qualifier and that
this is the second of two things the reader cannot find. The substance began in the next
sentence.

**Why the compound is worse than its parts.** The two named faults reinforce each other. Because
the ordinal does not resolve, and because the history makes it sound like established backstory,
a reader concludes they missed something earlier and goes hunting. Either fault alone is a
speed bump. Together they send the reader backwards through the document.

**What this predicts about reading for defects.** The reader reported this as "subtle" and
identified the history — the one fault already in this catalogue. The other two were found by
asking what the sentence delivers, not by looking harder at it. **A named defect draws attention
to itself and away from whatever it is sitting next to.** A cold read that stops at the first
recognised mechanism will systematically under-report compounds.

**How to spot it.** No single tell. The habit that found the other two: after naming a defect,
strip the sentence to what it asserts and ask whether anything is left. Here, nothing was.

---

## 5. Boundary case — whose history is it?

**Seen in** `docs/wiki/rules/interactivity/never-block-without-a-tty.md:56`. Not a defect; left
alone.

> The behaviour has also shifted across releases (earlier versions additionally …)

**Why this one is fine.** It is the release history of a third-party tool the rule documents.
History of the **thing being documented** is reference material. History of the **document** is
provenance. The grep in entry 3 cannot tell them apart, so every hit needs this question asked of
it: whose past is this?

This entry exists because the boundary is where the rule in entry 3 will be misapplied, and a
catalogue of only positive cases would teach an over-eager rule.

### The same question settles decision pages

A `decision` page looks like a counter-example to entry 3, because arguing a decision means
showing the research, the alternatives and the conventions that made the line fall where it did.
That material is historical and it belongs. **The question is not whether the history is
historical. It is whose.**

`docs/wiki/decisions/exit-codes-below-125.md` had both kinds side by side. Fixed in `c95e00d`.

**Subject history — kept, and it is most of the page.** POSIX Issue 8 and GNU coreutils on
`timeout`; KEP-2551 alpha-gated behind a feature flag since 2022; `git` returning `129` for an
unrecognised flag, cited to `research/01-case-studies.md`; `sysexits.h` never catching on. Every
one is evidence a reader needs to judge the decision, and every one is shown rather than gestured
at.

**Document history — cut, four instances.** Every subject was "this page" or "both pages", and
none informed the decision:

- "Both pages previously listed `124` as an adopted timeout outcome _and_ counted it among the
  unallocated codes."
- "Both pages used to tell a reader to read `> 128` as a signal death."
- "This page previously described it as 'understood by every shell, CI runner and process
  supervisor', which is false."
- "It does not eliminate wrapper-versus-child ambiguity, **and this page used to claim it did**."
  The sentence stayed and the tail went. The main clause is live scoping a reader needs, because
  staying below `125` sounds like it solves the collision and does not.

**Two properties worth carrying forward.**

_The repair is cheap here._ Every live claim was already complete and the provenance was
**appended** to it, so each fix deleted a clause. Contrast the probe-dedup trio in entry 3, where
the live constraint is **inside** the narration and has to be extracted. Same defect class, two
very different repair costs — and the appended kind is what a mechanical pre-pass should be
aimed at first.

_A second test exists and is weaker._ "Is the history shown, or gestured at?" catches three of
these four. It misses the third, which quotes the false wording verbatim and so is fully
self-contained — and is still not evidence for the decision. Use _whose history_ as primary and
_is it shown_ as the tiebreaker.

---

## 6. A figure of speech where the mechanism belongs

**Seen in** `docs/wiki/rules/discoverability/help-output-is-deterministic.md:69`. Fixed in
`38d3a33`, alongside a provenance clause in the same sentence.

> **Before** — …which is a weaker claim wearing the words of a stronger one.

> **After** — deleted. The literal statement two clauses later already carried it.

**The reader's report.** "That sentence just gives me a little bit of an itch, because I gotta
read it twice." And on why it matters: "it makes it in a kind of clever way… don't be clever,
don't be poetic."

**What goes wrong.** The sentence makes its point through an image — a claim dressed in another
claim's clothes — so the reader decodes the figure and then maps it back onto the domain. Two
steps where one would do. Here the mapping is `weaker` → string equality and `stronger` → byte
equality, and nothing in the sentence supplies either.

**What makes this instance pure cost.** The literal version is in the same paragraph, right
after it: "a pass certifying byte identity for two different streams". That is exactly what the
figure said. Figure first, translation second, so the reader pays for the image and then reads
its plain equivalent. Deleting the figure loses nothing at all — which is what made this an easy
call and will not always be true.

**Why it matters more than one sentence suggests.** From the reader, and worth keeping in these
words: seeing it often enough, "I start understanding what it means, but that to me is more like
me accommodating the documentation than the documentation accommodating me as a reader." That is
the real cost model. A figure is affordable once. A house style of them trains the reader to
decode rather than to read, and the document stops paying for itself.

**Where it looks like this but is not.** Figures are not banned, and a figure naming something
the domain has no word for is doing work no plain phrasing would. Two tests, in order:

1. **Is the literal statement also present?** If yes, the figure is decoration — delete it. This
   is the cheap case and it was this one.
2. **If not, write the literal statement and compare.** If the plain version is shorter or
   clearer, the figure was carrying nothing. If the plain version needs three clauses and a
   definition, keep the figure and put the plain version beside it once.

**How to spot it.** No grep. The reading tell is that you understood the sentence and cannot say
it back in the document's own vocabulary without reaching for the same image. If restating it
literally is easy, the figure was decoration; if restating it is hard, check whether the reader
was ever given what they need to decode it.

---

## What we have noticed about finding these

Not defects — observations about the process, recorded because they will shape whatever this
becomes.

**Four of the five defects are invisible to the writer, and for one reason.** Provenance leaks in
because the author knows how they got there. A page-coined term reads fine to whoever coined it.
An ordinal resolves for the person who counted. A figure of speech lands for whoever already
holds the mapping it depends on.

Stated once: **the writer holds something the reader does not, and the sentence does not supply
it.** That is the same defect four times, and it is undetectable from inside the writing context
by construction — you cannot notice the absence of something you are still carrying. A checklist
the author applies to their own draft therefore fails on exactly the cases it exists for, and **a
cold read by someone without the history is structurally required rather than a convenience.**

Entry 1 is the exception, and it is the exception because it lives in the grammar rather than in
what the writer happens to know. It is also the only one a writer could plausibly catch alone.

**The cold reader is blind in the mirror-image way.** It cannot distinguish a term the page
coined from a term the domain already has. A fresh reader would flag `conformant` in the new
conformance description as unexplained, and would be wrong — anyone holding an `acc check` report
has seen the field. So a cold read should not return verdicts. It should return "I could not
resolve X from this page alone", and the writer rules on whether X is legitimately assumed.
Findings from the reader, judgement from the writer.

**Asking what the passage is for beat reading it harder.** Entry 2 was not solved by looking at
the sentence more closely. Three readings of it produced three wrong diagnoses. It was solved by
asking what a description is for, and who reads it, and what decision they are making. Entry 4
repeated the pattern: the two unnamed faults surfaced only when the sentence was stripped to what
it asserts, which turned out to be nothing.

**Naming a defect may hide the ones beside it — one instance, and it did not repeat.** In entry 4
the reader found the fault this catalogue had already named, read the sentence as "subtle", and
the two larger faults went unreported. That suggested a cold read stopping at the first
recognised mechanism would under-report compounds systematically.

Entry 6 is the counter-example, and it arrived immediately. The same reader found the named
defect **and** an unnamed one in the same sentence, and correctly judged the unnamed one to be a
different kind rather than filing it under the one they had a word for. So the effect from entry
4 is one observation, not a pattern, and it is recorded here as a thing to watch rather than a
thing to design around.

What survives either way is cheap and worth doing: **look twice at any passage where you already
found something.** Both compounds in this catalogue were found that way.
