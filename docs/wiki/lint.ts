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
import { AMBIGUOUS_SIGNALS, FAULT_SIGNALS } from "../../src/acc/kit/signals.ts";

const WIKI_ROOT = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(WIKI_ROOT, "../..");
const CHECKERS_DIR = join(REPO_ROOT, "src/acc/kit/checkers");

// CHECKERS is plain data — `probes`/`check` are function references, never invoked at import
// time — so this import has no side effects and is safe from a lint entry point.
const PROBE_LEVEL_BY_RULE_ID = new Map(CHECKERS.map((c) => [c.ruleId, c.probeLevel]));
const TIER_BY_RULE_ID = new Map(CHECKERS.map((c) => [c.ruleId, c.tier]));
const COVERAGE_BY_RULE_ID = new Map(CHECKERS.map((c) => [c.ruleId, c.coverage]));
const COVERAGE_GAPS_BY_RULE_ID = new Map(CHECKERS.map((c) => [c.ruleId, c.coverageGaps]));
const COVERAGE_ESTABLISHED_BY_RULE_ID = new Map(
  CHECKERS.map((c) => [c.ruleId, c.coverageEstablished]),
);

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
    // checker says `diagnostic` describes a gate that does not exist. All 20 pairs agree
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

    // The other half of the same accounting, and — unlike the gaps — its invariant does not
    // branch on `coverage`. Every rule page owes at least one entry whatever its coverage:
    // a checker that establishes nothing is not a checker, and `complete` is not held to
    // anything FURTHER here, because "the established list covers the page" is a claim no
    // string comparison can make and a gate that only looks like one is worse than none.
    const established = yamlList(page.fields.get("coverage_established"));
    if (established.length === 0)
      problems.push(
        `MISSING coverage_established ${page.rel}: every rule page must name what a pass establishes`,
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
      if (checkerGaps && checkerGaps.join("\0") !== gaps.join("\0"))
        problems.push(
          `MISMATCH coverage_gaps ${page.rel}:\n     page: ${JSON.stringify(gaps)}\n  checker: ${JSON.stringify(checkerGaps)}`,
        );
      // Same comparison for what the page says a PASS means, and it is the half that used to be
      // checked by nothing (review DTX-8). The gap list was bound to the checker in both
      // directions and to the page's prose on top of that, while the **Established** list beside
      // it was free to claim a broader measurement than the checker performs — which SCHEMA.md
      // records happening, to five pages, with correct `coverage_gaps` two lines above.
      const checkerEstablished = COVERAGE_ESTABLISHED_BY_RULE_ID.get(id);
      if (checkerEstablished && checkerEstablished.join("\0") !== established.join("\0"))
        problems.push(
          `MISMATCH coverage_established ${page.rel}:\n     page: ${JSON.stringify(established)}\n  checker: ${JSON.stringify(checkerEstablished)}`,
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

    // ...and the third copy of the established list, for the identical reason. Reported
    // separately from the gaps above rather than folded into one COVERAGE message: a page can
    // state its holes correctly and still overstate what a pass means, which is precisely the
    // failure this half was added for, and one message standing in for the other would say the
    // section is wrong without saying which claim is.
    const claimed = statedEstablished(page.body);
    if (claimed === null) {
      problems.push(
        `MISSING ESTABLISHED ${page.rel}: no "${COVERAGE_HEADING}" section with an ${ESTABLISHED_MARKER} list`,
      );
    } else if (claimed.join(" ") !== established.join(" ")) {
      problems.push(
        `MISMATCH stated established ${page.rel}:\n        prose: ${JSON.stringify(claimed)}\n  frontmatter: ${JSON.stringify(established)}`,
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

/**
 * The per-type required sections, read from SCHEMA.md's own table rather than restated here.
 *
 * Same discipline as `MATRIX_HEADING` below and `typeOrderFromSchema` in the builder: a contract
 * stated in the document a writer reads and again in the code that checks it will drift, and the
 * copy that drifts is always the prose one. Cells are ` · `-separated and must be the heading
 * text verbatim.
 */
export function requiredSectionsFromSchema(schema: string): Map<string, string[]> {
  const out = new Map<string, string[]>();
  const table = /## Per-type page shape\n([\s\S]*?)\n\n/.exec(schema);
  if (!table) return out;
  for (const line of (table[1] as string).split("\n")) {
    const m = /^\|\s*`([a-z]+)`\s*\|(.+?)\|\s*$/.exec(line);
    if (!m) continue;
    out.set(
      m[1] as string,
      (m[2] as string)
        .split("·")
        .map((s) => s.trim())
        .filter(Boolean),
    );
  }
  return out;
}

/**
 * Every page carries its type's required sections, in the table's order.
 *
 * Extra sections are allowed and are ignored for ordering — a tutorial's `Step n` headings sit
 * between the fixed ones, and an archetype ends with a `Related rules` the table does not name.
 * What is checked is that the required ones are all present and that their RELATIVE order holds,
 * which is what makes the reordering in review DTX-2 a property rather than a convention that
 * decays the next time someone drafts a page from a neighbour.
 */
export function sectionChecks(pages: LintPage[], schema: string): string[] {
  const required = requiredSectionsFromSchema(schema);
  const problems: string[] = [];
  for (const page of pages) {
    const type = page.fields.get("type");
    const want = type ? required.get(type) : undefined;
    if (!want?.length) continue;
    const have = [...page.body.matchAll(/^## (.+)$/gm)].map((m) => (m[1] as string).trim());
    const missing = want.filter((s) => !have.includes(s));
    if (missing.length) {
      problems.push(`MISSING SECTION ${page.rel}: ${missing.join(", ")}  (see SCHEMA.md)`);
      continue; // order is meaningless while a section is absent
    }
    const positions = want.map((s) => have.indexOf(s));
    const sorted = [...positions].sort((a, b) => a - b);
    if (positions.join() !== sorted.join())
      problems.push(
        `SECTION ORDER  ${page.rel}: ${want.filter((_, i) => positions[i] !== sorted[i]).join(", ")}` +
          `  (SCHEMA.md orders them: ${want.join(" · ")})`,
      );
  }
  return problems;
}

export const MATRIX_HEADING = "### Coverage at a glance";

/**
 * A page's basename must be unique across the whole wiki.
 *
 * `acc show <handle>` resolves a slug through `graph.ts`'s `bySlug`, which is a Map built from
 * every page's basename — so two pages called `overview.md` in different folders make one of
 * them unreachable by slug, and which one wins is insertion order. The command has no way to
 * report the ambiguity, because by the time it looks the loser is gone.
 *
 * Stricter than the `type/slug` uniqueness the portable core enforces, and deliberately so: this
 * is a constraint the CLI imposes, not one the format does.
 */
export function slugChecks(pages: LintPage[]): string[] {
  const problems: string[] = [];
  const seen = new Map<string, string>();
  for (const page of pages) {
    // Contract pages are not entries in the type system — `graph.ts` skips them, so they cannot
    // collide on a slug. Must agree with CONTRACT_PAGES in scripts/docs-lint.
    if (/(SCHEMA|STYLE)\.md$/.test(page.rel)) continue;
    const slug = page.rel.slice(page.rel.lastIndexOf("/") + 1, -3);
    const first = seen.get(slug);
    if (first) problems.push(`DUPLICATE slug ${page.rel}: "${slug}" already used by ${first}`);
    else seen.set(slug, page.rel);
  }
  return problems;
}

/**
 * The markers G1's page puts in front of each signal list, so the lint can find them.
 *
 * Bold-run markers rather than headings, for the same reason `GAPS_MARKER` is one: the lists sit
 * inside `## The rule`, which is prose a reader works through in order, and promoting them to
 * headings to make them machine-findable would reorganise the page around the lint.
 */
export const FAULT_SIGNALS_MARKER = "**Fault-like — G1 reports `fail`**";
export const AMBIGUOUS_SIGNALS_MARKER = "**Externally ambiguous — G1 reports `unverified`**";

/**
 * The `SIG*` names in the paragraph following `marker`, or null when the marker is absent.
 *
 * Reads the paragraph rather than a list because these are inline code spans in running prose,
 * and folds its lines together first: Prettier re-wraps at the print width, so where the break
 * falls is not something a matcher should have to predict.
 */
export function statedSignals(body: string, marker: string): string[] | null {
  const lines = body.split("\n");
  const at = lines.findIndex((l) => l.trim().startsWith(marker));
  if (at === -1) return null;
  const para: string[] = [];
  for (const raw of lines.slice(at + 1)) {
    const line = raw.trim();
    if (line === "") {
      if (para.length) break; // a blank line after the paragraph ends it; before it, skip
      continue;
    }
    para.push(line);
  }
  return [...para.join(" ").matchAll(/`(SIG[A-Z0-9]+)`/g)].map((m) => m[1] as string);
}

/**
 * G1's two signal classes must be the same list on the page and in the checker.
 *
 * The narrowest possible instance of this wiki's whole thesis, and it exists because the general
 * version of the check missed it. `tier`, `probe_level`, `coverage` and `coverage_gaps` are all
 * bound in both directions already — but the SIGNALS G1 fails on were prose on one side and a
 * `filter` on the other, and they disagreed: the page excluded an operator's Ctrl-C, an outer
 * deadline's `SIGTERM` and an OOM kill, while the checker failed on any signal the kit did not
 * send (review R6-2). Two hand-maintained copies of one list is the drift this project exists to
 * fail the gate on, so the exported arrays are the source and the page quotes them.
 *
 * They are imported from `src/acc/kit/signals.ts` rather than from G1's checker file because C1
 * reads the same taxonomy for its own help paths, and a checker importing from another checker's
 * file is a dependency the `UNDOCUMENTED` scan above has no way to express. The subject of this
 * check is unchanged by the move: the SHIPPED page against the REAL exported arrays, in both
 * directions, with nothing in between.
 *
 * Order matters, as it does for `coverage_gaps`: a reader meets these in the order they are
 * written, and comparing them as sets would let the page reorder itself away from the code.
 */
export function signalScopeChecks(pages: LintPage[]): string[] {
  const page = pages.find((p) => p.fields.get("rule_id") === "G1");
  if (!page) return ["MISSING G1 PAGE  no rule page declares rule_id G1 (it names the signals)"];

  const problems: string[] = [];
  const cases: Array<[string, string, readonly string[]]> = [
    ["fault", FAULT_SIGNALS_MARKER, FAULT_SIGNALS],
    ["ambiguous", AMBIGUOUS_SIGNALS_MARKER, AMBIGUOUS_SIGNALS],
  ];
  for (const [label, marker, declared] of cases) {
    const stated = statedSignals(page.body, marker);
    if (stated === null) {
      problems.push(`MISSING SIGNALS ${page.rel}: no "${marker}" paragraph`);
    } else if (stated.join(" ") !== declared.join(" ")) {
      problems.push(
        `MISMATCH ${label} signals ${page.rel}:\n     page: ${JSON.stringify(stated)}\n  checker: ${JSON.stringify(declared)}`,
      );
    }
  }

  // A signal in both lists would make the page unreadable and the checker's classification
  // arbitrary — `FAULT` is consulted first, so the fault reading would silently win.
  const both = FAULT_SIGNALS.filter((s) => AMBIGUOUS_SIGNALS.includes(s));
  if (both.length > 0)
    problems.push(`OVERLAPPING SIGNALS does-not-crash.ts: ${both.join(", ")} in both classes`);

  return problems;
}

/** The rule-page section that states what its checker does and does not establish. */
export const COVERAGE_HEADING = "## Current checker coverage";

/** The line inside it that introduces the gap list. */
export const GAPS_MARKER = "**Gaps**";

/** ...and the one introducing the list of what a `pass` from the checker actually means. */
export const ESTABLISHED_MARKER = "**Established**";

/**
 * The bullets a rule page states under `marker`, or null when the section or the marker is absent.
 *
 * Reading the BODY and not just the frontmatter is the point (review R3-6). Both lists are
 * already bound to the checker, but a reader does not read frontmatter — they read the page, and
 * a page whose prose describes a broader probe than the checker performs is the drift this
 * project exists to fail on. Two copies of each list is the price; both are gated.
 *
 * ONE reader for both markers, rather than a second function beside it. The gap check shipped
 * first and the established check was added later (review DTX-8); a parallel implementation would
 * be two chances to disagree about what a bullet is, on a page where the two lists sit six lines
 * apart. The marker is the only thing that differs, so the marker is the only parameter.
 *
 * Continuation lines are folded back into their bullet because Prettier re-wraps every list item
 * in this repo, and backslashes are dropped because it escapes markdown punctuation on the way.
 */
export function statedList(body: string, marker: string): string[] | null {
  const section = sectionBody(body, COVERAGE_HEADING);
  if (section === null) return null;
  const lines = section.split("\n");
  const at = lines.findIndex((l) => l.trim().startsWith(marker));
  if (at === -1) return null;

  const bullets: string[] = [];
  for (const raw of lines.slice(at + 1)) {
    const line = raw.trim();
    if (line === "") {
      if (bullets.length) break; // a blank line after the list ends it; before it, skip
      continue;
    }
    if (line.startsWith("- ")) bullets.push(line.slice(2));
    else if (bullets.length) bullets[bullets.length - 1] += ` ${line}`;
    else break; // prose between the marker and the first bullet: not a list
  }
  return bullets.map((g) => g.replace(/\\/g, "").replace(/\s+/g, " ").trim());
}

/** The gap phrases a rule page states in prose, or null when the section is absent. */
export function statedGaps(body: string): string[] | null {
  return statedList(body, GAPS_MARKER);
}

/** What the page says in prose that a `pass` establishes, or null when the section is absent. */
export function statedEstablished(body: string): string[] | null {
  return statedList(body, ESTABLISHED_MARKER);
}

/**
 * The rule / tier / probe level / checker_status / coverage / gap-count matrix (review R3-1).
 *
 * Derived from the same frontmatter the cross-checks above bind to the registry, so the table
 * cannot claim a coverage the checker does not declare — it would have to drift past two gates
 * to do it. Hand-maintaining one row per rule page beside the page itself is the exact shape of
 * drift this wiki exists to fail on, and a catalogue that grows a family makes it worse.
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

/**
 * Every catalog entry in the index: the page it points at, and the hook it states.
 *
 * An entry is a list item whose first token is a link to a `.md` page; a Prettier-wrapped
 * continuation line belongs to the entry above it. Table rows and inline links are excluded by
 * construction, which is what keeps the generated matrix from being read as twenty catalog
 * entries with no hooks.
 */
export function catalogEntries(indexBody: string): Array<{ target: string; hook: string }> {
  // Folded BEFORE the link is matched, not after. Prettier is free to break a long link's TEXT
  // across lines, and a matcher that read one physical line at a time simply skipped those
  // entries — a check with a silent hole exactly where the entries are longest.
  const items: string[] = [];
  let inItem = false;
  for (const raw of indexBody.split("\n")) {
    if (/^-\s+\[/.test(raw)) {
      items.push(raw.trim());
      inItem = true;
    } else if (inItem && /^\s+\S/.test(raw)) items[items.length - 1] += ` ${raw.trim()}`;
    else inItem = false;
  }

  const out: Array<{ target: string; hook: string }> = [];
  for (const item of items) {
    const m = /^-\s+\[[^\]]*\]\(([^)#]+\.md)\)(.*)$/.exec(item);
    if (m) out.push({ target: (m[1] ?? "").replace(/^\.\//, ""), hook: m[2] ?? "" });
  }
  return out.map((e) => ({
    target: e.target,
    // The tier marker is navigation, not part of the sentence, so it is stripped before the
    // comparison rather than pushed into twenty-five `description` fields.
    hook: e.hook
      .replace(/\s+/g, " ")
      .replace(/^\s*(_\(diagnostic\)_)?\s*—\s*/, "")
      .trim(),
  }));
}

/**
 * A catalog hook must be its target page's `description`, verbatim.
 *
 * SCHEMA.md has always said the description "doubles as the catalog hook"; nothing enforced it,
 * so the two drifted into paraphrases and the index kept describing things that had been
 * removed — a "third status (`action_required`)" deleted when the envelope model was made
 * canonical, and an exit-code rationale whose source page had already been corrected. Both
 * survived a review of the page they described, because nobody re-reads the catalog.
 */
export function hookChecks(pages: LintPage[]): string[] {
  const index = pages.find((p) => p.rel === "index.md");
  if (!index) return [];
  const byRel = new Map(pages.map((p) => [p.rel, p]));
  const problems: string[] = [];
  for (const { target, hook } of catalogEntries(index.body)) {
    const page = byRel.get(target);
    // A link to a file outside the wiki (or a missing one) is the core lint's problem.
    if (!page) continue;
    const description = (page.fields.get("description") ?? "").replace(/\s+/g, " ").trim();
    if (!description) continue; // already reported as missing frontmatter
    if (hook !== description)
      problems.push(
        `STALE HOOK     index.md → ${target}:\n         hook: ${JSON.stringify(hook)}\n  description: ${JSON.stringify(description)}`,
      );
  }
  return problems;
}

/** Read the wiki as `LintPage`s, for the generator running outside `runDocsLint` — and for the
 *  one check whose subject is the SHIPPED page rather than the comparison (see
 *  `signalScopeChecks`). */
export function readPages(): LintPage[] {
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
      types: ["concept", "archetype", "rule", "decision", "guide", "tutorial", "index"],
      dateField: "generated",
      allowDateOnly: true,
      extraChecks: (pages) => [
        ...sectionChecks(pages, readFileSync(join(WIKI_ROOT, "SCHEMA.md"), "utf8")),
        ...ruleChecks(pages),
        ...slugChecks(pages),
        ...matrixChecks(pages),
        ...hookChecks(pages),
        ...signalScopeChecks(pages),
      ],
      json: process.argv.includes("--json"),
    });

    process.exit(problems === 0 ? 0 : 1);
  }
}
