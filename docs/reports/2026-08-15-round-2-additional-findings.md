---
type: report
generated: { by: claude-opus-5, at: 2026-08-15 }
status: stable
lifecycle: live
description: Verification of the 29 remediation commits answering the round-1 review, and the six findings that survived it.
tags: [conformance, remediation]
subject: src/acc
examined: 90ea2a8..6adc9de
---

# Round 2 review — additional findings

Date: 2026-08-15

Status: six findings remain for follow-up; no implementation changes were made by the reviewer.

This report is the current worklist produced by the verification review of the 29 remediation
commits (`90ea2a8`..`6adc9de`). It intentionally excludes resolved findings and the earlier
review narrative. The complete history remains in
[`2026-08-14-implementation-review.md`](./2026-08-14-implementation-review.md).

The catalogue now contains 20 rules. G1 is accepted as a justified, checker-backed partial
reversal of remediation decision D2. R3-7, R3-8, and R3-9 are deliberately deferred editorial
work and are not included below as correctness findings.

## Current priorities

| Priority | Finding                                                      | Recommended outcome                                             |
| -------- | ------------------------------------------------------------ | --------------------------------------------------------------- |
| P1       | R6-1 — distinct byte streams collapse into the same evidence | Preserve raw bytes or hashes, or explicitly enforce valid UTF-8 |
| P1       | R6-2 — G1 can fail signals its normative scope excludes      | Align the rule and checker scopes                               |
| P1       | R6-3 — exit-code documentation remains inconsistent          | Correct the `124` allocation and the `>128` signal claim        |
| P1       | R6-4 — safety guidance still calls fixed-verb probes inert   | Use risk-reduced language consistently                          |
| P2       | R6-5 — coverage gaps omit important sampling boundaries      | Inventory paths, clauses, and detector limits separately        |
| P2       | R6-6 — F2 changes the environment between timing runs        | Use `Invocation.repeat` instead                                 |

## R6-1 — P1: distinct byte streams collapse into the same evidence

Locations:

- [`src/acc/kit/runner.ts`](../../src/acc/kit/runner.ts), `finish`;
- [`src/acc/kit/checkers/discoverability/help-deterministic.ts`](../../src/acc/kit/checkers/discoverability/help-deterministic.ts),
  the D4 comparison.

The runner now correctly concatenates chunks before decoding, so a valid UTF-8 code point split
between child-process writes is no longer corrupted. It still converts the completed buffers to
UTF-8 strings and discards the raw bytes. Invalid UTF-8 is replaced during that conversion.

Two different one-byte stdout streams therefore produce the same observation:

```text
{ "sourceByte": 128, "stdout": "�", "stdoutBytes": 1, "reencoded": [239,191,189] }
{ "sourceByte": 129, "stdout": "�", "stdoutBytes": 1, "reencoded": [239,191,189] }
```

D4 compares the resulting JavaScript strings while claiming byte identity, so it can certify
different raw output as identical. Equal byte counts do not distinguish the example above.

Recommended outcome: retain captured bytes or a collision-resistant digest alongside the display
string and make byte-comparison rules use that representation. Alternatively, narrow the
contract to valid UTF-8 and explicitly fail output that violates the encoding contract. R2-3 from
the original review should remain partially addressed until this is resolved.

## R6-2 — P1: G1 can fail signals its normative scope excludes

Locations:

- [`docs/wiki/rules/lifecycle/inert-invocations-do-not-crash.md`](../wiki/rules/lifecycle/inert-invocations-do-not-crash.md);
- [`src/acc/kit/runner.ts`](../../src/acc/kit/runner.ts), the `crashed` derivation;
- [`src/acc/kit/checkers/lifecycle/does-not-crash.ts`](../../src/acc/kit/checkers/lifecycle/does-not-crash.ts),
  the G1 verdict.

The rule says it is silent about an operator interrupt, an outer deadline's signal, and an OOM
kill. The runner defines `crashed` as any observed signal the kit did not send, and G1 turns every
such observation into a core failure. The checker acknowledges that attribution limit in a
coverage gap, but `coverage: partial` does not soften a failure: the result can still make
`conformant: false` and select exit `9` for an event the normative rule excludes.

Recommended outcome: make the normative and executable scopes identical. Either classify only
fault-like synchronous signals as G1 failures and treat externally ambiguous signals as
unverified, or broaden G1 to own every non-kit signal and remove the exclusion. False-positive
risks should be represented separately from ordinary undercoverage because they affect the
headline in the opposite direction.

## R6-3 — P1: exit-code documentation remains internally inconsistent

Locations:

- [`docs/wiki/decisions/exit-codes-below-125.md`](../wiki/decisions/exit-codes-below-125.md);
- [`docs/wiki/concepts/exit-codes.md`](../wiki/concepts/exit-codes.md).

There are two separate inconsistencies.

First, `124` is presented as an adopted timeout outcome, placed after a “reserved; never
allocate” divider, included in the `9-124 OUTCOMES` range, and counted among “115 unallocated
codes (`10`-`124`)”. If `124` is already assigned to timeout, it is not unallocated. The
unallocated range is `10`-`123`, containing 114 codes.

Second, the pages treat a status greater than `128` as sufficient evidence that the process was
signalled. POSIX specifies the other direction: a shell must report a signal termination with a
status greater than 128. An ordinary program can still choose a status in that range. The concept
page itself records `git` returning `129` for an unknown flag shortly after telling the reader to
interpret values above 128 as signal deaths.

Recommended outcome: decide whether `124` is a permanently allocated timeout outcome and correct
the table and arithmetic together. Describe the signal rule as one-way and use out-of-band
process metadata when attribution matters. R3-3 from the original review should be reopened until
both points agree.

## R6-4 — P1: safety guidance still calls fixed-verb probes inert

Location: [`src/acc/spec.ts`](../../src/acc/spec.ts), the notes for `acc check`.

The expanded warning now accurately names bare-invocation work, ignored flags followed by a
default action, global initialization, filesystem access outside the temporary working directory,
inherited credentials, and network access. It then says:

> Probes are inert against a CLI that dispatches on a fixed verb table.

A fixed verb table establishes only that a sentinel cannot name a declared verb. It does not
prevent the ignored-flag/default-root behavior or pre-dispatch initialization named immediately
before this sentence, and the probe set also includes a bare invocation.

Recommended outcome: say that sentinel tokens avoid declared verbs without calling the complete
run inert. Use “risk-reduced” consistently. The original R2-1 was already marked partial; this is
the remaining contradiction in its claim correction.

## R6-5 — P2: coverage gaps omit important sampling boundaries

Representative locations:

- [`docs/wiki/rules/streams/no-ansi-when-piped.md`](../wiki/rules/streams/no-ansi-when-piped.md);
- [`src/acc/kit/checkers/streams/no-ansi-when-piped.ts`](../../src/acc/kit/checkers/streams/no-ansi-when-piped.ts).

The coverage inventory is valuable and correctly prevents `fullyVerified` from overstating the
current checker suite. Its contents are not yet uniformly complete.

B2 applies to stdout and stderr whenever output is non-TTY or machine mode is active. Its checker
samples root help and one usage error. The declared gaps identify incomplete escape detection,
carriage-return animation, and unreachable TTY overrides, but do not identify the larger path
boundary: nested help, version, successful command output, machine-mode output, and other
diagnostics are not sampled.

Recommended outcome: audit each partial checker for three distinct categories:

1. normative clauses not tested at all;
2. detector limitations within a sampled path; and
3. untested execution paths to which a universal clause applies.

This currently does not create a false `fullyVerified` result because B2 remains partial. It does
make the published explanation of that partial coverage incomplete.

## R6-6 — P2: F2 changes the environment between timing runs

Location: [`src/acc/kit/checkers/safety/first-byte-prompt.ts`](../../src/acc/kit/checkers/safety/first-byte-prompt.ts).

F2 repeats `--version` three times by assigning a different `ACC_PROBE_TIMING` value to each
child. This is visible to the target and can change the measurement. The code comment already
acknowledges the issue and notes that C3 and D4 moved to `Invocation.repeat` for the same reason.

An environment-sensitive target can make individual runs faster or slower based on the recorder's
deduplication workaround. The result is not strictly a repeated measurement of the same
invocation, and this validity risk is not among F2's coverage gaps.

Recommended outcome: remove `ACC_PROBE_TIMING` and use `Invocation.repeat` for the three timing
runs.

## Suggested implementation order

1. Preserve raw-byte evidence and update D4 to compare it.
2. Align G1's external-signal scope before relying on it as a core failure.
3. Correct the exit-code allocation and signal-attribution guidance.
4. Remove the residual inertness statement from the public safety note.
5. Complete the coverage-gap inventory, starting with universal output rules.
6. Move F2 to `Invocation.repeat`.

After these findings are resolved, observation persistence/replay and the portable declaration IR
remain the most useful larger roadmap investments. Both depend on trustworthy evidence and an
explicit distinction between what was observed, what a checker established, and what remains
unverified.
