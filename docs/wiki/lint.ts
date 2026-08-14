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
import { CHECKERS } from "../../src/acc/kit/registry.ts";

const WIKI_ROOT = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(WIKI_ROOT, "../..");
const CHECKERS_DIR = join(REPO_ROOT, "src/acc/kit/checkers");

// CHECKERS is plain data — `probes`/`check` are function references, never invoked at import
// time — so this import has no side effects and is safe from a lint entry point.
const PROBE_LEVEL_BY_RULE_ID = new Map(CHECKERS.map((c) => [c.ruleId, c.probeLevel]));

const TIERS = new Set(["core", "diagnostic"]);
const PROBE_LEVELS = new Set(["L0", "L1", "L2"]);

/**
 * Rule pages carry machine-readable frontmatter (`rule_id`, `tier`, `probe_level`,
 * `checker`) so the spec and the kit can be cross-checked against each other. Docs drift
 * becomes a failing gate instead of something noticed six months later.
 *
 * The checker-file existence check is gated by `checker_status`, not by whether the kit
 * exists yet: a `planned` rule may declare its future path before the file is written, and
 * only an `implemented` rule owes one on disk. A lint that failed on honestly-declared future
 * work would just train you to ignore it. The reverse direction (a checker file with no rule
 * page) stays dormant until `src/acc/kit/checkers/` exists at all — there is nothing to walk
 * before then.
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
    const status = page.fields.get("checker_status");
    if (status !== "planned" && status !== "implemented")
      problems.push(
        `BAD checker_status ${page.rel}: "${status ?? ""}" not in {planned, implemented}`,
      );
    declaredCheckers.add(checker);
    // Only an `implemented` rule owes a file. `planned` is the ratchet: declare the path now,
    // land the checker later, and the count of planned rules is the visible remaining work.
    if (status === "implemented" && !existsSync(join(REPO_ROOT, checker)))
      problems.push(`MISSING CHECKER ${page.rel}: declares "${checker}", which does not exist`);

    // `Checker.probeLevel` gates the conformance verdict (buildReport reports it not-applicable
    // above its declared level), so a page's `probe_level` frontmatter drifting from the
    // checker's actual value would silently change what a run claims to have verified. Only
    // checked once the rule is `implemented` and `id`/`level` are individually valid — an
    // already-reported BAD probe_level or a `planned` rule (no live checker to compare against)
    // would make this comparison meaningless.
    if (status === "implemented" && id && level && PROBE_LEVELS.has(level)) {
      const checkerLevel = PROBE_LEVEL_BY_RULE_ID.get(id);
      if (checkerLevel && checkerLevel !== level)
        problems.push(
          `MISMATCH probe_level ${page.rel}: page declares "${level}", checker declares "${checkerLevel}"`,
        );
    }
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
