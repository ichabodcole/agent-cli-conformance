---
type: report
generated: { by: claude-opus-5, at: 2026-09-02 }
status: draft
lifecycle: live
description:
  Feedback on the release skill from the run that cut the fourth-enumeration-state release. One
  correction written earlier the same day paid for itself on first use; two steps have gaps the run
  exposed — a brief that invites the writer to include what it does not want, and a read cycle that
  specifies when to stop but not what to ask.
tags: [tooling, remediation, docs]
subject:
  which steps of the release skill held, which misfired, and what the run measured about each
examined:
  the promotion of 51 commits from `develop` to `main`, PRs #34 and #35, four cold reads of one
  release note, and a cascade-check over eight contracts; macOS, 2026-09-02
---

# What the release skill got right, and what it missed

Filed under the skill's own § 8, which asks a run to close by reporting on the file rather than
working around it silently. Three findings, one of them a step that worked.

## The § 0.5 correction earned itself on first use

The dry run printed `Considering: 110 commits` against a range of 51. The wording that step carried
until earlier the same day said a count far larger than the range means release-please has lost its
anchor and will regenerate the changelog from further back — so the reading was a defect, and the
next move was to chase it.

The corrected wording says the count reports commits **fetched**, not commits attributed, and that
`updating from X` is the check. `X` was `0.1.10`, matching the released `v0.1.10`, so the anchor was
intact and the run continued. Both branches' manifests agreed, which is the confirming check the step
now names.

The count and the range differ by more than a factor of two on a routine promotion. Recording this
because a step that stops producing false alarms leaves no trace otherwise, and the next reader has
no way to tell the difference between guidance that never fired and guidance that was fixed.

## § 1's brief invites what it does not want

The step says to dispatch a fresh agent with the commit range and nothing else, and to say in the
brief that the note is _"what this release ships, and what changed that a consumer has to act on."_
That is accurate and it is not sufficient.

The tree the writer is pointed at contains `docs/reports/` and `docs/plans/`. In this repository the
most quotable recent artifacts are records of process, so a writer reconstructing faithfully from the
tree finds them and uses them. The first note came back at 153 lines carrying a sweep's invocation
counts, a defect-class finding, a limits section, and a closing line naming thirteen rulings taken
without asking. A cold reader called that last one out directly: _"'thirteen rulings taken without
asking' is a phrase written for a colleague, not a user, and it slightly alarms me for no actionable
reason."_

The writer did nothing wrong. The brief did not tell it what to leave out, and everything it included
was true.

**Proposed addition to § 1's brief.** The note is for someone who already has the release and wants
to know what is different — not why it was done, not evidence that it works, and not how the work
went. A reader who skipped a line should be no worse off unless that line named something they will
meet.

## § 2 specifies when to stop reading but not what to ask

The cycle is precise about termination: a read returning defects earns another, a read returning
preferences is the signal to stop, and the count of reads is not the measure. That held — four reads
returned 5 defects, then 3, then 1, then none.

What the step does not say is what to ask a reader for. The generic request returns terms and a
takeaway, both useful. The findings that shortened the note by 60 per cent came from two categories
added to the brief by hand:

- **WASTED** — anything read that did not change what the reader would do, quoted.
- **BLOCKED** — anything the note asks or implies, where the reader could not do it, could not tell
  whether they had succeeded, or would have to go and find something the note does not supply.

`BLOCKED` produced the sharpest single finding in the run: the note stated the exit-code rule for a
malformed stored report without saying which side of it the new status fell on, and the reader
answered _"this is the single thing I most wanted to go check, and it's the one that would make me
write a wrong assertion."_ No read that was not asked that question raised it.

**Proposed addition to § 2.** Name both categories in the reader's brief. The cycle already knows
when to stop; it should also say what a read is for.

## One thing the run confirmed rather than found

The step warning that both merge flags fail silently is worth its length. The verification it
prescribes — subject against the note's first line, body length against the note's — returned
`4042 bytes` against an expected 4042 on a promotion where nothing had gone wrong. That is the check
being cheap when it passes, which is the only reason it is affordable at the one moment its failure
is still repairable.
