---
type: report
generated: { by: claude-opus-5, at: 2026-08-24 }
status: stable
lifecycle: live
description:
  `acc` 0.1.0 run against the owner's own eight agent-facing CLIs. Six of the seven Spellbook
  spells produce one verdict vector six times over, fifteen of twenty-three rules do no work on
  the population, and the five ways these tools contradict each other are invisible to every
  rule in the catalogue.
tags: [conformance, evidence, adoption, l0, machine-mode, exit-codes, bun]
subject: acc 0.1.0 measured against 7 Spellbook 2.2.0 skill CLIs and anthill
examined:
  acc 0.1.0 at develop `4e740f7`; Spellbook 2.2.0 from the marketplace cache; anthill at
  `5e8c5bd`, clean tree; macOS, bun; 2026-08-24
---

> **Provenance and one correction.** A measurement agent ran the kit against these eight targets
> and reported its findings; this report re-derives every figure in it against a fresh run of all
> eight, from a scratch directory with no `acc.config.json`. The measurement said **24 rules**.
> There are **23**, and the correction propagates: see [M8-0](#m8-0--the-denominator-is-23-not-24).
> Where the re-run and the original disagree, the re-run is quoted and the disagreement is
> recorded in [Where the measurement was wrong](#where-the-measurement-was-wrong).
>
> **The targets were read-only throughout.** Nothing was written to any target repository;
> anthill's `HEAD` is unmoved at `5e8c5bd` with a clean tree.

This is the first time the kit has been pointed at a **population** rather than a target. Every
prior trial — [ripgrep](./2026-08-23-blind-trial-ripgrep.md), [anthill first
contact](./2026-08-21-anthill-first-contact-trial.md) — asked whether one verdict was right. This
one asks a question the kit was built for and has never been made to answer: _do these eight tools
agree with each other?_ They do not, in five distinct ways, and the report says nothing about any
of them.

## The targets

**Spellbook 2.2.0 skill CLIs — seven, not eight.** `astrolabe`, `bounty`, `glamour`, `grapevine`,
`imago`, `magpie`, `mind-mapper`, each at
`~/.claude/plugins/cache/spellbook-marketplace/spellbook/2.2.0/skills/<name>/scripts/cli.ts`.
`digestify` ships `scripts/review.ts` and no `cli.ts`, so it is not a CLI target:

```
$ ls …/spellbook/2.2.0/skills/digestify/scripts
review.test.ts  review.ts  template.html
```

**anthill** — `/Users/colereed/Projects/dreamwood/anthill/plugin/scripts/anthill/cli.ts` (the repo
is at `dreamwood/anthill`, not `dreamwood-anthill`).

All eight runs report `configSource.origin: "none"`, so the eight verdicts share one frame:

```
$ jq -r '.data.configSource.origin' runs/*.json
none  none  none  none  none  none  none  none
```

## What was probed, and what was not

Before any probe ran, each target's `--help` and entry-point dispatch were read, and every L0 probe
argv was checked against that dispatch. The probe set is bare, `--help`, `-h`, `--version`,
`--acc-probe-xyzzy-flag`, `acc-probe-xyzzy-verb`, a near-miss of a discovered flag, `--`, and
`flag=sentinel`. In all eight targets every one of those lands on a help branch or a `die()`. **No
probe reaches `ensureDaemon()`, a `fetch`, or a write.** grapevine's posting path and its
stdin-reading branch are both guarded by `case "send"`, which no probe supplies.

Nothing was skipped, and nothing was probed above L0. What that leaves unreached is stated where
it bites, in [§3](#3-what-no-rule-reports).

## Per-target verdicts

**Six of the seven spells are byte-identical on all 23 rules.**

```
$ for a in astrolabe bounty glamour grapevine imago magpie; do
    diff <(jq -r '.data.findings[]|.ruleId+"="+.verdict' astrolabe.json) \
         <(jq -r '.data.findings[]|.ruleId+"="+.verdict' $a.json) >/dev/null \
      && echo "$a IDENTICAL to astrolabe"; done
astrolabe IDENTICAL to astrolabe
bounty IDENTICAL to astrolabe
glamour IDENTICAL to astrolabe
grapevine IDENTICAL to astrolabe
imago IDENTICAL to astrolabe
magpie IDENTICAL to astrolabe
```

One verdict vector, produced six times.

```
NOT CONFORMANT (L0) — 3 core violated, 2 core unverified, 12 core partially covered
                      [astrolabe, bounty, glamour, grapevine, imago, magpie]
  FAIL  C2  a usage error exited 0 (2,2,0)
  FAIL  D1  --version reported no version: exited 2, stdout empty
  FAIL  D2  bare invocation exited 0; bare invocation wrote N bytes to stdout
  FAIL  D3  help names no machine-mode flag a caller could flip and no schema command
            (D3 is diagnostic; the three core violations are C2, D1, D2)
  UNVR  A6 (bun swallows `--`), A7 (no closed set found), B5 (no machine mode declared)
  N/A   A4, B3, B4
```

```
NOT CONFORMANT (L0) — 4 core violated, 3 core unverified, 10 core partially covered   mind-mapper
  FAIL  A1  the valueless rejection did not name the offending flag; the value-carrying
            rejection did not name the offending flag
  FAIL  A3  flag rejection did not name the flag; verb rejection did not name the verb
  FAIL  C1  --help exited 2 and wrote nothing to stdout; -h likewise
  FAIL  D1  --version reported no version: exited 2, stdout empty
  FAIL  D3  help names no machine-mode flag
  PASS+ C2, PASS+ D2   ← the two the other six fail
  UNVR  A5 (no flag discovered), A6, A7, B5
  N/A   A4, B3, B4
```

```
NOT CONFORMANT (L0) — 2 core violated, 3 core unverified, 12 core partially covered   anthill
  FAIL  C2  a usage error exited 0 (1,1,0)
  FAIL  D2  bare invocation exited 0; bare invocation wrote 13851 bytes to stdout
  PASS+ D1  version reported with an unusable HOME and XDG_CONFIG_HOME
  UNVR  A5  no suitable flag was discovered to build a near-miss from
  UNVR  D3  help answers with a machine document and offers no forced-text form
  UNVR  A6, A7, B5   ·   N/A A4, B3, B4
```

---

## M8-0 — the denominator is 23, not 24

The measurement reported 24 rules. The catalogue holds **23**, established three ways:

```
$ bun run acc rules | jq '.data.count'
23
```

`src/acc/kit/registry.ts` exports **22** entries in `CHECKERS` and **one** entry in
`UNCHECKED_RULES` (`B4`, whose page exists and whose checker does not) — 22 + 1 = 23. And every
check report carries 23 findings with three not-applicable:

```
$ for f in runs/*.json; do echo "$f $(jq '.data.findings|length' $f) na=$(jq '.data.notApplicable|length' $f)"; done
runs/anthill.json 23 na=3   …   runs/mind-mapper.json 23 na=3
```

Counted by hand from `acc rules`: A1–A7 (7), B1–B5 (5), C1–C3 (3), D1–D4 (4), E1 (1), F1–F2 (2),
G1 (1) = 23.

Every figure derived from the denominator moves with it. The corrected headline is
**15 of 23 rules return the same verdict on all eight targets**, not 16 of 24 —
[§1](#1-which-rules-do-no-work-on-this-population) itemises all fifteen. The count of
discriminating rules is unchanged at eight, because it was never derived from the total; the
original's 16 was `24 − 8`, and the same subtraction against the true total gives 15.

---

## 1. Which rules do no work on this population

Fifteen of the twenty-three rules return an identical verdict on all eight targets. They are not a
random fifteen; they fall into three cohorts, each vacuous for a different reason.

```
$ for f in astrolabe … anthill; do
    jq -r '[.data.findings[]|.ruleId+"="+.verdict]|join(" ")' $f.json; done
```

**Never anything but `PASS+` — nine: `A2`, `B1`, `B2`, `C3`, `D4`, `E1`, `F1`, `F2`, `G1`.**

This is the vacuous-pass cohort, appearing for the **third** time and on eight _working_ tools.
[The defect archaeology](../research/2026-08-15-defect-archaeology.md) records it twice in §1.4 —
once from a fixture whose entire body is `kill -SEGV $$` (A2, A6, B1, B2, C3, D2, D4, E1, F1), once
from an anthill build that threw at module import (A2, B1, B2, C3, D2, D4, E1, F1, **G1**). This
cohort is the import-crash set with **`D2` swapped for `F2`** — `D2` genuinely fails here on seven
of eight, and `F2` takes its place. Seven rules are common to all three appearances: **A2, B1, B2,
C3, D4, E1, F1**.

Why each passes is the same story a third time. `B2` reports _"no CSI escapes across 2 non-TTY
invocation(s)"_ — but every one of these tools already suppresses colour off a TTY, so the probe
cannot fail. `F1` reports, in its own words, _"absence of a known pattern, not proof"_. And `F2`
is the new member, discussed as [M8-3](#m8-3--f2-times-an-error-path-and-calls-it-a-pass).

**Never anything but `UNVR` — three: `A6`, `A7`, `B5`.**

- **`A6`** — 8 of 8, _"cannot be probed through a `bun` launcher: bun swallows the leading `--`, so
  the target never receives the terminator."_ This is archaeology §6.10 (7 of 7 in August)
  reproduced at 8 of 8. Every target here is a `.ts` file, the shape the README calls the case
  `acc` handles _best_, and it is the case where `A6` can never resolve.
- **`A7`** — 8 of 8, _"root help advertises no closed value set for any flag, so this target has
  made no declaration to falsify."_ This is a **detector miss, not a target fact**, twice over —
  see [M8-4](#m8-4--a7s-prose-extractor-misses-abc-set-notation) and
  [§4](#4-the-machine-first-penalty).
- **`B5`** — 8 of 8, _"no machine mode was declared."_ All eight of these tools **are** machine-mode
  tools. `B5` is unreachable on the entire population it was proposed for.

**Never anything but `N/A` — three: `A4`, `B3`, `B4`.** `B4` has no checker; `A4` needs L1
(_"arity cannot be probed at L0"_); `B3` needs a declaration.

**Only eight rules discriminate at all** — `A1`, `A3`, `A5`, `C1`, `C2`, `D1`, `D2`, `D3` — and six
of the eight discriminate _only_ because mind-mapper or anthill differ from the pack. 15 + 8 = 23.

---

## 2. Where the tools disagree with each other

**This is the direct evidence of the problem the project exists to solve, and no rule reports any
of it.** Every cell is one command's exit code, stdout bytes and stderr bytes, from:

```
probe() { bun "$1" "${@:2}" >/tmp/o 2>/tmp/e; printf '%s/%s/%s' "$?" "$(wc -c </tmp/o)" "$(wc -c </tmp/e)"; }
```

|                 | bare                 | `--help`           | `-h`          | `--version`        | unknown flag  | unknown verb |
| --------------- | -------------------- | ------------------ | ------------- | ------------------ | ------------- | ------------ |
| astrolabe       | `0`/1228/0           | `0`/1228/0         | `0`/1228/0    | **`2`/0/51**       | `2`/0/64      | `2`/0/62     |
| bounty          | `0`/2564/0           | `0`/2564/0         | `0`/2564/0    | **`2`/0/54**       | `2`/0/67      | `2`/0/65     |
| glamour         | `0`/1745/0           | `0`/1745/0         | `0`/1745/0    | **`2`/0/55**       | `2`/0/68      | `2`/0/66     |
| grapevine       | `0`/2733/0           | `0`/2733/0         | `0`/2733/0    | **`2`/0/38**       | `2`/0/51      | `2`/0/49     |
| imago           | `0`/1677/0           | `0`/1677/0         | `0`/1677/0    | **`2`/0/53**       | `2`/0/66      | `2`/0/64     |
| magpie          | `0`/1833/0           | `0`/1833/0         | `0`/1833/0    | **`2`/0/54**       | `2`/0/67      | `2`/0/65     |
| **mind-mapper** | **`2`/0/212**        | **`2`/0/212**      | **`2`/0/212** | `2`/0/212          | `2`/0/212     | `2`/0/212    |
| **anthill**     | `0`/**13851 JSON**/0 | `0`/**109 JSON**/0 | `0`/109/0     | **`0`/152 JSON**/0 | **`1`**/0/115 | **`1`**/0/89 |

Five decisions, made five different ways by one author.

### (a) Exit code for the same error class

Seven tools answer an unknown flag or an unknown verb with **`2`**. anthill answers **`1`**. Same
developer, same error class, opposite convention. An agent that learns _"2 means I typed it wrong"_
learns the wrong thing on one of these eight.

`A1`, `A2` and `A3` report `PASS+` on **both**, and say so in their own gap text:

```
PASS+ A1  root flag rejected with exit 2, stdout empty, flag named …   [astrolabe]
PASS+ A1  root flag rejected with exit 1, stdout empty, flag named …   [anthill]
```

> the exit code is only required to be non-zero here and not the declared 2
> — `A1` coverage gap, `bun run acc rules`

The kit is structurally incapable of noticing this, and it is the single clearest instance of the
class of problem the project was started for.

### (b) Where does `--help` go?

Three answers inside one toolset. Six spells: **stdout, exit 0**. mind-mapper: **stderr, exit 2,
zero bytes on stdout** — it has no help screen at all, only a usage line.

```
$ bun …/mind-mapper/scripts/cli.ts --help 2>&1 >/dev/null
usage: cli.ts <open|state|tail|projects|ingest|propose-node|…|activity>
```

anthill: **stdout, exit 0, but JSON** — `{"ok":true,"data":{"name":"anthill","description":"Project
orchestration CLI"},"meta":{"command":"anthill"}}`, 109 bytes.

### (c) Is `--version` supported?

One of eight.

```
$ bun …/anthill/cli.ts --version
{"ok":true,"data":{"version":"2.3.0","source":"/Users/…/cli.ts"},"meta":{…}}
```

All seven spells have no such flag: `--version` falls through as an unknown verb and dies at exit 2
with empty stdout. The kit reports `FAIL D1` seven times and `PASS+ D1` once — correct per-tool,
and silent about the split.

### (d) Machine mode: unconditional-and-unflagged vs `isTTY`-conditional-and-flagged

The spells emit JSON unconditionally via `printJson`. No spell reads `process.stdout.isTTY`, and no
spell has a `--format` or `--json` flag at all:

```
$ for n in astrolabe … mind-mapper; do printf '%-12s isTTY=%s format=%s\n' $n \
    "$(grep -c isTTY …/$n/scripts/cli.ts)" "$(grep -c -- '--format\|"format"' …/$n/scripts/cli.ts)"; done
astrolabe  isTTY=0 format=0     bounty     isTTY=0 format=0     glamour  isTTY=0 format=0
grapevine  isTTY=2 format=0     imago      isTTY=0 format=0     magpie   isTTY=0 format=0
mind-mapper isTTY=2 format=0
```

grapevine's and mind-mapper's `isTTY` hits are both on **stdin**, not stdout (`cli.ts:1683`,
`:1734`; `cli.ts:1477`, `:1491`). anthill switches on `process.stdout.isTTY`
(`agent-layer.ts:70`), and `--format` is its central contract.

Seven tools where machine mode is unconditional and unflagged; one where it is conditional and
flagged. `D3` reports `FAIL` on seven and `UNVR` on the eighth, describing each in isolation.

### (e) `process.exit` after a write — two repositories, flatly opposite policies

All seven spells forbid it at the entry point, in a comment that is near-identical across six of
them:

```
// `process.exitCode` + a natural return, NEVER `process.exit(code)`: Bun's
// stdout is ASYNCHRONOUS on a pipe (synchronous on a TTY or file), so an
// explicit exit discards whatever has not drained — measured at exactly
// 65,536 bytes. …
// Do not tidy this back into an explicit exit.
process.exitCode = await main(process.argv.slice(2));
                                        — astrolabe/scripts/cli.ts:496–504
```

bounty carries the longer original of the same ban (`cli.ts:1433–1441`), naming the incident:
_"a reader concluded 'our board is too big to read' and three agents worked under that false rule."_

anthill's `cli.ts` calls `process.exit(0)` immediately after a `process.stdout.write` or an `emit`
at lines **204, 222, 225, 264, 283, 286** — the exact shape the other repo banned. Measured, it
does not currently bite, because every payload is under 64 KiB:

```
$ bun …/anthill/cli.ts help --json | (sleep 1; cat) | wc -c   → 23075
$ bun …/anthill/cli.ts help --json > f; wc -c < f             → 23075
$ bun …/anthill/cli.ts | (sleep 1; cat) | wc -c               → 13851   (file: 13851)
```

It is a live hazard on a growing manifest. **`B4` — the rule for exactly this — is `N/A` on all
eight**: _"no checker exists for this rule yet."_

---

## 3. What no rule reports

Everything in §2 is invisible to the catalogue, and the reason is structural rather than a set of
missing gap strings:

1. **Every relevant checker requires only "non-zero."** `A1`, `A2`, `A3`, `A7`, `C2` and `D2` each
   carry a documented gap saying the declared `2` is not asserted. Divergence (a) lives entirely
   inside the space those gaps permit.
2. **Every run judges one tool alone.** There is no shape in the report — no field, no verdict, no
   flag — that can express _"these two targets answer the same question differently."_ Divergences
   (b) through (e) are each a **relation between reports**, and a report is the largest object the
   kit produces.

Three further live defects were found by reading source, and the kit says nothing about any of
them.

**Invalid value for a closed set is alive in anthill, and `A7` reported `unverified`.**

```
$ bun …/anthill/cli.ts --format josn ; echo $?
{"ok":false,"error":"No command specified.","meta":{"command":"anthill"}}
1
$ bun …/anthill/cli.ts info --format josn ; echo $?
{"ok":false,"error":"Unknown command josn","meta":{"command":"info"}}
1
```

`resolveFormat` (`agent-layer.ts:70`):

```ts
if (flagFormat === "json" || flagFormat === "text") return flagFormat;
return (isTTY ?? process.stdout.isTTY === true) ? "text" : "json";
```

A bogus value is **silently discarded** and the ambient heuristic applies. The non-zero exit in the
first case comes from _no command specified_, not from the format. With a command it is worse: the
value is re-read as a positional subcommand, so the diagnostic misattributes the fault. `A7` exists
precisely for this.

**anthill's manifest omits its own root flag.** `--format` is the flag anthill's entire
dual-audience contract rests on, and neither `--help` nor the full manifest names it:

```
$ bun …/anthill/cli.ts | jq -r '.data|keys|@csv'
"commands","description","name","version"
$ bun …/anthill/cli.ts | jq '.data|has("flags")'
false
```

Archaeology class 13 is _"help advertises a flag the verb refuses"_; this is its mirror — the verb
accepts a flag help never mentions. `D3` reported `UNVR`, and no rule covers the inverse.

**Parser altitude is only checked at the root.** All eight `A1` findings say _"only the root is
probed so a flag unknown to a subcommand is not."_ The Spellbook history records `bounty close
--help` **closing the board**; the current kit sends no verb, so it would still miss it. Likewise
`A4` (swallowed positional) is `N/A` ×8 and `B4` (drained exit) is `N/A` ×8 — both classes wholly
unreached.

---

## 4. The machine-first penalty

**Being machine-first makes a target less checkable, not more.** `discovery.ts:265`:

```ts
const valueSets = valueSetsFromJson(text) ?? extractValueSets(lines);
```

with `text` taken from a piped `--help`. The comment two lines above states the intent: _"The JSON
branch wins outright, because a document that parses whole is a declaration rather than a layout to
guess at."_

anthill's piped `--help` is 109 bytes and has **no `flags` key at all**. So the JSON branch wins, a
parseable document is treated as a complete declaration, no `{name, values}` node is found, and
`{}` is returned. The consequences:

- `UNVR A7  root help advertises no closed value set for any flag`
- `UNVR A5  no suitable flag was discovered to build a near-miss from`

The target _does_ declare a closed set — `format: { valueHint: "text|json" }` at `cli.ts:61` — and
the kit's own probe methodology hides it. **`A5` and `A7` report `unverified` against the one
target in the population that actually declares a closed set.** `A5` fails the same way on
mind-mapper, for the different reason that mind-mapper publishes no help to discover a flag from.

---

## Findings about the kit itself

### M8-3 — `F2` times an error path and calls it a pass

On the six identical spells, `--version` exits 2 with empty stdout. Two rules read the same three
observations and disagree about what they saw:

```
$ bun src/acc/cli.ts check …/astrolabe/scripts/cli.ts --format text | grep -E ' D1 | F2 '
  FAIL  D1  --version reported no version: exited 2, stdout empty
  PASS+ F2  --version first byte in 14ms (runs: 14, 27, 15ms)
```

`F2` is measuring the latency of a failure. This is the vacuous-pass shape of §1 at rule
granularity rather than at fixture granularity, and it is why `F2` joins the nine-rule cohort here
when it did not in either earlier appearance.

### M8-4 — `A7`'s prose extractor misses `(a|b|c)` set notation

grapevine advertises two closed sets in its root help, and `A7` reports _"advertises no closed value
set for any flag"_:

```
$ bun …/grapevine/scripts/cli.ts --help | grep '|'
  grapevine pull <name> [--since <id>] [--status <value>]   # --status = full-scan filter (open|wontfix|incorporated|…)
  grapevine mark <name> <id> <disposition> [--note <text>]  # set disposition (incorporated|wontfix|deferred|…)
```

The extractor wants `--flag <a|b|c>` adjacency and does not read a set from a trailing comment.

### M8-5 — `A7`'s help discovery inverts on machine-first targets

[§4](#4-the-machine-first-penalty). A JSON help document short-circuits the prose extractor, so a
target that answers help as data gets _fewer_ rules evaluated than one that answers in prose.

### M8-6 — `A6` is `unverified` on 8 of 8 and cannot be otherwise

For any `.ts` target run through `bun` — which is the README's recommended shape — `A6` cannot
resolve. Archaeology §6.10 flagged this at 7 of 7 in August; it is 8 of 8 now, and the population
grew without the coverage moving.

---

## Where the measurement was wrong

Recorded because the corrections are the kind that survive into derived work if left unstated.

- **The rule count.** 24 → 23; see [M8-0](#m8-0--the-denominator-is-23-not-24). The dependent
  headline moves from "16 of 24" to "15 of 23". Both the original figure and the arithmetic
  `23 − 8 = 15` were re-derived from the run, and the itemised cohorts (9 + 3 + 3) sum to 15.
- **The vacuous-pass cohort is not _exactly_ the archaeology set.** The measurement said it matched
  the recorded cohort; it matches the import-crash cohort with `D2` replaced by `F2`. Seven rules
  are common to all three appearances. Stated precisely in [§1](#1-which-rules-do-no-work-on-this-population).
- **The `process.exit` ban comment is not identical across all seven spells.** Six carry the same
  seven-line form; bounty carries the longer original that cites the incident. The ban is present
  in all seven.
- **Byte counts differ by a few bytes from the original table.** The counts here are from
  `wc -c` on a redirected file and are stable across working directories (astrolabe's help is 1228
  bytes from `/tmp`, from `$HOME`, and from the skill directory). The original's figures run 5–17
  bytes lower per row, which is more than trailing-newline stripping accounts for; the method that
  produced them is not recoverable from the report. No conclusion in §2 turns on the difference —
  every exit code matches, and the divergences are qualitative.
- **A stale `acc.config.json` will silently change these results.** The first re-run picked up a
  leftover config from an earlier session (`{"rules":{"D2":{"severity":"off",…}}}`) and anthill's
  exit changed from `9` to `0`. Every figure in this report is from a clean directory with
  `configSource.origin: "none"`. This is not a defect — the config was found and reported as
  `discovered` — but it is a trap for anyone reproducing a run from a scratch directory they have
  used before.

## The shape of the result

On a corpus deliberately chosen to expose inconsistency, the kit's output is 75% duplicate: six of
eight targets produce one verdict vector, repeated. Fifteen of twenty-three rules never vary. And
the two most consequential disagreements the population contains — exit `1` versus `2` for the same
error class, and three different destinations for `--help` — are invisible **by construction**,
because every relevant checker requires only "non-zero" and every run judges one tool alone.
