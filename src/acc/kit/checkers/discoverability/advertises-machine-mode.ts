import { parseHelp } from "../../discovery.ts";
import { findingFor, hungUnverified, truncatedUnverified } from "../../finding.ts";
import type { Checker, Finding, History, Invocation, Observation } from "../../types.ts";
import { findByPurpose } from "../../types.ts";

const RULE_ID = "D3";

const finding = findingFor(RULE_ID);

const PLAIN = "D3: help mentions machine mode";
const FORCED_TEXT = "D3: human help, with machine mode forced off";

/**
 * A `schema` COMMAND, not the word "schema".
 *
 * The old test was `/\bschema\b/` over the whole help text, which matches prose — "validate
 * against a schema", "the schema changed in v2" — and handed a pass to tools advertising no
 * machine-readable path at all. This requires the shape of a command-table row: an indented
 * line whose first token is `schema`, followed either by a description column (two or more
 * spaces) or by nothing. `parseHelp`'s structured parse is consulted first; this is the
 * fallback for help layouts its `Commands:` heuristic does not recognise.
 */
const SCHEMA_COMMAND_ROW = /^[ \t]+schema\b[^\n]*?(?:\s{2,}\S|\s*$)/m;

/** Usable output from a probe: it ran, it finished, and it said something. */
function textOf(o: Observation | undefined): string {
  if (!o || o.timedOut || o.truncated || o.spawnFailed) return "";
  return `${o.stdout}${o.stderr}`;
}

/**
 * True when the captured help is itself a machine document.
 *
 * This is the whole reason the rule needs a second probe. A CLI that switches to machine mode
 * when stdout is not a terminal — which the kit's runner always is — answers `--help` with its
 * SCHEMA, and a schema necessarily names `--json` and `--format`. Scanning that would make D3
 * test its own machine output rather than the human help surface it is named after, and pass
 * every such tool for free.
 */
function isMachineDocument(text: string): boolean {
  const t = text.trim();
  if (!t.startsWith("{") && !t.startsWith("[")) return false;
  try {
    JSON.parse(t);
    return true;
  } catch {
    return false;
  }
}

/** D3 — docs/wiki/rules/discoverability/help-advertises-machine-mode.md (diagnostic) */
export const advertisesMachineModeChecker: Checker = {
  ruleId: RULE_ID,
  rulePath: "docs/wiki/rules/discoverability/help-advertises-machine-mode.md",
  tier: "diagnostic",
  probeLevel: "L0",
  // The rule asks for the flag AND the `schema` command "where one exists"; the verdict below
  // is a disjunction, so a CLI with an unadvertised `schema` command passes on `--json` alone.
  // Black-box, there is no way to know a schema command exists without finding it in the help
  // this rule is testing, so the conjunction is not checkable at L0 — which is the reason for
  // the disjunction, not an excuse for leaving it undeclared.
  coverage: "partial",
  coverageGaps: [
    "help is only required to advertise either the machine-mode flag or a schema command and never both",
  ],

  probes: (d): Invocation[] => [
    { args: ["--help"], inertness: "help-path", purpose: PLAIN },
    // The fallback, and only for a target that advertises `--format` at all. Asking a CLI with
    // no such flag to force text mode is an invocation it can only reject, and the answer would
    // be evidence about nothing. `--format=text` is one token so the probe stays flag-only; see
    // FORMAT_TOKENS in inert.ts. Whether the fallback is USED is decided in `check`, from the
    // bytes plain `--help` returned — which is not knowable here, before anything has run.
    ...(d.flags.includes("--format")
      ? [
          {
            args: ["--help", "--format=text"],
            inertness: "help-path" as const,
            purpose: FORCED_TEXT,
          },
        ]
      : []),
  ],

  check: (h: History): Finding => {
    if (!h.discovery.helpReadable) {
      return finding("unverified", "help was not readable", []);
    }

    const [plain] = findByPurpose(h, PLAIN);
    if (plain) {
      // A killed help probe yields empty text, and empty text advertises nothing — which would
      // be reported as the FAIL "help names no machine-mode flag", blaming the target for
      // output we never let it produce.
      const hung = hungUnverified(finding, [plain]);
      if (hung) return hung;
      // The scan below is an ABSENCE test over help text, so a prefix cannot settle it in
      // either direction: the machine-mode row may be in the bytes we refused to read.
      const cut = truncatedUnverified(finding, [plain]);
      if (cut) return cut;
    }

    // The HUMAN surface is what this rule names, so plain help is preferred and the forced-text
    // probe is consulted only when plain help came back as a machine document.
    const plainText = textOf(plain);
    const [forced] = findByPurpose(h, FORCED_TEXT);
    const forcedText = forced?.exitCode === 0 ? textOf(forced) : "";

    let help = plainText;
    let evidence = plain ? [plain.id] : [];
    // `h.discovery` is parsed from plain `--help`. When the fallback is taken, those results
    // describe the machine document and must not reach the verdict — that is the whole defect
    // being fixed, so the parse is redone over the text actually chosen.
    let surface = h.discovery;
    if (isMachineDocument(plainText)) {
      if (!forcedText || isMachineDocument(forcedText)) {
        return finding(
          "unverified",
          "help answers with a machine document and offers no forced-text form, so the human help surface was never observed",
          [plain?.id, forced?.id].filter((id): id is string => id !== undefined),
        );
      }
      help = forcedText;
      evidence = forced ? [forced.id] : [];
      surface = { ...parseHelp(forcedText), helpReadable: true };
    }

    const advertisesSchema =
      surface.subcommands.includes("schema") ||
      surface.flags.includes("--schema") ||
      SCHEMA_COMMAND_ROW.test(help);

    if (surface.machineModeFlag !== null || advertisesSchema) {
      return finding(
        "pass",
        `help advertises ${surface.machineModeFlag ?? "a schema command"}`,
        evidence,
      );
    }

    return finding(
      "fail",
      // The knock-on effect, not just the fact of the miss: B3 (machine output is parseable)
      // depends on discovery finding a machine-mode flag here, so when this fails B3 also goes
      // unverified — an undiscoverable feature is, to this kit, indistinguishable from an
      // absent one.
      "help names no machine-mode flag or schema command; B3 will be unverified as a result",
      evidence,
    );
  },
};
