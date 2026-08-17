# Prose defect catalogue

Kinds of prose defect, one entry each: a real passage before and after, what it costs the reader,
where it looks present and is not, and how to find the next one.

Every entry is self-contained. Nothing here points at a file you would need to open. The examples
come from documentation for a command-line conformance tool, so the domain nouns — exit codes,
probes, checkers — are incidental; no example needs the domain explained to show what went wrong.

Entries are added by the `/prose-defect` command, from passages a human actually struggled with.
None is invented to fill a category.

---

## 1. `is not` followed by a gerund

**Where it appears.** Anywhere, and it survives proofreading.

> **Before** — A CLI whose job is to resolve and run another program — where the hardest problem
> is not confusing its own failures with the child's.

> **After** — A CLI whose job is to resolve and run another program — where the hardest problem
> is reporting failures so a caller can tell the delegator's from the child's.

**What goes wrong.** Two parses compete and English takes the wrong one first. The intended
reading is `the hardest problem is [not confusing X with Y]`, where _not_ heads a gerund phrase
serving as the complement. The default reading is `the hardest problem is not [confusing X with
Y]` — a negated copula, which says the opposite.

The default wins because `is not …ing` is also the surface form of the negated present
progressive ("the parser is not confusing X with Y"), far commoner than a gerund complement with
a fronted negator.

**Why it costs more than a reread.** The wrong parse does not break. It is grammatical, it
finishes, and "the hardest problem is not X" is a normal thing to say. The reader can finish the
sentence, believe they understood it, and carry away the inverse claim. A garden path that stalls
at least announces itself.

**The fix.** Remove the negation rather than trying to disambiguate it.

**How to spot it.** Grep `is not [a-z]+ing\b`, then judge each hit by hand.

**Where it looks like this but is not.**

- A genuine negated progressive: "the `kind` field is not carrying that weight", "reports safety
  it is not providing". Both correct as written.
- `something`, `nothing`, `anything`, `everything` all match `[a-z]+ing`. Expect them.

No regex can separate a gerund complement from a progressive participle. This is a search, not a
check.

---

## 2. A description that uses a term the page invents

**Where it appears.** Frontmatter descriptions, summaries, index entries, abstracts — any text
read away from the page it belongs to.

> **Before** — What the kit's headline verdict claims, and the separate claim it deliberately
> does not make — no core rule was violated, versus every core rule was established.

> **After** — What `acc check` means by `conformant` and `fullyVerified`, and why a target can be
> conformant without being fully verified.

**What goes wrong.** `the kit's headline verdict` is a definite noun phrase, and `the` promises
the reader can identify which one is meant. They cannot. The term is defined in the body of the
page this description introduces and appears nowhere else. **The reader has to open the document
to understand the description of the document.**

The rewrite uses only terms the reader already holds: the command name, and two field names from
the tool's own output.

**Why this slot specifically.** Every other line on a page may borrow from what came before it —
that is what being on a page means. A description is read in an index, in search results, in a
hover, by someone deciding whether to open the thing. It is read **out of context by
construction**, so it must carry its own antecedents.

**The underlying cause is a register mismatch**, and it generalises past descriptions. The
description's reader is working; the page's reader is studying. An author writes both in one
sitting and the description inherits the page's voice without the page's reader.

So: **when an artifact has a Diátaxis type, check its prose is in that type's register rather
than in the register of whatever produced it.** A how-to assembled by whoever gathered the
evidence tends to arrive full of evidence, for the same reason.

**The fix.** Work back from the decision the text supports. For an index entry that is only ever
_is this the page I need_, which needs the subject named in words the reader already has, plus one
distinguishing fact.

**How to spot it.** For each term in a description, count its occurrences across the corpus. A
term appearing only in the description and in its own page's body is coined by that page.

**Where it looks like this but is not.**

- **A domain term the page also happens to define is not a coined term.** Anyone holding the
  tool's output has seen `conformant`. The count test separates them: a domain term appears across
  many pages, a coined one appears twice.
- **Fragment is not the mechanism.** A verbless noun phrase can be a fine description — entry 1's
  rewrite is one. Self-contained versus referring is the mechanism.

---

## 3. Provenance stated where purpose belongs

**Where it appears.** Rationale prose, wherever a design is explained by whoever built it.

> **Before** — There is a second reason `conformant` and `fullyVerified` are separate booleans,
> and it only became visible once projects could tune the rules.

> **After** — The second reason `conformant` and `fullyVerified` are separate booleans is that
> projects can tune the rules.

**What goes wrong.** The clause narrates the project's own discovery instead of stating what is
true of the system. `became visible` is a verb about the authors' perception. And "once projects
could tune the rules" posits a before-state no reader inhabits.

**Purpose against provenance.** Both answer "why", which is how they get conflated. _Why this
exists_ and _what it is for_ belong on the page. _How we came to know it_, _what it used to be_
and _when we noticed_ do not. A writer reaches for the second because it is how they know the
first.

**Tense alone can decide it.** The same fact, twice:

> **Before** — Excusing only failures **left** a project blocked by an unverified rule with
> nothing it **could** change to clear it.

> **After** — Excusing only failures **leaves** a project blocked by an unverified rule with
> nothing it **can** change to clear it.

The past tense asserts that the tool once behaved the narrower way, that the problem was hit, and
that it was fixed. The present tense makes the identical claim a property of the design space:
this is what the narrower rule would do, which is why the rule is not narrower. **The same fact is
purpose or provenance depending only on tense.**

**Two repair costs, and they differ a lot.**

- **Appended.** The live claim is already complete and the history hangs off the end of it:
  "…**and this page used to claim it did**." Delete the clause. Nothing else moves.
- **Load-bearing.** The live constraint sits inside the narration and has to be lifted out. One
  design constraint appeared on three pages, each opening "That is worth stating because it was
  once not true" and then narrating an earlier implementation. What worked: state the constraint
  plainly in the main paragraph, and give the rejected alternative its own labelled paragraph —
  "**Not an environment variable, deliberately.**" _We considered X and here is why it fails_ is a
  design constraint a reader needs. _We once used X and it was wrong_ is not. Same information,
  minus the claim that anyone shipped the mistake.

**How to spot it.** Not by past tense — `was` is load-bearing throughout ordinary technical prose
("the probe ran and the rule **was** broken"), and grepping it buries the signal. What is findable
is past tense that **contrasts with a present state**, because English has to lexicalise that
contrast:

```
\b(previously|used to|originally|became|was once|it once|an earlier version|at first|turned out|we (found|discovered|realised|realized))\b
\b(is|are|has|have) now\b|\bnow (told|uses|reports|does|has|is)\b
```

**A contrastive `now` is the commonest spelling and the easiest to miss** — four letters doing the
work of "and it used to be otherwise". Check for it explicitly; it hides in sentences that
otherwise read as plain statements of current behaviour.

**Where it looks like this but is not.**

- **`once` meaning _one time_**, not _formerly_: "the recorder runs it once", "an agent learns it
  once and it holds everywhere".
- **`no longer` is usually logical rather than historical** in technical prose — "an excused
  `fail` no longer blocks it", "a flag the child can no longer receive transparently" — where it
  means _not, once X holds_. Low yield; check each one rather than trusting the marker.
- **Third-party history**, which is reference material. See entry 5.

---

## 4. Compound — an unresolvable ordinal wearing a history

**Where it appears.** Section openers and transitions, where a sentence's job is to connect
rather than to state.

> **Before** — The `pass` row above carries a qualifier the other two do not, and it is the second
> half of what `fullyVerified` had to be taught.

> **After** — The `pass` row above carries a qualifier the other two do not: it blocks
> `fullyVerified` only when the checker declares `partial` coverage.

**Three faults in one sentence, and the one with a name is the least of them.**

- **Provenance (entry 3).** `had to be taught` asserts a prior state and turns a boolean into a
  pupil.
- **An ordinal with no antecedent (entry 2's mechanism).** `the second half` points at a first
  half never labelled as one. The nearest candidate has to be constructed by the reader from a
  table.
- **No content.** Stripped, the sentence says a visible row has a qualifier, and that this is the
  second of two things the reader cannot find. The substance begins in the next sentence.

**Why the compound is worse than its parts.** Because the ordinal does not resolve, and because
the history makes it sound like established backstory, a reader concludes they missed something
earlier and goes hunting. Either fault alone is a speed bump. Together they send the reader
backwards through the document.

**How to spot it.** No single tell. **After naming any defect, strip the sentence to what it
asserts and ask whether anything is left.** Here, nothing was.

---

## 5. Boundary case — whose history is it?

**Not a defect.** This entry exists because it is where entry 3 gets misapplied.

> The behaviour has also shifted across releases (earlier versions additionally …)

**Why this is fine.** It is the release history of a third-party tool the page documents. History
of the **thing being documented** is reference material. History of the **document** is
provenance. Entry 3's grep cannot tell them apart, so ask of every hit: **whose past is this?**

### Decision pages are not exempt, and not guilty either

A decision record looks like a counter-example to entry 3, because arguing a decision means
showing the research, the alternatives and the conventions that made the line fall where it did.
That material is historical and it belongs. **The question is not whether the history is
historical. It is whose.**

**Subject history — belongs.** A POSIX specification's meaning for an exit code; an enhancement
proposal that has sat behind a feature flag for years; a measurement of what `git` returns for an
unrecognised flag; a proposed standard that never caught on. Each is evidence a reader needs in
order to judge the decision, and each is shown rather than gestured at.

**Document history — does not.** Every one of these had "this page" or "both pages" as its
subject, and none informed the decision:

- "Both pages previously listed `124` as an adopted timeout outcome _and_ counted it among the
  unallocated codes."
- "Both pages used to tell a reader to read `> 128` as a signal death."
- "This page previously described it as 'understood by every shell, CI runner and process
  supervisor', which is false."
- "It does not eliminate wrapper-versus-child ambiguity, **and this page used to claim it did.**"
  Here the sentence stays and only the tail goes — the main clause is live scoping, because
  staying below that code sounds like it solves the collision and does not.

**A second test exists and is weaker.** "Is the history shown, or gestured at?" catches most of
these, but not one that quotes its own false wording verbatim and is therefore fully
self-contained — and still is not evidence for the decision. Use **whose history** as primary and
**is it shown** as the tiebreaker.

---

## 6. A figure of speech where the mechanism belongs

**Where it appears.** Rationale and summary sentences, especially ones that feel well-turned.

> **Before** — …which is a weaker claim wearing the words of a stronger one.

> **After** — deleted. The literal statement two clauses later already carried it.

**The reader's report.** "That sentence just gives me a little bit of an itch, because I gotta
read it twice." And on why it matters: "it makes it in a kind of clever way… don't be clever,
don't be poetic."

**What goes wrong.** The sentence makes its point through an image — a claim dressed in another
claim's clothes — so the reader decodes the figure and then maps it back onto the domain. Two
steps where one would do. Here `weaker` meant string equality and `stronger` meant byte equality,
and nothing in the sentence supplied either mapping.

**What made this one pure cost.** The literal version sat in the same paragraph, right after it:
"a pass certifying byte identity for two different streams". Figure first, translation second, so
the reader pays for the image and then reads its plain equivalent.

**Why it matters more than one sentence suggests.** From the reader: seeing it often enough, "I
start understanding what it means, but that to me is more like me accommodating the documentation
than the documentation accommodating me as a reader." A figure is affordable once. A house style
of them trains the reader to decode rather than read.

**Where it looks like this but is not.** Figures are not banned, and one naming something the
domain has no word for does work no plain phrasing would. Two tests, in order:

1. **Is the literal statement also present?** Then the figure is decoration — delete it.
2. **If not, write the literal statement and compare.** Shorter or clearer means the figure
   carried nothing. If the plain version needs three clauses and a definition, keep the figure and
   put the plain version beside it once.

**How to spot it.** No grep. The reading tell: you understood the sentence and cannot say it back
in the document's own vocabulary without reaching for the same image.

---

## Two things that apply to every entry

**Findings from the reader, judgement from the writer.** A reader without the writing context
cannot distinguish a term the page coined from a term the domain already owns, and will flag real
domain vocabulary as unexplained. Report what did not resolve; do not rule on whether it should
have.

**Look twice wherever you already found something.** Both compounds in this catalogue were found
that way — the second and third faults surfaced only after the first was named.
