// The HTML shell: chrome, navigation, the frontmatter panel, and the graph sections that the
// markdown reading experience has no way to show at all.

import { escapeHtml, renderInline } from "./markdown.ts";

/**
 * A page title, as markup.
 *
 * Titles are markdown — A6 is called "Honour the `--` end-of-options terminator" — so a nav
 * entry that escaped it would show the reader raw backticks. Rendered inline rather than
 * stripped, because the backticks are carrying meaning: that is a flag, not a word.
 */
function titleHtml(text: string): string {
  return renderInline(text);
}

/** One node of `bun docs/wiki/lint.ts --json`. Mirrors the emitter in `scripts/docs-lint`. */
export interface GraphNode {
  path: string;
  type: string | null;
  title: string | null;
  description: string | null;
  tags: string[];
  status: string | null;
  updated: string | null;
  linksOut: string[];
  linksIn: string[];
  related: string[];
  tagNeighbors: string[];
  reachable: boolean;
  contractExempt: boolean;
}

export interface Graph {
  root: string;
  contract: string;
  catalog: string;
  stats: {
    pages: number;
    linkEdges: number;
    relatedEdges: number;
    tags: number;
    orphans: number;
  };
  hubs: Array<{ path: string; linksIn: number; title: string | null }>;
  typeIndex: Record<string, string[]>;
  tagIndex: Record<string, string[]>;
  nodes: GraphNode[];
  problems: string[];
}

/** A link in the sidebar or a list. `href` is already relative to the emitting page. */
export interface NavLink {
  href: string;
  label: string;
  /** A rule's `rule_id`, rendered in a fixed-width gutter so the catalogue scans. */
  badge?: string;
  current?: boolean;
}

export interface NavSubgroup {
  label: string | null;
  links: NavLink[];
}

export interface NavGroup {
  label: string;
  subgroups: NavSubgroup[];
  /** Rendered as a visible warning rather than a silent omission. */
  warning?: string;
}

/**
 * Applied synchronously in `<head>`, before first paint.
 *
 * A deferred or end-of-body script means every navigation in this multi-page site flashes the
 * wrong theme first — which is most of the way to not having a theme selector at all.
 *
 * Storage is wrapped because the output is meant to be read from `file://`, where some browsers
 * hand the page an opaque origin and `localStorage` access THROWS rather than returning null.
 * An unguarded read there does not lose the preference, it breaks the page. When both stores are
 * unavailable the choice degrades to in-memory, which lasts until the next navigation.
 */
export const THEME_SCRIPT = `(function () {
  var KEY = "acc-wiki-theme";
  var mem = null;
  function read() {
    try { var v = localStorage.getItem(KEY); if (v) return v; } catch (e) {}
    try { var s = sessionStorage.getItem(KEY); if (s) return s; } catch (e) {}
    return mem;
  }
  function write(v) {
    mem = v === "system" ? null : v;
    try { v === "system" ? localStorage.removeItem(KEY) : localStorage.setItem(KEY, v); } catch (e) {}
    try { v === "system" ? sessionStorage.removeItem(KEY) : sessionStorage.setItem(KEY, v); } catch (e) {}
  }
  function apply(v) {
    if (v === "light" || v === "dark") document.documentElement.setAttribute("data-theme", v);
    else document.documentElement.removeAttribute("data-theme");
  }
  apply(read());
  document.addEventListener("DOMContentLoaded", function () {
    var sel = document.getElementById("theme-select");
    if (!sel) return;
    sel.value = read() === "light" || read() === "dark" ? read() : "system";
    sel.addEventListener("change", function () { write(sel.value); apply(sel.value); });
  });
})();`;

function navLinkHtml(link: NavLink): string {
  const current = link.current ? ' aria-current="page"' : "";
  const badge = link.badge ? `<span class="nav-id">${escapeHtml(link.badge)}</span>` : "";
  return `<li><a href="${escapeHtml(link.href)}"${current}>${badge}${titleHtml(link.label)}</a></li>`;
}

export function renderNav(groups: NavGroup[]): string {
  const out: string[] = [];
  for (const group of groups) {
    if (!group.subgroups.some((s) => s.links.length)) continue;
    out.push(`<h2>${escapeHtml(group.label)}</h2>`);
    if (group.warning) out.push(`<p class="nav-warning">${escapeHtml(group.warning)}</p>`);
    for (const sub of group.subgroups) {
      if (!sub.links.length) continue;
      if (sub.label) out.push(`<h3>${escapeHtml(sub.label)}</h3>`);
      out.push(`<ul>${sub.links.map(navLinkHtml).join("")}</ul>`);
    }
  }
  return out.join("\n");
}

export interface Badge {
  key: string;
  value: string;
  /** Semantic role, not a colour — see the token block in `site.css`. */
  role?: "rule-id" | "critical" | "advisory" | "affirm" | "caution";
  title?: string;
}

export function renderBadges(badges: Badge[]): string {
  if (!badges.length) return "";
  const items = badges.map((b) => {
    const cls = b.role ? ` badge-${b.role}` : "";
    const title = b.title ? ` title="${escapeHtml(b.title)}"` : "";
    return (
      `<li class="badge${cls}"${title}>` +
      `<span class="badge-key">${escapeHtml(b.key)}</span>` +
      `<span class="badge-value">${escapeHtml(b.value)}</span></li>`
    );
  });
  return `<ul class="badges">${items.join("")}</ul>`;
}

export interface ShellOptions {
  title: string;
  /** `<meta name="description">`, and nothing else — there is no social card to fill. */
  description?: string | null;
  /** Path prefix back to the site root from this page, e.g. `../../`. */
  toRoot: string;
  nav: string;
  content: string;
  /** Shown next to the site name in the top bar. */
  crumb?: string;
}

export function renderShell(o: ShellOptions): string {
  const meta = o.description
    ? `\n    <meta name="description" content="${escapeHtml(o.description)}" />`
    : "";
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(o.title)}</title>${meta}
    <link rel="stylesheet" href="${escapeHtml(o.toRoot)}assets/site.css" />
    <script>${THEME_SCRIPT}</script>
  </head>
  <body>
    <a class="skip-link" href="#content">Skip to content</a>
    <header class="topbar">
      <a class="topbar-title" href="${escapeHtml(o.toRoot)}index.html">Agent CLI Conformance</a>
      ${o.crumb ? `<span class="topbar-sub">${escapeHtml(o.crumb)}</span>` : ""}
      <div class="theme-picker">
        <label for="theme-select">Theme</label>
        <select id="theme-select">
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>
    </header>
    <div class="layout">
      <nav class="sidebar" aria-label="Wiki navigation">
${o.nav}
      </nav>
      <main class="main" id="content">
${o.content}
      </main>
    </div>
  </body>
</html>
`;
}

/** A list of pages with their one-line hook — used for backlinks, related, and tag pages. */
export function renderLinkList(links: Array<{ href: string; label: string; why?: string | null }>) {
  const items = links.map(
    (l) =>
      `<li><a href="${escapeHtml(l.href)}">${titleHtml(l.label)}</a>` +
      (l.why ? `<span class="why">${renderInline(l.why)}</span>` : "") +
      "</li>",
  );
  return `<ul class="linklist">${items.join("")}</ul>`;
}
