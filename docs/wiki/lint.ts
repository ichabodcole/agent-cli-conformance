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

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  type LintPage,
  parseFrontmatter,
  runDocsLint,
  walkMarkdown,
  yamlList,
} from "../../scripts/docs-lint/index.ts";
import { CHECKERS } from "../../src/acc/kit/registry.ts";

const WIKI_ROOT = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(WIKI_ROOT, "../..");
const CHECKERS_DIR = join(REPO_ROOT, "src/acc/kit/checkers");

// CHECKERS is plain data — `probes`/`check` are function references, never invoked at import
// time — so this import has no side effects and is safe from a lint entry point.
const PROBE_LEVEL_BY_RULE_ID = new Map(CHECKERS.map((c) => [c.ruleId, c.probeLevel]));
const TIER_BY_RULE_ID = new Map(CHECKERS.map((c) => [c.ruleId, c.tier]));
const COVERAGE_BY_RULE_ID = new Map(CHECKERS.map((c) => [c.ruleId, c.coverage]));
const COVERAGE_GAPS_BY_RULE_ID = new Map(CHECKERS.map((c) => [c.ruleId, c.coverageGaps]));

const TIERS = new Set(["core", "diagnostic"]);
const PROBE_LEVELS = new Set(["L0", "L1", "L2"]);
const COVERAGES = new Set(["complete", "partial"]);

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

    // Same argument for `tier`, and it is the more consequential of the two: `Checker.tier`
    // decides whether a failure BLOCKS conformance at all, so a page saying `core` while its
    // checker says `diagnostic` describes a gate that does not exist. All 19 pairs agree
    // today; this is about the gate, not about a live defect. Same guards as above — an
    // already-reported BAD tier or a `planned` rule makes the comparison meaningless.
    if (status === "implemented" && id && tier && TIERS.has(tier)) {
      const checkerTier = TIER_BY_RULE_ID.get(id);
      if (checkerTier && checkerTier !== tier)
        problems.push(
          `MISMATCH tier ${page.rel}: page declares "${tier}", checker declares "${checkerTier}"`,
        );
    }

    // `coverage` is the third pair, and the one a reader is most likely to take on trust: it is
    // the difference between "a pass means the whole rule held" and "a pass means nothing the
    // checker looked at was violated". Unlike `tier` and `probe_level` it is checked on EVERY
    // rule page including `planned` ones — a page may honestly declare `partial` before its
    // checker exists, and the cross-check below only fires once there is a checker to compare
    // against, so nothing is lost by validating the field itself unconditionally.
    const coverage = page.fields.get("coverage");
    if (!coverage || !COVERAGES.has(coverage)) {
      problems.push(
        `BAD coverage   ${page.rel}: "${coverage ?? ""}" not in {${[...COVERAGES].join(", ")}}`,
      );
      continue;
    }
    // The invariant the field exists for. `partial` naming no gaps is a page admitting a hole
    // while describing none of it — the information-free verdict this project criticises a CLI
    // for emitting. `complete` naming one is a page contradicting itself.
    const gaps = yamlList(page.fields.get("coverage_gaps"));
    if (coverage === "partial" && gaps.length === 0)
      problems.push(`MISSING coverage_gaps ${page.rel}: "partial" must name at least one gap`);
    if (coverage === "complete" && gaps.length > 0)
      problems.push(
        `EXTRA coverage_gaps ${page.rel}: "complete" must name none, found ${gaps.length}`,
      );

    if (status === "implemented" && id) {
      const checkerCoverage = COVERAGE_BY_RULE_ID.get(id);
      if (checkerCoverage && checkerCoverage !== coverage)
        problems.push(
          `MISMATCH coverage ${page.rel}: page declares "${coverage}", checker declares "${checkerCoverage}"`,
        );
      // Compared element by element, in order, not as a set or a count: the gaps are the text
      // `acc check` prints when it withholds `fullyVerified`, so a page and a checker disagreeing
      // about their wording means the report and the wiki tell a reader two different stories
      // about the same hole.
      const checkerGaps = COVERAGE_GAPS_BY_RULE_ID.get(id);
      if (checkerGaps && checkerGaps.join(" ") !== gaps.join(" "))
        problems.push(
          `MISMATCH coverage_gaps ${page.rel}:\n     page: ${JSON.stringify(gaps)}\n  checker: ${JSON.stringify(checkerGaps)}`,
        );
    }

    // ...and the same list a third time, in the page's own PROSE. Frontmatter is not what a
    // reader reads: five rule pages described a broader measurement than their checker performs
    // (review R3-6), every one of them while carrying correct `coverage_gaps` two lines above.
    // The frontmatter is already bound to the checker, so binding the prose to the frontmatter
    // binds all three — and the copy a reader actually sees stops being the unchecked one.
    const stated = statedGaps(page.body);
    if (stated === null) {
      problems.push(
        `MISSING COVERAGE  ${page.rel}: no "${COVERAGE_HEADING}" section with a ${GAPS_MARKER} list`,
      );
    } else if (stated.join(" ") !== gaps.join(" ")) {
      problems.push(
        `MISMATCH stated gaps ${page.rel}:\n        prose: ${JSON.stringify(stated)}\n  frontmatter: ${JSON.stringify(gaps)}`,
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

/** The index section the matrix owns. Everything between it and the next heading is generated. */
export const MATRIX_HEADING = "### Coverage at a glance";

/** The rule-page section that states what its checker does and does not establish. */
export const COVERAGE_HEADING = "## Current checker coverage";

/** The line inside it that introduces the gap list. */
export const GAPS_MARKER = "**Gaps**";

/**
 * The gap phrases a rule page states in prose, or null when the section is absent.
 *
 * Reading the BODY and not just the frontmatter is the point (review R3-6). `coverage_gaps` is
 * already bound to the checker, but a reader does not read frontmatter — they read the page, and
 * a page whose prose describes a broader probe than the checker performs is the drift this
 * project exists to fail on. Two copies of the list is the price; both are gated.
 *
 * Continuation lines are folded back into their bullet because Prettier re-wraps every list item
 * in this repo, and backslashes are dropped because it escapes markdown punctuation on the way.
 */
export function statedGaps(body: string): string[] | null {
  const section = sectionBody(body, COVERAGE_HEADING);
  if (section === null) return null;
  const lines = section.split("\n");
  const marker = lines.findIndex((l) => l.trim().startsWith(GAPS_MARKER));
  if (marker === -1) return null;

  const gaps: string[] = [];
  for (const raw of lines.slice(marker + 1)) {
    const line = raw.trim();
    if (line === "") {
      if (gaps.length) break; // a blank line after the list ends it; before it, skip
      continue;
    }
    if (line.startsWith("- ")) gaps.push(line.slice(2));
    else if (gaps.length) gaps[gaps.length - 1] += ` ${line}`;
    else break; // prose between the marker and the first bullet: not a list
  }
  return gaps.map((g) => g.replace(/\\/g, "").replace(/\s+/g, " ").trim());
}

/**
 * The rule / tier / probe level / checker_status / coverage / gap-count matrix (review R3-1).
 *
 * Derived from the same frontmatter the cross-checks above bind to the registry, so the table
 * cannot claim a coverage the checker does not declare — it would have to drift past two gates
 * to do it. Hand-maintaining nineteen rows beside nineteen pages is the exact shape of drift
 * this wiki exists to fail on.
 */
export function coverageMatrix(pages: LintPage[]): string {
  const rules = pages
    .filter((p) => p.fields.get("type") === "rule")
    .map((p) => ({
      id: p.fields.get("rule_id") ?? "",
      rel: p.rel,
      tier: p.fields.get("tier") ?? "",
      level: p.fields.get("probe_level") ?? "",
      status: p.fields.get("checker_status") ?? "",
      coverage: p.fields.get("coverage") ?? "",
      gaps: yamlList(p.fields.get("coverage_gaps")).length,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const complete = rules.filter((r) => r.coverage === "complete").length;
  const gaps = rules.reduce((n, r) => n + r.gaps, 0);

  return [
    "Generated from rule frontmatter by `bun run docs:sync`; the lint fails when it drifts.",
    "**Checker** is presence — a checker file exists and is registered. **Coverage** answers the",
    "different question of how much of the page that checker actually establishes, and each rule",
    "page names its own gaps. See [SCHEMA.md](./SCHEMA.md#rule-pages-carry-extra-frontmatter).",
    "",
    "| Rule | Tier | Level | Checker | Coverage | Gaps |",
    "| ---- | ---- | ----- | ------- | -------- | ---- |",
    ...rules.map(
      (r) =>
        `| [${r.id}](./${r.rel}) | ${r.tier} | ${r.level} | ${r.status} | ${r.coverage} | ${r.gaps} |`,
    ),
    "",
    `${rules.length} rules · ${complete} \`complete\` · ${rules.length - complete} \`partial\` · ${gaps} named gaps.`,
  ].join("\n");
}

/** The lines between `heading` and the next heading of any depth, or null when absent. */
export function sectionBody(md: string, heading: string): string | null {
  const lines = md.split("\n");
  const start = lines.indexOf(heading);
  if (start === -1) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => /^#{1,6}\s/.test(l));
  return (end === -1 ? rest : rest.slice(0, end)).join("\n").trim();
}

/**
 * Compare generated markdown against what is on the page, ignoring the formatting Prettier owns.
 *
 * Prettier pads table cells to align them and re-wraps prose at the print width. Neither is a
 * difference the generator should have to predict, and one that tried would be re-implementing
 * Prettier in order to keep a gate green. So cells are trimmed, the alignment row is collapsed,
 * and consecutive prose lines are joined back into one paragraph.
 */
export function normalizeBlock(block: string): string {
  const out: string[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) out.push(para.join(" "));
    para = [];
  };
  for (const raw of block.split("\n")) {
    const line = raw.trim();
    if (line.startsWith("|")) {
      flush();
      const cells = line
        .split("|")
        .slice(1, -1)
        .map((c) => c.trim().replace(/^:?-+:?$/, "-"));
      out.push(`|${cells.join("|")}|`);
    } else if (line === "") flush();
    else para.push(line);
  }
  flush();
  return out.join("\n");
}

/** The index's matrix section must equal what the rule pages generate. */
export function matrixChecks(pages: LintPage[]): string[] {
  const index = pages.find((p) => p.rel === "index.md");
  // A missing catalog is already the core lint's NO CATALOG problem; do not report it twice.
  if (!index) return [];
  const found = sectionBody(index.body, MATRIX_HEADING);
  if (found === null)
    return [`MISSING MATRIX index.md: no "${MATRIX_HEADING}" section  (run \`bun run docs:sync\`)`];
  return normalizeBlock(found) === normalizeBlock(coverageMatrix(pages))
    ? []
    : [`STALE MATRIX   index.md: "${MATRIX_HEADING}" is out of date  (run \`bun run docs:sync\`)`];
}

/** Read the wiki as `LintPage`s, for the generator running outside `runDocsLint`. */
function readPages(): LintPage[] {
  return walkMarkdown(WIKI_ROOT).map((path) => {
    const body = readFileSync(path, "utf8");
    const fm = /^---\n([\s\S]*?)\n---/.exec(body);
    return {
      path,
      rel: relative(WIKI_ROOT, path),
      fields: fm ? parseFrontmatter(fm[1]) : new Map<string, string>(),
      body,
    };
  });
}

/** Rewrite the index's matrix section in place. Prettier reformats it afterwards; the lint
 *  compares through `normalizeBlock`, so both spellings pass. */
function writeMatrix(): void {
  const indexPath = join(WIKI_ROOT, "index.md");
  const lines = readFileSync(indexPath, "utf8").split("\n");
  const start = lines.indexOf(MATRIX_HEADING);
  if (start === -1) {
    console.log(`no "${MATRIX_HEADING}" heading in index.md — add it first`);
    process.exit(1);
  }
  // Sliced by line index rather than by replacing the old body as a string: an EMPTY section
  // (the heading freshly added, nothing under it) has no body to find, and a string replace of
  // "" would splice the table in at the top of the file.
  const after = lines.slice(start + 1);
  const end = after.findIndex((l) => /^#{1,6}\s/.test(l));
  const tail = end === -1 ? [] : after.slice(end);
  writeFileSync(
    indexPath,
    [...lines.slice(0, start + 1), "", coverageMatrix(readPages()), "", ...tail].join("\n"),
  );
  console.log(`index.md: "${MATRIX_HEADING}" regenerated`);
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
  if (process.argv.includes("--write")) {
    writeMatrix();
  } else {
    const problems = runDocsLint({
      root: WIKI_ROOT,
      types: ["concept", "archetype", "rule", "decision", "guide", "index"],
      dateField: "updated",
      allowDateOnly: true,
      extraChecks: (pages) => [...ruleChecks(pages), ...matrixChecks(pages)],
      json: process.argv.includes("--json"),
    });

    process.exit(problems === 0 ? 0 : 1);
  }
}
