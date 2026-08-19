#!/usr/bin/env bun
// The artifact folders' lint: docs/reports/, docs/plans/, docs/research/.
//
//   bun docs/lint.ts     → lint (non-zero exit on any problem; runs in `bun run check`)
//
// These are NOT wiki pages. They carry no `related` graph, they are not reachable from a
// catalog, and they are never brought up to date — so `docs/wiki/lint.ts` and its orphan and
// backlink checks do not apply. What they share with the wiki is frontmatter, and the reason
// to check it is the same: each folder's README states a contract, and a contract nothing
// enforces is the comment that lies.
//
// The rules here are deliberately thinner than the wiki's. Presence and vocabulary are
// checked; prose is checked only where a README states a hard requirement (research must
// declare a method).

import { readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseFrontmatter, walkMarkdown, yamlList } from "../scripts/docs-lint/index.ts";

const DOCS_ROOT = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(DOCS_ROOT, "..");

/**
 * `status` is OKF 0.2 §5.4 and its vocabulary is the spec's, not ours: `draft` (not yet
 * reviewed), `stable` (ready for consumption, and the default when absent), `deprecated` (kept
 * for links and history; no longer current).
 *
 * The discharge state these folders actually need — has this report been actioned, has this
 * plan shipped — is a DIFFERENT question, and it lives in `lifecycle`, an extension. OKF
 * permits additional keys outright, and redefining a field the spec already defines is a
 * stronger deviation than adding one it does not: a consumer reading `status: discharged`
 * would be reading a value the spec says cannot occur. Research carries no `lifecycle`,
 * because research never completes — it is answered by a later report, which is what
 * `deprecated` plus `supersedes` records.
 */
const SPEC = {
  reports: {
    type: "report",
    lifecycle: ["live", "discharged"],
    required: ["type", "generated", "status", "lifecycle", "subject", "examined"],
  },
  plans: {
    type: "plan",
    lifecycle: ["live", "discharged"],
    required: ["type", "generated", "status", "lifecycle"],
  },
  research: {
    type: "research",
    lifecycle: null,
    required: ["type", "generated", "status"],
  },
} as const;

/** OKF 0.2 §5.4. Absent means `stable`; we require it explicitly so a reader never has to know
 *  the default to know what a document claims about itself. */
const OKF_STATUS = ["draft", "stable", "deprecated"];

const OPTIONAL = new Set(["description", "tags", "supersedes", "stale_after"]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TAG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Collapse a tag to a key that ignores the ways a near-duplicate usually differs. Two distinct
 *  tags that collide here are almost always one tag and a typo — `exit-code` beside
 *  `exit-codes`, or `machineMode` beside `machine-mode`. A shared vocabulary is not enforced
 *  outright: research legitimately opens subjects the wiki has no page for, and a check that
 *  blocked `mcp` or `prose` would be wrong. */
const tagKey = (t: string) =>
  t
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/s$/, "");

export function artifactProblems(): string[] {
  const problems: string[] = [];
  const tagsSeen = new Map<string, Set<string>>(); // normalised key -> spellings

  for (const [folder, spec] of Object.entries(SPEC)) {
    const dir = join(DOCS_ROOT, folder);
    for (const file of walkMarkdown(dir)) {
      const rel = relative(REPO_ROOT, file);
      if (rel.endsWith("README.md")) continue;

      const raw = readFileSync(file, "utf8");
      const m = /^---\n([\s\S]*?)\n---/.exec(raw);
      if (!m) {
        problems.push(`NO FRONTMATTER  ${rel}  (see ${folder}/README.md)`);
        continue;
      }
      const fields = parseFrontmatter(m[1]);

      for (const key of spec.required) {
        if (!fields.get(key)) problems.push(`MISSING ${key}  ${rel}`);
      }
      for (const key of fields.keys()) {
        if (!(spec.required as readonly string[]).includes(key) && !OPTIONAL.has(key))
          problems.push(`UNKNOWN FIELD  ${rel}: "${key}"`);
      }

      const type = fields.get("type");
      if (type && type !== spec.type)
        problems.push(`WRONG TYPE  ${rel}: "${type}" in ${folder}/ (expected "${spec.type}")`);

      // OKF 0.2 §13.1: `timestamp` is superseded by `generated: { by, at }`. `by` is the actor
      // that produced the content, which for this corpus is usually a model — a fact `git blame`
      // cannot record, since it names whoever committed the file. `unknown` is a legal actor and
      // is the honest encoding for a document whose producer was never captured; inventing one
      // would be fabricating provenance.
      const generated = fields.get("generated");
      if (generated) {
        const g = /^\{\s*by:\s*([^,}]+?)\s*,\s*at:\s*([^,}]+?)\s*\}$/.exec(generated);
        if (!g) {
          problems.push(
            `BAD GENERATED  ${rel}: ${generated}  (expected \`{ by: <actor>, at: <ISO 8601> }\`)`,
          );
        } else if (!DATE_RE.test(g[2] as string)) {
          problems.push(
            `BAD GENERATED at  ${rel}: "${g[2]}"  (YYYY-MM-DD; when the content was PRODUCED)`,
          );
        }
      }

      // Superseded by `generated.at` in OKF 0.2, and rejected rather than ignored so a document
      // cannot carry two disagreeing timestamps.
      for (const legacy of ["date", "timestamp"]) {
        if (fields.has(legacy))
          problems.push(
            `LEGACY FIELD  ${rel}: \`${legacy}\` is superseded by \`generated.at\` (OKF 0.2)`,
          );
      }

      const status = fields.get("status");
      if (status && !OKF_STATUS.includes(status))
        problems.push(`BAD STATUS  ${rel}: "${status}"  (OKF 0.2: ${OKF_STATUS.join(" | ")})`);

      const lifecycle = fields.get("lifecycle");
      if (spec.lifecycle === null && lifecycle)
        problems.push(`LIFECYCLE  ${rel}: research never completes, so it carries no lifecycle`);
      else if (
        spec.lifecycle &&
        lifecycle &&
        !(spec.lifecycle as readonly string[]).includes(lifecycle)
      )
        problems.push(
          `BAD LIFECYCLE  ${rel}: "${lifecycle}"  (${spec.type}: ${spec.lifecycle.join(" | ")})`,
        );

      // `updated` is the wiki's field and means "when the content last changed". On a frozen
      // record it invites a bump that silently destroys what the document is FOR.
      if (fields.has("updated"))
        problems.push(
          `FROZEN RECORD  ${rel}: carries \`updated\`; these record \`generated.at\` and are never brought up to date`,
        );

      for (const tag of yamlList(fields.get("tags"))) {
        if (!TAG_RE.test(tag)) problems.push(`BAD TAG  ${rel}: "${tag}"  (kebab-case)`);
        const key = tagKey(tag);
        if (!tagsSeen.has(key)) tagsSeen.set(key, new Set());
        (tagsSeen.get(key) as Set<string>).add(tag);
      }

      // The one prose requirement, because docs/research/README.md states it as a hard clause
      // and 04-testing-enforcement.md shipped without it.
      if (folder === "research" && !/^\*{0,2}method\*{0,2}:/im.test(raw))
        problems.push(`NO METHOD  ${rel}  (research/README.md requires a stated method)`);

      const supersedes = fields.get("supersedes");
      if (supersedes) {
        if (folder !== "research")
          problems.push(`SUPERSEDES  ${rel}: only research reports supersede one another`);
        else if (!walkMarkdown(dir).some((f) => f.endsWith(`/${supersedes}`)))
          problems.push(`MISSING SUPERSEDES  ${rel}: no such report "${supersedes}"`);
      }
    }
  }

  for (const [, spellings] of tagsSeen) {
    if (spellings.size > 1)
      problems.push(`NEAR-DUPLICATE TAGS  ${[...spellings].sort().join(" / ")}  (pick one)`);
  }

  return problems;
}

if (import.meta.main) {
  const problems = artifactProblems();
  for (const p of problems) console.log(p);
  console.log(
    problems.length
      ? `\n${problems.length} problem(s).`
      : "OK — frontmatter, vocabularies and stated methods valid across docs/reports, docs/plans and docs/research.",
  );
  process.exit(problems.length ? 1 : 0);
}
