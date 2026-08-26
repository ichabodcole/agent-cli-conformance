---
type: guide
title: How to record surfaces below the root
description:
  Record your tool's rejections below the root — with a harness `acc probe-plan` generates, or by
  hand — and hand the batch to `acc check` for a census covering the paths the kit cannot probe.
tags: [guide, adoption, evidence, declarations, acc-check]
related: [concept/probing, concept/conformance, guide/how-to-reach-l0-in-your-project]
status: stable
generated: { by: claude-opus-5, at: 2026-08-26 }
---

# How to record surfaces below the root

## Goal

`acc check <target> --recorded-surfaces batch.json` reports what your tool accepts at the command
paths **below** the root, from recordings you made yourself — and, with `--declaration`, diffs them
against what you declared.

The kit probes the root and nothing else, on purpose: [probing](../concepts/probing.md) is the
level system that says what it is allowed to send, and a probe below the root is an invocation of
somebody's subcommand. You own your tool, so you can run it and keep what came back. A batch is that
recording, handed over.

**What it buys, exactly.** Every census line names who observed it — `probed-by-kit` or
`recorded-by-caller` — and the paths you recorded stop coming back "the kit probes the root only".
**Nothing here reaches a verdict.** No rule reads a batch, no finding from one feeds `conformant`,
and no exit code moves. A fabricated batch buys a sentence, not a pass.

**There are two routes to a batch, and they part at step 2.** `acc probe-plan` generates the
capture — a shell script you run, which sends the rejections, keeps the bytes, and writes the batch
file. Capturing by hand is the other route: it is what you do when the generated script does not
suit your tool, and it is what every field below means, generated or not. **The document is the
same either way.** `formatVersion` is `"0"` for both, the reader has no field for which route
produced a batch, and nothing downstream can tell.

You need a working `acc check` first — [Check your first CLI](./check-your-first-cli.md) if you have
not run one.

**The diff half of this page also needs a declaration file, and nothing else documents its shape at
a level you can write one from.** That sentence used to send you to
[How to reach L0 in your project](./how-to-reach-l0-in-your-project.md), which does not use
`--declaration` and says twice that L0 needs no declaration. The second adopter followed it, found
nothing, and got the format by reading this repository's test fixtures. Here is the minimum:

```json
{
  "formatVersion": "0",
  "provenance": "modelled",
  "selfDescription": null,
  "commands": [
    {
      "path": ["state"],
      "args": [{ "name": "--full", "type": "boolean", "status": "valid" }],
      "positionals": []
    }
  ]
}
```

- **`formatVersion`** is the string `"0"`, compared for exact equality. Not `"0.1"`, not `0`.
- **`provenance`** is `"modelled"` if you wrote it by hand from help, `"emitted"` if the tool
  produced it. They are not interchangeable: the remedy sentence you get when a diff cannot run is
  chosen by this field, and claiming `emitted` for a file you transcribed will tell you to fix
  something you cannot fix.
- **`selfDescription`** names the invocation that emits this document, as `{ "args": [...] }`. It
  is required, and `null` is the answer that says your tool emits none — omitting the key refuses
  the file rather than defaulting.
- **`path`** is the argv tokens before the flags, as an array. `[]` is the root.
- **`status`** is `"valid"` or `"refused"` — what the document claims about that flag AT THAT PATH.
- **Unknown keys are refused anywhere in the file**, and the version is checked before the sweep,
  so fix a version complaint first and re-run rather than hunting keys.

[Part 2 of `STANDARD.md`](../../../STANDARD.md#the-fields-and-why-each-exists) argues why each field
exists and what a fuller document carries.

## Steps

### 1. List the paths to record, and leave the root out

One record per command path you want compared: `["state"]`, `["send", "note"]`, and so on. If you
have a declaration, its `commands[].path` entries are the list.

**Omit the root.** The kit always probes `path: []` itself, before any batch is opened, so a record
with an empty `path` would give one census line two observers. It is refused, and the refusal is of
the **whole batch** — sweep your tool from the top if that is how you work, then file every record
below the root and drop the `path: []` one on the way out.

**So your batch will hold one fewer record than your declaration holds paths**, and that is the
right shape rather than a mis-built batch. Your batch counts **records**, all of them below the
root; the census counts **declared command paths**, and a declaration normally declares the root
too. A full house of 25 records against a 26-path declaration reads `26 of 26 declared command
paths compared` — 25 of them on your records, the twenty-sixth on the kit's own root probe.

If your declaration does **not** declare a root, the root is still compared, against nothing
declared — which is exactly what turns the flags it accepts into `accepted-not-declared`. It is
**not** counted toward the fraction, because it is not one of the paths the fraction's denominator
counts. It gets a clause of its own instead, so 25 records against a rootless 25-path declaration
read:

```
25 of 25 declared command paths compared; 1 path the declaration does not name — (root) — was also compared
```

The count on the left never exceeds the count on the right, whatever your batch reaches.

**If your root does not enumerate, you get neither line, and that is the case this page is most
for.** The root is then not compared at all — there is nothing to compare it against — so it is
reported as a limit rather than as a path:

```
17 of 17 declared command paths compared; 289 disagreements (modelled declaration)
NOT COMPARED: (root) — did not enumerate at the root; 5 rejections read, none named a set
```

A tool shaped like that gets **nothing** from `acc check` on this axis and everything from a batch,
because the one path the kit can reach for itself is the one path that says nothing. Measured on
magpie, the second adopter's target.

**A recorded path is a path you assert exists. Nothing in a batch establishes that it does.**

The reader checks that each record's `path` is a prefix of its `argv`, which catches a record
filed under the wrong path. It cannot catch a path that is not real, because on many tools the
bytes are identical either way. Measured on `mind-mapper`, whose parser rejects an unknown flag
before anything decides whether the token before it names a subcommand:

```
zone create   --acc-not-a-flag   exit 2   Unknown option '--acc-not-a-flag'
zone bogusxyz --acc-not-a-flag   exit 2   Unknown option '--acc-not-a-flag'
                                          byte-identical
```

So a record at `["zone", "bogusxyz"]` is **valid**: the prefix holds, `completeness` is honestly
`complete`, the bytes are verbatim, and the reader accepts it. **The census fraction counts it.**

**This is not about a dishonest caller, and that is the point.** The adopter who found it derived
their paths from the tool's own `usage:` strings — the source this guide recommends. A stale line
in that output produces a dead path recorded in perfect good faith, and nothing anywhere says so.
`pathSource: "target"` means _derived from the implementation_; it has never meant _complete_, and
this is what that cashes out as.

**It is worse when both sides share a source.** If your declaration and your path list come from
the same `usage:` output, a stale entry lands in the denominator and the numerator together, and
the fraction reads `40 of 40` while one of the forty does not exist. The cross-check you might
hope for is not there, because there is only one source.

**What you can do about it.** Derive the path list and the declaration from _different_ artifacts
where you can — the dispatch table for one, help for the other — so a disagreement between them is
visible instead of averaged away. That is the same argument this page makes for a
caller-supplied path list, arriving from the other end.

### 2. Generate the harness, unless you have a reason not to

```
acc probe-plan ./mycli --paths ./paths.json --out ./capture.sh
sh ./capture.sh
```

`--paths` takes step 1's list as a JSON array of arrays — `[["state"], ["send", "note"]]`, the same
shape as `commands[].path`, so a multi-token path needs no separator anything could split wrongly.
`--declaration ./declaration.json` reads the list out of a declaration instead, dropping its root
entry for you. Give exactly one — giving both is a usage error, and so is giving neither, because
there is no third source: paths guessed out of help text produce records at paths that do not
exist, and the command refuses to guess.

**Which source you give decides what the plan can find, and the command says so on a `LIMIT:`
line.** A declaration-derived plan probes the paths your declaration already names, so a verb your
parser accepts and your declaration omits is not a disagreement in the census — it is absent from
it, and nothing in the batch or the report records that it is missing. A list taken from wherever
you actually enumerate verbs — the dispatch table, the command registry — is the source that can
catch that one. It is not a completeness claim either: `--paths` means derived from the
implementation, which is not the same as complete.

**`--out` is how you get the script, and `>` is not a substitute.** Stdout carries the report, as
it does for every other `acc` command, so `acc probe-plan ./mycli --paths ./paths.json >
capture.sh` leaves you a JSON envelope in a file named `capture.sh`. The failing case is worse
than the working one: `>` truncates the file **before** `acc` runs, so an invocation that exits
non-zero — a path list with a typo in it — leaves **zero bytes** behind. An empty script is a valid
script that does nothing, successfully, at exit `0`, so you get a harness that appears to run,
writes no batch, and reports success. `--out` refuses to overwrite an existing file unless you pass
`--force`.

**Then run it, and steps 3 to 7 are done.** The script sends one rejection per path, writes
`batch.json`, and fills in for you the fields you would otherwise be filling in yourself:

- **the argv** — `path` plus the sentinel `--acc-not-a-flag`, which satisfies all three of step 3's
  rules by construction;
- **`streams` and `completeness`** — derived from how it captured. It redirects each stream to its
  own file rather than piping, so nothing downstream can cut one, and it writes `complete` only
  where the process terminated under its own control;
- **`recordedAt`** — stamped per record at capture time, never at generation time;
- **`recordedBy`** — the person, plus the build it measured (`git rev-parse`, marked `-dirty` where
  the tree carried uncommitted changes) and which source the paths came from. Set `ACC_RECORDED_BY`
  to name yourself; the build and the source are appended either way;
- **`identity`** — captured from `--version` by default. `IDENTITY_ARGV` at the top of the script is
  config: change it if your tool names itself some other way, empty it to skip the capture.

The launcher stays out of every recorded `argv`, because `argv` is what your tool received and
`bun ./cli.ts` is how it was started. **Read the script — it is meant to be read** — but do not edit
the capture: `completeness` is derived from how those redirections are written, and a pipe or a
`head` added afterwards makes the derivation a lie nothing downstream can detect.

Hand `batch.json` to step 8.

### 3. Provoke one rejection per path, and keep the bytes verbatim

**Steps 3 to 7 are the hand route.** They are what the harness does; do them yourself when it does
not fit your tool, and read them either way to know what the fields mean.

Send a flag no tool would ever accept, after the path:

```
mycli state --acc-not-a-flag
```

Three rules decide whether the kit will read what comes back, and all three are about the **argv you
sent**, not about the answer:

1. **No `--` anywhere in it.** After a terminator everything is data, so the rejection is about a
   positional rather than a flag.
2. **At least one token after the path.** A bare `mycli state` is an invocation, not a rejection.
3. **Every token after the path is flag-shaped** — `--long-name` or a single-letter `-x`. Not `-1`,
   not `-abc`; those are a verb or a positional as far as any parser is concerned, and the set a
   tool names when refusing one of those belongs at a different path. More than one flag is fine.

**The sentinel spelling is the thing that will bite you twice.** The kit refuses any candidate set
containing a token your own argv sent — the cheapest guard against an error document echoing your
input back as the tool's accepted set. So a sentinel your tool genuinely lists erases the whole read.
Use `--acc-not-a-flag`, or something else no tool would ever accept, and never a plausible flag.

**Verbatim means verbatim.** Keep what the tool wrote, decoded as UTF-8, with nothing stripped: no
colour removal, no trailing-newline tidying, no reflowing. The kit matches marker phrases as a
substring over your tool's own punctuation, so a helpfully cleaned capture is a different capture.

### 4. Write one record per capture

```json
{
  "path": ["state"],
  "argv": ["state", "--acc-not-a-flag"],
  "exitCode": 2,
  "streams": "separated",
  "stdout": "",
  "stderr": "Unknown option '--acc-not-a-flag'. Valid flags: --json --limit\n",
  "completeness": "complete",
  "recordedBy": "ci@example",
  "recordedAt": "2026-08-25T09:14:02Z"
}
```

Every key above is required, and `path` **must be a prefix of** `argv` — that is what makes the
record self-checking, so a record filed under `["state"]` whose argv begins `["send"]` is caught
rather than believed. `recordedBy` is free text (a person, a CI job, a script) and `recordedAt` is
RFC 3339; both are printed with the batch and read by nothing. `exitCode` may be `null`.

Several records at one path are fine and are unioned. If two of them name different sets, the kit
publishes the disagreement rather than picking — two rejections legitimately can differ.

### 5. Declare what your capture may have lost

Two losses do not show in the bytes, so a hand capture states them rather than the kit judging
them. **On a hand capture these are the two fields whose answer only you hold** — nothing in a
record establishes either one, and the kit will not guess.

**A generated harness fills in both.** It wrote the redirections itself, so `streams` transcribes
its own code, and `completeness` follows from capturing to files and watching how the process
ended. Both fields ask for a fact about **how the capture ran**, and the harness is what ran it.

**`streams`** — `"separated"` means `stdout` and `stderr` are both present and each holds only its
own stream; either may be `""`. `"merged"` means one `output` field holds both interleaved, which is
what a capture ending `2>&1` produces. Evidence read out of a merged capture is attributed `merged`,
never guessed onto a stream nobody observed it on. Send the fields for the value you chose and no
others: a record that both merges and separates is two incompatible claims about one capture, and it
refuses the batch.

**`completeness`** — one of three, and only `complete` is read for an enumeration:

| Value       | What you are saying                          | What the kit does                    |
| ----------- | -------------------------------------------- | ------------------------------------ |
| `complete`  | every byte the tool wrote is in this record  | reads it                             |
| `truncated` | you know bytes were lost                     | excludes it; the census line says so |
| `unknown`   | you cannot establish that no bytes were lost | excludes it; the census line says so |

A list cut mid-way is short by an unknowable number of flags and looks whole, which is worse than
reading nothing — the kit discards its own truncated captures for the same reason. `unknown` is
there so a caller who does not hold the fact never has to choose between a false `complete` and a
`truncated` claim they cannot support. An excluded record still costs you nothing else: one excluded
record beside one complete record at the same path is read on the complete one, with the exclusion
named on the line.

### 6. Wrap the records in an envelope

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
      "recordedBy": "ci@example",
      "recordedAt": "2026-08-25T09:14:02Z"
    }
  ]
}
```

`formatVersion` is the exact string `"0"`, compared by string equality. `records` needs at least one
entry; order is not significant.

**One document is one session assertion** — by submitting it you are saying these records came from
one tool, on one machine, in one sitting. Nothing in the bytes establishes that, which is why the
flag may be given at most once: a second `--recorded-surfaces` is refused rather than merged, and a
caller with two sessions runs `acc check` twice.

**The reader refuses a document it half-understands.** An unknown key anywhere, a missing required
key, or a `formatVersion` that is not `"0"` rejects the whole batch, and the run continues with no
recorded surfaces rather than with some. Keys the kit computes or judges for itself — observation
ids, digests, `inertness`, `truncated`, timings — are unknown keys here, and sending one refuses the
batch: you attest to what the tool **did**, never to what it means.

### 7. Optionally, say what the tool is

An `identity` key on the envelope, beside `records`, holds one capture of your tool naming itself —
`--version`, a schema emission, whatever your tool answers:

```json
{
  "argv": ["--version"],
  "exitCode": 0,
  "streams": "separated",
  "stdout": "mycli 1.2.3\n",
  "stderr": "",
  "completeness": "complete",
  "recordedBy": "ci@example",
  "recordedAt": "2026-08-25T09:14:02Z"
}
```

Same fields as a record except that `path` is **forbidden** — an identity is never filed at a path
and never read for an enumeration, so none of step 3's rules apply to its argv either. Its
`completeness` excludes nothing; a lossy quote prints with its declared value named beside it.

It is optional, and omitting it is free: every census line resting on a batch with no identity says
`identity unstated` rather than the report going quiet about it. What a present identity buys is a
**quotation**, printed as the tool's own bytes and labelled as not verified to be a version — a tool
with no `--version` should record the failure rather than fabricate a reading.

### 8. Hand it to `acc check`

```
acc check ./mycli --format text --recorded-surfaces ./batch.json --declaration ./declaration.json
```

A file path, not stdin. `--declaration` is optional: without it you get the batch's own block and
no comparison. The harness writes `batch.json` into the directory you ran it from, so run it where
you want the file.

## Verification

The report grows a `RECORDED SURFACES` block, and the census below it labels every line:

```
  RECORDED SURFACES — captured by the caller on their own machine, read here with the
  kit's own extraction. The kit executed nothing below the root.
  Evidence, not a rule: nothing in this report passes or fails on it.
    1 record at 1 path, from ./batch.json
    recorded by ci@example
      enumerated 2 flags at state: --json --limit
    1 census line rests on recorded surfaces; that one on a batch that states no identity.

  DECLARED vs ACCEPTED — a declaration the caller supplied, against the target's own
  enumeration above. Evidence, not a rule: nothing in this report passes or fails on it.
    2 of 3 declared command paths compared; 3 disagreements (modelled declaration)
    NOT COMPARED: send — the caller supplied recorded surfaces and recorded nothing at this path
    accepted-not-declared  --limit at state [recorded-by-caller (identity unstated)]
```

Three things to check, in this order:

1. **The path count moved.** `2 of 3 declared command paths compared` — before the batch it was
   `1 of 3`, because the root is all the kit reaches. If it did not move, no record was read.
2. **Every path you recorded appears with a `[recorded-by-caller]` label.** A path you recorded that
   is still `NOT COMPARED` was refused, and the line says which of the three argv rules it missed or
   which `completeness` value excluded it. Those are different fixes: one is a recapture with a
   different argv, the other a recapture without the `head`. **On a generated batch neither fix is
   yours** — the harness satisfies all three rules by construction and derives `completeness`, so a
   refusal there is a defect in the generator and worth reporting as one.
3. **`conformant`, the exit code and the rule table did not change.** Run once with the flag and
   once without and compare those three. If any of them moved, that is a defect in the kit, not in
   your batch.

   **The verdict LINE does change**, and that is correct — it grows a `· but see N declaration
disagreements (modelled)` clause. This step used to open by saying the line was identical, which
   the sentence after it then contradicted; an adopter followed it literally, saw the line move, and
   was told by this page that they had found a kit defect. Compare the three things named above,
   not the line.

   **Timing rows differ between runs and are not a change.** `F2 --version first byte in 15ms (runs:
15, 15, 16ms)` against `(runs: 16, 15, 15ms)` is jitter. A mechanical diff of the two reports
   will flag it; ignore that row.

When the whole batch is refused, the run says so and continues with no recorded surfaces — the
message names the first thing it could not understand, and a `formatVersion` complaint always comes
before a key complaint, so fix the version first and re-run rather than hunting keys.

`acc check <target> --json` carries the same material under `.data.recordedSurfaces`, with
`.data.declaration.paths[].surfaceProvenance` holding the label on each census line.

The pinned format, and the argument for every choice above, is the discharged plan
[the recorded-surface batch](../../plans/2026-08-25-the-recorded-surface-batch.md). Read it if you
are implementing a producer; this page is what you need to write one batch. The generator has its
own record in [the probe-plan generator](../../plans/2026-08-26-the-probe-plan-generator.md),
including the four defects an adopter found by running a draft harness from a directory its author
did not have.
