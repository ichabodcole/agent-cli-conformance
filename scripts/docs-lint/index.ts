import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

// The shared documentation-lint + knowledge-graph core.
//
// Lifted from dream-flute's `scripts/docs-lint`, which arrived at this shape after two
// near-identical copies were diffed and found to differ only in DATA (the `type` enum and a
// directory exclusion), never behaviour. Root, `type` vocabulary, and date field are
// per-library PARAMETERS; the answer is `runDocsLint(config)`, never "copy the file and edit
// the enum".
//
// This file is deliberately ZERO-DEPENDENCY and free of any coupling to this project, so it
// can be dropped into another repo unchanged. Anything project-specific belongs in
// `extraChecks`, not in here.
//
// Entry point:  docs/wiki/lint.ts   (accepts --json)

/** One page, as handed to `extraChecks`. */
export interface LintPage {
  /** Absolute path. */
  path: string;
  /** Path relative to the library root — what you want in an error message. */
  rel: string;
  /** Frontmatter key -> raw value, comments stripped and continuations joined. */
  fields: Map<string, string>;
  /** Full file contents, frontmatter included. */
  body: string;
}

export interface DocsLintConfig {
  /** Library root — pass `dirname(fileURLToPath(import.meta.url))` from the shim. */
  root: string;
  /** Allowed OKF `type` values. Per-library: vocabularies are disjoint by design. */
  types: string[];
  /** Directory names to skip entirely (skeletons/assets, not pages). */
  nonPageDirs?: string[];
  /**
   * Frontmatter field carrying the content date. OKF's convention is `timestamp`;
   * this project uses `updated` because it states the MEANING (when content changed)
   * rather than the format. Default: "timestamp".
   */
  dateField?: string;
  /**
   * Accept a date-only `YYYY-MM-DD` value in addition to full ISO-8601. Wiki pages are
   * edited by hand and nobody types a timezone offset correctly. Default: false.
   */
  allowDateOnly?: boolean;
  /**
   * Project-specific checks. Runs after the universal ones, receives every page, returns
   * problem strings. This is the seam that keeps the core above portable — put
   * cross-artifact checks (docs <-> code) here, never in the core.
   */
  extraChecks?: (pages: LintPage[]) => string[];
  /** Emit the graph as JSON instead of human lint output. */
  json?: boolean;
}

/** Collect `.md` files under `dir`, skipping any directory named in `skipDirs`. */
export function walkMarkdown(dir: string, skipDirs: Set<string> = new Set()): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir)) {
    if (skipDirs.has(e)) continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walkMarkdown(p, skipDirs));
    else if (p.endsWith(".md")) out.push(p);
  }
  return out;
}

// GitHub heading -> anchor slug: lowercase, drop punctuation (keeping spaces/hyphens),
// spaces -> hyphens. "Beating / detune" -> "beating--detune".
export function slug(h: string): string {
  return h
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s/g, "-");
}

/** GitHub-slugged headings in a file, for anchor verification. */
export function headingSlugsOf(text: string): Set<string> {
  const s = new Set<string>();
  for (const line of text.split("\n")) {
    const m = /^#+\s+(.*)$/.exec(line);
    if (m) s.add(slug(m[1]));
  }
  return s;
}

/**
 * Blank out fenced code blocks and inline code spans before link scanning, preserving
 * length so nothing else shifts. A doc that DOCUMENTS a link — `[a](../b.md)` inside
 * backticks — is not a doc that HAS one, and a lint that cannot tell them apart fires a
 * false positive on exactly the pages that explain link conventions (i.e. SCHEMA.md).
 */
export function stripCode(md: string): string {
  let out = md.replace(/```[\s\S]*?```/g, (m) => " ".repeat(m.length));
  out = out.replace(/(?<!`)`[^`\n]+`(?!`)/g, (m) => " ".repeat(m.length));
  return out;
}

/**
 * Collapse a frontmatter block into key -> value, joining YAML continuation lines onto
 * their key and dropping trailing `# comments`. This is what makes the checks
 * formatting-agnostic: Prettier rewrites a long flow sequence into an indented multi-line
 * block, which a line-anchored regex cannot see.
 */
export function parseFrontmatter(fm: string): Map<string, string> {
  const out = new Map<string, string>();
  let key: string | null = null;
  let buf: string[] = [];
  const flush = () => {
    if (key)
      out.set(
        key,
        buf
          .join(" ")
          .trim()
          .replace(/\s+#.*$/, "")
          .trim(),
      );
  };
  for (const line of fm.split("\n")) {
    const m = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    if (m) {
      flush();
      key = m[1];
      buf = [m[2]];
    } else if (key && /^\s+\S/.test(line)) {
      buf.push(line.trim());
    }
  }
  flush();
  return out;
}

/** `[a, b]` (flow, possibly Prettier-wrapped) or `- a` (block) -> ["a", "b"]. */
export function yamlList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .replace(/^\[|\]$/g, "")
    .split(/,|\s+-\s+/)
    .map((s) => s.trim().replace(/^-\s*/, ""))
    .filter(Boolean);
}

export function runDocsLint(config: DocsLintConfig): number {
  const ROOT = config.root;
  const JSON_MODE = config.json ?? false;
  const NON_PAGE_DIRS = new Set<string>(config.nonPageDirs ?? []);
  const OKF_TYPES = new Set<string>(config.types);
  const DATE_FIELD = config.dateField ?? "timestamp";
  const DATE_RE = config.allowDateOnly ? /^\d{4}-\d{2}-\d{2}(T|$)/ : /^\d{4}-\d{2}-\d{2}T/;

  const files = walkMarkdown(ROOT, NON_PAGE_DIRS);
  const INDEX = join(ROOT, "index.md");
  const problems: string[] = [];
  const say = (m: string) => {
    problems.push(m);
    if (!JSON_MODE) console.log(m);
  };

  // --- read every file ONCE -------------------------------------------------------------
  const body = new Map<string, string>();
  const meta = new Map<string, Map<string, string>>();
  for (const f of files) {
    const raw = readFileSync(f, "utf8");
    body.set(f, raw);
    const m = /^---\n([\s\S]*?)\n---/.exec(raw);
    meta.set(f, m ? parseFrontmatter(m[1]) : new Map());
  }

  const fieldsOf = (f: string): Map<string, string> => meta.get(f) ?? new Map();
  const rel = (f: string) => relative(ROOT, f);
  const isContract = (f: string) => f.endsWith("SCHEMA.md");

  // --- OKF frontmatter conformance ------------------------------------------------------
  for (const file of files) {
    if (isContract(file)) continue;
    if (!/^---\n[\s\S]*?\n---/.test(body.get(file) ?? "")) {
      say(`NO FRONTMATTER ${rel(file)}`);
      continue;
    }
    const fields = fieldsOf(file);
    const type = fields.get("type");
    if (!type) say(`MISSING type   ${rel(file)}  (OKF requires a \`type\` field)`);
    else if (!OKF_TYPES.has(type))
      say(`BAD type       ${rel(file)}: "${type}" not in {${[...OKF_TYPES].join(", ")}}`);

    // Accept flow style (`[a, b]`) and YAML block sequence (`- a`): Prettier rewraps long
    // flow lists, and lint-staged runs it on every staged .md.
    const tags = fields.get("tags");
    if (!tags || !(/^\[.*\S.*\]$/.test(tags) || /^- \S/.test(tags)))
      say(`MISSING tags   ${rel(file)}  (expected \`tags: [ ... ]\`)`);

    if (!DATE_RE.test(fields.get(DATE_FIELD) ?? ""))
      say(`MISSING ${DATE_FIELD}  ${rel(file)}  (expected \`${DATE_FIELD}: YYYY-MM-DD\`)`);
  }

  // --- links + anchors, and the graph they form -----------------------------------------
  const anchorCache = new Map<string, Set<string>>();
  const headingSlugs = (file: string): Set<string> =>
    headingSlugsOf(body.get(file) ?? readFileSync(file, "utf8"));

  const outbound = new Map<string, Set<string>>();
  for (const file of files) {
    const outs = new Set<string>();
    outbound.set(file, outs);
    // matchAll rather than a hand-rolled exec loop: this body uses `continue`, and an exec
    // loop with a `continue` before the next exec is an easy infinite loop. matchAll also
    // owns its lastIndex, so the regex can't leak state between files.
    for (const m of stripCode(body.get(file) ?? "").matchAll(/\]\(([^)]+)\)/g)) {
      const target = m[1].trim();
      if (/^https?:\/\//.test(target) || target.startsWith("mailto:")) continue;
      const [pathPart, anchor] = target.split("#");
      let filePath: string;
      if (pathPart === "") {
        filePath = file; // same-file anchor
      } else {
        filePath = resolve(dirname(file), pathPart);
        if (!existsSync(filePath)) {
          say(`MISSING FILE   ${rel(file)}: ${target}`);
          continue;
        }
        if (filePath.endsWith(".md")) outs.add(filePath);
      }
      if (anchor && filePath.endsWith(".md")) {
        let anchors = anchorCache.get(filePath);
        if (!anchors) {
          anchors = headingSlugs(filePath);
          anchorCache.set(filePath, anchors);
        }
        if (!anchors.has(anchor))
          say(`MISSING ANCHOR ${rel(file)}: ${target}  (#${anchor} not a heading)`);
      }
    }
  }

  // --- no page is an orphan --------------------------------------------------------------
  // Transitive: a page linked only from a cataloged sibling still counts as reachable.
  const reached = new Set<string>();
  if (!existsSync(INDEX)) {
    say(`NO CATALOG     ${rel(INDEX)} is missing — every page is an orphan without it.`);
  } else {
    reached.add(INDEX);
    const queue = [INDEX];
    while (queue.length) {
      const current = queue.pop();
      if (current === undefined) break;
      for (const next of outbound.get(current) ?? []) {
        if (!reached.has(next)) {
          reached.add(next);
          queue.push(next);
        }
      }
    }
    for (const file of files) {
      if (file === INDEX || isContract(file)) continue;
      if (!reached.has(file))
        say(`ORPHAN         ${rel(file)}  (unreachable from index.md — add its catalog line)`);
    }
  }

  // --- `related:` edges must resolve -----------------------------------------------------
  // Keys are `type/slug` where slug is the BASENAME, so a page's folder can move without
  // rewriting every `related:` that points at it.
  const byTypeSlug = new Map<string, string>();
  for (const file of files) {
    const t = fieldsOf(file).get("type");
    if (t) byTypeSlug.set(`${t}/${file.slice(file.lastIndexOf("/") + 1, -3)}`, file);
  }
  for (const file of files) {
    for (const entry of yamlList(fieldsOf(file).get("related"))) {
      if (!byTypeSlug.has(entry))
        say(`BAD related    ${rel(file)}: "${entry}" matches no page (expected \`type/slug\`)`);
    }
  }

  // --- project-specific checks -----------------------------------------------------------
  if (config.extraChecks) {
    const pages: LintPage[] = files.map((f) => ({
      path: f,
      rel: rel(f),
      fields: fieldsOf(f),
      body: body.get(f) ?? "",
    }));
    for (const p of config.extraChecks(pages)) say(p);
  }

  // --- output ----------------------------------------------------------------------------
  if (JSON_MODE) {
    const linksIn = new Map<string, string[]>();
    for (const [from, tos] of outbound)
      for (const to of tos) linksIn.set(to, [...(linksIn.get(to) ?? []), rel(from)]);

    const tagIndex: Record<string, string[]> = {};
    const typeIndex: Record<string, string[]> = {};
    for (const file of files) {
      const f = fieldsOf(file);
      const t = f.get("type");
      if (t) {
        const list = typeIndex[t] ?? [];
        list.push(rel(file));
        typeIndex[t] = list;
      }
      for (const tag of yamlList(f.get("tags"))) {
        const list = tagIndex[tag] ?? [];
        list.push(rel(file));
        tagIndex[tag] = list;
      }
    }

    const nodes = files.map((file) => {
      const f = fieldsOf(file);
      const tags = yamlList(f.get("tags"));
      // Pages sharing >=1 tag. Without this the graph shows the atomic pages as
      // disconnected, which is a misread — tags ARE their adjacency.
      const tagNeighbors = [
        ...new Set(tags.flatMap((t) => tagIndex[t] ?? []).filter((p) => p !== rel(file))),
      ];
      return {
        path: rel(file),
        type: f.get("type") ?? null,
        title: f.get("title") ?? null,
        description: f.get("description") ?? null,
        tags,
        status: f.get("status") ?? null,
        [DATE_FIELD]: f.get(DATE_FIELD) ?? null,
        linksOut: [...(outbound.get(file) ?? [])].map(rel),
        linksIn: linksIn.get(file) ?? [],
        related: yamlList(f.get("related")),
        tagNeighbors,
        reachable: reached.has(file) || file === INDEX,
        // the contract is exempt from the orphan rule — flag it so `reachable:false` isn't
        // read as a defect
        contractExempt: isContract(file),
      };
    });

    const hubs = [...nodes]
      .filter((n) => n.path !== "index.md")
      .sort((a, b) => b.linksIn.length - a.linksIn.length)
      .slice(0, 10)
      .map((n) => ({ path: n.path, linksIn: n.linksIn.length, title: n.title }));

    console.log(
      JSON.stringify(
        {
          root: rel(ROOT) || ".",
          contract: "SCHEMA.md",
          catalog: "index.md",
          stats: {
            pages: nodes.length,
            linkEdges: [...outbound.values()].reduce((n, s) => n + s.size, 0),
            relatedEdges: nodes.reduce((n, x) => n + x.related.length, 0),
            tags: Object.keys(tagIndex).length,
            // Must mirror the lint's own exemption above: SCHEMA.md is the contract, not a
            // page, so it is never an orphan even when nothing links to it.
            orphans: nodes.filter((n) => !n.reachable && !n.contractExempt).length,
          },
          hubs,
          typeIndex,
          tagIndex,
          nodes,
          problems,
        },
        null,
        2,
      ),
    );
  } else {
    console.log(
      problems.length === 0
        ? `OK — links, anchors, OKF frontmatter, catalog reachability and \`related\` edges all valid across ${files.length} files.`
        : `\n${problems.length} problem(s).`,
    );
  }
  return problems.length;
}
