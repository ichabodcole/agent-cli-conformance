# Prose defect catalogue

Kinds of prose defect, one entry each: a real passage before and after, what it costs the reader,
where it looks present and is not, and how to find the next one.

Every entry is self-contained. Nothing here points at a file you would need to open. The examples
come from documentation for a command-line conformance tool, so the domain nouns — exit codes,
probes, checkers — are incidental; no example needs the domain explained to show what went wrong.

**Six numbered entries, all of them defects.** Boundary cases live inside the entry they bound,
under "Where it looks like this but is not". Read those as carefully as the defects: they are
where a rule gets misapplied.

**Adding an entry.** Match the shape of the ones below — where it appears, before, after, what
goes wrong, where it looks like this but is not, how to spot it — and add sections beyond those
when the defect needs them. Every entry needs its boundary case. Do not cite file paths, commits,
or scan counts: an entry has to survive being read in a different project.

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
sentence, believe they understood it, and carry away the inverse claim.

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

**Why this slot specifically.** Every other line on a page may borrow from what came before it —
that is what being on a page means. A description is read in an index, in search results, in a
hover, by someone deciding whether to open the thing. It is read **out of context by
construction**, so it must carry its own antecedents.

**The fix.** Work back from the decision the text supports. For an index entry that is only ever
_is this the page I need_, which needs the subject named in words the reader already has, plus one
distinguishing fact. The rewrite above uses the command name and two field names from the tool's
own output — all three visible to anyone holding a report.

**How to spot it.** For each term in a description, count its occurrences across the documentation
set the description will be read inside — the whole page collection, not the single page. A term
appearing only in the description and in its own page's body is coined by that page.

**Where it looks like this but is not.**

- **A domain term the page also happens to define is not a coined term.** Anyone holding the
  tool's output has seen `conformant`. The count test separates them: a domain term appears across
  many pages, a coined one appears twice.
- **Fragment is not the mechanism.** A verbless noun phrase can be a fine description — entry 1's
  rewrite is one. Self-contained versus referring is the mechanism.
- **A rewrite here will not keep the original's vocabulary, and should not.** The offending term
  is the defect. "Keep the claim exactly" governs what the sentence asserts, not which words carry
  it.

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

- **Load-bearing.** The live constraint sits inside the narration and has to be lifted out. Worked
  example, in full, because the shape is the useful part:

  > **Before** — The two runs are the same invocation. That is worth stating because it was once
  > not true. The runner deduplicates identical probes into a single recording, so an earlier
  > version of this checker perturbed the second run with an `ACC_PROBE_NONCE` environment
  > variable purely to get a second sample past the dedup — and then compared two invocations that
  > differed, while claiming to measure determinism.

  > **After** — The two runs are the same invocation. The runner deduplicates identical probes
  > into a single recording, so the repetitions are told apart by a **recorder-only index** the
  > target never sees.
  >
  > **Not an environment variable, deliberately.** A variable the target can read is part of the
  > input to the measurement: a tool that echoed its environment into its output would fail this
  > check for a legitimate reason, indistinguishable from a real defect.

  Two moves. The constraint becomes a plain statement of current behaviour. The rejected
  alternative gets its own labelled paragraph, because **_we considered X and here is why it
  fails_ is a design constraint a reader needs, while _we once used X and it was wrong_ is not.**
  Same information, minus the claim that anyone shipped the mistake.

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

### Where it looks like this but is not — whose history is it?

The single question that settles every hit: **whose past is this?** History of the **thing being
documented** is reference material. History of the **document** is provenance.

- **Third-party history belongs.** "The behaviour has also shifted across releases (earlier
  versions additionally …)" is the release history of a tool the page documents. Keep it.
- **`once` meaning _one time_**, not _formerly_: "the recorder runs it once", "an agent learns it
  once and it holds everywhere".
- **`no longer` is usually logical rather than historical** in technical prose — "an excused
  `fail` no longer blocks it", "a flag the child can no longer receive transparently" — where it
  means _not, once X holds_. Low yield; check each rather than trusting the marker.

**Decision pages are not exempt, and not guilty either.** A decision record looks like a
counter-example, because arguing a decision means showing the research, the alternatives and the
conventions that made the line fall where it did. That material is historical and it belongs. The
question is not whether the history is historical. It is whose.

Subject history belongs: a specification's meaning for an exit code, a proposal that has sat
behind a feature flag for years, a measurement of what a well-known tool returns, a standard that
never caught on. Each is evidence a reader needs to judge the decision.

Document history does not, and reads almost identically. "This page previously described it as
'understood by every shell', which is false" has the page as its subject and informed no decision.

**A second test exists and is weaker.** "Is the history shown, or gestured at?" catches most
cases, but not one that quotes its own false wording verbatim and is therefore fully
self-contained — and still is not evidence. Use **whose history** as primary and **is it shown**
as the tiebreaker.

---

## 4. Compound — an unresolvable ordinal with a history attached

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

**Where it looks like this but is not.**

- **An ordinal whose antecedent is genuinely present is fine**, even at a distance. "The second
  reason" is good writing when a first reason was labelled as one. Check for the antecedent before
  reporting the ordinal.
- **A transition sentence may legitimately carry no new claim.** "Three consequences follow" earns
  its place by structuring what comes next. The defect is a transition that also asks the reader
  to resolve something — the emptiness only matters because they paid for it.
- **Do not report a compound as three findings.** One passage, one finding, the faults listed
  inside it. Splitting them makes a report look longer and a document look worse than it is.

---

## 5. A figure of speech where the mechanism belongs

**Where it appears.** Rationale and summary sentences, especially ones that feel well-turned.

> **Before** — …which is a weaker claim wearing the words of a stronger one.

> **After** — deleted. The literal statement in the next clause already carried it.

**The reader's report.** "That sentence just gives me a little bit of an itch, because I gotta
read it twice." And on why it matters: "it makes it in a kind of clever way… don't be clever,
don't be poetic."

**What goes wrong.** The sentence makes its point through an image — a claim dressed in another
claim's clothes — so the reader decodes the figure and then maps it back onto the domain. Two
steps where one would do. Here `weaker` meant string equality and `stronger` meant byte equality,
and nothing in the sentence supplied either mapping.

**What made this one pure cost.** The literal version was already there, in the next clause: "a
pass certifying byte identity for two different streams". Figure first, translation second, so the
reader pays for the image and then reads its plain equivalent.

**Why it matters more than one sentence suggests.** From the reader: seeing it often enough, "I
start understanding what it means, but that to me is more like me accommodating the documentation
than the documentation accommodating me as a reader." A figure is affordable once. A house style
of them trains the reader to decode rather than read.

**How to spot it.** No grep. The reading tell: you understood the sentence and cannot say it back
in the document's own vocabulary without reaching for the same image.

**Where it looks like this but is not.** Figures are not banned, and one naming something the
domain has no word for does work no plain phrasing would. Two tests, in order:

1. **Is the literal statement also present?** Then the figure is decoration — delete it.
2. **If not, write the literal statement and compare.** Shorter or clearer means the figure
   carried nothing. If the plain version needs three clauses and a definition, keep the figure and
   put the plain version beside it once.

---

## 6. Prose in the wrong register for what the artifact is

**Where it appears.** Wherever one artifact is written inside another, or an artifact changes what
it is for.

[Diátaxis](https://diataxis.fr) sorts documentation four ways by what its reader is doing:
**tutorial** (learning by doing), **how-to** (working, attention elsewhere), **reference**
(consulted mid-task), **explanation** (studying). Each wants a different register, and the
framework's core claim is that a reader is only ever in one mode at a time.

**What goes wrong.** The prose ends up in the register of whatever produced it rather than the
register its own type calls for. Two triggers, and the second is harder to catch.

**Trigger one — a slot inherits its container's voice.** Entry 2 is a case of this: a description
is written while writing the page, so it comes out in the page's explanatory register, when its
reader is scanning an index mid-task.

**Trigger two — the artifact changed roles.** A document written as a report and later repurposed
as a reference will still argue for itself: scan counts, measurement narratives, "here is how we
established this". That was correct content for a report, whose reader is deciding whether to
believe you. A reference's reader has already decided and only needs to act.

> **Before** (a how-to for agents, carrying its evidence) — Read the passage in context even when
> it was pasted in full. Context has changed the diagnosis repeatedly — a description turned out
> to be leaning on a term defined 22 lines below it, and an ordinal turned out to have no
> antecedent anywhere on the page.

> **After** — Open the file and read around the passage, even when it was pasted in full.

Same instruction. The evidence was true, and belonged in the explanation the how-to already points
at.

**Why the second trigger is hard.** Nothing about the prose reads as a mistake, because it was not
one when written. There is no defect to find — only a fit that lapsed. So the question has to be
asked deliberately: **has this document changed what it is for since it was written?** If yes, its
register is wrong by default until re-checked.

**How to spot it.** Ask what the reader is doing when they meet this text, then check the prose
matches. The reliable tell for a how-to is justification: if most steps explain why, the reader is
being taught rather than helped, and the explanation belongs somewhere the how-to links to.

**Where it looks like this but is not.**

- **A how-to may state a reason where the reason changes the action.** "Do not brief the subagent
  — the missing context is the instrument" earns its clause, because someone who does not know why
  will helpfully brief it.
- **An explanation is supposed to argue.** Weighing alternatives and admitting the counter-case is
  that type's job, not over-inclusion.
- **A tutorial minimising explanation is following its type, not failing to explain.**

---

## 7. The point held back until the end of the sentence

**Where it appears.** Warnings, rules and closing lines — anywhere the writer wants a point to
land hard.

> **Before** — A note that ships an install line for a tag that was never cut is a `404` for every
> reader.

> **After** — deleted. The rule above it already said what to do, and the consequence was
> decoration.

**The reader's report.** "It's just hard to comprehend that sentence without rereading it a bunch
of times." And on the habit behind it: "we're not trying to make this poetry, we're not trying to
create a turn of phrase here… we're just literally saying what this is."

**What goes wrong.** The sentence is **periodic** — it withholds its main point until the close,
so the reader holds an unresolved subject through every qualifier before anything happens to it.
Here thirteen words separate the subject from its verb:

    A note [that ships an install line] [for a tag] [that was never cut] IS …

That structure is **left-branching**: modifiers stack in front of the verb, where English normally
puts them after it. Working memory pays the difference, which is why a second read fixes it — the
second pass already knows where the verb is.

Periodic sentences are a real tool. They build to a reveal, and a reader of fiction has agreed to
wait for it. A reader of a technical document has not: they want to stop as soon as they have the
instruction, and a periodic sentence makes stopping early yield nothing.

**The fix is to make it loose** — state the point, then hang the qualifications off the back. If
the point is already stated in the line above, delete the sentence instead: the reveal was
restating a rule the reader had.

**Where it looks like this but is not.** A long subject is not the defect; a long subject with the
verb withheld is. `The rules that changed tier, the fixtures that moved, and the counts that
shifted are all listed below` is a heavy subject and reads fine, because the qualifiers are a flat
list rather than nested clauses and the verb is where the reader expects it. Count nesting depth,
not words.

**How to spot it.** Read to the first verb that belongs to the subject. If you had to hold more
than one clause open to get there, recast it. The reading tell: you understood the sentence and
had to go back to the start to check what it was about.

**Often carries a second fault.** A held-back point tends to arrive as a figure, because the
reveal wants to land — `is a 404` is **metonymy**, naming the note by its effect. Name the
structure first, then check the payload separately: fixing the shape does not remove the figure.

---

## Two things that apply to every entry

**Findings from the reader, judgement from the writer.** A reader without the writing context
cannot distinguish a term the page coined from a term the domain already owns, and will flag real
domain vocabulary as unexplained. Report what did not resolve; do not rule on whether it should
have.

**Look twice wherever you already found something.** The compound in entry 4 gave up its second
and third faults only after the first was named, and it was reported as a single "subtle" problem
until the sentence was stripped to what it asserts.
