---
type: research
generated: { by: claude-opus-5, at: 2026-08-24 }
status: stable
description:
  The two independent design sketches that Part 2 of STANDARD.md was built from — reproduced
  whole, with their convergences, their unresolved disagreements and what has since overtaken
  them marked rather than corrected.
tags: [declaration, schema, conformance, contract, evidence]
---

# Two sketches of an `L1` declaration format

[`STANDARD.md`](../../STANDARD.md)'s Part 2 — its field table, its
narrowing-versus-widening admission rule, and the falsifiability analysis under it — rests on two
design sketches that existed only in a transcript. The page says so in its own words: _"Two
independent design sketches were written for this, from opposite starting points."_ Until this
note there was nothing to follow that sentence to.

That is a sourcing failure by the standard's own third rule, which requires that _"every claim
about another tool traces to a source"_ and that a plausible-sounding claim nobody can check is
_"the exact failure this project exists to argue against."_ The page's foundations did not meet the
bar the page sets. This note fixes the citation, and nothing else: it does not revise, rank or
reconcile the sketches, and Part 2's decisions are not reopened by it.

**Research date:** 2026-08-24

**Method:** Two subagents were given briefs written by this project and told to produce a design
sketch as their final message and to **write no files**. They worked in one session, in parallel,
in the same repository at the same commit, and neither could see the other's work — each brief
said only that _"another agent is designing the same thing from a different starting point."_ The
briefs differ in exactly one deliberate way, and it is the reason there are two:

- **Sketch A was briefed bottom-up**, from the checkers: _"Begin from the code, not from what would
  be elegant to write. Work out what facts the kit needs to stop guessing, by reading the places
  where it currently guesses from a spelling."_ It was pointed at
  `src/acc/kit/checkers/parsing/`, `.../exit-codes/`, `discovery.ts`, `inert.ts`, `types.ts` and
  `config.ts`, and was required to produce a falsifiability table and worked JSON for three shapes.
- **Sketch B was briefed top-down**, from the person holding the pen: _"Do **not** start from the
  checkers... Your first question is: what can somebody actually, honestly say about a
  command-line tool?"_ It was required to produce a cost-to-answer rating per field, and worked
  JSON for four tools including _"a case where the honest answer is awkward — where the format
  nearly forces a lie, or where the person plainly does not know."_

**Both were redirected mid-flight** by the same reframing, which is reproduced in full in the appendix below. Its substance: the briefs had assumed the
declaration lives in a file beside the tool, and the project owner put that assumption itself in
question — `L1` was always described as _the tool emitting its own description_, so a person
writing `helpFlags` into `acc.config.json` is an in-between that _"may be a reasonable compromise
or it may be a category error, and they explicitly do not know which."_ Both sketches were told to
treat transport — target-emitted against config-authored against both — as a first-class axis.

**Both final messages postdate that redirect and both answer it**, at the spine rather than in an
appendix. Sketch A opens by saying so outright and makes transport its §1; Sketch B makes it §0 and
says the reframe _"changes the shape of everything below."_ Neither sketch below is a pre-redirect
draft.

**What is reproduced here is each subagent's final message, entire.** Two edits, both mechanical: a
uniform heading-level shift, so each sketch's `#` became `###` and this note has one title, plus the
wrapping `##` heading that names each sketch; and the repository's markdown formatter, which
normalises `*emphasis*` to `_emphasis_` and pads table separator rows. A normalised comparison
against the transcript confirms no other difference. No sentence, table, JSON block, claim or hedge
has been removed, reordered or rewritten, including the parts that lost the argument and the parts
that have since been shown wrong. That is the point of filing them: Part 2 adopted some of this and declined
some, and a reader can only audit that if the declined half is still here.

**Confidence notation.** Neither sketch is measurement and neither should be read as this project's
position. Each carries its own closing section separating what it was confident in from what it was
guessing at, with the evidence that would settle each guess — Sketch A's §9, Sketch B's §10. Those
sections are the confidence labelling, they are the sketches' own, and they are more useful than
anything a re-marking pass could add. Everything outside the two `##` sketch sections is editorial
and is this note's, not theirs.

**Scope bounded.** This note deliberately does not: assess which sketch was better; propose a
resolution to anything Part 2 left open; describe the shipped `v0` format beyond marking where it
overtook a sketch (`src/acc/kit/declaration.ts` is the authority, and Part 2 says so); or design
anything. Neither sketch was implemented as written, and no attempt is made here to say what a
faithful implementation would have looked like.

**Independence, qualified honestly.** The two agents could not see each other, but they were not
working from disjoint evidence. Both briefs cited the same three sources — the
[grammar survey triage](../reports/2026-08-23-triaging-the-argument-grammar-survey.md), the
[`require-a-config-never-raise-ownership`](../wiki/decisions/require-a-config-never-raise-ownership.md)
and [`not-in-the-config-not-inferred`](../wiki/decisions/not-in-the-config-not-inferred.md)
decisions — and both required engagement with [roadmap](../roadmap.md) step 6. Both redirects named
`acc`'s own `schema` command and rule `D3` as the fact to read before taking a position. So the
convergences below are two independent derivations over a **shared corpus**, which is weaker than
two derivations over independent corpora and stronger than one derivation. Where a convergence is
just both agents restating the same source they were both handed, that is worth knowing, and the
index below points at the sources so a reader can tell.

**A note to a future editor: do not merge these.** The two sketches are in one file because Part 2
records both a convergence and an unresolved disagreement between them, and a reader checking that
record needs them side by side. They are not in one file because they are one document. Blending
them destroys the only property that makes them evidence — that two derivations from opposite ends
arrived at the same place independently. If they ever need to be summarised, summarise them
somewhere else and leave these whole.

---

## What Part 2 took, and where each sketch says it

This section is an **index, not a synthesis**. Part 2 states a set of convergences and one set of
disagreements; each row points at where the sketches themselves say the thing, so the page's
account can be checked against its sources rather than trusted.

### The convergences Part 2 relies on

| Part 2's claim                                                                          | Sketch A says it in                                                    | Sketch B says it in                                                     |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Narrowing may be believed on anyone's word; widening must come from the tool            | §3, Class C: the admissibility rule it asks a reviewer to test hardest | §1, stated as the design's "central asymmetry"; applied in §3           |
| An emitted declaration wins over an outside model, and disagreement is reported         | §1, "Precedence and disagreement"                                      | §0, "Where both exist and disagree"                                     |
| The caller must always supply the pointer to the emission; the bootstrap is irreducible | §1(b)                                                                  | §0, `declaration.argv` — "the most important single line in the design" |
| Falsifying a promise and falsifying a model are different events with different reports | §1's opening paragraph; the report shapes in §5                        | §0's promise/hypothesis table; the two worked reports in §7             |
| Anything that consumed a contradicted statement cascades to `unverified`                | §5, Class B rows and the withdrawal of dependent probes                | §7, property 2, stated as a thing it would defend hardest               |
| Refuse a format version you do not understand rather than half-applying it              | §7                                                                     | §8, "the kit never proceeds while ignoring a declaration"               |
| Say nothing about `effects` yet; record it, let it gate nothing                         | §8, its "largest scope-down"                                           | §3, "The one field I refuse"                                            |
| Do not add a field for bitmask exit codes                                               | §8, first bullet                                                       | §4f, working from `pylint`                                              |

The last two rows are the clearest case of the qualification above: both sketches cite `SURV-8`
from the same [grammar survey triage](../reports/2026-08-23-triaging-the-argument-grammar-survey.md)
for the bitmask conclusion, and Sketch B says outright _"SURV-8 argues it and I am agreeing."_ That
is agreement with a shared source, not two independent findings.

### The disagreements Part 2 records

**Exit-code ownership.** Sketch A makes it declarable by anyone — `ownership: "own" | "delegating"`
plus a `reserved` band — and, unprompted, names it _"the largest unfalsifiable escape hatch in the
design... I would attack this first if I were reviewing"_ (§3, Class C). Sketch B makes it
**promise-only**, `T3` for an observer and `T1` for the author, deliberately inexpressible in an
observer's file, with its absence withholding `C2`/`C3` (§3). Sketch B then argues against itself
in §4e using `ssh(1)`'s plain-language statement of its own delegation, leans toward holding the
line, and marks it as _"the sharpest place a reviewer should push."_ Part 2 declines to settle it.
Both sketches propose the same experiment for settling it — A in §9, B in §10 — and neither has
been run.

**Where the declaration lives.** Sketch A splits hard into two files, arguing the split is what
lets one schema serve three carriers (§6). Sketch B keeps one file with a distinguished `assume`
block, for one loader and one discovery path, and then flags its own doubt in §10: mixing caller
policy with a model of the target is _"the same conflation I spent §0 arguing against."_ Part 2
follows the semantics and recommends two files.

### Three disagreements Part 2 does not record

Named because a reader auditing the page against these sources will find them and should not have
to wonder whether they were suppressed.

- **How a format version is spelled.** Sketch A: an integer major only, no minors, on the ground
  that _"a strict unknown-key parser makes a minor version meaningless"_ (§7). Sketch B: a
  `major.minor` string with additive minors and a named-keys refusal for an unknown minor (§8).
- **What happens to `defaultOutput`.** Sketch A: a hard `ConfigError` naming the new location,
  never an alias, because _"an alias would be two spellings of one axis"_ (§6). Sketch B: accepted
  with a deprecation for one major (§8).
- **Whether to mint a rule id.** Sketch B mints `H1` — _"the tool's self-description is true"_ — as
  a core rule in a new `self-description` family (§7). Sketch A explicitly declines: _"following
  this project's own discipline I do not mint an id"_ (§5).

---

## What has since been overtaken

Marked, not corrected. Every claim below still stands in the sketch that made it; this section says
where it no longer holds, and nothing in the sketches has been edited to agree with it.

**The shipped format is narrower than either sketch.** `v0` — `src/acc/kit/declaration.ts`,
consumed by `acc check --declaration` — carries `formatVersion`, `provenance`, `selfDescription`
and `commands`, each command with `path`, `args` and `positionals`, and **refuses any key it does
not define, anywhere in the document.** So the fields both sketches spend most of their length on —
help and version invocations, machine mode, the error envelope, exit-code meanings, exit-code
ownership, effects — are not merely unchecked today. They are unwritable: a document carrying them
is rejected whole and the run gets no comparison at all. Every worked JSON example in both
sketches, including Sketch A's `gh`, `ripgrep` and `timeout` files and Sketch B's six, would be
refused by the reader that shipped.

**Two files, not one.** Sketch A's split shipped; Sketch B's `assume` block inside
`acc.config.json` did not. The reasoning in `declaration.ts` includes a mechanical argument neither
sketch reached: adding a key describing the target's own shape to `TOP_LEVEL_KEYS` is the stated
trigger for building the config-refusal gate, and that gate would invalidate the frame of
[the eight-owner-CLI runs](../reports/2026-08-24-eight-owner-clis.md), which all carry
`configSource.origin: "none"`.

**Major-only versioning.** Sketch A's position shipped —
`DECLARATION_FORMAT_MAJOR = "0"`, a major alone — for Sketch A's reason. Sketch B's `major.minor`
scheme, and its rule for a minor ahead of the kit, describe a format that does not exist.

**Provenance shipped as two values, not three.** Sketch B proposed a three-point scale — derived,
emitted, observed — while insisting the kit cannot tell the first from the second from outside and
must record only where the bytes came from. `v0` carries `provenance: "emitted" | "modelled"`, one
line for the whole document, and routes the mixed case (an emitted manifest a human annotated) to
`modelled` as the weaker claim. Per-statement provenance, which Sketch B's own reasoning about the
mixed case implies is the right shape, is deferred to a format break.

**A declared value list is not necessarily binding, and both sketches assumed it was.** Sketch A's
`args[].values` and Sketch B's `value_sets` both treat a declared closed set as something a probe
can test by sending an out-of-set value and requiring rejection. `DT-4` in
[the first drift trial](../reports/2026-08-24-first-drift-trial-anthill-manifest.md) measured the
counter-case: one hint string is enforced with a refusal and another, on 21 commands, is silently
ignored, with an out-of-set value falling back to a TTY heuristic and exiting `0` — identical
declared shape, opposite behaviour. `v0` answers it with `values` binding and `valueHint` labelling.
Neither sketch has the distinction. Sketch B's §5 calls `value_sets` its weakest field and says it
would ship without it; that instinct was right for a reason it did not have.

**Refused arguments have no slot in either sketch.** `v0` requires `status: "valid" | "refused"` on
every argument, because a framework can register a flag it deliberately rejects and a manifest with
nowhere to put that publishes eight refused flags as ordinary valid ones (`DT-2`, same trial).
Neither sketch anticipated it.

**The sharpest one: a modelled declaration currently buys nothing at the census layer.** Both
sketches rest on an observer's file being genuinely useful — it is the whole premise of Sketch B's
`assume` block and of Sketch A's ripgrep worked example, and Sketch A argues in §1(d) that
config-authored declarations are where all the value actually lands. An outside implementer's
session, reported in
[the first outside application of the standard](../reports/2026-08-24-first-outside-application-grapevine.md),
found the limit neither anticipated: the kit enumerates the root only, a verb-first tool's
declaration is a document about its verbs, so the declared paths are the ones nothing probes.
Measured on this repository's own CLI, a four-command modelled declaration compares `0 of 4` paths;
anthill v2.3.0 compares `1 of 25`. In the implementer's words, quoted by Part 2: _"the standard's 'a
caller may declare for a tool' is true at the format layer and inert at the census layer."_ That
does not refute the narrowing-versus-widening rule, which is about admissibility. It does mean the
population both sketches were designing for gets no comparison out of the reader that shipped.

**Unimplemented rather than superseded.** Sketch A's §4 falsifier — diffing the per-probe temporary
directory the runner already creates and deletes — still describes the tree accurately:
`runner.ts` does `mkdtempSync(join(tmpdir(), "acc-probe-"))` and passes it as `cwd`, and nothing
looks inside it before removing it. Nobody built the diff. The idea has not been declined; it has
not been taken up.

---

## Sketch A — bottom-up, from what the checkers guess

> Reproduced entire, as the subagent's final message. Headings shifted two levels; nothing else
> changed. Its opening line names what it read.

I read the checker corpus, the two decision pages, roadmap 6/7, `probing.md`, the grammar survey, the ripgrep blind trial, the `design-choice`-is-L1 report, `spec.ts`/`schema.ts`, and the runner. Below is the sketch, with the transport reframe folded in as the spine rather than an appendix.

---

### `L1`'s declaration format — a bottom-up sketch

#### 0. What the code actually needs (derived, not designed)

I started by listing every site where the kit reaches a conclusion from a **spelling** rather than an observation, and every `coverageGap` phrased as "no declaration exists at L0." They collapse into nine facts. Sorted by what a wrong guess costs today:

| #   | Fact the kit needs                                                            | Where it guesses now                                                                                    | Cost of the guess (measured)                                                                                                                                          |
| --- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Does the first positional select from a fixed table?                          | `unknown-command.ts` sends `<sentinel>-verb` unconditionally; `inert.ts`'s `sentinel` class assumes it  | **False PASS A2** on `rg`; false FAIL A3/C2. `ffmpeg`/`sqlite3`/`ogr2ogr`/`cdo` **write a file** (SURV-4)                                                             |
| 2   | Which argv is a help request?                                                 | `HELP_TOKENS` in `inert.ts` — literal `-h`, `-v`, `-V`                                                  | **False PASS C1** (`df -h`, SURV-1); **false FAIL C1** (`psql -h`, SURV-5). Also decides `help-path` **inertness**, so it is a safety guess, not only a verdict guess |
| 3   | Which argv is a version request?                                              | same set                                                                                                | D1, and F2 times `--version`                                                                                                                                          |
| 4   | How is machine mode reached, and is the flag a boolean?                       | `MACHINE_FLAGS` + `takesRequiredValue`, applied to `--json` only                                        | **False PASS D3** on `--output <file>` (SURV-2); `B1`/`B2` then send `--format=json` to `ps`/`ffprobe`                                                                |
| 5   | Does the target own its exit codes?                                           | assumed, everywhere                                                                                     | `ssh` delegates the **entire** namespace; `timeout`/`xargs`/`env` delegate all but a reserved band (SURV-9). C1/C2/C3/A1/A2/A7/D2 all assert on codes                 |
| 6   | What does each exit code mean?                                                | `C2` hardcodes `codes[0] === 2`                                                                         | `rg`'s `1` = "no match, success" was counted as a usage error. Any tool consistent at a non-2 code is permanently `unverified`                                        |
| 7   | Which field of the error envelope carries the token / the version / the kind? | A3 walks _every_ string in the document; B5 only asks that it parse; D1 only asks that it be structured | Three `coverage_gaps` say this in almost the same words                                                                                                               |
| 8   | What is the command surface below the root?                                   | `parseHelp` regexes English headings                                                                    | The largest single group of gaps — "only the root is probed" — appears on 11 checkers                                                                                 |
| 9   | Which flags carry closed value sets?                                          | `extractValueSets` over help prose                                                                      | A7 checks one flag, at the root, from a prose alternation                                                                                                             |

Facts 1, 2 and 5 carry almost all the damage, and they are the three that are **least falsifiable**. That is the design's central tension and I keep returning to it.

---

#### 1. Transport is the spine, and it changes blame, not probes

The reframe is right and it is load-bearing. My position, in one paragraph:

> **The transport does not change which probe falsifies a field. It changes what a falsification means.** A config-authored declaration that a probe contradicts means _the observer's model is wrong_ — fix the file, nothing has been learned about the tool. A target-emitted declaration that the same probe contradicts means _the tool lies about itself_ — which is a conformance defect in its own right, and arguably the most consequential one this catalogue could ever report, because everything an agent does with a self-describing CLI rests on the self-description being true.

Four things follow, all grounded in this tree.

**(a) `acc schema` is the ceiling, not the general case.** `schema.ts`'s own comment is precise about why it cannot drift: it is _serialised from `spec.ts`, the same declaration the parser is built from_. That is a property of `acc`'s implementation, not of the transport. A CLI whose `schema` command is a hand-maintained blob drifts exactly like a hand-written help string — the Spellbook failure `spec.ts` cites. So "target-emitted ⇒ true" is false; "target-emitted ⇒ _checkable_, and a mismatch is the tool's fault" is what actually holds.

**(b) There is a bootstrap that only config can solve, and it fixes the precedence.** To run `mycli schema` the kit must already know that `schema` is the token, that running it is inert, and that it exits 0 with a document — three facts the declaration exists to supply. `classifyInertness` cannot admit `["schema"]`: it is a bare word, hence a positional on any free-form-root CLI, and `sqlite3 schema` **creates a database file called `schema`**. So the kit cannot go looking for a self-declaration without being told where it is. **The config is always the transport of the pointer.** That is the minimum, and it is irreducible.

**(c) D3 already half-builds this, pointing the wrong way.** D3 rewards _advertising_ a `schema` command — its own `coverageEstablished` says "a claim ABOUT the help text" and its own gap says "a pass establishes only that help names the flag and never that the flag is accepted." The catalogue currently **pays a target for saying it has a schema command and never runs it.** Under this design that clause becomes the front door: D3 passes when the declared self-description invocation is advertised _and_ returns a parseable declaration. Cheap, strictly better, and it resolves the adopter complaint recorded in `advertises-machine-mode.ts` — that `defaultOutput` in `acc.config.json`, "which no caller of their CLI can see," made B5/D1 pass while D3 kept failing, so "the rule's name and its behaviour had come apart." A target-emitted declaration _is_ visible to callers, so it can legitimately satisfy D3, B5 and D1 at once. A config key cannot, and should not.

**(d) The uncomfortable result, stated plainly.** The fields that fix the false verdicts — root positional shape, exit-code ownership — will in practice **always be config-authored**, because the targets that need them (`rg`, `ffmpeg`, `sqlite3`, `ssh`, `timeout`, `jq`, `xargs`) emit no schema and never will. The target-emitted transport is the right long-run design and it reaches none of the population that motivated `L1`. Anyone attacking this design should attack there first.

**(e) One asymmetry that argues _for_ the target transport beyond ownership.** Absence claims — "I have no subcommands" — are pure belief in the config transport. In the target transport they become _partially_ checkable, because two artifacts from the same tool can be compared against each other: an emitted declaration listing no commands, beside emitted help containing a `Commands:` block, is the tool contradicting itself. That is not a heuristic about English used to condemn a target; it is a disagreement between two of the target's own outputs, which is a legitimate finding whichever one is wrong.

##### Precedence and disagreement

- **The target's emission wins on every field it speaks to.** The config may override only inside an explicit `overrides` block with a required `reason`, and **every override is printed in the report as a disagreement**, never applied silently. Rationale: the tool's claim is the thing the catalogue exists to falsify. An observer silently overwriting it converts a falsifiable promise into an unfalsifiable model — the same move `not-in-the-config-not-inferred` objects to in a different spelling.
- Fields the emission does not carry fall through to the config.
- Fields neither carries are **absent**, and absent means the dependent rules report `unverified` naming the field — exactly how `defaultOutput` behaves today.

##### The one hole this punches in an existing gate

`inert.ts` fails closed on principle: "a checker's own claim about its probe is treated as a hypothesis and verified against the args, never trusted." A caller-declared self-description invocation is a claim the gate cannot verify. I do not think that is avoidable, so I make it visible instead: a new inertness class `declared`, admissible **only** for `selfDescription.invocation`, run first and alone, with the cwd-diff falsifier (§4) armed, and named in the report as _a probe the caller authorised_. The gate's job was catching checker bugs; a human who wrote a path into a file is a different actor, and the honest move is to say whose claim it was.

---

#### 2. Three worked declarations

##### 2.1 `gh` — ordinary verb-dispatching, target-emitted body

`acc.config.json` (caller policy, and only that):

```json
{
  "declaration": { "from": "target" },
  "rules": {
    "F2": { "severity": "off", "reason": "network-backed; first-byte budget is not meaningful here" }
  },
  "knownFailures": {}
}
```

`gh schema` emits (this is the declaration; `acc schema`'s envelope is stripped by the kit):

```json
{
  "acc_declaration": 1,
  "name": "gh",
  "version": "2.62.0",
  "rootPositional": "verb",
  "helpInvocations": [["--help"], ["-h"], ["help"]],
  "versionInvocations": [["--version"]],
  "exitCodes": {
    "ownership": "own",
    "usageError": 1,
    "meanings": { "0": "success", "1": "error or usage error", "4": "authentication required" }
  },
  "machineMode": {
    "reachedBy": "flag",
    "flag": "--json",
    "arity": "value",
    "valueHint": "fields"
  },
  "errorEnvelope": null,
  "globalArgs": [
    { "name": "--repo", "arity": "value" },
    { "name": "--help", "arity": "boolean" }
  ],
  "commands": [
    {
      "name": "pr",
      "effects": "read_only",
      "outputKind": "opaque",
      "commands": [
        {
          "name": "list",
          "effects": "read_only",
          "outputKind": "data",
          "args": [
            { "name": "--state", "arity": "value", "values": ["open", "closed", "merged", "all"] },
            { "name": "--json", "arity": "value" }
          ]
        },
        { "name": "merge", "effects": "non_idempotent", "outputKind": "opaque", "args": [] }
      ]
    },
    { "name": "auth", "effects": "read_only", "outputKind": "opaque", "commands": [] }
  ]
}
```

Note `machineMode.arity: "value"` — `gh --json` with no field list exits 1. That is precisely the case `discovery.ts`'s `takesRequiredValue` was written to catch by reading a `<slot>` out of help prose, and here it is stated. `errorEnvelope: null` is a real declaration ("my errors are prose"), which makes A3's machine clause **not-applicable** rather than `unverified`.

##### 2.2 `ripgrep` — pattern-first, config-authored in full

`acc.config.json`:

```json
{
  "declaration": "./rg.decl.json",
  "rules": {},
  "knownFailures": {}
}
```

`rg.decl.json`:

```json
{
  "acc_declaration": 1,
  "name": "ripgrep",
  "authoredBy": "observer",
  "rootPositional": "operand",
  "rootPositionalReason": "the first positional is a regex pattern, not a verb; an unrecognised token is searched for, not rejected",
  "helpInvocations": [["--help"], ["-h"]],
  "versionInvocations": [["--version"], ["-V"]],
  "exitCodes": {
    "ownership": "own",
    "usageError": 2,
    "meanings": {
      "0": "at least one match",
      "1": "no match — this is a successful run, not an error",
      "2": "error"
    }
  },
  "machineMode": {
    "reachedBy": "none",
    "reason": "--json selects a JSON Lines format for SEARCH RESULTS; it is not a CLI-wide output mode and does not govern help, version or diagnostics"
  },
  "errorEnvelope": null,
  "commands": [],
  "globalArgs": [
    { "name": "--json", "arity": "boolean" },
    { "name": "--engine", "arity": "value", "values": ["default", "pcre2", "auto"] }
  ]
}
```

What this buys against the blind trial's four findings: `rootPositional: "operand"` withdraws the sentinel-verb probe, so **the false `PASS+ A2` becomes `not applicable`** and A3's verb clause and C2's verb shape leave the population — the false `FAIL C2 (2,1,2)` and false `FAIL A3` go with them. `machineMode.reachedBy: "none"` is what fixes finding 4: B3/B5/D1 report **not-applicable with a stated reason** instead of three failures descending from one D3 misread. `exitCodes.usageError: 2` lets C2 assert the declared number rather than pattern-matching on `2`.

##### 2.3 `timeout` — does not own its exit codes

```json
{
  "acc_declaration": 1,
  "name": "timeout",
  "authoredBy": "observer",
  "rootPositional": "operand",
  "rootPositionalReason": "argv is DURATION COMMAND [ARG]...; the first positional is a duration and the second is another program's name",
  "helpInvocations": [["--help"]],
  "versionInvocations": [["--version"]],
  "exitCodes": {
    "ownership": "delegating",
    "reserved": [124, 125, 126, 127, 137],
    "usageError": 125,
    "meanings": {
      "124": "the command timed out",
      "125": "timeout itself failed",
      "126": "the command was found but could not be invoked",
      "127": "the command was not found",
      "137": "the command was killed by SIGKILL"
    },
    "delegationNote": "any code outside `reserved` is the child's status, verbatim, and timeout has no opinion about it"
  },
  "machineMode": { "reachedBy": "none", "reason": "timeout emits no output of its own" },
  "errorEnvelope": null,
  "commands": [],
  "globalArgs": [
    { "name": "--signal", "arity": "value" },
    { "name": "--kill-after", "arity": "value" },
    { "name": "--preserve-status", "arity": "boolean" }
  ]
}
```

`ownership: "delegating"` + `reserved` is deliberately not a boolean. `ssh` would write `reserved: [255]` and `delegationNote` covering the rest; `xargs` `[123,124,125,126,127]`; `jq` would need something this format cannot express (see §7). The `reserved` band is what keeps C1/C2/C3 saying _something_: codes inside it are the tool's and are asserted normally; codes outside it are reported as observed and asserted about by nothing.

---

#### 3. Falsifiability, field by field — including where the answer is "nothing"

`probing.md` admits a declaration precisely on the grounds that it is falsifiable, so this table is the part of the design that has to survive attack. Four classes.

**Class A — falsified by a probe; the falsification is a _declaration defect_, not a conformance verdict.**

| Field                                                                  | Probe that falsifies it                                                | What happens                                                                                                                  |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `selfDescription.invocation`                                           | run it; must exit 0 and parse as a declaration                         | Run **stops**. Every subsequent probe would rest on a document that does not exist                                            |
| `commands[].name`                                                      | `<cli> <name> --help` rejected as an unknown command                   | Declaration names a command the tool does not have → `declarationFindings`, and the nested probes built from it are withdrawn |
| `globalArgs[].name` where `arity: "boolean"`                           | send it alongside a declared help invocation; rejected as unknown flag | Declared flag does not exist. Also catches an arity lie: `"missing value"` back from a declared boolean                       |
| `machineMode.flag` + `arity`                                           | same                                                                   | This is `takesRequiredValue`'s job, done by observation instead of by reading a `<slot>` out of prose                         |
| `commands[].name` **absent from emitted help** (target transport only) | compare emission against `--help`                                      | The tool contradicts itself. A finding against the tool, not the observer                                                     |

**Class B — falsified by a probe, but the falsification is _indistinguishable from the rule failing_. The declaration fixes the referent; it does not add an independent check.** This is the largest class and the most important honest admission in the design.

| Field                              | Rule it feeds      | Why the two cannot be told apart                                                                                                                                                                                                                |
| ---------------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `helpInvocations`                  | C1, D4, F1, B2, D3 | If the declared help argv exits 2, either help is broken (C1 fails) or you declared the wrong token. **Nothing distinguishes them.** The kit reports C1's failure and names the declaration the assertion rested on, so a reader can check both |
| `versionInvocations`               | D1, F2             | same shape                                                                                                                                                                                                                                      |
| `exitCodes.usageError: N`          | C2, A1, A2, D2, A7 | A tool answering usage errors at `M ≠ N` either has an inconsistent parser or a wrong declaration                                                                                                                                               |
| `machineMode.reachedBy: "default"` | B5, A3, B1, B2, D1 | Exactly how `defaultOutput` works today — provoke a parser error, look for a document                                                                                                                                                           |
| `errorEnvelope.tokenField`         | A3                 | Closes A3's headline gap: today it accepts "some string value somewhere in the document"                                                                                                                                                        |
| `errorEnvelope.versionField`       | D1                 | Closes "no declaration exists at L0 to name the field the version belongs in"                                                                                                                                                                   |
| `args[].values`                    | A7                 | Send an out-of-set value, require rejection. Same assertion, sourced from a statement instead of an alternation regex                                                                                                                           |
| `commands[].outputKind`            | B3                 | Lets `stream` and `opaque` be checked; today "no output kind is declared at L0" makes NDJSON permanently `unverified`                                                                                                                           |

**Class C — nothing falsifies it. Accepted, because it can only _narrow_.**

The justification is structural, and it is the rule I would like a reviewer to test hardest:

> An unfalsifiable field is admissible when the only thing it can do is **remove probes and withdraw verdicts**. The declarer buys silence, not a pass. A field that _unlocks_ a probe or _enables_ a pass must carry its own falsifier or be gated behind something that does.

| Field                                    | Why nothing falsifies it                                                                                                                                                              | Why accept it anyway                                                                                                                                                                                                                                                  |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rootPositional: "operand"`              | You cannot show from outside that a CLI has no verb table. `rg` rejects nothing, `expr` has no flags at all                                                                           | It only withdraws A2, A3's verb clause, and C2's verb shape. `fullyVerified` goes false; the report names each rule it switched off and quotes the required `rootPositionalReason`                                                                                    |
| `commands: []` ("I have no subcommands") | The brief's own example, and correct: a hidden command is invisible, and inferring from a `Commands:` block re-imports the prose heuristic the project spent a major version removing | Same narrowing argument. **And in the target transport it stops being purely believable** — see §2(e)                                                                                                                                                                 |
| `machineMode.reachedBy: "none"`          | Absence again                                                                                                                                                                         | Withdraws B3/B5/D1's machine clauses. Requires a `reason`, which is exactly the sentence a maintainer should have to write                                                                                                                                            |
| `errorEnvelope: null`                    | Absence                                                                                                                                                                               | Withdraws A3's field clause                                                                                                                                                                                                                                           |
| `exitCodes.ownership: "delegating"`      | **Nothing falsifies this in either direction.** You cannot show from outside that `ssh`'s `255` is its own and its `3` is the remote's                                                | Accepted with the `reserved` band keeping the tool's own codes in scope. **This is the largest unfalsifiable escape hatch in the design**: a tool that owns its codes but declares delegation exits the whole C family. I would attack this first if I were reviewing |

**Class D — unfalsifiable, and I recommend _rejecting_ the field.**

| Rejected field                                                  | Argument                                                                                                                                                                                                                                                                                                                    |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `firstByteBudgetMs` (the `design-choice` report's F2 candidate) | It is technically falsifiable — measure and compare — but a target declaring `10000` passes by construction. Declaration and waiver are the same move here, and the waiver already exists with a required `reason` and a published cost                                                                                     |
| `helpIsPositionIndependent`                                     | SURV-11: false by design for `ffmpeg`, `find`, `bazel`, ImageMagick, PLINK. Declaring `false` only switches off a clause no checker implements; declaring `true` cannot be cheaply falsified. **The rule text needs qualifying, not a field**                                                                               |
| `"unknown"` as a value on any required key                      | The decision page left this open and leaned against. I take the position: reject. Every key I made required is one whose absence means the kit guesses, and the format's honest answer to "I do not know" is a narrowing field with a reason, which is a different and better sentence than a shape key answered by a shrug |

---

#### 4. One new falsifier the tree already pays for

`runner.ts` calls `mkdtempSync(join(tmpdir(), "acc-probe-"))` per probe, passes it as `cwd`, and `rmSync`s it. **Nobody looks inside it first.**

Diff it. For a target declaring `rootPositional: "verb"`, a sentinel probe that **creates a file** falsifies the declaration — and that is exactly the survey's hazardous half: `ffmpeg` ("anything that cannot be interpreted as an option is considered to be an output url"), `sqlite3` (first positional is a DB path, created if absent), `ogr2ogr`, `cdo`. It fires in the direction that matters: a false `"verb"` is the dangerous declaration, a false `"operand"` merely costs coverage.

Honest limits: it sees relative-path writes only — not `HOME`, not XDG, not absolute paths, not a subprocess, and none of those are bounded until roadmap step 3. It does not catch `rg` at all, because `rg` is harmless and merely produces a wrong verdict. And it is a _post-hoc_ detector: the file was already written. So it downgrades "unfalsifiable" to "weakly falsifiable in the hazardous direction," which is not nothing and is not proof, and no page should say otherwise.

---

#### 5. Absent vs wrong — two failures, two reports

**Absent declaration.** Per `require-a-config-never-raise-ownership`, `acc check` refuses before spawning anything. Nothing about the target is reported — no partial verdict, no reduced mode. Exit in the `1`–`8` band, and I would argue a **distinct code from a malformed config**: that page explicitly flags the question and says "an agent branching on the code may want to tell those apart," and it is the difference between a step not taken and a step got wrong. The refusal prints a starter declaration to stdout for the caller to save — the page's own candidate resolution, and it holds E1 because nothing waits.

**Absent _field_ in a present declaration.** Not a refusal. The dependent rules report `unverified` and name the key as the remedy — the `defaultOutput` pattern, which `not-in-the-config-not-inferred` explicitly blesses ("an optional key whose absence withholds a verdict is consistent with this decision").

**Wrong declaration.** A third report section, `declarationFindings`, structurally separate from `findings`. It has to be separate: a wrong declaration is not a conformance verdict, and filing it under `findings` would either fabricate a rule violation or bury the problem.

| Kind                                                                                                         | Report                                                                                | Run continues?                                                                | Headline                                               |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------ |
| Class A, safety-gating field (`selfDescription`, `rootPositional` contradicted by a cwd write, `commands[]`) | `declarationFindings`                                                                 | **No.** Continuing means sending probes justified by a claim just shown false | `DECLARATION FALSIFIED`                                |
| Class A, non-gating (`globalArgs[].name`)                                                                    | `declarationFindings`                                                                 | Yes, with the probes built from that field withdrawn                          | conformance verdict stands, `fullyVerified: false`     |
| Class B                                                                                                      | the rule's own `fail`, with the detail naming the declaration the assertion rested on | Yes                                                                           | ordinary `NOT CONFORMANT`                              |
| Any of the above, **target-emitted**                                                                         | `declarationFindings` **and** a conformance finding                                   | per the rows above                                                            | the tool made the claim, so the tool owns the mismatch |

That last row is the candidate rule. Following this project's own discipline I do not mint an id, but the checker design exists, which is the bar `roadmap.md` sets: for each declared command, `<cli> <cmd> --help` must not be an unknown-command rejection; for each declared boolean global, the flag must not be rejected as unknown; for each declared value set, an out-of-set value must be rejected; and the emitted declaration must not contradict the emitted help. **A run whose caller-authored declaration was falsified must never report `conformant: true`**, and should carry an exit code distinct from `9` — the target may be fine; the measurement was not.

---

#### 6. Relationship to what exists

**Two files, because they have two authors, two lifetimes and two truth conditions.**

- `acc.config.json` keeps `rules`, `knownFailures`, and gains **`declaration`** — either `{"from": "target"}` or a path. Required, with **no default path**: a default is a hidden value and the decision page bans exactly that. I accept that this is ceremony and flag it as a guess (§8).
- `acc.decl.json` (or `mycli schema`'s payload) carries the declaration.

The argument for the split is not tidiness. **A declaration is a claim about the target that is true or false; a policy is a choice that is neither.** `rules` and `knownFailures` are the caller's suppressions and their CI's debt — a maintainer publishing a declaration in their own repo must not be publishing someone's waivers with it. And the split is what makes one schema serve three carriers: a file in the target's repo, the output of `mycli schema`, or a file beside a third party's CI config. That is roadmap step 6's whole ambition, and it is unreachable if the document also contains policy.

**`defaultOutput` — migrated, hard, not aliased.** It becomes `machineMode.reachedBy: "default"`. Roadmap step 6 says the axis decision falls due the moment a second key lands on it and is "cheap while the parser is open and expensive once adopters have written both" — `defaultOutput: "json"` beside `machineFlag: "--json"` is the drift it warns about, so I put the whole axis in one object with one vocabulary. An alias would be two spellings of one axis, which is the same defect wearing a compatibility label. `loadConfig` rejects `defaultOutput` with a `ConfigError` naming the new location — in-house style, since `config.ts` already treats a silently-ignored key as the thing to avoid ("a declaration that silently does nothing leaves a project believing it declared something it did not").

**Internally**, `Discovery` stops being a parse of help and becomes a projection of the declaration. `parseHelp` does not die — D3 still needs to read the human help surface, and `helpStatesMachineDefault` still downgrades rather than passes — but nothing else reads it. `MACHINE_FLAGS`, `HELP_TOKENS` and `extractValueSets` lose their verdict-bearing roles entirely; `HELP_TOKENS` survives only as the fallback the starter declaration is generated from.

---

#### 7. Versioning

```json
{ "acc_declaration": 1, "...": "..." }
```

- **Integer major only. No minors.** A strict unknown-key parser makes a minor version meaningless, and this project already chose strictness in `config.ts`. Additive changes bump the major. Cheap to decide now; expensive after adopters write both.
- **Unknown version in a config-authored declaration → refuse to run**, naming both versions ("this declaration speaks 2; this kit speaks 1"). Not best-effort, not partial. The reason is not compatibility, it is safety: fields in this format _unlock probes_, and unknown semantics on an unlocking field means running an invocation whose justification the kit cannot read.
- **Unknown version in a target _emission_ → different handling.** The emission is unusable, but that is not the tool's fault and not a conformance failure. Report `unverified` on the fields it would have supplied, fall through to the config, and say so. The asymmetry is deliberate: the config is the caller's own artifact and they can fix it; the emission is not.
- **Unknown key inside a known version → error**, matching `TOP_LEVEL_KEYS`'s existing behaviour and the same recorded reasoning.

---

#### 8. What this does not cover

Named, so nobody has to rediscover them:

- **Bitmask exit codes (SURV-8).** `pylint` (1|2|4|8|16|32), `fsck` ("the bit-wise OR of the exit statuses"). `usageError: 32` _is_ declarable, so C2 becomes answerable for them — but the **composition** semantics (`5` = fatal + warning) are not expressible here, and the survey is right that no declaration fixes it. The taxonomy grows a position or it does not. Not smuggled into `L1` to make it look answered.
- **Locale, platform, ambient environment (SURV-3, SURV-7).** Not claims about the target — claims about the _run_. They belong in report provenance beside the target's version, not in a declaration. Deliberately excluded.
- **A6's rejection detector.** `/unknown (option|flag)/i` over an inherited `LC_ALL` is a broken detector, not a missing fact. A grammar declaration does not fix it.
- **C1's "regardless of what else is on the command line" (SURV-11).** Qualify the rule page before implementing the clause; do not add a field.
- **`commands[].effects` is declared but not acted on at `L1`.** `types.ts` promises that L1's "effect classification of subcommands is what lets A4 safely invoke a real verb," and `spec.ts` claims `read_only` is falsifiable "in a sandbox." **There is no sandbox until roadmap step 3**, and `acc`'s own `check` is the standing counter-example — it had to be `non_idempotent` because it spawns third-party code. So `effects` is recorded and reported and **gates nothing**. A4 stays `unverified`; nested A2/A1 stay out of reach. This is the largest scope-down in the sketch and I think it is the right one.
- **Lifecycle (roadmap step 7)** — SIGINT/SIGTERM contracts, bounded shutdown, resumability, idempotency keys. Needs step 4 and profiles.
- **`jq`'s `halt_error(n)`** — the exit code under the control of the _input program_. `ownership: "delegating"` is the wrong word and `"own"` is false. The format has no third value and I did not invent one on a single instance.
- **`gpg --status-fd`** — a machine channel on a third descriptor. The runner records two streams; outside the model, not against it.
- **Survey shapes deliberately excluded because no rule asserts them:** `dig +short`, `@file` argfiles, `ps aux`/`tar cfv` dashless clusters, `dd if=/of=` operands, GROMACS `-nofoo`, single-dash-long parsers. The triage already establishes none of these falsifies anything here.

---

#### 9. Confidence, guesses, and what would settle each

**Confident:**

- The two-file split, and that `rules`/`knownFailures` must never move into the declaration.
- The `defaultOutput` → `machineMode` migration as a hard error rather than an alias — roadmap 6 argues this explicitly and the parser is open now.
- `helpInvocations` / `versionInvocations` as declared facts. The evidence is direct and reproduced (SURV-1 and SURV-5 both), and it is the one place where a spelling guess decides _inertness_, not just a verdict.
- `errorEnvelope` field names. Three checkers' gap lists ask for it in nearly the same words.
- The transport claim: transport changes blame, not probes.

**Guessing, and what would settle it:**

| Guess                                                                                                                                              | How to settle it                                                                                                                                                                                                                                                                                                                                           |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Whether `exitCodes.ownership: "delegating"` is admissible at all, being unfalsifiable in **both** directions and switching off a whole rule family | Write the declaration by hand for `ssh`, `timeout`, `xargs`, `tar`, `env`, `jq` and check whether the `reserved` band leaves C1/C2/C3 saying anything worth reading. If it does not, the field is a mute button and should be a waiver instead                                                                                                             |
| The cwd-diff falsifier's actual yield                                                                                                              | Four fixtures built to the survey's grammars (ffmpeg-, sqlite3-, ogr2ogr-, cdo-shaped) and measure whether the diff fires. Half a session, and it is the difference between "unfalsifiable" and "weakly falsifiable in the hazardous direction"                                                                                                            |
| Whether a required explicit `declaration:` path is ceremony adopters reject                                                                        | The third blind trial. The plan already wants one against a wrapper-fronted CLI; this is a second question the same trial can answer                                                                                                                                                                                                                       |
| **Hardest:** whether the target-emitted transport will ever have users outside this repo                                                           | `docs/research/2026-08-13-frameworks-languages.md` measured schema export across frameworks and D3's page cites oclif's manifest, clap's dump, Click's `to_info_dict()` and urfave's `json:` tags. **I did not read that research** — it is the single cheapest thing that would move my confidence, and someone should before committing to the transport |
| Whether `rootPositionalReason` / `machineMode.reason` should be required strings                                                                   | Follows the `rules[].reason` precedent, which exists for a stated reason and has held. I copied it without evidence that it holds for shape keys                                                                                                                                                                                                           |

**Where I would argue the scope down further, and the weakest joint in my own design:**

`rootPositional` and `exitCodes.ownership` carry almost the entire load, and they are the two least falsifiable fields in the format. There is an alternative worth putting beside this design rather than buried in it: **do not declare them at all — narrow the rules instead.** Make A2/A3's verb clause and C2's verb shape _not-applicable by default_, enabled only by an explicit statement that the tool dispatches verbs. Same information, burden reversed, and the crucial difference is that an **absent** declaration then produces silence rather than a false pass — which is the failure mode the blind trial called the dangerous half.

I did not take that route because it makes a claim about the target's shape look like a scope statement, which puts it next to `rules` — i.e. next to caller _policy_ — and that undermines the two-file split at exactly one seam. I think the split is still right, and I think this is the seam a reviewer should press on. Naming it is more useful than defending it.

---

## Sketch B — top-down, from what a person can honestly say

> Reproduced entire, as the subagent's final message. Headings shifted two levels; nothing else
> changed. Its opening line names what it read.

I read the survey, the two decisions, roadmap 5–7, `probing.md`, `config.ts`, `discovery.ts`, `inert.ts`, D3's page, and `spec.ts` / `schema.ts`. Here is the sketch.

---

### `L1`'s declaration format — a sketch

#### 0. The reframe first, because it changes the shape of everything below

The coordinator's question — _is a person writing `helpFlags` into `acc.config.json` a sensible compromise or a category error?_ — has an answer I did not expect before reading `schema.ts`:

**It is not a category error. Calling both things "the declaration" is.**

`acc schema` is generated from `spec.ts`, the same declaration `cli.ts` builds the parser from. Its own header says why that matters: _"A schema maintained separately from the parser is a document that lies as soon as anyone edits the other."_ That coupling is what makes the emitted document a **promise** — it is load-bearing inside the tool, so it can be wrong in ways that hurt the tool's own author.

A file an auditor writes after two minutes with `rg --help` is load-bearing nowhere. It is a **hypothesis**: a model of the tool, held by the person running the kit. Falsifying it establishes that _the model_ is wrong. It says nothing whatsoever about the tool.

Both are useful and the kit needs both. But they are different speech acts, they should fail differently, and today's design has one word and one container for both.

##### Why the observer's file cannot simply be abolished

If only self-emitting tools can be checked at `L1`, `L1` covers approximately none of the survey population. `jq`, `ffmpeg`, `ssh`, `find`, `dd`, `psql`, `tabix`, `expr`, `pylint` — not one emits a machine-readable self-description. The kit would be able to check, at `L1`, only tools already good enough not to need checking. That is fatal, and it is also contrary to `require-a-config-never-raise-ownership`, which explicitly blesses the third-party auditor run.

##### Why the two cannot share a word

Because the two failure reports are not the same sentence:

|                       | promise falsified                     | hypothesis falsified                                                                                    |
| --------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| who was wrong         | the tool                              | the person running the kit (probably)                                                                   |
| what to change        | the tool, or its schema               | the file                                                                                                |
| may it fail the gate? | **yes**                               | **no**                                                                                                  |
| what the report says  | "`rg` says X about itself and does Y" | "your `acc.config.json` assumes X; the tool did Y — one of them is wrong and the kit cannot tell which" |

That last cell is the load-bearing one. When an auditor writes `defaultOutput: "json"` about a tool that prints prose on a parser error, today's kit reports a **core B5 violation with `deviation: defect`** — a confident accusation against a tool, resting on a stranger's two-minute guess. That is precisely the failure mode the brief names ("a confident wrong verdict with a human's name on it"), and it exists in the code today.

##### The three-point scale, and what the kit can actually observe

Provenance is really three points, not two:

1. **Derived** — emitted, and generated from the same source the parser is built from (`acc schema`). Drift is structurally impossible for the derived subset.
2. **Emitted** — emitted, hand-maintained. Drift is exactly what the kit catches, and this is the highest-value falsification target in the whole design.
3. **Observed** — written by whoever is running the kit.

**The kit cannot tell 1 from 2 from outside**, and must not pretend to. What it _can_ establish is where the bytes came from: a command it ran, or a file it read. So the stamp records **provenance of the bytes**, never quality of authorship. There is precedent: `ConfigSource.origin` already records `flag` / `discovered` / `none` for exactly this reason, and its comment argues the case better than I can.

This also does not reopen `require-a-config-never-raise-ownership`. That decision forbids the documentation from raising **who you are**. Recording **where a document came from** is a different fact, mechanically established, and the decision's own closing argument depends on it: _"a declaration is a statement to the kit about how to read a target, and it is falsifiable whoever wrote it."_ Keep that. Add only: the _consequence_ of falsification differs by where the statement was made, not by who made it.

##### The two containers

```
acc.config.json
  rules, knownFailures          — caller policy. unchanged.
  assume: { … }                 — the observer's model. HYPOTHESES.
  declaration: {                — where to get the tool's own, if it has one
    from: "command",
    argv: ["schema", "--json"]
  }
```

and, obtained by running that command:

```
<tool> schema --json  →  { "acc_declaration": "1.0", … }   — PROMISES
```

**Same schema. Same field names. Different container, different verdict semantics.** A field means the same thing in both; only its force changes.

That `declaration.argv` line is, I think, the most important single line in the design. It is T1-cheap (one row of `--help`), it is a _narrowing_ statement (the caller authorising one specific probe), and it turns the observer's file from a competitor with the tool's self-description into **a pointer at the tool's own mouth**. The in-between disappears not by being resolved but by being made the on-ramp.

Where both exist and disagree, the emitted document wins and the `assume` key is reported as **redundant or contradicted** — never silently overridden.

---

#### 1. Top-down: what can somebody honestly say?

Before any field list, the population of honest statements, sorted by who can make them.

**An observer with two minutes of `--help` can honestly say:**

- which tokens the help screen documents as asking for help or version
- whether a command table is printed, and what is in it
- whether the usage line shows a verb slot or a data slot first
- whether a flag's help row shows a value slot
- what a closed value set is advertised as

**An observer who runs the tool a few times can add:** what an unknown flag exits with; whether `--json` produces JSON. — _and this is exactly the category the kit establishes for itself by probing. Declaring it buys nothing and risks everything._

**Only the implementation knows:**

- whether the process's exit code is its own or its child's
- whether exit `1` means failure or "no match"
- which field of the error envelope carries the offending token
- whether an unrecognised token is discarded, or becomes a filename it writes
- whether any command performs no writes

That third list is where `L1`'s value is, and it is also where an observer's answers will be wrong. **Which gives the design its central asymmetry**, stated as a rule:

> **A statement that widens the probe surface must be cheap to answer and safe to get wrong. A statement that narrows it may be accepted on anyone's word.**
>
> A wrong "don't probe me" costs coverage. A wrong "you may probe me" costs someone a written file.

---

#### 2. The earning test

A field exists only if it does one of two things:

**(a) unlocks a probe the kit is currently forbidden to send**, or
**(b) retires a spelling-to-meaning guess the kit makes today.**

Everything else — descriptions, examples, stability, `cardinality` — is CLI _documentation_, not conformance _declaration_. It belongs to roadmap step 6's IR and buys no verdict.

Note what (a) and (b) have in common: both are about **probe selection and admissibility**, not about verdicts. **The declaration must not restate the rules.** "My unknown flags exit 2" is already asserted by A1 and C2; declaring it is either redundant or a self-issued waiver. The declaration says _what kind of thing this is and where its surface is_ — the catalogue says what it owes.

---

#### 3. The field list, with both cost columns

`obs` = cost to an observer with `--help`. `impl` = cost to the tool's author writing it into the code that emits it. `T1` read it off help / it's a literal in the source · `T2` must run/experiment · `T3` must know the implementation.

| field                       | obs    | impl   | earns by                                                                 | promise or hypothesis      | direction  |
| --------------------------- | ------ | ------ | ------------------------------------------------------------------------ | -------------------------- | ---------- |
| `acc_declaration` (version) | T1     | T1     | protocol                                                                 | both                       | —          |
| `help.flags`                | **T1** | T1     | (b) retires `-h`≡help — SURV-1, SURV-5, and the `inert.ts` certification | either                     | narrows    |
| `help.takes_topic`          | T1     | T1     | (b) `curl --help <cat>`, `ffmpeg -h long`                                | either                     | narrows    |
| `version.flags`             | **T1** | T1     | (b) `-v`/`-V` in `HELP_TOKENS` certify inertness today                   | either                     | narrows    |
| `root.positionals[].kind`   | **T2** | T1     | (a)+(b) SURV-4 — the file-writing population                             | **needs promise**          | **widens** |
| `root.commands[]`           | T1     | T1     | (a) nested `--help` — largest coverage-debt group                        | either                     | widens     |
| `machine_mode`              | T2     | T1     | (a) B3/B5/D1-machine; (b) retires `MACHINE_FLAGS` — SURV-2               | either                     | widens     |
| `envelope.token_field` etc. | T2     | **T1** | (a) A3/B3/B5/D1 gaps, verbatim                                           | promise strongly preferred | widens     |
| `exit_codes.owner`          | **T3** | **T1** | (a) SURV-9 — withholds C2/C3 for delegators                              | **promise only**           | narrows    |
| `exit_codes.success[]`      | T2     | T1     | (a) `rg` 1, `expr` 1 — C2 currently unreachable                          | either                     | narrows    |
| `value_sets`                | T1     | T1     | (b) retires `extractValueSets` prose scraping into a **core** rule (A7)  | either                     | widens     |
| `argv.order_dependent`      | T2     | T1     | (b) SURV-11 — stops C1's reach clause manufacturing failures             | either                     | narrows    |

**Read the two cost columns against each other and the design writes itself.** `exit_codes.owner` is `T3/T1`: impossible for the observer, one line for the author. That is the canonical promise-only field, and the honest thing is to make it _inexpressible_ in `assume` — its absence withholds C2/C3 rather than defaulting.

`root.positionals[].kind` is the sharp one: `T2/T1`, and it **widens** the probe surface in the direction that writes files. An observer _can_ answer it — but wrongly, and the cost of wrong is `ffmpeg` writing `acc-probe-xyzzy-verb` to disk. So:

> **`kind: "verb"` from `assume` never unlocks a probe. Only `kind` values that forbid probes are honoured from an observer's file.**

The auditor may say "don't send sentinels, my first positional is data". The auditor may not say "sentinels are safe here". Only the tool may say that, about itself. Fail-safe, and it follows straight from the asymmetry in §1.

##### The one field I refuse

`effects: "read_only"` per command. `spec.ts` already carries it, its comment concedes the claim covers _everything the command causes, including subprocesses_, and it is the field that would let `L1` execute real verbs. It is `T3` for an observer and _still_ a hard claim for an author. It widens the probe surface further than every other field combined.

That is `L2`'s admission ticket, and `probing.md` currently defines `L1` as _"invocations the target has declared read-only"_ — **I disagree with that definition and want it split.** `L1` should be _the declared-surface level_: nested help, machine mode, envelope fields, exit-code semantics — all reachable with probes no more dangerous than the ones `L0` already sends. `L2` is _the declared-effects level_, and it needs the sandbox anyway (roadmap step 3). Merging them means `L1` cannot ship until the sandbox does, and every gap that says "no declaration exists at `L0`" stays open for it.

---

#### 4. Concrete JSON, written as the declaring person would write it

##### 4a. `acc` itself — the promise case, emitted

Obtained by `acc schema --json`, generated from `spec.ts`. This is what the format looks like when it costs nothing because it already exists:

```json
{
  "acc_declaration": "1.0",
  "name": "acc",
  "version": "0.7.1",
  "help":    { "flags": ["--help", "-h"], "takes_topic": false },
  "version": { "flags": ["--version"] },
  "root": {
    "positionals": [{ "name": "command", "kind": "verb", "required": true }],
    "commands": ["check", "rules", "show", "schema", "tags", "version"]
  },
  "machine_mode": {
    "reached_by": "flag",
    "flag": "--json",
    "also": ["--format=json"],
    "kind": "json",
    "scope": "all_commands_and_errors"
  },
  "envelope": {
    "ok_field": "ok",
    "error_object": "error",
    "token_field": "error.details.token",
    "choices_field": "error.details.choices",
    "version_field": "data.version"
  },
  "exit_codes": { "owner": "self", "success": [0], "usage": 2 },
  "value_sets": { "--format": ["text", "json"] },
  "argv": { "order_dependent": false, "terminator": "honoured" }
}
```

Every rule whose gap reads _"no declaration exists at `L0` to name the envelope field"_ — A3, B3, B5, D1 — becomes checkable, against a document the tool published itself. If `spec.ts` changes and the envelope does not, the kit says so, and that finding is against `acc`. That is `L1` doing the thing `L1` was always described as doing.

##### 4b. `ripgrep` — observer-written, and the honest answer is awkward

```json
{
  "assume": {
    "acc_declaration": "1.0",
    "name": "rg",
    "help":    { "flags": ["--help", "-h"], "takes_topic": false },
    "version": { "flags": ["--version", "-V"] },
    "root": {
      "positionals": [
        { "name": "PATTERN", "kind": "data",  "required": true },
        { "name": "PATH",    "kind": "path",  "required": false, "variadic": true }
      ],
      "commands": []
    },
    "machine_mode": {
      "reached_by": "flag",
      "flag": "--json",
      "kind": "jsonl",
      "scope": "results_only"
    },
    "exit_codes": { "success": [0, 1], "usage": 2 }
  }
}
```

**The awkward parts, all three of them:**

1. **`exit_codes.success: [0, 1]`.** `rg` exits `1` for "no matches" — a complete, correct, successful run. The catalogue has no vocabulary for this; C2's pass branch wants `codes[0] === 2` and every "exits non-zero" clause reads `1` as failure. The field is _expressible_ here, so `rg` gets an honest declaration — but nothing consumes it yet, and pretending otherwise would be the worst kind of field. **Status: declared, unconsumed, and the rule pages need to grow the concept before it means anything.**

2. **`machine_mode.scope: "results_only"`.** `rg --json` emits JSONL _search results_. It is not an envelope and it does not cover the parser-error path. Without `scope`, this declaration unlocks B5 and `rg` fails a core rule for a feature it never claimed to have — the exact false-`D3`-pass from the blind trial, promoted from inference to declaration. `scope` exists solely to let an honest person decline B5, and it is the field I am most confident about, because it was **measured** in this repo.

3. **`root.positionals[0].kind: "data"` came from an observer.** Under my §3 rule it is honoured — it _narrows_ (A2 stops sending `rg acc-probe-xyzzy-verb`, killing the known false `PASS+ A2`). If the same observer had written `"verb"`, it would be **ignored**, and A2 would stay `unverified`.

##### 4c. `ffmpeg` — where the declaration's whole job is to forbid probes

```json
{
  "assume": {
    "acc_declaration": "1.0",
    "name": "ffmpeg",
    "help":    { "flags": ["-h", "-help", "--help"], "takes_topic": true },
    "version": { "flags": ["-version"] },
    "root": {
      "positionals": [
        { "name": "output_url", "kind": "sink_path", "required": false, "variadic": true }
      ],
      "commands": []
    },
    "argv": { "order_dependent": true, "terminator": "none" }
  }
}
```

Everything here subtracts. `kind: "sink_path"` says _an unrecognised token becomes a file I try to write_ — `classifyInertness` must then refuse `sentinel` outright for this target, not merely for prompt-shaped CLIs, closing the hole `inert.ts` documents only in its money-shaped form. `takes_topic: true` stops `-h` being scored as a boolean help flag (SURV-5). `order_dependent: true` disarms C1's reach clause before it exists (SURV-11). `terminator: "none"` makes A6 `unverified` rather than `fail`.

**Note what is not here:** `--help` is not in `ffmpeg`'s documented set at all, `-h` is. An observer who copies a template with `["--help"]` in it produces a target that fails C1 for a flag it never had. **Every default in this format is therefore "absent", never a value** — which is `not-in-the-config-not-inferred` applied at the field level, and it is why I would reject a template `acc init` that pre-fills `help.flags`.

##### 4d. `jq` — where the format nearly forces a lie

```json
{
  "assume": {
    "acc_declaration": "1.0",
    "name": "jq",
    "help":    { "flags": ["--help", "-h"], "takes_topic": false },
    "version": { "flags": ["--version"] },
    "root": {
      "positionals": [
        { "name": "filter", "kind": "program", "required": true },
        { "name": "files",  "kind": "path", "required": false, "variadic": true }
      ],
      "commands": []
    },
    "exit_codes": { "success": [0], "usage": 2 }
  }
}
```

**Where it nearly lies:** `exit_codes.owner`. `jq` owns its exit codes — except that `halt_error(n)` puts the code under the control of _the input program_, which is a positional the caller supplies. `owner: "self"` is false. `owner: "child"` is false. There is no third value that is true, and inventing `"conditional"` would be a field nobody can act on.

**So the observer omits the key,** and C2/C3 report `unverified` naming `exit_codes.owner` as the remedy — a remedy the tool's author could supply and the observer cannot. That is the format working: _the honest move is silence, and silence has a visible cost that points at the person who could pay it._

`kind: "program"` is also a new value I would not have reached from the checkers. The sentinel `acc-probe-xyzzy-verb` **parses as a valid jq program** (`acc - unknown - verb`) and fails at compile time with exit `3`. `"data"` would understate it — data is inert-ish; a program is a thing that runs. It is `"program"` because A5's near-miss and A2's sentinel both become meaningless, not merely unsafe.

##### 4e. `ssh` — the tool that answers almost nothing

```json
{
  "assume": {
    "acc_declaration": "1.0",
    "name": "ssh",
    "help":    { "flags": [] },
    "version": { "flags": ["-V"] },
    "root": {
      "positionals": [
        { "name": "destination", "kind": "data", "required": true },
        { "name": "command", "kind": "program", "required": false, "variadic": true }
      ],
      "commands": []
    }
  }
}
```

`help.flags: []` is an explicit, honest, _empty_ statement — and it must be distinguishable from an absent key. Empty means "I looked; there are none", so C1 reports `unverified` with a reason, instead of `fail` for missing a flag `ssh` never documented. Absent means "nobody said", so C1 stays where it is.

`exit_codes.owner` is omitted, and _this_ is the case where the answer is knowable and the observer nearly knows it: `ssh(1)` literally says _"exits with the exit status of the remote command or with 255 if an error occurred."_ But `owner` is promise-only in my design, so the observer cannot say it, and the report will say so — which is either the design working (a stranger should not be certifying exit-code ownership) or the design being too strict (the man page says it in words). **I flag this as the sharpest place a reviewer should push.** My lean: hold the line, because `ssh` is the case where the man page is unusually explicit and `tar` / `xargs` / `bazel run` are not.

##### 4f. `pylint` — where the person plainly does not know, and should not be asked

```json
{
  "assume": {
    "acc_declaration": "1.0",
    "name": "pylint",
    "help":    { "flags": ["--help", "-h"], "takes_topic": false },
    "version": { "flags": ["--version"] },
    "root": {
      "positionals": [{ "name": "modules", "kind": "path", "required": true, "variadic": true }],
      "commands": []
    }
  }
}
```

`exit_codes` is omitted **and there is no key that could carry the truth.** pylint ORs fatal 1 / error 2 / warning 4 / convention 8 / refactor 16 / usage 32; a run with a fatal and a warning exits `5`. `success: [0]` is false, `usage: 32` is true but C2's whole taxonomy assumes an enumeration, not a bit field.

I am **deliberately not adding a `bitmask` field**, and this is SURV-8's argument transplanted: _"No declaration by the target changes what `2` means in the taxonomy; the taxonomy either grows a position on bitmasks or it does not."_ Adding the field would let `L1` look like it had answered a spec question it had only relocated. `C2` stays permanently `unverified` for this family until the spec moves, and the report should say **that** — "the exit-code taxonomy has no position on bit fields" — rather than "declare `exit_codes` to fix this", which would be a lie told by an error message.

---

#### 5. What a declaration buys its author

Not symmetry, and not documentation. Two purchases:

**It buys verdicts where the kit currently refuses to speak.** Twelve-odd `coverage_gaps` say some version of _"no declaration exists at `L0`"_. Those are not gaps in the checkers; they are the admission test in `probing.md` holding the line. A declaration is the only thing that moves them, and it moves them _without any new probe risk_ for the envelope and exit-code fields.

**It buys the removal of guesses that are currently producing wrong verdicts.** SURV-1, SURV-2, SURV-4, SURV-5 are false passes and false fails _live in the kit today_, all of the form "a green line resting on a token whose meaning the kit guessed from its spelling". Every one is fixed by a `T1`-cost field.

**Which fields earn their place, plainly:**

- **Earn it outright:** `help.flags`, `version.flags`, `root.positionals[].kind`, `root.commands`, `machine_mode`, `envelope.*`, `exit_codes.owner`, `argv.order_dependent`.
- **Earn it, but only until the spec grows:** `exit_codes.success` — nothing consumes it yet.
- **Weakest, and I would ship without it:** `value_sets`. The prose scrape exists and mostly works; the argument for the field is that A7 is **core** and is currently reaching a core verdict off a regex over English help prose, which is the thing `probing.md` forbids. That argument is good, but it is a reason to _demote A7 or fix the scrape_, not necessarily a reason for a field.
- **There for symmetry only in `assume`:** `name`, `version`. In an emitted document `version` earns its place — it is what makes a stored report replayable (roadmap step 4) and it is the one thing an observer's file genuinely cannot keep in sync.

**And the incentive it buys the ecosystem.** Because a hypothesis can only ever produce `unverified` where a promise produces `pass` (§7), the kit _pays tools in verdicts for self-describing_. To get a green line on the declaration-dependent rules, emit your schema. That is the same mechanism D3 already uses deliberately — _"deleting an honest sentence makes a target's report worse"_ — pointed at a bigger target.

---

#### 6. Where the format ends

**Not declarable, because the kit establishes it better by probing.** Everything `L0` already checks. Exit codes for probes it sends, determinism, ANSI-in-a-pipe, crash-on-inert, hangs. A declaration that restates a rule is a self-issued waiver wearing a schema's clothes.

**Not declarable, because it is the runner's job.** Locale, platform, ambient environment, target version-under-test (SURV-3, SURV-7). The right fix is `LC_ALL=C` on every probe and a recorded environment block in the report — **measured, printed beside the config, labelled as measured**, exactly as `not-in-the-config-not-inferred`'s "what would change our mind" section describes. A target declaring "my errors are English" would be answering for the caller's shell.

**Not declarable, because it is a spec gap in disguise.** Bitmask exit codes (§4f).

**Not declarable, because it is caller policy.** Severity, waivers, known failures, and _which profile's rules bind_. Roadmap step 5 wants a falsifiable profile claim, and I would keep the falsifiable half (a profile is a bundle of the fields above) and refuse the policy half (which rules apply is `rules`, and it is the caller's).

**Not declarable at `L1` at all.** `effects` / `read_only` (§3). Goes to `L2` with the sandbox.

**Not declarable because unfalsifiable within one run.** Stability guarantees, deprecation, "this flag will not change". A conformance kit that accepts an unfalsifiable claim has stopped being a conformance kit.

---

#### 7. How wrongness surfaces

Three event classes, and the reader must be able to tell them apart at a glance.

```
acc check ./rg --config-dir .

  declaration: assume (acc.config.json, /home/x/audit)   format 1.0
  catalogue:   0.7.1                                     probe level: L1

  ── CONTRADICTED ASSUMPTION ────────────────────────────────────────────
  assume.machine_mode.flag = "--json"  (acc.config.json:11)
    probe    rg --acc-probe-xyzzy-flag --json
    observed exit 2, stdout empty, stderr "error: unrecognized flag …" (not JSON)

    The file and the tool disagree. This kit cannot tell which is wrong:
    the assumption may be mistaken, or the tool may not honour it.
    Nothing was established about the tool here.

    Withheld, because they rested on it:
      B3 unverified · B5 unverified · D1 unverified (machine payload)

  ── RULE FINDINGS ──────────────────────────────────────────────────────
  A1 pass   | unknown flag exited 2
  C1 pass   | --help exited 0 with non-empty stdout
  A2 unverified | root positional declared kind "data"; no verb probe sent
  ...

  VERDICT: conformant (L1), 0 core violations, 1 contradicted assumption
```

And the other shape, against a tool that speaks for itself:

```
  declaration: emitted (acc schema --json)   format 1.0

  ── BROKEN PROMISE ─────────────────────────────────────────────────────
  H1 fail | the tool's own declaration is contradicted by its behaviour
    declared  envelope.token_field = "error.details.token"
              (from: acc schema --json)
    probe     acc tags --acc-probe-xyzzy-flag --json
    observed  {"ok":false,"error":{"kind":"usage","message":"unknown option …"}}
              no value at error.details.token

    The tool published this claim. Fix the behaviour, or fix the schema.

  VERDICT: NON-CONFORMANT (L1), 1 core violation
```

**The four properties I would defend hardest:**

1. **Declaration events come before rule findings, and are visually separated.** A falsified premise invalidates the verdicts built on it; printing them interleaved buries that.
2. **Cascade to `unverified`, never to `pass` or `fail`.** Any rule that consumed a contradicted statement is withheld with `rested on a contradicted assumption`. Without this you get exactly the SURV-class confident-wrong-verdict, one layer up.
3. **A contradicted _assumption_ is not gate-failing and never blames the tool.** The prose "this kit cannot tell which is wrong" is not hedging — it is the literal truth, and the standard the survey's SURV-6 finding demands of `detail` strings.
4. **A broken _promise_ is a core violation, under a new rule.** I would mint **`H1` — the tool's self-description is true**, in a new `self-description` family, under the discipline that minted `G1` (an id when a checker design exists). It is the single strongest finding the kit can produce, because the sentence is the tool's own.

A contradicted assumption is **not waivable via `rules`** — it is not a rule and has no severity. Its remedy is to edit the file. `H1`, being a rule, is waivable like any other, and a project waiving it is making a legible statement: _my schema is decorative_.

---

#### 8. Versioning and evolution

```json
{ "acc_declaration": "1.0", … }
```

One string, `major.minor`. Three coordinates now print in every report: **catalogue version · declaration format · probe level** (roadmap step 2's discipline, extended).

**Major mismatch → refuse the run.** Not "ignore the declaration and carry on": a run that silently ignores a declaration downgrades a dozen verdicts to `unverified` while looking like an ordinary run, and the file's entire job is to unlock probes. Half-applying it is the silent no-op `config.ts` already refuses for a mistyped key. Same argument, larger blast radius.

**Minor ahead of the kit → refuse only if unknown keys are actually present**, and name them:

```
declaration declares format 1.3; this kit knows 1.1
  unknown keys present: root.positionals[0].sink_mode, argv.cluster_style
  these are the keys the run would have ignored. upgrade acc, or remove them.
```

Minor bumps are additive-only, so a 1.3 document using only 1.0 fields runs clean under a 1.1 kit. **The invariant: the kit never proceeds while ignoring a declaration.**

**Unknown key within a known minor → error**, matching `config.ts` today.

**The remedy sentence differs by provenance, and this is the practical half.** For an `assume` block, "edit your file". For an emitted document, the caller cannot edit the tool — so the message is "upgrade `acc`, or ask the target to emit `1.1`", and the run stops rather than producing a partial verdict against a tool speaking a dialect the kit half-understands.

**Deprecating `defaultOutput`.** Roadmap step 6 says the naming decision falls due when the second key on the machine-mode axis lands. It is landing here, so: the axis is `machine_mode`, with `reached_by: "default" | "flag" | "none"` — one key, one axis, `Discovery.machineModeFlag` / `machineModeDefault` projecting onto it directly. `defaultOutput: "json"` becomes `assume.machine_mode: { reached_by: "default", kind: "json" }`, accepted with a deprecation for one major.

---

#### 9. Engaging roadmap step 6, since the brief requires it

**I disagree with sequencing `L1` behind the portable IR, and I disagree with the IR's premise for this purpose — but I want the shapes compatible.**

Step 6 describes a full CLI description format: command structure, inputs, output kinds, effects, errors, outcomes, stability, examples; generatable by frameworks; single source for help, checker expectations, an agent skill, and an MCP projection. All of that is good and none of it is what `L1` needs.

**Three disagreements:**

1. **Most of the IR unlocks no verdict.** `description`, `examples`, `cardinality`, `notes`, `stability` — real content, zero verdicts. A format designed by asking "what can clap and cobra export?" arrives full of fields the earning test rejects, and every one of them is a field an observer will fill in wrongly for no benefit.

2. **The IR's author is the maintainer; `L1`'s is often not.** "One declaration another ecosystem can generate its CLI surface from" presupposes the tool's own build. The brief I was given presupposes someone with two minutes and `--help`. **These are two documents with two authors** — and §0 is the whole of my answer to the coordinator's question. The IR is the promise-side artifact. The `assume` block is the hypothesis-side artifact. Designing one thing for both is what produced the ambiguity in the first place.

3. **Blocking `L1` on step 6 blocks it on step 5 and step 2 transitively**, and step 5 is explicitly waiting to be _triggered by accumulated waiver reasons_. That is a good reason for step 5 to wait and a bad reason for a dozen `unverified` verdicts to.

**What I want instead:** the `L1` declaration is a **strict subset of the IR, mechanically projectable from it.** Same field names (`positionals`, `args`, `errors`, `output_kind`), same nesting. When step 6 lands, `acc schema --json` grows into the full IR and the kit reads the subset it needs; no adopter rewrites anything, and `acc.config.json`'s `assume` block becomes a partial hand-written IR — which is exactly what it is. The subset is designed now because it is the part with verdicts attached; the rest is designed when someone needs a skill or an MCP projection out of it.

---

#### 10. Confidence, guesses, and what would settle each

**Confident.**

- **The promise/hypothesis split is real and needs two words.** The evidence is in this repo: `defaultOutput` in an auditor's file currently produces a `core` `deviation: defect` B5 failure against a tool that promised nothing. That is a bug in the semantics, not the code.
- **The earning test.** Directly downstream of `not-in-the-config-not-inferred` and `probing.md`'s admission test; I am restating them, not inventing.
- **The widening/narrowing asymmetry.** SURV-4's file-writing population (`ffmpeg`, `sqlite3`, `ogr2ogr`, `cdo`) is what makes a wrong widening statement expensive and a wrong narrowing statement cheap.
- **Cascade-to-`unverified`.** The alternative is the false-pass mechanism the whole survey is about.
- **Refusing to add a bitmask field.** SURV-8 argues it and I am agreeing.
- **`machine_mode.scope`.** Measured in this repo, twice (blind trial finding 4, SURV-2).

**Guessing.**

- **`exit_codes.owner` being promise-only.** `ssh(1)` states it in plain words (§4e), so I may be excluding a statement an observer can make honestly. **What would settle it:** take the ten delegators the survey names — `ssh`, `tar`, `xargs`, `timeout`, `env`, `bazel run`, `cargo run`, `nix run`, `go run`, `cmake --build` — and have three people who did not write them answer `owner` from the man page alone. If they agree and are right, the field opens to observers. If they split, it stays shut.
- **Whether `H1` should be one rule or a family.** I minted one id for "your self-description is false". It may need to be per-axis (envelope vs exit codes vs surface), because "one core failure" is a blunt instrument for a schema wrong in one field. **Settled by:** writing the checker and seeing whether one finding can carry a useful message.
- **`root.positionals[].kind`'s value set.** I reached `verb` / `data` / `path` / `sink_path` / `program` by working backwards from five tools. It is almost certainly incomplete, and a closed set that turns out to be open is the worst kind. **Settled by:** writing declarations for all twenty-three tools in the survey and counting how often none of the values fits. If it is more than two, the field needs an escape hatch — but an escape hatch that _narrows_, never one that widens.
- **Whether `value_sets` earns a field at all** (§5).
- **Whether `assume` and `declaration` should share one file.** I put both in `acc.config.json` to keep one loader and one discovery path. The counter-argument is that mixing caller policy (`rules`) with a model of the target (`assume`) in one file is the same conflation I spent §0 arguing against. **Settled by:** whether anyone ever wants to commit an `assume` block to the _target's_ repository — if yes, it needs its own file, because `rules` and `knownFailures` are the caller's and must not travel with it.

**What I would refuse to guess at, and would want decided by someone else.** Whether `L1` splits into surface-declaration and declared-effects (§3). That is a change to `probing.md`'s published level table, it moves the boundary the whole catalogue's `probe_level` frontmatter is written against, and it is a bigger decision than a format sketch should make on its own. My argument for splitting is that `L1` otherwise cannot ship until the sandbox does; my argument against is that the table is published and adopters read it.

---

## Appendix — the mid-flight redirect

Both sketches were interrupted by the same reframing, sent separately to each and worded for the
brief it was interrupting. Both are reproduced whole, because the sketches' shape is a response to
them and a reader judging either sketch's transport reasoning needs to see what it was answering.
They are the coordinator's words, relaying the project owner's; they are not the sketches' and not
this note's.

### As sent to Sketch A

> The coordinator sent a message while you were working:
> Important reframing from the project owner, mid-flight. Your brief assumed the declaration lives in a config file. That assumption is now itself in question, and it may be the central question.
>
> Their point: `L1` was always described as _the CLI declares its schema, and we test that what it says is true_ — meaning the tool itself emits the schema, from a command or flag, and the kit consumes that as the thing to falsify. Declaring `helpFlags` in `acc.config.json` is an **in-between**: the fact is not coming from the tool, it is coming from a file beside it, written by whoever is running the check. That may be a reasonable compromise or it may be a category error, and they explicitly do not know which.
>
> So treat **transport as a first-class design axis**, not a detail:
>
> 1. **Target-emitted** — `mycli schema` or `mycli --schema` prints a declaration; the kit runs it and falsifies what comes back.
> 2. **Config-authored** — what your brief assumed.
> 3. **Both**, with a stated precedence and a stated meaning for disagreement between them.
>
> Note something already in this repo that bears on it directly: `acc` itself has a `schema` command, and rule **D3** already checks that help advertises a machine-readable path, with `advertisesSchema` looking for exactly that. So "the tool emits its own declaration" is not a new idea here — it is partly in the catalogue already. Read D3's checker and rule page, and `src/acc/spec.ts` for what `acc schema` emits, before you take a position.
>
> The properties that differ between transports and should drive your argument: a target-emitted declaration can go stale against its own implementation and can be _checked_ against it; a config-authored one cannot go stale but was never the tool's claim at all. One is a promise by the tool; the other is a model held by an observer. That difference decides what a falsified declaration even means.
>
> Keep everything else in your brief. Add: which transport each of your fields belongs to, and whether any field only makes sense in one of them.
>
> Address this before completing your current task.

### As sent to Sketch B

> The coordinator sent a message while you were working:
> Important reframing from the project owner, mid-flight. Your brief assumed the declaration is written by a person into a config file. That assumption is now itself in question.
>
> Their point: `L1` was always described as _the CLI declares its schema, and the kit tests that what it says is true_ — the tool emitting its own description, from a command or a flag. Having a person write `helpFlags` into `acc.config.json` is an **in-between**: the claim is not the tool's, it is an observer's model of the tool. They do not know whether that is a sensible compromise or a category error, and want the question taken seriously rather than assumed away.
>
> This bears directly on your top-down framing, and sharpens it. Your brief asks _what can somebody honestly say about a CLI_ — now split that:
>
> 1. **What can the tool honestly say about itself**, emitted from its own code, where the declaration and the implementation can drift apart and the kit can catch the drift?
> 2. **What can an observer honestly say about a tool they did not write**, from `--help` and experimentation, where nothing can drift because nothing was ever promised?
>
> Those are different speech acts. The first is a promise; the second is a hypothesis. A conformance kit falsifying a promise is doing something meaningfully different from a kit falsifying an observer's guess — and your cost-to-answer rating now has a second dimension, because a field that is expensive for an observer may be free for the tool's own author (exit-code ownership is the obvious case: the implementation knows, the observer cannot see it).
>
> Relevant fact already in this repo: `acc` itself has a `schema` command, and rule **D3** checks that help advertises a machine-readable path. So "the tool emits its own declaration" is already partly in the catalogue. Look at D3 and at what `acc schema` emits before taking a position.
>
> Keep the rest of your brief. Add: for each field, whether it is a promise or a hypothesis, and whether your format should mark which one it is — a reader of a report may need to know whether a claim came from the tool or from the person checking it.
>
> Address this before completing your current task.
