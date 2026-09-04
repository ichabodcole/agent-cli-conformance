#!/usr/bin/env bash
# Sweep a Markdown file for the STE defects that a pattern can find.
#
#   sweep.sh <path>          report hits, grouped by rule
#   sweep.sh --facts <path>  print the facts the document carries, one per line, sorted
#
# The sweep reads prose only. It skips frontmatter, fenced code, table rows, and block quotes
# (a block quote is quoted text, which STE does not govern).
# Every pattern over-reports on purpose. Judge each hit against references/RULES.md.
# A sweep that reports nothing does not show that the document has no defects.

set -euo pipefail

mode=report
if [ "${1:-}" = "--facts" ]; then mode=facts; shift; fi
path="${1:?usage: sweep.sh [--facts] <path>}"

# prose(): emit "lineno<TAB>text" for prose lines only.
prose() {
  awk '
    NR == 1 && /^---$/ { fm = 1; next }
    fm && /^---$/      { fm = 0; next }
    fm                 { next }
    /^```/             { code = !code; next }
    code               { next }
    /^[[:space:]]*\|/  { next }
    /^[[:space:]]*>/   { next }
    { print NR "\t" $0 }
  ' "$path"
}

if [ "$mode" = "facts" ]; then
  # Code spans, numbers, and paths. Diff this list before and after an edit.
  # If a line is missing after the edit, the edit removed a fact.
  prose | cut -f2- | grep -oE '`[^`]+`|[0-9]+([.,][0-9]+)?|[A-Za-z0-9_./-]+/[A-Za-z0-9_./-]+' | sort | uniq -c | sort -k2
  exit 0
fi

section() { printf '\n== %s\n' "$1"; }
show() {  # show <label> <regex>
  local out
  out=$(prose | grep -iE "$2" || true)
  if [ -n "$out" ]; then
    printf -- '-- %s\n' "$1"
    printf '%s\n' "$out" | grep -iEo --color=never ".{0,40}($2).{0,40}" | sed 's/^/   /' | head -40
  fi
}

section "Rule 8.1: no semicolons"
show "semicolon" ";"

section "Rule 3.4: no perfect tenses, no modal passives"
show "perfect tense"  "\b(has|have|had|having)( not)?( been)? [a-z]+(ed|en|ne|wn|lt)\b"
show "modal passive"  "\b(can|could|must|may|might|will|would|should|shall) (not )?be [a-z]+(ed|en|ne|wn|lt)\b"

section "Rule 3.5: -ing verb forms (a technical name that ends in -ing is not a hit)"
show "progressive"        "\b(is|are|was|were|be|been|am)( not)? [a-z]+ing\b"
show "gerund after word"  "\b(before|after|while|when|without|by|of|for|from|on|in|to|about|avoid|stop|start|keep|worth|instead of)( not)? [a-z]+ing\b"
show "sentence-initial"   "(^|\t|\. |: )[A-Z][a-z]+ing\b"

section "Rule 3.6: passive voice (permitted in a description when the actor does not matter)"
show "passive" "\b(is|are|was|were|be|been|being|get|gets|got)( not)?( [a-z]+ly)? [a-z]+(ed|en|wn|lt)\b( by\b)?"

section "Rule 4.2: no contractions"
show "contraction" "\b[a-z]+n't\b|\b(it|that|there|what|who|he|she|we|they|you|I)'(s|re|ve|ll|d|m)\b"

section "GR-1: keep the conjunction 'that'"
show "dropped that" "\b(make sure|ensure|shows?|showed|recommends?|means) (the|a|an|this|these|it|you|we|they)\b"

section "Rule 5.1 and 6.3: sentence length"
# Count a code span, a quoted string, a parenthesis, a number, or a hyphenated word as one word (8.5 to 8.7).
prose | awk -F'\t' '
  function flush(   n, i, s, w) {
    if (buf == "") return
    gsub(/[*_]/, "", buf)
    n = split(buf, parts, /[.!?]([[:space:]]+|$)/)
    for (i = 1; i <= n; i++) {
      s = parts[i]
      gsub(/`[^`]*`/, "X", s); gsub(/"[^"]*"/, "X", s); gsub(/\([^)]*\)/, "X", s)
      gsub(/\[[^]]*\]\([^)]*\)/, "X", s)
      w = split(s, words, /[[:space:]]+/)
      if (w > 25)      printf "   %d words (over the 25-word limit) line %s: %s\n", w, start, substr(parts[i], 1, 90)
      else if (w > 20) printf "   %d words (over the 20-word limit for an instruction) line %s: %s\n", w, start, substr(parts[i], 1, 90)
    }
    buf = ""
  }
  $2 ~ /^[[:space:]]*$/ || $2 ~ /^#/ { flush(); next }
  $2 ~ /^[[:space:]]*([-*]|[0-9]+\.)[[:space:]]/ { flush() }
  { line = $2; sub(/^[[:space:]]*([-*]|[0-9]+\.)[[:space:]]+/, "", line)
    if (buf == "") start = $1
    buf = (buf == "" ? line : buf " " line) }
  END { flush() }
'

section "Rule 6.6: paragraphs over six sentences"
prose | awk -F'\t' '
  function flush(   n) {
    if (buf == "") return
    gsub(/[*_]/, "", buf)
    n = gsub(/[.!?]([[:space:]]+|$)/, "&", buf)
    if (n > 6) printf "   %d sentences, paragraph at line %s\n", n, start
    buf = ""
  }
  $2 ~ /^[[:space:]]*$/ || $2 ~ /^#/ || $2 ~ /^[[:space:]]*([-*]|[0-9]+\.)[[:space:]]/ { flush(); next }
  { if (buf == "") start = $1; buf = buf " " $2 }
  END { flush() }
'

printf '\nJudge each hit by hand. A sweep that reports nothing does not show that the document has no defects.\n'
