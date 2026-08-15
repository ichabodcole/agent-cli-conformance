import { findingFor } from "../../finding.ts";
import type { Checker, Finding, History, Invocation } from "../../types.ts";

const RULE_ID = "G1";

const finding = findingFor(RULE_ID);

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
  // union of everyone else's, so a path no checker asks for is a path G1 never judges. The last
  // is the one that could produce a WRONG fail rather than a narrow pass, which is why it is
  // named rather than left to the reader: `crashed` means "a signal the kit did not send", and
  // the kit cannot see who did.
  coverage: "partial",
  coverageGaps: [
    "only the inert invocations other checkers already request are observed so an unprobed path such as nested help is never judged",
    "no invocation that does real work is sent at L0 so a crash on the paths a caller actually uses is out of reach",
    "a crash provoked by the probe's own sentinel token is not distinguished from one the target would suffer on any input",
    "a signal the kit did not send is attributed to the target so an external kill reads as the target falling over",
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
    if (dead.length > 0) {
      const which = dead
        .map((o) => `${o.invocation.args.join(" ") || "(bare)"}: ${o.signal}`)
        .join("; ");
      return finding(
        "fail",
        // The SIGNAL, and which invocations died, because those are the two facts a maintainer
        // needs and neither is recoverable from the exit code — there isn't one. Deliberately
        // not phrased through `exitCode`: "exited null" describes a status the target never
        // chose, which is the wording that let this failure mode pass as compliance.
        `${dead.length} of ${runs.length} inert invocation(s) died by signal (${which})`,
        dead.map((o) => o.id),
      );
    }

    // Decided AFTER the crash, and the order is the whole asymmetry. A crash is a completed
    // observation of a violation: the process is gone, the streams are closed, and a probe that
    // died did not stop being dead because a different probe hit the deadline. A hang or an
    // output-ceiling kill is the opposite — the kit sent SIGKILL, so those targets did not fail
    // to exit under their own control, they were never allowed to. Reading either as a G1 pass
    // would be this rule making the same mistake it exists to catch, one flag over.
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
