// Every `coverageEstablished` entry is a CLAIM ABOUT THE CODE, and until a test breaks the
// property and watches the checker catch it, nothing binds the sentence to the behaviour.
//
// The wiki lint compares the checker's array, the page frontmatter and the page prose to each
// other. Three copies that agree and are all wrong pass it cleanly, and that is not hypothetical:
// four claims in the machine-mode cluster went false in a single afternoon while the gate stayed
// green, found only because a reviewer was asked to check truth rather than consistency. The
// mechanism is visible in the history — the D1 checker has been edited twenty times and every
// `coverageEstablished` line in the repo has been edited three times, ever. The code moves; the
// claims do not.
//
// So a claim is DEFENDED by a test that carries a marker naming it:
//
//     // DEFENDS <rule>-E<n> — <a fragment of the claim>
//
// The example above uses placeholders on purpose. The scan reads every `*.test.ts` under `src`,
// including this file, and a marker written to illustrate the syntax is indistinguishable from one
// written to bind a claim — an earlier draft of this comment silently defended `D1-E2` with a
// sentence about `HOME`.
//
// The id is positional (`<rule>-E<n>`, 1-based over `coverageEstablished`) and the text after the
// dash must be a fragment of the claim it names — which is what stops a reordered list silently
// rebinding a marker to the wrong sentence.
//
// THIS IS A RATCHET, NOT A BACKLOG. An unbound claim must be listed in `UNBOUND` below, and a
// claim that is BOTH bound and listed fails too, so the list cannot go stale: binding one means
// deleting its line. New claims are bound when written, and the debt drains as the code moves —
// which is fastest exactly where drift risk is highest, because that is where the code moves.
import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CHECKERS } from "./registry.ts";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Claims with no defending test yet — the debt, enumerated so it cannot accumulate silently.
 *
 * Roadmap step 4 owes a mutation fixture per claim. This list is that debt made visible and
 * blocking-on-growth: it may shrink, never grow, and a claim added without a defence has to be
 * added here deliberately rather than by omission.
 */
const UNBOUND: ReadonlySet<string> = new Set([
  "A1-E1",
  "A1-E2",
  "A2-E1",
  "A3-E1",
  "A3-E2",
  "A3-E3",
  "A4-E1",
  "A5-E1",
  "A6-E1",
  "A7-E1",
  "A7-E2",
  "B1-E1",
  "B1-E2",
  "B2-E1",
  "B2-E2",
  "C1-E1",
  "C2-E1",
  "C2-E2",
  "C2-E3",
  "C3-E1",
  "D2-E1",
  "D4-E1",
  "E1-E1",
  "F1-E1",
  "F2-E1",
  "G1-E1",
  "D1-E1",
  "D1-E2",
]);

/** Every `// DEFENDS <id> — <fragment>` marker across the test suite. */
function markers(): Map<string, string[]> {
  const out = new Map<string, string[]>();
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name.endsWith(".test.ts")) {
        for (const m of readFileSync(p, "utf8").matchAll(/DEFENDS\s+([A-G]\d-E\d+)\s+—\s+(.+)/g)) {
          const [, id, fragment] = m;
          if (id && fragment) out.set(id, [...(out.get(id) ?? []), fragment.trim()]);
        }
      }
    }
  };
  walk(SRC);
  return out;
}

describe("every coverage claim is bound to a test, or listed as debt", () => {
  const bound = markers();
  const ids = CHECKERS.flatMap((c) => c.coverageEstablished.map((_, i) => `${c.ruleId}-E${i + 1}`));

  test("no claim is silently unbound", () => {
    const orphans = ids.filter((id) => !bound.has(id) && !UNBOUND.has(id));
    expect(orphans).toEqual([]);
  });

  // The half that keeps the debt list honest: bind a claim and its line must go.
  test("nothing is both bound and listed as debt", () => {
    expect(ids.filter((id) => bound.has(id) && UNBOUND.has(id))).toEqual([]);
  });

  test("no debt line names a claim that does not exist", () => {
    expect([...UNBOUND].filter((id) => !ids.includes(id))).toEqual([]);
  });

  // What stops a reordered list rebinding a marker to the wrong sentence.
  test.each(
    CHECKERS.flatMap((c) =>
      c.coverageEstablished.map((claim, i) => [`${c.ruleId}-E${i + 1}`, claim] as const),
    ),
  )("%s — each marker quotes the claim it names", (id, claim) => {
    for (const fragment of bound.get(id) ?? []) {
      expect([id, fragment, claim.includes(fragment)]).toEqual([id, fragment, true]);
    }
  });
});
