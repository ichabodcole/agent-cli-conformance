---
type: guide
title: How to read the check report JSON
description:
  The shape of what `acc check --json` writes, worked against a real run — the envelope, the
  verdict block, one finding field by field, and how a probe resolves to what actually happened.
tags: [guide, conformance, acc-check, evidence]
related: [tutorial/check-your-first-cli, concept/conformance, concept/machine-mode]
status: stable
generated: { by: claude-opus-5, at: 2026-08-29 }
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
| a finding's `.summary`  | `.detail` — the verdict in one line, in the checker's wording |
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
- **`fullyVerified`** — the stricter claim, and the one that can be false in a report where
  `conformant` is true and no core rule failed: every applicable core rule was actually
  established, not merely un-violated. See
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

- **`ruleId` / `rulePath`** — the catalogue id, and the repo-relative path of the wiki page that
  states the rule (`docs/wiki/rules/…`, as in the specimen above). Every finding carries a path,
  including one for a rule no checker answers to yet, so a verdict you cannot interpret always
  names the page that explains it. Both are addressable without the file: `acc show A1` prints
  the rule, `--body` the whole page.
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
  opposite claims: `excused` is true only while a `knownFailures` entry is suppressing something
  — the rule is named in your config AND its verdict is still `fail` or `unverified`. It becomes
  false the moment the rule passes, and the entry then surfaces in `staleExpectations` instead; `waived` is `severity: "off"`, a declaration that
  the rule does not apply to your tool.
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
- **`launchAdjustment`** — present only when the argv the kit put ON THE WIRE differed from the
  recorded `args`, and it names that wire form in prose. Three argv are in play and only two of
  them are ever equal: `args` is what the probe asked to send, the wire form is what the kit
  actually spawned, and what the target RECEIVES equals `args` — that is the point of the
  compensation, not a coincidence. Its only source is the runner prepending a second `--`
  for a `bun` launcher, which bun then strips, so A6's terminator survives and the target sees
  exactly `args`. **Its use is REPLAY, and it is not a delivery check**: `args` alone against
  this target gives you a different delivered argv than the one this record's verdict was decided
  from. Do not reach for it to ask whether the target got what was recorded — it cannot answer
  that, and it is absent in the one documented case where delivery really does differ (a bun
  layer hidden inside a wrapper script, where `targetArgv0` is the script and no compensation
  fires at all).
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
  death. `spawnFailed` is published for completeness and is **always `false` in a report**: the
  first probe that cannot spawn aborts the whole run with a `not_found` error envelope instead of
  producing a report at all. So do not write a CI check that tests this field to catch a target
  that will not execute: the branch can never fire. Test for the `not_found` error envelope
  instead — a report exists only when the target ran.
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
  above): `targetArgv0` says how the target was launched, and `launchAdjustment` says the kit put
  a different argv on the wire so that the target would receive `args` unaltered. Neither field
  reports what the target received, and nothing in the report does.
- **`notApplicable`** — the rules this run did not judge, **by name**, so a rule mislabelled with
  too deep a `probeLevel` — or one no checker has ever answered to — is visible instead of merely
  absent. The same set `counts.notApplicable` gives the size of.
- **`configSource`** — which `acc.config.json` was read: `{origin, path, dir}`, with
  `"origin": "none"` when none was.
- **`capturedAt` / `sweep`** — when the sweep ran (ISO 8601), and the mark every rendering of that
  one run shares. `capturedAt` is what tells a month-old artifact apart from a live one; `sweep` is
  deliberately time-free. Read it in ONE direction: two different marks mean the evidence
  differs, but equal marks do NOT prove it identical — the hash covers observation ids, exit
  codes, signals and the two stream digests, and nothing else, so a hang and an outside kill that
  both died silently collide, as do two runs that differ only in timing. Pair reports on `sweep`,
  date them with `capturedAt`, and compare the fields themselves before claiming two runs saw the
  same thing.
- **`targetIdentity`** — the target's own `--version` bytes, quoted, with the observation id
  they came from, and not verified to be a version.
- **`surface`** — whether the root enumerated its flags (`status`, plus the rejection evidence
  read to decide it); the comparison in
  [how to record surfaces below the root](./how-to-record-surfaces-below-the-root.md) starts
  from this. `status` is one of four: `enumerated` (`flags` is present), `not-enumerated` (root
  rejections were read and none named a set — a statement about the tool's error text, not about
  what it accepts), `enumerated-none` (a root rejection named a set under a recognised key AND
  that set was empty — the target answered rather than declined, and `emptySetKeys` names which
  key held it), or `no-evidence` (nothing readable was recorded at all — a statement about the
  run, not the tool). **`emptySetKeys` names the key an `enumerated-none` set came from**, so the
  claim is checkable against the bytes rather than trusted; it carries no members because there
  were none — the whole content of the observation is which key was empty. The same field, on the
  same terms, appears on a recorded-surfaces reading (see
  [how to record surfaces below the root](./how-to-record-surfaces-below-the-root.md)) and on
  `acc compare`'s per-target `SurfaceRow`, described below.

  **A report written before `enumerated-none` existed cannot be reread as one.** The rule this
  kit otherwise holds — a thing missing from an older artifact renders as "not recorded by that
  kit", never as an absent thing — is implemented everywhere by keying on a missing field, and this
  change does not produce a missing field. It produces a present field, `surface.status`, holding
  a value that has quietly changed meaning: an old report's `not-enumerated` was written back when
  that was the only way to say "the target named no set", so it is indistinguishable, in the
  stored JSON, from a target that in fact answered with an explicit empty set. **This cannot be
  recomputed from an old artifact** — the streams that carried the bytes are dropped at write time
  by design, so there is nothing left to re-read the distinction out of. There is deliberately no
  `kitVersion` comparison to paper over this: a version check would be the first of its kind in
  this code and would need its own contract for what counts as "before", and stating the limit
  plainly is cheaper and matches how this project handles other things it cannot establish. Treat
  `not-enumerated` on an artifact you did not just produce as "not-enumerated, or possibly a
  stale `enumerated-none`" rather than as settled.

  **The reverse direction is a known, unfixable limit of the older kit, not of this one.** A kit
  built before `enumerated-none` existed reads `surface.status` with an `if`/`else` that recognises
  only the statuses it shipped with; a status it does not recognise falls through to the branch for
  `no-evidence` and prints "nothing readable was recorded" — a confident, wrong "we did not look"
  for the one status that means "we looked and it said none". This is reachable today, because
  `acc report` and `acc compare` both accept any report file, including one written by a newer
  kit. It is not repairable from here: the fallthrough shipped in kits that have already gone out,
  before this state existed for them to handle, and this kit's own exhaustive rendering (see
  `surfaceSummary` in `src/acc/kit/surface.ts`) cannot reach back into a binary someone else is
  still running.

  **`acc compare` publishes the same claim about a fleet, not a single tool**, and has no JSON
  guide of its own — this is that field's documented home. Its `Comparison.surfaces[]` array
  carries one `SurfaceRow` per input report, each with `label`, `status`, and, only where they
  apply, `flags`, `consistent`, `emptySetKeys` and `nonFlagCandidates` — carried across from that
  input's own `Report.surface` on the same terms described above, so `enumerated-none` in a
  comparison means exactly what it means in a single `check` report, key and all. `status` adds a
  fifth value that a single report never carries: `not-recorded`, printed when that input report
  predates the capture entirely — a fact about the FILE being compared, not about the target it
  describes, and not to be confused with `no-evidence` (a fact about a run that tried and got
  nothing). `nonFlagCandidates` is the near-miss clause carried the same way: a set the target
  named that is not flag-shaped, so `not-enumerated` and `enumerated-none` can both explain what
  else was seen rather than reading as silence. Both fields exist on `SurfaceRow` so that `compare`
  renders the identical sentence `check` does, through the one `surfaceSummary` function, instead
  of inventing a second wording for the same fact.

- **`advertisedVerbs`** — the verb set the target names at its own root, against the first token
  of each recorded path. It is the one structure on this list a bullet cannot carry alone, so here
  it is from a run you can reproduce — the kit against its own CLI, which unlike the fixture above
  does advertise verbs:

  ```
  bun run acc check src/acc/cli.ts --json | jq '.data.advertisedVerbs'
  ```

  ```json
  {
    "status": "no-batch",
    "capturesRead": 2,
    "hedged": [],
    "open": false,
    "quoted": {
      "verbs": ["rules", "show", "path", "tags", "version", "schema", "check", "probe-plan", "report", "compare"],
      "shape": "envelope-choices",
      "open": false,
      "confirmationRequired": false,
      "from": "unknown-verb-rejection",
      "observationId": "7b14f3dba1a0",
      "args": ["acc-probe-xyzzy-verb"],
      "stream": "stderr"
    },
    "union": ["check", "compare", "path", "probe-plan", "report", "rules", "schema", "show", "tags", "version"]
  }
  ```

  Read `status` first — `not-asserted`, `no-batch` or `compared` — and note that
  **`not-asserted` means nothing was compared, NOT that the target advertises no verbs.**
  `capturesRead` is how many root captures were readable at all — the denominator that makes
  `not-asserted` a measurement rather than a shrug. `quoted` is the one capture whose words are
  shown, carrying the verbs it named, the `shape` they were read in, and the `observationId` so
  you can resolve it in `observations` like any other citation; `hedged` holds sets that WERE read
  but not asserted, so a hedge renders as a hedge instead of as silence. `union` is the set the
  comparison is computed over — above it
  equals `quoted.verbs` sorted, because there was no batch to union with. `open` is the openness
  of `union` and is the one to read before acting on a result, because `quoted.open` describes
  only the single capture shown.

  The three direction fields appear only when `status` is `compared`, which needs a recorded
  batch — see
  [how to record surfaces below the root](./how-to-record-surfaces-below-the-root.md).
  `recordedNotAdvertised` is the defect direction (you recorded a verb the target never
  advertises); `notCoveredByBatch` is coverage rather than an accusation (advertised, but your
  batch did not record it); `disagreement` names spellings one asserted capture carries and the
  other does not. Evidence, not a rule: no rule id, no verdict change.

- **`declaration` / `recordedSurfaces`** — the two fields that appear only when you supplied
  something: a declaration file to diff the target against, and a batch of surfaces recorded below
  the root. Both are evidence on the same terms as `surface` — no rule reads either, and neither
  moves a count. Absent means you passed nothing, never that everything agreed;
  [how to record surfaces below the root](./how-to-record-surfaces-below-the-root.md) is where they
  are worked through.
- **`evidenceGaps`** — per applicable core rule, what this run did not establish — **whatever the
  verdict was**. A `pass` with partial coverage contributes the clauses its checker never looked
  at; a `fail` and an `unverified` each contribute a row as well, and theirs opens with the
  verdict and the finding's `detail`. So a row here is not evidence of a qualified pass: read the
  matching finding's `verdict` before drawing one. It is the JSON behind the text report's
  `NOT FULLY VERIFIED` block.
- **`waivers` / `knownFailures` / `severityOverrides`** — what your `acc.config.json` declared,
  echoed back joined to what this run actually found: rules you turned off and the verdict each
  reached anyway, debts you acknowledged with the reason you gave, and rules you moved between
  tiers in either direction.
- **`staleExpectations` / `inertExpectations`** — the two ways a `knownFailures` entry stops
  meaning what you wrote, and they call for opposite actions. `staleExpectations` lists entries
  whose rule now **passes** — you fixed it, so delete the line. `inertExpectations` lists entries
  the run never **evaluated**, because the rule was out of scope at this level or came back
  `unverified`; the debt may be entirely intact, so do not delete those — go and find out. A rule
  moving to a deeper probe level is what silently turns the second kind from a live suppression
  into a line that suppresses nothing.
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
normal run, and the third check passing is what establishes it: an unresolved entry keeps the id
it could not resolve, so that id would survive the subtraction and the expression would be false.
The first two checks are not part of that warrant — they pin the verdict and the verdict
vocabulary, which is a separate claim.
