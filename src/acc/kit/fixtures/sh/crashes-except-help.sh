#!/bin/sh
# NEGATIVE CONTROL for G1, and the fixture that rule was minted for.
#
# Its sibling `dies-by-signal.sh` crashes on everything, which is the easy half: nothing survives,
# so nothing can be mistaken for compliance. This one answers the three questions a caller asks
# first — `--help`, `-h`, `--version` — correctly and completely, and segfaults on every other
# path. That combination is what made it dangerous.
#
# Measured before G1 existed, through `record()` + `buildReport()` at L0 and through `acc check`:
#
#   CONFORMANT (L0) — 0 core violated, 11 core unverified, 4 core partially covered
#   exit 0
#
# Every crashed rule reported `unverified` — correct, per `crashedUnverified` — and `conformant`
# counts VIOLATIONS, so a binary that falls over on eleven of fifteen core rules collected a
# green headline and a zero exit. The four passes are real: help and version genuinely work. The
# eleven gaps read exactly like `git`'s single honest one (no machine-mode flag to parse, nothing
# git did wrong), which is the distinction `unverified` cannot make and the reason a rule had to
# own the second case.
#
# WHY POSIX SHELL, not a `.ts` fixture. Bun installs its own SIGSEGV handler: under bun,
# `kill -SEGV $$`-equivalent code prints a crash report to stderr and exits with a CHOSEN status,
# which is a non-empty stream and a real exit code — a different observation entirely, and one
# that would not exercise the invariant at all. `sh` dies the way a real binary dies, and `kill`
# is a shell builtin, so there is no coreutils dependency. Same reasoning as `dies-by-signal.sh`.
#
# The help text advertises NO machine-mode flag, deliberately. With one, `--help --json` would
# have to be answered as JSON or B3 fails — and a second core violation would make
# `conformant: false` true whether or not G1 bites, which is precisely the way a regression test
# stops testing anything. Without one, B3 reports `unverified` (nothing to parse) and D3 reports
# a DIAGNOSTIC failure that binds no verdict, leaving G1 as the only core violation in the run.
# The suite asserts exactly that: drop G1 from the registry and this fixture certifies again.
HELP='usage: fixture <command>

Commands:
  list   List things.

Options:
  -h, --help     Show help.
      --version  Show version.
'

case "${1:-}" in
  --help | -h)
    printf '%s' "$HELP"
    exit 0
    ;;
  --version)
    printf '1.0.0\n'
    exit 0
    ;;
esac

# Everything else — an unknown flag, an unknown verb, `--`, the bare invocation — falls over here
# rather than answering. `$$` is this shell, and SIGSEGV is unambiguously a fault rather than the
# kind of signal an outer deadline or a Ctrl-C delivers.
kill -SEGV $$
