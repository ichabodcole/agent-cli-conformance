// Tests for the portable docs-lint core.
//
// This linter is ENFORCEMENT infrastructure: it gates commits, and every downstream claim
// that the wiki is valid rests on it. So these tests are adversarial — each integration case
// builds a wiki that is broken in exactly one way and asserts the specific problem fires,
// and `a valid wiki produces no problems` guards the other direction (a linter that never
// says OK is as useless as one that never says no).
//
// Fixtures are throwaway wikis under the OS temp dir, never this repo's real `docs/wiki`.
//
// A handful of cases are marked `test.failing` — they assert the behaviour we believe is
// CORRECT and are expected to fail against today's implementation. See the comment on each.

import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  type DocsLintConfig,
  headingSlugsOf,
  type LintPage,
  parseFrontmatter,
  runDocsLint,
  slug,
  stripCode,
  walkMarkdown,
  yamlList,
} from "./index.ts";

// ---------------------------------------------------------------------------------------
// fixtures + harness
// ---------------------------------------------------------------------------------------

const DATE = "2026-08-13";
const tempRoots: string[] = [];

afterAll(() => {
  for (const root of tempRoots) rmSync(root, { recursive: true, force: true });
});

/** Materialise `{ relativePath: contents }` as a throwaway wiki; returns its root. */
function wiki(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "docs-lint-"));
  tempRoots.push(root);
  for (const [rel, contents] of Object.entries(files)) {
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, contents);
  }
  return root;
}

/** Frontmatter that passes every universal check, as a baseline to break one field at a time. */
const OK_FM: Record<string, string> = {
  type: "concept",
  title: "Page",
  tags: "[t]",
  updated: DATE,
};

/** Build a page. A `null` value omits that key, so a test can drop one field from OK_FM. */
function page(fields: Record<string, string | null>, body = "# Page\n"): string {
  const lines = Object.entries(fields)
    .filter((e): e is [string, string] => e[1] !== null)
    .map(([k, v]) => `${k}: ${v}`);
  return `---\n${lines.join("\n")}\n---\n\n${body}`;
}

interface LintRun {
  /** `runDocsLint`'s return value — the problem count. */
  count: number;
  /** One entry per problem, in order (human mode only; the summary line is dropped). */
  problems: string[];
  /** Everything the run wrote to stdout. */
  out: string;
}

/** Run the linter with stdout captured. */
function lint(config: DocsLintConfig): LintRun {
  const lines: string[] = [];
  const realLog = console.log;
  console.log = (...args: unknown[]) => {
    lines.push(args.map((a) => String(a)).join(" "));
  };
  let count: number;
  try {
    count = runDocsLint(config);
  } finally {
    console.log = realLog;
  }
  return { count, problems: config.json ? [] : lines.slice(0, -1), out: lines.join("\n") };
}

/** The wiki's own config shape, so the tests exercise the parameters this project uses. */
function config(root: string, overrides: Partial<DocsLintConfig> = {}): DocsLintConfig {
  return {
    root,
    types: ["concept", "rule", "index"],
    dateField: "updated",
    allowDateOnly: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------------------
// slug
// ---------------------------------------------------------------------------------------

describe("slug", () => {
  // Expectations cross-checked against GitHub's own heading anchors: lowercase, drop
  // punctuation, spaces -> hyphens, and NOTHING collapses runs of hyphens.
  const cases: Array<[input: string, expected: string]> = [
    ["Simple", "simple"],
    ["The taxonomy", "the-taxonomy"],
    ["ALL CAPS Heading", "all-caps-heading"],
    ["Why it fails (silently)", "why-it-fails-silently"],
    ["Exit codes: the taxonomy", "exit-codes-the-taxonomy"],
    ["What it is?", "what-it-is"],
    ["already-hyphenated", "already-hyphenated"],
    ["snake_case_survives", "snake_case_survives"],
    ["3 ways to fail", "3-ways-to-fail"],
    // The double-hyphen case: dropped punctuation leaves the spaces on BOTH sides of it, and
    // each becomes a hyphen. GitHub does exactly this; a slugger that collapsed them would
    // produce anchors that 404.
    ["Filter (cutoff & resonance)", "filter-cutoff--resonance"],
    ["Beating / detune", "beating--detune"],
    ["Rule A1 — unknown flags", "rule-a1--unknown-flags"],
    // Backticks vanish but the flag's own hyphens stay: `## The `--json` flag` on GitHub is
    // #the---json-flag (one hyphen from the space, two from `--`).
    ["The `--json` flag", "the---json-flag"],
    // Leading/trailing whitespace is trimmed BEFORE spaces become hyphens, so no edge hyphen.
    ["  padded  ", "padded"],
    ["(parenthesised)", "parenthesised"],
    ["###", ""],
    ["", ""],
  ];

  for (const [input, expected] of cases) {
    test(`${JSON.stringify(input)} -> ${JSON.stringify(expected)}`, () => {
      expect(slug(input)).toBe(expected);
    });
  }

  test("is idempotent — slugging a slug changes nothing", () => {
    for (const [input] of cases) expect(slug(slug(input))).toBe(slug(input));
  });

  // KNOWN DIVERGENCE (documented, not asserted as correct): `\w` is ASCII-only, so accented
  // letters are dropped rather than kept. GitHub yields `café-résumé`; we yield `caf-rsum`.
  // Harmless here (this wiki is ASCII) and the failure mode is a false MISSING ANCHOR, which
  // is loud rather than silent — but it would bite a wiki with non-English headings.
  test("drops non-ASCII letters (diverges from GitHub, which keeps them)", () => {
    expect(slug("Café résumé")).toBe("caf-rsum");
  });
});

describe("headingSlugsOf", () => {
  test("collects every heading level", () => {
    const md = "# One\n## Two words\n### Three (x)\n#### Four\n##### Five\n###### Six\n";
    expect([...headingSlugsOf(md)].sort()).toEqual(
      ["one", "two-words", "three-x", "four", "five", "six"].sort(),
    );
  });

  test("ignores prose, `#hashtags`, and setext-ish noise", () => {
    const md = "#NoSpace\nplain # not a heading\n## Real\n";
    expect([...headingSlugsOf(md)]).toEqual(["real"]);
  });

  test("de-duplicates identical headings", () => {
    expect([...headingSlugsOf("## Same\n## Same\n")]).toEqual(["same"]);
  });

  // REGRESSION: `headingSlugsOf` used to scan RAW text, so a `# comment` inside a fenced block
  // registered as a heading and a link to that anchor passed the lint while being broken on
  // GitHub — a FALSE NEGATIVE, the direction a gate must never fail in. Fixed by stripping
  // code first. Do not "optimise" that call away.
  test("does not treat `#` lines inside fenced code as headings", () => {
    const md = "# Real\n\n```sh\n# Fake heading\n```\n";
    expect([...headingSlugsOf(md)]).toEqual(["real"]);
  });

  // The fix must not cost real headings: `stripCode` collapses newlines only INSIDE a fence,
  // so a heading after one still begins a line.
  test("keeps headings on both sides of a fenced block", () => {
    const md = "# Before\n\n```sh\n# Fake\n```\n\n## After\n";
    expect([...headingSlugsOf(md)]).toEqual(["before", "after"]);
  });

  // A span cannot fake a heading (a heading needs `#` at line start; a span starts with a
  // backtick), so no stripping is needed for this case — it simply never matches.
  test("does not treat a `#` inside an inline span as a heading", () => {
    expect([...headingSlugsOf("# Real\n\n`# not a heading`\n")]).toEqual(["real"]);
  });

  // REGRESSION: the first attempt at the fence fix used `stripCode`, which also blanks INLINE
  // spans — silently changing the anchor of any heading containing one. Three real wiki pages
  // linked to `#choices-is-just-in-time-discovery` and all three broke at once. Heading
  // detection must strip fences ONLY.
  test("keeps backticked text in a heading's slug", () => {
    expect([...headingSlugsOf("### `choices` is just-in-time discovery\n")]).toEqual([
      "choices-is-just-in-time-discovery",
    ]);
    expect([...headingSlugsOf("## The `--json` flag\n")]).toEqual(["the---json-flag"]);
  });
});

// ---------------------------------------------------------------------------------------
// stripCode
// ---------------------------------------------------------------------------------------

describe("stripCode", () => {
  const samples = [
    "",
    "no code at all",
    "```\nfenced\n```",
    "```ts\nconst a = 1;\n```\n\ntext\n\n```\nmore\n```",
    "an `inline` span",
    "`a``b`",
    "``double``",
    "```unterminated\nstill going",
    "mixed `inline` and\n```\nfence\n```\ntail",
  ];

  // The link scanner runs on the OUTPUT of stripCode and reports positions/targets from it;
  // every downstream offset assumes nothing moved. Length is the invariant that guarantees it.
  test.each(samples)("preserves length exactly: %j", (sample) => {
    expect(stripCode(sample).length).toBe(sample.length);
  });

  test("blanks a fenced block, leaving surrounding prose untouched", () => {
    const md = "before\n```ts\n[a](../b.md)\n```\nafter";
    const out = stripCode(md);
    expect(out.startsWith("before\n")).toBe(true);
    expect(out.endsWith("\nafter")).toBe(true);
    expect(out).not.toContain("[a](../b.md)");
    expect(out).not.toContain("`");
  });

  test("blanks an inline span — a documented link is not a link", () => {
    const md = "see `[a](../b.md)` ok";
    expect(stripCode(md)).toBe(`see ${" ".repeat(14)} ok`);
    expect(stripCode(md)).not.toContain("](");
  });

  test("blanks several fences and several spans in one pass", () => {
    const md = "`one` mid `two`\n```\n[x](./x.md)\n```\nend `three`";
    const out = stripCode(md);
    expect(out).not.toContain("one");
    expect(out).not.toContain("two");
    expect(out).not.toContain("three");
    expect(out).not.toContain("[x](./x.md)");
    expect(out).toContain("mid");
    expect(out).toContain("end");
  });

  test("a fence is non-greedy — two fences do not swallow the prose between them", () => {
    const md = "```\na\n```\nKEEP ME\n```\nb\n```";
    expect(stripCode(md)).toContain("KEEP ME");
  });

  test("leaves an ordinary hyphen/asterisk line alone", () => {
    const md = "- a list item with a [link](./x.md)\n";
    expect(stripCode(md)).toBe(md);
  });

  // CHARACTERISATION, not endorsement: the fence regex requires a CLOSING ```, so an
  // unterminated fence blanks nothing. CommonMark says an unclosed fence runs to end of file,
  // so links below one would be scanned here but are code on GitHub -> false MISSING FILE.
  // Low severity (an unterminated fence is itself a doc bug) but recorded so a future fix is
  // a deliberate change rather than a surprise.
  test("does NOT blank an unterminated fence (documented limitation)", () => {
    const md = "```ts\n[a](../b.md)\n";
    expect(stripCode(md)).toBe(md);
  });

  // CHARACTERISATION: the lookbehind/lookahead deliberately skip ``double`` spans (they exist
  // to hold literal backticks). Consequence: a link inside a ``…`` span IS scanned, which is
  // the very false positive stripCode exists to prevent — just for the rarer span syntax.
  test("does NOT blank a ``double-backtick`` span (documented limitation)", () => {
    const md = "``[a](../b.md)``";
    expect(stripCode(md)).toBe(md);
  });

  test("does not strip a lone backtick or an empty span", () => {
    expect(stripCode("a ` b")).toBe("a ` b");
    expect(stripCode("``")).toBe("``");
  });

  test("an inline span never spans a newline", () => {
    const md = "start `not\nclosed` end";
    expect(stripCode(md)).toBe(md);
  });
});

// ---------------------------------------------------------------------------------------
// parseFrontmatter
// ---------------------------------------------------------------------------------------

describe("parseFrontmatter", () => {
  test("reads simple key: value pairs, including the last one", () => {
    const fields = parseFrontmatter("type: concept\ntitle: Exit codes\nstatus: current");
    expect(fields.get("type")).toBe("concept");
    expect(fields.get("title")).toBe("Exit codes");
    expect(fields.get("status")).toBe("current");
    expect(fields.size).toBe(3);
  });

  test("accepts hyphens and underscores in keys, and a leading underscore", () => {
    const fields = parseFrontmatter("rule_id: A1\nprobe-level: L0\n_private: x");
    expect(fields.get("rule_id")).toBe("A1");
    expect(fields.get("probe-level")).toBe("L0");
    expect(fields.get("_private")).toBe("x");
  });

  test("joins continuation lines onto their key", () => {
    const fields = parseFrontmatter(
      "description:\n  A CLI that accepts an unrecognised flag\n  cannot tell its caller.\ntype: rule",
    );
    expect(fields.get("description")).toBe(
      "A CLI that accepts an unrecognised flag cannot tell its caller.",
    );
    expect(fields.get("type")).toBe("rule");
  });

  test("joins a continuation that starts on the key's own line", () => {
    const fields = parseFrontmatter("description: A long sentence\n  that wraps.\ntype: rule");
    expect(fields.get("description")).toBe("A long sentence that wraps.");
  });

  // THE CASE THIS FUNCTION EXISTS FOR. Prettier runs on every staged .md and rewrites a long
  // flow sequence into an indented multi-line block; a line-anchored regex cannot see it.
  test("survives Prettier's rewrapped multi-line flow sequence", () => {
    const fm = [
      "type: rule",
      "related:",
      "  [",
      "    concept/exit-codes,",
      "    concept/machine-mode,",
      "    decision/exit-codes-below-125,",
      "  ]",
      "status: current",
    ].join("\n");
    const fields = parseFrontmatter(fm);
    expect(fields.get("related")).toBe(
      "[ concept/exit-codes, concept/machine-mode, decision/exit-codes-below-125, ]",
    );
    expect(yamlList(fields.get("related"))).toEqual([
      "concept/exit-codes",
      "concept/machine-mode",
      "decision/exit-codes-below-125",
    ]);
    // and the key AFTER the wrapped block is still parsed
    expect(fields.get("status")).toBe("current");
  });

  test("reads an indented YAML block sequence", () => {
    const fields = parseFrontmatter("tags:\n  - parsing\n  - exit-codes\nstatus: current");
    expect(fields.get("tags")).toBe("- parsing - exit-codes");
    expect(yamlList(fields.get("tags"))).toEqual(["parsing", "exit-codes"]);
  });

  test("strips a trailing `# comment`", () => {
    expect(parseFrontmatter("type: concept # why this type").get("type")).toBe("concept");
    expect(parseFrontmatter("updated: 2026-08-13   # bumped").get("updated")).toBe("2026-08-13");
  });

  test("keeps a `#` that is not preceded by whitespace (YAML's actual rule)", () => {
    expect(parseFrontmatter("color: #ff0000").get("color")).toBe("#ff0000");
    expect(parseFrontmatter("anchor: exit-codes#taxonomy").get("anchor")).toBe(
      "exit-codes#taxonomy",
    );
  });

  test("last duplicate key wins", () => {
    expect(parseFrontmatter("type: concept\ntype: rule").get("type")).toBe("rule");
  });

  test("blank lines and stray text do not become keys", () => {
    const fields = parseFrontmatter("type: concept\n\nnot a key value pair\ntitle: X");
    expect([...fields.keys()]).toEqual(["type", "title"]);
  });

  test("a key with an empty value yields an empty string, not undefined", () => {
    const fields = parseFrontmatter("description:\ntype: concept");
    expect(fields.get("description")).toBe("");
    expect(fields.has("description")).toBe(true);
  });

  // REGRESSION: comment stripping used to be a blind `\s+#.*$`, so a `#` inside a QUOTED
  // scalar was read as a comment and the rest of the value destroyed —
  // `title: "Exit code #2"` became `"Exit code`, truncated and with an orphaned quote.
  // YAML only begins a comment at an UNQUOTED `#`.
  test("does not treat a `#` inside quotes as a comment", () => {
    expect(parseFrontmatter('title: "Exit code #2"').get("title")).toBe("Exit code #2");
    expect(parseFrontmatter("title: 'Exit code #2'").get("title")).toBe("Exit code #2");
  });

  // ...but an UNQUOTED trailing comment is still a comment.
  test("still strips an unquoted trailing comment", () => {
    expect(parseFrontmatter("type: concept # the OKF field").get("type")).toBe("concept");
    expect(parseFrontmatter('title: "quoted" # trailing').get("title")).toBe("quoted");
  });

  // A `#` with no preceding whitespace is part of the value, matching the original semantics.
  test("does not strip a `#` that is not preceded by whitespace", () => {
    expect(parseFrontmatter("title: C#Sharp").get("title")).toBe("C#Sharp");
  });

  // REGRESSION: quoted scalars are legal YAML — authors reach for them when a value contains
  // a colon or a `#` — and every downstream check compares bare values, so keeping the quotes
  // rejected valid frontmatter (`type: "concept"` -> BAD type).
  test("unquotes a quoted scalar", () => {
    expect(parseFrontmatter('type: "concept"').get("type")).toBe("concept");
    expect(parseFrontmatter("type: 'concept'").get("type")).toBe("concept");
  });

  // Only a MATCHED surrounding pair is stripped; inner quotes are content.
  test("leaves unmatched or interior quotes alone", () => {
    expect(parseFrontmatter('title: "unterminated').get("title")).toBe('"unterminated');
    expect(parseFrontmatter('title: say "hi" now').get("title")).toBe('say "hi" now');
  });

  // CHARACTERISATION: a block sequence written at column 0 is legal YAML but is not indented,
  // so it is not recognised as a continuation and the value is lost. Prettier indents these,
  // which is why it has never bitten in practice.
  test("loses a block sequence written at column 0 (documented limitation)", () => {
    expect(parseFrontmatter("tags:\n- a\n- b").get("tags")).toBe("");
  });
});

// ---------------------------------------------------------------------------------------
// yamlList
// ---------------------------------------------------------------------------------------

describe("yamlList", () => {
  const cases: Array<[label: string, input: string | undefined, expected: string[]]> = [
    ["undefined", undefined, []],
    ["empty string", "", []],
    ["empty flow sequence", "[]", []],
    ["whitespace-only flow sequence", "[  ]", []],
    ["flow, one item", "[parsing]", ["parsing"]],
    ["flow, several items", "[parsing, exit-codes]", ["parsing", "exit-codes"]],
    ["flow, no space after comma", "[a,b,c]", ["a", "b", "c"]],
    ["Prettier-wrapped flow (joined, trailing comma)", "[ a, b, c, ]", ["a", "b", "c"]],
    ["block sequence (joined)", "- a - b", ["a", "b"]],
    ["block sequence, single item", "- a", ["a"]],
    ["hyphenated values survive", "[exit-codes, machine-mode]", ["exit-codes", "machine-mode"]],
    ["type/slug values survive", "[concept/exit-codes, rule/x]", ["concept/exit-codes", "rule/x"]],
    [
      "block sequence of type/slug",
      "- concept/exit-codes - rule/x",
      ["concept/exit-codes", "rule/x"],
    ],
  ];

  for (const [label, input, expected] of cases) {
    test(label, () => {
      expect(yamlList(input)).toEqual(expected);
    });
  }

  // CHARACTERISATION: ` - ` is the block-sequence separator, so a flow value containing a
  // spaced hyphen is split in two. Tags and `type/slug` refs never contain one.
  test("splits a value containing a spaced hyphen (documented limitation)", () => {
    expect(yamlList("[before - after]")).toEqual(["before", "after"]);
  });
});

// ---------------------------------------------------------------------------------------
// walkMarkdown
// ---------------------------------------------------------------------------------------

describe("walkMarkdown", () => {
  test("recurses, returns only .md, and honours skipDirs at every depth", () => {
    const root = wiki({
      "index.md": "x",
      "notes.txt": "x",
      "lint.ts": "x",
      "concepts/a.md": "x",
      "concepts/deep/b.md": "x",
      "concepts/deep/c.png": "x",
      "_skeletons/tpl.md": "x",
      "concepts/_skeletons/tpl.md": "x",
    });
    const found = walkMarkdown(root, new Set(["_skeletons"]))
      .map((p) => p.slice(root.length + 1))
      .sort();
    expect(found).toEqual(["concepts/a.md", "concepts/deep/b.md", "index.md"]);
  });

  test("with no skipDirs, nothing is skipped", () => {
    const root = wiki({ "a.md": "x", "sub/b.md": "x" });
    expect(
      walkMarkdown(root)
        .map((p) => p.slice(root.length + 1))
        .sort(),
    ).toEqual(["a.md", "sub/b.md"]);
  });

  test("returns absolute paths under the root", () => {
    const root = wiki({ "a.md": "x" });
    expect(walkMarkdown(root)).toEqual([join(root, "a.md")]);
  });

  test("an empty directory yields nothing", () => {
    expect(walkMarkdown(wiki({}))).toEqual([]);
  });

  test("is case-sensitive about the .md extension", () => {
    const root = wiki({ "a.MD": "x", "b.markdown": "x", "c.md": "x" });
    expect(walkMarkdown(root).map((p) => p.slice(root.length + 1))).toEqual(["c.md"]);
  });
});

// ---------------------------------------------------------------------------------------
// runDocsLint — the false-positive guard
// ---------------------------------------------------------------------------------------

/**
 * A wiki that is valid in every dimension the linter checks, exercised by the first test and
 * reused as the baseline elsewhere. If this ever reports a problem, the linter has grown a
 * false positive — which is how a gate gets disabled.
 */
function validWiki(): string {
  return wiki({
    // the contract: no frontmatter, nothing links to it
    "SCHEMA.md": "# The contract\n\nWrite `type:` and link with `[a](../b.md)`.\n",
    "index.md": page(
      { type: "index", title: "Catalog", tags: "[index, catalog]", updated: DATE },
      "# Catalog\n\n- [Alpha](./concepts/alpha.md) — the entry point.\n",
    ),
    "concepts/alpha.md": page(
      {
        type: "concept",
        title: "Alpha",
        tags: "[core, parsing]",
        related: "[rule/rho]",
        updated: DATE,
      },
      [
        "# Alpha",
        "",
        "See [Beta](./beta.md), [Rho](../rules/parsing/rho.md), the",
        "[taxonomy](./beta.md#the-taxonomy) and [a section below](#a-section).",
        "",
        "A documented link `[gone](./nowhere.md)` is not a link. Nor is this:",
        "",
        "```md",
        "[also gone](./nowhere.md)",
        "```",
        "",
        "External links are ignored: [spec](https://example.com/x.md), [mail](mailto:a@b.c).",
        "",
        "## A section",
        "",
        "Body.",
      ].join("\n"),
    ),
    // reachable ONLY via alpha — proves reachability is transitive, not one hop from index
    "concepts/beta.md": page(
      { type: "concept", title: "Beta", tags: "[core]", updated: DATE },
      "# Beta\n\n## The taxonomy\n\nBody.\n",
    ),
    "rules/parsing/rho.md": page(
      { type: "rule", title: "Rho", tags: "[parsing]", related: "[concept/alpha]", updated: DATE },
      "# Rho\n\nBack to [Alpha](../../concepts/alpha.md).\n",
    ),
    // not a page: excluded by nonPageDirs, so its missing frontmatter is not a problem
    "_skeletons/template.md": "no frontmatter here, and nothing links to it",
  });
}

describe("runDocsLint — a valid wiki", () => {
  test("reports zero problems", () => {
    const res = lint(config(validWiki(), { nonPageDirs: ["_skeletons"] }));
    expect(res.problems).toEqual([]);
    expect(res.count).toBe(0);
    expect(res.out).toStartWith("OK — ");
  });

  test("counts only real pages in its summary (skipped dirs excluded)", () => {
    const res = lint(config(validWiki(), { nonPageDirs: ["_skeletons"] }));
    expect(res.out).toContain("across 5 files");
  });
});

// ---------------------------------------------------------------------------------------
// runDocsLint — links and anchors
// ---------------------------------------------------------------------------------------

describe("runDocsLint — links", () => {
  /** index.md that catalogs `a.md`, so link tests do not trip the orphan rule. */
  const indexTo = (...targets: string[]) =>
    page(
      { type: "index", title: "Catalog", tags: "[index]", updated: DATE },
      `# Catalog\n\n${targets.map((t) => `- [x](./${t})`).join("\n")}\n`,
    );

  test("a broken relative link is MISSING FILE", () => {
    const root = wiki({
      "index.md": indexTo("a.md"),
      "a.md": page(OK_FM, "# A\n\n[gone](./nowhere.md)\n"),
    });
    const res = lint(config(root));
    expect(res.problems).toHaveLength(1);
    expect(res.problems[0]).toMatch(/^MISSING FILE\s+a\.md: \.\/nowhere\.md$/);
    expect(res.count).toBe(1);
  });

  test("a link that escapes the wiki root is still checked", () => {
    const root = wiki({
      "index.md": indexTo("a.md"),
      "a.md": page(OK_FM, "# A\n\n[research](../../research/nope.md)\n"),
    });
    expect(lint(config(root)).problems[0]).toContain("MISSING FILE");
  });

  test("a link to an existing non-markdown file is fine and is not a graph edge", () => {
    const root = wiki({
      "index.md": indexTo("a.md"),
      "a.md": page(OK_FM, "# A\n\n![diagram](./assets/d.png)\n"),
      "assets/d.png": "not really a png",
    });
    const res = lint(config(root, { json: true }));
    const graph = parseGraph(res.out);
    expect(graph.problems).toEqual([]);
    expect(nodeBy(graph, "a.md").linksOut).toEqual([]);
  });

  test("a missing non-markdown asset is MISSING FILE too", () => {
    const root = wiki({
      "index.md": indexTo("a.md"),
      "a.md": page(OK_FM, "# A\n\n![diagram](./assets/d.png)\n"),
    });
    expect(lint(config(root)).problems[0]).toContain("MISSING FILE");
  });

  test("http(s) and mailto targets are never touched", () => {
    const root = wiki({
      "index.md": indexTo("a.md"),
      "a.md": page(
        OK_FM,
        "# A\n\n[x](https://example.com/nope.md) [y](http://x/y) [z](mailto:a@b.c)\n",
      ),
    });
    expect(lint(config(root)).problems).toEqual([]);
  });

  test("a link inside a fenced block or an inline span is not followed", () => {
    const root = wiki({
      "index.md": indexTo("a.md"),
      "a.md": page(
        OK_FM,
        "# A\n\nInline `[gone](./nope.md)` and fenced:\n\n```md\n[gone](./nope.md)\n```\n",
      ),
    });
    expect(lint(config(root)).problems).toEqual([]);
  });

  test("every broken link is reported, not just the first", () => {
    const root = wiki({
      "index.md": indexTo("a.md"),
      "a.md": page(OK_FM, "# A\n\n[1](./one.md) [2](./two.md) [3](./three.md)\n"),
    });
    const res = lint(config(root));
    expect(res.problems).toHaveLength(3);
    expect(res.count).toBe(3);
  });
});

describe("runDocsLint — anchors", () => {
  test("a link to a heading that does not exist is MISSING ANCHOR", () => {
    const root = wiki({
      "index.md": page(
        { type: "index", title: "Catalog", tags: "[index]", updated: DATE },
        "# Catalog\n\n- [A](./a.md)\n",
      ),
      "a.md": page(OK_FM, "# A\n\n[to b](./b.md#no-such-heading)\n"),
      "b.md": page(OK_FM, "# B\n\n## The taxonomy\n"),
    });
    const res = lint(config(root));
    // a broken ANCHOR still makes the target reachable — b.md is not also an orphan
    expect(res.problems).toHaveLength(1);
    expect(res.problems[0]).toMatch(
      /^MISSING ANCHOR\s+a\.md: \.\/b\.md#no-such-heading\s+\(#no-such-heading not a heading\)$/,
    );
  });

  test("a valid cross-file anchor is accepted", () => {
    const root = wiki({
      "index.md": page(
        { type: "index", title: "Catalog", tags: "[index]", updated: DATE },
        "# Catalog\n\n- [A](./a.md)\n",
      ),
      "a.md": page(OK_FM, "# A\n\n[to b](./sub/b.md#the-taxonomy)\n"),
      "sub/b.md": page(OK_FM, "# B\n\n## The taxonomy\n"),
    });
    expect(lint(config(root)).problems).toEqual([]);
  });

  test("a valid same-file anchor is accepted", () => {
    const root = wiki({
      "index.md": page(
        { type: "index", title: "Catalog", tags: "[index]", updated: DATE },
        "# Catalog\n\n- [A](./a.md)\n",
      ),
      "a.md": page(OK_FM, "# A\n\nJump to [the section](#a-section).\n\n## A section\n"),
    });
    expect(lint(config(root)).problems).toEqual([]);
  });

  test("a broken same-file anchor is caught", () => {
    const root = wiki({
      "index.md": page(
        { type: "index", title: "Catalog", tags: "[index]", updated: DATE },
        "# Catalog\n\n- [A](./a.md)\n",
      ),
      "a.md": page(OK_FM, "# A\n\nJump to [nowhere](#not-here).\n\n## A section\n"),
    });
    const res = lint(config(root));
    expect(res.problems).toHaveLength(1);
    expect(res.problems[0]).toContain("MISSING ANCHOR");
  });

  test("the double-hyphen slug rule is applied to real anchors", () => {
    const root = wiki({
      "index.md": page(
        { type: "index", title: "Catalog", tags: "[index]", updated: DATE },
        "# Catalog\n\n- [A](./a.md)\n",
      ),
      "a.md": page(
        OK_FM,
        "# A\n\n[ok](#filter-cutoff--resonance) and [wrong](#filter-cutoff-resonance)\n\n## Filter (cutoff & resonance)\n",
      ),
    });
    const res = lint(config(root));
    expect(res.problems).toHaveLength(1);
    expect(res.problems[0]).toContain("#filter-cutoff-resonance");
  });
});

// ---------------------------------------------------------------------------------------
// runDocsLint — frontmatter
// ---------------------------------------------------------------------------------------

describe("runDocsLint — frontmatter", () => {
  /** Wiki whose only page `a.md` is cataloged, with the given frontmatter fields. */
  function oneCatalogedPage(fields: Record<string, string | null>, body = "# A\n"): string {
    return wiki({
      "index.md": page(
        { type: "index", title: "Catalog", tags: "[index]", updated: DATE },
        "# Catalog\n\n- [A](./a.md)\n",
      ),
      "a.md": page(fields, body),
    });
  }

  test("a page with no frontmatter at all is NO FRONTMATTER, and is not double-reported", () => {
    const root = wiki({
      "index.md": page(
        { type: "index", title: "Catalog", tags: "[index]", updated: DATE },
        "# Catalog\n\n- [A](./a.md)\n",
      ),
      "a.md": "# A\n\nNo frontmatter here.\n",
    });
    const res = lint(config(root));
    expect(res.problems).toHaveLength(1);
    expect(res.problems[0]).toMatch(/^NO FRONTMATTER a\.md$/);
  });

  test("frontmatter not at the very top of the file does not count", () => {
    const root = wiki({
      "index.md": page(
        { type: "index", title: "Catalog", tags: "[index]", updated: DATE },
        "# Catalog\n\n- [A](./a.md)\n",
      ),
      "a.md": `\n${page(OK_FM, "# A\n")}`,
    });
    expect(lint(config(root)).problems[0]).toContain("NO FRONTMATTER");
  });

  test("a missing `type` is MISSING type", () => {
    const res = lint(config(oneCatalogedPage({ ...OK_FM, type: null })));
    expect(res.problems).toHaveLength(1);
    expect(res.problems[0]).toMatch(/^MISSING type\s+a\.md\s+\(OKF requires a `type` field\)$/);
  });

  test("a `type` outside the configured vocabulary is BAD type, and names the vocabulary", () => {
    const res = lint(config(oneCatalogedPage({ ...OK_FM, type: "archetype" })));
    expect(res.problems).toHaveLength(1);
    expect(res.problems[0]).toContain("BAD type");
    expect(res.problems[0]).toContain('"archetype" not in {concept, rule, index}');
  });

  test("the `types` vocabulary is a parameter — the same page passes with it configured", () => {
    const root = oneCatalogedPage({ ...OK_FM, type: "archetype" });
    expect(
      lint(config(root, { types: ["concept", "rule", "index", "archetype"] })).problems,
    ).toEqual([]);
  });

  test("`type` matching is exact, not case-insensitive or trimmed-by-luck", () => {
    expect(lint(config(oneCatalogedPage({ ...OK_FM, type: "Concept" }))).problems[0]).toContain(
      "BAD type",
    );
  });

  test("missing `tags` is MISSING tags", () => {
    const res = lint(config(oneCatalogedPage({ ...OK_FM, tags: null })));
    expect(res.problems).toHaveLength(1);
    expect(res.problems[0]).toMatch(/^MISSING tags\s+a\.md\s+\(expected `tags: \[ \.\.\. \]`\)$/);
  });

  test("an EMPTY tag list is rejected — `tags: []` is not tagging", () => {
    expect(lint(config(oneCatalogedPage({ ...OK_FM, tags: "[]" }))).problems[0]).toContain(
      "MISSING tags",
    );
    expect(lint(config(oneCatalogedPage({ ...OK_FM, tags: "[   ]" }))).problems[0]).toContain(
      "MISSING tags",
    );
  });

  test("flow style is accepted", () => {
    expect(lint(config(oneCatalogedPage({ ...OK_FM, tags: "[parsing, core]" }))).problems).toEqual(
      [],
    );
  });

  test("YAML block style is accepted", () => {
    const root = wiki({
      "index.md": page(
        { type: "index", title: "Catalog", tags: "[index]", updated: DATE },
        "# Catalog\n\n- [A](./a.md)\n",
      ),
      "a.md": `---\ntype: concept\ntitle: A\ntags:\n  - parsing\n  - core\nupdated: ${DATE}\n---\n\n# A\n`,
    });
    const res = lint(config(root));
    expect(res.problems).toEqual([]);
    expect(lint(config(root, { json: true })).out).toContain("parsing");
  });

  test("Prettier's rewrapped flow sequence is accepted", () => {
    const root = wiki({
      "index.md": page(
        { type: "index", title: "Catalog", tags: "[index]", updated: DATE },
        "# Catalog\n\n- [A](./a.md)\n",
      ),
      "a.md": `---\ntype: concept\ntitle: A\ntags:\n  [\n    parsing,\n    silent-failure,\n    exit-codes,\n  ]\nupdated: ${DATE}\n---\n\n# A\n`,
    });
    expect(lint(config(root)).problems).toEqual([]);
  });

  // REGRESSION: a legally quoted scalar used to fail the vocabulary check, because
  // `parseFrontmatter` kept the quotes and `"concept"` !== `concept`. See the `unquotes a
  // quoted scalar` unit test.
  test("accepts a quoted `type` value", () => {
    expect(lint(config(oneCatalogedPage({ ...OK_FM, type: '"concept"' }))).problems).toHaveLength(
      0,
    );
    expect(lint(config(oneCatalogedPage({ ...OK_FM, type: "'concept'" }))).problems).toHaveLength(
      0,
    );
  });

  // ...and quoting must not smuggle an unknown value past the check.
  test("still rejects a quoted value outside the vocabulary", () => {
    expect(lint(config(oneCatalogedPage({ ...OK_FM, type: '"nonsense"' }))).problems[0]).toContain(
      "BAD type",
    );
  });
});

describe("runDocsLint — the date field", () => {
  // The catalog carries a full ISO value under every field name these tests configure, so it
  // stays valid whatever `dateField`/`allowDateOnly` is under test and only `a.md` moves.
  const ISO = "2026-08-13T09:30:00Z";
  const oneCatalogedPage = (fields: Record<string, string | null>) =>
    wiki({
      "index.md": page(
        {
          type: "index",
          title: "Catalog",
          tags: "[index]",
          updated: ISO,
          timestamp: ISO,
          reviewed: ISO,
        },
        "# Catalog\n\n- [A](./a.md)\n",
      ),
      "a.md": page(fields),
    });

  test("`dateField` defaults to `timestamp` (OKF's convention)", () => {
    const root = oneCatalogedPage({ ...OK_FM, updated: DATE });
    const res = lint({ root, types: ["concept", "index"], allowDateOnly: true });
    expect(res.problems).toHaveLength(1);
    expect(res.problems[0]).toMatch(/^MISSING timestamp\s+a\.md\s+\(expected `timestamp: /);
  });

  test("`dateField` actually changes which field is required", () => {
    // `updated` present, `reviewed` required -> problem
    const missing = oneCatalogedPage({ ...OK_FM, updated: DATE });
    const res = lint(config(missing, { dateField: "reviewed" }));
    expect(res.problems).toHaveLength(1);
    expect(res.problems[0]).toContain("MISSING reviewed");

    // and with the field present, the same config is clean while `updated` is now irrelevant
    const present = oneCatalogedPage({ ...OK_FM, updated: null, reviewed: DATE });
    expect(lint(config(present, { dateField: "reviewed" })).problems).toEqual([]);
  });

  test("allowDateOnly:true accepts YYYY-MM-DD", () => {
    expect(
      lint(config(oneCatalogedPage({ ...OK_FM, updated: "2026-08-13" }), { allowDateOnly: true }))
        .problems,
    ).toEqual([]);
  });

  test("allowDateOnly:false rejects YYYY-MM-DD", () => {
    const res = lint(
      config(oneCatalogedPage({ ...OK_FM, updated: "2026-08-13" }), { allowDateOnly: false }),
    );
    expect(res.problems).toHaveLength(1);
    expect(res.problems[0]).toContain("MISSING updated");
  });

  test("full ISO-8601 is accepted either way", () => {
    for (const allowDateOnly of [true, false]) {
      const root = oneCatalogedPage({ ...OK_FM, updated: "2026-08-13T09:30:00Z" });
      expect(lint(config(root, { allowDateOnly })).problems).toEqual([]);
    }
  });

  test("junk after a date-only value is rejected even when allowDateOnly is on", () => {
    const root = oneCatalogedPage({ ...OK_FM, updated: "2026-08-13 (approx)" });
    expect(lint(config(root, { allowDateOnly: true })).problems[0]).toContain("MISSING updated");
  });

  test("a non-date and a wrong-order date are rejected", () => {
    for (const value of ["yesterday", "13-08-2026", "2026/08/13", "26-08-13"]) {
      const root = oneCatalogedPage({ ...OK_FM, updated: value });
      expect(lint(config(root)).problems[0]).toContain("MISSING updated");
    }
  });

  // REGRESSION: quoting a date is legal YAML, but the date regex is anchored at `^` so the
  // opening quote used to fail the match. Same root cause as the `type: "concept"` case.
  test("accepts a quoted date", () => {
    const root = oneCatalogedPage({ ...OK_FM, updated: `"${DATE}"` });
    expect(lint(config(root)).problems).toHaveLength(0);
  });

  // ...and quoting must not smuggle a malformed date past the check.
  test("still rejects a quoted malformed date", () => {
    const root = oneCatalogedPage({ ...OK_FM, updated: '"13-08-2026"' });
    expect(lint(config(root)).problems[0]).toContain("MISSING updated");
  });
});

// ---------------------------------------------------------------------------------------
// runDocsLint — orphans and the catalog
// ---------------------------------------------------------------------------------------

describe("runDocsLint — orphans", () => {
  test("a page nothing links to is an ORPHAN", () => {
    const root = wiki({
      "index.md": page(
        { type: "index", title: "Catalog", tags: "[index]", updated: DATE },
        "# Catalog\n\n- [A](./a.md)\n",
      ),
      "a.md": page(OK_FM, "# A\n"),
      "lonely.md": page(OK_FM, "# Lonely\n"),
    });
    const res = lint(config(root));
    expect(res.problems).toHaveLength(1);
    expect(res.problems[0]).toMatch(/^ORPHAN\s+lonely\.md\s+\(unreachable from index\.md/);
  });

  test("reachability is TRANSITIVE — a page linked from a cataloged sibling is not an orphan", () => {
    const root = wiki({
      "index.md": page(
        { type: "index", title: "Catalog", tags: "[index]", updated: DATE },
        "# Catalog\n\n- [A](./concepts/a.md)\n",
      ),
      "concepts/a.md": page(OK_FM, "# A\n\n[B](./b.md)\n"),
      "concepts/b.md": page(OK_FM, "# B\n\n[C](../deep/c.md)\n"),
      "deep/c.md": page(OK_FM, "# C\n\n[D](./d.md)\n"),
      "deep/d.md": page(OK_FM, "# D\n"),
    });
    expect(lint(config(root)).problems).toEqual([]);
  });

  test("a link CYCLE off the catalog does not hang the walk", () => {
    const root = wiki({
      "index.md": page(
        { type: "index", title: "Catalog", tags: "[index]", updated: DATE },
        "# Catalog\n\n- [A](./a.md)\n",
      ),
      "a.md": page(OK_FM, "# A\n\n[B](./b.md)\n"),
      "b.md": page(OK_FM, "# B\n\n[A](./a.md)\n"),
    });
    expect(lint(config(root)).problems).toEqual([]);
  });

  test("an island of pages that link only to each other is still orphaned", () => {
    const root = wiki({
      "index.md": page(
        { type: "index", title: "Catalog", tags: "[index]", updated: DATE },
        "# Catalog\n",
      ),
      "a.md": page(OK_FM, "# A\n\n[B](./b.md)\n"),
      "b.md": page(OK_FM, "# B\n\n[A](./a.md)\n"),
    });
    const res = lint(config(root));
    expect(res.problems.filter((p) => p.startsWith("ORPHAN"))).toHaveLength(2);
  });

  test("a missing index.md is NO CATALOG", () => {
    const root = wiki({ "a.md": page(OK_FM, "# A\n") });
    const res = lint(config(root));
    expect(res.problems).toHaveLength(1);
    expect(res.problems[0]).toMatch(/^NO CATALOG\s+index\.md is missing/);
  });

  // CHARACTERISATION of the interaction: with no catalog there is no root to walk from, so
  // no per-page ORPHAN lines are emitted — the single NO CATALOG line stands in for all of
  // them ("every page is an orphan without it"). The JSON counterpart is asserted below.
  test("no catalog means no per-page ORPHAN lines", () => {
    const root = wiki({ "a.md": page(OK_FM), "b.md": page(OK_FM) });
    expect(lint(config(root)).problems.filter((p) => p.startsWith("ORPHAN"))).toEqual([]);
  });

  test("index.md itself is never its own orphan", () => {
    const root = wiki({
      "index.md": page(
        { type: "index", title: "Catalog", tags: "[index]", updated: DATE },
        "# Catalog\n",
      ),
    });
    expect(lint(config(root)).problems).toEqual([]);
  });

  test("`related:` does NOT confer reachability — only links do (documented design)", () => {
    const root = wiki({
      "index.md": page(
        { type: "index", title: "Catalog", tags: "[index]", updated: DATE, related: "[concept/a]" },
        "# Catalog\n",
      ),
      "a.md": page(OK_FM, "# A\n"),
    });
    expect(lint(config(root)).problems).toContainEqual(expect.stringContaining("ORPHAN"));
  });
});

// ---------------------------------------------------------------------------------------
// runDocsLint — related edges
// ---------------------------------------------------------------------------------------

describe("runDocsLint — related", () => {
  test("a `related:` entry matching no page is BAD related", () => {
    const root = wiki({
      "index.md": page(
        { type: "index", title: "Catalog", tags: "[index]", updated: DATE },
        "# Catalog\n\n- [A](./a.md)\n",
      ),
      "a.md": page({ ...OK_FM, related: "[rule/does-not-exist]" }),
    });
    const res = lint(config(root));
    expect(res.problems).toHaveLength(1);
    expect(res.problems[0]).toMatch(
      /^BAD related\s+a\.md: "rule\/does-not-exist" matches no page \(expected `type\/slug`\)$/,
    );
  });

  test("a valid entry resolves by BASENAME regardless of folder depth", () => {
    const root = wiki({
      "index.md": page(
        { type: "index", title: "Catalog", tags: "[index]", updated: DATE },
        "# Catalog\n\n- [A](./concepts/deep/a.md)\n",
      ),
      "concepts/deep/a.md": page(
        { ...OK_FM, related: "[rule/rho]" },
        "# A\n\n[Rho](../../rules/parsing/nested/rho.md)\n",
      ),
      "rules/parsing/nested/rho.md": page({ ...OK_FM, type: "rule", related: "[concept/a]" }),
    });
    expect(lint(config(root)).problems).toEqual([]);
  });

  test("the TYPE half must match too — right slug, wrong type is BAD related", () => {
    const root = wiki({
      "index.md": page(
        { type: "index", title: "Catalog", tags: "[index]", updated: DATE },
        "# Catalog\n\n- [A](./a.md)\n",
      ),
      "a.md": page({ ...OK_FM, related: "[rule/b]" }, "# A\n\n[B](./b.md)\n"),
      "b.md": page(OK_FM), // type: concept, so `rule/b` must not resolve
    });
    expect(lint(config(root)).problems[0]).toContain("BAD related");
  });

  test("every bad entry in a list is reported, and block style is understood", () => {
    const root = wiki({
      "index.md": page(
        { type: "index", title: "Catalog", tags: "[index]", updated: DATE },
        "# Catalog\n\n- [A](./a.md)\n",
      ),
      "a.md": `---\ntype: concept\ntitle: A\ntags: [t]\nrelated:\n  - rule/nope-one\n  - rule/nope-two\nupdated: ${DATE}\n---\n\n# A\n`,
    });
    const res = lint(config(root));
    expect(res.problems).toHaveLength(2);
    expect(res.problems.every((p) => p.startsWith("BAD related"))).toBe(true);
  });

  test("no `related:` field is not a problem", () => {
    const root = wiki({
      "index.md": page(
        { type: "index", title: "Catalog", tags: "[index]", updated: DATE },
        "# Catalog\n\n- [A](./a.md)\n",
      ),
      "a.md": page(OK_FM),
    });
    expect(lint(config(root)).problems).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------
// runDocsLint — the contract file
// ---------------------------------------------------------------------------------------

describe("runDocsLint — SCHEMA.md exemption", () => {
  test("SCHEMA.md is exempt from frontmatter checks AND from the orphan rule", () => {
    const root = wiki({
      "index.md": page(
        { type: "index", title: "Catalog", tags: "[index]", updated: DATE },
        "# Catalog\n",
      ),
      "SCHEMA.md": "# The contract\n\nNo frontmatter, no inbound links, no problems.\n",
    });
    expect(lint(config(root)).problems).toEqual([]);
  });

  test("control: the same file under any other name is fully checked", () => {
    const root = wiki({
      "index.md": page(
        { type: "index", title: "Catalog", tags: "[index]", updated: DATE },
        "# Catalog\n",
      ),
      "CONTRACT.md": "# The contract\n\nNo frontmatter, no inbound links.\n",
    });
    const res = lint(config(root));
    expect(res.problems).toContainEqual(expect.stringContaining("NO FRONTMATTER"));
    expect(res.problems).toContainEqual(expect.stringContaining("ORPHAN"));
  });

  test("SCHEMA.md's own links ARE still checked (it is exempt from metadata, not from links)", () => {
    const root = wiki({
      "index.md": page(
        { type: "index", title: "Catalog", tags: "[index]", updated: DATE },
        "# Catalog\n",
      ),
      "SCHEMA.md": "# The contract\n\n[gone](./nowhere.md)\n",
    });
    expect(lint(config(root)).problems[0]).toContain("MISSING FILE");
  });

  // CHARACTERISATION: the exemption is `endsWith("SCHEMA.md")`, so it also covers a nested
  // file and any `*SCHEMA.md`. A page accidentally named this way silently skips every
  // frontmatter check — a false NEGATIVE, though it needs a deliberate filename to hit.
  test("the exemption is a suffix match, so a nested SCHEMA.md is exempt too", () => {
    const root = wiki({
      "index.md": page(
        { type: "index", title: "Catalog", tags: "[index]", updated: DATE },
        "# Catalog\n",
      ),
      "concepts/SCHEMA.md": "no frontmatter\n",
      "concepts/OLD-SCHEMA.md": "no frontmatter either\n",
    });
    expect(lint(config(root)).problems).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------
// runDocsLint — extraChecks
// ---------------------------------------------------------------------------------------

describe("runDocsLint — extraChecks", () => {
  test("is invoked exactly once, with every page including index.md and SCHEMA.md", () => {
    const root = validWiki();
    let calls = 0;
    let seen: LintPage[] = [];
    lint(
      config(root, {
        nonPageDirs: ["_skeletons"],
        extraChecks: (pages) => {
          calls += 1;
          seen = pages;
          return [];
        },
      }),
    );
    expect(calls).toBe(1);
    expect(seen.map((p) => p.rel).sort()).toEqual([
      "SCHEMA.md",
      "concepts/alpha.md",
      "concepts/beta.md",
      "index.md",
      "rules/parsing/rho.md",
    ]);
    // pages inside a nonPageDir are not handed over
    expect(seen.some((p) => p.rel.startsWith("_skeletons"))).toBe(false);
  });

  test("each page carries an absolute path, parsed fields, and the full body", () => {
    const root = validWiki();
    let seen: LintPage[] = [];
    lint(
      config(root, {
        nonPageDirs: ["_skeletons"],
        extraChecks: (pages) => {
          seen = pages;
          return [];
        },
      }),
    );
    const alpha = seen.find((p) => p.rel === "concepts/alpha.md");
    expect(alpha).toBeDefined();
    if (!alpha) throw new Error("unreachable");
    expect(alpha.path).toBe(join(root, "concepts/alpha.md"));
    expect(alpha.fields.get("type")).toBe("concept");
    expect(alpha.fields.get("related")).toBe("[rule/rho]");
    expect(alpha.body).toStartWith("---\n");
    expect(alpha.body).toContain("## A section");

    // the contract has no frontmatter, so it arrives with an empty field map rather than absent
    const schema = seen.find((p) => p.rel === "SCHEMA.md");
    expect(schema?.fields.size).toBe(0);
  });

  test("returned problems appear in the output and in the count", () => {
    const root = validWiki();
    const res = lint(
      config(root, {
        nonPageDirs: ["_skeletons"],
        extraChecks: () => ["CUSTOM one", "CUSTOM two"],
      }),
    );
    expect(res.problems).toEqual(["CUSTOM one", "CUSTOM two"]);
    expect(res.count).toBe(2);
    expect(res.out).toContain("2 problem(s).");
  });

  test("returned problems land in the JSON `problems` array too", () => {
    const root = validWiki();
    const res = lint(
      config(root, {
        nonPageDirs: ["_skeletons"],
        json: true,
        extraChecks: () => ["CUSTOM one"],
      }),
    );
    expect(parseGraph(res.out).problems).toEqual(["CUSTOM one"]);
  });

  test("runs AFTER the universal checks, so its problems come last", () => {
    const root = wiki({
      "index.md": page(
        { type: "index", title: "Catalog", tags: "[index]", updated: DATE },
        "# Catalog\n\n- [A](./a.md)\n",
      ),
      "a.md": page({ ...OK_FM, type: null }),
    });
    const res = lint(config(root, { extraChecks: () => ["CUSTOM last"] }));
    expect(res.problems).toEqual([expect.stringContaining("MISSING type"), "CUSTOM last"]);
  });

  test("is optional — omitting it changes nothing", () => {
    expect(lint(config(validWiki(), { nonPageDirs: ["_skeletons"] })).count).toBe(0);
  });
});

// ---------------------------------------------------------------------------------------
// runDocsLint — --json / the knowledge graph
// ---------------------------------------------------------------------------------------

interface GraphNode {
  path: string;
  type: string | null;
  title: string | null;
  description: string | null;
  tags: string[];
  status: string | null;
  linksOut: string[];
  linksIn: string[];
  related: string[];
  tagNeighbors: string[];
  reachable: boolean;
  contractExempt: boolean;
  [extra: string]: unknown;
}

interface Graph {
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

function parseGraph(out: string): Graph {
  return JSON.parse(out) as Graph;
}

function nodeBy(graph: Graph, path: string): GraphNode {
  const found = graph.nodes.find((n) => n.path === path);
  if (!found) throw new Error(`no node for ${path} in graph`);
  return found;
}

describe("runDocsLint — --json", () => {
  test("emits valid JSON and nothing else", () => {
    const res = lint(config(validWiki(), { nonPageDirs: ["_skeletons"], json: true }));
    expect(() => parseGraph(res.out)).not.toThrow();
    // problems are collected but NOT printed as lines in JSON mode: stdout stays parseable
    expect(res.out.trimStart().startsWith("{")).toBe(true);
    expect(res.out.trimEnd().endsWith("}")).toBe(true);
  });

  test("stdout is still parseable when the wiki is broken", () => {
    const root = wiki({ "a.md": "# A\n\n[gone](./nope.md)\n" });
    const res = lint(config(root, { json: true }));
    const graph = parseGraph(res.out);
    expect(graph.problems.length).toBeGreaterThan(0);
    expect(res.count).toBe(graph.problems.length);
  });

  // REGRESSION CLASS: the JSON `stats.orphans` is computed from `reachable`/`contractExempt`
  // on the nodes, while the human output is computed inline. They are two implementations of
  // one rule and have disagreed before.
  test("stats.orphans agrees with the human-mode ORPHAN count", () => {
    const root = wiki({
      "index.md": page(
        { type: "index", title: "Catalog", tags: "[index]", updated: DATE },
        "# Catalog\n\n- [A](./a.md)\n",
      ),
      "a.md": page(OK_FM, "# A\n\n[B](./b.md)\n"),
      "b.md": page(OK_FM, "# B\n"),
      "lonely.md": page(OK_FM, "# Lonely\n"),
      "also-lonely.md": page(OK_FM, "# Also lonely\n"),
      "SCHEMA.md": "# Contract, unlinked and exempt\n",
    });
    const human = lint(config(root));
    const graph = parseGraph(lint(config(root, { json: true })).out);
    const humanOrphans = human.problems.filter((p) => p.startsWith("ORPHAN"));
    expect(humanOrphans).toHaveLength(2);
    expect(graph.stats.orphans).toBe(humanOrphans.length);
    expect(nodeBy(graph, "SCHEMA.md").contractExempt).toBe(true);
    expect(nodeBy(graph, "SCHEMA.md").reachable).toBe(false);
    expect(nodeBy(graph, "b.md").reachable).toBe(true); // transitive, same as human mode
  });

  test("stats.orphans agrees on a wiki with no orphans at all", () => {
    const root = validWiki();
    const human = lint(config(root, { nonPageDirs: ["_skeletons"] }));
    const graph = parseGraph(lint(config(root, { nonPageDirs: ["_skeletons"], json: true })).out);
    expect(human.problems.filter((p) => p.startsWith("ORPHAN"))).toEqual([]);
    expect(graph.stats.orphans).toBe(0);
    expect(graph.nodes.every((n) => n.reachable || n.contractExempt)).toBe(true);
  });

  // CHARACTERISATION of the one place the two views legitimately differ: with no catalog the
  // human output emits NO CATALOG and zero ORPHAN lines, while the graph marks every page
  // unreachable — which is what the NO CATALOG message says ("every page is an orphan
  // without it"). Recorded so a future reader does not mistake it for the regression above.
  test("with no catalog, the graph counts every page as an orphan", () => {
    const root = wiki({ "a.md": page(OK_FM), "b.md": page(OK_FM) });
    const human = lint(config(root));
    const graph = parseGraph(lint(config(root, { json: true })).out);
    expect(human.problems).toEqual([expect.stringContaining("NO CATALOG")]);
    expect(graph.stats.orphans).toBe(2);
  });

  test("nodes carry frontmatter, edges in BOTH directions, and the date under its own key", () => {
    const root = validWiki();
    const graph = parseGraph(lint(config(root, { nonPageDirs: ["_skeletons"], json: true })).out);

    const alpha = nodeBy(graph, "concepts/alpha.md");
    expect(alpha.type).toBe("concept");
    expect(alpha.title).toBe("Alpha");
    expect(alpha.tags).toEqual(["core", "parsing"]);
    expect(alpha.updated).toBe(DATE);
    expect(alpha.related).toEqual(["rule/rho"]);
    expect(alpha.linksOut.sort()).toEqual(["concepts/beta.md", "rules/parsing/rho.md"]);
    expect(alpha.linksIn.sort()).toEqual(["index.md", "rules/parsing/rho.md"]);

    // a same-file anchor is not a self-edge
    expect(alpha.linksOut).not.toContain("concepts/alpha.md");
    // links inside code fences never become edges
    expect(alpha.linksOut).not.toContain("concepts/nowhere.md");

    const beta = nodeBy(graph, "concepts/beta.md");
    expect(beta.linksIn).toEqual(["concepts/alpha.md"]);
    expect(beta.linksOut).toEqual([]);
    expect(beta.status).toBeNull();
    expect(beta.description).toBeNull();
  });

  test("the date key follows `dateField`", () => {
    const root = validWiki();
    const graph = parseGraph(
      lint(config(root, { nonPageDirs: ["_skeletons"], json: true, dateField: "timestamp" })).out,
    );
    const alpha = nodeBy(graph, "concepts/alpha.md");
    expect("timestamp" in alpha).toBe(true);
    expect(alpha.timestamp).toBeNull(); // the fixture uses `updated`
  });

  test("tagNeighbors are the pages sharing a tag, never the page itself", () => {
    const root = validWiki();
    const graph = parseGraph(lint(config(root, { nonPageDirs: ["_skeletons"], json: true })).out);
    const alpha = nodeBy(graph, "concepts/alpha.md");
    expect(alpha.tagNeighbors.sort()).toEqual(["concepts/beta.md", "rules/parsing/rho.md"]);
    expect(alpha.tagNeighbors).not.toContain("concepts/alpha.md");
    // a page with a tag nobody shares has no neighbours
    expect(nodeBy(graph, "index.md").tagNeighbors).toEqual([]);
  });

  test("stats and indexes count what they say they count", () => {
    const root = validWiki();
    const graph = parseGraph(lint(config(root, { nonPageDirs: ["_skeletons"], json: true })).out);
    expect(graph.stats.pages).toBe(5); // 4 pages + SCHEMA.md, _skeletons excluded
    expect(graph.stats.linkEdges).toBe(
      graph.nodes.reduce((n, node) => n + node.linksOut.length, 0),
    );
    expect(graph.stats.relatedEdges).toBe(2);
    expect(graph.stats.tags).toBe(Object.keys(graph.tagIndex).length);
    expect(graph.typeIndex.concept?.sort()).toEqual(["concepts/alpha.md", "concepts/beta.md"]);
    expect(graph.typeIndex.rule).toEqual(["rules/parsing/rho.md"]);
    expect(graph.tagIndex.core?.sort()).toEqual(["concepts/alpha.md", "concepts/beta.md"]);
    expect(graph.root).toBe(".");
    expect(graph.contract).toBe("SCHEMA.md");
    expect(graph.catalog).toBe("index.md");
  });

  test("hubs rank by inbound links and exclude the catalog itself", () => {
    const root = validWiki();
    const graph = parseGraph(lint(config(root, { nonPageDirs: ["_skeletons"], json: true })).out);
    expect(graph.hubs.map((h) => h.path)).not.toContain("index.md");
    expect(graph.hubs[0]?.path).toBe("concepts/alpha.md");
    expect(graph.hubs[0]?.linksIn).toBe(2);
    expect(graph.hubs.length).toBeLessThanOrEqual(10);
  });
});

// ---------------------------------------------------------------------------------------
// runDocsLint — nonPageDirs
// ---------------------------------------------------------------------------------------

describe("runDocsLint — nonPageDirs", () => {
  test("a skipped directory is neither linted nor graphed", () => {
    const files = {
      "index.md": page(
        { type: "index", title: "Catalog", tags: "[index]", updated: DATE },
        "# Catalog\n",
      ),
      "_skeletons/tpl.md": "no frontmatter, nothing links here, [broken](./nope.md)\n",
    };
    expect(lint(config(wiki(files), { nonPageDirs: ["_skeletons"] })).problems).toEqual([]);
    // control: without the exclusion the same tree is full of problems
    const control = lint(config(wiki(files)));
    expect(control.problems.length).toBeGreaterThan(0);
  });
});
