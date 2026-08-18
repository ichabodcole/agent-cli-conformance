import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { brokenLinks, typeLabel, typeOrderFromSchema } from "../build.ts";
import { renderInline, renderMarkdown } from "./markdown.ts";
import { tokenViolations } from "./tokens.ts";

const HERE = import.meta.dir;

describe("inline", () => {
  test("escapes HTML that is not markup", () => {
    expect(renderInline("a < b & c")).toBe("a &lt; b &amp; c");
  });

  test("a code span wins over the markup inside it", () => {
    // The reason this renderer scans rather than chaining `replace`: rule pages are full of
    // shell and JSON specimens, and a `*` or `_` inside one is not emphasis.
    expect(renderInline("`--foo *bar* _baz_`")).toBe("<code>--foo *bar* _baz_</code>");
    expect(renderInline("`<cli> --help`")).toBe("<code>&lt;cli&gt; --help</code>");
  });

  // A bare destination ends at the first `)`, so a URL carrying one is unwritable without the
  // pointy-bracket form. Every DOI-bearing citation in docs/research/ needs it, and the
  // truncated href leaked the rest of the URL into the document as text.
  test("a pointy-bracket destination may contain parentheses", () => {
    expect(renderInline("[doi](<https://doi.org/10.1016/S0010-0277(98)00034-1>)")).toBe(
      '<a href="https://doi.org/10.1016/S0010-0277(98)00034-1">doi</a>',
    );
  });

  test("a bare destination still ends at the first parenthesis", () => {
    expect(renderInline("[x](https://example.com/a) then")).toBe(
      '<a href="https://example.com/a">x</a> then',
    );
  });

  test("strong beats emphasis", () => {
    expect(renderInline("**Gaps**")).toBe("<strong>Gaps</strong>");
    expect(renderInline("_planned_")).toBe("<em>planned</em>");
  });

  test("an underscore inside a word is not emphasis", () => {
    // `confirmation_required` and `exit_code` are identifiers this wiki writes in prose.
    expect(renderInline("exit_code and retry_after")).toBe("exit_code and retry_after");
  });

  test("a backslash escape is a literal", () => {
    expect(renderInline("\\_not emphasis\\_")).toBe("_not emphasis_");
  });

  test("links go through the resolver, anchors intact", () => {
    const html = renderInline("see [the taxonomy](../concepts/exit-codes.md#the-taxonomy)", {
      resolveLink: (t) => ({ href: t.replace(".md", ".html") }),
    });
    expect(html).toBe('see <a href="../concepts/exit-codes.html#the-taxonomy">the taxonomy</a>');
  });

  test("markup inside link text is rendered", () => {
    expect(renderInline("[`unverified`](./x.md)")).toBe(
      '<a href="./x.md"><code>unverified</code></a>',
    );
  });
});

describe("blocks", () => {
  test("heading ids match the slug the lint validates anchors against", () => {
    // `headingSlugsOf` in scripts/docs-lint is what proves every `#anchor` in the wiki resolves.
    // Deriving ids from anything else would break links the gate says are fine.
    expect(renderMarkdown("## Why it fails (silently)")).toContain('id="why-it-fails-silently"');
    expect(renderMarkdown("## 7. R4-5 — the lifecycle rule family")).toContain(
      'id="7-r4-5--the-lifecycle-rule-family"',
    );
  });

  test("a pipe table becomes a real table, wrapped so it scrolls", () => {
    const html = renderMarkdown("| A | B |\n| - | - |\n| 1 | 2 |");
    expect(html).toContain('<div class="table-scroll">');
    expect(html).toContain("<thead><tr><th>A</th><th>B</th></tr></thead>");
    expect(html).toContain("<tr><td>1</td><td>2</td></tr>");
  });

  test("a fence keeps its specimen verbatim", () => {
    // Non-conforming specimens are the evidence for the rules; a renderer must not tidy one.
    const html = renderMarkdown("```json\n{ \"ok\": false, error: 'x' }\n```");
    expect(html).toContain('<pre><code class="language-json">');
    expect(html).toContain("{ &quot;ok&quot;: false, error: 'x' }");
  });

  test("a `#` inside a fence is not a heading", () => {
    expect(renderMarkdown("```\n# not a heading\n```")).not.toContain("<h1");
  });

  test("a wrapped list item is one item, not two", () => {
    const md = [
      "- [Exit codes](./concepts/exit-codes.md) — The one part of a CLI's response a caller can",
      "  read without parsing anything.",
      "- [Machine mode](./concepts/machine-mode.md) — The output contract.",
    ].join("\n");
    const html = renderMarkdown(md);
    expect(html.match(/<li>/g)).toHaveLength(2);
    expect(html).toContain("read without parsing anything.</li>");
  });

  test("a nested bullet nests", () => {
    const html = renderMarkdown("- outer\n  - inner\n- second");
    expect(html).toContain("<ul>\n<li>inner</li>\n</ul>");
    expect(html.match(/<li>/g)).toHaveLength(3);
  });

  test("an ordered list keeps its numbering and its continuation lines", () => {
    const html = renderMarkdown("1. **First.** Its default applies\n   instead.\n2. Second.");
    expect(html).toContain("<ol>");
    expect(html).toContain("<strong>First.</strong> Its default applies instead.");
  });

  test("a blockquote renders its inner blocks", () => {
    const html = renderMarkdown("> **Status: early.** Every rule is checked at `L0`.");
    expect(html).toContain("<blockquote>");
    expect(html).toContain("<strong>Status: early.</strong>");
  });
});

describe("the wiki itself renders", () => {
  // The corpus is the specification; a construct this renderer cannot handle is a finding, and
  // the cheapest place to find one is here rather than in a browser.
  const root = join(HERE, "../..");
  const pages = [
    "wiki/index.md",
    "wiki/SCHEMA.md",
    "wiki/concepts/exit-codes.md",
    "wiki/rules/parsing/unknown-flag-exits-nonzero.md",
    "wiki/rules/lifecycle/inert-invocations-do-not-crash.md",
    "roadmap.md",
  ];

  for (const page of pages) {
    test(`${page} produces no stray markup`, () => {
      const html = renderMarkdown(readFileSync(join(root, page), "utf8"));
      expect(html).not.toContain("](");
      expect(html).not.toMatch(/^#{1,6}\s/m);
      expect(html).not.toMatch(/\|\s*-{3,}\s*\|/);
      expect(html.split("<pre>").length).toBe(html.split("</pre>").length);
    });
  }
});

describe("type groups come from the data, not from a list in the builder", () => {
  const schema = readFileSync(join(HERE, "../SCHEMA.md"), "utf8");

  test("the order hint is read from SCHEMA.md's own table", () => {
    expect(typeOrderFromSchema(schema)).toEqual([
      "concept",
      "archetype",
      "rule",
      "decision",
      "guide",
      "tutorial",
    ]);
  });

  test("an undocumented type still gets a label", () => {
    // The failure mode this guards: a `reference` page lands, the lint passes, and a builder
    // with a hard-coded five-type list makes it invisible in navigation.
    expect(typeLabel("reference")).toBe("References");
    expect(typeLabel("index")).toBe("Indexes");
    expect(typeLabel("archetype")).toBe("Archetypes");
  });
});

describe("the built site's own link gate", () => {
  test("catches a dead page and a dead anchor", () => {
    const emitted = new Map([
      ["a.html", '<a href="./b.html#there">ok</a><a href="./gone.html">dead</a>'],
      ["b.html", '<h2 id="there">there</h2><a href="./a.html#nope">bad anchor</a>'],
    ]);
    expect(brokenLinks(emitted, "/out")).toEqual([
      "a.html → ./gone.html  (no page at gone.html)",
      "b.html → ./a.html#nope  (#nope is not an id on that page)",
    ]);
  });

  test("passes when everything resolves", () => {
    const emitted = new Map([
      ["a.html", '<a href="./b.html#there">ok</a>'],
      ["b.html", '<h2 id="there">there</h2>'],
    ]);
    expect(brokenLinks(emitted, "/out")).toEqual([]);
  });
});

describe("the stylesheet stays on the semantic token layer", () => {
  const css = readFileSync(join(HERE, "site.css"), "utf8");

  test("the shipped stylesheet has no colour literal outside the token block", () => {
    expect(tokenViolations(css)).toEqual([]);
  });

  // The point of the gate is that it FAILS. An unfalsifiable "we use tokens" claim is exactly
  // what this repo objects to, so each way of smuggling a literal past it is tested.
  test("a hex literal in a rule is caught", () => {
    expect(tokenViolations(`${css}\n.x {\n  color: #666;\n}\n`)).toHaveLength(2);
  });

  test("a colour function is caught", () => {
    expect(
      tokenViolations(`${css}\n.x {\n  background: rgba(0, 0, 0, 0.4);\n}\n`).length,
    ).toBeGreaterThan(0);
  });

  test("a NAMED colour is caught, without enumerating the 148 of them", () => {
    expect(tokenViolations(`${css}\n.x {\n  border: 1px solid rebeccapurple;\n}\n`)).toEqual([
      expect.stringContaining("rebeccapurple"),
    ]);
  });

  // Both of these walked straight past the gate until the declaration scanner stopped anchoring
  // to the start of a line and stopped taking only the first match. Found by smuggling a literal
  // into the shipped stylesheet, which is the only way this class of hole ever shows up.
  // Two problems each, for the same reason the `#666` case above reports two: a hex in a colour
  // property is both a literal outside the token block and a bare value in a colour property.
  test("a hex literal in a SINGLE-LINE rule is caught", () => {
    const found = tokenViolations(`${css}\n.x { color: #663399; }\n`);
    expect(found).toHaveLength(2);
    expect(found.every((p) => p.includes("#663399"))).toBe(true);
  });

  test("a literal in the SECOND declaration on a line is caught", () => {
    const found = tokenViolations(`${css}\n.x {\n  margin: 0; color: #663399;\n}\n`);
    expect(found).toHaveLength(2);
    expect(found.every((p) => p.includes("#663399"))).toBe(true);
  });

  test("a semantic token in the same position is fine", () => {
    expect(tokenViolations(`${css}\n.x {\n  border: 1px solid var(--color-border);\n}\n`)).toEqual(
      [],
    );
  });
});
