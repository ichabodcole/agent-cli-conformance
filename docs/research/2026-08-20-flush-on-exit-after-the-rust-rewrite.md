---
type: research
generated: { by: claude-opus-5, at: 2026-08-20 }
status: stable
description: Re-measured Bun's truncation-at-exit after the 1.4.0 Rust rewrite — the defect survives unchanged into a non-draining pipe, but a promptly draining consumer now receives two pipe buffers rather than one, so the retained byte count was never the constant the wiki called it.
tags: [streams, truncation, evidence]
---

# Flush on exit under Bun 1.4

**Research date:** 2026-08-20
**Question:** Bun 1.4.0 is [a rewrite of Bun in Rust](https://bun.com/blog/bun-v1.4). The
[2026-08-19 measurement](./2026-08-19-flush-on-exit-by-runtime.md) recorded Bun 1.3.14 losing
everything past one pipe buffer when `process.exit(0)` follows a large write to a pipe, and
[B4](../wiki/rules/streams/output-is-delivered-whole.md) states that result as present-tense fact.
A whole-runtime rewrite is exactly the event that invalidates a measured constant. Does the result
still hold?

**Method:** One minimal program — `process.stdout.write("x".repeat(524288))` followed immediately
by `process.exit(0)` — run through the same three consumers as the 2026-08-19 note, with the
delivered bytes counted and `${PIPESTATUS[0]}` capturing the writer's own exit status:

```
prog | ( sleep 1; cat ) | wc -c     # momentarily non-draining pipe
prog | cat | wc -c                  # promptly draining pipe
prog > out.bin ; wc -c < out.bin    # regular file
```

Five repetitions of each, driven from `/bin/bash` (3.2.57, Apple-shipped) — `zsh` was tried first
and abandoned because it does not populate `PIPESTATUS`, so the writer's exit status read as empty
rather than as `0`. Machine: Apple Silicon (`arm64`), macOS 26.5.2. Runtime: `bun 1.4.0`. Run in a
scratch directory outside the repository.

**Scope:** Bun only. Node, Go, Rust and Python were **not** re-run and their rows in the earlier
note are untouched by this one. One machine, one OS, one architecture, one payload size. The
boundary was not probed — this note establishes that the draining-consumer figure moved, not where
its new edge lies. Nothing here says whether the change is deliberate, a side effect of the
rewrite, or platform-specific.

**Confidence notation:** `[MEASURED]` — observed in this session, repeat count stated.
`[INFERRED]` — a mechanism proposed to explain a `[MEASURED]` result, not itself measured.

---

## 1. The result

`[MEASURED]`, 5/5 identical runs, exit `0` in every case:

| Consumer               | Bun 1.3.14 (2026-08-19) | Bun 1.4.0 (today) |
| ---------------------- | ----------------------- | ----------------- |
| non-draining pipe      | 65,536                  | **65,536**        |
| promptly draining pipe | 65,536                  | **131,072**       |
| regular file           | 524,288                 | **524,288**       |

**The defect is intact.** A 512 KiB write followed by `process.exit(0)` still loses three quarters
of its payload into a pipe and still reports success, so every normative clause in B4 stands and
nothing in the catalogue changes.

**The number moved.** The promptly draining consumer now receives 131,072 bytes — exactly two pipe
buffers — where 1.3.14 delivered one.

## 2. What that costs the wiki

B4 says the payload "stops at **exactly 65,536 bytes** on Linux and macOS — one pipe buffer".
That reading is now wrong in the draining case, and it was over-specified before it was wrong:
65,536 was one runtime's behaviour under one consumer, restated as a property of pipes.

`[INFERRED]` The mechanism the earlier note gives already predicts a consumer-dependent figure.
What survives is what the kernel accepted before the process exited; a consumer that has already
drained the first buffer lets the kernel accept a second. On that reading 1.3.14's draining result
is the surprising one and 1.4.0's is the expected one, but this note measured neither runtime's
scheduling and does not claim to know which changed.

The invariant worth stating in a rule is the one that held across both versions and all three
consumers: **bytes are lost, the loss is silent, and the exit code is `0`.** A byte count belongs
in a dated measurement like this one, attached to the runtime version that produced it.

## 3. Why this was worth an hour

The 2026-08-19 note is correctly scoped — it names `bun 1.3.14` in its environment section and
labels its table row with the version. It did not rot. The wiki page citing it did, by lifting a
versioned measurement into an unversioned claim.

That is the failure mode this corpus exists to prevent, occurring in the direction the folder
contract does not guard: research is frozen and dated by rule, and the wiki is maintained by rule,
but nothing re-checks a wiki claim when the thing it measured changes underneath it. The trigger
here was a developer upgrading a runtime and mentioning it.
