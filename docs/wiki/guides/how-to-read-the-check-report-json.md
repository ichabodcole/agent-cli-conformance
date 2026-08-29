---
type: guide
title: How to read the check report JSON
description:
  The shape of what `acc check --json` writes, worked against a real run — the envelope, the
  verdict block, one finding field by field, and how a probe resolves to what actually happened.
tags: [guide, conformance, acc-check, evidence]
related: [tutorial/check-your-first-cli, concept/conformance, concept/machine-mode]
status: stable
generated: { by: claude-fable-5, at: 2026-08-27 }
---

# How to read the check report JSON

## Goal

Piped or redirected, `acc check` writes one JSON document, and everything this page shows comes
from a run you can reproduce — the kit's own broken fixture:

```
bun run acc check src/acc/kit/fixtures/broken/exits-zero-on-unknown-flag.ts --json > report.json
```

The same artifact renders back into the human report — `acc report report.json` — with the
verdict's exit code mirrored and no probe re-run; both renderings of one run carry the same
`sweep` mark, so a pairing is checkable rather than trusted.

By the end you can answer the four questions a report exists to answer — did it pass, what
failed, what exactly was sent, and what came back — each with one `jq` expression, without
guessing a single field name.

Names this report does **not** use, because they are the natural first guesses and each has a
real counterpart:

| If you reached for      | The report says                                               |
| ----------------------- | ------------------------------------------------------------- |
| `.data.results`         | `.data.findings`                                              |
| a finding's `.status`   | `.verdict` — `"pass"`, `"fail"`, or `"unverified"`            |
| a finding's `.summary`  | `.detail` — one clause per observation that decided it        |
| an observation's `argv` | `.args` — the argv **after** the target, which is what varies |

## Steps

### 1. Open the envelope

The top level is acc's own machine-mode envelope, the same one every `acc` command emits:

```
{ "ok": true, "data": { … }, "meta": { "command": "check", "durationMs": … }, "next": [ … ] }
```

`ok` is about the **run**, not your tool — a completed check of a badly broken target is still
`"ok": true`, with the verdict carried in the exit code (`0` conformant, `9` not) and inside
`data`. Everything about your tool lives under `.data`; `next` is acc suggesting a follow-up
command, and for a failing report it points at `acc show` for the rule that best explains the
violations.

### 2. Read the verdict block

```
jq '.data | {conformant, fullyVerified, level, counts}' report.json
```

```json
{
  "conformant": false,
  "fullyVerified": false,
  "level": "L0",
  "counts": {
    "core": 17,
    "corePassed": 8,
    "coreFailures": 6,
    "diagnosticFailures": 0,
    "unverified": 4,
    "coreUnverified": 3,
    "corePartial": 8,
    "notApplicable": 3,
    "waived": 0
  }
}
```

- **`conformant`** — the gate: no core rule was violated. This is the boolean the exit code
  mirrors.
- **`fullyVerified`** — the stricter claim, and the one that can be false over a clean sheet:
  every applicable core rule was actually established, not merely un-violated. See
  [conformance](../concepts/conformance.md) for why a target can hold the first without the
  second.
- **`level`** — the probe depth this sweep reached. Both booleans above are claims made inside
  it, so read them together: fully verified at `L0` speaks for the rules `L0` can reach, not for
  the whole catalogue.
- **`counts`** — the tallies shown above, and they are not all over the same set. Every count but
  the last two is taken over the applicable, unwaived findings; `notApplicable` and `waived` are
  the two exclusions that set is defined by. Sharing a set does not make the rest a partition of
  it — a passing diagnostic finding is counted by none of them — so do not derive one count by
  subtracting others. `unverified` and `notApplicable` are different facts and the difference is the point:
  unverified means a probe ran and established neither answer, not-applicable means the rule was
  never attempted at this level. The text report — what a terminal run prints — draws them as
  `UNVR` and `N/A`, and conflating them misreads the report; per finding,
  `"applicable": false` is what marks the never-attempted case.

### 3. Read one finding from `findings`, field by field

```
jq '.data.findings[0]' report.json
```

`findings` holds one entry per rule in the catalogue — including the rules this run did not judge,
which say so on the finding rather than by being absent. The first finding of the fixture run,
whole:

```json
{
  "ruleId": "A1",
  "verdict": "fail",
  "detail": "the valueless flag exited 0; the valueless flag left 14 bytes on stdout; the valueless rejection did not name the offending flag; the value-carrying flag exited 0; the value-carrying flag left 14 bytes on stdout; the value-carrying rejection did not name the offending flag",
  "evidence": ["b8d1ef65cae5", "913ff831a756"],
  "probes": [
    { "id": "b8d1ef65cae5", "args": ["--acc-probe-xyzzy-flag"] },
    { "id": "913ff831a756", "args": ["--acc-probe-xyzzy-flag", "acc-probe-xyzzy-value"] }
  ],
  "tier": "core",
  "deviation": "defect",
  "rulePath": "docs/wiki/rules/parsing/unknown-flag-exits-nonzero.md",
  "probeLevel": "L0",
  "coverage": "partial",
  "coverageGaps": [
    "only the root is probed so a flag unknown to a subcommand is not",
    "the MUST NOT act on a suggested correction clause is not exercised here",
    "the exit code is only required to be non-zero here and not the declared 2",
    "only long flags are probed so a short flag or a cluster of short flags is not",
    "that the command did not otherwise proceed and that the value was not absorbed are both inferred from a non-zero exit rather than observed"
  ],
  "applicable": true,
  "excused": false,
  "waived": false
}
```

- **`ruleId` / `rulePath`** — addressable: `acc show A1` prints the rule, `--body` the whole
  page.
- **`verdict` / `tier` / `deviation`** — the verdict is `pass`, `fail`, or `unverified`; `tier`
  says whether a fail gates the run (`core`) or is reported only (`diagnostic`); `deviation`
  says what a violation means — `defect`, or `design-choice` where a waiver records a decision.
- **`detail`** — the verdict in one line. Its clauses are written per checker and stand in no
  fixed relation to `probes`: a rule may cite nineteen probes and say one sentence about them.
  A1 above happens to group its clauses by probe — that is the checker's wording, not a
  contract, and most findings in this same report do not. Use `probes` for what was sent, never
  the clause order.
- **`evidence` / `probes`** — the observation ids this verdict rests on, and those same ids
  resolved in place: one probe entry per cited id, in `evidence`'s order. A probe entry carries
  exactly what its id identifies and nothing more — what the target _did_ is the next step. It
  carries its own `id` so you can match by id rather than by position, and four fields besides:
  - **`args`** — the argv after the target, which is the part that varies between probes.
  - **`env`** — environment overrides the probe imposed, present only where it imposed any:
    `--version` under a hostile `HOME` is the case that needs it.
  - **`repeat`** — which send this was, present only where a rule compares byte-identical runs
    and the repetition is the thing being measured.
  - **`unresolved`** — `true` on the entry for an id that names no observation in this run. A
    kit bug when it appears, and published rather than dropped: a silently shorter list would
    read as a complete one.
- **`coverage` / `coverageGaps`** — how much of the rule this verdict actually establishes,
  and the named remainder. A `pass` with gaps is the text report's `PASS+`.
- **`probeLevel` / `applicable`** — the depth the rule needs, and whether this run reached it.
  `applicable` is the per-finding form of the `notApplicable` count above, and it is false for two
  different reasons. Only one of them announces itself: a rule no checker answers to at any level
  says so in its `detail` and again in its `coverageGaps`, while a rule merely deeper than this
  run is visible by comparing its `probeLevel` against the report's `level`.
- **`excused` / `waived`** — what your own `acc.config.json` said about this rule, and they are
  opposite claims: `excused` is a `knownFailures` entry, a defect you have acknowledged and intend
  to fix; `waived` is `severity: "off"`, a declaration that the rule does not apply to your tool.
  Both are false throughout an unconfigured run, and each is echoed with its reason in a block of
  its own further down.

### 4. Resolve a probe to its `observations` entry

`probes` says what was sent. The outcome lives in `observations` — `.data.observations[]`, one
entry per probe that ran, joined by `id`:

```
jq '.data.observations[] | select(.id == "b8d1ef65cae5")' report.json
```

An observation repeats what was sent and adds what came back. What was sent:

- **`id` / `args` / `env` / `repeat`** — the same four the probe entry carries, and the same
  values: an observation is the outcome side of an invocation the probe entry identifies.
- **`launchAdjustment`** — present only when the wire argv actually delivered to the target
  differed from the recorded `args`. Today the only source is the runner prepending a `--` for a
  `bun` launcher so A6's terminator survives Bun's own stripping. It names the wire form in
  prose, and it is the field to read before replaying: `args` alone against this target gives you
  a different delivered argv than the one this record's verdict was decided from.
- **`inertness`** — the probe's safety class; the four are listed in
  [how to establish your target is safe to check](./how-to-establish-your-target-is-safe-to-check.md).
- **`purposes`** — every rule that read this one invocation, which is how one bare
  (argument-less) invocation can decide C2 and D2 at once.

And what came back:

- **`exitCode` / `signal` / `crashed` / `timedOut` / `spawnFailed`** — how it ended, and **at
  most** one of the first two is ever set. Do not read `exitCode: null` as "then `signal` says
  how it died": the kit nulls `exitCode` whenever it killed the target itself (`timedOut` or
  `truncated`), because a process we killed never chose a status, and on the path where the
  target's `close` never arrived it records **both as null** rather than name a signal it did not
  observe. `crashed` is the field that carries the distinction `signal` alone cannot — a signal
  the kit did **not** send — so check `crashed`, `timedOut` and `truncated` before attributing a
  death. `spawnFailed` is the case where none of the others mean anything, because nothing ran.
- **`stdoutBytes` / `stderrBytes` / `stdoutDigest` / `stderrDigest`** — how much was RETAINED on
  each stream, and a digest of exactly those retained bytes. Retained, not written: when
  `truncated` is true the target was killed at the ceiling and what it would have written next is
  unknowable, so read these two together with that field — they are a floor, never a total. The
  bytes themselves are deliberately absent: a digest answers the equality question a report is
  actually asked, without the retention and redaction problems an unbounded copy of the target's
  output would bring with it.
- **`stdoutLossy` / `stderrLossy` / `truncated`** — the three ways the record is narrower than
  the run. The `Lossy` pair say the decode threw information away, so the digest is the only
  faithful record of that stream; `truncated` says the runner's stream ceiling was reached.
- **`durationMs` / `timeToFirstByteMs`** — wall-clock timing. The second is null when the target
  wrote nothing at all, on either stream — which a silent success and a silent hang both do, so
  it is `timedOut` rather than this field that tells those two apart.

### 5. The rest of `.data`, briefly

- **`target` / `targetArgv0`** — the path you gave, and the argv the kit actually spawned —
  a `bun` launcher is resolved here. What decides a launcher limit like A6's `--` swallow is not
  this array by itself but whether a per-observation `launchAdjustment` compensated for it (see
  above): `targetArgv0` says how the target was launched, `launchAdjustment` says whether the
  argv it received matched the recorded `args`.
- **`notApplicable`** — the rules this run did not judge, **by name**, so a rule mislabelled with
  too deep a `probeLevel` — or one no checker has ever answered to — is visible instead of merely
  absent. The same set `counts.notApplicable` gives the size of.
- **`configSource`** — which `acc.config.json` was read: `{origin, path, dir}`, with
  `"origin": "none"` when none was.
- **`capturedAt` / `sweep`** — when the sweep ran (ISO 8601), and the mark every rendering of that
  one run shares. `capturedAt` is what tells a month-old artifact apart from a live one; `sweep` is
  deliberately time-free, so two sweeps carry the same mark exactly when their evidence is
  identical. Pair reports on `sweep`, date them with `capturedAt`.
- **`targetIdentity`** — the target's own `--version` bytes, quoted, with the observation id
  they came from, and not verified to be a version.
- **`surface`** — whether the root enumerated its flags (`status`, plus the rejection evidence
  read to decide it); the comparison in
  [how to record surfaces below the root](./how-to-record-surfaces-below-the-root.md) starts
  from this.
- **`advertisedVerbs`** — the verb set the target names at its own root, against the first token
  of each recorded path. `status` is `not-asserted`, `no-batch` or `compared`, and it is the field
  to branch on: **`not-asserted` means nothing was compared, NOT that the target advertises no
  verbs.** `open` is the openness of `union` — the set the directions are computed over — and is
  the one to read before acting on a finding, because `quoted.open` describes only the capture
  whose words are shown. When `status` is `compared`, `recordedNotAdvertised` is the defect
  direction, `notCoveredByBatch` is coverage rather than an accusation, and `disagreement` names
  spellings one asserted capture carries and the other does not. Evidence, not a rule: no rule id,
  no verdict change.
- **`declaration` / `recordedSurfaces`** — the two fields that appear only when you supplied
  something: a declaration file to diff the target against, and a batch of surfaces recorded below
  the root. Both are evidence on the same terms as `surface` — no rule reads either, and neither
  moves a count. Absent means you passed nothing, never that everything agreed;
  [how to record surfaces below the root](./how-to-record-surfaces-below-the-root.md) is where they
  are worked through.
- **`evidenceGaps`** — per rule, what a pass did not establish: the JSON behind the text
  report's `NOT FULLY VERIFIED` block.
- **`waivers`, `knownFailures`, `severityOverrides`, `staleExpectations`,
  `inertExpectations`** — your config's declared exceptions and what became of each.
- **`kitVersion`** — the kit that produced the report; the verdict line quotes it in text mode.

## Verification

Three expressions whose answers the page has already committed to, against the fixture report:

```
jq '.data.conformant' report.json                        # false
jq '[.data.findings[].verdict] | unique' report.json     # ["fail","pass","unverified"]
jq '[.data.findings[].probes[]?.id] - [.data.observations[].id] == []' report.json   # true
```

The third closes the join: every probe a finding cites resolves to an observation in the same
document. If a citation ever cannot be resolved, its probe entry carries `unresolved` —
`"unresolved": true` — rather than silently shortening the list. No such entry appears in a
normal run — the first two checks, passing alongside the third, establish that.
