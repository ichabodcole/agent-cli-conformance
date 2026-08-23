---
type: plan
generated: { by: claude-opus-5, at: 2026-08-23 }
status: draft
lifecycle: live
description:
  Two trials cleared the L0 gate, and left nine findings. Six are cheap and land before L1; three
  are L0 stating what it has not established, which is what L1 exists to fix — so they become L1's
  opening scope rather than a prerequisite for it.
tags: [adoption, trial, evidence, l1, docs]
---

# Clear the runway, then take off

Two trials ran against `acc` 0.1.0 on 2026-08-23, and they were deliberately different instruments:

- **A re-run by someone carrying a mental model** — `sable`, against the anthill CLI, the same
  protocol as their first-contact trial. Asks: _did the fixes fix it?_
  [Report](../reports/2026-08-21-anthill-first-contact-trial.md) is the original; the re-run is
  message 8 of the `acc-trial-anthill` channel.
- **A blind run by an agent with no context** — against `ripgrep`, a target nobody wrote the rules
  around. Asks: _can somebody with no context get through `L0` without falling into a trap?_
  [Report](../reports/2026-08-23-blind-trial-ripgrep.md).

**The gate in [the anthill plan](./2026-08-21-anthill-trial-findings.md#the-gate-what-ready-for-l1-takeoff-means)
is met.** Anthill is `CONFORMANT (L0)` with zero core violations and zero real defects in the
target; the A1/A3 fix holds, validated by its reporter rather than by us. The wrapper hole is
closed, `deviation` and the waiver-cost strings were attacked and held, and the install remedy
works when followed.

That plan is discharged. This one covers what the two trials found on the way through.

## The split, and why it falls where it does

Nine findings. The line between them is not size — it is **whether the fix requires the target to
tell us something**.

- **Six are things we know and do not say.** The cwd is consulted; `B4` has no checker; a blocked
  postinstall is expected. Each is a disclosure we can write today, and each is exactly the defect
  class this project is named after — a tool that omits what it knows.
- **Three are `L0` stating a verdict it has not established.** Each one needs a fact only the
  target can supply. That is not a coincidence and not a reason to delay `L1`; it is `L1`'s
  premise arriving as evidence.

## Part 1 — the runway. Ships before `L1` work starts

Ordered by how much damage the finding does while it stands.

### 1. The cwd is consulted for `acc.config.json`, and nothing says so

**The trap.** Same command, same absolute target path, same kit — verdict flips on the working
directory:

```
$ cd /tmp      && acc check /abs/path/cli.ts   ->  NOT CONFORMANT (L0) — 2 core violated
$ cd ~/harness && acc check /abs/path/cli.ts   ->  CONFORMANT (L0) — 0 core violated · 1 waiver
```

Found by `sable`, and only because run-1 residue was still on disk. **Pre-existing**, not
introduced by 0.1.0 — the behaviour and its reasoning are at `check.ts:177`, and the reasoning is
good. Nothing documents it: not the README, not `acc check --help`, and not the flag's own
description, which says `Directory holding acc.config.json.` and never says what omitting it does.

**Why it outranks the rest.** CI runs from the repo root; an engineer runs from a subdirectory.
They get different verdicts from an identical command and neither output explains why.

- [ ] Document the default in the README, in `--config-dir`'s own description, and wherever the
      config file is introduced.
- [ ] **The report names the config it loaded and where from** — including "none". The disclosure
      that saved `sable` a minute should not depend on reading the headline carefully.
- [ ] Decide whether a config discovered from the cwd, rather than named by a flag, deserves a
      louder line than one that was asked for. Leaning yes.

### 2. Evidence is unreachable for the reader who does not already know it is there

Both trials hit this, at different distances, which is what makes it a design fault rather than a
docs gap:

| reader          | what happened                                                                                     |
| --------------- | ------------------------------------------------------------------------------------------------- |
| `sable`         | found `observations`, used it, and closed their "dangling pointer" complaint                      |
| the blind agent | never found it; tried `acc show <id>`, got a hint naming rule ids and page slugs, guessed instead |

The blind agent then hung its own shell for two minutes reconstructing probes by hand and produced
a **wrong reproduction** that nearly became a wrong bug report. The 0.1.0 release note says
_"Evidence ids now resolve."_ True, and unactionable.

- [ ] `acc show <observation-id>` resolves an observation, or says plainly where to look. Its
      current error hint is a signpost pointing away from the answer.
- [ ] The text report says, once, how to resolve the ids it prints.
- [ ] `acc check --help` mentions the observations array exists.

### 3. `B4` vanishes from the report

`acc rules` lists 23 rules including `B4`; `acc show B4` renders its page; a check report never
mentions it — not as a finding, not as `N/A`, not in `notApplicable`. `A4` gets an explicit `N/A`
line explaining itself. The README does say 22 of 23 rules have a checker, so this is consistent
with the docs, and it is still a silence in a project about tools that go quiet.

- [ ] `B4` appears as `N/A` with a stated reason, and the reason generalises to any future rule
      without a checker.

### 4. The install guide's check does not cover the upgrade we asked everyone to make

`sable` reproduced the broken install deliberately: two of the three failure modes fired at once,
exit `0`, with a fresh commit SHA printed — the output asserting the thing that did not happen.
The documented remedy then worked cleanly. But they moved `1.0.1` → `0.1.0`: **the version went
down.** Every "did the number go up" heuristic gives the wrong answer for the version-line reset,
and the guide's ⚠ covers the untagged case, not this one.

- [ ] Extend [the guide](../wiki/guides/how-to-fix-a-broken-install.md)'s ⚠ to the reset case:
      the number can legitimately go **down**, so compare against the version you expect, not
      against the one you had.

### 5. The `husky` postinstall block is the first thing the tool says, and it says nothing useful

```
Blocked 1 postinstall. Run `bun pm untrusted` for details.   →   » [prepare]: husky || true
```

**Two independent readers stopped at it on first contact**, both reasonably — an unexplained
blocked script on a security-adjacent tool is where a careful person pauses. `sable` flagged it in
their first trial too, so this is its third appearance.

- [ ] Either stop shipping the `prepare` hook to consumers, or say in Getting Started that a
      blocked `husky` script is expected and inert. Preference for the former: the best disclosure
      is not needing one.

### 6. Two malformed messages

- [ ] `acc.config.json rules names "Z9"` — garbled.
- [ ] `found a undefined` — should be `found undefined`.

## Part 2 — `L1`'s opening scope, which is where the other three belong

Each of these is `L0` asserting something no observation established. Each becomes correct the
moment the target declares one fact. **This is the argument for starting `L1`, not for delaying
it** — and all three arrived from readers who had never heard the argument.

### 7. We assume every CLI dispatches verbs

Against `ripgrep`, whose first positional is a **pattern**, three verdicts are wrong from one
misread: `FAIL C2` against one of the cleanest exit-code taxonomies in existence, `FAIL A3` on a
rejection that never happened, and `PASS+ A2` — a **false pass** — crediting a rejection of a
token the target accepted and acted on.

The declaration that fixes it is one sentence: _"I have no verbs; my first positional is free-form
data."_ `L0` cannot detect the shape and, per A2's own page, does not guess.

- [ ] `L1` declaration carries the target's positional shape.
- [ ] **Before then**: `A2`/`A3`/`C2` say they are conditional on a verb-dispatch assumption
      nothing has established. A false `PASS` is the dangerous half and should not wait for `L1`.
- [ ] A2's page gains the **accuracy** consequence. It currently warns about free-form positionals
      as a **safety** matter — running them spends money — which does not apply to a target like
      `rg` that is perfectly safe to run, while the wrong verdicts land anyway.

### 8. Content-dependent verdicts are unfalsifiable from the report

`sable`'s ①, half-shipped. Observations carry digests, not bodies — deliberately, because bodies
are unbounded and may carry secrets, which is why `F1` exists at all. **What was not deliberate is
the consequence**: `A1` claims _"the rejection named the flag"_, and a SHA-256 of stderr cannot
establish that. Same for `A3` entirely, `B2`'s escape detection, and `F1`'s credential scan.

Their narrower proposal is the right shape, and is a different mechanism from the evidence array —
that one answers _what did you run_, this answers _what did you look for_:

- [ ] For rules whose verdict is a substring test, record the substring searched for and whether it
      was found. Bounded, and carries no secret the kit did not already name.
- [ ] Say in the observation shape's documentation that digests-not-bodies is a boundary, so the
      next reader does not re-file it.

### 9. One checker reports one finding, and the second one hides

Unchanged since 1.0.1, byte-identical, and re-raised. `C2` reports the declared-taxonomy mismatch
only once D2 is waived; without the waiver a reader never learns that **every** usage error exits
`1` rather than the declared `2`.

- [ ] A checker reports every finding it has, not the first. This is
      [roadmap 1](../roadmap.md#1-remediation-becomes-structured-data)'s neighbourhood and should
      be settled with it.

## What must not regress

- **Anthill stays `CONFORMANT (L0)` with zero core violations.** It is the only external target
  whose verdict we have ever validated with its maintainer.
- **The gap disclosures stay.** Both trials named them as the reason they trusted the output —
  one called the tool _"more epistemically careful than anything comparable I've used"_. Item 5 of
  the blind report wants them **reordered**, not reduced: failing rules first, the rest behind a
  flag.
- **`deviation` and the waiver-cost strings stay literally true.** `sable` verified `D2` absent
  from `evidenceGaps` and `C2` present at index 9, rather than trusting the prose. That is the
  standard those strings are now held to.
- **The install guide stays out of the README.** Moving it was the fix for the complaint that ~60
  lines of second-install hazards were the first thing a new adopter read.

## Sequencing

Part 1 is one working session and has no ordering constraints inside it beyond item 1 first. Part 2
should not start before Part 1 lands — not because they conflict, but because the runway items are
what a third adopter hits in their first ten minutes, and there will be a third adopter before `L1`
is finished.

The one item that crosses the line is **7's second box**: a false `PASS` is live now, and waiting
for a declaration format to fix it means shipping a verdict we know is wrong. Fix the disclosure at
`L0`; fix the verdict at `L1`.

## Open, and not decided here

- Whether "the target's shape is undeclared" is a coverage gap, a new inertness-style class, or
  simply the definition of what `L1` is for.
- Whether `L0` should refuse to state `A2`/`A3`/`C2` at all against an undetermined-shape target,
  rather than stating them with a caveat.
- Whether the third trial is another blind agent against a wrapper-fronted CLI — the case that bit
  `sable` in run 1 and is still untested by anyone who did not already know about it.
