import { emit, type OutputMode, useColor } from "../envelope.ts";
import { notFoundError } from "../errors.ts";
import { loadGraph, resolvePage } from "../graph.ts";

/**
 * Shortest link path between two pages — the question a knowledge graph exists to answer and
 * a file tree cannot. "How does the delegator archetype connect to the exit-code taxonomy?"
 * is answerable by traversal, not by listing directories.
 */
export function pathCommand(
  fromHandle: string,
  toHandle: string,
  mode: OutputMode,
  startedAt: number,
): void {
  const graph = loadGraph();
  const from = resolvePage(graph, fromHandle);
  const to = resolvePage(graph, toHandle);

  // Breadth-first over outbound links: the first arrival is a shortest path.
  const previous = new Map<string, string>();
  const seen = new Set<string>([from.path]);
  const queue: string[] = [from.path];
  let found = from.path === to.path;

  while (queue.length && !found) {
    const current = queue.shift() as string;
    for (const next of graph.byPath.get(current)?.linksOut ?? []) {
      if (seen.has(next)) continue;
      seen.add(next);
      previous.set(next, current);
      if (next === to.path) {
        found = true;
        break;
      }
      queue.push(next);
    }
  }

  if (!found) {
    // Reachability is a real answer, not a lookup failure — but both pages exist, so the
    // caller needs to know WHICH fact it hit. `details` carries that without prose parsing.
    throw notFoundError(`no link path from "${from.slug}" to "${to.slug}"`, {
      hint: "Links are directed. Try reversing the arguments.",
      details: { from: from.path, to: to.path, reachableFromSource: seen.size },
    });
  }

  const chain: string[] = [to.path];
  while (chain[0] !== from.path) {
    const prev = previous.get(chain[0] as string);
    if (!prev) break;
    chain.unshift(prev);
  }

  const hops = chain.map((p) => {
    const page = graph.byPath.get(p);
    return { path: p, slug: page?.slug ?? "", title: page?.title ?? "" };
  });

  emit({
    mode,
    command: "path",
    startedAt,
    data: { from: from.path, to: to.path, hops: hops.length - 1, chain: hops },
    next: [{ exec: "acc", args: ["show", to.slug], when: "to read the destination" }],
    renderText: (d) => {
      const dim = useColor() ? "\x1b[2m" : "";
      const reset = useColor() ? "\x1b[0m" : "";
      const lines = d.chain.map(
        (h, i) => `  ${i === 0 ? " " : "↓"} ${h.title} ${dim}(${h.slug})${reset}`,
      );
      return [`${d.hops} hop${d.hops === 1 ? "" : "s"}`, ...lines].join("\n");
    },
  });
}
