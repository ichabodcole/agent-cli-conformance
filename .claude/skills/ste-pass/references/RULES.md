# The STE writing rules, for a checker of documentation

This file restates Part 1 of ASD-STE100, Issue 8 (April 2021), for a checker who reads a document
against Part 1. In this file, "you" and "the checker" are that person. "The reader" is the person
who reads the checked document. "The domain" is the project whose documentation you check. Each
entry gives:

- the number of the rule in the standard, or a note that the standard has no numbered rule
- the rule
- a pair of examples
- the case where the text looks like the defect and is not the defect.

The examples are from documentation for a command-line tool. The domain nouns in the examples do
not matter.

**This file does not check dictionary membership.** The standard has a second part, a dictionary
of about 900 approved words. This file does not reproduce the dictionary. Rules 1.5 and 1.12 permit
the words that a project uses for its own parts and operations, and a software project uses many
such words. Judge a word by rules 1.11 and 9.4 instead: one name for one thing, used the same way
each time.

**Three things apply to every entry.**

- A rewrite must keep the claim exactly: the same numbers, the same paths, the same conditions,
  the same domain terms. Rule 3.6 needs an actor. When the original names no actor, take the actor
  from the context of the document, and say in the finding that you added the actor.
- A passage can break more than one rule. When you find one defect, read the sentence again for
  the next defect.
- An imperative sentence is an instruction, with a limit of 20 words. Every other sentence is a
  description, with a limit of 25 words.

---

## Words

### Rules 1.6, 1.9 and 1.10: a word from the dictionary, or a technical name, and no other word

**The rule.** The standard permits a word outside the dictionary only when it is a technical name
or part of one. A technical name is short, easy to understand, and not slang or jargon.

> Non-STE: The kit's headline verdict is a weaker claim wearing the words of a stronger one.
>
> STE: `acc check` reports `conformant` when no core rule failed. It does not report that every
> core rule passed.

**What goes wrong.** "Headline verdict" is a phrase that the document made. The reader has no way
to resolve it. A technical name is a name that the domain already uses.

**Where the text looks like this defect and is not one.** `stdout`, `exit code`, `frontmatter`,
`probe`, `checker`, `lint`, and every name in the tool's own output are technical names. This file
also permits a term that the document defines in the sentence where the term first appears. Report
a term that you cannot resolve. Do not decide whether it is a defect.

### Rules 1.11 and 9.4: one name for one thing

**The rule.** Do not use different names for the same item. Use a consistent style.

> Non-STE: The runner starts the child. The harness then waits for the subprocess. When the
> process exits, the executor reads the code.
>
> STE: The runner starts the child process. The runner then waits for the child process. When
> the child process exits, the runner reads the exit code.

**What goes wrong.** The passage uses four names for two things. The reader must decide whether
"harness" and "executor" are the runner, and whether "subprocess" is the child. STE permits a
repeated name.

**Where the text looks like this defect and is not one.** The passage uses two names for two
different things. Before you report, check that the things are the same.

### Rule 9.3: no phrasal verbs

**The rule.** Do not join a verb and a preposition to make a phrase with a different, more
abstract meaning.

> Non-STE: Set up the fixture, then look into why the probe gave up.
>
> STE: Install the fixture, then examine why the probe stopped.

**Where the text looks like this defect and is not one.** A phrasal verb can be the domain's own
technical verb: "check out" and "roll back" in git, "pipe into" in a shell. Keep those.

### Figures of speech (no numbered rule)

The standard has no numbered rule against a figure of speech, because the dictionary prevents
one. Without the dictionary, treat a figure of speech as a rule 1.6 defect. The figure is a word
with a meaning that the reader must decode.

> Non-STE: The lint is a smoke alarm, not a sprinkler.
>
> STE: The lint reports the defect. It does not repair the defect.

**Where the text looks like this defect and is not one.** A figure of speech can name a thing for
which the domain has no word, and can be beside its literal statement. When the literal statement
is absent, report the figure. When the figure is beside the literal statement and adds nothing,
report the figure. Otherwise, keep the figure.

---

## Noun phrases

### Rule 2.1: no more than three words in a noun cluster

**The rule.** Write a noun cluster of no more than three words. Rewrite a longer cluster with a
verb or a preposition.

> Non-STE: the probe timeout retry count
>
> STE: the number of retries after a probe timeout

**What goes wrong.** The reader cannot tell which word modifies which other word. "Timeout retry"
and "retry count" are both possible groups. The rewrite chooses one reading. Say in the finding
that the writer must confirm the reading.

**Where the text looks like this defect and is not one.** The domain can use a technical name of
more than three words as one unit, for example a command name or a product name. Rule 2.2 says to
write the name in full the first time.

### Rule 2.3: keep the article

**The rule.** Where English uses an article (the, a, an) or a demonstrative adjective (this,
these), use one.

> Non-STE: Parser rejects flag. Runner reports error.
>
> STE: The parser rejects the flag. The runner reports the error.

**Where the text looks like this defect and is not one.** A heading, a table cell, a label, or a
list item can be a noun phrase and not a sentence.

---

## Verbs

### Rules 3.2 and 3.4: only the simple forms, no perfect tenses, no complex passives

**The rule.** Use only:

- the infinitive
- the imperative
- the simple present
- the simple past
- the simple future
- the past participle as an adjective.

Do not use "has", "have" or "had" with a past participle. Do not use a modal verb with "be" and a
past participle.

> Non-STE: The checker has been updated. The gap can be closed by a new probe.
>
> STE: I updated the checker. A new probe can close the gap. (The actor "I" is from the context of
> the document.)

**How to find this defect.** Search `\b(has|have|had) (been )?[a-z]+ed\b` and
`\b(can|must|will|should|may) be [a-z]+ed\b`. The patterns over-report and miss irregular
participles. Judge each hit.

**Where the text looks like this defect and is not one.** "Have" can be a main verb ("the rule
has a coverage field"). A past participle can be an adjective ("the changed file", "a closed
gap").

### Rule 3.5: no `-ing` verb forms

**The rule.** Use the `-ing` form only as a technical name or as a modifier in a technical name.

> Non-STE: Before committing, run the sweep. The runner is reading the pipe while the child is
> writing.
>
> STE: Before you commit, run the sweep. The runner reads the pipe while the child writes.

**What goes wrong.** An `-ing` word can be a verb, an adjective, or a noun. The reader must decide
which of the three it is, and a long chain of them makes a sentence with no clear subject.

**Where the text looks like this defect and is not one.** `warning`, `logging`, `string`,
`setting`, `mapping`, `encoding`, and every other `-ing` noun that names a thing in the domain are
technical names. The test is this: does the word have a plural that the domain uses? "Two
warnings" and "the settings" pass the test. "Two committings" fails the test, so "committing" is
a verb form.

### Rule 3.6: active voice

**The rule.** Use only the active voice in an instruction. Use the active voice as much as
possible in a description.

> Non-STE: A temporary file is written. The flag is then validated.
>
> STE: The test writes a temporary file. The parser then checks the flag. (The actors "the test"
> and "the parser" are from the context of the document.)

**Where the text looks like this defect and is not one.** A description can have an actor that is
unknown or does not matter: "the tag was never cut", "the file is stored under `.scratch/`".
Report the passive only in this case: the actor is known, and the reader loses information without
the actor.

### Rule 3.7: a verb for an action, not a noun

**The rule.** Use a verb to describe an action, not a noun made from the verb.

> Non-STE: Rejection of the flag occurs in the parser. Validation is performed at startup.
>
> STE: The parser rejects the flag. The program checks the input at startup. (The actor "the
> program" is from the context of the document.)

**What goes wrong.** The noun moves the real verb to the end of the sentence, or replaces it with
"occurs" or "is performed".

---

## Sentences

### Rules 5.1 and 6.3: 20 words in an instruction, 25 words in a description

**The rule.** Use a maximum of 20 words in each sentence of a procedure. Use a maximum of 25 words
in each sentence of a description. Rules 8.5 to 8.7 say how to count. Each of these counts as one
word:

- a parenthesis
- a number
- a unit
- an abbreviation
- an identifier
- quoted text
- a hyphenated word.

> Non-STE: Because the runner reads the pipe continuously, and because the defect only appears
> against a slow consumer, the kit cannot observe it at any probe level, so the gap stays open.
>
> STE: The kit cannot observe this defect at any probe level. The runner reads the pipe
> continuously, and the defect appears only when the consumer reads slowly. Thus the gap stays
> open.

**What goes wrong.** The reader cannot resolve any clause until the end of the sentence. The
rewrite puts the main claim first and keeps the connecting words, "and" and "thus".

**Where the text looks like this defect and is not one.** A sentence in a description can have 21
to 25 words. A count can be high only because the checker counted each word in a path or a code
span. Count those as one word.

### Rules 4.1 and 6.1: the subject and the main verb first (order is this file's reading)

**The rule.** Rule 4.1 says to write short and clear sentences. Rule 6.1 says to give information
gradually. This file reads both as an order: the subject and the main verb first, then the
qualifiers and the relative clauses. A reader who stops after the first clause must know the main
claim.

> Non-STE: A note that ships an install line for a tag that was never cut is a 404.
>
> STE: The install line is a 404, because the note names a tag that was never cut.

**What goes wrong.** Thirteen words separate the subject from its verb. The reader must hold the
subject in memory until the verb arrives.

### Rule 4.2: do not omit words

**The rule.** Do not omit words to make a sentence shorter. Do not use contractions. Keep the
subject, the verb, the articles, and the conjunction "that" (general recommendation GR-1 in
section 9 of the standard).

> Non-STE: Files not matching the pattern are skipped. Make sure the tag exists. Don't push main.
>
> STE: The script skips the files that do not match the pattern. Make sure that the tag exists.
> Do not push main. (The actor "the script" is from the context of the document.)

**How to find this defect.** Search `\b(make sure|ensure|shows?|means|recommends?) (the|a|an|this|it|you)\b`
for a dropped "that". Search `n't\b` for a contraction. The first pattern over-reports. Judge
each hit.

### Rules 5.2 and 5.3: one instruction in each sentence, in the imperative

**The rule.** Unless two actions occur at the same time, write one instruction in each sentence.
Write the instruction as a command.

> Non-STE: You should open the report and then check that the exit code is 9 before you file the
> finding.
>
> STE: Open the report. Check that the exit code is 9. Then file the finding.

**Where the text looks like this defect and is not one.** Two actions can occur at the same time:
"Hold the key and press Enter."

### Rule 5.4: the condition first, then a comma, then the instruction

**The rule.** The standard's rule is the comma: when an instruction starts with a descriptive
statement, divide the statement from the command with a comma. The standard's examples all put
the condition first, and this file adopts that order.

> Non-STE: Read the log if the build fails.
>
> STE: If the build fails, read the log.

### Rule 4.3: a vertical list for complex text

**The rule.** Use a vertical list for a sequence of steps, a set of conditions, or a set of more
than three parallel items.

> Non-STE: The report includes the rule id, the verdict, the probe level, the coverage, and the
> gaps that the probe left open.
>
> STE: The report includes:
>
> - the rule id
> - the verdict
> - the probe level
> - the coverage
> - the gaps that the probe left open.

**Where the text looks like this defect and is not one.** One sentence can hold two or three short
parallel items.

### Rule 4.4: connecting words

**The rule.** Use connecting words and phrases to connect sentences with related topics: "and",
"but", "then", "thus", "because", "as a result", "at the same time".

> Non-STE: The tag was never cut. The install line is a 404.
>
> STE: The tag was never cut. Thus the install line is a 404.

**What goes wrong.** A writer splits a long sentence to obey rule 6.3 and drops the connecting
word. The reader must infer the logic. The split is correct. The dropped connecting word is the
defect.

### General recommendations GR-3 and GR-4: a pronoun points at one thing

**The rule.** If "it", "this", "they" or "these" can refer to more than one noun, replace the
pronoun with the noun.

> Non-STE: If you pass the flag to the wrapper, it fails.
>
> STE: If you pass the flag to the wrapper, the wrapper fails.

### Rules 6.1, 6.5 and 6.6: one topic in each paragraph, six sentences at most

**The rule.** Give information gradually. Each paragraph has one topic and no more than six
sentences.

**Where the text looks like this defect and is not one.** A list, a table, or a quoted block is
not a paragraph.

---

## Warnings

### Rules 7.1 to 7.3: the instruction or the condition first, then the risk

**The rule.** Start a safety instruction with a clear command or condition. Then explain the
specific risk. When the document has levels of risk, use a word such as "warning" or "caution".

> Non-STE: Because the command rewrites history, you may not want to run it on main.
>
> STE: Do not run this command on main. It rewrites history.

---

## Punctuation

### Rule 8.1: no semicolons

**The rule.** You can use all standard punctuation except the semicolon.

> Non-STE: The catalogue is fine here; the runner needs to change.
>
> STE: The catalogue is fine here. The runner needs to change.

**Where the text looks like this defect and is not one.** A semicolon can be inside a code span, a
command, or quoted text.

### Rules 8.2 and 8.3: hyphens and parentheses

**The rule.** Use a hyphen to connect closely related words ("a three-word cluster"). Use
parentheses for a reference, an identifier, an abbreviation, a plural, a short explanation, or an
alternative. A dash that joins two independent clauses is not a hyphen. Rewrite that sentence as
two sentences with a connecting word.
