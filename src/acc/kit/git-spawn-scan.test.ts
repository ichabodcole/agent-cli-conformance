import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { ALLOWLIST, explain, scanSource } from "./git-spawn-scan.ts";

/**
 * THE DURABLE HALF of the third bricking's repair.
 *
 * Defining the guard once (git-fixture-env.ts) fixed the two sites that had it wrong. It does not
 * stop the next fixture, because using it requires the author to know it exists — and not knowing
 * is exactly what happened. This does not require anyone to remember.
 */

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith(".ts")) out.push(p);
  }
  return out;
}

const SPECIMENS = "src/acc/kit/fixtures/git-spawn-specimens";
const specimen = (name: string) => readFileSync(join(SPECIMENS, `${name}.txt`), "utf8");

describe("no fixture spawns git with an inherited environment", () => {
  test("every spawn site in src/ is guarded, irrelevant, or allowlisted with a reason", () => {
    const findings = walk("src").flatMap((f) => scanSource(f, readFileSync(f, "utf8")));
    if (findings.length)
      throw new Error(
        `${findings.length} spawn site(s) could brick the repository:\n\n${findings.map(explain).join("\n\n")}`,
      );
    expect(findings).toHaveLength(0);
  });

  test("every allowlist entry names a file that exists and states why", () => {
    // An allowlist that outlives its file is a silence nobody notices, and an entry without a
    // reason is a name — which is what a deliberate exemption must not be.
    for (const [file, reason] of Object.entries(ALLOWLIST)) {
      expect({ file, exists: statSync(file).isFile() }).toEqual({ file, exists: true });
      expect(reason.length).toBeGreaterThan(40);
    }
  });

  test("the scan reaches every spawn spelling this suite actually uses", () => {
    // The check is only worth its green if it looked everywhere. `Bun.spawnSync` is what bit us;
    // most of this suite imports from node:child_process, so a scan that knew only the shape
    // already met would miss the next one by one import statement.
    const seen = new Set<string>();
    for (const f of walk("src")) {
      const src = readFileSync(f, "utf8");
      for (const m of src.matchAll(
        /\b(Bun\.spawnSync|Bun\.spawn|spawnSync|spawn|execFileSync|execSync|execFile)\s*\(/g,
      ))
        seen.add(m[1] as string);
    }
    // If this fails, the suite grew a spelling and the scanner's pattern has to grow with it.
    expect([...seen].sort()).toEqual(["Bun.spawnSync", "execFileSync", "spawn", "spawnSync"]);
  });
});

/**
 * THE CONTROL. A check that cannot fire is worse than no check: it reads as coverage and is not,
 * which is the defect being repaired here. The specimens are `.txt` rather than `.ts` because the
 * scan walks `.ts` — written as TypeScript they were flagged as real violations of the very file
 * testing them, which is the source-text weakness this scanner documents, met on day one.
 */
describe("the check can actually fire", () => {
  test("catches the shape that bricked the repository — via FAIL-CLOSED, not the git literal", () => {
    // Worth stating precisely: the spawn passes an opaque `args`, and "git" appears only at the
    // CALLER. The literal arm does not see it. Without the fail-closed arm this check would miss
    // the exact bug it was built for.
    const found = scanSource("src/fake/release.test.ts", specimen("incident"));
    expect(found.map((f) => f.kind)).toContain("unclassifiable");
  });

  test("catches a direct literal git spawn, both spellings", () => {
    for (const name of ["literal-bun", "literal-node"]) {
      const found = scanSource(`src/fake/${name}.test.ts`, specimen(name));
      expect({ name, count: found.length, kind: found[0]?.kind }).toEqual({
        name,
        count: 1,
        kind: "unguarded-git",
      });
    }
  });

  test("a file that runs git ONLY through the helper still counts as running git", () => {
    // The regression that nearly shipped. Keying on a quoted "git" literal made the check blind
    // to precisely the files that had adopted the guard, because adopting it removes the literal.
    // Caught by re-running the real incident against the real tree, not by re-reading the code.
    const found = scanSource("src/fake/helper-only.test.ts", specimen("helper-only"));
    expect(found.map((f) => f.kind)).toContain("unclassifiable");
  });

  test("fails closed on a spawn it cannot identify in a file that runs git", () => {
    const found = scanSource("src/fake/c.test.ts", specimen("opaque-in-git-file"));
    expect(found.map((f) => f.kind)).toContain("unclassifiable");
  });

  test("clears a guarded call, and clears spawns with nothing to do with git", () => {
    expect(scanSource("src/fake/d.test.ts", specimen("guarded"))).toHaveLength(0);
    // No git anywhere in the file, so an opaque command cannot be git by accident.
    expect(scanSource("src/fake/e.test.ts", specimen("unrelated"))).toEqual([]);
  });

  test("an allowlisted file is cleared wholesale, which is the cost of the mechanism", () => {
    // Said out loud because it is the allowlist's real risk: an entry exempts the FILE, not the
    // line. That is why entries carry a measured reason and why the list is short.
    const [file] = Object.keys(ALLOWLIST);
    expect(scanSource(file as string, specimen("literal-bun"))).toHaveLength(0);
  });
});
