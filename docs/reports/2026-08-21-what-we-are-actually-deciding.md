---
type: report
generated: { by: claude-opus-5, at: 2026-08-21 }
status: stable
lifecycle: live
description:
  A from-scratch explanation of the one design problem five commits on this branch have been
  circling — how the kit decides that a flag named `--json` actually selects JSON — what each
  attempt broke, why the difficulty is real rather than sloppiness, and what the choice costs
  whichever way it goes.
tags: [conformance, machine-mode, evidence, tradeoff, explanation]
subject: the machine-mode selector premise shared by three core rules
examined: branch `fix/a-flag-name-is-not-a-selector` at 0e36d8b, against the fixtures under `src/acc/kit/fixtures/`
---

# What we are actually deciding

## The scenario, in one paragraph

The kit takes a CLI it has never seen, runs a small number of safe commands against it, reads the
bytes that come back, and reports which of our rules that CLI broke. It gets no source code, no
manifest, no cooperation. Everything it says has to be inferred from what came out of the pipe.
Three of our rules only apply **when the tool is in machine mode** — that is, when the caller has
asked for JSON instead of prose. So before those rules can say anything, the kit has to answer a
prior question: _does this tool even have a machine mode, and how do I turn it on?_

That prior question is the whole problem. Everything below is about it.

## What broke

The kit read the tool's own `--help`, looked for a flag spelled `--json`, and if it found one,
treated that as the switch. Reasonable. It is what a human does.

Then consider a real and entirely ordinary CLI — a data validator whose help says:

```
Options:
  --json <file>   Treat the input file as JSON.
```

Here `--json` describes the **input**. The tool prints prose and only prose. It is not broken; it
has never claimed to emit JSON. But the kit saw the spelling, decided machine mode was available,
sent it three probes in that "mode", got prose back — because prose is all it has — and reported:

```
NOT CONFORMANT (L0) — 3 core violated
  FAIL  B3  machine-mode stdout is neither one JSON document nor NDJSON
  FAIL  B5  machine mode via --json and the parser error came back as prose on stderr (exit 2)
  FAIL  D1  --version in machine mode did not emit a JSON document ("1.0.0")
```

(`L0` there is just the probe level: the commands safe to run against a tool you know nothing
about.) Three core violations against a tool that broke nothing. This was live in v0.2.0. The rules being
misapplied are: _machine output must parse_, _a broken command must still answer in JSON when JSON
mode is on_, and _`--version` in JSON mode must return a document rather than a bare string_.

Note also `--format` on a source-code formatter, and `--output` naming a destination file. Same
shape. This is not an exotic case.

## The five attempts

### 1. Trust the spelling

Described above. It looked right because the spelling is how a human reads help. It broke because
**a flag's name is not its meaning**, and the kit only ever sees the name.

Why it was not obvious: the line that reads `--json` out of help predates all three rules that
depend on it. Nobody reviewing those rules could have found it — the mistake is upstream of every
place the symptom appears.

### 2. Ask for corroboration: did anything structured come back under the flag?

The idea: before condemning a tool for its machine mode, make sure we ever _saw_ a machine mode.
Require some probe under the flag to have come back as parseable JSON.

It broke on `JSON.parse`. `JSON.parse("1.4")` succeeds — `1.4` is a valid JSON document. So a
plain-text CLI whose `--version` prints `1.4` corroborated its own machine mode by printing a
two-component version number. The control fixture only passed because its version string happened
to be `1.0.0`, which does not parse. Changing that one string to `1.4` reinstated all three false
failures.

Not obvious in advance because "did it parse as JSON" _sounds_ like a structural claim and is not
one. JSON's grammar admits bare scalars.

It broke a second way: each rule was reading corroborating evidence out of _another_ rule's
recordings. That works when the whole suite runs and inverts the moment one rule runs alone — a
unit test, or a future `--only`. A verdict that changes depending on which other rules ran is not
a measurement.

### 3. Require a real document, and make each rule collect its own evidence

Corroboration now needs an object, an array, or NDJSON — not a bare scalar. Each rule sends its own
corroborating probe.

What broke was **where the guard sat**. In the `--version` rule it was placed inside one branch, so
a tool whose `--version --json` exits non-zero was still failed. Worse, that branch returned
"unverified" and in doing so _discarded findings the earlier clauses had already made_: a tool
whose `--version` genuinely required a working `HOME` — a real, measured violation — went from
`fail` to `unverified` because its help happened to spell a flag `--json`. An unrelated flag name
silenced a real defect.

Not obvious in advance because the guard is correct as a sentence. "Do not condemn on an
unestablished selector" is right. It was implemented at the site where the symptom had been
reported rather than at every site where the principle has to hold.

### 4. Move the guard to the top

If placement was the bug, evaluate the guard first. Clean, obvious, wrong.

Consider a CLI with a **real** machine mode that only reaches the error path:

```
$ mytool --bogus --json
{"ok":false,"error":{"kind":"usage","message":"unknown option '--bogus'","token":"--bogus"}}
$ mytool --version --json
1.0.0
```

That tool answers the "does JSON hold on a parse error" rule's own probe with a perfect JSON
document. Under attempt 4, the guard ran before that observation was even looked at, decided
nothing had come back under the flag, and threw the correct verdict away. A rule that has already
seen its answer must not be overruled by a premise check. Corroboration may decide whether a rule
is _allowed_ to condemn; it may never overrule a rule that already answered.

Also found here: the "is it a document" test had been reduced to _does the text contain a `{`_.
`["a{b",1]` and `["a",1]` are the same shape and got opposite answers. A substring standing in for
a structural claim — the exact error this entire rule exists to eliminate, one layer down.

### 5. Presence is the wrong question; contrast is the right one

Attempts 2–4 all asked: **did a document ever come back _under_ the flag?** That question is
inverted against the tools we most want to catch.

Here is the flagship defect the JSON-on-parse-error rule exists for — a tool that resolves its
output format only from the tokens it managed to read before the parser gave up:

```
$ mytool --bogus
{"ok":false,"error":{"kind":"usage","message":"unknown option --bogus"}}
$ mytool --bogus --json
liar: unknown option --bogus
```

Adding `--json` makes it _worse_. Its machine mode **collapses** under the flag. So no document
ever came back under the flag — and the presence test therefore refused to condemn it. The more
completely a tool's machine mode collapsed, the quieter the kit became. That is as backwards as it
gets.

The current design asks a different question: **does adding the flag change anything?** Three
invocations exist in both a bare and a flagged form and are already being sent anyway — `--help`,
`--version`, and a deliberate bad flag. Pair them. If adding the token changes whether the answer
is a structured document, the flag governs output shape, and the rules may condemn under it.

One question covers all four populations, including the one no earlier version handled: a
machine-first CLI whose `--json` names an input file emits JSON either way, shows no contrast, and
is no longer failed for answering help in prose.

Worth recording, because it is the failure mode of a fast session: attempt 5 initially passed its
gate because a **fixture had been edited** to give the tool a working `--json` path, which made the
guard a no-op for it. That is weakening a control to fit the code. Both fixture edits were
reverted, and the inversion is now pinned by a test that fails if the old predicate returns.

## Why this is genuinely hard

Two things, and they compound.

**A flag has a spelling and a meaning, and only the spelling is visible.** From outside a program,
`--json` is four bytes in a help screen. The only evidence available about what it _means_ is what
changes when you send it. So "is `--json` a machine-mode selector?" is not answerable directly; it
can only be replaced with the observable proxy "does sending `--json` change the shape of the
answer?" Every design on this branch is some version of that substitution, and the substitution is
lossy.

**The proxy fails in exactly one place, and it is the worst place.** Take these two tools:

- Tool A: `--json` names an input file. Prose in, prose out. Breaks no rule.
- Tool B: `--json` is genuinely meant to select JSON output, and it does not work anywhere.

Now run both. Every probe, with and without the flag, comes back as the same prose. **They are
byte-identical from the outside.** Not "hard to distinguish" — identical. There is no cleverer
predicate, no additional safe probe at this level, that separates them, because the difference
between them exists only in the author's intent and the tool emits no trace of it.

That is the real thing. The choice is not between a correct design and a buggy one. It is a choice
about which of those two tools to be wrong about.

## The tradeoff, plainly

**If the kit condemns on the spelling** it makes _false accusations_. The victim is the author of a
perfectly good human-first CLI who is told, in a report headed NOT CONFORMANT, that they broke
three core rules they never signed up for. For a conformance tool this is the expensive error: a
single unearned failure teaches a user that the badge is noise, and they stop reading it. That was
the state in v0.2.0.

**If the kit requires an observed contrast** it grants a _silent excuse_. The victim is the
downstream agent who wanted to rely on a tool whose `--json` was meant to work and never did. That
tool now gets `unverified` rather than `fail`.

There is no third option with zero cost. Anyone who claims otherwise has not looked at Tool A and
Tool B above.

**I think the current side is clearly right, for three reasons, and here is the work so you can
disagree:**

1. **An accusation is acted on; an unverified is a question.** The report distinguishes them
   loudly, and the whole kit already separates "conformant" from "fully verified" — the exact
   split this needs. The excuse is disclosed, per rule, in the coverage-gap list on all three rule
   pages. The false accusation was not disclosable; it was simply wrong.
2. **The population that escapes is smaller than it sounds.** It is not "tools with broken JSON
   output". It is only tools whose flag does _literally nothing observable_ on any reachable path
   — where the flag is functionally absent. The moment it changes anything, anywhere, the kit
   holds it to every path. That is the tool below, which fails two core rules on evidence it
   produced itself — the JSON-on-parse-error rule passes on the one path the tool gets right, and
   the output-must-parse and version-in-JSON-mode rules fail on the two it does not:

   ```
     FAIL  B3  machine-mode stdout is neither one JSON document nor NDJSON
     PASS+ B5  the parser error arrived on stderr as one JSON document (exit 2)
     FAIL  D1  --version in machine mode did not emit a JSON document ("1.0.0")
   ```

3. **The kit's only asset is that it never condemns what it did not see.** Inference selects what
   to look at; only observation may fail a build. Give that up and every other verdict it prints
   becomes negotiable.

## Where it stands, and what you would actually be choosing

Shipped on this branch: the contrast test. Three flag-name-only tools now report `unverified` with
the reason attached instead of failing; the tool whose machine mode collapses under its own flag
fails as it should; the tool whose machine mode is real but incomplete fails on the paths it misses
and passes on the one it reaches. The cost is written into all three rule pages rather than living
in a commit message.

If you want to change course, these are the actual options:

- **Go back to condemning on the spelling.** Reinstates the v0.2.0 false failures. I do not
  recommend it, but it is coherent if you believe adopters read `unverified` as "fine".
- **Keep `unverified` for the rules, and add a separate reported line** saying "help advertises
  `--json`, and sending it changed nothing we could observe." This is a claim about the _flag_, not
  about the rule, so it can be made honestly on evidence we have. It gives the Tool B author a
  visible nudge without accusing the Tool A author of anything. Half of it already exists — the
  diagnostic rule that reports whether help names a machine-mode flag passes all four of these
  tools today. **This is the change I would make if you want more from this evidence.**
- **Ask tools to declare it.** A tool that _states_ its machine mode binds itself, and a
  declaration is a promise rather than our inference — which is why the kit already probes a
  declared machine-first default without needing any contrast. Broadening that means a manifest,
  which means it is not a question the kit can answer unaided any more.

The thing not on the list is a smarter predicate. Tool A and Tool B emit the same bytes. No
predicate can tell them apart, and the last five commits are what finding that out looked like.
