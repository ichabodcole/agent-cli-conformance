---
type: plan
generated: { by: claude-opus-5, at: 2026-08-20 }
status: stable
lifecycle: live
description:
  The 0.2.0 scope, chosen by what would change the outcome of a second adoption trial — stop a
  checker inventing a cause, let a CLI declare machine mode, and make a waiver reach the evidence
  it waives.
tags: [conformance, adoption, acc-config, remediation]
---

# 0.2.0 — the release that has to survive a second trial

**Goal:** an outside adopter reaches a green `L0` gate on a CLI that deserves one, and says the run
was worth their time.

Every item traces to a finding in
[the first external adoption trial](../reports/2026-08-20-first-external-adoption-trial.md). Nothing
is here because it seemed like a good idea.

## How scope was decided

The release is done when **trial #2 comes back better**, so scope is exactly what changes trial
#2's outcome — a sharper filter than "the top findings", and it excludes two real defects.

The first trial's own summary was that it came out **roughly break-even**: one genuine defect found,
which the adopter would have hit themselves within weeks, against twenty minutes of install
archaeology and three restatements of one design decision they were not going to change. Break-even
is not a failure, but it is not a reason for anyone to adopt this either. The release exists to move
that.

## Scope

### 1. EXT-2 — stop D1 inventing a cause · P0

D1 pushes `--version requires configuration (failed with an unusable HOME)` whenever the
hostile-HOME probe exits non-zero, without ever comparing it to the plain run. A target with **no
`--version` at all** exits identically both ways and is accused of a HOME dependency it does not
have.

- [x] Predicate now fires only when the plain run reported a version and the hostile one did not — narrower than a plain **difference**:
      `hostile.exitCode !== plain.exitCode || hostile.stderr !== plain.stderr`.
- [x] Collapse the redundancy this exposes: when `--version` does not exist, one clause should say
      so rather than three restating "it died".
- [x] Fixture: a CLI with no `--version` that exits non-zero cleanly — `broken/no-version-flag.ts`. The existing guard is
      `crashedUnverified()`, which only fires for a crash — a clean exit `2` walks straight past it,
      which is exactly why this shipped.
- [x] Checked: D1 is the only checker that compares a hostile probe to a plain one. D4 names the pattern in a comment but does not use it.

**Why first.** A checker that invents a cause is the only class of defect that destroys the premise.
Internal review never found it because every target we ever pointed at had a `--version`.

**Landed** on `fix/d1-hostile-home-predicate`. The predicate is deliberately narrower than the
adopter proposed. They suggested firing on any difference between the two runs; "differing" is not
the claim the clause makes. The claim is that configuration is **required**, which is established
only when the plain run reported a version and the hostile one did not. Two runs that fail
differently for some third reason are not evidence about configuration — and under this predicate a
target with no `--version` cannot reach the clause at all.

The redundancy collapse had to extend one step further than expected: `--version --json` against a
CLI with no `--version` also fails, so the machine-mode clause restated the same fact a third time.
It is now skipped whenever the plain run reported no version.

### 2. EXT-4 — let a CLI declare machine mode · P0

The kit infers machine mode from help text and therefore cannot see a CLI that is **JSON by
default**. On such a target D3 fails and B3/B5 report `unverified` — so the two rules that would
validate the target's envelope are skipped on precisely the class of CLI this project is aimed at.

- [x] `"machineMode": "default"` at the **top level** of `acc.config.json`, beside `rules` rather
      than inside it: it describes the target, it does not bind a rule.
- [x] B5 probes a **plain** invocation. **B3 does not and cannot at `L0`** — it reads a data command's output, `--help` is not one (a machine-first CLI may answer help in prose), and selecting a data verb inertly needs knowledge `L1` has and `L0` does not. It now says that instead of claiming nothing was advertised.
- [x] D3 satisfied by the declaration — the rule asks that machine mode be discoverable, and a
      declaration is discovery.
- [x] Rule pages updated on both sides of the lint — three copies each, and the lint caught all three.
- [x] The declaration is **falsifiable**, and cheaply: run a plain invocation and see whether
      stdout parses. A declaration that cannot be falsified is a comment that lies.

**Not inference.** The adopter argued this against us using our own roadmap: L1/L2 rests on a CLI
declaring what it does so the kit can try to falsify it, and _"an inference can't be falsified,
because the inference **is** the guess."_ Their evidential objection is sharper still — the kit
already infers machine mode from help text, and that inference is what got their CLI wrong. A
`--human` inverse is a better signal than prose but still a guess, **and the most machine-first CLI
possible has no inverse flag at all.**

**Why this is the headline.** Asked what would have made the trial clearly positive, the adopter
did not ask for more rules: _"the two rules you already have, reaching my CLI."_

**Landed** on `feat/declare-machine-mode`, after an independent review found the first version
shipping the defect this catalogue is about. Probing only the declared path meant a CLI that
advertises `--json` AND declares the default was taken at its word about the half it got right: a
bare error that parses and a `--json` error in prose went from **B5 fail to B5 pass on one line of
config**. Every reachable way in is probed now, and the worst answer decides.

Two more from the same review, both about tests rather than code: the falsifiability test used a
fixture whose help advertises `--json`, so it stayed green with the entire declared branch deleted;
and B3's new branch had no test at all. Both were caught by reverting the behaviour and watching
the suite, which is the only way that class of hole shows up.

### 3. EXT-3 — a waiver must reach the evidence it waives · P0, needs design first

One design decision — a bare invocation prints help and exits `0` — is reported as two core
violations, because C2 and D2 rest on the same observation. Waiving D2 leaves C2 failing on that
byte and the gate red. **No configuration expresses "bare help is deliberate" and reaches green.**

The constraint the adopter gave is worth more than the mechanisms they offered:

> If I have to describe the coupling in config, the config has become a model of your internals
> rather than a statement about my CLI.

That rules out a C2-specific escape and rules out any key that names the relationship.

**The naive fix is wrong, and measurably so.** "A waiver removes its rule's observations from the
history other checkers see" breaks immediately — the bare-invocation observation is cited by
**C2, D2, E1 and G1**:

```
cf21d6899d33 -> ['C2', 'D2', 'E1', 'G1']
```

E1 ("never blocks without a tty") and G1 ("does not crash") have no stake in the waiver and would
lose evidence they legitimately need.

So the waiver is not declaring the observation irrelevant. It is declaring a **property** of it —
_exit `0` on a bare invocation is intended_ — and only a rule that fails **because of that
property** should inherit the declaration.

### The design

**The waiver withdraws a premise, and C2 was resting on it.**

C2 compares four invocations it treats as usage errors. It does not discover that they are usage
errors — it inherits that from the rules that say so:

| C2's shape       | The rule that classifies it as a usage error |
| ---------------- | -------------------------------------------- |
| unknown flag     | A1                                           |
| unknown verb     | A2                                           |
| bare invocation  | **D2**                                       |
| out-of-set value | A7                                           |

Waiving D2 says: _a bare invocation is not a usage error for this tool; it is a help path._ That is
not merely an excuse for D2's verdict — it withdraws the premise under which C2 had the bare
invocation in its population at all. C2 then reports disagreement among a set whose membership the
project has just corrected.

So the rule is: **a checker that treats an observation as an instance of another rule's subject
must respect a waiver of that rule.** Not a general propagation of waivers along shared evidence —
that was the first idea and it is wrong. E1 and G1 read the same observation and keep it, because
their premises do not depend on it being an error: E1 asks whether the target blocked, G1 whether
it died by a fault, and both still apply to a help path.

**Where the coupling lives.** In C2's checker, as a table from shape to owning rule. The adopter's
constraint was about `acc.config.json` — _"if I have to describe the coupling in config, the config
has become a model of your internals"_ — and this puts it in the internals, named once, where a
reader of C2 can see why a shape dropped out.

**What checkers need.** The set of waived rule ids, on `History`. `buildReport` already applies
waivers to the VERDICT (excuse it, drop it from the counts); this applies the same declaration to a
checker's PREMISE. Two consumers of one config field, doing different jobs, both derived from the
same object so they cannot disagree about what was waived.

**What C2 reports afterwards.** The three remaining shapes, compared as usual, with the detail
naming what was excluded and why — a pass here establishes less than the unwaived pass does, and
the report must not present them as the same claim. If fewer than two shapes survive, `unverified`
rather than a vacuous pass over a population of one.

- [x] Design pass first, written down before any code.
- [x] Decided: the property lives on the **waived rule**, consulted by the checker that inherited a
      premise from it. Not on the observation, which E1 and G1 read for other reasons entirely.
- [x] `acc.config.json` gains no word about which rules are coupled — the table lives in C2's checker.
- [x] Fixture `bare-help.ts`: with no config C2 and D2 both fail and the run exits 9; with D2 waived it is CONFORMANT at exit 0, and E1 and G1 still cite the excluded observation.
- [x] A pass under a waiver says what it excluded — and only names shapes a waiver actually removed.

### 4. EXT-1 — make a stale install visible · P1

The documented install put the wrong bytes on disk at exit `0`, twice, and `acc --version` was the
only place it showed. The adopter did not detect it — they had cloned the repo first to read the
README and so happened to be holding a second version to compare against.

- [x] Print the kit's own version in the `check` report header, both formats — `kitVersion` in the JSON, `[acc <version>]` on the text headline. A reader who has not
      accidentally armed themselves gets the comparison for free.
- [x] Document the **silent** arm of the install failure beside the loud one the README already
      predicts correctly.
- [x] State the recovery: clearing the bare clone is not enough, because the extracted-package cache
      is stale independently of it.

**Severity is about recovery, not annoyance.** They were two minutes from writing up "could not
install" and stopping. What saved the trial was running from a clone — which the documented path,
private repo installed over SSH, never asks anyone to make.

### 5. EXT-6 (with EXT-8) — one surprise, not two · P2

Piping silently changes the output shape, and nothing says so. It caught the adopter twice in one
session as two apparently unrelated problems: the README's headline verdict line is TTY-only, and
`acc check --help` answers with the root schema in machine mode.

- [x] Say in getting-started, the tutorial and the adoption guide that piped output is JSON and the verdict line is TTY-only.
- [x] Put `--format text` in the first code block. The adopter calls that report _"the best artifact
      the tool makes"_ and getting-started never mentions the flag.

## Out of scope, to the roadmap

**EXT-5** (multi-target `acc check ./a ./b ./c`, intersection separated from per-target deltas) and
**EXT-7** (the JSON report duplicates every `coverageGaps` array into `evidenceGaps`). Both real,
neither changes whether trial #2 succeeds.

## Trial #2 — designed with the release, not after it

**Grapevine must be re-run, not just a new CLI.** All three P0s were found on it, and it is the only
machine-first target available — anthill already has `--json`, so D3 passes there and `machineMode`
would never be exercised. A trial that skipped grapevine would not test the headline of this
release.

Two runs, two questions, two instruments:

| Run                                     | Question                                                                                                            | Who                                         |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| **grapevine, re-run**                   | did the fixes land? can the waiver they already wrote reach green? do B3/B5 finally execute against their envelope? | `assay` — they hold the baseline            |
| **a CLI from a different family, cold** | can a stranger still install and run it unaided?                                                                    | a fresh agent that has never seen this repo |

**`assay` is contaminated, and that is fine for one of these and fatal for the other.** They now know
the project well, which makes them the best possible judge of whether it improved and useless as a
test of first contact. Splitting the runs keeps both answers.

## Done when

- [x] A machine-first CLI reaches `conformant: true` with a config a reader would sign, and **B5**
      reports a verdict rather than `unverified`. **B3 was struck from this criterion**, because
      the release established it cannot be met at `L0`: B3 reads a data command's output, `--help`
      is not one, and choosing a data verb to run inertly needs what `L1` knows. Leaving the box
      unmeetable would have made the plan lie about its own scope.
- [x] No finding names a cause the evidence does not support — D1's hostile-HOME clause now
      compares the two runs, and C2 keeps a waived shape that did not behave like the withdrawn
      premise. Both have fixtures that fail without the fix.
- [ ] The regression run reports the false accusation gone and the waiver working.
- [ ] The cold run installs without the fallback of a clone.
- [ ] The adopter's verdict is better than "roughly break-even" — **in their words, not our
      inference from a passing gate.**

The last one is the real gate. A green run that the person who ran it would not repeat has told us
nothing.
