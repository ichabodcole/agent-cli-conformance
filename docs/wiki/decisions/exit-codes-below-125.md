---
type: decision
title: Exit codes stay below 125
description:
  Reserving the band POSIX and the delegators already use, rather than inventing a new one,
  keeps our domain codes clear of the shell's — on POSIX, and not without residue.
tags: [exit-codes, delegation, contract, posix]
related: [concept/exit-codes, rule/unknown-flag-exits-nonzero]
status: current
updated: 2026-08-15
---

# Exit codes stay below 125

## Context

**Platform scope: POSIX shells.** This taxonomy targets systems where a process's termination
status is the low 8 bits of an integer, `0`–`255`, and where the shell reports it as `$?`.
Windows is deliberately out of scope: `GetExitCodeProcess` hands back a `DWORD` — a full 32-bit
value — so neither the `0`–`255` range nor the `128+n` signal convention transfers, and a
"reserved band above 125" means nothing there. A CLI targeting both should use the numbers
below and expect the band argument to buy it nothing on Windows.

A CLI that runs another program has a collision problem. If `mytool` uses `5` to mean "not
found", and it execs a child that also exits `5` for its own unrelated reason, the caller
cannot tell which one failed. This is not hypothetical — it is the
[thin-delegator archetype](../concepts/exit-codes.md#the-taxonomy), and it applies to any
wrapper, launcher, or tool that shells out.

Three models were considered.

**A fixed small taxonomy.** Allocate a handful of low codes by meaning. Simple and memorable;
says nothing about delegation.

**Kubernetes KEP-2551.** Reserve `1–200` for exec'd commands, put the tool's own errors at
`201–217`, and map any child code `≥201` to `255`.

**Declare per tool.** Each CLI publishes its own mapping in its schema and no numbers are
shared. Maximally flexible; gives an agent nothing transferable between tools.

## Decision

Our codes occupy **`0`–`9`**: `0`–`8` for [errors](../concepts/exit-codes.md#the-taxonomy) and
`9` for the first [outcome](../concepts/exit-codes.md#outcomes-are-not-errors) (`acc check` ran
and the target does not conform). Everything from **`125` upward is reserved and never
allocated**.

Two different kinds of authority sit in that reserved band, and conflating them is how the
portability claim on this page came to be overstated. They are separated here deliberately.

**Reserved by POSIX**, for any conforming shell:

```
126    the command was found but could not be executed
127    the command was not found
>128   the command was terminated by a signal
```

POSIX says only "greater than 128" for a signal death. The exact `128+n` spelling — `143` for
SIGTERM, `137` for SIGKILL — is a widespread convention implemented by bash, dash, zsh and
their peers, not a standardised guarantee. It is safe to _read_ a status above `128` as "the
process was signalled"; it is not portable to compute `n` from it and expect every shell to
agree.

**Adopted by particular delegators**, and by us:

```
124    `timeout` — the time limit was reached
125    the wrapper itself failed
```

Both come from `timeout` (POSIX Issue 8 and GNU coreutils), where `125` means "an error other
than [126 or 127] occurred", and Docker uses `125` the same way for `docker run` itself
failing. No shell assigns `125` any meaning. It is a strong convention among the tools that
delegate, which is exactly the population that matters here — but it is a convention, not a
standard, and this page previously described it as "understood by every shell, CI runner and
process supervisor", which is false.

A delegating CLI **passes the child's exit code through verbatim** and uses `125` when the
wrapper itself failed before or around the child.

The mapping is additionally **declared in the schema**, so it is machine-discoverable. A kit
that could read that declaration would be able to verify each declared error kind produces its
declared code — _planned_, not built: no checker reads a target's schema today, and doing so
waits on a portable declaration format
([roadmap step 6](../../roadmap.md#6-r4-7--the-portable-declaration-ir)). See
[how a caller learns what a code means](../concepts/exit-codes.md#how-a-caller-learns-what-a-code-means).

The three models are not alternatives: "declare per tool" is a _delivery_ mechanism, while
the other two are _allocation_ policies. We adopt a fixed taxonomy, a reserved band, and
schema declaration together.

## Rationale

**Most of the reservation already exists.** `126`, `127` and "greater than 128" are POSIX, so
every conforming shell already implements them; `124`/`125` are `timeout`'s and Docker's, which
is the convention delegators already reach for. Verified locally on this machine (macOS,
`/bin/sh`): `exit 42` propagates as `42`, a missing binary yields `127`, a file without the
exec bit yields `126`, and SIGTERM yields `143`. KEP-2551's `201+` band is a new convention
that nothing else recognises; ours is assembled from ones callers already meet.

**Verbatim passthrough beats remapping.** KEP-2551 collapses any child code `≥201` to `255`,
discarding which code it actually was. Keeping our own codes below `125` means _our_ domain
codes never collide with the shell band, so no remapping is needed and no information is lost.

**It does not eliminate wrapper-versus-child ambiguity, and this page used to claim it did.**
Verbatim passthrough still collides when the child itself exits `125`, `126` or `127` — a
wrapper around `docker` or `timeout` will meet exactly that — and the caller cannot then tell
the wrapper's own failure from the child's report of the same number. What staying below `125`
actually buys is narrower and still worth having: `mytool`'s `not_found` can never be mistaken
for the shell's `command not found`, because `5` and `127` are different numbers.

Where a wrapper must disambiguate, the exit code alone cannot do it: something outside the 8
bits has to carry the attribution. The natural place is the structured envelope — report the
child's own exit code as a field alongside the passthrough status, so a caller reading the
envelope can tell "I failed with 125" from "the child returned 125". That costs a machine-mode
read and only helps a caller that performs one, which is why it is a mitigation rather than a
solution.

**Nine codes, not seventeen.** KEP-2551 mirrors HTTP statuses roughly 1:1, but most collapse
to the same caller behaviour — `not found` and `entity too large` both mean "do not retry, fix
the request". Grouping by _what the caller should do_ is what lets nine codes cover the same
ground.

**One objection does not hold.** Signal deaths were checked against the `201+` band and do not
reach it — under the `128+n` convention, and with the 31 signals this system defines, signal
exits occupy `129`–`159`. KEP-2551 has no collision problem; it is simply a novel convention
where an established one exists.

**KEP-2551's own history is the strongest evidence.** It has been alpha-gated behind
`KUBECTL_ERROR_CODES` since 2022. Not because the design is unsound, but because retrofitting
exit codes onto a tool with existing consumers is nearly impossible. This decision is cheap
now and unaffordable later, which is why it belongs in the scaffold rather than a migration
guide.

## Consequences

- We have **115 unallocated codes** (`10`–`124`) for future error kinds and outcomes. Ample.
  (`9` was unallocated when this decision was written and now carries `NonConformant`, which is
  why the count is one lower than it first read.)
- Delegating CLIs need no code-translation layer, and their conformance check is simply
  "child's code, verbatim".
- **A wrapper cannot distinguish its own `125`, `126` or `127` from a child returning the
  same.** That ambiguity is inherent to verbatim passthrough and survives this decision; see
  the rationale for the envelope-side mitigation.
- We are **committed**: `rule_id` values and exit codes are both append-only. A code's meaning
  may never change once published — see
  [exit codes are append-only](../concepts/exit-codes.md#exit-codes-are-append-only).
- Tools that need to distinguish more than nine failure classes express that through the
  error envelope's `kind` field, which is unbounded, rather than by allocating more codes.

## What would change our mind

- **An actual standard emerges.** If a widely-adopted spec fixes different numbers, matching
  it beats being locally coherent — an agent that knows one convention everywhere is worth
  more than one that knows ours.
- **Nine codes prove insufficient in practice.** If real tools routinely need a tenth and
  tenth-plus class, and the envelope's `kind` field is not carrying that weight, revisit the
  grouping — not the band.
- **A delegating tool needs to distinguish its own failure from a child's beyond `125`.** If
  "the wrapper failed" turns out to need sub-classification, we would need a second signal,
  probably in the envelope rather than the code.
- **The residual `125`/`126`/`127` collision bites in practice.** If wrappers around delegators
  turn out to hit it often enough that reading the envelope is not a sufficient answer, the
  passthrough discipline itself needs revisiting — not the band.

## Sources

Primary, for the reserved band:

- [POSIX Shell Command Language, "Exit Status for Commands"](https://pubs.opengroup.org/onlinepubs/9699919799/utilities/V3_chap02.html)
  — "If a command is not found, the exit status shall be 127. If the command name is found, but
  it is not an executable utility, the exit status shall be 126."; "The exit status of a command
  that terminated because it received a signal shall be reported as greater than 128."
- [POSIX `timeout`](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/timeout.html) —
  `124` time limit reached; `125` "An error other than the two described below occurred"; `126`
  found but not executable; `127` not found.
- [GNU Coreutils `timeout`](https://www.gnu.org/software/coreutils/manual/html_node/timeout-invocation.html)
  — the same allocation in the implementation most callers actually have.
- [`GetExitCodeProcess`](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-getexitcodeprocess)
  — Windows returns termination status through an `LPDWORD`, which is why the platform scope
  above says POSIX.

Supporting:

- [`research/01-case-studies.md`](../../../research/01-case-studies.md) — measured exit-code
  behaviour across `git`, `docker`, `kubectl`, `gh`, `cargo`
- [KEP-2551](https://github.com/kubernetes/enhancements/tree/master/keps/sig-cli/2551-return-code-normalization)
- `sysexits.h` — the 1987 BSD attempt, `EX_USAGE=64` … `EX_CONFIG=78`
