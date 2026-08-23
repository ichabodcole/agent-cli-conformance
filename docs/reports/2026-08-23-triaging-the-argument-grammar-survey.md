---
type: report
generated: { by: claude-opus-5, at: 2026-08-23 }
status: stable
lifecycle: live
description:
  A research agent surveyed CLIs for argument grammars that would falsify this kit's assumptions.
  Nine of its warnings land, two of them as false passes reproduced here against fixtures; five do
  not apply to us at all, and three of its claims are overstated.
tags: [parsing, discoverability, exit-codes, machine-mode, evidence, l1]
subject: docs/wiki/rules/** and src/acc/kit/checkers/**, triaged against an external CLI survey
examined: acc at 78c9f39 on `develop`, catalogue of 23 rules, 22 checkers, macOS arm64, bun 1.4.0
---

# Triaging the argument-grammar survey

A research agent was asked for CLIs whose **argument grammars would make this kit's assumptions
false**. It installed and ran nothing: every behavioural claim it made is either cited to a primary
source or marked as inference, and the citations are preserved below because the value of the
survey is in the specific counter-examples, not in the shapes it grouped them under.

This document is the triage, not the survey. A warning aimed at conformance checkers in general is
not automatically a warning about us, and the two questions the survey could not answer are the
ones that decide whether a finding matters here: **does this catalogue actually assert the thing,
and does asserting it change a verdict?** So each item below names the rule id and the page or the
line of code that carries the assumption — or says explicitly that nothing here carries it.

**Two findings were reproduced by running the kit**, not by reading it. Fixtures are in the
session scratchpad rather than the tree; each one is four lines and is quoted in full where it is
used, because the mechanism is the whole evidence and a path that will not exist tomorrow is not.

## What landed, ranked by what it does to a report

A false pass ranks above everything else: nobody investigates a green line. Below that, a false
fail costs the reader an afternoon and gets found. An unverifiable verdict is the mildest, because
the kit says so out loud — but a rule that can only ever be `unverified` against a whole family of
targets is a rule that is not doing its job for them.

| id        | what                                                             | effect                | fix at |
| --------- | ---------------------------------------------------------------- | --------------------- | ------ |
| `SURV-1`  | `C1` credits `-h` as help when `-h` is not help                  | **false PASS**        | `L0`   |
| `SURV-2`  | `D3` credits `--output <file>` as a machine-mode flag            | **false PASS**        | `L0`   |
| `SURV-3`  | `A6`'s rejection detector is English-only, over inherited locale | **false PASS**        | `L0`   |
| `SURV-4`  | non-verb targets are a family, not one target (`rg`)             | **false PASS** (`A2`) | `L1`   |
| `SURV-5`  | `C1` fails a target whose `-h` takes an argument                 | false FAIL            | `L0`   |
| `SURV-6`  | `D3`'s failure message describes a check the code does not run   | wrong message         | `L0`   |
| `SURV-7`  | the ambient environment and the platform are not recorded        | unverifiable          | `L0`   |
| `SURV-8`  | bitmask exit codes have no place in the taxonomy                 | unverifiable          | spec   |
| `SURV-9`  | delegators do not own their exit codes                           | unverifiable          | `L1`   |
| `SURV-10` | `A5`'s probe cannot produce the abbreviation its page names      | undetectable defect   | `L0`   |
| `SURV-11` | `C1`'s "regardless of what else is on the command line"          | dormant until `L1`    | `L1`   |

---

## The false passes

### `SURV-1` — `C1` records a pass on `-h` when `-h` is not help

**The rule asserts it, not just the checker.**
[`help-exits-zero.md`](../wiki/rules/exit-codes/help-exits-zero.md) opens with:

> `--help` (and `-h`, and a `help` subcommand where present) **MUST** exit `0` and write the help
> text to **stdout**.

[`help-exits-zero.ts`](../../src/acc/kit/checkers/exit-codes/help-exits-zero.ts) probes both
`["--help"]` and `["-h"]`, and its only test on the output is `o.stdout.trim() !== ""`. The file
declares that limit as a coverage gap — _"stdout is only required to be non-empty and is never
checked to contain help text"_ — but a gap qualifies a pass; it does not withhold one.

**`-h` is one of the most overloaded single letters in the Unix vocabulary.** The survey's
instances, with its citations:

- **`samtools view -h`** = "Include the header in the output"; **`tabix -h`** = "print also the
  header/meta lines" ([htslib](https://www.htslib.org/doc/tabix.html),
  [samtools-view](https://www.htslib.org/doc/samtools-view.html)).
- **`redis-cli -h`** is `--host` ([redis.io](https://redis.io/docs/latest/develop/tools/cli/)); so
  is `psql -h` and `mysql -h`.
- Not from the survey, and the cleanest root-level instance: **GNU `df -h`, `du -h`, `ls -h`,
  `sort -h`** all mean "human-readable", all exit `0`, and all write to stdout.

**Reproduced.** A fixture whose `--help` is correct and whose `-h` prints a disk table:

```
$ acc check humanish.ts
C1 pass | root --help and -h both exit 0 with non-empty stdout
→ CONFORMANT (L0), 0 core violations
```

The tool did real work on the probe and was credited with answering a question it was never asked.
This is the same class as the `ripgrep` false `PASS+ A2` in the [blind
trial](./2026-08-23-blind-trial-ripgrep.md) — a green line resting on a token whose meaning the kit
guessed from its spelling — and it is a **second, independent mechanism**, reachable on a target
whose verb dispatch is perfectly ordinary.

**It is also a safety finding, and that half is worse.** `-h` sits in `HELP_TOKENS` in
[`inert.ts`](../../src/acc/kit/inert.ts), so `classifyInertness` certifies `["-h"]` as a
`help-path` — the class the gate treats as provably safe because "every token starts with a dash
and at least one is a help token". The certification rests entirely on `-h` meaning help. The kit
already refuses exactly this reasoning one file over:
[`machine-mode.ts`](../../src/acc/kit/machine-mode.ts) declines `--output` as a selector because
_"it names an output FILE at least as often as an output format"_, and calls a probe whose meaning
depends on which sense a target implements "not a probe". `-h` is that sentence with a different
letter. `-v` and `-V` are in the same set and are not currently probed, so the exposure is latent
rather than live for those two.

### `SURV-2` — `D3` credits `--output <file>` as a machine-mode flag

[`discovery.ts`](../../src/acc/kit/discovery.ts) matches `MACHINE_FLAGS = ["--json", "--format",
"--output"]`, and the value-slot exclusion is applied to **`--json` only**:

```ts
const machineModeFlag =
  MACHINE_FLAGS.find((f) => flags.includes(f) && !(f === "--json" && takesRequiredValue(lines, f))) ??
  null;
```

So a tool documenting `--output <file>` — `curl`, `ffmpeg`, `ogr2ogr`, every `cp`-shaped tool in
the survey's Shape 3 — is scored as advertising a machine-readable path. **Reproduced**, against a
fixture whose help says `--output <file>   write the body to <file>`:

```
D3 pass | help advertises --output
```

`--format <fmt>` goes the same way, and carries further: it is the one spelling
`machineSelector` accepts, so `B1` and `B2` then send `--acc-probe-xyzzy-flag --format=json` to a
tool where `--format` is `ps`'s column layout
([ps(1)](https://man7.org/linux/man-pages/man1/ps.1.html)) or `ffprobe`'s writer name
([ffprobe](https://ffmpeg.org/ffprobe.html)), and `B1` reports "machine mode included where
reachable".

This is [blind-trial finding 4](./2026-08-23-blind-trial-ripgrep.md) with a wider mouth. There the
false `D3` pass came from `rg --json` being a search-output format; here it comes from the flag
never having been an output-format flag at all.

### `SURV-3` — `A6`'s pass is an absence of an English phrase, over a locale nobody recorded

[`double-dash-terminator.ts`](../../src/acc/kit/checkers/parsing/double-dash-terminator.ts) decides
`A6` on `/unknown (option|flag)/i` not appearing on stderr. The file declares this — _"a rejection
is recognised only from an English unknown-option or unknown-flag phrase so a differently worded
rejection reads as a pass"_ — and treats it as a static property of the detector.

It is not static. `runner.ts` spawns every probe with `env: { ...process.env, ...inv.env }`, so
`LANG` and `LC_ALL` arrive from whoever ran `acc`. The same target, the same kit and the same
argv produce `A6 pass` under `LC_ALL=de_DE` and `A6 fail` under `LC_ALL=C`, and nothing in the
report distinguishes the two runs. The survey listed locale-dependent error text among the shapes
it could **not** find a candidate for; the candidate is us.

### `SURV-4` — the non-verb target is a family, and one member of it is already in the plan

Plan item 7 is written around `ripgrep`. The survey supplies eight more, which changes the item
from "a target we happened to meet" to "a shape with its own population":

- **`jq`** — `acc-probe-xyzzy-verb` is a **valid jq program** (it parses as `acc - unknown - verb`)
  and fails at compile time with exit `3`, which is not a rejection
  ([jq manual](https://jqlang.org/manual/)).
- **`tabix` / `samtools view`** — a sentinel appended after the file is parsed as a genomic
  **region**, matches nothing, and yields empty output at exit `0`.
- **`projinfo`** — the positional accepts a human-readable CRS name, so almost any junk string is
  syntactically well-formed ([projinfo](https://proj.org/en/stable/apps/projinfo.html)).
- **`ffmpeg`** — _"Anything found on the command line which cannot be interpreted as an option is
  considered to be an output url"_ ([ffmpeg](https://ffmpeg.org/ffmpeg.html)). The sentinel becomes
  **a file it tries to write**.
- **`sqlite3`** — first positional is a DB path, **created if absent**
  ([sqlite.org](https://sqlite.org/cli.html)).
- **`ogr2ogr`** — `<dst> <src>`, destination first
  ([GDAL](https://gdal.org/en/stable/programs/ogr2ogr.html)); **`cdo`** — last positional is an
  output file; **`tcpdump`** — trailing BPF filter expression.
- **`expr`** — the survey nominates it as a _zero-hazard alternate_. It is a Shape-1 target in its
  own right: it has no flags at all, so `--acc-probe-xyzzy-flag` is an expression, and
  `expr 1 = 2` exits `1` on complete success
  ([coreutils](https://www.gnu.org/software/coreutils/manual/html_node/expr-invocation.html)).

The last three bullets matter for a reason the plan does not yet say: `inert.ts` already documents
that its guarantee dissolves against a free-form root positional, but the examples it gives are all
**prompt-shaped** (`claude`, `llm`, `aider`) and the stated cost is money. `ffmpeg`, `sqlite3`,
`ogr2ogr` and `cdo` are the same hole with a different cost — **a file gets written** — and they
are ordinary developer tools nobody would think to guard against.

---

## The false fails

### `SURV-5` — `C1` fails a target whose `-h` takes an argument

The mirror image of `SURV-1`, and the more common instance: `psql -h host`, `mysql -h`,
`redis-cli -h`. **Reproduced**, against a fixture whose help documents `-h <host>`:

```
C1 fail | -h exited 2; -h wrote nothing to stdout
```

The target's help is correct, its `--help` is correct, and it is convicted of a `core` violation
with `deviation: defect` for declining to treat a host flag as a help request. The survey's other
witnesses for the same clause: **`ssh` documents neither `-h` nor `--help`**
([ssh(1)](https://man.openbsd.org/ssh)); `curl --help <category>`, `psql --help[=topic]`,
`ps --help [simple|list|…]`, `ffmpeg -h [long|encoder=x264]` and `cmake --help-<topic>` all take an
argument, so `--help` is not boolean either; `tcpdump -h` and `sox -h` fuse help with version.

### `SURV-6` — `D3`'s failure message describes a check the code does not perform

The `fail` branch of
[`advertises-machine-mode.ts`](../../src/acc/kit/checkers/discoverability/advertises-machine-mode.ts)
says:

> `--json`, `--format` and `--output` are looked for as bare switches, and one documented with a
> value slot is a flag that takes a value rather than one that selects a mode

Two of the three named flags are not filtered that way (see `SURV-2`). The sentence is the fix
`SURV-2` needs, already written, in a message that reads as though it had been applied. A reader
debugging a `D3` verdict is told the opposite of what happened.

---

## The unverifiable verdicts

### `SURV-7` — the report cannot say which machine, locale or platform produced it

`ReportedObservation` carries `env` only for the overrides a probe declared. There is no field
anywhere in `Report` for the ambient environment, the platform, or the target's own version.
Meanwhile the child inherits everything (`runner.ts:229`).

The survey's Shape 8 is the reason this is not academic: **macOS ships BSD `find`, `tar`, `ps`,
`dd`, `expr` and `make`, and LibreSSL as `/usr/bin/openssl`** — different option sets, different
`--help` availability, different error strings. Five of the survey's safest fixtures score
differently on macOS and on Linux, and the stored report would look identical.

Verdicts this is live for today: `A6` (`SURV-3`, locale), `B2` (`NO_COLOR`, `CLICOLOR_FORCE`,
`TERM` are inherited and are exactly the overrides `B2`'s own gap list says are never exercised),
`D1` (a real `HOME` is the baseline the hostile-`HOME` probe is compared against), and `F2` (a
timing threshold, on an unrecorded machine).

`POSIXLY_CORRECT` — the survey's headline for this shape — **does not** currently move a verdict
here. It changes whether a flag _after a positional_ is a flag, and every probe the kit sends is
flag-first or flag-only. That is a property of today's probe shapes, not a guarantee, and it stops
holding the moment `L1` puts a verb in front of a flag.

### `SURV-8` — the exit-code taxonomy has no bitmask story, anywhere

`grep -rn 'bitmask\|bit field\|bitwise' docs` returns one hit, and it is about cobra's completion
protocol. Nothing in [`concepts/exit-codes.md`](../wiki/concepts/exit-codes.md) or
[`C2`](../wiki/rules/exit-codes/usage-errors-are-distinguishable.md) contemplates a code that is a
set of flags rather than a member of an enumeration.

- **`pylint`** — fatal 1, error 2, warning 4, convention 8, refactor 16, usage error 32, OR'd
  together; a run with a fatal and a warning exits `5`.
- **`fsck`** — _"The exit status is the sum of the following conditions"_ (1/2/4/8/16/32/128), and
  across multiple filesystems it is _"the bit-wise OR of the exit statuses"_
  ([fsck(8)](https://man7.org/linux/man-pages/man8/fsck.8.html)).

For these targets `C2` cannot pass: its pass branch requires `codes[0] === 2`, and `2` is spoken
for. The honest `unverified` — _"usage errors are consistent at exit 32, but not the declared 2"_ —
is the best outcome available, permanently, and the wiki offers such a project no remedy and no
waiver rationale. **This is not `L1` material.** No declaration by the target changes what `2`
means in the taxonomy; the taxonomy either grows a position on bitmasks or it does not.

### `SURV-9` — delegators do not own their exit codes, and `L0` cannot tell one from anything else

[`archetypes/delegator.md`](../wiki/archetypes/delegator.md) states this already and states it
well: _"the exit code a caller sees may have been produced by a program the delegator did not
write."_ It is design guidance with no checker behind it, by its own declaration.

The survey's witnesses fill in the range the archetype only gestures at. **`ssh`** — _"exits with
the exit status of the remote command or with 255 if an error occurred"_
([ssh(1)](https://man.openbsd.org/ssh)) — delegates the **entire** namespace, not the `124`+ band
the taxonomy reserves. **`tar`** — _"if a subprocess exits non-zero, tar assumes that exit code as
well."_ **`xargs`** (123/124/125/126/127), **`timeout`** (124/125/126/127/137, _"otherwise the exit
status of COMMAND"_), **`env`** (125/126/127), plus `bazel run`, `cargo run`, `nix run`, `go run`.
And **`jq`'s `halt_error(n)`** puts the code under the control of the _input program_ — a case the
delegator page does not cover at all.

The survey's own conclusion is the right one and matches the plan's frame: _"the checker needs a
way to mark a subject as 'exit code is not owned by this tool'."_ That is a declaration, so it is
`L1` — and it is a **second** thing `L1`'s declaration must carry, alongside positional shape.

---

## Assumptions that are not verdicts yet

### `SURV-10` — `A5`'s page names abbreviation as the defect; `A5`'s probe cannot produce one

[`no-fuzzy-auto-correction.md`](../wiki/rules/parsing/no-fuzzy-auto-correction.md) already
tabulates `argparse`'s `allow_abbrev=True` and `docopt-ng`, and
[`docs/research/2026-08-13-frameworks-languages.md`](../research/2026-08-13-frameworks-languages.md)
measured the argparse case directly. So the survey's Shape 7 is **not news to this catalogue** —
what it adds is two counter-examples the corpus does not have: Perl's **`Getopt::Long` enables
`auto_abbrev` by default**, and **PLINK resolves flag names by exact → prefix → Damerau-Levenshtein
distance 1**, which is the survey's sharpest single find: a tool that _guesses and proceeds_ while
looking, to any checker reading exit codes and diagnostics, exactly like a tool that rejected.

The gap is in our probe. `nearMiss` in
[`no-fuzzy-correction.ts`](../../src/acc/kit/checkers/parsing/no-fuzzy-correction.ts) deletes the
**third character** of a discovered flag — `--output` becomes `--ouput`, confirmed in a run's
observation list. An interior deletion is never a prefix, so the one default this project's own
research says the spec should ban is the one edit the probe can never construct. A truncation probe
(`--outp` for `--output`) would reach it, and would be no less inert than the deletion already
sent.

### `SURV-11` — `C1`'s reach clause is a false-fail generator waiting for `L1`

`C1`'s page: _"It **MUST** work regardless of what else is on the command line — a caller must be
able to append `--help` to any invocation and receive help rather than execution."_ The checker
declares that it does not probe this. The survey's Shape 2 is a list of tools for which the clause
is false by design:

- **`ffmpeg`** — _"options are applied to the next specified file. Therefore, order is important"_.
- **ImageMagick** — settings _"persist as it appears on the command-line"_, operators apply
  immediately ([command-line-processing](https://imagemagick.org/command-line-processing/)).
- **`find`** — `-name`/`-print`/`-exec` are **primaries in a boolean expression** with precedence
  ([POSIX find](https://pubs.opengroup.org/onlinepubs/9699919799/utilities/find.html)); there is no
  `--` role at all, and a trailing `--help` is an expression, not a request.
- **`bazel`** — startup options must precede the command; the same flag after it is a different
  flag. _"An option-permutation probe gets failures that are correct behaviour."_
- **PLINK** — `--help` _"causes everything before it on the command line to be ignored"_
  ([PLINK](https://www.cog-genomics.org/plink/1.9/help)).

Nothing is wrong in the kit today. The point is that the clause is unimplemented **and** false for
a real population, so the first `L1` implementation of it will manufacture failures unless the page
is qualified first.

---

## Warnings that do not apply to us

Recorded deliberately. A warning that misses is worth the same paragraph as one that lands, because
the next reader of the survey will otherwise re-derive it.

- **"Long options use `--`" — we never claim it.** The survey names this as one of three rules to
  soften now, refuted by `sqlite3`, `openssl`, `ip`, `gmx`, BLAST+, PLINK and GDAL. No rule page or
  checker in this catalogue asserts a flag _spelling_. `A1`'s _"only long flags are probed"_ is a
  scope admission about the probe, not a normative claim about targets. The probe builds one
  token guaranteed to match nothing, and a single-dash-long parser rejects `--acc-probe-xyzzy-flag`
  for the same reason a double-dash one does.
- **Shape 3's exotic syntaxes** — `dig +short`, `@file` argfiles, `ps aux` and `tar cfv` dashless
  clusters, `dd if=/of=` operands, `avrdude memtype:op:file` tuples, GROMACS `-nofoo`, `su -`. The
  kit asserts no flag grammar, so none of these falsifies a rule. `dd` is the survey's deepest case
  and still produces a correct `A1`: `--acc-probe-xyzzy-flag` is not a `key=value` operand, so `dd`
  rejects it.
- **Shape 4's wrapper rewriting** — `gradlew`, `mvnw`, `bazelisk`, `busybox` argv[0] dispatch,
  `go test`'s positional boundary, `Rscript`'s documented order-dependence. Already known: `A6`
  carries an explicit guard for the `bun` launcher swallowing the terminator, the
  [`delegator`](../wiki/archetypes/delegator.md) archetype covers `cmake --build --` and
  `kubectl exec --`, and the plan already records that a wrapper moves `F2` as well as `A6`. The
  Rscript quote — _"the prescribed order of arguments is important: e.g. `--verbose` specified
  after `-e` will be part of `args`"_ — is the best citation this repo has for that hazard and is
  worth keeping for the archetype page.
- **isatty changing output** — every probe the runner makes captures to a pipe, which is exactly
  the condition `B2` requires; `D2`'s gap list already names the TTY-only wizard as out of reach.
  The survey's redis-cli example describes a tool doing the right thing, and we see the right side
  of it.
- **`git`/`cargo`/`kubectl`/`gh` resolving unknown verbs against `$PATH` or plugins** — real, and
  materially harmless to `A2`: the probe would have to collide with an executable named
  `git-acc-probe-xyzzy-verb`. `A2`'s exposure is `SURV-4`, not this.
- **`gpg --status-fd`** — a machine channel on a dedicated file descriptor, which the survey rightly
  says is arguably _better_ than stdout. It is outside the kit's model rather than against it: the
  runner records two streams. Worth knowing before anyone writes a rule that says "machine output
  goes to stdout" as a MUST; today no rule does — `B1` says stdout carries **only data**, which is
  a different sentence and is compatible with gpg.

---

## Where I think the survey is wrong or overstated

1. **It presents prefix abbreviation as an under-appreciated novelty.** For this project it is
   four-month-old measured evidence, in the research corpus and on `A5`'s own page. The new
   material is `Getopt::Long` and PLINK; the framing is not.
2. **Its headline `-h` instance does not produce the false pass it claims.** `C1` fails if
   **either** of its two probes fails, and the survey itself records that _"the tabix man page
   documents no `--help`"_. A target with a data-carrying `-h` and no `--help` therefore scores
   `FAIL`, not a false pass. The mechanism is real — I reproduced it — but it needs a target with a
   **correct `--help` and a non-help `-h`**, which is the GNU `df`/`du`/`ls`/`sort` family rather
   than the htslib one. The survey's "two independent false-PASS mechanisms in one tool" claim for
   tabix does not survive contact with how `C1` combines its probes.
3. **`POSIXLY_CORRECT` is oversold for us.** It is a genuine hazard for a checker that permutes
   argv; this one does not, and every probe it sends is flag-first. The environment finding that
   does land here is locale and colour and platform (`SURV-3`, `SURV-7`), and the survey files
   locale under "shapes still uncovered".

## What I was not able to settle

- **No real tool was run.** Both reproductions are fixtures built to the survey's described
  grammar. That is the right instrument for "does the checker do this" and no instrument at all for
  "does samtools do this". GNU coreutils is not installed on this machine, so the `df -h` instance
  of `SURV-1` is cited, not measured.
- **Whether any specific BSD/GNU divergence flips a verdict.** `SURV-7` establishes that the report
  could not tell you either way, which is the finding; the population of affected verdicts is
  unmeasured.
- **Whether `SURV-3` is reachable in practice.** It requires a target that localises its parser
  errors _and_ a caller whose locale is set. I did not find one to point at, and the survey did not
  either.
- **`SURV-10`'s remedy.** A truncation probe looks inert and looks like it would catch argparse,
  but I did not build it, and the interesting failure — a target that accepts the abbreviation and
  then exits non-zero anyway because no verb was given — would still read as a pass.

---

## Proposed changes to the live plan — not applied

These are a recommendation about
[`2026-08-23-clear-the-runway-then-take-off.md`](../plans/2026-08-23-clear-the-runway-then-take-off.md).
The plan is not edited here; that is someone else's call.

**1. Part 1 is discharged, and two of these belong to the same class it was made of.** `SURV-1`,
`SURV-2`, `SURV-3`, `SURV-5` and `SURV-6` are not "`L0` stating what it has not established" —
they are `L0` stating something **false**, from a spelling guess. That is a different and worse
category than the six runway items, and it is not what Part 2 is for either. **Recommendation: a
new Part 3, "spelling is not meaning", carrying `SURV-1`, `SURV-2`, `SURV-5`, `SURV-6` and
`SURV-10`.** The unifying sentence is one the kit already wrote about `--output` and then did not
apply to `-h`, `--format` or `--json`'s siblings: a token whose meaning depends on which sense the
target implements is not a probe.

**2. Item 7 should stop being about `ripgrep`.** It currently reads as a fix for a target. `SURV-4`
gives it a population of nine and — more usefully — splits the population in two: targets where the
cost is a **wrong verdict** (`jq`, `tabix`, `projinfo`, `tcpdump`, `expr`) and targets where the
cost is a **written file** (`ffmpeg`, `sqlite3`, `ogr2ogr`, `cdo`). `inert.ts`'s free-form warning
covers only the money-shaped instances today. The second list belongs in it whether or not `L1`
ever ships.

**3. Item 7's declaration is carrying more than one fact.** The plan says the declaration is _"one
sentence: I have no verbs; my first positional is free-form data."_ `SURV-9` needs a second,
independent one — _"my exit code is my child's"_ — and it is not derivable from the first: `ssh`
and `timeout` dispatch no verbs and delegate their codes, `jq` has no verbs and owns its codes
except where the input program says otherwise. **Recommendation: item 7 becomes "the declaration
carries the target's shape", with positional shape and exit-code ownership as two named fields**,
so `L1`'s scope is not discovered to have doubled halfway through.

**4. A new open question, not a new item.** `SURV-8` is the one finding here that no declaration
fixes. The plan's "Open, and not decided here" list is the right home for: _does the taxonomy
have a position on exit codes that are bit fields, or does `C2` stay permanently `unverified`
against pylint- and fsck-shaped targets?_ It is a spec question and it should not be smuggled into
`L1`'s scope to make it look answered.

**5. What must not regress gains a line.** The plan protects the gap disclosures because both
trials named them as the reason they trusted the output. `SURV-6` is the counter-case: a
**message** that describes a check the code does not run is the same defect the disclosures exist
to prevent, one layer down. The standard already applied to `deviation` and the waiver-cost strings
— literally true, verified rather than trusted — should be stated for checker `detail` strings too.

## Discharge

Every finding above is open. Nothing in this document has been actioned, promoted to
[`../roadmap.md`](../roadmap.md), or declined; the proposal in the last section is the intended
route for `SURV-1` through `SURV-6` and `SURV-9` through `SURV-11`, and `SURV-7` and `SURV-8` have
no home yet.
