import { emit, type OutputMode, useColor } from "../envelope.ts";
import { usageError } from "../errors.ts";
import { loadGraph, type WikiPage } from "../graph.ts";

const TIERS = ["core", "diagnostic"];
const PROBE_LEVELS = ["L0", "L1", "L2"];

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
  path: string;
  tags: string[];
}

/**
 * Validate a closed-set option, and hand back the valid set on failure.
 *
 * The caller never has to consult help: the rejection carries its own correction. This is the
 * `choices` pattern from the error-envelope contract applied to a usage error rather than a
 * lookup failure.
 */
function oneOf(value: string | undefined, valid: string[], flag: string): string | undefined {
  if (value === undefined) return undefined;
  if (valid.includes(value)) return value;
  throw usageError(`invalid value for ${flag}: "${value}"`, {
    hint: `Pass one of: ${valid.join(", ")}`,
    choices: valid,
  });
}

export function rulesCommand(opts: RulesOptions, mode: OutputMode, startedAt: number): void {
  const tier = oneOf(opts.tier, TIERS, "--tier");
  const probeLevel = oneOf(opts.probeLevel, PROBE_LEVELS, "--probe-level");

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
      const lines = d.rules.map(
        (r) =>
          `  ${r.rule_id.padEnd(width)}  ${r.title}${dim} (${r.tier}, ${r.probe_level})${reset}`,
      );
      return [`${d.count} rule${d.count === 1 ? "" : "s"}`, ...lines].join("\n");
    },
  });
}
