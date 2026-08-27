// A version literal in a LIVE document is a smell: it names "the current release" and then
// rots, silently, until an adopter acts on it. Two shipped in one day — the skill's
// anti-stale-pin sentence carrying a stale pin, and a concept page's sample two releases
// behind — which is the measured case for this check. The rule is not "every literal needs a
// marker": it is **mark it, remove it, or allowlist it deliberately**, with the allowlist
// entry carrying the reason so the deliberateness is legible.
//
// What is exempt, and why, stated here because the exemptions carry the design:
//
// - The dated-record folders (docs/reports/, docs/plans/, docs/research/,
//   docs/wiki/decisions/) are exempt BY TYPE. They are records of moments; a version literal
//   there is history, and "fixing" history is the defect class this repo is named after.
// - CHANGELOG.md is generator-owned; release-please maintains it.
// - A line carrying an `x-release-please-version` marker, or sitting inside a
//   start-version/end block, is maintained by the release tooling and cannot rot.
//
// The hazard set is the project's OWN release versions — parsed from CHANGELOG.md headings
// plus package.json — never a general semver regex, so a framework's `1.0.1` or a spec URL's
// `v1.0.0` cannot false-alarm. Deriving it from files rather than `git tag` is deliberate
// twice over: no git spawn in the gate (the lesson of the GIT_DIR incident), and the
// changelog is the in-tree record of what was actually released.
//
// Fail closed, in both directions: an unallowlisted literal fails, and an allowlist entry
// that no longer matches anything ALSO fails — a stale exemption is a claim about the tree
// that the tree no longer supports.

import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { walkMarkdown } from "./index.ts";

export interface AllowlistEntry {
  /** Repo-relative path, forward slashes. */
  file: string;
  /** The bare version the entry permits, without the `v` prefix ("0.1.0"). */
  version: string;
  /** Why this literal is deliberately historical. Printed when the entry goes stale. */
  reason: string;
}

/**
 * Every entry is a decision, and the reason is the decision's record. An entry permits ALL
 * occurrences of that one version in that one file — a DIFFERENT release version appearing in
 * an allowlisted file still fires, which is what keeps an allowlisted file from becoming a
 * blind spot.
 */
export const ALLOWLIST: AllowlistEntry[] = [
  {
    file: "STANDARD.md",
    version: "0.1.0",
    reason:
      "two preserved records: an adopter's re-run against v0.1.0 (a report that exists only as a channel message), and a measured stale-literal finding in a target",
  },
  {
    file: "docs/wiki/guides/how-to-fix-a-broken-install.md",
    version: "0.1.0",
    reason:
      "the measured 1.0.1 → 0.1.0 upgrade an adopter actually made; the number going DOWN is the point of the passage",
  },
  {
    file: "docs/wiki/concepts/conformance.md",
    version: "0.1.0",
    reason:
      "a capture kept as taken — refreshing a capture's version stamp without re-running it would claim a run that never happened",
  },
  {
    file: ".claude/skills/release/SKILL.md",
    version: "0.1.0",
    reason:
      "the measured Release-As footer behaviour from the version-line reset; the specific number is what was measured",
  },
];

/** Folders whose documents are records of moments, exempt by type rather than by entry. */
const RECORD_DIRS = ["docs/reports", "docs/plans", "docs/research", "docs/wiki/decisions"];

/** Generator-owned; release-please maintains it. */
const GENERATED_FILES = new Set(["CHANGELOG.md"]);

const START_MARKER = "x-release-please-start-version";
const END_MARKER = "x-release-please-end";
const INLINE_MARKER = "x-release-please-version";

/** CHANGELOG headings are `## [X.Y.Z](compare url) (date)`. */
const CHANGELOG_HEADING = /^##+ \[(\d+\.\d+\.\d+)\]/;

export function hazardVersions(repoRoot: string): string[] {
  const versions = new Set<string>();
  const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
  if (typeof pkg.version === "string") versions.add(pkg.version);
  try {
    for (const line of readFileSync(join(repoRoot, "CHANGELOG.md"), "utf8").split("\n")) {
      const m = CHANGELOG_HEADING.exec(line);
      if (m) versions.add(m[1]);
    }
  } catch {
    // No changelog is a legal state for a fresh line; package.json still seeds the set.
  }
  return [...versions];
}

/**
 * PURE over its inputs, exactly as a checker's `check` is: the file-walking caller supplies
 * the text, so the scan itself can be tested without a filesystem.
 */
export function scanFile(
  rel: string,
  text: string,
  hazards: readonly string[],
  allowlist: readonly AllowlistEntry[],
): { problems: string[]; allowlistHits: Set<AllowlistEntry> } {
  const problems: string[] = [];
  const allowlistHits = new Set<AllowlistEntry>();
  if (hazards.length === 0) return { problems, allowlistHits };

  // (^|[^\w.]) fencing instead of \b so `10.1.0.2` and `v0.1.20` cannot match `0.1.0`.
  const pattern = new RegExp(
    `(^|[^\\w.])v?(${hazards.map((v) => v.replace(/\./g, "\\.")).join("|")})(?![\\w.])`,
    "g",
  );

  let inBlock = false;
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes(START_MARKER)) inBlock = true;
    if (line.includes(END_MARKER)) inBlock = false;

    for (const m of line.matchAll(pattern)) {
      const version = m[2];
      if (inBlock || line.includes(INLINE_MARKER)) continue;
      const entry = allowlist.find((a) => a.file === rel && a.version === version);
      if (entry) {
        allowlistHits.add(entry);
        continue;
      }
      problems.push(
        `UNMARKED VERSION  ${rel}:${i + 1}: "${m[0].trim()}" — a release literal in a live document rots; mark it (x-release-please), remove it, or allowlist it in scripts/docs-lint/version-literals.ts with a reason`,
      );
    }
  }
  return { problems, allowlistHits };
}

export function versionLiteralProblems(repoRoot: string): string[] {
  const hazards = hazardVersions(repoRoot);
  const problems: string[] = [];
  const hitEntries = new Set<AllowlistEntry>();

  // `.scratch` is untracked working material; nothing there ships, so nothing there rots.
  const files = walkMarkdown(repoRoot, new Set(["node_modules", ".git", ".scratch"]));
  for (const file of files) {
    const rel = relative(repoRoot, file).replaceAll("\\", "/");
    if (RECORD_DIRS.some((d) => rel.startsWith(`${d}/`))) continue;
    if (GENERATED_FILES.has(rel)) continue;
    const { problems: p, allowlistHits } = scanFile(
      rel,
      readFileSync(file, "utf8"),
      hazards,
      ALLOWLIST,
    );
    problems.push(...p);
    for (const e of allowlistHits) hitEntries.add(e);
  }

  for (const entry of ALLOWLIST) {
    if (!hitEntries.has(entry))
      problems.push(
        `STALE ALLOWLIST  ${entry.file}: "${entry.version}" no longer occurs there (reason was: ${entry.reason}) — delete the entry`,
      );
  }
  return problems;
}
