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
documented mode with its own partial answers to interpret. What the kit itself should do on an
unconfigured run is [not decided here](#what-the-kit-does-with-no-config-is-open).

**Who owns the target is not material, and the documentation does not raise it.** No audience
split between adopters and third parties, no prose contrasting the maintainer of a CLI with
whoever is checking it — and no reassurance that it does not matter either. A page saying "it
does not matter who you are" has raised the question and then answered it, which costs the reader
the same paragraph as taking a side.

## Rationale

**The cost being avoided is documentation, not code.** Supporting an unconfigured run as a
documented mode means writing, and then maintaining, what it limits, what each partial answer
means, and how to read one — beside every place the configured path is already explained. That is
a second branch of explanation running the length of the guides, the concept pages and the rule
pages, and it is bought for a caller nobody has been able to describe: someone who wants a
verdict on a CLI, has cloned the repository to get it, and cannot write a JSON file. Requiring
the file costs that caller a few minutes. Documenting its absence costs every reader of every
page a fork in the prose.

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

## Consequences

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

### What the kit does with no config is open

Whether `acc check` should eventually **refuse** to run with no config, **warn** that some rules
cannot be answered without one, or **stay silent** is undecided. Silence is the status quo — the
report names the config source as `origin: "none"` and says nothing further — so this is a
question about whether to add something, not about changing something.

### An open consequence, not decided here

A guided setup was raised alongside this — the kit noticing that no config was loaded and
offering to help write one. It is in tension with the catalogue this kit applies to itself.
`src/acc/conformance.test.ts` runs `acc check` against `acc`, so `acc` is bound by
[E1](../rules/interactivity/never-block-without-a-tty.md): with stdin not a terminal, no waiting
for input. A prompt is exactly what a harness cannot answer, and the guided path would live on
the run where a caller is most likely to be a harness — an unconfigured one, in CI, on a first
attempt. There are shapes that might resolve it (an offer printed rather than awaited, a
subcommand a caller invokes deliberately), and none is chosen here. The tension is recorded so
that whoever designs it starts from E1 rather than discovering it.

### Also open, and outside this record

Whether [A2](../rules/parsing/unknown-command-exits-nonzero.md),
[A3](../rules/parsing/errors-name-the-offending-token.md) and
[C2](../rules/exit-codes/usage-errors-are-distinguishable.md) should **caveat** their verdicts
against a target whose shape nothing has established, or **withhold** them, is a live question
being settled separately. This record decides only that the remedy is a declaration; it takes no
position on what those rules report before one arrives.

## What would change our mind

**The unconfigured run gets documented after all** if someone appears who genuinely cannot
produce a config and still needs a verdict — a hosted runner pointed at an arbitrary binary, a
package registry checking submissions at scale. That is a caller for whom "write a file first" is
not a few minutes' work, and the second branch of explanation would then be bought by a real
reader rather than a hypothetical one.

**The silence about ownership was wrong** if third-party callers keep arriving with the same
question anyway — asking in issues whether they are allowed to check a tool they do not maintain.
Not raising a distinction only works while nobody is raising it for themselves; if they are, the
page that answers them is cheaper than the confusion, and this decision will have been a
preference for a tidy front page over a question readers actually have.
