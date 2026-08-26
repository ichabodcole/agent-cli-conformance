---
type: report
generated: { by: claude-opus-5, at: 2026-08-26 }
status: stable
lifecycle: live
description:
  The second adoption trial, and the first time the census closed its own loop — 289 disagreements
  found, fixed, and re-measured to zero, with a control run in between proving the number was a
  property of the tool rather than of how it was read. Four defects in the kit and four in the
  guidance, all found by the adopter.
tags: [conformance, evidence, adoption, parsing, contract, declaration, census]
subject: magpie taken to L0 and through three censuses by a fresh agent working from the guides
examined:
  magpie at `plugins/spellbook/skills/magpie/scripts/cli.ts`, Spellbook `2b2ce93` → `d7dfacf` →
  `bb67078` → `cd06cb5`; acc at `develop` `3215f36`–`99cd901`; macOS, bun 1.4.0; 2026-08-26
---

# The magpie trial

The second adoption trial, run by **`flint`**, a fresh Spellbook-side agent briefed on a grapevine
channel with the guides and nothing else. They were told the target, the branch, the reading order,
and that a pre-registration about their target existed and was off limits. Everything below is
theirs unless attributed otherwise.

**The headline: the census closed its own loop.** 289 disagreements found, the parser fixed against
the census's own output, and the census re-measured to zero. Nobody had shown that before.

## The three censuses

| run      | magpie state                                  | disagreements | paths compared |
| -------- | --------------------------------------------- | ------------- | -------------- |
| census 1 | one global flag registry, prose rejections    | **289**       | 17 of 17       |
| census 2 | one global flag registry, JSON error envelope | **289**       | 17 of 17       |
| census 3 | per-verb flag scoping                         | **0**         | 15 of 17       |

**Census 2 is what makes this mean anything.** Between runs 1 and 2 the rejection bytes changed
completely — prose to a JSON envelope — and the number did not move. So the 289 was a property of
magpie and not of how it was being read, and the 0 is a property of the fix. Without that control
the result is an anecdote.

**What the 289 was.** Every one of magpie's seventeen verbs accepted every one of its nineteen
flags. `magpie close --alpha auto` parsed clean. So did `magpie help --model x` and
`magpie say --bbox 1,2,3,4`. Not one was documented, not one was meaningful, and each was a
silently-accepted nonsense invocation an agent could construct from another verb's help line.

**The adopter's own severity correction, which is the right one:**

> It is not drift between two accurate artifacts. The parser is wrong, and help is right.

**And the cleanest statement of what the whole exercise found:** fixing 289 pairs cost **two
sentences** of documentation. Not one per-verb flag list in magpie's help was wrong. Help was
right, the parser was wrong, and nothing bound them.

## Two predictions, pinned independently, neither re-fitted

Ours was filed before the adopter was briefed
([the pre-registration](./2026-08-26-magpie-pre-registration.md)); theirs was posted to the channel
before they opened the census guide, with a disclosure that they had already read magpie's help and
flag registry and so were not blind.

Both identified the same mechanism — one global registry, no per-verb binding — with no contact
between them. Counts landed within about 1% once the adopter restated a denominator they had
changed between registering and measuring, **which they disclosed unprompted**:

> I chose the denominator after registering it. If you want the strict reading, claim 2 named 268
> and the answer was 289, and the reason is a path I added between the two.

Our `R-5` was soft and missed by three for the same class of reason: a per-path declared count
assumed and never verified. **Neither side re-fitted after seeing the output**, which is the only
property that makes a registration worth filing.

`R-3` — that the accepted registry equals the union of the per-verb help — was contested by the
adopter and the contest was upheld: our count swept a `--version` sitting in help's **verb block**
into a tally of declared flags. That is a measurement error of ours, not drift in magpie.

## What the trial found in `acc`

Four defects, each reproduced here before being agreed, all fixed on `develop`:

- **`C2` printed `a usage error exited 0 (2,2,0)`** — three numbers, no shapes, so a reader could
  not tell which invocation returned the zero, and those are four different fixes. They recovered
  the probe order from `acc show C2 --body`. Now named by shape, which carries the `D2` coupling
  for free.
- **The machine-mode prose matcher split on `\n`** as though a newline ended a sentence. Help text
  is hard-wrapped, so the same claim passed or failed depending on where it wrapped.
- **`B5` quoted a prose error with `slice(0, 60)`**, cutting `run: cli.ts help` at `run: cli.ts `
  and dropping the only actionable word in the sentence.
- **`D3` returns `PASS+ help advertises --json` on help that says it has no `--json` flag.** The
  token scan finds the token inside the denial. **Not fixed** — that phantom flag also reaches
  `machineSelector`, which `A3`, `B2`, `B4` and `B5` consume, so it is a five-rule premise change
  and it gets a before/after sweep of its own.

And four in the guidance, all fixed:

- **The census guide's pointer to the declaration format was dead.** It named a page that uses
  `--declaration` zero times and says twice that L0 needs no declaration. Nothing else documented
  the shape, so the adopter got it by reading this repository's test fixtures. That worked and
  should not have been the route.
- **A verification step was false.** It opened _"The verdict line did not change"_ and its next
  sentence named the three things that must not change. The line does change. They followed the
  first sentence literally, saw the line move, and were told by the page they had found a kit
  defect.
- **Timing rows differ between runs**, and the page instructs a mechanical diff.
- **Step 1's example assumed a root that enumerates**, which is the one shape the page is least
  needed for.

They also reported the positive case we asked for: the denominator passage rewritten two days
earlier **landed first read**, and they built a rootless declaration and batch without hesitating.

## The finding that outgrew its own prediction

**Reaching L0 introduced declaration drift.** `D1` said magpie reported no version. They added
`--version`, documented it in help, and implemented it above the parser — so it works at the root
and is refused at every verb:

```
magpie --version        -> exit 0   {"name":"magpie","version":"2.2.0"}
magpie state --version  -> exit 2   Unknown option '--version'
```

**Our own remediation created the defect the census exists to find.** It generalises to any tool
with no binding between its help text and its per-path parser, and the same shape appears in `D3`,
which tells a machine-first tool to advertise a flag it does not have.
[The L0 guide now warns about it](../wiki/guides/how-to-reach-l0-in-your-project.md).

**And the census cannot see it.** The adopter did not take that on trust — they built the two
declarations that separate the possibilities and ran both against the same batch. Declaring
`--version` at a verb produces the finding; declaring it at the root, where it actually lives,
produces `17 of 18` and nothing else, because a non-enumerating root is never compared. Their
severity correction is accepted: the fraction falls short and a `NOT COMPARED: (root)` line names
why, so it is a **reach limit**, not a silent failure.

## The reader defect, found by census 3 going green

Two paths dropped out of the comparison at census 3 — `sessions` and `help`, which accept no flags
by design and say so with an explicit `"choices": []`.

The kit reads that as `not-enumerated`, drops both, and renders
`none named a set (NOT a tool with no flags)` — **the precise opposite of what the target said.**
The clause is `value.length > 0` in `keyedSets`, which discards the empty array before anything can
read it. Worse, that status's own definition asserts _"the tool has flags, it simply does not list
them"_, so the kit does not merely fail to record the answer: it asserts its negation.

The type already separates `no-evidence` ("we did not look") from `not-enumerated` ("we looked and
found nothing") — two of the three states
[Part 3 of `STANDARD.md`](../../STANDARD.md) requires of any field — and cannot say **"we looked and
it said none."**

**The adopter's argument is what makes this disqualifying rather than cosmetic:**

> The fraction moves the wrong way as the tool improves, which is the one direction a measurement
> must never move.

Every tool that takes this project's per-verb-scoping advice acquires flagless verbs, and each one
costs it census coverage while the report claims it enumerated nothing.
[The bytes are vendored](../../src/acc/kit/fixtures/recorded-surfaces/PROVENANCE.md) as the
before-case, because the naive repair — deleting the clause — makes any recognised key holding an
empty array an enumeration of zero flags, and every declared flag at that path then becomes a
finding. A false empty enumeration **generates** findings where a false `not-enumerated` only
suppresses them.

## How the adopter worked, because it is why the findings are worth taking

- **They filed debt against themselves before doing the work.** Their new `VERBS` array was
  hand-kept beside a `switch` — a second unbound surface of the kind the trial had been finding —
  and they said so on the channel before starting the fix, when leaving it would have been easiest.
  It is now derived from `VERB_SPEC`, with a test that reads the source and fails a build.
- **They built discriminating tests instead of accepting results.** The envelope preserving the
  enumeration could have meant "parsed `choices`" or "scraped every flag-shaped token"; they
  planted a flag-shaped token in a `hint` field, absent from `choices`, and confirmed the extractor
  parses rather than scrapes.
- **They corrected their own evidence unprompted**, and accepted a correction where an A/B of ours
  showed their two wordings differed in more than the one variable they claimed.
- **They did work no rule required.** All 25 `die()` sites were reclassified to the exit-code
  taxonomy, which nothing at L0 checks. Their reason:

  > An honest `unverified` talked me into work a pass would not have.

  That is the clearest outside validation this project's core design choice has received.

## What this trial did not establish

- **Nothing about mutating commands.** Every probe is inert by construction, so the ceiling the
  drift trial measured — run-time behaviour reached for a quarter of a tool's commands — is
  untouched here.
- **Nothing about nested subcommands.** magpie is a flat verb dispatcher. `status on` exercised
  multi-token path splitting and is a positional, not a nested command.
- **Nothing about the group-command shape**, which magpie does not have — recorded as a limit on
  what this trial could contribute to
  [that candidate](./2026-08-26-the-group-command-candidate.md) rather than as agreement.
- **Nothing about an emitted declaration.** magpie's was `modelled`, hand-written from help.
