---
type: research
generated: { by: claude-opus-5, at: 2026-08-26 }
status: stable
description:
  Whether the capture harness's JSON string encoder emits identical bytes under BWK awk, mawk,
  gawk and busybox awk — the last two being the defaults on Debian and Alpine. Measured on macOS
  and in Linux containers by an outside adopter, each run compared against the target's own
  output, on 2-, 3- and 4-byte UTF-8.
tags: [evidence, portability, encoding, adoption, tooling]
---

# The harness byte encoder, across four awk implementations

## Notation

Each claim below carries one of three labels, because they are known to different depths:

- **[ADOPTER]** — run by an outside adopter on their own machines and reported to this project on
  2026-08-26. **Nobody here observed the run.** The method is recorded well enough to repeat, and
  it has not been repeated here.
- **[HERE]** — run on a maintainer machine, macOS 15, and observed directly.
- **[UNVERIFIED]** — established by neither, and stated because leaving it out would imply it was
  covered.

## The question

`acc`, this project's conformance kit, has a command that emits a shell script — the **harness** —
which runs a target CLI once per **command path** (a subcommand to probe, such as `state` or
`send note`; not a filesystem path), captures both output streams, and writes them into a JSON
document. Capturing bytes exactly is the whole point of that document: the kit reads a tool's error
text looking for the set of flags it names, and a capture that altered a byte would be evidence
about the capture rather than about the tool.

The harness turns raw bytes into a JSON string with `od -v -An -tu1` piped into an `awk` program,
which walks the byte values and emits either an escape or the byte itself. The line that matters:

```awk
else              printf "%c", c
```

**`printf "%c", n` for `n >= 128` is the classic divergence between awk implementations.** Some
treat the number as a character in the current locale and emit a multi-byte sequence for it; some
emit the single byte. The harness exports `LC_ALL=C` before anything else, which should force the
byte reading everywhere. That expectation was untested outside macOS: every capture either the
adopter or this project had produced ran under one awk.

**mawk is `/usr/bin/awk` on Debian and busybox awk is `/bin/awk` on Alpine**, so the untested
implementations are the ones most adopters actually run.

## What was measured

**[ADOPTER]** A target was written that rejects an unknown flag with a message carrying UTF-8 at
three widths. Its non-ASCII portion:

    — café ☕ 🜁 naïve

    2-byte:  c3 a9 (é), c3 af (ï)
    3-byte:  e2 80 94 (—), e2 98 95 (☕)
    4-byte:  f0 9f 9c 81 (🜁)

**Method:** the harness was generated once, on macOS, with
`acc probe-plan <target> --paths <command-path-list> --out capture.sh`. It was then run inside each
container **without editing it** — the harness holds an absolute path to the target, so the target
was mounted at that path rather than the harness being changed. The `stderr` field of the JSON
document the harness writes was compared against a **live capture**: the same invocation run
directly in the same container, with its output taken outside the harness. The live capture is the
reference, and the containers were never compared to each other. Only the awk implementation varied
between runs. This describes the run that produced the results below; a first attempt was
discarded, for the reason in the next section.

| Platform | awk                           | Identical to that container's live capture | Captured stderr |
| -------- | ----------------------------- | ------------------------------------------ | --------------- |
| macOS    | BWK awk 20200816              | yes                                        | 63 bytes        |
| Debian   | mawk 1.3.4 20250131           | yes                                        | 63 bytes        |
| Alpine   | busybox awk                   | yes                                        | 63 bytes        |
| Debian   | gawk, via update-alternatives | yes                                        | 63 bytes        |

All five non-ASCII characters round-tripped on all four: `é ï — ☕ 🜁`.

**[UNVERIFIED]** The full 63-byte line was not recorded — only the non-ASCII portion shown above,
which is 25 bytes of it. The rest is the message's ASCII text, and this note cannot say what it
was.

**[UNVERIFIED]** The exact gawk and busybox awk versions were not recorded, only the distribution
and the selection method. A divergence later traced to a version boundary could not be checked
against this note without re-running the measurement.

## What the comparison was against

**[ADOPTER]** A first attempt reported all three Linux awks failing, with differing byte counts and
no non-ASCII at all — the divergence the experiment was looking for, on the first try. It was
wrong.

The captured bytes read:

    eval: /private/tmp/awktest/toy.sh: not found

The adopter had edited a `LAUNCHER=` assignment in the harness to point at the container's path.
The edit did nothing, because the harness invokes the target through a shell **function** rather
than through that variable. The harness therefore ran with the macOS path still in it, the target
was not present at that path, and **it captured that failure exactly as designed** — verbatim,
marked as a complete capture, in a document the kit accepts. Three containers produced three
identical, entirely truthful, entirely irrelevant results.

**Comparing the containers to each other would have shown perfect agreement and established
nothing.** Only comparing against a live capture of the target made the mismatch visible. The
second attempt edited nothing and mounted the target where the harness expected it.

The general form: **agreement between runs that share a fault is not evidence.** A platform matrix
multiplies the runs that can share one.

## A second finding, on POSIX printf

**[HERE]** `\x` hex escapes are not POSIX `printf`. Under macOS `/bin/sh` they are interpreted;
under `dash`, which is `/bin/sh` on most Linux distributions, they are emitted as literal text:

```
/bin/sh -c "printf 'caf\xc3\xa9\n'"   ->  63 61 66 c3 a9 0a
dash     -c "printf 'caf\xc3\xa9\n'"  ->  63 61 66 5c 78 63 33 5c 78 61 39 0a
```

The same defect produced a false negative in this project's own test suite: a fixture meant to feed
multi-byte bytes to the encoder emitted the characters `\`, `x`, `c`, `3` instead, so on Linux CI
the encoder was never given the input the test exists to give it. That test's round-trip assertion
still passed, because the live capture and the recorded capture were equally wrong.

A fixture that generates shell should pass the bytes literally through `printf '%s\n'`, which
leaves no escape for any shell to interpret.

## Scope — what was deliberately not looked at

- **Windows, and any non-POSIX shell.** The harness is `sh` and has never run outside macOS and
  Linux.
- **Locales other than `C`.** The harness sets `LC_ALL=C` itself; no run tested what happens when
  something in the environment defeats that.
- **Non-UTF-8 byte sequences.** Every run above used valid UTF-8. Invalid sequences and lone bytes
  above `0x7f` are covered by a separate test in this project's suite, over all 256 byte values, on
  macOS and under one awk only.
- **`od` implementations.** Only the awk half varied. `od -v -An -tu1` is portable in principle and
  was not measured across platforms.
- **Captures larger than 63 bytes.**
- **Concurrent runs** of one harness writing one output path.

## What this establishes, and what it does not

**It establishes** that the encoder emits identical bytes under BWK awk, mawk, gawk and busybox
awk, for 2-, 3- and 4-byte UTF-8, with the harness's own `LC_ALL=C` in force — on one message, of
63 bytes, on one day.

**It does not establish** that no awk anywhere diverges. And it is not a regression check: nothing
in this project's test suite varies the awk implementation, so no automated check would catch a
regression in the encoder. A future edit is measured against this note only if a reader finds it.
