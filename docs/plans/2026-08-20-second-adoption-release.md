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

- [ ] `"machineMode": "default"` at the **top level** of `acc.config.json`, beside `rules` rather
      than inside it: it describes the target, it does not bind a rule.
- [ ] With it set, B3 and B5 probe a **plain** data invocation rather than a flag-selected one.
- [ ] D3 satisfied by the declaration — the rule asks that machine mode be discoverable, and a
      declaration is discovery.
- [ ] Rule pages updated on both sides of the lint.
- [ ] The declaration must be **falsifiable**, and cheaply: run a plain invocation and see whether
      stdout parses. A declaration that cannot be falsified is a comment that lies.

**Not inference.** The adopter argued this against us using our own roadmap: L1/L2 rests on a CLI
declaring what it does so the kit can try to falsify it, and _"an inference can't be falsified,
because the inference **is** the guess."_ Their evidential objection is sharper still — the kit
already infers machine mode from help text, and that inference is what got their CLI wrong. A
`--human` inverse is a better signal than prose but still a guess, **and the most machine-first CLI
possible has no inverse flag at all.**

**Why this is the headline.** Asked what would have made the trial clearly positive, the adopter
did not ask for more rules: _"the two rules you already have, reaching my CLI."_

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

- [ ] Design pass first, written down before any code.
- [ ] Decide where the property lives: on the waived rule, on the observation, or in the finding a
      checker returns.
- [ ] Whatever the mechanism, `acc.config.json` must not gain a word about which rules are coupled.
- [ ] Fixture: the bare-help CLI already built for the trial, waiving D2, asserting C2 no longer
      fails **and** that E1 and G1 still reach their verdicts on the same run.

### 4. EXT-1 — make a stale install visible · P1

The documented install put the wrong bytes on disk at exit `0`, twice, and `acc --version` was the
only place it showed. The adopter did not detect it — they had cloned the repo first to read the
README and so happened to be holding a second version to compare against.

- [ ] Print the kit's own version in the `check` report header, both formats. A reader who has not
      accidentally armed themselves gets the comparison for free.
- [ ] Document the **silent** arm of the install failure beside the loud one the README already
      predicts correctly.
- [ ] State the recovery: clearing the bare clone is not enough, because the extracted-package cache
      is stale independently of it.

**Severity is about recovery, not annoyance.** They were two minutes from writing up "could not
install" and stopping. What saved the trial was running from a clone — which the documented path,
private repo installed over SSH, never asks anyone to make.

### 5. EXT-6 (with EXT-8) — one surprise, not two · P2

Piping silently changes the output shape, and nothing says so. It caught the adopter twice in one
session as two apparently unrelated problems: the README's headline verdict line is TTY-only, and
`acc check --help` answers with the root schema in machine mode.

- [ ] Say in getting-started that piped output is JSON and the verdict line is TTY-only.
- [ ] Put `--format text` in the first code block. The adopter calls that report _"the best artifact
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

- [ ] A machine-first CLI reaches `conformant: true` with a config a reader would sign, and B3/B5
      report a verdict rather than `unverified`.
- [ ] No finding names a cause the evidence does not support.
- [ ] The regression run reports the false accusation gone and the waiver working.
- [ ] The cold run installs without the fallback of a clone.
- [ ] The adopter's verdict is better than "roughly break-even" — **in their words, not our
      inference from a passing gate.**

The last one is the real gate. A green run that the person who ran it would not repeat has told us
nothing.
