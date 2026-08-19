#!/usr/bin/env bun
// Build the wiki into a static, offline-readable site.
//
//   bun run docs:build     → docs/dist/
//
// The hard part was already done. `bun docs/wiki/lint.ts --json` emits the knowledge graph —
// pages, frontmatter, outbound links, COMPUTED backlinks, tags, tag adjacency, hubs, orphans —
// and SCHEMA.md is explicit that backlinks are derived and never authored. So this builder
// CONSUMES that graph rather than re-deriving any of it: a second implementation of "what links
// here" would be a second source of truth for something the repo treats as canonical, and the
// two would disagree the first time either changed.
//
// What it adds is the reading surface the raw markdown cannot have: navigation, the frontmatter
// of a rule page as scannable badges, and the backlinks — which exist only in the graph and are
// invisible to anyone reading the files.
//
// Zero runtime dependency and offline by construction: no CDN, no web font, no fetch. The
// output opens from `file://`.
//
// Three things fail the build rather than shipping quietly, because each is a defect that looks
// fine from the outside: a colour literal outside the token block, two pages claiming one output
// path, and a link or anchor that does not resolve in the OUTPUT. The wiki lint already proves
// every link resolves in the SOURCE, so a break here is always this file's rewriting, never the
// page's.

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseFrontmatter, yamlList } from "../../scripts/docs-lint/index.ts";
import { catalogEntries, sectionBody } from "./lint.ts";
import {
  escapeHtml,
  firstHeading,
  type ResolvedLink,
  renderInline,
  renderMarkdown,
} from "./site/markdown.ts";
import {
  type Badge,
  type Graph,
  type GraphNode,
  type NavGroup,
  type NavLink,
  type NavSubgroup,
  renderBadges,
  renderLinkList,
  renderNav,
  renderShell,
} from "./site/page.ts";
import { assertTokenDiscipline } from "./site/tokens.ts";

const WIKI_ROOT = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(WIKI_ROOT, "../..");
const OUT_DIR = join(REPO_ROOT, "docs/dist");
const SITE_DIR = join(WIKI_ROOT, "site");

const SITE_NAME = "Agent CLI Conformance";

/**
 * `<title>` text: plain, backticks dropped, and never doubling the site name.
 *
 * A tab reading "Agent CLI Conformance — wiki — Agent CLI Conformance" is the kind of detail
 * that only shows up once the thing is open in a browser.
 */
function documentTitle(pageTitle: string): string {
  const plain = pageTitle.replace(/`/g, "");
  return plain.includes(SITE_NAME) ? plain : `${plain} — ${SITE_NAME}`;
}

/**
 * The tag listing, at the site root rather than at `tags/index.html`.
 *
 * Not a style choice. `index` is itself a tag in this wiki, so a listing at `tags/index.html`
 * collides with the page for that tag — and a collision between two generated pages is invisible
 * once written: the file exists, every link to it resolves, and one of the two pages is simply
 * gone. `write` below now throws on a repeated output path; this is where that bit first.
 */
const TAG_INDEX = "tags.html";

/**
 * Satellite pages: markdown outside the wiki root that the site still renders, and that earns a
 * place in the primary nav.
 *
 * `docs/roadmap.md` is linked from the README and from a dozen wiki pages, and it deliberately
 * lives outside the wiki — it says so itself, under "Why this is not in the wiki". Rendering it
 * keeps those links working without pretending it is a wiki page.
 *
 * `docs/reports/` is NOT here: its findings are discharged into the code and the wiki,
 * and the report itself is a record of that work rather than knowledge to publish. `docs/research/` is
 * rendered too, but separately — see EVIDENCE.
 */
const SATELLITES = ["../roadmap.md"];

/**
 * Evidence reports: rendered, but not part of the knowledge and not pinned in the primary nav.
 *
 * These were excluded from the site on the reasoning that the wiki's contract calls them
 * evidence rather than knowledge. That is true of their STATUS and was wrong about their
 * PUBLICATION: `## Evidence` is a required section on every rule page, and a dozen of them
 * bottom out in a link to one of these files. Excluding them meant the built site shipped
 * `href="../../../research/01-case-studies.md"` — a path that escapes the output root, so every
 * one of those links was dead for anyone reading the published site rather than the repo.
 *
 * Discovered rather than listed, so a new report is published by existing. They keep their own
 * nav group instead of joining SATELLITES, because a bibliography does not belong in "Start
 * here".
 */
const EVIDENCE = existsSync(resolve(WIKI_ROOT, "../research"))
  ? readdirSync(resolve(WIKI_ROOT, "../research"))
      .filter((f) => f.endsWith(".md"))
      .sort()
      .map((f) => `../research/${f}`)
  : [];

// --- the page model -----------------------------------------------------------------------

interface SitePage {
  /** Wiki-root-relative path — the same key the graph uses, satellites included. */
  key: string;
  sourcePath: string;
  /** Output path relative to `OUT_DIR`. */
  out: string;
  title: string;
  body: string;
  fields: Map<string, string>;
  node: GraphNode | null;
}

/** `../roadmap.md` → `roadmap.html`; `concepts/exit-codes.md` → `concepts/exit-codes.html`. */
function outPathFor(key: string): string {
  return `${key.replace(/^(\.\.\/)+/, "").replace(/\.md$/, "")}.html`;
}

/** A relative href from one output file to another, always usable from `file://`. */
function hrefBetween(fromOut: string, toOut: string): string {
  const rel = relative(dirname(join(OUT_DIR, fromOut)), join(OUT_DIR, toOut));
  return rel.startsWith(".") ? rel : `./${rel}`;
}

/** `../../` for a page two directories deep; `` for one at the root. */
function toRootFor(out: string): string {
  return "../".repeat(out.split("/").length - 1);
}

/**
 * Run the lint's own `--json` emitter and parse it.
 *
 * A subprocess rather than importing `runDocsLint` and capturing `console.log`: this is exactly
 * the artifact the repo publishes as the knowledge graph, and consuming anything else would let
 * the site and `bun run docs:graph` drift.
 */
function loadGraph(): Graph {
  const proc = Bun.spawnSync([process.execPath, join(WIKI_ROOT, "lint.ts"), "--json"], {
    cwd: REPO_ROOT,
    stdout: "pipe",
    stderr: "pipe",
  });
  const stdout = proc.stdout.toString();
  if (!stdout.trim())
    throw new Error(`lint.ts --json produced no output:\n${proc.stderr.toString()}`);
  const graph = JSON.parse(stdout) as Graph;
  if (graph.problems.length) {
    console.warn(`docs:build — the wiki lint reports ${graph.problems.length} problem(s):`);
    for (const p of graph.problems) console.warn(`  ${p}`);
  }
  return graph;
}

/**
 * The `type` vocabulary, in the order SCHEMA.md lists it.
 *
 * Read from the contract rather than hard-coded here, because SCHEMA.md already OWNS that
 * vocabulary and one source of truth is the house rule. It is used strictly as a SORT HINT:
 * membership comes from the graph's `typeIndex`, so a type the contract has not documented yet
 * still gets a navigation group instead of vanishing from the reading surface.
 */
export function typeOrderFromSchema(schema: string): string[] {
  const section = sectionBody(schema, "## Per-type page shape") ?? "";
  const out: string[] = [];
  // Only rows BELOW the alignment row are data. The header cell is itself `` `type` ``, so a
  // matcher that ignored the delimiter would read the column name as a page type.
  let inBody = false;
  for (const line of section.split("\n")) {
    const row = line.trim();
    if (/^\|[\s:|-]+\|$/.test(row)) {
      inBody = true;
      continue;
    }
    if (!inBody) continue;
    const m = /^\|\s*`([a-z_]+)`\s*\|/.exec(row);
    if (m) out.push(m[1] as string);
  }
  return out;
}

/** `concept` → `Concepts`, `archetype` → `Archetypes`, `reference` → `References`. */
export function typeLabel(type: string): string {
  const word = type.replace(/[-_]/g, " ");
  const plural = /(s|x|z|ch|sh)$/.test(word) ? `${word}es` : `${word}s`;
  return plural.charAt(0).toUpperCase() + plural.slice(1);
}

/** `rules/parsing` → `Parsing`. */
function dirLabel(dir: string): string {
  const words = (dir.split("/").pop() ?? dir).replace(/-/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Every link in the OUTPUT that does not resolve, anchors included.
 *
 * The wiki lint already proves this for the source, which is what makes the check worth running:
 * a failure here can only be this file's link rewriting, so the message is never ambiguous about
 * whose defect it is.
 */
export function brokenLinks(emitted: Map<string, string>, outDir: string): string[] {
  const ids = new Map<string, Set<string>>();
  for (const [out, html] of emitted)
    ids.set(out, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1] as string)));

  const problems: string[] = [];
  for (const [out, html] of emitted) {
    for (const m of html.matchAll(/href="([^"]*)"/g)) {
      const href = (m[1] as string).replace(/&amp;/g, "&");
      if (/^(https?:|mailto:)/.test(href)) continue;
      const [pathPart = "", anchor] = href.split("#");
      const target =
        pathPart === "" ? out : relative(outDir, resolve(dirname(join(outDir, out)), pathPart));

      if (target.startsWith("..")) {
        // A deliberate link out of the site (a checker in `src/`, a report in `research/`).
        if (!existsSync(resolve(outDir, target))) problems.push(`${out} → ${href}  (no such file)`);
        continue;
      }
      const targetIds = ids.get(target);
      if (!targetIds) {
        problems.push(`${out} → ${href}  (no page at ${target})`);
        continue;
      }
      if (anchor && !targetIds.has(decodeURIComponent(anchor)))
        problems.push(`${out} → ${href}  (#${anchor} is not an id on that page)`);
    }
  }
  return problems;
}

// --- the build ------------------------------------------------------------------------------

function build(): void {
  const graph = loadGraph();

  // --- assemble the page set ---------------------------------------------------------------
  const pages: SitePage[] = [];
  const byKey = new Map<string, SitePage>();
  const bySource = new Map<string, SitePage>();

  const addPage = (key: string, node: GraphNode | null): void => {
    const sourcePath = resolve(WIKI_ROOT, key);
    const body = readFileSync(sourcePath, "utf8");
    const fm = /^---\n([\s\S]*?)\n---/.exec(body);
    const page: SitePage = {
      key,
      sourcePath,
      out: outPathFor(key),
      body,
      fields: fm ? parseFrontmatter(fm[1] as string) : new Map<string, string>(),
      node,
      // SCHEMA.md and the roadmap carry no frontmatter `title`, so the H1 stands in — safe,
      // because the lint requires the two to match on every page that has both.
      title: node?.title ?? firstHeading(body) ?? key,
    };
    pages.push(page);
    byKey.set(key, page);
    bySource.set(sourcePath, page);
  };

  for (const node of graph.nodes) addPage(node.path, node);
  for (const key of [...SATELLITES, ...EVIDENCE]) {
    if (existsSync(resolve(WIKI_ROOT, key))) addPage(key, null);
  }

  const nodeByKey = new Map(graph.nodes.map((n) => [n.path, n]));
  const titleOf = (key: string) => byKey.get(key)?.title ?? key;
  const descOf = (key: string) => nodeByKey.get(key)?.description ?? null;
  const outOf = (key: string) => (byKey.get(key) as SitePage).out;

  /** `related:` keys are `type/slug` where slug is the BASENAME — resolve them the same way. */
  const byTypeSlug = new Map<string, string>();
  for (const node of graph.nodes) {
    if (node.type)
      byTypeSlug.set(
        `${node.type}/${node.path.replace(/.*\//, "").replace(/\.md$/, "")}`,
        node.path,
      );
  }

  // --- link rewriting ------------------------------------------------------------------------
  const resolverFor =
    (page: SitePage) =>
    (target: string): ResolvedLink | null => {
      if (/^(https?:|mailto:)/.test(target)) return { href: target, className: "offsite" };
      if (target.startsWith("#")) return null; // same-page anchor: already correct

      const [pathPart = "", anchor] = target.split("#");
      const suffix = anchor ? `#${anchor}` : "";
      const abs = resolve(dirname(page.sourcePath), pathPart);

      const to = bySource.get(abs);
      if (to) return { href: hrefBetween(page.out, to.out) + suffix };

      // A file the site does not render — a checker in `src/`, a report in `research/`. The link
      // is kept and pointed at the real file relative to the built page, so it still resolves
      // when the output is read from inside the repo. `research/` is deliberately not rendered:
      // the wiki's contract says it is evidence, not knowledge.
      if (existsSync(abs))
        return {
          href: relative(dirname(join(OUT_DIR, page.out)), abs) + suffix,
          className: "offsite",
        };
      return null; // the lint guarantees this is unreachable
    };

  // --- navigation ------------------------------------------------------------------------------
  const schema = byKey.get("SCHEMA.md");
  const indexPage = byKey.get("index.md");
  const typeOrder = schema ? typeOrderFromSchema(schema.body) : [];
  if (schema && typeOrder.length === 0)
    console.warn("docs:build — could not read the type table from SCHEMA.md; ordering by name");

  const catalogOrder = new Map<string, number>();
  if (indexPage) {
    for (const [n, entry] of catalogEntries(indexPage.body).entries()) {
      if (!catalogOrder.has(entry.target)) catalogOrder.set(entry.target, n);
    }
  }
  const catalogRank = (key: string) => catalogOrder.get(key) ?? Number.MAX_SAFE_INTEGER;

  /** Pages with their own place in the chrome rather than a type group. */
  const PINNED = new Set(["index.md", "SCHEMA.md", ...SATELLITES]);

  /** `currentOut` is the output path of the page being rendered — no sentinel keys needed, and
   *  a tag page marks itself current by the same rule every other page does. */
  const navGroups = (currentOut: string): NavGroup[] => {
    const link = (page: SitePage, label?: string): NavLink => ({
      href: hrefBetween(currentOut, page.out),
      label: label ?? page.title,
      badge: page.fields.get("rule_id"),
      current: page.out === currentOut,
    });

    const groups: NavGroup[] = [];

    const start: NavLink[] = [];
    if (indexPage) start.push(link(indexPage, "Catalog (home)"));
    if (schema) start.push(link(schema, "SCHEMA — the contract"));
    for (const key of SATELLITES) {
      const p = byKey.get(key);
      if (p) start.push(link(p));
    }
    start.push({
      href: hrefBetween(currentOut, TAG_INDEX),
      label: "All tags",
      current: currentOut === TAG_INDEX,
    });
    groups.push({ label: "Start here", subgroups: [{ label: null, links: start }] });

    // Membership comes from the graph; `typeOrder` only sorts. A type SCHEMA.md has not
    // documented yet still gets a group, appended after the known ones.
    const rank = (t: string) =>
      typeOrder.indexOf(t) === -1 ? typeOrder.length : typeOrder.indexOf(t);
    const types = Object.keys(graph.typeIndex).sort(
      (a, b) => rank(a) - rank(b) || a.localeCompare(b),
    );

    const placed = new Set<string>(PINNED);
    for (const type of types) {
      const members = (graph.typeIndex[type] ?? [])
        .filter((p) => !PINNED.has(p))
        .map((p) => byKey.get(p))
        .filter((p): p is SitePage => p !== undefined)
        .sort((a, b) => catalogRank(a.key) - catalogRank(b.key) || a.title.localeCompare(b.title));
      if (!members.length) continue;
      for (const m of members) placed.add(m.key);

      // Subgroup by directory, but only when there is more than one — a flat type stays flat.
      // Generic on purpose: the rule family happens to be the one with category folders today.
      const dirs = [...new Set(members.map((m) => dirname(m.key)))];
      const subgroups: NavSubgroup[] =
        dirs.length > 1
          ? dirs
              .map((dir) => {
                const links = members.filter((m) => dirname(m.key) === dir);
                return {
                  label: dirLabel(dir),
                  links: links.map((m) => link(m)),
                  rank: Math.min(...links.map((m) => catalogRank(m.key))),
                };
              })
              .sort((a, b) => a.rank - b.rank)
              .map(({ label, links }) => ({ label, links }))
          : [{ label: null, links: members.map((m) => link(m)) }];

      groups.push({ label: typeLabel(type), subgroups });
    }

    // Evidence gets its own group rather than falling through to "Unclassified" below. It is
    // correctly untyped — these are not wiki pages and carry no frontmatter — but "the builder
    // did not know what this was" is the wrong thing to tell a reader about a report the rule
    // pages cite by name.
    const evidence = EVIDENCE.map((k) => byKey.get(k)).filter(
      (p): p is SitePage => p !== undefined,
    );
    if (evidence.length) {
      for (const e of evidence) placed.add(e.key);
      groups.push({
        label: "Evidence",
        subgroups: [{ label: null, links: evidence.map((e) => link(e)) }],
      });
    }

    // A page with no `type`, or one the graph never indexed, is SURFACED rather than dropped. A
    // page that exists, passes the lint and is invisible in navigation is the worst of the three
    // outcomes available here, and it is the one a builder with a hard-coded type list produces.
    const stray = pages.filter((p) => !placed.has(p.key));
    if (stray.length) {
      groups.push({
        label: "Unclassified",
        warning:
          "These pages carry no recognised `type`. They are listed here so that a page cannot go missing from navigation just because the builder did not know its type.",
        subgroups: [{ label: null, links: stray.map((p) => link(p)) }],
      });
    }

    return groups;
  };

  // --- emit ---------------------------------------------------------------------------------
  const emitted = new Map<string, string>();
  const write = (out: string, html: string) => {
    const clash = emitted.has(out);
    if (clash) throw new Error(`docs:build — two pages claim the same output path: ${out}`);
    emitted.set(out, html);
  };

  for (const page of pages) write(page.out, renderPage(page));

  function renderPage(page: SitePage): string {
    const html = renderMarkdown(page.body, { resolveLink: resolverFor(page) });
    // The H1 is pulled out so the frontmatter panel can sit under the title rather than above
    // it — a reader wants the name of the thing before its metadata.
    const split = /^(<h1[\s\S]*?<\/h1>)([\s\S]*)$/.exec(html);
    const h1 = split ? (split[1] as string) : `<h1>${escapeHtml(page.title)}</h1>`;
    const rest = split ? (split[2] as string) : html;

    const node = page.node;
    const sourceRel = relative(REPO_ROOT, page.sourcePath);
    const content = [
      `<article class="page prose">`,
      `<p class="breadcrumb">${escapeHtml(sourceRel)}</p>`,
      h1,
      node?.description ? `<p class="lede">${renderInline(node.description)}</p>` : "",
      renderFacts(page),
      rest,
      renderGraphSections(page),
      `<footer class="page-footer">Source: <code>${escapeHtml(sourceRel)}</code>${
        node?.updated ? ` · content updated ${escapeHtml(node.updated)}` : ""
      }</footer>`,
      `</article>`,
    ]
      .filter(Boolean)
      .join("\n");

    return renderShell({
      title: documentTitle(page.title),
      description: node?.description ?? null,
      toRoot: toRootFor(page.out),
      nav: renderNav(navGroups(page.out)),
      content,
      crumb: node?.type ?? (page.key === "SCHEMA.md" ? "contract" : "satellite"),
    });
  }

  /**
   * Frontmatter as something scannable.
   *
   * A rule page's frontmatter is machine-read and cross-checked against the kit, so it is the
   * most load-bearing metadata in the wiki — and dumping it as YAML would make a reader parse
   * the thing the lint already parsed. The five fields that decide what a rule CLAIMS become
   * badges; the rest becomes a definition list.
   *
   * Read from the page rather than from the graph because the graph does not carry it: the JSON
   * emitter in `scripts/docs-lint` is portable and exposes only the OKF fields. Same PARSER
   * though — `parseFrontmatter` from the lint core — so there is no second interpretation of what
   * a frontmatter value means.
   */
  function renderFacts(page: SitePage): string {
    const f = page.fields;
    const badges: Badge[] = [];

    const ruleId = f.get("rule_id");
    if (ruleId) badges.push({ key: "rule", value: ruleId, role: "rule-id" });

    const tier = f.get("tier");
    if (tier)
      badges.push({
        key: "tier",
        value: tier,
        role: tier === "core" ? "critical" : "advisory",
        title:
          tier === "core"
            ? "Core: a violation makes the run non-conformant."
            : "Diagnostic: reported, and never blocks the verdict.",
      });

    const level = f.get("probe_level");
    if (level)
      badges.push({
        key: "probe",
        value: level,
        title: "L0 risk-reduced · L1 declared read-only · L2 contained mutating",
      });

    const status = f.get("checker_status");
    if (status)
      badges.push({
        key: "checker",
        value: status,
        role: status === "implemented" ? "affirm" : "caution",
        title: "Is there a checker at all? Presence — not scope, not strength.",
      });

    const coverage = f.get("coverage");
    if (coverage) {
      const gaps = yamlList(f.get("coverage_gaps")).length;
      badges.push({
        key: "coverage",
        value: gaps ? `${coverage} · ${gaps} gap${gaps === 1 ? "" : "s"}` : coverage,
        role: coverage === "complete" ? "affirm" : "caution",
        title: "How much of THIS page the checker actually establishes.",
      });
    }

    const rows: string[] = [];
    const row = (k: string, v: string) => rows.push(`<dt>${escapeHtml(k)}</dt><dd>${v}</dd>`);

    if (page.node?.type) row("Type", escapeHtml(page.node.type));
    if (page.node?.status) row("Status", escapeHtml(page.node.status));

    const checker = f.get("checker");
    if (checker) {
      const abs = join(REPO_ROOT, checker);
      const href = relative(dirname(join(OUT_DIR, page.out)), abs);
      row(
        "Checker",
        existsSync(abs)
          ? `<a class="offsite" href="${escapeHtml(href)}"><code>${escapeHtml(checker)}</code></a>`
          : `<code>${escapeHtml(checker)}</code>`,
      );
    }

    const tags = page.node?.tags ?? [];
    if (tags.length) {
      const chips = tags.map(
        (t) =>
          `<a class="tag" href="${escapeHtml(hrefBetween(page.out, tagOut(t)))}">${escapeHtml(t)}</a>`,
      );
      row("Tags", `<div class="tag-list">${chips.join("")}</div>`);
    }

    if (!badges.length && !rows.length) return "";
    return `<div class="facts">${renderBadges(badges)}${rows.length ? `<dl>${rows.join("")}</dl>` : ""}</div>`;
  }

  /**
   * Backlinks and `related`, both straight from the graph.
   *
   * This is the section that does not exist in the markdown reading experience at all. SCHEMA.md
   * is explicit that inbound links are COMPUTED and never authored, so a page has no way to say
   * "eleven other pages depend on this definition" — the graph is the only place that fact lives,
   * and surfacing it is most of what this build is for.
   */
  function renderGraphSections(page: SitePage): string {
    // A satellite sits outside the graph's root, so its backlinks come from the other direction:
    // the nodes whose `linksOut` name it. Still the graph's own edges, not a re-derivation.
    const inbound = page.node
      ? page.node.linksIn
      : graph.nodes
          .filter((n) => n.linksOut.some((o) => resolve(WIKI_ROOT, o) === page.sourcePath))
          .map((n) => n.path);

    const backlinks = [...new Set(inbound)]
      .filter((k) => byKey.has(k))
      .sort((a, b) => titleOf(a).localeCompare(titleOf(b)));

    const listOf = (keys: string[]) =>
      renderLinkList(
        keys.map((k) => ({
          href: hrefBetween(page.out, outOf(k)),
          label: titleOf(k),
          why: descOf(k),
        })),
      );

    const sections = [
      `<section><h2 id="linked-from">Linked from</h2>${
        backlinks.length ? listOf(backlinks) : `<p class="empty">Nothing links here yet.</p>`
      }</section>`,
    ];

    const related = (page.node?.related ?? [])
      .map((key) => byTypeSlug.get(key))
      .filter((p): p is string => p !== undefined && byKey.has(p));
    if (related.length)
      sections.push(`<section><h2 id="related">Related</h2>${listOf(related)}</section>`);

    return `<div class="graph">${sections.join("")}</div>`;
  }

  // --- tag pages -------------------------------------------------------------------------------
  const tags = Object.keys(graph.tagIndex).sort();
  for (const tag of tags) {
    const out = tagOut(tag);
    const members = (graph.tagIndex[tag] ?? [])
      .filter((k) => byKey.has(k))
      .sort((a, b) => titleOf(a).localeCompare(titleOf(b)));
    const content = [
      `<article class="page prose">`,
      `<p class="breadcrumb">tag</p>`,
      `<h1>#${escapeHtml(tag)}</h1>`,
      `<p class="lede">${members.length} page${members.length === 1 ? "" : "s"} carry this tag.</p>`,
      renderLinkList(
        members.map((k) => ({
          href: hrefBetween(out, outOf(k)),
          label: titleOf(k),
          why: descOf(k),
        })),
      ),
      `<p><a href="${escapeHtml(hrefBetween(out, TAG_INDEX))}">All tags</a></p>`,
      `</article>`,
    ].join("\n");
    write(
      out,
      renderShell({
        title: documentTitle(`#${tag}`),
        toRoot: toRootFor(out),
        nav: renderNav(navGroups(out)),
        content,
        crumb: "tag",
      }),
    );
  }

  const tagRows = tags.map(
    (t) =>
      `<li><a class="tag" href="${escapeHtml(hrefBetween(TAG_INDEX, tagOut(t)))}">${escapeHtml(t)}</a> ` +
      `<span class="tag-count">${(graph.tagIndex[t] ?? []).length}</span></li>`,
  );
  write(
    TAG_INDEX,
    renderShell({
      title: documentTitle("Tags"),
      toRoot: toRootFor(TAG_INDEX),
      nav: renderNav(navGroups(TAG_INDEX)),
      content: [
        `<article class="page prose">`,
        `<p class="breadcrumb">tags</p>`,
        `<h1>Tags</h1>`,
        `<p class="lede">${tags.length} tags across ${graph.stats.pages} pages. Tags are the primary relation for the atomic page types — a decision or a guide is reachable through them rather than through a folder.</p>`,
        `<ul class="tag-list">${tagRows.join("")}</ul>`,
        `</article>`,
      ].join("\n"),
      crumb: "tags",
    }),
  );

  // --- assets ------------------------------------------------------------------------------------
  const css = readFileSync(join(SITE_DIR, "site.css"), "utf8");
  // Fails the build rather than shipping a page whose colours have drifted off the token layer.
  assertTokenDiscipline(css);
  write("assets/site.css", css);

  // --- verify, then land ---------------------------------------------------------------------------
  const broken = brokenLinks(emitted, OUT_DIR);
  if (broken.length)
    throw new Error(
      `${broken.length} link(s) do not resolve in the built site. The wiki lint proves the SOURCE links are fine, so this is the builder's rewriting:\n  ${broken.join("\n  ")}`,
    );

  // A clean build every time: a stale page left behind by a rename still renders, still links,
  // and no longer exists.
  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });
  for (const [out, html] of emitted) {
    const target = join(OUT_DIR, out);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, html);
  }

  console.log(
    `docs:build — ${pages.length} pages + ${tags.length + 1} tag pages → ${relative(REPO_ROOT, OUT_DIR)}/`,
  );
  console.log(`  open ${join(OUT_DIR, "index.html")}`);
}

/** Tag pages live in their own directory; the listing does not (see `TAG_INDEX`). */
function tagOut(tag: string): string {
  return `tags/${tag}.html`;
}

if (import.meta.main) build();
