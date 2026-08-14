#!/usr/bin/env bun
// RUNNER FIXTURE for the deadline-bounds-a-tree regression. Not a conformance fixture: no
// checker ever runs this, and it violates most of the catalogue on purpose.
//
// It reproduces the exact shape that made the advertised deadline a signal rather than an upper
// bound. `stdio: "inherit"` hands the descendant a duplicate of the write end of the runner's
// stdout/stderr pipes, so SIGKILL to THIS process leaves those pipes open — and Node's `close`
// event waits for the streams, not just for the process. Before the runner killed the process
// GROUP, a probe against this took as long as the descendant lived, whatever deadline was asked
// for.
import { spawn } from "node:child_process";

spawn("sleep", ["10"], { stdio: "inherit" });

// Never terminates on its own, so the deadline is the only thing that ends the probe. A fixture
// that exited by itself would prove nothing about deadline enforcement.
await new Promise(() => {});
