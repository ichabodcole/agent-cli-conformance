---
type: report
generated: { by: claude-opus-5, at: 2026-08-26 }
status: draft
lifecycle: live
description:
  A prediction pinned before a fresh agent checks magpie, and before that agent is told anything.
  magpie's parser enumerates one global 19-flag registry at every verb, and that registry is
  exactly the union of the flags its own help declares per-verb — so the drift is entirely one of
  scope, with nothing hidden and nothing missing.
tags: [conformance, evidence, adoption, parsing, contract, declaration, pre-registration]
subject: magpie's accepted flag surface, registered before a fresh agent measures it
examined:
  magpie at `plugins/spellbook/skills/magpie/scripts/cli.ts`, Spellbook `2b2ce93`; probed by hand
  with one sentinel flag per verb; macOS, bun 1.4.0; 2026-08-26
---

# magpie — a prediction pinned before the run

**Nothing in this file has been shown to the agent who will run the check.** It is registered here
so the comparison afterwards is between a claim made in advance and a result, rather than between a
result and a story told about it. That is the [`DT-11`](./2026-08-24-first-drift-trial-anthill-manifest.md)
pattern, which is the only reason the anthill round produced evidence rather than a report.

## How this was measured

One sentinel flag per verb, sent after the verb, against every verb the help screen names:

```
bun plugins/spellbook/skills/magpie/scripts/cli.ts <verb> --acc-not-a-flag
```

Seventeen verbs, seventeen rejections, each `exit=2` with nothing on stdout. The argv carries no
`--`, names no declared verb-flag, and every token after the verb starts with `-`, which is what
makes the rejection readable under the kit's own rules.

## What is registered

**R-1 — the accepted set is IDENTICAL at every verb.** All seventeen rejections enumerate the same
nineteen flags in the same order. There is no per-command accepted set; the parser takes every flag
everywhere:

```
--alpha --bbox --ids --intent --label --model --name --options --pad --restore
--session --since --timeout --title --type --full --no-open --remove --stdin
```

**R-2 — zero `declared-not-accepted`, at every path.** Every flag the help declares anywhere is in
that nineteen. The declaration will be a strict subset of what the parser takes, as bounty's was.

**R-3 — the sharp one: the accepted registry EQUALS the union of the per-verb help.** Not a
superset. The nineteen tokens above are exactly the nineteen distinct flags magpie's help declares
across all its verbs, with nothing left over on either side.

That is a different defect statement from bounty's, and a more specific one. bounty's finding was
that the parser accepts 5.5× what help declares. magpie's is that **the help is complete in
aggregate and wrong in distribution**: no flag is hidden, no flag is missing, and every one of them
is offered at sixteen verbs where it means nothing. The drift is entirely one of SCOPE.

**R-4 — the root does not enumerate, so no census is possible without a recorded batch.**
`magpie --acc-probe-xyzzy` answers `magpie: unknown verb "--acc-probe-xyzzy" — run: cli.ts help` in
62 bytes, naming no flag. The kit probes the root only. So `acc check` alone reaches a verdict on
nothing here, and every path in the census has to come from a
[recorded-surface batch](../wiki/guides/how-to-record-surfaces-below-the-root.md) the agent builds.
**This is the first target where the batch is not an improvement on the census but the whole of
it.**

**R-5 — the arithmetic, stated with its assumption.** If the agent models the declaration faithfully
from help and attaches the global `--session` to every command, the census reports **0
`declared-not-accepted`** and **about 286 `accepted-not-declared`** across seventeen paths — the
per-path figure being 19 minus that verb's declared count, ranging from 12 at `extract` to 18 at the
seven verbs that declare nothing.

**R-5 is the soft one and is registered as soft.** It moves with modelling choices the agent has not
made yet — whether `--session` is declared per-command or not at all, whether `status on` is read as
a verb or a positional, whether `help` is declared as a command. R-1 through R-4 do not move with
any of them.

## What would falsify this

- Any verb enumerating a set that differs from the other sixteen falsifies **R-1**.
- Any `declared-not-accepted` finding falsifies **R-2**.
- A flag accepted but declared nowhere, or declared but absent from the nineteen, falsifies **R-3**
  — and R-3 is the claim most worth losing, because a hidden flag is a worse defect than a
  mis-scoped one and we would rather learn it exists.
- A census the agent produces from `acc check` alone, with no batch, falsifies **R-4** and means the
  kit reaches further than this file thinks.

## What this does not claim

Nothing here is a verdict on magpie, and nothing here is a prediction about the AGENT. Whether they
find these numbers, how long it takes, where the guidance fails them and what they ask for are the
subject of the run, not of this registration. A result that matches while the agent needed three
rounds of help to reach it is a finding about the documentation, and this file says nothing that
would let us pretend otherwise afterwards.

## Amendment, 2026-08-26 — the target moved under the registration, and R-3 is dead

**Everything above is left exactly as filed.** What follows was found before the adopter's census
ran, and is recorded now rather than afterwards, because a registration adjusted once the result
is in is not a registration.

**The build moved.** The claims above were measured against Spellbook `2b2ce93`. The adopter has
since reached L0 and committed `d7dfacf`, and that is the artifact their census will measure. This
is [DT-10](./2026-08-24-first-drift-trial-anthill-manifest.md#dt-10--two-builds-of-the-same-declared-version-disagree-about-whether-the-root-enumerates)
arriving from the other direction: there, one version string covered two builds that disagreed;
here, our own registration named a build and the tool moved past it while we watched.

Re-measured on `d7dfacf`:

- **R-1 holds.** All verbs still enumerate the same nineteen flags, same order.
- **R-2 is at risk, and its fate now depends on a modelling choice.** See below.
- **R-3 IS FALSIFIED.** The accepted registry is nineteen. The union of the flags help declares is
  now **twenty**. They are no longer equal, and the registry is a strict subset.
- **R-4 holds.** The root still does not enumerate.
- **R-5's arithmetic moves with R-3** and was registered as soft for this class of reason.

**What falsified it is the adopter's own conformance fix.** D1 said magpie reported no version.
They added `--version`, documented it in help, and implemented it above the parser — so it works
at the root and is refused at every verb:

```
magpie --version        -> exit 0  {"name":"magpie","version":"2.2.0"}
magpie state --version  -> exit 2  Unknown option '--version'
```

Help now names a flag the per-path parser does not accept. Whether the census reports it as
`declared-not-accepted` depends entirely on how the adopter models it — a root-only flag produces
nothing, a global flag produces one finding at every verb. Their own registration predicts **zero
declared-but-refused**, which that modelling choice now decides.

**This is the finding, and it is bigger than the prediction it killed.** Reaching L0 introduced
declaration drift. The remediation this project recommends — add `--version`, say so in help —
creates exactly the defect the census exists to find, on any tool with no binding between its help
text and its per-path parser. Nothing in the L0 guide warns about it, and the two halves of this
kit have never before been shown to work against each other.

**Not told to the adopter.** Their census will find it or it will not, and which of those happens
is worth more than the three hours of confusion this note would save them. This paragraph is the
record that we knew first.
