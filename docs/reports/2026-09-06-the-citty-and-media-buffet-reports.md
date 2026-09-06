---
type: report
generated: { by: claude-fable-5-1, at: 2026-09-06 }
status: stable
lifecycle: discharged
description:
  Nine points from two adopter runs at kit v0.1.12, filed as issues #45 and #46 and each checked
  against the repository. One is a line missing from `acc check`'s text report, one is a checker
  line that said what was not established and not what would establish it, four are guide or skill
  sentences the adopters had to work out for themselves, one is a tooling ask promoted to the
  roadmap, one was already covered, and one names what worked.
tags: [adoption, trial, evidence, consumer-signal, conformance, docs]
subject:
  GitHub issues #45 and #46, the adopter reports from two citty CLIs and from media-buffet's third
  round, read against the kit and the guides they name
examined:
  issues #45 and #46 as filed 2026-09-05; kit and docs at v0.1.12 (621764c on develop); the kit's
  own fixtures run through `acc check --format text` and `acc report` for the verdict line, from
  the repository root on macOS, bun 1.4.0
---

# The citty and media-buffet reports

Two adopters filed on the same evening. [Issue #45](https://github.com/ichabodcole/agent-cli-conformance/issues/45)
took two TypeScript CLIs built on citty, a tenant-facing `mf` and an internal `anvil`, from a
first check through the skill's step 6 in one sitting. Both reached `CONFORMANT (L0)` with an
emitted declaration and 0 disagreements: `mf` with 24 of 24 declared paths compared, `anvil` with
15 of 15.
[Issue #46](https://github.com/ichabodcole/agent-cli-conformance/issues/46) is media-buffet's
`mb` on its third round, from 15 of 17 core rules at v0.1.3 to 17 of 17 at v0.1.12, with a clean
census of 17 declared and 14 checked. Both reports say the kit worked and ask for more. This report
records each point against the tree so it has a disposition. It follows
[the glamour report](./2026-09-03-the-glamour-adopter-report.md) and
[the anthill report](./2026-09-03-the-anthill-adopter-report.md), the two from the round before.

Register, as in those reports: **reported** is the adopter's own account, quoted; **observed** is
a command run or a passage read for this report, with its output or its wording; **inferred** is
marked ours. Step numbers are the `acc` skill's.

Finding ids are prefixed `MF-` for issue #45 and `MB-` for issue #46.

## How the behavioural claims were checked

Neither adopter's tool was run. Where a finding is about what the kit prints, the kit's own
fixtures were run from the repository root, and the output quoted is the fixtures'. Where a finding is
about a guide, the guide was read at the commit named above and the passage the adopter says is
missing was searched for by its terms.

## MF-1 · A verdict that says nothing about what it did not reach

Reported: both CLIs reached `CONFORMANT` while every subcommand accepted every flag:

> `mf config show --acc-not-a-flag` exit 0, ran normally … I am **not** reporting this as a bug —
> `probing.md` is explicit that L0 probes the root … What I wanted was for that limit to be
> load-bearing in the verdict's own presentation, because "CONFORMANT" is the word an adopter
> stops at.

They supplied a self-contained fixture, strict at the root and permissive below it, and the verdict
it reaches.

Observed: the A1 gap line is the fourth clause of that rule's gaps paragraph, under `NOT FULLY
VERIFIED`, below the rule table. It reads "only the root is probed so a flag unknown to a
subcommand is not". Nothing between the headline and the table said what the run reached. The
report already carried the material for such a line: the verb set the root advertises, and whether
a batch was handed back.

**A report line.** A `scope:` line sits under the `config:` line on every run, in one of four
shapes. On the kit's own fixture that advertises three verbs:

```
CONFORMANT … [acc 0.1.12]
  config: none — no acc.config.json in …
  scope: the root only — the root advertises 3 verbs (open state tail) and none of them was probed; a batch handed back with --recorded-surfaces covers them
```

With a batch it counts the recorded paths instead. When no verb set could be asserted it says the
count below the root is not known, rather than printing nothing. And when `acc report` renders an
artifact written before the verb comparison existed, it names that kit's version and says the
count was not recorded.

## MF-2 · Step 6 removes the cross-check step 5 recommends

Reported: the surfaces guide says to derive the path list and the declaration from different
artifacts so a dead path shows as a disagreement; the one-registry guide makes that impossible by
design, and `probe-plan`'s `LIMIT:` line then "describes a condition that cannot arise once the
declaration _is_ the parser's table". Their `24 of 24 … 0 disagreements` is a weaker claim than the
same numbers on a two-source tool, and neither guide said which situation a reader is in. They
proposed the framing: the census stops being a detector and becomes a ratchet.

Observed: the one-registry guide's Verification section already called its third check "a
ratchet" and said nothing about the surfaces guide's advice being superseded, nor what the fraction
establishes once there is one source.

**A guide gap.** The one-registry guide's Verification section has the paragraph, the surfaces
guide a clause beside its two-source advice, and the skill's step 6 a clause. The paragraph is
narrower than the adopter's framing. After step 6 the fraction establishes only that no flag was
added outside the table, at the root or at a path the table dispatches; a verb the root handles
before the table is outside it, and the fraction does not see it.

## MF-3 · `selfDescription` names a command the declaration must also declare

Reported: `schema` implemented as a root interceptor, emitted as `selfDescription: { args:
["schema"] }` with no `["schema"]` row, drew `self-description-not-declared`. The finding's text
named its two remedies, a `["schema"]` row or a different `selfDescription`, and the fix took two
minutes. What they wanted was one line near `selfDescription` in the
surfaces guide saying the invocation must also be declared, since the registry guide's example has
`schema` in its table and never meets the finding. And the same trap caught `help`: a walk over
`subCommands` misses the verbs the root answers itself for the reason it misses the root's flags,
and the registry guide named only the flags.

Observed: the diff reads the first non-flag token of `selfDescription.args` and reports the finding
when no declared path starts with it. The surfaces guide's field note did not say so. The registry
guide's "the root is not a command" section named `--help`, `--version`, `-h`, `-V` and no verb.

**A guide gap, in two places.** The surfaces guide's `selfDescription` note says the invocation
must also be a declared row. The registry guide's trap section has a paragraph on the root's own
verbs, which also says which of the two the census can catch: `schema`, through
`selfDescription`, and not `help`.

## MF-4 · Three things that worked

Reported, and recorded here because both were built on adopter evidence from the round before: the
`ADVERTISED VERBS vs RECORDED PATHS` line caught `the two root captures disagree on: help schema`,
a defect they had just introduced and had no test for; and the surfaces guide's `"validFlags": []`
paragraph explained why a group node read as not-enumerated before they had to look. The adopter
met the double `--` line for `bun` at the step where it is placed. No change requested.

## MB-1 · A7 marked the better message `unverified`

Reported: `mb` is verb-first. Its root refused `--type=video` with a self-contradicting message that
called `--type` unknown while listing it as valid; they fixed it to "`--type` must follow a
command", and A7 moved from `pass` to `unverified`:

> both spellings exited non-zero without naming the offending value, so neither refusal can be
> attributed to the value rather than to the missing verb

They resolved it by reporting the value error first when both are wrong, and the placement error
otherwise, which got A7 back to `pass` and kept the good message. What they wanted was the
`unverified` line naming that shape: "as it stands the line describes what wasn't established but
not what would establish it".

Observed: the line is verbatim from the checker's one branch that produces it. The rule page's
"The probe" section explained why a verb-dispatching tool lands there and neither it nor "How to
comply" said what clears it. The checker reads presence, not order: a refusal that names the value
anywhere in it passes.

**A checker line and a rule-page paragraph.** The detail ends "a refusal that names the value
clears this even where the verb is also missing, so if this root checks placement before values,
check the value before the placement". "How to comply" carries the resolution the adopter found,
stated as what the refusal has to carry.

## MB-2 · Step 5 arrives before a path source exists

Reported: step 5 says to run `probe-plan`, which needs `--declaration` or `--paths`, and at that
step they had neither, so their first census ran on a hand-written `paths.json`. The warning that a
committed path list is "a third parallel document" lives in step 6's guide, which they had not
reached. They asked for a line in step 5 saying a hand-written list is fine to start and step 6
replaces it.

Observed: step 5 named no source. `probe-plan` refuses with neither flag and with both. The
do-not-commit rule was in the registry guide only.

**A skill gap.** Step 5 has a paragraph: write a modelled declaration or list the paths from the
dispatch table, either is scaffolding that step 6 replaces, and commit neither.

## MB-3 · The census required a root row, and nothing said to emit one

Reported: the first emitted declaration covered dispatchable commands only, and the census reported
`--help`, `--version` and `-h` `accepted-not-declared` at the root. Clear enough to act on, but
nothing in the format notes or the registry guide said `path: []` is a row you are expected to
emit.

Observed: the registry guide's "the root is not a command" section, in the tree since 2026-08-26,
says "Declare `path: []` and put them there". It sits after the numbered steps, and step 4's emitter
sentence did not point at it. The surfaces guide's format note said "`[]` is the root" and no more.

**Mostly covered; two pointers.** The format note says a declaration normally declares the root
and what the diff reports when it does not, and the registry guide's step 4 points at the trap
section.

## MB-4 · The census could print the pair count the `magpie` case is built on

Reported: the registry guide's `magpie` case, 289 flag/path pairs accepted silently, described `mb`
exactly. What they could not find was how to size their own before committing to the restructure:
the census said all 13 paths enumerated the same 14 flags and nothing turned that into a pair
count. They computed it by hand.

Observed: two different numbers are in play. The shape, "13 paths all enumerate the same 14
flags", is printable from what the census reads. The 289 was a count of flags accepted at verbs
that do not own them, and which verb owns a flag is what only a declaration supplies; once one
exists, that count is the `accepted-not-declared` total. The adopter asked for the second number
at a point where they had no declaration.

**A tooling ask, promoted as an open question.** Whether the shape line alone is worth printing is
what [the roadmap](../roadmap.md#2-version-the-contract-not-only-the-rules) now carries.

## MB-5 · Already covered

Reported: the `git+https://` move removed the `bun pm cache rm` gotcha from the round before, and
"the older guidance is now the exception rather than the default". Observed: the skill's install
step already frames that command under "Installing over `git+ssh://` instead?". No change. The
install sequence, `defaultOutput: "json"` and the four-situations block in step 5 were named as
working as documented.

## What this did not establish

- **Neither adopter's tool was run.** `mf`, `anvil` and `mb` are reported, not observed; the
  fixture in issue #45 was not executed either, because its claim is about what the report prints
  and the kit's own fixtures print the same report.
- **MB-1's two runs were not reproduced.** The checker's branch and the rule page were read; the
  adopter's before-and-after reports are quoted.
- **The `scope:` line's hedge clause has no end-to-end fixture.** A usage line naming two verbs
  or fewer is read and not asserted, because no shape rule separates it from a type union, and
  the line then says a list was seen and not confirmed; no fixture in the tree reaches that
  branch, so it is covered by reading, not by a run.

## Dispositions

| Id     | Kind           | Disposition                                                                                            |
| ------ | -------------- | ------------------------------------------------------------------------------------------------------ |
| `MF-1` | report line    | a `scope:` line under `config:` on every run, in four shapes                                           |
| `MF-2` | guide gap      | a paragraph in the one-registry guide's Verification; a clause in the surfaces guide and the skill     |
| `MF-3` | guide gap      | a sentence at `selfDescription` in the surfaces guide; a paragraph on root verbs in the registry guide |
| `MF-4` | positive       | none                                                                                                   |
| `MB-1` | checker line   | the A7 `unverified` detail says what clears it; the rule page's "How to comply" says the ordering      |
| `MB-2` | skill gap      | a paragraph in step 5 on the path source, and not committing it                                        |
| `MB-3` | mostly covered | a clause in the surfaces guide's format note; a pointer from the registry guide's step 4               |
| `MB-4` | tooling ask    | promoted to the roadmap as an open question                                                            |
| `MB-5` | covered        | none                                                                                                   |

## Disposition, verified 2026-09-06

Written after the fixes landed on develop; none is in a release yet.

- **`MF-1` actioned** in the commit that adds this report: the `scope:` line, with tests for three
  of its four shapes.
- **`MF-2`, `MF-3`, `MB-2`, `MB-3` actioned** in `03a8ba4`: the guide and skill sentences named
  above. The same commit put a dated note in each live plan or report whose claim those sentences
  supersede: the probe-plan generator plan, the declaration skeleton plan, the census verb-list
  plan, the eight-owner report, and the A7 sentence in `STANDARD.md`.
- **`MB-1` actioned** across both: the checker line in the commit that adds this report, the
  rule-page paragraph in `03a8ba4`.
- **`MB-4` promoted** into [the roadmap](../roadmap.md#2-version-the-contract-not-only-the-rules).
- **`MF-4`, `MB-5`** need nothing.

Every finding is actioned, promoted, or covered, so this report is **discharged**. Issues #45 and
#46 are closed on it.
