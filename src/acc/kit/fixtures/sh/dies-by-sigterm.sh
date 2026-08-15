#!/bin/sh
# THE SCOPE CONTROL for G1's signal split. One line, exactly like `dies-by-signal.sh` next door,
# with `TERM` where that one has `SEGV` — and that single word is the whole difference between a
# violation and an evidence gap.
#
# `SIGSEGV` is fault-like: the process raised it on itself as a direct consequence of what it just
# executed, nothing outside sends it in normal operation, and a tool that segfaults answering
# `--help` did that to itself. `SIGTERM` is not. An operator's `kill`, an outer deadline, a
# supervisor shutting a job down and a target killing itself produce the SAME recording — the kit
# knows only that the signal was not its own (`Observation.crashed`), never who sent it.
#
# So this fixture is byte-for-byte what an interrupted run of a PERFECTLY CONFORMANT tool looks
# like, and G1 failing it would be a false violation in a conformance gate. The first thing a
# maintainer does with a gate that reports failures it cannot substantiate is switch the gate off,
# which is the argument the catalogue already makes about rules applied to the wrong archetype
# (docs/roadmap.md step 5). G1 reports `unverified` here instead.
#
# It is a control in BOTH directions, which is why it is permanent:
#
#   - if G1 ever goes back to failing every signal the kit did not send, this goes red;
#   - if `crashedUnverified` were ever narrowed to the fault signals — "G1 doesn't fail SIGTERM,
#     so why should anyone else care" — every other rule would start reporting `pass` over probes
#     that died before establishing anything, and the assertion that NO rule passes here is what
#     catches it. The two questions are different: G1 asks whose fault, everyone else asks what
#     the probe established, and the answer to the second is "nothing" whoever sent the signal.
#
# POSIX shell rather than a `.ts` fixture for the same reason as its siblings: under bun a signal
# becomes a chosen exit status and a crash report on stderr, which is a different observation
# entirely (see `dies-by-signal.sh`).
kill -TERM $$
