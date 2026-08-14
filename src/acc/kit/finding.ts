import type { Finding, Observation, Verdict } from "./types.ts";

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

/** The closure `findingFor` returns. Named so helpers below can take one. */
export type Finder = ReturnType<typeof findingFor>;

/**
 * THE CATALOGUE-WIDE INVARIANT: a timed-out observation is never evidence of compliance.
 *
 * A probe the deadline killed has empty streams and a null exit code. Read naively that is
 * indistinguishable from a clean rejection — `exitCode !== 0` is true, stdout IS empty, two
 * hung help runs ARE byte-identical — so a checker that skips this reports `pass` for a CLI
 * that blocked forever. That is not a hypothetical: a tool that prompts to confirm a fuzzy
 * correction and never returns used to certify CONFORMANT, 15/15 core, exit 0.
 *
 * Call it FIRST, before reading any field of the observations, and return its result when it
 * is non-null. The three exceptions are the rules that own hangs as their own subject matter
 * and report `fail` instead: A1 and D2 (a hang on a deliberately-invalid or empty invocation
 * IS the violation those rules describe), C1 (help that never returns has not succeeded), and
 * E1, whose entire finding is the hang.
 */
export function hungUnverified(finding: Finder, runs: Observation[]): Finding | null {
  const hung = runs.filter((o) => o.timedOut);
  if (hung.length === 0) return null;
  const which = hung.map((o) => o.invocation.args.join(" ") || "(bare)").join(", ");
  return finding(
    "unverified",
    `${hung.length} of ${runs.length} probe(s) hit the deadline (${which}) — a killed probe is not evidence of compliance; see E1`,
    hung.map((o) => o.id),
  );
}

/**
 * THE SECOND CATALOGUE-WIDE INVARIANT: truncated evidence is a prefix, not a recording.
 *
 * When a probe exceeds the runner's capture ceiling (see MAX_STREAM_BYTES in runner.ts) the
 * runner keeps what fits and kills the target. What survives is everything the target DID write
 * up to that byte, and nothing about what it would have written next — and no exit code at all,
 * because we killed it, so `exitCode` is null exactly as it is for a hang.
 *
 * That asymmetry is the whole rule, and it runs the opposite way from `hungUnverified`:
 *
 * - a violation the prefix CONTAINS is real. An ANSI escape that was emitted was emitted; a
 *   credential that appeared in help appeared; help that already differed at byte 900 differed.
 *   Those checkers detect the violation FIRST and return `fail`, then call this.
 * - everything else — every clause resting on an exit code, on an absence, or on the output
 *   being complete — is unestablished. Those checkers call this first, like a hang.
 *
 * Getting this wrong in either direction fabricates evidence: passing a target because the
 * bytes we refused to read contained no escapes, or failing one for not naming a token in a
 * stderr we cut off mid-sentence.
 */
export function truncatedUnverified(finding: Finder, runs: Observation[]): Finding | null {
  const cut = runs.filter((o) => o.truncated);
  if (cut.length === 0) return null;
  const which = cut.map((o) => o.invocation.args.join(" ") || "(bare)").join(", ");
  return finding(
    "unverified",
    `${cut.length} of ${runs.length} probe(s) exceeded the output limit and were killed (${which}) — the capture is a prefix with no exit code, so nothing the target had yet to do is established`,
    cut.map((o) => o.id),
  );
}
