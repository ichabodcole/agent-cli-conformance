---
type: report
generated: { by: claude-opus-5, at: 2026-08-14 }
status: stable
lifecycle: discharged
description: Round-1 review of the conformance kit implementation against the rule catalogue; 18 findings fixed, 9 promoted to the roadmap, 3 still open.
tags: [conformance, remediation, testing]
subject: src/acc
examined: feat/conformance-kit @ 2026-08-14
---

# Implementation review — 2026-08-14

## Disposition of the three open findings, verified 2026-08-19

The remediation annotation below closed 18 findings and listed three as open. Two are now closed
by later work that was not aimed at them, and the third is narrower than it was:

- **R3-7 (page shape)** — **closed.** It asked for the pages to be restructured and for repeated
  material to be relocated, naming the L0 caveat, the dedup behaviour and A6's Bun launcher
  history. A separate Diátaxis review reached the same conclusion independently, and its DTX-2 and
  DTX-3 did the work: section order is now read from SCHEMA's own table and linted, the L0 and
  dedup material lives in `concepts/probing.md`, and A6's launcher history is in
  `guides/how-to-add-a-checker.md`.
- **R3-8 (adoption guide)** — **closed.** `guides/how-to-reach-l0-in-your-project.md` exists, with
  a first-run tutorial and a checker guide beside it.
- **R3-9 (evidence provenance)** — **partly closed, and still the live one.** It asked that
  measured claims consistently name tool version, OS, date, exact command, whether the result was
  measured here or inherited, and a primary-source link. Two research notes dated 2026-08-19 carry
  exactly that shape, and D3's Evidence section was rewritten against measurement. The audit it
  asked for — the Evidence sections as a SET — has not been done, and is **promoted** to
  [the roadmap](../roadmap.md#an-evidence-audit-nobody-has-run) rather than left here. Anything
  still unsourced there is unfound rather than known-absent.

With that promotion this report is **discharged**: every finding is actioned, promoted, or
declined, and nothing in it is waiting on a reader of this page.

Status: findings recorded; no implementation changes made by the reviewer.

> **Remediation status — updated 2026-08-15.** Each finding below carries a `> **Remediation:**`
> block stating what was done and where. Twenty-nine commits (`90ea2a8`..`6adc9de`) on
> `feat/conformance-kit`; the gate went 465 → 872 tests. This annotation is the response to the
> review, written by the implementer, not by the reviewer — the original finding text is
> unmodified and every claim below is checkable against the commits it names.
>
> The catalogue is now **20 rules**, not 19: `G1` was minted during remediation to own a defect
> this review did not reach (see _N1a_). Any count of "19" below is the reviewer's, and correct
> as of the review date.
>
> | Disposition                 | Findings                                                                                                                                      |
> | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
> | **Fixed** (18)              | R1-1, R1-2, R1-3, R1-4, R2-2, R2-3, R2-4, R2-5, R3-2, R3-3, R3-4, R3-5, R3-6, R5-1, R5-2, R5-3, R5-4, + all three hardening recommendations   |
> | **Partially addressed** (2) | R2-1 (claim corrected, capabilities deferred), R3-1 (axis defined, rule promotion deferred)                                                   |
> | **Open** (3)                | R3-7 page shape, R3-8 adoption guide, R3-9 evidence provenance                                                                                |
> | **Roadmap** (9)             | R4-1 … R4-9, recorded in `docs/roadmap.md` with an adopted order. R4-5 is _partially started_ — its first rule, G1, landed during remediation |
>
> Five decisions and five findings discovered _during_ remediation are recorded at the foot of
> this document. **Two of the new findings are defects the review did not catch** — one of them
> in the same class as R2-3, and one of them a false positive in the project's own dogfood test.

This report captures an implementation review of the initial `agent-cli-conformance` project.
The findings are grouped by the rounds in which they were discovered so fixes can be delegated
and evaluated incrementally. The review focused on correctness, the accuracy of the public
contract, process isolation, evidence quality, and failure modes at the boundary between `acc`
and an unknown target CLI.

## Baseline

At the time of review:

- the worktree was clean;
- TypeScript typechecking passed;
- Biome passed with warnings treated as errors;
- the wiki/documentation lint passed; and
- all 465 Bun tests passed (`986 expect()` calls across 31 files).

The existing test suite is strong. The findings below are mostly cases the suite does not yet
exercise, rather than regressions already visible in the gate.

Severity used here:

- **P1** — undermines a central correctness or safety claim; fix before relying on the tool as a
  conformance gate against unknown binaries.
- **P2** — important correctness, configuration, or portability issue that should follow the P1
  work.

## Round 1 — conformance claims and process control

### R1-1 — P1: the deadline does not bound a process tree

> **Remediation: FIXED** — `90ea2a8`. Targets launch `detached` into their own process group; the deadline kills the group, backed by a 250 ms finalisation fallback for anything that escapes it. Windows is explicitly out of scope in the code comment rather than silently degraded. Verified: a 300 ms deadline against a surviving descendant now bounds at **306 ms**.

Location: [`src/acc/kit/runner.ts`](../../src/acc/kit/runner.ts), around the timeout handler.

`runProbe` sends `SIGKILL` only to the direct child. If the target spawns a descendant that
inherits stdout or stderr, killing the parent does not close those pipe file descriptors. Node's
`close` event waits for the streams, so the probe promise can remain pending after its deadline.

A reproduction using a shell which spawned a background `sleep` showed a requested 50 ms
deadline taking roughly 2 seconds:

```text
{ "wall": 2013, "duration": 2012, "timedOut": true }
```

This means the advertised deadline is currently a timeout signal, not an upper bound on probe
duration.

Suggested direction:

- launch targets in an isolated process group where the platform supports it;
- terminate the group/tree at the deadline rather than only the immediate child;
- add a bounded cleanup/finalization fallback so inherited pipes cannot hold the promise open;
- account explicitly for Windows process-tree termination; and
- add a fixture whose descendant retains stdout/stderr after the parent is killed.

### R1-2 — P1: machine-mode version output is not structured

> **Remediation: FIXED** — `cf759ed`. Version travels the same early machine-mode path as help. All three spellings now emit `{"ok":true,"data":{"name":"acc","version":"0.0.0"}}`; help is checked first so `--help --version` still answers the broader question.

Locations:

- [`src/acc/cli.ts`](../../src/acc/cli.ts), machine-mode help interception and Commander version
  registration;
- [`docs/wiki/rules/discoverability/version-flag-exists.md`](../wiki/rules/discoverability/version-flag-exists.md).

The rule requires version information to appear in a structured payload in machine mode, but
only help is intercepted before Commander handles its built-in output. All of these commands
exit successfully with the bare text `0.0.0`:

```bash
bun src/acc/cli.ts --version --json
bun src/acc/cli.ts --json --version
bun src/acc/cli.ts --format json --version
```

This violates the reference CLI's own D1 contract and escapes the positive-control suite because
the D1 checker probes only plain `--version`.

Suggested direction:

- handle version in the same early machine-mode path as help;
- emit it through the normal success envelope; and
- test both option orders and both machine-mode selectors.

### R1-3 — P1: declared closed-set values are not enforced by the parser

> **Remediation: FIXED** — `6402b2a`. `ArgSpec.values` is now enforced centrally by a parser derived from the declaration, including on the two paths that answer before Commander runs (bare invocation, machine-mode help interception). A test walks the spec, so a future flag cannot skip it. `acc rules --format nonsense` → exit 2 with `choices`.

Locations:

- [`src/acc/spec.ts`](../../src/acc/spec.ts), `ArgSpec.values`;
- [`src/acc/cli.ts`](../../src/acc/cli.ts), Commander option construction and mode resolution.

The schema advertises `--format` as accepting only `text` or `json`, but the parser builder uses
the option name and type without using `values`. `resolveMode` then treats an unknown explicit
value as if no explicit value was supplied.

Reproduction:

```bash
bun src/acc/cli.ts rules --format nonsense
```

Observed result: successful data output and exit `0`.

This is the same silent-acceptance shape the project exists to detect in other CLIs.

Suggested direction:

- derive Commander value validation from `ArgSpec.values` centrally;
- make invalid values produce a usage envelope containing the offending value and valid choices;
- validate early paths such as `--help --format nonsense`, not only command actions; and
- add a schema-to-parser test for every argument that declares `values`.

### R1-4 — P1: `fullyVerified` can include partially unverified rules

> **Remediation: FIXED** — `29ec00f`, jointly with R3-4. Every `Checker` now declares `coverage: "complete" | "partial"` and a non-empty `coverageGaps` when partial, lint-enforced against the rule page. `fullyVerified` requires every applicable core rule to be `pass` **and** `coverage: complete`. All 19 checkers currently declare `partial` with 49 named gaps, so `acc` reports `conformant: true, fullyVerified: false` about itself — the honest answer, and the reviewer's predicted outcome.

Locations:

- [`src/acc/kit/checkers/exit-codes/usage-distinguishable.ts`](../../src/acc/kit/checkers/exit-codes/usage-distinguishable.ts);
- [`src/acc/kit/checkers/parsing/unknown-command.ts`](../../src/acc/kit/checkers/parsing/unknown-command.ts);
- [`src/acc/kit/report.ts`](../../src/acc/kit/report.ts).

Several checkers return `pass` while their detail or rule page acknowledges that part of the rule
was not established:

- C2 returns `pass` with the detail `internal-fault contrast unverified at L0`;
- A2 returns `pass` with `nested case not probed at L0`;
- A3 does not inspect the required machine-envelope field; and
- other rules similarly contain more normative requirements than their L0 probe establishes.

`buildReport` counts these verdicts as passes, so `fullyVerified` can be true even though an
applicable core rule has an acknowledged evidence gap. That conflicts with the documented
meaning of `fullyVerified`: every applicable core rule was actually established.

Suggested direction:

- return `unverified` until every `MUST` represented by a rule has been established; or
- split independently testable requirements into separate rule IDs/findings; or
- represent per-rule assertions explicitly and compute a rule verdict from all assertions.

The likely near-term answer is to let L0 produce more honest `unverified` results and reserve
`fullyVerified` for a later level with the declarations needed to test the remaining assertions.

## Round 2 — safety boundary, evidence fidelity, and portability

### R2-1 — P1: L0 is not inert and a temporary cwd is not a filesystem sandbox

> **Remediation: PARTIALLY ADDRESSED** — `fc7ea19`. The _claim_ is corrected: the README's "no risk" sentence is gone, replaced by "risk-reduced, not inert" plus the six specific things L0 does not prevent, and `acc check` now declares `effects: non_idempotent` (it executes third-party code) with the `CommandSpec.effects` contract widened so a delegating command owns what it causes, not only what its own code writes. The _capabilities_ suggested — per-run temporary `HOME`/XDG, credential stripping, an OS/container sandbox, a dry-run of the planned argv, required target declarations — are **not built**; they are recorded in `docs/roadmap.md` (step 3). See _Decision D1_ below for the scope line, and _New finding N2_ for a wording problem in the dry-run item.

Locations:

- [`src/acc/kit/inert.ts`](../../src/acc/kit/inert.ts);
- [`src/acc/kit/runner.ts`](../../src/acc/kit/runner.ts);
- [`src/acc/spec.ts`](../../src/acc/spec.ts), the `check` command safety note;
- [`README.md`](../../README.md), the L0 description.

The implementation and documentation recognize the free-form-root case, but the remaining
safety claim is still broader than the implementation can support:

- the `bare` class is accepted as inert while its own comment acknowledges that a CLI may do
  real work on a bare invocation;
- a fixed-verb CLI may ignore an unknown flag and execute a default root action, which is the
  exact A1 violation being tested;
- a version/help flag can likewise be ignored or handled only after global initialization;
- changing cwd redirects relative paths only; it does not prevent writes through `HOME`, XDG
  paths, absolute paths, subprocesses, or platform configuration directories;
- the child inherits the reviewer's full environment, including credentials; and
- neither filesystem access outside the temporary cwd nor network access is actually denied.

Consequently the README statement that L0 is safe against “any binary with no cooperation and
no risk” is false. The `check` command's declared `effects: read_only` is also stronger than the
actual behavior when it executes an unknown target.

Suggested direction:

- describe the current behavior as risk-reduced rather than inert;
- show the complete planned argv list before execution in a dry-run mode;
- require explicit acknowledgement or a target declaration before behavioral probes;
- replace inherited `HOME`/XDG directories with per-run temporary directories;
- strip credentials and sensitive integration variables unless explicitly allowed;
- use a real OS/container sandbox when claiming filesystem or network isolation; and
- make the command's effect declaration reflect that it executes third-party code.

### R2-2 — P1: the command schema omits real usage errors

> **Remediation: FIXED** — `3e55c82`. Parser-level error kinds are derived into every command's schema; command declarations now carry only additional handler/domain errors. A meta-test provokes an unknown option and an extra positional for every command and asserts the kind appears in that command's schema.

Locations:

- [`src/acc/spec.ts`](../../src/acc/spec.ts), `tags` and `schema` command declarations;
- [`src/acc/commands/schema.ts`](../../src/acc/commands/schema.ts).

The following runtime failures are both structured usage errors with exit `2`:

```bash
bun src/acc/cli.ts tags extra --json
bun src/acc/cli.ts schema --bogus --json
```

However, the generated schema declares only `internal` for both commands:

```json
[
  { "name": "tags", "errors": ["internal"] },
  { "name": "schema", "errors": ["internal"] }
]
```

Every command can encounter parser-level usage failures, regardless of which handler-level
errors its action declares. The schema therefore omits outcomes a machine caller must handle.

Suggested direction:

- derive parser-level error kinds into every command automatically;
- reserve command declarations for additional handler/domain errors; and
- add a meta-test which provokes an unknown option and extra positional for every command, then
  verifies that the resulting kind appears in that command's schema.

### R2-3 — P1: observation capture is unbounded and not byte-faithful

> **Remediation: FIXED** — `dfd3de3` and `4c6060f`. Buffers are collected and decoded once (verified: `€ — ✓` written byte-by-byte now captures faithfully, previously `���`); per-stream 4 MiB and combined 6 MiB ceilings terminate the target and record `truncated` plus retained byte counts; and `truncatedUnverified` was applied across all 19 checkers, with the asymmetry the reviewer describes — a violation the prefix _contains_ is still a `fail`.

Location: [`src/acc/kit/runner.ts`](../../src/acc/kit/runner.ts), stdout/stderr data handlers.

Each Buffer chunk is appended directly to a JavaScript string. This has two problems:

1. UTF-8 is decoded one chunk at a time. A multi-byte character split across writes is replaced
   with replacement characters. A reproduction which emitted `€` across two chunks recorded
   `���` instead.
2. There is no stdout/stderr limit. A noisy or hostile target can consume unbounded memory during
   the timeout window; repeated string concatenation can compound the cost.

The first issue can fabricate differences for D4 or alter the evidence attached to a finding.
The second lets the subject under test crash the conformance runner.

Suggested direction:

- collect Buffer chunks and decode once, or use `StringDecoder` for streaming correctness;
- enforce explicit per-stream and combined byte limits;
- record byte counts and a `truncated`/`outputLimitExceeded` fact in `Observation`;
- terminate the target when the limit is exceeded; and
- require checkers to treat truncated evidence as `unverified` unless the observed prefix is
  already sufficient to prove a violation.

### R2-4 — P2: the expectations file is trusted without runtime validation

> **Remediation: FIXED** — `a5d4d44`. Root and `knownFailures` are validated as plain objects, reasons must be non-empty strings, IDs are validated against the active checker registry, and the offending path is reported in a structured usage-class error. Tests cover nulls, arrays, unknown IDs, empty reasons, invalid JSON, and a missing explicit directory. One extension beyond the finding: an explicit `--expectations` pointing at a directory with _no_ expectations file is now an error too — silently ignoring a flag the caller passed is the same silent-failure shape.

Location: [`src/acc/kit/expectations.ts`](../../src/acc/kit/config.ts) — renamed to `config.ts` during remediation, when it grew waivers alongside known failures.

The parsed JSON is cast directly to `Partial<Expectations>`. Consequences include:

- `knownFailures: null` causes a later `in` operation to throw an internal error;
- arrays, numbers, and non-string reasons can enter the report despite the TypeScript type;
- unknown or mistyped rule IDs silently excuse nothing and do not become stale expectations;
- an explicitly supplied directory that does not exist is treated like an empty expectations
  set; and
- malformed JSON becomes an unclassified internal failure rather than an actionable
  configuration error.

Suggested direction:

- validate that the root and `knownFailures` are plain objects;
- require every reason to be a non-empty string;
- validate IDs against the active checker registry;
- distinguish “no default file exists” from “the explicitly requested directory/file is wrong”;
- report the expectations path in a structured configuration/usage error; and
- add tests for nulls, arrays, unknown IDs, empty reasons, invalid JSON, and missing explicit
  directories.

### R2-5 — P2: `.ts` overrides the target's declared interpreter

> **Remediation: FIXED** — `4d6b199`. An executable target is executed directly so the kernel honours its shebang; Bun is now a documented fallback for a non-executable TypeScript source only. Fixture: `src/acc/kit/fixtures/declares-sh.ts`, mode 100755, a deliberate `sh`/TypeScript polyglot — under `sh` it prints a marker, under bun it prints nothing, so the assertion can only pass if the kernel chose. Restoring the old `.ts` override turns 3 of 15 tests red.

Location: [`src/acc/commands/check.ts`](../../src/acc/commands/check.ts), `toTarget`.

Every path ending in `.ts` is launched through Bun, even if the file is executable and its
shebang names Deno, a Node TypeScript loader, or another runtime. This can change argv behavior,
reject runtime-specific APIs, or test a program different from the one users normally execute.
It also weakens the README's language-agnostic claim.

Suggested direction:

- execute an executable target directly so the kernel honors its shebang;
- use Bun only as a documented fallback for a non-executable TypeScript source file with no
  conflicting interpreter declaration; or
- accept an explicit launcher/argv prefix so callers can state exactly how their CLI runs.

Add at least one executable `.ts` fixture with a non-Bun shebang and assert that the declared
interpreter is preserved.

## Round 3 — wiki clarity, accuracy, and information design

### Overall assessment

The wiki is strong in the ways most specifications are weak:

- the catalog is navigable and gives every page a useful one-line hook;
- rule pages consistently lead with the rule and then explain why it matters;
- concrete command examples make abstract CLI behavior easy to recognize;
- the writing has a clear point of view without hiding tradeoffs;
- limitations are frequently stated instead of being quietly omitted; and
- the rule/checker/doc graph is a genuinely useful maintenance mechanism.

The main weakness is not sentence-level clarity. It is **contract-layer clarity**. A reader
cannot always tell whether a statement is:

1. the desired long-term design;
2. a normative requirement for conformance;
3. a requirement currently enforced by the checker;
4. an assertion the current L0 probe partially samples; or
5. supporting guidance that is not part of the conformance verdict.

That distinction matters more here than in ordinary documentation because the wiki is presented
as the human-readable half of an executable specification.

### R3-1 — P1: normative scope, checker coverage, and roadmap are conflated

> **Remediation: PARTIALLY ADDRESSED** — `ba6d039`, `29ec00f`, `198032f`. `checker_status` is now explicitly defined as _implementation presence_, with `coverage`/`coverage_gaps` as the separate axis answering enforcement; a generated rule/tier/level/coverage/gap-count matrix lives in `docs/wiki/index.md` and goes stale-fails the lint if hand-edited; every rule page carries a `## Current checker coverage` section, lint-enforced to match its checker. **Not done:** promoting the five concept-only requirements to rule pages — see _Decision D2_.

Locations:

- [`docs/wiki/SCHEMA.md`](../wiki/SCHEMA.md), the normative-language and `checker_status`
  contracts;
- [`docs/wiki/index.md`](../wiki/index.md), the summary of core rules;
- multiple concept and rule pages.

The maintainer contract says only rule pages are normative and that requirements appearing in
concept pages must live in linked rules. In practice, several important requirements exist only
as concept prose:

- every conforming CLI has machine mode and explicit override precedence;
- machine output is complete and untruncated;
- unbounded data provides pagination and field selection;
- structured errors use a particular envelope; and
- `next` actions carry particular remediation semantics.

Conversely, many rule pages contain several normative `MUST` statements while the checker
verifies only a subset. Examples include A2 nested commands, A3 machine-envelope fields, C1
nested help, D1 no-network/no-side-effect/machine-mode behavior, E1 real confirmation paths,
and F1 schema/subcommand/error scanning.

Every one of those rules has `checker_status: implemented`. Today that field means only “a file
exists,” but a reader naturally interprets it as “the rule is enforced.” The index reinforces
that reading by saying core rules are binary pass/fail even though applicable core rules can
also be `unverified` and several current passes represent partial coverage.

Suggested direction:

- keep `checker_status`, but define it explicitly as implementation presence, not coverage;
- add a separate coverage field such as `coverage: partial | complete`;
- give every rule a short assertion checklist with a status per normative assertion;
- distinguish `Normative rule` from `Current checker coverage` as separate sections;
- move requirements currently found only in concept pages into rule pages, or label them
  explicitly as design guidance/roadmap; and
- generate a matrix showing rule, tier, level, coverage, and known gaps.

Until this is done, “implemented,” “pass,” and “fully verified” are all easier to overread than
the project intends.

### R3-2 — P1: the error-envelope concept specifies two incompatible response models

> **Remediation: FIXED** — `62c13c1`. The implemented two-way envelope is canonical. The "three statuses" claim is removed, `confirmation_required` is used throughout, exit `8` is defined (an `ok: false` error — the work was **not** done, and the caller can resolve it by supplying the decision, which is what separates it from the other kinds), and `next.command` values are described honestly as untyped command templates. Typed `next` is roadmap work (R4-4).

Locations:

- [`docs/wiki/concepts/error-envelope.md`](../wiki/concepts/error-envelope.md), especially
  “Three statuses, not two”;
- [`docs/wiki/index.md`](../wiki/index.md), the `action_required` summary;
- [`docs/wiki/concepts/exit-codes.md`](../wiki/concepts/exit-codes.md), code `8`;
- the implemented envelope in [`src/acc/envelope.ts`](../../src/acc/envelope.ts).

The concept begins with the implemented two-way envelope:

```json
{ "ok": false, "error": { "kind": "rate_limit" } }
```

It then presents a different top-level protocol:

```json
{ "status": "action_required", "reason": "project_not_linked" }
```

The implementation has no `status` field or third top-level variant. A required decision is an
ordinary `ok: false` error with kind `confirmation_required` and exit `8`. The prose, however,
says `action_required` means nothing went wrong and should not masquerade as an error.

Those are both defensible designs, but they are not the same contract. The current wiki also
uses both names—`action_required` and `confirmation_required`—without defining their
relationship.

Suggested direction:

- choose one canonical response algebra;
- if action-required is truly a third status, define a discriminated union for success, error,
  and action-required and implement it consistently;
- if it remains an error kind, remove the “three statuses” claim and use
  `confirmation_required` everywhere;
- define whether exit `8` means an invocation failure or a successful request for a decision;
  and
- either define typed `next` placeholders in the schema or describe current `next.command`
  values as untyped command templates.

### R3-3 — P1: the exit-code decision is internally inconsistent and overstates portability

> **Remediation: FIXED** — `9703181`. The reviewer was right on every point and the original page was wrong. Allocation corrected to `0`–`9` with **115** unallocated (`10`–`124`); POSIX-reserved values (`126`, `127`, "greater than 128") are now structurally separated from delegator conventions (`124`/`125`, from `timeout` and Docker); platform scope stated as POSIX shells with Windows' `DWORD` named as out of scope; and the false absolute is retracted — verbatim passthrough **does** still collide when the child itself exits `125`/`126`/`127`, and the page now says what staying below `125` actually buys.

Locations:

- [`docs/wiki/decisions/exit-codes-below-125.md`](../wiki/decisions/exit-codes-below-125.md);
- [`docs/wiki/concepts/exit-codes.md`](../wiki/concepts/exit-codes.md);
- [`docs/wiki/archetypes/delegator.md`](../wiki/archetypes/delegator.md).

Several claims need revision:

- the decision says project codes occupy `0`–`8`, but outcome code `9` is now allocated;
- it says all 116 codes from `9`–`124` are unallocated, but `9` is allocated, leaving 115;
- it describes `125` as a universal wrapper-failure convention understood by every shell and
  supervisor, whereas POSIX standardizes `126`, `127`, and a status greater than 128 for
  signal termination; `125` is used by particular delegators such as GNU/POSIX `timeout`, not
  as a universal shell meaning;
- it says codes `125+` describe what a child did while also assigning `125` to the wrapper;
- verbatim child passthrough still collides when the child itself exits `125`, `126`, or `127`;
  keeping project domain errors below `125` does not make wrapper-versus-child collision
  structurally impossible; and
- “every process returns 0–255” is Unix-oriented. Windows exposes process termination status as
  a `DWORD`, so the platform scope should be stated if the taxonomy intentionally targets POSIX
  shells.

The official references support a narrower statement:

- POSIX specifies `126` for found-but-not-executable, `127` for not found, and a value greater
  than 128 for signal termination;
- the `timeout` utility extends this with tool-specific `124`/`125` meanings; and
- exact `128+n` behavior is a widespread shell convention, but the portable POSIX statement is
  only “greater than 128.”

Suggested direction:

- state the supported platform model explicitly;
- separate POSIX-reserved values from conventions adopted by specific delegators;
- decide how a wrapper distinguishes its own `125` from a child returning `125`;
- update the allocation range and remaining-code count; and
- soften “every shell/runner already implements this” to the exact interoperability claim the
  sources support.

Primary references:

- [POSIX Shell Command Language — exit status for commands](https://pubs.opengroup.org/onlinepubs/9699919799/utilities/V3_chap02.html)
- [POSIX `timeout`](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/timeout.html)
- [GNU Coreutils `timeout`](https://www.gnu.org/software/coreutils/manual/html_node/timeout-invocation.html)
- [Microsoft `GetExitCodeProcess`](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-getexitcodeprocess)

### R3-4 — P1: the documented `fullyVerified` definition disagrees with expectations behavior

> **Remediation: FIXED** — `29ec00f`. Expectations suppress the **conformance gate** and never the **evidence claim**: the pass requirement gating `fullyVerified` no longer filters out excused findings, and `counts.coreUnverified` stopped filtering them too, so a report cannot print `0 core unverified` beside `fullyVerified: false`. `counts.coreFailures` still subtracts excuses, because that one _is_ the gate. `conformance.md` now states which counts and booleans an excuse changes.

Location: [`docs/wiki/concepts/conformance.md`](../wiki/concepts/conformance.md).

The page says:

- no applicable core rule may be `unverified` for `fullyVerified` to be true;
- every unverified core finding blocks full verification; and
- every applicable core rule was actually established.

The implementation excludes **excused** unverified core findings from the count that gates
`fullyVerified`. Therefore a report can contain an applicable core `unverified` finding and
still set `fullyVerified: true` when that finding appears in expectations.

This is separate from R1-4, where a partially tested rule can return `pass`; both paths let the
stronger boolean overstate the evidence.

Suggested direction:

- let expectations suppress the conformance gate but never the evidence claim; or
- rename the stronger property to something like `allRequiredEvidenceAccepted`; or
- define an additional boolean so “fully observed” remains literal while an organization can
  separately accept known evidence gaps.

The current sentence “an excuse covers both fail and unverified” should explicitly state which
counts and booleans it changes.

### R3-5 — P2: C3's probe does not test the rule its title names

> **Remediation: FIXED** — `162eceb`. The rule was right and the probe was wrong. `Invocation.repeat` is a recorder-only index: it participates in `invocationId` so repetitions stay distinct recordings, and it never reaches the target's argv or environment. C3 now runs one arg vector three times. Falsified rather than asserted — an argv-echoing fixture witnesses what the child actually received, because the `Observation` stores the invocation the _kit_ built and would record a leak just as faithfully.

Location: [`docs/wiki/rules/exit-codes/exit-codes-are-deterministic.md`](../wiki/rules/exit-codes/exit-codes-are-deterministic.md).

The rule requires the **same invocation** against unchanged state to produce the same exit code.
The probe instead runs three different flags:

```text
--acc-probe-xyzzy-repeat-1
--acc-probe-xyzzy-repeat-2
--acc-probe-xyzzy-repeat-3
```

Agreement across those probes tests consistency across equivalent usage errors, not
determinism of an identical invocation. A parser could hash the exact token into its exit code
and fail this probe deterministically; another could return a stable code for all three while
being nondeterministic on repeated identical input.

Suggested direction:

- teach the recorder to preserve intentional repetitions rather than deduplicating them; or
- give repetitions a recorder-only identity that is not visible to the target; or
- rename and rewrite C3 as “equivalent usage errors use a consistent exit code,” then add a
  separate determinism rule when exact repetition is supported.

### R3-6 — P2: several probe descriptions overstate the implemented measurement

> **Remediation: FIXED** — `198032f`. All five named sentences corrected at source (D4's "same environment" and "reports a diff"; B2's scope; B3's "diagnostic downgrade", which was wrong twice over — the rule is core and the verdict is `unverified`; D1's "two unexamined items"; F1's help/schema/error-message scope). Each rule page now carries `## Current checker coverage` derived from the checker's own `coverageGaps`, lint-enforced so page and checker cannot disagree, and pass detail text uses the same scope language.

The pages are often admirably candid about gaps, but some exact sentences still describe more
than the checker does:

- **D4:** the page says two runs use the same environment immediately after explaining that the
  second carries `ACC_PROBE_NONCE`; it also says the checker reports a diff, while the checker
  reports only the first differing string index.
- **B2:** the rule covers all escape sequences, progress animation, `NO_COLOR`, `--no-color`,
  `TERM=dumb`, stdout, and stderr. The checker looks only for CSI (`ESC [`), on two non-TTY
  paths. It does not detect OSC/single-character escapes or carriage-return-only animation and
  never exercises the TTY override requirements.
- **B3:** the rule says undeclared output defaults to `data`, which implies NDJSON should fail;
  the L0 checker instead reports NDJSON as `unverified`. Calling that a “diagnostic downgrade”
  is also inaccurate because the rule remains core and the verdict is `unverified`, not a
  diagnostic failure.
- **D1:** the page says there are two unexamined items, but the checker also cannot establish no
  network, no credentials, no side effects, or structured machine-mode version output.
- **F1:** the title and rule cover help, schema, and error messages, while the checker scans root
  help only. The page states this limitation, but `checker_status: implemented` and the core
  pass still invite a broader reading.

Suggested direction:

- use an explicit `## Current checker coverage` subsection on every rule;
- list “established,” “not established,” and “future level” assertions mechanically;
- make pass detail text use the same scope language; and
- add lint/tests that compare documented probe argv and verdict semantics with checker fixtures
  where practical.

### R3-7 — P2: the wiki is clear but not yet maximally efficient to consume

> **Remediation: OPEN.** The five-part page shape was not adopted. Item 4 of the suggested shape (`Current checker coverage`) landed via R3-6 in `198032f`, and the "contract at a glance" table R3-8 also asks for landed as the index matrix in `ba6d039` — but pages were not restructured and the repeated material (silent-failure argument, L0 caveat, dedup behaviour, A6's Bun launcher history) was not relocated.

The index is efficient. Individual rule pages are less so: most are roughly 80–125 lines and
mix five different jobs—normative contract, motivation, current checker behavior, historical
implementation debugging, and external evidence.

The repetition is useful on first reading but expensive across the full catalog. The
silent-failure argument, L0 inertness caveat, dedup behavior, and historical checker fixes recur
on several pages. A reader implementing a CLI usually needs the rule and compliance recipe;
a checker maintainer needs the probe internals; a researcher needs the evidence. They should not
all have to traverse every layer.

Suggested page shape:

1. **At a glance** — rule ID, tier, level, one-line requirement, pass condition.
2. **Normative rule** — only the binding requirements.
3. **How to comply** — implementation guidance.
4. **Current checker coverage** — exact argv, assertions, known gaps, safety caveats.
5. **Why and evidence** — rationale, measurements, sources, and historical context.

This preserves the strongest writing while making the first screen sufficient for most
readers. Longer implementation postmortems—especially the Bun launcher history in A6—could
move into checker comments, a dedicated implementation note, or the bottom of the page.

### R3-8 — P2: the missing adoption guide is now the largest navigation gap

> **Remediation: OPEN.** No adoption guide was written. The generated matrix in `docs/wiki/index.md` (`ba6d039`) delivers the "contract at a glance" half and the rule-matrix bullet; the guide itself — minimum viable profile, implementation order, verdict interpretation, ratchet mechanics, safety warning, verification checklist — does not exist. Note the safety-warning and dry-run bullets are now coupled to R2-1's roadmap items.

The wiki explains individual rules well but does not yet answer the first practical question:
“I have an existing CLI; what do I do first?” The index lists adoption, checker authoring, and
migration guides as planned, leaving readers to synthesize a process from nineteen rule pages.

The first guide should provide:

- the minimum viable core profile;
- a recommended order of implementation;
- a rule matrix grouped by parser, output, errors, and process behavior;
- commands for running the kit and interpreting `fail`, `unverified`, and not-applicable;
- how expectations are intended to ratchet;
- an explicit safety warning and dry-run step; and
- a final verification checklist.

A generated “contract at a glance” table linked before the full catalog would also give agents a
much cheaper first read than loading all 2,982 lines.

### R3-9 — P2: evidence should carry a little more provenance

> **Remediation: OPEN.** Provenance was not applied systematically. Individual claims corrected during remediation did gain primary-source links (notably the exit-code decision page in `9703181`), but the evidence sections were not audited as a set.

The Evidence sections are persuasive, but durable accuracy would improve if measured claims
consistently named:

- tool and framework version;
- operating system/runtime;
- measurement date;
- exact command or fixture;
- whether the result was measured in this repository or inherited from a research report; and
- a primary-source link for quoted external guidance.

The F2 page already models the right epistemic caution by saying its latency table is
comparative on one machine rather than portable. Applying that pattern consistently would make
the wiki age more gracefully.

## Round 4 — positioning, product boundaries, and roadmap gaps

### Overall assessment

The project communicates **what it is** and **why it exists** well. The opening of the README,
the three-layer model, and the silent-success examples establish a memorable thesis: this is a
specification and executable conformance kit for CLIs driven by LLM agents, with an emphasis on
fail-loud behavior. The wiki then gives that thesis considerably more substance than a typical
early-stage project.

The other two positioning questions are less settled:

- **Who it is for:** inferable, but not stated directly. The primary audience appears to be CLI
  authors, framework maintainers, and platform/tooling teams; agent-harness authors are a
  secondary audience. The name can also be read as a conformance suite for agent applications
  that happen to have CLIs, rather than for ordinary CLIs consumed by agents.
- **What it does today:** easy to overestimate. The repository currently provides the wiki,
  reference CLI, documentation graph/linter, and an initial L0 black-box checker. The README's
  broader description includes filesystem snapshots, L1/L2 falsification, durable histories,
  and retroactive checking that are architectural intent rather than present capability.

A compact front-page block with `For`, `Today`, `Planned`, and `Non-goals` would resolve most of
this without adding much prose. A possible one-sentence position is:

> Agent CLI Conformance helps CLI authors and framework maintainers make command-line tools
> predictable, machine-readable, and safely operable by autonomous agents, using an executable
> specification and black-box evidence rather than documentation alone.

The non-goals should say explicitly that a passing report is not a security certification, does
not prove domain-level correctness, and—at L0 in particular—does not prove a target is harmless
to execute.

### R4-1 — P1: durable observation and replay should be a first-class product feature

> **Remediation: ROADMAP** — `daa10f0`, step 4 of the adopted order. Recorded with the artifact contents enumerated and redaction/retention named as part of the design rather than a later concern. Blocked on R4-6 versioning, which the roadmap puts strictly before it: the artifact's field list opens with version coordinates.

The architecture's most differentiated promise is that a new checker can audit evidence already
collected. The current history is an in-memory implementation detail, so that promise is not yet
realized as a user workflow.

Define and version a portable observation artifact containing at least:

- target identity and executable digest;
- spec, checker, report, and artifact format versions;
- platform and controlled environment metadata;
- exact argv and probe-level/sandbox policy;
- byte-faithful stdout/stderr with truncation metadata;
- status, signal, timing, timeout, and cancellation information; and
- filesystem/network observations where the probe level supports them.

Then make recording, checking, and replay separate operations. That enables retroactive audits,
reproducible bug reports, offline checker development, comparison across versions, and third-party
verification without repeatedly executing an untrusted target. Redaction and retention policy
must be part of the artifact design because output and environment data may contain secrets.

### R4-2 — P1: the spec needs explicit profiles and applicability rules

> **Remediation: ROADMAP** — `daa10f0`, step 5, merged with R4-3 (a streaming profile _is_ its completion semantics). Placed before the coverage-gap work because a gap's applicability depends on which profile the target declares.

The current catalog mostly reads as one universal model, but several legitimate CLI archetypes
have incompatible contracts:

- verb/subcommand tools;
- Unix filters;
- free-form prompt tools;
- delegators over another executable;
- service/daemon controllers;
- streaming producers; and
- intentionally interactive sessions or REPLs.

For example, a filter may have no command tree, a stream cannot retract valid records emitted
before a late failure, and a delegator cannot always enumerate its downstream schema. Introduce
declared conformance profiles with explicit rule applicability and falsifiable profile claims.
Otherwise good tools will either fail irrelevant rules or weaken the universal rules until they
say too little. A report should always answer, “Conforms to which spec version, profile, and probe
level?”

### R4-3 — P1: formalize completion and partial-success semantics

> **Remediation: ROADMAP** — `daa10f0`, step 5, merged with R4-2.

The current fail-loud model is strongest for atomic request/response commands. It needs a more
complete outcome algebra for streams, batch operations, and long-running work.

In particular, `stdout is empty on failure` is appropriate for atomic data output but impossible
for a process that emitted valid stream records before encountering an error. A streaming profile
should instead require a machine-readable terminal event, a nonzero process outcome, and an
unambiguous way for consumers to know that the preceding stream is incomplete. Batch operations
need per-item outcomes plus a defined overall result. The wiki's competing `ok/error`,
`action_required`, and `outcome` models should converge on the same formal state model rather than
grow independently.

### R4-4 — P1: remediation should be structured data, not an executable shell string

> **Remediation: ROADMAP** — `daa10f0`, **promoted to step 1**. The review rates it P1 and then omits it from its own suggested ordering; it was re-ranked by consequence, because it is a small schema decision whose cost rises with every consumer that starts auto-following remediation. The immediate half — describing `next.command` honestly as an untyped command template rather than executable remediation — was already done in `62c13c1`.

The `next.command` idea is useful for agents but becomes a command-injection boundary as soon as
user-controlled identifiers, paths, or remote text are interpolated into it. A shell command also
loses the distinction between argv and shell syntax.

Prefer a structured next-action object with an executable plus argv array, typed placeholders,
effect classification, confirmation requirement, and provenance. Treat it as a proposal to
validate, not trusted text to execute. This is a small schema decision with unusually large safety
consequences once agent clients start automatically following remediation.

### R4-5 — P2: lifecycle behavior deserves its own rule family

> **Remediation: PARTIALLY STARTED** — `daa10f0` (roadmap, step 7) and `a802b8f` (its first rule). This finding acquired present-day evidence during remediation — see _New finding N1_, a signal-death bug found while writing this section up — and the family it asks for now exists with one member: **G1**, core/L0, owning "an inert invocation MUST NOT terminate the target by signal". The remaining members this finding names — cancellation, bounded shutdown, signal-distinguishable outcomes under real work, SIGPIPE, resumability, idempotency keys — are still roadmap. The kit now _records_ the signal; only G1 _judges_ it.

Agent-driven commands are frequently cancelled, piped, retried, or killed by an outer deadline.
The spec covers closed stdin but not the rest of that lifecycle. Add requirements and fixtures
for:

- SIGINT/SIGTERM and platform-equivalent cancellation;
- bounded shutdown and descendant cleanup;
- signal-distinguishable outcomes;
- broken pipes/SIGPIPE without stack traces or corrupt trailing output;
- resumability or explicit non-resumability for interrupted work; and
- idempotency keys or request identifiers where mutation may be retried.

These are agent-contract concerns, not merely process hygiene: the caller must be able to decide
whether work completed, can be retried, or requires reconciliation.

### R4-6 — P2: version the contract, not only individual rules

> **Remediation: ROADMAP** — `daa10f0`, **step 2**, split out from R4-1 and placed strictly before it.

Append-only rule IDs are valuable, but consumers also need compatibility semantics for the spec,
profiles, schema, observation artifacts, checker corpus, and report output. Establish version
negotiation, deprecation, and migration rules early, while no compatibility promise has hardened.
Machine reports and any future badge should embed these coordinates rather than present
“conformant” as an unqualified boolean.

### R4-7 — P2: make the declared schema a portable intermediate representation

> **Remediation: ROADMAP** — `daa10f0`, step 6.

The single-source `spec.ts` experiment is directionally right but tied to the reference
implementation. A versioned JSON Schema for command structure, inputs, output kinds, effects,
errors/outcomes, stability, and examples would let other ecosystems either generate their CLI
surface or export a declaration from an existing framework.

This is also the natural source for generated help, checker expectations, an agent skill, and an
optional MCP projection. The research correctly identifies the risk of CLI/MCP/skill drift;
parity should be machine-checked from one declared surface rather than maintained as prose.

### R4-8 — P2: test the checker as a measurement instrument

> **Remediation: ROADMAP** — `daa10f0`, step 8, with the risk of late placement stated explicitly and per-checker false-positive fixtures called out as _not_ deferred. The roadmap notes that _New finding N3_ — a canary pattern nothing had tested for false positives — is an instance of exactly the gap this finding names.

The positive reference CLI and negative fixtures are a strong start. Before conformance results
carry much weight, add an assurance methodology for the checker itself:

- mutation tests proving each checker rejects the defect it names;
- false-positive fixtures for legitimate unusual CLI shapes;
- property and metamorphic tests across flag order, locale, chunking, and equivalent invocations;
- differential checks where independent observers should agree; and
- coverage assertions mapping every normative clause to evidence or `unverified`.

This is the difference between having tests for a checker and knowing what the checker can validly
claim.

### R4-9 — P2: control the observation environment explicitly

> **Remediation: ROADMAP** — `daa10f0`, **step 3**, merged with the L0 safety capabilities deferred from R2-1 (one mechanism seen from two sides; they share the child-environment construction path). See _New finding N4_ for the concrete locale fragility.

Language-agnostic black-box testing can still be locale-, terminal-, credential-, and
machine-dependent. Discovery currently relies in places on English help/error conventions, and
real targets may change behavior based on TTY state, terminal width, `HOME`/XDG paths, timezone,
locale, proxy variables, credentials, or ambient configuration.

Define a hermetic environment policy, record deviations in the artifact, prefer schema-based
discovery over English-text heuristics, and make any forced locale explicit. Otherwise two users
can receive different conformance verdicts for the same binary.

### Suggested roadmap order

1. Clarify audience, current capability, planned capability, and non-goals on the front page.
2. Resolve the outcome model and L0 safety boundary, then make runner evidence byte- and
   lifecycle-correct.
3. Version the spec/profile/report coordinates and ship persisted record/check/replay artifacts.
4. Add archetype profiles, beginning with atomic command, stream, filter, and delegator.
5. Publish the portable declaration schema and adapters, then generate agent guidance and any MCP
   projection from it.
6. Harden checker assurance with mutation/property/differential fixtures.
7. Add adoption surfaces: `acc init`, a probe-plan dry run, CI integration, and SARIF/JUnit or
   similarly standard report exports.

Items 3–6 are not all discoveries absent from the research; several are already present there as
good future directions. The recommendation is to elevate them into the public product roadmap,
because together they define the project more distinctly than a larger catalog of CLI style
rules would.

## Round 5 — built-in `acc` CLI usability and dogfooding

### What was exercised

The CLI received a separate end-to-end pass in both TTY text mode and piped/machine mode. The
pass covered:

- root and subcommand help;
- `rules` filtering by tier and tag;
- `show` by rule ID and slug, with and without the full body;
- directed `path` traversal in both directions;
- `tags` and `schema` in text and JSON modes;
- bare invocation, unknown-page, invalid-enum, and invalid-format failures;
- `check` against `acc` itself and the conforming fixture; and
- `check` against the real `/usr/bin/git` binary.

The overall experience supports the project's dogfooding thesis. Particularly effective:

- human output is compact while redirected output automatically becomes a structured envelope;
- `show` uses progressive disclosure well—metadata first, full body on request;
- errors carry a useful kind, exit code, hint, choices/details, and command identity;
- `check` distinguishes “the checker failed” from the valid negative outcome “target is not
  conformant” using exit `9` while keeping the report as data;
- the human conformance report is scannable and explains `PASS`, `FAIL`, `UNVR`, and `N/A`; and
- `check --help` puts its important safety caveat before copyable examples.

The real-binary check completed promptly and produced a plausible, inspectable result for Git:
two core violations, one core rule unverified, and one diagnostic violation. The self-check and
positive fixture both reported conformant. Those results also reproduced the earlier R1-4 issue:
the headline says fully verified even though individual “passes” acknowledge unverified clauses.

### R5-1 — P2: several published examples fail when copied verbatim

> **Remediation: FIXED** — `4f8e115`. Examples corrected (`acc path` traversal direction is now stated in the description, and the `jq` path is `.data.commands[].name`), and a smoke test now extracts every declared example and asserts its documented exit and output shape, so a published invocation cannot quietly stop working.

Locations:

- [`README.md`](../../README.md), the `acc path A1 delegator` example;
- [`src/acc/spec.ts`](../../src/acc/spec.ts), generated `path` and `schema` examples.

Observed:

```text
acc path A1 delegator
  -> exit 5: no directed link path; reversing the arguments succeeds

acc path B1 delegator --json
  -> exit 5: no directed link path

acc schema | jq '.commands[].name'
  -> jq exit 5: Cannot iterate over null
```

The schema pipeline fails because piping selects machine mode, whose command list lives at
`.data.commands`, not `.commands`. The path failures are made more surprising by help describing
the operation only as “Shortest link path”; it does not say that traversal follows outbound links
only.

Add a smoke test which extracts or enumerates every declared example and asserts its documented
exit/output shape. Either choose path examples that exist, or make direction explicit in the
description and examples. Correct the `jq` path according to the intended schema envelope.

### R5-2 — P2: root human help does not advertise machine mode

> **Remediation: FIXED** — `02b6a27`. Global args are attached to the root as well as to every subcommand, so TTY `acc --help` names `--format`/`--json`. D3's checker now inspects forced human help independently of the machine schema, removing the self-fulfilling probe the reviewer identified.

Location: [`src/acc/cli.ts`](../../src/acc/cli.ts), where global arguments are attached only to
each generated subcommand.

`acc rules --help` correctly documents `--format` and `--json`, but TTY `acc --help` lists only
`--version` and `--help`. This conflicts with D3's guidance that root help should name the
machine-readable path and makes the automatic TTY/pipeline behavior harder for a new user to
discover.

The current D3 checker still reports a pass because its non-TTY `--help` probe automatically
switches to the JSON schema, where `--json` necessarily appears. That makes the test partly
self-fulfilling and misses the human help surface the rule names. Root help should advertise the
global format controls, and the checker should inspect forced human help independently of the
machine schema.

### R5-3 — P2: `schema` changes its JSON shape when stdout is redirected

> **Remediation: FIXED** — `4cc2971`. One contract chosen and documented: `acc schema` is enveloped in **both** modes, consistent with every other command. This is also what makes the corrected `jq` example in R5-1 correct.

Locations:

- [`src/acc/commands/schema.ts`](../../src/acc/commands/schema.ts);
- [`src/acc/envelope.ts`](../../src/acc/envelope.ts).

In a terminal, `acc schema` prints the raw schema object. In a pipeline, automatic machine mode
wraps the same object in `{ "ok": true, "data": ... }`. Both are valid JSON, but the same command
and argv have two incompatible query paths based solely on whether stdout is a TTY. This is the
underlying reason the documented `jq` example fails.

Choose and document one contract. Keeping the envelope is consistent with other commands, while
emitting the raw schema in every mode makes it directly consumable as an interface artifact.
Either choice is defensible; changing shape implicitly is the problematic part.

### R5-4 — P2: quoted YAML escapes leak into CLI titles

> **Remediation: FIXED** — `88d6596`. `unquoteScalar` now decodes escaped inner quotes instead of stripping only the outer pair. Round-trip fixtures cover quotes, colons, `#`, commas and multiline values, since these fields are user-facing CLI data and not merely lint metadata.

Locations:

- [`scripts/docs-lint/index.ts`](../../scripts/docs-lint/index.ts), `unquoteScalar` and
  `parseFrontmatter`;
- [`docs/wiki/rules/exit-codes/usage-errors-are-distinguishable.md`](../wiki/rules/exit-codes/usage-errors-are-distinguishable.md).

The C2 title renders in both text and JSON as:

```text
\"You invoked me wrong\" is distinguishable from \"I broke\"
```

The frontmatter contains a valid double-quoted YAML scalar, but the lightweight parser removes
the outer quotes without decoding escaped inner quotes. Either use a real YAML scalar parser or
define and lint a deliberately smaller frontmatter syntax that excludes escaped scalars. Add a
round-trip fixture for quotes, colons, `#`, commas, and multiline values because these fields are
now user-facing CLI data rather than lint metadata alone.

### CLI-specific recommendation

Keep the CLI. It is doing three valuable jobs at once: browsing the specification, providing the
actual conformance workflow, and forcing the project to encounter its own rules in production
code. The next investment should be contract/example tests and honest verdict accounting rather
than expanding the command surface. Once those are solid, persisted observation/replay commands
from R4-1 would be the most natural substantive addition.

## Additional hardening recommendations

These did not receive primary finding status but are worth including in the implementation
rounds.

### Add a checked-in CI workflow

The Husky pre-commit hook runs `bun run check`, but no checked-in CI workflow was present during
the review. Local hooks are valuable but bypassable. The README's “fails CI” and “on every
commit” language should be backed by a required remote check.

### Enforce unique wiki identities

[`src/acc/graph.ts`](../../src/acc/graph.ts) constructs `bySlug` with a Map, and the docs linter
constructs a similar `type/slug` map for `related:` entries. Duplicate keys silently allow the
last page to win. Add lint rules for globally unique CLI slugs and unique `type/slug` keys so
`acc show <slug>` and `related:` resolution cannot become ambiguous.

### Separate current capability from roadmap language

The README currently describes filesystem hashes and L1/L2 snapshot behavior as if they are
implemented. The current runner records argv, streams, exit status, and timing and the public
`check` command runs at L0. Label filesystem hashing and higher probe levels as planned until the
corresponding data model and execution phases exist.

## Recommended implementation order

1. Make process termination and output capture bounded (R1-1 and R2-3).
2. Correct the L0 safety model and public wording before encouraging checks of unknown binaries
   (R2-1).
3. Restore honesty of the reference CLI and schema (R1-2, R1-3, and R2-2).
4. Correct partial-verification accounting (R1-4).
5. Validate expectations and interpreter selection (R2-4 and R2-5).
6. Add remote CI, uniqueness lint, and roadmap labels.

## Regression test checklist

- [x] A child process whose descendant retains stdout/stderr cannot outlive the probe deadline.
      — `90ea2a8`; measured at 306 ms against a 300 ms deadline.
- [x] Output beyond the configured byte limit is terminated and reported explicitly. — `dfd3de3`.
- [x] A UTF-8 code point split across chunks is recorded exactly. — `dfd3de3`; verified with
      byte-by-byte writes of `€ — ✓`.
- [x] `--version --json`, `--json --version`, and `--format json --version` emit one structured
      document. — `cf759ed`.
- [x] Every argument with `values` rejects an out-of-set value with exit `2` and `choices`. —
      `6402b2a`; enforced by a test that walks the spec, so a new flag cannot skip it.
- [x] Every runtime error kind produced by a command appears in that command's schema. —
      `3e55c82`.
- [x] A rule with any unverified normative assertion cannot contribute a pass to
      `fullyVerified`. — `29ec00f`, via `coverage`/`coverageGaps`. All 19 checkers currently
      declare `partial`, so `acc` reports `fullyVerified: false` about itself.
- [ ] Bare/default-root and ignored-flag risks are covered by the safety model or require
      explicit opt-in. — **NOT DONE, deliberately.** The claim was corrected (`fc7ea19`); the
      opt-in mechanism is roadmap step 3. See _Decision D1_.
- [x] Malformed and mistyped expectations fail with actionable configuration errors. — `a5d4d44`.
- [x] An executable `.ts` target with a non-Bun shebang uses its declared interpreter. —
      `4d6b199`; polyglot fixture, fails if the override returns.
- [x] Duplicate wiki slugs and duplicate `type/slug` keys fail documentation lint. — `d10e499`.
- [x] The full gate runs as a required CI check. — `5affa08`. "Required" is a branch-protection
      setting on the remote, not something the repo can assert; the workflow exists and runs on
      push and pull request.

Two further items the reviewer would have added had the defects been visible:

- [x] A target killed by an unhandled signal cannot contribute a pass to any rule. — `333d5d2`.
      Nine false passes and three false failures removed. See _New finding N1_.
- [x] A target that crashes on every path but help does not report `conformant: true`. —
      `a802b8f`, rule **G1**. Permanent negative-control fixture; removing G1 from the registry
      makes the same recording certify again, which is what keeps the rule biting.

## Review scope

This was a read-only implementation review followed by creation of this report. No fixes were
implemented, and no source, test, specification, or existing documentation file was changed.

---

# Remediation record — 2026-08-15

Everything below this line was written by the implementer, not the reviewer.

## Decisions taken

Five judgement calls that shaped what was and was not done. Each is reversible except where
noted; they are recorded here because a re-reviewer should be able to disagree with the decision
rather than re-derive it from the diff.

**D1 — This pass corrects claims and fixes bugs; it does not build capabilities.**
Where the review found an overclaim and suggested building the thing that would make it true
(R2-1's sandbox and hermetic environment, R4-4's typed remediation), the action taken was to stop
claiming it and record it as planned. The alternative — "fix the overclaim" quietly becoming
"build the thing we overclaimed" — is how a remediation pass stops converging. The cost is that
`docs/roadmap.md` is now long, and the L0 safety story is honest rather than fixed.

**D2 — The five concept-only requirements stay labelled as design guidance.**
R3-1 correctly notes that machine-mode existence and override precedence, output completeness,
pagination and field selection, the error envelope, and `next`-action semantics live only in
concept prose, which under the project's own contract makes them non-normative. The tempting fix
is five new rule pages with `checker_status: planned`. **Rejected**: rule IDs are append-only and
appear in reports that outlive any release, so minting five speculative ones during a cleanup
pass is the same "cheap now, unaffordable later" trap the exit-code decision page identifies in
KEP-2551's history. They get IDs when a checker design exists to give them. **This is the one
decision that is hard to reverse in one direction** — un-minting an ID is worse than minting one
late.

**D3 — The roadmap lives outside `docs/wiki/`.**
`SCHEMA.md` states that only rule pages are normative and that concept pages must not state
requirements. A roadmap is neither, and putting aspirations inside the spec is the exact
conflation R3-1 objected to. It also spares the roadmap the wiki lint's type/orphan/frontmatter
contract, which does not fit it.

**D4 — Index catalog hooks are now enforced verbatim-equal to each page's `description`.**
`SCHEMA.md` always said the description doubles as the catalog hook; nothing checked it, and all
25 had drifted into paraphrases — which is how two stale hooks survived a phase that edited both
source pages. Enforcing equality was the only version of the check that would have caught them.
The cost is a longer index and a real constraint on how descriptions are written from here on.

**D5 — `coverage` is a static property of a checker, not of a finding.**
A per-finding coverage value would be more precise (B3 establishes more against a target that
advertises a machine-mode flag than one that does not), but the cases where it would differ are
already the cases where the verdict is `unverified`, which blocks `fullyVerified` anyway. Static
is simpler and does not lose a claim.

## Findings discovered during remediation

**N1 — A target killed by an unhandled signal collects passes from nine rules. `runner.ts`.**
`child.on("close", (code) => finish(code))` discards Node's second argument. A signal death
therefore records `exitCode: null` — the value that field's own doc comment defines as _"the
deadline or the output ceiling killed it"_ — with `timedOut` and `spawnFailed` both `false`, so
nothing distinguishes a target that **crashed** from one **we killed**. Reproduced: a fixture
whose entire body is `kill -SEGV $$`, run through `record()` + `buildReport()` at L0, returns
`pass` for A2, A6, B1, B2, C3, D2, D4, E1 and F1, with details including `"root verb rejected
with exit null"` and `"bare invocation exited null with stdout empty"`.

This is the same defect class `spawnFailed` was introduced to prevent for a target that cannot
_start_, and it is adjacent to R2-3 — `null` satisfies every "exited non-zero" test and empty
streams satisfy every "stdout was empty" test.

**FIXED — `333d5d2`.** The runner records the terminating signal and derives `crashed`
(`signal !== null && !timedOut && !truncated`, sound because both kit-sent kills are flagged
before `killTree` runs). `crashedUnverified` joins `hungUnverified` and `truncatedUnverified` as
a third catalogue-wide invariant, applied across every checker. The nine false passes went to
zero. **Three false _failures_ went with them** — A1, A3 and D1 had been pointing the wrong way,
D1 most egregiously with `"--version requires configuration (failed with an unusable HOME)"`
against a binary that segfaulted before `HOME` could matter. Same fabrication, opposite sign.

**N1a — and fixing it exposed a second defect the first one had been masking.** With every
crashed rule now correctly `unverified`, a binary that answers `--help` and `--version` and
segfaults on everything else reported **`conformant: true`, `acc check` exit `0`** — eleven core
rules unverified, nothing violated, because `conformant` counts violations only. That is its
documented definition working as written, and `fullyVerified: false` with eleven evidence gaps
carried the truth in the body; the one-bit exit code picked the wrong bit. The verdict taxonomy
could not separate "incomplete but fine" (git advertises no machine-mode flag — nothing git did
wrong) from "broken" (this crashes), because both are `unverified`.

**FIXED — `a802b8f`, and this reverses part of the original D2 ruling.** A rule now owns crashes:
**G1 — inert invocations must not crash the tool**, core, L0, the first member of a new
`lifecycle` family (`G`). D2 said IDs get minted when a checker design exists to give them;
here one did, so G1 is a down-payment on the R4-5 lifecycle family rather than a speculative ID —
cancellation, bounded shutdown, SIGPIPE and resumability become G2, G3, … The checker declares no
probes of its own and reads what the others already recorded. `primaryProblem` gained the
matching ownership case, so a crash stops sending the caller to A1; a hang still wins when both
are present, argued on reach.

Measured after: the partial crasher is `NOT CONFORMANT (L0) — 1 core violated`, **exit 9**, with
`FAIL G1  7 of 16 inert invocation(s) died by signal`. `acc` itself passes G1 at `core 16/16`.
The negative-control fixture is POSIX shell, not TypeScript, because **bun traps SIGSEGV** and
converts it to an ordinary exit — which would not exercise the invariant at all.

**N2 — R2-1's dry-run suggestion is not achievable as worded.** "Show the complete planned argv
list before execution" cannot be done: `probes: (d: Discovery) => Invocation[]`, and `Discovery`
is produced by running the target's help path. The kit can print the complete plan _after_ one
`--help`, or the discovery-independent part _before_ any execution. Those are two different
products and the choice is recorded in `docs/roadmap.md` rather than assumed.

**N3 — The project's own dogfood secret canary fired on ordinary English.**
`conformance.test.ts` carried `/(sk-|ghp_|xox[baprs]-|AKIA|opk_|…)/` — unanchored, no length
floor — while the shipped F1 checker uses `/\bsk-[A-Za-z0-9]{16,}/`. The canary matched the word
**"risk-reduced"** while Phase 4 was rewriting the L0 safety note. Fixed in `a4bbd60` by
exporting the shipped patterns and making the canary a superset _by construction_ rather than a
second hand-written copy, with false-positive tests for "risk-", "task-", "disk-", "sk-prefixed"
and "AKIA-style". **This is an instance of the gap R4-8 names**: a pattern with tests for what it
should match and none for what it should not.

**N4 — Discovery is locale-fragile in a specific, checkable way.** `discovery.ts` keys on
`/\bcommands\b/i` headings and `/--[a-z][a-z0-9-]*/`, while the runner inherits the full parent
environment. Two users with different `LANG` can therefore get materially different reports for
the same binary, and no report records which locale produced it. This is the concrete form of
R4-9's warning; it is roadmap step 3.

**N5 — `docs/wiki/concepts/output-kind.md` still overclaims, in the present tense.** **FIXED — `6adc9de`**, along with three more of the same shape that a sweep turned up: `concepts/exit-codes.md` and `decisions/exit-codes-below-125.md` both claimed the kit "verifies each declared error kind produces its declared code", and `concepts/conformance.md` told projects to work their unverified list down "by declaring something the kit currently has to guess at" — there is nothing to declare into. All four were the same pattern: a capability described as operating when nothing reads a target declaration today. Verified by reading every checker rather than grepping — D3 is the only rule that mentions a schema, and it greps root help for a `schema` row without ever running one. Original text below.
It says the conformance kit "reads the declaration and checks the bytes against it." No
third-party target declares an `output_kind` today, and B3's own coverage gap records that the
undeclared default is not enforced at L0. **Open** — same class as the Phase 4 overclaim work,
but it surfaced after that phase had run.

## What a re-review should check first

1. Whether the `coverage: partial` declarations are _honest_ rather than merely present — 49
   gaps were declared by reading each checker against its rule page, and an over-generous one
   would restore exactly the overclaim R1-4 identified.
2. Whether the corrected exit-code page (R3-3) is now right, since the original was confidently
   wrong and cited nothing.
3. Whether N1's fix leaves any other path where an exit status the target did not choose reads
   as one it did.
4. Whether the roadmap's adopted ordering survives contact — five steps depart from the order
   this review suggested, each with stated reasoning.

---

# Round 6 — verification re-review, 2026-08-15

Status: remediation independently exercised; no implementation changes made by the reviewer.

This round reviewed the 29 remediation commits (`90ea2a8`..`6adc9de`), the implementer's inline
responses, the 20-rule catalogue, and the public CLI as it exists after remediation. The review
deliberately does **not** treat R3-7, R3-8, or R3-9 as outstanding correctness work: those are the
editorial deferrals the project owner explicitly chose. It also accepts the partial reversal of
D2 that minted G1. D2's stated gate was “mint an id when a checker design exists”; the crash
defect supplied such a design, so G1 is consistent with the useful part of that decision rather
than an unexplained exception to it.

## Verification baseline

The full local gate is green after remediation:

- TypeScript typechecking passed;
- Biome passed with warnings treated as errors;
- documentation lint passed across 29 wiki files; and
- all 872 Bun tests passed (`1,751 expect()` calls across 35 files).

The public CLI regressions named in the remediation record were also exercised directly. The
three machine-mode version spellings emit structured output; invalid closed-set values fail with
exit `2` and `choices`; parser errors include usage; root help advertises both machine-mode
selectors; the C2 title renders without leaked YAML escapes; the checked-in examples execute;
and `acc check` reports 20 total rules, 17 core rules, `core 16/16`, and
`fullyVerified: false`. The partial-crash negative control now exits `9`, fails G1, and leaves the
other affected core checks unverified instead of letting absence of evidence become a pass.

The remediation is therefore substantial and mostly effective. The remaining findings below are
not failures of the gate; they are places where the gate or the specification can still make an
incorrect claim.

## Disposition of the original findings

The following original findings were verified fixed as scoped: R1-1 through R1-4; R2-2, R2-4,
and R2-5; R3-2 and R3-4 through R3-6; R5-1 through R5-4; and the three additional hardening
recommendations. R3-1 remains partially addressed by design. R2-1 remains partial and has one
residual wording problem described below. R2-3 and R3-3 should be moved from **Fixed** to
**Partially addressed/reopened** based on R6-1 and R6-3.

There is also a clerical error in the remediation summary table. Its `Fixed (18)` row names 17
numbered findings: four R1 findings, four R2 findings, five R3 findings, and four R5 findings. The
three hardening recommendations are then listed separately. The count is therefore neither 18
for the numbered findings nor 20 with the hardening recommendations included.

## R6-1 — P1: distinct byte streams still collapse into the same evidence

Locations:

- [`src/acc/kit/runner.ts`](../../src/acc/kit/runner.ts), `finish`, where the retained buffers are
  converted to strings;
- [`src/acc/kit/checkers/discoverability/help-deterministic.ts`](../../src/acc/kit/checkers/discoverability/help-deterministic.ts),
  which compares those strings while describing the requirement as byte identity.

R2-3 correctly fixed UTF-8 sequences split across child-process chunks: buffers are concatenated
before decoding, so a code point divided between writes is no longer corrupted. That is not the
same as byte-faithful capture. `finish` immediately decodes the buffers with `toString("utf8")`
and the `Observation` retains no raw buffer or digest. Invalid UTF-8 is replaced during that
decode, irreversibly.

Reproduced with two one-byte stdout streams:

```text
{ "sourceByte": 128, "stdout": "�", "stdoutBytes": 1, "reencoded": [239,191,189] }
{ "sourceByte": 129, "stdout": "�", "stdoutBytes": 1, "reencoded": [239,191,189] }
```

The target outputs differ, but D4 receives identical JavaScript strings and can report that help
was byte-identical. The byte count does not rescue the comparison because both streams contain
one byte. This also means a finding cannot quote or persist the actual bytes that were observed.

Suggested direction: retain each stream's captured bytes or a collision-resistant digest of
them alongside any decoded display string, and make byte-comparison rules use that representation.
An alternative is to narrow the specification explicitly to valid UTF-8 and add an encoding
violation for invalid output, but silently normalising invalid data cannot support a byte-faithful
claim. R2-3 should be considered partial until one of those contracts is chosen.

## R6-2 — P1: G1 excludes external signals in prose but fails them in code

Locations:

- [`docs/wiki/rules/lifecycle/inert-invocations-do-not-crash.md`](../wiki/rules/lifecycle/inert-invocations-do-not-crash.md),
  the rule scope and coverage gaps;
- [`src/acc/kit/runner.ts`](../../src/acc/kit/runner.ts), the `crashed` derivation;
- [`src/acc/kit/checkers/lifecycle/does-not-crash.ts`](../../src/acc/kit/checkers/lifecycle/does-not-crash.ts),
  the G1 verdict.

The normative page says G1 is silent about an operator's interrupt, an outer deadline's signal,
or an OOM kill. The runner, however, defines `crashed` as any observed signal not sent by this
kit, and G1 turns every such observation into a core failure. The checker itself correctly admits
the attribution limit in `coverageGaps`: an external kill reads as the target falling over.

That admission does not make the result conservative. `coverage: partial` prevents
`fullyVerified: true`, but it does not soften a false `fail`; G1 can still make
`conformant: false` and select exit `9` for an event the normative rule expressly excludes. This
is different from an unprobed path that could cause an overly narrow pass.

Suggested direction: align the normative and executable scopes. Options include limiting G1
failures to fault-like synchronous signals and treating externally ambiguous signals as
unverified, or explicitly broadening G1 to own every non-kit signal and removing the exclusion.
If the attribution cannot be resolved, model it as a validity/false-positive risk rather than an
ordinary coverage gap; the two affect the headline in opposite directions.

## R6-3 — P1: the exit-code correction remains internally inconsistent

Locations:

- [`docs/wiki/decisions/exit-codes-below-125.md`](../wiki/decisions/exit-codes-below-125.md);
- [`docs/wiki/concepts/exit-codes.md`](../wiki/concepts/exit-codes.md).

There are two independent problems.

First, code `124` is simultaneously presented as adopted for timeout, placed below a
“reserved; never allocate” divider, included in the `9-124 OUTCOMES` range, and counted among
“115 unallocated codes (`10`-`124`)” for future meanings. If `124` is already the timeout
outcome, it is not unallocated; the available unallocated range is `10`-`123`, which contains
114 codes. The policy can reasonably choose `124` as a fixed outcome, but the allocation table
and arithmetic need to say the same thing.

Second, both pages treat a status above `128` as sufficient proof that the process was signalled.
POSIX requires a shell to produce a value above 128 after signal termination; it does not make
the converse true. An ordinary program can choose a status in that range. The concept page even
records `git` returning `129` for an unknown flag, immediately after telling the reader to
interpret such a value as a signal. The portable conclusion is one-way: a known signal death
must be represented above 128, while the number alone is not reliable attribution of a signal.
The exact status and possible collisions are shell-dependent.

Suggested direction: distinguish normal process exit values from shell-assigned signal statuses,
remove the unsafe converse, and use out-of-band process metadata—as the runner now does—when the
caller must know whether a signal occurred. Then decide whether `124` is a permanently allocated
timeout outcome or part of the general outcome pool and correct the table and count together.
R3-3 should be reopened until those two points agree.

## R6-4 — P1: the corrected safety note still calls fixed-verb probes inert

Location: [`src/acc/spec.ts`](../../src/acc/spec.ts), the public notes for `acc check`.

The expanded safety warning is a meaningful correction. It now names bare-invocation work,
ignored unknown flags followed by a default action, global initialisation, HOME/XDG and absolute
path writes, inherited credentials, and network access. Two sentences later, however, it says:

> Probes are inert against a CLI that dispatches on a fixed verb table.

A fixed verb table establishes only that a sentinel token cannot name a declared verb. It does
not prevent the same ignored-flag/default-root behavior or pre-dispatch initialisation that the
preceding sentence correctly warns about, and the probe set also contains a bare invocation.
The later “willing to run” warning helps, but it does not make the categorical inertness claim
true.

Suggested direction: say only that sentinel tokens avoid declared verbs, then preserve the
risk-reduced—not inert—language for the complete run. R2-1 was already recorded as partial; this
is a remaining contradiction inside the claim-correction portion of that work.

## R6-5 — P2: coverage gaps do not always state the checker's sampling boundary

Representative locations:

- [`docs/wiki/rules/streams/no-ansi-when-piped.md`](../wiki/rules/streams/no-ansi-when-piped.md);
- [`src/acc/kit/checkers/streams/no-ansi-when-piped.ts`](../../src/acc/kit/checkers/streams/no-ansi-when-piped.ts).

The new coverage inventory is valuable and correctly prevents `fullyVerified` from claiming more
than the current suite establishes. Its content is not yet uniformly complete. B2's normative
rule applies to stdout and stderr whenever output is non-TTY or machine mode is active, while the
checker samples root help and one usage error. The page's **Established** section accurately says
that. Its declared gaps list CSI-versus-OSC detection, carriage-return animation, and TTY-only
overrides, but does not name the much larger path boundary: nested help, version, successful
command data, machine-mode output, and other diagnostics are not sampled.

This does not currently create a false `fullyVerified` result because B2 remains partial. It does
mean the advertised list of why it is partial is incomplete, weakening the remediation record's
goal that the gaps be actionable rather than just present. The same audit should distinguish
three things for every checker: untested normative clauses, incomplete detection within a sampled
path, and untested paths to which a universal clause applies.

## R6-6 — P2: F2 perturbs the target environment to manufacture repetitions

Location: [`src/acc/kit/checkers/safety/first-byte-prompt.ts`](../../src/acc/kit/checkers/safety/first-byte-prompt.ts).

F2 repeats `--version` three times by assigning a different `ACC_PROBE_TIMING` value to each
child. The comment correctly acknowledges that this is visible to the target, can skew the
measurement, and should move to `Invocation.repeat`; C3 and D4 have already made that migration.
An environment-sensitive target can therefore make the three runs slower or faster based on the
recorder's dedup workaround. The resulting timing is not strictly a repeated measurement of one
invocation, and the risk is absent from F2's declared coverage gaps.

Suggested direction: use `repeat` for F2 as well and remove `ACC_PROBE_TIMING`. This is a small
change in surface area, but it matters because the conformance kit is explicitly designed to run
unknown, potentially adversarial binaries and should not give them measurement-dependent input
unless the rule is testing that input.

## Round-two recommendation

The project is in a much better position than at the first review. The next implementation pass
does not need another broad rewrite. Resolve R6-1 through R6-4 before treating the current L0
headline as a trustworthy gate, then tighten coverage metadata and remove F2's environment nonce.
After that, the roadmap's observation/replay and declaration-IR work remains the right next major
direction: both build on the more honest distinction the remediation introduced between what was
observed, what a checker established, and what the specification aspires to establish.
