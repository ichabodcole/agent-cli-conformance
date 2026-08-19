---
type: research
generated: { by: unknown, at: 2026-08-13 }
status: current
description: Whether a language or framework is genuinely better suited to agent-first CLIs, or whether the problem follows you across all of them.
tags: [parsing, performance, contract]
---

# 02 — Framework & Language Survey for Agent-First CLIs

**Date:** 2026-08-13
**Question this answers:** Is a particular language or framework genuinely better suited to building robust agent-first CLIs, or is this purely a methodology problem that follows you across languages?

**Method:** Every "default behavior" claim below marked ✅ was verified by building and running the thing on this machine (Apple Silicon, macOS 26 / Darwin 25.5.0). Claims marked 📖 are documentation/source citations only. Claims marked ❓ could not be verified and are flagged as such. All latency numbers come from a **single benchmark harness on a single machine in one sitting**, so they are internally comparable; they are not portable absolute truths.

Benchmark harness: Python `subprocess.run` + `time.perf_counter`, 5 warmup runs discarded, 60–100 timed runs, stdout/stderr to `/dev/null`. Reported as mean / median / p05 / p95.

---

## 0. The short answer

**Language choice matters, but not for the reason people usually assume.** It does not meaningfully change how hard it is to write a _correct_ CLI — every ecosystem has at least one framework that parses strictly and derives help from a single definition. What language choice actually buys you is:

1. **Startup latency**, which is a real and measurable agent-loop tax (~2.3 ms for a Rust binary vs ~22 ms for Bun+commander vs ~36 ms for Python+typer — a **9–16×** spread), and
2. **Whether the schema you need already exists as a first-class, versioned artifact** or has to be reverse-engineered out of private framework internals.

Everything else — strictness, exit-code discipline, `--json`, stderr hygiene, non-interactivity — is **methodology that follows you across languages**. The frameworks differ enormously in their _defaults_, but nearly all of them _can_ be made strict. What none of them do is become strict without you deliberately making it so, and none of them tell you when you have slipped. That gap is exactly the conformance kit's job.

The single most important empirical finding: **strict-by-default is not correlated with language. It is correlated with the design philosophy of the individual library.** Within TypeScript alone, `node:util parseArgs`, `commander` (≥13), `cac`, `clipanion` and `@stricli/core` are strict by default while `yargs`, `citty` and `gunshi` silently swallow unknown flags. Within Go, `kong` and `kingpin` are strict on every axis while `cobra` — the most widely deployed CLI framework in existence — exits **0** on an unknown _nested_ subcommand and on extra positionals. That intra-language spread is far bigger than the spread _between_ languages.

The corollary matters for the project's framing: **the popular choice in each ecosystem is usually not the strict one.** cobra, yargs and citty are the defaults people reach for, and all three have exit-0 silent-success paths. A conformance kit is valuable precisely because the market has not selected for this property.

**Reference-implementation answer (detail in §5 and §6):** exactly **two** frameworks in any language already ship _strict parsing + auto-derived help + machine-readable schema export of the full command tree_ from one source of truth — **Swift ArgumentParser** (`--experimental-dump-help` → the versioned `ToolInfoV0` type) and **Python's Click** (`to_info_dict()`, verified directly JSON-serializable with enums preserved). Both are the right things to study and the wrong things to build on: Swift's dump is still explicitly experimental and its CLI ecosystem is thin; Click's dump has no version field and Python costs 6–8× the startup. The recommendation is to build the reference implementation in **Rust with `clap`**, taking schema _content_ from Click and schema _contract discipline_ from Swift. `kong` (Go) is the closest runner-up and a defensible substitute if Go fluency dominates.

> ### ⚠️ Read this before writing any spec: **[clispec.dev](https://clispec.dev/) already exists**
>
> "The CLI Spec" — v0.2 frozen/stable, **v0.3 a candidate release as of August 2026**, CC BY 4.0 — is a standards document with **the same scope as this project**: how CLIs should be designed to work for humans, scripts and AI agents simultaneously. Its six principles are Structured Output, **Schema Introspection**, Stderr/Stdout Separation, Non-Interactive by Default, Safe Retries, and Bounded Output. It mandates a `schema` subcommand emitting JSON (explicitly _not_ help-text parsing), it has **live JSON Schemas** (verified HTTP 200: [v0.2](https://clispec.dev/schema/v0.2.json) 9,058 B, [v0.3](https://clispec.dev/schema/v0.3.json) 31,810 B), an `x-` extension namespace, an `x-checker-rules` block for constraints JSON Schema cannot express, and a `clispec` conformance scorer.
>
> **This does not kill the project — it relocates it.** See §4.5: clispec is rich on the _semantic/agent_ layer (effects, cardinality, pagination, error taxonomy) and deliberately **thin on the parsing layer**, and by its own Rust guide it expects authors to hand-roll the clap walker. The unfilled gap is the **bridge**: automatically emitting a conformant schema from a strict framework definition. Build that, and align with clispec rather than competing with it.

---

## 1. Big comparison matrix

Legend for **Strict?**: what happens _out of the box_, with no opt-in configuration, when the user passes (a) an unknown `--flag` and (b) an extra positional argument.

| Framework                 | Lang       | Unknown flag (default)                                                              | Extra positional (default)                      | Help derived?                                        | Schema export                                                                                | Arg type safety                            | Validation                                        | Completions / man                                | In-process test                               | Startup (this machine)                                              |
| ------------------------- | ---------- | ----------------------------------------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------- | ------------------------------------------------ | --------------------------------------------- | ------------------------------------------------------------------- |
| **`clap` v4 (derive)**    | Rust       | ✅ **reject, exit 2**                                                               | ✅ **reject, exit 2**                           | ✅ auto                                              | ⚠️ no built-in dump, but rich API + `carapace_spec_clap` ships one                           | ✅ precise structs/enums                   | ✅ built-in (`value_parser`, `ValueEnum`, ranges) | ✅ `clap_complete`, `clap_mangen`, `clap_allgen` | ✅ `try_parse_from`, `trycmd`/`snapbox`       | **2.31 ms** ✅                                                      |
| **`argh`**                | Rust       | ✅ **reject, exit 1**                                                               | ✅ reject                                       | ✅ auto (**doc comments mandatory — compile error**) | ✅ **built-in `ArgsInfo` → serde JSON, on by default**                                       | ✅ structs                                 | ⚠️ minimal                                        | ❌                                               | ✅ `from_args`                                | ~binary speed ✅                                                    |
| `bpaf`                    | Rust       | ✅ **reject, exit 1**                                                               | ✅ reject                                       | ✅ auto                                              | ❌ internal `Meta` model is private/unnameable                                               | ✅ structs                                 | ✅ good                                           | ✅ man/md/html                                   | ✅                                            | ~binary speed ✅                                                    |
| `xflags`                  | Rust       | ✅ reject                                                                           | ✅ reject                                       | ⚠️ generated at build time                           | ❌ AST is `pub(crate)` in a proc-macro crate                                                 | ✅ structs                                 | ❌ BYO                                            | ❌                                               | ✅                                            | ~binary speed ✅                                                    |
| 🔴 `gumdrop`              | Rust       | ✅ reject                                                                           | ✅ reject                                       | ⚠️ auto — **but prints help to stderr**              | ❌                                                                                           | ✅ structs                                 | ❌                                                | ❌                                               | ✅                                            | **UNMAINTAINED — RUSTSEC-2026-0214**                                |
| 🔴 `pico-args` / `lexopt` | Rust       | ❌ **ACCEPT, exit 0**                                                               | ❌ **ACCEPT, exit 0**                           | ❌ hand-written                                      | ❌                                                                                           | ⚠️ manual                                  | ❌                                                | ❌                                               | ⚠️                                            | fastest, +48 B ✅                                                   |
| **`cobra`**               | Go         | ✅ **reject, exit 1**                                                               | ❌ **ACCEPT, exit 0** (`Args` nil default)      | ✅ auto                                              | ⚠️ `GenYamlTree` docs-shaped; `__complete` protocol; no true schema                          | ❌ stringly-typed getters                  | ❌ BYO                                            | ✅ full (bash/zsh/fish/ps + man)                 | ✅ `SetArgs`/`SetOut`/`SetErr`                | **2.57 ms** ✅                                                      |
| `urfave/cli` v2 & v3      | Go         | ✅ reject, exit 1                                                                   | ❌ **ACCEPT, exit 0**                           | ✅ auto                                              | ✅ **`json:` tags on every field → `json.Marshal(cmd)` works free**                          | ❌ typo'd read returns `""`, no error      | ❌ BYO                                            | ⚠️ `cli-docs/v3`                                 | ✅                                            | ~binary speed ✅                                                    |
| **`kong`**                | Go         | ✅ **reject, exit 80**                                                              | ✅ **reject, exit 80**                          | ✅ auto                                              | ✅ **`kong.Model`/`Node` AST fully walkable**                                                | ✅ struct binding, compile-checked         | ✅ `enum`/`xor`/`and`/`required`/file             | ⚠️ 3rd-party                                     | ✅ (inject `kong.Exit`)                       | ~binary speed ✅                                                    |
| `kingpin` v2              | Go         | ✅ reject                                                                           | ✅ reject                                       | ✅ auto                                              | ⚠️                                                                                           | ✅ typed pointers                          | ✅ `.Enum()`, `.ExistingFile()`                   | ⚠️                                               | ⚠️ `app.Terminate(nil)`                       | ❓ (frozen: "CONTRIBUTIONS ONLY")                                   |
| `go-flags`                | Go         | ✅ reject                                                                           | ❌ **ACCEPT, exit 0**                           | ✅ auto                                              | ✅ good introspection API                                                                    | ✅ struct tags                             | ✅ `choice:`                                      | ⚠️                                               | ✅                                            | ❓                                                                  |
| stdlib `flag`             | Go         | ✅ reject, exit 2                                                                   | ❌ **ACCEPT, exit 0**                           | ⚠️ minimal                                           | ❌                                                                                           | ❌                                         | ❌                                                | ❌                                               | ⚠️                                            | ~binary speed ✅                                                    |
| **`argparse`**            | Python     | ✅ reject, exit 2 — but ⚠️ **`allow_abbrev=True` accepts `--verb` for `--verbose`** | ✅ reject                                       | ✅ auto                                              | ❌ private `_actions` only                                                                   | ❌ `Namespace`, untyped                    | ⚠️ `type=`, `choices=`                            | ⚠️ 3rd-party                                     | ⚠️ must catch `SystemExit`                    | **19.19 ms** ✅                                                     |
| **`click`**               | Python     | ✅ **reject, exit 2**                                                               | ✅ **reject, exit 2**                           | ✅ auto                                              | ✅✅ **`to_info_dict()` — built-in, recursive, directly JSON-serializable, enums preserved** | ❌ untyped kwargs                          | ⚠️ `type=`, `Choice`                              | ✅ completions; man via 3rd party                | ✅ **`CliRunner`**                            | **27.70 ms** ✅                                                     |
| **`typer`** ≥0.26         | Python     | ✅ reject, exit 2                                                                   | ✅ reject                                       | ✅ auto from type hints                              | ❌ **`to_info_dict()` REMOVED — vendored Click in 0.26.0**                                   | ⚠️ hints are real but unchecked at runtime | ⚠️ click's + `Annotated`                          | ✅ + `utils docs` (Markdown only)                | ✅ own `CliRunner` (not click's)              | **36.21 ms** ✅ (⚠️ Rich boxes on non-TTY stderr; `--help` = 84 ms) |
| `pydantic-settings`       | Python     | ✅ reject, exit 2 (**sets `allow_abbrev=False`**)                                   | ✅ reject                                       | ✅ auto from model                                   | ✅✅ **real JSON Schema w/ constraints**                                                     | ✅✅ validated model instance              | ✅✅ full pydantic                                | ❌                                               | ✅ `CliApp.run(cli_args=)`                    | **87.07 ms** ✅                                                     |
| `cyclopts`                | Python     | ✅ reject — but **exit 1**, not 2                                                   | ✅ reject, exit 1                               | ✅ auto                                              | ⚠️ typed collection, not JSON-able                                                           | ✅ annotations                             | ✅ `validator=`                                   | ❓                                               | ⚠️ redirect yourself                          | **46.79 ms** ✅                                                     |
| `fire`                    | Python     | ✅ reject                                                                           | 🔴 **exit 0, binds `str` to a `bool` param**    | ⚠️ runtime reflection                                | ❌                                                                                           | 🔴 **unsafe**                              | ❌                                                | ❓                                               | ⚠️                                            | **40.95 ms** ✅                                                     |
| `docopt-ng`               | Python     | 🔴 **accepts abbreviations**                                                        | ✅ reject, exit 1                               | inverted (docstring is spec)                         | ❌                                                                                           | ❌ all strings                             | ❌                                                | ❓                                               | ⚠️                                            | **19.06 ms** ✅                                                     |
| `plumbum.cli`             | Python     | ✅ reject, exit 2                                                                   | ✅ reject                                       | ✅ auto                                              | ❌ private only                                                                              | ⚠️                                         | ⚠️                                                | ✅ built-in                                      | ⚠️ 🔴 **errors→stdout**                       | **50.36 ms** ✅                                                     |
| `tyro`                    | Python     | ✅ reject, exit 2                                                                   | ✅ reject                                       | ✅ auto                                              | ⚠️ `get_parser()` **deprecated** → argparse `_actions`                                       | ✅ dataclasses                             | ⚠️ type-driven                                    | ❓                                               | ⚠️                                            | **49.11 ms** ✅                                                     |
| **`node:util parseArgs`** | TS/JS      | ✅ **throw (`strict:true` default)**                                                | ✅ **throw (`allowPositionals:false` default)** | ❌ none at all                                       | ❌ none (you own the config object)                                                          | ⚠️ union-typed result                      | ❌ BYO                                            | ❌                                               | ✅ (pure function)                            | **13.37 ms** ✅                                                     |
| **`commander` ≥13**       | TS/JS      | ✅ **reject, exit 1**                                                               | ✅ **reject, exit 1** (changed in v13.0.0)      | ✅ auto                                              | ⚠️ tree walkable via **semi-private** fields                                                 | ⚠️ `any`-ish unless `extra-typings`        | ❌ BYO                                            | ⚠️ partial                                       | ✅ **`exitOverride()` + `configureOutput()`** | **21.86 ms** ✅                                                     |
| **`yargs`**               | TS/JS      | ❌ **ACCEPTS, exit 0**                                                              | ❌ **ACCEPTS, exit 0**                          | ✅ auto                                              | ❌ awkward                                                                                   | ⚠️ inferred, leaky                         | ✅ `check`, `coerce`, `demandOption`              | ✅                                               | ✅ callback form                              | **33.24 ms** ✅                                                     |
| **`cac`**                 | TS/JS      | ✅ **reject, exit 1**                                                               | ✅ **reject, exit 1**                           | ✅ auto                                              | ⚠️ walkable                                                                                  | ❌ loose                                   | ❌ BYO                                            | ❌                                               | ⚠️ throws raw `CACError`                      | **13.12 ms** ✅                                                     |
| **`citty`**               | TS/JS      | ❌ **ACCEPTS SILENTLY, exit 0**                                                     | ❌ **ACCEPTS SILENTLY, exit 0**                 | ✅ auto                                              | ✅ **definition IS plain JSON-serializable data**                                            | ⚠️ inferred from `args` def                | ⚠️ enum + required only                           | ❌                                               | ✅ `runCommand()`                             | **16.58 ms** ✅                                                     |
| **`clipanion` v4**        | TS/JS      | ✅ reject, exit 1 (⚠️ **error to stdout**)                                          | ✅ reject, exit 1                               | ✅ auto                                              | ⚠️ class decorators, awkward                                                                 | ✅ strong compile-time                     | ⚠️ `typanion`                                     | ⚠️ partial                                       | ✅ custom streams                             | **21.90 ms** ✅                                                     |
| **`@stricli/core`**       | TS/JS      | ✅ **reject, exit 252**                                                             | ✅ **reject, exit 252**                         | ✅ auto                                              | ⚠️ walkable-ish                                                                              | ✅ **strongest compile-time typing in TS** | ✅ `parse` fns                                    | ✅                                               | ✅ injectable `process`                       | **23.78 ms** ✅                                                     |
| **`gunshi`**              | TS/JS      | ❌ **ACCEPTS, exit 0**                                                              | ❌ **ACCEPTS, exit 0**                          | ✅ auto                                              | ⚠️ plain data-ish                                                                            | ⚠️                                         | ⚠️                                                | ❌                                               | ✅                                            | ~14.6 ms ✅                                                         |
| **`oclif`**               | TS/JS      | ✅ reject                                                                           | ✅ reject (`static strict = true`)              | ✅ auto                                              | ✅ **`oclif.manifest.json` — real published artifact**                                       | ⚠️ decent                                  | ⚠️                                                | ✅                                               | ✅ `@oclif/test`                              | heavy ❓                                                            |
| **Swift ArgumentParser**  | Swift      | ✅ **reject + "did you mean"**                                                      | ✅ **reject**                                   | ✅ auto                                              | ✅✅ **`--experimental-dump-help` → versioned `ToolInfoV0` JSON**                            | ✅ precise structs/enums                   | ✅ built-in                                       | ✅                                               | ✅                                            | **4.27 ms** ✅                                                      |
| **`picocli`**             | Java       | 📖 reject (`UnmatchedArgumentException`)                                            | 📖 reject                                       | ✅ auto                                              | ⚠️ `getCommandSpec()` introspection; codegen emits GraalVM cfg + man                         | ✅ annotated fields                        | ✅ rich                                           | ✅ full                                          | ✅                                            | JVM startup ❓                                                      |
| **jdx `usage`**           | spec (KDL) | n/a — spec, not a parser                                                            | n/a                                             | ✅ generates docs/man                                | ✅✅ **`usage generate json` + `json-schema`**                                               | n/a                                        | declarative                                       | ✅✅ all shells                                  | n/a                                           | n/a                                                                 |

---

## 2. Per-framework notes on enforcement

This is the axis that matters most, so here is the verified detail.

### 2.1 The headline empirical result (TypeScript, all measured on this machine)

Every one of these is a two-subcommand CLI with a `<target>` positional and a `--format` option, invoked as `build mytarget --nonexistent-flag` and `build mytarget extrapositional`, run under Bun 1.3.14.

| Library                | `--nonexistent-flag`                                                                         | extra positional                                                                    |
| ---------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `commander` 15.0.0     | **EXIT 1** — `error: unknown option '--nonexistent-flag'`                                    | **EXIT 1** — `error: too many arguments for 'build'. Expected 1 argument but got 2` |
| `yargs` 18.1.0         | **EXIT 0** — silently ignored, handler ran normally                                          | **EXIT 0** — silently ignored                                                       |
| `cac` 7.0.0            | EXIT 1 — but raw `CACError` stack trace with library source printed                          | EXIT 1 — same raw stack trace                                                       |
| `citty` 0.2.2          | **EXIT 0** — flag passed straight through as `{"nonexistent-flag": true}`                    | **EXIT 0** — extra positional appears in `_`                                        |
| `clipanion` 4.0.0-rc.4 | EXIT 1 — `Unknown Syntax Error: Unsupported option name` (**written to stdout, not stderr**) | EXIT 1 — `Extraneous positional argument` (also stdout)                             |
| `@stricli/core` 1.3.0  | **EXIT 252** — `No flag registered for --nonexistent` (stderr)                               | **EXIT 252** — `Too many arguments, expected 1 but encountered "extra"`             |
| `gunshi` 0.37.1        | **EXIT 0** — ignored                                                                         | **EXIT 0** — ignored                                                                |
| `node:util parseArgs`  | EXIT 1 — `ERR_PARSE_ARGS_UNKNOWN_OPTION` thrown                                              | EXIT 1 — `Unexpected argument ... does not take positional arguments`               |

Three things fall out of this that are directly relevant to the spec:

- **The failure mode of a lenient parser is the worst possible one for an agent.** `citty`, `yargs` and `gunshi` return **exit 0** and run the command anyway. An agent that typos a flag gets a _successful-looking_ result that silently did the wrong thing. There is no signal to retry on. `citty` is worse than `yargs` here because it actively injects the bogus flag into the args object, so downstream code can see garbage. (The single worst case found anywhere in this survey is not in JavaScript at all — it is cobra's non-runnable nested group, which exits 0 _and prints help text to stdout_. See §2.5.)
- **Exit codes are not standardized.** commander/cac/clipanion use 1, clap uses 2, stricli uses **252**. A conformance kit must pin this, because agents are increasingly trained to read exit codes as categories.
- **Stream discipline is not standardized.** `clipanion` writes usage errors to **stdout**. If an agent is piping stdout to a JSON parser, a usage error becomes corrupt data rather than a clean error. `cac` throws an uncaught `CACError` whose Bun-rendered stack trace includes library source lines — dozens of wasted tokens and no machine-readable error shape.

### 2.2 `commander` — strict, but only recently, and by version

Verified: commander 15 rejects both unknown flags and excess positionals. But the excess-positional default **changed**. From the commander CHANGELOG:

> **13.0.0 (2024-12-30):** "excess command-arguments cause an error by default"
> Migration notes: "It is now an error for the user to specify more command-arguments than are expected. (`allowExcessArguments` is now false by default.)"

Before v13 (i.e. any CLI written against commander 7–12 and not upgraded) extra positionals were **silently accepted**. This is exactly the sort of silent default-drift a conformance kit exists to catch: the same source code has different strictness depending on the installed major version. `allowUnknownOption()` has always been opt-in-to-leniency, so unknown _flags_ have been rejected for a long time.

In-process testability is genuinely good and verified working:

```ts
p.exitOverride();
p.configureOutput({ writeOut: (s) => (out += s), writeErr: (s) => (err += s) });
try {
  p.parse(["build", "x", "--bogus"], { from: "user" });
} catch (e) {
  /* e.code === "commander.unknownOption", e.exitCode === 1 */
}
```

Captured: `ERR: "error: unknown option '--bogus'\n"`, `e.code = commander.unknownOption`, `e.exitCode = 1`. No subprocess needed.

### 2.3 `citty` — best schema shape in TS, zero enforcement

This is the sharpest finding in the TypeScript ecosystem, and it matters because `citty` is the modern unjs default.

Reading `node_modules/citty/dist/index.mjs:133–172`, `parseArgs()` builds an options object for a `mri`-style raw parser and then post-validates exactly three things: missing required positionals, enum membership (`type: "enum"` with `options`), and missing required flags. **There is no check anywhere for unknown flags or excess positionals.** The only `Unknown` string in the whole dist bundle is at line 216 — `Unknown command` for an unrecognized _subcommand_.

The irony is that citty has the _best schema story_ of any TS library, because a citty command is literally a plain data object. `JSON.stringify({meta, args, subCommands})` produced a complete, correct schema on the first try with no framework support at all:

```json
{ "meta": {"name":"demo","version":"1.0.0","description":"demo cli"},
  "subCommands": { "build": { "meta": {...}, "args": {
      "target": {"type":"positional","description":"target"},
      "format": {"type":"enum","options":["json","text"],"default":"text"},
      "jobs":   {"type":"string","default":"4"} } } } }
```

So citty is _schema yes / enforcement no_ — the exact inverse of what we need, and a strong argument that a thin strict-parsing layer over a citty-shaped data definition is a viable design.

### 2.4 `node:util parseArgs` — strict by default, but it is not a framework

Verified on both Bun and Node 24: with no options passed at all, `parseArgs` throws `ERR_PARSE_ARGS_UNKNOWN_OPTION` on `--bogus` and `Unexpected argument 'build'. This command does not take positional arguments` on a positional. So `strict: true` and `allowPositionals: false` are both the defaults — the most conservative posture of anything surveyed.

But it gives you _nothing else_: no help generation, no subcommands, no exit-code handling, no error formatting. It throws a raw `TypeError`. It is the correct **substrate** and not a framework.

### 2.5 `cobra` — the most dangerous defaults in the survey

Cobra is the ecosystem default and it has **two independent, inconsistent argument-check paths**, which produce silent-success holes that no amount of care at one call site will close.

Verified on a real cobra 1.10.2 binary:

```
unknown flag                → EXIT 1, "Error: unknown flag: --bogus"
unknown subcommand at ROOT  → EXIT 1, "Error: unknown command \"bogus\" for \"demo\"" (+ Did you mean)
extra positional            → EXIT 1, "Error: accepts 1 arg(s), received 2"   [ONLY with Args: cobra.ExactArgs(1)]
```

That last line is the trap. **Cobra's `Args` field defaults to nil, and nil means "accept anything."** With defaults, on a three-level tree (`n` → `grp` → `leaf`, all `Args` nil):

```
$ ./nested_cli grp bogus         → EXIT 0   GRP RUN args=["bogus"]
$ ./nested_cli grp bogus extra   → EXIT 0   GRP RUN args=["bogus","extra"]
$ ./nested_cli grp2 bogus        → EXIT 0   <help text printed to stdout>
```

The source explains why. `legacyArgs()` (`args.go:28–39`) is called during command resolution:

```go
func legacyArgs(cmd *Command, args []string) error {
	if !cmd.HasSubCommands() { return nil }        // leaf: accept ANYTHING
	if !cmd.HasParent() && len(args) > 0 {         // ONLY the root is checked
		return fmt.Errorf("unknown command %q for %q%s", ...)
	}
	return nil
}
```

The `!cmd.HasParent()` guard means **only the root rejects unknown subcommands**. Every nested group falls through silently. And the second path, `ValidateArgs()` (`command.go:1172–1177`), begins `if c.Args == nil { return ArbitraryArgs(c, args) }` — accept everything.

The `grp2` case is the worst thing found in this entire survey: **exit 0, with help text on stdout.** A non-runnable group returns `flag.ErrHelp` (`command.go:955–956`), which `command.go:1152–1155` converts into `HelpFunc(); return cmd, nil` — a **nil error**. An agent that mistypes a subcommand under a group gets exit 0 and a wall of help text where it expected data. If it is piping stdout to a JSON parser, it gets garbage; if it is checking the exit code, it gets "success."

The fix works but must be applied to **every node** — there is no global strict switch. With `Args: cobra.NoArgs` on root, group and leaf, all holes close (`grp bogus`→1, `bogus`→1, `grp leaf extra`→1, bare `grp`→1).

**`FParseErrWhitelist.UnknownFlags` is actively dangerous** and should be banned outright by the spec. It controls only pflag's unknown-flag rejection (`command.go:205` → `command.go:1880` → `pflag/flag.go:995–1005`), and it swallows the flag's _value_ too via `stripUnknownFlagValue`. Verified: `sub --nonexistent somevalue --flag real` with the whitelist on yielded `err=nil, flag="real", args=[]` — both `--nonexistent` **and** `somevalue` vanished without trace.

**Required flags are runtime-only and string-keyed.** `MarkFlagRequired` sets a `BashCompOneRequiredFlag` annotation (`shell_completions.go:39`) checked in `ValidateRequiredFlags` (`command.go:1188`). A typo in the flag name is not a compile error.

**Type safety is cobra's other weak spot.** Verified:

```
GetString("flag")  → "v"  err=<nil>
GetString("flga")  → ""   err=flag accessed but not defined: flga     # typo
GetString("count") → ""   err=trying to get string value of flag of type int
```

Both failures are runtime-only, and the universal idiom `f, _ := cmd.Flags().GetString("flag")` discards the error, so a typo yields a silent empty string. `urfave/cli` is worse still: `c.String("flga")` returns `""` with **no error at all** in both v2 and v3.

Cobra does expose a genuinely machine-readable side channel — the hidden `__complete` command (`completions.go:31–34`):

```
$ demo __complete ""                     $ demo __complete other --mode ""
build	build it                          fast	run quickly
deploy	deploy it                         slow	run carefully
help	Help about any command            :4
:4
Completion ended with directive: ShellCompDirectiveNoFileComp   ← stderr
```

Protocol: argv is `__complete <args...> <toComplete>`; stdout is `value\tdescription` lines terminated by `:<directive-bitmask>`; the human trailer goes to stderr; **exit code is always 0**. Directives are a bitfield: `Error=1, NoSpace=2, NoFileComp=4, FilterFileExt=8, FilterDirs=16, KeepOrder=32, Default=0`. Note that an unknown command path returns `:0` (Default), **not** `:1` (Error) — so an agent cannot use the directive to detect a bad path. It enumerates the tree but carries no types, no required-ness, no defaults. It is a completion protocol, not a schema.

### 2.5b `kong` — the strictest thing in Go, and the best Go schema story

Every malformed input errors, exit code **80** (`exit.go:10`, `exitUsageError`; runtime errors → 1). No opt-in required:

```
sub --nonexistent  → kcli: error: unknown flag --nonexistent
bogus              → kcli: error: unexpected argument bogus
other extra1       → kcli: error: unexpected argument extra1
other --mode nope  → kcli: error: --mode must be one of "fast","slow" but got "nope"
(no args)          → kcli: error: expected one of "sub", "other"
```

Kong binds to typed struct fields, so a typo'd read is a **compile** error, and it has built-in `enum`, `xor`, `and`, `required`, `default`, `env`, and type mappers including `existingfile`. `kong.Model`/`kong.Node` (`model.go:38–60`) is a genuine walkable AST (`Type`, `Flags []*Flag`, `Positional []*Positional`, `Children []*Node`), and `Flag` also carries `Xor`, `And`, `Envs`, `Aliases`, so mutual exclusion is exportable. ~40 lines produces a complete typed tree with enums. It has **zero third-party dependencies**. Its only real gaps are completions and man pages (third-party: `kongplete`).

### 2.5c Other Go libraries, briefly

- **`urfave/cli` v2 and v3:** reject unknown flags (exit 1) but **silently run the root action on an unknown subcommand (exit 0)** and never reject extra positionals. Even with v3's `Arguments` declared, `Max` merely _stops consuming_ — leftovers are stashed in `cmd.parsedArgs` with no error (`args.go:151–207`, `command_run.go:363–380`). Redeeming feature: every `Command` and flag field carries `json:"..."` tags (`command.go:33–146`), so **`json.Marshal(cmd)` yields a full tree for free** — names, usage, `required`, `hidden`, `defaultValue`, `aliases`, nested `commands`. No explicit type field though; type is only inferable from the JSON type of `defaultValue`.
- **stdlib `flag`:** rejects unknown flags (exit 2) but never rejects extra positionals, and — the classic corruption — **stops parsing at the first non-flag**: `./stdcli sub extra1 --flag hi` → exit 0, `flag="" args=["extra1","--flag","hi"]`. `--flag hi` was silently demoted to positional data. Cobra and kong both handle this correctly.
- **`kingpin` v2:** second-strictest library tested (strict on all four axes, built-in `.Enum()`/`.ExistingFile()`), but the README now reads "CONTRIBUTIONS ONLY" and the author states he uses **kong** instead. Effectively frozen.
- **`go-flags`:** strict on flags and subcommands, has `choice:` validation and good introspection, but **accepts extra positionals (exit 0)**.
- **`ff` v4:** weakest — no required flags, no types in its `Flag` interface, same root-action fall-through. In beta since 2023.
- **`mitchellh/cli`:** **archived 2024-07-22**, and it does no flag parsing at all — it is only a dispatcher. Verified: `./bin_mcli sub --flag hello` passed `["--flag","hello"]` raw to `Run`. Do not build on it.
- **`charmbracelet/fang` v1.0.0:** exists, and is a **cobra wrapper, not a parser** (`fang.Execute(ctx, root *cobra.Command, ...)`, `fang.go:110`). It adds styled help/errors, auto `--version`, a hidden `man` command and completions. It **changes nothing about parsing**: verified `./bin_fangcli grp bogus` → **exit 0**, identical to bare cobra, while adding ANSI styling to output that agents must parse.

The definitive statement of cobra's schema ceiling is [spf13/cobra#2362](https://github.com/spf13/cobra/issues/2362), an issue specifically about generating MCP tool schemas from a cobra tree. Recoverable from `pflag.Flag`: type (`Value.Type()`), description (`Usage`), default (`DefValue`), required (via the `MarkFlagRequired` annotation) — the author estimates ~80% of a schema. **Not recoverable:** enum/choice values ("The closest cobra has to `Enum` is `RegisterFlagCompletionFunc`, but it registers a _function_ (for dynamic completion), not a static list"), and numeric bounds ("There's no cobra equivalent"). That 20% gap is the interesting part of a schema.

### 2.6 `clap` v4 derive — best-in-class enforcement, no schema dump

Verified on a real release binary (419 KB, `opt-level="z"`, LTO, strip, `panic=abort`):

```
--bogus            → EXIT 2, "error: unexpected argument '--bogus' found"  + tip about `--`
extra positional   → EXIT 2, "error: unexpected argument 'extra' found"
--format xml       → EXIT 2, "error: invalid value 'xml' for '--format <FORMAT>' [possible values: json, text]"
deploy (no --env)  → EXIT 2, "error: the following required arguments were not provided: --env <ENV>"
--form json        → EXIT 2, "error: unexpected argument '--form' found  tip: a similar argument exists: '--format'"
```

That last one is the important one. clap **suggests** `--format` but **does not accept** the abbreviation. Contrast with Python's `argparse`, whose `allow_abbrev=True` default _silently accepts_ unambiguous prefixes — a genuine hazard for agent-first CLIs, because an agent hallucinating `--verb` for `--verbose` gets rewarded rather than corrected, and the behavior changes as soon as you add a second flag with that prefix.

Required-ness in clap derive is enforced **at runtime**, not compile time — but the _destructuring_ is compile-time: a `Deploy { env: String }` variant cannot be constructed without an `env`, so the framework has no choice but to enforce it. That is the strongest form of "the type system makes the check unavoidable" available in any surveyed ecosystem.

**Confirmed defaults**, read from `Command`'s public getters: `allow_external_subcommands` false, `ignore_errors` false, `allow_hyphen_values` false, `trailing_var_arg` false, `infer_subcommands` false, `infer_long_args` false. There is no `deny_unknown` setting — `grep -rn "deny_unknown"` across `clap_builder-4.6.6/src/` returns **zero hits**, because it would be a no-op: every permissive behavior is an opt-in bitflag on `AppFlags(u32)`, which `#[derive(Default)]`s to `0` (`builder/app_settings.rs:6–7`). **Strictness is clap's zero value.**

The five settings a conformance kit must assert are OFF, each verified to break agent-safety when on:

| Setting ON                                 | effect on `--nonexistent`                              |
| ------------------------------------------ | ------------------------------------------------------ |
| `ignore_errors(true)`                      | **accepted silently**                                  |
| `allow_hyphen_values(true)` + a positional | **accepted silently** (absorbed as a value)            |
| `trailing_var_arg(true)`                   | **accepted silently**                                  |
| `infer_long_args(true)`                    | `--fl x` **silently binds `--flag`**                   |
| `allow_external_subcommands(true)`         | flags still rejected; **unknown subcommands accepted** |

#### 2.6a Proof: I wrote the clap schema exporter, and it is 31 lines

Because the entire recommendation in §6 rests on "clap's missing schema dump is cheap to add," I built it rather than asserting it. Written against clap 4's **public** API (`Command::get_subcommands`/`get_arguments`/`get_name`/`get_version`/`get_about`/`get_all_aliases`/`is_hide_set`, and `Arg::get_id`/`is_positional`/`get_action().takes_values()`/`get_long`/`get_short`/`get_help`/`get_long_help`/`is_required_set`/`is_hide_set`/`is_global_set`/`get_value_names`/`get_possible_values`/`get_default_values`), added as a `schema` subcommand. Actual output from the running binary:

```json
{
  "name": "demo",
  "about": "demo cli",
  "subcommands": [
    {
      "name": "build",
      "about": "build it",
      "args": [
        {
          "id": "target",
          "kind": "positional",
          "help": "target to build",
          "required": true,
          "hidden": false,
          "global": false,
          "value_names": ["TARGET"],
          "possible_values": null,
          "defaults": []
        },
        {
          "id": "format",
          "kind": "option",
          "long": "format",
          "short": null,
          "help": "output format",
          "required": false,
          "hidden": false,
          "value_names": ["FORMAT"],
          "possible_values": ["json", "text"],
          "defaults": ["text"]
        }
      ]
    },
    {
      "name": "deploy",
      "about": "deploy it",
      "args": [
        {
          "id": "env",
          "kind": "option",
          "long": "env",
          "help": "environment",
          "required": true,
          "value_names": ["ENV"],
          "possible_values": null,
          "defaults": []
        }
      ]
    }
  ]
}
```

**Measured cost:**

|                                      |    before |                                 after |
| ------------------------------------ | --------: | ------------------------------------: |
| exporter source                      |         — |                **31 non-blank lines** |
| binary size (incl. `serde_json`)     | 419,648 B |       **436,336 B (+16.7 KB, +4.0%)** |
| startup, `build t`                   |   2.31 ms | **2.02 ms** (unchanged, within noise) |
| strictness                           |    strict | **still strict** (`--bogus` → exit 2) |
| schema output for a 2-subcommand CLI |         — |                           1,907 bytes |

Note what survives the round trip: the option-vs-positional-vs-flag distinction, **enum variants** (`possible_values: ["json","text"]` — recovered from a `#[derive(ValueEnum)]` with no extra annotation), defaults, required-ness, hidden markers, global flags, value names and recursive nesting. That is content-parity with Swift's `ToolInfoV0` and Click's `to_info_dict()`.

**Honest limits, cross-validated by an independent Rust survey that built the same thing:**

| Lost                                                                                                                       | Why                                                                                                                                                                                                                                                                                                                                             |
| -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`value_parser` range bounds** (`0..=10`)                                                                                 | The killer. `ValueParser`'s `Debug` for the `Other` variant prints only a type id — `value_parser.rs:573`: `write!(f, "ValueParser::other({:?})", o.type_id())`. It does not delegate to `RangedI64ValueParser`'s derived `Debug`. You get an opaque hash, not even a type _name_. **The range exists only in the help string you hand-wrote.** |
| `Arg::get_requires`                                                                                                        | **No public getter** — `requires()` is a setter only                                                                                                                                                                                                                                                                                            |
| `Arg::get_all_conflicts`                                                                                                   | not reachable; use `Command::get_arg_conflicts_with(&arg)` instead                                                                                                                                                                                                                                                                              |
| `Arg::get_env`                                                                                                             | `#[cfg(feature = "env")]` at `arg.rs:4400` — **works once you enable the feature**                                                                                                                                                                                                                                                              |
| `is_ignore_errors_set`, `is_allow_hyphen_values_set` (Command-level), `is_infer_subcommands_set`, `is_infer_long_args_set` | all `pub(crate)` (`command.rs:4133`, `:4211`, `:4194`, `:4189`) — readable only behaviorally                                                                                                                                                                                                                                                    |
| `ArgGroup::is_multiple`                                                                                                    | takes `&mut self`, unusable on a borrowed tree                                                                                                                                                                                                                                                                                                  |

**One correction to my own exporter above: call `Command::build()` first.** It is public (`command.rs:4388`) and materially changes the result — positional `index` goes from `null` to `1`, `2`; `num_args` populates with `{min,max}`; global args propagate onto subcommands. The cost is that auto-injected `help`/`version` args appear and must be filtered.

**ValueEnum recovery is better than I demonstrated.** `get_possible_values()` also returns `#[value(name=…)]` renames, **all aliases**, the per-variant `hide` flag, and **per-variant doc-comment help**:

```
variant name="fast"          hide=false  help="the fast one"        aliases=["fast","quick","f"]
variant name="legacy"        hide=true   help="hidden legacy mode"  aliases=["legacy"]
```

**Two existing exporters I was wrong to overlook:**

- **`carapace_spec_clap` 1.2.3** is a real, published clap schema exporter with a **published JSON Schema** (`https://carapace.sh/schemas/command.json`). Reached via `clap_allgen 0.2.1 --features carapace`. It emits recursive YAML with required-ness (`--name!=`), defaults, enum values with descriptions, value hints (`$files`), and — usefully — a `persistentflags` block distinguishing global from local flags. Crucially it implements `clap_complete::Generator`, **so it drops into any existing `generate()` call site**. This is the pattern to copy for our own exporter.
- **`clap_complete_fig` 4.5.2** still works but is dead upstream — [clap#5871](https://github.com/clap-rs/clap/pull/5871) removed it 2025-01-07 after Fig's Amazon acquisition ("Fig is sunsetted", [#5395](https://github.com/clap-rs/clap/issues/5395)). Its `Fig.Spec` key set remains the best-tested field inventory around and is worth mining. It marks everything `isOptional: true` and drops defaults, so it is not usable as-is.

Names that do **not** exist on crates.io: `clap-json`, `clap-introspect`, `clap-schema`, `clap-reflect`, `clap-dump`, `clap-to-json`. **`clap-serde` goes the opposite direction** (deserialize a clap app _from_ serde) and is clap-v3-only. `clap_describe` 0.1.1 is exactly the right idea but its only two releases are 8 minutes apart (2026-03-05) with nothing since — do not depend on it.

**Upstream has explicitly declined to solve this**, which is the opening. [clap#6235](https://github.com/clap-rs/clap/issues/6235) requested schema export and epage closed it in 19 minutes:

> "The first question is which schema? There have been many different attempts at schemas for CLIs. We could invent our own but how we've described our CLIs has changed over time and then we'd need to deal with how to allow evolution of this. clap does offer accessors so people can experiment with schema generation outside of clap."

His companion catalogue ([discussion #6301](https://github.com/clap-rs/clap/discussions/6301)) lists clap-serde YAML, clap v2 YAML, CWL, docopt and jdx Usage — **all five are _input_ formats; not one is an exporter.** Searching the clap repo for `MCP` or `agent LLM` returns **zero results**; there is no upstream conversation about LLM consumption at all.

The conclusion stands: **for a 4% binary increase, zero startup cost, and 31 lines, clap gains the one leg it was missing.**

#### 2.6b Two clap traps that only appear in release builds

These are the most important conformance findings in the Rust section, because both are invisible in development.

**Trap 1: `debug_assert()` is compiled out in release, and a malformed CLI definition silently passes.** clap's definition validation lives in `builder/debug_asserts.rs:110`, gated by `#[cfg(debug_assertions)]` (`command.rs:33`). Two args declaring the same `long = "dup"` compiles cleanly and produces a working binary. The same test:

```
cargo test            → FAILED: "Long option names must be unique for each argument,
                                 but '--dup' is in use by both 'a' and 'b'"
cargo test --release  → test definition_valid ... ok        ← NO-OP, silently passes
```

**The spec must mandate that `Cli::command().debug_assert()` runs in a debug-profile test.** In release it asserts nothing.

**Trap 2: a typo'd arg id in the builder API reads as "flag absent" in release.**

| call                                  | debug      | release             |
| ------------------------------------- | ---------- | ------------------- |
| `get_one::<u16>("n")` (correct)       | `Some(42)` | `Some(42)`          |
| `get_one::<String>("n")` (wrong type) | panics     | panics              |
| `get_one::<String>("typo_id")`        | panics     | **silently `None`** |

This is structurally the same bug as cobra's `GetString("flga")` → `""`. **The derive API is immune** — field access is compile-time checked. The spec should mandate derive and forbid raw `ArgMatches` lookups.

What clap lacks is a schema dump. There is **no built-in dump and no standard schema shape** — but the introspection API is rich enough that this is a small gap, and I closed it to check.

#### 2.6c The `argh` surprise — it already has schema export, on by default

`argh` 0.1.19 has `Top::get_args_info()` → `ArgsInfo`, which serializes to a **full recursive JSON tree**, and **`serde` is a default feature**:

```json
{
  "name": "Top",
  "description": "top level",
  "flags": [
    {
      "kind": "Switch",
      "optionality": "Optional",
      "long": "--verbose",
      "short": "v"
    }
  ],
  "commands": [
    {
      "name": "build",
      "command": {
        "flags": [
          {
            "kind": { "Option": { "arg_name": "target" } },
            "optionality": "Required",
            "long": "--target"
          }
        ]
      }
    }
  ]
}
```

It costs **0 bytes unless called** (the `Serialize` impls dead-strip). argh is also the only Rust crate enforcing spec-style rules **at compile time**: a missing doc comment, a duplicate long name, or a non-kebab-case long name are all hard compile errors — enforcement clap only does via `debug_assert`, which release builds skip.

Two warts: top-level `"name"` is the **Rust struct name** (`"Top"`), not the binary name, and `"short"` uses a `"�"` NUL sentinel instead of `null` at the command level. The disqualifying gaps: **it loses default values and enum value sets** — `#[derive(FromArgValue)]` validates at runtime but exposes the legal values in neither help nor schema.

So argh is the credible runner-up: better compile-time enforcement and a built-in dump, worse schema content.

#### 2.6d A design option worth considering: the binary as a _context-sensitive_ oracle

Separate from a static schema dump, `clap_complete::engine::complete()` (`engine/complete.rs:15`) is a **structured, shell-agnostic** API returning `Vec<CompletionCandidate>` with `get_value()`, `get_help()`, `get_id()` and `get_tag()`. A `--complete-json` endpoint is ~15 lines:

```json
[
  {
    "value": "--flag",
    "help": "A required-ish flag with a value",
    "id": "arg::flag",
    "tag": "Options"
  },
  { "value": "text", "help": "Human readable text", "tag": "--format <FORMAT>" }
]
```

This answers "what is legal _at this point_ in the command tree" rather than "what does the whole tree look like" — with stable ids and help text, derived entirely from the definition. For an agent doing iterative construction of an invocation, that is arguably more useful than a static dump, and it is a genuine differentiator versus cobra's `__complete` (which carries no types and always exits 0). Measured callback latency: **2.35 ms**.

Two caveats: it is still gated behind the **`unstable-dynamic`** feature in clap_complete 4.6.9, two years after landing; and epage's design rationale for using an env var rather than a subcommand ([PR #5671](https://github.com/clap-rs/clap/pull/5671)) was to avoid "interfering with CLI parsing validation" — directly relevant if the spec mandates a `schema` _subcommand_, since that consumes a name in the tool's namespace.

### 2.7 Swift ArgumentParser — the most complete package

Verified by building a real binary. Strictness first:

```
--nonexistent-flag → "Error: Unknown option '--nonexistent-flag'"
extra positional   → "Error: Unexpected argument 'extrapositional'"
--format xml       → "Error: The value 'xml' is invalid for '--format <format>'. Please provide one of 'json', 'text' or 'yaml'."
deploy (no --env)  → "Error: Missing expected argument '--env <env>'"
--form json        → "Error: Unknown option '--form'. Did you mean '--format'?"
```

Same posture as clap: strict, with suggestions but no silent abbreviation. And then the thing nothing else has — `--experimental-dump-help`:

```json
{
  "command": {
    "commandName": "swiftcli",
    "abstract": "A demo CLI for schema-export research.",
    "subcommands": [
      {
        "commandName": "build",
        "abstract": "Build the thing.",
        "superCommands": ["swiftcli"],
        "arguments": [
          {
            "kind": "positional",
            "valueName": "target",
            "abstract": "Target to build.",
            "isOptional": false,
            "isRepeating": false,
            "parsingStrategy": "default",
            "shouldDisplay": true
          },
          {
            "kind": "option",
            "valueName": "format",
            "abstract": "Output format.",
            "allValues": ["json", "text", "yaml"],
            "completionKind": {
              "list": { "values": ["json", "text", "yaml"] }
            },
            "defaultValue": "text",
            "isOptional": true,
            "isRepeating": false,
            "names": [
              { "kind": "short", "name": "f" },
              { "kind": "long", "name": "format" }
            ],
            "preferredName": { "kind": "long", "name": "format" },
            "shouldDisplay": true
          }
        ]
      }
    ]
  },
  "serializationVersion": 0
}
```

Every field an agent needs is present: help text, `kind` (flag/option/positional), **`isOptional`** (required-ness), `isRepeating`, **`allValues`** (enum cases — the exact thing cobra cannot express), `defaultValue`, short and long names, `shouldDisplay` (hidden-flag filtering), recursive `subcommands`, and a **`serializationVersion`**.

Crucially the schema is not ad-hoc: it is a declared public Swift type, `ToolInfoV0` in the dedicated `ArgumentParserToolInfo` module, which is `Codable` — emittable _and_ consumable. From `Sources/ArgumentParserToolInfo/ToolInfo.swift`: `ToolInfoHeader { serializationVersion }`, `ToolInfoV0 { serializationVersion, command }`, `CommandInfoV0 { superCommands, shouldDisplay, commandName, aliases, abstract, discussion, defaultSubcommand, subcommands, arguments }`, `ArgumentInfoV0 { kind, shouldDisplay, sectionTitle, isOptional, isRepeating, parsingStrategy, names, preferredName, valueName, defaultValue, allValues, allValueDescriptions, completionKind, abstract, ... }`, with enums `KindV0 {positional, option, flag}`, `NameInfoV0.KindV0 {long, short, longWithSingleDash}`, `ParsingStrategyV0 {default, scanningForValue, unconditional, upToNextOption, allRemainingInput, postTerminator, allUnrecognized}`, and `CompletionKindV0 {list, file, directory, shellCommand, custom, customAsync, customDeprecated}`.

**The caveat, and it is a real one:** it is still `--experimental-`. In `Sources/ArgumentParser/Usage/HelpGenerator.swift` around line 510–537 the flag is defined as `.long("experimental-dump-help")` with a commented-out line reading `// To add when 'dump-help' is public API:`. It has been experimental for years. `serializationVersion` is still `0`. So it is excellent prior art with an unstable contract — study it, copy the shape, do not depend on it.

### 2.8 `oclif` — the only shipped, published schema artifact in JS

Verified `static strict = true` at `node_modules/@oclif/core/lib/command.js:120` (and `static strict: boolean` in `command.d.ts:65`). Note that in oclif, `strict` governs **extra positional args** specifically; unknown flags are rejected by the parser independently.

More interesting: `oclif.manifest.json` is a real artifact **published to npm alongside the package**. Fetched live from `unpkg.com/@oclif/plugin-plugins/oclif.manifest.json`:

```json
{ "commands": { "plugins:install": {
    "id": "plugins:install",
    "args": { "plugin": { "name": "plugin", "description": "Plugin to install.", "required": true } },
    "flags": {
      "json":    { "name": "json",    "type": "boolean", "description": "Format output as json.", "helpGroup": "GLOBAL", "allowNo": false },
      "force":   { "name": "force",   "char": "f", "type": "boolean", "description": "Force npm to fetch remote resources...", "allowNo": false },
      "jit":     { "name": "jit",     "type": "boolean", "hidden": true, "allowNo": false },
      "silent":  { "name": "silent",  "char": "s", "type": "boolean", "exclusive": ["verbose"], ... },
      "verbose": { "name": "verbose", "char": "v", "type": "boolean", "exclusive": ["silent"], ... } },
    "strict": false,
    "enableJsonFlag": true,
    "aliases": [], "hiddenAliases": [], "permutations": ["plugins:install"] } },
  "version": "..." }
```

It carries: per-command `strict`, per-flag `type`, `char`, `description`, `hidden`, **`exclusive`** (mutual exclusion — richer than most), `allowNo`, `helpGroup`, per-arg `required`, plus `enableJsonFlag`. What it **lacks** vs Swift's `ToolInfoV0`: enum/choice values (`options` exists in oclif flag definitions but is not consistently serialized here), defaults, and a versioned schema contract for the manifest format itself.

The other thing oclif gets right conceptually: the manifest is a **build artifact shipped with the package**, so a consumer can read the command tree _without executing the CLI_. That is a design option worth considering — though for an agent-first CLI, a runtime `--schema` subcommand is more robust because it cannot drift from the binary.

### 2.9 Python — strict defaults, one nasty hazard, and a surprisingly great schema

Verified on Python 3.12:

```
argparse  --nonexistent  → EXIT 2, "demo: error: unrecognized arguments: --nonexistent"
click     --bogus        → EXIT 2, "Error: No such option '--bogus'."
click     extra pos      → EXIT 2, "Error: Got unexpected extra argument (extra)"
typer     --bogus        → EXIT 2, "No such option: --bogus"
```

So Python's defaults are genuinely fine — `parse_args()` errors on unrecognized args (that is exactly what distinguishes it from `parse_known_args()`), and Click/Typer reject both unknown options and extra positionals.

**The hazard is `argparse`'s `allow_abbrev=True` default.** Verified: with `--verbose` and `--target` declared, passing `--verb` yields `Namespace(verbose=True, target=None)` and **exit 0**. This is the only surveyed default that _rewards_ a hallucinated flag name rather than correcting it — and worse, it is unstable: adding a second `--ver*` flag later turns a previously-working invocation into an ambiguity error. Every other strict framework surveyed (clap, Swift, cobra) _suggests_ the correct spelling while still exiting non-zero. The spec should mandate `allow_abbrev=False`.

**Python's schema story is the best outside Swift, and it is badly underappreciated.** `click.Command.to_info_dict()` is built in, recursive, documented, and — verified — **directly `json.dumps`-able with no coercion**:

```json
{
  "name": "cli",
  "commands": {
    "build": {
      "name": "build",
      "params": [
        {
          "name": "target",
          "param_type_name": "argument",
          "opts": ["target"],
          "type": { "param_type": "String", "name": "text" },
          "required": true,
          "nargs": 1,
          "multiple": false,
          "default": null,
          "envvar": null
        },
        {
          "name": "fmt",
          "param_type_name": "option",
          "opts": ["--format"],
          "type": {
            "param_type": "Choice",
            "name": "choice",
            "choices": ["json", "text"],
            "case_sensitive": true
          },
          "required": false,
          "nargs": 1,
          "multiple": false,
          "default": "text",
          "help": "output format",
          "is_flag": false,
          "count": false,
          "hidden": false
        }
      ]
    }
  }
}
```

Note what survives: `param_type_name` distinguishing option vs argument, **`choices` (enums preserved)**, `required`, `nargs` (`-1` for variadic), `multiple`, `default`, `envvar`, `help`, `is_flag`, `count`, `hidden`, `secondary_opts` (for `--force/--no-force` pairs), and recursive `commands`. Richer numeric types survive too — `IntRange` serializes as `{"min":0,"max":10,"min_open":false,"max_open":false,"clamp":false,"param_type":"IntRange"}`. That is content-parity with Swift's `ToolInfoV0`, and in the constraint department it is _better_.

**A bonus specifically useful to a conformance kit:** `Context.to_info_dict()` also serializes the _enforcement posture itself_ — `allow_extra_args`, `allow_interspersed_args`, `ignore_unknown_options`, `auto_envvar_prefix`. A CLI can therefore be asked to declare its own strictness, which the kit can assert against observed behavior. Nothing else surveyed does this.

Introduced in click 8.0.0 (2021-05-11): "Core objects have a `to_info_dict()` method. This gathers information about the object's structure that could be useful for a tool generating user-facing documentation." Implementations at `click/core.py:524` (`Context`), `:1076` (`Command`), `:1701` (`Group`, the recursion point), `:2311`/`:3048` (`Parameter`/`Option`), plus eight `ParamType.to_info_dict` overrides in `click/types.py`. **Caveat:** recursion goes through `Group.list_commands`, so a lazily-loaded or dynamically-generated group must be able to enumerate itself or the dump will be incomplete.

#### 2.9a ⚠️ Typer ≥ 0.26 vendored Click and LOST `to_info_dict()`

This is the most important Python finding and it invalidates the obvious plan of "use Typer, get Click's schema for free."

**Typer 0.26.0 (2026-05-26) dropped its dependency on Click entirely and vendored a fork at `typer/_click/`** (its `__init__.py` opens "Code taken and adapted from Click", pinned to click 8.3.1). PyPI metadata pinpoints the break: typer 0.25.0 declares `click>=8.2.1`; 0.26.0, 0.27.0 and 0.27.1 declare **no click dependency at all**. Verified consequences on typer 0.27.1:

- `grep -rc to_info_dict` across all 31 typer `.py` files returns **0**. The dump is simply gone.
- `typer.main.get_command(app)` returns a `typer._click.core.Command`. **`isinstance(cmd, click.Command)` is `False`** against real PyPI click.
- `cmd.to_info_dict(ctx)` raises `AttributeError: 'TyperGroup' object has no attribute 'to_info_dict'`.
- `typer.testing.CliRunner` is **no longer a subclass** of click's (`issubclass` → `False`), so shared test helpers do not transfer.
- Click-ecosystem tooling (`click-man`, `sphinx-click`) cannot consume a modern Typer app. (Strongly implied by the failed `isinstance`; ❓ not confirmed by running those tools.)

Verified by contrast: typer 0.15.4 + click 8.1.8 in a separate venv returns a real `click.Command`, `to_info_dict()` works, recurses into nested `add_typer` sub-apps, and `json.dumps` yields 4,233 bytes. `typer-slim` is stranded at 0.24.0 and is not a current escape hatch.

**Implication for the spec:** if machine-readable schema export matters, use **Click directly**. If you want Typer's ergonomics, pin `typer<=0.25.0` and accept the maintenance risk. Typer's own `typer <app> utils docs` emits **Markdown, not JSON** — fine for humans, useless as a machine contract.

#### 2.9b Typer's Rich output — corrected

Its error output is Rich-formatted and emits Unicode box-drawing **even when stderr is not a TTY**. Verified raw bytes for a one-line error:

```
╭─ Error ───────────────────────────────────────────────────────────────────────╮
│ No such option: --bogus                                                       │
╰───────────────────────────────────────────────────────────────────────────────╯
```

~160 characters of multi-byte box-drawing to convey 24 characters of information, on every error, in an agent's context window. Plain Click does not do this.

**Correction to a common belief (and to an earlier draft of this document): modern Typer does not import Rich eagerly.** `-X importtime` on typer 0.27.1 shows **zero** rich import lines at startup; Rich is loaded lazily, only to render help and errors. So `TYPER_USE_RICH=0` makes no measurable difference to a normal command (35.28 vs 35.42 ms — noise). Where it _does_ matter is `--help`, which agents read constantly:

| typer 0.27.1                 |         mean |
| ---------------------------- | -----------: |
| normal command               |     35.23 ms |
| `--help` with rich           | **84.11 ms** |
| `--help`, `TYPER_USE_RICH=0` | **36.75 ms** |

**`TYPER_USE_RICH=0` is worth ~47 ms per help call and replaces box-drawing with clean plain text.** It is not an import check — `typer/core.py:26` reads `parse_boolean_env_var(os.getenv("TYPER_USE_RICH"), default=True)`. (Typer's own 16.6 ms import cost, which I measured separately, is `typer._click` + `typer.main` + `inspect`, not rich. For reference, typer 0.15.4 _did_ import rich eagerly and ran at 71.87 ms.)

#### 2.9c Other Python entries, and three disqualifications

- **`pydantic-settings` has the strongest schema story of anything in this survey** — `model_json_schema()` emits standards-compliant **JSON Schema** with `required`, `minimum`/`maximum` from `Field(ge=, le=)`, `description`, `default`, `$defs`/`$ref` for nested models and `additionalProperties: false`. And it is genuinely one source of truth: every schema property maps to a flag, with nested models expanding to dotted paths (`--db.host`) _and_ accepting a whole-object JSON string. It is argparse-backed but **correctly sets `allow_abbrev=False`** (`sources/providers/cli.py:472`, and again at `:1079` for subcommands) — the only argparse-based entry that rejected `--verb`. The cost is **87 ms startup (6× bare Python, 3.2× click)**, which is steep in a tight loop. Gotcha for the spec: `SettingsConfigDict` defaults to `cli_enforce_required=False, cli_kebab_case=False`, whereas `CliApp.run` on a plain `BaseModel` wraps it with `cli_enforce_required=True, cli_implicit_flags=True, cli_kebab_case=True, cli_avoid_json=True`. **The plain-`BaseModel` path is dramatically more CLI-correct.** Also forbid `cli_ignore_unknown_args=True`, which silently accepts `--bogus` and runs.
- **`cyclopts`** is strict on all three axes but **uses exit code 1 for usage errors, not 2** — a spec mandating "2 means usage error" must special-case it. `App.assemble_argument_collection()` gives a typed collection but is **not** `json.dumps`-able and there is no built-in export.
- **`tyro`**: strict, but its only introspection entry point, `tyro.extras.get_parser()`, emits `DeprecationWarning: ... will be removed in a future version`, and it returns an `argparse.ArgumentParser` subclass — so its schema story collapses to argparse's private `_actions`.
- **🔴 Disqualify `fire`.** It silently violates its own type annotations: a parameter annotated `verbose: bool` received the string `"stray_positional"` at **exit code 0**. It also accepted `--o z` as `--out`.
- **🔴 Disqualify `docopt-ng`.** Silently accepts prefix abbreviations (`--verb` → `verbose=True`), and upstream `docopt` has been dead since 2014.
- **🔴 Disqualify `plumbum.cli`.** Writes usage errors to **stdout**, leaving stderr empty — it corrupts the data channel, the same sin as clipanion.

**Click's other quiet footgun**, worth a conformance-kit assertion: the decorator string and the callee parameter name are unrelated to any type checker. `@click.option("--nayme")` on `def cmd(name)` produces a **runtime** `TypeError: cmd() got an unexpected keyword argument 'nayme'` at exit code 1, and `mypy --strict` does not flag it. Click passes `**kwargs`; nothing can relate the two. Typer/tyro/cyclopts/pydantic-settings avoid this entirely because the signature or model _is_ the definition.

**Click's in-process test story is the best in Python** and worth copying: `CliRunner` returns `exit_code`, `stdout`, `stderr`, `output`, `exception`, `return_value`. **stderr has been captured separately by default since 8.2.0 (2025-05-10)** — "Keep stdout and stderr streams independent in `CliRunner`... Removes the `mix_stderr` parameter." Distribution is a genuine asset too: **468 KB with zero dependencies**, versus typer 7.7 MB / 7 packages and cyclopts 9.6 MB / 8 packages. (stdlib `zipapp` works but costs 2.4× startup — 65.7 ms vs 26.9 ms; bundling `__pycache__` did not help because zipimport ignores that layout.)

### 2.10 A note on "static checking of required args"

Nobody statically checks required-ness in the sense people imagine. What differs is whether the _shape of the callee_ makes it impossible to proceed without the value:

- **Rust/Swift:** yes, structurally — you destructure into a struct/enum with a non-optional field, so the parser must have produced one.
- **TypeScript (`@stricli/core`, `clipanion`, `@commander-js/extra-typings`):** yes at compile time _if_ you never cast, but `tsc` is not running at CLI runtime, so a mismatch between the runtime parser config and the type annotation is possible and undetected.
- **Go (`kong`):** struct binding gets close; `cobra`'s `cmd.Flags().GetString("nmae")` is a stringly-typed runtime lookup that returns a zero value and an error most people ignore — the weakest of the surveyed set.
- **Python:** no, by construction.

---

## 3. Startup latency findings

This is the sub-question with the clearest answer. All numbers below are from **one harness, one machine, one sitting**, so relative comparisons are sound.

| Runtime / framework                            |         mean | median |    p95 | Notes                                                 |
| ---------------------------------------------- | -----------: | -----: | -----: | ----------------------------------------------------- |
| `/usr/bin/true` (process-spawn floor)          |  **1.98 ms** |   1.95 |   2.27 | This is the tax you cannot avoid                      |
| **Rust — clap 4 derive** (release, LTO, strip) |  **2.31 ms** |   2.37 |   2.73 | 419 KB binary. ~0.33 ms over floor                    |
| **Go — cobra** (`-ldflags "-s -w"`)            |  **2.57 ms** |   2.52 |   2.97 | 2.5 MB binary                                         |
| **Swift — ArgumentParser** (release)           |  **4.27 ms** |   4.17 |   5.07 | 1.6 MB binary                                         |
| Bun runtime floor (`bun -e ''`)                |      3.60 ms |   3.58 |   4.02 | no file load                                          |
| Bun — `hello.ts`, zero deps                    | **10.24 ms** |  10.23 |  11.07 | **loading+transpiling one trivial .ts costs ~6.6 ms** |
| Bun — `node:util parseArgs`                    |     13.37 ms |  13.33 |  14.01 | stdlib only                                           |
| Bun — `cac`                                    |     13.12 ms |  13.06 |  13.89 | lightest real framework                               |
| Bun — `citty`                                  |     16.58 ms |  16.24 |  19.75 |                                                       |
| Bun — `commander`                              | **21.86 ms** |  21.79 |  22.66 |                                                       |
| Bun — `clipanion`                              |     21.90 ms |  21.73 |  22.93 |                                                       |
| Bun — `@stricli/core`                          |     23.78 ms |  20.64 |  40.28 | high variance                                         |
| Bun — `yargs`                                  | **33.24 ms** |  32.55 |  40.81 | heaviest JS framework measured                        |
| Bun `--compile` single binary (commander)      |     20.53 ms |  20.27 |  22.24 | **63 MB binary**, saves ~1.3 ms                       |
| Node runtime floor (`node -e ''`)              |     23.22 ms |  22.93 |  25.10 | **already 10× the Rust binary before your code runs** |
| Node — `commander` via .ts type-stripping      | **57.79 ms** |  57.57 |  61.90 |                                                       |
| Python runtime floor (`python -c pass`)        |     14.85 ms |  14.89 |  16.24 |                                                       |
| Python — `argparse`                            |     19.19 ms |  19.15 |  20.58 |                                                       |
| Python — `click`                               |     27.70 ms |  27.73 |  29.59 |                                                       |
| Python — `typer`                               | **36.21 ms** |  36.13 |  38.55 | `import typer` alone = 16.6 ms (`-X importtime`)      |
| Python — `typer --help` **with rich**          | **84.11 ms** |      — |      — | ⚠️ **agents read help constantly**                    |
| Python — `typer --help`, `TYPER_USE_RICH=0`    |     36.75 ms |      — |      — | **−47 ms and plain-text output**                      |
| Python — `pydantic-settings CliApp`            | **87.07 ms** |  84.38 | 101.41 | best schema story, worst startup                      |

### What this actually means

**The spread is ~16× between the fastest realistic option (Rust/clap, 2.3 ms) and the slowest (Python/typer, 36.2 ms; Node+TS, 57.8 ms).** In absolute terms that is ~34 ms per invocation. Whether that matters is a function of call volume:

- 10 calls in an agent turn: 0.02 s vs 0.36 s — irrelevant, dwarfed by model latency.
- 1,000 calls in a batch/loop workflow: 2.3 s vs 36 s — noticeable.
- 100,000 calls in CI or a tight tool loop: 4 min vs 60 min — decisive.

**Honest framing: for a typical agent turn this is not the bottleneck.** A single LLM round trip is 500–5000 ms. A 30 ms CLI startup is 1–6% of one round trip. Anyone claiming startup latency is _the_ reason to rewrite in Rust is overselling it — and this document would rather be right than dramatic. The place it genuinely bites is fan-out: an agent that shells out in a loop over 500 files, a conformance suite running thousands of assertions, or a CLI that another CLI calls per-item.

**Where it bites hardest is the one call agents make most: `--help`.** Typer's 84 ms help path is 2.3× its own normal invocation and **36× the Rust binary**, purely to render Unicode boxes an agent will never look at. If a spec adopts only one latency rule, it should be _help must be as cheap as any other command and must not render decoratively_.

### Six specific, non-obvious findings

1. **Bun's advantage over Node is large and real, but it is a runtime-floor advantage, not a free lunch.** `bun -e ''` is 3.60 ms vs `node -e ''` at 23.22 ms — a **6.5× floor advantage**. But loading and transpiling even a trivial `.ts` file costs Bun ~6.6 ms on top (10.24 ms total), and a real framework adds another 3–23 ms. So Bun+TypeScript lands at **13–33 ms**, which is _the same order as Python_ and **5–14× the Rust binary**. Bun does not close the gap to a native binary; it closes the gap to Python.

2. **`bun build --compile` is almost pointless for this purpose.** It produced a **63 MB** binary that ran in 20.53 ms vs 21.86 ms for the same CLI run from source — a ~1.3 ms saving for a 63 MB artifact. It does buy you "no runtime required" for distribution, which is a real benefit, but it does **not** buy you native-binary startup. The JS engine still has to boot.

3. **Framework choice within JS costs more than runtime choice sometimes does.** `yargs` (33.24 ms) vs `cac` (13.12 ms) is a 20 ms difference — larger than the entire gap between Bun and a native Go binary's _floor_. Dependency weight is the dominant term once you are on a JS runtime. `du -sh`: cac 52 K, citty 52 K, commander 232 K, gunshi 304 K, @stricli/core 336 K, yargs 376 K, clipanion 428 K.

4. **In compiled languages, framework choice is latency-irrelevant.** An independent 250-run measurement across the Go frameworks found a do-nothing baseline binary at 2.963 ms and cobra at 3.360 ms / kong at 2.958 ms — i.e. **fork/exec is ~2.8–3.0 ms and parser overhead is ≤0.4 ms, inside the noise band.** The corollary is important for the spec: once you are on a native binary you should choose your parser purely on enforcement and schema fidelity, because it costs nothing in speed. And if you need faster loops than ~2.5 ms, the answer is a persistent process or batching, not a lighter parser.

Go binary sizes (stripped, `-ldflags "-s -w"`): baseline 1.66 MB · stdlib `flag` 1.76 MB · go-flags 1.98 MB · ff 2.17 MB · **cobra 2.56 MB** · urfave v3 3.47 MB · **kong 3.61 MB** · kingpin 4.30 MB · mitchellh/cli 6.20 MB. Note that importing `cobra/doc` adds ~1.1 MB by dragging in `blackfriday/v2`, `go-md2man/v2` and `yaml/v3` — put doc generation behind a build tag or a separate binary. Kong has **zero third-party dependencies**.

5. **The parsing itself is free. It is 100% process spawn.** An in-process microbenchmark (100k iterations, `black_box`) isolated clap's actual work:

   | operation                               |      time |
   | --------------------------------------- | --------: |
   | `Cli::command()` (build the definition) |  2,945 ns |
   | `try_parse_from` (root, no args)        |  6,544 ns |
   | `try_parse_from` (unknown flag → error) | 10,865 ns |
   | `try_parse_from` (subcommand + 3 flags) | 13,786 ns |
   | `try_parse_from` (nested depth-2)       | 17,876 ns |

   **7–18 microseconds.** Process spawn dominates by 120–330×. clap's marginal cost over a no-op Rust binary is **+0.06 ms**; the Rust binary's own spawn cost over `/usr/bin/true` is +0.41 ms. Choosing `pico-args` over `clap` "for speed" optimizes a factor ~150× below the noise floor — and costs you every safety property in this document, since `pico-args` and `lexopt` both **exit 0 on unknown flags**. (`pico-args`' `finish()` is not a check at all; `lib.rs:685–687` is literally `pub fn finish(self) -> Vec<OsString> { self.0 }`. Worse, its `contains()` scans all of argv, so subcommand-scoped flags are structurally inexpressible — `picodemo run --release` accepts a build-only flag.)

   The generalized rule across all three compiled ecosystems measured: **once you are on a native binary, parser choice costs nothing in latency, so choose purely on enforcement and schema fidelity.**

6. **⚠️ macOS cold start is ~140 ms, and it has nothing to do with your parser.** First exec of a newly created inode costs **137.4 ms for a 1.0 MB clap binary and 142.5 ms for a 423 KB binary with no parser at all** — while already-signed `/bin/echo` costs 1.78 ms. Second exec at the same path: 2.6 ms. This is AMFI/Gatekeeper validating the ad-hoc linker signature (`codesign -dv` → `flags=0x20002(adhoc,linker-signed)`), independent of size and parser. **Distribution implication:** the first invocation after install or download pays ~140 ms once; notarization or a warm-up exec removes it from the agent loop. Linux does not have this. Any benchmark that measures a freshly built binary once will wildly misreport native startup.

---

## 4. Schema-export capability ranking

Ranked by "can it emit a machine-readable description of the full command tree without you hand-maintaining it."

### Tier 1 — Built in, complete

**1. Swift ArgumentParser** — `--experimental-dump-help` → `ToolInfoV0`. Complete (help, kind, required, repeating, **enum values**, defaults, short/long names, hidden, recursive subcommands, `parsingStrategy`, `completionKind`), **versioned** via `serializationVersion`, and the schema is a public `Codable` type so it round-trips. **Missing:** stable/public API guarantee (still `experimental` by name and by an in-source TODO); no notion of side-effects, idempotency, or output shape.

**2. Click / Typer (Python)** — `to_info_dict()` is documented, recursive, built in, and verified **directly `json.dumps`-able with no coercion**. Preserves `choices` (enums), `required`, `nargs`, `multiple`, `default`, `envvar`, `help`, `is_flag`, `count`, `hidden`, `secondary_opts`, and the option-vs-argument distinction. Feature-parity with `ToolInfoV0` on content. **Missing:** it is a Python dict shaped by Click's internals rather than a declared external schema, and **there is no version field**, so consumers have no compatibility signal. Also no side-effect/idempotency/output-shape notion.

### Tier 2 — Built in, real artifact, incomplete

**3. oclif** — `oclif.manifest.json`, generated by `oclif manifest` and **published to npm** so consumers can read the tree without executing the CLI. Rich per-flag metadata including `exclusive` mutual-exclusion groups and per-command `strict`. **Missing:** enum values in the serialized form, defaults, and any versioning contract for the manifest format itself.

**4. `argh` (Rust)** — `get_args_info()` → serde JSON, recursive, full tree, **`serde` on by default**, 0 bytes if unused. **Missing:** default values and enum value sets, both silently absent; top-level `name` is the Rust struct name.

**5. `pydantic-settings` (Python)** — `model_json_schema()` emits **standards-compliant JSON Schema** with numeric constraints, `$defs`/`$ref`, `additionalProperties: false`. The only entry whose export is a recognized standard rather than a bespoke shape, and genuinely one source of truth with the CLI surface. **Missing:** it describes the _model_, not the CLI ergonomics (short flags, positionals); and 87 ms startup.

**6. `carapace_spec_clap` 1.2.3 (Rust)** — a real published clap exporter with a **published JSON Schema**, emitting recursive YAML with required-ness, defaults, enum values with descriptions, value hints, and a `persistentflags`/local split. Implements `clap_complete::Generator`, so it drops into any existing `generate()` call site. Proves clap's introspection is sufficient in practice.

### Tier 3 — Spec-first, external to the parser

**7. jdx `usage`** ([usage.jdx.dev](https://usage.jdx.dev), [github.com/jdx/usage](https://github.com/jdx/usage)) — a KDL spec language for CLIs. Node types: `cmd` (nestable), `flag`, `arg`, `complete`, `config_file`, `alias`. Attributes: `help`, `long_help`, `hide`, `default`, `env`, `count`, `negate`, `global`, `choices`, `required`, `deprecated`, `var`. It has **`usage generate json`** and **`usage generate json-schema`**, generates completions for bash/zsh/fish/PowerShell/nushell, plus markdown and man pages.

Two things make this the most relevant prior art after Swift:

- It has a **`effect` attribute with values `"read" | "write" | "destructive"`** on commands, flags and args. That is a _side-effect classification in the spec itself_ — exactly the concept an agent-first CLI spec needs and that nothing else surveyed has. This is worth stealing outright.
- There is a **cobra→spec bridge**: [`github.com/jdx/usage/integrations/cobra`](https://pkg.go.dev/github.com/jdx/usage/integrations/cobra) exposes `Generate(*cobra.Command) string` (KDL) and **`GenerateJSON(*cobra.Command) ([]byte, error)`**, mapping `cmd.Short`/`Long` → `about`/`long_about`, `Use` arg syntax → `arg` nodes, `ValidArgs` → `choices`, persistent flags → `global=#true`, `MarkFlagRequired` → `required=#true`, flag defaults/hidden/deprecated. This is direct evidence that framework→spec extraction is tractable.

**Missing:** `usage` is primarily generative — it is a spec + generator, not a runtime parser. It does not enforce strictness in your CLI; you still need a parser. mise uses it as its canonical CLI definition.

**8. `kong` (Go)** — `kong.Model`/`kong.Node` (`model.go:38–60`) is a genuine walkable AST: `Type`, `Flags`, `Positional`, `Children`, with `Flag` carrying `Enum`, `Xor`, `And`, `Envs`, `Aliases`, `Default`. ~40 lines produced a complete typed tree including positionals and enums. **No JSON dumper ships built in** — but nothing is lost. Best schema fidelity in Go.

**9. `urfave/cli` v3** — a pleasant surprise: every `Command` and flag field carries `json:"..."` struct tags (`command.go:33–146`), so **`json.Marshal(cmd)` emits the full tree with zero extra code**, including `required`, `hidden`, `defaultValue`, `aliases` and nested `commands`. Weakness: no explicit type field — type is only inferable from the JSON type of `defaultValue` and the shape of `config`. Undermined by the framework's exit-0 subcommand fall-through.

**10. `carapace-spec`** — YAML CLI specs powering completions for 1000+ CLIs. ❓ I could not verify the current spec format or export surface (docs URL 404'd); treat as unverified.

### Tier 4 — Reconstructible from introspection, with losses

**11. `commander`** — the tree _is_ walkable and I verified a complete dump on the first attempt, recovering names, descriptions, short/long, choices, defaults, required and nesting. **But** it relies on semi-private fields (`registeredArguments`, `option.argChoices`, `option.defaultValue`), and it has a serious footgun: `Option.required` means _"this option takes a mandatory value"_, while `Option.mandatory` means _"the user must supply this option"_. Anyone writing a schema exporter will get this backwards. Also **no value type is recoverable** — commander options are strings unless you attach a custom parser function, and functions are not introspectable.

**12. `citty`** — trivially serializable (the definition is plain data), including enum `options`, defaults and `required`. Zero framework support needed. Loses nothing structurally; the problem is enforcement, not schema.

**13. `clap`** — no built-in dump and no standard shape, but the richest introspection surface of any Rust crate: it is the only one recovering ValueEnum variants **with aliases and per-variant help**, plus defaults, arity, conflicts and groups. Ranked here rather than Tier 2 only because the dump is not built in — §2.6a shows it is 31 lines away, and `carapace_spec_clap` already ships one. **Sole real loss: numeric range bounds.**

**14. `cobra`** — two distinct disappointments. First, `GenYamlTree`/`GenMarkdownTree`/`GenManTree` produce _documentation_, not a schema. The YAML structs (`doc/yaml_docs.go`) are `cmdOption{Name, Shorthand, DefaultValue, Usage}` and `cmdDoc{Name, Synopsis, Description, Usage, Options, InheritedOptions, Example, SeeAlso}` — that is all. A real emitted file for a command whose `--mode` flag is **required** and which is declared `NoArgs`:

```yaml
name: mycli other
synopsis: subcommand two
options:
  - name: mode
    default_value: fast
    usage: mode of operation
see_also:
  - mycli - demo agent-first cli
```

No type, no `required`, no hidden/deprecated, no arg policy, and the tree structure is flattened into free-text `see_also` prose you would have to string-parse. Hidden commands are omitted entirely.

Second: cobra's _live_ API does better — `Command.Commands()` + `Flags().VisitAll()` + `pflag.Flag.Value.Type()` + the `BashCompOneRequiredFlag` annotation recovers type, default and required in ~60 lines. But there is **one irreducible gap: `Command.Args` is a `func` value.** You can see nil vs non-nil and nothing more. Positional arity and policy cannot be exported from cobra at all without a parallel hand-maintained annotation. Combined with the enum gap documented in [cobra#2362](https://github.com/spf13/cobra/issues/2362) ("it registers a _function_... not a static list") and the absence of numeric bounds, cobra loses exactly the parts of a schema that an agent most needs.

### Tier 5 — Nothing

`argparse` (private `_actions` only), `yargs`, `node:util parseArgs`, `argh`, `xflags`, `arg`, `meow`, `sade`.

### 4.5 The prior art that matters most: clispec.dev

Verified live. The v0.3 JSON Schema's top level requires `["clispec", "name", "version", "commands", "errors"]` and carries `description`, `output`, `global_args`, `outcomes`, `extensions`, `command_layout`. Its `$defs` are `command`, `arg`, `type_node`, `field`, `outcome`, `error`.

**`$defs.command`** (required: `name`, `description`, `effects`) is where the agent-specific thinking lives, and it goes well beyond anything a parsing framework models:

| Field                     | Values / purpose                                                                                   |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| `effects`                 | `read_only` \| `idempotent` \| `non_idempotent` — **required**                                     |
| `idempotency_key_arg`     | for `non_idempotent`, the arg that makes a repeat safe                                             |
| `output_kind`             | `data` \| `stream` \| `opaque`; with `media_type`, `stream_format` (NDJSON default)                |
| `cardinality`             | `single` \| `bounded` \| `unbounded`; with `pagination` (required when unbounded) and `fields_arg` |
| `confirmation_bypass_arg` | conventionally `--yes`; its presence _declares_ a prompt exists                                    |
| `requires_tty`            | the command is inherently interactive                                                              |
| `stability`               | `stable` \| `beta` \| `experimental` \| `deprecated`                                               |
| `stdout_schema`           | **a full JSON Schema for the stdout document**, envelope included                                  |
| `output_fields`           | field shapes without invoking the command                                                          |
| `errors` / `outcomes`     | per-command subsets of the tool-level taxonomies                                                   |
| `example`                 | a self-contained invocation "used by conformance tooling"                                          |

**`$defs.error`** requires `{kind, exit_code}` plus optional `retryable` — exit codes are declared, not discovered, and must not overlap between errors and outcomes.

Note also a design decision worth stealing: **v0.3 retired nesting.** `commands` is a flat list and `name` carries the full space-separated path (`"sites use"`, `"files download"`). The schema comment says this exists so "a document st[ructure]" cannot vary; `command_layout: flat|nested` toggles it. For agents, a flat list is easier to scan and diff than a recursive tree.

**And here is the gap.** `$defs.arg` requires only `{name, type}` and offers `short`, `required`, `default`, `enum`, `description` — and `type` is explicitly "deliberately free-form." That is **thinner than Swift's `ToolInfoV0`, Click's `to_info_dict()`, or the clap dump in §2.6a**, all of which carry arity, value hints, repeatability, hidden flags, conflicts and parsing strategy.

So the two halves of the problem are split across the ecosystem and nobody has joined them:

- **clispec has the semantics** (effects, cardinality, error taxonomy, output shape) and no way to produce them automatically.
- **Frameworks have the parsing detail** (clap, Click, Swift) and no notion of semantics.

clispec's own [Rust guide](https://clispec.dev/guide/rust/) reportedly tells authors to hand-roll the clap walker and **names no crate** — confirming the gap from the other side. Meanwhile a GitHub code search for `filename:cli_json.rs language:rust` returns **41 results**, including `bootc-dev/bootc`'s `crates/lib/src/cli_json.rs` with its own `command_to_json()` recursion. Forty-one independent reimplementations of the same file is about as clear a market signal as research produces.

Adoption of clispec is currently tiny (hundreds of downloads), so it can still be shaped or superseded — but do that knowingly, and read v0.3 first.

### The adjacent ecosystem: CLI → MCP

Worth knowing that people are already solving half of our problem, badly, in the MCP direction. [`njayp/ophis`](https://github.com/njayp/ophis) ("Transform any Cobra CLI into an MCP server") and [`eat-pray-ai/cobra-mcp`](https://github.com/eat-pray-ai/cobra-mcp) both auto-derive MCP tool schemas from a cobra command tree. They hit exactly the ceiling documented in cobra#2362: no enums, no bounds. **A CLI that emits a complete schema natively makes the CLI→MCP bridge trivial and lossless.** That is a strong argument for the project's value proposition and a natural conformance target.

### Design guidance worth citing

[clig.dev](https://clig.dev) already establishes the output-side conventions: "Return zero exit code on success, non-zero on failure"; send primary/machine-readable output to `stdout` and "messaging to `stderr`"; "Display output as formatted JSON if `--json` is passed"; and — notably for agents — "Ensure `-h` and `--help` display help without requiring other arguments... you should be able to add `-h` to the end of anything and it should show help." What clig.dev does **not** cover is self-description of the command tree, which is the gap this project fills.

Recent (2025–2026) agent-CLI writing converges on the same operational points: `--json`/`--output json` on every data-returning command, a compact/`--raw` mode to save tokens, `--quiet` to suppress spinners ("For agents, this output is noise that consumes context window tokens"), non-interactive flags (`--yes`/`--force`/`--skip-interactive`) because "interactive prompts block execution", and machine-parseable errors so an agent "can retry intelligently". None of it addresses schema self-description either.

---

## 5. Is there ANY framework that already gives you all three?

**Yes — two, and only two: Swift ArgumentParser and Python's Click.** Both were verified empirically on this machine. Everything else fails on at least one leg.

**Swift ArgumentParser** ships, from a single source of truth (an annotated Swift struct):

1. **Strict parsing by default** — verified rejection of unknown flags, extra positionals, invalid enum values and missing required options, with did-you-mean suggestions and _without_ silent abbreviation acceptance.
2. **Auto-derived help** — from the same property wrappers.
3. **Machine-readable schema export** — `--experimental-dump-help` → `ToolInfoV0`: versioned, `Codable`, recursive, including required-ness, enum cases, defaults, parsing strategy and hidden-flag markers.

Its one weakness is the `experimental` label and `serializationVersion: 0`, which has not moved in years.

**Click** (and Typer, which inherits it) ships the same three from a single decorated function:

1. **Strict by default** — verified exit 2 on unknown options and on extra positionals.
2. **Auto-derived help.**
3. **`to_info_dict()`** — verified directly JSON-serializable, recursive, and preserving `choices`, `required`, `nargs`, `multiple`, `default`, `envvar`, `is_flag`, `hidden` and the option/argument distinction.

Its weaknesses are that the dump is an internal-shaped dict with **no version field**, weak runtime type precision, and 6–8× the startup cost of a native binary. Click is the strongest _content_ precedent; Swift is the strongest _contract_ precedent (a declared, versioned, `Codable` type in its own module). **Our schema should take content from Click's dict and contract discipline from Swift's `ToolInfoV0`.**

Neither has any notion of the things an _agent-first_ spec actually needs beyond parsing: side-effect classification, idempotency, or declared output shape.

**Nothing else in Rust, Go, TypeScript, or Java has all three.** The near-misses each fail on a different leg:

| Candidate            | Strict                                   | Derived help | Schema export | Fails on                                                  |
| -------------------- | ---------------------------------------- | ------------ | ------------- | --------------------------------------------------------- |
| Swift ArgumentParser | ✅                                       | ✅           | ✅            | **nothing** (but schema is `experimental`)                |
| Click / Typer        | ✅                                       | ✅           | ✅            | unversioned dict, slow startup, weak types                |
| oclif                | ✅                                       | ✅           | ⚠️            | schema incomplete (no enums/defaults), heavy runtime      |
| **kong**             | ✅                                       | ✅           | ⚠️            | walkable AST but **no built-in dump**; no completions/man |
| clap                 | ✅                                       | ✅           | ❌            | no dump — but the API to build one is all there           |
| cobra                | ❌ (nested subcmds + positionals exit 0) | ✅           | ❌            | enums, bounds and arg policy structurally unrecoverable   |
| urfave/cli v3        | ❌ (unknown subcmd → exit 0)             | ✅           | ✅            | **no enforcement on subcommands or positionals**          |
| citty                | ❌                                       | ✅           | ✅            | **no enforcement at all**                                 |
| commander            | ✅                                       | ✅           | ⚠️            | private-field introspection, no value types               |
| jdx `usage`          | n/a                                      | ✅           | ✅            | not a parser — no runtime enforcement                     |

The pattern is stark: **the enforcement leg and the schema leg are almost never held by the same library.** Frameworks that are strict (clap, kong, commander) treat their command tree as a private implementation detail. Frameworks whose command tree is public data (citty, urfave v3, `usage`) don't enforce anything. Only two escape the pattern, and for the same underlying reason: Apple needed the dump for their own tooling and had a type-safe definition to dump _from_; Click needed `to_info_dict()` for its own testing and docs tooling and had a declarative decorator tree to dump _from_. **A framework only gets a good schema when its maintainers had an internal reason to consume one.** That is the strongest possible argument that schema export must be a first-class design goal from day one, not retrofitted.

---

## 6. Opinionated answer: does language choice matter, and what should the reference implementation be?

### Does language choice matter?

**Partly. Here is the honest decomposition.**

**What is pure methodology (follows you everywhere, ~70% of the problem):**

- Rejecting unknown flags and excess positionals. Every ecosystem can do it; several make you ask.
- `--json` on every data-returning command; stable output shapes.
- Exit-code discipline. Nobody agrees (1 vs 2 vs 252) and no framework enforces a policy.
- stdout for data / stderr for diagnostics. `clipanion` gets this wrong; `cac` prints stack traces.
- Non-interactivity, idempotency, side-effect declaration.
- Help that is complete and token-efficient.

None of this is easier in Rust than in TypeScript. You will write the same rules, the same tests, and the same review checklist in either. **This is why the project is a methodology + conformance kit and not a library, and that framing is correct.**

**What is genuinely language/framework-determined (~30%):**

- **Startup latency.** A hard 5–16× factor you cannot engineer away in a JS or Python runtime. Bun narrows it to Python's league; it does not reach native.
- **Whether required-ness is structurally unavoidable.** Rust and Swift make it impossible to reach your handler without the value. TypeScript can express it but not enforce it at runtime. Go's cobra actively invites `GetString("typo")` returning `""`.
- **Whether enums/choices survive introspection.** This is the single biggest schema-fidelity differentiator and it is a _type-system_ property. clap and Swift keep the variant list; cobra structurally cannot (cobra#2362); commander keeps `argChoices` but loses value types.
- **Distribution.** Single binary vs runtime dependency. `bun --compile` technically gives you a binary — a **63 MB** one, for a ~1.3 ms startup gain.

So: **if you only care about correctness, stay in TypeScript and fix your defaults.** If you care about being the reference implementation others measure against, the calculus changes.

### What should the reference implementation be written in?

**Rust, with `clap` v4 derive.** Recommended without much hesitation, for four reasons in priority order:

1. **`clap` already has the hard leg (strictness) and is missing the easy leg (schema dump).** It rejects unknown flags, excess positionals, bad enum values and missing required args at exit code 2, with suggestions and without abbreviation acceptance — verified. And its introspection API (`get_possible_values`, `get_default_values`, `is_required_set`, `get_help`, `get_long`/`get_short`, `get_subcommands`) retains everything Swift's `ToolInfoV0` carries. Writing `--schema` on top is ~50–100 lines. **Building the missing 5% on top of a mature 95% is a far better bet than building 60% from scratch.**
2. **The type system makes the spec's core claim demonstrable.** A reference implementation for "the definition is the single source of truth" is much more convincing when the compiler refuses to let the definition and the handler disagree. In Rust the derive macro _is_ the schema, the help, and the destructuring target simultaneously. That is the thesis, made mechanical.
3. **It wins the latency argument outright** (2.31 ms, 419 KB, 0.33 ms over the raw process-spawn floor) so the benchmark section of the spec is not a hedge. Go's cobra is very close on speed (2.57 ms) but loses badly on schema fidelity — the enum problem is structural, not fixable.
4. **Single static binary, no runtime**, so the conformance kit can be distributed and run anywhere without a toolchain, including inside agent sandboxes.

**Why not Swift**, despite it being the only complete existing package: the schema is explicitly experimental with an in-source TODO to make it public "when 'dump-help' is public API", `serializationVersion` is still 0, and Swift's cross-platform CLI-tooling ecosystem is thin. **Copy its schema design; do not build on its implementation.** `ToolInfoV0` should be the direct ancestor of our schema format, with three additions it lacks: side-effect classification (steal `usage`'s `effect: read|write|destructive`), declared output shape per command, and idempotency.

**Why not Go — and the honest caveat.** Cobra is the most widely deployed CLI framework in existence and would maximize adoption, but it is disqualified: it exits 0 on unknown _nested_ subcommands and on extra positionals by default (§2.5), it cannot statically express an enum ([cobra#2362](https://github.com/spf13/cobra/issues/2362)), and its `Args` policy is a `func` value that cannot be introspected at all. A cobra-based reference implementation would have to _fight_ cobra to demonstrate the spec.

**`kong` is the genuine near-miss and deserves an explicit callout.** It is strict on all four axes by default (exit 80), binds to typed struct fields so a typo is a compile error, has built-in `enum`/`xor`/`and`/`required`/file validation, exposes a fully walkable typed AST (`kong.Model`/`Node`) from which ~40 lines produce a complete schema **including enums**, has **zero third-party dependencies**, and runs at native speed (~3.0 ms). On the merits it is very close to clap. Rust still edges it on three counts — the enum/required-ness guarantees are enforced by the type system rather than by struct tags interpreted at runtime, startup is ~0.7 ms faster with a 6× smaller binary (419 KB vs 3.6 MB), and clap's completion/man-page ecosystem (`clap_complete`, `clap_mangen`) is mature where kong's is third-party. **If the team's Go fluency materially exceeds its Rust fluency, kong is a defensible substitute and the recommendation should flip.** That is the one place where this conclusion is genuinely close.

**Why not TypeScript for the reference implementation** — while still being the right choice for the developer's day-to-day CLIs: the TS ecosystem has the widest strictness spread of any language surveyed (three of eight libraries silently accept unknown flags and exit 0), no library has all three legs, and `bun --compile`'s 63 MB artifacts are an awkward advertisement. A reference implementation should be the thing that is obviously right; TypeScript would require constant caveats.

### ⚠️ But first: reposition the project against clispec.dev

This is the single most consequential research finding, and it should be settled before any code is written. **[clispec.dev](https://clispec.dev/) is a live, versioned, CC BY 4.0 specification with the same stated scope as this project**, at v0.3-candidate as of the month this research was done, with published JSON Schemas and a conformance scorer. Writing a competing spec from scratch would be duplicated effort with worse odds.

But the survey shows clispec has a precisely-shaped hole, and it is the hole this project is unusually well-placed to fill:

| Layer                                                                                       | Who has it               | Who doesn't                                                                 |
| ------------------------------------------------------------------------------------------- | ------------------------ | --------------------------------------------------------------------------- |
| **Semantics** — effects, cardinality, pagination, error taxonomy, stdout schema, stability  | **clispec v0.3**         | every parsing framework                                                     |
| **Parsing detail** — arity, value hints, repeatability, conflicts, hidden, parsing strategy | clap, Click, Swift, kong | **clispec** (`$defs.arg` is 7 thin fields, `type` "deliberately free-form") |
| **The bridge** — emit a conformant document _automatically_ from a strict definition        | **nobody**               | —                                                                           |

The evidence that the bridge is the real gap is unusually strong: clispec's own Rust guide tells authors to hand-roll the clap walker and names no crate; upstream clap declined to solve it ([#6235](https://github.com/clap-rs/clap/issues/6235), closed in 19 minutes with "which schema?"); and a GitHub code search for `filename:cli_json.rs language:rust` returns **41 independent reimplementations of the same file**.

**Recommended repositioning:** do not write spec v1 from zero. Adopt or extend clispec's schema, contribute the parsing-layer fields it lacks, and make the project's distinctive deliverable the **derivation + conformance tooling** — the thing that makes a conformant CLI cheap instead of a manual chore. That is a defensible, un-owned position; "another CLI spec" is not.

### The concrete recommendation

- **Reference implementation:** Rust + `clap` v4 **derive** (never the builder API — see the release-mode `ArgMatches` trap in §2.6b) + a `schema` subcommand. Implement it as a `clap_complete::Generator`, the way `carapace_spec_clap` does, so it drops into any existing `generate()` call site. Emit clispec-shaped JSON, enriched with the parsing-layer fields clispec omits.
- **Schema content:** take field coverage from Click's `to_info_dict()` and clap's `get_possible_values()` (the only one preserving enum aliases _and_ per-variant help), and contract discipline from Swift's `ToolInfoV0` — a declared, versioned, round-trippable type in its own module. Take the semantic vocabulary from clispec (`effects`, `cardinality`, `errors[].exit_code`, `stdout_schema`), which independently converges with jdx `usage`'s `effect: read|write|destructive`. **Two independent projects inventing the same side-effect classification is a strong signal it belongs in the spec.**
- **Known schema gap to solve deliberately:** numeric range bounds are unrecoverable from clap (`ValueParser`'s `Debug` prints a type id), and mutual-exclusion/`requires` need `Command::get_arg_conflicts_with` rather than `Arg` accessors. Decide whether to carry these as declared annotations or upstream a small patch.
- **Conformance kit:** black-box, driven entirely through `argv`/exit code/stdout/stderr, so it validates a CLI in _any_ language. `trycmd` (epage's own, 5.8M downloads) already does the run-binary-and-diff-output loop and is the natural substrate. The assertions write themselves from §2.1 and §2.5: unknown flag ⇒ non-zero exit, message on stderr, **nothing on stdout**; extra positional ⇒ same; **unknown _nested_ subcommand ⇒ non-zero** (the cobra hole); `--help` ⇒ stdout, exit 0, works anywhere; no ANSI when stdout is not a TTY; `--json` ⇒ parseable stdout with zero diagnostic contamination; schema round-trips and matches observed behavior. Add two language-specific must-run checks: **clap's `Cli::command().debug_assert()` in a debug-profile test** (a no-op in release), and cobra's `Args` non-nil on **every** node.
- **Ban list the survey directly justifies:** clap's `ignore_errors` / `allow_hyphen_values` / `trailing_var_arg` / `infer_long_args` / `allow_external_subcommands`; cobra's `FParseErrWhitelist` (it swallows the flag's _value_ too); Click's `ignore_unknown_options`; pydantic-settings' `cli_ignore_unknown_args`; argparse's `allow_abbrev=True` and bare `parse_known_args`; commander's `allowUnknownOption()`.
- **For the developer's own CLIs:** stay on Bun + TypeScript. Adopt **`@stricli/core`** (strictest defaults + best compile-time typing in TS) or keep **`commander` ≥ 13** (strict on both axes, best in-process testability via `exitOverride()` + `configureOutput()`). **Avoid `citty`, `yargs` and `gunshi` for agent-facing CLIs** — all three return exit 0 on an unknown flag. If you like citty's data-shaped definitions (and you should — it is the best schema shape in TS), wrap it in a strict-parsing layer rather than adopting it raw. Note also that commander's `Option.required` means "takes a value" while `Option.mandatory` means "user must supply it" — anyone writing an exporter will get this backwards once.

### The one-line version

Methodology is ~70% of this and travels across every language; the remaining ~30% — runtime startup latency, structural enforcement of required-ness, and whether enums and constraints survive introspection — is real and language-determined, and points at Rust + clap derive for the reference implementation while leaving Bun + TypeScript perfectly viable for everyday agent-first CLIs. The bigger strategic finding is that the spec itself is already half-written at clispec.dev, and the genuinely unowned ground is not the specification but the **automatic derivation of a conformant schema from a strict definition** — which this survey shows is 31 lines of work in the right framework and structurally impossible in the most popular one.

---

## Appendix A — Verification status

**Verified by building and running on this machine (2026-08-13):**
Rust clap 4 derive (release binary, strictness + latency + size) · Go cobra 1.10.2 (strictness incl. unknown subcommand, `__complete` protocol, latency, size) · Swift ArgumentParser (full `--experimental-dump-help` JSON, strictness incl. enum/required/abbreviation, latency, size) · TypeScript: commander 15.0.0, yargs 18.1.0, cac 7.0.0, citty 0.2.2, clipanion 4.0.0-rc.4, @stricli/core 1.3.0, gunshi 0.37.1, node:util parseArgs — all strictness results, all latencies, dependency sizes · `bun build --compile` size and latency · Python argparse/click/typer latencies and `-X importtime`, argparse `allow_abbrev` acceptance of `--verb`, argparse/click/typer exit codes and error text, `click.to_info_dict()` full JSON dump and direct serializability, Typer's Rich box-drawing on non-TTY stderr · commander schema introspection dump · citty schema serialization · citty source-level confirmation of missing unknown-flag check (`dist/index.mjs:133–172`, 216) · oclif `static strict = true` (`@oclif/core/lib/command.js:120`) · live `oclif.manifest.json` from unpkg · commander in-process test capture · Swift `ToolInfo.swift` type definitions and `HelpGenerator.swift:510–537` experimental TODO.

**Verified by an independent Go survey on the same machine (go1.26.5, darwin/arm64, 250-run harness):**
cobra v1.10.2, kong v1.16.1, urfave/cli v3.10.1 & v2.27.7, kingpin v2.4.0, go-flags v1.6.1, ff v4.0.0-beta.1, mitchellh/cli v1.1.5, fang v1.0.0 — all strictness results (unknown flag / root subcommand / **nested** subcommand / extra positionals / required / enum), `legacyArgs` and `ValidateArgs` source paths, `FParseErrWhitelist` value-swallowing, `GetString` typo behavior, `GenYamlTree` output, `__complete` protocol and directive bitfield, kong `Model` AST dump, urfave v3 `json:` tags, in-process test harnesses, startup latency and binary sizes for all of the above.

**Verified by an independent Rust survey on the same machine (rustc 1.96.0, 200-run interleaved randomized harness + in-process `Instant` microbenchmark):**
clap 4.6.6 (all six permissive-setting defaults via public getters; the five escape hatches each toggled and re-tested; `--dump-schema` exporter with `build()`; ValueEnum alias/hide/help recovery; the release-mode `debug_assert` no-op and `ArgMatches` typo trap, both proven with paired debug/release test runs; 7–18 µs parse microbenchmark; macOS AMFI ~140 ms cold-start isolation) · argh 0.1.19 `ArgsInfo` JSON · bpaf 0.9.27 · gumdrop 0.8.1 · xflags 0.3.2 · pico-args 0.5.0 · lexopt 0.3.2 strictness · `carapace_spec_clap` 1.2.3 and `clap_complete_fig` 4.5.2 output · clap_complete 4.6.9 dynamic completion callbacks · clap_mangen non-recursion · binary-size marginals for all six parsers.

**Verified by me directly (clispec.dev):** both JSON Schemas fetched live (HTTP 200; v0.2 9,058 B, v0.3 31,810 B); v0.3 top-level `required` and `$defs` inventory; `$defs.command`, `$defs.arg` and `$defs.error` field lists and enum values, quoted from the fetched schema.

**Verified from documentation/source only (📖):**
commander CHANGELOG v13.0.0 `allowExcessArguments` default change · yargs `.strict()` opt-in semantics (`docs/api.md:1695–1707`, plus empirical confirmation that unknown flags pass without it) · jdx `usage` spec node types and JSON/json-schema generation · `usage` cobra integration API · cobra#2362 flag/schema gap · clig.dev guidance · oclif manifest docs.

**NOT verified — flagged as uncertain (❓):**
clap's numeric-range recovery via `unsafe`/downcast or a fork (proven impossible via the public API only) · Linux/Windows numbers for anything (all timings and sizes are macOS arm64; the ~140 ms cold start is a macOS AMFI artifact that Linux will not have; binary-size _ordering_ is corroborated by [argparse-rosetta-rs](https://github.com/rosetta-rs/argparse-rosetta-rs) but absolute values will differ) · `clispec score`'s actual probes — whether it executes the binary, parses `--help`, or requires a `schema` command (❓ unknown, and directly relevant to how we'd integrate) · whether `click-man`/`sphinx-click` actually fail against Typer ≥0.26 (strongly implied by the failed `isinstance`, not run) · PyInstaller/Nuitka/shiv/pex packaging · `picocli` empirical behavior and JVM startup cost · .NET `System.CommandLine` entirely (dotnet not installed) · Nushell `scope commands` (nu not installed) · `carapace-spec` current format (docs URL returned 404) · Fig autocomplete's current maintenance status under Amazon Q (search results were inconclusive; the repo appears live but the product has migrated) · oclif runtime startup latency (not measured) · whether `argparse`'s `allow_abbrev` hazard reproduces on 3.13+ (logic not re-run per-version) · `ff` v3 (only v4 beta tested) · urfave v3's `Arguments`/`StringArgs` `Max` behavior (read from source at `args.go:151–207`, not run end-to-end) · `go-flags` schema exporter (API surface confirmed by reading source; no exporter built).

**A caution on the latency table:** these are macOS/Apple-Silicon numbers with warm filesystem caches. Linux process spawn is typically cheaper; Windows notably more expensive. The _ratios_ are the durable finding, not the absolute milliseconds.
