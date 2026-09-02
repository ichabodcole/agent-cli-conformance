# Recorded-surface batches — vendored, with attribution and caveats

Four JSON artifacts, vendored **verbatim** before anything in this tree could read them. They are
evidence captured by somebody else against a specification this repository published, and they
landed here **before** the ingestion code that reads them today — which is the only ordering under
which they can say anything about whether the specification was writable.

They are also the first artifacts anyone has produced from
[`docs/plans/2026-08-25-the-recorded-surface-batch.md`](../../../../../docs/plans/2026-08-25-the-recorded-surface-batch.md).

## Attribution

Captured by **`trellis`**, the implementer who owns the grapevine and bounty CLIs and the Spellbook
repository they live in — the same outside implementer as
[the first outside application](../../../../../docs/reports/2026-08-24-first-outside-application-grapevine.md),
whose provenance note applies here too.

|                   |                                                                                                                       |
| ----------------- | --------------------------------------------------------------------------------------------------------------------- |
| Source repository | `ichabodcole/spellbook`, branch `develop`                                                                             |
| Source path       | `docs/investigations/2026-08-25-recorded-surface-batches/`                                                            |
| Source commit     | `d45def2` — _"docs(investigations): recorded-surface batches"_, `2026-08-25T11:19:17-07:00`, local at time of capture |
| Captured against  | this repository's batch spec at `80104df`                                                                             |
| Recorded at       | `2026-08-25T18:18:34Z`, one timestamp across every record in both batches                                             |

## The files

| File                               | What it is                                                     |
| ---------------------------------- | -------------------------------------------------------------- |
| `grapevine.recorded-surfaces.json` | 32 records, one per declared below-root path. All exit 2       |
| `grapevine.declaration.json`       | the same tree's `schema` emission, regenerated at capture time |
| `bounty.recorded-surfaces.json`    | 3 records — `state`, `claim`, `list` — all exit 2              |
| `bounty.modelled.declaration.json` | the hand-written modelled declaration from the round-1 session |

`sha256`, so a later reader can establish that nothing here was reformatted:

```
9327eb57aaefde883a101a922027eaa53ca2d1d68dc4fb8968eb0c8bcc41f533  grapevine.recorded-surfaces.json
19e80cac298074166c57d4afa91ce06f9fa0b624a33434c66919149571f96918  grapevine.declaration.json
6035f9e03d52bc747d3e6af0badda759f94088885f6c799c9ec59a6b84b951ea  bounty.recorded-surfaces.json
5527187ac7868409026a2a9b0dd0967620036cfca487f55c4b458f0b6ea75fc1  bounty.modelled.declaration.json
```

**Do not reformat these files.** The batch spec's own rule is that _"verbatim means verbatim"_ — the
streams carry what the tool wrote, and the marker match is a substring test over the tool's own
punctuation. The captures are also the specimens the marker-widening decision is waiting on, so the
wording is the artifact. Biome's `files.includes` does not reach `src/**/*.json`, which is what keeps
the formatter off them; that is a property of the config, so it is written down here rather than
assumed.

**Why the two declarations live beside the batches rather than in
[`../declarations/`](../declarations/).** A batch and the declaration it is diffed against are one
capture and one session assertion, and the caveats below attach to the pair rather than to either
half. Splitting them by kind would put the caveats in two places, where one copy goes stale.

## Why this location

`src/acc/kit/fixtures/` already groups vendored and synthetic fixtures by kind — `declarations/`,
`broken/`, `population/`, `sh/` — and this is a new kind. The precedent for attribution is the
comment block above `describe("anthill v2.3.0 against its own manifest")` in
[`declaration.test.ts`](../../declaration.test.ts), which states where a vendored fixture came from
and what was and was not verified about it. That precedent cannot be followed yet, because the test
that would carry the comment is the ingestion test these artifacts exist to precede. This file holds
the same content until there is a consumer to hold it, and the consumer should cite this file rather
than restate it.

## Caveats, recorded on the artifacts rather than in a commit message

Each of these was asked to be **stated rather than assumed**, and each one is a fact a later reader
would otherwise have to infer wrongly.

1. **The grapevine batch is not the reachable 2.2.0 build.** It came from the Spellbook `develop`
   working tree, post-`1c61d13`. The plugin-cache **2.2.0** build — the one the
   [eight-owner measurement](../../../../../docs/reports/2026-08-24-eight-owner-clis.md) used — has
   **no `schema` verb**, and Spellbook's release is deferred, so `2.2.0` currently names both trees.
   The identity observation in the batch says `2.2.0`; only `recordedBy` disambiguates. This is the
   worked specimen of the batch spec's own
   [narrows-but-does-not-close](../../../../../docs/plans/2026-08-25-the-recorded-surface-batch.md#the-identity-observation)
   caveat, and it is argued there.

2. **`bounty.modelled.declaration.json` is modelled, not emitted.** It carries
   `"provenance": "modelled"` in its own bytes, and it is a **model of bounty's help prose** written
   by hand in the round-1 session — not something bounty emits. bounty has no declaration emitter.
   The whole point of `SG-8` is what a model of the help disagrees with the parser about, so a
   reader who mistakes it for an emission has lost the finding.

3. **How the bytes were obtained**, in the recorder's own account: separated streams, verbatim UTF-8
   bytes, a Python `subprocess` call with no shell and no pipes so the exit code was observed
   directly, the sentinel spelled `--acc-not-a-flag`, no root record in either batch, `path` a prefix
   of `argv` on every record, and `completeness: "complete"` throughout. One identity observation per
   batch.

4. **bounty's identity is a failed `--version`, and that is deliberate.** bounty has no `--version`:
   the record is exit `2`, empty `stdout`, and `bounty: unknown verb "--version"` on `stderr` — the
   absence recorded in the tool's own words rather than omitted. The spec permits it (`argv` is
   _"whatever the caller ran. Not checked against any literal"_, `exitCode` is _"read by no part of
   the extraction"_), and it is a third option the spec's own **Why optional** argument did not name:
   a caller whose tool has no `--version` need neither fabricate a reading nor drop the capture.

## What was checked here, and what was not

Validated field by field against the batch spec on 2026-08-25, before any ingestion code existed:
envelope keys, `formatVersion`, every required field on all 35 records and both identity records,
`completeness` present and `complete` throughout, `streams` and its cross-field rules, `path` a
prefix of `argv` everywhere, no forbidden key anywhere, no `path: []` record, and no `path` on
either identity. Both declarations load through `loadDeclaration` unmodified. Every enumerated token
in every record is flag-shaped under the kit's own `isFlag`, and no candidate set echoes the
sentinel back. **No mismatch was found in either batch.**

**Not checked, and it cannot be from inside this repository.** The recorder states that
`grapevine.declaration.json` is byte-comparable to the `clean` fixture of the drift experiment at
`docs/investigations/2026-08-24-grapevine-drift-experiment/`. That fixture is not in this checkout —
vendoring it is
[item 3](../../../../../docs/plans/2026-08-24-below-the-root-before-a-second-cli.md#3-regression-fixtures-from-the-first-application)
and has not happened — so the claim is recorded as theirs, not verified here. Nothing else in the
capture method is verifiable from the bytes either: that the streams were separated, that no shell
was involved, and that the capture was complete are all the recorder's attestation, which is exactly
what the `recorded-by-caller` label exists to say.

---

## `magpie.empty-enumeration.json` — a different capture, for a defect it exposed

Added 2026-08-26, and **not** part of the four above. Two records, vendored verbatim, cut from the
third census of a second adopter's tool with nothing changed but the record selection.

|                   |                                                                                   |
| ----------------- | --------------------------------------------------------------------------------- |
| Captured by       | **`flint`**, the agent that took `magpie` to L0 and through three censuses        |
| Source tool       | `magpie` at `plugins/spellbook/skills/magpie/scripts/cli.ts`, Spellbook `cd06cb5` |
| Source repository | `ichabodcole/spellbook`, branch `feat/magpie-acc-l0`, unpushed at time of capture |
| Captured against  | this repository's batch spec, unchanged at `formatVersion: "0"`                   |
| sha256            | `73e40c606497d22a7e5cb4fba8b0efbcbae726aa3d66b425c8ffbb5eeecb1577`                |

**What it is for.** `magpie`'s author reports that `sessions` and `help` accept no flags, by
design. Asked with one sentinel flag, each answered with an explicit, present, empty enumeration:

```json
{ "ok": false, "error": { "kind": "usage", "…": "…", "choices": [] } }
```

`choices` is present and it is `[]`. The tool was asked what it accepts there and said "nothing".

**The kit read that as `not-enumerated` and dropped both paths from the census**, then rendered
`none named a set (NOT a tool with no flags)` — which is the precise opposite of what the target
said. The clause responsible was `value.length > 0` in `keyedSets`
([`surface.ts`](../../surface.ts)), which discarded the empty array before anything could read it.

So the kit did not merely fail to record the answer: the sentence it printed instead said that no
rejection named a set of flags, about a rejection that demonstrably named one. That is a claim about
these bytes, and these bytes refute it. The type separated "we did not look" (`no-evidence`) from
"we looked and found nothing" (`not-enumerated`) — two of the three states
[Part 3 of `STANDARD.md`](../../../../../STANDARD.md) requires of any field — and had no way to say
**"we looked and it said none."**

**What shipped.** `SurfaceStatus` grew a fourth member, `enumerated-none`, and `keyedSets` grew a
third output: a recognised key held empty is now collected rather than discarded, on the same model
as the near-miss keys beside it. A path whose rejection named such a key now renders:

```
stated an empty set of flags at sessions under `choices`; 1 rejection read, and the set the target named held nothing (the target's own answer, not silence read as one)
```

`emptySetKeys` carries the key, so the claim can be checked against these bytes instead of trusted,
and the rejection count is what makes it a measurement rather than an assertion — the same
denominator `not-enumerated` rests on. That is the third of Part 3's states, in the field that was
missing it.

**What the status does not say is that these paths accept no flags.** It records what `magpie`
said; it does not adopt the claim as true of the tool. `flags` stays absent on `enumerated-none`
exactly as on `not-enumerated` and `no-evidence` — an empty array is as easily a serializer that
dropped its contents as a program with nothing to declare, and publishing one would put the kit's
name on a claim only the target made.

**Why it was vendored before the fix, and why the fix has the shape it has.** The naive repair —
delete the length clause — turns any recognised key holding an empty array into an enumeration of
zero flags, and every flag a declaration names at that path then becomes a `declared-not-accepted`
finding. A false empty enumeration GENERATES findings where a false `not-enumerated` only
suppresses them, so this needed the missing state rather than the clause removed. That argument is
still the whole reason the answer is a fourth status with no `flags` field, rather than an empty
list threaded through the existing one. These bytes are the before-case for that sweep, and they
are a real tool's real answer, which is not something that can be fabricated honestly.

**The severity argument is the adopter's**, and it is the one that made this disqualifying rather
than cosmetic: every tool that takes this project's advice about per-verb flag scoping acquires
flagless verbs, and each one cost it census coverage while the report claimed it enumerated
nothing. _"The fraction moves the wrong way as the tool improves, which is the one direction a
measurement must never move."_

**This file is now read.** `recorded.test.ts`'s `"magpie's empty enumeration — the regression
enumerated-none exists to fix"` block reads it through `readRecordedBatch`, pins the sentence above
byte-exact, and drives it through `acc check --recorded-surfaces` end to end — asserting the census
counts both paths as compared, as a number, rather than dropped — exactly as the four batches above
are read by the vendored-batch tests.
