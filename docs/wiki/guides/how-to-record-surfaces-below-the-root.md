---
type: guide
title: How to record surfaces below the root
description:
  Capture your own tool's rejections below the root, hand them to `acc check` as a batch, and get a
  census that covers the command paths the kit cannot probe.
tags: [guide, adoption, evidence, declarations, acc-check]
related: [concept/probing, concept/conformance, guide/how-to-reach-l0-in-your-project]
status: stable
generated: { by: claude-opus-5, at: 2026-08-25 }
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

You need a working `acc check` first — [Check your first CLI](./check-your-first-cli.md) if you have
not run one. The diff half of this page also needs a declaration file, which is the same file
[How to reach L0 in your project](./how-to-reach-l0-in-your-project.md) uses with `--declaration`.

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

### 2. Provoke one rejection per path, and keep the bytes verbatim

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

### 3. Write one record per capture

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

### 4. Declare what your capture may have lost

Two losses do not show in the bytes, so you state them rather than the kit judging them. These are
the only two fields on which you are the authority.

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

### 5. Wrap the records in an envelope

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

### 6. Optionally, say what the tool is

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
and never read for an enumeration, so none of step 2's rules apply to its argv either. Its
`completeness` excludes nothing; a lossy quote prints with its declared value named beside it.

It is optional, and omitting it is free: every census line resting on a batch with no identity says
`identity unstated` rather than the report going quiet about it. What a present identity buys is a
**quotation**, printed as the tool's own bytes and labelled as not verified to be a version — a tool
with no `--version` should record the failure rather than fabricate a reading.

### 7. Hand it to `acc check`

```
acc check ./mycli --format text --recorded-surfaces ./batch.json --declaration ./declaration.json
```

A file path, not stdin. `--declaration` is optional: without it you get the batch's own block and
no comparison.

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
   different argv, the other a recapture without the `head`.
3. **The verdict line did not change.** Run once with the flag and once without; `conformant`, the
   exit code and the rule table are identical. If any of them moved, that is a defect in the kit,
   not in your batch.

When the whole batch is refused, the run says so and continues with no recorded surfaces — the
message names the first thing it could not understand, and a `formatVersion` complaint always comes
before a key complaint, so fix the version first and re-run rather than hunting keys.

`acc check <target> --json` carries the same material under `.data.recordedSurfaces`, with
`.data.declaration.paths[].surfaceProvenance` holding the label on each census line.

The pinned format, and the argument for every choice above, is the discharged plan
[the recorded-surface batch](../../plans/2026-08-25-the-recorded-surface-batch.md). Read it if you
are implementing a producer; this page is what you need to write one batch.
