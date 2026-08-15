/**
 * THE SIGNAL TAXONOMY: which terminating signals the kit is willing to blame a target for.
 *
 * Lives at `src/acc/kit/signals.ts` (a sibling of `types.ts` and `finding.ts`, not inside
 * `checkers/`) for the reason finding.ts states in its own header: `docs/wiki/lint.ts` treats
 * every non-test `.ts` file under `checkers/` as a declared rule checker and reports anything no
 * rule page names as UNDOCUMENTED. This file is not a checker.
 *
 * It was exported from `checkers/lifecycle/does-not-crash.ts` while G1 was the only reader, which
 * was fine until C1 became the second one. A checker importing from another checker's file makes
 * one rule's implementation a dependency of another's, and the placement rule above is what says
 * where shared kit-level vocabulary goes instead: beside `types.ts`, where `finding.ts` already
 * sits for exactly this reason.
 *
 * TWO rules read these lists, and they ask the SAME question of them — whose fault was the death?
 * G1 asks it about every inert invocation the run recorded; C1 asks it about the two help paths
 * it declares, because a help request that faulted has demonstrably not succeeded. Every OTHER
 * checker asks a different question — what did the probe establish? — whose answer is "nothing"
 * for both classes alike, which is why they route through `crashedUnverified` and never come
 * here. See finding.ts.
 */

/**
 * THE SIGNALS THE KIT BLAMES THE TARGET FOR — fault-like, synchronous, self-inflicted.
 *
 * Every one of these is raised BY the process, ON the process, as a direct consequence of what it
 * just executed: a bad dereference, a misaligned access, an illegal opcode, a divide by zero, a
 * failed assertion, a bad syscall number, a trap. Nothing outside the process sends them in normal
 * operation, so a tool that segfaults while answering `--help` did that to itself and the
 * attribution is not in doubt. That is what makes them safe to fail on.
 *
 * THIS LIST IS THE SINGLE SOURCE OF TRUTH. G1's rule page quotes it, and `docs/wiki/lint.ts`
 * compares the two in both directions — the same discipline already applied to `tier`,
 * `probe_level`, `coverage` and `coverage_gaps`. Two hand-maintained lists of the same thing is
 * precisely the drift this project exists to fail the gate on, and a rule page whose normative
 * scope quietly differs from its checker's is the defect that produced this split (review R6-2).
 */
export const FAULT_SIGNALS: readonly string[] = [
  "SIGSEGV",
  "SIGBUS",
  "SIGILL",
  "SIGFPE",
  "SIGABRT",
  "SIGSYS",
  "SIGTRAP",
];

/**
 * THE SIGNALS THE KIT REFUSES TO BLAME ANYONE FOR — externally ambiguous, plus everything unlisted.
 *
 * The kit cannot tell an operator's Ctrl-C from a target raising `SIGINT` at itself, an outer
 * deadline's `SIGTERM` from a target's own, or an OOM killer's `SIGKILL` from anything at all.
 * `Observation.crashed` establishes only that the KIT did not send it; who did is not in the
 * record, and a controlled observation environment is what would narrow that
 * (`docs/roadmap.md` step 3).
 *
 * So a rule that judges blame reports `unverified` here, and the reason is a gate-design one
 * rather than a squeamish one: a false `fail` in a conformance gate is the failure mode that gets
 * the gate switched off, and the catalogue already argues exactly that about rules applied to the
 * wrong archetype (`docs/roadmap.md` step 5). An honest gap costs a reader one line; a wrong
 * violation costs the whole tool its credibility. An outer CI timeout that kills the process group
 * makes EVERY probe end here at once, so the target that a mis-scoped rule brands non-conformant
 * is an arbitrary one.
 *
 * `SIGPIPE` sits here for a second, sharper reason: it is not a fault at all. A tool whose stdout
 * is closed by `head` receives it as the NORMAL end of a pipeline, and how a CLI should behave
 * then — exit quietly, no stack trace, no corrupt trailing output — is a rule the lifecycle family
 * owes and does not yet have (`docs/roadmap.md` step 7). Failing it under G1 would answer a
 * question G1 was never asked.
 *
 * ANYTHING UNRECOGNISED lands here too, by construction: `isFaultSignal` below asks whether a
 * signal is in FAULT_SIGNALS, never whether it is in this list. A real-time signal, a
 * platform-specific one, a name from a libc this list has never met — all of them are signals the
 * kit cannot attribute, which is the definition of this class rather than an omission from it.
 * This array exists so the page has something to quote and the lint has something to compare.
 */
export const AMBIGUOUS_SIGNALS: readonly string[] = [
  "SIGINT",
  "SIGTERM",
  "SIGHUP",
  "SIGQUIT",
  "SIGKILL",
  "SIGPIPE",
];

const FAULT = new Set(FAULT_SIGNALS);

/**
 * Fault or not — asked the only way it is safe to ask, in the one place both callers reach.
 *
 * MEMBERSHIP OF `FAULT_SIGNALS`, never absence from `AMBIGUOUS_SIGNALS`. Written the other way
 * round, every name this file has not met becomes a violation, and the list of names a kit has
 * not met only ever grows. `signal` is nullable because `Observation.signal` is: a process that
 * chose its own exit status has no signal, and a null one is nobody's fault by construction.
 *
 * A shared predicate rather than the exported `Set`, so neither caller builds its own. Two
 * `new Set(FAULT_SIGNALS)` in two checkers is two places to get that polarity wrong, and the
 * polarity IS the rule — it is the whole difference between a segfault the target owes an answer
 * for and a CI deadline it had no part in.
 */
export function isFaultSignal(signal: string | null): boolean {
  return signal !== null && FAULT.has(signal);
}
