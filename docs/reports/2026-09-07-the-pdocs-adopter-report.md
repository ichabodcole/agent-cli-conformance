---
type: report
generated: { by: claude-fable-5-1, at: 2026-09-07 }
status: stable
lifecycle: discharged
description:
  Four points from the sixth adopter run, pdocs, filed as issue #49 against kit v0.1.13 and
  each checked against the repository. One is a launcher failure the one-registry guide's step 7
  tells the reader to trigger, reproduced here; one asks for a `values` key on positionals, when
  `values` on flags is already parsed and compared by nothing; one is a question the safety guide
  does not ask, about where a tool finds the tree it operates on; and one is a finding the
  adopter reached by writing a declaration row, a route the guide does not mention.
tags: [adoption, trial, evidence, consumer-signal, conformance, docs]
subject:
  GitHub issue #49, the adopter report from pdocs, read against the kit and the guides it names
examined:
  issue #49 as filed 2026-09-07; kit and docs at v0.1.13 (904e193 on develop); a scratch project
  with acc installed the way the issue says, as a git devDependency pinned to v0.1.13, run on
  macOS with bun 1.4.0; the kit's own CLI as the target and one of the kit's fixture
  declarations as the file
---

# The pdocs adopter report

An agent ran the `acc` skill, steps 1 through 7, against `pdocs`, the documentation CLI in
[project-docs-scaffold-template](https://github.com/ichabodcole/project-docs-scaffold-template),
and filed
[issue #49](https://github.com/ichabodcole/agent-cli-conformance/issues/49). The run took the
tool from one core rule unverified to none, with 10 of 10 declared paths compared and 0
disagreements. The issue says so, and then asks for more. This report records each of its four
points against the tree so it has a disposition. It follows
[the citty and media-buffet report](./2026-09-06-the-citty-and-media-buffet-reports.md) from the
round before.

Register, as in that report: **reported** is the adopter's own account, quoted; **observed** is a
command run or a passage read for this report, with its output or its wording; nothing below is
inferred. Step numbers are the `acc` skill's.

Finding ids are prefixed `PD-`.

## How the behavioural claims were checked

The adopter's tool was not run. PD-1 is a claim about the launcher, not the target, so it was
reproduced with the kit's own CLI as the target and one of the kit's fixture declarations as the
file, in a scratch project that installed `acc` the way the issue describes. The other three
points are claims about documents and the declaration parser, and were checked by reading them.

## PD-1 · `bunx acc … --declaration <(…)` cannot read process substitution

Reported:

> ```
> $ bunx acc check scripts/pdocs/cli.ts --declaration <(bun scripts/pdocs/cli.ts schema)
> {"ok":false,"error":{"kind":"not_found","exit_code":5, … "message":"no such file: /dev/fd/11" …
> ```
>
> **What I did next:** used the local binary instead, which works.

Observed, in the scratch project, the same declaration under three launchers, and once more as a
file on disk:

| launcher                  | `--declaration`    | result                                  |
| ------------------------- | ------------------ | --------------------------------------- |
| `./node_modules/.bin/acc` | `<(cat decl.json)` | read; the report carries the comparison |
| `bunx acc`                | `<(cat decl.json)` | `not_found`, `no such file: /dev/fd/12` |
| `bunx --bun acc`          | `<(cat decl.json)` | `not_found`, `no such file: /dev/fd/12` |
| `bunx acc`                | `decl.json`        | read; the report carries the comparison |

The failure is in the launcher, and it is not specific to `--declaration`: under `bunx`,
`--recorded-surfaces <(…)` fails the same way, and `acc report <(…)` answers
`no such report: /dev/fd/12`. Every option that takes a file is affected, because the
substituted descriptor is what does not arrive. Stdin does arrive, so piping the schema to it
reads the declaration under `bunx`:

```
$ your-cli schema | bunx acc check ./your-cli --declaration /dev/stdin
```

That ran in the same scratch project and the report carried the comparison. Why `bunx` drops the descriptor
was not traced; the issue's theory, a re-exec that does not carry it, was neither confirmed nor
rejected here.

The idiom is not one the adopter invented. Step 7 of
[the one-registry guide](../wiki/guides/how-to-derive-your-surface-from-one-registry.md), "The
round trip", is the single line `acc check ./your-cli --declaration <(your-cli schema)`, and the
guide quotes it a second time from grapevine's source. Every install line in the README and the
skill reads `bunx acc`. A reader who follows both arrives at the reported error.

**A guide gap, on the guide's own happy path.** Step 7 of the one-registry guide would get the line:
under `bunx`, pipe the schema to `/dev/stdin` or run the installed bin directly, because the
substituted descriptor does not reach the process. The error's `hint`, "Create that file", is
wrong for a `/dev/fd` path. The kit could recognise that path shape and say so; that is a
smaller change than the guide line, recorded as a possibility and not proposed here.

## PD-2 · A positional cannot declare its closed set

Reported: `pdocs new <type> <name>` takes one of eighteen document types, and

> ```
> Error: ./with-values.json commands[7].positionals[0]: unknown key "values".
> This reader refuses a document it half-understands; known keys are name, required, variadic
> ```
>
> **Expected:** roughly what `args[].values` does for flags.

Observed, in the declaration parser
([`declaration.ts`](../../src/acc/kit/declaration.ts)): a positional's keys are `name`,
`required` and `variadic`, as the error says. A flag's keys include `values`, parsed as an array
of strings and stored on the declared argument. Then nothing reads it. The census compares
names: a declared flag the target did not enumerate, a refused flag it did, an enumerated flag
nothing declares. `values` is carried through the parser and enters no comparison. The only code
in the repository that enforces a `values` list is the kit's own argument parser, on the kit's
own flags.

So the expectation rests on something that does not exist. A `values` key on positionals
would today be what `values` on flags already is: a field the parser accepts and the diff
ignores. The adopter left the set where a caller reaches it, in the rejection's `choices` and in
the tool's `help --json`, and that is the right place for it while the declaration has no
consumer for the field.

**A format ask, promoted rather than answered.** Adding the key is an append to a v0 format, and
cheap. Adding it before a census comparison reads it, on flags and positionals both, would
publish a field nothing checks, the defect class the A7 rule page names. The roadmap's section
on versioning the contract already parks three adopter asks against the declaration format and
the promised surface; this would be the fourth.

## PD-3 · The safety method has no question for a tool that resolves its root from its own location

Reported:

> `pdocs` resolves the repository it operates on from `import.meta.dir` — its own install
> location — not from `cwd`. So the fresh temporary working directory redirects **nothing** for
> it: every probe read the real repository, wherever it was run from. … none of the three
> questions asks it.
>
> **Suggested fourth question:** _does the tool derive its working root from its own install
> location rather than from `cwd`?_

Observed, in
[the safety guide](../wiki/guides/how-to-establish-your-target-is-safe-to-check.md): the Goal
says the temporary working directory "redirects **relative** paths only", and the closing
paragraph of question 3 lists what the scratch `HOME` leaves uncovered, "absolute paths"
first. `acc check --help` lists absolute paths too. Nothing between those two sentences asks the reader
where the tool finds the tree it works on, and a path derived from the tool's own location is an
absolute one. The three questions ask what the first positional means, what a bare invocation
does, and what runs before parsing; a tool can answer all three acceptably and still write into a
real tree on a probe, because the question that would have caught it is not on the page.

The adopter's own method is worth keeping: run each probe shape by hand against the real tree,
then diff `git status` to confirm nothing tracked was written, and only then run the check. The
guide's Verification section has no step of that kind; it restates the three answers.

**A guide gap, and the largest of the four.** A fourth question, after the third: where does the
tool find the tree it operates on, and is that location moved by the working directory at all.
Where the answer is the tool's own location, the temporary directory is not containment, and
the hand run against a tree you can diff is the check. The page's description, its Goal, its
Verification paragraph, the wiki index and the skill's step 1 all count the questions as three,
and each would move to four with it.

## PD-4 · Step 6 found a defect by a route the guide does not mention

Reported:

> `pdocs help` was a bare string in the dispatcher rather than a row in the command table —
> answered by an interceptor **before** the table is consulted. Writing its declaration row is
> what exposed that it accepted _every flag there is_ at exit 0 …
>
> I also falsified the lazy fix rather than assuming: declaring `help` and leaving it
> permissive still reports `0 disagreements`, since a verb that never rejects never enumerates.
>
> ```
> 9 of 10 declared command paths compared; 0 disagreements (emitted declaration)
> NOT COMPARED: help — did not enumerate at help; 1 rejection read, none named a set of flags [recorded-by-caller]
> ```

The 10 of 10 the issue opens with is the run after the fix went into the tool; the 9 of 10 above
is the falsification, with `help` declared and still permissive.

Observed, in the one-registry guide's trap section: the paragraph on verbs the root answers
itself ends "Reading your own dispatcher is what finds that one." The adopter found it before
reading the dispatcher, because a declaration row for `help` cannot be written without deciding
what `help` accepts, and deciding that is what surfaced the silent accept. The adopter also
reports that a declared and still permissive `help` compares clean. That is the behaviour the
skill's step 5 documents under `did not enumerate`: recording a non-enumerating path yields an
observation and no comparison, and the census prints the path as `NOT COMPARED` above a count
that excludes it. The output quoted above has exactly that shape.

**Evidence, with one sentence to add.** The trap paragraph could say that writing the row is the
first place the question gets asked, so the reader who reaches step 6 without having read the
dispatcher still meets it. Nothing else moves; the `NOT COMPARED` behaviour is documented where
the reader will be when they see it.

## What this did not establish

- **Why `bunx` drops the descriptor.** The failure is reproduced under `bunx` and absent under
  the direct bin; the mechanism was not traced.
- **`pdocs` itself.** Neither the eighteen-type positional nor the `import.meta.dir` root
  resolution was inspected; both are reported.
- **Whether a `/dev/stdin` declaration behaves identically to a file in every case.** One
  run compared clean; the parser consumes the whole stream once, and nothing was found that
  reads the path twice, but that was not swept.

## Dispositions

| Id     | Kind       | Proposed disposition                                                                                    |
| ------ | ---------- | ------------------------------------------------------------------------------------------------------- |
| `PD-1` | guide gap  | a line at step 7 of the one-registry guide: under `bunx`, pipe to `/dev/stdin` or run the bin directly  |
| `PD-2` | format ask | promote to the roadmap's contract-versioning section as the fourth parked ask                           |
| `PD-3` | guide gap  | a fourth question in the safety guide, a hand-run step in its Verification, and the count moved to four |
| `PD-4` | evidence   | one sentence in the one-registry guide's trap paragraph                                                 |

None of these is actioned by this report. PD-3 and PD-4 have the shape every adopter round has
produced: the fact was already written somewhere, but not in the sentence the reader was acting
on. For PD-3 it was in the closing paragraph of the same page; for PD-4, in the skill's step 5.
PD-1 is the other shape: the guide's own line walks into a property of the launcher that no page
recorded at all.

## Disposition, verified 2026-09-07

Written after the fixes landed on develop; the finding text above is unmodified except that PD-3
named the skill's count sentence as step 3, and it is in step 1. All of them, and the two
slices in the addendum below, shipped in v0.1.14 on 2026-09-08.

- **`PD-1` actioned**: step 7 of the one-registry guide says what `bunx` does with the
  substituted descriptor, names the two other options it affects, and gives the pipe and the
  direct bin as the two lines that work. The `hint` on the error is unchanged.
- **`PD-2` promoted** into
  [the roadmap](../roadmap.md#2-version-the-contract-not-only-the-rules) as the fourth parked ask,
  worded as the comparison rather than the key.
- **`PD-3` actioned**: the safety guide has a fourth question, where the tool finds the tree it
  works on, with the hand run against a diffable tree as its check; question 3's closing
  paragraph points at it; the Verification paragraph, the page description, the wiki index, the
  first-CLI tutorial and the skill's step 1 count four. The hand run names one invocation per
  probe shape and says where the kit's full argv list is, because part of that list is derived
  from the target's help and cannot be written down in advance.
- **`PD-4` actioned**: the trap paragraph in the one-registry guide says that writing the row
  asks the question, and what the census prints for a row declared and left permissive.
- **Found in review, outside the issue**: the one-registry guide's Verification told the reader
  to write `--declaration -`, and the kit reads no such spelling; it resolves `-` as a file named
  `-` and reports `not_found`. The line now says `/dev/stdin`, which the kit reads under every
  launcher measured. Whether the kit should accept `-` is not decided here.

With that this report is **discharged**: every finding is actioned or promoted. Issue #49 is
closed on it.

## Addendum, 2026-09-08

The two questions left open above, the hint and `-`, have been decided and implemented. A
`/dev/fd/N` path that does not exist now gets a hint saying the descriptor never reached the
process and naming `-`, on `--declaration`, `--recorded-surfaces`, `probe-plan`'s `--declaration`
and `--paths`, `acc report` and `acc compare`. And `-` reads stdin on each of those except
`compare`, refused when stdin is a terminal, and on `acc check` refused when both options name it.
The one-registry guide's round trip reads `--declaration -`.
