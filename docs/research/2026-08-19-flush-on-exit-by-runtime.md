---
type: research
generated: { by: claude-opus-5, at: 2026-08-19 }
status: stable
description: Measured, per runtime, how much of a 512 KiB stdout write survives an immediate abrupt exit into a pipe — Node and Bun lose everything past one pipe buffer, unflushed userspace buffers lose everything everywhere, and Python's sys.exit flushes correctly.
tags: [streams, truncation, evidence]
---

# Flush on exit, by runtime

**Research date:** 2026-08-19
**Question:** Rule B4 says output can be truncated when a process exits immediately after writing
to a pipe. Which runtimes actually lose bytes, under which exit call, and does the loss depend on
the destination being a pipe? The wiki previously advised `writer.Flush()` before `os.Exit` in Go
and an explicit `flush()` in Python without citing anything. This report is the measurement.

**Method:** Eleven minimal programs, one per runtime/buffering combination, each writing a payload
of `x` bytes to stdout and then calling that runtime's abrupt exit — Go `os.Exit(0)`, Rust
`std::process::exit(0)`, Python `sys.exit(0)` and `os._exit(0)`, Node and Bun `process.exit(0)`.
Payload 524288 bytes (512 KiB) for the primary matrix, 100 bytes for a secondary matrix probing
the small-write case, and 65536 / 65537 / 131072 bytes for a Node boundary probe. Each program was
run through three consumers and the delivered bytes counted:

```
prog | ( sleep 1; cat ) | wc -c     # momentarily non-draining pipe
prog | cat | wc -c                  # promptly draining pipe
prog > out.bin ; wc -c < out.bin    # regular file
```

The exit status of `prog` itself was captured via bash `${PIPESTATUS[0]}`. Every measurement in the
512 KiB matrix was repeated **5 times**; the 100-byte matrix and the boundary probe **3 times**
each. Runner: `bash` (`/bin/bash` 3.2.57, Apple-shipped), driving each case in a loop.

Machine: Apple Silicon (`arm64`), macOS 26.5.2 (build 25F84). Runtime versions:
`go1.26.5 darwin/arm64`; `rustc 1.96.0 (ac68faa20 2026-05-25)` invoked as `rustc -O`;
`Python 3.12.11` (pyenv shim); `node v24.18.0`; `bun 1.3.14`. All programs were built and run in
`/tmp/flushexit`, outside the repository, and deleted afterwards; the sources are reproduced in
full in §5 so the measurement can be rebuilt from this document alone.

**Scope:** One machine, one OS, one architecture, one shell. These are measurements, not portable
guarantees — pipe capacity in particular is a kernel constant that differs between macOS and Linux
and between kernel versions, and every Node/Bun number here is a function of it. Not tested: Linux
or Windows; stderr; a tty destination; sockets; `SIGPIPE` behaviour when the consumer dies early
(that is a different failure than truncation-at-exit); concurrent writers; Go's `os.Stdout` under
`GOMAXPROCS=1`; Python's `print()`/text-layer path as distinct from `sys.stdout.buffer`; Rust's
`println!`/`LineWriter` default stdout lock; runtimes not installed here (Deno, Ruby, Java, .NET);
and any payload between 100 bytes and 64 KiB other than the Node boundary probe.

**Confidence notation:** `[MEASURED]` — observed in this session, repeat count stated.
`[INFERRED]` — a mechanism proposed to explain a `[MEASURED]` result, not itself measured.

---

## 1. The short answer

Three distinct failures hide behind "output gets truncated at exit", and they are not the same bug:

1. **Async-write truncation (Node, Bun).** `process.stdout` to a pipe is asynchronous. `process.exit`
   does not wait for it. The consumer receives exactly what the kernel already accepted — one pipe
   buffer, 65536 bytes — and the process still exits 0. **Only pipes are affected**; the same
   program redirected to a file delivers every byte. This is B4 exactly. `[MEASURED]`
2. **Unflushed-buffer loss (Go `bufio`, Rust `BufWriter`).** Bytes sitting in a userspace buffer at
   `os.Exit` / `std::process::exit` are lost. This is **not** a pipe phenomenon — the file case loses
   them too, and loses _all_ of them. Calling it truncation understates it: the output is not a
   prefix, it is empty. `[MEASURED]`
3. **No loss at all (Python, and Go/Rust writing unbuffered).** A blocking `write(2)` on the exit
   path does not return until the kernel has taken the bytes, so there is nothing left to lose.
   `[MEASURED]`

**Python `sys.exit(0)` flushes correctly, at both payload sizes, to pipes and to files.** The wiki's
implied claim that an explicit `flush()` is needed before `sys.exit` is **refuted** for CPython
3.12.11 on this machine. Only `os._exit(0)` loses buffered Python output — which is what `os._exit`
is documented to do, and is not the case B4 describes.

**The Go claim is confirmed, but not for the reason usually given.** `bufio.NewWriter` + `os.Exit`
does lose output — all of it. But it loses it to a file as readily as to a pipe, so it is a
buffering bug, not an exit-race. Go's _unbuffered_ `os.Stdout.Write` followed by `os.Exit(0)` loses
nothing, in 5 of 5 runs, to a stalled pipe.

## 2. Results — 512 KiB payload (expected 524288 bytes)

Every row was run 5 times. **No row varied across its runs**; the numbers below are the value seen
on all five. Every run exited 0 — no runtime signalled the loss.

| Runtime        | Buffering / exit call                       | Slow pipe | Fast pipe | File   | Exit |
| -------------- | ------------------------------------------- | --------- | --------- | ------ | ---- |
| Go 1.26.5      | `os.Stdout.Write`, `os.Exit(0)`             | 524288    | 524288    | 524288 | 0    |
| Go 1.26.5      | `bufio.NewWriter` (4096), `os.Exit(0)`      | 524288    | 524288    | 524288 | 0    |
| Go 1.26.5      | `bufio.NewWriterSize` (1 MiB), `os.Exit(0)` | **0**     | **0**     | **0**  | 0    |
| Rust 1.96.0    | `stdout().write_all`, `process::exit(0)`    | 524288    | 524288    | 524288 | 0    |
| Rust 1.96.0    | `BufWriter` (1 MiB), `process::exit(0)`     | **0**     | **0**     | **0**  | 0    |
| Python 3.12.11 | default buffering, `sys.exit(0)`            | 524288    | 524288    | 524288 | 0    |
| Python 3.12.11 | `-u`, `sys.exit(0)`                         | 524288    | 524288    | 524288 | 0    |
| Python 3.12.11 | default buffering, `os._exit(0)`            | 524288    | 524288    | 524288 | 0    |
| Python 3.12.11 | `-u`, `os._exit(0)`                         | 524288    | 524288    | 524288 | 0    |
| Node 24.18.0   | `process.stdout.write`, `process.exit(0)`   | **65536** | **65536** | 524288 | 0    |
| Bun 1.3.14     | `process.stdout.write`, `process.exit(0)`   | **65536** | **65536** | 524288 | 0    |

Two results deserve emphasis because they are counter-intuitive:

- **The Go 4096-byte `bufio` row does not lose anything.** `bufio.Writer` bypasses its own buffer for
  a single write larger than the buffer's free space, handing it straight to the underlying writer.
  A default-sized `bufio.NewWriter` therefore _appears_ safe under a large write and is not safe at
  all — see §3, where the same construction loses 100 bytes. `[MEASURED]` result, `[INFERRED]`
  mechanism. Rust's `BufWriter` has the same passthrough, which is why the Rust buffered case was
  measured at 1 MiB capacity to keep the payload genuinely in the buffer.
- **Node and Bun lose data even to a _promptly draining_ `| cat`.** This is not a race that a fast
  consumer wins. `process.exit` runs before the event loop can flush the queued write, so the
  consumer gets whatever the kernel accepted on the synchronous first attempt and nothing more.
  `[MEASURED]` result, `[INFERRED]` mechanism.

## 3. Results — 100-byte payload (expected 100 bytes)

Run 3 times each; no row varied. This matrix isolates the buffering behaviour that the large
payload hides.

| Runtime        | Buffering / exit call                     | Slow pipe | File  | Exit |
| -------------- | ----------------------------------------- | --------- | ----- | ---- |
| Go 1.26.5      | `os.Stdout.Write`, `os.Exit(0)`           | 100       | 100   | 0    |
| Go 1.26.5      | `bufio.NewWriter` (4096), `os.Exit(0)`    | **0**     | **0** | 0    |
| Rust 1.96.0    | `BufWriter` (1 MiB), `process::exit(0)`   | **0**     | **0** | 0    |
| Python 3.12.11 | default buffering, `sys.exit(0)`          | 100       | 100   | 0    |
| Python 3.12.11 | default buffering, `os._exit(0)`          | **0**     | **0** | 0    |
| Python 3.12.11 | `-u`, `os._exit(0)`                       | 100       | 100   | 0    |
| Node 24.18.0   | `process.stdout.write`, `process.exit(0)` | 100       | 100   | 0    |
| Bun 1.3.14     | `process.stdout.write`, `process.exit(0)` | 100       | 100   | 0    |

The 100-byte matrix reverses two of the large-payload verdicts and confirms the mechanisms:

- Go's default `bufio.NewWriter` now loses **everything**. The 512 KiB run's clean result was an
  artefact of passthrough, not of safety.
- Python's `os._exit(0)` now loses everything, and `-u` fixes it. At 512 KiB the write was larger
  than CPython's `BufferedWriter` buffer and went straight to the fd, so `os._exit` had nothing left
  to drop. `[INFERRED]`
- Node and Bun are clean at 100 bytes, because 100 bytes fits in the kernel's pipe buffer and is
  taken on the first synchronous attempt. Their failure is _size_-dependent, not exit-call-dependent.

## 4. The Node boundary probe

Delivered bytes to a stalled pipe, by payload, 3 runs each, `node v24.18.0`:

| Payload | Delivered (all 3 runs) |
| ------- | ---------------------- |
| 65536   | 65536                  |
| 65537   | 65536                  |
| 131072  | 65536                  |

Delivery saturates at exactly 65536 bytes — one macOS pipe buffer. Everything a single
`process.stdout.write` cannot hand to the kernel synchronously is discarded by `process.exit`. The
consumer sees a clean prefix and a zero exit status, which is precisely the silent-truncation shape
B4 names. `[MEASURED]`

## 5. Transcripts

### 5.1 Environment

```
$ go version && python3 --version && rustc --version && node --version && bun --version
go version go1.26.5 darwin/arm64
Python 3.12.11
rustc 1.96.0 (ac68faa20 2026-05-25)
v24.18.0
1.3.14

$ sw_vers && uname -m
ProductName:		macOS
ProductVersion:		26.5.2
BuildVersion:		25F84
arm64
```

### 5.2 Programs (512 KiB variants; the 100-byte variants differ only in the payload length)

```go
// go_unbuf.go
package main

import "os"

func main() {
	buf := make([]byte, 512*1024)
	for i := range buf {
		buf[i] = 'x'
	}
	os.Stdout.Write(buf)
	os.Exit(0)
}
```

```go
// go_buf.go — bufio.NewWriter, default 4096 buffer, no Flush
package main

import (
	"bufio"
	"os"
)

func main() {
	buf := make([]byte, 512*1024)
	for i := range buf {
		buf[i] = 'x'
	}
	w := bufio.NewWriter(os.Stdout)
	w.Write(buf)
	os.Exit(0)
}
```

```go
// go_bufbig.go — same, with a 1 MiB buffer so the payload genuinely sits in it
	w := bufio.NewWriterSize(os.Stdout, 1<<20)
	w.Write(buf)
	os.Exit(0)
```

```rust
// rs_unbuf.rs
use std::io::Write;
fn main() {
    let buf = vec![b'x'; 512 * 1024];
    std::io::stdout().write_all(&buf).unwrap();
    std::process::exit(0);
}
```

```rust
// rs_buf.rs
use std::io::{BufWriter, Write};
fn main() {
    let buf = vec![b'x'; 512 * 1024];
    let mut w = BufWriter::with_capacity(1 << 20, std::io::stdout());
    w.write_all(&buf).unwrap();
    std::process::exit(0);
}
```

```python
# py_sysexit.py
import sys
sys.stdout.buffer.write(b'x' * (512 * 1024))
sys.exit(0)
```

```python
# py_osexit.py
import sys, os
sys.stdout.buffer.write(b'x' * (512 * 1024))
os._exit(0)
```

```javascript
// js_exit.js — run under both node and bun
process.stdout.write('x'.repeat(512 * 1024));
process.exit(0);
```

### 5.3 Runner

```bash
#!/bin/bash
EXPECT=524288
run_case() {
  local label="$1"; shift
  local -a cmd=("$@")
  for i in 1 2 3 4 5; do
    n=$("${cmd[@]}" | ( sleep 1; cat ) | wc -c); rc=${PIPESTATUS[0]}
    n=$(echo $n)
    m=$("${cmd[@]}" | cat | wc -c); rc2=${PIPESTATUS[0]}
    m=$(echo $m)
    "${cmd[@]}" > out.bin; rc3=$?
    f=$(wc -c < out.bin); f=$(echo $f)
    printf '%-22s run%d  slowpipe=%-7s(rc=%d)  fastpipe=%-7s(rc=%d)  file=%-7s(rc=%d)  expected=%d\n' \
      "$label" "$i" "$n" "$rc" "$m" "$rc2" "$f" "$rc3" "$EXPECT"
  done
}
run_case go-unbuffered            ./bin/go_unbuf
run_case go-bufio-4096            ./bin/go_buf
run_case go-bufio-1MiB            ./bin/go_bufbig
run_case rust-unbuffered          ./bin/rs_unbuf
run_case rust-bufwriter-1MiB      ./bin/rs_buf
run_case py-sys.exit              python3 py_sysexit.py
run_case py-sys.exit-u            python3 -u py_sysexit.py
run_case py-os._exit              python3 py_osexit.py
run_case py-os._exit-u            python3 -u py_osexit.py
run_case node-process.exit        node js_exit.js
run_case bun-process.exit         bun js_exit.js
```

### 5.4 Output — 512 KiB matrix, 5 runs each

```
go-unbuffered          run1  slowpipe=524288 (rc=0)  fastpipe=524288 (rc=0)  file=524288 (rc=0)  expected=524288
go-unbuffered          run2  slowpipe=524288 (rc=0)  fastpipe=524288 (rc=0)  file=524288 (rc=0)  expected=524288
go-unbuffered          run3  slowpipe=524288 (rc=0)  fastpipe=524288 (rc=0)  file=524288 (rc=0)  expected=524288
go-unbuffered          run4  slowpipe=524288 (rc=0)  fastpipe=524288 (rc=0)  file=524288 (rc=0)  expected=524288
go-unbuffered          run5  slowpipe=524288 (rc=0)  fastpipe=524288 (rc=0)  file=524288 (rc=0)  expected=524288
go-bufio-4096          run1  slowpipe=524288 (rc=0)  fastpipe=524288 (rc=0)  file=524288 (rc=0)  expected=524288
go-bufio-4096          run2  slowpipe=524288 (rc=0)  fastpipe=524288 (rc=0)  file=524288 (rc=0)  expected=524288
go-bufio-4096          run3  slowpipe=524288 (rc=0)  fastpipe=524288 (rc=0)  file=524288 (rc=0)  expected=524288
go-bufio-4096          run4  slowpipe=524288 (rc=0)  fastpipe=524288 (rc=0)  file=524288 (rc=0)  expected=524288
go-bufio-4096          run5  slowpipe=524288 (rc=0)  fastpipe=524288 (rc=0)  file=524288 (rc=0)  expected=524288
go-bufio-1MiB          run1  slowpipe=0      (rc=0)  fastpipe=0      (rc=0)  file=0      (rc=0)  expected=524288
go-bufio-1MiB          run2  slowpipe=0      (rc=0)  fastpipe=0      (rc=0)  file=0      (rc=0)  expected=524288
go-bufio-1MiB          run3  slowpipe=0      (rc=0)  fastpipe=0      (rc=0)  file=0      (rc=0)  expected=524288
go-bufio-1MiB          run4  slowpipe=0      (rc=0)  fastpipe=0      (rc=0)  file=0      (rc=0)  expected=524288
go-bufio-1MiB          run5  slowpipe=0      (rc=0)  fastpipe=0      (rc=0)  file=0      (rc=0)  expected=524288
rust-unbuffered        run1  slowpipe=524288 (rc=0)  fastpipe=524288 (rc=0)  file=524288 (rc=0)  expected=524288
rust-unbuffered        run2  slowpipe=524288 (rc=0)  fastpipe=524288 (rc=0)  file=524288 (rc=0)  expected=524288
rust-unbuffered        run3  slowpipe=524288 (rc=0)  fastpipe=524288 (rc=0)  file=524288 (rc=0)  expected=524288
rust-unbuffered        run4  slowpipe=524288 (rc=0)  fastpipe=524288 (rc=0)  file=524288 (rc=0)  expected=524288
rust-unbuffered        run5  slowpipe=524288 (rc=0)  fastpipe=524288 (rc=0)  file=524288 (rc=0)  expected=524288
rust-bufwriter-1MiB    run1  slowpipe=0      (rc=0)  fastpipe=0      (rc=0)  file=0      (rc=0)  expected=524288
rust-bufwriter-1MiB    run2  slowpipe=0      (rc=0)  fastpipe=0      (rc=0)  file=0      (rc=0)  expected=524288
rust-bufwriter-1MiB    run3  slowpipe=0      (rc=0)  fastpipe=0      (rc=0)  file=0      (rc=0)  expected=524288
rust-bufwriter-1MiB    run4  slowpipe=0      (rc=0)  fastpipe=0      (rc=0)  file=0      (rc=0)  expected=524288
rust-bufwriter-1MiB    run5  slowpipe=0      (rc=0)  fastpipe=0      (rc=0)  file=0      (rc=0)  expected=524288
py-sys.exit            run1  slowpipe=524288 (rc=0)  fastpipe=524288 (rc=0)  file=524288 (rc=0)  expected=524288
py-sys.exit            run2  slowpipe=524288 (rc=0)  fastpipe=524288 (rc=0)  file=524288 (rc=0)  expected=524288
py-sys.exit            run3  slowpipe=524288 (rc=0)  fastpipe=524288 (rc=0)  file=524288 (rc=0)  expected=524288
py-sys.exit            run4  slowpipe=524288 (rc=0)  fastpipe=524288 (rc=0)  file=524288 (rc=0)  expected=524288
py-sys.exit            run5  slowpipe=524288 (rc=0)  fastpipe=524288 (rc=0)  file=524288 (rc=0)  expected=524288
py-sys.exit-u          run1  slowpipe=524288 (rc=0)  fastpipe=524288 (rc=0)  file=524288 (rc=0)  expected=524288
py-sys.exit-u          run2  slowpipe=524288 (rc=0)  fastpipe=524288 (rc=0)  file=524288 (rc=0)  expected=524288
py-sys.exit-u          run3  slowpipe=524288 (rc=0)  fastpipe=524288 (rc=0)  file=524288 (rc=0)  expected=524288
py-sys.exit-u          run4  slowpipe=524288 (rc=0)  fastpipe=524288 (rc=0)  file=524288 (rc=0)  expected=524288
py-sys.exit-u          run5  slowpipe=524288 (rc=0)  fastpipe=524288 (rc=0)  file=524288 (rc=0)  expected=524288
py-os._exit            run1  slowpipe=524288 (rc=0)  fastpipe=524288 (rc=0)  file=524288 (rc=0)  expected=524288
py-os._exit            run2  slowpipe=524288 (rc=0)  fastpipe=524288 (rc=0)  file=524288 (rc=0)  expected=524288
py-os._exit            run3  slowpipe=524288 (rc=0)  fastpipe=524288 (rc=0)  file=524288 (rc=0)  expected=524288
py-os._exit            run4  slowpipe=524288 (rc=0)  fastpipe=524288 (rc=0)  file=524288 (rc=0)  expected=524288
py-os._exit            run5  slowpipe=524288 (rc=0)  fastpipe=524288 (rc=0)  file=524288 (rc=0)  expected=524288
py-os._exit-u          run1  slowpipe=524288 (rc=0)  fastpipe=524288 (rc=0)  file=524288 (rc=0)  expected=524288
py-os._exit-u          run2  slowpipe=524288 (rc=0)  fastpipe=524288 (rc=0)  file=524288 (rc=0)  expected=524288
py-os._exit-u          run3  slowpipe=524288 (rc=0)  fastpipe=524288 (rc=0)  file=524288 (rc=0)  expected=524288
py-os._exit-u          run4  slowpipe=524288 (rc=0)  fastpipe=524288 (rc=0)  file=524288 (rc=0)  expected=524288
py-os._exit-u          run5  slowpipe=524288 (rc=0)  fastpipe=524288 (rc=0)  file=524288 (rc=0)  expected=524288
node-process.exit      run1  slowpipe=65536  (rc=0)  fastpipe=65536  (rc=0)  file=524288 (rc=0)  expected=524288
node-process.exit      run2  slowpipe=65536  (rc=0)  fastpipe=65536  (rc=0)  file=524288 (rc=0)  expected=524288
node-process.exit      run3  slowpipe=65536  (rc=0)  fastpipe=65536  (rc=0)  file=524288 (rc=0)  expected=524288
node-process.exit      run4  slowpipe=65536  (rc=0)  fastpipe=65536  (rc=0)  file=524288 (rc=0)  expected=524288
node-process.exit      run5  slowpipe=65536  (rc=0)  fastpipe=65536  (rc=0)  file=524288 (rc=0)  expected=524288
bun-process.exit       run1  slowpipe=65536  (rc=0)  fastpipe=65536  (rc=0)  file=524288 (rc=0)  expected=524288
bun-process.exit       run2  slowpipe=65536  (rc=0)  fastpipe=65536  (rc=0)  file=524288 (rc=0)  expected=524288
bun-process.exit       run3  slowpipe=65536  (rc=0)  fastpipe=65536  (rc=0)  file=524288 (rc=0)  expected=524288
bun-process.exit       run4  slowpipe=65536  (rc=0)  fastpipe=65536  (rc=0)  file=524288 (rc=0)  expected=524288
bun-process.exit       run5  slowpipe=65536  (rc=0)  fastpipe=65536  (rc=0)  file=524288 (rc=0)  expected=524288
```

### 5.5 Output — 100-byte matrix, 3 runs each

```
go-unbuffered-100B       run1  slowpipe=100  (rc=0)  file=100  (rc=0)  expected=100
go-unbuffered-100B       run2  slowpipe=100  (rc=0)  file=100  (rc=0)  expected=100
go-unbuffered-100B       run3  slowpipe=100  (rc=0)  file=100  (rc=0)  expected=100
go-bufio-4096-100B       run1  slowpipe=0    (rc=0)  file=0    (rc=0)  expected=100
go-bufio-4096-100B       run2  slowpipe=0    (rc=0)  file=0    (rc=0)  expected=100
go-bufio-4096-100B       run3  slowpipe=0    (rc=0)  file=0    (rc=0)  expected=100
rust-bufwriter-100B      run1  slowpipe=0    (rc=0)  file=0    (rc=0)  expected=100
rust-bufwriter-100B      run2  slowpipe=0    (rc=0)  file=0    (rc=0)  expected=100
rust-bufwriter-100B      run3  slowpipe=0    (rc=0)  file=0    (rc=0)  expected=100
py-sys.exit-100B         run1  slowpipe=100  (rc=0)  file=100  (rc=0)  expected=100
py-sys.exit-100B         run2  slowpipe=100  (rc=0)  file=100  (rc=0)  expected=100
py-sys.exit-100B         run3  slowpipe=100  (rc=0)  file=100  (rc=0)  expected=100
py-os._exit-100B         run1  slowpipe=0    (rc=0)  file=0    (rc=0)  expected=100
py-os._exit-100B         run2  slowpipe=0    (rc=0)  file=0    (rc=0)  expected=100
py-os._exit-100B         run3  slowpipe=0    (rc=0)  file=0    (rc=0)  expected=100
py-os._exit-100B-u       run1  slowpipe=100  (rc=0)  file=100  (rc=0)  expected=100
py-os._exit-100B-u       run2  slowpipe=100  (rc=0)  file=100  (rc=0)  expected=100
py-os._exit-100B-u       run3  slowpipe=100  (rc=0)  file=100  (rc=0)  expected=100
node-process.exit-100B   run1  slowpipe=100  (rc=0)  file=100  (rc=0)  expected=100
node-process.exit-100B   run2  slowpipe=100  (rc=0)  file=100  (rc=0)  expected=100
node-process.exit-100B   run3  slowpipe=100  (rc=0)  file=100  (rc=0)  expected=100
bun-process.exit-100B    run1  slowpipe=100  (rc=0)  file=100  (rc=0)  expected=100
bun-process.exit-100B    run2  slowpipe=100  (rc=0)  file=100  (rc=0)  expected=100
bun-process.exit-100B    run3  slowpipe=100  (rc=0)  file=100  (rc=0)  expected=100
```

### 5.6 Output — Node boundary probe, 3 runs each

```
node payload=65536   run1 slowpipe=65536
node payload=65536   run2 slowpipe=65536
node payload=65536   run3 slowpipe=65536
node payload=65537   run1 slowpipe=65536
node payload=65537   run2 slowpipe=65536
node payload=65537   run3 slowpipe=65536
node payload=131072  run1 slowpipe=65536
node payload=131072  run2 slowpipe=65536
node payload=131072  run3 slowpipe=65536
```

## 6. Variance

None. Across 55 large-payload runs, 24 small-payload runs and 9 boundary runs, every repetition of
a given case produced the identical byte count and the identical exit status. The brief anticipated
a race; on this machine none of these three failures is one. Node/Bun truncation is determined by
the kernel's pipe capacity, and buffer loss is determined by whether the bytes were in userspace
when the process died — neither depends on timing, which is why even a promptly draining `| cat`
does not rescue the Node case. `[MEASURED]`

The one thing that _would_ introduce variance, and was not tested, is a consumer that drains
concurrently while the producer is still writing more than one buffer's worth. That is a different
experiment from this one.

## 7. What this does and does not license

- B4 is real, and Node and Bun are its clearest instance: silent, exit-0, pipe-only, and not
  fixable by making the consumer faster. `[MEASURED]`
- "Flush before exit" is correct advice for Go `bufio` and Rust `BufWriter`, but describing it as a
  _pipe_ concern is wrong — the bytes are lost to a file too. `[MEASURED]`
- Advising an explicit `flush()` before `sys.exit` in Python is not supported by anything measured
  here. `sys.exit` runs interpreter shutdown, which flushes. The advice belongs on `os._exit`, which
  is a different call with different documented semantics. `[MEASURED]`
- Nothing here establishes behaviour on Linux, where pipe capacity differs and the Node numbers
  would move. The _shape_ of the Node failure should survive the port; the constant 65536 will not.
  `[INFERRED]`
