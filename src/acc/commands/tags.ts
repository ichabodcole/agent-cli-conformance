import { emit, type OutputMode, useColor } from "../envelope.ts";
import { loadGraph } from "../graph.ts";

export function tagsCommand(mode: OutputMode, startedAt: number): void {
  const graph = loadGraph();
  const rows = [...graph.tags.entries()]
    .map(([tag, paths]) => ({ tag, count: paths.length, pages: paths.sort() }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));

  emit({
    mode,
    command: "tags",
    startedAt,
    data: { count: rows.length, tags: rows },
    next: rows.length
      ? [
          {
            exec: "acc",
            args: ["rules", "--tag", rows[0]?.tag ?? ""],
            when: "to filter rules by a tag",
          },
        ]
      : [],
    renderText: (d) => {
      const dim = useColor() ? "\x1b[2m" : "";
      const reset = useColor() ? "\x1b[0m" : "";
      const width = Math.max(...d.tags.map((t) => t.tag.length));
      return [
        `${d.count} tag${d.count === 1 ? "" : "s"}`,
        ...d.tags.map((t) => `  ${t.tag.padEnd(width)}  ${dim}${t.count}${reset}`),
      ].join("\n");
    },
  });
}
