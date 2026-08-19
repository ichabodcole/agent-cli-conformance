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

Inert (`L0`).

```
<cli> --help
```

Passes when no capture matches a known credential pattern: common provider prefixes (`sk-`,
`ghp_`, `xox`), an AWS access key (`AKIA…`), a `PRIVATE KEY` block, a JWT, or a password embedded
in a URL.

Two honest limits, both reported rather than glossed:

- **It cannot catch a secret it does not recognise, and it only scans root `--help`.** A bespoke
  token format with no telltale prefix passes. Of the three surfaces the rule names — help,
  schema output, error messages — one is scanned: a discovered subcommand group's own help, a
  `schema` subcommand (when present), and every error path go unread, so the second and third
  **MUST NOT** above are not exercised at all. A clean result means "no known pattern found in
  root help", not "no secret present", and the checker's own pass detail says so.
- **It cannot distinguish a real credential from a placeholder.** `--token sk-example-xxxx` in
  an example is flagged. That is the correct bias — a false positive costs one look, a false
  negative publishes a key — but it means findings need reading, not automatic trust.

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

## How to comply

Default every secret-bearing flag to `null` and resolve it inside the handler. Read from the
environment or a credential file; never from a default, and never from a flag value the caller
has to type, since that lands in process listings and shell history.

When reporting a credential problem, describe the _class_ of fault and never the value: which
credential was expected, where it is read from, how to supply it.

## Evidence

The seed's manifest warning above is the direct source. The wider pattern is standard guidance:
clig.dev states that secrets must never be accepted as flag values because they leak into
process lists and shell history, and recommends credential files or pipes instead.

`operator` handles the error-message half deliberately — its credential error class carries an
explicit note never to include the key in the message, on the reasoning that its threat model is
"leak equals access emergency" rather than "rotate for hygiene". The same reasoning applies to
anything a schema publishes, which is read far more widely than an error.
