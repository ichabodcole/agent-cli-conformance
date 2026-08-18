# Testing & Enforcement Methodology for Agent-First CLIs

Research note 04. Focus: how to move CLI-quality invariants from **tier 3 (documented)** to
**tier 2 (caught)** and **tier 1 (impossible)**.

The three-tier frame used throughout:

| Tier | Name       | Mechanism                                                                  | Failure mode                                           |
| ---- | ---------- | -------------------------------------------------------------------------- | ------------------------------------------------------ |
| 1    | Impossible | Type system / API shape / protocol design forbids expressing the violation | Costs ergonomics; can't cover runtime-dynamic surfaces |
| 2    | Caught     | A test or CI gate fails on the violation                                   | Can be disabled, skipped, or rubber-stamped            |
| 3    | Documented | Prose says don't                                                           | Ignored at scale                                       |

A fourth tier is worth naming explicitly because it recurs in the prior art below:

| 1.5 | Self-detecting | The protocol is designed so a violation _breaks the tool's own output contract_ | Only works where the contract is machine-parsed |

Maelstrom is the canonical example of tier 1.5 (below, §4.5): stdout _is_ the JSON wire, so a stray
`println` is not a style violation, it is a parse error that fails the run. We should design for this
deliberately.

**Three findings up front that shaped everything below:**

1. **There is no CLI conformance-kit prior art worth copying** (§4.13). Everything useful has to be
   imported from WebAssembly, WPT, Test262, toml-test, Maelstrom and Kubernetes — which, fortunately,
   have converged hard enough that the design is close to determined.
2. **Exit-code coverage auditing does not exist as a practice, anywhere** (§1.7), and neither does
   property-based testing of argv (§3.1) or metamorphic testing of CLIs (§3.5). These are the
   genuinely unclaimed areas, and exit codes in particular are the machine-readable contract an agent
   actually consumes.
3. **The single most transplantable architectural idea is WPT's expectation model** (§4.3): known
   failures live in per-implementation metadata, never as edits to the shared corpus, so a reviewer
   watches the failure ledger shrink in a diff.

---

## 1. CLI testing techniques compared

### 1.1 The landscape

| Tool                     | Lang        | Model                    | Case format                         | Exit-code granularity                  | FS sandbox                       | Update mechanism          |
| ------------------------ | ----------- | ------------------------ | ----------------------------------- | -------------------------------------- | -------------------------------- | ------------------------- |
| `trycmd`                 | Rust        | subprocess, bulk         | literate `.trycmd`/`.md` or `.toml` | specific (`? 2`)                       | `.in/` seeds cwd, `.out/` diffed | `TRYCMD=overwrite`        |
| `snapbox`                | Rust        | subprocess, library      | inline `str![[...]]`                | specific                               | via `assert_fs`                  | `SNAPSHOTS=overwrite`     |
| `assert_cmd`             | Rust        | subprocess, predicates   | imperative                          | specific (`.code(42)`)                 | via `assert_fs`                  | n/a                       |
| `insta`                  | Rust        | value-level snapshots    | `.snap` files or inline `@"..."`    | n/a                                    | n/a                              | `cargo insta review`      |
| `testscript`             | Go          | **re-exec subprocess**   | **txtar**                           | success/failure only (`!`)             | fresh `$WORK`, `HOME=/no-home`   | `UpdateScripts: true`     |
| `go-cmdtest`             | Go          | subprocess               | `.ct` transcripts                   | success/failure (`--> FAIL`)           | temp dir                         | `ts.Run(t, *update)`      |
| `CliRunner`              | Python      | **in-process**           | imperative                          | specific (`result.exit_code`)          | `isolated_filesystem()`          | n/a                       |
| `pytest-console-scripts` | Python      | **either, configurable** | imperative                          | specific                               | pytest `tmp_path`                | n/a                       |
| `syrupy`                 | Python      | value snapshots          | `.ambr`                             | n/a                                    | n/a                              | `--snapshot-update`       |
| `bats-core`              | Bash        | subprocess               | `@test` blocks                      | specific (`run -N`)                    | 3-scope `BATS_*_TMPDIR`          | n/a (explicit asserts)    |
| `shellspec`              | POSIX sh    | subprocess               | BDD blocks                          | specific                               | per-test dirs                    | n/a                       |
| `cram`                   | any         | subprocess               | `.t` transcripts                    | specific                               | `$CRAMTMP`                       | `cram -i`                 |
| `pexpect`/`rexpect`      | Python/Rust | **real pty**             | imperative                          | specific                               | manual                           | n/a                       |
| `@oclif/test`            | TS          | **in-process**           | imperative                          | `error.oclif.exit` (not a real status) | manual                           | n/a                       |
| `execa`                  | JS          | subprocess               | imperative                          | specific (`error.exitCode`)            | manual                           | n/a                       |
| Jest/Vitest              | JS          | value snapshots          | `.snap` / inline                    | n/a                                    | n/a                              | `-u`                      |
| `Verify`                 | .NET        | approval                 | `.received`/`.verified` pair        | n/a                                    | `VerifyDirectory`                | promote received→verified |
| `ApprovalTests`          | multi       | approval                 | `.approved.txt`                     | n/a                                    | manual                           | Reporter/diff tool        |

### 1.2 The literate-transcript family (cram → trycmd → testscript)

Three generations of the same idea: the test _looks like_ a terminal session.

`cram` (<https://bitheap.org/cram/>) is the ancestor, and Mercurial's test suite is its canonical
large-scale user. Two-space indent, `$ ` for commands, `> ` for continuations, bare indented lines
for expected output, with per-line escape hatches `(re)`, `(glob)`, `(no-eol)`, `(esc)`:

```
  $ cram -h
  [Uu]sage: cram \[OPTIONS\] TESTS\.\.\. (re)
```

`cram -i` interactively patches actual output back into the test — the original "approve the diff"
UX, predating Jest by a decade.

`trycmd` (<https://docs.rs/trycmd/latest/trycmd/>) is the Rust descendant, and its own docs frame the
philosophy as test cases being "cattle, not pets" — you point it at a directory and it enumerates
everything:

```console
$ my-cmd --verbose
Hello world
? 2
```

`$` starts a command, `>` continues, `? <status>` asserts exit status (defaults to success).
Wildcards `[..]` (within a line) and `...` (skip lines) plus built-in vars `[EXE]`, `[ROOT]`, `[CWD]`
and custom ones via `TestCases::insert_var`. The `.toml` form exposes `bin`, `args`, `[env]`,
`status`, `stdin`, `timeout`, and `[fs]` with `sandbox`/`cwd`/`base`.

trycmd's **filesystem assertions are the underrated feature**: a sibling `.in/` directory becomes the
cwd, and a `.out/` directory is diffed against the post-run filesystem (with `.keep` files to
materialise empty dirs). That means "this command produced exactly these files" is a first-class
assertion — directly useful for our `effects` verification (§6 #12). trycmd is honest about its
ceiling: it's for "blunt tests (limited test predicates)" and defers to `assert_cmd` or `snapbox`
when you need logic. Note also that the `.trycmd`/`.md` format merges stdout and stderr into one
expected block, baking interleaving order into the golden file; the `.toml` form with sibling
`*.stdout`/`*.stderr` files separates them. **For a tool whose whole point is stream separation, use
the separated form.**

`testscript` (<https://pkg.go.dev/github.com/rogpeppe/go-internal/testscript>) is the most complete
design in the survey — it's the Go toolchain's own harness, extracted. A whole test is one txtar
file:

```
# hello world
exec cat hello.text
stdout 'hello world\n'
! stderr .

-- hello.text --
hello world
```

**txtar is the format to steal.** A single plain-text file contains the script _and_ every fixture
file, separated by `-- filename --` markers. One file = one test = one reviewable diff. No scattered
`testdata/` trees, no indirection between an assertion and the data it depends on, trivially
greppable and editable. Its only real cost is that binary fixtures don't fit.

Prefixes: `!` = must fail, `?` = may fail, `[cond]` = conditional (`[unix]`, `[darwin]`,
`[exec:git]`, `[short]`, `[!symlink]`, and in the toolchain's version `[cgo]`, `[race]`,
`[GOOS:linux]`). Assertions: `stdout`/`stderr` take **regexps**, `cmp stdout golden.txt` for exact
files, plus `exists`, `grep -count=N`, and `cmpenv` which expands env vars during comparison so
`$WORK`-relative paths compare equal.

The Go toolchain runs **900+ of these** in `src/cmd/go/testdata/script/`
(<https://go.dev/src/cmd/go/testdata/script/README>), driven by
[`script_test.go`](https://go.dev/src/cmd/go/script_test.go). `go build`, modules, workspaces and
vendoring are all tested this way. That is the strongest existence proof available that
script-driven CLI testing scales to a large, long-lived, high-stakes CLI.

### 1.3 In-process vs subprocess — the central fault line

This is the axis that matters most, and remarkably only one tool in the survey treats it as
configurable.

**In-process wins:** speed (often 10–100×), and it is the _only_ mode where you can mock internals.

**Subprocess wins on everything else, and the failure modes are concrete:**

- **`exit()` kills the runner.** `sys.exit()` / `process.exit()` / `process::exit()` terminate the
  test process. Click survives only because `CliRunner` catches `SystemExit` and converts it to
  `result.exit_code`. Go has no such trick, which is why the canonical Go pattern is re-exec'ing the
  test binary with an env flag and inspecting `*exec.ExitError`
  (<https://github.com/golang/go/issues/29062>).
- **fd-level output escapes language-level capture.** Output from C extensions, Python's `logging`
  module, or nested subprocesses bypasses in-process capture entirely. Click's fix is
  `CliRunner(capture="fd")`, which `os.dup2`s the real file descriptors — unavailable on Windows.
  The same class of bug bites oclif: `@oclif/test` reads native stdout/stderr streams, but **Vitest
  intercepts `console.log`/`console.error` by default**, so you need `disableConsoleIntercept: true`.
- **Global state leaks between invocations** — module caches, `require` cache, parsed-arg singletons,
  mutated `process.argv`.
- **Signals and real exit statuses only exist in subprocess mode.** oclif's "exit code" is
  `error.oclif.exit`, a property on a thrown JS object, not a process status. That is a materially
  weaker assertion than what an agent actually observes.
- **TTY detection differs.** In-process runners generally leave the parent's TTY state visible.

**Coverage was historically the argument for in-process, and that argument is now largely dead** in
Go and Rust: testscript propagates `GOCOVERDIR` to children and deliberately re-execs the test binary
as a genuine subprocess, getting real exit codes _and_ coverage; its `RunMain`/`IgnoreMissedCoverage`
knobs are deprecated because the toolchain handles subprocess coverage natively. It remains a live
problem elsewhere (<https://github.com/golang/go/issues/47515>).

**`pytest-console-scripts`** (<https://github.com/kvas-it/pytest-console-scripts>) is essentially
alone in making this a first-class axis:

```python
def test_version(script_runner):
    result = script_runner.run(['foobar', '--version'])
    assert result.returncode == 0
    assert result.stdout == '3.2.1\n'
```

Mode via `--script-launch-mode={inprocess,subprocess,both}`, an ini key, or
`@pytest.mark.script_launch_mode('subprocess')`. Its README states the tradeoff plainly: in-process
is much faster and the only mode where mocking works; subprocess "more closely simulates real-world
invocation" and is recommended for CI verification; `both` runs each test twice.

**Recommendation for our kit: subprocess only, no exceptions.** A conformance kit must observe
exactly what an agent observes — real argv handling, real exit status, real stream separation, real
TTY absence. In-process invocation is a framework-internal testing convenience, not a conformance
mechanism.

### 1.4 Testing `--help`

Systematic help-text snapshotting is **common in Rust and rare-to-absent everywhere else**.

clap's own `tests/builder/help.rs` uses snapbox inline snapshots:

```rust
#[test]
fn complex_help_output() {
    let expected = str![[r#"
clap-test v1.4.8

Usage: clap-test [OPTIONS] [positional] [COMMAND]
...
"#]];
    utils::assert_output(utils::complex_app(), "clap-test --help", expected, false);
}
```

**The single most important detail: clap pins terminal width in these tests** — `.term_width(67)`,
`.term_width(120)`, or `.term_width(0)` to disable wrapping. With the `wrap_help` feature clap wraps
to the detected terminal width, falling back to 100 columns
(<https://docs.rs/clap/latest/clap/struct.Command.html>; see
[clap#2065](https://github.com/clap-rs/clap/issues/2065),
[clap#4295](https://github.com/clap-rs/clap/issues/4295)). **Unpinned width is the #1 cause of help
snapshots that pass locally and fail in CI.** clap's v3 changelog advises downstream CLIs to add
trycmd tests for `-h` and `--help` at minimum.

Go covers help through `cmd/go/testdata/script/`. In Python and JS the practice is ad hoc — people
assert substrings (`assert "Usage:" in result.output`) far more often than they snapshot the block.

### 1.5 Fixture and tempdir management

Every serious harness owns the environment rather than trusting the host:

- **testscript**: fresh `$WORK` per script, files unpacked from the txtar body, and deliberately
  hostile defaults — `HOME=/no-home` and `TMPDIR=$WORK/.tmp` exist _specifically to catch accidental
  host dependencies_. `$WORK` is substituted back into failure output so paths are stable in
  diagnostics. `-testwork` preserves the dir for debugging.
- **trycmd**: `.in/` seeds cwd, `.out/` diffed post-run, `fs.sandbox` toggles isolation.
- **bats**: three scopes — `$BATS_TEST_TMPDIR`, `$BATS_FILE_TMPDIR`, `$BATS_SUITE_TMPDIR` — with
  `setup`/`teardown`/`setup_file`/`setup_suite` hooks.
- **cram**: overrides `TMPDIR`/`TEMP`/`TMP`, exposes `$CRAMTMP` and `$TESTDIR`.
- **Click**: `isolated_filesystem()`.

`HOME=/no-home` deserves to be a stated principle: **a conformance harness should point every
environment escape hatch at a nonexistent or sandboxed location, so a tool that quietly reads
`~/.config/foo` fails loudly rather than passing on the maintainer's laptop only.**

### 1.6 Interactive vs non-interactive

Genuine pty testing is **rare**. Most suites deliberately test only the non-interactive path.
None of trycmd, testscript, cram, or bats allocate a pty. Click's `input=` feeds a pipe (so
`isatty()` is false, but Click's prompts still read stdin).

When real pty behaviour must be tested the tools are `pexpect`
(<https://pexpect.readthedocs.io/en/stable/api/pexpect.html>, which uses `pty.fork()` so the child's
`isatty()` returns true, and whose `waitnoecho()` detects when the child disables ECHO — i.e. is
waiting for a password), `expect` (Tcl), and `rexpect` (Rust). `assert_cmd`'s docs explicitly punt to
rexpect for interactive programs.

The colour/TTY control landscape is genuinely fragmented and matters for us: `NO_COLOR`
(<https://no-color.org>), `CLICOLOR`/`CLICOLOR_FORCE` (<http://bixense.com/clicolors/>), and
`FORCE_COLOR` (<https://force-color.org/>) coexist with contested precedence — see
[cli/cli#13335](https://github.com/cli/cli/issues/13335) for a real bug where `CLICOLOR=0` and
`NO_COLOR=1` were both ignored.

**For our kit: test the non-interactive path exhaustively (it's the agent path), and test the
interactive path only enough to prove the tool _refuses_ rather than hangs.** That maps exactly onto
the spec rules "never block on input without a TTY" and "`requires_tty` commands emit `tty_required`
rather than hang."

### 1.7 Exit codes — and a genuine gap

Assertion support is universal but the _granularity splits_:

- **Specific codes**: trycmd `? 2`, `assert_cmd` `.failure().code(42)`, bats `run -N`, execa
  `error.exitCode`, Click `result.exit_code`.
- **Success/failure only**: testscript's `!` prefix, go-cmdtest's `--> FAIL`, bats' bare `run !`.

That second group is a real limitation for us: a spec that assigns distinct exit codes to distinct
error kinds cannot be conformance-tested by a harness that only knows "nonzero."

**Exit-code _coverage_ — proving every documented exit code is reachable and tested — appears to be
essentially nonexistent as a named practice.** `sysexits.h` (codes 64–78, from sendmail) is
documented, and helper libraries exist (`proc-exit` <https://github.com/rust-cli/proc-exit>,
`sysexit` <https://docs.rs/sysexit>, Go's <https://pkg.go.dev/github.com/square/exit>), but no
tooling was found that cross-references a CLI's documented exit codes against its test suite.
Everyone tests 0 and "some nonzero"; the tail of specific codes is untested.

**This is an unfilled gap that our kit should own**, because exit codes are precisely the
machine-readable contract an agent consumes. See §6 gates 4 and 6.

### 1.8 Honest summary: widespread vs rare

- **Widespread**: subprocess spawning with exit-code + substring assertions; bats in shell/infra
  projects; Jest/Vitest snapshots; Click's `CliRunner` as the Python default; Verify/ApprovalTests in
  .NET.
- **Common in one ecosystem only**: txtar/literate script testing (dominant in Go, growing in Rust,
  legacy in Mercurial, near-absent in Python/JS); systematic help-text snapshotting (Rust/clap).
- **Rare everywhere**: pty/interactive testing; post-run filesystem-state assertions (trycmd's
  `.out/` and Verify's `VerifyDirectory` are the exceptions); configurable in-process-vs-subprocess
  mode; exit-code coverage auditing (no tooling found at all).
- **Universal unsolved problem**: nondeterminism scrubbing — every serious tool reinvents it. Terminal
  width, temp paths, timestamps, GUIDs and ANSI are the recurring offenders, and width is the one
  most likely to silently break help snapshots between local and CI.

## 2. Snapshot pitfalls and scrubbing

### 2.1 Two philosophies, and which is better

Every mature tool ends up with both, but they are **not** equivalent:

1. **Normalize at the source** — control the process environment so the CLI _emits_ deterministic
   bytes (fixed `TZ`, `LC_ALL=C`, `NO_COLOR=1`, pinned width, seeded RNG, injected clock, sandboxed
   `$HOME`/`$TMPDIR`).
2. **Redact at the sink** — regex-substitute volatile parts out of captured output before comparing.

**Source-normalization is strictly better where available, because every redaction is a blind spot.**
A `[..]` covering a duration also hides a panic message that happens to land in the same position.
Sink-redaction remains unavoidable for absolute paths, PIDs and content hashes. Layer them, in that
order of preference.

### 2.2 The nondeterminism inventory and its fixes

| Source                     | Source-side fix                                                                | Sink-side fix                                                                               |
| -------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Timestamps / durations     | `SOURCE_DATE_EPOCH`, injected clock, `Date.now = jest.fn(() => 1482363367071)` | insta filter, Verify `DateTime_1` counter, `expect.any(Date)`                               |
| Absolute paths / tempdirs  | `$WORK`-relative cwd, `TMPDIR=$WORK/.tmp`                                      | `[CWD]`/`[ROOT]`, Verify `{TempPath}`/`{ProjectDirectory}`, testscript `$WORK` substitution |
| Hostname / username        | container/fixed env                                                            | Verify `ScrubMachineName()` → `TheMachineName`, `ScrubUserName()`                           |
| PIDs                       | —                                                                              | regex filter                                                                                |
| ANSI colour                | `NO_COLOR=1`, `TERM=dumb`, `CLICOLOR=0`                                        | strip `\x1b\[`                                                                              |
| Terminal width / wrapping  | **pin it** (`clap .term_width(N)`, testthat 80 cols, `COLUMNS`)                | `...` line skip (lossy)                                                                     |
| UUIDs / hashes             | seeded generator                                                               | **counter-scrub** (Verify `Guid_1`), `insta` `dynamic_redaction`                            |
| Map/set iteration order    | ordered container                                                              | `insta::sorted_redaction()`, snapbox `.unordered()`                                         |
| Locale collation           | `LC_ALL=C`                                                                     | —                                                                                           |
| Line endings               | normalize `\r\n`/`\r` → `\n`                                                   | Verify does this by default, before scrubbers run                                           |
| Sort instability           | **add a tiebreaker key**                                                       | (do not redact — it's a bug)                                                                |
| Env leakage                | `HOME=/no-home`, explicit env allowlist                                        | —                                                                                           |
| stdout/stderr interleaving | **capture streams separately**                                                 | —                                                                                           |
| Version strings            | inject a fixed version                                                         | filter                                                                                      |

Two per-tool details worth internalising:

**`insta`'s `dynamic_redaction` lets a scrubber assert while erasing**, so you don't trade
determinism for zero coverage:

```rust
insta::assert_yaml_snapshot!(&user, {
    ".id"      => "[uuid]",
    ".flags"   => insta::sorted_redaction(),      // iteration order
    ".elapsed" => insta::rounded_redaction(3),    // float noise
    ".token"   => insta::dynamic_redaction(|value, _path| {
        assert_eq!(value.as_str().unwrap().len(), 40);  // still assert shape
        "[token]"
    }),
});
```

**Verify counter-scrubs rather than blanks**, preserving referential structure
(<https://github.com/VerifyTests/Verify/blob/main/docs/guids.md>):

```
{ Id: Guid_1, Sender: John Smith, Recipient: Jane Smith, Timestamp: DateTime_1 }
```

If the same UUID appears twice, the snapshot still proves they're the same value — which blanket
`[uuid]` redaction destroys. **Strongly recommended for CLI output containing correlated IDs.**

Cargo's own contributor guide (<https://doc.crates.io/contrib/tests/writing.html>) shows the
production pattern for CLI output, with `.unordered()` for parallelism-dependent line order and
Windows `\` → `/` normalization:

```rust
p.cargo("run --bin foo")
    .with_stderr_data(str![[r#"
[COMPILING] foo [..]
[FINISHED] [..]
[RUNNING] `target/debug/foo`
"#]])
    .run();
```

`testthat`'s `local_reproducible_output()`
(<https://testthat.r-lib.org/articles/snapshotting.html>) is the cleanest API found for the
CLI-specific axes: it fixes console width to **80 columns**, suppresses ANSI, and disables Unicode,
in one call. testthat also stores snapshots as **markdown** in `_snaps/` explicitly "because it's
important that snapshots be human-readable because humans have to read them during code reviews."

### 2.3 The colour/width standards, precisely

- **`NO_COLOR`** (<https://no-color.org>) is normative: check for the variable "present and not an
  empty string (**regardless of its value**)". A very common bug is treating `NO_COLOR=0` as
  "colours on."
- **`CLICOLOR=0`** → no ANSI; **`CLICOLOR_FORCE` != 0** → colour regardless of TTY. `CLICOLOR_FORCE`
  is how you test the _coloured_ path deterministically. The bixense page now defers to the
  `no-color`/`force-color` standards.
- **`TERM=dumb`** is the third gate most libraries honour.
- **`COLUMNS` is unreliable** — it's a shell variable not exported by default and it doesn't track
  resizes. The robust pattern is a library-level width setter (testthat) or an explicit `--width`
  flag. **Test wrapping at one or two fixed widths rather than inheriting the CI terminal.**
- **`LC_ALL=C`** "sorts according to byte values and is always available"
  (<https://reproducible-builds.org/docs/locales/>). `LC_ALL` overrides all `LC_*`; `LANG` is only a
  weak default — the Linux kbuild patch replacing `LANG=C` with `LC_ALL=C` is the canonical bug.

### 2.4 Reproducible builds: determinism as a _tested property_

The reproducible-builds definition (<https://reproducible-builds.org/docs/definition/>) — "given the
same source code, build environment and build instructions, any party can recreate bit-by-bit
identical copies" — plus `SOURCE_DATE_EPOCH` (<https://reproducible-builds.org/docs/source-date-epoch/>,
an integer of seconds since the epoch, always UTC) and `diffoscope` (<https://diffoscope.org/>, which
recursively unpacks and renders artifacts to explain _why_ two differ).

**The transferable idea, and it's the most important one in this section:** run every recorded command
**twice** — under a different `$HOME`, `$TMPDIR`, cwd, hostname, `TZ`, width, and shuffled test order
— and diff the two captures _before_ comparing against any golden file. Any diff is reported as
**"your output is unstable"**, not as a snapshot mismatch.

This flips the attribution from "the snapshot rotted" to "the CLI is wrong," which is the correct
attribution and exactly the reproducible-builds posture. It is §6 gate 11, and it is one of the few
places where a conformance kit can convert a chronic annoyance into a spec-level property.

### 2.5 Golden-file rot and blind re-approval

The criticism is strong, consistent practitioner consensus. The term of art is **"snapshot
blindness."**

Brains & Beards (<https://brainsandbeards.com/blog/snapshot-testing/>) frames it as an incentive
problem: faced with "a big list of snapshot changed," "when you just want to finish your PR, there's
a strong temptation to answer: 'sure, why not'." The worst-hit group is newcomers — "any change they
make results in a cascade of snapshots to decide on… that's not something that (being new on the
team) they can confidently decide themselves." Their conclusion is that snapshots are "worse than
nothing" when they manufacture 95% coverage while masking the absence of behavioural tests.

Kent C. Dodds (<https://kentcdodds.com/blog/effective-snapshot-testing>), quoting Justin Searls:
_"Good tests encode the developer's intention, they don't only lock in the test's behavior"_ — and
developers "nuke the snapshot and record a fresh passing one instead of agonizing over what broke
it." His operational rule: "When your snapshot is more than a few dozen lines it's going to suffer
major maintenance issues." Nick Gard's version
(<https://ntgard.medium.com/jest-snapshot-testing-the-bad-parts-c93aca187ba5>): `--update-snapshots`
"will immortalize the component's current markup as the True Markup™, regardless of whether or not
the component is in a complete and valid state."

**Be honest about the evidence base.** Academic coverage is thin: a 2023 grey-literature review of 50
documents (_"Snapshot testing in practice: Benefits and drawbacks"_, IST,
<https://www.sciencedirect.com/science/article/abs/pii/S0164121223001929>) and Fujita et al., _"An
Empirical Study on the Use of Snapshot Testing"_ (ICSME 2023,
<https://ieeexplore.ieee.org/document/10336316/>), which analysed 1,487 Jest projects, 569 of them
using snapshots. **No study measures how often a real regression was blind-approved.** Treat
rubber-stamping as strong practitioner consensus, not a quantified result.

### 2.6 Mitigations that actually exist in tools

**(a) CI must refuse to write — the most widespread real control, and on by default in good tools.**
Jest, verbatim: _"as of Jest 20, snapshots in Jest are not automatically written when Jest is run in
a CI system without explicitly passing `--updateSnapshot`… since new snapshots automatically pass,
they should not pass a test run on a CI system."_ Note the subtlety: a **new** snapshot silently
passes locally; CI mode is what makes "you forgot to commit the snapshot" fail. insta does the same,
flipping `INSTA_UPDATE` from `auto` (→`new`) to `no` when it detects CI
(<https://insta.rs/docs/advanced/>); values are `auto | always | unseen | new | no`, and
`INSTA_FORCE_PASS=1` must never be set in CI.

**(b) Kill unreferenced snapshots.** `cargo insta test --unreferenced=<ignore|warn|reject|delete|auto>`
(<https://insta.rs/docs/cli/>) — `reject` in CI. syrupy has `--snapshot-warn-unused`. Jest
historically reported obsolete snapshots without saying which
(<https://github.com/jestjs/jest/issues/5005>); vitest had the same gap. **Unreferenced snapshots are
pure rot — dead expectations defending nothing.**

**(c) Cap snapshot size.** `eslint-plugin-jest/no-large-snapshots` defaults to **50 lines**:

```json
{
  "rules": {
    "jest/no-large-snapshots": ["warn", { "maxSize": 12, "inlineMaxSize": 6 }]
  }
}
```

Stated rationale: _"A stored snapshot is only as good as its review."_ It also needs an
`allowedSnapshots` option because **Jest strips `eslint-disable` comments when rewriting snapshot
files** — a neat illustration of update tooling actively eroding review scaffolding.

**(d) Put the expectation in the code diff.** Inline snapshots (`toMatchInlineSnapshot`, insta's
`@"..."`, snapbox's `str![[...]]`, Python's `inline-snapshot`) move golden text next to the
assertion, so a reviewer sees expectation and code together instead of scrolling past a separate
400-line `.snap`. Cargo's contributor guide explicitly prefers inline for this reason.

**(e) Make approval a deliberate, separate act.** ApprovalTests writes `*.received.txt`, compares
against `*.approved.txt`, launches a diff-tool **Reporter** on mismatch, and approval is literally
renaming received→approved. Some ports go further with an explicit approval mode where **the test
never passes** until a human signs off (<https://github.com/franiglesias/golden>). That is the
strongest structural answer to blind approval in the wild — and it is rare.

**(f) CODEOWNERS on snapshot directories:** could not be substantiated as established practice in any
major project. **Aspirational, not citable.**

### 2.7 The largest golden-file operation: Chromium/Blink web tests

<https://chromium.googlesource.com/chromium/src/+/HEAD/docs/testing/web_test_expectations.md> is the
best governance document in this space, and its rules are directly transplantable:

- **Two distinct artifacts.** _Baselines_ (`-expected.txt|png|wav`) say what the output **is**.
  `TestExpectations` says a test is **allowed to fail**. Syntax
  `[ bugs ] [ modifiers ] test_or_directory [ expectations ]`, drawn from
  `Crash | Failure | Pass | Slow | Skip | Timeout`; multiple expectations on one line encode flakiness.
- **A bug ID is mandatory and machine-enforced** — `crbug.com/12345` or `Bug(username)`, validated by
  `lint_test_expectations.py`. Every suppression is traceable to an owner and a tracking issue.
- **Rebaselining beats suppression, as policy.** Verbatim: _"If a test can be rebaselined, it should
  always be rebaselined instead of adding lines to TestExpectations."_ And when you can't rebaseline,
  _"reverting the patch is strongly preferred"_ over adding an expectation line. Remarkably hard-line,
  and the piece most projects fail to copy.
- **Baselines land in the same CL as the code.** `blink_tool.py rebaseline-cl` uploads the CL, runs
  try jobs across platforms, pulls the produced baselines back and commits them — so the reviewer
  sees code change and baseline delta in one review.
- **Permanent exclusions live elsewhere** (`NeverFixTests`), keeping `TestExpectations` a list of
  _temporary_ debt.
- **Footgun**: baseline fallback means platforms inherit from more general directories, so
  rebaselining one platform silently changes others.

**Be honest about the limit even here.** A chromium-dev thread records that web tests are flaky
enough that rebaseline runs churn expectation files across patchsets, and contributors request review
exemptions on `third_party/blink/web_tests/platform` because ahead-of-time LGTM on expectations "is
the only thing that makes landing rendering changes possible." **At sufficient scale, review of
golden files does degrade into ritual.** Chromium's answer is not "review harder" — it is _make the
tooling regenerate them mechanically and require a tracked bug for every deviation._ That is the
lesson for §7.5's expectation-file design.

### 2.8 When snapshot testing is the wrong tool

The core argument, worth encoding in the methodology: **a snapshot asserts only that output equals
prior output; it never asserts that either was correct.**

Wrong tool when:

- output is large enough that nobody reads the diff (>~50 lines, the empirically chosen threshold);
- the correctness criterion is a _property_, not an exact rendering — exit codes, "stderr mentions
  the offending flag," "stdout is valid JSON with these keys." **Write real assertions.**
- output is inherently unstable and you'd redact most of it away, at which point the snapshot asserts
  almost nothing;
- you're defining behaviour _before_ implementation — a snapshot can only be recorded from an
  existing implementation, so it cannot drive TDD.

Right tool for exactly the CLI case Dodds identifies: developer-facing text where the whole rendering
_is_ the contract — `--help` output, error messages, generated files, formatter output, diagnostics.

The `bats` contrast is the honest framing: bats deliberately has **no** golden files — `run cmd`
captures `$status`/`$output`/`${lines[@]}` and you write explicit `assert_output`/`assert_line`.
It forces you to state intent; snapshot tools don't.

**Practical rules for our methodology:** (1) CI sets `--ci`/`INSTA_UPDATE=no` and rejects
unreferenced snapshots; (2) **every snapshot test carries at least one hand-written assertion
alongside it** (exit code, a key substring) so a blind re-approval still trips something; (3) cap
snapshot size and split by concern; (4) prefer inline snapshots; (5) fix the environment before
reaching for regex filters; (6) prefer counter-scrubbing over blanket redaction; (7) add the
determinism double-run (§2.4); (8) require a linked issue for any expected-to-fail marker,
Chromium-style.

## 3. Property-based and fuzz testing of argument parsing

### 3.1 The headline finding: it is essentially not done

This section's most valuable content is a negative result, verified directly against repositories
rather than inferred.

**clap has no fuzzing and no property-based tests.** Checked against the repo: no `fuzz/` directory
in the root tree; `Cargo.lock` contains no `proptest`, `arbitrary`, `quickcheck`, `libfuzzer-sys` or
`afl` entries; `Makefile`, `CONTRIBUTING.md` and `.github/workflows/ci.yml` contain zero fuzz/proptest
references. The most-used argument parser in Rust (~67M downloads/month) tests its parser with
hand-written example tests under `tests/builder/` and `tests/derive/`, plus UI snapshot tests.

**Python: essentially nonexistent.** CPython's `Lib/test/test_argparse.py` is entirely example-based.
Click's official testing guidance is `CliRunner.invoke(cmd, [args])` — example-based. No Hypothesis
strategy library for argv was found.

**Go: rare but real.** Stdlib `flag`, `spf13/pflag`, `spf13/cobra` and `alecthomas/kong` have no
in-tree `FuzzXxx` targets. The one genuine example found is `agilira/flash-flags`
(<https://github.com/agilira/flash-flags/blob/main/fuzz_test.go>) with five native Go 1.18+ targets.
Its seed corpus is a useful invariant catalogue in itself:

```go
{"--host=" + strings.Repeat("A", 10000)}   // unbounded length
{"--host", "127.0.0.1\x00.evil.com"}       // embedded NUL
{"--port", "99999999999999999"}            // integer overflow
{"---invalid"}                             // triple dash
{"-abc=value=more"}                        // bundling + repeated '='
{"--port", "-5"}                           // negative value not read as a flag
```

The body asserts three things: no panic (`defer recover()`), **parse latency < 500ms** (a DoS guard
that catches quadratic/backtracking blowups), and post-conditions on accepted values (port in
`0..65535`, bounded string lengths).

**OSS-Fuzz has zero argument parsers enrolled.** Probed by name against
<https://github.com/google/oss-fuzz/tree/master/projects>: **404 (not enrolled)** — `getopt`,
`argparse`, `cli11`, `docopt`, `argtable`, `popt`, `gflags`, `busybox`, `clap`. **200 (enrolled)** —
config/serialization parsers (`libconfig`, `tomlplusplus`, `yaml-cpp`, `libyaml`, `json-c`,
`jsoncpp`, `rapidjson`, `serde_json`, `pyyaml`, `inih`, `iniparser`, `augeas`) plus whole-program CLI
projects (`util-linux`, `systemd`, `curl`, `git`, `jq`, `libarchive`, `binutils`, `file`, `sqlite3`,
`coreutils`). And even the whole-program entries fuzz _data_, not argv: `util-linux`'s
`tools/oss-fuzz.sh` configures `--disable-all-programs --enable-libuuid --enable-libfdisk
--enable-libmount --enable-libblkid`, i.e. mount tables, blkid superblocks and fdisk labels.

**The pattern is consistent across the entire ecosystem: people fuzz the config/data parsers a CLI
reads, and never the argv parser.** Argv is treated as trusted input. For an agent-first CLI —
where argv is machine-generated and may well be malformed — that assumption is worth questioning,
but we should be honest that we'd be doing something the ecosystem does not do.

### 3.2 What clap does instead, and why it's the better idea anyway

`Command::debug_assert()` validates the **command tree itself** — a static self-consistency check of
the declared shape, run as an ordinary unit test. clap's stated philosophy: "Most error states are
handled as asserts under the assumption they are programming mistake and not something to handle at
runtime."

```rust
// examples/tutorial_derive/05_01_assert.rs
#[test]
fn verify_cli() {
    use clap::CommandFactory;
    Cli::command().debug_assert();
}
```

It catches duplicate short/long names, contradictory settings, missing `value_parser` config, and
ill-formed required/conflicts graphs — **exhaustively over the declared tree, rather than by
sampling inputs.** The docs are explicit that it will _not_ catch `ArgMatches` errors; "those will
need exhaustive testing of your CLI."

**This is the single highest-value, lowest-cost invariant check available**, and the pattern
generalises: any CLI framework with an introspectable command tree can have a "the tree is
self-consistent" test. For us it is §6 gate 17 and it is nearly free.

### 3.3 The one real cross-implementation parser conformance corpus: docopt

<https://github.com/docopt/docopt/blob/master/testcases.docopt> is a 957-line language-agnostic file
— a usage doc, then invocations with expected parse results as JSON, or the literal `"user-error"`:

```
r"""Usage: prog [options]

Options: --all  All.

"""
$ prog
{"--all": false}

$ prog --all
{"--all": true}

$ prog --xxx
"user-error"
```

The same file ships in `docopt.go` and `docopt.cpp`. **This is the closest existing thing to a
portable argument-parser conformance suite, and its format is directly stealable**: declare the
grammar, enumerate invocations, assert the parse _or_ the user-error. Note it shares toml-test's
property that negative cases need no detailed expectation.

### 3.4 Invariants worth property-testing, with the prior art for each

| Invariant                                                  | Prior art                                                                                          | How to enforce                                                                                                                                                                                                                                                                                                                                                            |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No input panics/crashes                                    | Fuzzing's classic; `flash-flags` `defer recover()`; every OSS-Fuzz target                          | ASAN/UBSAN under libFuzzer; `go test -fuzz`; `cargo-fuzz`                                                                                                                                                                                                                                                                                                                 |
| **Command tree is self-consistent**                        | **clap `debug_assert()`**                                                                          | Unit test; exhaustive over declared tree; near-zero cost                                                                                                                                                                                                                                                                                                                  |
| Unknown flag → nonzero exit, **stderr only, stdout empty** | docopt `"user-error"` cases; uutils compares stdout/stderr/code separately                         | Assert `stdout == ""` **and** `code != 0` — the stdout-empty half is the part people forget                                                                                                                                                                                                                                                                               |
| Parse latency bounded                                      | `flash-flags` asserts `< 500ms`                                                                    | Timing assertion inside the fuzz body                                                                                                                                                                                                                                                                                                                                     |
| Parsed values within declared domain                       | `flash-flags` port-range post-condition                                                            | Post-condition on the parsed struct, not on the exit code                                                                                                                                                                                                                                                                                                                 |
| `--help` exits zero, valid UTF-8, no ANSI under `NO_COLOR` | <https://no-color.org>; real leak bugs exist where SGR reset sequences survived `NO_COLOR=1`       | Regex `\x1b\[` over output with `NO_COLOR=1`; `str::from_utf8`                                                                                                                                                                                                                                                                                                            |
| Every subcommand in help is invocable                      | Weak prior art; failure mode documented (help advertising a removed command that fails at runtime) | Walk the introspected tree, invoke each with `--help`, assert exit 0 — the natural companion to `debug_assert()`                                                                                                                                                                                                                                                          |
| Exit code ∈ declared set                                   | uutils compares exit codes against GNU exactly                                                     | Enumerate allowed codes, assert membership on every invocation                                                                                                                                                                                                                                                                                                            |
| JSON output validates against schema for all inputs        | **No CLI-specific prior art found**; tooling exists (`ajv-cli`, `sourcemeta/jsonschema`)           | Pipe every generated invocation's stdout through a schema validator as the oracle                                                                                                                                                                                                                                                                                         |
| `--dry-run` / `read_only` performs no writes               | **No prior art found in any CLI project**                                                          | **Enforce, don't observe**: run under a sandbox and assert the write is _denied_. `strace -e trace=%file`, seccomp-BPF, bubblewrap `--ro-bind`, or <https://github.com/anthropic-experimental/sandbox-runtime>. Cheapest portable approximation is hashing a scratch dir before/after — but that misses writes _outside_ the dir, which is exactly the bug you care about |

### 3.5 Metamorphic testing of CLIs: a genuine, empty gap

Searching specifically for metamorphic relations applied to command-line tools returned **nothing**.
The metamorphic-testing literature (Chen et al.; <https://www.hillelwayne.com/post/metamorphic-testing/>)
is dominated by ML models, LLMs, scientific software and smart contracts; recent frameworks are
LLM-targeted.

The relations worth stating are all well-formed and, as far as could be determined, **implemented
nowhere as a named methodology**:

- **flag-order permutation invariance** — a textbook invariance MR: permuting independent flags must
  not change output;
- `--json` output contains the same facts as the human rendering;
- `-v -q` precedence is last-wins and total;
- `--` separator idempotence;
- short-flag bundling `-abc` ≡ `-a -b -c`;
- `--flag=x` ≡ `--flag x`.

`flash-flags` seeds `{"-abc", "value"}` and `{"-abc=value=more"}` but only asserts no-panic, not the
equivalence. **This is a defensible novelty claim for our kit**, and several of these relations are
cheap to check because they need no expected output — only that two invocations agree.

### 3.6 Differential testing: uutils/coreutils is the strong example

Three distinct layers, all worth studying.

**(a) GNU test suite conformance via `$PATH` swap.** The enabling fact is upstream design: per
Pádraig Brady's "How the GNU coreutils are tested"
(<https://www.pixelbeat.org/docs/coreutils-testing.html>), "the utilities under test are identified
using the `$PATH`. That allows one to swap in other implementations of these utilities, to test
conformity to the GNU coreutils implementation." **A conformance suite that resolves the
implementation through `$PATH` is trivially retargetable** — that is exactly the clispec
`clispec score mytool` model, and it's the right one.

uutils' `util/build-gnu.sh` exploits it, and the details are instructive:

1. Clone GNU coreutils as a sibling, apply local deltas via **quilt**.
2. Build uutils as a multicall binary, hardlink every applet name to it.
3. **Any GNU program uutils doesn't implement is replaced with `/bin/false`**, so its tests fail
   loudly rather than silently passing against the real C binary. _This is the anti-gaming move:
   an unimplemented feature must fail, not fall through to a reference implementation._
4. Rewrite `PATH=` in `tests/local.mk` and `Makefile`, neuter `check-am: all-am` so `make` doesn't
   rebuild the GNU binaries back over them, and `touch` the makefiles so automake doesn't regenerate.
5. Selectively disable: generated factor tests, and `tests/help/help-version.sh` with the honest
   comment "Not really interesting for us and logs are too big."

**(b) BusyBox test suite, same trick** — install the uutils multicall binary _as_ `busybox` and run
BusyBox's `runtest`. Two independent reference oracles for one implementation.

**(c) It is a regression gate, not a pass/fail gate.** `util/analyze-gnu-results.py` parses per-test
results into PASS/FAIL/SKIP/ERROR with a documented priority order, and `util/compare_gnu_result.py`
diffs against the previous run. **When you can't reach 100% conformance, track the delta and fail CI
on regression.** That is the same ratchet as §6 gate 20 and §7.5's expectation file.

**`uufuzz`** (<https://github.com/uutils/coreutils/tree/main/fuzz>) is published as a standalone
crate for "differential fuzzing… to compare any two implementations of command-line tools." Its core
API is worth copying verbatim in spirit:

```rust
compare_result(name, args, pipe_input, rust_result, gnu_result, fail_on_stderr_diff)
```

It compares **`stdout`, `stderr` and `exit_code` independently**, with `fail_on_stderr_diff` as a
knob because error _messages_ legitimately diverge while error _behaviour_ must not. That triple —
compared separately, with different strictness per stream — is the right shape for a CLI oracle and
maps directly onto our stdout/stderr separation principle.

Two honest caveats. First, the harness runs the utility **in-process** (dup'ing the real fds, piping,
`dup2`ing, reader threads via `thread::scope`, then calling `uumain(args)`) purely to make libFuzzer
throughput viable — a deliberate fidelity-for-speed trade we should _not_ copy in a conformance kit
(§1.3). Second, `fuzz_expr.rs` **ignores the fuzzer's bytes entirely** (`fuzz_target!(|_data: &[u8]|`)
and uses a hand-written grammar generator instead, discarding libFuzzer's coverage guidance. For
argv that trade is defensible — grammar validity matters more than coverage feedback — but it is
random generation wearing a fuzzer's clothes, and should be described as such.

### 3.7 Fuzzing harness practicalities for argv

If we do fuzz argv, the technique is well-established even if unused.

**AFL's `argv-fuzz-inl.h`**
(<https://github.com/AFLplusplus/AFLplusplus/blob/stable/utils/argv_fuzzing/argv-fuzz-inl.h>):
include it after standard includes in the file containing `main()`, then `AFL_INIT_ARGV();` at the
top of `main`. The wire format is precise:

- reads **NUL-delimited** input from stdin into `argv[]`;
- **two consecutive NULs terminate the array**;
- an empty parameter is encoded as a lone `0x02`;
- limits `MAX_CMDLINE_LEN 100000`, `MAX_CMDLINE_PAR 50000`.

A corpus file looks like `-r\x00-d\x008125\x00-p\x00ASW\x00\x00`. Variants: `AFL_INIT_SET0("prog")`
preserves `argv[0]`; `AFL_INIT_ARGV_PERSISTENT(buf)` for persistent mode. For binaries you can't
recompile, AFL++ ships `argvfuzz.so` loaded via `LD_PRELOAD`, hooking `__libc_start_main` — requires
dynamic linking and standard `crt1.o`, so it fails on static binaries.

**libFuzzer has no built-in argv mode**, and there's a common misreading worth flagging:
`LLVMFuzzerInitialize(int *argc, char ***argv)` gives you the _fuzzer's own_ argv once at startup —
it is for configuration, **not** per-input argv. Split the input yourself. Google's guidance
(<https://github.com/google/fuzzing/blob/master/docs/split-inputs.md>) recommends a 4- or 8-byte
magic separator (their example `{0xDE, 0xAD, 0xBE, 0xEF}`) located with `memmem`, because the
comparison is interceptable and the constant is auto-discovered into the dictionary. A single NUL
works but is a poor separator for libFuzzer's mutator.

### 3.8 Bottom line for our methodology

The ecosystem's revealed preference is: (1) a **static tree-consistency assert** à la
`Command::debug_assert()`; (2) **example/snapshot testing** via trycmd/snapbox or `CliRunner`; and
(3) **differential conformance** against a reference implementation when one exists.

True property-based testing of argv is close to nonexistent. The two artifacts most worth adapting
are **docopt's `testcases.docopt` format** (§3.3) and **uutils' `compare_result` triple** —
stdout, stderr and exit code, compared independently with per-stream strictness (§3.6). The
metamorphic relations of §3.5 are a real, unclaimed opportunity, and they are unusually cheap because
they require no expected output.

---

## 4. Conformance-kit architectures from other domains

This is the richest vein. The question — _how do you write a test suite that runs against an
arbitrary implementation and verifies it obeys a spec?_ — has been solved repeatedly, and the
solutions converge on a small set of architectural moves. Below, each suite is analysed on five
axes: **test representation**, **adapter contract**, **optional-feature handling**, **known-failure
handling**, **scoring**.

### 4.1 Summary table

| Suite                  | Tests are…                                          | Adapter contract                                                                | Optional features                                     | Known failures                         | Score                    |
| ---------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------- | -------------------------------------- | ------------------------ |
| WebAssembly spec tests | `.wast` scripts → **JSON manifest + `.wasm` files** | load a wasm file, invoke an export, observe trap/validation error               | separate proposal repos/branches                      | ad hoc per engine                      | none (binary)            |
| Web Platform Tests     | HTML/JS files + `testharness.js`                    | **product plugin**: `Browser`, `ExecutorBrowser`, `TestExecutor`                | test-level, plus per-product metadata                 | **`.ini` metadata files, out of tree** | wpt.fyi percentages      |
| Test262                | `.js` files + **YAML frontmatter**                  | eval a string, observe throw                                                    | **`features:` tag + curated `features.txt` registry** | runner-side skip lists                 | none (public dashboards) |
| toml-test              | **paired data files** (`.toml` + `.json`)           | **binary: stdin → stdout, nonzero exit on invalid**                             | per-version file manifests + `-toml=1.1`              | none                                   | pass/fail counts         |
| Maelstrom              | workload definitions (message vocab)                | **binary: JSON lines on stdin/stdout, logs on stderr**                          | workload selection                                    | none                                   | checker verdict          |
| JSON Schema Test Suite | **pure JSON data**                                  | ~50 lines of glue in-process                                                    | **`optional/` directory**                             | implementation's choice                | pass counts              |
| Kubernetes conformance | Go e2e tests tagged `[Conformance]`                 | a cluster + `sonobuoy`                                                          | **none permitted — that's the point**                 | none permitted                         | **binary certification** |
| OCI runtime-tools      | Go validation suite                                 | runtime CLI (`create`/`start`/…) + `config.json`, selected by `RUNTIME` env var | runtime-API selector (reserved)                       | —                                      | TAP output               |
| Schemathesis           | **generated from the schema**                       | a live HTTP endpoint + its OpenAPI doc                                          | derived from schema                                   | —                                      | check failures           |
| uutils vs GNU          | the _reference implementation's_ own suite          | drop-in binary replacement                                                      | —                                                     | tracked failure list                   | percentage               |

### 4.2 WebAssembly spec tests — compile the DSL away

Source: <https://github.com/WebAssembly/spec/tree/main/test/core>, format documented at
<https://github.com/WebAssembly/spec/tree/main/interpreter>.

Tests are `.wast` S-expression scripts with directives: `module` (three forms — textual,
`(module binary <string>*)`, `(module quote <string>*)`), `register`, actions `(invoke <name>?
<field> <const>*)` and `(get <field>)`, and assertions `assert_return`, `assert_trap`,
`assert_exception`, `assert_invalid`, `assert_malformed`, `assert_unlinkable`, `assert_exhaustion`.

**The architectural move that matters:** third-party engines do _not_ parse `.wast`. They run
`wast2json` (from wabt, <https://github.com/WebAssembly/wabt/blob/main/docs/wast2json.md>) which
lowers the whole suite to a dumb JSON manifest plus loose `.wasm` files on disk:

```json
{
  "source_filename": "i32.wast",
  "commands": [
    { "type": "module", "line": 3, "filename": "i32.0.wasm" },
    { "type": "assert_return", "line": 42,
      "action": { "type": "invoke", "field": "add", "args": [...] },
      "expected": [...] },
    { "type": "assert_trap", "line": 51,
      "action": {...}, "text": "integer divide by zero" },
    { "type": "assert_malformed", "line": 60,
      "filename": "i32.1.wasm", "text": "...", "module_type": "binary" }
  ]
}
```

Note `"All numeric values are stored as strings, since JSON numbers are not guaranteed to be precise
enough to store all Wasm values."` — the same defensive-serialization instinct as toml-test's tagged
values (§4.4).

An engine implementing conformance therefore needs only four capabilities: load a `.wasm`, invoke an
export with typed arguments, compare typed results, and distinguish trap/validation/decode failure.
That is a _tiny_ adapter surface, and it is why every engine (V8, SpiderMonkey, wasmtime, wasmer,
wasm3) actually runs the suite.

**Steal:** author tests in whatever expressive format you like, but **ship a lowered, boring
machine format** so implementers never have to implement your DSL. Feature gating in wasm is crude
(proposals live in forked `WebAssembly/<proposal>` repos with their own test dirs) — it works only
because the standards process is staged. Don't copy that part.

### 4.3 Web Platform Tests — expectations live with the implementation, not the suite

Docs: <https://web-platform-tests.org/>, runner design at
<https://web-platform-tests.org/tools/wptrunner/docs/design.html>, expectation format at
<https://web-platform-tests.org/tools/wptrunner/docs/expectation.html>.

wptrunner's design goal is stated as pushing "test scheduling as far as possible into the harness" so
it can monitor browser state and recover from crashes and hangs. Architecture:

- `TestLoader` reads the WPT **JSON manifest** plus **expectation data**, producing a queue of
  `(test, expected result)` pairs.
- `ManagerGroup` spawns `TestRunnerManager` threads, one per browser instance; each drives a child
  process holding a `TestRunner` that pulls from the shared queue.
- **The product/adapter layer** is what we care about. To add a browser you supply:
  - a `Browser` class — lifecycle (start/stop) and _state probing_ (is the process alive?),
  - an `ExecutorBrowser` — connection details the executor needs (ports, capabilities),
  - one or more `TestExecutor` subclasses, one per (control protocol × test type):
    `TestharnessExecutor`, `RefTestExecutor`, `WdspecExecutor`.

That's it. The docs describe the goal as "adding support for new platforms and browsers with minimal
code changes."

**The single most valuable idea in this whole survey is WPT's expectation model.** Known failures are
_not_ edits to the shared test corpus. They live in per-product metadata `.ini` files mirroring the
test tree:

```ini
[filename.html]
  type: testharness
  [Subtest name for failing test]
    expected: FAIL
  [Subtest name for erroring test]
    expected: ERROR
```

with platform conditionals and intermittent-status lists:

```ini
[filename.html]
  type: reftest
  expected:
    if os == "linux": TIMEOUT
    FAIL
```

`wpt update-expectations` regenerates these from real runs. Firefox keeps its metadata in
`testing/web-platform/meta`, and other browsers get their own directories
(`testing/web-platform/products/<product>`), so "differences are reported as unexpected results."

Consequences worth internalising:

1. The canonical suite stays canonical — nobody weakens a shared test to make their build green.
2. A reviewer can see the expectation file **grow** in a diff. That's a social gate on regressions,
   and it is _exactly_ the mitigation the snapshot-rot literature keeps asking for (§2).
3. Subtest granularity means one broken feature doesn't hide 40 passing ones.
4. Scoring is decoupled: wpt.fyi computes percentages from run results, not from the suite.

### 4.4 toml-test — the closest analogue to what we're building

<https://github.com/toml-lang/toml-test>

The adapter contract is a **plain binary and two pipes**:

> "Your decoder **must** accept TOML data on `stdin`. If the TOML data is invalid, your decoder
> **must** return with a non-zero exit code"

Encoders run the same contract in reverse (JSON in, TOML out). Tests are pure data:
`tests/valid/x.toml` paired with `tests/valid/x.json`; `tests/invalid/x.toml` with **no expected
file at all** — the nonzero exit _is_ the entire assertion. That asymmetry is elegant and we should
copy it: negative tests need no golden output, so they never rot.

Cross-language type fidelity is handled by a tagged JSON encoding:

```json
{ "type": "{TOML_TYPE}", "value": "{TOML_VALUE}" }
```

with types `string`, `integer`, `float`, `bool`, `datetime`, `datetime-local`, `date-local`,
`time-local`. This exists because JSON's own type model is too weak to distinguish what TOML
distinguishes — the same reason wast2json stringifies numbers. **Any conformance kit whose transport
is JSON needs to think about this**; for us it matters for integers vs floats, big integers, and
timestamps in `stdout_schema` validation.

Spec-version gating is done with file manifests: `tests/files-toml-1.0.0` and
`tests/files-toml-1.1.0` list which files run for which version, selected with `-toml=1.1`.
Reporting is per-category pass/fail counts (valid / encoder / invalid).

### 4.5 Maelstrom + Jepsen — history and checker, and stdout as protocol

<https://github.com/jepsen-io/maelstrom>, protocol at
<https://github.com/jepsen-io/maelstrom/blob/main/doc/protocol.md>

Maelstrom "runs many _nodes_, and a network which routes _messages_ between them," where the nodes
are instances of **an arbitrary binary you supply**. The contract:

- Messages arrive as JSON on **stdin**.
- Messages are written as JSON on **stdout** — and _nothing else is permitted on stdout_.
- **stderr is for logs**, captured to disk.

```json
{
  "src": "c1",
  "dest": "n1",
  "body": { "type": "echo", "msg_id": 1, "echo": "hi" }
}
```

Bodies carry reserved keys `type` (mandatory), `msg_id`, `in_reply_to`. Binding happens via an
`init` message carrying the node's assigned id and full cluster membership; the node replies
`init_ok`. Workloads (echo, broadcast, lin-kv, txn-list-append, …) define the message vocabulary for
a class of system.

Two architectural ideas to steal:

**(a) History + checker separation.** The harness generates load, injects a nemesis (partitions,
clock skew), and records a **history** of operations. Correctness is decided afterwards by a
**checker** that verifies the history against a formal model — Knossos for linearizability, and
Elle (<https://github.com/jepsen-io/elle>, paper: <https://arxiv.org/pdf/2003.10554>) for
transactional isolation. Maelstrom's checkers "can verify sophisticated safety properties up to
strict serializability, and generate intuitive, minimal examples of consistency anomalies." Elle
matters practically because "where KNOSSOS … often timed out or ran out of memory after a few
hundred transactions, ELLE was able to check histories of hundreds of thousands of transactions in
tens of seconds."

The generalisation for us: **don't assert directly on outputs inside test cases.** Record a
structured history of every invocation and run rule-checkers over it. Payoff is large — see §7.3.

**(b) Protocol-as-enforcement (tier 1.5).** Because stdout is exclusively the wire, a library that
prints a debug line corrupts the protocol and the run fails immediately. Maelstrom didn't need a
lint rule or a style guide for "don't print to stdout"; it made stdout structurally unavailable for
anything else. Our spec's principle 3 (_data to stdout, everything else to stderr_) can get the same
treatment whenever `--output json` is in effect.

Jepsen's binding model for real databases (<http://jepsen.io>) is the same shape one level up: you
implement a small `Client` protocol (open/setup/invoke/teardown/close), and generators + nemesis +
checker are supplied by the framework.

### 4.6 Test262 — a curated feature registry is the anti-gaming device

<https://github.com/tc39/test262>, interpretation rules at
<https://chromium.googlesource.com/external/github.com/tc39/test262/+/HEAD/INTERPRETING.md>

Each test file carries YAML frontmatter delimited by `/*---` and `---*/`; exactly one per test:

```js
/*---
description: Array.prototype.at returns the element at the given index
esid: sec-array.prototype.at
includes: [compareArray.js]
flags: [onlyStrict]
features: [Array.prototype.at]
---*/
```

- `description` (required) and `esid` (required for new feature tests).
- `includes:` names harness files from `harness/` to evaluate first — this is the shared-helper
  mechanism, and it keeps tests short without a bespoke DSL.
- `flags:` — `onlyStrict`, `noStrict`, `module`, `raw` (no harness at all), `async`, `generated`,
  `CanBlockIsFalse` / `CanBlockIsTrue`, `non-deterministic`.
- `negative: {phase: parse|resolution|runtime, type: <ErrorConstructor>}` for expected-failure tests:

```js
/*---
negative:
  phase: runtime
  type: ReferenceError
---*/
unresolvable;
```

- `features:` — the capability tags. Runners (e.g. `test262-harness --features=...`) use these to
  skip tests for features an engine hasn't implemented.

**The critical detail is `features.txt`** (<https://github.com/tc39/test262/blob/main/features.txt>):
a _canonical, centrally curated registry_ of legal feature names, organised into three sections —
proposed language features (Stage 3 TC39 proposals: `decorators`, `ShadowRealm`, `import-defer`),
standard language features already published in ECMA-262 (`Array.prototype.at`, `Promise.any`,
`optional-chaining`), and test-harness features (`IsHTMLDDA`, `host-gc-required`). The header states
tests "should be annotated with a dedicated feature flag so that consumers may more easily omit them
as necessary."

Why this resists gaming: a feature name is not something an implementation invents. It is admitted to
the registry by the standards body, and features _graduate_ from proposed to standard. Once
something is standard, skipping it is publicly visible on engine dashboards. Test262 itself produces
no score — enforcement is entirely social, via public per-engine reporting.

### 4.7 Kubernetes conformance — the strictest anti-gaming design found

Program: <https://www.cncf.io/training/certification/software-conformance/>; test admission criteria:
<https://github.com/kubernetes/community/blob/master/contributors/devel/sig-architecture/conformance-tests.md>

The certification rule is blunt: **a valid certification run may not skip any conformance tests.**
Runs require `E2E_FOCUS=[Conformance]` with no `E2E_SKIP`, executed via
`sonobuoy run --mode=certified-conformance` (required since Kubernetes v1.16 / Sonobuoy v0.16 —
without it, "tests which may be disruptive to your other workloads may be skipped"). And critically,
anyone can re-run "the identical open source conformance application that was used to certify."

The optional-feature problem is solved **at test-admission time, not at run time.** A test may only
be tagged `[Conformance]` if:

> "it tests only GA, non-optional features or APIs (e.g., no alpha or beta endpoints, no feature
> flags required, no deprecated features)"
>
> "it works for all providers (e.g., no `SkipIfProviderIs`/`SkipUnlessProviderIs` calls)"
>
> "it limits itself to capabilities exposed via APIs … and does not require write access to system
> namespaces"
>
> "it does not require direct access to kubelet's API to pass"
>
> "it works without access to the public internet"
>
> "it works without non-standard filesystem permissions granted to pods"
>
> "it does not rely on any binaries that would not be required for the linux kernel or kubelet to run"
>
> "it is stable and runs consistently (e.g., no flakes), and has been running for at least two weeks"
>
> "it has a name that is a literal string"

Promotion is a deliberate governance act: a PR titled "Promote xxx e2e test to Conformance" using
`framework.ConformanceIt()` with `Release` / `Testname` / `Description` metadata written with RFC2119
keywords. For scale: a v1.16 test image held over 4000 tests, of which only **215** were conformance
tests.

**Steal the shape:** a _small_ mandatory core, admitted under strict universality criteria, that
nobody may skip — plus everything else living outside the certification boundary. The admission
criteria document is the real governance artifact, more than the tests themselves.

### 4.8 OCI runtime-tools — name and version your adapter surface

<https://github.com/opencontainers/runtime-tools>

The validation suite drives an arbitrary runtime through the OCI Runtime **command-line interface**
(`create`, `start`, `kill`, `delete`, plus a `config.json` bundle), with the runtime binary selected
by a `RUNTIME` environment variable. Results are emitted as TAP (node-tap). Notably the docs are
explicit that runtime validation "currently only supports the OCI Runtime Command Line Interface" and
that "if support for alternative APIs is added in the future, runtime validation will gain an option
to select the desired runtime API."

That explicitness is the lesson: **name the adapter surface, version it, and reserve room for a
second one.** Also note the split between `oci-runtime-tool generate` (produce a valid input) and
`oci-runtime-tool validate` (check an artifact) — a generator and a validator built from the same
spec, which is the same single-source-of-truth idea as §5.5.

### 4.9 API/contract testing — generate the tests from the declaration

- **Dredd** (<https://dredd.org>) replays the examples embedded in an API description against a live
  service. Simple, and directly analogous to running each command's declared `example`.
- **Schemathesis** (<https://schemathesis.readthedocs.io>) is the important one. It _generates_ test
  cases from an OpenAPI/GraphQL schema using Hypothesis property-based testing, and applies a set of
  **generic checks to every generated request**: `not_a_server_error`, `status_code_conformance`,
  `content_type_conformance`, `response_schema_conformance`, `response_headers_conformance`. It is
  stateful — it "learns from server responses, threads real values into later requests." Binding is
  trivial: `uvx schemathesis run https://example.schemathesis.io/openapi.json`.

  **This is the highest-leverage idea for our kit.** If a CLI declares its surface (`schema`
  subcommand, per-command `args`, `stdout_schema`, `errors[].exit_code`), then a large body of
  conformance testing is _derivable_ rather than authored: generate inputs from the declared arg
  types, and apply universal checks (exit code ∈ declared set, stdout parses, stdout validates
  against `stdout_schema`, error envelope validates, nothing on stdout in error paths).

- **Pact** (<https://docs.pact.io/provider>) contributes the _gate_ concept rather than the test
  format: consumers publish contracts to a broker, providers verify and publish results back, and
  `can-i-deploy` is "the final gate before deployment in a CI/CD pipeline," checking that all
  consumer contracts have been verified. The CLI analogue: a release is blocked unless the new
  schema is verified compatible with recorded consumer usage.
- **Breaking-change detection** on declared surfaces is mature prior art: `oasdiff`
  (<https://github.com/oasdiff/oasdiff>) claims **509 distinct change classifications**, breaking and
  non-breaking, "across every part of the OpenAPI spec"; `buf breaking --against <past-version>`
  (<https://buf.build/docs/breaking/>) does the same for protobuf and surfaces failures as PR
  comments; GraphQL Inspector groups changes by criticality (Breaking / Dangerous / Safe); Sentry
  runs `json-schema-diff` on `sentry-kafka-schemas` to annotate PRs.

### 4.10 Differential conformance — uutils vs GNU coreutils

<https://github.com/uutils/coreutils> runs **the GNU coreutils test suite itself** against the Rust
reimplementation in CI (GitHub Actions + build/run scripts) and publishes a pass rate: 645 of 690
tests at v0.10, **93.48%**.

The honest wrinkle is instructive for scoring design: when the GNU reference moved 9.9 → 9.10 and
added 19 tests, the _percentage fell while the absolute number of passing tests rose_. Earlier
releases were reported at 96.28% and 94.74% against different reference versions — the numbers are
not comparable across time. **A percentage against a moving denominator is a bad gate.**

### 4.11 Scoring models compared

| Model                            | Examples                   | Verdict                                                                                                                                                                                  |
| -------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Binary certification**         | Kubernetes/CNCF, POSIX/SUS | Strongest signal, but only viable if the mandatory core is genuinely universal — which forces the spec to be conservative. Anyone can re-run it, which is what makes the claim credible. |
| **Percentage**                   | wpt.fyi, uutils-vs-GNU     | Excellent as a _progress and pressure_ instrument. Bad as a gate: moving denominators, and it rewards farming easy tests.                                                                |
| **Score with a binary pass bar** | Acid3                      | Acid3's _actual_ pass criterion was binary and strict (default settings, smooth animation, 100/100, and pixel-exact match to a reference rendering). The 0–100 number was a diagnostic.  |
| **Tiered levels**                | rare in practice           | Little successful prior art found.                                                                                                                                                       |

Acid3 also supplies the cautionary tale about publishing a number: the percentage "does not represent
an actual percentage of conformance as the test does not really keep track of the subtests that were
actually started (100 is assumed)," and it was criticised as "a cherry-picked collection of features
that were rarely used." Eric Meyer: _"a showpiece, and something of a Potemkin village at that."_

**Conclusion: binary gate on a mandatory core; percentage as a diagnostic only, never as the headline
claim.**

### 4.12 Test representation: data beats code, decisively

Every suite designed to be run _by third parties against their own implementation_ uses declarative
data: `.wast` → JSON, toml-test's paired files, JSON Schema Test Suite's JSON arrays, Test262's JS +
frontmatter, WPT's files + `.ini` metadata, testscript's txtar archives. The one imperative suite in
the survey — Kubernetes e2e in Go — survives because the project owns both the suite and the
canonical implementation, and even there the _certification_ wrapper (Sonobuoy) is a black box that
just runs it.

For a kit meant to run against anyone's binary in any language: **tests must be data plus a small
generic runner.** The JSON Schema Test Suite is the extreme and it works — implementations write
roughly fifty lines of glue:

```json
[
  {
    "description": "The test case description",
    "schema": { "type": "string" },
    "tests": [
      {
        "description": "a test with a valid instance",
        "data": "a string",
        "valid": true
      }
    ]
  }
]
```

Its optional-feature mechanism is likewise minimal: an `optional/` subdirectory holding "tests that
are considered optional," including "those applicable only to languages with particular
capabilities," alongside `proposals/` for volatile in-flight keywords and a `latest/` symlink for
version pinning. Cheap and effective — but note it is _implementation choice_, not declaration-driven,
so it permits quiet opt-out with no visibility. That's the gap our capability model must close.

### 4.13 The CLI-specific space is nearly empty

Searching for CLI conformance tooling turns up very little. The one directly relevant artifact is
**The CLI Spec** at <https://clispec.dev/> (v0.3 candidate, August 2026) with a `clispec` binary
(`cargo install clispec`; `clispec score mytool`) that "scores a binary on your `$PATH` against the
runtime half of the checklist." Its structure is already the right shape and is analysed as our
baseline in §7.

Beyond that: <https://clig.dev> (Command Line Interface Guidelines) is pure tier 3 — good prose,
zero enforcement. `bmabey/clispec` on GitHub is an unrelated, abandoned Ruby/Cucumber helper.
`markdown-clitest` (<https://github.com/unboundedsystems/markdown-clitest>) tests CLI commands
embedded in Markdown docs — a narrow but real doc-freshness tool.

**Honest assessment: there is no established CLI conformance-kit prior art. Everything useful has to
be imported from other domains.** That's an opportunity, not a warning — the domains above have
converged hard enough that the design is fairly well determined.

---

## 5. Tier-1: type-level and API-shape enforcement

### 5.1 Typestate — the load-bearing technique

Canonical write-up: <http://cliffle.com/blog/rust-typestate/>. The pattern encodes an object's
runtime state in its compile-time type so that operations exist only in the states where they're
legal:

```rust
use std::marker::PhantomData;

enum Start {}
enum Headers {}
trait ResponseState {}
impl ResponseState for Start {}
impl ResponseState for Headers {}

struct HttpResponse<S: ResponseState> {
    state: Box<ActualResponseState>,
    marker: PhantomData<S>,
}

impl HttpResponse<Start> {
    fn status_line(self, code: u16) -> HttpResponse<Headers> { /* Start → Headers */ }
}

impl HttpResponse<Headers> {
    fn header(&mut self, key: &str, value: &str) { /* only in Headers */ }
}
```

Stated costs: boilerplate (a state type + impl block per state), awkwardness inside loops when you
must regenerate the value (mitigated with `&mut self`), reliance on move semantics ("very difficult
to implement" in most other languages), and needing sealed traits to stop users adding their own
states. Real-world users include embedded-hal pin configurations and HTTP builders.

### 5.2 Builders that require declarations

`bon` (<https://bon-rs.com>) states it plainly: builders "use the typestate pattern to ensure all
required parameters are filled, and the same setters aren't called repeatedly to prevent
unintentional overwrites." `typed-builder` and `derive_builder` occupy the same space; in TypeScript
the equivalent is parameterising the builder type by the set of supplied keys so `build()` only
exists on the fully-populated instantiation.

**Application to our framework.** The spec says _"Every command declares `description` and
`effects`"_ and _"`data` commands declare `cardinality` and describe output via `output_fields`,
`stdout_schema`, or both."_ Today those are tier-2 schema-validation rules. With a typestate builder
they become tier 1:

```rust
// register() does not exist until effects AND output have been declared.
let cmd = Command::new("services list")
    .description("List services")
    .effects(Effects::ReadOnly)          // NoEffects -> HasEffects
    .data(Cardinality::Unbounded)        // NoOutput  -> HasOutput<Data>
    .stdout_schema(schema_for!(Service)) // required by HasOutput<Data> + Unbounded
    .pagination(Pagination::cursor("--cursor", "--limit"))
    .register(&mut app);                 // only compiles in <HasEffects, HasOutput>
```

Omitting `.effects(...)` is then a compile error, not a lint, not a failing test. Same for
`.pagination(...)` on an `Unbounded` data command — the spec rule _"`unbounded` commands require
`pagination` with specific argument declarations plus `fields_arg`"_ is expressible in the type
parameters.

**Limit to be honest about:** this only covers commands registered statically. Plugin-loaded or
config-driven commands drop to tier 2 by necessity.

### 5.3 Making stdout unreachable except through a checked emitter

The reference implementation is **cargo's `Shell`** (`cargo::core::shell::Shell`,
<https://docs.rs/cargo/latest/cargo/core/shell/struct.Shell.html>): an abstraction over console
output that remembers verbosity and colour preferences, exposes `out()` / `err()` accessors that
handle clearing progress-bar lines, and — the detail that matters most for testing — wraps its
writer so output can be redirected to an in-memory buffer. Centralising output is what makes output
_assertable_.

Centralisation is only tier 3 unless something stops people bypassing it. The available enforcement
across ecosystems:

| Language   | Mechanism                                                                                                      | Notes                                                                                                                                                                                                           |
| ---------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rust       | `clippy::print_stdout`, `clippy::print_stderr`, `clippy::dbg_macro`                                            | restriction lints; set workspace-wide: `[workspace.lints.clippy] print_stdout = "deny"`. Beware <https://github.com/rust-lang/rust-clippy/issues/6610> (crate-level attrs vs clippy config).                    |
| Go         | `forbidigo` (<https://github.com/ashanbrown/forbidigo>) via golangci-lint                                      | default pattern `^(fmt\.Print(\|f\|ln)\|print\|println)$`; configurable message, e.g. "Use the emitter, not fmt.Print". `depguard` covers package-level bans.                                                   |
| Python     | ruff `T201` "print found" (<https://docs.astral.sh/ruff/rules/print/>), from flake8-print (also `T203` pprint) | ruff's own docs concede "print statements used to produce output as part of a command-line interface program are not typically a problem" — so scope the rule to library modules and exempt the emitter module. |
| TypeScript | eslint `no-console`                                                                                            | plus the capability-object pattern below.                                                                                                                                                                       |

These are **tier 1.5 at best** — a lint is CI-enforced, therefore skippable with an allow attribute.
The genuinely tier-1 version is the **object-capability / no-ambient-authority** discipline: a
handler receives an `Emitter` capability and has no other route to the terminal. In capability
languages, "only allow the import of IO-providing functions at the entry point of a module, which are
then passed along as arguments until they get called," and "a component begins with no capabilities,
and any capability it possesses must be declared as a typed import." In a normal language this is
dependency injection with the globals lint-banned — "the capability approach essentially becomes
dependency injection, which is what languages without effect systems use as a workaround."

**And the strongest move of all is protocol design (§4.5).** In `--output json` mode, if the
conformance runner parses the _entire_ stdout stream as JSON/NDJSON, a stray print is a hard parse
failure. That is Maelstrom's trick, and it costs nothing to adopt.

### 5.4 Errors that cannot exist without a code and an exit code

Make the obligation part of the type:

```rust
#[non_exhaustive]
pub enum ErrorKind { NotFound, Conflict, TtyRequired, ConfirmationRequired, /* … */ }

pub trait CliError: std::error::Error + 'static {
    fn kind(&self) -> ErrorKind;      // stable machine-readable identifier
    fn exit_code(&self) -> ExitCode;  // 1..=255, drawn from the declared set
    fn retryable(&self) -> bool;
}
```

An error type that doesn't supply a kind and exit code simply cannot be returned from a handler. This
makes the spec rules _"Exits with declared error-kind codes"_ and _"Every error kind declares an
`exit_code`"_ structural. Prior art: cargo's own `CliError` bundles an error with an `exit_code`
field (<https://doc.rust-lang.org/stable/nightly-rustc/cargo/util/errors/struct.CliError.html>), and
the `proc-exit` crate (<https://github.com/rust-cli/proc-exit>) provides an i32 newtype covering
valid exit codes and signal exits.

**Important subtlety about `#[non_exhaustive]`.** Rust error-design guidance says to "mark all your
enums as `#[non_exhaustive]` so that you can add variants backwards compatibly" (RFC 2008,
<https://rust-lang.github.io/rfcs/2008-non-exhaustive.html>), and error types are cited as its most
common use. But `#[non_exhaustive]` _removes_ exhaustiveness checking for downstream crates — "the
struct, enum or enum variant must be matched non-exhaustively … downstream users will need to use the
`_` pattern." So: mark the public enum `#[non_exhaustive]` for evolvability, **and** keep an internal
exhaustive `match` in the crate that maps every kind to an exit code and a schema entry. Adding a
kind without wiring it up then fails to compile in-crate while remaining semver-friendly outside.
TypeScript's equivalent is a discriminated union with the `assertNever` idiom; Kotlin/Swift use sealed
types.

### 5.5 Single-source-of-truth codegen: drift becomes impossible

`clap`'s derive produces one `Command` tree from which parsing, `--help`, shell completions
(`clap_complete`) and man pages (`clap_mangen`) are all generated — "both approaches use `Command`
metadata and `ValueHint`," so help/completion/parsing drift is structurally impossible rather than
merely tested for.

Extending the same tree to emit the `schema` subcommand converts several spec rules from tier 2 to
tier 1 outright:

- _"Referenced arguments appear in `args` or `global_args`"_ — trivially true if both are projections
  of one tree.
- _"`commands` array is flat with full space-separated paths as `name` values"_ — a rendering choice
  of the emitter, not a thing an author can get wrong.
- _"Root `--help` mentions the `schema` subcommand"_ — the help renderer emits it because the
  subcommand is in the tree.

This is the same generator/validator symmetry seen in OCI's `oci-runtime-tool generate` /
`validate` (§4.8).

### 5.6 Regression-testing tier 1 itself: compile-fail tests

A tier-1 guarantee that isn't tested can be silently lost in a refactor. **trybuild**
(<https://github.com/dtolnay/trybuild>) tests that bad code _fails to compile_, with the expected
diagnostic:

```rust
#[test]
fn ui() {
    let t = trybuild::TestCases::new();
    t.compile_fail("tests/ui/*.rs");
}
```

`tests/ui/missing_effects.rs` contains a command built without `.effects(...)`;
`tests/ui/missing_effects.stderr` holds the expected rustc output. `TRYBUILD=overwrite cargo test`
regenerates the `.stderr` files — and the docs warn to "always review changes with `git diff`,"
because these are golden files with all the rot risks of §2.

The framework should ship a `tests/ui/` case for **every** tier-1 claim it makes.

### 5.7 Cheap validation that feels like tier 1

`clap` exposes `Command::debug_assert()`, which runs clap's internal `_debug_asserts` over the entire
command tree (duplicate/conflicting argument ids, arguments conflicting with themselves, malformed
groups) "in a way convenient for running as a test." One three-line test validates the whole CLI
definition:

```rust
#[test]
fn verify_cli() {
    use clap::CommandFactory;
    Cli::command().debug_assert();
}
```

This is the pattern to copy for our schema: a single `#[test]` that asserts the generated schema is
internally consistent and valid against the spec's JSON Schema. Cost: near zero. Coverage: the entire
declared surface.

### 5.8 Where tier 1 fails

- **Runtime-dynamic surfaces.** Plugins, config-defined commands, dynamically discovered subcommands
  — all unreachable by the type system.
- **Semantic claims.** No type can prove a command is genuinely `read_only`, `idempotent`, or that it
  flushes incrementally. Those need falsification tests (§7.4).
- **Ergonomic tax.** Typestate produces generic-heavy signatures and poor error messages; the
  cliffle post concedes the boilerplate and loop awkwardness, and heavy type-level programming hurts
  compile times and IDE experience.
- **Cross-language reach is nil.** Tier 1 lives inside one framework in one language. A conformance
  kit that must accept any binary in any language can only ever offer tier 2 — which is precisely why
  the framework and the kit are two separate deliverables with different enforcement ceilings.

---

## 6. A concrete CI gate list

Ordered roughly by value-per-unit-effort. "Tier" is the tier the gate _achieves_ for the invariant.

| #   | Gate                                             | Tier | Catches                                                                | Implementation                                                                                                                                                                                                                                                                                                                                                                                          |
| --- | ------------------------------------------------ | ---- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Schema validity**                              | 2    | Malformed self-description                                             | `tool schema \| check-jsonschema --schemafile clispec-v0.3.json -`                                                                                                                                                                                                                                                                                                                                      |
| 2   | **Schema diff vs last release**                  | 2    | Silent breaking changes to the CLI surface                             | Publish `schema.json` as a release artifact; `clispec diff --against <last-tag>`. Model classifications on oasdiff/buf: removed command, removed/renamed flag, changed `exit_code` for a kind, narrowed enum, `effects` widened, `cardinality` changed, `stdout_schema` field removed                                                                                                                   |
| 3   | **Every declared command is invocable**          | 2    | Schema/implementation drift — the #1 rot risk of a self-describing CLI | Walk `commands[]`, run each declared `example` in a sandbox, assert exit 0 and stdout validates against `stdout_schema`                                                                                                                                                                                                                                                                                 |
| 4   | **Exit code ∈ declared set**                     | 2    | Undeclared failure modes                                               | _Universal check on every invocation the suite makes_, not a dedicated test (Schemathesis pattern)                                                                                                                                                                                                                                                                                                      |
| 5   | **stdout/stderr separation**                     | 1.5  | Stray prints, progress bars on stdout, log leakage                     | In `--output json`, parse the _whole_ stdout stream; any unparseable byte fails. Assert stderr is non-empty only where diagnostics are expected                                                                                                                                                                                                                                                         |
| 6   | **Every declared error kind has a fixture**      | 2    | Declared-but-unreachable error kinds                                   | Require `tests/errors/<kind>.txtar` per declared kind; fail when a kind has no fixture. (Coverage-of-declarations — cheap, and it makes over-declaring costly)                                                                                                                                                                                                                                          |
| 7   | **Non-interactive safety**                       | 2    | Hangs — the worst agent-facing failure                                 | Run every example with stdin closed (`</dev/null`), no TTY, and a hard timeout. Any hang or prompt fails. Directly enforces "never block on input without a TTY"                                                                                                                                                                                                                                        |
| 8   | **No ANSI when suppressed**                      | 2    | Colour codes poisoning machine-read output                             | Run with `NO_COLOR=1`, `TERM=dumb`, non-TTY; assert zero ESC bytes in stdout and stderr                                                                                                                                                                                                                                                                                                                 |
| 9   | **Help freshness**                               | 2    | Docs/help drift                                                        | Snapshot `--help` for every command (trycmd/testscript). **Pin terminal width explicitly** (clap `.term_width(N)`, or `COLUMNS` + a `--width` flag) — unpinned width is the #1 cause of help snapshots that pass locally and fail in CI (§1.4). Plus an `embedme --verify`-style check that README-embedded usage matches real output                                                                   |
| 10  | **Completion generation**                        | 2    | Accidental surface change; broken completions                          | Generate bash/zsh/fish completions, assert byte-identical to committed files, and smoke-test that each shell can source its file without error                                                                                                                                                                                                                                                          |
| 11  | **Determinism**                                  | 2    | Hidden nondeterminism                                                  | Run every example twice and diff. Then re-run under a different `$PWD`, `$HOME`, `$TZ`, `LC_ALL`, hostname and `COLUMNS`; post-redaction outputs must be identical. Borrows the reproducible-builds framing (<https://reproducible-builds.org>, `SOURCE_DATE_EPOCH`) — determinism as a _tested property_, not a snapshot annoyance                                                                     |
| 12  | **Effects honesty (`read_only`)**                | 2    | The most lie-prone declaration                                         | Run `read_only` examples under a sandbox with the workspace read-only — `bwrap --ro-bind` / `--ro-overlay`, optionally `strace -e trace=open,openat,creat,unlink,rename` — and fail on any write attempt. Portable fallback: hash the temp `$HOME`/`$CWD` tree before and after and require equality. Honest caveat: bubblewrap is Linux-only; macOS needs a container or the deprecated `sandbox-exec` |
| 13  | **Idempotence check**                            | 2    | False `idempotent` declarations                                        | Run twice; second run must exit 0 and leave identical state ("`idempotent` commands exit zero when state already matches")                                                                                                                                                                                                                                                                              |
| 14  | **Snapshot hygiene**                             | 2    | Dead and auto-written snapshots                                        | `cargo insta test --unreferenced=reject` (values: `ignore`, `warn`, `reject`, `delete`, `auto` — `auto` = reject in CI, delete locally); run CI with `INSTA_UPDATE=no` / `jest --ci` so no snapshot is ever _written_ in CI                                                                                                                                                                             |
| 15  | **Compile-fail suite**                           | 1    | Silent loss of tier-1 guarantees                                       | `trybuild` `tests/ui/*.rs` — one case per tier-1 claim                                                                                                                                                                                                                                                                                                                                                  |
| 16  | **Output-discipline lints**                      | 1.5  | Direct printing bypassing the emitter                                  | `clippy::print_stdout = "deny"` / `forbidigo` / ruff `T201` / eslint `no-console`, scoped to exempt the emitter module                                                                                                                                                                                                                                                                                  |
| 17  | **Definition self-check**                        | 2    | Internally inconsistent CLI definition                                 | One unit test: `Cli::command().debug_assert()` plus schema-vs-spec validation                                                                                                                                                                                                                                                                                                                           |
| 18  | **API semver check** (library-shaped frameworks) | 2    | Accidental breaking changes to the framework API                       | `cargo-semver-checks` — Trustfall queries over rustdoc JSON, "many dozens" of lints; CI via `obi1kenobi/cargo-semver-checks-action@v2`                                                                                                                                                                                                                                                                  |
| 19  | **Conformance score published**                  | —    | Regression in overall standing                                         | Binary gate on the Core profile; percentage published as a PR artifact only (never the gate — §4.11)                                                                                                                                                                                                                                                                                                    |
| 20  | **Expectation-file ratchet**                     | 2    | Quietly growing known-failure lists                                    | The per-implementation expectations file may only shrink; growth requires an explicit override commit                                                                                                                                                                                                                                                                                                   |

Three cross-cutting rules for how these gates are written:

**Universal invariants, not per-command tests.** Gates 4, 5, 8 and 11 are checked on _every
invocation the suite performs_, not as standalone tests. That is the Schemathesis design (§4.9) and
it is enormously more efficient than authoring a test per rule per command.

**Compare the triple, with per-stream strictness.** uutils' `compare_result(name, args, stdin,
actual, expected, fail_on_stderr_diff)` compares **stdout, stderr and exit code independently**,
with a knob for stderr because error _messages_ legitimately diverge while error _behaviour_ must not
(§3.6). Our oracle should have the same shape. In particular, the "unknown flag" check has two
halves and people only ever write one: `exit != 0` **and** `stdout == ""`.

**Never let a snapshot stand alone.** Every golden-file assertion in the suite must be accompanied
by at least one hand-written assertion — exit code, a required substring, schema validity — so that a
blind re-approval still trips something (§2.6). This is the cheapest available mitigation for
snapshot blindness and it costs one line per case.

---

## 7. Implications for our conformance kit

### 7.1 The adapter contract is our structural advantage

WPT needs a browser plugin per product; Jepsen needs a `Client` implementation; OCI needs a runtime
CLI shim. **We need nothing.** The implementation under test is already a process with a universal
interface: argv in, stdout/stderr/exit code out. Combined with a mandatory `schema` subcommand, the
adapter contract is:

> A conformant tool is a binary on `$PATH` that (a) responds to `<tool> schema` with JSON valid
> against the clispec schema, requiring no authentication, configuration or network access, and
> (b) accepts the invocations that schema declares.

That's toml-test's contract ("your decoder must accept TOML data on stdin … must return with a
non-zero exit code") with a discovery step bolted on. It is the simplest adapter surface in the
entire survey, and it means a Python CLI, a Go CLI and a shell script are all testable by the same
runner with zero per-language glue. Follow OCI's example and **name and version this surface** —
call it the _clispec runtime adapter v1_ — so a future non-CLI transport can be added without
ambiguity.

### 7.2 Two-layer conformance, with the core genuinely unskippable

The spec already has the right shape — **Core conformance** (universal) and **Capability
conformance** (conditional on declarations). Kubernetes tells us how to keep the core credible:
admit a rule to Core only if it is universal, non-flaky, requires no optional feature, works
everywhere, and needs no privileged access. Then make Core **unskippable**: no declaration exempts a
tool from it, and `clispec score --strict` refuses to honour any expectation file.

Keep Core small. Kubernetes ships 215 conformance tests out of 4000+ e2e tests. A Core profile of a
few dozen rules that _no honest tool can fail for environmental reasons_ is worth more than a
hundred that need caveats.

### 7.3 Record histories; make rules into checkers

Steal Jepsen/Maelstrom's separation. The runner should not embed assertions in test cases. It should:

1. **Execute** invocations (from declared `example`s, from authored cases, and from generated inputs).
2. **Record** a history — one JSON record per invocation:

```json
{
  "id": 41,
  "command": "services list",
  "argv": ["mytool", "services", "list", "--output", "json"],
  "env": { "NO_COLOR": "1", "TERM": "dumb" },
  "cwd": "/tmp/clispec-XXXX/work",
  "stdin": null,
  "tty": false,
  "stdout": "...",
  "stderr": "...",
  "exit_code": 0,
  "duration_ms": 84,
  "time_to_first_byte_ms": 12,
  "fs_hash_before": "sha256:…",
  "fs_hash_after": "sha256:…"
}
```

3. **Check** the history with independent rule-checkers, each mapping to a spec clause.

Why this matters concretely:

- Adding a spec rule requires **no new test cases** — it's a new checker over existing histories.
- Histories from a prior release can be **re-checked** against a newer spec version.
- Third parties can submit histories without running our runner; the kit becomes auditable.
- Universal invariants (§6 gates 4, 5, 8, 11) apply to every record for free.
- `time_to_first_byte_ms` and `fs_hash_*` in the record are what make the _semantic_ declarations
  falsifiable (§7.4) — capture them from the start, because you cannot retrofit them into old
  histories.

### 7.4 The anti-gaming design for capability declarations

The prior art offers three distinct mechanisms and we need all three, because each covers a
different failure.

**(a) Declarations buy obligations, not just exemptions.** This is already the spec's shape and it is
the right one. Declaring `read_only` doesn't merely skip the mutation tests — it _adds_ the sandbox
test. `unbounded` adds pagination and `fields_arg` requirements. `non_idempotent` forces an
`idempotency_key_arg` or documented retry concerns. `opaque` still requires structured failures. The
result is that **no declaration is strictly cheapest**, so "declare nothing, pass everything" isn't
available. Contrast the JSON Schema Test Suite's `optional/` directory (§4.12), which _is_ a free
opt-out — that's the model to avoid.

**(b) Falsify the cheap-to-lie-about declarations.** For each semantic claim, run a test designed to
disprove it:

| Declaration                | Falsification test                                                                                                                                              |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `effects: read_only`       | Execute under a read-only sandbox / hash the tree before and after                                                                                              |
| `effects: idempotent`      | Run twice; second run must exit 0 with identical resulting state                                                                                                |
| `output_kind: stream`      | Attach a slow consumer and measure time-to-first-record; a batch implementation that buffers everything fails ("emit one record per line, flushed as produced") |
| `cardinality: single`      | Assert the output is not an array/stream                                                                                                                        |
| `requires_tty: false`      | Run with no TTY and stdin closed under a timeout; must not hang                                                                                                 |
| `errors[].retryable: true` | Re-invoke after the error; must not compound state                                                                                                              |
| `stdout_schema` present    | Validate every recorded stdout against it, across _all_ histories, not just the example                                                                         |

**(c) Publish the declaration profile alongside the score.** Test262 and wpt.fyi do more enforcement
through public dashboards than through any harness rule. A report that reads _"Core: PASS. Declared
2 of 40 commands as `data`; 38 declared `opaque`"_ makes evasive declarations legible to a human
reviewer in one line. **Scoring must report shape, not just a number.**

**(d) Undeclared must fail loudly, never fall through.** uutils' build script replaces every GNU
program it hasn't implemented with `/bin/false` so those tests fail rather than silently passing
against the reference binary (§3.6). The analogue for us: if a command appears in `--help` but not in
`schema`, or in `schema` but is not invocable, that is a **hard failure**, not a skip. Silence must
never be a passing state — this is the failure mode documented in the wild where help advertises a
command that no longer exists.

### 7.5 Test representation and known failures

- **Cases are data.** Use txtar-style archives (testscript's format: a leading script, then the
  fixture files, all in one reviewable text file — each script runs in a fresh `$WORK` tree) because
  they carry the invocation _and_ the filesystem fixture in a single file a reviewer can read in a
  diff. The Go toolchain runs 900+ of these in `src/cmd/go/testdata/script/`, which is strong
  evidence the format scales.
- **Ship a lowered JSON manifest too** (the wast2json lesson): third parties should never have to
  implement our case format to consume the corpus.
- **Frontmatter carries `requires:`** — capability tags drawn from a _curated registry_
  (`features.txt`, §4.6), never free-form strings — plus `profile: core | capability`.
- **Known failures live in the implementation's repo, WPT-style**, never as edits to the corpus:

```toml
# clispec-expectations.toml
[[expect]]
case   = "core/stdout-json-parses"
command = "services list"
status = "FAIL"
reason = "progress bar writes to stdout when TERM is set"
issue  = "https://github.com/acme/mytool/issues/812"
```

Require `reason` and `issue`; ratchet the file so it may only shrink; make `--strict` ignore it
entirely. The diff-visibility property is what makes this work socially (§4.3).

- **Negative tests need no expected output** (toml-test, and docopt's `"user-error"` sentinel): "must
  exit nonzero with empty stdout" is the whole assertion, so those cases never rot. docopt's
  `testcases.docopt` (§3.3) is the closest existing format for parser-level cases and is worth
  adapting directly for the argument-parsing portion of the corpus.
- **Environment is hostile by default**, testscript-style: `HOME=/no-home`, `TMPDIR=$WORK/.tmp`,
  `NO_COLOR=1`, `TERM=dumb`, `LC_ALL=C`, `TZ=UTC`, pinned width, stdin closed, no TTY. A tool that
  quietly reads `~/.config/foo` should fail in the kit, not pass on the maintainer's laptop.

### 7.6 Generate what you can, author only what you must

Schemathesis is the model: from the declared schema, generate inputs and apply generic checks. Our
derivable surface is large — declared arg types and enums give generated inputs; `stdout_schema`,
`errors[].exit_code`, `effects`, `cardinality` and `output_kind` give the oracles. Authored cases
should be reserved for what cannot be derived: specific error scenarios, fixture-dependent behaviour,
and known-tricky interactions.

Two property-flavoured checks are worth building in from day one because they are pure profit:

- **`--help` never exits nonzero, for every command in the tree** (walk the declared `commands[]`).
- **Unknown flag exits nonzero, writes to stderr, and writes nothing to stdout** — again derived from
  the command list, no authoring.

### 7.7 Scoring

Binary gate on Core. Percentage as a diagnostic artifact only. Publish the declaration profile.
Never let the headline claim be a number against a moving denominator — that's the uutils lesson
(93.48% and 96.28% describe different denominators) and the Acid3 lesson (a percentage that "does not
represent an actual percentage of conformance").

The credibility mechanism from Kubernetes is worth copying wholesale: **anyone can re-run the
identical open-source tool that produced the claim.** That single property is what converts a badge
from marketing into evidence.

### 7.8 Rule-to-tier mapping — what the framework should absorb

The kit tests any binary and is therefore capped at tier 2. The _framework_ can push many of the same
rules to tier 1. Splitting them explicitly:

| Spec rule                                                  | Best achievable tier (in-framework) | Mechanism                                                                    |
| ---------------------------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------- |
| Every command declares `description` and `effects`         | **1**                               | Typestate builder; `.register()` doesn't exist otherwise (§5.2)              |
| `data` commands declare `cardinality` + output description | **1**                               | Typestate: `HasOutput<Data>` requires it                                     |
| `unbounded` requires `pagination` + `fields_arg`           | **1**                               | Type parameter on cardinality                                                |
| Every error kind declares an `exit_code`                   | **1**                               | `CliError` trait requires `exit_code()` (§5.4)                               |
| Exit code ∈ declared set                                   | **1**                               | Exit codes only constructible from declared kinds                            |
| Referenced args appear in `args`/`global_args`             | **1**                               | Single command tree projects both (§5.5)                                     |
| `commands` array is flat with full paths                   | **1**                               | Emitter renders it; not author-controllable                                  |
| Root `--help` mentions `schema`                            | **1**                               | Help renderer emits from the tree                                            |
| `schema` needs no auth/config/network                      | **1**                               | Schema derived from static tree; handler never runs                          |
| Data to stdout, diagnostics to stderr                      | **1.5**                             | Emitter capability + `print_stdout` lint + JSON-parse-the-whole-stream check |
| Never blocks on input without a TTY                        | **2**                               | Prompt API requires a TTY token; still needs the timeout gate (§6 #7)        |
| `read_only` really is read-only                            | **2**                               | Sandbox falsification only                                                   |
| `idempotent` really is idempotent                          | **2**                               | Run-twice falsification only                                                 |
| `stream` flushes as produced                               | **2**                               | Time-to-first-byte falsification only                                        |
| Every declared command is invocable                        | **2**                               | Example-execution gate                                                       |
| No breaking change without a version bump                  | **2**                               | Schema diff (oasdiff/buf model)                                              |

The pattern is clean and worth stating as a principle: **structural rules about the declaration go to
tier 1; semantic rules about runtime behaviour stay at tier 2 and need falsification tests.** Any
rule we can't place in one of those two buckets is a rule we should consider deleting from the spec,
because it will only ever be tier 3.

### 7.9 What would be genuinely novel, and the honest risks

**Novel / unclaimed** (nothing comparable found in the survey):

1. **Exit-code coverage auditing** — cross-referencing declared exit codes against a test suite that
   demonstrably reaches each one. No tooling exists in any ecosystem (§1.7). This is the most
   defensible novelty claim, and it matters most precisely because agents consume exit codes.
2. **Metamorphic relations for CLIs** — flag-order invariance, `--json` ⊨ human output, `-v -q`
   precedence, `-abc` ≡ `-a -b -c`, `--flag=x` ≡ `--flag x` (§3.5). Cheap, because they need no
   expected output — only that two invocations agree.
3. **Falsification of semantic declarations** — sandboxing `read_only`, run-twice for `idempotent`,
   time-to-first-byte for `stream` (§7.4b). No prior art was found for testing `--dry-run` honesty in
   _any_ CLI project.
4. **Determinism as a spec property** rather than a snapshot annoyance (§2.4).

**Honest risks:**

- **Sandbox portability.** The `read_only` falsification test is strong on Linux (bubblewrap,
  seccomp, strace) and weak elsewhere. macOS needs a container or the deprecated `sandbox-exec`. The
  portable fallback — hashing a scratch tree before and after — **misses writes outside the tree,
  which is exactly the violation that matters.** Ship the strong version where available and label
  the fallback as partial rather than pretending it's equivalent.
- **Over-specification.** The kit must assert observable contract, not rendering. Byte-exact
  snapshots belong in the tool's own suite, not in a third-party conformance kit. Every suite in §4
  that stayed useful stayed semantic.
- **Golden-file review degrades at scale even with good governance** (§2.7, Chromium). Design so the
  kit's own assertions are mostly generated and semantic, keeping the human-reviewed golden surface
  small.
- **Declaration honesty is ultimately social.** Test262 and WPT are enforced by public dashboards
  more than by harness rules. A conformance kit without published, re-runnable results is a
  self-assessment, and self-assessments drift. The Kubernetes property — _anyone can re-run the
  identical open-source tool that produced the claim_ — is what converts a badge into evidence, and
  it should be a design requirement, not an afterthought.
