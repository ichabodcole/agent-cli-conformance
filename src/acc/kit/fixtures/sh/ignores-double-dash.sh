#!/bin/sh
# NEGATIVE CONTROL for A6, the `sh` counterpart of broken/ignores-double-dash.ts — see
# honours-double-dash.sh for why these two exist in shell rather than TypeScript.
#
# Tolerates the literal `--` token (choking on it outright would be a useless control, since
# A6's check only fires when stderr names the SENTINEL) but keeps scanning every token after it
# for a flag shape, so a value beginning with `-` is rejected as an unknown option.
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

verbs=""
for a in "$@"; do
  case "$a" in
    --) continue ;;
    --json) continue ;;
    -*) fail "unknown option '$a'" ;;
    *) verbs="$verbs $a" ;;
  esac
done

set -- $verbs
[ "${1:-}" = "list" ] || fail "unknown command '${1:-}'"
[ "$#" -le 1 ] || fail "too many arguments: '$2'"

printf '{"ok":true,"data":{"items":[]},"meta":{"command":"list"}}\n'
