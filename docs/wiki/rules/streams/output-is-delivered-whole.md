---
type: rule
title: A command delivers every byte it wrote
description:
  A payload that stops at the pipe buffer still exits 0 — the caller receives two thirds of an
  answer with nothing anywhere to say a third is missing.
tags: [streams, silent-failure, lifecycle, core]
related: [rule/machine-output-is-parseable, concept/output-kind, concept/exit-codes]
status: stable
generated: { by: claude-opus-5, at: 2026-08-16 }
rule_id: B4
tier: core
probe_level: L1
checker: src/acc/kit/checkers/streams/output-is-complete.ts
checker_status: planned
coverage: partial
coverage_gaps:
  - no checker exists so nothing about delivery is established
  - the blocker is the runner rather than the probe level because a pipe the runner creates cannot exhibit the defect at all
coverage_established:
  - nothing because no checker exists and no verdict is produced so there is no pass to license anything
---

# A command delivers every byte it wrote

## The rule

A command that writes to stdout **MUST** deliver every byte it wrote before the process
terminates.

A target whose stdout is **short** when its consumer is momentarily not reading — measured
against the same invocation redirected to a file — violates this rule, whatever exit code it
reports.

A CLI **MUST NOT** call `process.exit()`, `exit()`, `os.Exit()` or any equivalent on a path that
has written to a stream it has not drained. Terminating by returning from the entry point, or by
awaiting the flush, is the only form that is correct on every platform and every stream type.

## How to comply

**If you write to stdout from Node or Bun, do not call `process.exit()` afterwards.** That is the
runtime the [archaeology](../../../research/2026-08-15-defect-archaeology.md) measures, and there a
`process.exit(code)` placed immediately after a write discards whatever stdout has not yet handed
to the pipe. Set `process.exitCode` and return from the entry point instead: the repaired fixture
in that corpus delivers its whole **114,101** bytes through the pipe that truncated the defective
one at 65,536.

If an immediate exit is genuinely required, await the write callback first — `await new
Promise((r) => process.stdout.write(payload, r))` — so that what terminates the process runs after
the bytes are gone. The write call returning is not the bytes arriving.

**Other runtimes fail differently, and two of them do not fail at all** — measured across Go, Rust,
Python, Node and Bun, five runs each ([2026-08-19](../../../research/2026-08-19-flush-on-exit-by-runtime.md)).

| Runtime                                | Abrupt exit after a large write to a pipe                            |
| -------------------------------------- | -------------------------------------------------------------------- |
| Node, Bun                              | **truncated at one pipe buffer** — 65,536 of 524,288 bytes, exit `0` |
| Go `bufio`, Rust `BufWriter`           | **whole buffer lost**, to a file as readily as to a pipe             |
| Go unbuffered, Rust unbuffered, Python | nothing lost                                                         |

Only the first row is this rule's defect: pipe-specific, silent, a prefix rather than nothing. The
second is a buffering bug that a file redirect reproduces, so the probe here would not catch it and
neither would a reader following this page — flush your writer, and note that a write larger than
the free buffer space bypasses the buffer entirely, which is why a 512 KiB test can hide the
problem that a 100-byte test exposes.

**Python needs no remedy**, and this page previously implied it did. `sys.exit(0)` flushes at every
size measured, to pipes and files alike; only `os._exit(0)` loses buffered output, which is that
call's documented job. An explicit `flush()` before `sys.exit` has nothing behind it.

Where your runtime is not in that table, the check still transfers: compare the same invocation
redirected to a file against the same invocation piped to a momentarily non-draining consumer, and
trust the difference over any belief about your buffering.

**Pin the exit sites.** The corpus ended up pinning **37** of them with a test that enumerates
every `process.exit` in the tree, because one new call site reintroduces the whole class and
nothing else notices. A grep-based gate is unglamorous and it is what held.

**Gate it through a shell pipe with a sleeping consumer**, never through a language-level pipe. Use
the `sh -c "… | ( sleep 1; cat )"` construction, for exactly the reason
[the probe](#the-blocker-is-the-runner-not-the-probe-level) records: a pipe the test harness drains
is a pipe the defect cannot reach. A consumer that merely keeps reading is not enough: with the
defect present, **10 MB** through a plain `| cat` arrived complete, because every write finishes
when something is always reading.

**Assert termination in the same gate.** Removing `process.exit()` in bulk is what shipped the
23-minute hang described below; a drain gate that does not also require the process to exit swaps
one silent failure for another.

## Why

**This is the costliest defect class in the entire archaeology corpus** — six code fixes, four
gate commits, 9–10 entry-point sites plus five `tail` sites across eight tools, **37 exit sites
pinned** so the reading could not rot, and the only documented rework in either repository. It is
also the only class in that corpus that produced a false _rule_: a team published "our board is
too big to read" and worked under it for six messages.

The mechanism is small and the consequence is not. A write to a pipe is buffered by the kernel;
`process.exit()` runs immediately and discards whatever the runtime has not yet handed over. The
payload stops at **exactly 65,536 bytes** on Linux and macOS — one pipe buffer — and the exit code
is **`0`**.

Every property that normally makes a failure noticeable is absent:

- **the exit code is 0**, so nothing in any harness reacts;
- **the truncation point is invisible**, because a JSON document cut mid-string looks like a
  document until something tries to parse it;
- **it is intermittent by construction.** It depends on whether the consumer happened to be
  reading at the instant of exit, so it disappears under exactly the conditions a developer
  reproduces it in — and a fix verified through a fast consumer is a fix verified against nothing.

The repair has its own trap, and the corpus paid for it: removing `process.exit()` in bulk to fix
truncation shipped a **23-minute hang** in a shipped entry verb, which was ruled fix-forward
rather than reverted on the grounds that _a hang announces itself; truncation does not_. Whoever
implements this rule should read [G-family lifecycle work](../../../roadmap.md) alongside it.

## The probe

`L1`, and **not implemented** — `checker_status: planned` is what that field is for. What follows
is what the probe will send, and the measured reason no verdict exists today.

The probe compares the same invocation under two consumers:

```
<cli> <bulk-output-command> > file                    # the reference
<cli> <bulk-output-command> | ( sleep 1; cat ) | wc -c  # the discriminator
```

**Fails** when the second is short of the first. The consumer is **momentarily non-draining** on
purpose: what discriminates is whether bytes are undrained at the instant of exit, so a consumer
that keeps reading lets each write finish and a defective CLI arrives looking complete.

**`L1` rather than `L0`**, because the probe needs a command that produces bulk output and nothing
at [`L0`](../../concepts/probing.md#what-it-is) does — help and version are small and fixed. A real
payload means a real verb, which means a declaration of effects.

### The blocker is the runner, not the probe level

**No probe level fixes this on the current instrument**, and that is the reason this page ships
with no checker rather than with a weak one.

`acc`'s runner spawns its target with piped stdio and reads both streams continuously. A pipe
created that way is drained as fast as the target fills it, so it **cannot exhibit the defect at
all** — a checker built on the existing runner would report `pass` against the exact bug it was
written for.

Measured directly, against a fixture that is `conforming.ts` plus one `process.exit(0)` after the
write:

```
bun drained-conforming.ts list > file                    ->  195,837 bytes, exit 0
bun drained-conforming.ts list | ( sleep 1; cat ) | wc -c ->   65,536 bytes, exit 0
bun drained-conforming.ts list | cat | wc -c              ->   65,536 bytes, exit 0
acc's runner (Bun.spawn, stdout: "pipe")                  ->  195,837 bytes, parses whole
```

A shell pipe loses **67% of the payload**, and the cut lands mid-string — `…"title":"a bounty card
with a title long e` — so what arrives is unparseable rather than merely short. The runner's own
pipe receives the document **complete and parsing**, on every run. The verdict `acc check` gives
that fixture today, against the full 22-rule catalogue:

```
conformant: true    coreFailures: 0    coreUnverified: 0
```

**Read no assurance about delivery into a passing report.** Every applicable core rule passes on a
CLI that delivers a third of its answer, and will keep doing so until the runner can drive a
**deliberately non-draining consumer** — an instrument change, not a rule change and not a
probe-level change. Until that exists, this page is the specification and the honest declaration
that nothing enforces it.

## Current checker coverage

No checker. `checker_status: planned`, and `src/acc/kit/checkers/streams/output-is-complete.ts` is
the path it will occupy — declared now so the ratchet can count it as remaining work.

**Established**

- nothing because no checker exists and no verdict is produced so there is no pass to license
  anything

There is no pass to describe rather than a pass with a narrow scope, on the same terms as
[A4](../parsing/unexpected-positionals-rejected.md): a rule may declare its checker path before
the file exists, and the count of `planned` rules is the visible remaining work.

**Gaps**

- no checker exists so nothing about delivery is established
- the blocker is the runner rather than the probe level because a pipe the runner creates cannot
  exhibit the defect at all

## Evidence

The measurements in [the probe](#the-blocker-is-the-runner-not-the-probe-level) above were taken
in this repository, against a fixture derived from
[`conforming.ts`](../../../../src/acc/kit/fixtures/conforming.ts) by adding one `process.exit(0)`
after its write.

The defect population — six code fixes, four gate commits, 37 pinned exit sites, and the corpus's
only rework — is catalogued as class 1 in
[`research/2026-08-15-defect-archaeology.md`](../../../research/2026-08-15-defect-archaeology.md),
which ranks it the highest-cost missing rule and records the two probe-design traps above as
measurements rather than as advice.
