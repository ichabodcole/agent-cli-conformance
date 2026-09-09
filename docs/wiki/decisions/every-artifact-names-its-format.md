---
type: decision
title: Every artifact names its format, and nothing before 1.0 reads across a major
description:
  Every document the kit writes or reads carries a `formatVersion` major; within a major, fields
  and rule ids are only added, never renamed or removed; a reader refuses a document whose major
  it does not know. The report gains `formatVersion`; the wiki, spec and checkers are not
  versioned separately.
tags: [versioning, contract, report, declarations, release]
related:
  [
    decision/pre-1-0-while-the-design-moves,
    guide/how-to-read-the-check-report-json,
    guide/how-to-record-surfaces-below-the-root,
    concept/conformance,
  ]
status: stable
generated: { by: claude-fable-5-1, at: 2026-09-08 }
---

# Every artifact names its format, and nothing before 1.0 reads across a major

## Context

[Stay pre-1.0](./pre-1-0-while-the-design-moves.md) narrowed the promised surface to rule ids,
the exit-code taxonomy and `conformant`, and put the report's whole JSON shape on the unstable
side. The roadmap's second step asks for more than that: coordinates on every document a consumer
can depend on, so a stored report can be re-interpreted after the shape has moved. Four adopter
asks wait on it, each wanting a field added to a declaration or a signal promised from the
report, and each parked because there was no version to promise it under.

The kit reads or writes three documents: the declaration, the recorded-surfaces batch and the
report. Two of them already carry a coordinate. A declaration opens with `formatVersion`, a batch
does too, and both readers refuse a major they do not know rather than reading the fields they
recognise. The report carries `kitVersion`, the version of the instrument, and until now nothing
about its own shape: a consumer could tell which kit wrote a file and not which shape the file
was in, except by looking for fields.

The objection to doing this earlier was that versioning the formats would mean keeping a wiki
per version and a reader per shape. This page settles what a version covers and what supporting
one costs.

## Decision

Three rules.

1. **Every document the kit writes or reads carries a format major.** The report gains
   `formatVersion`, `"0"`, as its first field, and, under `declaration` and `recordedSurfaces`, echoes
   the `formatVersion` of the declaration and the batch it read. `kitVersion` stays: it names
   the instrument, and the format major names the shape, and the two move independently.
2. **Within a major, a shape only grows.** A field or a rule id is added and never renamed or
   removed. Removing or renaming one is a new major.
3. **A reader refuses a major it does not know, and nothing before 1.0 promises to read across
   one.** `acc report` and `acc compare` refuse a report whose `formatVersion` is not the
   major they understand, as the declaration and batch readers already do. A report with no
   `formatVersion` is read by both, because every such file was written under the only major
   there has been, and `acc report` names the absence in its prelude.

What this does not do: it does not version the wiki, the spec, the checker corpus or profiles
separately. The wiki documents the live version, and the package ships it, so the wiki checked out at a
release's tag is the wiki for that release. The spec and the checkers travel with `kitVersion` until something
makes them move apart. Profiles do not exist. When any of those needs its own coordinate, it is
added as a field appended to the report under rule 2. The roadmap names the profile coordinate as
the test of this step, and that is the test: a profile name has to fit as an appended field.

## Rationale

**A format major is not a support promise.** A coordinate on a document is written by the writer
and binds no reader. It commits the writer to nothing about what future readers do with old
documents; it makes the document say what it is, so a reader can decide rather than guess. Keeping several readers and several wikis alive is the
cost of promising to read across majors, and rule 3 declines that promise while the major is `0`.

**A shape with no major makes every field a promise.** Once consumers parse a document
that does not say which shape it is, every field becomes load-bearing, because removing one
breaks a reader that cannot tell it was reading an old shape. Writing the major before 1.0 is what keeps a
later break cheap: the reader sees a major it does not know and says so, instead of reading
fields that mean something else now.

**The rule already existed in two of three places.** The declaration reader has refused an
unknown major since the format was written, on the argument that a field it cannot name may be the
one that bounds a probe's safety. The batch reader took the same rule. Giving the report the same
treatment leaves three readers sharing one rule, rather than one reader with a rule of its own.

**An absent major is accepted because it is unambiguous.** Every report written before the field
existed was written under major `0`. Refusing those would refuse every adopter's stored reports
for no information gained. For each field an older artifact lacks, `acc report` already prints that the kit which wrote it
did not record the field, and the format line joins that list.

## Consequences

**The README's promised column gains a row.** `formatVersion` on every document, and the refusal
of an unknown major, move to the stable side. Which fields the shape carries inside a major stays
on the unstable side, with the append-only rule stated beside it; a field moves left when an
adopter automates against it, as the census fields did on the same day.

**The four parked asks are unblocked on the format side.** An alias field, closed sets on
positionals, and the census pair count each become an append to a `formatVersion 0` document, decided on
its own merits. The stable signal from the declaration diff was answered by promising existing
fields by name, not by an append; what remains open there is the exit-code question, which this
page does not touch.

**A future major is a deliberate event, and a break.** Renaming or removing a report field, or
changing what one means, is a new `REPORT_FORMAT_MAJOR`, typed `!` in the commit that makes it,
and every reader of the old major refuses the new documents. That is the intended failure: loud,
at the boundary, naming both majors.

**Nothing has to be maintained twice.** One wiki, one reader per document, one live major. An
adopter holding old reports renders them with the kit that wrote them, which they pinned, or with
the newest kit, which names what the old file lacks.

## What would change our mind

- **A consumer that needs to read across a major** before 1.0. That would be the first real demand
  for a migration reader, and it would be built for that consumer's shape rather than in advance.
- **The spec or the checker corpus moving apart from `kitVersion`**, for instance a catalogue
  release with no kit change. That is the moment a separate coordinate earns its field.
- **Profiles landing.** A profile name on the report is an appended field under rule 2, and if
  that turns out not to fit, rule 2 is wrong.

## Sources

- [`docs/roadmap.md` § 2](../../roadmap.md#2-version-the-contract-not-only-the-rules), the step
  this decides, and the four adopter asks parked under it.
- `src/acc/kit/declaration.ts` and `src/acc/kit/recorded.ts`, the two readers that already refused
  an unknown major; `src/acc/kit/report.ts` for `REPORT_FORMAT_MAJOR`.
- [Stay pre-1.0 while the design is still moving](./pre-1-0-while-the-design-moves.md), for the
  promised column this page extends.
