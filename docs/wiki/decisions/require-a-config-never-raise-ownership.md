---
type: decision
title: Require a config, and never raise who owns the target
description:
  Where a rule needs a declaration, requiring the caller to write one is the answer — and who
  owns the target is not a distinction this documentation makes, because both branches cost a
  second explanation for a use nobody has.
tags: [config, declarations, audience, documentation, adoption]
related: [concept/conformance, concept/probing, rule/unknown-command-exits-nonzero]
status: stable
generated: { by: claude-opus-5, at: 2026-08-24 }
---

# Require a config, and never raise who owns the target

> **The refusal is not implemented, and is not being built now — recorded 2026-08-24.** The kit
> does not stop on an unconfigured run. `loadConfig` returns an empty config with
> `origin: "none"` when the working directory holds no `acc.config.json`, `acc check` produces a
> full report and a `conformant` verdict from it, and
> [the eight-CLI measurement](../../reports/2026-08-24-eight-owner-clis.md) this project's charter
> rests on was taken in exactly that mode. **The decision below is not withdrawn** — its reasoning
> stands and nothing here re-argues it — but the clause about the kit describes what was decided,
> not what the product does. [Why the build is deferred, and the condition that starts
> it](#the-refusal-is-not-being-built-yet-and-what-would-start-it).

## Context

Someone clones this repository, writes an `acc.config.json`, points `acc check` at `ripgrep`, and
files what it finds as an issue on `ripgrep`. They do not maintain `ripgrep`, and nobody there
has heard of this kit.

Two questions were put about that run. Is it a use this project supports? And is a declaration
that the target's maintainer did not write a legitimate declaration at all, or does a
caller-authored config make the verdict something less?

They arrive as two questions and they have one answer.

## Decision

**Requiring a config is a legitimate answer, and ownership of the target is not a distinction
this project's documentation makes.**

Two clauses, and they are applied separately.

**Where a rule's verdict depends on something only a declaration establishes, the answer is
"declare it", not "here is what you get without one".** This binds the documentation: pages are
written for the caller who has a config, and the unconfigured run is not maintained as a second
documented mode with its own partial answers to interpret.

**And it binds the kit: `acc check` does not run without a declaration.** No config, no result —
the run stops and tells the caller to write one. There is no reduced verdict for an unconfigured
run, because a reduced verdict is the second mode arriving through the code instead of through
the prose. **This clause is a decision about what the kit should do, and as of 2026-08-24 it is
not a description of what the kit does** — see [the note at the top](#the-refusal-is-not-being-built-yet-and-what-would-start-it).

**Who owns the target is not material, and the documentation does not raise it.** No audience
split between adopters and third parties, no prose contrasting the maintainer of a CLI with
whoever is checking it — and no reassurance that it does not matter either. A page saying "it
does not matter who you are" has raised the question and then answered it, which costs the reader
the same paragraph as taking a side.

## Rationale

**The cost being avoided is a fork, in the code and in the prose, and it is one argument rather
than two.** Supporting an unconfigured run as a
documented mode means writing, and then maintaining, what it limits, what each partial answer
means, and how to read one — beside every place the configured path is already explained. That is
a second branch of explanation running the length of the guides, the concept pages and the rule
pages, and it is bought for a caller nobody has been able to describe: someone who wants a
verdict on a CLI, has cloned the repository to get it, and cannot write a JSON file. Requiring
the file costs that caller a few minutes. Documenting its absence costs every reader of every
page a fork in the prose.

**The code half is the same sentence with a different noun.** A kit that answers both a
configured and an unconfigured invocation has two behaviours to keep working, two sets of
verdicts that have to stay consistent with each other, and an explanation of what the difference
means that has to stay true of both. Every rule added later is added twice — once for the run
that knows the target's shape and once for the run that does not — and every change to what a
declaration establishes has to be checked against the branch where it establishes nothing. None
of that exists if the first thing a caller does is write a config.

**The use that does exist is one clone away and needs nothing from the target.** Clone, write a
config, run the kit, read the report, open an issue with it. Whether that config is ever
committed — to the target's repository, to the caller's, to nothing at all — is the caller's
business and produces no different verdict.

**And the mechanism was already caller-side, which is why the second question dissolves rather
than being decided.** [`src/acc/kit/config.ts`](../../../src/acc/kit/config.ts) resolves
`acc.config.json` from the directory named by `--config-dir`, or from the working directory when
no flag was given, and from nowhere else — `loadConfig` receives only that directory and defaults
it to `.`. Nothing in the resolution consults the target path, walks up from it, or looks beside
the binary; the target reaches the kit as an argument to spawn and never as a place to read
configuration from. So a config written by someone who has never touched the target's repository
loads exactly the way one shipped beside a tool would. There is no maintainer-authored config for
a caller-authored one to be a lesser version of, and no code change is needed to admit the third
party — they were never being kept out.

**A declaration is a statement to the kit about how to read a target**, and it is falsifiable
whoever wrote it: `defaultOutput: "json"` on a tool that answers a parser error in prose fails
[B5](../rules/streams/machine-mode-holds-on-parser-errors.md) rather than being believed. That is
what makes authorship non-material. A declaration that could only be trusted because of who wrote
it would be a credential, and this catalogue does not accept credentials anywhere else either.

## What was rejected

**An audience split.** Documenting adopters and third parties as two readerships, with their own
paths through the material, was the shape both questions invited. It doubles the pages that have
to stay in agreement in exchange for a distinction that changes no command, no config and no
verdict.

**Prose distinguishing the target's owner from the caller — including the permissive kind.** The
tempting sentence is "you do not have to own the CLI you check". It reads as generous and it
plants the idea that permission was in question. The decision is not that both readers are
welcome; it is that the categories do not appear. Where a page would name one, it names the
person running the kit.

**A partial run that skips the rules a declaration answers.** This is the strongest of the
rejected options and it is not rejected for lack of value — a run that checks what it can and
reports the rest as unreachable would tell a caller something true. It is rejected because it is
a second maintained mode wearing a modest name: the same two behaviours, the same two sets of
verdicts, and the additional job of explaining which rules fell out and why. The value it offers
is smaller than the value of writing the file, which is minutes of work for anyone already
holding a CLI they want checked.

## Consequences

### The refusal is not being built yet, and what would start it

Recorded 2026-08-24, after an external audit ran the binary and found the page and the product
asserting opposite things. Three reasons, and not one of them is a doubt about the decision.

**Its premise is under review.** [`CHARTER.md`](../../../CHARTER.md)'s first open question asks
whether the `L0`/`L1` split survives at all, and the refusal was designed for a world in which the
required file carries declarations about the target's own shape. Those declarations do not exist
yet. Building the gate now would harden a boundary while the thing it is a boundary around is
still being argued — and the sibling decision already says to
[sketch `L1`'s declaration shape before a shape key lands in the config](./not-in-the-config-not-inferred.md#sketch-l1s-declaration-shape-before-adding-a-shape-key-to-accconfigjson).

**It is not a guard in `check.ts`.** `loadConfig` defaults to the working directory, and this
repository deliberately ships no root `acc.config.json` — a file there would declare machine mode
for every fixture the suite checks from that directory, making the declaration false of most of
them. So the refusal lands on
[`src/acc/conformance.test.ts`](../../../src/acc/conformance.test.ts) and its neighbours, which
between them invoke `acc check` **48 times with no `--config-dir`** — two dozen of them in
`conformance.test.ts` alone — every one of which would then be looking for a root file that is
not there. Those are one problem rather than two: the same default that makes the refusal a few
lines to write is what leaves those call sites with nothing to satisfy it.

**It would invalidate the frame of the flagship measurement.**
[The eight-CLI run](../../reports/2026-08-24-eight-owner-clis.md) records
`configSource.origin: "none"` on all eight targets, and the charter cites that run in three
places. Under a refusal none of those eight runs could have happened, so the measurement would
have to be retaken before the gate landed, not after.

**The condition that starts the build, which is a thing someone can check.** Build the refusal
when `acc.config.json` is required to carry a declaration about the target itself — a key of the
kind the sibling page defers, `helpFlags` being the named example, describing the target's own
command surface. The check is `TOP_LEVEL_KEYS` in
[`src/acc/kit/config.ts`](../../../src/acc/kit/config.ts): today it reads `rules`,
`knownFailures`, `defaultOutput`, and when a shape key joins that list the condition is met.
`defaultOutput` is not that key and does not meet it — it is optional, and its absence withholds
verdicts rather than supplying guessed ones, which is what makes a run without it still worth
having. That is the whole argument for waiting: until the file is required to say something the
run needs, a gate in front of it stops callers from getting a result without making any result
better.

### What now has to change

These are implications, not edits made here. Each is a separate change with its own review.

- **[`README.md`](../../../README.md)'s audience line** — "**For** — CLI authors, framework and
  scaffold maintainers, and platform/tooling teams; agent-harness authors second" — is the
  clearest instance of the rejected distinction, and it is on the front page. Whether it narrows
  to what the kit is _for_ (ordinary CLIs consumed by agents, which the same paragraph already
  says) or goes entirely is open; what it cannot do is stay as a list of relationships to a
  target.
- **[`docs/roadmap.md`](../../roadmap.md#one-run-per-cli-for-a-family-that-shares-one-contract)
  cites that line as a settled constraint** — "That is precisely the audience the README names —
  'framework and scaffold maintainers' — and for them the shared row is the finding". The
  argument for reporting an intersection across several targets survives on its own evidence, but
  it is currently resting on a sentence that is being withdrawn, so it needs rewriting to rest on
  the measurement instead.
- **[A2](../rules/parsing/unknown-command-exits-nonzero.md#the-probe) states a prohibition where
  this decision states a declaration.** Its probe section ends "the kit cannot detect that shape
  and does not guess, so do not point `acc check` at a CLI of that kind" — of a CLI whose root
  positional is free-form data. Under this decision the remedy for an undeclared shape is to
  declare it, not to withhold the run. **The safety half of that warning is a separate claim and
  must be kept**: sending a sentinel token to `claude`, `llm` or `aider` is a prompt, and it
  spends money and can take actions. "This probe is unsafe against this shape of target" and
  "therefore never run the kit here" are two sentences, and only the second one is being
  withdrawn. Whoever edits that page separates them rather than deleting the paragraph.
- **Two strings the shipped product prints go false the day the refusal ships, and both were
  written yesterday.** They are accurate about the binary as it stands, because the refusal is
  not built; this entry is part of what that build has to change, not a defect report against
  today's output.
  [`src/acc/commands/check.ts`](../../../src/acc/commands/check.ts) offers, as the hint on a
  config error, "drop `--config-dir` — the working directory is searched instead, and no
  `acc.config.json` there is not an error"; the `--config-dir` description in
  [`src/acc/spec.ts`](../../../src/acc/spec.ts) says the same about the flag's absence, that the
  working directory is searched and a file found there is loaded. Under a refusal a run with no
  config anywhere would be an error, and both sentences would then tell a caller the opposite of
  what happens.
  **Fix the `spec.ts` description first, when that day comes**: it is what `acc check --help` prints on every run, so a
  caller meets it before they have any config at all, which is exactly the moment the refusal
  would make it wrong — where the hint is reachable only once a config exists and is broken, and so
  misleads a narrower audience in a narrower moment. Neither is neglect: both arrived in the
  change that made the kit disclose where its config came from, they are true of the kit today, and
  the refusal is what falsifies them. That is how documentation usually goes stale — a decision
  arriving after the prose — and it is why this list exists rather than being left for a reader
  to find.

### What the refusal looks like is open, and the fact to start from

A missing config becomes a failure of the invocation rather than a verdict about the target, so
it belongs in the `1`–`8` band and never at `9` — see
[the taxonomy](../concepts/exit-codes.md#the-taxonomy). Today every `ConfigError` —
a malformed file, an unparseable one, a `--config-dir` naming nothing — is translated in
[`src/acc/commands/check.ts`](../../../src/acc/commands/check.ts) into a `usage` error, which
[`src/acc/exit-codes.ts`](../../../src/acc/exit-codes.ts) pairs with exit `2`, on the stated
reasoning that all of them are fixable by editing a file the caller owns. Whether "no config at
all" is the same kind of mistake as "a broken config", and so shares `2`, is not decided here:
the first is a step the caller has not taken yet and the second is a step they got wrong, and an
agent branching on the code may want to tell those apart.

### `acc` self-applies, and does not currently ship a config

[`src/acc/conformance.test.ts`](../../../src/acc/conformance.test.ts) checks `acc` against its
own catalogue, and it does so through the kit API rather than the CLI — `record` and
`buildReport` are handed an `AccConfig` assembled in memory, declaring `defaultOutput: "json"`.
That file says why the declaration is not a root `acc.config.json`: `loadConfig` defaults to the
working directory, and a file at the repo root would declare machine mode for every fixture the
suite checks from there, most of which are not machine-first, making the declaration false of
them. So the self-check itself is unaffected by a refusal at the CLI boundary — and the question
of whether this repository must now ship a config for anyone running `acc check ./acc` by hand is
live, with that side effect as the reason it has none.

### An open consequence, not decided here — with a candidate resolution

A guided setup was raised alongside this — the kit noticing that no config was loaded and helping
the caller write one. It looked blocked: `acc` is bound by
[E1](../rules/interactivity/never-block-without-a-tty.md), which is that with stdin not a
terminal nothing waits for input, and the unconfigured run is exactly where the caller is most
likely to be a harness in CI.

Refusing to run makes a resolution available that prompting never had. The refusal already has to
say something, and what it says can be a **starter config the caller saves** — printed, not
awaited. Nothing blocks, nothing reads stdin, and a harness can drive it as easily as a person.
That is the candidate, not the decision; nobody has chosen the shape, and this item stays open.

### Also open: what a required config must contain

Making the file mandatory raises what the minimum is — which keys a run needs before it can
start, and whether an empty object counts as a declaration. That is being taken up separately and
this record takes no position on it.

### Also open, and outside this record

Whether [A2](../rules/parsing/unknown-command-exits-nonzero.md),
[A3](../rules/parsing/errors-name-the-offending-token.md) and
[C2](../rules/exit-codes/usage-errors-are-distinguishable.md) should **caveat** their verdicts
against a target whose shape nothing has established, or **withhold** them, is a live question
being settled separately. This record decides only that the remedy is a declaration; it takes no
position on what those rules report before one arrives.

## What would change our mind

**The unconfigured run gets supported after all** if someone appears who genuinely cannot produce
a config and still needs a verdict — a hosted runner pointed at an arbitrary binary, a package
registry checking submissions at scale. That is a caller for whom "write a file first" is not a
few minutes' work, and the fork would then be bought by a real reader rather than a hypothetical
one.

**The silence about ownership was wrong** if third-party callers keep arriving with the same
question anyway — asking in issues whether they are allowed to check a tool they do not maintain.
Not raising a distinction only works while nobody is raising it for themselves; if they are, the
page that answers them is cheaper than the confusion, and this decision will have been a
preference for a tidy front page over a question readers actually have.
