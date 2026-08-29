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

`conformant` is the gate: no core rule violated. `fullyVerified` is the stricter claim — see
[conformance](../concepts/conformance.md) for why a target can hold the first without the
second. In `counts`, `unverified` and `notApplicable` are different facts: unverified means a
probe ran and established neither answer; not-applicable means the rule was never attempted at
this level. The text report — what a terminal run prints — draws them as `UNVR` and `N/A`, and
conflating them misreads the report; per finding, `"applicable": false` is what marks the
never-attempted case.

### 3. Read one finding, field by field

```
jq '.data.findings[0]' report.json
```

The first finding of the fixture run, whole:

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
- **`probes`** — what was sent, resolved in place: one entry per cited evidence id, in
  `evidence`'s order. `args` is the argv after the target. `env` and `repeat` appear only where
  they are the thing that distinguishes two probes — `--version` under a hostile `HOME`, or the
  third send of a byte-identical argv for a rule that compares runs. A probe entry carries
  exactly what its id identifies and nothing more; what the target _did_ is the next step.
- **`coverage` / `coverageGaps`** — how much of the rule this verdict actually establishes,
  and the named remainder. A `pass` with gaps is the text report's `PASS+`.

### 4. Resolve a probe to what happened

`probes` says what was sent. The outcome lives in `.data.observations[]`, one entry per probe
that ran, joined by `id`:

```
jq '.data.observations[] | select(.id == "b8d1ef65cae5")' report.json
```

An observation carries the same `args` (the field is `args` here too) plus the outcome: how it
ended (`exitCode`, `signal`, `crashed`, `timedOut`, `spawnFailed`), where the bytes went
(`stdoutBytes`, `stderrBytes`, digests of both, `stdoutLossy`/`stderrLossy`, `truncated`),
timing (`durationMs`, `timeToFirstByteMs`), the probe's `inertness` class (the four classes are
listed in
[how to establish your target is safe to check](./how-to-establish-your-target-is-safe-to-check.md)),
and `purposes` — every rule that read this one invocation, which is how one bare (argument-less)
invocation can decide C2 and D2 at once.

### 5. The rest of `.data`, briefly

- **`target` / `targetArgv0`** — the path you gave, and the argv the kit actually spawned —
  a `bun` launcher is resolved here, and what lands in this array is what decides a launcher
  limit like A6's `--` swallow.
- **`configSource`** — which `acc.config.json` was read: `{origin, path, dir}`, with
  `"origin": "none"` when none was.
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
document. If a citation ever cannot be resolved, its probe entry says so with
`"unresolved": true` rather than silently shortening the list. No such entry appears in a
normal run — the first two checks, passing alongside the third, establish that.
