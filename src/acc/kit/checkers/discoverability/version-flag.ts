import {
  crashedUnverified,
  findingFor,
  hungUnverified,
  truncatedUnverified,
} from "../../finding.ts";
import {
  machineSelector,
  machineVersionArgs,
  parsesWhole,
  selectorCorroborationProbes,
  selectorObserved,
} from "../../machine-mode.ts";
import type { Checker, Discovery, Finding, History, Invocation } from "../../types.ts";
import { findByPurpose } from "../../types.ts";

const RULE_ID = "D1";
const MACHINE = "D1 machine:";

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
  // and filesystem observation L1/L2 are for.
  //
  // THE MACHINE-MODE CLAUSE IS NOW PROBED, and it is the one the reference CLI itself violated
  // for months: `--version --json` emitted the bare string `0.0.0` at exit 0, because commander's
  // built-in handling answered before the envelope existed. What the probe establishes is that
  // the payload is a STRUCTURED DOCUMENT rather than a bare scalar a caller would have to regex.
  // It cannot establish more: with nothing declared at L0 there is no schema naming the field the
  // version belongs in, so `{"ok":true,"data":"1.0.0"}` and `{"version":"1.0.0"}` are equally
  // acceptable here and only one of them is what a declaration would ask for. That is the same L1
  // boundary A3's envelope clause and B3's output kinds both stop at.
  //
  // The last is the DETECTOR inside the path that is sampled (review R6-5). "Exiting `0` with
  // the version on stdout" is read as `stdout.trim() !== ""`, so any byte at all satisfies the
  // clause about the version — a `--version` that prints its own help, or a single newline and a
  // dot, passes. Recognising a version string means picking a syntax the rule does not state, and
  // the machine-mode probe does not fix that either: it requires a document, not a version.
  coverage: "partial",
  coverageGaps: [
    "a flag spelled like a machine-mode selector is only treated as one once a document came back under it on the help path so for a target whose advertised selector emits prose everywhere the machine-mode clause is not reached and the rule is decided by its other clauses",
    "the machine-mode payload is only required to be a structured document because no declaration exists at L0 to name the field the version belongs in",
    "no network and no credentials and no side effects cannot be observed at L0",
    "the SHOULD to support -V is not probed",
    "stdout is never checked to carry a version string in either mode",
  ],
  coverageEstablished: [
    "--version exits 0 with non-empty stdout",
    "--version still does so with HOME and XDG_CONFIG_HOME pointed at a path that does not exist",
    "for a target that advertises a machine-mode flag --version in that mode exits 0 and its whole stdout parses as one JSON object rather than a bare string",
  ],

  probes: (d: Discovery): Invocation[] => {
    const selector = machineSelector(d);
    return [
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
      // Every token is a help/version token or a format selector, so this is a `help-path`
      // invocation exactly as plain `--version` is — the gate admits it as it stands.
      ...(selector
        ? [
            {
              args: machineVersionArgs(selector),
              inertness: "help-path" as const,
              purpose: `${MACHINE} the version must be a field under ${selector}`,
            },
          ]
        : []),
      // Corroboration, and it has to be the OTHER route: the probe above is the one this rule
      // condemns, so it cannot also be what establishes that the flag selects anything.
      ...selectorCorroborationProbes(d, ["help", "error"]),
    ];
  },

  check: (h: History): Finding => {
    // findByPurpose, not findByArgs: both probes share args (["--version"]) and differ only by
    // env, which findByArgs ignores — it would return whichever recorded first, silently
    // collapsing the exact pair this checker exists to tell apart.
    const runs = [...findByPurpose(h, "D1:"), ...findByPurpose(h, MACHINE)];
    const machine = findByPurpose(h, MACHINE)[0];
    const plain = runs.find((o) => !o.invocation.env && o.invocation.args.length === 1);
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

    // Did the PLAIN run satisfy the clause at all? Everything below turns on this, because a
    // target with no `--version` fails every sub-clause for one reason, and saying it three
    // times is not three findings.
    const plainReported = plain.exitCode === 0 && plain.stdout.trim() !== "";

    // Nothing was reported in EITHER mode, and every clause below would restate that.
    const noVersionAtAll = plain.exitCode !== 0 && plain.stdout.trim() === "";

    if (noVersionAtAll) {
      // One clause, not two. A target that has no `--version` at all trips both — non-zero exit
      // AND empty stdout — and "exited 2; wrote nothing to stdout" is one fact stated twice.
      problems.push(`--version reported no version: exited ${plain.exitCode}, stdout empty`);
    } else {
      if (plain.exitCode !== 0) problems.push(`--version exited ${plain.exitCode}`);
      if (plain.stdout.trim() === "") problems.push("--version wrote nothing to stdout");
    }

    // THE CLAUSE THAT HAS TO COMPARE.
    //
    // It reads `hostile.exitCode !== 0` alone until 2026-08-20, which made it an accusation the
    // evidence could not support: a target with NO `--version` exits non-zero identically with a
    // usable HOME and without one, and was told it "requires configuration". Reported by the
    // first outside adopter against a CLI whose `--version` falls through to `unknown command`
    // and never reads HOME at all — measured byte-identical on stderr both ways.
    //
    // The predicate is narrower than "the two runs differ", deliberately. Differing is not the
    // claim; the claim is that configuration is REQUIRED, and that is only established when the
    // plain run reported a version and the hostile one did not. Two runs that fail differently
    // for some third reason are not evidence about configuration, and a target with no
    // `--version` cannot reach this clause at all now.
    if (hostile && plainReported && (hostile.exitCode !== 0 || hostile.stdout.trim() === "")) {
      problems.push(
        `--version requires configuration: it reported a version normally, but with an unusable HOME it exited ${hostile.exitCode} with ${hostile.stdout.trim() === "" ? "stdout empty" : "stdout non-empty"}`,
      );
    }
    // THE MACHINE-MODE HALF. A bare string is the violation this clause exists for: the reference
    // CLI emitted `0.0.0` under every machine-mode spelling for months, so a caller that asked
    // for structured output got something it had to regex. An ARRAY is refused for the same
    // reason a string is — the version is a value in a document, not the document.
    //
    // Skipped entirely when the plain run reported no version: `--version --json` against a CLI
    // with no `--version` fails for the one reason already stated, and a second clause saying so
    // is the same restatement this checker was reported for.
    //
    // A FLAG NAME IS NOT A SELECTOR, and this whole half is skipped when the name is all there
    // is. `--json <file>   Treat the input file as JSON` is an ordinary help entry; a CLI shaped
    // that way answers `--version --json` in prose because prose is all it emits, and has broken
    // nothing. Corroboration comes from the `help` route rather than this observation: taking it
    // from the invocation the clause then condemns would establish the premise out of the
    // evidence, which is question-begging rather than a probe.
    //
    // Uncorroborated behaves EXACTLY as an unadvertised machine mode does — the clause is not
    // reached, and the clauses above still decide the rule. The first cut of this returned
    // `unverified` from here instead, which threw away the `problems` already collected and
    // silenced a directly measured core violation: a target whose `--version` genuinely required
    // a usable HOME went from `fail` to `unverified` because its help happened to spell a flag
    // `--json`. A guard on one clause may not answer for the others.
    const machineEstablished = machine !== undefined && selectorObserved(h);
    if (machine && machineEstablished && !noVersionAtAll) {
      if (machine.exitCode !== 0) {
        problems.push(`--version in machine mode exited ${machine.exitCode}`);
      } else if (!parsesWhole(machine.stdout)) {
        problems.push(
          `--version in machine mode did not emit a JSON document (${JSON.stringify(machine.stdout.trim().slice(0, 40))})`,
        );
      } else {
        const payload: unknown = JSON.parse(machine.stdout);
        if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
          problems.push(
            "--version in machine mode emitted a bare value rather than a document carrying the version as a field",
          );
        }
      }
    }

    return problems.length
      ? finding("fail", problems.join("; "), evidence)
      : finding(
          "pass",
          machineEstablished
            ? "version reported with an unusable HOME and XDG_CONFIG_HOME, and as a structured document in machine mode"
            : machine
              ? `version reported with an unusable HOME and XDG_CONFIG_HOME; nothing this target produced under ${machineSelector(h.discovery)} came back as a document, so it was not established as a machine-mode selector and the payload clause was not reached`
              : "version reported with an unusable HOME and XDG_CONFIG_HOME; no machine mode was reachable at L0 so the payload clause was not reached",
          evidence,
        );
  },
};
