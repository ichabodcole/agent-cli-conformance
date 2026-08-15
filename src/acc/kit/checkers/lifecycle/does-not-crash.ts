import { findingFor } from "../../finding.ts";
import type { Checker, Finding, History, Invocation, Observation } from "../../types.ts";

const RULE_ID = "G1";

const finding = findingFor(RULE_ID);

/**
 * THE SIGNALS G1 BLAMES THE TARGET FOR — fault-like, synchronous, self-inflicted.
 *
 * Every one of these is raised BY the process, ON the process, as a direct consequence of what it
 * just executed: a bad dereference, a misaligned access, an illegal opcode, a divide by zero, a
 * failed assertion, a bad syscall number, a trap. Nothing outside the process sends them in normal
 * operation, so a tool that segfaults while answering `--help` did that to itself and the
 * attribution is not in doubt. That is what makes them safe to fail on.
 *
 * THIS LIST IS THE SINGLE SOURCE OF TRUTH. The rule page quotes it, and `docs/wiki/lint.ts`
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
 * THE SIGNALS G1 REFUSES TO BLAME ANYONE FOR — externally ambiguous, plus everything unlisted.
 *
 * The kit cannot tell an operator's Ctrl-C from a target raising `SIGINT` at itself, an outer
 * deadline's `SIGTERM` from a target's own, or an OOM killer's `SIGKILL` from anything at all.
 * `Observation.crashed` establishes only that the KIT did not send it; who did is not in the
 * record, and a controlled observation environment is what would narrow that
 * (`docs/roadmap.md` step 3).
 *
 * So G1 reports `unverified` here, and the reason is a gate-design one rather than a squeamish
 * one: a false `fail` in a conformance gate is the failure mode that gets the gate switched off,
 * and the catalogue already argues exactly that about rules applied to the wrong archetype
 * (`docs/roadmap.md` step 5). An honest gap costs a reader one line; a wrong violation costs the
 * whole tool its credibility.
 *
 * `SIGPIPE` sits here for a second, sharper reason: it is not a fault at all. A tool whose stdout
 * is closed by `head` receives it as the NORMAL end of a pipeline, and how a CLI should behave
 * then — exit quietly, no stack trace, no corrupt trailing output — is a rule the lifecycle family
 * owes and does not yet have (`docs/roadmap.md` step 7). Failing it under G1 would answer a
 * question G1 was never asked.
 *
 * ANYTHING UNRECOGNISED lands here too, by construction: the classifier below asks whether a
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

/** `SIGSEGV` on `--help`, `SIGTERM` on `(bare)` — the two facts a maintainer needs, and neither
 *  is recoverable from the exit code, because there isn't one. */
const name = (o: Observation) => `${o.invocation.args.join(" ") || "(bare)"}: ${o.signal}`;

/**
 * G1 — docs/wiki/rules/lifecycle/inert-invocations-do-not-crash.md
 *
 * THE RULE THAT OWNS CRASHES, and the reason it had to exist. Once `crashedUnverified` (see
 * finding.ts) made every checker report `unverified` on a crashed probe, a shell script that
 * answers `--help` and `--version` correctly and runs `kill -SEGV $$` on every other path
 * reported `conformant: true` and exited `0`, with `coreFailures: 0` and `coreUnverified: 11`.
 * That is `conformant`'s documented definition working exactly as written — it counts
 * VIOLATIONS — but nothing was violated only because nothing owned the failure mode.
 *
 * `unverified` cannot tell the two cases apart, and they are not alike. `git` advertises no
 * machine-mode flag, so B3 has nothing to parse: that is a gap in the EVIDENCE and names nothing
 * git did wrong. A target that falls over on eleven of fifteen core rules is not incomplete, it
 * is broken, and a headline that reads green for it is the silent-failure shape this catalogue
 * exists to report, in the report itself.
 *
 * IT DECLARES NO PROBES, and that is the design rather than an omission. Every invocation the
 * kit sends is already recorded, and `Observation.crashed` is already on every one of them; a
 * probe of G1's own would spawn the target again to learn a fact fourteen recordings already
 * carry. A4 is the standing precedent for an empty `probes` array — `record()` iterates
 * `checker.probes(discovery)` and an empty list simply contributes nothing to the dedup map —
 * and the two rules reach it from opposite directions: A4 has no probe it can safely send, G1
 * has no probe it needs to.
 *
 * IT DOES NOT FAIL EVERY CRASH, and that split is the correction of a design error rather than a
 * softening. The rule page says G1 is silent about an operator's Ctrl-C, an outer deadline's
 * signal and an OOM kill — and the checker failed on ANY signal the kit did not send, which is a
 * wider scope than the rule it enforces. The mismatch was recorded as a coverage gap, and a
 * coverage gap is the wrong instrument for it in the most consequential possible way: `partial`
 * weakens a PASS, it cannot soften a FAIL, so G1 could still set `conformant: false` and select
 * exit `9` for an event its own normative text excluded (review R6-2). Blame now follows the
 * signal — FAULT_SIGNALS above are the target's own fault and fail; everything else is
 * `unverified`, because the kit genuinely does not know who sent it.
 *
 * THE ASYMMETRY THAT SURVIVES THE SPLIT: `crashedUnverified` still fires for BOTH classes in the
 * other nineteen checkers, and must. Whoever sent the signal, the probe established nothing — a
 * target killed mid-`--help` did not answer the question, so the EVIDENCE is void either way.
 * Only the BLAME differs between the two classes, and blame is G1's job alone.
 *
 * SCOPE, and the boundary for whoever lands L1. `check` judges every observation in the history
 * because at L0 every observation is inert BY CONSTRUCTION — `assertInert` in runner.ts refuses
 * anything else, so "the invocations the kit sent" and "inert invocations" are the same set
 * today. A level that records a probe doing real work makes them different sets, and at that
 * point either this filters on `invocation.inertness` or the page stops saying `inert`. Whichever
 * is chosen, it must be chosen; inheriting the wider claim by silence is the drift the rest of
 * this file is written against.
 */
export const doesNotCrashChecker: Checker = {
  ruleId: RULE_ID,
  rulePath: "docs/wiki/rules/lifecycle/inert-invocations-do-not-crash.md",
  tier: "core",
  probeLevel: "L0",
  // A pass here means "nothing the kit happened to run fell over", which is a narrower sentence
  // than the page. The first gap is the direct consequence of declaring no probes: G1 sees the
  // union of everyone else's, so a path no checker asks for is a path G1 never judges.
  //
  // The attribution gap that used to sit at the end of this list is GONE, and not because it was
  // closed — because it was never a coverage gap. "A signal the kit did not send is attributed to
  // the target" described a way this checker could produce a WRONG FAIL, and `coverage: partial`
  // only ever qualifies a pass. It is fixed in the verdict above instead, where an unattributable
  // signal now reports `unverified`.
  coverage: "partial",
  coverageGaps: [
    "only the inert invocations other checkers already request are observed so an unprobed path such as nested help is never judged",
    "no invocation that does real work is sent at L0 so a crash on the paths a caller actually uses is out of reach",
    "a crash provoked by the probe's own sentinel token is not distinguished from one the target would suffer on any input",
  ],

  probes: (): Invocation[] => [],

  check: (h: History): Finding => {
    const runs = h.observations;
    // Not reachable through `acc check` — `record()` always runs at least discovery's probes and
    // aborts on a spawn failure rather than returning an empty history — but a checker that
    // reported `pass` over zero observations would be claiming a target terminated cleanly on
    // evidence nobody collected. "No probe ran" is the textbook `unverified`.
    if (runs.length === 0) {
      return finding(
        "unverified",
        "no invocation was recorded so nothing terminated either way",
        [],
      );
    }

    const dead = runs.filter((o) => o.crashed);
    // Membership of FAULT_SIGNALS, never absence from AMBIGUOUS_SIGNALS: an unrecognised signal
    // has to land in the unverified class, and asking the question the other way round would make
    // every name this file has not met into a violation.
    const faulted = dead.filter((o) => o.signal !== null && FAULT.has(o.signal));
    if (faulted.length > 0) {
      return finding(
        "fail",
        // The SIGNAL, and which invocations died, because those are the two facts a maintainer
        // needs and neither is recoverable from the exit code — there isn't one. Deliberately
        // not phrased through `exitCode`: "exited null" describes a status the target never
        // chose, which is the wording that let this failure mode pass as compliance.
        `${faulted.length} of ${runs.length} inert invocation(s) died by a fault signal (${faulted
          .map(name)
          .join("; ")})`,
        faulted.map((o) => o.id),
      );
    }

    // Decided second, and the order carries the whole argument. A fault is a completed observation
    // of a violation the target committed. An ambiguous signal is a completed observation of
    // SOMETHING, with no way to say whose — so it cannot be a fail, and it certainly cannot be a
    // pass, because the probe it ended established nothing either.
    if (dead.length > 0) {
      return finding(
        "unverified",
        `${dead.length} of ${runs.length} probe(s) ended on a signal the kit did not send and cannot attribute (${dead
          .map(name)
          .join(
            "; ",
          )}) — an operator interrupt, an outer deadline and an OOM kill are outside this rule's scope`,
        dead.map((o) => o.id),
      );
    }

    // Third, and for a third reason. A hang or an output-ceiling kill is the kit's own SIGKILL:
    // those targets did not fail to exit under their own control, they were never allowed to.
    // Reading either as a G1 pass would be this rule making the same mistake it exists to catch,
    // one flag over.
    const killed = runs.filter((o) => o.timedOut || o.truncated);
    if (killed.length > 0) {
      const which = killed.map((o) => o.invocation.args.join(" ") || "(bare)").join("; ");
      return finding(
        "unverified",
        `${killed.length} of ${runs.length} probe(s) were killed by the kit before terminating (${which}) — how they would have ended is not established`,
        killed.map((o) => o.id),
      );
    }

    return finding(
      "pass",
      `all ${runs.length} inert invocation(s) exited under the target's own control`,
      runs.map((o) => o.id),
    );
  },
};
