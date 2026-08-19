---
type: rule
title: An advertised value set is enforced
description:
  A flag that publishes a closed set of values and then accepts anything has told its caller a
  lie the caller cannot detect — the answer arrives in the default shape, at exit 0.
tags: [parsing, silent-failure, machine-mode, core]
related: [rule/unknown-flag-exits-nonzero, rule/errors-name-the-offending-token, concept/error-envelope]
status: stable
generated: { by: claude-opus-5, at: 2026-08-16 }
rule_id: A7
tier: core
probe_level: L0
checker: src/acc/kit/checkers/parsing/advertised-value-set.ts
checker_status: implemented
coverage: partial
coverage_gaps:
  - a rejection naming the value is not shown to come from the set validation rather than from an unparsable spelling or the value being read as a positional
  - only the first flag whose set help advertises is probed so a target declaring several sets is checked on one of them
  - the value is sent at the root so a set advertised only for a subcommand flag is probed where that flag may be unknown
  - the SHOULD to enumerate the valid set alongside the rejection is not exercised
  - the exit code is only required to be non-zero here and not the declared 2
  - that the flag's default did not silently apply is inferred from a non-zero exit rather than observed
coverage_established:
  - for a target whose root help advertises a closed set for a flag neither the attached nor the detached spelling of one value outside that set exits 0 or writes to stdout
  - at least one of those two spellings drew a rejection naming the offending value
---

# An advertised value set is enforced

## The rule

Where a CLI's own help advertises a **closed set** of values for a flag — `--format <text|json>`,
`--tier (core|diagnostic)`, `--level one of: debug, info, warn` — a value outside that set
**MUST** be rejected: exit non-zero (`2`, per the
[exit-code taxonomy](../../concepts/exit-codes.md#the-taxonomy)), write a diagnostic to stderr,
and leave stdout empty.

The rejection **SHOULD** enumerate the valid set, as
[`choices`](../../concepts/error-envelope.md#choices-is-just-in-time-discovery) in machine mode
and in the prose otherwise.

A CLI **MUST NOT** silently fall back to the flag's default, to an ambient heuristic, or to any
other value. It **MUST NOT** discard the value and report success.

This rule binds only where the tool made the claim. A flag whose help declares an open value —
`--output <path>`, `--message <text>` — is outside it entirely: there is no set, so there is
nothing to be outside of.

## How to comply

Declare the set once, in the place the parser reads and the help renderer prints. Two sources of
truth for one set is the whole defect: help says `text|json` because a human wrote it there, and
the parser accepts anything because nobody wired the two together.

| Framework              | Compliant by default?     | How                    |
| ---------------------- | ------------------------- | ---------------------- |
| `clap` (Rust, derive)  | yes                       | `value_enum`           |
| `@stricli/core` (TS)   | yes                       | a union-typed parser   |
| `commander` ≥13 (TS)   | **no** — the set is decor | `.choices([...])`      |
| `node:util parseArgs`  | **no** — no set concept   | validate after parsing |
| `click` / `typer` (Py) | yes                       | `click.Choice`         |
| `cobra` (Go)           | **no**                    | a custom `pflag.Value` |

`commander` is the trap worth naming: `--format <text|json>` renders that alternation into help
and enforces nothing, so the declaration and the behaviour disagree by default and the help
screen is the half that lies. `acc`'s own instance of this rule was exactly that shape.

When you reject, say what would have been right. A rejection naming only what was wrong costs the
caller a round trip to `--help`; one carrying the set costs it nothing.

## Why

Every other parsing rule in this family asks whether the tool honours the **catalogue's**
contract. This one asks whether it honours **its own**, and that is the sharper question: the set
is not something the kit invented and asked the tool to respect, it is a sentence the tool
published about itself, on the surface an agent reads first.

A flag with a closed set is one an agent is _told_ to choose from. It reads `--format
<text|json>` in help, picks `json`, and mistypes it. Three things follow and none of them is
visible:

1. **The request silently becomes its opposite.** `--format josn` leaves the format at its
   default, which for a piped caller is frequently the human rendering it was trying to avoid.
2. **The exit code is `0`.** The caller has no signal, so there is nothing to correct.
3. **The output still looks like an answer.** Unlike a crash or an empty stream, a default
   rendering is a plausible result — the failure is invisible until something downstream tries
   to parse it.

The archaeology records this as an open defect in a shipped tool (`--format josn` → exit 0, silent
fallback to the ambient TTY heuristic) and as a second, differently-shaped one (`add --size
<bogus>` → `ok:true`, the size discarded). It also records it **in the reference implementation
of this catalogue**: `acc rules --format nonsense` once returned 4 KB of data at exit 0. That was
found and fixed by hand, twice, with no rule requiring it — which is the argument for the rule
rather than a footnote to it. A declaration nothing falsifies is a comment that lies, and a
closed set is a declaration.

## The probe

Inert (`L0`). Discovery reads the sets a target advertises off its own help — the four notations
help screens actually use (`<a|b>`, `(a|b)`, `[a|b]`, `one of: a, b`), plus the structural
`{ name, values }` form for a target whose help is itself a JSON document. Where help advertises
no set, the checker reports **unverified**: a tool that declared nothing has made no claim to
falsify.

```
<cli> --format=acc-probe-xyzzy          # attached
<cli> --format acc-probe-xyzzy          # detached — the same request, the other spelling
```

**Two spellings, and the second one is load-bearing.** The attached form alone would have made
this rule vacuous on the corpus it was written for. `--format=acc-probe-xyzzy` is one token, so a
parser with no support for the attached spelling rejects it as an _unknown option_ — non-zero,
stdout empty, the whole token named — without the value validation ever running. That parser is
not exotic: the archaeology records `--flag=value` going unparsed as a shipped defect across five
tools, which makes it the **modal** shape of the population this rule is aimed at. Between the two
spellings, at least one reaches the value on any parser that reads values at all.

**Both are admissible under the existing inertness gate, unmodified.** The attached form is a
single token beginning with `-`, so it satisfies the `no-verb` class, and it carries the sentinel,
so it satisfies the `sentinel` class — admissible twice over. The detached form is admissible
under `sentinel` alone, which is exactly what that class exists for:
[`inert.ts`](../../../../src/acc/kit/inert.ts) says a probe needing a flag **with** a value uses
`sentinel`, because a sentinel token is provably invalid whatever the flag's arity.

**The safety limit the detached form inherits**, and it is the one A2's probe already carries: a
bare sentinel token is an unknown verb on a verb-dispatching CLI and a **prompt** on a CLI whose
root positional is free-form. `inert.ts` documents that it cannot detect the second shape and does
not claim to. This probe inherits that limit rather than adding to it.

Passes when **all** of:

- neither spelling exits 0
- neither spelling writes to stdout
- at least one spelling names the offending value on stderr

**The third condition is attribution, not a second requirement.** Neither probe names a verb, so
a verb-dispatching CLI answers both on its missing-verb path — a non-zero exit and an empty stdout
that have nothing to do with the value. Scored as a pass, that would be the vacuous pass this
project exists to catch: the rule's subject never ran and the report would say it held. The
sentinel reaching the diagnostic is the cheapest available evidence that the target read the token
at all, and one spelling suffices, because a parser only has to understand one of them. Where
neither names it, the verdict is **unverified**.

**What that still does not establish**, and it is the first declared gap. A rejection naming the
value proves the target **read** the token; it never proves **which check** refused it. The set
validation, an unparsable spelling and a stray positional produce the same three observables. What
the second probe buys is that a parser cannot pass by refusing the syntax of one spelling while
silently accepting the value in the other — which is a violation this rule now catches and a
one-probe version would have certified.

## Current checker coverage

[`advertised-value-set.ts`](../../../../src/acc/kit/checkers/parsing/advertised-value-set.ts) —
`L0`, `coverage: partial`. A pass means nothing under **Established** was violated; the **Gaps**
are the rest of this page, unexamined.

**Established**

- for a target whose root help advertises a closed set for a flag neither the attached nor the
  detached spelling of one value outside that set exits 0 or writes to stdout
- at least one of those two spellings drew a rejection naming the offending value

**Gaps**

- a rejection naming the value is not shown to come from the set validation rather than from an
  unparsable spelling or the value being read as a positional
- only the first flag whose set help advertises is probed so a target declaring several sets is
  checked on one of them
- the value is sent at the root so a set advertised only for a subcommand flag is probed where
  that flag may be unknown
- the SHOULD to enumerate the valid set alongside the rejection is not exercised
- the exit code is only required to be non-zero here and not the declared 2
- that the flag's default did not silently apply is inferred from a non-zero exit rather than
  observed

## Evidence

Measured directly against this repository's own CLI, which carried the defect and now does not:

```
$ acc --format=acc-probe-xyzzy
exit=2   stdout empty
stderr   {"ok":false,"error":{"kind":"usage","message":"invalid value for --format: \"acc-probe-xyzzy\"","choices":["text","json"]}}
```

The defect population behind the rule — two fixed instances, one open at HEAD, plus the one in
`acc` — is catalogued as class 11 in
[`research/2026-08-15-defect-archaeology.md`](../../../research/2026-08-15-defect-archaeology.md),
which also ranks it as the lowest-cost of the missing rules to build and the only one reachable
without leaving `L0`.
