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
  "records": [
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
  ],
  "identity": {
    "argv": ["--version"],
    "exitCode": 0,
    "streams": "separated",
    "stdout": "grapevine 0.4.1\n",
    "stderr": "",
    "recordedBy": "ci@grapevine",
    "recordedAt": "2026-08-25T09:14:02Z"
  }
}
```

That skeleton is a **valid batch**, and it is written out in full because it is the one JSON an
adopter will copy. An empty `records` array is not a batch, and `identity` is a record rather than a
placeholder object.

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

### The order the checks run in, which is part of the contract

`formatVersion` is checked **before** the unknown-key sweep, and before anything else in the
document. That is not tidiness: a document from a future major may legitimately carry keys this
reader has never heard of, and reporting those instead of the version sends the author to fix the
wrong thing. `declaration.ts:378-394` already does it in that order for exactly this reason, and a
reader that reverses it will send the first adopter of format `"1"` on a key hunt.

1. The top level is a JSON object.
2. `formatVersion` is present, is a string, and is `"0"`.
3. Required keys present; no unknown key anywhere in the document.
4. Per-record shape: types, `path` a prefix of `argv`, and the cross-field rules below.

**The cross-field rules, because the unknown-key sweep does not catch them.** `stdout` and `output`
are both _known_ keys, so a record that carries the wrong one for its `streams` value passes step 3
untouched. Each of these refuses the whole batch:

- `streams: "separated"` and no `stdout`, or no `stderr`. Both are required; either may be `""`.
- `streams: "separated"` and an `output` key present.
- `streams: "merged"` and no `output`.
- `streams: "merged"` and a `stdout` or `stderr` key present.

A record that both merges and separates is not a record with a spare field in it — it is two
incompatible claims about one capture, and reading it either way means the reader picking which of
the caller's statements to believe. Refusing is the only answer that does not invent one.

### How a batch reaches a run

`acc check <target> --recorded-surfaces <file>`. A **file path**, not stdin, given at most once — a
second `--recorded-surfaces` is refused rather than merged, which is
[one batch per run](#the-batch-envelope) enforced at the flag.

**That refusal is new behaviour and needs code, and no precedent in this CLI supplies it.** The CLI
is commander-based, and a repeated string option is **last-wins** today: `--declaration a.json
--declaration b.json` silently reads `b.json`. So refusing a second `--recorded-surfaces` is a
deliberate departure, listed under
[what this requires](#what-this-requires-in-the-tree-beyond-reading-the-batch) rather than assumed.
Last-wins would be the wrong default here for the reason the whole section gives: two batches are two
session assertions, and silently keeping one of them is a caller's claim deleted without a word.

**The plural in the flag name is the file's contents, not a repeatable flag.** One file holds a batch
of surfaces, so `--recorded-surfaces` reads correctly for what it points at; it is the only plural
flag name in `spec.ts`, which is why the sentence above has to say the flag is given once.

This follows `--declaration <file>` ([`src/acc/spec.ts:256`](../../src/acc/spec.ts)) deliberately,
and for that flag's own stated reason: a declaration is falsifiable and a config is a choice, and
they have different authors and different lifetimes. A recorded batch is the same kind of thing as a
declaration — somebody's account of what happened, handed to the kit to be diffed — so it arrives the
same way.

**It is not an `acc.config.json` key, and `TOP_LEVEL_KEYS` does not move.** The parent plan's
[must-not-regress section](2026-08-24-below-the-root-before-a-second-cli.md#what-must-not-regress)
names the trap: adding a key that describes the target's own shape to `TOP_LEVEL_KEYS` is the stated
trigger for the config-refusal gate, and tripping it would invalidate the frame the eight-owner
measurement was taken in — all eight runs carry `configSource.origin: "none"`. A batch is per-run
evidence anyway, not a project setting; a repository that committed one would be committing one
machine's afternoon.

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

| Field          | Required       | Type                        | What the kit does with it                                                                                                                                                      |
| -------------- | -------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `path`         | yes            | non-empty `string[]`        | Keys the `PathSurface` this record contributes to, and is the path the census line names. `[]` [refuses the batch](#the-root-is-the-kits-and-a-path--record-refuses-the-batch) |
| `argv`         | yes            | `string[]`                  | Decides whether this record is a rejection **at that path** — the kit's own filter, applied to the caller's argv                                                               |
| `exitCode`     | yes            | `number \| null`            | Reported beside the record; read by no part of the extraction                                                                                                                  |
| `streams`      | yes            | `"separated" \| "merged"`   | Names which stream fields are present, and fills `SurfaceEvidence.stream` for anything read out of this record                                                                 |
| `stdout`       | when separated | `string`                    | Read for an enumeration, second                                                                                                                                                |
| `stderr`       | when separated | `string`                    | Read for an enumeration, first                                                                                                                                                 |
| `output`       | when merged    | `string`                    | Read for an enumeration; evidence from it is attributed `merged`                                                                                                               |
| `completeness` | no             | `"complete" \| "truncated"` | `truncated` narrows what the record is read for; absent is rendered on every census line it touches. See [below](#the-loss-declaration)                                        |
| `recordedBy`   | yes            | non-empty `string`          | Printed with the batch. Free text: a person, a CI job, a script                                                                                                                |
| `recordedAt`   | yes            | RFC 3339 `string`           | Printed with the batch                                                                                                                                                         |

`path` **must be a prefix of** `argv`. That is what makes the record self-checking: a record claiming
`path: ["state"]` whose argv begins `["send"]` is a filing mistake the reader can catch, and without
the rule the kit would have to trust a claim about which command produced the bytes while reading the
bytes for that command's flags. Tokens after the prefix are what the kit judges.

**Verbatim means verbatim.** The streams carry what the tool wrote, decoded as UTF-8, with nothing
stripped: no colour removal, no trailing-newline tidying, no reflowing. The marker match is a
substring test over the tool's own punctuation, so a helpfully cleaned capture is a different capture.

### Which records the kit will read, stated rather than left to be discovered

The kit classifies; the caller does not — so whether a record is a rejection **at its path** is the
kit's call. The criteria are written out here in full because they are **not** what
[`isReadableRejection`](../../src/acc/kit/surface.ts) applies today, and an implementer who reuses
that function verbatim will read records this document tells the caller are refused. Its shape test
is `args.length > 0 && args.every((a) => a.startsWith("-"))` (`surface.ts:354`), which admits `-1`
and `-abc`; the flag-shape patterns `LONG` and `SHORT` are applied only to list **members** inside
`flagsAfter`, never to the probe argv. Rule 3 below is the stricter rule and the right one — it is a
change the tree owes, listed under
[what this requires](#what-this-requires-in-the-tree-beyond-reading-the-batch).

The other half of the root filter has no counterpart here at all: `isReadableRejection` gates on the
**inertness class**, and inertness is a kit-side judgement over a probe the kit sent — a
[field the caller must not send](#fields-the-caller-must-not-send). For a record, these three rules
are the whole test. Without them written down, an adopter captures in good faith and gets a silent
`no-evidence` with nothing to fix. All three must hold:

1. **No `--` anywhere in `argv`.** A bare terminator makes everything after it data (`A6`), so the
   rejection it provokes on a target that honours it is about a **positional**, not about a flag.
   `state -- --acc-not-a-flag` is therefore not read, however flag-shaped the sentinel looks.
2. **At least one token after the path prefix.** A bare `state` is an invocation, not a rejection of
   anything.
3. **Every token after the prefix is flag-shaped** — `--long-name` or a single-letter `-x`. Not
   `-1` (a digit opens no list), not `-abc` (a bundle on one parser and an old-style long name on
   another, and deciding which would be reading what one of the target's words means).
   A record that passes all three is **read**. What it is read **for** is then narrowed by its own
   `completeness` — see [the loss declaration](#completeness) — which is a separate question and never
   turns a readable record into an unreadable one.

Rule 3 is what makes a record evidence about **that path** and not about a deeper one: a token that
is not flag-shaped is a verb or a positional, and the set a tool names when refusing one of those
belongs somewhere else. So a rejection provoked by a bad positional — `state notacommand` — is not
read, and neither is `state --json --acc-not-a-flag`, because `--json` is a second flag the kit
cannot tell from the sentinel and the set that comes back may be the one that flag opened.

**A record that fails any of the three is not read, and the report is not silent about it.** It
contributes nothing to the path's surface, it does not count toward `probesRead`, and if no other
record at that path was read the path is `no-evidence` under `recorded-by-caller` with the line naming
which rule it missed.

**The sentinel spelling is load-bearing, which is the one thing that will bite an adopter twice.**
`readStream` refuses any candidate set that contains a token the record's own argv sent — with any
`=value` stripped, so `--format=json` is compared as `--format`. It is the cheapest available guard
against an error document echoing the caller's input back as the tool's accepted set, and it needs no
inference about the target at all. The cost is that a sentinel the tool genuinely lists **erases the
whole read**: capture with `--acc-not-a-flag`, or with something else no tool would ever accept, and
never with a plausible-looking flag.

### Several records at one path

**Permitted, and the kit unions them.** `captureSurface` is built for exactly this — it reads every
readable rejection, unions the sets it finds, and publishes `consistent: false` when two rejections
name different sets, because two rejections legitimately can. The duplicate-path refusal in
`declaration.ts:424` is not a counter-example: there a path is the **key the diff is performed on**,
so a second entry makes one of the two unreachable. Here a path is a bucket evidence accumulates in.

The path's surface is then derived from what was actually read, not from what was submitted:

| The records at that path                         | The path's `Surface`                                                                             |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| at least one **yielded flags**                   | `enumerated`, `flags` the union, `consistent` false if the sets disagreed — see the caveat below |
| at least one was read, none yielded flags        | `not-enumerated`, with `probesRead` counting the records read                                    |
| none was read — unreadable, or excluded, or both | `no-evidence`                                                                                    |

**Yielded flags** means _after_ the truncation discard clause has run. A record whose list that
clause empties was read and named nothing, so it lands in row 2 and not in row 1 — the two halves are
written to meet, because when they did not, a truncated one-flag list published `enumerated` with an
empty set. And `consistent` is **absent** at a path where any read record declared itself
`truncated`. Both are argued in [the loss declaration](#completeness).

That is what makes the mixed case behave. One truncated record and one complete record at `state` is
**not** `no-evidence`: the complete one is read, and the truncated one contributes what
[the loss declaration](#completeness) says it may. A path only falls to `no-evidence` when nothing at
it survived to be read.

### The root is the kit's, and a `path: []` record refuses the batch

The kit **always** probes the root. `captureSurface` yields a `path: []` surface on every run, with
some status, and it does so before any batch is opened. So a batch carrying a `path: []` record is
not an edge case, it is the likely one — the caller sweeps their tool from the top and files the root
capture alongside the rest — and it produces one path result with two provenances, which
`surfaceProvenance` cannot express.

**So: omit the root capture from the batch.** Sweep the tool from the top if that is how you work,
then file every record below the root and leave the `path: []` one out. That sentence is the one an
adopter needs, and the rest of this section is why it is the answer rather than a preference — a
batch that keeps the root capture loses its `["state"]` records too, because the refusal is of the
whole batch.

**Decided: a record with an empty `path` refuses the whole batch, and the message says the root is
the one path the kit reads for itself, and to resubmit without it.** Three things settle it. Merging the two would put the kit's
flags and the caller's in one `flags` array behind one `consistent` boolean, and `consistent: false`
would then be unable to say whether the **tool** disagreed with itself or the caller's machine
disagreed with ours — the census line's whole job. Adding a third `surfaceProvenance` value for the
mixed case makes the label unactionable at the exact place a reader consults it. And silently
dropping the record is the thing this document refuses everywhere else: a caller's claim deleted
without a word.

**What it costs, stated — and it is more than an earlier draft of this section admitted.** The cost
is not confined to a kit root read of `no-evidence`. It bites wherever the caller's root capture
would have carried evidence the kit's own did not get, and the headline target is exactly that case:
bounty _"consumes a root `--nope` as an unknown verb with a signpost, so it never enumerates at the
only path the kit probes"_
([the grapevine report](../reports/2026-08-24-first-outside-application-grapevine.md)) — a readable
rejection naming no set, so `not-enumerated`, not `no-evidence`. A caller whose own root spelling
does elicit a list is refused it.

The kit's root read is bounded by **its own sentinel spelling**, and this document says elsewhere
that _"a record whose argv the kit would never have sent is still readable evidence"_. So _the kit
can obtain the root first-hand by construction_ conflates **probed the path** with **got the evidence
available there**, and it conflates them on the one target this feature is built for.

Accepted anyway, with the price named: the gain is that every census line names one observer, and a
mixed root line is the one place a `consistent: false` could not say whether the **tool** disagreed
with itself or the caller's machine disagreed with ours. A caller who believes the kit's root read is
wrong has a better move than a batch, which is to say so with the bytes attached — a report finding
about the sentinel or the matcher, which is how both near-miss phrasings arrived.

**`SG-8` is not broken by this.** It needs a record at `path: ["state"]` and nothing at the root, so
the refusal does not touch it. What the refusal costs is the root-list case above, which is a
different finding.

### Fields the caller must not send

The observation record the kit builds for its own probes carries more than this — see
[`record.ts`](../../src/acc/kit/record.ts) and the `Observation` type beside it. Everything absent
here is absent on purpose, and sending it is an unknown key that refuses the batch:

- **Derived facts** — the observation id, the stream digests, whether the decode was lossy. The kit
  computes these from the bytes it was given. A caller-supplied digest would certify a caller-supplied
  string against itself.
- **Kit-side judgements** — `inertness`, `purposes`, `crashed`, `timedOut`, `spawnFailed`,
  `truncated`. These are classifications, and classification is not what the caller attests to. The
  `truncated` named here is the **`Observation` field**, which is the kit's judgement about its own
  read hitting the output ceiling; it is not
  [`completeness: "truncated"`](#completeness), which is the caller's own required vocabulary and the
  one loss the caller does attest to. Two different words would have been kinder and the kit's is
  already published; the record's field is `completeness`, and a record carrying a key spelled
  `truncated` is refused. A
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

`SurfaceEvidence.stream` is a published field on an exported interface, sitting beside the two fields
— `shape` and `matched` — whose comments tell a reader to audit the match rather than trust it. The
first consumer's own capture one-liner ends `2>&1`. A merged capture cannot fill `stream` honestly,
so the record says so and the kit carries `merged` through to the evidence rather than guessing
`stderr`.

- `"separated"` — `stdout` and `stderr` are both present, each holding only its own stream. Either
  may be empty. Evidence is attributed to the stream it was read from, `stderr` first, exactly as the
  kit reads its own observations.
- `"merged"` — one `output` field holds both streams interleaved. Evidence read from it is attributed
  `merged`.

**This widens a published type.** `SurfaceEvidence.stream` is `"stdout" | "stderr"` today and becomes
`"stdout" | "stderr" | "merged"`. The alternative is attributing merged bytes to a stream nobody
observed them on, in a section labelled as the target's own words.

**`streams` is required, and left unstated it refuses the batch.** That is the opposite of how
`completeness` and the identity observation are treated, and the difference is what the answer depends
on. Stream attribution is a property of the caller's own command line: they know whether they wrote
`2>&1`, they cannot get it wrong by guessing, and a forced answer here costs them nothing.
Completeness and identity both depend on facts the caller may genuinely not have — whether a pipe
cut, whether the tool has a `--version` — and forcing an answer there is how the plan's `DT-2`
inverse gets produced: a required field answered wrongly under pressure.

**The rule is knowability, not aboutness:** require an answer when the caller holds the fact by
construction at the moment of answering and cannot get it wrong by guessing; make it optional and
counted when answering would mean guessing at something they may genuinely not know. One field sits
between the two and takes a third shape — **required, with `null` a permitted answer** — for the case
where the fact exists but the caller's own pipeline may not have kept it.

An earlier draft of this document stated the rule as _about what the caller did_ versus _about the
target_, and that version is false against this document's own field table, which is why it is
written out here rather than asserted:

| Field             | About      | Knowable by construction                     | Required      |
| ----------------- | ---------- | -------------------------------------------- | ------------- |
| `path`, `argv`    | the caller | yes — they typed it                          | yes           |
| `streams`         | the caller | yes — they wrote the redirection or did not  | yes           |
| the stream bodies | the target | yes — the capture **is** those bytes         | yes           |
| `exitCode`        | the target | **not always** — a pipeline can discard `$?` | yes, nullable |
| `recordedBy`      | the caller | yes — they are the recorder                  | yes           |
| `recordedAt`      | the caller | yes — at the moment they record it           | yes           |
| `completeness`    | the caller | **no** — nothing tells you your pipe cut     | no            |
| `identity`        | the target | **no** — the tool may have no `--version`    | no            |

Two rows need their own sentence, because each is where the rule was quietly failing.

**`exitCode` is required and its value may be `null`, which is why the type is `number | null`.** It
is not bytes, and the reference capture shape this document itself uses — `… 2>&1 | tee` — is exactly
the pipeline that loses `$?`. A caller who did not keep the exit status holds nothing to report, and
`null` is the honest answer; a required key with a nullable value asks for an answer without forcing
a fabricated number. Nothing in the extraction reads it, so `null` costs the read nothing.

**`recordedAt` passes knowability, but only because the rule is about guessing and not about
lying.** A caller stamping last week's capture with today's time gets it wrong — but they are
misreporting a fact they hold, not guessing at one they do not, and no required field survives a
caller who does that. The condition the rule states is _cannot get it wrong by construction at the
moment of answering_: the recorder knows when it is recording. `completeness` fails that condition
because nothing at the moment of answering tells you your pipe cut; `recordedAt` does not.

Aboutness gets three of these rows backwards: the exit code and the stream bodies are facts about the
**target** and are required, and completeness is a fact about the caller's **own pipe** and is
optional. Knowability gets all five, and it is what the argument above was actually resting on the
whole time — _"they cannot get it wrong"_, _"facts the caller may genuinely not have"_. The
distinction matters beyond the tidiness, because this pair is what the wiki guide will inherit:
required-ness here is a claim about what a caller can answer honestly under time pressure, and
nothing else.

### Completeness

`captureSurface` excludes the kit's own truncated observations because a list cut mid-way yields a set
short by an unknowable number of flags **and looks complete** — the one failure worse than reading
nothing. The kit knows when it truncated. It cannot know when a caller's pipe, buffer or `head` did.

**`truncated` means bytes lost from the END of the capture, and nothing else.** Every clause below
rests on that and on nothing else: the severed token is the **last** one in the stream, so if it is
flag-shaped it is the final member of the list, and if it is not, `flagsAfter` stops before it. An
interior elision defeats the whole argument — `Valid flags: --forma--json --limit` is a `LONG`-shaped
fabrication that is **not** last, so the clause below would discard the real `--limit` and keep the
fake. So a harness that elides from the middle, or that stitches a capture out of pieces, **must not
send `completeness: "truncated"`, and must not send the record at all**: no value of this field
describes an interior loss, and unstated says something different and false. Open question, recorded
rather than built: whether a later format wants a third value for an interior elision. Nothing in the
corpus has produced one, and inventing the state before the case exists is how this section acquired
its defects.

| `completeness` | What the kit reads the record for                                            | The census line for that path says                                                                      |
| -------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `"complete"`   | both finding directions                                                      | nothing extra — the `recorded-by-caller` label already carries who recorded it                          |
| absent         | both finding directions                                                      | `completeness unstated — a capture cut short reads here as a whole one`                                 |
| `"truncated"`  | **presence only**, and the last token of each `prose-marker` list is dropped | `the caller recorded a truncated capture at this path, so it was read only for flags the tool did name` |

A path is `no-evidence` only when **no** record at it survived to be read — see
[several records at one path](#several-records-at-one-path). A truncated record no longer empties a
path on its own, and never did empty one that also carried a complete record.

**Why a declared truncation is read in one direction rather than dropped.** Truncation makes an
enumeration **short, not wrong**: every flag that did survive the cut is a flag the tool named in its
own refusal. The two finding directions are not equally damaged by that, and treating them as if they
were throws away evidence the caller paid for:

- `declared-not-accepted` — declared, and **absent** from the enumeration. Rests on absence, which is
  exactly what a short list fakes. **Suppressed** at a path where any read record declared itself
  truncated.
- `accepted-not-declared` — enumerated, and absent from the declaration. Rests on **presence**.
  Truncation cannot manufacture a flag the tool never printed. **Read.**
- `refused-but-enumerated` — declared refused, and present in the enumeration. Presence again.
  **Read.**

**The counter-argument, which is real.** A cut is a byte offset, not a token boundary, so it can
sever a flag mid-name: `--limit` arrives as `--limi`, which satisfies `LONG` and lands in the set as a
flag the tool never accepted — a false `accepted-not-declared` in the one direction just declared
sound. It is bounded, though, and bounded in a way the reader can act on: the loss is at the **end** of
the stream, and `flagsAfter` stops at the first token that is not flag-shaped, so **only the final
token** of a list read out of prose can be a fragment. So the rule carries its own clause: **discard
the last token of every `prose-marker` enumeration read from a record declared `truncated`.** That
drops a genuine flag whenever the cut happened to land on a boundary, which is the error direction
this project takes everywhere else — finding less leaves the previous state of knowledge, while a
fabricated flag puts a word in the target's mouth in a section labelled as its own.

**The clause does not touch a `json-field` list, and does not need to.** That shape comes from
`keyedSets` over a document `parsesWhole` accepted, and a document cut at the end does not parse —
`readStream` falls through to the prose scan over the same raw text, where the clause does apply. So
a `json-field` list is taken whole: the bytes that closed the document are the proof the document is
not what was cut. Under `separated` this is also what makes the mixed capture behave — a record whose
stdout was cut while its stderr carries complete JSON is read from stderr, first and whole, and no
real flag is discarded out of an intact list because the record as a whole was declared lossy.

**A read that yields no flags is `not-enumerated`, never `enumerated` with an empty set.** The
commonest truncation shape is a cut landing just after the first flag, and the clause reduces that
one-token list to nothing. A record the clause empties **did not yield an enumeration**: it counts as
read, it appears in `probesRead`, it contributes no `SurfaceEvidence` and no flags, and it cannot
satisfy row 1 of [the path table](#several-records-at-one-path). That is not a courtesy. `flags` is
documented absent rather than empty (`surface.ts:100-110`), `SurfaceStatus` exists to keep _"it did
not say"_ apart from _"it accepts nothing"_ (`surface.ts:50-56`), and `surfaceSummary` would
otherwise print `enumerated 0 flags` — the exact false and confident-sounding claim the type was
built to prevent.

**`consistent` is absent at a path where any read record declared itself `truncated`.** Two
enumerations disagree meaningfully only when both are whole. A list this document deliberately
shortened will differ from a complete one at the same path, and publishing `consistent: false` for
that blames the tool for our own discard — the same unattributable `consistent` the
[`path: []` refusal](#the-root-is-the-kits-and-a-path--record-refuses-the-batch) exists to prevent,
refused at the root and admitted everywhere else if the field were published here. The type already
allows it: `consistent?` is optional, exactly as `flags?` is. The census line for such a path says
the comparison was not made and why. Open question, recorded rather than built: comparing only among
the non-truncated records at a path would keep a real disagreement visible, and it needs its own rule
for the path where every set came from a truncated record — case analysis this round is deliberately
not shipping.

**Why an unstated completeness is read in both directions rather than excluded.** This is the choice
the plan left open, and it cuts the other way. Excluding unstated captures would make almost every
honest batch unreadable on its first attempt — nobody knows their pipe did not truncate — which
destroys the specimen corpus reason 2 above exists to protect. What the reading is **not** is silently
wrong in only one direction, and the document owes an accurate account of the mitigation rather than a
flattering one:

- The sentence a `declared-not-accepted` finding already carries — _"the enumeration may also be short
  of a flag the tool does accept"_ ([`declaration.ts:490`](../../src/acc/kit/declaration.ts)) — does
  cover the corrupt direction. It is the **second** reading under `emitted` provenance and the
  **first** under `modelled`, and modelled-below-the-root is this feature's own headline use case:
  `SG-8` runs a modelled declaration against a recorded surface. So on the run this is built for, that
  sentence leads.
- It covers **one** direction. A truncated prefix also silently **omits** `accepted-not-declared`
  findings for every flag past the cut, and no finding is printed to carry a caveat on, because the
  whole point is that the finding never appears. Nothing in the report can recover it. The unstated
  label on the census line is the only thing standing in for it, which is why that label prints on
  every line the batch touches rather than once at the top.

**The incentive this creates, stated rather than hidden.** The gradient that needed fixing was never
`complete` versus unstated — attesting `complete` is a claim the caller owns and the reader can hold
them to. It was `truncated` versus **unstated**, where unstated strictly dominated: an honest caller
who knew their capture was cut got less out of the kit than one who said nothing. Reading a truncated
record in the presence direction removes that domination — declaring truncation now costs only the
findings truncation actually undermines, which is the price honesty ought to carry and no more. A
caller optimising for a large finding count still prefers unstated; a caller optimising for a census
they can defend prefers the truth. That is the right way round, and it is as far as an incentive can
be pushed by a kit whose one real limitation is that it cannot find out.

## The identity observation

Optional, counted, and one more observation-shaped record in the same batch: `argv ["--version"]`, or
the schema emission, captured under the same discipline as everything else. It goes in the envelope's
`identity` key rather than in `records[]`.

### Its own shape, which is not quite a record's

| Field                       | Required           | Notes                                                          |
| --------------------------- | ------------------ | -------------------------------------------------------------- |
| `path`                      | **no — forbidden** | Present, it is an unknown key and refuses the batch            |
| `argv`                      | yes                | Whatever the caller ran. Not checked against any literal       |
| `exitCode`                  | yes                | Printed beside the quote; read by no part of the extraction    |
| `streams`                   | yes                | Same two values, same cross-field rules as a record            |
| `stdout` / `stderr`         | when separated     | Both required, either may be `""`                              |
| `output`                    | when merged        | Required                                                       |
| `completeness`              | no                 | Same three states; `truncated` does **not** suppress the quote |
| `recordedBy` / `recordedAt` | yes                | As on a record                                                 |

**`path` is forbidden rather than optional**, and that is what makes the separation structural. The
identity record is never filed at a path, never diffed, and never read for an enumeration; a key that
could file it somewhere would reintroduce by accident the thing the separate key exists to prevent.
For the same reason **none of the
[readable-rejection criteria](#which-records-the-kit-will-read-stated-rather-than-left-to-be-discovered)
apply to it** — it is not a rejection, so it does not have to look like one, and `--cli-schema`,
`version`, or a verb-shaped schema emission are all equally acceptable `argv`s.

**Which stream is quoted.** `stdout` under `separated`, because that is the stream `D1`'s own detector
reads, and `output` under `merged`, with the line naming the merge so a reader knows stderr may be
inside the quote. Under `separated` with an empty `stdout`, the line says the target wrote nothing to
stdout under that argv and **stderr is not substituted** — substituting would be the kit inventing
`D1`'s answer out of the other stream.

**A `truncated` identity is still printed, with the truncation named in the line.** That is the same
asymmetry the completeness rule turns on, applied consistently: a quotation is made **shorter** by a
cut, not false, because nothing downstream treats the quote as a complete set. Nothing is diffed
against it, so there is no absence for a short capture to fake.

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
identity: the caller recorded ["--version"] answering with "grapevine 0.4.1"
          (the tool's own bytes, recorded by the caller — not verified to be a version)
```

**The argv in that line is the record's own `argv`, substituted, never the literal `["--version"]`** —
a batch whose identity record ran `["--cli-schema"]` must print `["--cli-schema"]`, or the line
misreports the one thing it exists to attribute.

The parenthesis is required. `D1`'s detector for "reported a version" is
`plain.exitCode === 0 && plain.stdout.trim() !== ""` (`version-flag.ts:104`) — a non-empty stream
standing in for a typed payload — and
its own standing coverage gap says _"stdout is never checked to carry a version string in either
mode"_ — both verified against
[`version-flag.ts`](../../src/acc/kit/checkers/discoverability/version-flag.ts) while writing this. A
present identity observation therefore establishes that **the caller recorded** the target saying
**something** under the argv they sent — the kit observed nothing here, and the sentence has to keep
saying so. It does not establish that what the target said was a version, and it does not establish
that two batches quoting different bytes came from different builds. The report must not print it as a
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

The parent plan says the empty field is _"a fact the census already has a rule about"_ because `D1`
fails a target that reported no version at all. It does not, and the correction is stronger than
provenance alone: `"--version reported no version"` fires only on `exitCode !== 0 && stdout.trim() ===
""` ([`version-flag.ts:107`](../../src/acc/kit/checkers/discoverability/version-flag.ts)). A target
with no `--version` that exits `0` printing its help screen does not trip that clause at all. So an
absent identity observation is not covered by any rule, in either direction, and the census must carry
it as the unstated fact it is.

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

**`no-warrant` is unreachable until [item 2](2026-08-24-below-the-root-before-a-second-cli.md#2-a-probe-warrant-below-the-root)
ships, and an implementer building 2a alone must not emit it.** Telling `unreachable` from
`no-warrant` requires the warrant class item 2 introduces — _reachable in principle, but the
declaration claims nothing the kit may act on_ is a distinction that has no referent while no
declaration can carry a warrant at all. Before item 2, every path the kit did not probe is
`unreachable`, and every path a supplied batch skipped is `not-recorded`. The third reason is
specified here anyway so its sentence does not have to be reinvented under deadline, and because the
enum wants to be complete before it is stored; emitting it early would print a distinction the kit
cannot yet make, which is this project's own named defect one level in.

**These are reasons a path had no surface at all. `no-evidence` is a status of a surface that exists**,
and the plan is explicit that a caller record which arrives and yields no enumeration is not a fourth
state: it lands in the statuses already built for it — `not-enumerated` when rejections were read and
none named a set, `no-evidence` when nothing readable was recorded — on a path that was looked at.

**So `no-evidence` now has two provenances**, and the sentence must render beside the
`recorded-by-caller` label rather than on its own:

- _the kit sent no probe_ — `nothing readable was recorded, so nothing was read (not a statement about
the tool)`, unchanged, under `probed-by-kit`.
- _the caller's records were unreadable_ — under `recorded-by-caller`, and the line names **what**
  every record at that path missed: a `--` in the argv, no token after the path prefix, a token that
  is not flag-shaped, or a candidate set that echoed the sentinel back. Naming it is the difference
  between a caller who can fix their capture and one who retries the same one.

A reader who cannot tell those apart will read the second as a statement about the tool, which it is
not.

## What this requires in the tree, beyond reading the batch

Four things in the tree have to change before a batch can be read honestly. Two of them are
published sentences that were true only because the root was the only path there was; the third is a
filter this document states more strictly than the code applies it; the fourth is the flag.

**`surfaceSummary` must become path-aware, and this is a named must-not-regress property.** It
hardcodes `"did not enumerate at the root — the only path probed"`, and `diffDeclaration` reuses it
verbatim for every non-enumerated path
([`declaration.ts:554`](../../src/acc/kit/declaration.ts)). So the first caller who records a
`["state"]` surface that names no set gets that sentence printed **for `state`** — a false scope
claim, in the one place the parent plan says scope matters most. `SG-2` is the report finding that
put the scope into that sentence; a literal `at the root` inside a function now called for other
paths turns the fix into the defect it repaired.

The sentence must take its scope from the data: name the path it is about, and stop claiming which
other paths were looked at, since after a batch it no longer knows. The claim about coverage — which
paths were reached and how — belongs in the census header, where the set of paths is actually held.
Fixing it inside `surfaceSummary` rather than at the call site is what keeps `acc check` and
`acc compare` from describing the same field differently, which is the reason the function is shared.

**`SurfaceEvidence.observationId` cannot keep its comment.** It says the id _"resolves in
`Report.observations[]`"_, and a recorded record can never appear there: `ReportedObservation` carries
stream digests, `inertness`, `durationMs`, `timeToFirstByteMs` and `truncated` — derived facts and
kit-side judgements this document forbids the caller to send and the kit has no honest way to fill.
Minting a synthetic entry with fabricated digests would certify a caller-supplied string against
itself, which is [the exact defect](#fields-the-caller-must-not-send) the forbidden-fields list exists
to prevent.

**The readable-rejection filter must test flag SHAPE, not a leading dash.**
`isReadableRejection` ends `args.length > 0 && args.every((a) => a.startsWith("-"))`
(`surface.ts:354`), so `-1` and `-abc` pass it today; `LONG` and `SHORT` are applied only to list
members inside `flagsAfter`. The
[criteria this document publishes](#which-records-the-kit-will-read-stated-rather-than-left-to-be-discovered)
are the stricter ones, and they are the right ones for the same reason `SHORT` refuses a cluster: a
bundle is one parser's `-a -b -c` and another's old-style long name, and picking would be reading
what one of the target's words means. Until the filter uses `isFlag`, an implementer reusing that
function verbatim reads records this document tells the caller are refused — the two must not
disagree, in either direction.

**The flag has to refuse its own repetition**, which commander does not do for a string option — see
[how a batch reaches a run](#how-a-batch-reaches-a-run).

So the id resolves in **one of two places**, and the comment must say so: in `Report.observations[]`
under `probed-by-kit`, and in the submitted batch's records under `recorded-by-caller`. Give the
recorded ids their own namespace — a `recorded:` prefix over the record's index in `records[]` is
enough — so the two id spaces cannot collide in a stored report.

**The invariant is narrower than _a reader following an id always lands somewhere real_, and the
comment must not claim the wider one.** `Report.surface` is serialized (`report.ts:309`), so
`recorded:3` ships inside the JSON, where it indexes `records[]` of a batch the report neither
carries nor names. Once the batch file is gone, or `acc show` reads an archived report, that id
resolves nowhere. Decided, taking the smaller of the two repairs: **the id resolves in the batch
supplied to the run that produced the report**, and the comment says exactly that — a `recorded:`
id is a pointer into an input, not into the artifact. Open question, recorded rather than built:
whether the report should also carry the batch's identity — its path, `recordedBy` and `recordedAt` —
so an archived report can name what it was pointing at. That is a new field on a published type, and
it is worth doing on evidence that somebody followed an id and could not, rather than pre-emptively.

## Decided here: what the plan left open

Flagged for the reviewer. Each of these is a shape the plan did not pin, decided in this document with
its argument attached:

1. **What the report prints for an unstated loss field**, which the plan explicitly owed and did not
   settle. Unstated completeness is **read in both directions and labelled** on every census line it
   touches; `complete` prints nothing extra. Argued in [the loss declaration](#completeness).
2. **A declared truncation is read in the presence direction only**, suppressing
   `declared-not-accepted` at that path and discarding the last token of each `prose-marker` list it
   yields. The plan and the first draft of this document both said the kit had no third option; it
   has one, and it is what stops honesty from being strictly dominated by silence. The
   counter-argument — a cut flag name arriving flag-shaped — is stated with it, and three clauses
   bound it: `truncated` means **bytes lost from the end** and a harness that elides otherwise must
   not use the value; a record the discard empties is `not-enumerated` rather than `enumerated` with
   no flags; and `consistent` is not published at a path where a truncated record was read, so our
   own discard cannot be printed as the tool disagreeing with itself.
3. **`streams` is required, not optional**, and the rule underneath it is **knowability**: require
   what the caller holds by construction at the moment of answering, make optional and counted what
   they would have to guess at. Tested against the full field table in the same section, because the
   aboutness version of the rule fails that test three times. `exitCode` is required **and
   nullable** — a `2>&1 | tee` pipeline loses `$?`, and `null` is the honest answer.
4. **`SurfaceEvidence.stream` gains `"merged"`.** Implied by the plan; stated here as the type change
   it is.
5. **The batch carries its own `formatVersion`, one batch is accepted per run, and it arrives as
   `--recorded-surfaces <file>`** — a file path, on the `--declaration` precedent, never an
   `acc.config.json` key.
6. **`formatVersion` is checked before the unknown-key sweep**, and the cross-field `streams` rules
   are checked after both, since a mismatched `stdout`/`output` is a known key the sweep cannot see.
7. **Several records are permitted at one path and union**, exactly as `captureSurface` unions
   several rejections; a path is `no-evidence` only when nothing at it was read.
8. **A `path: []` record refuses the batch, so the caller omits the root capture from the batch.**
   The kit always probes the root itself, and one path result with two provenances is a label a
   reader cannot act on. The cost is real and named: the kit's root read is bounded by its own
   sentinel spelling, and on the headline target it is `not-enumerated`.
9. **`identity` is an envelope key rather than a member of `records[]`**, its `path` is forbidden, and
   the printed line quotes the record's own argv — never a literal `["--version"]`.
10. **`surfaceProvenance` rather than `provenance`**, to avoid colliding with
    `DeclarationDiff.provenance`.
11. **`path` must be a prefix of `argv`**, and the readable-rejection criteria applied after that
    prefix are written out rather than left in `surface.ts` for an adopter to discover by silence.
12. **Timing and environment fields are excluded from the record**, with the reader's strict-key rule
    making a later addition unambiguous.
13. **`no-warrant` is specified but not emitted** until item 2 ships.
14. **A `recorded:` observation id resolves in the batch supplied to that run**, not in the stored
    report — `Report.surface` is serialized, and the batch is an input the artifact does not carry.

Three things are deliberately **left open** rather than decided, because each would need case
analysis to stay correct and this document's defects have all come from that: a third `completeness`
value for an interior elision; comparing `consistent` among only the non-truncated records at a path;
and recording the batch's identity in the report so an archived `recorded:` id can name what it
pointed at. Each is worth building on a case that has actually arrived.

## Discharge

This document is a shape, not a home. When ingestion ships, what an adopter needs to keep — the
envelope, the record, the loss fields — belongs in the wiki as a guide, and this plan discharges. Until
then it is the only place the format is written down, and a batch that disagrees with it is the one
that is wrong.
