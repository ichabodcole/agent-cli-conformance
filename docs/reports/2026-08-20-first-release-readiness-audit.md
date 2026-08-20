---
type: report
generated: { by: codex, at: 2026-08-20 }
status: stable
lifecycle: discharged
description: Whole-project audit of the first usable release; the product works, but release identity, automation, and several public claims need correction before publishing.
tags: [conformance, release, safety, testing]
subject: repository and GitHub release surface
examined: d1ff113 and GitHub remote state on 2026-08-20
---

# First-release readiness audit — 2026-08-20

## Verdict

**Conditional no-go.** The project is a usable MVP: its documented Git installation works in a
clean consumer, `acc check` produces the promised verdicts and exit codes, the reference CLI
passes its own kit, the wiki is navigable and mechanically bound to the checker registry, and the
entire gate passes. The remaining reason not to press the merge button yet is release mechanics,
not missing product substance.

Two release facts differ from the intended story:

1. `v0.1.0` already exists on the remote and the manifest already records `0.1.0`, although
   GitHub has no published Release.
2. Merging `develop` into `main` does not itself publish a release under the current
   release-please workflow. It first creates a release PR; merging that second PR publishes the
   GitHub Release.

The safest path is to accept `v0.1.1` as the first GitHub Release, preserve the Conventional
Commit history when merging PR #1, let release-please open its release PR, correct the public
contract in that PR, and smoke-test the resulting tag before merging it. If the release must be
called `v0.1.0`, stop and redesign that sequence first: the existing public tag points at the old
`main`, and moving a published tag is a materially different operation from creating a release.

## Scope and method

This review examined the repository at `d1ff113`, the open
[`develop` → `main` PR #1](https://github.com/ichabodcole/agent-cli-conformance/pull/1), and GitHub
release/workflow state on 2026-08-20. It compared the claims in the README and wiki with the CLI,
runner, checker registry, report algebra, config behavior, tests, package metadata, and Actions
workflows.

Validation performed:

- `bun run check` on Bun 1.4.0: **1,196 tests passed**, with typecheck, Biome, wiki lint, and
  artifact lint all green.
- `bun run docs:build`: **48 pages and 45 tag pages** rendered successfully.
- A cover-to-cover cold read of all **37 wiki Markdown files** (6,674 lines): the index,
  maintainer schema and style contracts, six concepts, one archetype, one decision, three
  guides/tutorials, and all 23 rule pages.
- The tutorial's conforming and broken fixtures produced the documented headline counts and exit
  codes (`0` and `9`).
- A clean consumer installed the package through a local Git URL, ran `bunx acc --version`, and
  completed a JSON conformance check successfully.
- The remote has a `v0.1.0` tag at `4638293`, no GitHub Releases, a green and mergeable PR #1,
  and one successful release-please run on `main`.

Priorities used below:

- **P0** — can prevent, misidentify, or accidentally skip the intended release.
- **P1** — contradicts a central correctness or safety promise; resolve before calling the MVP
  contract dependable.
- **P2** — important clarity, portability, or release-surface assurance work.
- **P3** — adoption polish that does not change correctness.

## Disposition — 2026-08-20

Every finding was verified against the code before it was acted on, rather than taken on the
report's word. Fifteen held. One did not reproduce.

| Id    | Verified                                                                                                            | Disposition                                                                                                                                                                                                                                                                                                                                                                                             |
| ----- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-1  | yes — no Release exists, `v0.1.0` is a bootstrap tag                                                                | **actioned as documentation**, decision recorded below. README now says releasing takes two merges and that `main` holds the next release between them.                                                                                                                                                                                                                                                 |
| FR-2  | yes — squash title resolves to the PR title `Develop`                                                               | **actioned as documentation**, decision recorded below. The README and `AGENTS.md` both name merge-or-rebase for the promotion PR, and why a squash loses the signal.                                                                                                                                                                                                                                   |
| FR-3  | yes — `conformant` ignores stale entries; exit stays `0`                                                            | **split.** Language corrected in the README and the concept. The behaviour is **promoted** — see [a ratchet the tool does not turn](../roadmap.md#a-ratchet-the-tool-does-not-turn).                                                                                                                                                                                                                    |
| FR-4  | yes — the README contained no platform word at all                                                                  | **actioned.** Platform paragraph in Getting started, naming the POSIX-only process-group bound.                                                                                                                                                                                                                                                                                                         |
| FR-5  | yes                                                                                                                 | **actioned.** The floor is Bun 1.4, which is what CI runs.                                                                                                                                                                                                                                                                                                                                              |
| FR-6  | yes                                                                                                                 | **actioned.** "already on disk" → "this run already gathered", with the durable claim left to the roadmap.                                                                                                                                                                                                                                                                                              |
| FR-7  | yes                                                                                                                 | **actioned.** The banner describes a pre-1.0 MVP instead of unwritten work.                                                                                                                                                                                                                                                                                                                             |
| FR-8  | yes, including the `100644` bin mode detail                                                                         | **promoted** — [the installed package is never the thing under test](../roadmap.md#the-installed-package-is-never-the-thing-under-test).                                                                                                                                                                                                                                                                |
| FR-9  | yes — the test asserted only `< 124`, and `schema.ts` claimed a run provokes every kind                             | **actioned, in two parts.** Uniqueness asserted, and the assertion proved to fail on a duplicated code. The comment now says what is true: three of the eight kinds are reachable and exercised, five are the declared taxonomy that nothing verifies at runtime. _(Second part added after review; the first pass fixed the test and left the comment, which is the half that carried the overclaim.)_ |
| FR-10 | yes — 51 lines, 9,568 bytes                                                                                         | **declined for now.** Hiding coverage gaps behind a flag argues against the position that the gaps are the honest part of the report. Worth revisiting as a design question, not as release work.                                                                                                                                                                                                       |
| FR-11 | yes, measured — 23 probes with A6 waived and without, and nothing else requests a `--` invocation                   | **actioned.** The concept now says sharing makes a probe free only when another checker asked for it, and names A6.                                                                                                                                                                                                                                                                                     |
| FR-12 | counts yes; the byte count **did not reproduce** — this machine reports 2290 from git 2.55.0, matching the wiki     | **actioned differently.** Two machines disagreeing on the same version is the argument against refreshing the numbers, so the capture is stamped with its coordinates and read as one observation.                                                                                                                                                                                                      |
| FR-13 | yes                                                                                                                 | **actioned.** Six page types in SCHEMA and STYLE; `tutorial` lives in `guides/`.                                                                                                                                                                                                                                                                                                                        |
| FR-14 | yes — SCHEMA claimed every rule is `implemented` while B4 is `planned`, and the lint already gated on `implemented` | **actioned.** The contract now describes the code.                                                                                                                                                                                                                                                                                                                                                      |
| FR-15 | yes, both halves                                                                                                    | **actioned.** D3/B5/B3 accept different spellings and now have a table; `--json` is the one that moves all three. The unsourced "most projects" generalisation is gone.                                                                                                                                                                                                                                 |
| FR-16 | yes — six clauses, two probe shapes of three                                                                        | **actioned.**                                                                                                                                                                                                                                                                                                                                                                                           |

### Release decisions of record

Both are plans, not completed acts — the merge has not happened. Recorded here so the discharge is
not resting on an unstated intention:

1. **The first GitHub Release is `v0.1.1`.** `v0.1.0` stays where it is, as the bootstrap tag it
   has always been. Reconstructing it would mean rewinding the manifest so release-please proposes
   a version a tag already claims, to buy a nicer number on a release nobody has installed.
2. **PR #1 lands as a merge or rebase commit, never a squash.** The repository allows all three and
   resolves a squash headline to the PR title, which is `Develop` — not a Conventional Commit, and
   so no version signal at all.

If either is wrong, this section is the thing to correct, and FR-1 and FR-2 reopen with it.

Found while verifying, not in the report: `conformance.test.ts` still described "the 20 rule
pages" — the same stale count corrected in the README earlier that day.

Found by the review of this discharge, and neither in the report nor caught by me: the README's
pre-1.0 banner said 22 rules were "enforced by a checker", which overclaims
[A4](../wiki/rules/parsing/unexpected-positionals-rejected.md) — registered, and structurally
unable to return anything but `unverified` until `L1` exists. And `README.md` and `AGENTS.md` both
claimed the hook and CI run the same gate while the hook additionally checked Markdown formatting,
so a `--no-verify` push could land unformatted Markdown that CI would never see. Fixed by moving
that check into `bun run check` rather than by softening the sentence, since the property being
claimed — neither side enforcing what the other cannot — is one this project argues for
elsewhere.

## Findings

### FR-1 — P0: the current merge will not create the release being described

Locations:

- [`README.md`](../../README.md), “Branches and releases”;
- [`.github/workflows/release-please.yml`](../../.github/workflows/release-please.yml);
- [`.release-please-manifest.json`](../../.release-please-manifest.json);
- [`release-please-config.json`](../../release-please-config.json).

The repository is already versioned as `0.1.0`; the manifest says `0.1.0`; and the remote already
has `v0.1.0`. There is no GitHub Release for it. That is neither a clean unreleased bootstrap nor
a completed first release.

The README says opening `develop` → `main` cuts a release. In the configured release-please
workflow, a push to `main` first builds or updates a **release PR**. A GitHub Release and tag are
created when that release PR is merged. The current `develop` branch contains a `fix(acc): ...`
commit, so the likely candidate is `0.1.1`, assuming that Conventional Commit remains visible
after PR #1 is merged. It will not recreate `0.1.0` merely because no GitHub Release exists.

Recommended outcome:

- Decide explicitly whether the first GitHub Release is `v0.1.1` or whether `v0.1.0` must be
  reconstructed.
- Prefer `v0.1.1`; do not move the already-pushed `v0.1.0` tag casually.
- Rewrite the README sequence as two stages: merge the promotion PR, then review and merge the
  release-please PR.
- State that `main` contains the next release between those two merges, rather than claiming it
  contains only code already released.

### FR-2 — P0: a squash merge of PR #1 can hide the commit that triggers the release

Location: [PR #1](https://github.com/ichabodcole/agent-cli-conformance/pull/1) and repository merge
settings.

PR #1 is green and mergeable, but its title is `Develop` and its body is empty. The repository
allows merge commits, rebase merges, and squash merges. A squash merge may leave the commit
headline as `Develop`, which is not a Conventional Commit and gives release-please no reliable
version signal. The user-facing `fix(acc): ...` commit currently exists inside the PR; it must
survive onto `main`, or the squash commit itself must carry an equivalent conventional headline.

Recommended outcome:

- Use a merge commit or rebase merge for this PR, preserving the existing Conventional Commits;
  or rename the PR to a deliberate Conventional Commit title before squashing.
- Add a PR body that states this is the promotion into the release workflow and that a second
  release-please PR is expected.
- After merge, verify that release-please opened a release PR for the intended version before
  doing anything else to `main`.

### FR-3 — P1: `knownFailures` is described as a ratchet, but CI does not enforce the ratchet

Locations:

- [`README.md`](../../README.md), “Per-project rules”;
- [`docs/wiki/concepts/conformance.md`](../wiki/concepts/conformance.md), “The excuse ratchet”;
- [`src/acc/kit/report.ts`](../../src/acc/kit/report.ts), `buildReport`;
- [`src/acc/commands/check.ts`](../../src/acc/commands/check.ts), final exit-code selection.

The docs say a known failure “only ever shrinks” and call a passing entry “the ratchet
tightening.” The implementation reports a passing entry in `staleExpectations`, but still exits
`0`: `conformant` ignores excused failures, and the command selects exit `9` only when
`conformant` is false.

That makes staleness advisory. If a project leaves the stale line in place, a later regression of
the same rule is excused again. The list has not ratcheted; it has remained an open-ended
suppression with a reminder attached. This matters because named debt is one of the main adoption
mechanisms and the docs explicitly distinguish it from a permanent waiver.

Recommended outcome: make stale expectations fail the gate as a configuration-maintenance
outcome, or narrow the language everywhere to “reported reminder” and say plainly that CI does
not enforce removal. The first option matches the current promise and prevents a fixed defect
from becoming silently excused again.

### FR-4 — P1: the top-level safety contract does not state the platform boundary

Locations:

- [`README.md`](../../README.md), L0 safety note;
- [`docs/wiki/concepts/probing.md`](../wiki/concepts/probing.md), “The tree bound is POSIX only”;
- [`src/acc/kit/runner.ts`](../../src/acc/kit/runner.ts), `killTree`;
- [`.github/workflows/check.yml`](../../.github/workflows/check.yml).

The runner explicitly cannot terminate a descendant process tree on Windows. Its fallback bounds
the probe promise but can leave a descendant alive. The wiki discloses this; the README safety
warning does not, and CI runs only on Ubuntu. Elsewhere the exit-code taxonomy deliberately scopes
itself to POSIX shells.

The project does not need Windows support for the MVP, but it does need a visible platform
contract. A user should not have to reach an implementation comment or a deep wiki section to
learn that timeout cleanup has weaker safety semantics on their platform.

Recommended outcome: state in Getting Started that the MVP is supported/tested on macOS and
Linux, with Windows unsupported or best-effort and the descendant-process limitation named. If
Windows is intended to be supported, add a Windows gate and real tree termination before making
that claim.

### FR-5 — P2: the documented Bun floor is not the tested Bun floor

Locations:

- [`README.md`](../../README.md), Getting Started;
- [`.github/workflows/check.yml`](../../.github/workflows/check.yml);
- [`package.json`](../../package.json).

The README promises Bun 1.3 or later. Development and CI are pinned only to 1.4.0, and the
repository specifically re-measured behavior because Bun 1.4 was a runtime rewrite. Nothing in
the gate now proves that the current source and package still work on 1.3.x.

Recommended outcome: either say Bun 1.4 or later for the MVP, or add the exact oldest supported
1.3 release to a compatibility matrix. A minimum-version claim should have a test behind it.

### FR-6 — P2: the probing concept claims observations are already on disk

Location: [`docs/wiki/concepts/probing.md`](../wiki/concepts/probing.md), opening definition.

The page says a new checker is “a new reading of evidence already on disk.” No durable observation
artifact exists. `History` lives in memory and dies with the process; the README and roadmap say
this correctly and list record/replay as planned.

Recommended outcome: change “already on disk” to “already collected in the current run.” Keep
the durable/replayable claim reserved for the roadmap item.

### FR-7 — P2: the status banner contradicts both the MVP and the wiki's status vocabulary

Locations:

- [`README.md`](../../README.md), opening status banner;
- [`docs/wiki/index.md`](../wiki/index.md) and the wiki page frontmatter.

The README says “the spec is being written” and “nothing here is stable yet.” The repository now
has a 23-rule catalog, 22 implemented checkers, stable wiki pages, two adoption guides, an
installable CLI, and an enforced spec/checker drift gate. That banner undersells what is shipping
and overloads “stable”: wiki `status: stable` means ready for consumption, while pre-1.0 API
stability is a different claim.

Recommended outcome: describe the actual state: “usable pre-1.0 MVP; rule IDs and output shapes
may still change before 1.0; checker coverage is partial.” This preserves the appropriate warning
without telling a new reader that the thing they were invited to install is not yet written.

### FR-8 — P2: the installed product is not exercised by the repository gate

Locations:

- [`package.json`](../../package.json), `bin` and `prepare`;
- [`.github/workflows/check.yml`](../../.github/workflows/check.yml).

The actual documented Git dependency works. A clean Git install created the `acc` binary, and
`bunx acc --version` plus `bunx acc check ... --format json` both succeeded. That is positive
release evidence, but it is not represented in CI: the gate runs the source entry point in its
own checkout.

The clean install also emitted `Blocked 1 postinstall. Run bun pm untrusted for details.` The
package's `prepare` script exists to install this repository's Husky hooks; it is not part of the
consumer product and creates avoidable trust noise during a Git dependency install. A local-path
dependency also behaves differently from a Git dependency because the source entry point is
committed as `100644`; Bun fixes the declared bin's mode for a Git install but not for the local
link.

Recommended outcome:

- Add a clean-consumer smoke test that installs from a local Git ref and runs the binary by name.
- Verify version, help/schema, a conforming fixture, and a non-conforming exit `9`.
- Keep Husky setup root-only or remove the package lifecycle script from the installed artifact,
  so consumers do not see an irrelevant blocked-script warning.
- Either document that local-path installation is unsupported or make it behave like the Git
  path if contributor workflows need it.

### FR-9 — P2: the schema test and comment claim more than they verify

Locations:

- [`src/acc/commands/schema.ts`](../../src/acc/commands/schema.ts), top-level error taxonomy;
- [`src/acc/conformance.test.ts`](../../src/acc/conformance.test.ts), schema tests.

The schema code says a conformance run provokes every declared error kind and verifies that it
uses the promised code. The test named “every declared error kind maps to a distinct, declared
exit code” only asserts that each code is below `124`; it does not assert uniqueness, and the
runtime suite does not provoke `auth`, `permission`, `conflict`, `rate_limit`, or
`confirmation_required` because no current `acc` command emits them.

The schema is still internally derived from `ERROR_KINDS`, so it is not currently drifting. The
problem is assurance language: the project says it tests a mapping that it presently only
serializes from one source.

Recommended outcome: add an explicit uniqueness assertion, test every runtime-reachable kind,
and describe the remaining top-level entries as the reference taxonomy rather than as outcomes
the current CLI has provoked.

### FR-10 — P3: the default successful report is complete but expensive to scan

Location: [`src/acc/commands/check.ts`](../../src/acc/commands/check.ts), text rendering.

The conforming tutorial fixture produces 51 lines and 9,566 bytes. Most of that is the 18-rule
coverage-gap block, which is important evidence but nearly identical on every target. The first
line and exit code make CI use straightforward; a human's first run is much denser than the
README excerpt suggests.

Recommended outcome: keep JSON complete, but consider a concise default human report with full
coverage gaps behind `--verbose`, `--gaps`, or a follow-up `acc show` path. At minimum, show the
gap count and the first actionable rule without repeating the checker corpus's static limitations
on every successful run.

### FR-11 — P1: waiving a rule can still add a unique probe, contrary to the conformance page

Locations:

- [`docs/wiki/concepts/conformance.md`](../wiki/concepts/conformance.md), “Waivers”;
- [`src/acc/kit/record.ts`](../../src/acc/kit/record.ts), `record`;
- [`src/acc/kit/checkers/parsing/double-dash-terminator.ts`](../../src/acc/kit/checkers/parsing/double-dash-terminator.ts), A6's probe.

The page correctly says a waived rule still runs, then says this “costs no extra process” because
probes are shared. Sharing means identical invocations are deduplicated; it does not mean every
checker asks for an invocation another checker already requested. The recorder collects probes
from every checker before applying the waiver to the report. A6, for example, asks for the unique
`-- --<sentinel>-value` invocation, so keeping A6 in the registry adds that target execution even
when A6 is waived.

This is more than a performance footnote. The wiki's own A6 page warns that the positional can be
a prompt for a free-form-input CLI. A reader must not infer that waiving an inapplicable rule also
avoids its probe, or that the probe was free because some other checker needed it.

Recommended outcome: retain the useful “waived rules still run” warning, but say that shared probes
are deduplicated and unique probes still execute. If a waiver is intended to suppress execution as
well as binding, that would require a deliberate product change and a different account of the
would-be verdict.

### FR-12 — P2: the conformance concept contains a stale live `git` report

Locations:

- [`docs/wiki/concepts/conformance.md`](../wiki/concepts/conformance.md), opening `git 2.55.0`
  example and “What the counts mean”;
- [`docs/wiki/guides/check-your-first-cli.md`](../wiki/guides/check-your-first-cli.md), Step 5;
- [`README.md`](../../README.md), Getting Started.

The concept says the current `git 2.55.0` result has one core rule unverified and reports
`core 13/16`. The tutorial, README, and a fresh run against `/usr/bin/git` agree on the newer
result: three core rules unverified, `core 13/18`, with A7, B3, and B5 unverified. The concept also
shows the old 2,290-byte bare-help observation; the current run observed 2,271 bytes.

The counts are explanatory rather than normative, but the page uses them to teach the report's
algebra. Two stable wiki pages should not present different outputs for the same named tool and
version.

Recommended outcome: refresh both copies in the conformance concept from one captured run, or
label the example as historical and avoid volatile byte/count details. Keep the tutorial as the
single executable example where possible.

### FR-13 — P2: `tutorial` is enforced as a page type but omitted from the declared vocabulary

Locations:

- [`docs/wiki/SCHEMA.md`](../wiki/SCHEMA.md), frontmatter example and per-type shape table;
- [`docs/wiki/STYLE.md`](../wiki/STYLE.md), opening page-type description;
- [`docs/wiki/lint.ts`](../wiki/lint.ts), accepted `types`;
- [`docs/wiki/guides/check-your-first-cli.md`](../wiki/guides/check-your-first-cli.md),
  frontmatter.

The schema's frontmatter contract lists `concept | archetype | rule | decision | guide`, and the
style guide calls those “the five page types.” The same documents later prescribe a `tutorial`
shape, the linter accepts `tutorial`, and the getting-started page uses it. A contributor following
the opening contract can reasonably conclude that `tutorial` is commentary rather than a legal
frontmatter value.

Recommended outcome: make the vocabulary consistently six content types, explain that tutorials
live in the `guides/` directory, and include `tutorial` in the frontmatter example and opening
Diátaxis description.

### FR-14 — P2: the maintainer contract contradicts the planned-checker mechanism it defines

Locations:

- [`docs/wiki/SCHEMA.md`](../wiki/SCHEMA.md), “Two fields, two questions” and bidirectional lint
  description;
- [`docs/wiki/guides/how-to-add-a-checker.md`](../wiki/guides/how-to-add-a-checker.md),
  Verification;
- [`docs/wiki/rules/streams/output-is-delivered-whole.md`](../wiki/rules/streams/output-is-delivered-whole.md), B4.

The schema says “Every rule in the catalogue is implemented” and later says every `rule_id` must
have its checker file. The checker guide repeats that as something `bun run check` establishes.
B4 deliberately has `checker_status: planned`, declares a future path, and has no checker file;
the schema elsewhere explicitly permits exactly that state, and the linter accepts it.

Recommended outcome: scope the invariant to implemented rules: every `checker_status:
implemented` rule has its registered checker, and every checker has a rule page. Say separately
that planned rules may reserve a path without creating the file.

### FR-15 — P2: the L0 adoption guide understates machine-mode discovery

Location: [`docs/wiki/guides/how-to-reach-l0-in-your-project.md`](../wiki/guides/how-to-reach-l0-in-your-project.md), Step 2.

The guide says B3 and B5 cannot select machine mode while help names no `--json` or `schema`
command. D3's checker and rule also recognize `--format` and `--output`; B5 can select
`--format=json`, while B3 has its own narrower, clearly documented `--json` limitation. The guide
collapses those different discovery and probe capabilities into one sentence.

Recommended outcome: say that D3 needs a discoverable machine-mode flag or schema command, then
name B3 and B5's selector-specific limits separately. Also remove or qualify “Most projects lose
over half their findings here”; the repository presents no adoption sample large enough to
support that generalization.

### FR-16 — P3: the first-run tutorial miscounts the A1 observations

Location: [`docs/wiki/guides/check-your-first-cli.md`](../wiki/guides/check-your-first-cli.md),
Step 2.

The current finding lists six clauses: exit status, stdout, and offending-token evidence for each
of the valueless and value-carrying probes. The tutorial immediately says the fixture failed A1
“four different ways,” despite first teaching that every clause is a separate observation.

Recommended outcome: say “six observed clauses” or remove the number and describe the two probe
shapes. The fixture headline and exit code otherwise match the current executable exactly.

## Wiki cold-read conclusion

The wiki is release-worthy in substance. It has a strong entry path, a useful task-oriented
index, working links, and unusually explicit boundaries between normative rules, design guidance,
implemented checks, and unverified clauses. Every rule page puts the remedy directly after the
rule and names both what a pass establishes and what it leaves open. B4 is particularly good
release documentation: it resists implying enforcement where the current runner cannot produce
the needed observation.

The cold read did not find a broad mismatch between the project described by the wiki and the
project in the repository. It found local drift in copied examples and maintainer guidance, plus
the waiver execution overclaim in FR-11. The concept, decision, archetype, and rule material is
dense, but the density is mostly carrying real evidence and caveats rather than hiding absent
functionality. For an MVP, accuracy fixes are higher value than a wholesale prose rewrite.

## Confirmed strengths

These are release evidence, not courtesy observations:

- **The core loop works.** A fresh consumer can install the Git dependency and invoke `acc` by
  name. Conforming and non-conforming targets return the documented `0` and `9` outcomes.
- **The executable-spec claim has machinery behind it.** Rule pages and checkers are cross-checked
  in both directions, including tier, probe level, coverage, established clauses, and named gaps.
- **The evidence model is unusually honest for an MVP.** `pass`, `fail`, `unverified`, not
  applicable, partial coverage, waivers, and known debt remain separate in the report.
- **The positive control is meaningful.** `acc` is run through its own checker registry, with a
  negative fixture preventing an empty or inert registry from passing by accident.
- **Process handling is proportionate on POSIX.** Deadlines, output ceilings, raw-byte digests,
  signal attribution, process-group kills, and finalization fallback all have direct tests.
- **The documentation is substantive and navigable.** The README routes a new user into a
  tutorial and an adoption guide; the wiki build succeeds; a full page-by-page reading found the
  rule pages consistently state their checker limits rather than presenting partial probes as
  proof.
- **Planned work is usually labelled accurately.** L1/L2, filesystem snapshots, durable history,
  replay, environment control, and stronger sandboxing are not presented as implemented.
- **The package boundary is intentional.** Bun is a declared runtime requirement, npm publishing
  is explicitly out of scope, the Git lock pins a commit, and `package.json` is the CLI version
  source.

## Minimum ship checklist

Before merging PR #1:

1. Choose `v0.1.1` as the first GitHub Release, or explicitly redesign the existing `v0.1.0`
   state.
2. Preserve the Conventional Commits with a merge/rebase merge, or give a squash merge a
   conventional title.
3. Correct FR-3's ratchet contract, preferably in behavior rather than only prose.
4. Add the platform statement (FR-4), align the Bun floor (FR-5), and fix the on-disk sentence
   (FR-6).
5. Replace the opening status banner with a truthful pre-1.0 MVP statement (FR-7).
6. Correct the waiver execution claim (FR-11) and reconcile the stable wiki's copied examples and
   maintainer contract (FR-12 through FR-15).

After merging PR #1:

7. Confirm release-please opens the expected release PR and inspect its version and changelog.
8. Add or run the clean Git-install smoke from FR-8 against the exact release commit.
9. Merge the release-please PR, then verify the GitHub Release, tag, `acc --version`, and the
   README's pinning example agree.

FR-9, FR-10, and FR-16 can follow immediately after the MVP if the public claims are narrowed
now. They should not be mistaken for reasons the core checker is unusable today.
