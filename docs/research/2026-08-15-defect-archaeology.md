---
type: research
generated: { by: claude-opus-5, at: 2026-08-15 }
status: stable
description: Whether the rule catalogue covers the CLI defects that actually happened, mined from two repositories' commit histories and replayed against acc check.
tags: [conformance, silent-failure, testing]
---

# Defect Archaeology: does the rule catalogue cover the CLI failures that actually happened?

**Research date:** 2026-08-15
**Method:** Commit-history mining of two repositories, plus an empirical replay of seven fixed
defects against `acc check` at the pre-fix and post-fix trees.
**Corpora:** `Spellbook` (622 non-merge commits; 8 skill-bundled agent-facing CLIs) and
`dreamwood/anthill` (770 non-merge commits; one agent-team CLI plus a comms skill).
**Both repositories were read-only throughout.** No checkout, worktree, stash, branch change or
write of any kind; `git status` in each was clean and `HEAD` unmoved at start and finish
(`Spellbook` `cf81ccc`, `anthill` `9c09c1e`).

Every prior measurement in this project asked _"do these tools fail our rules?"_ — a biased
question, because the kit only probes what it can reach at `L0`. Commit history is an independent
sample: it records what actually broke, unfiltered by what the kit can measure. This note reports
what that sample says the catalogue is missing.

---

## 1. Executive summary

### 1.1 The hit rate: 1 of 7

Seven fixed defects were replayed. For each, the pre-fix and post-fix trees were materialised with
`git archive <sha> | tar -x` into a temp directory and `acc check <cli> --json` was run against
both. A **hit** means the governing rule reports `fail` before the fix and `pass` after.

| #   | Defect                                                         | Repo                | Fix sha   | Rule that should catch it | Pre → post                  | Verdict  |
| --- | -------------------------------------------------------------- | ------------------- | --------- | ------------------------- | --------------------------- | -------- |
| T1  | Unknown flag accepted at exit 0 when a verb is present         | Spellbook (bounty)  | `82adf9a` | A1                        | `pass` → `pass`             | **miss** |
| T2  | `--flag=value` silently dropped, value lost                    | Spellbook (imago)   | `df91148` | A1                        | `pass` → `pass`             | **miss** |
| T3  | Drained exit: stdout truncated at 65,536 bytes, exit 0         | Spellbook (bounty)  | `c29aa4e` | B3 (nearest)              | `unverified` → `unverified` | **miss** |
| T4  | CLI never exits — 23-minute hang on `open`                     | Spellbook (glamour) | `62a5972` | E1 / G1                   | `pass` → `pass`             | **miss** |
| T5  | Unrecognised positional swallowed; exit 0 and the wrong answer | anthill             | `4c339fa` | A4                        | `unverified` → `unverified` | **miss** |
| T6  | Crash at import when run outside its own repo                  | anthill             | `c051d58` | C1, D1                    | `fail` → `pass`             | **HIT**  |
| T7  | Parser errors ignore `--format json`, print a usage block      | anthill             | `e03ec52` | B3 / A3                   | identical                   | **miss** |

**Hit rate: 1/7 (14%).** For T1, T2, T3, T4, T5 and T7 the full 20-rule verdict vector is
byte-identical before and after the fix — the kit cannot tell the defective tree from the repaired
one on any rule.

The single hit is instructive about the shape of the coverage rather than flattering to it: T6 is
the one defect in the set that manifests _on an inert path the kit already probes_ (`--help` and
`--version` died). Every miss is a defect that only manifests when a verb runs, when a flag carries
a value, when a payload exceeds a pipe buffer, or when machine mode is selected — four conditions
`L0` excludes by construction.

### 1.2 The null results are not vacuous

Each missed defect was independently reproduced by execution in the archived pre-fix tree:

- **T1** — `bounty list --totally-bogus-flag` → **exit 0**, `no running boards` on stdout.
  Post-fix: exit 2, naming the flag and enumerating the recognised set. `acc` reports
  `A1 pass — root flag rejected with exit 2, stdout empty, flag named` on **both**.
- **T2** — the pre-fix `parseArgs`, extracted and driven directly:
  `['--prompt=a sunset','--tag','x','--summary=two words']` →
  `{"prompt=a sunset":true,"tag":"x","summary=two words":true}`. Post-fix:
  `{"prompt":"a sunset","tag":"x","summary":"two words"}`. Two values silently discarded, and two
  unknown flags silently accepted.
- **T5** — `anthill info env zzz999` → **exit 0** with a full 111-byte payload pre-fix; exit 1
  naming the token post-fix. (The fix's own commit message records the sharper live case:
  `comms read --channel <ch> zzz999` returned **the entire log at `ok:true`, exit 0**.)
- **T7** — `anthill info env --format json --zzz999` → pre-fix a human usage block on stderr;
  post-fix `{"ok":false,"error":"Unknown option '--zzz999'",...}`.
- **T3** — see §1.3.
- **T4** — the defect is on `glamour open`, a verb `acc` never sends. `E1` and `G1` both report
  `pass` on the hanging tree because the four inert invocations do terminate.

### 1.3 A conformant CLI that loses its entire payload

The drained-exit class could not be replayed against a live board without spawning a daemon, so a
minimal fixture reproducing the exact shipped shape was built instead — a large JSON payload
written to stdout followed immediately by `process.exit(0)`:

```
bun drained-exit-cli.ts   state | ( sleep 1; cat ) | wc -c  ->    65536   # the pipe buffer
bun drained-exit-fixed.ts state | ( sleep 1; cat ) | wc -c  ->   114101   # complete
bun drained-exit-cli.ts   state > file                      ->   exit 0, 114101 bytes
```

The defective binary silently delivers 57% of its payload — well-formed-looking JSON that stops
mid-string — and reports **exit 0**. `acc check` scores it:

```
conformant: true    coreFailures: 0
```

Identical to the repaired version. **The kit's headline verdict certifies a CLI that loses more
than half its output.** This is the single most consequential result in this note.

### 1.4 The nine vacuous passes, reached a second way

`roadmap.md` §7 records that a fixture whose entire body is `kill -SEGV $$` once collected **nine
passing rules** — A2, A6, B1, B2, C3, D2, D4, E1, F1 — and that `G1` was minted to close it.

T6-pre collects **nine passes by the same mechanism through a different door**: A2, B1, B2, C3, D2,
D4, E1, F1 **and G1**. The anthill CLI at `cac339e` throws at module import and dies at **exit 1
with a raw stack trace on stderr and zero bytes on stdout, on every probe including `--help`**.
Because it is a thrown exception and not a fault signal, `G1`'s taxonomy declines to attribute it,
and `G1` itself joins the vacuous passes. `A2` reads _"root verb rejected with exit 1"_ from a
process that never parsed an argument; `B1` reads _"stdout empty"_ from a process that never wrote.

The headline was still `conformant: false` — C1 and D1 caught it — so this is a per-rule accuracy
finding, not a headline failure. But it is `G1`'s own hole, one level shallower than the signal
case, and it recurs whenever a target aborts before dispatch.

### 1.5 Discoverability dominance, quantified

On **all four** Spellbook CLIs tested, at every tree, the complete set of rules `acc` reports as
failing is:

```
D1  no --version
D2  bare invocation exits 0
D3  help names no machine-mode flag
```

Three failures, all D-family, unchanged across four CLIs and eight trees. Meanwhile the same
repository's history carries **36 `fix(` commits touching a spell's `cli.ts`** alone, and a
six-sprint hardening project whose entire defect population is parsing, streams, exit codes and
lifecycle. **Not one of the ~40 real CLI-contract defects catalogued below is a discoverability
defect.** The bias the kit was suspected of having is measurable and total on this corpus.

### 1.6 Recommended catalogue changes, in priority order

1. **`B4` — output completeness.** No rule asserts that a CLI delivers what it wrote. Highest real
   cost in the corpus (§5.1).
2. **`A7` — a closed value set rejects values outside it.** Cheapest to build, probe-able at `L0`
   today, and the reference implementation has already fixed an instance of it _in itself_ (§5.4).
3. **`B5` — machine mode holds on the parser-error path.** Probe-able at `L0` today; the class the
   subject repos call _"the class an agent hits most"_ (§5.5).
4. **`G2` — a command that does real work terminates.** The owner's own gate law `G7` already
   states it: _"nothing asserts that a CLI returns"_ (§5.2).
5. **Give `A4` probes.** It is the governing rule for the corpus's only data-destroying defects and
   it has never checked anything (§6.2).
6. **Fix `A6`'s launcher blindness.** `A6` reported `unverified` on **7 of 7** real targets because
   `bun` swallows the leading `--` (§6.10) — while `--` demotion is a live, open, cross-repo defect.
7. **`B6` — field totality** is the largest defect population by commit count and has no rule — but
   adopt the _structural_ restatement only. Spellbook measured the intent-bearing form
   unmechanisable, with numbers (§5.3).

---

## 2. Method, and how far to trust each number

### 2.1 What was actually read

| Layer                                              | Volume                                                     | Fidelity                        |
| -------------------------------------------------- | ---------------------------------------------------------- | ------------------------------- |
| Commit **subjects** scanned across both repos      | ~330                                                       | index only                      |
| Commit **messages read in full** (body + `--stat`) | **~74** (32 by me, 42 delegated)                           | high on this corpus — see below |
| **Source diffs read or driven**                    | **~20** (16 delegated, 4 verified by me through execution) | ground truth                    |
| Defects **independently reproduced by execution**  | **6**                                                      | ground truth                    |
| Project documents read in full                     | 6 sprint records, 2 proposals, ~20 backlog items           | authorial                       |

Against 1,392 non-merge commits total, that is **~5% read at message level and ~1.4% at diff
level**. The sample was not random: it was `--grep`-selected on defect vocabulary and then filtered
to CLI-contract relevance, which is the right selection for this question but means **counts below
are lower bounds, never totals**.

**Why message-level reading is unusually high-fidelity here, and where it still is not.** Both
repos write commit messages containing measured before/after numbers, the mechanism, and the
observable symptom — e.g. `c29aa4e` records `pipe 65536 / file 114042` in the body. That is far
better evidence than a typical repo's subject line. It remains the author's own account. Where a
claim below rests on a message rather than a diff or an execution, it is marked _(reported)_.

### 2.2 Empirical replay protocol

1. `git archive <parent-sha> | tar -x -C <tempdir>` for the pre-fix tree and the same at the fix
   sha, into `/private/tmp/.../scratchpad/trees/`. No worktree, no checkout, nothing written inside
   either repository.
2. `bun /Users/colereed/Projects/agent-cli-conformance/src/acc/cli.ts check <path-to-cli> --json`
   against each, output captured by **file redirection** (never a pipe), exit code read from `$?`
   on the redirected command.
3. The defect independently reproduced in the pre-fix tree by driving the CLI with an isolated
   `HOME` and spell-specific home variable, on a verb that cannot mutate anything.

**One methodological caveat, from the subject repo itself.** `Spellbook`'s roadmap records that
`git archive`/`cp -R` under-ran its own test suite versus `git worktree --detach` — 30 cells versus
46 — because the archive lacks `node_modules` and the `.git` directory. That caveat does **not**
bind here: nothing in this replay runs their suite, and every CLI probed is a zero-dependency
`node:util`/`Bun` script. The control is that all six defects reproduced by execution in the
archived trees, which is a stronger check than the archive's completeness.

### 2.3 Safety: no daemon leaked

Seven of eight Spellbook spells spawn `detached: true` daemons that deliberately outlive the CLI
_(reported, from source: astrolabe, bounty, glamour, grapevine, imago, magpie, mind-mapper;
digestify has none)_. `acc`'s runner does not sandbox `HOME` — it spawns with
`env: { ...process.env, ...inv.env }` — so a probe that reached a spawn path would write to the
operator's live state.

Process snapshots (`ps -eo pid,command | grep -iE 'daemon|astrolabe|grapevine|magpie|bounty|glamour|imago|mind-mapper'`)
were taken before the first probe and after the last, spanning 18 `acc check` runs across 9
distinct CLIs including four daemon-spawning ones:

```
before: 27 matching processes    after: 27 matching processes    diff: empty
```

**No probe leaked a daemon.** The reason is structural and worth recording: `acc` at `L0` sends
only `--help`, `-h`, `--version`, bare, a sentinel flag, a sentinel verb, a near-miss flag and a
`--` terminator. None of those reaches a spawn path in any of these tools.

**But the safety margin is a property of `L0`, not of the runner.** Three things say so:

- The runner inherits `HOME` and every spell home variable from the operator's environment.
- Spellbook measured that **4 of 7 daemon spells do not isolate on their home variable at all** —
  _"a running daemon outranks it"_ — and one (glamour) has no home variable _(reported)_.
- Spellbook's own conformance ward was deliberately **not** built as a behavioural drive for
  exactly this reason: _"a gate that can mutate the state it runs beside is not a gate"_
  (`e627a40`). They reached that conclusion after a probe write landed on the team's live board.

The moment `acc` gains `L1` and sends a real subcommand — which §5.1, §5.2 and the `A4` proposal
all require — this margin disappears. **`L1` needs an environment sandbox before it needs probes.**
There is an existence proof of the cost of not having one: anthill's own test suite leaks a real
bounty daemon per run, measured at **31 live daemons and 73 leaked snapshots**, where the cleanup
step _grew_ the artifact it leaked, 73 → 104 _(reported, `e20f772`)_.

---

## 3. The defect taxonomy

Classes are ordered by cost — commits spent, sites touched, and whether the fix needed rework.
"Commits" counts code-changing commits identified in this survey; gate/test-pin commits are counted
separately where they were a distinct act. All are lower bounds.

| #   | Class                                                               | What went wrong (observable)                                                                                                                                                                                                                                                                               | Commits                                                                                          | Repos                                                           | Representative        | Catalogue verdict                                                                                                        |
| --- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 1   | **The drained exit**                                                | `process.exit(code)` immediately after a write discards undrained stdout on a pipe. Payload truncates at **exactly 65,536 bytes**, JSON stops mid-string, **exit 0**. A team published the false rule _"our board is too big to read"_ and worked under it for six messages.                               | **6 fixes + 4 gate commits**, 9–10 entry-point sites + 5 `tail` sites, 37 exit sites pinned      | Spellbook (8 spells); anthill built a tripwire after being told | `c29aa4e`             | **MISSING** → propose `B4`                                                                                               |
| 2   | **Parser altitude: an unknown flag runs the verb anyway**           | Hand-rolled parsers with no registry. `--totally-bogus-flag` accepted at exit 0 and the verb ran. `bounty close --help` **closed the board**.                                                                                                                                                              | **5 fixes** across 6 entry points / 5 spells + 3 ward commits; anthill: 1 fix + 1 regression fix | **Both**                                                        | `82adf9a`             | **Partially covered** — A1, gap _"only the root is probed…"_                                                             |
| 3   | **A field collapses two states**                                    | `0` where the answer is "I could not count"; a field absent where it should be present-and-`null`; one boolean summarising two facts. `gap: 0` asserts _"you missed nothing"_ to a seat that had never followed.                                                                                           | **~12** (6 Spellbook lanes, 6 anthill)                                                           | **Both, independently**                                         | `44f6108` / `400e348` | **MISSING** → propose `B6` (structural form only)                                                                        |
| 4   | **Machine mode not honoured on some path**                          | `--format json` promised an envelope and delivered a 26-line usage block, a raw stack, or raw records bypassing the emitter. Every seat consumed non-envelopes on the most-executed command in the product.                                                                                                | **5** (anthill); Spellbook has the class in its absolute form — no error envelope in any spell   | **Both**                                                        | `01745cf`             | **MISSING** → propose `B5`                                                                                               |
| 5   | **A positional is swallowed**                                       | An unknown positional succeeded plausibly with the wrong answer. `comms read --channel <ch> zzz999` → **exit 0, `ok:true`, the entire log**; the size of the result was the only tell. `bounty add write the --draft section` stored the title `"write the"` at exit 0.                                    | **3 fixes**, 19 leaf commands audited; **1 still open and data-destroying**                      | **Both**                                                        | `4c339fa`             | **Partially covered** — A4, gap _"no probe is declared…"_                                                                |
| 6   | **Writes report success without applying**                          | `ok:true` meant _"I parsed your JSON"_ in three spells and _"the write took effect"_ in two. A duplicate id returned `{"ok":true}` with the board unchanged.                                                                                                                                               | **5** (`14bec41` covers two issues; four `X.add` sites)                                          | Spellbook                                                       | `14bec41`             | **MISSING** — outside the CLI-observable boundary at `L0`; see §5.6                                                      |
| 7   | **The process never exits**                                         | Removing `process.exit` to fix class 1 exposed a held pipe handle: `glamour open` ran **23 minutes** and never returned. A signal handler's `process.exit` skipped the entire teardown — **156 of 226 recorded deaths emitted no terminal frame**. A stale-lock clock made crash recovery never once fire. | **3 fixes + 2 gate commits**; 3 sites deliberately unfixed and carded                            | **Both**                                                        | `62a5972`             | **Partially covered** — E1/G1, gap _"no invocation that does real work is sent at L0"_                                   |
| 8   | **`--flag=value` unparsed**                                         | Whitespace-only splitting made `owner=alice` a boolean flag name and dropped the value. A read filter then matched nothing and **returned the whole board** — a wrong answer wearing a right answer's shape.                                                                                               | **1 fix** + folded into class 2                                                                  | Spellbook (5 spells)                                            | `df91148`             | **Partially covered** — A1, gap _"a flag carrying a value is never probed…"_                                             |
| 9   | **A dash-leading value is unpassable, and `--` does not rescue it** | `commit -m "-fix the thing"` unusable in the command every seat runs. `comms send -- "a" b` dropped `b` **identically to the unprotected form**. A `--` terminator swallowed the `--session-key` that provides isolation; the write landed on the ambient board at exit 0.                                 | **2 fixes + 1 ward**; **1 open** (demotion half)                                                 | **Both**                                                        | `a13b7f1`             | **Covered on paper by A6, blind in practice** — see §6.10                                                                |
| 10  | **An emitted invocation is not runnable**                           | A CLI printing a command for its caller emitted prose fused into the command (`bash -n` exit 2), or a bare binary name resolving through PATH to a different build lacking the flag the string depends on.                                                                                                 | **5** (anthill) + 1 (Spellbook, doc-level)                                                       | **Both**                                                        | `10bae00`             | **MISSING** — scope question, §5.6                                                                                       |
| 11  | **An invalid value for a closed set is accepted**                   | `--format josn` → **exit 0** and silent fallback to the environment default. `add --size <bogus>` → `ok:true`, size discarded.                                                                                                                                                                             | **2 fixes + 1 open**; **plus one in `acc` itself**                                               | **Both**                                                        | `82dc363`             | **MISSING** → propose `A7`                                                                                               |
| 12  | **Crash before dispatch**                                           | The CLI threw at module import when run outside its own repo, so every invocation including `--help` died at exit 1 with a stack trace.                                                                                                                                                                    | **1**                                                                                            | anthill                                                         | `c051d58`             | **Covered — C1 + D1.** The one hit.                                                                                      |
| 13  | **Help advertises a flag the verb refuses**                         | `comms read --help` listed `--as=<as>` in its OPTIONS block on the exact verb that rejects it, with an empty description.                                                                                                                                                                                  | **1**                                                                                            | anthill                                                         | `6544d4f`             | **Partially covered** — D3, gap _"a pass establishes only that help names the flag and never that the flag is accepted"_ |
| 14  | **`--version` asserts sameness between different binaries**         | Two binaries both reported `1.7.1` while behaving differently — one lacked the flag the CLI's own emitted commands use, and they disagreed about the format decision.                                                                                                                                      | **1**                                                                                            | anthill                                                         | `5bfd97f`             | **Partially covered** — D1, gap _"the structured machine-mode version payload is never inspected"_                       |
| 15  | **Truncated input destroys the next write**                         | A channel file whose last line was cut mid-JSON silently destroyed the next message and answered `ok:true`; ids were reused, so every cursor and resume was wrong.                                                                                                                                         | **1**                                                                                            | Spellbook                                                       | `6fdf2a6`             | **Out of scope** — state durability, not observable from argv/streams                                                    |

---

## 4. Cross-repo recurrence

The strongest evidence for a new rule is a class appearing in both repositories from independent
causes. Six qualify.

| Class                                                    | Spellbook                                                      | anthill                                 | Independent?                                                                                                                                                                          |
| -------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Unknown flag accepted, verb runs** (2)                 | `df91148` 2026-06-16, then `82adf9a`+3 on 2026-08-06           | `f5668cb` 2026-07-31 (`strict:false`)   | **Yes** — Spellbook's first instance predates any contact by six weeks. Cross-pollination followed (`1a14ed3` folds anthill's parser-guard lessons into P0c) but both found it alone. |
| **Positional swallowed** (5)                             | `82adf9a` (title truncation)                                   | `4c339fa`, `3f7619d` M2                 | **Yes** — different mechanisms, same observable.                                                                                                                                      |
| **`null` not `0` when unknowable** (3)                   | `44f6108` 2026-08-08, ported from bounty's `snapshotTaskCount` | `400e348` 2026-08-01                    | **Yes** — anthill's is a week earlier and cites a different reporter.                                                                                                                 |
| **Field totality: present-and-`null`, never absent** (3) | `#80` D1.2 → `restoreSkipped`                                  | `7ed0f53` _"uncheckedAgainst is TOTAL"_ | **Yes** — and both repos independently reached the identical framing that absence is unreadable.                                                                                      |
| **Dash-leading values and `--`** (9)                     | `664f118`, `815a905`, `a1e97a2`                                | `a13b7f1`, `f89686c` m10, `3f7619d` M2  | **Yes.** Spellbook's card `t-2df67738` records anthill hitting _"the identical defect"_ separately.                                                                                   |
| **Process lifecycle: never exits / wedges** (7)          | `62a5972`, `2cc513d`                                           | `c051d58`, `f89686c` m7, `4acba7c`      | **Yes** — five different mechanisms, one observable.                                                                                                                                  |

**One that is _not_ independent, recorded so it is not over-counted.** The drained exit (class 1)
was root-caused in Spellbook and _communicated_ to anthill, which then built a size tripwire
(`8e304f8`) rather than discovering it. anthill's message says so plainly: _"Told to us by
spellbook's maintainer… Neither project would have got here alone."_ That is corroboration of the
mechanism across two runtimes, not independent recurrence — but it is stronger evidence than either
alone that the hazard is a property of the runtime, not of one codebase.

---

## 5. Missing-rule proposals, ranked by real cost

### 5.1 `B4` — a command delivers every byte it wrote

**Family:** B (streams). **Cost: the highest in the corpus.**

Spellbook's sprint 01 exists for this defect. Six code fixes (`c29aa4e`, `ec33378`, `2334ed2`,
`714af29`, `62a5972`, and the signal slice `2cc513d`), four gate commits (`59517c3`, `5dc8377`,
`e5b8480`, `f238471`), 9–10 entry-point sites plus 5 `tail` sites across 8 spells, and **37 exit
sites pinned** so the reading could not rot. It produced the only documented rework in either
corpus: `f4d4c47`, _"a drained-exit fix trades a truncation for a HANG, and nothing asserts a CLI
exits"_ — the bulk fix at `ec33378` shipped a 23-minute hang, and the repair at `62a5972` was ruled
fix-forward rather than revert because _"a hang announces itself; truncation does not."_

**The assertion:** _A command that writes to stdout MUST deliver every byte before the process
terminates. A target whose stdout is short when its consumer is momentarily not reading, relative
to the same invocation redirected to a file, violates this rule._

**Why no existing rule reaches it.** `B3` is the closest and asserts only that what arrives
_parses_; a payload truncated at a buffer boundary usually does not parse, so `B3` would fire
**if it ever looked at a data command** — which is precisely its declared gap (§6.4). `B1` inspects
stdout only on failures. `G1` observes only how the process ended, and this process ends correctly:
exit 0, no signal.

**Probe design, and the two traps the subject repo already hit.** Both are non-obvious and both
cost them a cell that passed against the live bug:

- **A payload over 64 KiB is not sufficient.** Measured with the bug present: 10 MB replayed
  through `| cat` arrived complete at every timing, because a consumer that keeps draining lets
  each write finish. What discriminates is whether bytes are _undrained at the instant of exit_ —
  so the probe must drive a **momentarily non-draining consumer** (`| ( sleep N; cat )`).
- **A pipe created by `Bun.spawn({stdout:"pipe"})` cannot fail on this defect.** Measured: same
  board, defect present — shell pipe 65,536, `Bun.spawn` pipe 114,042. Their gate law `G6` requires
  the `sh -c "… | cat"` construction verbatim. **`acc`'s runner spawns with piped stdio**, so a
  naive `B4` checker built on the existing runner would pass against the defect it was written for.

**Level:** `L1`. It requires a command that produces bulk output. This is the strongest single
argument in this note for building the level ladder.

### 5.2 `G2` — a command that does real work terminates

**Family:** G (lifecycle) — already named in `roadmap.md` §7 as _"bounded shutdown"_, but the
specific clause below is not among the listed members.

**Cost:** the glamour hang (`62a5972`, measured at 91 seconds and separately at 23 minutes); three
`tail` sites where the drained-exit fix is _blocked_ because applying it converts truncation into a
hang, carded rather than fixed; `bounty/join.ts` deliberately left carrying the defect for the same
reason; anthill's lock clock (`f89686c` m7) which made stale-lock recovery **never once fire in any
run**, wedging the command every seat uses; `#98`, still open, where `bounty tail` against an
unresolvable board retries forever, exits 0, and looks alive — it cost the reporting team 40
minutes.

**The subject repo already wrote this rule.** Gate law `G7`: _"Every drain gate asserts the process
EXITS."_ Its rationale is the sentence this whole note is about: _"the suite was green, both P0
gates were green, and a 23-minute hang in a shipped spell's entry verb was invisible to all of
them, because nothing asserts that a CLI returns."_

**The assertion:** _A command given a complete and valid invocation MUST terminate within a
declared bound. A CLI MUST NOT be kept alive by a stdio handle it opened for a child process it
does not await._

**Two design constraints they paid for, and both invert normal practice:**

- **Set the budget from the failure, not the success.** A hang is unbounded, so a tight budget is
  all cost and no coverage. Their 15,000 ms budget failed a peer's land at **15,004.99 ms**.
- **Reachability, not just redness.** _"Every 'the process returned' needs 'and my instrument could
  have observed it NOT returning.'"_ Under a one-word stdio change their cell did not go red — it
  became _unreachable_, degrading from "a red cell naming the hung verb" to "a slow suite." `E1`'s
  declared gap _"blocking is only detected when it outlasts the kit's deadline"_ is the same
  property, and `G2` must not inherit it silently.

**Relationship to `E1`.** `E1` is the catalogue's backstop for hangs but its subject is _waiting on
input_. A CLI held open by a child's pipe is not blocked on stdin; it has simply not finished. They
are different rules and `E1` should not be stretched.

### 5.3 `B6` — declared fields are total, and an unknown value says so

**Family:** B (streams / machine output). **Largest defect population by commit count: ~12 across
both repos, independently.**

Two clauses, and they are separable:

- **(a) Totality.** _A field a consumer is told to read MUST be present on every path of the
  command that declares it, carrying `null` where it has nothing to report — never absent._
  Instances: `restoreSkipped` (`8f4d92d`), `uncheckedAgainst` (`7ed0f53`, where four seats hit it
  in one session and one parsing with `Object.hasOwn` got nothing), `down` on every `close`
  (`05d2591`), `source` on `--version` (`5bfd97f`).
- **(b) Unknowability.** _A value that can mean both "none" and "I could not establish this" MUST
  distinguish them._ Instances: `message_count: 0` for 57 of 57 unloaded channels feeding a
  keep-or-delete decision (`44f6108`); `gap: 0` for a never-followed seat (`400e348`);
  `version_ok` unable to say "unknown" (`4b92c64`); `workspace: null` identical for a real app and
  an unreadable repo (`792ba70`); `fresh: true` meaning "I forwarded the flag" (`73e8fea`).

**⛔ Adopt clause (a) and the structural restatement of (b) only — clause (b) as written is
measurably unmechanisable, and Spellbook proved it with numbers so this project does not have to.**
Their sprint 05 ran the experiment: a checker for _"`null` not `0` when you cannot answer"_ scored
**0 true positives, 2 false positives, and 26 of 33 scalar functions undecidable**, over the two
files the rule was derived from. The corpse is kept in their tree as
`scripts/instruments/type-sentinel-probe.ts`. Their conclusion is exact and it generalises: _"You
cannot mechanically detect that a `0` is a lie."_

The restatement that _is_ checkable is structural and behavioural rather than semantic: **the same
command invoked in two states must produce the same key set.** That is a black-box probe — run a
command against a populated target and an empty one, diff the key sets, fail on any key that
appears in one and not the other. It establishes (a) outright and gives (b) its only mechanisable
half. It is `L1` or higher, and it needs the fixture support of §5.1.

### 5.4 `A7` — a flag with a closed value set rejects a value outside it

**Family:** A (parsing). **Lowest build cost of any proposal here, and probe-able at `L0` today.**

**Cost:** anthill's `--format josn` → **exit 0**, silent fallback to the ambient TTY heuristic —
still open at HEAD, reproduced today, and pinned in their own suite as a deliberately-failing
`KNOWN DEFECT` test. `bounty add --size <bogus>` → `ok:true` at exit 0 with the size discarded
(`82dc363`, resolved as an audible `valuesIgnored` rather than a refusal — a ruling, not an
oversight, and worth reading before writing this rule). `glamour` `cli --kind validation`
(`1f51fd8`).

**And there is an instance in the reference implementation.** `src/acc/cli.ts` carries this
comment on `rejectOutOfSet`:

> `acc rules --format nonsense` returned 4KB of data and exit 0. That is the precise
> silent-acceptance shape A1 and A3 exist to catch in OTHER CLIs, in the reference implementation
> itself.

`acc` fixed it — `acc rules --format nonsense` now exits 2 with `choices: ["text","json"]` — but
**no rule requires it**, so nothing stops it regressing and nothing asks it of any other target.
A rule the reference implementation has already had to satisfy, twice caught by hand, is the
clearest possible candidate.

**The assertion:** _A flag whose valid values are a closed set MUST reject any value outside it
with a usage error, and SHOULD enumerate the set. It MUST NOT silently fall back to a default._

**Probe:** send a discovered value-taking flag with a sentinel value. `L0`-safe when the flag is one
help declares with an enumerated set — `--format` is the canonical case, and `inert.ts` already
reasons about `FORMAT_TOKENS`. This closes `C2`'s declared gap _"a malformed value… never
compared"_ from the other side.

### 5.5 `B5` — machine mode holds on the parser-error path

**Family:** B (streams), adjacent to `B3` and `D3`.

**Cost: 5 commits in anthill, and the class is total in Spellbook.** anthill fixed it twice
independently — `01745cf` and `e03ec52`, two people, two branches, four days apart, with
differently-named helpers, both landed. Also `f89686c` M3 (help and version ignored the format
verdict), `b42cf7c` (guards threw instead of emitting), `3f7619d` M1 (`comms follow` wrote raw
records bypassing the emitter — on the most-executed command in the product, so _every seat had
been consuming non-envelopes and an agent branching on `.ok` got `undefined` on every message_).

The framing that makes this a rule rather than a bug: _"`--format json` promises an agent a
parseable envelope on every outcome. That held for errors raised INSIDE a command and broke for
errors raised by the PARSER — the class an agent hits most, since a wrong flag is the commonest way
an agent gets a command wrong."_

Spellbook has the same class in its absolute form. Their cross-project investigation measured
`ok:true` **112 times and `ok:false` zero** across the tree, with failures printing prose to stderr
— so a piping agent gets `ok:true` and exit 0: _"not a degraded signal but no signal, and a
positively reassuring one."_ They reclassified their missing error envelope from deferred to
blocking on that reading.

**The assertion:** _When machine mode is selected, every outcome — including a failure raised by
the argument parser before any command is dispatched — MUST be emitted in the declared machine
shape._

**Probe:** `--json --acc-sentinel-flag` (or the discovered machine-mode flag). Fully inert, `L0`,
and it composes with probes `A1` and `A3` already send — the recorder's dedup would merge them.

**One load-bearing implementation note, from `e03ec52`.** Do not resolve machine mode by matching
the literal string `"json"`. Their 8-cell matrix showed parser errors did not participate in format
resolution _at all_, so a literal-match fix repairs the explicit-flag row and leaves
**no-flag-piped** broken — the row that matters most, because piped already defaults to JSON and
the CLI's own emitted commands pass no `--format`. `acc`'s own `earlyMode()` already gets this
right and is a good reference. A related sub-clause worth carrying: a repeated `--format` must
resolve last-wins, or the same argv yields two verdicts depending on which code path saw it.

### 5.6 Two classes deliberately not proposed as rules

**Writes that report success without applying** (class 6, 5 commits) is real and expensive, but
`ok` meaning _"I parsed your JSON"_ versus _"the write took effect"_ is not decidable from argv,
streams and exit status without a second observation of the target's state. It belongs to an `L2`
effects model, not to a rule. Record it as a reason the level ladder needs a state-observation
concept, not as a rule proposal.

**Emitted invocations must be runnable** (class 10, 6 commits, both repos) is a genuine
agent-facing contract — a CLI that prints a command for its caller to run and prints something
unrunnable has failed at its interface. `10bae00` is the sharpest case: the emitted "LAND with this
EXACT string" fused a warning into the command, `bash -n` returned exit 2, and **every existing
footprint emitted the broken branch**. But it is a claim about the _content_ of stdout rather than
its shape, and a checker would have to know which output is meant as a command. Flagged for the
`D`-family discussion; not proposed until the archetype work (`delegator` and friends) gives it
somewhere to attach.

---

## 6. Partially-covered findings, ordered by breakage let through

These are the highest-value results in this note: they convert 78 flat gap strings into a priority
order backed by real defects. Each names the **exact declared gap string** from the checker.

### 6.1 `A1` — _"only the root is probed so a flag unknown to a subcommand is not"_

**Breakage let through: class 2 in full — 5 fixes, 6 entry points, 5 spells, plus anthill's
`f5668cb`.** This is the single most expensive gap in the list.

**Proven, not inferred.** T1 pre-fix: `bounty list --totally-bogus-flag` → exit 0. `acc` reports
`A1 pass — root flag rejected with exit 2, stdout empty, flag named`, because its probe is
`--acc-sentinel-flag` at the **root with no verb**, and at the root the pre-fix CLI hits its
no-verb usage path and exits 2 for an unrelated reason. Every one of these tools takes its verb as
a root positional, so "unknown to a subcommand" is not an edge case here — **it is the only place
the defect lives.**

The consequences recorded in the fix messages are not cosmetic: `bounty close --help` **closed the
board**; `state --help` dumped it; `tail --help` opened the stream and never exited.

**Fix:** the probe needs a verb. That requires knowing a safe verb, which is `L1` — or a
`read_only`-declared command, which is the same prerequisite `A4` names.

### 6.2 `A4` — _"no probe is declared so nothing about arity is established"_

**Breakage let through: class 5, and it contains the corpus's only data-destroying defects.**

`A4` is `L1`, declares no probes, and returns `unverified` unconditionally — so it has never
checked anything, and T5 confirms it reports `unverified` identically on the defective and repaired
trees. What it nominally governs:

- `comms read --channel <ch> zzz999` → **exit 0, `ok:true`, the entire log**, where the size of the
  result was the only tell (`4c339fa`).
- `comms send "hello there" world` stored the first token and discarded the rest at `ok:true` — and
  `send -- "a" b` dropped `b` identically, so the defence a careful caller reaches for failed the
  same as no defence (`3f7619d` M2).
- `bounty add write the --draft section` stored the title `"write the"` at exit 0.
- **Still open, and the worst of them:** `bounty update <id> --stdin < notes.md` writes the
  **title**, not the notes — `--stdin` replaces the verb's positional and `update`'s only
  positional is `<id>`. The previous title is gone, there is no undo, and the envelope says
  `{"ok":true,"valuesIgnored":null}` — the honesty field returning a confident false negative on
  the exact path that destroys data. Reproduced by destroying a live card's title, 1,592 bytes
  _(reported, `05a30d3`; the code defect is untouched)_.

**Priority argument:** `A4`'s page is written, its id is minted, its tier is core — and it is the
governing rule for the only defects in 1,392 commits that destroyed user data. Of the 78 gaps,
this is the one whose closure buys the most.

### 6.3 `A1` — _"a flag carrying a value is never probed so absorbing that value as a positional is not established"_

**Breakage let through: class 8 (`#81`, 5 spells) and its inverse, still open in anthill.**

Proven at T2: `--prompt=a sunset` became the boolean key `"prompt=a sunset"` and the value
vanished. The consequence recorded in `82adf9a` is the shape this whole project exists to catch:
`--owner=alice` dropped the value, the read filter then matched nothing, and the tool **returned
the whole board** — _"the shape that makes a wrong answer look like a right one."_

The **inverse** is live at anthill HEAD and was reproduced today:

```
anthill info --format json   ->  exit 1  {"ok":false,"error":"Unknown command json"}
```

Group dispatch scans for the first non-flag token, so the _flag's value_ is read as the subcommand
name, and the error names a token the caller never intended as a command. Same gap, opposite
direction: the probe that would catch either is a discovered value-taking flag sent both as
`--flag=value` and `--flag value`, with the parse observable.

### 6.4 `B3` — _"only machine-mode help is parsed and never a data command"_

**Breakage let through: class 1, the drained exit — the most expensive class in the corpus.**

`B3` is the rule that would have caught truncation, because a payload cut at 65,536 bytes does not
parse. It never looks at a payload. §1.3 is the demonstration: a fixture that loses 57% of its
output scores `conformant: true` with zero core failures.

Second-order: `B3` reported `unverified` on **6 of 7** real targets in this survey, because none
advertises a machine-mode flag in help — so on this corpus the gap and the rule's own precondition
compound.

### 6.5 `G1` — _"no invocation that does real work is sent at L0 so a crash on the paths a caller actually uses is out of reach"_

and `E1` — _"only inert paths are probed so a real confirmation path is never reached"_

**Breakage let through: class 7 in full.** T4 is the proof: `glamour open` ran 91 seconds in one
measurement and 23 minutes in another, and both `E1` and `G1` report `pass` on that tree because
the four inert invocations terminate normally. Also `#98` (`bounty tail` retrying forever at exit 0
while looking alive), and three `tail` sites where the class-1 fix is blocked precisely because it
would convert truncation into a hang.

### 6.6 `G1` — a new gap this survey found: _aborting before dispatch is not attributed_

Not currently on `G1`'s gap list, and §1.4 is the evidence. `G1`'s taxonomy distinguishes a fault
signal from the kit's own kill, but a target that **throws at module import** terminates by its own
`exit(1)` — under the target's own control by `G1`'s definition — while having parsed nothing,
written nothing, and answered nothing. It collected the same nine vacuous passes the `kill -SEGV`
fixture once did.

**Suggested gap string, or a `G1` clause:** _a target that terminated identically and wrote nothing
to stdout on every probe is not distinguished from one that answered each probe correctly._ The
signal is cheap and already in the record: identical non-zero exit across `--help`, `--version`,
bare and both sentinels, with empty stdout everywhere, cannot be correct behaviour for `--help`.
`C1` already catches the `--help` arm; what is missing is the attribution that would turn the other
eight rules' passes into `unverified`, which is exactly what `G1` was minted to do for signals.

### 6.7 `B1` — _"machine mode is never selected so an error envelope written to stdout only in machine mode is not seen"_ and _"stdout on a SUCCESSFUL command is never inspected for diagnostics"_

**Breakage let through:** `3f7619d` M1 — `comms follow` under JSON wrote raw records straight to
stdout, bypassing the emitter, on the most-executed command in the product. Also `b386800`, where a
production-shaped envelope was printed onto a stream that was not supposed to carry it.

### 6.8 `A3` — _"the machine-mode error envelope field is never inspected"_

**Breakage let through:** class 4 in full — `01745cf`, `e03ec52`, `b42cf7c`, `f89686c` M3. `A3`
checks that the offending token reaches stderr _as prose_. The defect these five commits fix is
that the rejection reaches stderr as prose **when the caller asked for JSON**. `A3` passing is
compatible with the defect being present, which T7 confirms: `A3` reports `fail` on both trees for
an unrelated reason and is blind to the change that landed.

### 6.9 `D3` — _"a pass establishes only that help names the flag and never that the flag is accepted"_

**Breakage let through:** `6544d4f` — `comms read --help` listed `--as=<as>` in its OPTIONS block on
the exact verb that refuses it, with an empty description, so it read as a real option someone
forgot to document. The parser already omitted refused names from the valid-set it printed on
rejection; the help renderer did not apply the same rule. **This is the declared gap with a real,
named instance** — the cheapest gap on the list to close, since the probe is "send the flag help
advertises and require it not to be rejected as unknown."

### 6.10 `A6` — not a declared gap, a **kit defect**: `A6` is blind to this entire corpus

On **7 of 7** real targets, `acc` reported:

```
A6 unverified — cannot be probed through a `bun` launcher: bun swallows the leading `--`,
                so the target never receives the terminator
```

Meanwhile the `--` terminator is class 9: a live, open, cross-repo defect family. Spellbook's `c1`
is open today across a denominator of _7 entry points by path, 16 by behaviour, 8 spells_, and its
severe form is that `--` **demotes** the `--session-key` flag that provides isolation, so the write
lands on the ambient board at exit 0. anthill measured that `--` failed to protect surplus
positionals identically to no protection at all.

`A6` is the rule for this and it cannot see a single target in either repository. Since `bun`-,
`node`- and `deno`-launched `.ts` CLIs are exactly the population this catalogue is aimed at, the
launcher workaround (`--` doubling, or invoking through the shebang, or `run --`) is worth more
than most new rules. Note `check.ts` already prefers direct execution so the kernel honours the
shebang — the remaining blindness appears when it cannot.

### 6.11 `D1` — _"the structured machine-mode version payload is never inspected"_

**Breakage let through:** `5bfd97f`. Two binaries both reported `1.7.1` while behaving differently
— one lacked the flag the CLI's own emitted commands depend on, and piped `--help` returned text
from one and JSON from the other. _"The version string did not merely fail to inform. It ASSERTED
SAMENESS."_ The fix adds a total `source` field naming which file answered. `D1` requires only that
`--version` exits 0 with non-empty stdout, which both binaries satisfied.

### 6.12 `C2` — _"only an unknown flag and an unknown verb are contrasted so an unexpected positional and a malformed value and the bare invocation are never compared"_

Both of the uncompared shapes named in this gap are real defect classes in this corpus: the
unexpected positional is §6.2, the malformed value is §5.4. `C2` reported `unverified` on all three
anthill trees (_"usage errors are consistent at exit 1, but not the declared 2"_), so on this corpus
it establishes nothing either way.

---

## 7. What this says about the catalogue as a whole

**The catalogue is not wrong; it is aimed at a different surface than the one that breaks.** Of the
15 defect classes in §3, eleven are governed by an existing rule and would be caught if that rule
could reach the path. Only four need genuinely new rules. That is a coverage story about **probe
reach**, not about rule design — and it is the more tractable of the two problems.

**Three structural observations:**

1. **Almost every miss is a level problem.** `L0`'s guarantee — probe nothing that could act — is
   also the reason the kit cannot see the flag-with-a-verb, the payload, the running process or the
   machine-mode failure path. Four of the seven priority recommendations in §1.6 are blocked on
   `L1` and one (`A6`) on a launcher fix. **The level ladder is not a nice-to-have; it is where the
   coverage is.**
2. **Two of the cheapest wins need no new level at all** — `A7` (§5.4) and `B5` (§5.5) are both
   inert, both `L0`-safe, both compose with probes the recorder already dedups, and both have real
   instances including one inside `acc` itself.
3. **`L1` needs an environment sandbox before it needs probes.** §2.3 gives the argument and the
   subject repos give the existence proof: 4 of 7 daemon-spawning tools do not isolate on their
   home variable, a peer project's suite leaks 31 live daemons per run, and Spellbook deliberately
   declined to build its own conformance gate as a behavioural drive because _"a gate that can
   mutate the state it runs beside is not a gate."_ Every rule that would close the gaps in §6
   requires running a real command. `acc` inherits `HOME`.

**And one warning the subject repo paid for that applies directly to building any of the above.**
The first draft of every such check will be wrong in a way that reads as authoritative. Their first
structural check reported _186 of 380 (49%)_ — well-formed, plausible, precisely formatted, wrong,
at exit 0 — and was caught by the hit rate being implausible on its face, not by review. Their
second draft _convicted correctly and its silence still meant nothing_. Their conclusion:

> Budget three revisions per rule, not one — and calibrate each cell in _both_ directions before
> its green is allowed to license anything.

This is the same claim `R4-8` makes, arriving from a project that ran the experiment. `B4` in
particular has two documented ways to build a cell that passes against the live bug (§5.1), and
`acc`'s piped-stdio runner walks into one of them.

---

## 8. Confidence

**High confidence:**

- The hit rate of 1/7 and every pre/post verdict in §1.1. These were executed, captured by file
  redirection, and each defect was independently reproduced in the archived tree.
- §1.3 — the `conformant: true` verdict on a CLI that loses 57% of its payload. Fixture built,
  driven and measured here.
- §1.4 — the nine vacuous passes. Read directly off the T6-pre report.
- §1.5 — the discoverability dominance. Read directly off eight reports.
- §2.3 — no daemon leaked. Snapshots taken and diffed.
- §6.1, §6.2, §6.3, §6.10 — the gap attributions, each tied to an executed observation.

**Medium confidence:**

- The commit counts in §3. They are `--grep`-derived lower bounds over a ~5% message-level read.
  Treat every number as "at least this many". The classes are right; the totals will grow.
- The cross-repo independence claims in §4. Dating and reporter attribution come from commit
  messages. The two repos actively exchanged findings during the period, and I traced the direction
  of transfer where the messages state it — but a private conversation I cannot see could reverse
  one of these.

**Lower confidence, flagged:**

- Any claim marked _(reported)_ rests on a commit message or project document rather than a diff or
  an execution — chiefly the daemon-spawn inventory in §2.3, the leak measurements, and the open
  `bounty update --stdin` defect in §6.2.
- Class 6 and class 10 sizing (§5.6). Both were assembled largely from delegated message-level
  reading.
- **This survey read ~5% of the history.** The classes reported here are the ones a defect-vocabulary
  grep surfaces. A class that was fixed quietly, in a commit titled as a refactor or a feature, is
  invisible to this method — and `9f77c39` (anthill dropping `citty` for an in-house parser, the
  surface every later parsing defect lives on) is a live example of how much can land under a
  non-defect subject.

**One correction found in the source material, recorded so it is not propagated.** Spellbook's
`roadmap.md` attributes `#81`'s fix to `df91148` and cites it as shipping six regression cells.
`df91148` is dated 2026-06-16, nearly two months before `#81` was filed, and is an imago-only
`--flag=value` fix. `#81`'s actual fixes are `82adf9a`, `a1e97a2`, `2d8d578` and `e7504cf`. The
properties the roadmap cites are true of `df91148`; the attribution is not. This note treats them
as two instances of one class (classes 2 and 8), which is why both appear.

---

## 9. Evidence index

**Empirical replay** — trees materialised at these shas, `acc check` output captured per tree:

| #   | pre-fix (parent) | post-fix  |
| --- | ---------------- | --------- |
| T1  | `2dd1c60`        | `82adf9a` |
| T2  | `0ae943a`        | `df91148` |
| T3  | `66d59b7`        | `c29aa4e` |
| T4  | `f4d4c47`        | `62a5972` |
| T5  | `32d087a`        | `4c339fa` |
| T6  | `cac339e`        | `c051d58` |
| T7  | `86f9216`        | `e03ec52` |

**Primary commits read in full** — Spellbook: `df91148`, `82adf9a`, `a1e97a2`, `2d8d578`,
`e7504cf`, `8f4d92d`, `2334ed2`, `714af29`, `ec33378`, `c29aa4e`, `62a5972`, `f4d4c47`, `44f6108`,
`3d863d5`, `2cc513d`, `6fdf2a6`, `14bec41`, `664f118`, `03ca9fb`, `05d2591`, `e627a40`, `815a905`,
`05a30d3`, `4ff6a08`. anthill: `4c339fa`, `a13b7f1`, `3f7619d`, `01745cf`, `e03ec52`, `f89686c`,
`5bfd97f`, `6544d4f`, `8e304f8`, `4d7dbed`, `b42cf7c`, `c051d58`, `d0c1fa7`, `400e348`, `2492d34`,
`f5668cb`, `7ed0f53`, `4acba7c`, `4f5cf9a`, `10bae00`, `792ba70`, `73e8fea`.

**Project documents** — `Spellbook/docs/projects/spell-hardening/{roadmap,proposal,README}.md` and
`sprints/01`–`06`; `anthill/docs/projects/agent-failure-surface/README.md`;
`anthill/docs/backlog/2026-08-01-the-cli-failure-surface-lies.md`; and the open backlog items cited
inline.

**Repository state verified unchanged at close:** `Spellbook` `cf81ccc`, clean;
`dreamwood/anthill` `9c09c1e`, clean.
