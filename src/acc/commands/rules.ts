import { emit, type OutputMode, useColor } from "../envelope.ts";
import { loadGraph, type WikiPage } from "../graph.ts";

export interface RulesOptions {
  tier?: string;
  tag?: string;
  probeLevel?: string;
  format?: string;
}

interface RuleRow {
  rule_id: string;
  title: string;
  tier: string;
  probe_level: string;
  /**
   * `complete` | `partial`, carried through from the page's frontmatter — the same field
   * `acc check` reports per finding.
   *
   * Listed here because a rule list without it invites the reading the field exists to remove:
   * that a rule appearing in `acc rules --tier core` is a rule the kit enforces in full. Every
   * one is `partial` today. `coverage_gaps` names what each one leaves unestablished, so the
   * count is never a bare admission of a hole.
   */
  coverage: string;
  coverage_gaps: string[];
  path: string;
  tags: string[];
}

/**
 * `--tier` and `--probe-level` are NOT re-validated here.
 *
 * They used to be, against a `TIERS`/`PROBE_LEVELS` pair copied out of `spec.ts` — two
 * declarations of one closed set, which is the drift this project exists to remove. The parser
 * now enforces every `ArgSpec.values` centrally (see `rejectOutOfSet` in cli.ts), so an
 * out-of-set value never reaches this function and the valid set is stated once.
 */
export function rulesCommand(opts: RulesOptions, mode: OutputMode, startedAt: number): void {
  const { tier, probeLevel } = opts;

  const graph = loadGraph();
  const matched = graph.pages
    .filter((p): p is WikiPage & { ruleId: string } => p.type === "rule" && Boolean(p.ruleId))
    .filter((p) => (tier ? p.tier === tier : true))
    .filter((p) => (probeLevel ? p.probeLevel === probeLevel : true))
    .filter((p) => (opts.tag ? p.tags.includes(opts.tag) : true))
    .sort((a, b) => a.ruleId.localeCompare(b.ruleId));

  const rows: RuleRow[] = matched.map((p) => ({
    rule_id: p.ruleId,
    title: p.title,
    tier: p.tier ?? "",
    probe_level: p.probeLevel ?? "",
    coverage: p.coverage ?? "",
    coverage_gaps: p.coverageGaps,
    path: p.path,
    tags: p.tags,
  }));

  emit({
    mode,
    command: "rules",
    startedAt,
    data: { count: rows.length, rules: rows },
    // A list invites a lookup. Pre-filling the first id means the caller does not have to
    // construct the follow-up, which is the failure `next` exists to prevent.
    next: rows.length
      ? [{ command: `acc show ${rows[0]?.rule_id}`, when: "to read a rule in full" }]
      : [{ command: "acc rules", when: "no rules matched — try without filters" }],
    renderText: (d) => {
      if (!d.count) return "No rules matched.";
      const dim = useColor() ? "\x1b[2m" : "";
      const reset = useColor() ? "\x1b[0m" : "";
      const width = Math.max(...d.rules.map((r) => r.rule_id.length));
      // Coverage is stated per rule and the gap count with it. "partial" alone would be the
      // information-free half of the claim — the reader learns something is missing and nothing
      // about how much; `acc show <id>` is where the phrases themselves live.
      const lines = d.rules.map((r) => {
        const n = r.coverage_gaps.length;
        const scope =
          r.coverage === "partial" ? `partial, ${n} gap${n === 1 ? "" : "s"}` : r.coverage;
        return `  ${r.rule_id.padEnd(width)}  ${r.title}${dim} (${r.tier}, ${r.probe_level}, ${scope})${reset}`;
      });
      return [`${d.count} rule${d.count === 1 ? "" : "s"}`, ...lines].join("\n");
    },
  });
}
