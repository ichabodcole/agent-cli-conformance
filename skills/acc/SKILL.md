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

## 1. Install it and run it

<!-- x-release-please-start-version -->

```bash
bun add -d 'git+ssh://git@github.com/ichabodcole/agent-cli-conformance.git#v0.1.1'
bunx acc check ./path/to/your-cli
```

<!-- x-release-please-end -->

Needs Bun 1.4+ on macOS or Linux, and access to the repository — it is private and not on npm.
**Keep the `#v0.1.1` pin**: without a ref, bun resolves from a bare clone it may already hold and
can deliver an older kit at exit `0` with nothing visible. If the install fails or surprises you,
`docs/wiki/guides/how-to-fix-a-broken-install.md` covers the three ways it goes wrong, each with
a form that succeeds while handing you the old kit.

The target is the path to your executable or script, the same thing you would type to run it.

**`acc check` executes your tool.** If your CLI does real work when run with no arguments, read the
safety note in `bunx acc check --help` before pointing it at anything.

In a terminal you get a human report. Redirected or piped, you get JSON.

## 2. Read the result

The first line is the verdict. Below it, one line per rule.

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

**Most tools should stop here.** Steps 4 and 5 are for covering more than the top level, and they
cost more.

## 4. Optional: cover your subcommands

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

## 5. Optional: stop the drift instead of finding it

If you are restructuring anyway, `docs/wiki/guides/how-to-derive-your-surface-from-one-registry.md`
shows how to make one table in your code drive your parser, your help text, your error messages and
your published interface. Tools built that way cannot disagree with themselves, and the comparison
in step 4 becomes a check that stays passed.

## 6. Tell us what happened

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
