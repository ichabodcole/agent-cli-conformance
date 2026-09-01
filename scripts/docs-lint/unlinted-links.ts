// Link and anchor resolution for the authored Markdown no other lint reads.
//
// `docs/lint.ts` walks docs/reports, docs/plans and docs/research; `docs/wiki/lint.ts` walks
// docs/wiki. Between them they leave STANDARD.md, CHARTER.md, README.md, AGENTS.md,
// docs/roadmap.md, docs/techniques.md, the shipped `skills/acc/` pages and the skill definitions
// unread — so those files are link TARGETS the gate protects and link SOURCES it never opens.
//
// The direction that was missing is the one that helps least to leave out. A page's own
// cross-references are the live hazard: rename a heading in STANDARD.md and its 21 same-file
// anchors break silently, while an inbound citation from a report would have been caught. The
// asymmetry had no reason behind it — the artifact lint's corpus was drawn around frontmatter
// rules these files correctly do not carry, and link checking rode along with it.
//
// This imposes nothing else. No frontmatter, no `type`, no catalog reachability: those are
// contracts about documents that complete, and these documents do not.

import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { checkLinks, walkMarkdown } from "./index.ts";

/**
 * Directories holding nothing authored: dependencies, git internals, generated render output,
 * and two gitignored scratch trees. `.scratch` is this repository's working material and
 * `.superpowers` is the plan-runner's; neither ships, so nothing in either can rot.
 *
 * Same idiom as `version-literals.ts`, deliberately — a second spelling of "what is not ours"
 * is a second thing to keep in step.
 */
const SKIP_DIRS = new Set(["node_modules", ".git", ".scratch", ".superpowers", "dist"]);

/** Prefixes already walked by a lint that checks their links. Excluded to avoid double reporting. */
const ALREADY_LINTED = ["docs/reports/", "docs/plans/", "docs/research/", "docs/wiki/"];

/**
 * `CHANGELOG.md` IS AUTHORED BY release-please AND MUST NOT BE GATED.
 *
 * It passes today, which is exactly why the exclusion needs stating: the generator rewrites the
 * whole file on every release, so a link it emits that does not resolve would fail this check
 * with no hand fix available — the release skill's rule is to exempt the generated artifact
 * rather than format or lint it, because the next release regenerates whatever you corrected.
 * A gate that can only be satisfied by editing a file you do not own is a wedged release.
 */
const GENERATED = new Set(["CHANGELOG.md"]);

export function unlintedLinkProblems(repoRoot: string): string[] {
  const problems: string[] = [];
  for (const abs of walkMarkdown(repoRoot, SKIP_DIRS)) {
    const rel = relative(repoRoot, abs);
    if (GENERATED.has(rel)) continue;
    if (ALREADY_LINTED.some((p) => rel.startsWith(p))) continue;
    for (const bad of checkLinks(abs, readFileSync(abs, "utf8")).problems) {
      problems.push(
        bad.kind === "MISSING FILE"
          ? `MISSING FILE  ${rel}: ${bad.target}`
          : `MISSING ANCHOR  ${rel}: ${bad.target}  (#${bad.anchor} not a heading)`,
      );
    }
  }
  return problems;
}
