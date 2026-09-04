---
type: guide
title: How to derive your surface from one registry
description:
  One table per tool drives the parser, the dispatcher, help, the rejection's valid set, and the
  emitted declaration. Build it and flag-scope drift stops being possible rather than being
  caught — which is the same work the census recommends after it finds some.
tags: [guide, adoption, declarations, parsing, drift]
related: [guide/how-to-reach-l0-in-your-project, guide/how-to-record-surfaces-below-the-root, concept/conformance]
status: stable
generated: { by: claude-fable-5-1, at: 2026-09-03 }
---

# How to derive your surface from one registry

## Goal

**One table per tool, read by everything that describes your surface** — so that a flag your parser
accepts, a flag your help lists, and a flag your declaration publishes are the same fact rather
than three facts that agree today.

**For a CLI you own, before or during a restructure.** If you have already run a census and it
found disagreements, this is the fix it is pointing at. If you have not, this is how not to need
one. It assumes you can restructure your own dispatcher; if you cannot, the census still works and
[recording surfaces below the root](./how-to-record-surfaces-below-the-root.md) is where to go
instead — but read the inspection two sections down first, because it needs no restructure and
costs an afternoon.

**The claim, and it is measured rather than argued:** a tool whose parser, help text, rejection
messages and declaration all read from **one structure** cannot drift between them. Not "drifts
less" — the drift becomes unrepresentable, because there is no second place for a second answer to
live.

## Why, in two numbers from two real tools

**`magpie` had no binding.** Its help described flags per verb; its parser held one global set. Both
artifacts were individually accurate and nothing connected them, so **every verb accepted every
other verb's flags — 289 flag/path pairs, at exit `0`, silently.** `magpie close --alpha auto`
parsed clean. So did `magpie help --model x`.

The adopter's own summary after fixing it: _"It is not drift between two accurate artifacts. The
parser is wrong, and help is right."_ **Fixing 289 pairs cost two sentences of documentation** —
not one per-verb flag list in help had been wrong.

**`grapevine` had the binding from the start.** Its census: **33 of 33 paths compared, 0
disagreements**, with an `emitted` declaration. It is the only target measured so far where the
declaration and the enumeration agree everywhere, and it is the only one where they were never
separate things.

## Before you build the table: read the one you already have

**This is the cheapest thing on this page and the only part that needs no restructure.** Everything
below assumes you are going to build one table. Before that, there is a three-step inspection you
can run today, on the dispatcher you already have, and it is how the most valuable finding of any
adoption trial so far was produced — by an adopter, with no tooling involved at all.

1. **Enumerate the verbs your dispatcher actually reaches.** Not from help — from the `switch`, the
   if-chain, the handler map, whatever decides. That is the truth; everything else is a claim about
   it.
2. **Read your own usage line**, or whatever your `--help` advertises.
3. **Diff the two, in both directions.**

The adopter who did this found **three verbs their usage line did not advertise**. They were
reachable, undocumented, and nothing had ever reported them — because a tool's help is written once
and its dispatcher grows.

**Why this is not what everyone already does:** one adopter in three trials did it unprompted. The
act it resembles — building the table below — is a construction; this is an inspection, and the two
get confused because they touch the same structure. You can perform this one in an afternoon,
without changing a line of code, and it tells you whether you have a drift problem worth the
restructure.

> **Do not commit the list you produce.** The adopter who found the three verbs derives their path
> list from the registry on every run and has never committed one — and when asked, put the reason
> better than we had: **"a committed path list is a third parallel document, and the cure for
> parallel documents is not another one."** A frozen list stops noticing that dispatch moved, which
> is the failure the list was written to detect.

What this inspection does **not** do is make the finding checkable. It tells you what drifted; it
does not leave an artifact that notices the next drift. That is what the rest of this page is for.

## The five consumers of one table

The structure is a list of commands, each naming its own flags. What reads it:

| consumer            | what it takes                                          |
| ------------------- | ------------------------------------------------------ |
| **the dispatcher**  | which command a token selects                          |
| **the parser**      | which flags are legal _for that command_               |
| **help**            | the per-verb flag lists it prints                      |
| **the rejection**   | the valid set it names when it refuses an unknown flag |
| **the declaration** | a serialisation of the whole thing                     |

**The fifth is the one people do not expect, and it is why this guide exists.** Once the table
exists, emitting a declaration is not a feature — it is a walk over a structure you already have.
`grapevine`'s `schema` verb is fifteen lines and its own comment says so:

> generated by **WALKING `COMMANDS` and `CLI_OPTIONS`, the same structures the parser and
> dispatcher consume**, at answer time … The shape is acc declaration format v0 exactly, so the
> output pipes straight into `acc check <cli> --declaration <(grapevine schema)` with no adapter.

**So the argument for building the table is not conformance.** It is that the expensive artifact —
a declaration — stops being an artifact at all.

## Steps

### 1. Write the table

One entry per command: its name, the flags **it** accepts, its positionals, and its handler. Flag
definitions (type, description, value set) live in a second table keyed by flag name, so a flag
described once can be listed by several commands.

`grapevine`'s shape, which is the one this guide is derived from:

```ts
const COMMANDS: CommandSpec[] = [
  { name: "open", flags: ["topic", "fresh"], positionals: [{ name: "name", required: true }], run: … },
  …
];
```

### 2. Make the parser read it, not a global list

This is the step that closes the 289. **The verb has to be resolved before its flags can be**,
because which flags are legal is a question about the verb — so dispatch order becomes: root
tokens, then the bare invocation, then the unknown-verb rejection, then flags.

If your parser currently validates flags before dispatch, that ordering is the change.

### 3. Derive the accepted set, and use it in the rejection

```ts
function acceptedFlags(spec: CommandSpec): FlagName[] {
  const own = new Set([...GLOBAL_FLAGS, ...spec.flags]);
  return Object.keys(CLI_OPTIONS).filter((k) => own.has(k));
}
```

**Name that set when you refuse a flag.** It costs one line and it is what makes your tool
checkable from outside without anyone running your subcommands —
see [recording surfaces below the root](./how-to-record-surfaces-below-the-root.md).

**Flags that are contractually global** — an identity flag, a format flag — go in one list and are
unioned in, rather than repeated in every entry. Repeating them is a second place for them to
disagree.

### 4. Emit the declaration by walking the table

A function over `COMMANDS` producing `{ formatVersion, provenance: "emitted", commands: [...] }`.
**`provenance` is `emitted` and that is not a formality** — it is the strongest claim the format
has, and it is true here because nothing was transcribed.

## A worked example, from a tool that does this

The steps above argue for the pattern. This section shows one, working. Every excerpt is quoted
from a real emitter and the emitter was run to produce the numbers here — a declaration of 33
command rows, accepted by this kit's own reader. **It is a FLAT command table**, one token per
path, and the section closes with what that leaves unanswered for a tool whose commands nest.

### 1. It is a refactor of dispatch, not a new artifact

This is the step adopters skip. The registry replaced a bare `switch`, and its own header says why:

> the parser, the dispatcher, the schema emitter and the root rejection all walk THIS. It replaced
> a bare `switch`, which only the dispatcher could walk: **a schema emitted from anything other
> than the structure that routes the behaviour is a document that lies as soon as anyone edits the
> other side.**

### 2. The table, and what makes a flag unnameable

```ts
type FlagName = keyof typeof CLI_OPTIONS;

type CommandSpec = {
  name: string;
  aliases?: string[];
  flags: FlagName[];
  positionals: PositionalSpec[];
  run: (positional: string[], flags: Flags) => Promise<void> | void;
};
```

`flags: FlagName[]` is the load-bearing decision: `FlagName` is `keyof typeof CLI_OPTIONS`, and
`CLI_OPTIONS` is the `parseArgs` options object itself — so **a verb cannot name a flag the parser
does not define.** The emitted `type` is literally the type the parser uses.

### 3. One function, two consumers — the whole argument in three lines

```ts
function acceptedFlags(spec: CommandSpec): FlagName[] {
  const own = new Set<FlagName>([...GLOBAL_FLAGS, ...spec.flags]);
  return (Object.keys(CLI_OPTIONS) as FlagName[]).filter((k) => own.has(k));
}
```

The parser builds its options from it — `const accepted = acceptedFlags(spec)`, then
`Object.fromEntries(accepted.map((k) => [k, CLI_OPTIONS[k]]))` — and the emitter maps over it:
`args: acceptedFlags(spec).map((k) => arg(k))`. **The declared set and the accepted set are the
same array from the same call.** Everything else here reduces to this.

### 4. The emitter fits on one screen

```ts
function buildDeclaration() {
  // Every registry flag is accepted today; a refusal list would add
  // status: "refused" entries here the day a verb recognises-and-declines one.
  const arg = (k: FlagName) => ({ name: `--${k}`, type: CLI_OPTIONS[k].type, status: "valid" });
  const commands = [
    { path: [], args: ROOT_INTERCEPTORS.map(…), positionals: [{ name: "command", required: true }] },
  ];
  for (const spec of COMMANDS)
    for (const name of [spec.name, ...(spec.aliases ?? [])])
      commands.push({ path: [name], args: acceptedFlags(spec).map(arg), positionals: spec.positionals });
  return { formatVersion: "0", provenance: "emitted", selfDescription: { args: ["schema"] }, commands };
}
```

Note the comment is left in. **A worked example that shows an honest, commented gap teaches better
than one pretending there is none** — and that gap is named in full below.

`provenance: "emitted"` is honest here because the running binary produces the document at answer
time. `positionals` passes through by reference: the registry's shape and the declaration's are
structurally identical, so no mapping happens at all.

### 5. The root, declared and enumerated from one array

```ts
const ROOT_INTERCEPTORS = [
  { name: "--help", runs: "help" }, { name: "-h", runs: "help" },
  { name: "--version", runs: "version" }, { name: "-V", runs: "version" },
] as const;
```

The `path: []` row's `args` map from it, and the root's unknown-flag rejection enumerates the same
array. One list, declared and enforced. That is what makes the root diffable at all — and the root
is where every prior generator failed.

**Every spelling in that array has to appear in the rejection, the short ones included.** The
declaration has no alias field ([below](#aliases-cost-evidence-not-just-rows)), so `-h` is a row
of its own, and the only evidence that can confirm any declared row is the rejection naming it.
The census takes the accepted set from the enumeration alone, never from a probe the tool
honoured; the `-h` the kit sends as a help probe confirms nothing here. Against this array, a
root rejection that lists `--help` and `--version` alone makes the census report
`declared-not-accepted -h at (root)` and the same for `-V` — two disagreements for flags the
parser accepts. Name both spellings, or declare neither short one.

### 6. The runtime enforces the declared shape

```ts
// Arity, enforced FROM THE DECLARED SHAPE — the registry's positional spec is
// what `schema` publishes, so enforcing it here is what keeps the declaration
// true by construction
```

The declaration is not merely generated from dispatch; dispatch enforces what the declaration
publishes, so the two cannot diverge even under a bug.

### 7. The round trip

```bash
acc check ./your-cli --declaration <(your-cli schema)
```

Measured on the emitter above: `formatVersion 0`, `provenance emitted`, **33 command rows**, parsed
by this kit's own reader.

### What this example does NOT derive — read this before copying it

An emitter built this way still has hand-maintained surface, and being specific is the point:

- **The help text.** ~40 lines of hand-written template. A contract test asserts every declared
  `path[0]` appears in `--help` under a word-boundary match — which catches a verb added to the
  registry and not to help, the realistic drift. It does **not** check the other direction, does
  not check flags, positionals or arity at all, and for a common English word like `help` or `list`
  the assertion is close to unfalsifiable because the word appears in prose. A presence check, not
  a correctness check.
- **`status: "valid"`, hardcoded.** The day a verb recognises-and-declines a flag, the emitter
  reproduces the exact defect the `status` field exists to prevent.
- **`selfDescription: { args: ["schema"] }`** is a literal, not `COMMANDS.find(…).name`. Renaming
  the verb leaves it stale — recoverable, because the census fires
  `self-description-not-declared`, but not prevented.
- **`formatVersion: "0"`** is a literal duplicating this kit's constant. Nothing links them at
  compile time.
- **Numeric flags declare `type: "string"`**, because `parseArgs` has no number kind, while the
  parser enforces a numeric range. The declaration understates the constraint.

### Aliases cost evidence, not just rows

One row per name **and** per alias, matching dispatch exactly. But the declaration has no field
saying `up` is an alias of `start` — v0 refuses unknown keys — so a differ cannot tell them apart,
and **a surface recorded at `["start"]` does nothing for `["up"]`.** The denominator counts alias
rows as first-class paths: 33, not 31. Duplicating the row makes the declaration true at the cost
of doubling the evidence a complete census needs.

### What a flat table leaves unanswered

`DeclaredCommand.path` is `string[]`, so the format is ready for nesting; this emitter has never
exercised it. If your commands nest, these are open and this example does not answer them:

- **What walks the tree.** A flat `for (const spec of COMMANDS)` becomes a recursive walk carrying
  an accumulated prefix.
- **Do intermediate nodes get rows?** If `remote` alone is a usage error, declaring it as a command
  is a lie; omitting it means a caller cannot tell a group from a typo.
- **Flag inheritance.** The one-level answer here — merge globals into every leaf, so each leaf
  declares its complete set — generalises, but nesting adds mid-level flags and a choice between
  flattening into every leaf (verbose, honest) and declaring once on the parent (compact, and
  unreadable to a differ keying on exact path).
- **Aliases multiply across levels**, so row counts explode and the denominator stops being
  interpretable.
- **The contract test does not survive the move**: it reads `path[0]` only, so under nesting one
  match covers a whole subtree and a subtree could vanish from help while passing.

## The trap that eats generators: the root is not a command

**A walk over "the commands" walks straight past the flags your root answers itself.** `--help`,
`--version`, `-h`, `-V` are not commands and they are not any command's flags — so a declaration
generated naively declares no root at all, and every root flag your tool accepts becomes
undeclared surface.

This was measured on a real manifest: a tool's auto-generated declaration listed 25 command paths
and **no root**, while its root accepted `--format`. `grapevine` handles it by declaring the
interceptors explicitly, and says why in its own source:

> Root interceptors — flags the ROOT answers itself, before any verb. **These are not commands,
> which is exactly why a generator walking "the commands" walks past them**; they are declared
> explicitly at `path: []`.

**Declare `path: []` and put them there.** A declaration with no root is a declaration whose
denominator excludes the one path a checker can always reach.

## The trap on the other side: a `switch` cannot be enumerated

If your dispatcher is a `switch`, there is nothing to walk, and the tempting fix is an array of
verb names **beside** the switch with a comment saying to keep them in step.

**Do not.** That is a second structure that must agree with the first, which is the defect this
whole guide removes, one level up. The adopter who tried it filed it against themselves before
building anything else:

> "keep it in step" is a comment, not a binding, and comments are what the 289 are made of.

**Drive the switch from the table instead.** If that is a large change, it is the change — and it
is the same one that makes step 4 free.

## Verification

1. **Every verb's rejection names a different set**, unless two verbs genuinely accept the same
   flags. One global list printed everywhere is the shape you started with.
2. **A flag from verb A, sent to verb B, is refused** — with B's set named.
3. **`<your-cli> schema | acc check <your-cli> --declaration -`** compares your emitted declaration
   against your running parser. **Zero disagreements is the expected result**, because both sides
   now come from one place — and if it is not zero, the census has found a path where something
   still reads from somewhere else.

**That third check is a ratchet.** It is cheap, it runs in CI, and once it passes it stays passing
unless someone adds a second source of truth — which is exactly the event worth failing a build
over.
