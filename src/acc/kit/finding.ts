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

/**
 * THE THIRD CATALOGUE-WIDE INVARIANT: a crashed probe is not evidence of compliance.
 *
 * A target killed by a signal the kit did not send has `exitCode: null` — the same null a
 * process WE killed gets, because in both cases no status was chosen. That collision is the
 * whole defect. `null !== 0` holds, so every "it exited non-zero" clause passes; a target that
 * dies before writing has empty streams, so every "stdout was empty" clause passes too. Run a
 * fixture whose entire body is `kill -SEGV $$` through `record()` and `buildReport()` with the
 * full registry at L0 and it collected NINE passes — A2, A6, B1, B2, C3, D2, D4, E1, F1 —
 * reported as `root verb rejected with exit null`, `bare invocation exited null with stdout
 * empty`, and `all 4 inert invocation(s) terminated`, with `timedOut` and `spawnFailed` both
 * false so nothing flagged the difference.
 *
 * Nine is the same number, and the same defect class, `spawnFailed` was added to close from the
 * other end: a binary that could not START collected passes from checkers satisfied by an empty
 * stream and a missing status. This is that hole one step later in the lifecycle — the target
 * executes, and then falls over.
 *
 * It runs the same way as `hungUnverified`, not `truncatedUnverified`: the capture is COMPLETE
 * (the process is gone; the streams are closed), so it is not a prefix problem. It is an
 * ATTRIBUTION problem. A target that segfaults while being asked about an unknown flag did not
 * reject the flag; it did not do anything. Call it before reading any status field and return
 * its result when non-null.
 *
 * TWO exceptions in the catalogue, and they are different kinds of exception:
 *
 * - C1, whose rule is that a help request SUCCEEDS. Help that dies on a signal has definitively
 *   not succeeded, so that is a violation of what C1 asserts rather than a gap in the evidence
 *   for it, and C1 reports `fail` exactly as it does for a hang. The exception does NOT extend
 *   to A1 or D2 on the reasoning that a crash "is non-zero": those rules assert the tool
 *   REJECTED something, and a crash is not a rejection.
 * - G1, which OWNS crashes outright and never calls this function at all — the crash is its
 *   entire finding, the way a hang is E1's. It was minted because `unverified` everywhere else
 *   is honest and insufficient: a target answering only `--help` and `--version` and segfaulting
 *   on every other path reported `conformant: true` at exit 0 with eleven core rules unverified,
 *   since `conformant` counts violations and nothing called this one. Rule ids are append-only,
 *   so G1 waited for a checker design rather than for a release; the rest of the lifecycle
 *   family it opens is still docs/roadmap.md step 7.
 *
 * THE ASYMMETRY WITH G1'S OWN SPLIT, and it is the whole reason this function does not classify.
 * G1 divides crashes in two: a fault-like signal (SIGSEGV and its siblings) is the target's own
 * doing and fails; an externally ambiguous one (SIGINT, SIGTERM, SIGKILL, SIGPIPE, anything
 * unrecognised) could have come from an operator or an OOM killer and reports `unverified` there
 * too — see FAULT_SIGNALS in checkers/lifecycle/does-not-crash.ts.
 *
 * THIS FUNCTION MUST KEEP FIRING FOR BOTH CLASSES, in all nineteen other checkers. The two
 * questions are not the same question. G1 asks WHOSE FAULT the death was, and the answer differs
 * by signal. Every other rule asks WHAT THE PROBE ESTABLISHED, and the answer is "nothing"
 * whoever sent it: a target killed halfway through writing help did not produce help, and a
 * target killed before rejecting a flag did not reject it. The EVIDENCE is void either way; only
 * the BLAME differs, and blame is G1's job alone. Narrowing this to the fault signals would hand
 * every checker a pass for a target an outer deadline happened to kill — the exact `""` === `""`
 * trap the hang guard closed, arriving through a different door.
 */
export function crashedUnverified(finding: Finder, runs: Observation[]): Finding | null {
  const dead = runs.filter((o) => o.crashed);
  if (dead.length === 0) return null;
  const which = dead
    .map((o) => `${o.invocation.args.join(" ") || "(bare)"}: ${o.signal}`)
    .join(", ");
  return finding(
    "unverified",
    `${dead.length} of ${runs.length} probe(s) were killed by a signal the kit did not send (${which}) — a target that fell over while being asked established nothing about the rule`,
    dead.map((o) => o.id),
  );
}
