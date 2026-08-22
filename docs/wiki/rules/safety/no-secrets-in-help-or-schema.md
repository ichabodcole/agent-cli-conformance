---
type: rule
title: Help and schema never contain secrets
description:
  Flag defaults are copied verbatim into introspection output — so a defaulted credential is
  published to anything that asks.
tags: [safety, schema, secrets, core]
related: [concept/machine-mode, rule/help-output-is-deterministic]
status: stable
generated: { by: claude-opus-5, at: 2026-08-14 }
rule_id: F1
tier: core
deviation: defect
probe_level: L0
checker: src/acc/kit/checkers/safety/no-secrets-in-help.ts
checker_status: implemented
coverage: partial
coverage_gaps:
  - only root help is scanned and never schema output or error messages
  - only seven known credential shapes are matched so a bespoke token is invisible
  - a secret carried as a flag default is only seen if help prints defaults
  - nested subcommand help is never scanned even though a flag default usually belongs to a leaf command
coverage_established:
  - the stdout and stderr of root help match none of seven known credential patterns
---

# Help and schema never contain secrets

## The rule

Help text and schema output **MUST NOT** contain credentials, tokens, API keys, passwords,
session identifiers, or connection strings with embedded passwords.

A flag **MUST NOT** carry a secret as its default value. Secrets are read from the environment
or a credential file inside the handler, never declared in the command definition.

Error messages **MUST NOT** echo a credential back, including when reporting that it is
malformed or rejected.

## How to comply

**Bind the flag to an environment variable if your framework has that binding.** `click` and
`typer` take `envvar="ACME_TOKEN"` alongside `default=None`; `kong` takes an `env` tag on the
struct field; `clap` takes `#[arg(env = "ACME_TOKEN")]` once the `env` feature is enabled
(`Arg::get_env` is `#[cfg(feature = "env")]`); jdx `usage` has an `env` attribute on a flag node.
This is the fix rather than a mitigation, because the binding and the default are separate
fields all the way through introspection — Click's `to_info_dict()` serialises `envvar` and
`default` side by side, `kong.Flag` carries `Envs` and `Default` side by side — so the schema
publishes the variable's _name_ where the default would have published the credential. A caller
learns where to put the secret and never reads one.

**Where there is no such binding, move the read into the handler.** Leave the default `null` or
absent, and resolve the environment variable or credential file at the point of use. Do not take
the credential as a flag _value_ the caller types either: that lands in process listings and
shell history before any of this applies.

**Know which of your own outputs copies a default verbatim**, because the surfaces differ and
several of them are things you never invoke by hand:

- Swift ArgumentParser's `--experimental-dump-help` (`ToolInfoV0`) serialises defaults.
- Click and Typer's `to_info_dict()` carries `default`.
- `clap` has no built-in dump, so this is whatever your exporter reads — `get_default_values()`
  in a hand-rolled one, and `carapace_spec_clap` emits defaults too.
- `urfave/cli` v3 tags every field for JSON, so a bare `json.Marshal(cmd)` emits `defaultValue`.
- `kong.Model` and `citty`'s plain-data definition both carry the default to any walker.
- A `commander` tree walk reads `option.defaultValue`.
- `cobra`'s `GenYamlTree`/`GenMarkdownTree`/`GenManTree` emit `default_value` — this is generated
  _documentation_ rather than a schema, and it leaks identically.
- `oclif`'s `oclif.manifest.json` and `argh`'s `get_args_info()` both omit defaults, which is the
  one place the hazard does not reach. Note what oclif's would have cost: the manifest is
  published to npm, so a leak there reaches everyone who downloads the package without ever
  running the binary.

**Marking the flag hidden does not remove it.** Swift's dump, `to_info_dict()` and a
`clap` exporter reading `is_hide_set` all serialise the hidden marker as a _field on an entry
that is still present_. Hiding a flag from help output leaves its default in the schema.

**For the error-message clause there is no library switch — the change is in your printer.**
Report the class of fault and never the value: which credential was expected, where it is read
from, how to supply it. Redacting the value on the way out is weaker than never putting it in
the message, for the reason sink-redaction is weaker than source-normalisation anywhere else:
every redaction is a blind spot, and the pattern that misses is the bespoke token.

**One thing the research does not establish**, so check it yourself rather than assuming: no
surveyed framework offers a "sensitive" or "secret" marking that suppresses a value from
generated output. The field inventories the survey records — `hidden`, `required`, `default`,
`env`, `choices`, `deprecated` — contain nothing of the kind.

## Why

The mechanism is specific and easy to miss: **flag defaults are copied verbatim into
introspection output.** A schema generator walks the command tree and serialises what it finds,
including every declared default. A secret placed there is therefore published by design — to
`--help`, to `schema`, to generated documentation, to any agent reference built from it, and to
every transcript that captured any of them.

This project's own seed carries the warning in its manifest generator:

> _"WARNING: flag `default` values are copied verbatim into the manifest. NEVER default a flag
> to a secret (API key, password) — it would leak here. Default secrets to `null` and read them
> from the environment inside `run()`."_

That is exactly right, and it was a **comment**. This rule makes it a check — which is the
whole argument of this project applied to itself: a hazard documented where the mistake is made
is still a hazard, because documentation is read by whoever is already being careful.

The error-message clause covers the second common leak. A tool reporting `invalid token:
sk-live-abc123…` writes the credential into terminal scrollback, shell history, CI logs, and
any agent transcript — usually at exactly the moment someone is about to paste the output into
a bug report.

## The probe

Inert
([`L0`](../../concepts/probing.md#inertness-classifies-an-invocation-it-does-not-make-the-run-safe)).

```
<cli> --help
```

Detection is **pattern-based**, against a fixed list of known credential shapes: common provider
prefixes (`sk-`, `ghp_`, `xox`), an AWS access key (`AKIA…`), a `PRIVATE KEY` block, a JWT, or a
password embedded in a URL.

**Passes** when neither the stdout nor the stderr of root help matches one of them; **fails** when
either does, naming the pattern that matched.

**Reports `unverified`** when the probe hung, or was truncated or
[died on a signal](../../concepts/probing.md#a-probe-the-kit-killed-is-not-a-probe-the-target-failed)
with no match found: a clean scan over help the target never finished printing establishes nothing.
A match in the bytes that _were_ captured fails regardless — what was printed has already leaked.

Two honest limits, both reported rather than glossed:

- **It cannot catch a secret it does not recognise, and it only scans root `--help`.** A bespoke
  token format with no telltale prefix passes. Of the three surfaces the rule names — help,
  schema output, error messages — one is scanned: a discovered subcommand group's own help, a
  `schema` subcommand (when present), and every error path go unread, so the second and third
  **MUST NOT** above are not exercised at all. A clean result means "no known pattern found in
  root help", not "no secret present", and the checker's own pass detail says so.
- **It cannot distinguish a real credential from a placeholder.** `--token sk-example-xxxx` in
  an example is flagged, so findings need reading rather than automatic trust.

## Current checker coverage

[`no-secrets-in-help.ts`](../../../../src/acc/kit/checkers/safety/no-secrets-in-help.ts) — `L0`,
`coverage: partial`. A pass means nothing under **Established** was violated; the **Gaps** are
the rest of this page, unexamined.

**Established**

- the stdout and stderr of root help match none of seven known credential patterns

**Gaps**

- only root help is scanned and never schema output or error messages
- only seven known credential shapes are matched so a bespoke token is invisible
- a secret carried as a flag default is only seen if help prints defaults
- nested subcommand help is never scanned even though a flag default usually belongs to a leaf
  command

## Evidence

The seed's manifest warning above is the direct source. The wider pattern is standard guidance:
clig.dev states that secrets must never be accepted as flag values because they leak into
process lists and shell history, and recommends credential files or pipes instead.

The error-message half deserves the same care, on a threat model worth stating plainly: for a
credential, a leak is an access emergency rather than something to rotate for hygiene. An error
that echoes the key it rejected has published it to every log that captured the run. The
reasoning applies with more force to anything a schema publishes, which is read far more widely
than any one error.
