import {
  crashedUnverified,
  findingFor,
  hungUnverified,
  truncatedUnverified,
} from "../../finding.ts";
import type { Checker, Finding, History, Invocation } from "../../types.ts";
import { findByPurpose } from "../../types.ts";

const RULE_ID = "D1";

const finding = findingFor(RULE_ID);

/** D1 — docs/wiki/rules/discoverability/version-flag-exists.md */
export const versionFlagChecker: Checker = {
  ruleId: RULE_ID,
  rulePath: "docs/wiki/rules/discoverability/version-flag-exists.md",
  tier: "core",
  probeLevel: "L0",
  // The hostile-HOME probe establishes exactly one of the four "no work" clauses: no
  // configuration. No network, no credentials and no side effects are unobservable from what
  // the runner records (argv, streams, status, timing) — establishing them needs the network
  // and filesystem observation L1/L2 are for. The machine-mode clause is the one the reference
  // CLI itself violated for months: `--version --json` emitted the bare string `0.0.0`, and no
  // probe here ever asks for machine mode.
  //
  // The fourth is the DETECTOR inside the path that is sampled (review R6-5). "Exiting `0` with
  // the version on stdout" is read as `stdout.trim() !== ""`, so any byte at all satisfies the
  // clause about the version — a `--version` that prints its own help, or a single newline and a
  // dot, passes. Recognising a version string means picking a syntax the rule does not state.
  coverage: "partial",
  coverageGaps: [
    "the structured machine-mode version payload is never inspected",
    "no network and no credentials and no side effects cannot be observed at L0",
    "the SHOULD to support -V is not probed",
    "stdout is only required to be non-empty and is never checked to carry a version string",
  ],

  probes: (): Invocation[] => [
    { args: ["--version"], inertness: "help-path", purpose: "D1: --version" },
    {
      args: ["--version"],
      // Same args, hostile env: verifies the no-configuration requirement. The runner's id
      // incorporates env, so this is a distinct recording, not a dedup collision with the plain
      // probe above.
      env: { HOME: "/nonexistent-acc-probe", XDG_CONFIG_HOME: "/nonexistent-acc-probe" },
      inertness: "help-path",
      purpose: "D1: --version with no usable HOME",
    },
  ],

  check: (h: History): Finding => {
    // findByPurpose, not findByArgs: both probes share args (["--version"]) and differ only by
    // env, which findByArgs ignores — it would return whichever recorded first, silently
    // collapsing the exact pair this checker exists to tell apart.
    const runs = findByPurpose(h, "D1:");
    const plain = runs.find((o) => !o.invocation.env);
    const hostile = runs.find((o) => o.invocation.env);
    if (!plain) {
      return finding("unverified", "probe was not recorded", []);
    }
    // A hung `--version` would otherwise be reported as "--version exited null" — a fail whose
    // detail describes a status the target never chose. D1 does not own hangs (E1 does), so
    // the honest verdict is that nothing was established.
    const hung = hungUnverified(finding, runs);
    if (hung) return hung;
    // A `--version` that floods past the output limit is a defect, but it is not D1's: every
    // clause here reads the exit code, which a probe we killed never chose.
    const cut = truncatedUnverified(finding, runs);
    if (cut) return cut;
    // The near miss in this file. A crashed `--version` currently reads as three separate
    // problems — "exited null", "wrote nothing to stdout", "requires configuration" — a FAIL
    // that is three restatements of "it died", and the third of which is an outright false
    // accusation: the hostile-HOME probe did not fail because of HOME. C1's exception does not
    // reach here. C1 owns a rule about SUCCEEDING, so a fault crash falsifies it directly; D1's
    // clauses are about what `--version` reports and under what conditions, and a target that
    // fell over reported nothing under any conditions.
    const crashed = crashedUnverified(finding, runs);
    if (crashed) return crashed;

    const evidence = runs.map((o) => o.id);
    const problems: string[] = [];
    if (plain.exitCode !== 0) problems.push(`--version exited ${plain.exitCode}`);
    if (plain.stdout.trim() === "") problems.push("--version wrote nothing to stdout");
    // Guarded: if the hostile probe wasn't recorded for some reason, the plain result still
    // stands on its own rather than silently failing open.
    if (hostile && hostile.exitCode !== 0) {
      problems.push("--version requires configuration (failed with an unusable HOME)");
    }

    return problems.length
      ? finding("fail", problems.join("; "), evidence)
      : finding("pass", "version reported with an unusable HOME and XDG_CONFIG_HOME", evidence);
  },
};
