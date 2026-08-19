---
type: guide
title: How to add a checker
generated: { by: claude-opus-5, at: 2026-08-19 }
status: stable
description:
  Take a rule from a page with no enforcement to one the gate holds — declaring probes, writing
  the check, wiring the registry, and declaring honestly what a pass now means.
tags: [conformance, contributing, probe-level, l0]
related: [concept/probing, concept/conformance, rule/inert-invocations-do-not-crash]
---

# How to add a checker

## Goal

A rule page whose `checker_status` is `implemented`, whose checker runs in `acc check`, and whose
`coverage_established` and `coverage_gaps` describe what the code actually does.

This assumes you have read [probing](../concepts/probing.md) — the probe levels, the inertness
classes and the signal taxonomy are that page's subject and are not repeated here.

## Steps

### 1. Write the rule page first, and let it be the specification

The page is not documentation of the checker; the checker is an implementation of the page. Write
the normative text, decide the tier and probe level, and only then write code against it. A
checker whose scope quietly differs from its page is the defect that produced the G1 signal split
— the page excluded externally-ambiguous signals while the checker failed on any signal the kit
did not send, so G1 could set `conformant: false` for an event its own rule text put out of scope.

Mint the `rule_id` at this point and never renumber it. Ids appear in conformance reports that
outlive any release; renumbering one silently invalidates every stored report. Same discipline as
the exit codes the spec itself mandates.

### 2. Declare probes, or declare none

A checker declares the invocations it needs and the runner deduplicates them across the whole
registry, so asking for `--help` costs nothing if another rule already did.

Every probe must claim an inertness class the runner can verify, and `assertInert` refuses one
that does not match — a probe carrying an environment variable outside the allowed pattern is
refused whatever its argv looks like, because an env var can change what the target _does_.

**Send a request in every spelling a parser might refuse on syntax alone.** A7 sends both
`--flag=<sentinel>` and `--flag <sentinel>`, because a parser with no support for the attached
form rejects the single token as an unknown option — non-zero, stdout empty, token named — without
the value validation the rule is about ever running. The archaeology records `--flag=value` going
unparsed across five tools, so that is the modal shape of the population, not an exotic one. A
probe whose only spelling can be refused on syntax measures the syntax.

**Probe the surface the rule names, not the one that is easier to read.** D3 is about the help a
person sees, so it must not scan machine output — doing so would hand a free pass to every
auto-switching tool. `acc` was one: its human root help listed only `--version` and `--help` while
this checker reported a pass.

If your rule reads facts every recording already carries, declare no probes at all. G1 does:
spawning the target again to learn something fourteen observations already hold is duplicate
evidence, not additional evidence.

### 3. Write the check as a pure function

`check(history)` reads observations and returns a finding. It must not spawn anything — that
separation is what lets a new rule be a new reading of evidence already collected.

Five failure modes worth naming, all of them learned the hard way:

- **Do not shell out to `timeout`.** It is GNU coreutils and absent on stock macOS; invoking it
  yields `127` and the probe silently measures nothing. Enforce deadlines in-process.
- **A process the kit killed is not a process that failed.** `128+n` from the kit's own kill is
  not the target's exit code, and recording it as one fabricates evidence. Use the helpers in
  [`finding.ts`](../../../src/acc/kit/finding.ts) — `crashedUnverified` and `truncatedUnverified`
  — rather than reading `exitCode` directly.
- **Kill the process group, not the process.** A descendant holding the inherited stdout pipe
  keeps the probe open after its parent dies: a target that backgrounded `sleep 30` on stdout
  took 30 seconds against a 50 ms deadline. This is the runner's job, not yours, but a checker
  that adds its own timing must not undo it.

- **A consumer that keeps draining cannot see a truncation defect.** What discriminates is
  whether bytes are undrained _at the instant of exit_, so probe design has to force that state
  rather than hope for it: 10 MB was measured arriving complete through `| cat` with the defect
  present, while one large write outran a scheduled consumer and lost two thirds through the same
  pipe. A probe resting on either observation is measuring its own timing.
- **Compare digests, not decoded text, when a rule asserts byte identity.** UTF-8 decoding is
  many-to-one on ill-formed input: every invalid byte becomes the same `U+FFFD`, so a target
  emitting `0x80` on one run and `0x81` on the next yields identical strings, identical lengths,
  and a `pass` certifying byte identity for two different streams.

When a rule measures rather than compares, say which statistic decides it and why. F2 reports
best-of-three rather than a mean, because the interesting number is the floor — a slow run usually
measures the machine, not the tool — and it excludes any run the deadline or the output ceiling
killed, since averaging over the ones that stayed under the limit would measure the limit.

**Capture the two streams separately, never through one pipe.** A rule about stream separation
measured through a merged stream cannot work: an early attempt produced identical byte counts for
both streams and nearly went unnoticed.

**Lean the way the cheap error lies.** F1 matches known credential shapes and flags
`--token sk-example-xxxx` in an example, which is the correct bias — a false positive costs one
look, a false negative publishes a key. Any detector whose false negative is catastrophic and
whose false positive is cheap should lean the same way, and say so where a reader meets the
verdict.

**Two clauses reading one observation must read it differently, or the second establishes
nothing.** A3 asserts both that a rejection names the offending token in prose and that a
machine-mode envelope carries it in a field: searching the raw bytes would answer the first
question twice, so the second walks the parsed structure instead.

**Report `unverified`, not `pass`, when the precondition never held.** A target that published no
fields at all has not satisfied the envelope clause — saying `pass` would license "the token
reaches a field" off a run in which no field existed.

Decide explicitly whether your rule **owns** a hang or defers it. Most defer to
[E1](../rules/interactivity/never-block-without-a-tty.md); four own it, because on their probe
blocking forever _is_ the violation.

### 4. Know what actually launches the target

A checker measures the program the launcher hands it, which is not always the program the target
is. `bun <script> -- --x` gives the script `["--x"]`: bun consumes exactly one bare `--` after the
script path, so a probe of that shape never reaches the target and
[A6](../rules/parsing/double-dash-terminator.md) would otherwise measure
[A1](../rules/parsing/unknown-flag-exits-nonzero.md) wearing A6's name. No launcher form avoids
it — `bun run`, `bun --bun` and `bun -- <script>` all strip the same token — so A6 reports
`unverified` rather than guessing at an argv the target never saw.

The guard keys on the launcher, which left a hole worth knowing about: a Bun CLI installed with
**no `.ts` extension** named `bun` nowhere in the invocation, so the swallow happened anyway and
the target collected a `FAIL` — a wrong verdict on a conforming tool, which is worse than a wrong
`unverified`. `acc check` now reads the target's first line and treats a shebang naming `bun` as
inside the guard.

Reading a `#!` line is not the kind of guess the inertness gate refuses. That gate refuses to
guess whether a root positional is free-form data — a property with no observable signal, where a
wrong answer licenses an unsafe spawn. A shebang is the kernel's own contract about what runs the
file, and a wrong answer costs one diagnostic verdict.

The reverse inference had to go: `acc check` used to launch every `.ts` path through bun, handing
a Deno or Node-TypeScript CLI to a runtime it never declared. An **executable** target is now
executed as itself so the kernel honours its own shebang; bun is the fallback only for a
non-executable `.ts` source declaring no interpreter.

### 5. Register it

Add the import and the entry to [`registry.ts`](../../../src/acc/kit/registry.ts), in rule-id
order. Until it is there, `acc check` does not run it and `checker_status: implemented` is a
promise the kit does not keep — which the lint will tell you.

### 6. Declare what a pass means, and what it does not

`coverage: complete` claims the whole page held. `partial` claims only that nothing the checker
looked at was violated. Every rule in the catalogue is `partial` today.

Both lists are declared twice — in the checker and in the page's `## Current checker coverage`
section — and the lint compares them verbatim in both directions. That is three copies of one
list, and the price buys the copy a reader sees being the checked one: five pages once described
a broader measurement than their checker performed while carrying correct frontmatter two lines
above.

Write gaps as one phrase per unestablished clause, containing **no comma and no space-hyphen-space**
— the frontmatter parser splits on both, and the registry test rejects them at the source rather
than letting the lint fail with a mismatch that explains nothing.

Distinguish a gap from a clause another rule owns. D1 does not read stderr and does not time
startup; neither is a D1 gap, because B1 and F2 own them. A gap is something THIS rule asserts and
this checker does not reach — listing another rule's subject there inflates the debt and hides the
real holes.

Prefer an honest gap to a silent one. A gap costs a reader one line; an overstated `Established`
list costs them a wrong conclusion — and a report that quietly implies it checked something it
could not check is the same defect as a CLI reporting success for work it did not do, which is
the subject of the catalogue you are extending.

### 7. Add a fixture that fails it

Guard the recorder's own bookkeeping with a fixture that echoes its argv, if your rule repeats
an invocation. A `repeat` index that leaked into argv or the environment would silently restore
the defect it was built to remove, and nothing else would notice.

A checker with no negative control is untested — and the reference implementation is often the
best source of one. `acc --version --json` emitted the bare string `0.0.0` at exit `0` for months,
under every machine-mode spelling, because the argument parser's built-in version handling
answered before the envelope existed. A caller asking for structured output got something it had
to regex. That defect is now D1's fixture. Put a deliberately-broken target in
`src/acc/kit/fixtures/broken/` and assert the rule fails against it.

The kit's own `.ts` fixtures inherit the launcher problem above, which is why A6's tests use
POSIX shell fixtures. Write the fixture in POSIX shell rather than TypeScript when the defect is a
signal death, too: Bun
installs its own `SIGSEGV` handler and converts the signal into an ordinary exit with a crash
report on stderr, which is a chosen status and a non-empty stream — a different observation
entirely, and one that would not exercise the rule at all.

## Verification

```
bun run check
```

That runs the typecheck, the linter, both docs lints and the suite. Specifically it establishes:

- the rule page and the checker agree on `tier`, `probe_level`, `coverage`, `coverage_gaps` and
  `coverage_established`, in both directions;
- every `rule_id` has a checker file and every checker has a rule page;
- the page carries its required sections, in the order SCHEMA declares.

Then run the kit against its own fixtures and confirm the new rule fails the broken one and
passes the conforming one:

```
bun run acc check src/acc/kit/fixtures/conforming.ts
bun run acc check src/acc/kit/fixtures/broken/<your-fixture>.ts
```

`0` and `9` respectively. If the broken fixture still exits `0`, the checker is not reading what
you think it is.
