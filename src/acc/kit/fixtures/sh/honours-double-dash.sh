#!/bin/sh
# POSITIVE CONTROL for A6, in POSIX sh rather than TypeScript.
#
# A6's probe leads with a bare `--`, and Bun strips one such token immediately after the script
# path per Bun layer between the launcher and the script — so a `.ts` fixture only ever receives
# the terminator when the runner compensates for a known bun launcher shape (see runner.ts).
# `sh` is not that shape at all, so it needs no compensation and passes its script's arguments
# through untouched, which makes it a control for the rule independent of the bun compensation.
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
      # D1's machine-mode half: structured when the caller asked for structure, bare otherwise.
      case " $* " in
        *" --json "*) printf '{"ok":true,"data":{"version":"1.0.0"}}\n' ;;
        *) printf '1.0.0\n' ;;
      esac
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
