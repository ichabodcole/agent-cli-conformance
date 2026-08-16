#!/usr/bin/env bun
/**
 * The mechanical half of a Plainspoken editorial pass.
 *
 *   bun .claude/skills/plainspoken-edit/measure.ts <file.md> [...]
 *
 * Prints an aggregate profile and the sentences that exceed it. It does NOT rewrite anything and
 * it does NOT judge — several of the worst habits (abstraction stacking, undeclared compression)
 * are invisible to a regex, and the skill's reading pass exists to catch those.
 *
 * The aggregate matters more than any single flag. One long sentence is fine; a p90 of 34 is a
 * register. A reader working line by line cannot see a distribution, which is exactly why this
 * runs before the reading pass rather than instead of it.
 */
import { readFileSync } from "node:fs";

/** Prose only. Code, tables, headings, frontmatter and bare link lines are not sentences. */
function proseOf(md: string): string {
  return md
    .replace(/^---\n[\s\S]*?\n---\n/, "") // frontmatter
    .replace(/```[\s\S]*?```/g, "") // fenced code
    .replace(/^\s*\|.*$/gm, "") // tables
    .replace(/^\s*#{1,6} .*$/gm, "") // headings
    // Blockquotes are QUOTED material, not the author's prose. Without this the specimens in a
    // style guide — deliberately bad sentences, shown to be criticised — are scored as if the
    // author had written them, and the document is condemned by its own examples.
    .replace(/^\s*>.*$/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "") // list markers, keeping the text
    .replace(/`[^`\n]*`/g, "CODE"); // inline code is one token, not prose
}

const sentences = (t: string): string[] =>
  t
    .split(/(?<=[.!?])\s+(?=[A-Z“"'*_[(])/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.split(" ").length > 3);

/** Regex-visible habits. Each is a strong hint, not a verdict — read before you cut. */
const TICS: Array<[name: string, re: RegExp]> = [
  ["antithesis closer (not X, but/it's Y)", /\bnot\b[^.;]{2,60}?[,;]\s*(but|it'?s|it is)\b/gi],
  ["which is exactly / precisely", /\bwhich is (exactly|precisely)\b/gi],
  ["definitional inversion (X is not Y, it is Z)", /\bis not\b[^.;]{2,60}?[,;]\s*it is\b/gi],
  ["em-dash pivot carrying the point", /—[^—.]{15,}$/gm],
  ["nominalisation", /\b\w{4,}(tion|ment|ance|ence|ity|ness)\b/gi],
];

const LONG = 30; // a sentence past this should usually be two

let worstP90 = 0;

for (const file of process.argv.slice(2)) {
  const prose = proseOf(readFileSync(file, "utf8"));
  const all = sentences(prose);
  if (!all.length) {
    console.log(`\n${file}\n  no prose sentences found`);
    continue;
  }

  const lens = all.map((s) => s.split(" ").length).sort((a, b) => a - b);
  const p = (q: number) => lens[Math.min(lens.length - 1, Math.floor(lens.length * q))] as number;
  const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
  const words = prose.split(/\s+/).filter(Boolean).length;
  worstP90 = Math.max(worstP90, p(0.9));

  console.log(`\n${file}`);
  console.log(
    `  ${all.length} sentences · mean ${mean.toFixed(1)} · p90 ${p(0.9)} · max ${p(1)} · ${words} words`,
  );

  for (const [name, re] of TICS) {
    const hits = [...prose.matchAll(re)];
    if (!hits.length) continue;
    const per100 = ((hits.length / words) * 100).toFixed(1);
    const note = name === "nominalisation" ? ` (${per100}/100 words)` : "";
    console.log(`  ${String(hits.length).padStart(3)}  ${name}${note}`);
  }

  const long = all.filter((s) => s.split(" ").length > LONG);
  if (long.length) {
    console.log(`\n  ${long.length} sentence(s) over ${LONG} words:`);
    for (const s of long.sort((a, b) => b.split(" ").length - a.split(" ").length).slice(0, 8)) {
      console.log(`    [${s.split(" ").length}w] ${s.slice(0, 150)}${s.length > 150 ? "…" : ""}`);
    }
  }
}

// Non-zero when the register is heavy overall, so this can gate a draft if someone wants it to.
// Deliberately keyed on p90 rather than max: one long sentence is a sentence, a high p90 is a
// habit, and only the habit is worth failing over.
process.exit(worstP90 > 28 ? 1 : 0);
