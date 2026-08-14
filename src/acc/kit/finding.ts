import type { Finding, Verdict } from "./types.ts";

/**
 * Bind a rule id once, so every Finding a checker emits carries it without restating it in
 * every branch. Shared across checkers rather than copied per-file: by the time Tasks 7-10 land
 * their thirteen checkers, a copy-per-file version of this would be nineteen near-identical
 * closures.
 *
 * Lives at `src/acc/kit/finding.ts` (a sibling of `types.ts`, not inside `checkers/`) because
 * `docs/wiki/lint.ts` treats every non-test `.ts` file under `checkers/` as a declared rule
 * checker and flags anything not named on a rule page's `checker:` field as undocumented — this
 * helper isn't a checker, so it doesn't belong in the directory that scan owns.
 */
export function findingFor(ruleId: string) {
  return (verdict: Verdict, detail: string, evidence: string[]): Finding => ({
    ruleId,
    verdict,
    detail,
    evidence,
  });
}
