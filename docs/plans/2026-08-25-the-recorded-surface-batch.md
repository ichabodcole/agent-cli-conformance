---
type: plan
generated: { by: claude-opus-5, at: 2026-08-25 }
status: draft
lifecycle: live
description:
  The pinned shape of a batch of caller-recorded surfaces, and what the kit does with each field.
  Raw observation-shaped records, a declared loss residue for merged streams and truncation, an
  optional counted identity observation, and the provenance label every census line carries.
tags: [declaration, adoption, evidence, safety, probe-level]
---

# The recorded-surface batch

This pins the input format for
[recorded-surface ingestion](2026-08-24-below-the-root-before-a-second-cli.md#2a-recorded-surface-ingestion).
It is written so that somebody outside this repository can produce a batch the kit will read without
opening `src/`, and so that whoever implements the reader has no shape left to invent.

The plan argued the design. This document does not re-argue it; where a choice was already settled
there, it cites the item and states the consequence. Everything it adds is shape — key names,
required-ness, and the sentence the report prints for each state — plus the handful of things the
plan left open, which are collected at the end under
[Decided here](#decided-here-what-the-plan-left-open).

## What a batch is for

A caller runs their own tool, at whatever command paths they chose, on their own machine, and
records what came back. They hand the recording to `acc` alongside their declaration. The kit reads
those recordings with the same extraction it runs over its own probes, diffs the result against the
declaration, and prints the census with the recording labelled as the caller's.

Three boundaries hold throughout, and each one is load-bearing rather than decorative:

- **Nothing here executes anything.** Ingestion is a read over bytes the caller already has. It
  needs no effects claim, no probe warrant, and no decision page.
- **The kit classifies; the caller does not.** Inertness, readability, and whether one of the kit's
  own reads was truncated are judgements the kit makes over the record. The caller supplies what the
  tool did. There is one exception, and it is the subject of
  [the loss declaration](#the-loss-declaration) below: whether the caller's own capture was complete
  is a fact only the caller can hold, which is why it is a declared field rather than a judgement.
- **The census reaches no verdict.** No finding here feeds `conformant`, and nothing here moves an
  exit code. A fabricated batch buys a sentence, not a pass.

**The caller attests only to what the tool DID, never to what it means.** That sentence is the whole
scope of the `recorded-by-caller` label, and everything below is arranged to keep it true.

## Why raw records rather than a parsed flag set

Settled in the plan on the first consumer's review; restated here because an adopter reading only
this document will otherwise be tempted to send the tidier thing.

1. **A parsed set imports the caller's extractor into the trust chain.** Truncated reads — short
   flags dropped, a list ended early — become unfindable once the submission arrives parsed: the kit
   would be diffing the caller's parsing bugs while labelling the result the tool's own account of
   itself.
2. **Raw text preserves specimens.** The two near-miss marker phrasings this project has on record
   exist only because the wording survived to be looked at, and the decision about widening the
   matcher is still waiting on a second independent specimen. Below-root rejections are where the
   qualifier-carrying phrasings live, so they are about to arrive in volume — at exactly the moment a
   parsed submission would destroy them.
3. **It is cheaper for the caller.** Recording what happened is a shell one-liner. Parsing it
   correctly is a program, and a parsed format makes every adopter write that program.

The reading stays in the single place it happens, with its documented narrowness and its documented
error direction intact — see [`surface.ts`](../../src/acc/kit/surface.ts).

## The batch envelope

One JSON document. One document is **one session assertion**: by submitting it, the caller says
these records came from one tool on one machine in one sitting. Nothing in the bytes establishes
that, and nothing is meant to —
[the session, not the bytes, is what binds the records](2026-08-24-below-the-root-before-a-second-cli.md#2a-recorded-surface-ingestion),
and the batch is therefore the unit of trust.

```json
{
  "formatVersion": "0",
  "records": [],
  "identity": {}
}
```

| Key             | Required | What it is                                                                            |
| --------------- | -------- | ------------------------------------------------------------------------------------- |
| `formatVersion` | yes      | Exact string `"0"`. Compared by string equality; anything else is refused             |
| `records`       | yes      | The recorded invocations. At least one; order is not significant                      |
| `identity`      | no       | One record capturing what the tool says it is. See [below](#the-identity-observation) |

The reader refuses a document it half-understands: an unknown key anywhere, a missing required key,
or a `formatVersion` that is not `"0"` rejects the **whole batch**, and the run continues with no
recorded surfaces rather than with some. This is the discipline
[`declaration.ts`](../../src/acc/kit/declaration.ts) already applies to declarations, and the reason
is the same — a key silently dropped is a caller's claim silently deleted.

`formatVersion` here is the batch's own, and is not the declaration's `formatVersion`. Recorded
surfaces are an input to a run, not a field in the declaration, so nothing in this document touches
the declaration format or its ratchet.

**One batch per run.** A second batch is refused rather than merged. Merging two sessions' records at
one command path would erase the binding the batch exists to assert, and a reader that keeps them
apart needs a batch identity on every `PathSurface` before it can print which session a line rests
on. A caller with two sessions runs twice.

## One record

```json
{
  "path": ["state"],
  "argv": ["state", "--acc-not-a-flag"],
  "exitCode": 2,
  "streams": "separated",
  "stdout": "",
  "stderr": "Unknown option '--acc-not-a-flag'. Valid flags: --json --limit\n",
  "completeness": "complete",
  "recordedBy": "ci@grapevine",
  "recordedAt": "2026-08-25T09:14:02Z"
}
```

| Field          | Required       | Type                          | What the kit does with it                                                                                                             |
| -------------- | -------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `path`         | yes            | `string[]`, `[]` for the root | Keys the `PathSurface` this record contributes to, and is the path the census line names                                              |
| `argv`         | yes            | `string[]`                    | Decides whether this record is a rejection **at that path** — the kit's own filter, applied to the caller's argv                      |
| `exitCode`     | yes            | `number \| null`              | Reported beside the record; read by no part of the extraction                                                                         |
| `streams`      | yes            | `"separated" \| "merged"`     | Names which stream fields are present, and fills `SurfaceEvidence.stream` for anything read out of this record                        |
| `stdout`       | when separated | `string`                      | Read for an enumeration, second                                                                                                       |
| `stderr`       | when separated | `string`                      | Read for an enumeration, first                                                                                                        |
| `output`       | when merged    | `string`                      | Read for an enumeration; evidence from it is attributed `merged`                                                                      |
| `completeness` | no             | `"complete" \| "truncated"`   | `truncated` excludes the record from the read; absent is rendered on every census line it touches. See [below](#the-loss-declaration) |
| `recordedBy`   | yes            | non-empty `string`            | Printed with the batch. Free text: a person, a CI job, a script                                                                       |
| `recordedAt`   | yes            | RFC 3339 `string`             | Printed with the batch                                                                                                                |

`path` **must be a prefix of** `argv`. That is what makes the record self-checking: a record claiming
`path: ["state"]` whose argv begins `["send"]` is a filing mistake the reader can catch, and without
the rule the kit would have to trust a claim about which command produced the bytes while reading the
bytes for that command's flags. Tokens after the prefix are what the kit judges.

**Verbatim means verbatim.** The streams carry what the tool wrote, decoded as UTF-8, with nothing
stripped: no colour removal, no trailing-newline tidying, no reflowing. The marker match is a
substring test over the tool's own punctuation, so a helpfully cleaned capture is a different capture.

### Fields the caller must not send

The observation record the kit builds for its own probes carries more than this — see
[`record.ts`](../../src/acc/kit/record.ts) and the `Observation` type beside it. Everything absent
here is absent on purpose, and sending it is an unknown key that refuses the batch:

- **Derived facts** — the observation id, the stream digests, whether the decode was lossy. The kit
  computes these from the bytes it was given. A caller-supplied digest would certify a caller-supplied
  string against itself.
- **Kit-side judgements** — `inertness`, `purposes`, `crashed`, `timedOut`, `spawnFailed`,
  `truncated`. These are classifications, and classification is not what the caller attests to. A
  record whose argv the kit would never have sent is still readable evidence; whether it is a
  rejection at that path is the kit's call.
- **Timing** — `durationMs`, `timeToFirstByteMs`. No rule reads a batch, and a timing rule measured
  on somebody else's machine would be a measurement of their machine.
- **Environment overrides.** Nothing in the extraction reads them. The strict-key reader means a
  later version can add the field without any batch written today becoming ambiguous.

## The loss declaration

The trust argument covers a caller who lies. The harder case is a caller who is honest and whose
capture is lossy in a way the bytes do not show. Two such losses are known, and each gets a field —
this is the residue the plan says is owed to the consumer rather than assumed away.

### Stream attribution, including `merged`

`SurfaceEvidence.stream` is a published field a reader is invited to audit, and the first consumer's
own capture one-liner ends `2>&1`. A merged capture cannot fill that field honestly, so the record
says so and the kit carries `merged` through to the evidence rather than guessing `stderr`.

- `"separated"` — `stdout` and `stderr` are both present, each holding only its own stream. Either
  may be empty. Evidence is attributed to the stream it was read from, `stderr` first, exactly as the
  kit reads its own observations.
- `"merged"` — one `output` field holds both streams interleaved. Evidence read from it is attributed
  `merged`.

**This widens a published type.** `SurfaceEvidence.stream` is `"stdout" | "stderr"` today and becomes
`"stdout" | "stderr" | "merged"`. The alternative is attributing merged bytes to a stream nobody
observed them on, in the one field the type comment invites a reader to check.

**`streams` is required, and left unstated it refuses the batch.** That is the opposite of how
`completeness` and the identity observation are treated, and the difference is what the answer depends
on. Stream attribution is a property of the caller's own command line: they know whether they wrote
`2>&1`, they cannot get it wrong by guessing about the target, and a forced answer here costs them
nothing. Completeness and identity both depend on facts the caller may genuinely not have — whether a
pipe cut, whether the tool has a `--version` — and forcing an answer there is how the plan's
`DT-2` inverse gets produced: a required field answered wrongly under pressure. The rule that falls
out of the pair is worth keeping: **require an answer when it is a fact about what the caller did;
make it optional and counted when it is a fact about the target.**

### Completeness

`captureSurface` excludes the kit's own truncated observations because a list cut mid-way yields a set
short by an unknowable number of flags **and looks complete** — the one failure worse than reading
nothing. The kit knows when it truncated. It cannot know when a caller's pipe, buffer or `head` did.

| `completeness` | The kit reads the record | The census line for that path says                                                                                  |
| -------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `"complete"`   | yes                      | nothing extra — the `recorded-by-caller` label already carries who recorded it                                      |
| absent         | yes                      | `completeness unstated — a capture cut short reads here as a whole one`                                             |
| `"truncated"`  | **no**                   | `the caller recorded a truncated capture at this path, so nothing was read from it` — and the path is `no-evidence` |

**Why a declared truncation is excluded rather than read with a caveat.** It is the same judgement
`isReadableRejection` already makes about the kit's own truncated observations, applied to a fact the
kit has only because the caller stated it. A prefix that reads as a whole list turns every
`declared-not-accepted` at that path into a finding against flags the tool accepts, and a caveat on
the line does not stop a reader from acting on the findings above it.

**Why an unstated completeness is read rather than excluded.** This is the choice the plan left open,
and it cuts the other way, on two grounds. Excluding unstated captures would make almost every honest
batch unreadable on its first attempt — nobody knows their pipe did not truncate — which destroys the
specimen corpus reason 2 above exists to protect. And the reading is not silently wrong: the second
reading a `declared-not-accepted` finding already carries says _"the enumeration may also be short of a
flag the tool does accept"_, which is precisely the truncation case, printed on the finding whether or
not the caller thought about it.

**The incentive this creates, stated rather than hidden.** Declaring truncation costs the caller the
read; leaving completeness unstated does not. That gradient is the right way round only because
unstated is not free — it prints on every census line the batch touches, where the reader is deciding
what to make of that line. A caller who wants a clean census line has to attest `complete`, which is a
claim they own; a caller who does not know says nothing and the reader is told they said nothing. The
kit has no third option, because the one thing it cannot do is find out.

## The identity observation

Optional, counted, and one more observation-shaped record in the same batch: `argv ["--version"]`, or
the schema emission, captured under the same discipline as everything else. It goes in the envelope's
`identity` key rather than in `records[]`.

**Why its own key.** A record in `records[]` is filtered, read for an enumeration, and diffed at its
path. `["--version"]` is flag-shaped and would land at the root, where reading it for a marked list of
flags means parsing a help-shaped screen for an accepted set — the exact drift the surface capture
exists to get away from. A separate key makes that impossible by construction rather than by a filter
rule somebody has to keep correct.

**Why optional.** Requiring it would refuse a batch over a property of the **target**. A tool with no
`--version` cannot supply one, so a hard requirement leaves the caller choosing between fabricating a
reading and dropping the capture — and dropping it costs the specimens the marker-widening decision is
still waiting on. Once the honest-empty case has to be representable at all, a required field is
indistinguishable from an optional one left blank.

**Where this parts company with an optional `effects` claim, which is a different argument reaching
the same shape.** An absent effects claim withholds a probe, so its silence is fully priced by one
coverage total at the top of the report. An absent identity observation withholds nothing — every
recorded surface is still read and still reported. What it weakens is the tie, and only under **that
batch's** lines. So the count cannot be only a total:

- **Beside the affected paths.** Every census line resting on a batch with no identity observation
  carries `recorded-by-caller (identity unstated)`, where the reader is deciding what to make of that
  line.
- **A total as a summary of that, never a substitute for it.** `12 census lines rest on recorded
surfaces; 12 of them on a batch that states no identity.`

**What a present identity observation prints, and what it must not.** The tool's own bytes, quoted, and
no verdict:

```
identity: the target answered ["--version"] with "grapevine 0.4.1"
          (the tool's own bytes, recorded by the caller — not verified to be a version)
```

The parenthesis is required. `D1`'s detector for "reported a version" is `stdout.trim() !== ""`, and
its own standing coverage gap says _"stdout is never checked to carry a version string in either
mode"_ — both verified against
[`version-flag.ts`](../../src/acc/kit/checkers/discoverability/version-flag.ts) while writing this. A
present identity observation therefore establishes that the target said **something** under
`["--version"]`. It does not establish that what it said was a version, and it does not establish that
two batches quoting different bytes came from different builds. The report must not print it as a
verification.

**It narrows the different-binary gap; it does not close it.** A caller can still record `--version`
from one build and the rejections from another. What changes is the **category** of that error: today
it is an unstated assumption nobody can see or contradict, and afterwards it is a mistake — a wrong
claim, made in the tool's own words, inside a batch that asserts one session. Mistakes are the kind of
thing a reader can catch and a caller can be shown, which is why this is progress and why it is not a
fix.

**An empty identity is a fact, not a hole**, on the batch's side. The census records that the batch
states no identity, and says so on each affected line. It does not follow that `D1` failed: `D1` is a
verdict about the binary **the kit** ran, and an absent identity observation is a silence about the
binary **the caller** ran. Those are the same tool only if the caller's session assertion holds — which
is the gap this whole field exists to narrow rather than to close.

## Provenance on every census line

Every path result carries how its evidence was obtained:

- **`probed-by-kit`** — the kit spawned the target and recorded the rejection itself.
- **`recorded-by-caller`** — the evidence came from a batch. The label attests to the **recording**:
  these bytes came back from that argv on someone else's machine. It says nothing about what the bytes
  mean, because the kit decided that and owns being wrong about it.

This is the reported-not-verified discipline of
[the eight-owner report](../reports/2026-08-24-eight-owner-clis.md) one level down. A census line that
does not say who observed it is the defect this project is named after.

**Name it `surfaceProvenance`, not `provenance`.** `DeclarationDiff.provenance` already means
`emitted | modelled` — who wrote the declaration — and the two answer different questions about the
same line. A caller-modelled declaration diffed against kit-probed evidence and a tool-emitted
declaration diffed against caller-recorded evidence are both ordinary combinations, and one field
spelling for both would make the report unreadable at exactly the place a reader is checking who
observed what.

## The three no-evidence reasons

[`declaration.ts`](../../src/acc/kit/declaration.ts) today hardcodes one sentence for every path
without evidence — _"no flag-surface evidence for this path — the kit enumerates the root only,
because probing below it needs an effects claim nothing can yet falsify"_ — which assumes the answer.
Once a caller can supply evidence, that sentence is right only for a path nothing could reach. Three
reasons replace it, and the difference between them is what the reader would do next:

| Reason         | When                                                                                                | The line                                                                             |
| -------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `unreachable`  | The kit sent no probe there and none was possible                                                   | `the kit probes the root only, so nothing reached this path`                         |
| `no-warrant`   | The path is reachable in principle and the declaration gave no read-only claim the kit would accept | `no probe warrant for this path — the declaration claims nothing the kit may act on` |
| `not-recorded` | A batch was supplied and carries no record at this path                                             | `the caller supplied recorded surfaces and recorded nothing at this path`            |

`not-recorded` is only ever printed when a batch was supplied. With no batch, a path the kit could not
reach is `unreachable`, which is what it is.

**These are reasons a path had no surface at all. `no-evidence` is a status of a surface that exists**,
and the plan is explicit that a caller record which arrives and yields no enumeration is not a fourth
state: it lands in the statuses already built for it — `not-enumerated` when rejections were read and
none named a set, `no-evidence` when nothing readable was recorded — on a path that was looked at.

**So `no-evidence` now has two provenances**, and the sentence must render beside the
`recorded-by-caller` label rather than on its own:

- _the kit sent no probe_ — `nothing readable was recorded, so nothing was read (not a statement about
the tool)`, unchanged, under `probed-by-kit`.
- _the caller's record was unreadable_ — under `recorded-by-caller`, and the line names which: the argv
  was not a rejection the kit would read at that path, or the record declared itself truncated.

A reader who cannot tell those apart will read the second as a statement about the tool, which it is
not.

## Decided here: what the plan left open

Flagged for the reviewer. Each of these is a shape the plan did not pin, decided in this document with
its argument attached:

1. **What the report prints for an unstated loss field**, which the plan explicitly owed and did not
   settle. Unstated completeness is **read and labelled** on every census line it touches; a declared
   truncation is **not read**; `complete` prints nothing extra. Argued in
   [the loss declaration](#completeness), including the incentive gradient that creates.
2. **`streams` is required, not optional.** The plan says only that the record must be _able_ to say
   `merged`. The rule proposed here — require an answer about what the caller did, make it optional and
   counted when it is about the target — is new, and it is what keeps the exception from reading as
   inconsistency.
3. **`SurfaceEvidence.stream` gains `"merged"`.** Implied by the plan; stated here as the type change
   it is.
4. **The batch carries its own `formatVersion`, and one batch is accepted per run.**
5. **`identity` is an envelope key rather than a member of `records[]`**, to keep a `--version` capture
   out of the enumeration read by construction.
6. **`surfaceProvenance` rather than `provenance`**, to avoid colliding with `DeclarationDiff.provenance`.
7. **`path` must be a prefix of `argv`.**
8. **Timing and environment fields are excluded from the record**, with the reader's strict-key rule
   making a later addition unambiguous.

## Discharge

This document is a shape, not a home. When ingestion ships, what an adopter needs to keep — the
envelope, the record, the loss fields — belongs in the wiki as a guide, and this plan discharges. Until
then it is the only place the format is written down, and a batch that disagrees with it is the one
that is wrong.
