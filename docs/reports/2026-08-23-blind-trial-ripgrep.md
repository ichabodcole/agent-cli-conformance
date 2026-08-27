---
type: report
generated: { by: claude, at: 2026-08-23 }
status: stable
lifecycle: live
description:
  A blind agent with no project context installed `acc` 0.1.0 from the published tag and ran it
  against `ripgrep`, a target nobody wrote the rules around. Three verdicts are wrong from one
  structural misread, and the release's headline feature shipped with no way to use it.
tags: [adoption, trial, blind, evidence, l1]
subject: acc 0.1.0 measured against ripgrep 15.2.0 by an agent given no context
examined:
  acc 0.1.0 installed from `#v0.1.0` over SSH, `/opt/homebrew/bin/rg` 15.2.0, macOS, bun 1.4.0
---

> **The trial agent was ours; the blindness was the instrument.** A fresh `general-purpose` agent
> was given four things and nothing else: the git URL at `#v0.1.0`, the target, the task, and a
> reporting contract. It was told that `docs/plans/**` and `docs/reports/**` were off-limits —
> an install carries the whole repo, since `package.json` declares no `files` field, so without
> that rule it would have read our own findings and handed them back as discovery. Quoted passages
> below are its words. The triage is this project's.

This is the second of the two trials that gate `L1` takeoff. The first — `sable`'s re-run of the
[anthill trial](./2026-08-21-anthill-first-contact-trial.md) — asks whether the fixes fixed it.
This one asks a different question: **can somebody with no context get through `L0` without
falling into a trap?** A target nobody chose is the point. Every rule in the catalogue was written
by people looking at CLIs they picked; `ripgrep`'s author never heard of us.

## The result it got

```
NOT CONFORMANT (L0) — 5 core violated, 1 core unverified, 12 core partially covered  /opt/homebrew/bin/rg
EXIT=9
```

Install took 1.5 seconds, the run took 340ms, and no configuration was needed. Everything the
docs claimed about the config file held when tested — bad rule ids, missing `reason`, stale
`knownFailures` entries all behaved as documented.

## Finding 1 — we assume every CLI dispatches verbs, and it produces false verdicts

**Severity: correctness. This is the finding.**

`ripgrep`'s first positional is a pattern, not a verb. `acc` sends its sentinel as a verb;
`rg` searches for it over empty stdin, finds nothing, and exits `1` — its documented no-match
code, not a rejection.

```
$ printf '' | rg acc-probe-xyzzy-verb ; echo "exit=$?"
exit=1
```

Three verdicts fall out of that one misread:

| verdict    | what we said                                            | why it is wrong                                         |
| ---------- | ------------------------------------------------------- | ------------------------------------------------------- |
| `FAIL C2`  | "the same error class produced different codes (2,1,2)" | the `1` is not an error; it is a successful no-match    |
| `FAIL A3`  | "verb rejection did not name the verb"                  | there was no rejection to name anything in              |
| `PASS+ A2` | "root verb rejected with exit 1"                        | `rg` accepted the token and did work — a **false pass** |

`C2` is the one that should sting. `ripgrep` has a clean, documented, three-value exit taxonomy —
`0` match, `1` no match, `2` error — which is better than most CLIs in existence, and we fail it
on the rule that exists to reward exactly that. In the trial agent's words:

> This is a false positive that would actively mislead someone.

The false `PASS+` on A2 is the more dangerous half:

> A green line built on a wrong model is harder to catch than a red one.

**The docs warn about this target shape, in the wrong section, for the wrong reason.** A2's page
covers CLIs whose first positional is free-form — `claude "…"`, `llm "…"` — but frames it purely
as a **safety** matter: running them spends money. `rg` is entirely safe to run, so the warning
does not apply, while the accuracy consequence bites anyway and is documented nowhere. The agent
searched for it before concluding this:

> A `grep -iE 'fixed.verb|no subcommand|free.form'` across A2 and A3 turned up exactly one
> passage, and it was the safety one.

## Finding 2 — the headline feature of 0.1.0 shipped without an affordance

The trial agent's report says:

> There is no way to ask what invocation `b8d1ef65cae5` was.

**The mechanism works.** Verified directly against this tree: 19 observations in the JSON report,
and every id cited by every finding resolves. What is missing is any way to reach it:

- the text report prints evidence ids and never says where to resolve them;
- `acc show <id>` — the obvious guess, and the one the agent tried — fails with a hint naming
  "a rule id, a page slug, or a path relative to the wiki root", which does not mention
  observations;
- `acc check --help` advertises only `--config-dir`.

So the reader who most needs the evidence reconstructs the probes by guessing instead. This
agent did, hung its own shell for two minutes doing it, and then produced a wrong reproduction
that nearly became a wrong bug report.

The release note for 0.1.0 says _"Evidence ids now resolve."_ That is true and unactionable,
which is close to the defect class this project is named after.

## Finding 3 — `B4` vanishes silently

`acc rules` lists 23 rules including `B4`, and `acc show B4` renders its page. `B4` appears
nowhere in a check report — not as a finding, not as `N/A`, not in `notApplicable`. `A4` gets an
explicit `N/A` line explaining itself; `B4` gets silence. The README does say 22 of 23 rules have
a checker, so this is consistent with the docs — but the report never says so, and the asymmetry
is conspicuous in a project about tools that omit things quietly.

## Finding 4 — one root cause presents as three unrelated failures

`D3 PASS+ help advertises --json` is what causes `B3`, `B5` and `D1` to fail: `rg --json` is a
search-output format, not a CLI-wide mode, so an agent that reads `--json` out of help gets prose
when it asks for JSON. Nothing in the report links the pass to the three failures.

> Someone else would absolutely try to "fix" B3/B5/D1 individually without noticing they are one
> issue.

We should also be clear-eyed that `B3`/`B5`/`D1` are **correct but will read as unfair** to
`ripgrep`'s maintainers — a different failure mode from being wrong, and the report has no way to
say which one a finding is.

## Finding 5 — the honesty machinery is buried

The gap disclosures are the tool's best feature and the reason this agent trusted the report
enough to investigate `C2` rather than dismiss the run:

> I have never seen a conformance tool this unwilling to overclaim.

And then:

> The `NOT FULLY VERIFIED` block ran to 18 paragraphs of semicolon-joined clauses. I skimmed it
> and then went back to the per-finding `coverageGaps` in the JSON instead.

Proposed: gaps for **failing** rules first, the rest behind a flag.

## Smaller items

- **The `husky` postinstall block appears on every install** and is documented nowhere. The agent
  stopped to check it — reasonably, on a security-adjacent tool. One sentence in Getting Started
  removes the only moment of doubt in the whole install.
- **Two malformed messages**: `acc.config.json rules names "Z9"` is garbled, and
  `found a undefined` should be `found undefined`.
- **`rg --help` documents no exit statuses** — only its man page does. No rule covers that, and
  for an agent-facing contract it is a real gap. A candidate rule, not a defect.

## Where the trial agent was wrong

It reported that the README's headline example does not reproduce, because piped output is JSON
and the README pitches the run as a CI step. **The README states exactly that, in the paragraph
immediately above the example.** The finding is real but misfiled: the sentence did not survive
the reader. It sits mid-paragraph behind three stacked ⚠ callouts, and the example's framing —
"the whole CI step, one line, no flags" — reinforces the picture it just corrected. A prose
defect, not a false claim.

Recording this is the point of recording it. The [staged consistency
review](./2026-08-23-a-staged-consistency-review.md) read that passage and passed it, because
consistency review reads documents against documents. It cannot catch a true sentence a reader
does not retain. Only somebody running the thing finds that.

## What this bears on `L1`

The trial reached the [`design-choice`-is-L1-leaking
hypothesis](./2026-08-22-design-choice-is-l1-leaking-into-l0.md) from the other direction,
without being told it existed.

Finding 1's fix is a **declaration**. The verdicts against `rg` become correct the moment the
target can say _"I have no verbs; my first positional is a pattern"_ — and that sentence is
`L1`'s entire premise. `L0` cannot detect the shape and, per A2's own page, does not guess.

So the strongest correctness defect this trial found is an argument for building `L1`, not for
delaying it. What it does argue against is shipping `L0` verdicts that read as confident against
targets whose shape we cannot see: `A2`, `A3` and `C2` need to know they are conditional on a
verb-dispatch assumption nothing has established.

## Not yet decided

- Whether `A2`/`A3`/`C2` should report `unverified` against a target whose shape is undetermined,
  or whether the fix waits for `L1`'s declaration and `L0` documents the limit loudly instead.
- Whether "the target's shape is undeclared" is a coverage gap, a new inertness-style class, or
  simply what `L1` is for.
- Whether `B4` should appear as `N/A` with a stated reason, and whether that generalises to any
  future rule without a checker.
