---
type: guide
title: How to establish your target is safe to check
description:
  The decision method for pointing `acc check` at a binary — three questions, each answerable
  from the target's own documentation, and what to do when one of them cannot be answered.
tags: [guide, safety, conformance, acc-check]
related: [tutorial/check-your-first-cli, rule/unknown-command-exits-nonzero, rule/double-dash-terminator]
status: stable
generated: { by: claude-fable-5, at: 2026-08-27 }
---

# How to establish your target is safe to check

## Goal

`acc check` executes the target. Its probes are risk-reduced, not inert — and "risk-reduced" is
a claim about the arguments the kit sends, never about what your binary does when it receives
them. Only you can establish that, and this page is the method: three questions, in the order
that eliminates targets fastest. Each is answerable from the target's own documentation —
reading a README, a man page, or a usage line executes nothing.

Reading the target's source also answers all three questions, but only for a tool you wrote.
For a tool you did not write — the target
[the recording workflow](./how-to-record-surfaces-below-the-root.md) exists for — answer them
from its documentation.

The facts to hold while answering: every probe's argv belongs to one of four shapes, enforced
by a gate that fails closed (`src/acc/kit/inert.ts` — a probe outside these shapes is refused,
not run):

- **bare** — no arguments at all.
- **help-path** — only help/version tokens (`--help`, `-h`, `help`, `--version`, `-V`, `-v`),
  optionally with a format selector (`--json`, `--format=json`, `--format=text`).
- **no-verb** — only tokens that start with a dash.
- **sentinel** — the token `acc-probe-xyzzy` (alone, as a flag, or after `--`), chosen because
  no real CLI declares a verb or flag containing it.

Each probe runs with stdin closed, under a deadline, in a fresh temporary working directory —
which redirects **relative** paths only — and inherits your full environment, credentials
included. Nothing denies the network, absolute paths, `HOME`, or subprocesses. The full list of
what is _not_ prevented is in `bunx acc check --help`; the questions below are the method for
the decision that list informs.

## Steps

### 1. Ask what the first positional means

The decisive question, so it goes first.

If your target dispatches on a **fixed verb table** — the first positional selects a subcommand,
and anything else is rejected — then the sentinel names nothing the target declares, and the
probes stay off every declared code path. Continue to question 2.

If the first positional is **free-form data** — a prompt (`claude`, `llm`, `aider`), a pattern
(`rg`), a program (`jq`), a filename the target writes (`ffmpeg`, `sqlite3`) — then the sentinel
is not nonsense to your target: it is input. The probe spends money, runs a search, or creates a
file; the `-- acc-probe-xyzzy` probe is the worst case, because after the terminator the token
is _guaranteed_ to land as a positional. **Do not run `acc check` against this shape.** This is
a documented limit of the kit, not a property you can configure away — the rule pages for
[A2](../rules/parsing/unknown-command-exits-nonzero.md) and
[A6](../rules/parsing/double-dash-terminator.md) carry it, and the kit cannot detect the shape
from outside.

How to answer it: the target's usage line. `tool <command> [args]` is a verb table;
`tool <pattern>`, `tool [prompt]`, `tool <input> <output>` is free-form data. Every tool's
README or man page opens with this, and it is the one fact about a CLI that documentation
reliably states.

### 2. Ask what it does with no arguments at all

The bare probe is sent regardless — it is the only way to observe bare-invocation behaviour
([D2](../rules/discoverability/bare-invocation-is-a-usage-error.md)), and it is also the one
probe that carries no token to be rejected. A target that prints
usage or help and exits has nothing at stake. A target that does real work bare — starts a
server, enters an interactive wizard, begins a default action — will do that work, in a
temporary directory, with stdin closed and a deadline — decide whether that is acceptable
before you run the check.

How to answer it: the same synopsis. Documentation states what running a tool plain does more
reliably than almost anything else about it, because it is the first thing a human user tries.
For a tool you wrote, you already know.

### 3. Ask what runs before parsing

Some CLIs connect, migrate, log telemetry, or write config through `HOME`, XDG paths, or
absolute paths during global initialisation — before any argument is looked at. For those, even
a help-path probe does the work, because `--help` is a request the target answers only after
starting up. This is the question documentation answers least reliably.

When you cannot answer it, narrow what a run can touch instead of guessing: give the whole check
a scratch `HOME` —

```
HOME="$(mktemp -d)" XDG_CONFIG_HOME="$HOME/.config" bunx acc check ./your-tool
```

The probes inherit the environment they are run under, so the target's config reads and
dot-file writes land in a directory you will delete. This does **not** cover everything, and
what it leaves uncovered is what you still have to judge: absolute paths, subprocesses,
credentials elsewhere in the environment, and the network are all still reachable. If what the
scratch `HOME` does not contain is exactly the behaviour you cannot afford — the target is
known to talk to a live service on startup — then the answer is **no**: do not run the check,
and record that as a limit of your report rather than running it anyway.

## Verification

When all three answers are acceptable, you have established: the probes name nothing your
target declares, its bare invocation is work you accepted, and nothing runs before parsing that
you have not contained. That is the whole claim — facts you established, not a safety property
the kit granted. A target you cannot answer these questions for is a target this kit does not
yet support checking safely, and saying so in your report is worth more than results from a run
you could not justify.
