import { existsSync, readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseFrontmatter,
  stripCode,
  walkMarkdown,
  yamlList,
} from "../../scripts/docs-lint/index.ts";
import { AccError } from "./errors.ts";

/**
 * Loads the wiki as a graph, reusing the linter's parsing primitives so the two can never
 * disagree about what a page says. If `acc` parsed frontmatter its own way, a page could be
 * valid to one and invalid to the other — the two-sources-of-truth bug this project exists to
 * remove, reintroduced inside the project itself.
 */

export interface WikiPage {
  /** Path relative to the wiki root, e.g. `rules/parsing/unknown-flag-exits-nonzero.md`. */
  path: string;
  /** Basename without extension — the stable handle a caller types. */
  slug: string;
  type: string;
  title: string;
  description: string;
  tags: string[];
  related: string[];
  status: string;
  updated: string;
  /** Rule pages only. */
  ruleId?: string;
  tier?: string;
  probeLevel?: string;
  checker?: string;
  linksOut: string[];
  linksIn: string[];
  /** Body with frontmatter removed. */
  body: string;
}

export interface WikiGraph {
  root: string;
  pages: WikiPage[];
  byPath: Map<string, WikiPage>;
  bySlug: Map<string, WikiPage>;
  byRuleId: Map<string, WikiPage>;
  tags: Map<string, string[]>;
}

/** The wiki lives beside the source, so the tool works from any cwd. */
export function defaultWikiRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "../../docs/wiki");
}

export function loadGraph(root: string = defaultWikiRoot()): WikiGraph {
  if (!existsSync(root)) {
    throw new AccError("internal", `wiki root not found: ${root}`, {
      hint: "acc must run from a checkout containing docs/wiki.",
    });
  }

  const files = walkMarkdown(root);
  const pages: WikiPage[] = [];
  const outbound = new Map<string, Set<string>>();

  for (const file of files) {
    const raw = readFileSync(file, "utf8");
    // SCHEMA.md is the contract, not a page — the linter exempts it and so does this.
    if (file.endsWith("SCHEMA.md")) continue;

    const fm = /^---\n([\s\S]*?)\n---/.exec(raw);
    const fields = fm ? parseFrontmatter(fm[1]) : new Map<string, string>();
    const rel = relative(root, file);
    const slug = rel.slice(rel.lastIndexOf("/") + 1, -3);

    const page: WikiPage = {
      path: rel,
      slug,
      type: fields.get("type") ?? "",
      title: fields.get("title") ?? slug,
      description: fields.get("description") ?? "",
      tags: yamlList(fields.get("tags")),
      related: yamlList(fields.get("related")),
      status: fields.get("status") ?? "",
      updated: fields.get("updated") ?? "",
      linksOut: [],
      linksIn: [],
      body: fm ? raw.slice(fm[0].length).trimStart() : raw,
    };
    const ruleId = fields.get("rule_id");
    if (ruleId) page.ruleId = ruleId;
    const tier = fields.get("tier");
    if (tier) page.tier = tier;
    const probeLevel = fields.get("probe_level");
    if (probeLevel) page.probeLevel = probeLevel;
    const checker = fields.get("checker");
    if (checker) page.checker = checker;

    pages.push(page);

    // stripCode first: a link inside backticks is a link being DOCUMENTED, not one the page has.
    const outs = new Set<string>();
    for (const m of stripCode(raw).matchAll(/\]\(([^)]+)\)/g)) {
      const target = (m[1] ?? "").trim();
      if (!target || /^https?:\/\//.test(target) || target.startsWith("mailto:")) continue;
      const [pathPart] = target.split("#");
      if (!pathPart) continue;
      const abs = resolve(dirname(file), pathPart);
      if (abs.endsWith(".md") && existsSync(abs)) outs.add(relative(root, abs));
    }
    outbound.set(rel, outs);
  }

  const byPath = new Map(pages.map((p) => [p.path, p]));
  for (const page of pages) {
    page.linksOut = [...(outbound.get(page.path) ?? [])].filter((t) => byPath.has(t)).sort();
  }
  for (const page of pages) {
    for (const target of page.linksOut) {
      byPath.get(target)?.linksIn.push(page.path);
    }
  }
  for (const page of pages) page.linksIn.sort();

  const tags = new Map<string, string[]>();
  for (const page of pages) {
    for (const tag of page.tags) {
      tags.set(tag, [...(tags.get(tag) ?? []), page.path]);
    }
  }

  return {
    root,
    pages,
    byPath,
    bySlug: new Map(pages.map((p) => [p.slug, p])),
    byRuleId: new Map(pages.filter((p) => p.ruleId).map((p) => [p.ruleId as string, p])),
    tags,
  };
}

/**
 * Resolve a caller-supplied handle to a page: a rule id (`A1`, case-insensitive), a slug, or a
 * path. On failure the error carries every valid handle as `choices`, so the caller corrects
 * itself in one step rather than guessing — see docs/wiki/concepts/error-envelope.md.
 */
export function resolvePage(graph: WikiGraph, handle: string): WikiPage {
  const byId = graph.byRuleId.get(handle.toUpperCase());
  if (byId) return byId;
  const bySlug = graph.bySlug.get(handle);
  if (bySlug) return bySlug;
  const byPath = graph.byPath.get(handle);
  if (byPath) return byPath;

  const ruleIds = [...graph.byRuleId.keys()].sort();
  throw new AccError("not_found", `no page matches "${handle}"`, {
    hint: "Pass a rule id, a page slug, or a path relative to the wiki root.",
    choices: [...ruleIds, ...[...graph.bySlug.keys()].sort()],
    details: { ruleIds, pageCount: graph.pages.length },
  });
}
