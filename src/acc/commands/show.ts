import { emit, type OutputMode, useColor } from "../envelope.ts";
import { loadGraph, resolvePage } from "../graph.ts";

export interface ShowOptions {
  body?: boolean;
  format?: string;
}

export function showCommand(
  handle: string,
  opts: ShowOptions,
  mode: OutputMode,
  startedAt: number,
): void {
  const graph = loadGraph();
  // Throws a not_found carrying every valid handle as `choices` — the caller self-corrects
  // without a second call.
  const page = resolvePage(graph, handle);

  const data = {
    path: page.path,
    slug: page.slug,
    type: page.type,
    title: page.title,
    description: page.description,
    tags: page.tags,
    related: page.related,
    status: page.status,
    updated: page.updated,
    ...(page.ruleId ? { rule_id: page.ruleId } : {}),
    ...(page.tier ? { tier: page.tier } : {}),
    ...(page.probeLevel ? { probe_level: page.probeLevel } : {}),
    ...(page.checker ? { checker: page.checker } : {}),
    links_out: page.linksOut,
    links_in: page.linksIn,
    ...(opts.body ? { body: page.body } : {}),
  };

  const next = [
    ...(opts.body ? [] : [{ command: `acc show ${handle} --body`, when: "to read the full text" }]),
    ...(page.linksOut.length
      ? [
          {
            command: `acc show ${graph.byPath.get(page.linksOut[0] as string)?.slug ?? ""}`,
            when: "to follow the first outbound link",
          },
        ]
      : []),
  ];

  emit({
    mode,
    command: "show",
    startedAt,
    data,
    next,
    renderText: (d) => {
      const bold = useColor() ? "\x1b[1m" : "";
      const dim = useColor() ? "\x1b[2m" : "";
      const reset = useColor() ? "\x1b[0m" : "";
      const out = [
        `${bold}${d.title}${reset}`,
        `${dim}${d.path}${reset}`,
        "",
        d.description,
        "",
        `type: ${d.type}${d.rule_id ? `   rule: ${d.rule_id}   tier: ${d.tier}   probe: ${d.probe_level}` : ""}`,
        `tags: ${d.tags.join(", ") || "—"}`,
      ];
      if (d.checker) out.push(`checker: ${d.checker}`);
      if (d.links_out.length)
        out.push(`links out (${d.links_out.length}): ${d.links_out.join(", ")}`);
      if (d.links_in.length) out.push(`links in  (${d.links_in.length}): ${d.links_in.join(", ")}`);
      if (d.body) out.push("", d.body);
      return out.join("\n");
    },
  });
}
