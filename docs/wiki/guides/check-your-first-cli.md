---
type: tutorial
title: Check your first CLI
description:
  A first run of the conformance kit against a tool that passes, one that fails, and one you
  did not write — learning to read the report rather than to fix anything.
tags: [tutorial, getting-started, conformance, acc-check]
related: [concept/conformance, rule/unknown-flag-exits-nonzero]
status: stable
generated: { by: claude-opus-5, at: 2026-08-17 }
---

# Check your first CLI

## What we will do

We will run `acc check` three times — against a CLI that conforms, one that does not, and a
real tool on your machine — and learn to read what comes back.

By the end we will be able to look at a report and say which rules were broken, which were
never established, and where to read the rule we tripped over. We will not fix anything: this
is a lesson in reading the instrument, not in passing it.

**One thing to know before the first command:** `acc` writes JSON when its output is piped and the
human report when it is not — the same contract it asks of every CLI it checks. Everything below
assumes a terminal. If you pipe, redirect, or run any of this in CI, add `--format text` to get the
report shown here.

Ten minutes. You need this repository checked out and `bun` installed. Every command below is
run from the repository root, which is why they read `bun run acc` rather than `bunx acc` — the
CLIs we are going to check ship with the repository. Installing `acc` into a project of your own
is the first step of
[How to reach L0 in your project](./how-to-reach-l0-in-your-project.md).

## Step 1 — check a CLI that passes

The kit ships fixtures: small CLIs written to exercise it. Start with the one built to conform.

```
bun run acc check src/acc/kit/fixtures/conforming.ts
```

The first line is the verdict:

```
CONFORMANT (L0) — 0 core violated, 1 core unverified, 16 core partially covered
```

Three claims, and the first is the headline: no core rule was **violated**. Check what the
process returned:

```
echo $?
```

`0`. Conformance is the gate, and this target passed it.

(The counts will grow as rules are added to the catalogue. `16` today, more later — the shape
of the line is what matters, not the number.)

Now look further down that report, at the last line before the gaps:

```
conformance means no core rule was VIOLATED; it does not mean every core rule was established
```

Hold onto that sentence. Step 3 is about it.

## Step 2 — check a CLI that fails

Now a fixture built broken — it accepts flags it does not recognise:

```
bun run acc check src/acc/kit/fixtures/broken/exits-zero-on-unknown-flag.ts
```

```
NOT CONFORMANT (L0) — 6 core violated, 3 core unverified, 8 core partially covered
```

And the exit code:

```
echo $?
```

`9`, not `1`. The run itself **succeeded** — `acc` did its job and the answer was no. That is
what `9` means here, and it is why a failing check is not reported as a broken tool. See
[outcomes are not errors](../concepts/exit-codes.md#outcomes-are-not-errors) when you want the
reasoning; for now, `0` is a pass and `9` is a fail.

Read the first finding:

```
FAIL  A1  the valueless flag exited 0; the valueless flag left 14 bytes on stdout; the
          valueless rejection did not name the offending flag; ...
```

Every clause is a separate observation. The fixture did not merely fail A1 — it failed it six
different ways, two probe shapes with three clauses each, and the report says which. This is the shape of every finding: a rule id, a
verdict, and the specific thing that was seen.

## Step 3 — read the four verdicts

Scroll back through either report. Four markers appear in the left column, and only one of them
means "broken":

```
PASS+ A2  root verb rejected with exit 2; nested case not probed at L0; this verdict assumes ...
N/A   A4  arity cannot be probed at L0 — testing it requires running a real subcommand ...
UNVR  A6  cannot be probed through a `bun` launcher: bun swallows the leading `--` ...
FAIL  A3  flag rejection did not name the flag; verb rejection did not name the verb (this ...)
```

- **FAIL** — the probe ran and the rule was broken. Only this one blocks conformance.
- **PASS+** — the rule held, but the checker establishes only _part_ of the rule. The `+` is a
  warning that the pass is narrower than the page.
- **UNVR** — the probe ran and established neither answer. Not a violation, not a pass.
- **N/A** — the rule needs a deeper probe level than this run used, so it was never attempted.

Note what A6 says: the kit could not deliver its probe, because `bun` ate the `--` before the
fixture saw it. That is the instrument reporting its own limit rather than blaming the target,
and it is the distinction the whole report is built around — see
[conformance](../concepts/conformance.md) when you want the full treatment.

> **This detection has a hole, and it is why you should pass a `.ts` path directly.** The kit
> recognises a Bun launcher from the target's own path and shebang. Point it at a **wrapper
> script** that `exec`s bun instead and the wrapper's shebang is a shell, so the detection misses
> and A6 reports a `FAIL` your tool did not earn — measured: the same CLI reports `UNVR` passed
> directly and `FAIL` behind a wrapper. A6 is `diagnostic` and never affects the exit code.

Now the sentence from Step 1 should land. Our conforming fixture violated nothing — and still
not one rule came back a plain `PASS`. Every rule it established is a `PASS+`; one core rule
(`B5`) is `UNVR` for want of a declared machine mode, `A6` is `UNVR` too as a diagnostic, and
two more (`A4`, `B3`) are `N/A` at this level. It passed the gate; it did not establish the
whole catalogue.

## Step 4 — look up a rule you failed

The report cites rule ids because they are addressable. Ask for one:

```
bun run acc show A1
```

```
Unknown flags must exit non-zero
rules/parsing/unknown-flag-exits-nonzero.md

A CLI that accepts an unrecognised flag and continues cannot tell its caller that anything
went wrong.

type: rule   rule: A1   tier: core   probe: L0
```

Add `--body` for the full page, including how to comply:

```
bun run acc show A1 --body
```

This is the loop that matters: a failure names a rule, and the rule is one command away. It
works for concepts too — `bun run acc show conformance` — and `--json` on any of them gives the
same thing to an agent instead of to you.

## Step 5 — point it at a real tool

Fixtures are built to make points. Try something that was not:

```
bun run acc check "$(which git)"
```

```
NOT CONFORMANT (L0) — 2 core violated, 2 core unverified, 13 core partially covered
```

Two real violations, on git 2.55.0 — not a toy result, and not a criticism of git either. Pick
anything else on your `PATH` and run it. Most tools fail something.

> **Before you point this at your own work:** `acc check` **executes** the target. `L0` is
> risk-reduced — only help paths, bare invocations, and arguments carrying a nonsense sentinel
> token — but it is not a sandbox. Run `bun run acc check --help` and read the safety note
> before aiming it at anything whose bare invocation might do real work.

## What we learned

- `acc check <target>` returns `0` for conformant and `9` for not — a real answer, not an error.
- **FAIL** is the only verdict that blocks the gate. **UNVR** is missing evidence, **N/A** is out
  of scope, and **PASS+** is a pass narrower than its rule.
- Conformant means no core rule was violated. It does not mean every core rule was established.
- Any rule id in a report can be read with `acc show <id>`.

## Where to go next

- [Conformance](../concepts/conformance.md) — the two claims the verdict makes, and the one it
  deliberately does not.
- [Unknown flags must exit non-zero](../rules/parsing/unknown-flag-exits-nonzero.md) — the
  catalogue's canonical violation, and a good first rule page to read in full.
- [The wiki index](../index.md) — every rule, concept and decision in the catalogue.
