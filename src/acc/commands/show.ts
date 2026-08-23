import { emit, type OutputMode, useColor } from "../envelope.ts";
import { notFoundError } from "../errors.ts";
import { loadGraph, resolvePage } from "../graph.ts";

/**
 * The shape of an evidence id: `invocationId` in `runner.ts` returns twelve hex characters.
 *
 * Matched here so the one wrong guess a reader is KNOWN to make gets an answer instead of a
 * signpost pointing away from it. A blind agent read an id out of a check report, typed
 * `acc show <id>`, and was told to pass "a rule id, a page slug, or a path relative to the wiki
 * root" — none of which is where the ids live. It gave up, reconstructed the probes by hand,
 * hung its own shell for two minutes, and produced a wrong reproduction.
 *
 * Deliberately not anchored to any registry of live ids, because there is none to anchor to: the
 * shape is all this command can know. A wiki slug of exactly twelve hex characters would be
 * shadowed, which is why the graph is consulted FIRST and this only ever answers a lookup that
 * already failed.
 */
const EVIDENCE_ID = /^[0-9a-f]{12}$/i;

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
  //
  // AN EVIDENCE ID GETS A DIFFERENT ANSWER, and not the one a reader hopes for: this command
  // cannot resolve one. Observations exist only inside the `acc check` process that produced
  // them — nothing is written to disk, and by design, since a report is a document its owner
  // decides what to do with rather than state this tool accumulates. `acc show <id>` would
  // therefore have to be handed the report it came from, which is a second flag, a file format
  // and a staleness question in exchange for a lookup a JSON filter already performs.
  //
  // So the affordance is the message rather than the resolution: say where the ids live, name
  // the command that produces them, and say plainly that this is not it. That is the whole
  // defect being fixed — the mechanism worked all along and nothing pointed at it.
  let page: ReturnType<typeof resolvePage>;
  try {
    page = resolvePage(graph, handle);
  } catch (err) {
    if (!EVIDENCE_ID.test(handle)) throw err;
    throw notFoundError(`"${handle}" looks like an evidence id, and acc show resolves wiki pages`, {
      hint: "Evidence ids index the `observations` array of a check report, and live only in the run that produced them: acc check <target> --json  →  .data.observations[]",
      details: { handle, resolvableHere: "rule ids, page slugs, wiki-relative paths" },
    });
  }

  const data = {
    path: page.path,
    slug: page.slug,
    type: page.type,
    title: page.title,
    description: page.description,
    tags: page.tags,
    related: page.related,
    status: page.status,
    generated: page.generated,
    ...(page.ruleId ? { rule_id: page.ruleId } : {}),
    ...(page.tier ? { tier: page.tier } : {}),
    ...(page.deviation ? { deviation: page.deviation } : {}),
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
