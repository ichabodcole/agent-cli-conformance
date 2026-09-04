---
type: report
generated: { by: claude-fable-5-1, at: 2026-09-03 }
status: stable
lifecycle: discharged
description:
  Three friction points anthill — a bun CLI with three group nodes and one flag registry — hit
  while running kit v0.1.11's census and one-registry derivation, filed as issues #38–#40 and each
  reproduced on a fixture or verified in the guides. Two need one sentence added to a guide. The
  third needs a guide sentence, leaves open whether the kit's flag reader should infer an empty
  flag set from a subcommand list, and finds one sentence in STANDARD.md that anthill's own change
  has made false.
tags: [adoption, trial, evidence, consumer-signal, conformance, docs]
subject:
  GitHub issues #38, #39 and #40, the adopter reports from anthill, read against the kit and the
  guides they name
examined:
  issues #38–#40 as filed 2026-09-03; kit and docs at v0.1.11 (16bb76a on develop); an
  anthill-shaped fixture built for this report and run through `acc probe-plan` and `acc check
  --recorded-surfaces`, from its own directory on macOS, bun 1.4.0
---

# The anthill adopter report

An agent took anthill's `plugin/scripts/anthill/cli.ts` through the census and the one-registry
derivation at kit v0.1.11 and filed three issues —
[#38](https://github.com/ichabodcole/agent-cli-conformance/issues/38),
[#39](https://github.com/ichabodcole/agent-cli-conformance/issues/39) and
[#40](https://github.com/ichabodcole/agent-cli-conformance/issues/40) — every one in category 3
of [`REPORTING.md`](../../skills/acc/REPORTING.md): it worked, and they wanted more. This report
records the three against the tree so each has a disposition. It is the fifth run in the trials
record and the second in one day; [the glamour adopter report](./2026-09-03-the-glamour-adopter-report.md)
holds the fourth. Its `GL-1` and `AN-3` below are one defect class: `GL-1` met it at the root,
`AN-3` at group nodes below the root. anthill is also the tool
[the first drift trial](./2026-08-24-first-drift-trial-anthill-manifest.md) measured, so this is
its second appearance.

Register, as in the earlier trial reports: **reported** is the adopter's own account, quoted;
**observed** is a command run for this report, with its output; **inferred** is marked ours.

Finding ids are prefixed `AN-`.

## How the behavioural claims were checked

Two of the three issues quote census output. Rather than take the quotations, this report built
an anthill-shaped fixture: a bun script whose root accepts `--format`, `--help`, `-h`, `--version`
and `-v`, with two group nodes below it, `comms` holding five subcommands and `info` two, and one
leaf under each that takes `--json`. Both group nodes answer an unknown flag with their
subcommands in `choices`. The declaration has five paths — the root, the two group nodes and the
two leaves — and declares `-h` and `-v` as rows of their own, as the one-registry guide's emitter
does. The fixture's surfaces were recorded with the capture script that `acc probe-plan` writes
and handed back with `--recorded-surfaces`. An environment switch chose whether the root
rejection named the long spellings only or the short ones too. The fixture stands in for the
shapes the issues describe, not for anthill.

## AN-1 · A declared alias reads `declared-not-accepted` unless the rejection names it

Reported: anthill's emitted declaration carries `--help` and `-h` as separate rows at `path: []`,
because v0 has no alias field. With a root rejection naming long spellings only, the census
reported `declared-not-accepted -h at (root)` and the same for `-v`, for flags the parser accepts.
Naming both spellings in the rejection gave `24 of 27 declared command paths compared; 0
disagreements`. They ask either for an alias field in the declaration or for the guide to say
plainly that a declared alias the rejection does not name will read as a disagreement.

Observed, on the fixture with the root rejection naming `--format, --help, --version`:

```
enumerated 3 flags at the root: --format --help --version
3 of 5 declared command paths compared; 2 disagreements (modelled declaration)
declared-not-accepted  -h at (root) [probed-by-kit]
declared-not-accepted  -v at (root) [probed-by-kit]
```

With the rejection naming both spellings, `enumerated 5 flags at the root` and `0 disagreements`.
The enumeration is the only evidence that can confirm a declared alias row: the A1 checker's own
limit line says `only long flags are probed so a short flag or a cluster of short flags is not`.

Observed, in the guides: the section
[Aliases cost evidence, not just rows](../wiki/guides/how-to-derive-your-surface-from-one-registry.md#aliases-cost-evidence-not-just-rows)
is about **verb** aliases as extra command rows. The flag-alias case is carried only by the
interceptor array in step 5, which declares and enumerates one list, and the guide never states
the rule that array embodies. No guide says that only the rejection can confirm a declared short
spelling.

**A guide gap and an open question.** The sentence the adopter asked for belongs in the
one-registry guide beside the interceptor array. The alias field is a v0 format change and is not
answered here; it joins the open question about what the declaration promises that
[the glamour report](./2026-09-03-the-glamour-adopter-report.md#gl-3--a-promised-signal-for-the-diff-ran-and-found-n-disagreements)
already holds. The adopter's own reading — that naming both spellings is the better tool anyway —
is the standard's position on rejections: return more information rather than less.

## AN-2 · An in-house census must probe the root

Reported: the surfaces guide says **"Omit the root,"** and that is right for a batch handed to
`acc`. anthill also built the census the standard tells adopters to build first, as a repo-owned
commit gate with no kit in the loop, and following the guide literally there would have left the
root out of the only census that runs on every commit. Their gate probes 26 paths, not 25, and a
comment in that test file says why. They ask for one sentence after "Omit the root" saying that an
in-house census should probe the root too.

Observed: the guide's instruction is scoped to the kit's own root probe and says nothing about a
census built without the kit. [`STANDARD.md`](../../STANDARD.md) tells adopters to build that
census first and, in its status table, describes the census as "**Built at the root**", meaning in
the kit's own root probe. Nothing connects the two. The precedent the adopter cites is real:
[the magpie trial](./2026-08-26-the-magpie-trial.md) records a root-level `--version` that the
per-path parser refused and the census could not see.

**A guide gap.** The adopter's drafted sentence is correct as written and fits after "Omit the
root." The standard's census paragraph can carry the same caveat.

## AN-3 · A group node naming its subcommands in `choices` is never compared

Reported: following the standard's recommendation that a group node refusing a flag should name
its subcommands, anthill's three group nodes now do, in the envelope's `choices`. The census read
each of the three the same way, quoted here for `comms`: `did not enumerate … a choices list of 5
was present and its members are not flag-shaped … a set of something else, not of flags`, and
compared `24 of 27`. They expected the paths
compared: a rejection that says "this command takes no flags; subcommands: …" has answered the
flag question with an empty set. They offer a theory, not insisted on: when every member of the
non-flag key is a declared subcommand of the path, read it as `enumerated-none` and compare.

Observed, on the fixture:

```
did not enumerate at comms; 1 rejection read, none named a set of flags (NOT a tool with no flags); a `choices` list of 5 was present and its members are not flag-shaped ("follow", "positions", "read", "send", …) — a set of something else, not of flags
3 of 5 declared command paths compared; 2 disagreements (modelled declaration)
NOT COMPARED: comms — did not enumerate at comms; … [recorded-by-caller]
NOT COMPARED: info — did not enumerate at info; … [recorded-by-caller]
```

Observed, with one key added to the group nodes' rejection — `"validFlags": []` beside the
unchanged `choices`:

```
stated an empty set of flags at comms under `validFlags`; 1 rejection read, and the set the target named held nothing (the target's own answer, not silence read as one); a `choices` list of 5 was present and its members are not flag-shaped ("follow", "positions", "read", "send", …) — a set of something else, not of flags
5 of 5 declared command paths compared; 0 disagreements (modelled declaration)
```

Below the root an empty recognised flag key is read as the target's own answer, and the path is
compared. The source of the kit's flag reader — the code that reads a rejection for the set of
flags it names — says why a verb list alone is not read that way: the flag-shape test on the
members is what carries the claim that a set is a set of flags, and a list of verbs fails it.
Reading verbs as "no flags" would be the kit inferring an empty flag set from a statement about
something else, which is the inference `enumerated-none` exists to refuse.

Observed, in the guides: the surfaces guide documents the empty-set answer for the root
(`"validFlags": []`) and for a recorded path (`"choices": []`). It does not say that a group node
naming its subcommands should state its empty flag set beside them, and the standard's group-node
section says to name the subcommands inline without saying under which key, or that a flag key
must accompany them. The adopter's issue attributes the "empty-set trap" to
[the group-command candidate](./2026-08-26-the-group-command-candidate.md); that report does not
mention it. The two passages that do are in the surfaces guide.

Inferred, ours: this is the same defect class as `GL-1`, reached from below the root. In both, the
tool answers the unknown-flag probe with its verbs, so the flag reader has no set of flags to read
— and the standard's recommendation and
[the error-envelope page](../wiki/concepts/error-envelope.md)'s `choices` guidance together invite
exactly that answer. `acc`'s own root does the same and never enumerates in its self-check. Two
adopters hit it in one day, at four paths: glamour's root and anthill's three group nodes.

**Three dispositions, of three kinds:**

- **A guide gap.** One sentence in the surfaces guide and one in the standard's group-node section:
  a group node that names its subcommands in `choices` should also state its empty flag set under a
  flag key, and then it compares like any other path.
- **A kit question.** The adopter's theory — verbs that are all declared subcommands of the path read
  as `enumerated-none` for flags, and optionally checked against `commands[].path` one level down —
  would give the census its first verb-level check. It also moves the reader from quoting the tool
  to inferring from the declaration. Whether that is worth it is a design decision, promoted here as
  an open question, not answered.
- **A sentence in the standard now false.** The group-node section says, "measured in this tree,"
  that `docker image`, `kubectl config` and `anthill comms` print a pointer rather than a set. The
  issue's own output shows `anthill comms` now names a set. The survey's tally of which nodes name
  a set needs re-measuring against current anthill, and the sentence rewriting.

## What this did not establish

- **anthill itself was not run.** Every observed output is from the fixture; the `24 of 27` and
  `26 paths` figures are quoted from the issues.
- **The `validFlags: []` route was not tried on anthill.** It compares `5 of 5` on the fixture. The
  adopter can confirm `27 of 27` on the real tool.
- **The reader theory was not prototyped.** Its cost and its interaction with the root, where
  `choices` is already read for verbs, are not measured.
- **The `docker` and `kubectl` entries in the standard's survey sentence were not re-measured for
  this report**; only the anthill entry is shown false. (The branch that rewrote the sentence
  re-measured all six nodes on 2026-09-03; the vendor figures held.)

## Dispositions

| Id     | Kind                                   | Proposed disposition                                                                                                                  |
| ------ | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `AN-1` | guide gap + open question              | one sentence beside the interceptor array in the one-registry guide; the alias field joins the open question on what v0 promises      |
| `AN-2` | guide gap                              | the adopter's sentence after "Omit the root"; the same caveat on the standard's census paragraph                                      |
| `AN-3` | guide gap + kit question + stale claim | the empty-flag-key sentence in the surfaces guide and the standard; the reader theory as an open question; re-measure `anthill comms` |

None of these is actioned by this report. The three guide gaps share the property the glamour
report found: in each, the fact was already carried somewhere — in an example array, in a passage
about the root, in the flag reader's source — and not stated in the page the adopter had open.
`AN-3` adds a second property: the standard recommends a shape for the rejection, and the kit
cannot compare a path that answers in that shape unless the tool also does something no page tells
it to do.

## Disposition, verified 2026-09-04

Written after the fixes shipped; the finding text above is unmodified except where a sentence
says so.

- **`AN-1` guide gap actioned** in `6216b93`, released as v0.1.12: the paragraph beside the
  interceptor array in the one-registry guide. Its warrant is the enumeration alone, not the
  probe set — the round that established that is in the commit history. **The alias field is promoted** on 2026-09-04 into
  [the roadmap](../roadmap.md#2-version-the-contract-not-only-the-rules), beside the glamour
  stable-column question, as an ask against the promised surface.
- **`AN-2` actioned** in the same commit: the surfaces guide's step 1 and the standard's census
  paragraph. Two sentences in the standard that said the kit could not yet accept below-root
  evidence were found stale on the way and corrected in the same commit.
- **`AN-3` guide gap actioned** in the same commit: the empty-flag-key sentence in the surfaces
  guide and the standard's group-node section. **The kit question is promoted** into
  [the census learns to read a verb list](../plans/2026-09-03-the-census-learns-to-read-a-verb-list.md),
  a sketch of the reader change with its costs and open questions; nothing in it is built. **The
  stale survey sentence is actioned**: re-measured on all six nodes on 2026-09-03.
- Issues #38, #39 and #40 are closed on the guide fixes; #40's reply asks anthill to confirm
  `27 of 27` with the key.

With that promotion this report is **discharged**: every finding is actioned, promoted, or
declined.
