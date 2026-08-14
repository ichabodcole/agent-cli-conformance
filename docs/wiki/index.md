---
type: index
title: Agent-first CLI framework — wiki
description: The catalog. One line per page; update it in the same commit as the page.
tags: [index, catalog]
status: current
updated: 2026-08-13
---

# Agent-first CLI framework — wiki

Durable, curated knowledge for building command-line tools that LLM agents can drive without
falling into silent failures. The contract for maintaining these pages is
[SCHEMA.md](./SCHEMA.md); the evidence that produced them lives in `research/`, outside this
wiki.

> **Status: early.** This wiki is being written alongside the spec it documents. Sections
> below with no entries are scaffolded, not forgotten.

## Concepts

What each part of a CLI _is_.

- [Exit codes](./concepts/exit-codes.md) — the only part of a response a caller can read
  without parsing anything, and the only signal that survives truncation.

## Archetypes

The shapes a CLI takes, and which rules bind differently for each.

_None yet — stateless-verb, service-client, daemon-session, streaming and delegator are
planned._

## Rules

The normative spec, one page per rule. Each declares the checker that enforces it.

### Parsing

- [A1 — Unknown flags must exit non-zero](./rules/parsing/unknown-flag-exits-nonzero.md) —
  accepting an unrecognised flag produces a wrong answer with a success exit code.

## Decisions

Why we chose what we chose, citing the research.

- [Exit codes stay below 125](./decisions/exit-codes-below-125.md) — reserving the shell's
  existing band gives delegating CLIs verbatim passthrough for free.

## Guides

How to actually do things.

_None yet — adopting the spec, adding a checker, and migrating an existing CLI are planned._
