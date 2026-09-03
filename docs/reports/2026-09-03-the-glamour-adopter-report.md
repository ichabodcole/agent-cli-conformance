---
type: report
generated: { by: claude-fable-5-1, at: 2026-09-03 }
status: stable
lifecycle: live
description:
  Six friction points from the fourth adopter run, each checked against the tree. The adopter is
  Spellbook's glamour, a bun tool with nineteen verbs and one flag registry; the agent running
  it took it from NOT CONFORMANT to CONFORMANT at kit v0.1.11, then through the census and the
  one-registry derivation. Three points are guide gaps with a one-sentence fix, one is a nit,
  one asks that part of the declaration diff join the README's promised outputs, and one is a
  design question whose matcher half does not reproduce.
tags: [adoption, trial, evidence, consumer-signal, conformance, docs]
subject: GitHub issue #37, the adopter report from glamour, read against the kit and guides it names
examined:
  issue #37 as filed 2026-09-03; kit and docs at v0.1.11 (826e176 on develop); glamour at
  Spellbook feat/glamour-acc-l0 623963e, run from its own directory on macOS, bun 1.4
---

# The glamour adopter report

An agent brought Spellbook's `glamour` CLI to L0 in one sitting, then ran the census and the
one-registry derivation, and filed the friction as
[issue #37](https://github.com/ichabodcole/agent-cli-conformance/issues/37), bucketed the way
[`REPORTING.md`](../../skills/acc/REPORTING.md) asks. This report records those six points
against the tree, so each has a disposition rather than an open discussion. It is the fourth run in the
trials record — [what three adopters want](./2026-08-26-what-three-adopters-want.md) covers
the first two, [the third trial](./2026-08-27-the-third-trial.md) the third — and the first
where the adopter followed the published `skills/acc/SKILL.md` rather than a protocol run over
a chat channel with a coordinator.

Register, as in the earlier trial reports: **reported** is the adopter's own account, quoted;
**observed** is a command run for this report, with its output; **inferred** is marked ours.

Finding ids are prefixed `GL-`.

## What the run established before the friction

Reported: the install sequence, the three questions in
[the safety guide](../wiki/guides/how-to-establish-your-target-is-safe-to-check.md),
`probe-plan` and its `LIMIT:` line, the census roll-up, and the config-discovered caveat on the
verdict line all worked as written. The census found the run's one real defect — 450
disagreements with a single cause — which is the instrument doing what it is for. The run
succeeded; the friction below is what it left behind, and this report weighs it as minor for
that reason.

## GL-1 · The root of a verb-first tool: what its rejection should name

Reported: the adopter's first instinct was to put the verb roster in the root rejection's
`choices`, which produced

> THE DIFF DID NOT RUN — 0 of 20 declared command paths compared. did not enumerate at the root;
> … a `choices` list of 19 was present and its members are not flag-shaped …

The diff's message told them precisely what it saw and not what a root with no flags of its own
should say. They found the answer in the one-registry guide's interceptor array — `--help -h --version
-V`, the same array the declaration publishes at `path: []` — and the diff then compared 20 of 20.

Observed: the word "interceptor" occurs in
[how to derive your surface from one registry](../wiki/guides/how-to-derive-your-surface-from-one-registry.md)
as code and a quoted source comment, and nowhere in
[how to record surfaces below the root](../wiki/guides/how-to-record-surfaces-below-the-root.md)
or [how to reach L0](../wiki/guides/how-to-reach-l0-in-your-project.md). Nowhere is the
connecting sentence written: at the root, `choices` is the root's own flags, and the verb roster
belongs in `hint`, because a non-flag-shaped `choices` makes the root un-diffable.

**A guide gap.** One sentence in the surfaces guide, which is the page a census reader opens
first.

## GL-2 · `variadic` is not in the census guide's minimal declaration

Reported: the guide's example shows positionals with `name` and `required`; the adopter found
`variadic` by grepping the declaration parser in `node_modules`.

Observed: `grep -rn variadic docs/wiki/guides/` returns nothing. The parser refuses unknown keys
anywhere in the file, so a field the guide does not name is one an adopter can only discover by
reading source or by being refused.

**A guide gap.** The example or the field list under it should name all three positional keys.

## GL-3 · A promised signal for "the diff ran and found N disagreements"

Reported: to bind a CI ratchet to the declaration diff, the adopter reads
`data.declaration.status`, `checkedCommands` and `findings` from the JSON — every one of them on
the README's unstable side — and notes the exit code stays `0` whatever the diff finds, which they
accept as correct. They asked for something on the promised side: a `--fail-on-disagreement`
flag that moves the exit code into the outcome band, or a documented stable subset of
`data.declaration`.

Observed: the README's stable column is rule ids, the exit-code taxonomy, and `conformant`.
Nothing about the declaration diff is in it.

**An ask against the stable column, not a defect.** Deciding what joins that column is a
charter-level decision, and the pre-1.0 line exists so that it can still be made cheaply. This
finding is promoted as an open question rather than answered here.

## GL-4 · Bun strips one `--`, and neither the skill nor the L0 guide says so

Reported: the adopter smoke-tested an A6 fix by hand; `bun scripts/cli.ts -- --nope` reached the
script without the `--`, and read as "the fix did not work" for several minutes. `bun scripts/cli.ts --
-- --nope` is what the kit sends. They cite an earlier fresh-agent run in the same repository
hitting the same stripping from the other side.

Observed: neither `skills/acc/SKILL.md` nor the reach-L0 guide mentions the double terminator.
The kit compensates for the stripping when it launches a `.ts` target — that is what makes A6
verifiable at all — so the run itself was never wrong; the adopter's hand test was.

**A guide gap, hit twice in the same repository.** One line where the `.ts`-target advice
already lives: a hand smoke test through `bun` needs two `--`.

## GL-5 · `acc report <file>` piped returns JSON

Reported: piping `acc report` on first use looked like the input re-emitted. `--format text` is
what they meant, and the L0 guide says so.

Observed: the command's own notes say nothing is re-run and that the exit code mirrors the
stored verdict. They do not say that a non-terminal stdout gets the JSON rendering, which is the
kit-wide contract but is least expected from a command whose job is rendering.

**A nit, consistent with the contract.** One sentence in the command's notes.

## GL-6 · D3 `unverified` as a terminal state, and a schema command that did not clear it

Reported, in two parts. First, a design question: for a tool whose default output already is
JSON, D3 sits at `unverified` permanently, and the only way to move it is a `--json` flag on a
tool that does not need one — the checker-pleasing change the guides warn against. Second, a
possible matcher gap: glamour now advertises a `schema` command in help and, they say, D3 still
reads `UNVR`.

Observed: the second part does not reproduce. From glamour's own directory, with Spellbook
`623963e` checked out plus that branch's uncommitted edits:

```
$ bun <acc>/src/acc/cli.ts check ./scripts/cli.ts --format text
CONFORMANT (L0) — 0 core violated, 1 core unverified, 16 core partially covered …  [acc 0.1.11]
  PASS+ D3  help advertises a schema command
```

and the checker's schema-row pattern, applied directly to glamour's `--help` text, matches the
row `  schema    emit this CLI's acc declaration …`.

Inferred, ours: not a matcher gap. The quoted `UNVR` comes from a run before the schema row
landed, or from the other Spellbook tool the issue says sits in the same state.

What survives is the first part. The
[D3 page](../wiki/rules/discoverability/help-advertises-machine-mode.md) already reasons that a
caller sees help and not `acc.config.json`; it does not say in so many words that `unverified`
is the intended terminal state for a JSON-by-default tool with no schema command, so adopters
keep trying to clear it.

**A design question for the rule page.** Whether to state the terminal state plainly. The run
above already answers the other half: a visible `schema` command is a way out for a tool in
that shape.

## What this did not establish

- **The D3 `UNVR` the adopter quoted was not traced to its run.** The issue names no commit for
  that specific output, and the check above ran against a tree with uncommitted edits.
- **The 450-disagreement census and the one-registry derivation were not re-run.** They are
  reported, and the outcome — 20 of 20 compared — is quoted from the issue.
- **The other Spellbook tool named in GL-6 was not examined.**

## Dispositions

| Id     | Kind              | Proposed disposition                                                                                  |
| ------ | ----------------- | ----------------------------------------------------------------------------------------------------- |
| `GL-1` | guide gap         | one sentence in the surfaces guide: root `choices` are the interceptors, verbs go in `hint`           |
| `GL-2` | guide gap         | name `variadic` beside `name` and `required` in the census guide's example                            |
| `GL-3` | stable-column ask | promote to an open question: what, if anything, of the declaration diff is promised                   |
| `GL-4` | guide gap         | one line where the `.ts`-target advice lives: a hand test through `bun` needs two `--`                |
| `GL-5` | nit               | one sentence in `report`'s notes: piped, it emits JSON like every other command                       |
| `GL-6` | design question   | say on the D3 page what the terminal state is for a JSON-by-default tool; the matcher is not at fault |

None of these is actioned by this report. The three guide gaps share one property: in each,
the fact was already known somewhere — in another guide, in the parser's source, in the rule
page and the runner — and not in the page the adopter had open. The earlier trials found the
same shape, and the remedy is the same: put the sentence in the guide the reader opens first,
not in the document where the fact was first written down.
