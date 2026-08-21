---
type: report
generated: { by: claude-opus-5, at: 2026-08-21 }
status: stable
lifecycle: live
description:
  The regression run of v0.2.0 by the adopter who filed the first trial — every claim checked
  rather than read, the blocker cleared, no regressions, and the kit finding a real defect in
  their CLI that 107 of their own tests never could.
tags: [conformance, adoption, evidence, verdict]
subject: acc v0.2.0, as used by the adopter who reported against v0.1.1
examined: v0.2.0 (ab7265b) against Spellbook's `grapevine` CLI
---

# Second adoption trial — the regression run

> **Renamed since.** The key described here is now `defaultOutput: "json"`. It was `machineMode:
"default"` when this was written, and the old spelling is rejected as an unknown key rather than
> silently ignored. The record below is left as written.

## What this was

The same agent (`assay`), the same CLI, the upgraded kit. Round one's report is
[2026-08-20](./2026-08-20-first-external-adoption-trial.md); this is the run that says whether any
of it worked.

They were chosen **because they are contaminated**. They hold the only baseline anyone has, so they
are the only reader who can answer _did it move_ — and for exactly that reason they can no longer
test first contact. A separate cold run on a different CLI is the other half, and has not happened.

They were sent no list of what changed. The release note makes those claims and whether they hold
was part of the test; the message ended _"do not take the release note's word for anything… on past
form at least one is probably still wrong."_ One was.

## Verdict

**The release worked, and the adopter's own assessment moved from "roughly break-even" to "clearly
positive" for a reason they name.** That was the one criterion in
[the plan](../plans/2026-08-20-second-adoption-release.md) that could not be graded from inside this
repository.

| Q from the trial design                  | Round 1                       | Round 2                                   |
| ---------------------------------------- | ----------------------------- | ----------------------------------------- |
| Are the findings **true**?               | **no** — one false positive   | yes; the false positive is gone           |
| Are they **worth acting on**?            | break-even                    | **clearly positive**                      |
| Can they **install and run it** unaided? | barely — ~20 min, silent lie  | ~3 min, and the clone is no longer needed |
| Can they **triage** unaided?             | reached the config, it failed | reached it, it worked                     |

## Findings

### SEC-1 — the kit found a real defect their own suite could not

Declaring `machineMode: "default"` on `grapevine` took the gate from green to red:

```
FAIL  B5  machine mode via the declared default and the parser error came back
          as prose on stderr (exit 2): "grapevine: unknown command: --acc-probe-xyzzy-flag\n"
```

`grapevine` emits JSON on every success path and **prose on stderr for parser errors**. It has 107
tests. None of them ever compared the two, because the error path has been prose since the first
commit and nothing inside the project had reason to contrast it with the success path.

The consequence is the one the catalogue exists for: an agent driving `grapevine` can machine-read
every success and must regex every failure — on a CLI whose stated purpose is agent-to-agent
coordination.

In their words: _"I did not find that. Your kit did, on the second run, through a mechanism that
did not exist last week and that I asked for. That is the bar I set, met exactly."_

They are **not** fixing it in the trial branch: roughly fifty `die()` call sites and a breaking
change to `grapevine`'s stderr contract, which belongs to the repo owner rather than a trial
drive-by. Filed there as a real finding.

### SEC-2 — the release note overstated who needs to re-baseline

The note said two rules changed verdicts on unchanged targets, _"D1 always"_ — inside the paragraph
whose whole job is telling people how to upgrade safely. Measured on `grapevine`, which has a
working `--version` and no HOME dependency:

```
v0.1.1: PASS   version reported with an unusable HOME and XDG_CONFIG_HOME…
v0.2.0: PASS+  version reported with an unusable HOME and XDG_CONFIG_HOME…
```

Verdict unchanged; only wording moved. D1 moves for targets that **reached the bad clause** — no
`--version`, or a crash — not always. Anyone diffing baselines on that advice would have gone
looking for a change that was not there and might have concluded the upgrade had not taken.

**Corrected in the published release note.** The note is a claim like any other, and it was wrong.

### SEC-3 — P1: D3 fails the discoverable statement and passes the undiscoverable one

Their one design objection, and sharper than round one because they now hold both runs.

Round one they added an accurate block to `grapevine`'s help:

```
Output:
  Data commands emit JSON on stdout by DEFAULT; pass --human for prose where a
  command offers it. Diagnostics and warnings go to stderr, never stdout.
```

**D3 still fails on it** — re-confirmed in this round's no-config run. Add `machineMode` to
`acc.config.json`, a file no caller of `grapevine` can ever see, and **D3 passes**.

> D3's stated question is _whether machine output is discoverable_, and it now answers that question
> by consulting the one artifact a consumer has no access to, while ignoring the one they do. The
> rule's name and its behaviour have come apart.

This is not a hidden defect — the tradeoff is stated in
[conformance](../wiki/concepts/conformance.md) and in the release note — but naming a tradeoff does
not make it the right one. Their proposal: D3 should accept **either** a recognised machine-mode
statement in help **or** the declaration, with the declaration as the fallback for tools that
genuinely have nothing to advertise. Failing that, D3 measures "did you tell the kit" and should
say so.

### SEC-4 — the documented upgrade still fails on its first attempt

`bun add -d '…#v0.2.0'` still returns `no commit matching "v0.2.0" found (but repository exists)`
for anyone who has installed the package before — the documented stale-clone case, unchanged and
correctly predicted.

What did change is the recovery. `bun pm cache rm` produced **consistent** bytes: installed
`package.json`, `acc --version` and the installed SHA all agree with the `v0.2.0` tag. Round one's
surgical bare-clone delete got the right SHA in the lockfile and the wrong bytes on disk; the
documented fix has no such failure mode.

Their suggestion: lead the upgrade line with `bun pm cache rm &&` rather than describing it as a
remedy afterwards.

## What they verified rather than accepted

Recorded because the method is the point — they built fixtures for cases `grapevine` could not
reach, instead of reading the note.

- **D1 fixed, and not over-narrowed.** They built a CLI that genuinely depends on `HOME` and
  confirmed the clause still fires. On the message itself: _"The old message asserted a cause. This
  one states the contrast that licenses the claim. That's the actual fix, not just the narrowing."_
- **Config loads before the first spawn — measured.** A fixture appending a line per invocation:
  malformed config → exit 2 and **zero** spawns; valid config → exit 9 and **eighteen**. _"The
  'eighteen times' in the release note is literally the number."_
- **B3 stays `unverified` under the declaration**, with the reason attached and a cross-reference
  to B5. _"A release that claimed the declaration fixed everything would have been the easy lie."_
- **Both disclosed limits behave as documented** — NDJSON on the error path reports `unverified`;
  a target advertising `--json` **and** declaring the default is failed on the selector path, with
  the losing path named.
- **E1 and G1 still reach verdicts** on the observation C2 excluded.
- **No regressions.** They looked specifically at the population-of-one case, expecting a vacuous
  pass, and got `UNVR C2 fewer than two usage-error shapes remain to compare once A2, D2 are
waived`. The exit-64 guard held.
- **Nothing moved without being asked.** v0.1.1 and v0.2.0 give byte-identical verdicts on
  `grapevine` with no config. _"An upgrade that changes no verdict until you ask it to is the
  correct shape for a thing that gates CI."_

## The blocker, cleared

The exact JSON from their round-one report, committed unchanged:

```
CONFORMANT (L0) — 0 core violated, 3 core unverified, 14 core partially covered · 1 waiver  [acc 0.2.0]
PASS+ C2  2 usage-error shapes all use exit 2; … the D2 shape was excluded, waived by config
WVD   D2  bare invocation exited 0; … (waived; would FAIL)
exit 0
```

No `knownFailures`, nothing deliberate recorded as debt, and the narrowing visible in the artifact
rather than hidden in the config: _"I asked to stop lying, you made the honest version
self-documenting."_

## What this does not settle

**Round three on this CLI will be thin.** Their own framing: the value came from a feature scoped
by round one's complaint, which is a fair result for a conformance kit but means the same target has
little left to give. The thing that would reach further is B3 — a data command it can safely run —
and that needs `L1`.

**First contact is still untested.** Everything here comes from a reader who has now read the repo
twice. Whether a stranger can install and run it unaided is the other half of the trial design and
has not been run.

## Disposition

1. **SEC-3** — the D3 semantics. A design change to a rule, not a bug fix; the recommendation and
   the decision belong together.
2. **SEC-4** — cheap: lead the upgrade line with the cache clear.
3. **SEC-1** — theirs to fix, in their repo. Nothing for us beyond having found it.
4. **SEC-2** — actioned; the published note is corrected.
