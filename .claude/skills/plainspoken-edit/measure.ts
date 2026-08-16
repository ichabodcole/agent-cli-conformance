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
 * RUN THIS AFTER READING, NOT BEFORE. An earlier version of this comment claimed the opposite. A
 * reading pass over a dense page, with no tooling, found twelve problems and nine were catchable
 * from the sentence alone — so reading is the primary instrument, and numbers read first only
 * anchor you to length, which is not what costs the reader.
 *
 * What the aggregate is good for is register: one long sentence is a sentence, a p90 of 34 is a
 * habit.
 */
import { readFileSync } from "node:fs";

/**
 * Prose only, and UNWRAPPED before anything else is done to it.
 *
 * Unwrapping is the step two earlier versions of this file got wrong, in the same way and with
 * the same consequence. Prettier hard-wraps this corpus at 100 characters, so one list item spans
 * two or three source lines. Any rule applied line-by-line therefore sees a fragment: a first
 * attempt merged whole bullet lists into single 182-word pseudo-sentences, and the fix for that
 * inserted a full stop mid-item ("exit with the same. non-zero code"). Both inflated the length
 * statistics precisely on the pages carrying the most lists — which are the rule pages — so the
 * ranking reported the instrument's parsing failure as a property of the corpus.
 *
 * So: rebuild blocks first, then measure. A list item is one unit because a reader takes it as
 * one; a paragraph is one unit for the same reason.
 */
function proseOf(md: string): string {
  const stripped = md
    .replace(/^---\n[\s\S]*?\n---\n/, "") // frontmatter
    .replace(/```[\s\S]*?```/g, "") // fenced code
    .replace(/^\s*\|.*$/gm, "") // tables
    .replace(/^\s*#{1,6} .*$/gm, "") // headings
    // Blockquotes are QUOTED material, not the author's prose. Without this the specimens in a
    // style guide — deliberately bad sentences, shown to be criticised — are scored as if the
    // author had written them, and the document is condemned by its own examples.
    .replace(/^\s*>.*$/gm, "")
    .replace(/`[^`\n]*`/g, "CODE"); // inline code is one token, not prose

  const units: string[] = [];
  let current = "";
  const flush = () => {
    const u = current.replace(/\s+/g, " ").trim();
    // Give every unit a terminator so the sentence splitter cannot run one into the next.
    if (u) units.push(/[.!?:;]$/.test(u) ? u : `${u}.`);
    current = "";
  };

  for (const line of stripped.split("\n")) {
    if (!line.trim()) {
      flush();
      continue;
    }
    const item = /^\s*(?:[-*+]|\d+\.)\s+(.*)$/.exec(line);
    if (item) {
      flush(); // a marker starts a new unit; the previous one is complete
      current = item[1] as string;
    } else {
      current += ` ${line}`; // a continuation line belongs to the unit above it
    }
  }
  flush();
  return units.join("\n");
}

/**
 * Split within each unit, never across them. `proseOf` has already made every line one unit, and
 * a sentence cannot span two — a list item is not a continuation of the item above it.
 *
 * Splitting the whole blob at once re-merged them, because the lookahead below needs a capital
 * after the full stop and list items in this corpus start lowercase. That silently undid the
 * unwrapping and put the 60-word phantoms back.
 */
const sentences = (t: string): string[] =>
  t
    .split("\n")
    .flatMap((unit) => unit.split(/(?<=[.!?])\s+(?=[A-Z“"'*_[(])/))
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.split(" ").length > 3);

/**
 * Regex-visible habits. Each is a strong hint, not a verdict — read before you cut.
 *
 * Ordered by how much evidence stands behind them. The trailing participial clause is first
 * because it is the largest single deviation anyone has measured between instruction-tuned models
 * and matched human text — 2-5x the human rate, across six models and 12,000 texts (Reinhart et
 * al., PNAS 2025). Nominalisation is last and labelled, because the same paper measures it at
 * 1.5-2x while the evidence that nominalised prose is HARDER TO READ is three studies from
 * 1963-98, all confounded with word length and frequency. It identifies the register; it does not
 * establish a cost. Do not rewrite a sentence on its say-so alone.
 */
const TICS: Array<[name: string, re: RegExp]> = [
  // "…rejected the flag, naming the offending token." A comma, an -ing verb, and no further
  // comma before the end. Bounded to avoid matching a mid-sentence aside that later resumes.
  ["trailing participial clause", /,\s+\w+ing\b[^,;:.!?]{0,80}[.!?]/g],
  ["antithesis closer (not X, but/it's Y)", /\bnot\b[^.;]{2,60}?[,;]\s*(but|it'?s|it is)\b/gi],
  ["which is exactly / precisely", /\bwhich is (exactly|precisely)\b/gi],
  ["definitional inversion (X is not Y, it is Z)", /\bis not\b[^.;]{2,60}?[,;]\s*it is\b/gi],
  ["em-dash pivot carrying the point", /—[^—.]{15,}$/gm],
  ["nominalisation — a tell, not a defect", /\b\w{4,}(tion|ment|ance|ence|ity|ness)\b/gi],
];

const LONG = 30; // a sentence past this should usually be two

let worstP90 = 0;
const rows: Array<{ file: string; n: number; mean: number; p90: number; max: number }> = [];

/**
 * With more than one file, lead with a ranked table — this is a MINIMAP.
 *
 * The same reason an editor opens a minimap: to see shape and pick where to look, not to judge the
 * terrain. Over many files it says "start here"; over one file it says less than reading does.
 *
 * It does not rank by difficulty and cannot. The page a human reported struggling with sits
 * mid-table; the top entry reads cleanly. Length is shape, not cost.
 *
 * A previous version of this comment claimed the ranking had found that rule pages were the
 * heaviest class in the wiki. That was three stacked parsing bugs inflating exactly the pages
 * carrying the most bullet lists. Corrected, the corpus has no heaviest class. Left recorded
 * because the failure is the instrument's most likely one: a ranking is a claim about the corpus
 * only after you have checked it is not a claim about the parser.
 */
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

  rows.push({ file, n: all.length, mean, p90: p(0.9), max: p(1) });

  console.log(`\n${file}`);
  console.log(
    `  ${all.length} sentences · mean ${mean.toFixed(1)} · p90 ${p(0.9)} · max ${p(1)} · ${words} words`,
  );

  for (const [name, re] of TICS) {
    const hits = [...prose.matchAll(re)];
    if (!hits.length) continue;
    const per100 = ((hits.length / words) * 100).toFixed(1);
    const note = name.startsWith("nominalisation") ? ` (${per100}/100 words)` : "";
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

if (rows.length > 1) {
  rows.sort((a, b) => b.p90 - a.p90);
  const w = Math.max(...rows.map((r) => r.file.length));
  console.log(`\n${"─".repeat(w + 26)}\nHEAVIEST FIRST — read the top of this list, not all of it\n`);
  for (const r of rows) {
    console.log(
      `  p90 ${String(r.p90).padStart(3)}  mean ${r.mean.toFixed(1).padStart(4)}  max ${String(r.max).padStart(3)}   ${r.file}`,
    );
  }
  const p90s = rows.map((r) => r.p90).sort((a, b) => a - b);
  console.log(
    `\n  ${rows.length} files · corpus median p90 ${p90s[Math.floor(p90s.length / 2)]} · heaviest ${p90s.at(-1)}`,
  );
}

// Non-zero when the register is heavy overall, so this can gate a draft if someone wants it to.
// Deliberately keyed on p90 rather than max: one long sentence is a sentence, a high p90 is a
// habit, and only the habit is worth failing over.
process.exit(worstP90 > 28 ? 1 : 0);
