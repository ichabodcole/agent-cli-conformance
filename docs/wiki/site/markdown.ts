// A focused markdown renderer for THIS wiki, and deliberately not a general one.
//
// The corpus is Prettier-formatted (`proseWrap: preserve`, `embeddedLanguageFormatting: off`)
// and uses a constrained subset: ATX headings, bullet and ordered lists, GFM pipe tables,
// fenced code, blockquotes, links, inline code, `**strong**` and `_emphasis_`. A survey of
// every `.md` under `docs/wiki/` plus `docs/roadmap.md` found no images, no raw HTML outside
// code, no reference links, no setext headings, no indented code blocks and no autolinks. So
// this handles that subset exactly and escapes everything else, rather than half-implementing
// CommonMark — a renderer that silently mangles one construct is worse than one that refuses.
//
// Zero-dependency, like `scripts/docs-lint/`. The one import is the heading slugger from the
// lint core, and it is the important one: the lint has already VERIFIED that every `#anchor` in
// the wiki resolves against `headingSlugsOf`, so deriving element ids from any other function
// would break links the gate says are fine.

import { slug } from "../../../scripts/docs-lint/index.ts";

/** What a link target resolves to, or `null` to leave the target untouched. */
export interface ResolvedLink {
  href: string;
  /** Extra class on the `<a>` — used to mark links that leave the built site. */
  className?: string;
}

export interface RenderOptions {
  /**
   * Rewrite a markdown link target (`../../concepts/exit-codes.md#the-taxonomy`) into a URL in
   * the built site. Called for every link; return `null` to emit the target verbatim.
   */
  resolveLink?: (target: string) => ResolvedLink | null;
}

/** HTML-escape text. Applied to every character that does not become markup. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Drop a leading `---` frontmatter block. The body is what gets rendered. */
export function stripFrontmatter(md: string): string {
  return md.replace(/^---\n[\s\S]*?\n---\n?/, "");
}

/** The `id` a heading gets, and therefore the anchor every `#link` in the wiki lands on. */
export function headingId(text: string): string {
  return slug(text);
}

/** The first `# H1` in a body, or null. SCHEMA.md has no frontmatter `title`, so it needs one. */
export function firstHeading(md: string): string | null {
  const m = /^#\s+(.*)$/m.exec(stripFrontmatter(md));
  return m ? (m[1] ?? "").trim() : null;
}

// --- inline ------------------------------------------------------------------------------

const PUNCT = /[!-/:-@[-`{-~]/;

/**
 * Render inline markup.
 *
 * A single left-to-right scan rather than a chain of `String.replace` passes: replace-chaining
 * cannot tell a `*` inside a code span from an emphasis marker, which is exactly the mistake
 * that corrupts a page documenting markdown (SCHEMA.md) or shell syntax (every rule page).
 * Code spans are consumed first for the same reason `stripCode` exists in the lint.
 */
export function renderInline(src: string, opts: RenderOptions = {}): string {
  let out = "";
  let i = 0;

  while (i < src.length) {
    const c = src[i] as string;

    // Backslash escape: Prettier escapes markdown punctuation on its way through.
    if (c === "\\" && i + 1 < src.length && PUNCT.test(src[i + 1] as string)) {
      out += escapeHtml(src[i + 1] as string);
      i += 2;
      continue;
    }

    // Code span, delimited by a run of N backticks and closed by the next run of exactly N.
    if (c === "`") {
      const open = /^`+/.exec(src.slice(i))?.[0] as string;
      const close = src.indexOf(open, i + open.length);
      const after = close === -1 ? -1 : close + open.length;
      // A longer run at the "close" position is not a close — keep scanning past it.
      if (close !== -1 && src[after] !== "`") {
        const code = src.slice(i + open.length, close);
        out += `<code>${escapeHtml(code)}</code>`;
        i = after;
        continue;
      }
      out += "`";
      i += 1;
      continue;
    }

    // Link or image.
    if (c === "[" || (c === "!" && src[i + 1] === "[")) {
      const link = parseLink(src, i);
      if (link) {
        const { text, target, end } = link;
        const resolved = opts.resolveLink?.(target) ?? null;
        const href = resolved ? resolved.href : target;
        const cls = resolved?.className ? ` class="${escapeHtml(resolved.className)}"` : "";
        out +=
          c === "!"
            ? `<img src="${escapeHtml(href)}" alt="${escapeHtml(text)}"${cls} />`
            : `<a href="${escapeHtml(href)}"${cls}>${renderInline(text, opts)}</a>`;
        i = end;
        continue;
      }
    }

    // Strong, then emphasis. `**` is tried first so `**a**` never parses as `*` + `*a*`.
    if (c === "*" || c === "_") {
      const strong = matchDelimiter(src, i, `${c}${c}`);
      if (strong) {
        out += `<strong>${renderInline(strong.inner, opts)}</strong>`;
        i = strong.end;
        continue;
      }
      const em = matchDelimiter(src, i, c);
      if (em) {
        out += `<em>${renderInline(em.inner, opts)}</em>`;
        i = em.end;
        continue;
      }
    }

    out += escapeHtml(c);
    i += 1;
  }

  return out;
}

/** `[text](target)` starting at `at`, tracking bracket depth so nested `[]` in text survives. */
function parseLink(src: string, at: number): { text: string; target: string; end: number } | null {
  const open = src[at] === "!" ? at + 1 : at;
  if (src[open] !== "[") return null;
  let depth = 0;
  let close = -1;
  for (let j = open; j < src.length; j++) {
    const ch = src[j];
    if (ch === "\\") {
      j++;
      continue;
    }
    if (ch === "`") {
      // Do not let a bracket inside a code span close the link text.
      const run = /^`+/.exec(src.slice(j))?.[0] as string;
      const end = src.indexOf(run, j + run.length);
      if (end !== -1) {
        j = end + run.length - 1;
        continue;
      }
    }
    if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) {
        close = j;
        break;
      }
    }
  }
  if (close === -1 || src[close + 1] !== "(") return null;
  const paren = src.indexOf(")", close + 2);
  if (paren === -1) return null;
  return {
    text: src.slice(open + 1, close),
    target: src.slice(close + 2, paren).trim(),
    end: paren + 1,
  };
}

/**
 * The span enclosed by `delim` starting at `at`, or null when this is not an opener.
 *
 * `_` must not fire inside a word — `exit_code` in running prose is an identifier, not emphasis
 * — so an underscore run is only a delimiter at a non-word boundary. CommonMark draws the same
 * distinction, and it is the only emphasis subtlety this corpus actually exercises.
 */
function matchDelimiter(
  src: string,
  at: number,
  delim: string,
): { inner: string; end: number } | null {
  if (!src.startsWith(delim, at)) return null;
  const intrawordSafe = delim[0] !== "_";
  const before = src[at - 1];
  if (!intrawordSafe && before !== undefined && /\w/.test(before)) return null;
  const contentStart = at + delim.length;
  if (/\s/.test(src[contentStart] ?? " ")) return null;

  let j = contentStart;
  while (j < src.length) {
    if (src[j] === "\\") {
      j += 2;
      continue;
    }
    if (src[j] === "`") {
      const run = /^`+/.exec(src.slice(j))?.[0] as string;
      const end = src.indexOf(run, j + run.length);
      if (end !== -1) {
        j = end + run.length;
        continue;
      }
    }
    if (src.startsWith(delim, j) && !/\s/.test(src[j - 1] ?? " ")) {
      const after = src[j + delim.length];
      if (intrawordSafe || after === undefined || !/\w/.test(after)) {
        return { inner: src.slice(contentStart, j), end: j + delim.length };
      }
    }
    j += 1;
  }
  return null;
}

// --- block -------------------------------------------------------------------------------

const FENCE = /^(\s*)(`{3,}|~{3,})\s*([^\s`]*)/;
const HEADING = /^(#{1,6})\s+(.*)$/;
const HR = /^(-{3,}|\*{3,}|_{3,})\s*$/;
const BULLET = /^(\s*)([-*+])(\s+)(.*)$/;
const ORDERED = /^(\s*)(\d{1,9})([.)])(\s+)(.*)$/;
const TABLE_DELIM = /^\s*\|(?:\s*:?-+:?\s*\|)+\s*$/;

/** Render a whole markdown document (frontmatter included; it is stripped) to HTML. */
export function renderMarkdown(md: string, opts: RenderOptions = {}): string {
  return renderBlocks(stripFrontmatter(md).split("\n"), opts);
}

function isBlockStart(line: string): boolean {
  return (
    line.trim() === "" ||
    HEADING.test(line) ||
    FENCE.test(line) ||
    HR.test(line) ||
    line.trimStart().startsWith(">") ||
    BULLET.test(line) ||
    ORDERED.test(line) ||
    line.trimStart().startsWith("|")
  );
}

function renderBlocks(lines: string[], opts: RenderOptions): string {
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] as string;

    if (line.trim() === "") {
      i++;
      continue;
    }

    const fence = FENCE.exec(line);
    if (fence) {
      const marker = fence[2] as string;
      const lang = fence[3] ?? "";
      const body: string[] = [];
      i++;
      while (i < lines.length && !(lines[i] as string).trimStart().startsWith(marker)) {
        body.push(lines[i] as string);
        i++;
      }
      i++; // closing fence
      const cls = lang ? ` class="language-${escapeHtml(lang)}"` : "";
      out.push(`<pre><code${cls}>${escapeHtml(body.join("\n"))}\n</code></pre>`);
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      const level = (heading[1] as string).length;
      const text = (heading[2] as string).trim();
      const id = headingId(text);
      out.push(
        `<h${level} id="${escapeHtml(id)}">${renderInline(text, opts)}` +
          `<a class="heading-anchor" href="#${escapeHtml(id)}" aria-label="Permalink">#</a></h${level}>`,
      );
      i++;
      continue;
    }

    if (HR.test(line)) {
      out.push("<hr />");
      i++;
      continue;
    }

    if (line.trimStart().startsWith(">")) {
      const inner: string[] = [];
      while (i < lines.length && (lines[i] as string).trim() !== "") {
        const l = lines[i] as string;
        inner.push(l.trimStart().startsWith(">") ? l.replace(/^\s*>\s?/, "") : l.trim());
        i++;
      }
      out.push(`<blockquote>\n${renderBlocks(inner, opts)}\n</blockquote>`);
      continue;
    }

    if (line.trimStart().startsWith("|") && TABLE_DELIM.test(lines[i + 1] ?? "")) {
      const [html, next] = renderTable(lines, i, opts);
      out.push(html);
      i = next;
      continue;
    }

    if (BULLET.test(line) || ORDERED.test(line)) {
      const [html, next] = renderList(lines, i, opts);
      out.push(html);
      i = next;
      continue;
    }

    // Paragraph. Soft line breaks are joined with a space rather than kept: `proseWrap:
    // preserve` means the author's wrapping is arbitrary, and the inline scanner must see a
    // whole sentence — Prettier is free to break a long link's TEXT across lines.
    const para: string[] = [line.trim()];
    i++;
    while (i < lines.length && !isBlockStart(lines[i] as string)) {
      para.push((lines[i] as string).trim());
      i++;
    }
    out.push(`<p>${renderInline(para.join(" "), opts)}</p>`);
  }

  return out.join("\n");
}

function splitRow(row: string): string[] {
  const trimmed = row.trim().replace(/^\|/, "").replace(/\|$/, "");
  const cells: string[] = [];
  let cur = "";
  for (let i = 0; i < trimmed.length; i++) {
    const c = trimmed[i] as string;
    if (c === "\\" && trimmed[i + 1] === "|") {
      cur += "|";
      i++;
    } else if (c === "|") {
      cells.push(cur.trim());
      cur = "";
    } else cur += c;
  }
  cells.push(cur.trim());
  return cells;
}

function renderTable(lines: string[], start: number, opts: RenderOptions): [string, number] {
  const header = splitRow(lines[start] as string);
  const aligns = splitRow(lines[start + 1] as string).map((c) => {
    const left = c.startsWith(":");
    const right = c.endsWith(":");
    if (left && right) return "center";
    if (right) return "right";
    if (left) return "left";
    return "";
  });
  const cell = (text: string, n: number, tag: string) => {
    const a = aligns[n];
    const style = a ? ` style="text-align:${a}"` : "";
    return `<${tag}${style}>${renderInline(text, opts)}</${tag}>`;
  };

  let i = start + 2;
  const rows: string[] = [];
  while (i < lines.length && (lines[i] as string).trim().startsWith("|")) {
    const cells = splitRow(lines[i] as string);
    rows.push(`<tr>${cells.map((c, n) => cell(c, n, "td")).join("")}</tr>`);
    i++;
  }

  const head = `<tr>${header.map((c, n) => cell(c, n, "th")).join("")}</tr>`;
  // Wrapped so a wide table scrolls inside its own box instead of widening the page.
  return [
    `<div class="table-scroll"><table>\n<thead>${head}</thead>\n<tbody>\n${rows.join("\n")}\n</tbody>\n</table></div>`,
    i,
  ];
}

interface ListItem {
  content: string[];
  /** Columns the marker occupies — how far a continuation line is dedented. */
  width: number;
}

function renderList(lines: string[], start: number, opts: RenderOptions): [string, number] {
  const first = (BULLET.exec(lines[start] as string) ??
    ORDERED.exec(lines[start] as string)) as RegExpExecArray;
  const ordered = ORDERED.test(lines[start] as string);
  const baseIndent = (first[1] as string).length;
  const startNo = ordered ? Number.parseInt(first[2] as string, 10) : 1;

  const items: ListItem[] = [];
  let loose = false;
  let sawBlank = false;
  let i = start;

  while (i < lines.length) {
    const line = lines[i] as string;

    if (line.trim() === "") {
      sawBlank = true;
      i++;
      continue;
    }

    const marker = ordered ? ORDERED.exec(line) : BULLET.exec(line);
    const indent = line.length - line.trimStart().length;

    if (marker && (marker[1] as string).length === baseIndent) {
      if (sawBlank && items.length) loose = true;
      sawBlank = false;
      const text = ordered ? (marker[5] as string) : (marker[4] as string);
      const width = line.length - text.length;
      items.push({ content: [text], width });
      i++;
      continue;
    }

    // Anything indented past the current marker belongs to the open item — a wrapped
    // continuation line, a nested list, or a fenced block inside the item.
    if (items.length && indent > baseIndent) {
      const item = items[items.length - 1] as ListItem;
      if (sawBlank) {
        loose = true;
        item.content.push("");
        sawBlank = false;
      }
      item.content.push(line.slice(Math.min(indent, item.width)));
      i++;
      continue;
    }

    // A blank line followed by anything at or left of the marker ends the list.
    if (sawBlank) break;

    // Lazy continuation: an unindented wrap of the open item.
    if (items.length && !isBlockStart(line)) {
      (items[items.length - 1] as ListItem).content.push(line.trim());
      i++;
      continue;
    }

    break;
  }

  const rendered = items.map((item) => {
    let html = renderBlocks(item.content, opts);
    // A tight list drops the paragraph wrapper on its item's first block, which is what makes
    // a catalog of one-line entries read as a list rather than as spaced-out prose.
    if (!loose) html = html.replace(/^<p>([\s\S]*?)<\/p>/, "$1");
    return `<li>${html}</li>`;
  });

  const tag = ordered ? "ol" : "ul";
  const attr = ordered && startNo !== 1 ? ` start="${startNo}"` : "";
  const cls = loose ? ' class="loose"' : "";
  return [`<${tag}${attr}${cls}>\n${rendered.join("\n")}\n</${tag}>`, i];
}
