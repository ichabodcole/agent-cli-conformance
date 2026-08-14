#!/usr/bin/env bun
// The wiki's lint + knowledge-graph entry point.
//
//   bun docs/wiki/lint.ts          → lint (non-zero exit on any break; runs in pre-commit)
//   bun docs/wiki/lint.ts --json   → emit the knowledge graph as JSON on stdout
//
// The universal behaviour lives in scripts/docs-lint, which is deliberately portable.
// Everything below the `types` list is what makes THIS wiki different: a rule page is not
// prose, it is the human-readable half of a conformance checker, and the two must not drift.
// That check has no business in the portable core, so it lives here.

import { existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { type LintPage, runDocsLint } from "../../scripts/docs-lint/index.ts";

const WIKI_ROOT = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(WIKI_ROOT, "../..");
const CHECKERS_DIR = join(REPO_ROOT, "scripts/checkers");

const TIERS = new Set(["core", "diagnostic"]);
const PROBE_LEVELS = new Set(["L0", "L1", "L2"]);

/**
 * Rule pages carry machine-readable frontmatter (`rule_id`, `tier`, `probe_level`,
 * `checker`) so the spec and the kit can be cross-checked against each other. Docs drift
 * becomes a failing gate instead of something noticed six months later.
 *
 * The checker-file half only activates once `scripts/checkers/` exists — before the kit is
 * built there is nothing to point at, and a lint that fails on absent future work just
 * trains you to ignore it.
 */
export function ruleChecks(pages: LintPage[]): string[] {
  const problems: string[] = [];
  const rules = pages.filter((p) => p.fields.get("type") === "rule");
  const seenIds = new Map<string, string>();
  const declaredCheckers = new Set<string>();

  for (const page of rules) {
    const id = page.fields.get("rule_id");
    if (!id) {
      problems.push(`MISSING rule_id ${page.rel}  (every rule page needs a stable id)`);
    } else if (seenIds.has(id)) {
      problems.push(`DUPLICATE rule_id ${page.rel}: "${id}" already used by ${seenIds.get(id)}`);
    } else {
      seenIds.set(id, page.rel);
    }

    const tier = page.fields.get("tier");
    if (!tier || !TIERS.has(tier))
      problems.push(
        `BAD tier       ${page.rel}: "${tier ?? ""}" not in {${[...TIERS].join(", ")}}`,
      );

    const level = page.fields.get("probe_level");
    if (!level || !PROBE_LEVELS.has(level))
      problems.push(
        `BAD probe_level ${page.rel}: "${level ?? ""}" not in {${[...PROBE_LEVELS].join(", ")}}`,
      );

    const checker = page.fields.get("checker");
    if (!checker) {
      problems.push(`MISSING checker ${page.rel}  (name the file that enforces this rule)`);
      continue;
    }
    declaredCheckers.add(checker);
    if (existsSync(CHECKERS_DIR) && !existsSync(join(REPO_ROOT, checker)))
      problems.push(`MISSING CHECKER ${page.rel}: declares "${checker}", which does not exist`);
  }

  // The reverse direction: a checker with no rule page is an undocumented rule, which is how
  // a conformance kit becomes folklore.
  if (existsSync(CHECKERS_DIR)) {
    for (const f of walk(CHECKERS_DIR)) {
      const relPath = f.slice(REPO_ROOT.length + 1);
      if (!declaredCheckers.has(relPath))
        problems.push(`UNDOCUMENTED   ${relPath}  (no rule page declares this checker)`);
    }
  }

  return problems;
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (p.endsWith(".ts") && !p.endsWith(".test.ts")) out.push(p);
  }
  return out;
}

// Guarded so this file can be IMPORTED (by lint.test.ts) without linting the wiki and
// exiting the process. `bun docs/wiki/lint.ts` still runs it; `import` does not.
if (import.meta.main) {
  const problems = runDocsLint({
    root: WIKI_ROOT,
    types: ["concept", "archetype", "rule", "decision", "guide", "index"],
    dateField: "updated",
    allowDateOnly: true,
    extraChecks: ruleChecks,
    json: process.argv.includes("--json"),
  });

  process.exit(problems === 0 ? 0 : 1);
}
