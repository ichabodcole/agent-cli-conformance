#!/bin/sh
# POSITIVE CONTROL for A6, in POSIX sh rather than TypeScript.
#
# A6's probe leads with a bare `--`, and Bun consumes exactly one such token immediately after
# the script path — so no `.ts` fixture can ever receive the terminator the checker sends, and
# the checker now reports `unverified` for any target launched through `bun`. `sh` passes its
# script's arguments through untouched, which makes it the one interpreter available here that
# can actually exercise the rule.
#
# Mirrors conforming.ts's argument handling: split once at the first `--`, treat everything
# after it as positional data, reject unknown options before it.
set -eu

HELP='usage: fixture <command> [--json]

Commands:
  list   List things.

Options:
  --json     Machine-readable output.
  --help     Show help.
  --version  Show version.
'

fail() {
  printf '{"ok":false,"error":{"kind":"usage","exit_code":2,"retryable":false,"message":"%s"}}\n' "$1" >&2
  exit 2
}

[ "$#" -eq 0 ] && fail "no command given"

for a in "$@"; do
  case "$a" in
    --help | -h)
      printf '%s' "$HELP"
      exit 0
      ;;
    --version)
      printf '1.0.0\n'
      exit 0
      ;;
  esac
done

# Everything up to the first `--` is option territory; everything after it is data.
terminated=0
verbs=""
for a in "$@"; do
  if [ "$terminated" -eq 0 ] && [ "$a" = "--" ]; then
    terminated=1
    continue
  fi
  if [ "$terminated" -eq 0 ]; then
    case "$a" in
      --json) continue ;;
      -*) fail "unknown option '$a'" ;;
    esac
  fi
  verbs="$verbs $a"
done

set -- $verbs
[ "${1:-}" = "list" ] || fail "unknown command '${1:-}'"
[ "$#" -le 1 ] || fail "too many arguments: '$2'"

printf '{"ok":true,"data":{"items":[]},"meta":{"command":"list"}}\n'
