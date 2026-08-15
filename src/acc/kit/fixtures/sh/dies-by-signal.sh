#!/bin/sh
# NEGATIVE CONTROL for the third catalogue-wide invariant: a target that CRASHES.
#
# Its entire body is one line, and that is the point — it starts, so it is not `spawnFailed`; it
# terminates, so it is not a hang; it writes nothing and reaches no ceiling, so it is not
# truncated. Every flag the kit had before `Observation.crashed` says this ran fine.
#
# What the runner sees is `exitCode: null` with `signal: "SIGSEGV"`, and null is precisely the
# value the deadline and the output ceiling also produce. Before the signal was recorded, this
# fixture scored NINE passing rules through `record()` + `buildReport()` at L0 — A2, A6, B1, B2,
# C3, D2, D4, E1, F1 — with details like "root verb rejected with exit null" and "all 4 inert
# invocation(s) terminated". It earned none of them: `null !== 0` satisfies every "exited
# non-zero" clause and an empty stream satisfies every "stdout was empty" clause, which is the
# same hole `spawnFailed` closed one step earlier in the lifecycle.
#
# WHY POSIX SHELL, not a `.ts` fixture like the rest of `broken/`. Bun installs its own SIGSEGV
# handler: `process.kill(process.pid, "SIGSEGV")` under bun prints an 800-byte crash report to
# stderr and exits 133 as an ORDINARY exit — a chosen status and a non-empty stream, which is a
# different observation entirely and would not exercise this invariant at all. `sh` dies the way
# a real binary dies (`kill` is a POSIX shell builtin, so no coreutils dependency), and this
# directory already holds A6's controls for the same class of reason: the fixture has to be able
# to produce the recording the assertion is about.
#
# SIGSEGV rather than SIGTERM or SIGINT deliberately. Those two are what an outer deadline or a
# Ctrl-C sends, and the lifecycle rules that will one day judge them (docs/roadmap.md, step 7)
# want a target that handles them gracefully. SIGSEGV is unambiguously the target falling over.
kill -SEGV $$
