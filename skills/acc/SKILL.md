---
name: acc
description:
  Check a command-line tool against the acc conformance standard. Use when someone wants to know
  whether their CLI is usable by agents and scripts, when they have run `acc check` and do not
  know what to do with the result, or when they want to cover the command paths a root-only probe
  cannot reach.
---

# Checking a CLI with `acc`

`acc` runs against a command-line tool and reports how well it behaves for agents and scripts.
**The guidance is the goal**: the guides this skill routes to say how to build a CLI that agents
can genuinely use, and following them without ever running the kit still gets you the better
CLI. The checks are the smallest part of this — they exist to hold what you adopt in place. Each
thing you adopt — a declared default, an enumerated rejection — converts more of the report from
`unverified` to checked and kept that way.

This skill is the order to do things in. Every guide it names is a file in the `acc` repository,
at the path given.

## 1. Install it, verify it, run it

```bash
bun add -d git+ssh://git@github.com/ichabodcole/agent-cli-conformance.git
bunx acc version --check
bunx acc check ./path/to/your-cli
```

Needs Bun 1.4+ on macOS or Linux, and access to the repository — it is private and not on npm.

**The second line is part of the install.** A git install can silently hand you an older kit than
the newest release — exit `0`, nothing visible — so `version --check` confirms the first line did
what you asked. Its three answers: **up to date** (exit `0`); **a newer release exists** (exit
`10` — clear the cache, reinstall, check again; `docs/wiki/guides/how-to-fix-a-broken-install.md`
has the full remedy and the three ways an install goes wrong); **could not check** (exit `0`,
said plainly — an unreachable remote is not a failure of your invocation). And if `version` is
not a command your kit recognises, the rejection you get back lists the commands it does have:
you are on an older kit, and the same guide's remedy applies.

The target is the path to your executable or script, the same thing you would type to run it.

**`acc check` executes your tool.** If your CLI does real work when run with no arguments, read the
safety note in `bunx acc check --help` before pointing it at anything.

In a terminal you get a human report. Redirected or piped, you get JSON.

## 2. Read the result

The first line is the verdict. Below it, one line per rule.

If your own test suite is green and the report still found something, that is the expected shape
rather than a contradiction: these are interface-contract properties — what your tool owes a
caller that is a program — and a feature suite structurally does not assert them.

Then find the block headed `NOT FULLY VERIFIED`. It says, rule by rule, what a pass did **not**
establish. Read it. A `pass` means nothing the kit could reach was violated — it does not mean the
rule holds.

`acc show <rule-id> --body` prints any rule in full, with the argument behind it. `acc rules` lists
them all.

## 3. Fix what it found

`docs/wiki/guides/how-to-reach-l0-in-your-project.md` takes each failure and sorts it into a fix, a
deliberate exception, or debt you write down. It covers the config file, and which failures are
worth clearing first because they unblock others.

If a verdict itself is unclear, `docs/wiki/concepts/conformance.md` explains `pass`, `fail` and
`unverified`.

## 4. Adopt these two, even if you never run `acc` again

You have a verdict and your failures are sorted. This is the step for someone who already has a
CLI and is deciding whether anything else here is for them. Two changes are — they are cheap,
they are the point of the rest of this document, and each makes your tool better for every agent
that drives it, kit or no kit:

- **Rejections that name their valid set.** When your tool refuses an unknown flag or verb, list
  what it would have accepted. An error that carries its valid set is just-in-time discovery —
  paid for only on the failure path, and the agent self-corrects immediately without consulting
  anything (`docs/wiki/concepts/error-envelope.md`; the SHOULD is in `A3`, `acc show A3 --body`).
  If you have ever mistyped an `acc` command, the `choices` list in the rejection you got back is
  this practice, working on you.
- **A machine-readable default, declared.** If your tool's plain output is one parseable
  document, say so: `"defaultOutput": "json"` in `acc.config.json`. If it is not, that is the
  most consequential piece of the guidance to read next.

What `acc` adds once you adopt them is that they stay adopted: the declared default turns the
machine-mode check on parser errors (`B5`) from `unverified` into a hard check on every run, and
enumerated rejections are exactly what step 5's comparison reads — so drift in what you adopted
fails a build instead of surviving quietly.

Steps 5 and 6 are optional, and for many tools they honestly stay that way.

## 5. Optional: cover your subcommands

`acc check` only probes your tool at the **top level** — no subcommand is ever run. So a flag that
`mytool deploy` accepts is not looked at, and neither is anything below it.

To cover those paths you record your tool's own error messages and hand them back.
`docs/wiki/guides/how-to-record-surfaces-below-the-root.md` walks through it; `acc probe-plan`
generates a script that does the recording for you.

**Two situations, and your report tells you which you are in.** Look for one of these lines:

```
enumerated N flags at the root:
did not enumerate at the root; N rejections read, none named a set
```

**`enumerated`** means that when your tool refuses an unknown flag, it lists the flags it does
accept. That listing is what the comparison reads, so you already get some coverage without doing
anything.

**`did not enumerate`** means your tool refuses without saying what it would have accepted. For
a non-enumerating tool, recording buys **observation, not comparison** — the kit reads what your
subcommands did, but a declaration is compared only at paths where a rejection named the set it
refused from. The comparison starts when your rejections name their set: that is the SHOULD in
`A3` (`acc show A3 --body`) — **naming the set is the guidance**, the thing that makes your tool
legible to the agents that drive it, **and the census is how it sticks.**

Neither is a failure, and either way the guide is the same one.

## 6. Optional: stop the drift instead of finding it

If you are restructuring anyway, `docs/wiki/guides/how-to-derive-your-surface-from-one-registry.md`
shows how to make one table in your code drive your parser, your help text, your error messages and
your published interface. Tools built that way cannot disagree with themselves, and the comparison
in step 5 becomes a check that stays passed.

## 7. Tell us what happened

Especially if you got stuck. The most useful thing you can send is the point where you stopped, and
you do not need to have got far.

Say which of these it was:

1. **You could not tell what to do.** The tool works; the instructions or the output did not tell
   you enough.
2. **It did the wrong thing on your CLI.** It crashed, or it reported something untrue about your
   tool.
3. **It worked, and you wanted more.** Something is missing, or something here could be better.

If it is the third, say what you were doing when you wanted it. What you hit tells us more than
what you imagined.

Send the command you ran and what came back. `skills/acc/REPORTING.md` says where.
